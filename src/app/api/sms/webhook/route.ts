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
        // Fetch previous percent for this line item
        let previousPercent = null;
        try {
          const { data: plip } = await supabase
            .from('payment_line_item_progress')
            .select('previous_percent')
            .eq('payment_app_id', conv.payment_app_id)
            .eq('line_item_id', lineItems[0].id)
            .single();
          previousPercent = plip?.previous_percent;
        } catch (e) {
          previousPercent = null;
        }
        const prevText = previousPercent !== null && previousPercent !== undefined ? ` (previous: ${previousPercent}%)` : '';
        twiml.message(`What percent complete is your work for: ${lineItems[0].description_of_work}?${prevText}`);
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
      // Ask next line item question, include previous percent
      let previousPercent = null;
      try {
        const { data: plip } = await supabase
          .from('payment_line_item_progress')
          .select('previous_percent')
          .eq('payment_app_id', conv.payment_app_id)
          .eq('line_item_id', lineItems[idx].id)
          .single();
        previousPercent = plip?.previous_percent;
      } catch (e) {
        previousPercent = null;
      }
      const prevText = previousPercent !== null && previousPercent !== undefined ? ` (previous: ${previousPercent}%)` : '';
      nextQuestion = `What percent complete is your work for: ${lineItems[idx].description_of_work}?${prevText}`;
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
      // Calculate total current payment for this application
      const { data: progressRows } = await supabase
        .from('payment_line_item_progress')
        .select('this_period')
        .eq('payment_app_id', conv.payment_app_id);

      const totalCurrentPayment = (progressRows || []).reduce(
        (sum, row) => sum + (Number(row.this_period) || 0),
        0
      );

      await supabase
        .from('payment_applications')
        .update({ current_payment: totalCurrentPayment })
        .eq('id', conv.payment_app_id);

      twiml.message('Thank you! Your payment application is submitted for Project Manager review.');
    } else {
      twiml.message(nextQuestion);
    }
  } else {
    twiml.message('This payment application conversation is already complete.');
  }

  return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
}