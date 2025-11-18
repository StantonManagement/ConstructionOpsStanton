-- ============================================================================
-- PERMISSION MANAGEMENT SYSTEM - SUPABASE SQL EDITOR VERSION
-- ============================================================================
-- This migration creates the permission management system
-- Run this in your Supabase SQL Editor AFTER setting up user_role
-- ============================================================================

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  permission_name VARCHAR(200) NOT NULL,
  permission_category VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE permissions IS 'Defines all available permissions in the system';

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Insert default permissions
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
  ('users_view', 'View Users', 'users', 'Can view user list and details'),
  ('users_create', 'Create Users', 'users', 'Can create new users'),
  ('users_edit', 'Edit Users', 'users', 'Can edit user details and roles'),
  ('users_delete', 'Delete Users', 'users', 'Can delete users'),
  ('permissions_manage', 'Manage Permissions', 'users', 'Can configure role permissions'),
  
  -- Daily Logs
  ('daily_logs_view', 'View Daily Logs', 'daily_logs', 'Can view daily construction logs'),
  ('daily_logs_create', 'Create Daily Logs', 'daily_logs', 'Can create new daily logs'),
  ('daily_logs_edit', 'Edit Daily Logs', 'daily_logs', 'Can edit daily logs'),
  ('daily_logs_delete', 'Delete Daily Logs', 'daily_logs', 'Can delete daily logs'),
  
  -- Reports
  ('reports_view', 'View Reports', 'reports', 'Can view reports and analytics'),
  ('reports_export', 'Export Reports', 'reports', 'Can export reports to PDF/Excel')
ON CONFLICT (permission_key) DO NOTHING;

-- Assign default permissions to admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign default permissions to PM role
INSERT INTO role_permissions (role, permission_id)
SELECT 'pm', id FROM permissions 
WHERE permission_key IN (
  'payments_view', 'payments_create', 'payments_edit', 'payments_approve', 'payments_reject', 'payments_send_signature',
  'projects_view', 'projects_edit',
  'contractors_view',
  'contracts_view',
  'users_view',
  'reports_view', 'reports_export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign default permissions to staff role
INSERT INTO role_permissions (role, permission_id)
SELECT 'staff', id FROM permissions 
WHERE permission_key IN (
  'payments_view',
  'projects_view',
  'contractors_view',
  'contracts_view',
  'daily_logs_view', 'daily_logs_create', 'daily_logs_edit',
  'reports_view'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Create view for easy querying
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

-- Enable RLS on permission tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table policies
DROP POLICY IF EXISTS "All authenticated users can view permissions" ON permissions;
CREATE POLICY "All authenticated users can view permissions"
ON permissions
FOR SELECT
TO authenticated
USING (true);

-- Role permissions table policies
DROP POLICY IF EXISTS "All authenticated users can view role permissions" ON role_permissions;
CREATE POLICY "All authenticated users can view role permissions"
ON role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Verify setup
SELECT 'Permissions system setup complete!' as status;
SELECT COUNT(*) as total_permissions FROM permissions;
SELECT role, COUNT(*) as permission_count 
FROM role_permissions 
GROUP BY role 
ORDER BY role;

-- ============================================================================
-- DONE! The permissions system is now ready to use
-- ============================================================================

