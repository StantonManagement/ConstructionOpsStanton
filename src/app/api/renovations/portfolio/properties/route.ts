import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'name';
    const order = searchParams.get('order') || 'asc';

    let query = supabase
      .from('project_stats')
      .select('*');

    if (search) {
      query = query.ilike('project_name', `%${search}%`);
    }

    // Sort mapping
    switch (sort) {
      case 'progress':
        query = query.order('completion_percentage', { ascending: order === 'asc' });
        break;
      case 'blocked':
        query = query.order('blocked_locations', { ascending: order === 'asc' });
        break;
      case 'name':
      default:
        query = query.order('project_name', { ascending: order === 'asc' });
        break;
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ properties: data });

  } catch (error) {
    console.error('Error fetching portfolio properties:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}
