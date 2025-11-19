'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  User,
  Building,
  Loader2,
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react';
// import ChangeOrderForm from './ChangeOrderForm'; // TODO: Integrate properly

// Types
interface ChangeOrder {
  id: number;
  co_number: string;
  project_id: number;
  project_name: string;
  contractor_id: number;
  contractor_name: string;
  description: string;
  justification: string | null;
  cost_impact: number;
  schedule_impact_days: number | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  created_by: string;
  creator_email: string;
  approved_by: string | null;
  approver_email: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  photo_count: number;
  approval_count: number;
  rejection_count: number;
}

interface Photo {
  id: number;
  photo_url: string;
  caption: string | null;
  uploaded_at: string;
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'gray', icon: FileText },
  pending: { label: 'Pending', color: 'yellow', icon: Clock },
  approved: { label: 'Approved', color: 'green', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle }
};

const ChangeOrdersView: React.FC = () => {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ChangeOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  // User role
  const [userRole, setUserRole] = useState<string>('staff');

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from('user_role')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          if (roleData) {
            setUserRole(roleData.role.toLowerCase());
          }
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    };

    fetchUserRole();
  }, []);

  // Fetch change orders
  const fetchChangeOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/change-orders', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch change orders');
      }

      const data = await response.json();
      // API returns { change_orders: [...] }
      const ordersArray = data.change_orders || [];
      setChangeOrders(ordersArray);
      setFilteredOrders(ordersArray);
    } catch (err: any) {
      console.error('Error fetching change orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChangeOrders();
  }, [fetchChangeOrders]);

  // Apply filters
  useEffect(() => {
    let filtered = [...changeOrders];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(co => co.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(co =>
        co.co_number.toLowerCase().includes(query) ||
        co.project_name.toLowerCase().includes(query) ||
        co.contractor_name.toLowerCase().includes(query) ||
        co.description.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, changeOrders]);

  // Fetch photos for a change order
  const fetchPhotos = async (changeOrderId: number) => {
    try {
      const { data, error } = await supabase
        .from('change_order_photos')
        .select('*')
        .eq('change_order_id', changeOrderId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error fetching photos:', err);
      setPhotos([]);
    }
  };

  // Approve change order
  const handleApprove = async (order: ChangeOrder) => {
    if (!confirm(`Approve change order ${order.co_number} for $${order.cost_impact.toLocaleString()}?`)) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/change-orders/${order.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve change order');
      }

      alert('Change order approved successfully!');
      fetchChangeOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Reject change order
  const handleReject = async (order: ChangeOrder) => {
    const reason = prompt(`Enter rejection reason for ${order.co_number}:`);
    if (!reason) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/change-orders/${order.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject change order');
      }

      alert('Change order rejected.');
      fetchChangeOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Delete change order
  const handleDelete = async (order: ChangeOrder) => {
    if (!confirm(`Delete change order ${order.co_number}? This cannot be undone.`)) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/change-orders/${order.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete change order');
      }

      alert('Change order deleted.');
      fetchChangeOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // View details
  const handleViewDetails = (order: ChangeOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  // View photos
  const handleViewPhotos = async (order: ChangeOrder) => {
    setSelectedOrder(order);
    await fetchPhotos(order.id);
    setShowPhotoModal(true);
  };

  // Summary stats
  const stats = {
    total: changeOrders.length,
    pending: changeOrders.filter(co => co.status === 'pending').length,
    approved: changeOrders.filter(co => co.status === 'approved').length,
    rejected: changeOrders.filter(co => co.status === 'rejected').length,
    totalCost: changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + co.cost_impact, 0),
    pendingCost: changeOrders
      .filter(co => co.status === 'pending')
      .reduce((sum, co) => sum + co.cost_impact, 0)
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button onClick={fetchChangeOrders} className="text-red-600 underline mt-2">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Change Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage scope changes and budget adjustments
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchChangeOrders}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Change Order
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-700">Approved</p>
          <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-700">Rejected</p>
          <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">Approved $</p>
          <p className="text-xl font-bold text-blue-900">${(stats.totalCost / 1000).toFixed(0)}k</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-700">Pending $</p>
          <p className="text-xl font-bold text-orange-900">${(stats.pendingCost / 1000).toFixed(0)}k</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search CO #, project, contractor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Change Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contractor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost Impact</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Photos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No change orders found</p>
                    {(searchQuery || statusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="text-blue-600 underline mt-2"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const StatusIcon = STATUS_CONFIG[order.status].icon;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.co_number}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.project_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.contractor_name}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {order.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${order.cost_impact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {order.cost_impact >= 0 ? '+' : ''}${order.cost_impact.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-${STATUS_CONFIG[order.status].color}-100 text-${STATUS_CONFIG[order.status].color}-800`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_CONFIG[order.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {order.photo_count > 0 ? (
                          <button
                            onClick={() => handleViewPhotos(order)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-xs">{order.photo_count}</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">No photos</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.status === 'pending' && (userRole === 'admin' || userRole === 'pm') && (
                            <>
                              <button
                                onClick={() => handleApprove(order)}
                                className="text-green-600 hover:text-green-800"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(order)}
                                className="text-red-600 hover:text-red-800"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(order.status === 'draft' || userRole === 'admin') && (
                            <button
                              onClick={() => handleDelete(order)}
                              className="text-gray-600 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal - TODO: Implement inline form or integrate with existing ChangeOrderForm */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Create Change Order</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">Change order creation form coming soon!</p>
                <p className="text-sm">You can create change orders from the project budget view or use the API directly.</p>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedOrder.co_number}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Created {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-${STATUS_CONFIG[selectedOrder.status].color}-100 text-${STATUS_CONFIG[selectedOrder.status].color}-800`}
                  >
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </span>
                </div>

                {/* Project & Contractor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Project</p>
                    <p className="text-base font-medium">{selectedOrder.project_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Contractor</p>
                    <p className="text-base font-medium">{selectedOrder.contractor_name}</p>
                  </div>
                </div>

                {/* Cost & Schedule Impact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Cost Impact</p>
                    <p className={`text-xl font-bold ${selectedOrder.cost_impact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedOrder.cost_impact >= 0 ? '+' : ''}${selectedOrder.cost_impact.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Schedule Impact</p>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedOrder.schedule_impact_days ? `${selectedOrder.schedule_impact_days} days` : 'None'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedOrder.description}</p>
                </div>

                {/* Justification */}
                {selectedOrder.justification && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Justification</p>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedOrder.justification}</p>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedOrder.status === 'rejected' && selectedOrder.rejected_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-800">{selectedOrder.rejected_reason}</p>
                  </div>
                )}

                {/* Approval Info */}
                {selectedOrder.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-900 mb-1">Approved</p>
                    <p className="text-sm text-green-800">
                      By {selectedOrder.approver_email} on{' '}
                      {selectedOrder.approved_at ? new Date(selectedOrder.approved_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                )}

                {/* Photos */}
                {selectedOrder.photo_count > 0 && (
                  <div>
                    <button
                      onClick={() => handleViewPhotos(selectedOrder)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <ImageIcon className="w-5 h-5" />
                      View {selectedOrder.photo_count} Photo{selectedOrder.photo_count !== 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedOrder.status === 'pending' && (userRole === 'admin' || userRole === 'pm') && (
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <button
                    onClick={() => {
                      handleApprove(selectedOrder);
                      setShowDetailModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedOrder);
                      setShowDetailModal(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {showPhotoModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Photos - {selectedOrder.co_number}</h2>
                  <p className="text-sm text-gray-500">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {photos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No photos available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="border rounded-lg overflow-hidden">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || 'Change order photo'}
                        className="w-full h-64 object-cover"
                      />
                      {photo.caption && (
                        <div className="p-3 bg-gray-50">
                          <p className="text-sm text-gray-700">{photo.caption}</p>
                        </div>
                      )}
                      <div className="p-2 bg-gray-100 text-xs text-gray-500">
                        {new Date(photo.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeOrdersView;

