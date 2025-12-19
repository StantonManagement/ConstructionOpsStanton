import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const blocked = searchParams.get('blocked');
    const pendingVerify = searchParams.get('pending_verify');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query locations table directly to allow filtering by all fields
    let query = supabase
      .from('locations')
      .select('*, projects(name)', { count: 'exact' });

    // Property Filter
    if (propertyId) {
      query = query.eq('project_id', propertyId);
    }

    // Status Filter
    if (status) {
      const statuses = status.split(',');
      if (!statuses.includes('all') && statuses.length > 0) {
        query = query.in('status', statuses);
      }
    }

    // Type Filter
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Blocked Filter
    if (blocked) {
      if (blocked === 'none') {
        query = query.neq('status', 'on_hold');
      } else if (blocked === 'any') {
        query = query.eq('status', 'on_hold');
      } else {
        query = query.eq('blocked_reason', blocked);
      }
    }

    // Search Filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Sorting
    const sort = searchParams.get('sort') || 'name';
    const order = searchParams.get('order') || 'asc';
    
    // We can only sort by columns in the locations table efficiently here
    if (sort === 'name') {
      query = query.order('name', { ascending: order === 'asc' });
    } else {
      // Default to name
      query = query.order('name', { ascending: order === 'asc' });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: locationsData, error: locationsError, count } = await query;

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
      throw locationsError;
    }

    // If no locations, return empty
    if (!locationsData || locationsData.length === 0) {
      return NextResponse.json({
        locations: [],
        total: count || 0,
        filtered_total: 0,
        limit,
        offset
      });
    }

    // Fetch stats for these locations
    const locationIds = locationsData.map((l: any) => l.id);
    const { data: statsData, error: statsError } = await supabase
      .from('location_stats')
      .select('*')
      .in('location_id', locationIds);

    if (statsError) {
      console.error('Error fetching location stats:', statsError);
      // We can continue without stats if needed, or throw. Let's continue with zeroes.
    }

    // Merge data
    const locations = locationsData.map((loc: any) => {
      const stats = statsData?.find((s: any) => s.location_id === loc.id) || {};
      return {
        ...loc,
        property_name: loc.projects?.name || 'Unknown Property',
        // Merge stats, defaulting to 0/null
        total_tasks: stats.total_tasks || 0,
        verified_tasks: stats.verified_tasks || 0,
        pending_verify_tasks: stats.pending_verify_tasks || 0,
        in_progress_tasks: stats.in_progress_tasks || 0,
        not_started_tasks: stats.not_started_tasks || 0,
        total_estimated_cost: stats.total_estimated_cost || 0,
        verified_cost: stats.verified_cost || 0,
        blocked_since: stats.updated_at // assuming stats has updated_at or we use loc.updated_at
      };
    });

    let filteredLocations = locations;
    if (pendingVerify === 'any') {
      filteredLocations = locations.filter((l: any) => (l.pending_verify_tasks || 0) > 0);
    } else if (pendingVerify === 'none') {
      filteredLocations = locations.filter((l: any) => (l.pending_verify_tasks || 0) === 0);
    }

    // If sorting was by progress (stats), we have to do it in memory now which is not ideal for pagination
    // but unavoidable without the view update.
    // However, we already paginated based on name/id. 
    // If the user REALLY wants to sort by progress, we'd need to fetch all or use a different approach.
    // For now, we ignore 'progress' sort in the DB query and only support 'name'.

    return NextResponse.json({
      locations: filteredLocations,
      total: count,
      filtered_total: filteredLocations.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}
