'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { ExcelBudgetTable } from './ExcelBudgetTable';
import { formatCurrency, formatPercent } from '@/lib/theme';

// Types
interface PropertyBudget {
  id: number;
  project_id: number;
  category_name: string;
  description: string | null;
  original_amount: number;
  revised_amount: number;
  actual_spend: number;
  committed_costs: number;
  display_order: number;
  notes: string | null;
  is_active: boolean;
  // Calculated fields from view
  remaining_amount?: number;
  percent_spent?: number;
  budget_status?: string;
  budget_variance?: number;
}

interface PropertyBudgetViewProps {
  projectId: number;
  projectName: string;
}

// Main Component
const PropertyBudgetView: React.FC<PropertyBudgetViewProps> = ({ projectId, projectName }) => {
  const [budgets, setBudgets] = useState<PropertyBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch budgets
  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/budgets?project_id=${projectId}&summary=true`, {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budgets');
      }

      const data = await response.json();
      setBudgets(data.budgets || []);
    } catch (err: any) {
      console.error('Error fetching budgets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Handle update
  const handleUpdate = async (id: number, updates: Partial<PropertyBudget>) => {
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

    await fetchBudgets();
  };

  // Handle create
  const handleCreate = async (newBudget: Partial<PropertyBudget>) => {
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

    await fetchBudgets();
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

    await fetchBudgets();
  };

  // Calculate totals
  const totals = budgets.reduce((acc, budget) => {
    acc.original += budget.original_amount;
    acc.revised += budget.revised_amount;
    acc.actual += budget.actual_spend;
    acc.committed += budget.committed_costs;
    acc.remaining += budget.remaining_amount || 0;
    return acc;
  }, { original: 0, revised: 0, actual: 0, committed: 0, remaining: 0 });

  const percentSpent = totals.revised > 0 ? (totals.actual / totals.revised * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Budget: {projectName}</h2>
          <p className="text-sm text-muted-foreground">Manage budget line items and track spending</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border shadow-none">
          <p className="text-sm text-muted-foreground">Original Budget</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totals.original)}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border shadow-none">
          <p className="text-sm text-muted-foreground">Revised Budget</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.revised)}</p>
          {totals.revised !== totals.original && (
            <p className="text-xs text-muted-foreground">
              {totals.revised > totals.original ? '+' : ''}
              {formatCurrency(totals.revised - totals.original)}
            </p>
          )}
        </div>
        <div className="bg-card p-4 rounded-lg border border-border shadow-none">
          <p className="text-sm text-muted-foreground">Actual Spend</p>
          <p className="text-2xl font-bold text-status-success">{formatCurrency(totals.actual)}</p>
          <p className="text-xs text-muted-foreground">{formatPercent(percentSpent)} spent</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border shadow-none">
          <p className="text-sm text-muted-foreground">Committed</p>
          <p className="text-2xl font-bold text-status-warning">{formatCurrency(totals.committed)}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border shadow-none">
          <p className="text-sm text-muted-foreground">Remaining</p>
          <p className={`text-2xl font-bold ${totals.remaining < 0 ? 'text-status-critical' : 'text-foreground'}`}>
            {formatCurrency(totals.remaining)}
          </p>
        </div>
      </div>

      {/* Excel-like Budget Table */}
      <ExcelBudgetTable
        data={budgets}
        onUpdate={handleUpdate}
        onCreate={handleCreate}
        onDelete={handleDelete}
        isLoading={loading}
      />
    </div>
  );
};

export default PropertyBudgetView;

