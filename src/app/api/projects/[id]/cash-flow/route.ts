import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { calculateProjectCashFlow } from '@/lib/cashflow';

export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const projectId = parseInt(id);

  if (isNaN(projectId)) {
    return errorResponse('Invalid project ID', 400);
  }

  const cashFlow = await calculateProjectCashFlow(projectId);

  if (!cashFlow) {
    return errorResponse('Failed to calculate cash flow', 500);
  }

  return successResponse(cashFlow);
});




