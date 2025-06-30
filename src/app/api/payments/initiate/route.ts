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

    const { data: contractors, error: contractorsError } = await supabase
      .from('contractors')
      .select('id, name, phone')
      .in('id', contractorIds);
    if (contractorsError) {
      return NextResponse.json({ error: 'Error fetching contractors' }, { status: 500 });
    }

    const results = [];
    for (const contractor of contractors) {
      // Create payment application
      const { data: paymentApp, error: paymentAppError } = await supabase
        .from('payment_applications')
        .insert({
          project_id: projectId,
          contractor_id: contractor.id,
          status: 'sms_sent',
        })
        .select()
        .single();
      if (paymentAppError || !paymentApp) {
        results.push({ contractorId: contractor.id, error: 'Failed to create payment application' });
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

      // Create payment_sms_conversations with line_items
      const { error: smsConvError } = await supabase
        .from('payment_sms_conversations')
        .insert({
          payment_app_id: paymentApp.id,
          contractor_phone: contractor.phone,
          conversation_state: 'awaiting_start',
          responses: [],
          line_items: lineItems || [],
        });
      if (smsConvError) {
        results.push({ contractorId: contractor.id, error: 'Failed to create sms conversation' });
        continue;
      }

      // Send SMS via Twilio
      if (contractor.phone && TWILIO_PHONE_NUMBER) {
        const message = `${contractor.name} payment app for ${project.name}. Ready for 4 quick questions? Reply YES to start.`;
        try {
          await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE_NUMBER,
            to: contractor.phone,
          });
          results.push({ contractorId: contractor.id, status: 'sms_sent' });
        } catch {
          results.push({ contractorId: contractor.id, error: 'Failed to send SMS' });
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