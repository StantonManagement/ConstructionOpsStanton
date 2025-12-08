import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  APIError 
} from '@/lib/apiHelpers';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  amount?: number;
  timestamp: string;
  projectName?: string;
  contractorName?: string;
}

export const GET = withAuth(async (request: NextRequest, context: any, user: any) => {
  if (!supabaseAdmin) {
    throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const projectId = searchParams.get('projectId');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch recent payment application updates
  let paQuery = supabaseAdmin
    .from('payment_applications')
    .select(`
      id,
      status,
      current_payment,
      created_at,
      updated_at,
      projects!inner(name),
      contractors!inner(name)
    `)
    .gte('updated_at', sevenDaysAgo.toISOString())
    .order('updated_at', { ascending: false })
    .limit(limit * 2);

  if (projectId) {
    paQuery = paQuery.eq('project_id', parseInt(projectId));
  }

  const { data: paymentApps, error: paError } = await paQuery;

  if (paError) throw new APIError(paError.message, 500, 'DB_ERROR');

  // Fetch recent change order updates
  let coQuery = supabaseAdmin
    .from('change_orders')
    .select(`
      id,
      status,
      cost_impact,
      created_at,
      updated_at,
      projects!inner(name),
      contractors!inner(name)
    `)
    .gte('updated_at', sevenDaysAgo.toISOString())
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (projectId) {
    coQuery = coQuery.eq('project_id', parseInt(projectId));
  }

  const { data: changeOrders, error: coError } = await coQuery;

  if (coError) throw new APIError(coError.message, 500, 'DB_ERROR');

  const activities: ActivityItem[] = [];

  // Process payment applications
  (paymentApps || []).forEach((pa: any) => {
    const refNum = `PA-${pa.id.toString().padStart(4, '0')}`;
    
    if (pa.status === 'approved') {
      activities.push({
        id: `pa-approved-${pa.id}`,
        type: 'payment_approved',
        description: `${refNum} approved`,
        amount: Number(pa.current_payment) || 0,
        timestamp: pa.updated_at,
        projectName: pa.projects?.name,
        contractorName: pa.contractors?.name
      });
    } else if (pa.status === 'submitted' || pa.status === 'needs_review') {
      // Check if this is a new submission (created_at close to updated_at)
      const created = new Date(pa.created_at).getTime();
      const updated = new Date(pa.updated_at).getTime();
      if (Math.abs(updated - created) < 60000) { // Within 1 minute
        activities.push({
          id: `pa-submitted-${pa.id}`,
          type: 'payment_submitted',
          description: `New payment request from ${pa.contractors?.name || 'Unknown'}`,
          amount: Number(pa.current_payment) || 0,
          timestamp: pa.created_at,
          projectName: pa.projects?.name,
          contractorName: pa.contractors?.name
        });
      }
    }
  });

  // Process change orders
  (changeOrders || []).forEach((co: any) => {
    const refNum = `CO-${co.id.toString().padStart(4, '0')}`;
    
    if (co.status === 'approved') {
      activities.push({
        id: `co-approved-${co.id}`,
        type: 'change_order_approved',
        description: `${refNum} approved`,
        amount: Number(co.cost_impact) || 0,
        timestamp: co.updated_at,
        projectName: co.projects?.name,
        contractorName: co.contractors?.name
      });
    } else if (co.status === 'pending') {
      const created = new Date(co.created_at).getTime();
      const updated = new Date(co.updated_at).getTime();
      if (Math.abs(updated - created) < 60000) {
        activities.push({
          id: `co-submitted-${co.id}`,
          type: 'change_order_submitted',
          description: `New change order from ${co.contractors?.name || 'Unknown'}`,
          amount: Number(co.cost_impact) || 0,
          timestamp: co.created_at,
          projectName: co.projects?.name,
          contractorName: co.contractors?.name
        });
      }
    }
  });

  // Sort by timestamp and limit
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const limitedActivities = activities.slice(0, limit);

  return successResponse({
    activities: limitedActivities,
    total: activities.length
  });
})
