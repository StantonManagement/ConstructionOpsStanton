import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Budget Dashboard Metrics API
 * Provides aggregated financial data across all properties
 */

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const client = supabaseAdmin; // Store reference for type safety

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await client.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entity_id');
    const portfolioName = searchParams.get('portfolio_name');

    // ============================================================
    // 1. Hero Metrics - Overall Budget Summary
    // ============================================================
    let budgetQuery = client
      .from('property_budgets_summary')
      .select('original_amount, revised_amount, actual_spend, committed_costs, remaining_amount, budget_status');

    // Apply filters
    if (entityId) {
      budgetQuery = budgetQuery.eq('owner_entity_id', parseInt(entityId));
    }
    if (portfolioName) {
      budgetQuery = budgetQuery.eq('portfolio_name', portfolioName);
    }

    const { data: budgets, error: budgetError } = await budgetQuery;

    if (budgetError) {
      console.error('[Budget Metrics API] Error fetching budgets:', budgetError);
      return NextResponse.json({ error: budgetError.message }, { status: 500 });
    }

    // Calculate totals
    const totals = (budgets || []).reduce((acc, budget) => {
      acc.totalBudget += Number(budget.original_amount) || 0;
      acc.totalRevised += Number(budget.revised_amount) || 0;
      acc.totalSpent += Number(budget.actual_spend) || 0;
      acc.totalCommitted += Number(budget.committed_costs) || 0;
      acc.totalRemaining += Number(budget.remaining_amount) || 0;
      return acc;
    }, {
      totalBudget: 0,
      totalRevised: 0,
      totalSpent: 0,
      totalCommitted: 0,
      totalRemaining: 0
    });

    // Calculate percentage
    const percentSpent = totals.totalRevised > 0 
      ? (totals.totalSpent / totals.totalRevised * 100) 
      : 0;

    // ============================================================
    // 2. Status Summary - Property Counts by Status
    // ============================================================
    const statusCounts = (budgets || []).reduce((acc, budget) => {
      const status = budget.budget_status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // ============================================================
    // 3. Change Orders Summary
    // ============================================================
    let coQuery = client
      .from('change_orders_detail')
      .select('status, cost_impact, project_id, owner_entity_id');

    if (entityId) {
      coQuery = coQuery.eq('owner_entity_id', parseInt(entityId));
    }

    const { data: changeOrders, error: coError } = await coQuery;

    const coSummary = (changeOrders || []).reduce((acc, co) => {
      acc.total++;
      if (co.status === 'pending') acc.pending++;
      if (co.status === 'approved') {
        acc.approved++;
        acc.approvedAmount += Number(co.cost_impact) || 0;
      }
      if (co.status === 'pending') {
        acc.pendingAmount += Number(co.cost_impact) || 0;
      }
      return acc;
    }, {
      total: 0,
      pending: 0,
      approved: 0,
      pendingAmount: 0,
      approvedAmount: 0
    });

    // ============================================================
    // 4. Property Performance Grid
    // ============================================================
    let projectsQuery = client
      .from('projects')
      .select(`
        id,
        name,
        owner_entity_id,
        portfolio_name,
        status,
        budget,
        spent,
        start_date,
        target_completion_date
      `)
      .eq('status', 'active');

    if (entityId) {
      projectsQuery = projectsQuery.eq('owner_entity_id', parseInt(entityId));
    }
    if (portfolioName) {
      projectsQuery = projectsQuery.eq('portfolio_name', portfolioName);
    }

    const { data: projects, error: projectsError } = await projectsQuery;

    // Enhance projects with budget data
    const enhancedProjects = await Promise.all(
      (projects || []).map(async (project) => {
        // Get budget summary for this project
        const { data: projectBudgets } = await client
          .from('property_budgets_summary')
          .select('original_amount, revised_amount, actual_spend, remaining_amount, percent_spent, budget_status')
          .eq('project_id', project.id);

        const budgetTotals = (projectBudgets || []).reduce((acc, b) => {
          acc.original += Number(b.original_amount) || 0;
          acc.revised += Number(b.revised_amount) || 0;
          acc.actual += Number(b.actual_spend) || 0;
          acc.remaining += Number(b.remaining_amount) || 0;
          return acc;
        }, { original: 0, revised: 0, actual: 0, remaining: 0 });

        const percentSpent = budgetTotals.revised > 0 
          ? (budgetTotals.actual / budgetTotals.revised * 100) 
          : 0;

        // Determine status
        let budgetStatus = 'On Track';
        if (percentSpent >= 100) budgetStatus = 'Over Budget';
        else if (percentSpent >= 95) budgetStatus = 'Critical';
        else if (percentSpent >= 85) budgetStatus = 'Warning';

        return {
          ...project,
          budgetOriginal: budgetTotals.original,
          budgetRevised: budgetTotals.revised,
          actualSpend: budgetTotals.actual,
          remaining: budgetTotals.remaining,
          percentSpent: percentSpent,
          budgetStatus: budgetStatus
        };
      })
    );

    // ============================================================
    // 5. Alerts - Budget Warnings
    // ============================================================
    const alerts = enhancedProjects
      .filter(p => p.budgetStatus === 'Critical' || p.budgetStatus === 'Over Budget')
      .map(p => ({
        type: p.budgetStatus === 'Over Budget' ? 'critical' : 'warning',
        message: `${p.name} is ${p.budgetStatus.toLowerCase()} (${p.percentSpent.toFixed(1)}% spent)`,
        projectId: p.id,
        projectName: p.name
      }));

    // Add CO alerts
    if (coSummary.pending > 0) {
      alerts.push({
        type: 'info',
        message: `${coSummary.pending} change orders pending approval ($${coSummary.pendingAmount.toLocaleString()})`,
        projectId: null,
        projectName: null
      });
    }

    // ============================================================
    // 6. Response
    // ============================================================
    return NextResponse.json({
      heroMetrics: {
        totalBudget: totals.totalBudget,
        totalRevised: totals.totalRevised,
        totalSpent: totals.totalSpent,
        totalCommitted: totals.totalCommitted,
        totalRemaining: totals.totalRemaining,
        percentSpent: percentSpent
      },
      statusSummary: {
        onTrack: statusCounts['On Track'] || 0,
        warning: statusCounts['Warning'] || 0,
        critical: statusCounts['Critical'] || 0,
        overBudget: statusCounts['Over Budget'] || 0
      },
      changeOrdersSummary: coSummary,
      projects: enhancedProjects,
      alerts: alerts
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Budget Metrics API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

