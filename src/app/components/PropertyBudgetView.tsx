'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  DollarSign, 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  budget_status?: 'On Track' | 'Warning' | 'Critical' | 'Over Budget';
  budget_variance?: number;
}

interface PropertyBudgetViewProps {
  projectId: number;
  projectName: string;
}

// Common budget categories
const BUDGET_CATEGORIES = [
  'Demo & Prep',
  'Framing',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Insulation',
  'Drywall',
  'Painting',
  'Flooring',
  'Fixtures & Hardware',
  'Cabinets & Countertops',
  'Appliances',
  'Permits & Fees',
  'Contingency',
  'Other'
];

// Helper function to get status color
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'On Track':
      return 'text-green-600 bg-green-50';
    case 'Warning':
      return 'text-yellow-600 bg-yellow-50';
    case 'Critical':
      return 'text-orange-600 bg-orange-50';
    case 'Over Budget':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

// Budget Form Modal
const BudgetFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  initialData?: Partial<PropertyBudget>;
  projectId: number;
}> = ({ isOpen, onClose, onSubmit, isSubmitting, initialData, projectId }) => {
  const [formData, setFormData] = useState({
    category_name: initialData?.category_name || '',
    description: initialData?.description || '',
    original_amount: initialData?.original_amount?.toString() || '',
    display_order: initialData?.display_order?.toString() || '0',
    notes: initialData?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      project_id: projectId,
      original_amount: parseFloat(formData.original_amount) || 0,
      display_order: parseInt(formData.display_order) || 0
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Budget Line Item' : 'Add Budget Line Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category_name">Category Name *</Label>
            <Input
              id="category_name"
              value={formData.category_name}
              onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              placeholder="e.g., Electrical, Plumbing"
              list="budget-categories"
              required
              disabled={isSubmitting}
            />
            <datalist id="budget-categories">
              {BUDGET_CATEGORIES.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div>
            <Label htmlFor="original_amount">Budget Amount ($) *</Label>
            <Input
              id="original_amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.original_amount}
              onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
              placeholder="0.00"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description..."
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
              placeholder="0"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                initialData?.id ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const PropertyBudgetView: React.FC<PropertyBudgetViewProps> = ({ projectId, projectName }) => {
  const [budgets, setBudgets] = useState<PropertyBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<PropertyBudget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<PropertyBudget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Add budget
  const handleAddBudget = async (budgetData: any) => {
    try {
      setIsSubmitting(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify(budgetData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create budget');
      }

      setIsAddModalOpen(false);
      fetchBudgets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update budget
  const handleUpdateBudget = async (budgetData: any) => {
    if (!editingBudget) return;

    try {
      setIsSubmitting(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await fetch(`/api/budgets/${editingBudget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ ...budgetData, id: editingBudget.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update budget');
      }

      setIsEditModalOpen(false);
      setEditingBudget(null);
      fetchBudgets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete budget
  const handleDeleteBudget = async () => {
    if (!deletingBudget) return;

    try {
      setIsSubmitting(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await fetch(`/api/budgets/${deletingBudget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete budget');
      }

      setIsDeleteModalOpen(false);
      setDeletingBudget(null);
      fetchBudgets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
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
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Line Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Original Budget</p>
          <p className="text-2xl font-bold text-gray-900">${totals.original.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Revised Budget</p>
          <p className="text-2xl font-bold text-blue-600">${totals.revised.toLocaleString()}</p>
          {totals.revised !== totals.original && (
            <p className="text-xs text-gray-400">
              {totals.revised > totals.original ? '+' : ''}
              ${(totals.revised - totals.original).toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Actual Spend</p>
          <p className="text-2xl font-bold text-green-600">${totals.actual.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{percentSpent.toFixed(1)}% spent</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Committed</p>
          <p className="text-2xl font-bold text-yellow-600">${totals.committed.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className={`text-2xl font-bold ${totals.remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ${totals.remaining.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Budget Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Original</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revised</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Spent</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No budget line items yet</p>
                    <Button variant="link" onClick={() => setIsAddModalOpen(true)}>
                      Add your first line item
                    </Button>
                  </td>
                </tr>
              ) : (
                budgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{budget.category_name}</div>
                        {budget.description && (
                          <div className="text-xs text-gray-500">{budget.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      ${budget.original_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={budget.revised_amount !== budget.original_amount ? 'font-semibold text-blue-600' : 'text-gray-900'}>
                        ${budget.revised_amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      ${budget.actual_spend.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <span className={(budget.remaining_amount || 0) < 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}>
                        ${(budget.remaining_amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm font-medium">{budget.percent_spent?.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(budget.budget_status)}`}>
                        {budget.budget_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingBudget(budget);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingBudget(budget);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <BudgetFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddBudget}
        isSubmitting={isSubmitting}
        projectId={projectId}
      />

      {editingBudget && (
        <BudgetFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingBudget(null);
          }}
          onSubmit={handleUpdateBudget}
          isSubmitting={isSubmitting}
          initialData={editingBudget}
          projectId={projectId}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={() => setIsDeleteModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget Line Item</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete <strong>{deletingBudget?.category_name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBudget} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyBudgetView;

