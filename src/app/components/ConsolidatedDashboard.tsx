'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/authFetch';
import { formatDate } from '@/lib/theme';
import { AlertCircle, Plus, RefreshCw, X } from 'lucide-react';
import PageContainer from './PageContainer';
import { useModal } from '@/context/ModalContext';

// Types
interface ActionItem {
  id: number;
  title: string;
  description?: string | null;
  project_id: number;
  priority: 1 | 2 | 3 | 4 | 5;
  type: 'emergency' | 'blocker' | 'waiting_on_external' | 'waiting_on_bid' | 'waiting_on_contractor' | 'decision_needed' | 'verification_needed' | 'follow_up' | 'upcoming';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'deferred';
  source: 'manual' | 'auto_bid_due' | 'auto_overdue_task' | 'auto_verification' | 'auto_payment_review' | 'auto_daily_log_missing' | 'auto_milestone_upcoming';
  waiting_on?: string | null;
  follow_up_date?: string | null;
  is_stale: boolean;
  days_bumped?: number;
  prev_priority?: number | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
  project?: {
    id: number;
    name: string;
    current_phase?: string;
  };
}

interface Project {
  id: number;
  name: string;
  current_phase?: string;
  stats?: {
    totalBudget?: number;
    totalSpent?: number;
    completionPercentage?: number;
  };
}

// Configuration
const PRIORITY_CONFIG = {
  1: { label: "1", color: "#DC2626", bg: "#FEE2E2", ring: "#FECACA", text: "Drop everything" },
  2: { label: "2", color: "#EA580C", bg: "#FFF7ED", ring: "#FED7AA", text: "Today / this week" },
  3: { label: "3", color: "#CA8A04", bg: "#FEFCE8", ring: "#FEF08A", text: "Needs a push" },
  4: { label: "4", color: "#6B7280", bg: "#F9FAFB", ring: "#E5E7EB", text: "On the radar" },
  5: { label: "5", color: "#9CA3AF", bg: "#F9FAFB", ring: "#F3F4F6", text: "Parked" },
};

const TYPE_LABELS = {
  emergency: "Emergency",
  blocker: "Blocker",
  waiting_on_external: "Waiting — External",
  waiting_on_bid: "Waiting — Bid",
  waiting_on_contractor: "Waiting — Contractor",
  decision_needed: "Decision Needed",
  verification_needed: "Verification",
  follow_up: "Follow Up",
  upcoming: "Upcoming",
};

const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  deferred: "Deferred",
};

const ConsolidatedDashboard: React.FC = () => {
  const { showToast } = useModal();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<ActionItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [priorityPickerId, setPriorityPickerId] = useState<number | null>(null);
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  // Enhanced filters with URL param initialization
  const [filterProject, setFilterProject] = useState(searchParams.get('project') || "all");
  const [filterType, setFilterType] = useState(searchParams.get('type') || "all");
  const [filterPriority, setFilterPriority] = useState(searchParams.get('priority') || "all");
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || "all");

  // Quick add form state
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPriority, setNewPriority] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showQuickAdd && titleRef.current) titleRef.current.focus();
  }, [showQuickAdd]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterProject !== "all") params.set('project', filterProject);
    if (filterType !== "all") params.set('type', filterType);
    if (filterPriority !== "all") params.set('priority', filterPriority);
    if (filterStatus !== "all") params.set('status', filterStatus);

    const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard-consolidated';
    router.replace(newUrl, { scroll: false });
  }, [filterProject, filterType, filterPriority, filterStatus, router]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, projectsRes] = await Promise.all([
        authFetch('/api/action-items'),
        authFetch('/api/projects/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrich: true }),
        }),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data.items || []);
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data?.data?.projects || data?.projects || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast({ message: 'Failed to load dashboard data', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // Quick add handler
  const handleQuickAdd = async () => {
    if (!newTitle.trim() || !newProject || !newPriority) return;

    try {
      const response = await authFetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          project_id: parseInt(newProject),
          priority: newPriority,
          type: 'follow_up',
          status: 'open',
          source: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create action item');
      }

      const data = await response.json();
      setItems(prev => [data.item, ...prev]);
      showToast({ message: 'Action item created successfully!', type: 'success' });

      // Reset form
      setNewTitle("");
      setNewProject("");
      setNewPriority(null);
      setShowQuickAdd(false);
    } catch (error) {
      console.error('Error creating action item:', error);
      showToast({ message: 'Failed to create action item', type: 'error' });
    }
  };

  // Priority change handler
  const changePriority = async (id: number, newP: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    try {
      const response = await authFetch(`/api/action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newP }),
      });

      if (!response.ok) {
        throw new Error('Failed to update priority');
      }

      const data = await response.json();
      setItems(prev => prev.map(i => i.id === id ? data.item : i));
      showToast({ message: 'Priority updated successfully!', type: 'success' });
      setPriorityPickerId(null);
    } catch (error) {
      console.error('Error updating priority:', error);
      showToast({ message: 'Failed to update priority', type: 'error' });
    }
  };

  // Status change handler
  const changeStatus = async (id: number, newStatus: string) => {
    try {
      const response = await authFetch(`/api/action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const data = await response.json();
      setItems(prev => prev.map(i => i.id === id ? data.item : i));
      showToast({ message: 'Status updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating status:', error);
      showToast({ message: 'Failed to update status', type: 'error' });
    }
  };

  // Resolve item handler
  const resolveItem = async (id: number) => {
    try {
      const response = await authFetch(`/api/action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          resolution_note: resolveNote.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve item');
      }

      const data = await response.json();
      setItems(prev => prev.map(i => i.id === id ? data.item : i));
      showToast({ message: 'Action item resolved!', type: 'success' });
      setResolveId(null);
      setResolveNote("");
      setExpandedId(null);
    } catch (error) {
      console.error('Error resolving item:', error);
      showToast({ message: 'Failed to resolve item', type: 'error' });
    }
  };

  // Dismiss stale
  const dismissStale = async (id: number) => {
    try {
      const response = await authFetch(`/api/action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_stale: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss stale item');
      }

      const data = await response.json();
      setItems(prev => prev.map(i => i.id === id ? data.item : i));
      showToast({ message: 'Item dismissed from review', type: 'success' });
    } catch (error) {
      console.error('Error dismissing stale:', error);
      showToast({ message: 'Failed to dismiss item', type: 'error' });
    }
  };

  // Get project health
  const getProjectHealth = (project: Project, items: ActionItem[]) => {
    const projectItems = items.filter(i => i.project_id === project.id && i.status !== "resolved");
    const hasP1 = projectItems.some(i => i.priority === 1);
    const hasP2 = projectItems.some(i => i.priority === 2);
    const hasOverdue = projectItems.some(i => i.follow_up_date && new Date(i.follow_up_date) < new Date());
    const hasOldBlocker = projectItems.some(i => i.type === "blocker" && i.is_stale);

    if (hasP1 || hasOldBlocker) return { signal: "red", color: "#DC2626", bg: "#FEF2F2" };
    if (hasP2 || hasOverdue) return { signal: "yellow", color: "#CA8A04", bg: "#FFFBEB" };
    return { signal: "green", color: "#16A34A", bg: "#F0FDF4" };
  };

  const isOverdue = (followUpDate: string | null | undefined) => {
    if (!followUpDate) return false;
    return new Date(followUpDate) < new Date();
  };

  // Filtered items
  const activeItems = items.filter(i => i.status !== "resolved" && !i.is_stale);
  const staleItems = items.filter(i => i.is_stale && i.status !== "resolved");
  const resolvedCount = items.filter(i => i.status === "resolved").length;

  const filtered = (list: ActionItem[]) => {
    let f = list;
    if (filterProject !== "all") f = f.filter(i => i.project_id === parseInt(filterProject));
    if (filterType !== "all") f = f.filter(i => i.type === filterType);

    // Priority filter
    if (filterPriority === "p1-2") f = f.filter(i => i.priority === 1 || i.priority === 2);
    else if (filterPriority === "p3-5") f = f.filter(i => i.priority >= 3 && i.priority <= 5);
    else if (filterPriority !== "all") f = f.filter(i => i.priority === parseInt(filterPriority));

    // Status filter
    if (filterStatus !== "all") f = f.filter(i => i.status === filterStatus);

    return f;
  };

  // Group by priority
  const grouped = [1, 2, 3, 4, 5].map(p => ({
    priority: p as 1 | 2 | 3 | 4 | 5,
    items: filtered(activeItems).filter(i => i.priority === p),
  })).filter(g => g.items.length > 0);

  // Sorted projects by health
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const ha = getProjectHealth(a, items);
      const hb = getProjectHealth(b, items);
      const order = { red: 0, yellow: 1, green: 2 };
      if (order[ha.signal as keyof typeof order] !== order[hb.signal as keyof typeof order]) {
        return order[ha.signal as keyof typeof order] - order[hb.signal as keyof typeof order];
      }
      const countA = items.filter(i => i.project_id === a.id && i.status !== "resolved").length;
      const countB = items.filter(i => i.project_id === b.id && i.status !== "resolved").length;
      return countB - countA;
    });
  }, [projects, items]);

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consolidated Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Priority-based action items across all projects</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-card border border-border rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</span>

          {/* Project Filter */}
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Priorities</option>
            <option value="p1-2">P1-2 (Crisis Mode)</option>
            <option value="p3-5">P3-5 (Backlog)</option>
            <option value="1">Priority 1</option>
            <option value="2">Priority 2</option>
            <option value="3">Priority 3</option>
            <option value="4">Priority 4</option>
            <option value="5">Priority 5</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {/* Clear Filters Button */}
          {(filterProject !== "all" || filterType !== "all" || filterPriority !== "all" || filterStatus !== "all") && (
            <button
              onClick={() => {
                setFilterProject("all");
                setFilterType("all");
                setFilterPriority("all");
                setFilterStatus("all");
              }}
              className="w-full sm:w-auto text-sm text-destructive hover:text-destructive/80 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Filter Count */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {(() => {
              const filteredActive = filtered(activeItems);
              const filteredStale = filtered(staleItems);
              const totalFiltered = filteredActive.length + filteredStale.length;
              const totalAll = activeItems.length + staleItems.length;
              const hasFilters = filterProject !== "all" || filterType !== "all" || filterPriority !== "all" || filterStatus !== "all";

              return hasFilters
                ? `Showing ${totalFiltered} of ${totalAll} items`
                : `${activeItems.length} open · ${staleItems.length} needs review · ${resolvedCount} resolved`;
            })()}
          </div>
        </div>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Priority List (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Add Button */}
          {!showQuickAdd ? (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="w-full p-4 bg-card border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center gap-2 justify-center"
            >
              <Plus className="w-4 h-4" />
              Add action item
            </button>
          ) : (
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
              <input
                ref={titleRef}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleQuickAdd()}
                placeholder="What needs attention?"
                className="w-full text-sm p-2 border-b border-border bg-transparent outline-none mb-3"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={newProject}
                  onChange={e => setNewProject(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                >
                  <option value="">Project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(p => (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      style={{
                        borderColor: newPriority === p ? PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].color : '#ddd',
                        backgroundColor: newPriority === p ? PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].bg : '#fff',
                        color: newPriority === p ? PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].color : '#999',
                      }}
                      className="w-8 h-8 rounded border-2 text-sm font-bold"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => { setShowQuickAdd(false); setNewTitle(""); setNewProject(""); setNewPriority(null); }}
                    className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickAdd}
                    disabled={!newTitle.trim() || !newProject || !newPriority}
                    className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Priority Groups */}
          {grouped.map(group => (
            <div key={group.priority}>
              <div
                className="flex items-center gap-2 py-2 mb-2"
                style={{ borderBottom: `2px solid ${PRIORITY_CONFIG[group.priority].ring}` }}
              >
                <span
                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: PRIORITY_CONFIG[group.priority].bg,
                    color: PRIORITY_CONFIG[group.priority].color,
                    border: `1px solid ${PRIORITY_CONFIG[group.priority].ring}`,
                  }}
                >
                  {group.priority}
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: PRIORITY_CONFIG[group.priority].color }}
                >
                  {PRIORITY_CONFIG[group.priority].text}
                </span>
                <span className="text-xs text-muted-foreground">({group.items.length})</span>
              </div>

              {group.items.map(item => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-lg mb-2 transition-all hover:shadow-md"
                >
                  {/* Main row */}
                  <div
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="flex items-center p-3 gap-3 cursor-pointer"
                  >
                    {/* Priority badge */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPriorityPickerId(priorityPickerId === item.id ? null : item.id); }}
                        className="w-7 h-7 rounded border-2 text-xs font-bold flex items-center justify-center"
                        style={{
                          borderColor: PRIORITY_CONFIG[item.priority].color,
                          backgroundColor: PRIORITY_CONFIG[item.priority].bg,
                          color: PRIORITY_CONFIG[item.priority].color,
                        }}
                      >
                        {item.priority}
                      </button>
                      {priorityPickerId === item.id && (
                        <div className="absolute top-8 left-0 z-50 bg-card border border-border rounded-lg shadow-xl p-1 flex gap-1">
                          {[1, 2, 3, 4, 5].map(p => (
                            <button
                              key={p}
                              onClick={(e) => { e.stopPropagation(); changePriority(item.id, p); }}
                              className="w-7 h-7 rounded border-2 text-xs font-bold"
                              style={{
                                borderColor: PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].color,
                                backgroundColor: PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].bg,
                                color: PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].color,
                              }}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {item.title}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2">
                      {item.source !== 'manual' && (
                        <span className="text-xs text-muted-foreground">⚡</span>
                      )}
                      {isOverdue(item.follow_up_date) && (
                        <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
                          OVERDUE
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                        {item.project?.name}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === item.id && (
                    <div className="px-3 pb-3 pl-12 text-sm space-y-3">
                      <div className="flex gap-4 flex-wrap text-xs">
                        <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{TYPE_LABELS[item.type]}</span></div>
                        <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{STATUS_LABELS[item.status]}</span></div>
                        {item.waiting_on && (
                          <div><span className="text-muted-foreground">Waiting on:</span> <span className="font-medium">{item.waiting_on}</span></div>
                        )}
                        {item.follow_up_date && (
                          <div>
                            <span className="text-muted-foreground">Follow up:</span>{' '}
                            <span className={`font-medium ${isOverdue(item.follow_up_date) ? 'text-destructive' : ''}`}>
                              {formatDate(item.follow_up_date)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {item.status === 'open' && (
                          <button
                            onClick={() => changeStatus(item.id, 'in_progress')}
                            className="px-3 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 font-medium"
                          >
                            Start
                          </button>
                        )}
                        {item.status !== 'resolved' && resolveId !== item.id && (
                          <button
                            onClick={() => setResolveId(item.id)}
                            className="px-3 py-1 text-xs bg-muted text-foreground border border-border rounded hover:bg-muted/80 font-medium"
                          >
                            Resolve
                          </button>
                        )}
                        {item.status !== 'deferred' && (
                          <button
                            onClick={() => changeStatus(item.id, 'deferred')}
                            className="px-3 py-1 text-xs bg-muted text-muted-foreground border border-border rounded hover:bg-muted/80"
                          >
                            Defer
                          </button>
                        )}
                      </div>

                      {resolveId === item.id && (
                        <div className="flex gap-2">
                          <input
                            value={resolveNote}
                            onChange={e => setResolveNote(e.target.value)}
                            placeholder="Resolution note (optional)"
                            className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-background"
                          />
                          <button
                            onClick={() => resolveItem(item.id)}
                            className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 font-medium"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Stale Items */}
          {filtered(staleItems).length > 0 && (
            <div className="mt-6">
              <div
                className="flex items-center gap-2 py-2 mb-2"
                style={{ borderBottom: '2px solid #FDE68A' }}
              >
                <span className="text-sm">⚠</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-yellow-900">
                  Needs Review — Bumped & Untouched
                </span>
              </div>
              {filtered(staleItems).map(item => (
                <div
                  key={item.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-yellow-900 bg-yellow-100 px-2 py-1 rounded">
                      {item.days_bumped}d
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      <div className="text-xs text-yellow-900 mt-1">
                        Was Priority {item.prev_priority} → moved to {item.priority} · no updates for {item.days_bumped} days
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-900 rounded">
                      {item.project?.name}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => changePriority(item.id, item.prev_priority || 3)}
                        className="px-2 py-1 text-[10px] bg-white border border-yellow-300 text-yellow-900 rounded font-semibold hover:bg-yellow-50"
                      >
                        Restore to P{item.prev_priority}
                      </button>
                      <button
                        onClick={() => dismissStale(item.id)}
                        className="px-2 py-1 text-[10px] bg-white border border-border text-muted-foreground rounded hover:bg-muted"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Project Health (1/3 width) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Project Health · {projects.length} projects
          </div>

          {sortedProjects.map(proj => {
            const health = getProjectHealth(proj, items);
            const openItems = items.filter(i => i.project_id === proj.id && i.status !== "resolved");
            const highestP = openItems.length > 0 ? Math.min(...openItems.map(i => i.priority)) : null;

            return (
              <div
                key={proj.id}
                className="bg-card border border-border rounded-lg p-3 transition-all hover:shadow-md cursor-pointer"
                style={{ borderLeftWidth: '3px', borderLeftColor: health.color }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{proj.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {proj.current_phase}
                      {proj.stats?.completionPercentage !== undefined && ` · ${proj.stats.completionPercentage.toFixed(0)}%`}
                    </div>
                  </div>
                  <div className="text-right">
                    {openItems.length > 0 ? (
                      <div className="text-sm font-semibold" style={{ color: health.color }}>
                        {openItems.length} item{openItems.length > 1 ? 's' : ''}
                        {highestP && highestP <= 2 && (
                          <span
                            className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{
                              backgroundColor: PRIORITY_CONFIG[highestP as keyof typeof PRIORITY_CONFIG].bg,
                              color: PRIORITY_CONFIG[highestP as keyof typeof PRIORITY_CONFIG].color,
                            }}
                          >
                            P{highestP}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No items</div>
                    )}
                  </div>
                </div>
                {proj.stats?.completionPercentage !== undefined && (
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${proj.stats.completionPercentage}%`,
                        backgroundColor: health.color,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Capacity Summary */}
          <div className="bg-card border border-border rounded-lg p-4 mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Capacity Snapshot
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted rounded p-2">
                <div className="text-xl font-bold text-foreground">{projects.length}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Active Projects</div>
              </div>
              <div className="bg-muted rounded p-2">
                <div className="text-xl font-bold text-foreground">
                  {items.filter(i => (i.type === 'emergency' || i.type === 'blocker') && i.status !== 'resolved').length}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Emergencies</div>
              </div>
              <div className="bg-muted rounded p-2">
                <div className="text-xl font-bold text-foreground">
                  {items.filter(i => i.type === 'blocker' && i.status !== 'resolved').length}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Open Blockers</div>
              </div>
              <div className="bg-muted rounded p-2">
                <div className="text-xl font-bold text-foreground">
                  {items.filter(i => i.status === 'waiting').length}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Waiting Items</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click-away for priority picker */}
      {priorityPickerId && (
        <div onClick={() => setPriorityPickerId(null)} className="fixed inset-0 z-40" />
      )}
    </PageContainer>
  );
};

export default ConsolidatedDashboard;
