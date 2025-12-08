import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      // Allow public read? Or strictly authenticated? 
      // The policy says "TO authenticated".
      // If called from client component, it should have token.
      // If called from server component, it might need service role or passed token.
      // Let's try to enforce auth if header is present, else fail (or check if public is allowed).
      // For now, enforce auth for consistency.
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('schedule_defaults')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching schedule defaults:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Expecting an array of updates or a single object
    const updates = Array.isArray(body) ? body : [body];

    // Validate input
    if (updates.length === 0) {
      return NextResponse.json({ message: 'No changes to save' });
    }

    // Using supabaseAdmin to upsert.
    const { data, error } = await supabase
      .from('schedule_defaults')
      .upsert(updates, { onConflict: 'budget_category' }) 
      .select();

    if (error) throw error;

    return NextResponse.json({ message: 'Schedule defaults updated successfully', data });
  } catch (error: any) {
    console.error('Error updating schedule defaults:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
