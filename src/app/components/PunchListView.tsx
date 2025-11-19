'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PunchListItem, PunchListSummary, PunchListFilters } from '@/types/punch-list';

interface PunchListViewProps {
  projectId?: number;
}

export default function PunchListView({ projectId }: PunchListViewProps) {
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [summary, setSummary] = useState<PunchListSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PunchListItem | null>(null);
  const [filters, setFilters] = useState<PunchListFilters>({
    project_id: projectId,
    status: undefined,
    severity: undefined,
  });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Fetch items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const params = new URLSearchParams();
      if (filters.project_id) params.append('project_id', filters.project_id.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.overdue) params.append('overdue', 'true');
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/punch-list?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setItems(result.data.items || []);
        calculateSummary(result.data.items || []);
      }
    } catch (error) {
      console.error('Error fetching punch list items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary from items
  const calculateSummary = (items: PunchListItem[]) => {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const summary: PunchListSummary = {
      project_id: filters.project_id || 0,
      total_items: items.length,
      open_items: items.filter(i => i.status === 'open').length,
      in_progress_items: items.filter(i => i.status === 'in_progress').length,
      completed_items: items.filter(i => i.status === 'completed').length,
      verified_items: items.filter(i => i.status === 'verified').length,
      overdue_items: items.filter(i => i.due_date && i.due_date < today && !['verified', 'completed'].includes(i.status)).length,
      critical_items: items.filter(i => i.severity === 'critical').length,
      high_severity_items: items.filter(i => i.severity === 'high').length,
    };

    setSummary(summary);
  };

  useEffect(() => {
    fetchItems();
  }, [filters]);

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'verified': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Punch List</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>+</span>
          <span>Add Item</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500">Open Items</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{summary.open_items}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500">Due This Week</div>
            <div className={`text-3xl font-bold mt-2 ${summary.overdue_items > 5 ? 'text-yellow-600' : 'text-gray-900'}`}>
              {items.filter(i => {
                const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                return i.due_date && i.due_date <= oneWeekFromNow && !['verified', 'completed'].includes(i.status);
              }).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500">Overdue</div>
            <div className={`text-3xl font-bold mt-2 ${summary.overdue_items > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {summary.overdue_items}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500">Completed This Week</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {items.filter(i => {
                if (!i.completed_date) return false;
                const completedDate = new Date(i.completed_date);
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return completedDate >= oneWeekAgo;
              }).length}
            </div>
          </div>
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search items..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={filters.severity || ''}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value as any || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.overdue || false}
              onChange={(e) => setFilters({ ...filters, overdue: e.target.checked || undefined })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Overdue Only</span>
          </label>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 rounded-lg ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Board
            </button>
          </div>
        </div>
      </div>

      {/* Items List */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => {
                  const isOverdue = item.due_date && item.due_date < new Date().toISOString().split('T')[0] && !['verified', 'completed'].includes(item.status);
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedItem(item)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.item_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.location || item.unit_number || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(item.severity)}`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.assigned_contractor_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {item.due_date ? (
                          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                            {new Date(item.due_date).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No punch list items found. Create your first item to get started.
            </div>
          )}
        </div>
      ) : (
        // Kanban Board View
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['open', 'in_progress', 'completed', 'verified'].map((status) => (
            <div key={status} className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 capitalize">
                {status.replace('_', ' ')}
                <span className="ml-2 text-sm text-gray-500">
                  ({items.filter(i => i.status === status).length})
                </span>
              </h3>
              <div className="space-y-3">
                {items.filter(i => i.status === status).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">{item.item_number}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 line-clamp-2 mb-2">{item.description}</p>
                    {item.location && (
                      <p className="text-xs text-gray-500 mb-1">📍 {item.location}</p>
                    )}
                    {item.due_date && (
                      <p className={`text-xs ${item.due_date < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-gray-500'}`}>
                        Due: {new Date(item.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal - Placeholder */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add Punch List Item</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <p className="text-gray-600">Form component will be added here...</p>
          </div>
        </div>
      )}

      {/* Detail Modal - Placeholder */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedItem.item_number}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            <p className="text-gray-900">{selectedItem.description}</p>
            <p className="text-sm text-gray-500 mt-4">Detail component will be added here...</p>
          </div>
        </div>
      )}
    </div>
  );
}

