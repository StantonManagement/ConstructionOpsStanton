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
  // FORCE LOGGING - This should always appear
  console.log('🚀🚀🚀 SMS WEBHOOK CALLED 🚀🚀🚀');
  console.log('Timestamp:', new Date().toISOString());
  
  const formData = await req.formData();
  const from = formData.get('From');
  const body = (formData.get('Body') || '').toString().trim().toUpperCase();

  console.log('📱 Incoming SMS Details:');
  console.log('  From:', from);
  console.log('  Body (original):', formData.get('Body'));
  console.log('  Body (processed):', body);

  if (!from) {
    console.error('❌ No From in SMS');
    return NextResponse.json({ error: 'Missing From' }, { status: 400 });
  }

  // 1. Find which project this phone number manages
  console.log('🔍 Checking if this is a project manager...');
  const { data: project } = await supabase
    .from('properties')
    .select('property_id')
    .eq('manager_phone', from)
    .single();

  if (project) {
    console.log('✅ This is a project manager, handling daily log');
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

  console.log('🔍 Looking for payment application conversation...');
  // Find the active conversation for this phone
  const { data: conv, error } = await supabase
    .from('payment_sms_conversations')
    .select('*')
    .eq('contractor_phone', from)
    .in('conversation_state', ['awaiting_start', 'in_progress', 'awaiting_confirmation'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('💬 Conversation query result:');
  console.log('  Found conversation:', !!conv);
  console.log('  Error:', error);
  if (conv) {
    console.log('  Conversation ID:', conv.id);
    console.log('  State:', conv.conversation_state);
    console.log('  Current index:', conv.current_question_index);
    console.log('  Payment app ID:', conv.payment_app_id);
  }

  const twiml = new MessagingResponse();

  if (error || !conv) {
    console.error('❌ No active payment application conversation found for', from);
    twiml.message('No active payment application conversation found.');
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }

  // Ensure responses is an array and idx is a number
  let responses: string[] = Array.isArray(conv.responses) ? conv.responses : [];
  let idx: number = typeof conv.current_question_index === 'number' ? conv.current_question_index : 0;
  const lineItems = Array.isArray(conv.line_items) ? conv.line_items : [];
  const numLineItems = lineItems.length;

  console.log('📊 Current state analysis:');
  console.log('  Responses array length:', responses.length);
  console.log('  Current index (idx):', idx);
  console.log('  Number of line items:', numLineItems);
  console.log('  Line items:', lineItems.map((li: any) => ({ id: li.id, description: li.description_of_work })));

  // Define additional questions after line items
  const ADDITIONAL_QUESTIONS = [
    'Please write any notes for the Project Manager here'
  ];

  if (conv.conversation_state === 'awaiting_start') {
    console.log('🟡 Processing awaiting_start state');
    if (body === 'YES') {
      console.log('✅ User said YES, starting conversation');
      // Start the questions
      await supabase
        .from('payment_sms_conversations')
        .update({ conversation_state: 'in_progress', current_question_index: 0 })
        .eq('id', conv.id);
      if (numLineItems > 0) {
        // Fetch this_period for first line item from project_line_items
        const firstLineItemId = lineItems[0].id;
        console.log('🔍 Fetching previous percentage for first line item:', firstLineItemId);
        const { data: pliRow } = await supabase
          .from('project_line_items')
          .select('this_period')
          .eq('id', firstLineItemId)
          .single();
        const prevPercent = pliRow?.this_period ?? 0;
        console.log('📈 First line item previous percentage:', prevPercent);
        twiml.message(`What percent complete is your work for: ${lineItems[0].description_of_work}? (Previous: ${prevPercent}%)`);
      } else {
        // If no line items, skip to additional questions
        console.log('⚠️ No line items found, moving to additional questions');
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      console.log('❌ User did not reply YES, sending start prompt again');
      twiml.message('Reply YES when you are ready to begin your payment application.');
    }
  } else if (conv.conversation_state === 'in_progress') {
    console.log('🟢 Processing in_progress state');
    console.log('  Current index:', idx);
    console.log('  User input:', body);
    console.log('  Is processing line item?', idx < numLineItems);
    
    responses[idx] = body;
    let updateObj: any = { responses };
    let nextQuestion = '';

    if (idx < numLineItems) {
      console.log('🏗️ Processing line item', idx + 1, 'of', numLineItems);
      const lineItemId = lineItems[idx].id;
      const percent = parseFloat(body);
      
      console.log('📊 Line item details:');
      console.log('  Line item ID:', lineItemId);
      console.log('  User entered text:', body);
      console.log('  Parsed percent:', percent);
      console.log('  Is valid number?', !isNaN(percent));

      // Basic validation for user input
      if (isNaN(percent) || percent < 0 || percent > 100) {
        console.warn('❌ VALIDATION FAILED - Invalid percent:', {
          originalInput: body,
          parsedPercent: percent,
          isNaN: isNaN(percent),
          lessThanZero: percent < 0,
          greaterThan100: percent > 100
        });
        twiml.message('Please reply with a valid percent (0-100).');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      console.log('✅ Basic validation passed, checking against previous percentage...');

      // Fetch the previous percentage to validate against
      console.log('🔍 Querying previous progress for line item:', lineItemId);
      console.log('  Current payment app ID:', conv.payment_app_id);
      
      const { data: prevProgress, error: prevProgressError } = await supabase
        .from('payment_line_item_progress')
        .select('submitted_percent, payment_app_id')
        .eq('line_item_id', lineItemId)
        .lt('payment_app_id', conv.payment_app_id)
        .not('submitted_percent', 'eq', 0)
        .order('payment_app_id', { ascending: false })
        .limit(1)
        .single();

      console.log('📋 Previous progress query result:');
      console.log('  Data:', prevProgress);
      console.log('  Error:', prevProgressError);
      
      const prevPercent = Number(prevProgress?.submitted_percent) ?? 0;
      
      console.log('📈 Percentage comparison:');
      console.log('  Previous percentage:', prevPercent);
      console.log('  Current input:', percent);
      console.log('  Is current less than previous?', percent < prevPercent);

      // **VALIDATION**: Ensure the new percentage is not less than the previous one
      if (percent < prevPercent) {
        console.warn('❌ VALIDATION FAILED - Percentage reduction attempt:');
        console.warn('  User input:', percent);
        console.warn('  Previous percent:', prevPercent);
        console.warn('  Line item ID:', lineItemId);
        console.warn('  Previous payment app ID:', prevProgress?.payment_app_id);
        
        twiml.message('Please reply with a percentage that is larger than or equal to your last application. Line items may not be reduced.');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      console.log('✅ VALIDATION PASSED - Percentage is acceptable');
      console.log('  User input:', percent);
      console.log('  Previous percent:', prevPercent);

      // Continue with the rest of your existing logic...
      // Fetch the current payment_line_item_progress row and join project_line_items for scheduled_value
      console.log('🔍 Fetching current payment line item progress for update...');
      const { data: plip, error: plipError } = await supabase
        .from('payment_line_item_progress')
        .select('id, submitted_percent, previous_percent, this_period_percent, calculated_amount, project_line_items(scheduled_value)')
        .eq('payment_app_id', conv.payment_app_id)
        .eq('line_item_id', lineItemId)
        .single();
      console.log('📄 Current PLIP data:', plip, 'Error:', plipError);

      // Calculate new this_period using scheduled_value from joined project_line_items
      let scheduledValue = Array.isArray(plip?.project_line_items) ? Number(plip.project_line_items[0]?.scheduled_value) || 0 : 0;
      let thisPeriod = Math.round((percent / 100) * scheduledValue);
      console.log('💰 Calculated values:', { scheduledValue, thisPeriod, percent });
      
      // Move current this_period_percent to previous_percent and update percent
      if (plip?.id) {
        console.log('💾 Updating progress for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId);
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
        console.log('✅ Progress update result:', progressUpdate, 'Error:', progressError);
        
        // Update project_line_items
        const { data: prevProgressForPLI } = await supabase
          .from('payment_line_item_progress')
          .select('submitted_percent, payment_app_id')
          .eq('line_item_id', lineItemId)
          .lt('payment_app_id', conv.payment_app_id)
          .not('submitted_percent', 'eq', '0')
          .order('payment_app_id', { ascending: false })
          .limit(1)
          .single();
        const previousSubmittedPercent = Number(prevProgressForPLI?.submitted_percent) || 0;
        
        const { data: currentPLI } = await supabase
          .from('project_line_items')
          .select('scheduled_value')
          .eq('id', lineItemId)
          .single();
        const scheduledValueFloat = Number(currentPLI?.scheduled_value) || 0;
        
        const percentFloat = Number(percent);
        const amountForThisPeriod = parseFloat((scheduledValueFloat * (percentFloat / 100)).toFixed(2));
        
        const { data: pliUpdate, error: pliErrorUpdate } = await supabase
          .from('project_line_items')
          .update({ 
            percent_completed: percentFloat,
            this_period: percentFloat,
            amount_for_this_period: amountForThisPeriod,
            from_previous_application: previousSubmittedPercent
          })
          .eq('id', lineItemId)
          .select();
        console.log('📊 Project line item update result:', pliUpdate, 'Error:', pliErrorUpdate);
      } else {
        console.error('❌ No payment_line_item_progress found for payment_app_id:', conv.payment_app_id, 'line_item_id:', lineItemId);
      }

      idx++;
      updateObj.current_question_index = idx;
      console.log('➡️ Advancing to next question. New idx:', idx, 'numLineItems:', numLineItems);

      if (idx < numLineItems) {
        // Ask next line item question
        const nextLineItemId = lineItems[idx].id;
        console.log('🔍 Fetching data for next line item:', nextLineItemId);
        const { data: nextPliRow } = await supabase
          .from('project_line_items')
          .select('this_period')
          .eq('id', nextLineItemId)
          .single();
        const nextPrevPercent = nextPliRow?.this_period ?? 0;
        console.log('📈 Next line item previous percentage:', nextPrevPercent);
        nextQuestion = `What percent complete is your work for: ${lineItems[idx].description_of_work}? (Previous: ${nextPrevPercent}%)`;
      } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
        console.log('🔄 Moving to additional questions, index:', idx - numLineItems);
        nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
      } else {
        // All questions answered, show summary and move to confirmation
        console.log('🏁 All questions answered, moving to confirmation state');
        updateObj.conversation_state = 'awaiting_confirmation';
      }

      const { error: convoUpdateError } = await supabase
        .from('payment_sms_conversations')
        .update(updateObj)
        .eq('id', conv.id);
      if (convoUpdateError) {
        console.error('❌ Error updating payment_sms_conversations:', convoUpdateError);
      } else {
        console.log('✅ Updated payment_sms_conversations successfully');
      }

      if (updateObj.conversation_state === 'awaiting_confirmation') {
        console.log('📋 Generating summary for confirmation...');
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
        (progressRows || []).forEach((row: any) => {
          const item = (lineItemsData || []).find((li: any) => li.id === row.line_item_id);
          const thisPeriodPercent = Number(row.this_period_percent) || 0;
          const scheduled = Number(item?.scheduled_value) || 0;
          const thisPeriodDollar = scheduled * (thisPeriodPercent / 100);
          totalThisPeriod += thisPeriodDollar;
          const desc = item?.description_of_work || 'Item';
          summary += `${desc} - (${thisPeriodPercent.toFixed(1)}%) = ${thisPeriodDollar.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        });
        summary += `Total Requested = $${totalThisPeriod.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        summary += 'Please type "Yes" to submit or "No" to redo your answers.';
        console.log('📋 Generated summary:', summary);
        twiml.message(summary);
      } else {
        console.log('❓ Sending next question:', nextQuestion);
        twiml.message(nextQuestion);
      }
    } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
      console.log('📝 Handling additional question', idx - numLineItems);
      // Handle additional questions (e.g., notes for PM)
      responses[idx] = body;
      idx++;
      updateObj.current_question_index = idx;

      if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
        // Ask next additional question
        nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
        console.log('❓ Asking next additional question:', nextQuestion);
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        twiml.message(nextQuestion);
      } else {
        // All additional questions answered, show summary
        console.log('🏁 All additional questions answered, generating summary...');
        updateObj.conversation_state = 'awaiting_confirmation';
        await supabase
          .from('payment_sms_conversations')
          .update(updateObj)
          .eq('id', conv.id);
        // Show summary (same logic as above)
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
        (progressRows || []).forEach((row: any) => {
          const item = (lineItemsData || []).find((li: any) => li.id === row.line_item_id);
          const thisPeriodPercent = Number(row.this_period_percent) || 0;
          const scheduled = Number(item?.scheduled_value) || 0;
          const thisPeriodDollar = scheduled * (thisPeriodPercent / 100);
          totalThisPeriod += thisPeriodDollar;
          const desc = item?.description_of_work || 'Item';
          summary += `${desc} - (${thisPeriodPercent.toFixed(1)}%) = ${thisPeriodDollar.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        });
        summary += `Total Requested = $${totalThisPeriod.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        summary += 'Please type "Yes" to submit or "No" to redo your answers.';
        console.log('📋 Generated summary after additional questions:', summary);
        twiml.message(summary);
      }
    }
  } else if (conv.conversation_state === 'awaiting_confirmation') {
    console.log('✅ Processing confirmation state, user input:', body);
    if (body === 'YES') {
      console.log('✅ User confirmed submission, finalizing...');
      // Final submission logic (same as your existing code)
      const updateObj = {
        conversation_state: 'completed',
        completed_at: new Date().toISOString(),
        responses
      };
      await supabase
        .from('payment_sms_conversations')
        .update(updateObj)
        .eq('id', conv.id);
      
      await supabase
        .from('payment_applications')
        .update({ status: 'submitted' })
        .eq('id', conv.payment_app_id);
      
      if (responses && responses.length > 0) {
        const pmNotes = responses[responses.length - 1];
        await supabase
          .from('payment_applications')
          .update({ pm_notes: pmNotes })
          .eq('id', conv.payment_app_id);
      }
      
      // Calculate total
      const { data: progressRows } = await supabase
        .from('payment_line_item_progress')
        .select('this_period_percent, line_item_id')
        .eq('payment_app_id', conv.payment_app_id);
      const { data: lineItemsData } = await supabase
        .from('project_line_items')
        .select('id, scheduled_value')
        .in('id', (progressRows || []).map(r => r.line_item_id));
      const totalCurrentPayment = (progressRows || []).reduce((sum: number, row: any) => {
        const item = (lineItemsData || []).find((li: any) => li.id === row.line_item_id);
        const percent = Number(row.this_period_percent) || 0;
        const scheduled = Number(item?.scheduled_value) || 0;
        return sum + (scheduled * (percent / 100));
      }, 0);
      
      await supabase
        .from('payment_applications')
        .update({ current_payment: totalCurrentPayment })
        .eq('id', conv.payment_app_id);
      
      twiml.message('Thank you! Your payment application is submitted for Project Manager review.');
    } else if (body === 'NO') {
      console.log('🔄 User wants to redo, restarting...');
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
      console.log('❌ Invalid confirmation response:', body);
      twiml.message('Please type "Yes" to submit or "No" to redo your answers.');
    }
  } else {
    console.log('⚠️ Conversation already complete, state:', conv.conversation_state);
    twiml.message('This payment application conversation is already complete.');
  }

  console.log('📤 Sending TwiML response');
  return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
}