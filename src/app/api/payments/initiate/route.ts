import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// POST: Create payment applications for selected contractors
export async function POST(req: NextRequest) {
  try {
    const { projectId, contractorIds } = await req.json();
    if (!projectId || !Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json({ error: 'Missing projectId or contractorIds' }, { status: 400 });
    }

    // Fetch project and contractor details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();
    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch contractors through the contracts table
    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        subcontractor_id,
        contract_nickname,
        contract_amount,
        contractors!contracts_subcontractor_id_fkey (
          id, name, phone
        )
      `)
      .eq('project_id', projectId)
      .in('subcontractor_id', contractorIds);
    if (contractsError) {
      console.error('Error fetching contractors from contracts:', contractsError);
      return NextResponse.json({ error: 'Error fetching contractors from contracts' }, { status: 500 });
    }

    // Validate that we have valid contracts with amounts > 0
    const validContracts = contractsData?.filter(contract => 
      contract.contract_amount && Number(contract.contract_amount) > 0
    ) || [];

    if (validContracts.length === 0) {
      return NextResponse.json({ 
        error: 'No valid contracts found with contract amounts > 0. Please ensure contractors have valid contract amounts set.' 
      }, { status: 400 });
    }

    // Transform the data to get contractors with contract info
    const contractors = validContracts.map(contract => ({
      id: contract.contractors?.[0]?.id,
      name: contract.contractors?.[0]?.name,
      phone: contract.contractors?.[0]?.phone,
      contract_nickname: contract.contract_nickname,
      contract_amount: contract.contract_amount
    }));

    

    const results = [];
    for (const contractor of contractors) {
      // Check if a project_contractors record exists, if not create one with proper contract amount
      const { data: existingProjectContractor, error: checkError } = await supabase
        .from('project_contractors')
        .select('id, contract_amount')
        .eq('project_id', projectId)
        .eq('contractor_id', contractor.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking project_contractors:', checkError);
        results.push({ 
          contractorId: contractor.id, 
          error: 'Failed to verify project contractor relationship'
        });
        continue;
      }

      // If no project_contractors record exists, create one with the contract amount from contracts table
      if (!existingProjectContractor) {
        const { error: projectContractorError } = await supabase
          .from('project_contractors')
          .insert({
            project_id: projectId,
            contractor_id: contractor.id,
            contract_amount: contractor.contract_amount,
            paid_to_date: 0,
            contract_status: 'active'
          });

        if (projectContractorError) {
          console.error('Error creating project_contractors record:', projectContractorError);
          results.push({ 
            contractorId: contractor.id, 
            error: `Failed to create project contractor relationship: ${projectContractorError.message}`
          });
          continue;
        }
      }

      // Create payment application with all required fields
      const { data: paymentApp, error: paymentAppError } = await supabase
        .from('payment_applications')
        .insert({
          project_id: projectId,
          contractor_id: contractor.id,
          status: 'sms_sent',
          current_payment: 0,
          payment_period_end: new Date().toISOString().split('T')[0], // Current date as YYYY-MM-DD
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (paymentAppError || !paymentApp) {
        console.error('Payment application creation error:', paymentAppError);
        results.push({ 
          contractorId: contractor.id, 
          error: paymentAppError?.message || 'Failed to create payment application'
        });
        continue;
      }

      // Fetch project line items for this contractor and project
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('project_line_items')
        .select('id, description_of_work')
        .eq('project_id', projectId)
        .eq('contractor_id', contractor.id);
      if (lineItemsError) {
        results.push({ contractorId: contractor.id, error: 'Failed to fetch line items' });
        continue;
      }

      // Create payment_line_item_progress records for each line item
      if (lineItems && lineItems.length > 0) {
        const progressRecords = lineItems.map((li) => ({
          payment_app_id: paymentApp.id,
          line_item_id: li.id,
          submitted_percent: 0,
          pm_verified_percent: 0,
          previous_percent: 0,
          this_period_percent: 0,
          calculated_amount: 0,
          pm_adjustment_reason: null,
          verification_photos_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        const { error: progressError } = await supabase
          .from('payment_line_item_progress')
          .insert(progressRecords);
        if (progressError) {
          console.error('Line item progress creation error:', progressError);
          results.push({ 
            contractorId: contractor.id, 
            error: progressError?.message || 'Failed to create line item progress records'
          });
          continue;
        }
      }

      // Create payment_sms_conversations with line_items
      const { error: smsConvError } = await supabase
        .from('payment_sms_conversations')
        .insert({
          payment_app_id: paymentApp.id,
          contractor_phone: contractor.phone || '',
          conversation_state: 'awaiting_start',
          responses: [],
          line_items: lineItems || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (smsConvError) {
        console.error('SMS conversation creation error:', smsConvError);
        results.push({ 
          contractorId: contractor.id, 
          error: smsConvError?.message || 'Failed to create sms conversation'
        });
        continue;
      }

      // Send SMS via Twilio
      if (contractor.phone && TWILIO_PHONE_NUMBER) {
        // Use contract nickname from contractor object
        const contractNickname = contractor.contract_nickname;
        
        // Format: "project name - contract nickname - contractor name"
        let messageTitle = `${project.name}`;
        if (contractNickname) {
          messageTitle += ` - ${contractNickname}`;
        }
        messageTitle += ` - ${contractor.name}`;
        
        const message = `Payment app for ${messageTitle}. Ready for some quick questions? Reply YES to start.`;
        try {
          await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: contractor.phone,
          });
          results.push({ contractorId: contractor.id, status: 'sms_sent' });
        } catch (smsError: any) {
          console.error('SMS sending error:', smsError);
          results.push({ 
            contractorId: contractor.id, 
            error: `Failed to send SMS: ${smsError?.message || 'Unknown error'}`
          });
        }
      } else {
        results.push({ contractorId: contractor.id, error: 'Missing phone number' });
      }
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    let message = 'Unknown error';
    if (typeof err === 'object' && err && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}