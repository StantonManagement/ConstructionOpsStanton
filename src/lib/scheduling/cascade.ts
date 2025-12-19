import { SupabaseClient } from '@supabase/supabase-js';

interface TaskUpdate {
  id: string;
  start_date: string;
  end_date: string;
}

interface PredecessorInfo {
  startDate: string;
  endDate: string;
}

/**
 * Calculate new dates for a successor task based on dependency type.
 * 
 * Dependency Types:
 * - finish_to_start (FS): Successor starts after predecessor finishes
 * - start_to_start (SS): Successor starts when predecessor starts
 * - finish_to_finish (FF): Successor finishes when predecessor finishes
 * - start_to_finish (SF): Successor finishes when predecessor starts (rare)
 */
function calculateDependentDates(
  predecessorInfo: PredecessorInfo,
  dependencyType: string,
  lagDays: number,
  successorDuration: number
): { startDate: string; endDate: string } | null {
  const predStart = new Date(predecessorInfo.startDate);
  const predEnd = new Date(predecessorInfo.endDate);
  const duration = successorDuration || 1;
  const lag = lagDays || 0;

  let newStart: Date;
  let newEnd: Date;

  switch (dependencyType) {
    case 'finish_to_start':
      // FS: Successor Start = Predecessor End + Lag + 1 day
      newStart = new Date(predEnd);
      newStart.setDate(predEnd.getDate() + lag + 1);
      newEnd = new Date(newStart);
      newEnd.setDate(newStart.getDate() + duration - 1);
      break;

    case 'start_to_start':
      // SS: Successor Start = Predecessor Start + Lag
      newStart = new Date(predStart);
      newStart.setDate(predStart.getDate() + lag);
      newEnd = new Date(newStart);
      newEnd.setDate(newStart.getDate() + duration - 1);
      break;

    case 'finish_to_finish':
      // FF: Successor End = Predecessor End + Lag
      // Calculate start from end and duration
      newEnd = new Date(predEnd);
      newEnd.setDate(predEnd.getDate() + lag);
      newStart = new Date(newEnd);
      newStart.setDate(newEnd.getDate() - duration + 1);
      break;

    case 'start_to_finish':
      // SF: Successor End = Predecessor Start + Lag (rare)
      // Calculate start from end and duration
      newEnd = new Date(predStart);
      newEnd.setDate(predStart.getDate() + lag);
      newStart = new Date(newEnd);
      newStart.setDate(newEnd.getDate() - duration + 1);
      break;

    default:
      return null;
  }

  return {
    startDate: newStart.toISOString().split('T')[0],
    endDate: newEnd.toISOString().split('T')[0],
  };
}

/**
 * Recursively updates dependent tasks when a task is moved.
 * Supports all four dependency types: FS, SS, FF, SF.
 * 
 * @param supabase Supabase admin client
 * @param taskId The ID of the task that was moved
 * @param newEndDate The new end date of the moved task
 * @param scheduleId The schedule ID context
 * @param newStartDate Optional - the new start date (needed for SS/SF calculations)
 */
export async function cascadeTaskUpdates(
  supabase: SupabaseClient,
  taskId: string,
  newEndDate: string,
  scheduleId: string,
  newStartDate?: string
) {
  const updates: TaskUpdate[] = [];
  const visited = new Set<string>();

  // If start date not provided, fetch it
  let startDate = newStartDate;
  if (!startDate) {
    const { data: task } = await supabase
      .from('schedule_tasks')
      .select('start_date')
      .eq('id', taskId)
      .single();
    startDate = task?.start_date || newEndDate;
  }

  // Queue of tasks to process with both start and end dates
  const queue = [{ id: taskId, startDate, endDate: newEndDate }];
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
          end_date,
          constraint_type,
          constraint_date
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
      const newDates = calculateDependentDates(
        { startDate: current.startDate!, endDate: current.endDate },
        dep.dependency_type,
        dep.lag_days,
        targetTask.duration_days
      );

      if (!newDates) continue;

      // Apply constraint logic if task has constraints
      if (targetTask.constraint_type && targetTask.constraint_date) {
        const constraintDate = new Date(targetTask.constraint_date);
        const calcStart = new Date(newDates.startDate);
        const calcEnd = new Date(newDates.endDate);
        const duration = targetTask.duration_days || 1;

        switch (targetTask.constraint_type) {
          case 'MUST_START_ON':
            // Force start to constraint date
            newDates.startDate = targetTask.constraint_date;
            const mustStartEnd = new Date(constraintDate);
            mustStartEnd.setDate(constraintDate.getDate() + duration - 1);
            newDates.endDate = mustStartEnd.toISOString().split('T')[0];
            break;

          case 'START_NO_EARLIER':
            // If calculated start is before constraint, use constraint
            if (calcStart < constraintDate) {
              newDates.startDate = targetTask.constraint_date;
              const sneEnd = new Date(constraintDate);
              sneEnd.setDate(constraintDate.getDate() + duration - 1);
              newDates.endDate = sneEnd.toISOString().split('T')[0];
            }
            break;

          case 'START_NO_LATER':
            // If calculated start is after constraint, use constraint
            if (calcStart > constraintDate) {
              newDates.startDate = targetTask.constraint_date;
              const snlEnd = new Date(constraintDate);
              snlEnd.setDate(constraintDate.getDate() + duration - 1);
              newDates.endDate = snlEnd.toISOString().split('T')[0];
            }
            break;

          case 'MUST_FINISH_ON':
            // Force end to constraint date
            newDates.endDate = targetTask.constraint_date;
            const mfoStart = new Date(constraintDate);
            mfoStart.setDate(constraintDate.getDate() - duration + 1);
            newDates.startDate = mfoStart.toISOString().split('T')[0];
            break;

          case 'FINISH_NO_EARLIER':
            // If calculated end is before constraint, adjust
            if (calcEnd < constraintDate) {
              newDates.endDate = targetTask.constraint_date;
              const fneStart = new Date(constraintDate);
              fneStart.setDate(constraintDate.getDate() - duration + 1);
              newDates.startDate = fneStart.toISOString().split('T')[0];
            }
            break;

          case 'FINISH_NO_LATER':
            // If calculated end is after constraint, adjust
            if (calcEnd > constraintDate) {
              newDates.endDate = targetTask.constraint_date;
              const fnlStart = new Date(constraintDate);
              fnlStart.setDate(constraintDate.getDate() - duration + 1);
              newDates.startDate = fnlStart.toISOString().split('T')[0];
            }
            break;
        }
      }

      // If dates changed, add to updates and queue
      if (newDates.startDate !== targetTask.start_date || newDates.endDate !== targetTask.end_date) {
        updates.push({
          id: targetTask.id,
          start_date: newDates.startDate,
          end_date: newDates.endDate
        });

        // Add to queue for recursive processing
        queue.push({ 
          id: targetTask.id, 
          startDate: newDates.startDate,
          endDate: newDates.endDate 
        });
        visited.add(targetTask.id);

        // Perform the update
        await supabase
          .from('schedule_tasks')
          .update({
            start_date: newDates.startDate,
            end_date: newDates.endDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetTask.id)
          .eq('schedule_id', scheduleId);
      }
    }
  }

  return updates;
}





