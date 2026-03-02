'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/authFetch';
import { useModal } from '@/context/ModalContext';
import { Truck, Plus, Edit, Trash2, Wrench } from 'lucide-react';
import PageContainer from './PageContainer';

interface TruckData {
  id: number;
  name: string;
  identifier: string;
  license_plate: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: 'active' | 'maintenance' | 'retired';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const TrucksView: React.FC = () => {
  const { showToast } = useModal();
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckData | null>(null);
  const [deletingTruck, setDeletingTruck] = useState<TruckData | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch trucks
  const fetchTrucks = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? '/api/trucks'
        : `/api/trucks?status=${statusFilter}`;
      const response = await authFetch(url);
      const data = await response.json();

      if (response.ok) {
        setTrucks(data.trucks || []);
      } else {
        showToast({ message: data.error || 'Failed to load trucks', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching trucks:', error);
      showToast({ message: 'Failed to load trucks', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, [statusFilter]);

  // Add truck
  const handleAddTruck = async (formData: Record<string, string | number>) => {
    try {
      const response = await authFetch('/api/trucks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ message: 'Truck added successfully!', type: 'success' });
        setShowAddModal(false);
        await fetchTrucks();
      } else {
        showToast({ message: data.error || 'Failed to add truck', type: 'error' });
      }
    } catch (error) {
      console.error('Error adding truck:', error);
      showToast({ message: 'Failed to add truck', type: 'error' });
    }
  };

  // Edit truck
  const handleEditTruck = async (formData: Record<string, string | number>) => {
    if (!editingTruck) return;

    try {
      const response = await authFetch(`/api/trucks/${editingTruck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ message: 'Truck updated successfully!', type: 'success' });
        setEditingTruck(null);
        await fetchTrucks();
      } else {
        showToast({ message: data.error || 'Failed to update truck', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating truck:', error);
      showToast({ message: 'Failed to update truck', type: 'error' });
    }
  };

  // Delete truck
  const handleDeleteTruck = async () => {
    if (!deletingTruck) return;

    try {
      const response = await authFetch(`/api/trucks/${deletingTruck.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ message: 'Truck deleted successfully!', type: 'success' });
        setDeletingTruck(null);
        await fetchTrucks();
      } else {
        showToast({ message: data.error || 'Failed to delete truck', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting truck:', error);
      showToast({ message: 'Failed to delete truck', type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'maintenance':
        return <Wrench className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
    }
  };

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Trucks</h1>
            <p className="text-muted-foreground mt-1">Manage your company vehicles</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-5 h-5" />
            Add Truck
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex gap-2">
            {['all', 'active', 'maintenance', 'retired'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Trucks Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground mt-4">Loading trucks...</p>
          </div>
        ) : trucks.length === 0 ? (
          <div className="bg-muted rounded-lg p-12 text-center">
            <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No trucks found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === 'all'
                ? 'Add your first truck to get started'
                : `No ${statusFilter} trucks found`}
            </p>
            {statusFilter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Add Truck
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trucks.map((truck) => (
              <div
                key={truck.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(truck.status)}
                    <div>
                      <h3 className="font-semibold text-foreground">{truck.name}</h3>
                      <p className="text-sm text-muted-foreground">{truck.identifier}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full capitalize ${getStatusColor(truck.status)}`}
                  >
                    {truck.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {truck.make && truck.model && (
                    <div className="text-muted-foreground">
                      {truck.year} {truck.make} {truck.model}
                    </div>
                  )}
                  {truck.license_plate && (
                    <div className="text-muted-foreground">Plate: {truck.license_plate}</div>
                  )}
                  {truck.notes && (
                    <div className="text-muted-foreground text-xs italic">{truck.notes}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingTruck(truck)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingTruck(truck)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Truck Modal */}
        {showAddModal && (
          <TruckFormModal
            title="Add New Truck"
            onSave={handleAddTruck}
            onCancel={() => setShowAddModal(false)}
          />
        )}

        {/* Edit Truck Modal */}
        {editingTruck && (
          <TruckFormModal
            title="Edit Truck"
            truck={editingTruck}
            onSave={handleEditTruck}
            onCancel={() => setEditingTruck(null)}
          />
        )}

        {/* Delete Confirmation */}
        {deletingTruck && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-foreground mb-2">Delete Truck?</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete {deletingTruck.identifier}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingTruck(null)}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTruck}
                  className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

// Truck Form Modal Component
interface TruckFormModalProps {
  title: string;
  truck?: TruckData;
  onSave: (data: Record<string, string | number>) => void;
  onCancel: () => void;
}

const TruckFormModal: React.FC<TruckFormModalProps> = ({ title, truck, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: truck?.name || '',
    identifier: truck?.identifier || '',
    license_plate: truck?.license_plate || '',
    vin: truck?.vin || '',
    make: truck?.make || '',
    model: truck?.model || '',
    year: truck?.year?.toString() || '',
    status: truck?.status || 'active',
    notes: truck?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, string | number> = {
      name: formData.name,
      identifier: formData.identifier,
      status: formData.status,
    };

    if (formData.license_plate) data.license_plate = formData.license_plate;
    if (formData.vin) data.vin = formData.vin;
    if (formData.make) data.make = formData.make;
    if (formData.model) data.model = formData.model;
    if (formData.year) data.year = parseInt(formData.year);
    if (formData.notes) data.notes = formData.notes;

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-lg p-6 max-w-2xl w-full my-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Truck Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Main Work Truck"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Identifier *
              </label>
              <input
                type="text"
                required
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Truck #1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                License Plate
              </label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="ABC-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">VIN</label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="1HGBH41JXMN109186"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Ford"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="F-150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="2020"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status *</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'maintenance' | 'retired' })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              rows={3}
              placeholder="Additional notes about this truck..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
            >
              Save Truck
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrucksView;
