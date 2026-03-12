'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { normalizePhoneNumber } from '@/lib/phoneUtils';
import { FileText, Plus, Edit2, Trash2, Eye, AlertCircle, CheckCircle, Clock, RefreshCw, Phone, Mail, MessageSquare, Save, X } from 'lucide-react';
import { useModal } from '@/context/ModalContext';
import { EmptyState } from '@/components/ui/EmptyState';

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

  // Debug: Log showAddModal state changes
  useEffect(() => {
    console.log('[DailyLogs] showAddModal state changed to:', showAddModal);
  }, [showAddModal]);
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
  
  // Edit request state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editRequestTime, setEditRequestTime] = useState('');
  const [editPhoneError, setEditPhoneError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
      console.log('[DailyLogs] Fetching projects...');
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .order('name');

      if (!error && projectsData) {
        console.log('[DailyLogs] Fetched projects:', projectsData.length, projectsData);
        setProjects(projectsData);
      } else {
        console.error('[DailyLogs] Error fetching projects:', error);
      }
    } catch (err) {
      console.error('[DailyLogs] Error fetching projects:', err);
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
    console.log('[DailyLogs] handleAddRequest called with:', {
      selectedProject,
      pmPhoneNumber,
      requestTime
    });

    if (!selectedProject || !pmPhoneNumber.trim()) {
      console.log('[DailyLogs] Validation failed - missing fields');
      setError('Please fill in all required fields');
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(pmPhoneNumber)) {
      console.log('[DailyLogs] Phone number validation failed:', pmPhoneNumber);
      setPhoneError('Please enter a valid phone number (10 or 11 digits)');
      return;
    }
    setPhoneError('');

    console.log('[DailyLogs] Attempting to insert daily log request...');
    try {
      // Normalize phone number to E.164 format for consistent matching
      const normalizedPhone = normalizePhoneNumber(pmPhoneNumber.trim());
      if (!normalizedPhone) {
        setPhoneError('Invalid phone number format');
        return;
      }

      const insertData = {
        project_id: selectedProject.id,
        request_date: new Date().toISOString().split('T')[0],
        pm_phone_number: normalizedPhone,
        request_status: 'pending',
        request_time: requestTime
      };
      console.log('[DailyLogs] Insert data:', insertData);

      const response = await supabase
        .from('daily_log_requests')
        .insert(insertData)
        .select();

      console.log('[DailyLogs] Full response:', response);
      console.log('[DailyLogs] Response data:', response.data);
      console.log('[DailyLogs] Response error:', response.error);
      console.log('[DailyLogs] Response status:', response.status);
      console.log('[DailyLogs] Response statusText:', response.statusText);

      const { data, error } = response;

      if (error) {
        console.error('[DailyLogs] Supabase insert error:', error);

        // Handle duplicate key error
        if (error.code === '23505') {
          setError('A daily log request already exists for this project today. You can only have one request per project per day.');
          return;
        }

        throw error;
      }

      console.log('[DailyLogs] Successfully inserted daily log request:', data);

      // data is an array, get the first item
      const newRequest = data?.[0];
      if (newRequest) {
        setRequests(prev => [newRequest, ...prev]);
      }

      setShowAddModal(false);
      setSelectedProject(null);
      setPmPhoneNumber('');
      setRequestTime('18:00');
      setError(null);
      setPhoneError('');

      // Show success message
      showToast({ message: `Daily log request added successfully! The system will automatically request notes from the PM daily at ${requestTime} EST.`, type: 'success', duration: 7000 });
    } catch (err: any) {
      console.error('[DailyLogs] Error adding request:', err);

      // Show specific error message if available
      if (err?.message) {
        setError(`Failed to add daily log request: ${err.message}`);
      } else {
        setError('Failed to add daily log request');
      }
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

  const handleEditRequest = (request: any) => {
    setEditingRequest(request);
    setEditPhoneNumber(request.pm_phone_number || '');
    setEditRequestTime(request.request_time || '18:00');
    setEditPhoneError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;

    // Validate phone number
    if (!validatePhoneNumber(editPhoneNumber)) {
      setEditPhoneError('Please enter a valid phone number (10 or 11 digits)');
      return;
    }
    setEditPhoneError('');

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(editPhoneNumber.trim());
    if (!normalizedPhone) {
      setEditPhoneError('Invalid phone number format');
      return;
    }

    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from('daily_log_requests')
        .update({
          pm_phone_number: normalizedPhone,
          request_time: editRequestTime
        })
        .eq('id', editingRequest.id);

      if (error) throw error;

      // Update local state
      setRequests(prev => prev.map(req =>
        req.id === editingRequest.id
          ? { ...req, pm_phone_number: normalizedPhone, request_time: editRequestTime }
          : req
      ));

      setShowEditModal(false);
      setEditingRequest(null);
      showToast({ message: 'Daily log request updated successfully!', type: 'success', duration: 3000 });
    } catch (err) {
      console.error('Error updating request:', err);
      setError('Failed to update request');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRequest(null);
    setEditPhoneError('');
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
      <>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Daily Log Requests</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Automated daily updates from your PM
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[DailyLogs] Opening Add Request modal, current state:', showAddModal);
                setShowAddModal(true);
                console.log('[DailyLogs] setShowAddModal(true) called');
              }}
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

        {/* Add Request Modal */}
        {showAddModal && (
          <AddRequestModal
            projects={projects}
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            pmPhoneNumber={pmPhoneNumber}
            setPmPhoneNumber={setPmPhoneNumber}
            requestTime={requestTime}
            setRequestTime={setRequestTime}
            phoneError={phoneError}
            setPhoneError={setPhoneError}
            onSave={handleAddRequest}
            onCancel={() => setShowAddModal(false)}
          />
        )}
      </>
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('[DailyLogs] Opening Add Request modal (main view), current state:', showAddModal);
              setShowAddModal(true);
              console.log('[DailyLogs] setShowAddModal(true) called');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            📝 Add Request
          </button>
          <button
            onClick={async () => {
              try {
                setIsRefreshing(true);
                const response = await fetch('/api/test-daily-log');
                const data = await response.json();

                if (data.success) {
                  showToast({
                    message: `Test SMS sent successfully to ${data.phone} for project: ${data.project}`,
                    type: 'success',
                    duration: 5000
                  });
                  await handleRefresh();
                } else if (data.message) {
                  // Handle info messages (like no pending requests)
                  showToast({
                    message: data.message,
                    type: 'info',
                    duration: 5000
                  });
                } else {
                  showToast({
                    message: `Failed to send test SMS: ${data.error || 'Unknown error'}`,
                    type: 'error',
                    duration: 5000
                  });
                }
              } catch (error) {
                console.error('Error sending test SMS:', error);
                showToast({
                  message: 'Failed to send test SMS',
                  type: 'error',
                  duration: 5000
                });
              } finally {
                setIsRefreshing(false);
              }
            }}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <MessageSquare className="w-4 h-4" />
            {isRefreshing ? 'Sending...' : '📤 Test SMS Now'}
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
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRequest(request);
                  }}
                  className="text-primary hover:text-primary/80 p-1"
                  title="Edit request"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
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
        <AddRequestModal
          projects={projects}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          pmPhoneNumber={pmPhoneNumber}
          setPmPhoneNumber={setPmPhoneNumber}
          requestTime={requestTime}
          setRequestTime={setRequestTime}
          phoneError={phoneError}
          setPhoneError={setPhoneError}
          onSave={handleAddRequest}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* View Request Modal */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
              {selectedRequest.request_status === 'received' && selectedRequest.received_notes ? (
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-foreground mb-4">
                    Daily Log Response
                  </h4>

                  {/* Text Notes */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-muted-foreground mb-2">
                      <div>Received: {selectedRequest.received_at ? formatDate(selectedRequest.received_at) : 'Unknown'}</div>
                    </div>

                    <div className="bg-white rounded p-3 border border-gray-200 mb-4">
                      <div className="text-sm text-foreground font-medium mb-2">PM Notes:</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedRequest.received_notes}
                      </div>
                    </div>

                    {/* Images */}
                    {selectedRequest.received_media_urls && selectedRequest.received_media_urls.length > 0 && (
                      <div>
                        <div className="text-sm text-foreground font-medium mb-2">
                          Photos ({selectedRequest.received_media_urls.length}):
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedRequest.received_media_urls.map((url: string, index: number) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors"
                            >
                              <img
                                src={url}
                                alt={`Daily log photo ${index + 1}`}
                                className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity"
                              />
                              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                Photo {index + 1}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📝</div>
                  <p className="text-gray-500 font-medium">No Response Yet</p>
                  <p className="text-sm text-gray-400">
                    {selectedRequest.request_status === 'pending' ? 'Waiting for PM to respond to the SMS request.' :
                     selectedRequest.request_status === 'sent' ? 'SMS sent. Waiting for PM response.' :
                     'No daily log response has been received yet.'}
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

      {/* Edit Request Modal */}
      {showEditModal && editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-foreground">Edit Daily Log Request</h2>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-muted-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-muted-foreground">Project:</p>
                <p className="font-medium text-foreground">
                  {editingRequest.project?.name} - {editingRequest.project?.client_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PM Phone Number *</label>
                <input
                  type="tel"
                  value={editPhoneNumber}
                  onChange={(e) => {
                    setEditPhoneNumber(e.target.value);
                    if (editPhoneError) setEditPhoneError('');
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-primary ${
                    editPhoneError ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+1234567890"
                  disabled={isSavingEdit}
                />
                {editPhoneError && (
                  <p className="text-sm text-red-600 mt-1">{editPhoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Time (EST) *</label>
                <input
                  type="time"
                  value={editRequestTime}
                  onChange={(e) => setEditRequestTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-primary"
                  disabled={isSavingEdit}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time when the system sends daily SMS requests (EST timezone)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editPhoneNumber.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingEdit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add Request Modal Component
interface AddRequestModalProps {
  projects: any[];
  selectedProject: any;
  setSelectedProject: (project: any) => void;
  pmPhoneNumber: string;
  setPmPhoneNumber: (phone: string) => void;
  requestTime: string;
  setRequestTime: (time: string) => void;
  phoneError: string;
  setPhoneError: (error: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const AddRequestModal: React.FC<AddRequestModalProps> = ({
  projects,
  selectedProject,
  setSelectedProject,
  pmPhoneNumber,
  setPmPhoneNumber,
  requestTime,
  setRequestTime,
  phoneError,
  setPhoneError,
  onSave,
  onCancel
}) => {
  // Auto-fill phone number on mount if empty
  React.useEffect(() => {
    if (!pmPhoneNumber) {
      setPmPhoneNumber('+18603516816');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-foreground mb-6">Add Daily Log Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Project *</label>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === parseInt(e.target.value));
                setSelectedProject(project);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              required
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
            <label className="block text-sm font-medium text-foreground mb-2">PM Phone Number *</label>
            <input
              type="tel"
              value={pmPhoneNumber}
              onChange={(e) => {
                setPmPhoneNumber(e.target.value);
                if (phoneError) setPhoneError('');
              }}
              className={`w-full px-3 py-2 border rounded-lg bg-background text-foreground ${
                phoneError ? 'border-red-500' : 'border-border'
              }`}
              placeholder="+1234567890"
              required
            />
            {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Request Time (EST) *</label>
            <input
              type="time"
              value={requestTime}
              onChange={(e) => setRequestTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Time when the system should send daily SMS requests
            </p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-primary">
              <strong>How it works:</strong> The system will send SMS requests daily at {requestTime} EST
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedProject || !pmPhoneNumber.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DailyLogsView;
