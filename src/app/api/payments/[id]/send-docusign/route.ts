import { NextRequest, NextResponse } from 'next/server';
import docusign from 'docusign-esign';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    { error: 'DocuSign integration is now handled in /api/payments/[id]/send-docusign.js. This endpoint is not implemented in serverless/edge.' },
    { status: 501 }
  );
}