'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [items, setItems] = useState<ActionItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [priorityPickerId, setPriorityPickerId] = useState<number | null>(null);
  const [resolveId, setResolveId] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Quick add form state
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("");
  const [newPriority, setNewPriority] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showQuickAdd && titleRef.current) titleRef.current.focus();
  }, [showQuickAdd]);

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
      <div className="flex items-center gap-3 mb-6 p-4 bg-card border border-border rounded-lg">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filter</span>
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
        >
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(filterProject !== "all" || filterType !== "all") && (
          <button
            onClick={() => { setFilterProject("all"); setFilterType("all"); }}
            className="text-sm text-destructive hover:text-destructive/80 font-medium"
          >
            Clear filters
          </button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {activeItems.length} open · {staleItems.length} needs review · {resolvedCount} resolved
        </div>
      </div>

      {/* Main split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Priority List (2/3 width) */}
        <div className="lg:col-span-2">
          {/* Continued in next message due to length... */}
        </div>

        {/* RIGHT: Project Health (1/3 width) */}
        <div className="lg:col-span-1">
          {/* Project health sidebar */}
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
