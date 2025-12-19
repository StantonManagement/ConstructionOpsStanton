import { supabaseAdmin } from '@/lib/supabaseClient';
import { notifyTaskUnblocked } from '@/lib/sms/taskNotifications';

export async function autoScheduleDependencies(taskId: string, verifiedAt: string) {
  if (!supabaseAdmin) return;

  // 1. Find all tasks that depend on this verified task (successors)
  const { data: dependencies, error: depError } = await supabaseAdmin
    .from('task_dependencies')
    .select('task_id') // This is the dependent task ID
    .eq('depends_on_task_id', taskId);

  if (depError || !dependencies || dependencies.length === 0) {
    return;
  }

  // 2. For each successor, check if ALL its dependencies are verified
  for (const dep of dependencies) {
    const successorId = dep.task_id;

    // Check if successor is already scheduled
    const { data: successor, error: succError } = await supabaseAdmin
      .from('tasks')
      .select('scheduled_start, status')
      .eq('id', successorId)
      .single();

    if (succError || !successor) continue;

    // Skip if already scheduled or started/completed
    if (successor.scheduled_start || successor.status !== 'not_started') {
      continue; 
    }

    // Check prerequisites
    const { data: prerequisites, error: preError } = await supabaseAdmin
      .from('task_dependencies')
      .select(`
        depends_on_task_id,
        prerequisite:tasks!depends_on_task_id (
          status
        )
      `)
      .eq('task_id', successorId);

    if (preError) continue;

    // Verify all prerequisites are 'verified'
    // Note: prerequisite is joined, but type might be array or object. 
    // Usually a task has one status.
    const allPrereqsVerified = prerequisites?.every((p: any) => p.prerequisite?.status === 'verified');

    if (allPrereqsVerified) {
      // 3. Auto-schedule
      // Start date = Verified date of *this* task + 1 day (simple rule for now)
      const verifiedDate = new Date(verifiedAt);
      verifiedDate.setDate(verifiedDate.getDate() + 1); // Next day
      
      // If next day is weekend, maybe skip? (Keeping it simple for now)

      await supabaseAdmin
        .from('tasks')
        .update({
          scheduled_start: verifiedDate.toISOString(),
          scheduled_end: verifiedDate.toISOString(), // Default 1 day duration
          updated_at: new Date().toISOString()
        })
        .eq('id', successorId);
        
      console.log(`Auto-scheduled task ${successorId} for ${verifiedDate.toISOString()}`);
    }
  }
}
