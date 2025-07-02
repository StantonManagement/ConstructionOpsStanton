import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Example questions (replace with dynamic logic as needed)
const QUESTIONS = [
  'What percent complete is your work for this period?',
  'Have you uploaded all required photos? (YES/NO)',
  'Is a lien waiver required? (YES/NO)',
  'Any notes for the Project Manager?'
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

  // Find the active conversation for this phone
  const { data: conv, error } = await supabase
    .from('payment_sms_conversations')
    .select('*')
    .eq('contractor_phone', from)
    .in('conversation_state', ['awaiting_start', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Found conversation:', conv, 'Error:', error);

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
    'Any notes for the Project Manager?'
  ];

  if (conv.conversation_state === 'awaiting_start') {
    if (body === 'YES') {
      // Start the questions
      await supabase
        .from('payment_sms_conversations')
        .update({ conversation_state: 'in_progress', current_question_index: 0 })
        .eq('id', conv.id);
      if (numLineItems > 0) {
        twiml.message(`What percent complete is your work for: ${lineItems[0].description_of_work}?`);
      } else {
        // If no line items, skip to additional questions
        twiml.message(ADDITIONAL_QUESTIONS[0]);
      }
    } else {
      twiml.message('Reply YES when you are ready to begin your payment application.');
    }
  } else if (conv.conversation_state === 'in_progress') {
    // Save the response
    responses[idx] = body;
    let updateObj: any = { responses };
    let nextQuestion = '';
    let finished = false;

    if (idx < numLineItems) {
      // Update percent_completed for the current line item
      const lineItemId = lineItems[idx].id;
      const percent = parseFloat(body);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        twiml.message('Please reply with a valid percent (0-100).');
        return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }
      await supabase
        .from('project_line_items')
        .update({ percent_completed: percent })
        .eq('id', lineItemId);

      // Update payment_line_item_progress.this_period using the formula
      // this_period = round((percent_gc / 100) * scheduled_value - previous_value, 0)
      // Fetch the latest project_line_item and payment_line_item_progress
      const { data: pli } = await supabase
        .from('project_line_items')
        .select('id, percent_gc, scheduled_value')
        .eq('id', lineItemId)
        .single();
      const { data: plip } = await supabase
        .from('payment_line_item_progress')
        .select('id, previous_value')
        .eq('payment_app_id', conv.payment_app_id)
        .eq('line_item_id', lineItemId)
        .single();
      const percentGC = Number(pli?.percent_gc) || 0;
      const scheduledValue = Number(pli?.scheduled_value) || 0;
      const previousValue = Number(plip?.previous_value) || 0;
      const thisPeriod = Math.round((percentGC / 100) * scheduledValue - previousValue);
      if (plip?.id) {
        await supabase
          .from('payment_line_item_progress')
          .update({ this_period: thisPeriod })
          .eq('id', plip.id);
      }
    }

    idx++;
    updateObj.current_question_index = idx;

    if (idx < numLineItems) {
      // Ask next line item question
      nextQuestion = `What percent complete is your work for: ${lineItems[idx].description_of_work}?`;
    } else if (idx - numLineItems < ADDITIONAL_QUESTIONS.length) {
      // Ask additional questions
      nextQuestion = ADDITIONAL_QUESTIONS[idx - numLineItems];
    } else {
      // Conversation complete
      updateObj = {
        ...updateObj,
        current_question_index: idx,
        conversation_state: 'completed',
        completed_at: new Date().toISOString(),
      };
      await supabase
        .from('payment_applications')
        .update({ status: 'submitted' })
        .eq('id', conv.payment_app_id);
      finished = true;
    }

    await supabase
      .from('payment_sms_conversations')
      .update(updateObj)
      .eq('id', conv.id);

    if (finished) {
      twiml.message('Thank you! Your payment application is submitted for Project Manager review.');
    } else {
      twiml.message(nextQuestion);
    }
  } else {
    twiml.message('This payment application conversation is already complete.');
  }

  return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
}