'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/authFetch';
import { useModal } from '@/context/ModalContext';
import { Package, Plus, Edit, Trash2, Search, AlertTriangle } from 'lucide-react';
import PageContainer from './PageContainer';

interface InventoryItem {
  id: number;
  name: string;
  description: string | null;
  category: string;
  sku: string | null;
  is_consumable: boolean;
  unit: string | null;
  reorder_threshold: number | null;
  cost_per_unit: number | null;
  notes: string | null;
  photo_url: string | null;
  total_quantity?: number;
  locations?: unknown[];
  created_at: string;
  updated_at: string;
}

const InventoryView: React.FC = () => {
  const { showToast } = useModal();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockCount, setLowStockCount] = useState(0);

  // Fetch items
  const fetchItems = async () => {
    try {
      setLoading(true);
      let url = '/api/inventory/items';
      const params = new URLSearchParams();

      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await authFetch(url);
      const data = await response.json();

      if (response.ok) {
        setItems(data.items || []);
      } else {
        showToast({ message: data.error || 'Failed to load inventory', type: 'error' });
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      showToast({ message: 'Failed to load inventory', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch low stock count
  const fetchLowStockCount = async () => {
    try {
      const response = await authFetch('/api/inventory/low-stock');
      const data = await response.json();
      if (response.ok) {
        setLowStockCount(data.total_low_stock_items || 0);
      }
    } catch (error) {
      console.error('Error fetching low stock:', error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchLowStockCount();
  }, [categoryFilter, searchQuery]);

  // Add item
  const handleAddItem = async (formData: Record<string, unknown>) => {
    try {
      const response = await authFetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ message: 'Item added successfully!', type: 'success' });
        setShowAddModal(false);
        await fetchItems();
        await fetchLowStockCount();
      } else {
        showToast({ message: data.error || 'Failed to add item', type: 'error' });
      }
    } catch (error) {
      console.error('Error adding item:', error);
      showToast({ message: 'Failed to add item', type: 'error' });
    }
  };

  // Edit item
  const handleEditItem = async (formData: Record<string, unknown>) => {
    if (!editingItem) return;

    try {
      const response = await authFetch(`/api/inventory/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ message: 'Item updated successfully!', type: 'success' });
        setEditingItem(null);
        await fetchItems();
        await fetchLowStockCount();
      } else {
        showToast({ message: data.error || 'Failed to update item', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      showToast({ message: 'Failed to update item', type: 'error' });
    }
  };

  // Delete item
  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    try {
      const response = await authFetch(`/api/inventory/items/${deletingItem.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ message: 'Item deleted successfully!', type: 'success' });
        setDeletingItem(null);
        await fetchItems();
        await fetchLowStockCount();
      } else {
        showToast({ message: data.error || 'Failed to delete item', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast({ message: 'Failed to delete item', type: 'error' });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      power_tool: 'bg-blue-100 text-blue-800',
      hand_tool: 'bg-green-100 text-green-800',
      safety_equipment: 'bg-yellow-100 text-yellow-800',
      material: 'bg-purple-100 text-purple-800',
      consumable: 'bg-orange-100 text-orange-800',
      equipment: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const categories = [
    'all',
    'power_tool',
    'hand_tool',
    'safety_equipment',
    'material',
    'consumable',
    'equipment',
    'other',
  ];

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage tools, equipment, and materials</p>
          </div>
          <div className="flex gap-3">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">{lowStockCount} low stock items</span>
              </div>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, or description..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-lg capitalize whitespace-nowrap ${
                  categoryFilter === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {formatCategory(category)}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground mt-4">Loading inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-muted rounded-lg p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first inventory item to get started'}
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Add Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const isLowStock =
                item.reorder_threshold !== null &&
                (item.total_quantity || 0) <= item.reorder_threshold;

              return (
                <div
                  key={item.id}
                  className={`bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow ${
                    isLowStock ? 'border-yellow-500' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{item.name}</h3>
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(item.category)}`}
                    >
                      {formatCategory(item.category)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className={`font-medium ${isLowStock ? 'text-yellow-600' : ''}`}>
                        {item.total_quantity || 0}
                        {item.unit && ` ${item.unit}`}
                      </span>
                    </div>

                    {item.is_consumable && (
                      <div className="text-xs text-muted-foreground italic">Consumable item</div>
                    )}

                    {item.reorder_threshold !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Reorder at:</span>
                        <span>{item.reorder_threshold}</span>
                      </div>
                    )}

                    {isLowStock && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        <AlertTriangle className="w-3 h-3" />
                        Low stock
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Item Modal */}
        {showAddModal && (
          <InventoryFormModal
            title="Add New Item"
            onSave={handleAddItem}
            onCancel={() => setShowAddModal(false)}
          />
        )}

        {/* Edit Item Modal */}
        {editingItem && (
          <InventoryFormModal
            title="Edit Item"
            item={editingItem}
            onSave={handleEditItem}
            onCancel={() => setEditingItem(null)}
          />
        )}

        {/* Delete Confirmation */}
        {deletingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-foreground mb-2">Delete Item?</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete {deletingItem.name}?
                {(deletingItem.total_quantity || 0) > 0 && (
                  <span className="block mt-2 text-yellow-600">
                    Warning: This item has {deletingItem.total_quantity} unit(s) in inventory.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteItem}
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

// Inventory Form Modal Component
interface InventoryFormModalProps {
  title: string;
  item?: InventoryItem;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  title,
  item,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category: item?.category || 'hand_tool',
    sku: item?.sku || '',
    is_consumable: item?.is_consumable || false,
    unit: item?.unit || '',
    reorder_threshold: item?.reorder_threshold?.toString() || '',
    cost_per_unit: item?.cost_per_unit?.toString() || '',
    notes: item?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name: formData.name,
      category: formData.category,
      is_consumable: formData.is_consumable,
    };

    if (formData.description) data.description = formData.description;
    if (formData.sku) data.sku = formData.sku;
    if (formData.unit) data.unit = formData.unit;
    if (formData.notes) data.notes = formData.notes;
    if (formData.reorder_threshold) data.reorder_threshold = parseInt(formData.reorder_threshold);
    if (formData.cost_per_unit) data.cost_per_unit = parseFloat(formData.cost_per_unit);

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-lg p-6 max-w-2xl w-full my-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Circular Saw"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="DW-CS-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="power_tool">Power Tool</option>
                <option value="hand_tool">Hand Tool</option>
                <option value="safety_equipment">Safety Equipment</option>
                <option value="material">Material</option>
                <option value="consumable">Consumable</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="each, box, roll, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reorder Threshold
              </label>
              <input
                type="number"
                value={formData.reorder_threshold}
                onChange={(e) => setFormData({ ...formData, reorder_threshold: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Alert when below this qty"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cost Per Unit
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              rows={2}
              placeholder="Brief description of the item..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_consumable}
                onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-foreground">Consumable Item</span>
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Items that are used up and need regular restocking
            </p>
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
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryView;
