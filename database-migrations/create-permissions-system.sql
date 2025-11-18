-- ============================================================================
-- PERMISSION MANAGEMENT SYSTEM
-- ============================================================================
-- This migration creates a flexible permission management system where:
-- - Admins can configure what each role can do
-- - Permissions are granular (view, create, edit, delete, approve, etc.)
-- - Easy to extend with new permissions
--
-- Run this in Supabase SQL Editor
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'CREATING PERMISSION MANAGEMENT SYSTEM'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- STEP 1: CREATE PERMISSIONS TABLE
-- ============================================================================
\echo 'Step 1: Creating permissions table...'
\echo ''

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  permission_name VARCHAR(200) NOT NULL,
  permission_category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE permissions IS 'Defines all available permissions in the system';
COMMENT ON COLUMN permissions.permission_key IS 'Unique identifier for the permission (e.g., payments_delete)';
COMMENT ON COLUMN permissions.permission_category IS 'Category for grouping permissions (e.g., payments, projects, users)';

\echo '✓ Permissions table created'
\echo ''

-- ============================================================================
-- STEP 2: CREATE ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================================================
\echo 'Step 2: Creating role_permissions junction table...'
\echo ''

CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Add comment
COMMENT ON TABLE role_permissions IS 'Maps which roles have which permissions';
COMMENT ON COLUMN role_permissions.role IS 'Role name: admin, pm, or staff';

\echo '✓ Role permissions junction table created'
\echo ''

-- ============================================================================
-- STEP 3: INSERT DEFAULT PERMISSIONS
-- ============================================================================
\echo 'Step 3: Inserting default permissions...'
\echo ''

INSERT INTO permissions (permission_key, permission_name, permission_category, description) VALUES
  -- Payment Applications
  ('payments_view', 'View Payment Applications', 'payments', 'Can view payment applications and their details'),
  ('payments_create', 'Create Payment Applications', 'payments', 'Can create new payment applications'),
  ('payments_edit', 'Edit Payment Applications', 'payments', 'Can edit payment application details and line items'),
  ('payments_delete', 'Delete Payment Applications', 'payments', 'Can delete payment applications'),
  ('payments_approve', 'Approve Payment Applications', 'payments', 'Can approve payment applications for payment'),
  ('payments_reject', 'Reject Payment Applications', 'payments', 'Can reject payment applications'),
  ('payments_send_signature', 'Send for Signature', 'payments', 'Can send payment applications for DocuSign signature'),
  
  -- Projects
  ('projects_view', 'View Projects', 'projects', 'Can view project details'),
  ('projects_create', 'Create Projects', 'projects', 'Can create new projects'),
  ('projects_edit', 'Edit Projects', 'projects', 'Can edit project details'),
  ('projects_delete', 'Delete Projects', 'projects', 'Can delete projects'),
  
  -- Contractors
  ('contractors_view', 'View Contractors', 'contractors', 'Can view contractor details'),
  ('contractors_create', 'Create Contractors', 'contractors', 'Can create new contractors'),
  ('contractors_edit', 'Edit Contractors', 'contractors', 'Can edit contractor details'),
  ('contractors_delete', 'Delete Contractors', 'contractors', 'Can delete contractors'),
  
  -- Contracts
  ('contracts_view', 'View Contracts', 'contracts', 'Can view contract details'),
  ('contracts_create', 'Create Contracts', 'contracts', 'Can create new contracts'),
  ('contracts_edit', 'Edit Contracts', 'contracts', 'Can edit contract details'),
  ('contracts_delete', 'Delete Contracts', 'contracts', 'Can delete contracts'),
  
  -- Users & Permissions
  ('users_manage', 'Manage Users', 'users', 'Can create, edit, and delete users'),
  ('permissions_manage', 'Manage Permissions', 'permissions', 'Can configure role permissions')
ON CONFLICT (permission_key) DO NOTHING;

\echo '✓ Default permissions inserted'
\echo ''

-- ============================================================================
-- STEP 4: INSERT DEFAULT ROLE PERMISSIONS
-- ============================================================================
\echo 'Step 4: Setting up default role permissions...'
\echo ''

-- ADMIN: Full access to everything
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- PM (Project Manager): Most permissions except user/permission management
INSERT INTO role_permissions (role, permission_id)
SELECT 'pm', id FROM permissions
WHERE permission_key NOT IN ('users_manage', 'permissions_manage')
ON CONFLICT (role, permission_id) DO NOTHING;

-- STAFF: Read-only + create payments
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions
WHERE permission_key IN (
  'payments_view',
  'payments_create',
  'projects_view',
  'contractors_view',
  'contracts_view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

\echo '✓ Default role permissions configured'
\echo ''
\echo '  Admin: Full access to all features'
\echo '  PM: All features except user/permission management'
\echo '  Staff: Read-only + create payments'
\echo ''

-- ============================================================================
-- STEP 5: CREATE HELPER FUNCTION TO CHECK PERMISSIONS
-- ============================================================================
\echo 'Step 5: Creating permission check helper function...'
\echo ''

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS user_has_permission(TEXT);

-- Create permission check function
CREATE OR REPLACE FUNCTION user_has_permission(permission_key_param TEXT) 
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_role ur
    JOIN role_permissions rp ON rp.role = ur.role
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
    AND p.permission_key = permission_key_param
  );
$$;

-- Add comment
COMMENT ON FUNCTION user_has_permission(TEXT) IS 
  'Returns true if current user has the specified permission. Used by APIs and RLS policies.';

\echo '✓ Permission check function created'
\echo ''

-- ============================================================================
-- STEP 6: ENABLE RLS ON PERMISSION TABLES
-- ============================================================================
\echo 'Step 6: Enabling RLS on permission tables...'
\echo ''

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table policies
CREATE POLICY "All authenticated users can view permissions"
ON permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify permissions"
ON permissions
FOR ALL
TO authenticated
USING (user_has_permission('permissions_manage'))
WITH CHECK (user_has_permission('permissions_manage'));

-- Role permissions table policies
CREATE POLICY "All authenticated users can view role permissions"
ON role_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can modify role permissions"
ON role_permissions
FOR ALL
TO authenticated
USING (user_has_permission('permissions_manage'))
WITH CHECK (user_has_permission('permissions_manage'));

\echo '✓ RLS enabled on permission tables'
\echo ''

-- ============================================================================
-- STEP 7: CREATE VIEW FOR EASY PERMISSION QUERIES
-- ============================================================================
\echo 'Step 7: Creating permission view...'
\echo ''

CREATE OR REPLACE VIEW role_permissions_view AS
SELECT 
  rp.id,
  rp.role,
  p.permission_key,
  p.permission_name,
  p.permission_category,
  p.description,
  rp.granted_at
FROM role_permissions rp
JOIN permissions p ON p.id = rp.permission_id
ORDER BY rp.role, p.permission_category, p.permission_name;

COMMENT ON VIEW role_permissions_view IS 
  'Easy-to-query view of role permissions with full permission details';

\echo '✓ Permission view created'
\echo ''

\echo '============================================================================'
\echo 'PERMISSION SYSTEM SETUP COMPLETE!'
\echo '============================================================================'
\echo ''
\echo 'Summary:'
\echo '  - permissions table: Defines all available permissions'
\echo '  - role_permissions table: Maps roles to permissions'
\echo '  - user_has_permission() function: Check if user has a permission'
\echo '  - role_permissions_view: Easy querying of role permissions'
\echo '  - Default permissions configured for admin, pm, and staff roles'
\echo ''
\echo 'Next steps:'
\echo '  1. Update API endpoints to use user_has_permission()'
\echo '  2. Build admin UI to manage role permissions'
\echo '  3. Update frontend to check permissions and show/hide actions'
\echo ''

