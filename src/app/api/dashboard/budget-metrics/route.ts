import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Budget Dashboard Metrics API
 * Provides aggregated financial data across all properties using raw tables
 * to avoid dependencies on fragile views or missing columns.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const client = supabaseAdmin;

    // 1. Auth Check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // 2. Parse Query Parameters
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('project');
    
    // 3. Fetch Raw Data in Parallel
    
    // A. Projects
    let projectsQuery = client
      .from('projects')
      .select('id, name, status')
      .eq('status', 'active');

    if (projectIdParam && projectIdParam !== 'all') {
      projectsQuery = projectsQuery.eq('id', projectIdParam);
    }

    // B. Budgets (Property Budgets)
    let budgetsQuery = client
      .from('property_budgets')
      .select('id, project_id, category_name, original_amount, revised_amount, actual_spend, committed_costs');
      
    if (projectIdParam && projectIdParam !== 'all') {
      budgetsQuery = budgetsQuery.eq('project_id', projectIdParam);
    }

    // C. Change Orders
    let coQuery = client
      .from('change_orders')
      .select('project_id, status, cost_impact');

    if (projectIdParam && projectIdParam !== 'all') {
      coQuery = coQuery.eq('project_id', projectIdParam);
    }

    // D. Linked Contracts (Committed Costs)
    let contractsQuery = client
      .from('project_contractors')
      .select('project_id, budget_item_id, contract_amount')
      .not('budget_item_id', 'is', null); // Only fetch linked contracts

    if (projectIdParam && projectIdParam !== 'all') {
      contractsQuery = contractsQuery.eq('project_id', projectIdParam);
    }

    // E. Approved Payments (SINGLE SOURCE OF TRUTH for spent calculations)
    let approvedPaymentsQuery = client
      .from('payment_applications')
      .select('project_id, current_period_value')
      .eq('status', 'approved');

    if (projectIdParam && projectIdParam !== 'all') {
      approvedPaymentsQuery = approvedPaymentsQuery.eq('project_id', projectIdParam);
    }

    // Execute queries
    const [projectsRes, budgetsRes, coRes, contractsRes, approvedPaymentsRes] = await Promise.all([
      projectsQuery,
      budgetsQuery,
      coQuery,
      contractsQuery,
      approvedPaymentsQuery
    ]);

    if (projectsRes.error) throw new Error(`Projects error: ${projectsRes.error.message}`);
    
    const budgets = budgetsRes.data || [];
    const changeOrders = coRes.data || [];
    const projects = projectsRes.data || [];
    const contracts = contractsRes.data || []; // Fetch linked contracts
    const approvedPayments = approvedPaymentsRes.data || []; // Approved payments for spent

    // 4. Aggregation Logic

    // Calculate Actual Committed Costs per Budget Item from Linked Contracts
    const committedCostsMap = new Map<number, number>(); // budget_item_id -> total_contract_amount
    contracts.forEach((c: any) => {
      if (c.budget_item_id) {
        const current = committedCostsMap.get(c.budget_item_id) || 0;
        committedCostsMap.set(c.budget_item_id, current + (Number(c.contract_amount) || 0));
      }
    });

    // Calculate Actual Spent per Project from Approved Payments (SINGLE SOURCE OF TRUTH)
    const approvedSpentByProject = new Map<number, number>(); // project_id -> total_spent
    approvedPayments.forEach((payment: any) => {
      const projectId = payment.project_id;
      const current = approvedSpentByProject.get(projectId) || 0;
      approvedSpentByProject.set(projectId, current + (Number(payment.current_period_value) || 0));
    });

    // Initialize Global Totals
    const heroMetrics = {
      totalBudget: 0,
      totalRevised: 0,
      totalSpent: 0,
      totalCommitted: 0,
      totalRemaining: 0,
      percentSpent: 0
    };

    const statusSummary = {
      onTrack: 0,
      warning: 0,
      critical: 0,
      overBudget: 0
    };

    const coSummary = {
      total: 0,
      pending: 0,
      approved: 0,
      pendingAmount: 0,
      approvedAmount: 0
    };

    // Helper to aggregate budgets by project
    const projectBudgetsMap = new Map<number, {
      original: number;
      revised: number;
      actual: number;
      committed: number;
    }>();

    // Also aggregate budgets by category within project to avoid duplicates in line items list
    const categoryBudgetsMap = new Map<string, {
      id: number;
      project_id: number;
      category_name: string;
      original: number;
      revised: number;
      actual: number;
      committed: number;
    }>();

    budgets.forEach((b: any) => {
      // Override manual committed_costs with calculated value if linked contracts exist
      // Otherwise fallback to manual entry
      const calculatedCommitted = committedCostsMap.get(b.id);
      const effectiveCommitted = calculatedCommitted !== undefined ? calculatedCommitted : (Number(b.committed_costs) || 0);

      // Project Level Aggregation
      const pid = b.project_id;
      if (!projectBudgetsMap.has(pid)) {
        projectBudgetsMap.set(pid, { original: 0, revised: 0, actual: 0, committed: 0 });
      }
      const projectEntry = projectBudgetsMap.get(pid)!;
      projectEntry.original += Number(b.original_amount) || 0;
      projectEntry.revised += Number(b.revised_amount) || 0;
      projectEntry.actual += Number(b.actual_spend) || 0;
      projectEntry.committed += effectiveCommitted;

      // Category Level Aggregation
      const categoryKey = `${b.project_id}-${b.category_name}`;
      if (!categoryBudgetsMap.has(categoryKey)) {
        categoryBudgetsMap.set(categoryKey, {
          id: b.id,
          project_id: b.project_id,
          category_name: b.category_name,
          original: 0,
          revised: 0,
          actual: 0,
          committed: 0
        });
      }
      const categoryEntry = categoryBudgetsMap.get(categoryKey)!;
      categoryEntry.original += Number(b.original_amount) || 0;
      categoryEntry.revised += Number(b.revised_amount) || 0;
      categoryEntry.actual += Number(b.actual_spend) || 0;
      categoryEntry.committed += effectiveCommitted;
    });

    // Process Change Orders Global Summary
    changeOrders.forEach((co: any) => {
      coSummary.total++;
      const cost = Number(co.cost_impact) || 0;
      
      if (co.status === 'pending') {
        coSummary.pending++;
        coSummary.pendingAmount += cost;
      } else if (co.status === 'approved') {
        coSummary.approved++;
        coSummary.approvedAmount += cost;
      }
    });

    // 5. Build Enhanced Project List
    const enhancedProjects = projects.map(project => {
      const budgetData = projectBudgetsMap.get(project.id) || { original: 0, revised: 0, actual: 0, committed: 0 };
      
      // Use approved payments as SINGLE SOURCE OF TRUTH for spent
      // Fall back to property_budgets.actual_spend if no approved payments exist
      const actualSpentFromPayments = approvedSpentByProject.get(project.id) || 0;
      const actualSpent = actualSpentFromPayments > 0 ? actualSpentFromPayments : budgetData.actual;
      
      // Calculate derived values using actual spent from approved payments
      const remaining = budgetData.revised - actualSpent - budgetData.committed;
      const percentSpent = budgetData.revised > 0 
        ? (actualSpent / budgetData.revised * 100) 
        : 0;

      // Determine Status
      let budgetStatus = 'On Track';
      if (percentSpent >= 100) budgetStatus = 'Over Budget';
      else if (percentSpent >= 95) budgetStatus = 'Critical';
      else if (percentSpent >= 85) budgetStatus = 'Warning';

      // Add to Global Totals
      heroMetrics.totalBudget += budgetData.original;
      heroMetrics.totalRevised += budgetData.revised;
      heroMetrics.totalSpent += actualSpent; // Use actual from approved payments
      heroMetrics.totalCommitted += budgetData.committed;
      heroMetrics.totalRemaining += remaining;

      // Add to Status Counts
      if (budgetStatus === 'On Track') statusSummary.onTrack++;
      else if (budgetStatus === 'Warning') statusSummary.warning++;
      else if (budgetStatus === 'Critical') statusSummary.critical++;
      else if (budgetStatus === 'Over Budget') statusSummary.overBudget++;

      return {
        id: project.id,
        name: project.name,
        owner_entity_id: null, 
        portfolio_name: null,
        status: project.status,
        budgetOriginal: budgetData.original,
        budgetRevised: budgetData.revised,
        actualSpend: actualSpent, // Use spent from approved payments
        remaining: remaining,
        percentSpent: percentSpent,
        budgetStatus: budgetStatus
      };
    });

    // Final Global Calculation
    heroMetrics.percentSpent = heroMetrics.totalRevised > 0 
      ? (heroMetrics.totalSpent / heroMetrics.totalRevised * 100) 
      : 0;

    // 6. Generate Alerts
    const alerts = enhancedProjects
      .filter(p => p.budgetStatus === 'Critical' || p.budgetStatus === 'Over Budget')
      .map(p => ({
        type: p.budgetStatus === 'Over Budget' ? 'critical' : 'warning',
        message: `${p.name} is ${p.budgetStatus.toLowerCase()} (${p.percentSpent.toFixed(1)}% spent)`,
        projectId: p.id,
        projectName: p.name
      }));

    if (coSummary.pending > 0) {
      alerts.push({
        type: 'info',
        message: `${coSummary.pending} change orders pending approval ($${coSummary.pendingAmount.toLocaleString()})`,
        projectId: null,
        projectName: null
      } as any);
    }

    // 7. Budget Items (Line Items)
    const enhancedBudgetItems = Array.from(categoryBudgetsMap.values()).map((b) => {
        const remaining = b.revised - b.actual - b.committed;
        const percentSpent = b.revised > 0 ? (b.actual / b.revised * 100) : 0;

        let status = 'On Track';
        if (percentSpent >= 100) status = 'Over Budget';
        else if (percentSpent >= 95) status = 'Critical';
        else if (percentSpent >= 85) status = 'Warning';

        return {
            id: b.id,
            project_id: b.project_id,
            category_name: b.category_name,
            original: b.original,
            revised: b.revised,
            actual: b.actual,
            committed: b.committed,
            remaining,
            percentSpent,
            status
        };
    });

    // 8. Return Response
    return NextResponse.json({
      heroMetrics,
      statusSummary,
      changeOrdersSummary: coSummary,
      projects: enhancedProjects,
      alerts,
      budgetItems: enhancedBudgetItems
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Budget Metrics API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
