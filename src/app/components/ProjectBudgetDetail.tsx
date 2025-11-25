'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, RefreshCw } from 'lucide-react';

import { ExcelBudgetTable } from './ExcelBudgetTable';
import { MetricCard } from '@/components/ui/MetricCard';
import { getBudgetStatus, formatCurrency, formatPercent } from '@/lib/theme';

// Types
interface BudgetLineItem {
  id: number;
  project_id: number;
  category_name: string;
  description?: string | null;
  original_amount: number;
  revised_amount: number;
  actual_spend: number;
  committed_costs: number;
  remaining_amount?: number;
  percent_spent?: number;
  budget_status?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  linked_contract_total?: number;
}

interface BudgetSummary {
  totalOriginal: number;
  totalRevised: number;
  totalActual: number;
  totalCommitted: number;
  totalRemaining: number;
  percentSpent: number;
  status: string;
}

interface ProjectBudgetDetailProps {
  projectId: number;
  projectName: string;
}

const ProjectBudgetDetail: React.FC<ProjectBudgetDetailProps> = ({ projectId, projectName }) => {
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch budget data
  const fetchBudget = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // 1. Fetch Budget Line Items
      const response = await fetch(`/api/budgets?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budget data');
      }

      const data = await response.json();
      let budgetsArray: BudgetLineItem[] = data.budgets || [];

      // 2. Fetch Linked Contracts to Calculate Committed Costs
      const { data: contractsData, error: contractsError } = await supabase
        .from('project_contractors')
        .select('budget_item_id, contract_amount')
        .eq('project_id', projectId)
        .not('budget_item_id', 'is', null);

      if (contractsError) {
        console.error('Error fetching contracts for budget:', contractsError);
      }

      // 3. Map Contracts to Budget Items
      const contractTotals = new Map<number, number>();
      (contractsData || []).forEach((c: any) => {
        const current = contractTotals.get(c.budget_item_id) || 0;
        contractTotals.set(c.budget_item_id, current + (Number(c.contract_amount) || 0));
      });

      // 4. Update Budget Items with Auto-Calculated Committed Costs & Derived Values
      budgetsArray = budgetsArray.map(item => {
        const linkedTotal = contractTotals.get(item.id);
        const committed = linkedTotal !== undefined ? linkedTotal : item.committed_costs;
        const revised = item.revised_amount || item.original_amount || 0;
        const actual = item.actual_spend || 0;
        const remaining = revised - actual - committed;
        const percent_spent = revised > 0 ? (actual / revised) * 100 : 0;
        
        let budget_status = 'On Track';
        const ratio = revised > 0 ? (actual + committed) / revised : 0;
        if (ratio >= 1.05) budget_status = 'Over Budget';
        else if (ratio >= 1.0) budget_status = 'Critical';
        else if (ratio >= 0.9) budget_status = 'Warning';
        
        return { 
          ...item, 
          committed_costs: committed,
          linked_contract_total: linkedTotal,
          remaining_amount: remaining,
          percent_spent: percent_spent,
          budget_status: budget_status
        };
      });
      
      setBudgetItems(budgetsArray);
      calculateSummary(budgetsArray);

    } catch (err: any) {
      console.error('Error fetching budget:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Calculate summary
  const calculateSummary = (items: BudgetLineItem[]) => {
    const totals = items.reduce((acc, item) => {
      acc.totalOriginal += Number(item.original_amount) || 0;
      acc.totalRevised += Number(item.revised_amount) || 0;
      acc.totalActual += Number(item.actual_spend) || 0;
      acc.totalCommitted += Number(item.committed_costs) || 0;
      return acc;
    }, {
      totalOriginal: 0,
      totalRevised: 0,
      totalActual: 0,
      totalCommitted: 0
    });

    const totalRemaining = totals.totalRevised - totals.totalActual - totals.totalCommitted;
    const percentSpent = totals.totalRevised > 0 ? (totals.totalActual / totals.totalRevised * 100) : 0;
    
    // Use theme logic for status
    let status = 'neutral';
    const ratio = totals.totalRevised > 0 ? totals.totalActual / totals.totalRevised : 0;
    if (ratio >= 1.05) status = 'critical';
    else if (ratio >= 0.90) status = 'warning';

    setSummary({
      ...totals,
      totalRemaining,
      percentSpent,
      status
    });
  };

  // Handle update
  const handleUpdate = async (id: number, updates: Partial<BudgetLineItem>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');

    const response = await fetch(`/api/budgets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update budget');
    }

    await fetchBudget();
  };

  // Handle create
  const handleCreate = async (newBudget: Partial<BudgetLineItem>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');

    const response = await fetch('/api/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      },
      body: JSON.stringify({
        ...newBudget,
        project_id: projectId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create budget');
    }

    await fetchBudget();
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');

    const response = await fetch(`/api/budgets/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete budget');
    }

    await fetchBudget();
  };

  if (loading && budgetItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-status-critical">Error: {error}</p>
        <button onClick={fetchBudget} className="text-status-critical underline mt-2 font-medium">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Budget - {projectName}</h2>
          <p className="text-sm text-muted-foreground mt-1">Track spending across budget categories</p>
        </div>
        <button
          onClick={fetchBudget}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <MetricCard 
            title="Original Budget"
            value={formatCurrency(summary.totalOriginal)}
            padding="sm"
          />

          <MetricCard 
            title="Revised Budget"
            value={formatCurrency(summary.totalRevised)}
            subtitle={summary.totalRevised !== summary.totalOriginal 
              ? `${summary.totalRevised > summary.totalOriginal ? '+' : ''}${formatCurrency(summary.totalRevised - summary.totalOriginal)}`
              : undefined}
            padding="sm"
          />

          <MetricCard 
            title="Actual Spend"
            value={formatCurrency(summary.totalActual)}
            status={getBudgetStatus(summary.totalActual, summary.totalRevised)}
            subtitle={`${formatPercent(summary.percentSpent)} spent`}
            padding="sm"
          />

          <MetricCard 
            title="Committed"
            value={formatCurrency(summary.totalCommitted)}
            status="warning"
            subtitle="Approved but unpaid"
            padding="sm"
          />

          <MetricCard 
            title="Remaining"
            value={formatCurrency(summary.totalRemaining)}
            status={summary.totalRemaining < 0 ? 'critical' : 'neutral'}
            statusLabel={summary.totalRemaining < 0 ? 'Over Budget' : undefined}
            padding="sm"
          />

          <MetricCard 
            title="Status"
            value={summary.status === 'critical' ? 'Critical' : summary.status === 'warning' ? 'Warning' : 'On Track'}
            status={summary.status as any} // Casting because summary.status string might not perfectly match 'critical'|'warning'|'neutral'|'success' yet
            subtitle="Budget Health"
            padding="sm"
          />
        </div>
      )}

      {/* Excel-like Budget Table */}
      <ExcelBudgetTable
        data={budgetItems}
        onUpdate={handleUpdate}
        onCreate={handleCreate}
        onDelete={handleDelete}
        isLoading={loading}
      />
    </div>
  );
};

export default ProjectBudgetDetail;
