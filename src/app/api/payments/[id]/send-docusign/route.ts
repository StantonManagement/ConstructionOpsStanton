import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST() {
  return NextResponse.json({ error: 'This endpoint is not implemented. PDFfiller is now used for e-signature integration. Use /api/payments/[id]/send-docusign.js.' }, { status: 501 });
}