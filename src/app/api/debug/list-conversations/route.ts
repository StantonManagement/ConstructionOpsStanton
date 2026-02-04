import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

/**
 * Debug endpoint to list all active payment conversations
 * Usage: GET /api/debug/list-conversations
 */
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  // Get all active conversations
  const { data: conversations, error } = await supabase
    .from('payment_sms_conversations')
    .select(`
      id,
      contractor_phone,
      conversation_state,
      current_question_index,
      created_at,
      payment_app_id,
      payment_applications (
        id,
        status,
        contractors (
          name,
          phone
        ),
        projects (
          name
        )
      )
    `)
    .in('conversation_state', ['awaiting_start', 'in_progress', 'awaiting_confirmation'])
    .order('created_at', { ascending: false });

  return NextResponse.json({
    total: conversations?.length || 0,
    conversations: conversations || [],
    error: error?.message
  }, { status: 200 });
}
