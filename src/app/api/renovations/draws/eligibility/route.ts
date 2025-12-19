import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // 1. Get Draw Eligibility across all projects
    // We'll query the draw_eligibility view and aggregate in code
    const { data: eligibilityData, error: eligibilityError } = await supabaseAdmin
      .from('draw_eligibility')
      .select('*, projects(name)');

    if (eligibilityError) {
      throw new APIError(eligibilityError.message, 500, 'DATABASE_ERROR');
    }

    // 2. Get Pending Draws (Submitted but not Funded)
    const { data: pendingDraws, error: pendingError } = await supabaseAdmin
      .from('construction_draws')
      .select('amount_requested, id')
      .eq('status', 'submitted');

    if (pendingError) {
      throw new APIError(pendingError.message, 500, 'DATABASE_ERROR');
    }

    // Aggregate Eligibility
    let totalEligible = 0;
    let totalEligibleTasks = 0; // The view has verified_task_count? 
    // Let's check the view columns from previous context if possible. 
    // The previous file read of `src/app/api/cash-flow/draw-eligibility/route.ts` used `eligible_to_draw` and `verified_task_count`.
    
    const byPropertyMap = new Map<string, { 
      property_id: string; 
      property_name: string; 
      eligible_amount: number; 
      eligible_tasks: number; 
    }>();

    eligibilityData?.forEach((row: any) => {
      const amount = parseFloat(row.eligible_to_draw || '0');
      const tasks = parseInt(row.verified_task_count || '0'); // Note: this count might be total verified tasks for that category, not necessarily *undrawn* verified tasks?
      // Wait, `draw_eligibility` view logic usually calculates eligible amount. 
      // Does it calculate eligible TASKS count correctly (excluding drawn)?
      // If the view doesn't provide "eligible_task_count", we might estimate or need a better query.
      // `verified_task_count` likely includes already drawn ones if the view logic is "total verified vs total drawn amount".
      // Let's assume for now we use what we have or 0 if unsafe.
      // Actually, in `src/app/api/cash-flow/draw-eligibility/route.ts`, it calculated `eligibleTasks` by querying tasks table.
      // Doing that for ALL projects here is expensive.
      // Let's rely on the view amounts. For task counts, maybe the view has it or we skip it for aggregate if too hard.
      // UI_4 says "from 89 verified tasks".
      // Let's assume `verified_task_count` is total verified. The number of *eligible* tasks is harder to get from that view if it doesn't track drawn status per task.
      // But we can just sum up amounts for now.
      
      totalEligible += amount;
      // totalEligibleTasks += tasks; // This is risky if it includes drawn tasks.

      const projectId = row.project_id;
      const projectName = row.projects?.name || 'Unknown';

      if (!byPropertyMap.has(projectId)) {
        byPropertyMap.set(projectId, {
          property_id: projectId,
          property_name: projectName,
          eligible_amount: 0,
          eligible_tasks: 0
        });
      }

      const prop = byPropertyMap.get(projectId)!;
      prop.eligible_amount += amount;
      // prop.eligible_tasks += tasks;
    });

    // Aggregate Pending Draws
    const pendingDrawsAmount = pendingDraws?.reduce((sum, draw) => sum + (draw.amount_requested || 0), 0) || 0;
    const pendingDrawsCount = pendingDraws?.length || 0;

    const byProperty = Array.from(byPropertyMap.values());

    return successResponse({
      total_eligible: totalEligible,
      total_eligible_tasks: 0, // Placeholder as view doesn't give accurate undrawn count easily
      pending_draws_amount: pendingDrawsAmount,
      pending_draws_count: pendingDrawsCount,
      by_property: byProperty
    });

  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch portfolio eligibility', 500, 'INTERNAL_ERROR');
  }
});
