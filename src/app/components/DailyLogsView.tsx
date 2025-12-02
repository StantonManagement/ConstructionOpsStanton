'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Plus, Edit, Trash2, Eye, AlertCircle, CheckCircle, Clock, RefreshCw, Phone, Mail, MessageSquare } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { EmptyState } from './ui/EmptyState';

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending: { 
      color: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      icon: <Clock className="w-4 h-4" />,
      label: "PENDING"
    },
    sent: { 
      color: "bg-primary/10 text-primary border-primary/20", 
      icon: <MessageSquare className="w-4 h-4" />,
      label: "SENT"
    },
    received: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      icon: <CheckCircle className="w-4 h-4" />,
      label: "RECEIVED"
    },
    failed: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      icon: <AlertCircle className="w-4 h-4" />,
      label: "FAILED"
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const validatePhoneNumber = (phone: string) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Check if it's a valid US phone number (10 or 11 digits)
  return cleaned.length === 10 || cleaned.length === 11;
};

interface DailyLogsViewProps {
  searchQuery?: string;
}

const DailyLogsView: React.FC<DailyLogsViewProps> = ({ searchQuery = '' }) => {
  const searchParams = useSearchParams();
  const { showToast, showConfirm } = useModal();
  const [requests, setRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [pmNotes, setPmNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>(
    searchParams.get('project') || 'all'
  );
  
  // Add request form state
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [pmPhoneNumber, setPmPhoneNumber] = useState('');
  const [requestTime, setRequestTime] = useState('18:00'); // Default to 6 PM EST
  const [phoneError, setPhoneError] = useState('');

  // Fetch daily log requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('daily_log_requests')
        .select(`
          *,
          project:projects(id, name, client_name)
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setRequests(requestsData || []);
    } catch (err) {
      console.error('Error fetching daily log requests:', err);
      setError('Failed to load daily log requests');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .order('name');
      
      if (!error && projectsData) {
        setProjects(projectsData);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchProjects();
  }, [fetchRequests, fetchProjects]);

  // Sync project filter from URL (Header project selector)
  useEffect(() => {
    const urlProjectFilter = searchParams?.get('project') || 'all';
    if (urlProjectFilter !== projectFilter) {
      setProjectFilter(urlProjectFilter);
    }
  }, [searchParams]);

  // Filter requests based on search query and project filter
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Project filter (from Header selector)
    if (projectFilter !== 'all') {
      filtered = filtered.filter(request => request.project?.id === parseInt(projectFilter));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(request =>
        request.project?.name?.toLowerCase().includes(query) ||
        request.project?.client_name?.toLowerCase().includes(query) ||
        request.pm_phone_number?.toLowerCase().includes(query) ||
        request.received_notes?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [requests, projectFilter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests();
    setIsRefreshing(false);
  };

  const handleAddRequest = async () => {
    if (!selectedProject || !pmPhoneNumber.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(pmPhoneNumber)) {
      setPhoneError('Please enter a valid phone number (10 or 11 digits)');
      return;
    }
    setPhoneError('');

    try {
      const { data, error } = await supabase
        .from('daily_log_requests')
        .insert({
          project_id: selectedProject.id,
          request_date: new Date().toISOString().split('T')[0],
          pm_phone_number: pmPhoneNumber.trim(),
          request_status: 'pending',
          request_time: requestTime
        })
        .select()
        .single();

      if (error) throw error;

      setRequests(prev => [data, ...prev]);
      setShowAddModal(false);
      setSelectedProject(null);
      setPmPhoneNumber('');
      setRequestTime('18:00');
      setError(null);
      
      // Show success message
      showToast({ message: `Daily log request added successfully! The system will automatically request notes from the PM daily at ${requestTime} EST.`, type: 'success', duration: 7000 });
    } catch (err) {
      console.error('Error adding request:', err);
      setError('Failed to add daily log request');
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this daily log request?')) return;

    try {
      const { error } = await supabase
        .from('daily_log_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (err) {
      console.error('Error deleting request:', err);
      setError('Failed to delete request');
    }
  };

  const handleViewRequest = async (request: any) => {
    setSelectedRequest(request);
    setShowViewModal(true);
    setLoadingNotes(true);
    
    try {
      // Fetch PM notes from payment applications for this project
      const { data: notes, error } = await supabase
        .from('payment_applications')
        .select('id, pm_notes, created_at, status')
        .eq('project_id', request.project_id)
        .not('pm_notes', 'is', null)
        .order('created_at', { ascending: false });
      
      if (!error && notes) {
        setPmNotes(notes);
      } else {
        console.error('Error fetching PM notes:', error);
        setPmNotes([]);
      }
    } catch (error) {
      console.error('Error fetching PM notes:', error);
      setPmNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedRequest(null);
    setPmNotes([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-muted-foreground">Loading daily log requests...</span>
      </div>
    );
  }

  // Empty state when no daily log requests exist
  if (requests.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Daily Log Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automated daily updates from your PM
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Request
          </button>
        </div>
        <div className="bg-card border border-border rounded-lg">
          <EmptyState
            icon={FileText}
            title="No daily log requests"
            description="Set up automated SMS requests to get daily updates from your PM. You'll receive project status updates at scheduled times."
            actionLabel="Add Request"
            onAction={() => setShowAddModal(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Log Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredRequests.length} requests • Updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            📝 Add Request
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
              {filteredRequests.map((request) => (
          <div 
            key={request.id} 
            className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200"
            onClick={() => handleViewRequest(request)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {request.project?.name} - {request.project?.client_name}
                  </span>
                  {getStatusBadge(request.request_status)}
                    </div>
                
                <div className="text-sm text-muted-foreground mb-2">
                  <div>PM Phone: {request.pm_phone_number}</div>
                  <div>Request Date: {request.request_date}</div>
                  <div>Request Time: {request.request_time || '18:00'} EST</div>
                  {request.retry_count > 0 && (
                    <div>Retry Count: {request.retry_count}</div>
                  )}
                  {request.received_notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded border">
                      <strong>Received Notes:</strong> {request.received_notes}
                        </div>
                      )}
                    </div>
                
                <div className="text-xs text-gray-500">
                  Created: {request.created_at ? formatDate(request.created_at) : 'Unknown'}
                  {request.last_request_sent_at && (
                    <span> • Last Sent: {formatDate(request.last_request_sent_at)}</span>
                  )}
                  {request.received_at && (
                    <span> • Received: {formatDate(request.received_at)}</span>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-primary font-medium">
                  💬 Click to view Daily Logs and replies
                </div>
              </div>
                      <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRequest(request.id);
                }}
                className="text-red-600 hover:text-red-800 p-1"
                        title="Delete request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
          </div>
              ))}

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-500 font-medium">No daily log requests yet</p>
            <p className="text-sm text-gray-400">Add requests to automatically ask PM managers for daily notes</p>
          </div>
        )}
      </div>

      {/* Add Request Modal */}
      {showAddModal && (
        <div className="fixed inset-0  bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-foreground">Add Daily Log Request</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-muted-foreground"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === Number(e.target.value));
                    setSelectedProject(project);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PM Phone Number *</label>
                  <input
                    type="tel"
                  value={pmPhoneNumber}
                  onChange={(e) => {
                    setPmPhoneNumber(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-primary ${
                    phoneError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+1234567890"
                />
                {phoneError && (
                  <p className="text-sm text-red-600 mt-1">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Time (EST) *</label>
                <input
                  type="time"
                  value={requestTime}
                  onChange={(e) => setRequestTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the time when the system should send daily SMS requests (EST timezone)
                </p>
              </div>

              <div className="bg-primary/10 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-primary">
                  <strong>How it works:</strong> The system will automatically send SMS requests to the PM daily at {requestTime} EST, 
                  asking for notes about each active project. It will retry every 30 minutes until notes are received.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRequest}
                disabled={!selectedProject || !pmPhoneNumber.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Request Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Daily Logs - {selectedRequest.project?.name}
                </h3>
              <button
                onClick={handleCloseViewModal}
                className="text-gray-400 hover:text-muted-foreground"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
              <div className="mt-2 text-sm text-muted-foreground">
                <div>Project: {selectedRequest.project?.name} - {selectedRequest.project?.client_name}</div>
                <div>PM Phone: {selectedRequest.pm_phone_number}</div>
                <div>Request Status: {selectedRequest.request_status}</div>
                <div>Request Time: {selectedRequest.request_time || '18:00'} EST</div>
                  </div>
                </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Loading PM notes...</span>
                </div>
              ) : pmNotes.length > 0 ? (
                  <div className="space-y-4">
                  <h4 className="text-md font-semibold text-foreground mb-4">
                    PM Notes from Payment Applications ({pmNotes.length})
                  </h4>
                  {pmNotes.map((note, index) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          Payment App #{note.id}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          note.status === 'approved' ? 'bg-green-100 text-green-800' :
                          note.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          note.status === 'submitted' ? 'bg-blue-100 text-primary' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {note.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        <div>Created: {formatDate(note.created_at)}</div>
                      </div>
                      
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <div className="text-sm text-foreground font-medium mb-1">PM Notes:</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {note.pm_notes}
                    </div>
                  </div>
                </div>
                  ))}
              </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-gray-500 font-medium">No Daily Logs found</p>
                  <p className="text-sm text-gray-400">
                    No Daily Logs have been submitted for this project yet.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {pmNotes.length > 0 ? (
                    <span>Found {pmNotes.length} PM note{pmNotes.length !== 1 ? 's' : ''} from payment applications</span>
                  ) : (
                    <span>No Daily Logs available</span>
                  )}
                </div>
              <button
                onClick={handleCloseViewModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyLogsView;
