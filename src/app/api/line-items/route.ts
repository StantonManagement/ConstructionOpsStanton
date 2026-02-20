import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const contractorId = searchParams.get('contractorId');
    const contractId = searchParams.get('contractId');

    console.log('[API GET /api/line-items] Received request:', {
      projectId,
      contractorId,
      contractId,
    });

    if (!projectId || !contractorId) {
      return NextResponse.json(
        { error: 'Missing required parameters: projectId and contractorId' },
        { status: 400 }
      );
    }

    // Try to fetch by contract_id first if provided
    if (contractId) {
      const { data, error } = await supabase
        .from('project_line_items')
        .select('*')
        .eq('contract_id', contractId)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        console.log('[API GET /api/line-items] Found line items by contract_id:', data.length);
        console.log('[API GET /api/line-items] Line items data:', data.map(item => ({
          id: item.id,
          description: item.description_of_work,
          from_previous_application: item.from_previous_application,
          percent_completed: item.percent_completed,
        })));
        return NextResponse.json({ success: true, data }, { status: 200 });
      }

      console.log('[API GET /api/line-items] No items found by contract_id, trying fallback');
    }

    // Fallback: fetch by project_id + contractor_id
    const { data, error } = await supabase
      .from('project_line_items')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[API GET /api/line-items] Error fetching line items:', error);
      return NextResponse.json(
        { error: `Failed to fetch line items: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('[API GET /api/line-items] Found line items:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('[API GET /api/line-items] Line items data:', data.map(item => ({
        id: item.id,
        description: item.description_of_work,
        from_previous_application: item.from_previous_application,
        percent_completed: item.percent_completed,
      })));
    }
    return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('[API GET /api/line-items] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const {
      projectId,
      contractorId,
      descriptionOfWork,
      scheduledValue,
      itemNo,
      contractAmount,
    } = body;

    console.log('[API /api/line-items] Received request:', {
      projectId,
      contractorId,
      descriptionOfWork,
      scheduledValue,
      itemNo,
      contractAmount,
    });

    // Validate required fields
    if (!projectId || !contractorId || !descriptionOfWork) {
      console.error('[API /api/line-items] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, find or create the contracts record
    let contractRecordId = null;

    const { data: existingContract, error: contractError } = await supabase
      .from('contracts')
      .select('id')
      .eq('project_id', projectId)
      .eq('subcontractor_id', contractorId)
      .single();

    if (contractError && contractError.code === 'PGRST116') {
      console.log('[API /api/line-items] No contract found, creating new contract');
      // No contract found, create one
      const contractData = {
        project_id: projectId,
        subcontractor_id: contractorId,
        contract_amount: contractAmount || 0,
        start_date: new Date().toISOString().split('T')[0],
      };

      const { data: newContract, error: createError } = await supabase
        .from('contracts')
        .insert(contractData)
        .select('id')
        .single();

      if (createError) {
        console.error('[API /api/line-items] Error creating contract record:', createError);
        return NextResponse.json(
          { error: `Failed to create contract: ${createError.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
      contractRecordId = newContract.id;
      console.log('[API /api/line-items] Created new contract with id:', contractRecordId);
    } else if (existingContract) {
      contractRecordId = existingContract.id;
      console.log('[API /api/line-items] Found existing contract with id:', contractRecordId);
    } else {
      console.error('[API /api/line-items] Failed to get or create contract record. Error:', contractError);
      return NextResponse.json(
        { error: 'Failed to get or create contract record' },
        { status: 500 }
      );
    }

    // Get the next display order
    const { data: existingItems } = await supabase
      .from('project_line_items')
      .select('display_order')
      .eq('contract_id', contractRecordId)
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = existingItems && existingItems.length > 0
      ? existingItems[0].display_order || 0
      : 0;

    console.log('[API /api/line-items] Next display order:', maxOrder + 1);

    // Insert the line item
    const lineItemData = {
      contract_id: contractRecordId,
      project_id: projectId,
      contractor_id: contractorId,
      description_of_work: descriptionOfWork,
      scheduled_value: scheduledValue || 0,
      item_no: itemNo || null,
      change_order_amount: 0,
      display_order: maxOrder + 1,
      from_previous_application: 0,
      percent_completed: 0,
    };

    console.log('[API /api/line-items] Inserting line item:', lineItemData);

    const { data, error } = await supabase
      .from('project_line_items')
      .insert(lineItemData)
      .select()
      .single();

    if (error) {
      console.error('[API /api/line-items] Error inserting line item:', error);
      return NextResponse.json(
        { error: `Failed to add line item: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('[API /api/line-items] Successfully created line item:', data);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[API /api/line-items] Error in line items API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
