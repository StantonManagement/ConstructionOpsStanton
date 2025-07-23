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

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get('From');
  const body = (formData.get('Body') || '').toString().trim().toUpperCase();

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

  // Only declare 'twiml' if it does not already exist in this scope
  const twiml = new MessagingResponse();

  if (error || !conv) {
    console.error('No active payment application conversation found for', from);
    twiml.message('No active payment application conversation found.');
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
    if (body === 'YES') {
      // Start the questions
      await supabase
        .from('payment_sms_conversations')
        .update({ conversation_state: 'in_progress', current_question_index: 0 })
        .eq('id', conv.id);
      if (numLineItems > 0) {
        // Fetch this_period for first line item from project_line_items
        const firstLineItemId = lineItems[0].id;
        const { data: pliRow } = await supabase
          .from('project_line_items')
          .select('this_period')
          .eq('id', firstLineItemId)
          .single();
        const prevPercent = pliRow?.this_period ?? 0;
        twiml.message(`What percent complete is your work for: ${lineItems[0].description_of_work}? (Previous: ${prevPercent}%)`);
      } else {
        // If no line items, skip to additional questions
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      twiml.message('Reply YES when you are ready to begin your payment application.');
    }
  } else if (conv.conversation_state === 'in_progress') {
    responses[idx] = body;
    let updateObj: any = { responses };
    let nextQuestion = '';
    let finished = false;

    if (idx < numLineItems) {
      // Update percent and this_period logic
      const lineItemId = lineItems[idx].id;
      const percent = parseFloat(body);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        console.warn('Invalid percent reply:', body, 'at idx:', idx);
        twiml.message('Please reply with a valid percent (0-100).');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Fetch the previous percentage to validate against
      const { data: pliRow } = await supabase
        .from('project_line_items')
        .select('this_period')
        .eq('id', lineItemId)
        .single();
      const prevPercent = pliRow?.this_period ?? 0;

      // VALIDATION: Check if entered percentage is less than previous percentage
      if (percent < prevPercent) {
        console.warn('Percentage cannot be less than previous:', { entered: percent, previous: prevPercent });
        twiml.message(`Error: You cannot enter ${percent}% as it's less than your previous completion of ${prevPercent}%. Please enter a percentage that is ${prevPercent}% or higher.`);
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Fetch the current payment_line_item_progress row and join project_line_items for scheduled_value
      const { data: plip, error: plipError } = await supabase
        .from('payment_line_item_progress')
        .select('id, submitted_percent, previous_percent, this_period_percent, calculated_amount, project_line_items(scheduled_value)')
        .eq('payment_app_id', conv.payment_app_id)
        .eq('line_item_id', lineItemId)
        .single();
      console.log('Fetched plip:', plip, 'for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId, 'Error:', plipError);

      // Calculate new this_period using scheduled_value from joined project_line_items
      let scheduledValue = Array.isArray(plip?.project_line_items) ? Number(plip.project_line_items[0]?.scheduled_value) || 0 : 0;
      let thisPeriod = Math.round((percent / 100) * scheduledValue);
      // Move current this_period_percent to previous_percent and update percent
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
        // Optionally, also update project_line_items.percent_completed for visibility
        console.log('Updating project_line_items.percent_completed, this_period, and amount_for_this_period for line_item_id:', lineItemId);
        // Fetch the current payment_applications row for context
        const { data: paymentApp, error: paymentAppError } = await supabase
          .from('payment_applications')
          .select('*')
          .eq('id', conv.payment_app_id)
          .single();
        if (paymentAppError) {
          console.error('Error fetching payment_applications for id:', conv.payment_app_id, paymentAppError);
        } else {
          console.log('Current payment_applications row:', paymentApp);
        }
        // Find the previous payment_app_id for this line_item_id with non-zero submitted_percent
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
        // Fetch scheduled_value for calculation
        const { data: currentPLI, error: currentPLIError } = await supabase
          .from('project_line_items')
          .select('scheduled_value')
          .eq('id', lineItemId)
          .single();
        const scheduledValueFloat = Number(currentPLI?.scheduled_value) || 0;
        // Calculate amount_for_this_period as scheduled_value * (percent / 100)
        const percentFloat = Number(percent);
        const amountForThisPeriod = parseFloat((scheduledValueFloat * (percentFloat / 100)).toFixed(2));
        // Update project_line_items with new values and set from_previous_application from previous progress
        const { data: pliUpdate, error: pliError } = await supabase
          .from('project_line_items')
          .update({ 
            percent_completed: percentFloat,
            this_period: percentFloat,
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
      console.log('Advancing to next question. New idx:', idx, 'numLineItems:', numLineItems);

      if (idx < numLineItems) {
        // Fetch this_period for next line item from project_line_items
        const nextLineItemId = lineItems[idx].id;
        const { data: pliRow } = await supabase
          .from('project_line_items')
          .select('this_period')
          .eq('id', nextLineItemId)
          .single();
        const prevPercent = pliRow?.this_period ?? 0;
        nextQuestion = `What percent complete is your work for: ${lineItems[idx].description_of_work}? (Previous: ${prevPercent}%)`;
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
        // Show summary after all questions (including additional)
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
        summary += `Total Requested = $${totalThisPeriod.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        summary += 'Please type "Yes" to submit or "No" to redo your answers.';
        twiml.message(summary);
      } else {
        twiml.message(nextQuestion);
      }
    } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
      // Handle additional questions (e.g., notes for PM)
      responses[idx] = body;
      idx++;
      updateObj.current_question_index = idx;

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
        summary += `Total Requested = $${totalThisPeriod.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        summary += 'Please type "Yes" to submit or "No" to redo your answers.';
        twiml.message(summary);
      }
    }
  } else if (conv.conversation_state === 'awaiting_confirmation') {
    if (body === 'YES') {
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
      // Save PM notes from last response (notes for PM)
      if (responses && responses.length > 0) {
        const pmNotes = responses[responses.length - 1];
        // Save to pm_notes field in payment_applications
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
      twiml.message('Thank you! Your payment application is submitted for Project Manager review.');
    } else if (body === 'NO') {
      // Restart line item questions: reset index, clear responses, set state to in_progress
      await supabase
        .from('payment_sms_conversations')
        .update({
          conversation_state: 'in_progress',
          current_question_index: 0,
          responses: []
        })
        .eq('id', conv.id);
      // Fetch the first line item for the question
      if (numLineItems > 0) {
        const firstLineItemId = lineItems[0].id;
        const { data: pliRow } = await supabase
          .from('project_line_items')
          .select('this_period, description_of_work')
          .eq('id', firstLineItemId)
          .single();
        const prevPercent = pliRow?.this_period ?? 0;
        const desc = pliRow?.description_of_work || lineItems[0].description_of_work || '';
        twiml.message(`What percent complete is your work for: ${desc}? (Previous: ${prevPercent}%)`);
      } else {
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      twiml.message('Please type "Yes" to submit or "No" to redo your answers.');
    }
  } else {
    twiml.message('This payment application conversation is already complete.');
  }

  return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
}