/**
 * Centralized Permission System
 * 
 * This module provides the single source of truth for role-based access control
 * throughout the application. All components and API routes should use these
 * utilities instead of hardcoding permission checks.
 */

// ============================================================================
// TYPES
// ============================================================================

export type Role = 'admin' | 'pm' | 'staff';

export type Permission = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete'
  | 'approve'
  | 'manage_users'
  | 'manage_permissions';

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

/**
 * Defines what each role can do at a high level.
 * This is the single source of truth for role capabilities.
 */
export const ROLE_DEFINITIONS = {
  admin: {
    label: 'Administrator',
    description: 'Full system access including user management and configuration',
    color: 'red',
    permissions: ['create', 'read', 'update', 'delete', 'approve', 'manage_users', 'manage_permissions'] as Permission[],
    canAccessUserManagement: true,
    canAccessPermissionsManagement: true,
    canAccessSettings: true,
    canAccessDailyLogs: true,
    canApprovePayments: true,
    canManageProjects: true,
    canManageContractors: true,
    canManageContracts: true,
  },
  pm: {
    label: 'Project Manager',
    description: 'Project management focused with limited admin features',
    color: 'blue',
    permissions: ['read', 'update', 'approve'] as Permission[],
    canAccessUserManagement: true, // Can view users, cannot modify
    canAccessPermissionsManagement: false,
    canAccessSettings: true, // Limited to certain settings tabs
    canAccessDailyLogs: false,
    canApprovePayments: true,
    canManageProjects: true,
    canManageContractors: false,
    canManageContracts: false,
  },
  staff: {
    label: 'Staff',
    description: 'Basic project viewing and data entry capabilities',
    color: 'green',
    permissions: ['read'] as Permission[],
    canAccessUserManagement: false,
    canAccessPermissionsManagement: false,
    canAccessSettings: true, // Very limited (preferences, company info)
    canAccessDailyLogs: true,
    canApprovePayments: false,
    canManageProjects: false,
    canManageContractors: false,
    canManageContracts: false,
  },
} as const;

// ============================================================================
// ROLE OPTIONS (for dropdowns and UI)
// ============================================================================

export const ROLE_OPTIONS = [
  { value: 'staff' as const, label: 'Staff' },
  { value: 'pm' as const, label: 'Project Manager' },
  { value: 'admin' as const, label: 'Administrator' },
] as const;

// ============================================================================
// PERMISSION CHECKING UTILITIES
// ============================================================================

/**
 * Check if a user role has access to a feature/page
 * 
 * @param userRole - The role of the current user
 * @param requiredRoles - Array of roles that have access, or a single role
 * @returns true if user has access
 * 
 * @example
 * if (hasRoleAccess(role, ['admin', 'pm'])) {
 *   // Show admin/PM-only content
 * }
 */
export function hasRoleAccess(
  userRole: string | null | undefined,
  requiredRoles: Role | Role[]
): boolean {
  if (!userRole) return false;
  
  const normalizedRole = userRole.toLowerCase() as Role;
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return rolesArray.includes(normalizedRole);
}

/**
 * Check if a user role has a specific permission
 * 
 * @param userRole - The role of the current user
 * @param permission - The permission to check
 * @returns true if user has the permission
 * 
 * @example
 * if (hasPermission(role, 'delete')) {
 *   // Show delete button
 * }
 */
export function hasPermission(
  userRole: string | null | undefined,
  permission: Permission
): boolean {
  if (!userRole) return false;
  
  const normalizedRole = userRole.toLowerCase() as Role;
  const roleDef = ROLE_DEFINITIONS[normalizedRole];
  
  if (!roleDef) return false;
  
  return roleDef.permissions.includes(permission);
}

/**
 * Check if user can access user management
 */
export function canAccessUserManagement(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  const normalizedRole = userRole.toLowerCase() as Role;
  return ROLE_DEFINITIONS[normalizedRole]?.canAccessUserManagement ?? false;
}

/**
 * Check if user can access permissions management
 */
export function canAccessPermissionsManagement(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  const normalizedRole = userRole.toLowerCase() as Role;
  return ROLE_DEFINITIONS[normalizedRole]?.canAccessPermissionsManagement ?? false;
}

/**
 * Check if user can approve payments
 */
export function canApprovePayments(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  const normalizedRole = userRole.toLowerCase() as Role;
  return ROLE_DEFINITIONS[normalizedRole]?.canApprovePayments ?? false;
}

/**
 * Check if user can manage projects (create/edit/delete)
 */
export function canManageProjects(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  const normalizedRole = userRole.toLowerCase() as Role;
  return ROLE_DEFINITIONS[normalizedRole]?.canManageProjects ?? false;
}

/**
 * Get role definition for a given role
 */
export function getRoleDefinition(userRole: string | null | undefined) {
  if (!userRole) return null;
  const normalizedRole = userRole.toLowerCase() as Role;
  return ROLE_DEFINITIONS[normalizedRole] ?? null;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: string | null | undefined): boolean {
  return userRole?.toLowerCase() === 'admin';
}

/**
 * Check if user is PM
 */
export function isPM(userRole: string | null | undefined): boolean {
  return userRole?.toLowerCase() === 'pm';
}

/**
 * Check if user is Staff
 */
export function isStaff(userRole: string | null | undefined): boolean {
  return userRole?.toLowerCase() === 'staff';
}

// ============================================================================
// TAILWIND COLOR CLASSES (for consistent UI styling)
// ============================================================================

export const ROLE_COLORS = {
  admin: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800 border-red-300',
  },
  pm: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  staff: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    badge: 'bg-green-100 text-green-800 border-green-300',
  },
} as const;

/**
 * Get Tailwind color classes for a role
 */
export function getRoleColors(userRole: string | null | undefined) {
  if (!userRole) return null;
  const normalizedRole = userRole.toLowerCase() as Role;
  return ROLE_COLORS[normalizedRole] ?? null;
}

