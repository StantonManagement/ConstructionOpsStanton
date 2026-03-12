import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';
import { normalizePhoneNumber } from '@/lib/phoneUtils';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const phone = '+18603516816';
  const normalizedPhone = normalizePhoneNumber(phone);

  // Check daily log requests
  const { data: dailyLogRequests, error: dlError } = await supabase
    .from('daily_log_requests')
    .select('id, pm_phone_number, request_status, request_date, created_at, project_id')
    .eq('pm_phone_number', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(3);

  // Check payment conversations
  const { data: paymentConvs, error: pcError } = await supabase
    .from('payment_sms_conversations')
    .select('id, contractor_phone, conversation_state, created_at')
    .eq('contractor_phone', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(3);

  // Check specifically for the query the webhook uses
  const { data: sentRequest, error: sentError } = await supabase
    .from('daily_log_requests')
    .select('id, project_id, projects(id, name)')
    .eq('pm_phone_number', normalizedPhone)
    .eq('request_status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({
    phone: normalizedPhone,
    dailyLogRequests: {
      data: dailyLogRequests,
      error: dlError?.message
    },
    paymentConversations: {
      data: paymentConvs,
      error: pcError?.message
    },
    webhookQuery: {
      found: !!sentRequest,
      data: sentRequest,
      error: sentError?.message
    }
  });
}
