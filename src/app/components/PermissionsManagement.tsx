'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Check, X, AlertCircle, Save, RefreshCw } from 'lucide-react';

interface Permission {
  id: number;
  permission_key: string;
  permission_name: string;
  permission_category: string;
  description: string;
}

interface RolePermissions {
  admin: string[];
  pm: string[];
  staff: string[];
}

export default function PermissionsManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({
    admin: [],
    pm: [],
    staff: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'pm' | 'staff'>('pm');


  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth headers
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to view permissions');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/permissions', { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load permissions');
      }

      setPermissions(data.permissions || []);
      setRolePermissions(data.rolePermissions || { admin: [], pm: [], staff: [] });
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleTogglePermission = (permissionKey: string) => {
    setRolePermissions(prev => {
      const currentPerms = prev[selectedRole];
      const newPerms = currentPerms.includes(permissionKey)
        ? currentPerms.filter(p => p !== permissionKey)
        : [...currentPerms, permissionKey];

      return {
        ...prev,
        [selectedRole]: newPerms
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Get auth headers
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to save permissions');
      }

      const response = await fetch('/api/permissions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: selectedRole,
          permissionKeys: rolePermissions[selectedRole]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed permission error if available
        if (data.message) {
          throw new Error(data.message);
        }
        throw new Error(data.error || 'Failed to update permissions');
      }

      setSuccess(`Permissions updated successfully for ${selectedRole.toUpperCase()} role`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.permission_category]) {
      acc[perm.permission_category] = [];
    }
    acc[perm.permission_category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const roleColors = {
    admin: 'bg-red-100 text-red-800 border-red-300',
    pm: 'bg-blue-100 text-primary border-blue-300',
    staff: 'bg-green-100 text-green-800 border-green-300'
  };

  const roleNames = {
    admin: 'Administrator',
    pm: 'Project Manager',
    staff: 'Staff'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Loading permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Permission Management</h2>
            <p className="text-sm text-muted-foreground">
              Configure what each role can do in the system
            </p>
          </div>
        </div>
        <button
          onClick={fetchPermissions}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Refresh
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Role Selector */}
      <div className="bg-card border border-border rounded-lg p-6">
        <label className="block text-sm font-medium text-foreground mb-3">
          Select Role to Configure
        </label>
        <div className="flex gap-3">
          {(['admin', 'pm', 'staff'] as const).map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                selectedRole === role
                  ? roleColors[role] + ' border-current'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {roleNames[role]}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-muted border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Permissions for {roleNames[selectedRole]}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {rolePermissions[selectedRole].length} of {permissions.length} permissions granted
          </p>
        </div>

        <div className="divide-y divide-border">
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <div key={category} className="p-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                {category}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {perms.map(perm => {
                  const isGranted = rolePermissions[selectedRole].includes(perm.permission_key);
                  return (
                    <button
                      key={perm.id}
                      onClick={() => handleTogglePermission(perm.permission_key)}
                      className={`p-3 rounded-md border text-left transition-all ${
                        isGranted
                          ? 'bg-primary/10 border-blue-300 hover:bg-blue-100'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground block">
                            {perm.permission_name}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {perm.description}
                          </p>
                        </div>
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          isGranted ? 'bg-primary' : 'bg-gray-300'
                        }`}>
                          {isGranted ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : (
                            <X className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={fetchPermissions}
          className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
          disabled={saving}
        >
          Reset Changes
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Permissions
            </>
          )}
        </button>
      </div>
    </div>
  );
}

