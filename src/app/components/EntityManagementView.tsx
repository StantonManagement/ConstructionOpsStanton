'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  AlertCircle, 
  Loader2, 
  X,
  CheckCircle,
  DollarSign,
  Home
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { formatCurrency, SystemStatus } from '@/lib/theme';

// Types
interface OwnerEntity {
  id: number;
  name: string;
  entity_type: string;
  tax_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  accounting_ref: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stats?: {
    property_count: number;
    total_budget: number;
    total_spent: number;
    total_remaining: number;
  };
}

interface NewEntityData {
  name: string;
  entity_type: string;
  tax_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  accounting_ref?: string;
  notes?: string;
}

interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// Entity type options
const ENTITY_TYPES = [
  { value: 'LLC', label: 'Limited Liability Company (LLC)' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Other', label: 'Other' }
];

// Alert Component
const Alert: React.FC<{ alert: AlertState; onClose: () => void }> = ({ alert, onClose }) => {
  const alertStyles = {
    success: {
      bg: 'bg-[var(--status-success-bg)]',
      text: 'text-[var(--status-success-text)]',
      border: 'border-[var(--status-success-border)]',
      icon: 'text-[var(--status-success-icon)]'
    },
    error: {
      bg: 'bg-[var(--status-critical-bg)]',
      text: 'text-[var(--status-critical-text)]',
      border: 'border-[var(--status-critical-border)]',
      icon: 'text-[var(--status-critical-icon)]'
    },
    warning: {
      bg: 'bg-[var(--status-warning-bg)]',
      text: 'text-[var(--status-warning-text)]',
      border: 'border-[var(--status-warning-border)]',
      icon: 'text-[var(--status-warning-icon)]'
    },
    info: {
      bg: 'bg-[var(--status-neutral-bg)]',
      text: 'text-[var(--status-neutral-text)]',
      border: 'border-[var(--status-neutral-border)]',
      icon: 'text-[var(--status-neutral-icon)]'
    }
  }[alert.type];

  const Icon = alert.type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`${alertStyles.bg} border ${alertStyles.border} ${alertStyles.text} px-4 py-3 rounded-lg mb-4 flex items-start justify-between`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-5 h-5 mt-0.5 ${alertStyles.icon}`} />
        <p className="text-sm">{alert.message}</p>
      </div>
      <button onClick={onClose} className={`${alertStyles.text} hover:opacity-70`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const EditEntityModal: React.FC<{
  entity: OwnerEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: OwnerEntity) => Promise<void>;
  isSubmitting: boolean;
}> = ({ entity, isOpen, onClose, onSubmit, isSubmitting }) => {
  if (!entity) return null;

  return (
    <EditEntityModalInner
      key={entity.id}
      entity={entity}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
};

// Add Entity Modal
const AddEntityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewEntityData) => Promise<void>;
  isSubmitting: boolean;
}> = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<NewEntityData>({
    name: '',
    entity_type: 'LLC',
    tax_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    accounting_ref: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Entity name is required';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
    // Reset form
    setFormData({
      name: '',
      entity_type: 'LLC',
      tax_id: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      accounting_ref: '',
      notes: ''
    });
    setErrors({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Entity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Entity Name */}
            <div className="col-span-2">
              <Label htmlFor="name">Entity Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., SREP SOUTHEND"
                className={errors.name ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Entity Type */}
            <div className="col-span-2">
              <Label htmlFor="entity_type">Entity Type *</Label>
              <Select 
                value={formData.entity_type} 
                onValueChange={(value) => setFormData({ ...formData, entity_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax ID */}
            <div className="col-span-2">
              <Label htmlFor="tax_id">Tax ID / EIN</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="XX-XXXXXXX"
                disabled={isSubmitting}
              />
            </div>

            {/* Contact Name */}
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Contact person"
                disabled={isSubmitting}
              />
            </div>

            {/* Contact Phone */}
            <div>
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="(123) 456-7890"
                disabled={isSubmitting}
              />
            </div>

            {/* Contact Email */}
            <div className="col-span-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@example.com"
                className={errors.contact_email ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {errors.contact_email && <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>}
            </div>

            {/* Accounting Reference */}
            <div className="col-span-2">
              <Label htmlFor="accounting_ref">Accounting Reference</Label>
              <Input
                id="accounting_ref"
                value={formData.accounting_ref}
                onChange={(e) => setFormData({ ...formData, accounting_ref: e.target.value })}
                placeholder="QuickBooks ID, etc."
                disabled={isSubmitting}
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Entity
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Entity Modal (similar to Add but with initial data)
const EditEntityModalInner: React.FC<{
  entity: OwnerEntity;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: OwnerEntity) => Promise<void>;
  isSubmitting: boolean;
}> = ({ entity, isOpen, onClose, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<Partial<OwnerEntity>>(entity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entity) return;
    await onSubmit({ ...entity, ...formData } as OwnerEntity);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Entity Name */}
            <div className="col-span-2">
              <Label htmlFor="edit_name">Entity Name *</Label>
              <Input
                id="edit_name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {/* Entity Type */}
            <div className="col-span-2">
              <Label htmlFor="edit_entity_type">Entity Type *</Label>
              <Select 
                value={formData.entity_type || 'LLC'} 
                onValueChange={(value) => setFormData({ ...formData, entity_type: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tax ID */}
            <div className="col-span-2">
              <Label htmlFor="edit_tax_id">Tax ID / EIN</Label>
              <Input
                id="edit_tax_id"
                value={formData.tax_id || ''}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {/* Contact fields (similar to Add modal) */}
            <div>
              <Label htmlFor="edit_contact_name">Contact Name</Label>
              <Input
                id="edit_contact_name"
                value={formData.contact_name || ''}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="edit_contact_phone">Contact Phone</Label>
              <Input
                id="edit_contact_phone"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit_contact_email">Contact Email</Label>
              <Input
                id="edit_contact_email"
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit_accounting_ref">Accounting Reference</Label>
              <Input
                id="edit_accounting_ref"
                value={formData.accounting_ref || ''}
                onChange={(e) => setFormData({ ...formData, accounting_ref: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit_notes">Notes</Label>
              <textarea
                id="edit_notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Entity'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Delete Confirmation Modal
const DeleteEntityModal: React.FC<{
  entity: OwnerEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}> = ({ entity, isOpen, onClose, onConfirm, isSubmitting }) => {
  if (!entity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Entity</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{entity.name}</strong>?
            {entity.stats && entity.stats.property_count > 0 && (
              <p className="text-red-600 mt-2">
                This entity has {entity.stats.property_count} associated properties and cannot be deleted.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={onConfirm} 
            disabled={isSubmitting || (entity.stats && entity.stats.property_count > 0)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const EntityManagementView: React.FC = () => {
  const [entities, setEntities] = useState<OwnerEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<OwnerEntity | null>(null);
  const [deletingEntity, setDeletingEntity] = useState<OwnerEntity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch entities
  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/entities?include_stats=true', {
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch entities');
      }

      const data = await response.json();
      setEntities(data.entities || []);
    } catch (err: any) {
      console.error('Error fetching entities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Filtered entities
  const filteredEntities = useMemo(() => {
    if (!searchTerm) return entities;
    return entities.filter(entity => 
      entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entities, searchTerm]);

  const showAlert = useCallback((type: AlertState['type'], message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Add entity
  const handleAddEntity = async (entityData: NewEntityData) => {
    try {
      setIsSubmitting(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify(entityData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create entity');
      }

      showAlert('success', 'Entity created successfully');
      setIsAddModalOpen(false);
      fetchEntities();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update entity
  const handleUpdateEntity = async (entity: OwnerEntity) => {
    try {
      setIsSubmitting(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/entities/${entity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify(entity)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update entity');
      }

      showAlert('success', 'Entity updated successfully');
      setIsEditModalOpen(false);
      setEditingEntity(null);
      fetchEntities();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete entity
  const handleDeleteEntity = async () => {
    if (!deletingEntity) return;

    try {
      setIsSubmitting(true);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/entities/${deletingEntity.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete entity');
      }

      showAlert('success', 'Entity deleted successfully');
      setIsDeleteModalOpen(false);
      setDeletingEntity(null);
      fetchEntities();
    } catch (err: any) {
      showAlert('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Entity Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage LLC/entity records and property ownership
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          disabled={isAddModalOpen}
          className="mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entity
        </Button>
      </div>

      {/* Modals */}
      <AddEntityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddEntity}
        isSubmitting={isSubmitting}
      />

      <EditEntityModal
        entity={editingEntity}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntity(null);
        }}
        onSubmit={handleUpdateEntity}
        isSubmitting={isSubmitting}
      />

      <DeleteEntityModal
        entity={deletingEntity}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingEntity(null);
        }}
        onConfirm={handleDeleteEntity}
        isSubmitting={isSubmitting}
      />

      {/* Alerts */}
      {alert && <Alert alert={alert} onClose={() => setAlert(null)} />}
      {error && <Alert alert={{ type: 'error', message: error }} onClose={() => setError(null)} />}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search entities by name, type, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Entity Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-border">
        <DataTable
          data={filteredEntities}
          columns={[
            {
              header: 'Entity Name',
              accessor: (entity) => (
                <div className="flex items-center">
                  <Building2 className="w-5 h-5 text-muted-foreground mr-2" />
                  <div className="text-sm font-medium text-foreground">{entity.name}</div>
                </div>
              )
            },
            {
              header: 'Type',
              accessor: 'entity_type'
            },
            {
              header: 'Contact',
              accessor: (entity) => entity.contact_name || '-'
            },
            {
              header: 'Properties',
              accessor: (entity) => (
                <div className="flex items-center">
                  <Home className="w-4 h-4 mr-1 text-muted-foreground" />
                  {entity.stats?.property_count || 0}
                </div>
              )
            },
            {
              header: 'Budget Summary',
              accessor: (entity) => entity.stats ? (
                <div>
                  <div className="flex items-center text-status-success">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {formatCurrency(entity.stats.total_budget)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Spent: {formatCurrency(entity.stats.total_spent)}
                  </div>
                </div>
              ) : '-'
            },
            {
              header: 'Status',
              accessor: (entity) => (
                <SignalBadge status={entity.is_active ? 'success' : 'neutral'}>
                  {entity.is_active ? 'Active' : 'Inactive'}
                </SignalBadge>
              )
            },
            {
              header: 'Actions',
              align: 'right',
              accessor: (entity) => (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingEntity(entity);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletingEntity(entity);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-status-critical" />
                  </Button>
                </div>
              )
            }
          ]}
          emptyMessage="No entities found"
        />
      </div>

      {/* Entity count */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredEntities.length} of {entities.length} entities
      </div>
    </div>
  );
};

export default EntityManagementView;

