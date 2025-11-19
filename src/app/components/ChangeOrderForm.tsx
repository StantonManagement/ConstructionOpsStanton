'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FileUp, Loader2, X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChangeOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  projectId?: number;
}

interface Project {
  id: number;
  name: string;
}

interface Contractor {
  id: number;
  name: string;
}

interface BudgetCategory {
  id: number;
  category_name: string;
}

const REASON_CATEGORIES = [
  'Hidden Conditions',
  'Code Requirement',
  'Owner Request',
  'Design Change',
  'Material Unavailability',
  'Other'
];

const ChangeOrderForm: React.FC<ChangeOrderFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  projectId: preselectedProjectId
}) => {
  const [formData, setFormData] = useState({
    project_id: preselectedProjectId?.toString() || '',
    contractor_id: '',
    budget_category_id: '',
    title: '',
    description: '',
    reason_category: '',
    justification: '',
    cost_impact: '',
    schedule_impact_days: '0',
    notes: '',
    auto_submit: false
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [loadingBudgets, setLoadingBudgets] = useState(false);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .eq('status', 'active')
          .order('name');

        if (!error && data) {
          setProjects(data);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setLoadingProjects(false);
      }
    };

    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // Fetch contractors when project selected
  useEffect(() => {
    const fetchContractors = async () => {
      if (!formData.project_id) {
        setContractors([]);
        return;
      }

      setLoadingContractors(true);
      try {
        const { data, error } = await supabase
          .from('contractors')
          .select('id, name')
          .eq('status', 'active')
          .order('name');

        if (!error && data) {
          setContractors(data);
        }
      } catch (err) {
        console.error('Error fetching contractors:', err);
      } finally {
        setLoadingContractors(false);
      }
    };

    fetchContractors();
  }, [formData.project_id]);

  // Fetch budget categories when project selected
  useEffect(() => {
    const fetchBudgetCategories = async () => {
      if (!formData.project_id) {
        setBudgetCategories([]);
        return;
      }

      setLoadingBudgets(true);
      try {
        const { data, error } = await supabase
          .from('property_budgets')
          .select('id, category_name')
          .eq('project_id', parseInt(formData.project_id))
          .eq('is_active', true)
          .order('category_name');

        if (!error && data) {
          setBudgetCategories(data);
        }
      } catch (err) {
        console.error('Error fetching budget categories:', err);
      } finally {
        setLoadingBudgets(false);
      }
    };

    fetchBudgetCategories();
  }, [formData.project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      project_id: parseInt(formData.project_id),
      contractor_id: formData.contractor_id ? parseInt(formData.contractor_id) : null,
      budget_category_id: formData.budget_category_id ? parseInt(formData.budget_category_id) : null,
      cost_impact: parseFloat(formData.cost_impact),
      schedule_impact_days: parseInt(formData.schedule_impact_days) || 0
    });
  };

  // Calculate approval tier
  const costImpact = parseFloat(formData.cost_impact) || 0;
  const approvalTier = costImpact < 500 ? 'Auto-Approve' : costImpact < 2000 ? 'Standard' : 'High-Value';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Change Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div className="col-span-2">
              <Label htmlFor="project_id">Property/Project *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                disabled={isSubmitting || loadingProjects || !!preselectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingProjects ? "Loading..." : "Select property"} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contractor */}
            <div>
              <Label htmlFor="contractor_id">Contractor</Label>
              <Select
                value={formData.contractor_id}
                onValueChange={(value) => setFormData({ ...formData, contractor_id: value })}
                disabled={isSubmitting || loadingContractors || !formData.project_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contractors.map(contractor => (
                    <SelectItem key={contractor.id} value={contractor.id.toString()}>
                      {contractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Budget Category */}
            <div>
              <Label htmlFor="budget_category_id">Budget Category</Label>
              <Select
                value={formData.budget_category_id}
                onValueChange={(value) => setFormData({ ...formData, budget_category_id: value })}
                disabled={isSubmitting || loadingBudgets || !formData.project_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {budgetCategories.map(category => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief title for this change order"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed description of the issue and work required..."
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Reason Category */}
            <div>
              <Label htmlFor="reason_category">Reason *</Label>
              <Select
                value={formData.reason_category}
                onValueChange={(value) => setFormData({ ...formData, reason_category: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_CATEGORIES.map(reason => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost Impact */}
            <div>
              <Label htmlFor="cost_impact">Cost Impact ($) *</Label>
              <Input
                id="cost_impact"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_impact}
                onChange={(e) => setFormData({ ...formData, cost_impact: e.target.value })}
                placeholder="0.00"
                required
                disabled={isSubmitting}
              />
              {costImpact > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Approval Tier: <span className={
                    approvalTier === 'Auto-Approve' ? 'text-green-600 font-semibold' :
                    approvalTier === 'Standard' ? 'text-blue-600 font-semibold' :
                    'text-orange-600 font-semibold'
                  }>{approvalTier}</span>
                </p>
              )}
            </div>

            {/* Schedule Impact */}
            <div className="col-span-2">
              <Label htmlFor="schedule_impact_days">Schedule Impact (Days)</Label>
              <Input
                id="schedule_impact_days"
                type="number"
                value={formData.schedule_impact_days}
                onChange={(e) => setFormData({ ...formData, schedule_impact_days: e.target.value })}
                placeholder="0"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Positive for delays, negative for accelerations
              </p>
            </div>

            {/* Justification */}
            <div className="col-span-2">
              <Label htmlFor="justification">Justification</Label>
              <textarea
                id="justification"
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Why is this change necessary?"
                disabled={isSubmitting}
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes..."
                disabled={isSubmitting}
              />
            </div>

            {/* Auto-submit checkbox */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_submit}
                  onChange={(e) => setFormData({ ...formData, auto_submit: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700">
                  Submit for approval immediately
                  {costImpact < 500 && costImpact > 0 && (
                    <span className="text-green-600 font-semibold ml-1">(will auto-approve)</span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.project_id}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                formData.auto_submit ? 'Create & Submit' : 'Save as Draft'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeOrderForm;

