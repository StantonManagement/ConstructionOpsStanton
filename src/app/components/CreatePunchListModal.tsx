'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Send
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface PunchListItemData {
  description: string;
  priority: 'high' | 'medium' | 'low';
  locationArea: string;
  dueDate: string;
  gcNotes: string;
}

interface Contractor {
  id: number;
  name: string;
  trade: string;
  phone: string;
}

interface CreatePunchListModalProps {
  projectId: number | string;
  projectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePunchListModal({
  projectId,
  projectName,
  onClose,
  onSuccess,
}: CreatePunchListModalProps) {
  const numericProjectId = typeof projectId === 'string' ? Number(projectId) : projectId;
  const [step, setStep] = useState(1); // 1: Add Items, 2: Select Contractor, 3: Review & Send
  const [items, setItems] = useState<PunchListItemData[]>([
    { description: '', priority: 'medium', locationArea: '', dueDate: '', gcNotes: '' }
  ]);
  const [selectedContractor, setSelectedContractor] = useState<number | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendSMS, setSendSMS] = useState(false); // Default to no SMS

  // Fetch contractors for this project
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        setLoadingContractors(true);
        const { data, error } = await supabase
          .from('contracts')
          .select(`
            subcontractor_id,
            contractors!contracts_subcontractor_id_fkey (
              id, name, trade, phone
            )
          `)
          .eq('project_id', numericProjectId);

        if (error) throw error;

        const uniqueContractors = data?.map((c: any) => c.contractors).filter(Boolean) || [];
        const seen = new Set();
        const filtered = uniqueContractors.filter((c: any) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });

        setContractors(filtered);
      } catch (err) {
        console.error('Error fetching contractors:', err);
      } finally {
        setLoadingContractors(false);
      }
    };

    fetchContractors();
  }, [numericProjectId]);

  const addItem = () => {
    setItems([
      ...items,
      { description: '', priority: 'medium', locationArea: '', dueDate: '', gcNotes: '' }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return; // Keep at least one item
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PunchListItemData, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const validateStep1 = () => {
    // Check if at least one item has a description
    return items.some(item => item.description.trim() !== '');
  };

  const validateStep2 = () => {
    // Contractor selection is now optional
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) {
      setError('Please add at least one punch list item with a description');
      return;
    }
    // Step 2 validation removed - contractor is optional
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Filter out empty items
      const validItems = items.filter(item => item.description.trim() !== '');

      // Step 1: Create punch list items
      const response = await fetch(`/api/punch-lists/${numericProjectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          items: validItems.map(item => ({
            contractorId: selectedContractor || null, // Allow null contractor
            description: item.description,
            priority: item.priority,
            locationArea: item.locationArea || null,
            dueDate: item.dueDate || null,
            gcNotes: item.gcNotes || null,
          })),
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create punch list items');
      }

      const result = await response.json();
      const createdItemIds = result.data.map((item: any) => item.id);

      // Step 2: Assign to contractor and send SMS (only if contractor selected AND SMS enabled)
      if (selectedContractor && sendSMS) {
        console.log('Sending SMS notification to contractor...');
        const assignResponse = await fetch('/api/punch-lists/assign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            itemIds: createdItemIds,
            contractorId: selectedContractor,
            projectId: numericProjectId,
            userId,
          }),
        });

        if (!assignResponse.ok) {
          throw new Error('Failed to assign punch list items');
        }

        const assignResult = await assignResponse.json();
        console.log('Punch list assigned and SMS sent:', assignResult);
      } else if (selectedContractor && !sendSMS) {
        console.log('Punch list items created with contractor assignment (no SMS sent)');
      } else {
        console.log('Punch list items created without contractor assignment');
      }

      // Success!
      onSuccess();
    } catch (err) {
      console.error('Error creating punch list:', err);
      setError(err instanceof Error ? err.message : 'Failed to create punch list');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Punch List</h2>
            <p className="text-sm text-gray-600 mt-1">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>
                1
              </div>
              <span className={`text-sm font-medium ${step >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                Add Items
              </span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>
                2
              </div>
              <span className={`text-sm font-medium ${step >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                Select Contractor
              </span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4"></div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>
                3
              </div>
              <span className={`text-sm font-medium ${step >= 3 ? 'text-gray-900' : 'text-gray-500'}`}>
                Review & Send
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Add Items */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Punch List Items</h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Describe the punch list item..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={item.priority}
                          onChange={(e) => updateItem(index, 'priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location/Area
                        </label>
                        <input
                          type="text"
                          value={item.locationArea}
                          onChange={(e) => updateItem(index, 'locationArea', e.target.value)}
                          placeholder="e.g., Room 201"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => updateItem(index, 'dueDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GC Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={item.gcNotes}
                        onChange={(e) => updateItem(index, 'gcNotes', e.target.value)}
                        placeholder="Additional notes or instructions..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Select Contractor */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assign to Contractor
              </h3>
              
              {loadingContractors ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading contractors...</p>
                </div>
              ) : contractors.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">No contractors found for this project.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contractors.map((contractor) => (
                    <button
                      key={contractor.id}
                      onClick={() => setSelectedContractor(contractor.id)}
                      className={`text-left p-4 border-2 rounded-lg transition-all ${
                        selectedContractor === contractor.id
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{contractor.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{contractor.trade}</p>
                          <p className="text-sm text-gray-500 mt-1">{contractor.phone}</p>
                        </div>
                        {selectedContractor === contractor.id && (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Send */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Review & Confirm</h3>
                <p className="text-sm text-gray-600">
                  Review the punch list items before sending to the contractor.
                </p>
              </div>

              <div className="bg-primary/10 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Contractor</h4>
                <p className="text-primary">
                  {contractors.find(c => c.id === selectedContractor)?.name}
                </p>
                <p className="text-sm text-primary mt-1">
                  {contractors.find(c => c.id === selectedContractor)?.trade}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Items ({items.filter(i => i.description.trim()).length})
                </h4>
                <div className="space-y-3">
                  {items
                    .filter(item => item.description.trim())
                    .map((item, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${getPriorityColor(item.priority)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            PRIORITY: {item.priority.toUpperCase()}
                          </span>
                          {item.locationArea && (
                            <span className="text-xs text-gray-600">📍 {item.locationArea}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 font-medium">{item.description}</p>
                        {item.dueDate && (
                          <p className="text-xs text-gray-600 mt-2">
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </p>
                        )}
                        {item.gcNotes && (
                          <p className="text-xs text-gray-600 mt-2 italic">
                            Note: {item.gcNotes}
                          </p>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* SMS Notification Toggle */}
              {selectedContractor && (
                <div className="bg-primary/10 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendSMS}
                      onChange={(e) => setSendSMS(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary" />
                        <h4 className="font-medium text-blue-900">Send SMS Notification</h4>
                      </div>
                      <p className="text-sm text-primary mt-1">
                        The contractor will receive an SMS with a link to view and manage these punch list items.
                      </p>
                    </div>
                  </label>
                </div>
              )}
              
              {!selectedContractor && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">No Contractor Assigned</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        These items will be created without a contractor assignment. You can assign contractors later.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {step > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Create Punch List
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

