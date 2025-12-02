import { SupabaseClient } from '@supabase/supabase-js';

interface TaskUpdate {
  id: string;
  start_date: string;
  end_date: string;
}

/**
 * Recursively updates dependent tasks when a task is moved.
 * @param supabase Supabase admin client
 * @param taskId The ID of the task that was moved
 * @param newEndDate The new end date of the moved task
 * @param scheduleId The schedule ID context
 */
export async function cascadeTaskUpdates(
  supabase: SupabaseClient,
  taskId: string,
  newEndDate: string,
  scheduleId: string
) {
  const updates: TaskUpdate[] = [];
  const visited = new Set<string>();

  // Queue of tasks to process: { taskId, effectiveEndDate }
  const queue = [{ id: taskId, endDate: newEndDate }];
  visited.add(taskId);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Find all tasks that depend on the current task
    const { data: dependencies, error } = await supabase
      .from('schedule_dependencies')
      .select(`
        target_task_id,
        lag_days,
        dependency_type,
        schedule_tasks!target_task_id (
          id,
          duration_days,
          start_date,
          end_date
        )
      `)
      .eq('source_task_id', current.id);

    if (error) {
      console.error('Error fetching dependencies for cascade:', error);
      continue;
    }

    if (!dependencies || dependencies.length === 0) continue;

    for (const dep of dependencies) {
      const targetTask = dep.schedule_tasks as any;
      if (!targetTask) continue;

      // Prevent cycles
      if (visited.has(targetTask.id)) continue;

      // Calculate new dates based on dependency type
      // Currently mostly supporting Finish-to-Start (FS)
      // FS: Successor Start = Predecessor End + Lag + 1 day (usually next day)
      // Logic: If P ends on Monday, S starts on Tuesday (if lag 0)
      
      let newStartDateStr = '';
      let newEndDateStr = '';
      
      const predEndDate = new Date(current.endDate);
      const lag = dep.lag_days || 0;
      
      if (dep.dependency_type === 'finish_to_start') {
        // Start = Pred End + Lag + 1 day (assuming working days logic is simplified to calendar days for now)
        const newStart = new Date(predEndDate);
        newStart.setDate(predEndDate.getDate() + lag + 1);
        newStartDateStr = newStart.toISOString().split('T')[0];
        
        // End = New Start + Duration - 1
        const duration = targetTask.duration_days || 1;
        const newEnd = new Date(newStart);
        newEnd.setDate(newStart.getDate() + duration - 1);
        newEndDateStr = newEnd.toISOString().split('T')[0];
      } else {
        // TODO: Implement other types (SS, FF, SF)
        continue;
      }

      // If dates changed, add to updates and queue
      if (newStartDateStr !== targetTask.start_date) {
        updates.push({
          id: targetTask.id,
          start_date: newStartDateStr,
          end_date: newEndDateStr
        });

        // Update immediately in DB or collect all?
        // For recursion to work with latest data, we might need to push to queue with calculated dates.
        // We will commit updates one by one or batch at end. 
        // To propagate correctly, we need to use the calculated 'newEndDateStr' for the next level.
        queue.push({ id: targetTask.id, endDate: newEndDateStr });
        visited.add(targetTask.id);
        
        // Perform the update
        await supabase
          .from('schedule_tasks')
          .update({
            start_date: newStartDateStr,
            end_date: newEndDateStr,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetTask.id)
          .eq('schedule_id', scheduleId);
      }
    }
  }
}




