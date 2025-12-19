import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  APIError 
} from '@/lib/apiHelpers';

interface ActionItem {
  id: string;
  type: 'payment_application' | 'change_order';
  referenceNumber: string;
  contractorName: string;
  projectName: string;
  projectId: number;
  amount: number;
  status: string;
  description: string;
  submittedAt: string;
  daysOld: number;
}

export const GET = withAuth(async (request: NextRequest, context: any, user: any) => {
  if (!supabaseAdmin) {
    throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  // Fetch payment applications needing attention
  let paQuery = supabaseAdmin
    .from('payment_applications')
    .select(`
      id,
      status,
      current_payment,
      pm_notes,
      created_at,
      project_id,
      projects!inner(id, name),
      contractors!inner(id, name)
    `)
    .in('status', ['submitted', 'needs_review', 'approved'])
    .order('created_at', { ascending: true });

  if (projectId) {
    paQuery = paQuery.eq('project_id', parseInt(projectId));
  }

  const { data: paymentApps, error: paError } = await paQuery;

  if (paError) throw new APIError(paError.message, 500, 'DB_ERROR');

  // Fetch pending change orders
  let coQuery = supabaseAdmin
    .from('change_orders')
    .select(`
      id,
      status,
      cost_impact,
      description,
      created_at,
      project_id,
      projects!inner(id, name),
      contractors!inner(id, name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (projectId) {
    coQuery = coQuery.eq('project_id', parseInt(projectId));
  }

  const { data: changeOrders, error: coError } = await coQuery;

  if (coError) throw new APIError(coError.message, 500, 'DB_ERROR');

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Process payment applications
  const paItems: ActionItem[] = (paymentApps || []).map((pa: any) => {
    const createdAt = new Date(pa.created_at);
    const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: pa.id.toString(),
      type: 'payment_application' as const,
      referenceNumber: `PA-${pa.id.toString().padStart(4, '0')}`,
      contractorName: pa.contractors?.name || 'Unknown',
      projectName: pa.projects?.name || 'Unknown',
      projectId: pa.project_id,
      amount: Number(pa.current_payment) || 0,
      status: pa.status,
      description: pa.pm_notes || '',
      submittedAt: pa.created_at,
      daysOld
    };
  });

  // Process change orders
  const coItems: ActionItem[] = (changeOrders || []).map((co: any) => {
    const createdAt = new Date(co.created_at);
    const daysOld = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: co.id.toString(),
      type: 'change_order' as const,
      referenceNumber: `CO-${co.id.toString().padStart(4, '0')}`,
      contractorName: co.contractors?.name || 'Unknown',
      projectName: co.projects?.name || 'Unknown',
      projectId: co.project_id,
      amount: Number(co.cost_impact) || 0,
      status: co.status,
      description: co.description || '',
      submittedAt: co.created_at,
      daysOld
    };
  });

  // Combine and categorize
  const allItems = [...paItems, ...coItems];

  // Urgent: > 3 days old and not approved
  const urgent = allItems.filter(item => 
    item.daysOld > 3 && 
    item.status !== 'approved'
  ).sort((a, b) => b.daysOld - a.daysOld);

  // Needs Review: Recent submissions (not urgent, not approved)
  const needsReview = allItems.filter(item => 
    item.daysOld <= 3 && 
    item.status !== 'approved'
  ).sort((a, b) => b.daysOld - a.daysOld);

  // Ready to Pay: Approved payment applications
  const readyToPay = paItems.filter(item => 
    item.status === 'approved'
  ).sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  return successResponse({
    urgent,
    needsReview,
    readyToPay,
    totals: {
      urgent: urgent.length,
      needsReview: needsReview.length,
      readyToPay: readyToPay.length,
      total: allItems.length
    }
  });
})
