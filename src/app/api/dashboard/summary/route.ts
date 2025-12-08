import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  APIError 
} from '@/lib/apiHelpers';

interface PaymentApp {
  current_payment: number;
  created_at: string;
}

interface ChangeOrder {
  cost_impact: number;
}

export const GET = withAuth(async (request: NextRequest, context: any, user: any) => {
  if (!supabaseAdmin) {
    throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
  }

  // Needs Approval: Payment apps with status = 'submitted' or 'needs_review'
  const { data: needsApprovalData, error: needsApprovalError } = await supabaseAdmin
    .from('payment_applications')
    .select('current_payment')
    .in('status', ['submitted', 'needs_review']);

  if (needsApprovalError) throw new APIError(needsApprovalError.message, 500, 'DB_ERROR');

  const needsApproval = {
    count: (needsApprovalData as PaymentApp[] | null)?.length || 0,
    totalAmount: (needsApprovalData as PaymentApp[] | null)?.reduce((sum: number, pa: PaymentApp) => sum + (Number(pa.current_payment) || 0), 0) || 0
  };

  // Pending Payment: Approved but not paid
  const { data: pendingPaymentData, error: pendingPaymentError } = await supabaseAdmin
    .from('payment_applications')
    .select('current_payment')
    .eq('status', 'approved');

  if (pendingPaymentError) throw new APIError(pendingPaymentError.message, 500, 'DB_ERROR');

  const pendingPayment = {
    count: (pendingPaymentData as PaymentApp[] | null)?.length || 0,
    totalAmount: (pendingPaymentData as PaymentApp[] | null)?.reduce((sum: number, pa: PaymentApp) => sum + (Number(pa.current_payment) || 0), 0) || 0
  };

  // Overdue: Submitted more than 3 days ago, not yet approved
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const { data: overdueData, error: overdueError } = await supabaseAdmin
    .from('payment_applications')
    .select('created_at')
    .in('status', ['submitted', 'needs_review'])
    .lt('created_at', threeDaysAgo.toISOString());

  if (overdueError) throw new APIError(overdueError.message, 500, 'DB_ERROR');

  let oldestDays = 0;
  if (overdueData && overdueData.length > 0) {
    const oldestDate = new Date(Math.min(...overdueData.map((d: { created_at: string }) => new Date(d.created_at).getTime())));
    oldestDays = Math.floor((Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const overdueItems = {
    count: overdueData?.length || 0,
    oldestDays
  };

  // This Week: Sum of approved amounts this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const { data: thisWeekApproved, error: thisWeekError } = await supabaseAdmin
    .from('payment_applications')
    .select('current_payment')
    .eq('status', 'approved')
    .gte('updated_at', startOfWeek.toISOString());

  if (thisWeekError) throw new APIError(thisWeekError.message, 500, 'DB_ERROR');

  const thisWeek = {
    approvedAmount: (thisWeekApproved as PaymentApp[] | null)?.reduce((sum: number, pa: PaymentApp) => sum + (Number(pa.current_payment) || 0), 0) || 0,
    paidAmount: 0
  };

  // Pending Change Orders
  const { data: pendingCOs, error: coError } = await supabaseAdmin
    .from('change_orders')
    .select('cost_impact')
    .eq('status', 'pending');

  if (coError) throw new APIError(coError.message, 500, 'DB_ERROR');

  const pendingChangeOrders = {
    count: (pendingCOs as ChangeOrder[] | null)?.length || 0,
    totalAmount: (pendingCOs as ChangeOrder[] | null)?.reduce((sum: number, co: ChangeOrder) => sum + (Number(co.cost_impact) || 0), 0) || 0
  };

  return successResponse({
    needsApproval,
    pendingPayment,
    overdueItems,
    thisWeek,
    pendingChangeOrders
  });
})
