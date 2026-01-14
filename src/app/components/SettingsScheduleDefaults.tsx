import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react';

interface ScheduleDefault {
  id?: string; // UUID
  budget_category: string;
  default_duration_days: number;
  display_order: number;
}

interface SettingsScheduleDefaultsProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function SettingsScheduleDefaults({ showToast }: SettingsScheduleDefaultsProps) {
  const [defaults, setDefaults] = useState<ScheduleDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchDefaults();
  }, []);

  const fetchDefaults = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/settings/schedule-defaults', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) throw new Error('Failed to fetch defaults');
      
      const data = await res.json();
      setDefaults(data);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching defaults:', error);
      showToast('Failed to load schedule defaults', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index: number, field: keyof ScheduleDefault, value: any) => {
    const newDefaults = [...defaults];
    newDefaults[index] = { ...newDefaults[index], [field]: value };
    setDefaults(newDefaults);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/settings/schedule-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(defaults)
      });

      if (!res.ok) throw new Error('Failed to save changes');

      showToast('Schedule defaults saved successfully', 'success');
      setHasChanges(false);
      fetchDefaults(); // Refresh to get IDs if any new ones
    } catch (error) {
      console.error('Error saving defaults:', error);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = () => {
    setDefaults([
      ...defaults,
      {
        budget_category: '',
        default_duration_days: 3,
        display_order: defaults.length > 0 ? Math.max(...defaults.map(d => d.display_order || 0)) + 10 : 10
      }
    ]);
    setHasChanges(true);
  };

  if (loading) {
     return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Schedule Defaults</h3>
            <p className="text-sm text-gray-600">Configure default durations for auto-scheduling tasks based on budget categories.</p>
          </div>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Budget Category</th>
                <th className="px-4 py-3">Default Duration (Days)</th>
                <th className="px-4 py-3">Display Order</th>
                {/* <th className="px-4 py-3 text-right">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {defaults.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.budget_category}
                      onChange={(e) => handleChange(index, 'budget_category', e.target.value)}
                      className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      placeholder="Category Name"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.default_duration_days}
                      onChange={(e) => handleChange(index, 'default_duration_days', parseInt(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.display_order}
                      onChange={(e) => handleChange(index, 'display_order', parseInt(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </td>
                </tr>
              ))}
              {defaults.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No schedule defaults found. Click "Add Category" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-4">
          <p className="text-sm text-gray-500">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <div className="flex gap-3">
            {hasChanges && (
              <button
                onClick={fetchDefaults}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  );
}



