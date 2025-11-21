'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Save,
  X,
  Lock
} from 'lucide-react';

import { DataTable } from '@/components/ui/DataTable';
import { MetricCard } from '@/components/ui/MetricCard';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { getBudgetStatus, formatCurrency, formatPercent } from '@/lib/theme';

// Types
interface BudgetLineItem {
  id: number;
  project_id: number;
  category_name: string;
  original_amount: number;
  revised_amount: number;
  actual_spend: number;
  committed_costs: number;
  status: string;
  created_at: string;
  updated_at: string;
  linked_contract_total?: number; // Helper for UI
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

const BUDGET_CATEGORIES = [
  'Site Work',
  'Foundation',
  'Framing',
  'Roofing',
  'Windows & Doors',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Insulation',
  'Drywall',
  'Flooring',
  'Cabinets & Countertops',
  'Painting',
  'Fixtures & Hardware',
  'Landscaping',
  'Permits & Fees',
  'Contingency',
  'Other'
];

const ProjectBudgetDetail: React.FC<ProjectBudgetDetailProps> = ({ projectId, projectName }) => {
  const [budgetItems, setBudgetItems] = useState<BudgetLineItem[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add/Edit state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetLineItem | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    category_name: '',
    original_amount: '',
    revised_amount: '',
    actual_spend: '',
    committed_costs: ''
  });

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

      // 4. Update Budget Items with Auto-Calculated Committed Costs
      budgetsArray = budgetsArray.map(item => {
        const linkedTotal = contractTotals.get(item.id);
        if (linkedTotal !== undefined) {
          // If contracts are linked, override the manual committed_costs for display
          return { 
            ...item, 
            committed_costs: linkedTotal,
            linked_contract_total: linkedTotal 
          };
        }
        return item;
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

  // Reset form
  const resetForm = () => {
    setFormData({
      category_name: '',
      original_amount: '',
      revised_amount: '',
      actual_spend: '',
      committed_costs: ''
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  // Start editing
  const startEdit = (item: BudgetLineItem) => {
    setEditingItem(item);
    setFormData({
      category_name: item.category_name,
      original_amount: item.original_amount.toString(),
      revised_amount: item.revised_amount.toString(),
      actual_spend: item.actual_spend.toString(),
      committed_costs: item.committed_costs.toString()
    });
    setShowAddForm(false);
  };

  // Save budget item
  const handleSave = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const payload = {
        project_id: projectId,
        category_name: formData.category_name,
        original_amount: parseFloat(formData.original_amount) || 0,
        revised_amount: parseFloat(formData.revised_amount) || parseFloat(formData.original_amount) || 0,
        actual_spend: parseFloat(formData.actual_spend) || 0,
        // Only update manual committed costs if not overridden by contracts
        committed_costs: parseFloat(formData.committed_costs) || 0
      };

      let response;
      if (editingItem) {
        response = await fetch(`/api/budgets/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/budgets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save budget item');
      }

      resetForm();
      fetchBudget();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete budget item
  const handleDelete = async (item: BudgetLineItem) => {
    if (!confirm(`Delete ${item.category_name} budget line item?`)) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/budgets/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete budget item');
      }

      fetchBudget();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
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

  const columns = [
    { header: 'Category', accessor: 'category_name', className: 'font-medium' },
    { 
      header: 'Original', 
      accessor: (row: BudgetLineItem) => formatCurrency(row.original_amount), 
      align: 'right' as const 
    },
    { 
      header: 'Revised', 
      accessor: (row: BudgetLineItem) => (
        <span className={row.revised_amount !== row.original_amount ? 'text-status-warning font-medium' : ''}>
          {formatCurrency(row.revised_amount)}
        </span>
      ), 
      align: 'right' as const 
    },
    { 
      header: 'Actual', 
      accessor: (row: BudgetLineItem) => formatCurrency(row.actual_spend), 
      align: 'right' as const 
    },
    { 
      header: 'Committed', 
      accessor: (row: BudgetLineItem) => (
        <div className="flex items-center justify-end gap-1">
          {row.linked_contract_total !== undefined && (
            <Lock className="w-3 h-3 text-blue-500" title="Auto-calculated from linked contracts" />
          )}
          <span className={row.linked_contract_total !== undefined ? 'text-blue-600 font-medium' : ''}>
            {formatCurrency(row.committed_costs)}
          </span>
        </div>
      ), 
      align: 'right' as const 
    },
    { 
      header: 'Remaining', 
      accessor: (row: BudgetLineItem) => {
        const remaining = row.revised_amount - row.actual_spend - row.committed_costs;
        const isNegative = remaining < 0;
        return (
          <span className={isNegative ? 'text-status-critical font-bold' : 'text-status-success'}>
            {formatCurrency(remaining)}
          </span>
        );
      }, 
      align: 'right' as const 
    },
    { 
      header: '% Spent', 
      accessor: (row: BudgetLineItem) => {
        const percent = row.revised_amount > 0 ? (row.actual_spend / row.revised_amount) * 100 : 0;
        return formatPercent(percent);
      }, 
      align: 'center' as const 
    },
    { 
      header: 'Status', 
      accessor: (row: BudgetLineItem) => {
        const status = getBudgetStatus(row.actual_spend + row.committed_costs, row.revised_amount);
        if (status === 'neutral') return null;
        return (
          <SignalBadge status={status}>
            {status === 'critical' ? 'Over Budget' : 'Warning'}
          </SignalBadge>
        );
      }, 
      align: 'center' as const 
    },
    {
      header: 'Actions',
      accessor: (row: BudgetLineItem) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => startEdit(row)}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-muted-foreground hover:text-status-critical transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      align: 'center' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Budget - {projectName}</h2>
          <p className="text-sm text-muted-foreground mt-1">Track spending across budget categories</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchBudget}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {!showAddForm && !editingItem && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Budget Item
            </button>
          )}
        </div>
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

      {/* Add/Edit Form */}
      {(showAddForm || editingItem) && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            {editingItem ? 'Edit Budget Item' : 'Add Budget Item'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                Category *
              </label>
              <select
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select category...</option>
                {BUDGET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Original Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Revised Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.revised_amount}
                onChange={(e) => setFormData({ ...formData, revised_amount: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                placeholder="Same as original"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Actual Spend
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.actual_spend}
                onChange={(e) => setFormData({ ...formData, actual_spend: e.target.value })}
                className="w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Committed Costs
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={formData.committed_costs}
                  onChange={(e) => setFormData({ ...formData, committed_costs: e.target.value })}
                  className={`w-full px-3 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring ${
                    editingItem?.linked_contract_total !== undefined ? 'bg-gray-100 text-gray-500' : ''
                  }`}
                  placeholder="0.00"
                  readOnly={editingItem?.linked_contract_total !== undefined}
                />
                {editingItem?.linked_contract_total !== undefined && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
              {editingItem?.linked_contract_total !== undefined && (
                <p className="text-xs text-blue-600 mt-1">
                  Auto-calculated from linked contracts.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={!formData.category_name || !formData.original_amount}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {editingItem ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Budget Items Table */}
      <DataTable 
        data={budgetItems} 
        columns={columns} 
        emptyMessage="No budget items yet. Add your first item above."
      />
    </div>
  );
};

export default ProjectBudgetDetail;
