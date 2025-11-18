import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  hasRoleAccess as checkRoleAccess,
  hasPermission as checkPermission,
  canAccessUserManagement as checkUserManagementAccess,
  canAccessPermissionsManagement as checkPermissionsManagementAccess,
  canApprovePayments as checkApprovePaymentsAccess,
  canManageProjects as checkManageProjectsAccess,
  isAdmin as checkIsAdmin,
  isPM as checkIsPM,
  isStaff as checkIsStaff,
  getRoleDefinition,
  type Role,
  type Permission,
} from '@/lib/permissions';

interface PermissionData {
  permissions: string[];
  role: string | null;
  loading: boolean;
  error: string | null;
}

export function usePermissions(): PermissionData & {
  hasPermission: (permissionKey: string) => boolean;
  hasAnyPermission: (permissionKeys: string[]) => boolean;
  hasRoleAccess: (requiredRoles: Role | Role[]) => boolean;
  hasBasicPermission: (permission: Permission) => boolean;
  canAccessUserManagement: () => boolean;
  canAccessPermissionsManagement: () => boolean;
  canApprovePayments: () => boolean;
  canManageProjects: () => boolean;
  isAdmin: () => boolean;
  isPM: () => boolean;
  isStaff: () => boolean;
  roleDefinition: ReturnType<typeof getRoleDefinition>;
  refetch: () => Promise<void>;
} {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setPermissions([]);
        setRole(null);
        setLoading(false);
        return;
      }

      // Get user role
      const { data: userRole, error: roleError } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleError || !userRole) {
        console.error('Error fetching user role:', roleError);
        setError('Failed to load user permissions');
        setLoading(false);
        return;
      }

      setRole(userRole.role);

      // Get permissions for this role
      const { data: rolePermissions, error: permError } = await supabase
        .from('role_permissions_view')
        .select('permission_key')
        .eq('role', userRole.role);

      if (permError) {
        console.error('Error fetching permissions:', permError);
        setError('Failed to load permissions');
        setLoading(false);
        return;
      }

      const permissionKeys = rolePermissions?.map((p: any) => p.permission_key) || [];
      setPermissions(permissionKeys);
      setLoading(false);

    } catch (err) {
      console.error('Error in usePermissions:', err);
      setError('Failed to load permissions');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permissionKey: string): boolean => {
    return permissions.includes(permissionKey);
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => permissions.includes(key));
  }, [permissions]);

  // Role-based access helpers using centralized permission system
  const hasRoleAccess = useCallback((requiredRoles: Role | Role[]): boolean => {
    return checkRoleAccess(role, requiredRoles);
  }, [role]);

  const hasBasicPermission = useCallback((permission: Permission): boolean => {
    return checkPermission(role, permission);
  }, [role]);

  const canAccessUserManagement = useCallback((): boolean => {
    return checkUserManagementAccess(role);
  }, [role]);

  const canAccessPermissionsManagement = useCallback((): boolean => {
    return checkPermissionsManagementAccess(role);
  }, [role]);

  const canApprovePayments = useCallback((): boolean => {
    return checkApprovePaymentsAccess(role);
  }, [role]);

  const canManageProjects = useCallback((): boolean => {
    return checkManageProjectsAccess(role);
  }, [role]);

  const isAdmin = useCallback((): boolean => {
    return checkIsAdmin(role);
  }, [role]);

  const isPM = useCallback((): boolean => {
    return checkIsPM(role);
  }, [role]);

  const isStaff = useCallback((): boolean => {
    return checkIsStaff(role);
  }, [role]);

  const roleDefinition = getRoleDefinition(role);

  return {
    permissions,
    role,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasRoleAccess,
    hasBasicPermission,
    canAccessUserManagement,
    canAccessPermissionsManagement,
    canApprovePayments,
    canManageProjects,
    isAdmin,
    isPM,
    isStaff,
    roleDefinition,
    refetch: fetchPermissions
  };
}

// Helper function to get role display name
export function getRoleDisplayName(role: string | null): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'pm':
      return 'Project Manager';
    case 'staff':
      return 'Staff';
    default:
      return 'Unknown';
  }
}

// Helper function to format permission error messages
export function formatPermissionError(requiredPermission: string, currentRole: string | null): string {
  const roleName = getRoleDisplayName(currentRole);
  return `This action requires "${requiredPermission}" permission. You are currently logged in as ${roleName}. Please contact your administrator if you need access to this feature.`;
}

