import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// POST: Add a dependency
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetTaskId } = await params;
    const body = await request.json();
    const { source_task_id, dependency_type = 'finish_to_start', lag_days = 0 } = body;

    if (!source_task_id) {
      return NextResponse.json({ error: 'source_task_id is required' }, { status: 400 });
    }

    // Prevent self-dependency
    if (source_task_id === targetTaskId) {
      return NextResponse.json({ error: 'Task cannot depend on itself' }, { status: 400 });
    }

    // Check for circular dependency (basic check: A->B->A)
    // In a real production app, we'd traverse the graph. For now, we'll rely on simple immediate checks or let the client handle it.
    // Actually, let's do a quick check if the reverse exists.
    const { data: existingReverse } = await supabaseAdmin!
      .from('schedule_dependencies')
      .select('id')
      .eq('source_task_id', targetTaskId)
      .eq('target_task_id', source_task_id)
      .single();

    if (existingReverse) {
      return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin!
      .from('schedule_dependencies')
      .insert({
        target_task_id: targetTaskId,
        source_task_id,
        dependency_type,
        lag_days
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating dependency:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a dependency
// We need to know the dependency ID or the source task ID. 
// The route is /api/tasks/[id]/dependencies, so we expect a query param or body for the specific dependency to remove, 
// OR we can accept /api/tasks/[id]/dependencies/[depId] in a separate route file.
// But `next.js` app router can handle it here if we parse the URL, but it's cleaner to have a separate route file for deletion by ID.
// However, typically we delete by relation here: "Remove dependency on Task X".
// Let's support deleting by source_task_id passed in body or query.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetTaskId } = await params;
    const { searchParams } = new URL(request.url);
    const sourceTaskId = searchParams.get('source_task_id');

    if (!sourceTaskId) {
      return NextResponse.json({ error: 'source_task_id query param required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin!
      .from('schedule_dependencies')
      .delete()
      .eq('target_task_id', targetTaskId)
      .eq('source_task_id', sourceTaskId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting dependency:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
