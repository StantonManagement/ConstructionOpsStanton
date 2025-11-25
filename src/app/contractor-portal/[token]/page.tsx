'use client';

import React, { useState, useEffect } from 'react';
import { 
  ListChecks, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Image as ImageIcon,
  Upload,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useParams } from 'next/navigation';

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
  project?: {
    id: number;
    name: string;
    client_name: string;
  };
  photos?: Array<{
    id: number;
    photo_url: string;
    uploaded_by: string;
    caption: string | null;
    created_at: string;
  }>;
}

interface ContractorInfo {
  id: number;
  name: string;
  trade: string;
}

export default function ContractorPortalPage() {
  const params = useParams();
  const token = params?.token as string;
  
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [contractor, setContractor] = useState<ContractorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  
  // Filters
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid access link');
      setLoading(false);
      return;
    }
    fetchPunchLists();
  }, [token, projectFilter, statusFilter]);

  const fetchPunchLists = async () => {
    try {
      setLoading(true);
      setError(null);

      // Decode token to get contractor ID
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const contractorId = decoded.contractorId;

      let url = `/api/punch-lists/contractor/${contractorId}?token=${token}`;
      if (projectFilter) url += `&projectId=${projectFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Access link has expired or is invalid');
        }
        throw new Error('Failed to load punch lists');
      }

      const result = await response.json();
      setItems(result.data.items || []);
      setContractor(result.data.contractor);
    } catch (err) {
      console.error('Error fetching punch lists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load punch lists');
    } finally {
      setLoading(false);
    }
  };

  const updateItemStatus = async (itemId: number, status: 'in_progress' | 'complete', notes?: string) => {
    try {
      // Decode token to get contractor ID
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const contractorId = decoded.contractorId;

      const response = await fetch(`/api/punch-lists/contractor/${contractorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          status,
          contractorNotes: notes || undefined,
          token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      // Refresh list
      fetchPunchLists();
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item. Please try again.');
    }
  };

  const handlePhotoUpload = async (itemId: number, file: File) => {
    try {
      setUploading(itemId);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploadedBy', 'contractor');
      formData.append('caption', '');

      const response = await fetch(`/api/punch-lists/items/${itemId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      // Refresh list to show new photo
      fetchPunchLists();
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploading(null);
    }
  };

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
      case 'complete':
      case 'verified': return <CheckCircle2 className="w-4 h-4" />;
      default: return null;
    }
  };

  // Get unique projects
  const projects = Array.from(
    new Set(items.map(i => i.project?.id).filter(Boolean))
  ).map(id => items.find(i => i.project?.id === id)?.project);

  // Get stats
  const stats = {
    assigned: items.filter(i => i.status === 'assigned').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    complete: items.filter(i => i.status === 'complete').length,
    verified: items.filter(i => i.status === 'verified').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading punch lists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact your project manager for a new access link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ListChecks className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Punch Lists</h1>
                {contractor && (
                  <p className="text-sm text-gray-600">{contractor.name} - {contractor.trade}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Assigned</p>
                <p className="text-2xl font-bold text-blue-900">{stats.assigned}</p>
              </div>
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">In Progress</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.in_progress}</p>
              </div>
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Complete</p>
                <p className="text-2xl font-bold text-green-900">{stats.complete}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Verified</p>
                <p className="text-2xl font-bold text-purple-900">{stats.verified}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Project
              </label>
              <select
                value={projectFilter || ''}
                onChange={(e) => setProjectFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map(project => project && (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="verified">Verified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <ListChecks className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No punch list items</h3>
            <p className="text-gray-600">
              No items found matching your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {item.description}
                      </h3>
                      {item.project && (
                        <p className="text-sm text-gray-600">{item.project.name}</p>
                      )}
                      {item.location_area && (
                        <p className="text-sm text-gray-500 mt-1">📍 {item.location_area}</p>
                      )}
                      {item.due_date && (
                        <p className="text-sm text-gray-500 mt-1">
                          Due: {new Date(item.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {expandedItem === item.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  {item.status !== 'verified' && (
                    <div className="flex flex-wrap gap-2">
                      {item.status === 'assigned' && (
                        <button
                          onClick={() => updateItemStatus(item.id, 'in_progress')}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                        >
                          Start Working
                        </button>
                      )}
                      {(item.status === 'in_progress' || item.status === 'assigned') && (
                        <button
                          onClick={() => {
                            const notes = prompt('Add completion notes (optional):');
                            updateItemStatus(item.id, 'complete', notes || undefined);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Mark Complete
                        </button>
                      )}
                      <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer inline-flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        {uploading === item.id ? 'Uploading...' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading === item.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(item.id, file);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedItem === item.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                    {/* Notes */}
                    {item.gc_notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">GC Notes:</h4>
                        <p className="text-sm text-gray-900 bg-white rounded p-3">{item.gc_notes}</p>
                      </div>
                    )}
                    {item.contractor_notes && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Your Notes:</h4>
                        <p className="text-sm text-gray-900 bg-white rounded p-3">{item.contractor_notes}</p>
                      </div>
                    )}

                    {/* Photos */}
                    {item.photos && item.photos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Photos ({item.photos.length})
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {item.photos.map((photo) => (
                            <div key={photo.id} className="relative group">
                              <img
                                src={photo.photo_url}
                                alt={photo.caption || 'Punch list photo'}
                                className="w-full h-32 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-lg">
                                {photo.uploaded_by === 'contractor' ? 'You' : 'GC'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Timeline:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                          <span>Assigned: {new Date(item.assigned_at).toLocaleString()}</span>
                        </div>
                        {item.started_at && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <div className="w-2 h-2 rounded-full bg-yellow-600"></div>
                            <span>Started: {new Date(item.started_at).toLocaleString()}</span>
                          </div>
                        )}
                        {item.completed_at && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <div className="w-2 h-2 rounded-full bg-green-600"></div>
                            <span>Completed: {new Date(item.completed_at).toLocaleString()}</span>
                          </div>
                        )}
                        {item.verified_at && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                            <span>Verified: {new Date(item.verified_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

