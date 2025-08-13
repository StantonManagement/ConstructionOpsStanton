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

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get('From');
  const body = (formData.get('Body') || '').toString().trim().toUpperCase();

  console.log('Incoming SMS:', { from, body });
  console.error('DEBUG: SMS webhook called at', new Date().toISOString()); // Force error-level logging

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
         // Get the ACTUAL previous completed percentage from prior payment applications
         const firstLineItemId = lineItems[0].id;
         const { data: allPrevProgress } = await supabase
           .from('payment_line_item_progress')
           .select('submitted_percent, payment_app_id')
           .eq('line_item_id', firstLineItemId)
           .gt('submitted_percent', 0)
           .neq('payment_app_id', conv.payment_app_id) // Exclude current application
           .order('payment_app_id', { ascending: false })
           .limit(1);
         
         const prevPercent = allPrevProgress && allPrevProgress.length > 0 ? Number(allPrevProgress[0].submitted_percent) : 0;
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
      
      // Basic validation for percent range
      if (isNaN(percent) || percent < 0 || percent > 100) {
        console.warn('[Percent Validation] Invalid percent reply:', { input: body, parsed: percent, idx, lineItemId });
        twiml.message('Please reply with a valid percent (0-100).');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Get the previous submitted percent for this line item from payment_line_item_progress
      // Use a simpler, more reliable query approach
      const { data: allPrevProgress, error: prevError } = await supabase
        .from('payment_line_item_progress')
        .select('submitted_percent, payment_app_id')
        .eq('line_item_id', lineItemId)
        .gt('submitted_percent', 0)
        .neq('payment_app_id', conv.payment_app_id) // Exclude current application
        .order('payment_app_id', { ascending: false }) // Order by payment_app_id (newer apps have higher IDs)
        .limit(1);

      // Handle database errors explicitly
      if (prevError) {
        console.error('[Percent Validation] Database error fetching previous progress:', prevError);
        twiml.message('System error occurred. Please try again later.');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      const prevProgress = allPrevProgress && allPrevProgress.length > 0 ? allPrevProgress[0] : null;
      const prevPercent = Number(prevProgress?.submitted_percent) || 0;
      const currentPercent = Number(percent);
      
      console.error(`[Percent Validation] Line Item ${lineItemId}: Previous=${prevPercent}%, Current=${currentPercent}%, PaymentApp=${conv.payment_app_id}`);
      console.error(`[Percent Validation] Previous progress data:`, JSON.stringify(prevProgress));
      console.error(`[Percent Validation] All previous progress query result:`, JSON.stringify(allPrevProgress));
      
      // Validate that the new percentage is not less than the previous percentage
      if (currentPercent < prevPercent) {
        console.warn(`[Percent Validation] BLOCKED: ${currentPercent}% < ${prevPercent}% for line item ${lineItemId}`);
        twiml.message(`Error: ${currentPercent}% is less than your previous submission of ${prevPercent}%. Please enter ${prevPercent}% or higher.`);
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      console.log(`[Percent Validation] PASSED: ${currentPercent}% >= ${prevPercent}% for line item ${lineItemId}`);

      // Fetch the current payment_line_item_progress row and join project_line_items for scheduled_value
      const { data: plip, error: plipError } = await supabase
        .from('payment_line_item_progress')
        .select('id, submitted_percent, previous_percent, this_period_percent, calculated_amount, project_line_items(scheduled_value)')
        .eq('payment_app_id', conv.payment_app_id)
        .eq('line_item_id', lineItemId)
        .single();
      console.log('Fetched plip:', plip, 'for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId, 'Error:', plipError);

      // Calculate the difference between current percentage and previous percentage
      const percentFloat = Number(percent);
      const previousPercentFloat = Number(prevPercent);
      const thisPeriodPercent = Math.max(0, percentFloat - previousPercentFloat); // This period is the difference
      
      // Fetch scheduled_value for calculation
      const { data: currentPLI, error: currentPLIError } = await supabase
        .from('project_line_items')
        .select('scheduled_value')
        .eq('id', lineItemId)
        .single();
      const scheduledValueFloat = Number(currentPLI?.scheduled_value) || 0;
      const amountForThisPeriod = parseFloat((scheduledValueFloat * (thisPeriodPercent / 100)).toFixed(2));
      
      // Move current this_period_percent to previous_percent and update percent
      if (plip?.id) {
        console.log('Updating progress for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId);
        const { data: progressUpdate, error: progressError } = await supabase
          .from('payment_line_item_progress')
          .update({ 
            previous_percent: plip.this_period_percent,
            this_period_percent: percent, // Store the total percentage as before
            submitted_percent: percent, // Keep the total percentage
            calculated_amount: amountForThisPeriod // Use the calculated amount for this period
          })
          .eq('payment_app_id', conv.payment_app_id)
          .eq('line_item_id', lineItemId)
          .select();
        console.log('Progress update result:', progressUpdate, 'Error:', progressError);
        
        // Update project_line_items with new values and set from_previous_application from previous progress
        const { data: pliUpdate, error: pliError } = await supabase
          .from('project_line_items')
          .update({ 
            percent_completed: percentFloat,
            this_period: percentFloat, // Store the total percentage as before
            amount_for_this_period: amountForThisPeriod,
            from_previous_application: previousPercentFloat
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
         // Get the ACTUAL previous completed percentage from prior payment applications
         const nextLineItemId = lineItems[idx].id;
         const { data: allPrevProgress } = await supabase
           .from('payment_line_item_progress')
           .select('submitted_percent, payment_app_id')
           .eq('line_item_id', nextLineItemId)
           .gt('submitted_percent', 0)
           .neq('payment_app_id', conv.payment_app_id) // Exclude current application
           .order('payment_app_id', { ascending: false })
           .limit(1);
         
         const prevPercent = allPrevProgress && allPrevProgress.length > 0 ? Number(allPrevProgress[0].submitted_percent) : 0;
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
          .select('id, scheduled_value, description_of_work, from_previous_application')
          .in('id', (progressRows || []).map(r => r.line_item_id));
        
        // Build summary in the requested format
        let summary = 'Summary of your application: ';
        let totalThisPeriod = 0;
        let totalPreviousAmount = 0;
        
        (progressRows || []).forEach((row, index) => {
          const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
          const totalPercent = Number(row.this_period_percent) || 0; // This is the total percentage
          const scheduled = Number(item?.scheduled_value) || 0;
          const previousPercent = Number(item?.from_previous_application) || 0;
          
          // Calculate amounts
          const totalAmount = scheduled * (totalPercent / 100);
          const previousAmount = scheduled * (previousPercent / 100);
          const thisPeriodAmount = totalAmount - previousAmount;
          
          totalThisPeriod += thisPeriodAmount;
          totalPreviousAmount += previousAmount;
          
          const desc = item?.description_of_work || 'Item';
          
          if (index === 0) {
            // First item - start the summary
            summary += `${desc} - (${totalPercent.toFixed(1)}%) = ${totalAmount.toFixed(0)} - ${previousPercent.toFixed(1)}% previous approved `;
          } else {
            // Additional items - add to summary
            summary += `${desc} - (${totalPercent.toFixed(1)}%) = ${totalAmount.toFixed(0)} - ${previousPercent.toFixed(1)}% previous approved `;
          }
        });
        
        // Add total calculation
        const grandTotal = totalThisPeriod + totalPreviousAmount;
        summary += `Total Requested = ${totalThisPeriod.toFixed(0)} `;
        summary += 'Please type "Yes" to submit or "No" to redo your answers.';
        
                 // Update conversation state first, then send summary
         await supabase
           .from('payment_sms_conversations')
           .update({ conversation_state: 'awaiting_confirmation' })
           .eq('id', conv.id);
         
         // Send summary after state is updated
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
        // All additional questions answered - send summary immediately, then update state
        const { data: progressRows } = await supabase
          .from('payment_line_item_progress')
          .select('line_item_id, this_period_percent')
          .eq('payment_app_id', conv.payment_app_id);
        const { data: lineItemsData } = await supabase
          .from('project_line_items')
          .select('id, scheduled_value, description_of_work, from_previous_application')
          .in('id', (progressRows || []).map(r => r.line_item_id));
        
        // Build summary in the requested format
        let summary = 'Summary of your application: ';
        let totalThisPeriod = 0;
        let totalPreviousAmount = 0;
        
        (progressRows || []).forEach((row, index) => {
          const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
          const totalPercent = Number(row.this_period_percent) || 0; // This is the total percentage
          const scheduled = Number(item?.scheduled_value) || 0;
          const previousPercent = Number(item?.from_previous_application) || 0;
          
          // Calculate amounts
          const totalAmount = scheduled * (totalPercent / 100);
          const previousAmount = scheduled * (previousPercent / 100);
          const thisPeriodAmount = totalAmount - previousAmount;
          
          totalThisPeriod += thisPeriodAmount;
          totalPreviousAmount += previousAmount;
          
          const desc = item?.description_of_work || 'Item';
          
          if (index === 0) {
            // First item - start the summary
            summary += `${desc} - (${totalPercent.toFixed(1)}%) = ${totalAmount.toFixed(0)} - ${previousPercent.toFixed(1)}% previous approved `;
          } else {
            // Additional items - add to summary
            summary += `${desc} - (${totalPercent.toFixed(1)}%) = ${totalAmount.toFixed(0)} - ${previousPercent.toFixed(1)}% previous approved `;
          }
        });
        
        // Add total calculation
        const grandTotal = totalThisPeriod + totalPreviousAmount;
        summary += `Total Requested = ${grandTotal.toFixed(0)} - ${totalPreviousAmount.toFixed(0)} = ${totalThisPeriod.toFixed(0)} `;
        summary += 'Please type "Yes" to submit or "No" to redo your answers.';
        
                 // Update conversation state first, then send summary
         await supabase
           .from('payment_sms_conversations')
           .update({ conversation_state: 'awaiting_confirmation' })
           .eq('id', conv.id);
         
         // Send summary after state is updated
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
        .select('id, scheduled_value, from_previous_application')
        .in('id', (progressRows || []).map(r => r.line_item_id));
      const totalCurrentPayment = (progressRows || []).reduce((sum, row) => {
        const item = (lineItemsData || []).find(li => li.id === row.line_item_id);
        const totalPercent = Number(row.this_period_percent) || 0; // This is the total percentage
        const scheduled = Number(item?.scheduled_value) || 0;
        
        // Calculate the difference for this period
        const previousPercent = Number(item?.from_previous_application) || 0;
        const thisPeriodPercent = Math.max(0, totalPercent - previousPercent);
        
        return sum + (scheduled * (thisPeriodPercent / 100));
      }, 0);
      
      // Calculate current period value (this period - previous)
      const currentPeriodValue = totalCurrentPayment;
      
      const { error: paymentAppUpdateError } = await supabase
        .from('payment_applications')
        .update({ 
          current_payment: totalCurrentPayment,
          current_period_value: currentPeriodValue
        })
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
      
      // Reset all progress records to 0 since user is redoing
      await supabase
        .from('payment_line_item_progress')
        .update({
          submitted_percent: 0,
          this_period_percent: 0,
          calculated_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('payment_app_id', conv.payment_app_id);
      
      // Fetch the first line item for the question
      if (numLineItems > 0) {
        const firstLineItemId = lineItems[0].id;
        
        // Get the ACTUAL previous completed percentage from prior payment applications
        const { data: allPrevProgress } = await supabase
          .from('payment_line_item_progress')
          .select('submitted_percent, payment_app_id')
          .eq('line_item_id', firstLineItemId)
          .gt('submitted_percent', 0)
          .neq('payment_app_id', conv.payment_app_id) // Exclude current application
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