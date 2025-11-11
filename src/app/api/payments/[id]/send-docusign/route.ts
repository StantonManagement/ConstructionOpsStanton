import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  
  return NextResponse.json({ error: 'This endpoint is not implemented. PDFfiller is now used for e-signature integration. Use /api/payments/[id]/send-docusign.js.' }, { status: 501 });
}