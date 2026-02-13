'use client';

import { useState } from 'react';
import { X, Loader2, Plus, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { BidScopeItem } from '@/types/bid';

interface ScopeTemplateCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ScopeTemplateCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: ScopeTemplateCreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trade: '',
    scope_type: '',
    description: '',
  });

  const [scopeItems, setScopeItems] = useState<BidScopeItem[]>([]);

  const resetForm = () => {
    setFormData({
      name: '',
      trade: '',
      scope_type: '',
      description: '',
    });
    setScopeItems([]);
    setError(null);
  };

  const handleAddScopeItem = () => {
    setScopeItems([
      ...scopeItems,
      {
        item: '',
        typically_included: true,
        notes: '',
      },
    ]);
  };

  const handleUpdateScopeItem = (index: number, field: keyof BidScopeItem, value: unknown) => {
    const updated = [...scopeItems];
    updated[index] = { ...updated[index], [field]: value };
    setScopeItems(updated);
  };

  const handleRemoveScopeItem = (index: number) => {
    setScopeItems(scopeItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Validation
      if (!formData.name) {
        setError('Please enter a template name');
        setLoading(false);
        return;
      }
      if (!formData.trade) {
        setError('Please select a trade');
        setLoading(false);
        return;
      }
      if (scopeItems.length === 0) {
        setError('Please add at least one scope item');
        setLoading(false);
        return;
      }

      // Check for empty scope items
      const emptyItems = scopeItems.filter(item => !item.item.trim());
      if (emptyItems.length > 0) {
        setError('Please fill in all scope item descriptions');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/scope-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          trade: formData.trade,
          scope_type: formData.scope_type || undefined,
          description: formData.description || undefined,
          scope_items: scopeItems,
          is_active: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create template');
      }

      // Success!
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      console.error('Error creating template:', err);
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const tradeOptions = [
    'Electrical',
    'Plumbing',
    'HVAC',
    'Drywall',
    'Painting',
    'Flooring',
    'Roofing',
    'Framing',
    'Concrete',
    'Masonry',
    'Other',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Scope Template</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create a reusable checklist for common work types
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Template Information</h3>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Standard Electrical Rough-in"
                  required
                />
              </div>

              {/* Trade and Scope Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Trade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.trade}
                    onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  >
                    <option value="">Select trade...</option>
                    {tradeOptions.map((trade) => (
                      <option key={trade} value={trade}>
                        {trade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Scope Type
                  </label>
                  <input
                    type="text"
                    value={formData.scope_type}
                    onChange={(e) => setFormData({ ...formData, scope_type: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g., Rough-in, Finish, Full Install"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  rows={2}
                  placeholder="Brief description of this template..."
                />
              </div>
            </div>

            {/* Scope Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Scope Items</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Define typical items for this type of work
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddScopeItem}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {scopeItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm border border-border rounded-lg bg-muted/30">
                  No scope items yet. Click "Add Item" to start building your checklist.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {scopeItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg bg-background"
                    >
                      <div className="flex items-center pt-2">
                        <input
                          type="checkbox"
                          checked={item.typically_included !== false}
                          onChange={(e) =>
                            handleUpdateScopeItem(index, 'typically_included', e.target.checked)
                          }
                          className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                          title="Typically included in bids?"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) => handleUpdateScopeItem(index, 'item', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Scope item description... (e.g., Panel installation)"
                          required
                        />
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateScopeItem(index, 'notes', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Notes (e.g., 'Often excluded' or 'Requires permit')..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScopeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {scopeItems.length > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg p-3">
                  <strong>Tip:</strong> Check the box for items <strong>typically included</strong> in bids.
                  Uncheck for items that are <strong>often excluded</strong> (like permits, cleanup, etc.).
                  This helps contractors know what to include and warns you about common exclusions.
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Create Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
