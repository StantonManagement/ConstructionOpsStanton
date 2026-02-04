import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';
import { normalizePhoneNumber } from '@/lib/phoneUtils';

export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone parameter required' }, { status: 400 });
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  // Get all conversations for this phone
  const { data: conversations, error } = await supabase
    .from('payment_sms_conversations')
    .select('*')
    .eq('contractor_phone', normalizedPhone || phone)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    originalPhone: phone,
    normalizedPhone,
    conversations: conversations || [],
    error: error?.message
  });
}
