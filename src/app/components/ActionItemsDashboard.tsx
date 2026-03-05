'use client';

import { useState, useEffect } from 'react';
import { Flame, AlertTriangle, TrendingUp, Eye, Archive, Zap, Calendar, User, FileText, CheckCircle2, Clock, XCircle, Plus, Sparkles, RefreshCcw } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import LoadingAnimation from './LoadingAnimation';
import PageContainer from './PageContainer';
import QuickAddActionItem from './QuickAddActionItem';

interface ActionItem {
  id: number;
  title: string;
  description: string | null;
  project_id: number;
  priority: number;
  type: string;
  status: string;
  assigned_to_user_id: string | null;
  waiting_on: string | null;
  follow_up_date: string | null;
  source: 'manual' | 'auto';
  auto_trigger: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  previous_priority: number | null;
  priority_changed_at: string | null;
  stale: boolean;
  created_at: string;
  updated_at: string;
  project: {
    id: number;
    name: string;
    type: string;
    status: string;
  };
  assigned_to: {
    id: string;
    email: string;
  } | null;
}

interface ActionItemsResponse {
  action_items: ActionItem[];
  total: number;
}

const PRIORITY_CONFIG = {
  1: {
    label: 'Drop Everything',
    color: 'bg-red-100 border-red-300 dark:bg-red-950 dark:border-red-800',
    textColor: 'text-red-900 dark:text-red-100',
    icon: Flame,
    iconColor: 'text-red-600 dark:text-red-400'
  },
  2: {
    label: 'Today/This Week',
    color: 'bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-800',
    textColor: 'text-orange-900 dark:text-orange-100',
    icon: AlertTriangle,
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  3: {
    label: 'Needs Push',
    color: 'bg-yellow-100 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800',
    textColor: 'text-yellow-900 dark:text-yellow-100',
    icon: TrendingUp,
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  4: {
    label: 'On Radar',
    color: 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600',
    textColor: 'text-gray-900 dark:text-gray-100',
    icon: Eye,
    iconColor: 'text-gray-600 dark:text-gray-400'
  },
  5: {
    label: 'Parked',
    color: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
    textColor: 'text-slate-900 dark:text-slate-100',
    icon: Archive,
    iconColor: 'text-slate-600 dark:text-slate-400'
  }
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  deferred: { label: 'Deferred', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' }
};

const getTypeBadgeColor = (type: string): string => {
  const typeColorMap: Record<string, string> = {
    emergency: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    blocker: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    waiting_on_external: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    follow_up: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  };
  return typeColorMap[type] || typeColorMap.general;
};

const isOverdue = (followUpDate: string | null): boolean => {
  if (!followUpDate) return false;
  return new Date(followUpDate) < new Date();
};

export default function ActionItemsDashboard() {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isDetectingStale, setIsDetectingStale] = useState(false);

  useEffect(() => {
    fetchActionItems();
  }, []);

  const fetchActionItems = async () => {
    try {
      setIsLoading(true);
      const response = await authFetch('/api/action-items');
      const data: ActionItemsResponse = await response.json();
      setActionItems(data.action_items);
    } catch (error) {
      console.error('Failed to fetch action items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handlePriorityChange = async (itemId: number, newPriority: number) => {
    try {
      setUpdatingItemId(itemId);
      setEditingPriorityId(null);

      await authFetch(`/api/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });

      // Refresh the list
      await fetchActionItems();
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert('Failed to update priority. Please try again.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleMarkResolved = async (itemId: number) => {
    if (!confirm('Mark this action item as resolved?')) return;

    try {
      setUpdatingItemId(itemId);

      await authFetch(`/api/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });

      // Refresh the list
      await fetchActionItems();
    } catch (error) {
      console.error('Failed to mark as resolved:', error);
      alert('Failed to mark as resolved. Please try again.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this action item? This action cannot be undone.')) return;

    try {
      setUpdatingItemId(itemId);

      await authFetch(`/api/action-items/${itemId}?hard=true`, {
        method: 'DELETE'
      });

      // Refresh the list
      await fetchActionItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleAutoGenerate = async () => {
    if (!confirm('Run auto-generation to create action items for:\n\n• Budget overspend (>80% spent)\n• Overdue tasks (>3 days)\n• Missing documentation (>7 days)\n• Pending payments (>3 days)\n• Upcoming milestones (<14 days)\n\nContinue?')) return;

    try {
      setIsAutoGenerating(true);

      const response = await authFetch('/api/action-items/auto-generate', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Auto-generation failed');
      }

      const result = await response.json();
      const { summary } = result;

      // Refresh the list
      await fetchActionItems();

      // Show success message
      alert(
        `Auto-generation complete!\n\n` +
        `Total items created: ${summary.totalItemsCreated}\n` +
        `Projects affected: ${summary.totalProjectsAffected}\n\n` +
        `Breakdown:\n` +
        summary.breakdown.map((b: { trigger: string; itemsCreated: number }) =>
          `• ${b.trigger}: ${b.itemsCreated} items`
        ).join('\n')
      );
    } catch (error) {
      console.error('Failed to auto-generate items:', error);
      alert('Failed to auto-generate items. Please try again.');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleStaleDetection = async () => {
    if (!confirm('Run stale detection to mark items that have been:\n\n• Deprioritized (priority lowered to 4 or 5)\n• Ignored for 3+ days\n• Not updated recently\n\nAlso unmarks items that have been updated or re-prioritized.\n\nContinue?')) return;

    try {
      setIsDetectingStale(true);

      const response = await authFetch('/api/action-items/stale-detection', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Stale detection failed');
      }

      const result = await response.json();
      const { summary } = result;

      // Refresh the list
      await fetchActionItems();

      // Show success message
      alert(
        `Stale detection complete!\n\n` +
        `Items marked as stale: ${summary.itemsMarked}\n` +
        `Items unmarked: ${summary.itemsUnmarked}\n` +
        `Total changes: ${summary.totalChanges}`
      );
    } catch (error) {
      console.error('Failed to run stale detection:', error);
      alert('Failed to run stale detection. Please try again.');
    } finally {
      setIsDetectingStale(false);
    }
  };

  const groupedByPriority = actionItems.reduce((acc, item) => {
    if (!acc[item.priority]) {
      acc[item.priority] = [];
    }
    acc[item.priority].push(item);
    return acc;
  }, {} as Record<number, ActionItem[]>);

  const stats = {
    open: actionItems.filter(i => i.status === 'open').length,
    stale: actionItems.filter(i => i.stale).length,
    resolved: actionItems.filter(i => i.status === 'resolved').length
  };

  if (isLoading) {
    return <LoadingAnimation text="Loading action items..." />;
  }

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Action Items Dashboard</h1>
            <p className="text-muted-foreground">Consolidated priority view across all projects</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleStaleDetection}
              disabled={isDetectingStale}
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Detect and mark stale items"
            >
              <RefreshCcw className={`w-5 h-5 ${isDetectingStale ? 'animate-spin' : ''}`} />
              {isDetectingStale ? 'Detecting...' : 'Detect Stale'}
            </button>
            <button
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating}
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Auto-generate action items"
            >
              <Sparkles className={`w-5 h-5 ${isAutoGenerating ? 'animate-spin' : ''}`} />
              {isAutoGenerating ? 'Generating...' : 'Auto-Generate'}
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Quick Add
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Items</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.open}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stale Items</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.stale}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.resolved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Priority Groups */}
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map(priority => {
            const items = groupedByPriority[priority] || [];
            const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
            const Icon = config.icon;

            if (items.length === 0) {
              return (
                <div key={priority} className={`border rounded-lg p-6 ${config.color}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className={`w-6 h-6 ${config.iconColor}`} />
                    <div>
                      <h2 className={`text-xl font-bold ${config.textColor}`}>
                        Priority {priority}: {config.label}
                      </h2>
                      <p className={`text-sm ${config.textColor} opacity-70`}>
                        No items at this priority level
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={priority} className={`border rounded-lg p-6 ${config.color}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Icon className={`w-6 h-6 ${config.iconColor}`} />
                  <div className="flex-1">
                    <h2 className={`text-xl font-bold ${config.textColor}`}>
                      Priority {priority}: {config.label}
                    </h2>
                    <p className={`text-sm ${config.textColor} opacity-70`}>
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Item Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {item.title}
                            </h3>
                            {item.source === 'auto' && (
                              <span className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full" title="Auto-generated">
                                <Zap className="w-3 h-3" />
                                Auto
                              </span>
                            )}
                            {item.stale && (
                              <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full">
                                Stale
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[item.status]?.color || STATUS_CONFIG.open.color}`}>
                              {STATUS_CONFIG[item.status]?.label || item.status}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getTypeBadgeColor(item.type)}`}>
                              {item.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-full">
                              {item.project.name}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {item.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {item.assigned_to && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {item.assigned_to.email}
                              </span>
                            )}
                            {item.follow_up_date && (
                              <span className={`flex items-center gap-1 ${isOverdue(item.follow_up_date) ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(item.follow_up_date).toLocaleDateString()}
                                {isOverdue(item.follow_up_date) && ' (Overdue)'}
                              </span>
                            )}
                            {item.waiting_on && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Waiting on: {item.waiting_on}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="text-sm text-primary hover:text-primary/80 font-medium whitespace-nowrap"
                        >
                          {expandedItems.has(item.id) ? 'Collapse' : 'Expand'}
                        </button>
                      </div>

                      {/* Expanded Details */}
                      {expandedItems.has(item.id) && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          {item.description && (
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-1">Description:</p>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                          )}

                          {item.resolution_note && (
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-1">Resolution Note:</p>
                              <p className="text-sm text-muted-foreground">{item.resolution_note}</p>
                            </div>
                          )}

                          {item.auto_trigger && (
                            <div>
                              <p className="text-sm font-semibold text-foreground mb-1">Auto-Trigger:</p>
                              <p className="text-sm text-muted-foreground">{item.auto_trigger}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-foreground">Created:</p>
                              <p className="text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">Updated:</p>
                              <p className="text-muted-foreground">{new Date(item.updated_at).toLocaleString()}</p>
                            </div>
                            {item.resolved_at && (
                              <>
                                <div>
                                  <p className="font-semibold text-foreground">Resolved:</p>
                                  <p className="text-muted-foreground">{new Date(item.resolved_at).toLocaleString()}</p>
                                </div>
                              </>
                            )}
                            {item.priority_changed_at && (
                              <div>
                                <p className="font-semibold text-foreground">Priority Changed:</p>
                                <p className="text-muted-foreground">
                                  {new Date(item.priority_changed_at).toLocaleString()}
                                  {item.previous_priority && ` (was P${item.previous_priority})`}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <div className="relative">
                              <button
                                onClick={() => setEditingPriorityId(editingPriorityId === item.id ? null : item.id)}
                                disabled={updatingItemId === item.id}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                              >
                                {updatingItemId === item.id ? 'Updating...' : 'Change Priority'}
                              </button>

                              {editingPriorityId === item.id && (
                                <div className="absolute left-0 mt-2 bg-card border border-border rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">Select Priority:</p>
                                  {[1, 2, 3, 4, 5].map(p => (
                                    <button
                                      key={p}
                                      onClick={() => handlePriorityChange(item.id, p)}
                                      className={`w-full text-left px-3 py-2 rounded hover:bg-accent text-sm transition-colors ${
                                        item.priority === p ? 'bg-accent font-semibold' : ''
                                      }`}
                                    >
                                      P{p} - {PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleMarkResolved(item.id)}
                              disabled={updatingItemId === item.id || item.status === 'resolved'}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              Mark Resolved
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={updatingItemId === item.id}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {actionItems.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No action items</h3>
            <p className="text-muted-foreground mb-6">Get started by creating your first action item</p>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Add Action Item
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      <QuickAddActionItem
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={fetchActionItems}
      />
    </PageContainer>
  );
}
