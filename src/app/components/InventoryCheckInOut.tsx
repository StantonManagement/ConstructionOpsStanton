'use client';

import React, { useState, useEffect } from 'react';
import { authFetch } from '@/lib/authFetch';
import { useModal } from '@/context/ModalContext';
import { ArrowRight, ArrowLeft, Package, Truck as TruckIcon, Building2, Warehouse } from 'lucide-react';
import PageContainer from './PageContainer';

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  unit: string | null;
  total_quantity: number;
  locations: Location[];
}

interface Location {
  id: number;
  quantity: number;
  location_type: string;
  truck_id: number | null;
  project_id: number | null;
  location_name: string | null;
  truck?: { id: number; name: string; identifier: string };
  project?: { id: number; name: string };
}

interface Truck {
  id: number;
  name: string;
  identifier: string;
  status: string;
}

interface Project {
  id: number;
  name: string;
}

const InventoryCheckInOut: React.FC = () => {
  const { showToast } = useModal();
  const [transactionType, setTransactionType] = useState<'check_out' | 'transfer' | 'check_in'>('transfer');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [fromLocation, setFromLocation] = useState<{
    type: string;
    truck_id?: number;
    project_id?: number;
    location_name?: string;
  } | null>(null);
  const [toLocation, setToLocation] = useState<{
    type: string;
    truck_id?: number;
    project_id?: number;
    location_name?: string;
  } | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data
  useEffect(() => {
    fetchItems();
    fetchTrucks();
    fetchProjects();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await authFetch('/api/inventory/items');
      const data = await response.json();
      if (response.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchTrucks = async () => {
    try {
      const response = await authFetch('/api/trucks?status=active');
      const data = await response.json();
      if (response.ok) {
        setTrucks(data.trucks || []);
      }
    } catch (error) {
      console.error('Error fetching trucks:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await authFetch('/api/projects');
      const data = await response.json();
      if (response.ok) {
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleTransaction = async () => {
    if (!selectedItem) {
      showToast({ message: 'Please select an item', type: 'error' });
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      showToast({ message: 'Please enter a valid quantity', type: 'error' });
      return;
    }

    if (transactionType === 'transfer' && (!fromLocation || !toLocation)) {
      showToast({ message: 'Please select both from and to locations', type: 'error' });
      return;
    }

    if (transactionType === 'check_out' && !fromLocation) {
      showToast({ message: 'Please select a source location', type: 'error' });
      return;
    }

    if (transactionType === 'check_in' && !toLocation) {
      showToast({ message: 'Please select a destination location', type: 'error' });
      return;
    }

    try {
      setProcessing(true);
      const response = await authFetch('/api/inventory/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedItem.id,
          transaction_type: transactionType,
          quantity: parseInt(quantity),
          from: fromLocation,
          to: toLocation,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast({ message: data.message || 'Transaction completed successfully!', type: 'success' });
        // Reset form
        setSelectedItem(null);
        setQuantity('');
        setFromLocation(null);
        setToLocation(null);
        setNotes('');
        await fetchItems();
      } else {
        showToast({ message: data.error || 'Transaction failed', type: 'error' });
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      showToast({ message: 'Transaction failed', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'truck':
        return <TruckIcon className="w-5 h-5" />;
      case 'project_site':
        return <Building2 className="w-5 h-5" />;
      case 'warehouse':
        return <Warehouse className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Check In/Out Inventory</h1>

        {/* Transaction Type Selection */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Transaction Type</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTransactionType('check_out')}
              className={`p-4 rounded-lg border-2 transition-all ${
                transactionType === 'check_out'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <ArrowLeft className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Check Out</div>
              <div className="text-xs text-muted-foreground mt-1">Remove from inventory</div>
            </button>

            <button
              onClick={() => setTransactionType('transfer')}
              className={`p-4 rounded-lg border-2 transition-all ${
                transactionType === 'transfer'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <ArrowRight className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Transfer</div>
              <div className="text-xs text-muted-foreground mt-1">Move between locations</div>
            </button>

            <button
              onClick={() => setTransactionType('check_in')}
              className={`p-4 rounded-lg border-2 transition-all ${
                transactionType === 'check_in'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Package className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Check In</div>
              <div className="text-xs text-muted-foreground mt-1">Add to inventory</div>
            </button>
          </div>
        </div>

        {/* Item Selection */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Select Item</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground mb-4"
          />

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedItem?.id === item.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Qty: {item.total_quantity} {item.unit}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedItem && (
          <>
            {/* Quantity */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Quantity</h2>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                min="1"
                max={selectedItem.total_quantity}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground text-2xl text-center"
              />
              <div className="text-sm text-muted-foreground text-center mt-2">
                Available: {selectedItem.total_quantity} {selectedItem.unit}
              </div>
            </div>

            {/* Locations */}
            {(transactionType === 'transfer' || transactionType === 'check_out') && (
              <LocationSelector
                label="From Location"
                selectedLocation={fromLocation}
                onSelect={setFromLocation}
                trucks={trucks}
                projects={projects}
                icon={<ArrowLeft className="w-5 h-5" />}
              />
            )}

            {(transactionType === 'transfer' || transactionType === 'check_in') && (
              <LocationSelector
                label="To Location"
                selectedLocation={toLocation}
                onSelect={setToLocation}
                trucks={trucks}
                projects={projects}
                icon={<ArrowRight className="w-5 h-5" />}
              />
            )}

            {/* Notes */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Notes (Optional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this transaction..."
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleTransaction}
              disabled={processing}
              className="w-full py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold text-lg"
            >
              {processing ? 'Processing...' : `Complete ${transactionType.replace('_', ' ')}`}
            </button>
          </>
        )}
      </div>
    </PageContainer>
  );
};

// Location Selector Component
interface LocationSelectorProps {
  label: string;
  selectedLocation: {
    type: string;
    truck_id?: number;
    project_id?: number;
    location_name?: string;
  } | null;
  onSelect: (location: {
    type: string;
    truck_id?: number;
    project_id?: number;
    location_name?: string;
  }) => void;
  trucks: Truck[];
  projects: Project[];
  icon: React.ReactNode;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  label,
  selectedLocation,
  onSelect,
  trucks,
  projects,
  icon,
}) => {
  const [locationType, setLocationType] = useState<string>(selectedLocation?.type || 'truck');

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        {icon}
        {label}
      </h2>

      {/* Location Type */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {['truck', 'project_site', 'warehouse', 'other'].map((type) => (
          <button
            key={type}
            onClick={() => setLocationType(type)}
            className={`py-2 px-3 rounded-lg text-sm capitalize ${
              locationType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Truck Selection */}
      {locationType === 'truck' && (
        <select
          value={selectedLocation?.truck_id || ''}
          onChange={(e) =>
            onSelect({
              type: 'truck',
              truck_id: parseInt(e.target.value),
            })
          }
          className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="">Select a truck...</option>
          {trucks.map((truck) => (
            <option key={truck.id} value={truck.id}>
              {truck.identifier} - {truck.name}
            </option>
          ))}
        </select>
      )}

      {/* Project Selection */}
      {locationType === 'project_site' && (
        <select
          value={selectedLocation?.project_id || ''}
          onChange={(e) =>
            onSelect({
              type: 'project_site',
              project_id: parseInt(e.target.value),
            })
          }
          className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="">Select a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      )}

      {/* Other Location Name */}
      {(locationType === 'warehouse' || locationType === 'other') && (
        <input
          type="text"
          value={selectedLocation?.location_name || ''}
          onChange={(e) =>
            onSelect({
              type: locationType,
              location_name: e.target.value,
            })
          }
          placeholder={`Enter ${locationType} name...`}
          className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
        />
      )}
    </div>
  );
};

export default InventoryCheckInOut;
