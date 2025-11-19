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
  X
} from 'lucide-react';

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

const STATUS_COLORS: Record<string, string> = {
  'On Track': 'green',
  'Warning': 'yellow',
  'Critical': 'orange',
  'Over Budget': 'red'
};

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

      const response = await fetch(`/api/budgets?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budget data');
      }

      const data = await response.json();
      // API returns { budgets: [...] }
      const budgetsArray = data.budgets || [];
      setBudgetItems(budgetsArray);
      
      // Calculate summary
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
    
    let status = 'On Track';
    if (percentSpent >= 100) status = 'Over Budget';
    else if (percentSpent >= 95) status = 'Critical';
    else if (percentSpent >= 85) status = 'Warning';

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
        committed_costs: parseFloat(formData.committed_costs) || 0
      };

      let response;
      if (editingItem) {
        // Update existing
        response = await fetch(`/api/budgets/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new
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
        <p className="text-red-800">Error: {error}</p>
        <button onClick={fetchBudget} className="text-red-600 underline mt-2">
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
          <h2 className="text-2xl font-bold text-gray-900">Budget - {projectName}</h2>
          <p className="text-sm text-gray-500 mt-1">Track spending across budget categories</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchBudget}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {!showAddForm && !editingItem && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Original Budget</p>
              <DollarSign className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${summary.totalOriginal.toLocaleString()}
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-blue-700">Revised Budget</p>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">
              ${summary.totalRevised.toLocaleString()}
            </p>
            {summary.totalRevised !== summary.totalOriginal && (
              <p className="text-xs text-blue-600 mt-1">
                {summary.totalRevised > summary.totalOriginal ? '+' : ''}
                ${(summary.totalRevised - summary.totalOriginal).toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-red-700">Actual Spend</p>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-900">
              ${summary.totalActual.toLocaleString()}
            </p>
            <p className="text-xs text-red-600 mt-1">
              {summary.percentSpent.toFixed(1)}% spent
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-yellow-700">Committed</p>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-900">
              ${summary.totalCommitted.toLocaleString()}
            </p>
            <p className="text-xs text-yellow-600 mt-1">Approved but unpaid</p>
          </div>

          <div className={`p-4 rounded-lg border ${
            summary.totalRemaining < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm ${summary.totalRemaining < 0 ? 'text-red-700' : 'text-green-700'}`}>
                Remaining
              </p>
              <DollarSign className={`w-4 h-4 ${summary.totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${summary.totalRemaining < 0 ? 'text-red-900' : 'text-green-900'}`}>
              ${Math.abs(summary.totalRemaining).toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${summary.totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.totalRemaining < 0 ? 'Over budget!' : 'Available'}
            </p>
          </div>

          <div className={`p-4 rounded-lg border bg-${STATUS_COLORS[summary.status]}-50 border-${STATUS_COLORS[summary.status]}-200`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm text-${STATUS_COLORS[summary.status]}-700`}>Status</p>
              {summary.status === 'On Track' ? (
                <CheckCircle className={`w-4 h-4 text-${STATUS_COLORS[summary.status]}-600`} />
              ) : (
                <AlertTriangle className={`w-4 h-4 text-${STATUS_COLORS[summary.status]}-600`} />
              )}
            </div>
            <p className={`text-lg font-bold text-${STATUS_COLORS[summary.status]}-900`}>
              {summary.status}
            </p>
            <p className={`text-xs text-${STATUS_COLORS[summary.status]}-600 mt-1`}>
              Budget health
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingItem) && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? 'Edit Budget Item' : 'Add Budget Item'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select category...</option>
                {BUDGET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Revised Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.revised_amount}
                onChange={(e) => setFormData({ ...formData, revised_amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Same as original"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Spend
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.actual_spend}
                onChange={(e) => setFormData({ ...formData, actual_spend: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Committed Costs
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.committed_costs}
                onChange={(e) => setFormData({ ...formData, committed_costs: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={!formData.category_name || !formData.original_amount}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {editingItem ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Budget Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Original</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revised</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Committed</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Spent</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgetItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No budget items yet</p>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="text-blue-600 underline mt-2"
                    >
                      Add your first budget item
                    </button>
                  </td>
                </tr>
              ) : (
                budgetItems.map((item) => {
                  const remaining = item.revised_amount - item.actual_spend - item.committed_costs;
                  const percentSpent = item.revised_amount > 0 ? (item.actual_spend / item.revised_amount * 100) : 0;
                  
                  let itemStatus = 'On Track';
                  if (percentSpent >= 100) itemStatus = 'Over Budget';
                  else if (percentSpent >= 95) itemStatus = 'Critical';
                  else if (percentSpent >= 85) itemStatus = 'Warning';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.category_name}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        ${item.original_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <span className={item.revised_amount !== item.original_amount ? 'font-semibold text-blue-600' : 'text-gray-900'}>
                          ${item.revised_amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        ${item.actual_spend.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-yellow-600">
                        ${item.committed_costs.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <span className={remaining < 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                          ${remaining.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-medium">
                        {percentSpent.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full bg-${STATUS_COLORS[itemStatus]}-100 text-${STATUS_COLORS[itemStatus]}-800`}
                        >
                          {itemStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectBudgetDetail;

