import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// POST: Create payment applications for selected contractors
export async function POST(req: NextRequest) {
  try {
    const { projectId, contractorIds } = await req.json();
    if (!projectId || !Array.isArray(contractorIds) || contractorIds.length === 0) {
      return NextResponse.json({ error: 'Missing projectId or contractorIds' }, { status: 400 });
    }

    // Ensure projectId is a number
    const projectIdNum = parseInt(projectId.toString());
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ error: 'Invalid projectId format' }, { status: 400 });
    }

    // Fetch project and contractor details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectIdNum)
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
      .eq('project_id', projectIdNum)
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
    console.log('Valid contracts data:', JSON.stringify(validContracts, null, 2));
    
    const contractors = validContracts.map(contract => {
      // Handle both array and object structures from Supabase
      const contractorData = Array.isArray(contract.contractors) 
        ? contract.contractors[0] 
        : contract.contractors;
      
      console.log('Processing contract:', { 
        contractorData, 
        contractorsField: contract.contractors,
        isArray: Array.isArray(contract.contractors)
      });
      
      return {
        id: contractorData?.id,
        name: contractorData?.name,
        phone: contractorData?.phone,
        contract_nickname: contract.contract_nickname,
        contract_amount: contract.contract_amount
      };
    }).filter(contractor => contractor.id !== undefined && contractor.id !== null); // Filter out contractors without valid IDs
    
    console.log('Processed contractors:', contractors);

    if (contractors.length === 0) {
      return NextResponse.json({ 
        error: 'No valid contractors found. The contractor data may be missing or corrupted.' 
      }, { status: 400 });
    }

    const results = [];
    for (const contractor of contractors) {
      // Ensure contractor ID exists and is valid
      if (!contractor.id) {
        results.push({ 
          contractorId: 'unknown', 
          error: 'Contractor ID is missing'
        });
        continue;
      }

      const contractorIdNum = parseInt(contractor.id.toString());
      if (isNaN(contractorIdNum)) {
        results.push({ 
          contractorId: contractor.id, 
          error: 'Invalid contractor ID format'
        });
        continue;
      }

      // Debug logging
      console.log(`Checking project_contractors for project_id: ${projectIdNum}, contractor_id: ${contractorIdNum}`);

      // Check if a project_contractors record exists, if not create one with proper contract amount
      const { data: existingProjectContractorList, error: checkError } = await supabase
        .from('project_contractors')
        .select('id, contract_amount')
        .eq('project_id', projectIdNum)
        .eq('contractor_id', contractorIdNum);

      const existingProjectContractor = existingProjectContractorList && existingProjectContractorList.length > 0 
        ? existingProjectContractorList[0] 
        : null;

      console.log('Existing project_contractor check:', {
        existingProjectContractor,
        checkError,
        listLength: existingProjectContractorList?.length,
        errorCode: checkError?.code
      });

      if (checkError) {
        console.error('Error checking project_contractors:', {
          error: checkError,
          projectId: projectIdNum,
          contractorId: contractorIdNum,
          code: checkError.code,
          message: checkError.message
        });
        results.push({ 
          contractorId: contractorIdNum, 
          error: 'Failed to verify project contractor relationship'
        });
        continue;
      }

      // If no project_contractors record exists, create one with the contract amount from contracts table
      if (!existingProjectContractor) {
        console.log('No existing project_contractor found, creating new one...');
        // Convert contract amount to number to satisfy database constraint
        const contractAmountNum = parseFloat(contractor.contract_amount);
        if (isNaN(contractAmountNum) || contractAmountNum <= 0) {
          results.push({ 
            contractorId: contractorIdNum, 
            error: `Invalid contract amount: ${contractor.contract_amount}`
          });
          continue;
        }

        console.log(`Creating project_contractors record with amount: ${contractAmountNum}`, {
          projectId: projectIdNum,
          contractorId: contractorIdNum,
          contractAmount: contractAmountNum,
          contractAmountOriginal: contractor.contract_amount
        });

        const { error: projectContractorError } = await supabase
          .from('project_contractors')
          .insert({
            project_id: projectIdNum,
            contractor_id: contractorIdNum,
            contract_amount: contractAmountNum,
            paid_to_date: 0,
            contract_status: 'active'
          });

        if (projectContractorError) {
          console.error('Error creating project_contractors record:', {
            error: projectContractorError,
            projectId: projectIdNum,
            contractorId: contractorIdNum,
            contractAmount: contractAmountNum,
            code: projectContractorError.code,
            message: projectContractorError.message
          });
          results.push({ 
            contractorId: contractorIdNum, 
            error: projectContractorError.message || 'Failed to create project contractor relationship'
          });
          continue;
        }
      }

      // Create payment application with all required fields
      const contractAmountNum = parseFloat(contractor.contract_amount);
      console.log('Creating payment application with total_contract_amount:', contractAmountNum);
      
      const { data: paymentApp, error: paymentAppError } = await supabase
        .from('payment_applications')
        .insert({
          project_id: projectIdNum,
          contractor_id: contractorIdNum,
          status: 'sms_sent',
          total_contract_amount: contractAmountNum, // Set this so the trigger doesn't use 0
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
          contractorId: contractorIdNum, 
          error: paymentAppError?.message || 'Failed to create payment application'
        });
        continue;
      }

      // Fetch project line items for this contractor and project
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('project_line_items')
        .select('id, description_of_work')
        .eq('project_id', projectIdNum)
        .eq('contractor_id', contractorIdNum);
      if (lineItemsError) {
        results.push({ contractorId: contractorIdNum, error: 'Failed to fetch line items' });
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
            contractorId: contractorIdNum, 
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
          contractorId: contractorIdNum, 
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
            contractorId: contractorIdNum, 
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