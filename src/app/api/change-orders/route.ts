import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Change Orders API
 * Manages change orders with approval workflow
 */

// GET - Fetch change orders (optionally filtered)
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const useDetail = searchParams.get('detail') === 'true';

    // Build query - use detail view for richer data
    const tableName = useDetail ? 'change_orders_detail' : 'change_orders';
    
    let query = supabaseAdmin
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', parseInt(projectId));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: changeOrders, error } = await query;

    if (error) {
      console.error('[Change Orders API] Error fetching change orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ change_orders: changeOrders || [] }, { status: 200 });

  } catch (error: any) {
    console.error('[Change Orders API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new change order
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      contractor_id,
      budget_category_id,
      title,
      description,
      reason_category,
      justification,
      cost_impact,
      schedule_impact_days = 0,
      notes,
      auto_submit = false
    } = body;

    // Validate required fields
    if (!project_id || !title || !description || !reason_category || cost_impact === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: project_id, title, description, reason_category, cost_impact' 
      }, { status: 400 });
    }

    // Validate project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate CO number
    const { data: coNumberResult, error: coNumberError } = await supabaseAdmin
      .rpc('generate_co_number', { p_project_id: project_id });

    if (coNumberError) {
      console.error('[Change Orders API] Error generating CO number:', coNumberError);
      return NextResponse.json({ error: 'Failed to generate CO number' }, { status: 500 });
    }

    const coNumber = coNumberResult;

    // Determine initial status based on cost and auto_submit
    let initialStatus = 'draft';
    let approvedBy = null;
    let approvedDate = null;

    if (auto_submit) {
      const costImpactNum = parseFloat(cost_impact);
      if (costImpactNum < 500) {
        // Auto-approve under $500
        initialStatus = 'approved';
        approvedBy = user.id;
        approvedDate = new Date().toISOString();
      } else {
        // Submit for approval
        initialStatus = 'pending';
      }
    }

    // Insert change order
    const { data: newChangeOrder, error: insertError } = await supabaseAdmin
      .from('change_orders')
      .insert([{
        co_number: coNumber,
        project_id: parseInt(project_id),
        contractor_id: contractor_id ? parseInt(contractor_id) : null,
        budget_category_id: budget_category_id ? parseInt(budget_category_id) : null,
        title: title.trim(),
        description: description.trim(),
        reason_category,
        justification: justification?.trim() || null,
        cost_impact: parseFloat(cost_impact),
        schedule_impact_days: parseInt(schedule_impact_days) || 0,
        status: initialStatus,
        created_by: user.id,
        approved_by: approvedBy,
        submitted_date: auto_submit ? new Date().toISOString() : null,
        approved_date: approvedDate,
        notes: notes?.trim() || null
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[Change Orders API] Error creating change order:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('[Change Orders API] Created change order:', newChangeOrder.id, 'with status:', initialStatus);
    return NextResponse.json({ change_order: newChangeOrder }, { status: 201 });

  } catch (error: any) {
    console.error('[Change Orders API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

