'use client';

import React, { useState, useEffect } from 'react';
import { 
  ListChecks, 
  Plus, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { formatCurrency } from '@/lib/theme';
import { supabase } from '@/lib/supabaseClient';

interface PunchListItem {
  id: number;
  project_id: number;
  contractor_id: number;
  description: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  location_area: string | null;
  status: 'assigned' | 'in_progress' | 'complete' | 'verified';
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  verified_at: string | null;
  contractor_notes: string | null;
  gc_notes: string | null;
  created_at: string;
  contractor?: {
    id: number;
    name: string;
    trade: string;
    phone: string;
  };
  photos?: Array<{
    id: number;
    photo_url: string;
    uploaded_by: string;
    caption: string | null;
  }>;
}

interface PunchListsTabProps {
  projectId: number;
  onCreatePunchList: () => void;
}

export default function PunchListsTab({ projectId, onCreatePunchList }: PunchListsTabProps) {
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PunchListItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Filters
  const [contractorFilter, setContractorFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // Fetch punch list items
  const fetchPunchLists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate projectId
      if (!projectId || projectId === undefined || projectId === null) {
        console.error('[PunchListsTab] Invalid projectId:', projectId);
        setError('Invalid project ID. Please try reloading the page.');
        setLoading(false);
        return;
      }

      // Ensure projectId is a number
      const validProjectId = typeof projectId === 'string' ? parseInt(projectId) : projectId;
      if (isNaN(validProjectId)) {
        console.error('[PunchListsTab] projectId is not a valid number:', projectId);
        setError('Invalid project ID format.');
        setLoading(false);
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      let url = `/api/punch-lists/${validProjectId}`;
      const params = new URLSearchParams();
      if (contractorFilter) params.append('contractorId', contractorFilter.toString());
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      console.log('[PunchListsTab] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch punch lists');
      }

      const result = await response.json();
      setItems(result.data || []);
    } catch (err) {
      console.error('Error fetching punch lists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load punch lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[PunchListsTab] Mounted with projectId:', projectId, 'type:', typeof projectId);
    if (projectId) {
      fetchPunchLists();
    }
  }, [projectId, contractorFilter, statusFilter]);

  // Delete punch list item
  const handleDelete = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this punch list item?')) {
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/punch-lists/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete punch list item');
      }

      // Refresh list
      fetchPunchLists();
    } catch (err) {
      console.error('Error deleting punch list item:', err);
      alert('Failed to delete punch list item');
    }
  };

  // Verify completed item
  const handleVerify = async (itemId: number, userId: number) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/punch-lists/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          status: 'verified',
          verifiedBy: userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify punch list item');
      }

      // Refresh list
      fetchPunchLists();
    } catch (err) {
      console.error('Error verifying punch list item:', err);
      alert('Failed to verify punch list item');
    }
  };

  // Get status stats
  const stats = {
    assigned: items.filter(i => i.status === 'assigned').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    complete: items.filter(i => i.status === 'complete').length,
    verified: items.filter(i => i.status === 'verified').length,
  };

  // Get unique contractors
  const contractors = Array.from(
    new Set(items.map(i => i.contractor?.id).filter(Boolean))
  ).map(id => items.find(i => i.contractor?.id === id)?.contractor);

  // Apply priority filter on frontend
  const filteredItems = priorityFilter 
    ? items.filter(i => i.priority === priorityFilter)
    : items;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'text-blue-700 bg-blue-50';
      case 'in_progress': return 'text-yellow-700 bg-yellow-50';
      case 'complete': return 'text-green-700 bg-green-50';
      case 'verified': return 'text-purple-700 bg-purple-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <AlertCircle className="w-4 h-4" />;
      case 'complete': return <CheckCircle2 className="w-4 h-4" />;
      case 'verified': return <CheckCircle2 className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading punch lists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchPunchLists}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ListChecks className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Punch Lists</h2>
            <p className="text-sm text-gray-600">Manage project closeout items</p>
          </div>
        </div>
        <button
          onClick={onCreatePunchList}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Punch List
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Assigned</p>
              <p className="text-2xl font-bold text-blue-900">{stats.assigned}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">In Progress</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.in_progress}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Complete</p>
              <p className="text-2xl font-bold text-green-900">{stats.complete}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Verified</p>
              <p className="text-2xl font-bold text-purple-900">{stats.verified}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contractor
            </label>
            <select
              value={contractorFilter || ''}
              onChange={(e) => setContractorFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Contractors</option>
              {contractors.map(contractor => contractor && (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="verified">Verified</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priorityFilter || ''}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center shadow-none">
          <ListChecks className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No punch list items</h3>
          <p className="text-muted-foreground mb-6">
            {items.length === 0 
              ? 'Create your first punch list to get started'
              : 'No items match your current filters'
            }
          </p>
          {items.length === 0 && (
            <button
              onClick={onCreatePunchList}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-5 h-5" />
              Create Punch List
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden shadow-none">
          <DataTable
            data={filteredItems}
            columns={[
              {
                header: 'Description',
                accessor: (item) => (
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.description}
                    </p>
                    {item.location_area && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {item.location_area}
                      </p>
                    )}
                  </div>
                )
              },
              {
                header: 'Contractor',
                accessor: (item) => (
                  <div>
                    <p className="text-sm text-foreground">{item.contractor?.name}</p>
                    <p className="text-xs text-muted-foreground">{item.contractor?.trade}</p>
                  </div>
                )
              },
              {
                header: 'Priority',
                accessor: (item) => (
                  <SignalBadge status={
                    item.priority === 'high' ? 'critical' :
                    item.priority === 'medium' ? 'warning' :
                    'neutral'
                  }>
                    {item.priority}
                  </SignalBadge>
                )
              },
              {
                header: 'Status',
                accessor: (item) => (
                  <SignalBadge status={
                    item.status === 'complete' || item.status === 'verified' ? 'success' :
                    item.status === 'in_progress' ? 'warning' :
                    'neutral'
                  }>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(item.status)}
                      {item.status.replace('_', ' ')}
                    </span>
                  </SignalBadge>
                )
              },
              {
                header: 'Due Date',
                accessor: (item) => (
                  <p className="text-sm text-foreground">
                    {item.due_date 
                      ? new Date(item.due_date).toLocaleDateString()
                      : '-'
                    }
                  </p>
                )
              },
              {
                header: 'Photos',
                accessor: (item) => (
                  <p className="text-sm text-foreground">
                    {item.photos?.length || 0}
                  </p>
                )
              },
              {
                header: 'Actions',
                align: 'right',
                accessor: (item) => (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowDetailModal(true);
                      }}
                      className="p-1 text-primary hover:bg-muted/50 rounded"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {item.status === 'complete' && (
                      <button
                        onClick={() => handleVerify(item.id, 1)} // TODO: Get actual user ID
                        className="p-1 text-status-success hover:bg-green-50 rounded"
                        title="Verify complete"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-status-critical hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      )}
    </div>
  );
}

