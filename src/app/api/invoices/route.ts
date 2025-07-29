
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// GET: Fetch outstanding invoices
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'outstanding';
    const projectId = searchParams.get('project_id');

    let query = supabase
      .from('invoices')
      .select(`
        *,
        project:projects(name, address),
        contractor:contractors(name, email, phone),
        payment_application:payment_applications(id, payment_period_end)
      `)
      .eq('status', status);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: invoices, error } = await query.order('generated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoices });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
