import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const paymentAppId = id;
    const { lineItemId, submitted_percent, pm_verified_percent } = await req.json();

    // Validate required fields
    if (!lineItemId || submitted_percent === undefined || pm_verified_percent === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate percentages are within reasonable bounds
    if (submitted_percent < 0 || submitted_percent > 100 || pm_verified_percent < 0 || pm_verified_percent > 100) {
      return NextResponse.json({ error: 'Percentages must be between 0 and 100' }, { status: 400 });
    }

    // Update the payment_line_item_progress table
    const { data, error } = await supabase
      .from('payment_line_item_progress')
      .update({
        submitted_percent,
        pm_verified_percent
      })
      .eq('payment_app_id', paymentAppId)
      .eq('line_item_id', lineItemId)
      .select();

    if (error) {
      console.error('Supabase error updating percentage:', error);
      return NextResponse.json({ 
        error: 'Failed to update percentage',
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data[0],
      message: 'Percentage updated successfully'
    });

  } catch (error) {
    console.error('Update percentage error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 });
  }
}