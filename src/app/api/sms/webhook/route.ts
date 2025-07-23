import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Example questions (replace with dynamic logic as needed)
const QUESTIONS = [
  'What percent complete is your work for this period?',
  'Have you uploaded all required photos? (YES/NO)',
  'Is a lien waiver required? (YES/NO)',
  'Please write any notes for the Project Manager here'
];

// Enhanced validation function for percentage input
function validatePercentage(input: string, previousPercent: number): { isValid: boolean; percent?: number; errorMessage?: string } {
  // Remove any whitespace and common characters
  const cleanInput = input.replace(/[%\s]/g, '');
  
  // Check if input is empty
  if (!cleanInput) {
    return {
      isValid: false,
      errorMessage: 'Please provide a percentage value.'
    };
  }
  
  // Try to parse as number
  const percent = parseFloat(cleanInput);
  
  // Check if it's a valid number
  if (isNaN(percent)) {
    return {
      isValid: false,
      errorMessage: 'Please reply with a valid number (e.g., 75 or 75.5).'
    };
  }
  
  // Check if it's within 0-100 range
  if (percent < 0) {
    return {
      isValid: false,
      errorMessage: 'Percentage cannot be negative. Please enter a value between 0 and 100.'
    };
  }
  
  if (percent > 100) {
    return {
      isValid: false,
      errorMessage: 'Percentage cannot exceed 100%. Please enter a value between 0 and 100.'
    };
  }
  
  // Check if it's greater than previous percentage
  if (percent <= previousPercent) {
    return {
      isValid: false,
      errorMessage: `Percentage must be greater than the previous ${previousPercent}%. Please enter a value between ${previousPercent + 0.1} and 100.`
    };
  }
  
  // Check for reasonable decimal places (max 2)
  const decimalPlaces = (percent.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      errorMessage: 'Please limit percentage to 2 decimal places (e.g., 75.50).'
    };
  }
  
  return {
    isValid: true,
    percent: Math.round(percent * 100) / 100 // Round to 2 decimal places
  };
}

// Enhanced validation for YES/NO responses
function validateYesNo(input: string): { isValid: boolean; value?: boolean; errorMessage?: string } {
  const cleanInput = input.toUpperCase().trim();
  
  const yesVariations = ['YES', 'Y', 'TRUE', '1', 'YEAH', 'YEP', 'CORRECT'];
  const noVariations = ['NO', 'N', 'FALSE', '0', 'NOPE', 'NAH', 'INCORRECT'];
  
  if (yesVariations.includes(cleanInput)) {
    return { isValid: true, value: true };
  }
  
  if (noVariations.includes(cleanInput)) {
    return { isValid: true, value: false };
  }
  
  return {
    isValid: false,
    errorMessage: 'Please reply with YES or NO.'
  };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get('From');
  const body = (formData.get('Body') || '').toString().trim();

  console.log('Incoming SMS:', { from, body });

  if (!from) {
    console.error('No From in SMS');
    return NextResponse.json({ error: 'Missing From' }, { status: 400 });
  }

  // 1. Find which project this phone number manages
  const { data: project } = await supabase
    .from('properties')
    .select('property_id')
    .eq('manager_phone', from)
    .single();

  if (project) {
    const today = new Date().toISOString().slice(0, 10);
    // 2. Upsert the daily log
    await supabase
      .from('project_daily_logs')
      .upsert({
        project_id: project.property_id,
        manager_id: null, // Fill if you have manager_id
        log_date: today,
        notes: body,
        status: 'submitted',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,log_date' });

    // 3. Respond to the manager
    const twiml = new MessagingResponse();
    twiml.message('Thank you! Your daily log has been received.');
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Find the active conversation for this phone
  const { data: conv, error } = await supabase
    .from('payment_sms_conversations')
    .select('*')
    .eq('contractor_phone', from)
    .in('conversation_state', ['awaiting_start', 'in_progress', 'awaiting_confirmation'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Found conversation:', conv, 'Error:', error);

  const twiml = new MessagingResponse();

  if (error || !conv) {
    console.error('No active payment application conversation found for', from);
    twiml.message('No active payment application conversation found. Please contact your project manager to start a new payment application.');
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Ensure responses is an array and idx is a number
  let responses: string[] = Array.isArray(conv.responses) ? conv.responses : [];
  let idx: number = typeof conv.current_question_index === 'number' ? conv.current_question_index : 0;
  const lineItems = Array.isArray(conv.line_items) ? conv.line_items : [];
  const numLineItems = lineItems.length;

  // Define additional questions after line items
  const ADDITIONAL_QUESTIONS = [
    'Please write any notes for the Project Manager here'
  ];

  if (conv.conversation_state === 'awaiting_start') {
    const validation = validateYesNo(body);
    if (!validation.isValid) {
      twiml.message(`${validation.errorMessage} Reply YES when you are ready to begin your payment application.`);
      return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }
    
    if (validation.value === true) {
      // Start the questions
      await supabase
        .from('payment_sms_conversations')
        .update({ conversation_state: 'in_progress', current_question_index: 0 })
        .eq('id', conv.id);
      if (numLineItems > 0) {
        // Fetch this_period and from_previous_application for first line item
        const firstLineItemId = lineItems[0].id;
        const { data: pliRow } = await supabase
          .from('project_line_items')
          .select('this_period, from_previous_application, description_of_work')
          .eq('id', firstLineItemId)
          .single();
        const prevPercent = pliRow?.from_previous_application ?? 0;
        twiml.message(`What percent complete is your work for: ${lineItems[0].description_of_work}? (Previous: ${prevPercent}%)\n\nPlease enter a number between ${prevPercent + 0.1} and 100.`);
      } else {
        // If no line items, skip to additional questions
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      twiml.message('Reply YES when you are ready to begin your payment application.');
    }
  } else if (conv.conversation_state === 'in_progress') {
    let updateObj: any = { responses };
    let nextQuestion = '';

    if (idx < numLineItems) {
      // Validate percentage input
      const lineItemId = lineItems[idx].id;
      
      // Fetch from_previous_application for validation
      const { data: pliRow } = await supabase
        .from('project_line_items')
        .select('from_previous_application, scheduled_value, description_of_work')
        .eq('id', lineItemId)
        .single();
      const prevPercent = Number(pliRow?.from_previous_application) || 0;

      const validation = validatePercentage(body, prevPercent);
      
      if (!validation.isValid) {
        twiml.message(`${validation.errorMessage}\n\nFor: ${pliRow?.description_of_work || 'this work item'} (Previous: ${prevPercent}%)`);
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      const percent = validation.percent!;
      responses[idx] = percent.toString();

      // Calculate new this_period using scheduled_value
      const scheduledValue = Number(pliRow?.scheduled_value) || 0;
      const thisPeriod = Math.round((percent / 100) * scheduledValue);

      // Fetch the current payment_line_item_progress row
      const { data: plip, error: plipError } = await supabase
        .from('payment_line_item_progress')
        .select('id, submitted_percent, previous_percent, this_period_percent, calculated_amount')
        .eq('payment_app_id', conv.payment_app_id)
        .eq('line_item_id', lineItemId)
        .single();
      console.log('Fetched plip:', plip, 'for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId, 'Error:', plipError);

      if (plip?.id) {
        console.log('Updating progress for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId);
        const { data: progressUpdate, error: progressError } = await supabase
          .from('payment_line_item_progress')
          .update({ 
            previous_percent: plip.this_period_percent,
            this_period_percent: percent,
            submitted_percent: percent,
            calculated_amount: thisPeriod
          })
          .eq('payment_app_id', conv.payment_app_id)
          .eq('line_item_id', lineItemId)
          .select();
        console.log('Progress update result:', progressUpdate, 'Error:', progressError);

        // Update project_line_items
        const { data: prevProgress, error: prevProgressError } = await supabase
          .from('payment_line_item_progress')
          .select('submitted_percent, payment_app_id')
          .eq('line_item_id', lineItemId)
          .lt('payment_app_id', conv.payment_app_id)
          .not('submitted_percent', 'eq', '0')
          .order('payment_app_id', { ascending: false })
          .limit(1)
          .single();
        const previousSubmittedPercent = Number(prevProgress?.submitted_percent) || 0;

        const amountForThisPeriod = parseFloat((scheduledValue * (percent / 100)).toFixed(2));
        const { data: pliUpdate, error: pliError } = await supabase
          .from('project_line_items')
          .update({ 
            percent_completed: percent,
            this_period: percent,
            amount_for_this_period: amountForThisPeriod,
            from_previous_application: previousSubmittedPercent
          })
          .eq('id', lineItemId)
          .select();
        console.log('Project line item update result:', pliUpdate, 'Error:', pliError);
      } else {
        console.error('No payment_line_item_progress found for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId);
      }

      idx++;
      updateObj.current_question_index = idx;
      updateObj.responses = responses;
      console.log('Advancing to next question. New idx:', idx, 'numLineItems:', numLineItems);

      if (idx < numLineItems) {
        // Fetch from_previous_application for next line item
        const nextLineItemId = lineItems[idx].id;
        const { data: pliRow } = await supabase
          .from('project_line_items')
          .select('from_previous_application, description_of_work')
          .eq('id', nextLineItemId)
          .single();
        const prevPercent = pliRow?.from_previous_application ?? 0;
        nextQuestion = `What percent complete is your work for: ${lineItems[idx].description_of_work}? (Previous: ${prevPercent}%)\n\nPlease enter a number between ${prevPercent + 0.1} and 100.`;
      } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
        nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
      } else {
        // All questions answered, show summary and move to confirmation
        updateObj.conversation_state = 'awaiting_confirmation';
      }

      const { error: convoUpdateError } = await supabase
        .from('payment_sms_conversations')
        .update(updateObj)
        .eq('id', conv.id);
      if (convoUpdateError) {
        console.error('Error updating payment_sms_conversations:', convoUpdateError, 'UpdateObj:', updateObj);
      } else {
        console.log('Updated payment_sms_conversations with:', updateObj);
      }

      if (updateObj.conversation_state === 'awaiting_confirmation') {
        // Show summary after all questions
        const { data: progressRows } = await supabase
          .from('payment_line_item_progress')
          .select('line_item_id, this_period_percent')
          .eq('payment_app_id', conv.payment_app_id);
        const { data: lineItemsData } = await supabase
          .from('project_line_items')
          .select('id, scheduled_value, description_of_work')
          .in('id', (progressRows || []).map(r => r.line_item_id));
        let summary = 'Summary of your application:\n';
        let totalThisPeriod = 0;
        (progressRows || []).forEach((row) => {
          const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
          const thisPeriodPercent = Number(row.this_period_percent) || 0;
          const scheduled = Number(item?.scheduled_value) || 0;
          const thisPeriodDollar = scheduled * (thisPeriodPercent / 100);
          totalThisPeriod += thisPeriodDollar;
          const desc = item?.description_of_work || 'Item';
          summary += `${desc} - (${thisPeriodPercent.toFixed(1)}%) = $${thisPeriodDollar.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        });
        summary += `Total Requested = $${totalThisPeriod.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n\n`;
        summary += 'Please type "YES" to submit or "NO" to redo your answers.';
        twiml.message(summary);
      } else {
        twiml.message(nextQuestion);
      }
    } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
      // Handle additional questions (notes)
      if (!body.trim()) {
        twiml.message('Please provide your notes for the Project Manager, or type "NONE" if you have no notes.');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      responses[idx] = body;
      idx++;
      updateObj.current_question_index = idx;
      updateObj.responses = responses;

      if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
        // Ask next additional question
        nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        twiml.message(nextQuestion);
      } else {
        // All additional questions answered, show summary
        updateObj.conversation_state = 'awaiting_confirmation';
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        // Show summary
        const { data: progressRows } = await supabase
          .from('payment_line_item_progress')
          .select('line_item_id, this_period_percent')
          .eq('payment_app_id', conv.payment_app_id);
        const { data: lineItemsData } = await supabase
          .from('project_line_items')
          .select('id, scheduled_value, description_of_work')
          .in('id', (progressRows || []).map(r => r.line_item_id));
        let summary = 'Summary of your application:\n';
        let totalThisPeriod = 0;
        (progressRows || []).forEach((row) => {
          const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
          const thisPeriodPercent = Number(row.this_period_percent) || 0;
          const scheduled = Number(item?.scheduled_value) || 0;
          const thisPeriodDollar = scheduled * (thisPeriodPercent / 100);
          totalThisPeriod += thisPeriodDollar;
          const desc = item?.description_of_work || 'Item';
          summary += `${desc} - (${thisPeriodPercent.toFixed(1)}%) = $${thisPeriodDollar.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        });
        summary += `Total Requested = $${totalThisPeriod.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n\n`;
        summary += 'Please type "YES" to submit or "NO" to redo your answers.';
        twiml.message(summary);
      }
    }
  } else if (conv.conversation_state === 'awaiting_confirmation') {
    const validation = validateYesNo(body);
    if (!validation.isValid) {
      twiml.message(`${validation.errorMessage} Type "YES" to submit your application or "NO" to redo your answers.`);
      return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }
    
    if (validation.value === true) {
      // Final submission
      const updateObj = {
        conversation_state: 'completed',
        completed_at: new Date().toISOString(),
        responses
      };
      await supabase
        .from('payment_sms_conversations')
        .update(updateObj)
        .eq('id', conv.id);
      // Update payment application status
      const { error: appUpdateError } = await supabase
        .from('payment_applications')
        .update({ status: 'submitted' })
        .eq('id', conv.payment_app_id);
      if (appUpdateError) {
        console.error('Error updating payment_applications status:', appUpdateError);
      }
      // Save PM notes from last response
      if (responses && responses.length > 0) {
        const pmNotes = responses[responses.length - 1];
        const { error: pmNotesError } = await supabase
          .from('payment_applications')
          .update({ pm_notes: pmNotes })
          .eq('id', conv.payment_app_id);
        if (pmNotesError) {
          console.error('Error saving pm_notes:', pmNotesError);
        }
      }
      // Calculate total current payment
      const { data: progressRows, error: progressRowsError } = await supabase
        .from('payment_line_item_progress')
        .select('this_period_percent, line_item_id')
        .eq('payment_app_id', conv.payment_app_id);
      if (progressRowsError) {
        console.error('Error fetching progressRows for total payment:', progressRowsError);
      }
      const { data: lineItemsData } = await supabase
        .from('project_line_items')
        .select('id, scheduled_value')
        .in('id', (progressRows || []).map(r => r.line_item_id));
      const totalCurrentPayment = (progressRows || []).reduce((sum, row) => {
        const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
        const percent = Number(row.this_period_percent) || 0;
        const scheduled = Number(item?.scheduled_value) || 0;
        return sum + (scheduled * (percent / 100));
      }, 0);
      const { error: paymentAppUpdateError } = await supabase
        .from('payment_applications')
        .update({ current_payment: totalCurrentPayment })
        .eq('id', conv.payment_app_id);
      if (paymentAppUpdateError) {
        console.error('Error updating current_payment in payment_applications:', paymentAppUpdateError);
      }
      twiml.message('✅ Thank you! Your payment application has been submitted successfully and is now under Project Manager review. You will be notified of any updates.');
    } else {
      // Restart line item questions
      await supabase
        .from('payment_sms_conversations')
        .update({
          conversation_state: 'in_progress',
          current_question_index: 0,
          responses: []
        })
        .eq('id', conv.id);
      if (numLineItems > 0) {
        const firstLineItemId = lineItems[0].id;
        const { data: pliRow } = await supabase
          .from('project_line_items')
          .select('from_previous_application, description_of_work')
          .eq('id', firstLineItemId)
          .single();
        const prevPercent = pliRow?.from_previous_application ?? 0;
        twiml.message(`Let's start over.\n\nWhat percent complete is your work for: ${lineItems[0].description_of_work}? (Previous: ${prevPercent}%)\n\nPlease enter a number between ${prevPercent + 0.1} and 100.`);
      } else {
        twiml.message(`Let's start over.\n\n${ADDITIONAL_QUESTIONS[0]}`);
      }
    }
  } else {
    twiml.message('This payment application conversation is already complete. Please contact your project manager if you need to submit a new application.');
  }

  return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
}