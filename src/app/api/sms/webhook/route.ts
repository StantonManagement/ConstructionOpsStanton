import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

// Force Node.js runtime for better logging
export const runtime = 'nodejs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Example questions (replace with dynamic logic as needed)
const QUESTIONS = [
  'What percent complete is your work for this period?',
  'Have you uploaded all required photos? (YES/NO)',
  'Is a lien waiver required? (YES/NO)',
  'Please write any notes for the Project Manager here'
];

// Helper function to generate summary
async function generateSummary(paymentAppId: number) {
  const { data: progressRows } = await supabase
    .from('payment_line_item_progress')
    .select('line_item_id, this_period_percent')
    .eq('payment_app_id', paymentAppId);
    
  const { data: lineItemsData } = await supabase
    .from('project_line_items')
    .select('id, scheduled_value, description_of_work, from_previous_application')
    .in('id', (progressRows || []).map(r => r.line_item_id));
  
  let summary = 'Summary of your application: ';
  let totalThisPeriod = 0;
  let totalPreviousAmount = 0;
  
  (progressRows || []).forEach((row, index) => {
    const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
    const totalPercent = Number(row.this_period_percent) || 0;
    const scheduled = Number(item?.scheduled_value) || 0;
    const previousPercent = Number(item?.from_previous_application) || 0;
    
    const totalAmount = scheduled * (totalPercent / 100);
    const previousAmount = scheduled * (previousPercent / 100);
    const thisPeriodAmount = totalAmount - previousAmount;
    
    totalThisPeriod += thisPeriodAmount;
    totalPreviousAmount += previousAmount;
    
    const desc = item?.description_of_work || 'Item';
    summary += `${desc} - (${totalPercent.toFixed(1)}%) = ${totalAmount.toFixed(0)} - ${previousPercent.toFixed(1)}% previous approved `;
  });
  
  const grandTotal = totalThisPeriod + totalPreviousAmount;
  summary += `Total Requested = ${grandTotal.toFixed(0)} - ${totalPreviousAmount.toFixed(0)} = ${totalThisPeriod.toFixed(0)} `;
  summary += 'Please type "Yes" to submit or "No" to redo your answers.';
  
  return summary;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get('From');
  const body = (formData.get('Body') || '').toString().trim().toUpperCase();

  console.log('Incoming SMS:', { from, body });
  console.error('DEBUG: SMS webhook called at', new Date().toISOString());

  if (!from) {
    console.error('No From in SMS');
    return NextResponse.json({ error: 'Missing From' }, { status: 400 });
  }

  const twiml = new MessagingResponse();

  // 1. Check for daily log first
  const { data: project } = await supabase
    .from('properties')
    .select('property_id')
    .eq('manager_phone', from)
    .single();

  if (project) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from('project_daily_logs')
      .upsert({
        project_id: project.property_id,
        manager_id: null,
        log_date: today,
        notes: body,
        status: 'submitted',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,log_date' });

    twiml.message('Thank you! Your daily log has been received.');
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // 2. Find the active conversation for this phone
  const { data: conv, error } = await supabase
    .from('payment_sms_conversations')
    .select('*')
    .eq('contractor_phone', from)
    .in('conversation_state', ['awaiting_start', 'in_progress', 'awaiting_confirmation'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Found conversation:', conv, 'Error:', error);

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

  const ADDITIONAL_QUESTIONS = [
    'Please write any notes for the Project Manager here'
  ];

  if (conv.conversation_state === 'awaiting_start') {
    if (body === 'YES') {
      await supabase
        .from('payment_sms_conversations')
        .update({ conversation_state: 'in_progress', current_question_index: 0 })
        .eq('id', conv.id);
      
      if (numLineItems > 0) {
        const firstLineItemId = lineItems[0].id;
        const { data: allPrevProgress } = await supabase
          .from('payment_line_item_progress')
          .select('submitted_percent, payment_app_id')
          .eq('line_item_id', firstLineItemId)
          .gt('submitted_percent', 0)
          .neq('payment_app_id', conv.payment_app_id)
          .order('payment_app_id', { ascending: false })
          .limit(1);
        
        const prevPercent = allPrevProgress && allPrevProgress.length > 0 ? Number(allPrevProgress[0].submitted_percent) : 0;
        twiml.message(`What percent complete is your work for: ${lineItems[0].description_of_work}? (Previous: ${prevPercent}%)`);
      } else {
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      twiml.message('Reply YES when you are ready to begin your payment application.');
    }
  } else if (conv.conversation_state === 'in_progress') {
    responses[idx] = body;

    if (idx < numLineItems) {
      // Handle line item percent validation and updates
      const lineItemId = lineItems[idx].id;
      const percent = parseFloat(body);
      
      if (isNaN(percent) || percent < 0 || percent > 100) {
        console.warn('[Percent Validation] Invalid percent reply:', { input: body, parsed: percent, idx, lineItemId });
        twiml.message('Please reply with a valid percent (0-100).');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Get previous progress
      const { data: allPrevProgress, error: prevError } = await supabase
        .from('payment_line_item_progress')
        .select('submitted_percent, payment_app_id')
        .eq('line_item_id', lineItemId)
        .gt('submitted_percent', 0)
        .neq('payment_app_id', conv.payment_app_id)
        .order('payment_app_id', { ascending: false })
        .limit(1);

      if (prevError) {
        console.error('[Percent Validation] Database error fetching previous progress:', prevError);
        twiml.message('System error occurred. Please try again later.');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      const prevProgress = allPrevProgress && allPrevProgress.length > 0 ? allPrevProgress[0] : null;
      const prevPercent = Number(prevProgress?.submitted_percent) || 0;
      const currentPercent = Number(percent);
      
      console.error(`[Percent Validation] Line Item ${lineItemId}: Previous=${prevPercent}%, Current=${currentPercent}%, PaymentApp=${conv.payment_app_id}`);
      
      if (currentPercent < prevPercent) {
        console.warn(`[Percent Validation] BLOCKED: ${currentPercent}% < ${prevPercent}% for line item ${lineItemId}`);
        twiml.message(`Error: ${currentPercent}% is less than your previous submission of ${prevPercent}%. Please enter ${prevPercent}% or higher.`);
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      console.log(`[Percent Validation] PASSED: ${currentPercent}% >= ${prevPercent}% for line item ${lineItemId}`);

      // Calculate amounts
      const { data: currentPLI } = await supabase
        .from('project_line_items')
        .select('scheduled_value')
        .eq('id', lineItemId)
        .single();
      
      const scheduledValueFloat = Number(currentPLI?.scheduled_value) || 0;
      const previousPercentFloat = Number(prevPercent);
      const thisPeriodPercent = Math.max(0, currentPercent - previousPercentFloat);
      const amountForThisPeriod = parseFloat((scheduledValueFloat * (thisPeriodPercent / 100)).toFixed(2));
      
      // Batch database updates for better performance
      const updatePromises = [
        supabase
          .from('payment_line_item_progress')
          .update({ 
            previous_percent: prevPercent,
            this_period_percent: percent,
            submitted_percent: percent,
            calculated_amount: amountForThisPeriod
          })
          .eq('payment_app_id', conv.payment_app_id)
          .eq('line_item_id', lineItemId),
        
        supabase
          .from('project_line_items')
          .update({ 
            percent_completed: currentPercent,
            this_period: currentPercent,
            amount_for_this_period: amountForThisPeriod,
            from_previous_application: previousPercentFloat
          })
          .eq('id', lineItemId)
      ];

      await Promise.all(updatePromises);

      idx++;
      
      // Update conversation and determine next action
      let nextQuestion = '';
      let shouldShowSummary = false;

      if (idx < numLineItems) {
        // Get next line item question
        const nextLineItemId = lineItems[idx].id;
        const { data: allPrevProgress } = await supabase
          .from('payment_line_item_progress')
          .select('submitted_percent, payment_app_id')
          .eq('line_item_id', nextLineItemId)
          .gt('submitted_percent', 0)
          .neq('payment_app_id', conv.payment_app_id)
          .order('payment_app_id', { ascending: false })
          .limit(1);
        
        const prevPercent = allPrevProgress && allPrevProgress.length > 0 ? Number(allPrevProgress[0].submitted_percent) : 0;
        nextQuestion = `What percent complete is your work for: ${lineItems[idx].description_of_work}? (Previous: ${prevPercent}%)`;
      } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
        nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
      } else {
        shouldShowSummary = true;
      }

      // Update conversation state
      const updateObj: any = { 
        responses,
        current_question_index: idx
      };

      if (shouldShowSummary) {
        updateObj.conversation_state = 'awaiting_confirmation';
      }

      await supabase
        .from('payment_sms_conversations')
        .update(updateObj)
        .eq('id', conv.id);

      if (shouldShowSummary) {
        const summary = await generateSummary(conv.payment_app_id);
        twiml.message(summary);
      } else {
        twiml.message(nextQuestion);
      }

    } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
      // Handle additional questions (PM notes, etc.)
      console.log('Processing additional question. idx:', idx, 'numLineItems:', numLineItems, 'body:', body);
      
      responses[idx] = body;
      idx++;

      // Save PM notes immediately when provided
      if (idx - numLineItems === 1) { // Just finished the PM notes question
        console.log('Saving PM notes for payment_app_id:', conv.payment_app_id, 'Notes:', body);
        await supabase
          .from('payment_applications')
          .update({ pm_notes: body })
          .eq('id', conv.payment_app_id);
      }

      const updateObj: any = { 
        responses,
        current_question_index: idx
      };

      if (idx - numLineItems >= ADDITIONAL_QUESTIONS.length) {
        // All questions answered - move to confirmation
        updateObj.conversation_state = 'awaiting_confirmation';
        
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        
        const summary = await generateSummary(conv.payment_app_id);
        twiml.message(summary);
      } else {
        // Ask next additional question
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        
        const nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
        twiml.message(nextQuestion);
      }
    }
  } else if (conv.conversation_state === 'awaiting_confirmation') {
    if (body === 'YES') {
      // Final submission
      const updatePromises = [
        supabase
          .from('payment_sms_conversations')
          .update({
            conversation_state: 'completed',
            completed_at: new Date().toISOString(),
            responses
          })
          .eq('id', conv.id),
        
        supabase
          .from('payment_applications')
          .update({ status: 'submitted' })
          .eq('id', conv.payment_app_id)
      ];

      // Calculate totals for final update
      const { data: progressRows } = await supabase
        .from('payment_line_item_progress')
        .select('this_period_percent, line_item_id')
        .eq('payment_app_id', conv.payment_app_id);
        
      const { data: lineItemsData } = await supabase
        .from('project_line_items')
        .select('id, scheduled_value, from_previous_application')
        .in('id', (progressRows || []).map(r => r.line_item_id));
        
      const totalCurrentPayment = (progressRows || []).reduce((sum, row) => {
        const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
        const totalPercent = Number(row.this_period_percent) || 0;
        const scheduled = Number(item?.scheduled_value) || 0;
        const previousPercent = Number(item?.from_previous_application) || 0;
        const thisPeriodPercent = Math.max(0, totalPercent - previousPercent);
        return sum + (scheduled * (thisPeriodPercent / 100));
      }, 0);

      updatePromises.push(
        supabase
          .from('payment_applications')
          .update({ 
            current_payment: totalCurrentPayment,
            current_period_value: totalCurrentPayment
          })
          .eq('id', conv.payment_app_id)
      );

      // Execute all updates
      await Promise.all(updatePromises);

      twiml.message('Thank you! Your payment application is submitted for Project Manager review.');
      
    } else if (body === 'NO') {
      // Restart - reset everything
      const resetPromises = [
        supabase
          .from('payment_sms_conversations')
          .update({
            conversation_state: 'in_progress',
            current_question_index: 0,
            responses: []
          })
          .eq('id', conv.id),
        
        supabase
          .from('payment_line_item_progress')
          .update({
            submitted_percent: 0,
            this_period_percent: 0,
            calculated_amount: 0,
            updated_at: new Date().toISOString()
          })
          .eq('payment_app_id', conv.payment_app_id)
      ];

      await Promise.all(resetPromises);
      
      if (numLineItems > 0) {
        const firstLineItemId = lineItems[0].id;
        const { data: allPrevProgress } = await supabase
          .from('payment_line_item_progress')
          .select('submitted_percent, payment_app_id')
          .eq('line_item_id', firstLineItemId)
          .gt('submitted_percent', 0)
          .neq('payment_app_id', conv.payment_app_id)
          .order('payment_app_id', { ascending: false })
          .limit(1);
        
        const prevPercent = allPrevProgress && allPrevProgress.length > 0 ? Number(allPrevProgress[0].submitted_percent) : 0;
        const desc = lineItems[0].description_of_work || '';
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