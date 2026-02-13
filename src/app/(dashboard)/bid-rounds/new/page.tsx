'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { ArrowLeft, Loader2, Plus, Trash2, CheckCircle } from 'lucide-react';
import { BidScopeTemplate, BidScopeItem } from '@/types/bid';

export default function NewBidRoundPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [scopeTemplates, setScopeTemplates] = useState<BidScopeTemplate[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trade: '',
    scope_type: '',
    description: '',
    project_id: '',
    deadline_date: '',
  });

  const [selectedTemplate, setSelectedTemplate] = useState<BidScopeTemplate | null>(null);
  const [scopeItems, setScopeItems] = useState<BidScopeItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      // Load scope templates
      const templatesResponse = await fetch('/api/scope-templates?is_active=true', {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
      });

      if (templatesResponse.ok) {
        const templatesResult = await templatesResponse.json();
        setScopeTemplates(templatesResult.data || []);
      }

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) {
      setSelectedTemplate(null);
      setScopeItems([]);
      return;
    }

    const template = scopeTemplates.find((t) => t.id === parseInt(templateId));
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        ...formData,
        trade: template.trade,
        scope_type: template.scope_type,
        name: formData.name || `${template.trade} ${template.scope_type}`,
      });
      // Initialize scope items from template
      setScopeItems(
        template.scope_items.map((item) => ({
          ...item,
          included: item.typically_included,
        }))
      );
    }
  };

  const handleAddScopeItem = () => {
    setScopeItems([
      ...scopeItems,
      {
        item: '',
        typically_included: true,
        included: true,
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
        router.push('/auth');
        return;
      }

      // Validation
      if (!formData.name) {
        setError('Please enter a name for this bid round');
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

      const response = await fetch('/api/bid-rounds', {
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
          project_id: formData.project_id ? parseInt(formData.project_id) : undefined,
          scope_template_id: selectedTemplate?.id,
          scope_items: scopeItems,
          deadline_date: formData.deadline_date || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bid round');
      }

      const result = await response.json();
      router.push(`/bid-rounds/${result.data.id}`);
    } catch (err: unknown) {
      console.error('Error creating bid round:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bid round');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  const tradeOptions = Array.from(new Set(scopeTemplates.map((t) => t.trade))).sort();

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Create New Bid Round</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define scope and prepare to invite contractors
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>

              <div className="space-y-4">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start from Template (Optional)
                  </label>
                  <select
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Custom scope (start from scratch)</option>
                    {scopeTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.trade} - {template.scope_type}: {template.name}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bid Round Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="e.g., Electrical Rough-in - Hartford 1"
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
                      <option value="Other">Other</option>
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

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Project (Optional)
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">No project selected</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bid Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline_date}
                    onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  />
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
                    rows={4}
                    placeholder="Project details, timeline, special requirements..."
                  />
                </div>
              </div>
            </div>

            {/* Scope Items */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Scope Items</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Define what should be included in the bid
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
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No scope items yet. Add items or select a template above.
                </div>
              ) : (
                <div className="space-y-3">
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
                          title="Typically included"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) => handleUpdateScopeItem(index, 'item', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Scope item description..."
                          required
                        />
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleUpdateScopeItem(index, 'notes', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Notes (optional)..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveScopeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-border text-muted-foreground rounded-lg hover:bg-muted font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Create Bid Round
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
