import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // We can aggregate from the project_stats view
    const { data, error } = await supabase
      .from('project_stats')
      .select('*');

    if (error) throw error;

    // Aggregate in JS for now as it's simpler than a new DB view for just one row
    const stats = data.reduce((acc, curr) => ({
      total_locations: acc.total_locations + (curr.total_locations || 0),
      complete_locations: acc.complete_locations + (curr.complete_locations || 0),
      total_tasks: acc.total_tasks + (curr.total_tasks || 0),
      verified_tasks: acc.verified_tasks + (curr.verified_tasks || 0),
      total_estimated_cost: acc.total_estimated_cost + (curr.total_estimated_cost || 0),
      verified_cost: acc.verified_cost + (curr.verified_cost || 0),
      blocked_locations: acc.blocked_locations + (curr.blocked_locations || 0),
    }), {
      total_locations: 0,
      complete_locations: 0,
      total_tasks: 0,
      verified_tasks: 0,
      total_estimated_cost: 0,
      verified_cost: 0,
      blocked_locations: 0,
    });

    // For blocked by reason, we need to query the blocking_report view
    const { data: blockedData, error: blockedError } = await supabase
      .from('blocking_report')
      .select('blocked_reason');
      
    if (blockedError) throw blockedError;

    const blocked_by_reason = blockedData.reduce((acc: Record<string, number>, curr) => {
      const reason = curr.blocked_reason || 'other';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {
      materials: 0,
      labor: 0,
      cash: 0,
      dependency: 0,
      other: 0
    });

    return NextResponse.json({
      ...stats,
      blocked_by_reason
    });

  } catch (error) {
    console.error('Error fetching portfolio stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
