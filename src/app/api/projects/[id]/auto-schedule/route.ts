import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Project Schedule and Start Date
    const { data: schedule, error: scheduleError } = await supabase
      .from('project_schedules')
      .select('id, project_id')
      .eq('project_id', projectId)
      .single();

    if (scheduleError) throw new Error('Project schedule not found');

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('start_date')
      .eq('id', projectId)
      .single();
      
    if (projectError) throw projectError;

    // 2. Fetch Schedule Defaults (for duration and order)
    const { data: defaults, error: defaultsError } = await supabase
      .from('schedule_defaults')
      .select('*');
      
    if (defaultsError) throw defaultsError;
    
    // Map defaults by category name for easy lookup
    const defaultsMap = new Map(defaults.map(d => [
      d.budget_category, 
      { duration: d.default_duration_days, order: d.display_order }
    ]));

    // 3. Fetch Project Budget Categories (property_budgets view)
    const { data: categories, error: catError } = await supabase
      .from('property_budgets')
      .select('id, category_name, original_amount, revised_amount, actual_spend')
      .eq('project_id', projectId)
      .eq('is_active', true);
      
    if (catError) throw catError;

    // 4. Fetch Existing Tasks
    const { data: existingTasks, error: tasksError } = await supabase
      .from('schedule_tasks')
      .select('*')
      .eq('schedule_id', schedule.id);

    if (tasksError) throw tasksError;

    // 5. Prepare Items to Schedule
    // We want to schedule:
    // a) Existing unscheduled tasks (start_date is null)
    // b) Virtual tasks (categories with no tasks)
    
    // Helper to get default info
    const getDefault = (name: string) => defaultsMap.get(name) || { duration: 3, order: 999 };

    interface ScheduleItem {
      type: 'update' | 'insert';
      taskId?: string;
      categoryId: number;
      categoryName: string;
      duration: number;
      order: number;
      existingStart?: string;
    }

    const itemsToSchedule: ScheduleItem[] = [];

    // Map existing tasks to categories
    const tasksByCategory = new Map<number, any[]>();
    existingTasks.forEach(t => {
      if (t.budget_category_id) {
        const list = tasksByCategory.get(t.budget_category_id) || [];
        list.push(t);
        tasksByCategory.set(t.budget_category_id, list);
      }
    });

    // Iterate all categories
    categories.forEach(cat => {
      const catTasks = tasksByCategory.get(cat.id) || [];
      const def = getDefault(cat.category_name);

      if (catTasks.length > 0) {
        // Category has tasks. Check if they are unscheduled.
        catTasks.forEach(task => {
          if (!task.start_date) {
            // Unscheduled existing task
            itemsToSchedule.push({
              type: 'update',
              taskId: task.id,
              categoryId: cat.id,
              categoryName: cat.category_name,
              duration: def.duration,
              order: def.order,
            });
          } else {
            // Already scheduled. We might want to respect its date and schedule others AROUND it?
            // For simplicity, "Auto-Schedule" usually means "Schedule Everything (or remaining)".
            // The plan says "Get all unscheduled tasks". 
            // If we have a mix, we skip scheduled ones? 
            // BUT we need to know their dates to stack after them?
            // Let's keep it simple: Only schedule the unscheduled ones sequentially starting from Project Start (or max end date).
            
            // Use `existingStart` to denote this is a fixed point? 
            // No, let's just ignore them for the sequence for now, OR treat them as blockers?
            // Plan: "Get all unscheduled tasks... set start_date = currentDate".
            // This implies we ignore existing scheduled tasks and just fill the gaps starting from Day 1?
            // That might overlap.
            // Better: Find the LATEST end date of scheduled tasks, and start from there?
          }
        });
      } else {
        // Category has NO tasks. Create one if it has remaining budget?
        // (Logic from ProjectScheduleTab.tsx: revised > 0 or original > 0)
        const budget = (cat.revised_amount > 0 ? cat.revised_amount : cat.original_amount) || 0;
        if (budget > 0) {
           itemsToSchedule.push({
             type: 'insert',
             categoryId: cat.id,
             categoryName: cat.category_name,
             duration: def.duration,
             order: def.order,
           });
        }
      }
    });

    // Sort items by display order
    itemsToSchedule.sort((a, b) => a.order - b.order);

    if (itemsToSchedule.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No tasks to schedule" });
    }

    // 6. Calculate Dates
    // Start from Project Start Date or Today
    let currentCursor = new Date(project.start_date || new Date());
    
    // If we want to append to existing schedule:
    // Find max end date of scheduled tasks?
    const scheduledTasks = existingTasks.filter(t => t.start_date);
    if (scheduledTasks.length > 0) {
       const maxEnd = scheduledTasks.reduce((max, t) => {
         const end = new Date(t.end_date);
         return end > max ? end : max;
       }, new Date(0)); // epoch
       
       // If maxEnd > projectStart, start after maxEnd
       if (maxEnd > currentCursor) {
          currentCursor = new Date(maxEnd);
          currentCursor.setDate(currentCursor.getDate() + 1); // Start next day
       }
    }

    const updates = [];
    const inserts = [];

    for (const item of itemsToSchedule) {
      const start = new Date(currentCursor);
      const end = new Date(currentCursor);
      end.setDate(start.getDate() + (item.duration - 1)); // Inclusive duration? e.g. 1 day = start==end

      const payload = {
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        status: 'scheduled'
      };

      if (item.type === 'update' && item.taskId) {
        updates.push({ id: item.taskId, ...payload });
      } else {
        inserts.push({
          schedule_id: schedule.id,
          project_id: projectId,
          budget_category_id: item.categoryId,
          task_name: item.categoryName, // Default name
          ...payload,
          progress: 0
        });
      }

      // Advance cursor to next day
      currentCursor = new Date(end);
      currentCursor.setDate(currentCursor.getDate() + 1);
    }

    // 7. Execute DB Operations
    // We can use upsert for all? No, some are updates, some inserts.
    
    if (updates.length > 0) {
        // Bulk update? Supabase doesn't have bulk update easily without a loop or stored proc.
        // But we can do `upsert` if we have all fields. We only have partial.
        // Loop for now (auto-scheduler isn't run often).
        for (const u of updates) {
            await supabase.from('schedule_tasks').update(u).eq('id', u.id);
        }
    }

    if (inserts.length > 0) {
        const { error: insertError } = await supabase.from('schedule_tasks').insert(inserts);
        if (insertError) throw insertError;
    }

    return NextResponse.json({ 
      success: true, 
      count: updates.length + inserts.length,
      updates: updates.length,
      inserts: inserts.length
    });

  } catch (error: any) {
    console.error('Auto-schedule error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
