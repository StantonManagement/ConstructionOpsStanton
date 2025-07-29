
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoiceId = id;
    const { paymentDate, paymentMethod, paymentReference, notes } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Get current user for tracking
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user details
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('uuid', user.id)
      .single();

    if (userDataError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update invoice status to paid
    const { data: updatedInvoice, error: updateError } = await supabase
      .from('invoices')
      .update({
        payment_status: 'paid',
        status: 'paid',
        paid_at: paymentDate || new Date().toISOString(),
        paid_by: userData.id,
        payment_method: paymentMethod || null,
        payment_reference: paymentReference || null,
        payment_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select('*, project:projects(name), contractor:contractors(name, email)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`Invoice ${invoiceId} marked as paid by ${userData.name}`);

    return NextResponse.json({
      message: 'Invoice marked as paid successfully',
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
