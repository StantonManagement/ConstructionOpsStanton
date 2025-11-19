import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

interface LineItemProgress {
  line_item_id: number;
  submitted_percent: number;
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable - Database' }, { status: 503 });
    }

    const { projectId, contractorId, lineItems, pm_notes } = await req.json();

    // Validate input
    if (!projectId || !contractorId || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, contractorId, and lineItems are required' 
      }, { status: 400 });
    }

    // Ensure IDs are numbers
    const projectIdNum = parseInt(projectId.toString());
    const contractorIdNum = parseInt(contractorId.toString());

    if (isNaN(projectIdNum) || isNaN(contractorIdNum)) {
      return NextResponse.json({ error: 'Invalid projectId or contractorId format' }, { status: 400 });
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectIdNum)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify contractor exists
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('id, name')
      .eq('id', contractorIdNum)
      .single();

    if (contractorError || !contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Check if project_contractors relationship exists, create if not
    const { data: existingProjectContractorList } = await supabase
      .from('project_contractors')
      .select('id, contract_amount')
      .eq('project_id', projectIdNum)
      .eq('contractor_id', contractorIdNum);

    const existingProjectContractor = existingProjectContractorList && existingProjectContractorList.length > 0 
      ? existingProjectContractorList[0] 
      : null;

    // If no relationship exists, we need to get contract amount from contracts table
    let contractAmount = 0;
    if (!existingProjectContractor) {
      const { data: contractData } = await supabase
        .from('contracts')
        .select('contract_amount')
        .eq('project_id', projectIdNum)
        .eq('subcontractor_id', contractorIdNum)
        .single();

      contractAmount = parseFloat(contractData?.contract_amount || '0');

      // Create project_contractors record
      const { error: projectContractorError } = await supabase
        .from('project_contractors')
        .insert({
          project_id: projectIdNum,
          contractor_id: contractorIdNum,
          contract_amount: contractAmount,
          paid_to_date: 0,
          contract_status: 'active'
        });

      if (projectContractorError) {
        console.error('Error creating project_contractors record:', projectContractorError);
        return NextResponse.json({ 
          error: 'Failed to create project contractor relationship' 
        }, { status: 500 });
      }
    } else {
      contractAmount = parseFloat(existingProjectContractor.contract_amount || '0');
    }

    // Fetch all line items to validate and calculate totals
    const lineItemIds = lineItems.map((li: LineItemProgress) => li.line_item_id);
    const { data: projectLineItems, error: lineItemsError } = await supabase
      .from('project_line_items')
      .select('id, scheduled_value, from_previous_application, change_order_amount, contractor_id, project_id')
      .in('id', lineItemIds);

    if (lineItemsError || !projectLineItems || projectLineItems.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch line items' }, { status: 400 });
    }

    // Validate that all line items belong to this contractor and project
    const invalidLineItems = projectLineItems.filter(
      li => li.contractor_id !== contractorIdNum || li.project_id !== projectIdNum
    );

    if (invalidLineItems.length > 0) {
      return NextResponse.json({ 
        error: 'Some line items do not belong to this contractor or project' 
      }, { status: 400 });
    }

    // Validate percentages and calculate totals
    let totalCurrentPayment = 0;
    const validationErrors: string[] = [];

    const progressRecords = lineItems.map((li: LineItemProgress) => {
      const projectLineItem = projectLineItems.find(pli => pli.id === li.line_item_id);
      
      if (!projectLineItem) {
        validationErrors.push(`Line item ${li.line_item_id} not found`);
        return null;
      }

      const scheduledValue = (projectLineItem.scheduled_value || 0) + (projectLineItem.change_order_amount || 0);
      const previousPercent = projectLineItem.from_previous_application || 0;
      const submittedPercent = li.submitted_percent;

      // Validation
      if (submittedPercent < 0 || submittedPercent > 100) {
        validationErrors.push(`Line item ${li.line_item_id}: percentage must be between 0 and 100`);
        return null;
      }

      if (submittedPercent < previousPercent) {
        validationErrors.push(
          `Line item ${li.line_item_id}: current percentage (${submittedPercent}%) cannot be less than previous (${previousPercent}%)`
        );
        return null;
      }

      // Calculate amounts
      const thisPeriodPercent = Math.max(0, submittedPercent - previousPercent);
      const calculatedAmount = parseFloat(((scheduledValue * thisPeriodPercent) / 100).toFixed(2));
      totalCurrentPayment += calculatedAmount;

      return {
        line_item_id: li.line_item_id,
        submitted_percent: submittedPercent,
        pm_verified_percent: submittedPercent, // Initially set to submitted value
        previous_percent: previousPercent,
        this_period_percent: thisPeriodPercent,
        calculated_amount: calculatedAmount,
        pm_adjustment_reason: null,
        verification_photos_count: 0,
      };
    }).filter(Boolean); // Remove null entries

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationErrors 
      }, { status: 400 });
    }

    // Check if at least one line item has progress
    const hasProgress = progressRecords.some(
      (record: any) => record.this_period_percent > 0
    );

    if (!hasProgress) {
      return NextResponse.json({ 
        error: 'At least one line item must have progress from the previous period' 
      }, { status: 400 });
    }

    // Create payment application with status='submitted'
    const { data: paymentApp, error: paymentAppError } = await supabase
      .from('payment_applications')
      .insert({
        project_id: projectIdNum,
        contractor_id: contractorIdNum,
        status: 'submitted', // Skip SMS flow, go straight to submitted
        total_contract_amount: contractAmount,
        current_payment: totalCurrentPayment,
        payment_period_end: new Date().toISOString().split('T')[0],
        pm_notes: pm_notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentAppError || !paymentApp) {
      console.error('Payment application creation error:', paymentAppError);
      return NextResponse.json({ 
        error: paymentAppError?.message || 'Failed to create payment application' 
      }, { status: 500 });
    }

    // Create payment_line_item_progress records
    const progressRecordsWithAppId = progressRecords.map((record: any) => ({
      ...record,
      payment_app_id: paymentApp.id,
    }));

    const { error: progressError } = await supabase
      .from('payment_line_item_progress')
      .insert(progressRecordsWithAppId);

    if (progressError) {
      console.error('Error creating line item progress records:', progressError);
      
      // Rollback: delete the payment application
      await supabase
        .from('payment_applications')
        .delete()
        .eq('id', paymentApp.id);

      return NextResponse.json({ 
        error: 'Failed to create line item progress records' 
      }, { status: 500 });
    }

    console.log(`Manual payment application created successfully: ID ${paymentApp.id}, Amount: $${totalCurrentPayment}`);

    return NextResponse.json({
      success: true,
      paymentAppId: paymentApp.id,
      totalAmount: totalCurrentPayment,
      message: 'Payment application created successfully',
    });

  } catch (err: unknown) {
    console.error('Error in create-manual route:', err);
    let message = 'Unknown error';
    if (typeof err === 'object' && err && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}

