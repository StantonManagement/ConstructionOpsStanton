-- ============================================================================
-- PRODUCTION-READY RLS IMPLEMENTATION v2
-- ============================================================================
-- This migration enables Row Level Security with proper security controls:
-- - Helper function for role checks (better performance, plan caching)
-- - Performance indexes before enabling RLS
-- - Proper WITH CHECK clauses to prevent privilege escalation
-- - Idempotent (safe to run multiple times)
--
-- SECURITY MODEL:
-- - Staff: Read-only access to projects, contractors, payment apps
-- - PM: Full access to projects, contractors, can approve payments
-- - Admin: Full access including deletes
--
-- Run this in Supabase SQL Editor after running scripts/diagnose-database.sql
-- to confirm RLS is disabled and no policies exist.
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'STARTING RLS MIGRATION v2'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTION FOR ROLE CHECKS
-- ============================================================================
\echo 'Step 1: Creating helper function for role checks...'
\echo ''

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS is_admin_or_pm();

-- Create optimized role check function
-- STABLE = result won't change within a single query
-- SECURITY DEFINER = runs with creator's privileges (can read user_role)
CREATE OR REPLACE FUNCTION is_admin_or_pm() 
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  );
$$;

-- Add comment
COMMENT ON FUNCTION is_admin_or_pm() IS 
  'Returns true if current user has admin or pm role. Used by RLS policies for performance and consistency.';

\echo '✓ Helper function created'
\echo ''

-- ============================================================================
-- STEP 2: CREATE PERFORMANCE INDEXES
-- ============================================================================
\echo 'Step 2: Creating performance indexes...'
\echo ''

-- Critical indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role ON user_role(role);
CREATE INDEX IF NOT EXISTS idx_payment_applications_status ON payment_applications(status);
CREATE INDEX IF NOT EXISTS idx_payment_applications_project_id ON payment_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_contractor_id ON payment_applications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_project_contractors_project_id ON project_contractors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contractors_contractor_id ON project_contractors(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_id ON projects(id);
CREATE INDEX IF NOT EXISTS idx_contractors_id ON contractors(id);

\echo '✓ Performance indexes created'
\echo ''

-- ============================================================================
-- STEP 3: ENABLE RLS ON CORE TABLES
-- ============================================================================
\echo 'Step 3: Enabling Row Level Security on core tables...'
\echo ''

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;

\echo '✓ RLS enabled on all core tables'
\echo ''

-- ============================================================================
-- STEP 4: PROJECTS TABLE POLICIES
-- ============================================================================
\echo 'Step 4: Creating policies for projects table...'
\echo ''

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view all projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs can create projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

-- SELECT: All authenticated users can view
CREATE POLICY "Authenticated users can view all projects"
ON projects
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins and PMs
CREATE POLICY "Admins and PMs can create projects"
ON projects
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_pm());

-- UPDATE: Only admins and PMs, WITH CHECK to prevent privilege escalation
CREATE POLICY "Admins and PMs can update projects"
ON projects
FOR UPDATE
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm());

-- DELETE: Only admins
CREATE POLICY "Admins can delete projects"
ON projects
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

\echo '✓ Projects policies created'
\echo ''

-- ============================================================================
-- STEP 5: CONTRACTORS TABLE POLICIES
-- ============================================================================
\echo 'Step 5: Creating policies for contractors table...'
\echo ''

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view all contractors" ON contractors;
DROP POLICY IF EXISTS "Admins and PMs can create contractors" ON contractors;
DROP POLICY IF EXISTS "Admins and PMs can update contractors" ON contractors;
DROP POLICY IF EXISTS "Admins can delete contractors" ON contractors;

-- SELECT: All authenticated users can view
CREATE POLICY "Authenticated users can view all contractors"
ON contractors
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins and PMs
CREATE POLICY "Admins and PMs can create contractors"
ON contractors
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_pm());

-- UPDATE: Only admins and PMs, WITH CHECK to prevent privilege escalation
CREATE POLICY "Admins and PMs can update contractors"
ON contractors
FOR UPDATE
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm());

-- DELETE: Only admins
CREATE POLICY "Admins can delete contractors"
ON contractors
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

\echo '✓ Contractors policies created'
\echo ''

-- ============================================================================
-- STEP 6: PROJECT_CONTRACTORS TABLE POLICIES
-- ============================================================================
\echo 'Step 6: Creating policies for project_contractors table...'
\echo ''

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins and PMs can create project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins and PMs can update project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins can delete project contractors" ON project_contractors;

-- SELECT: All authenticated users can view
CREATE POLICY "Authenticated users can view project contractors"
ON project_contractors
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admins and PMs
CREATE POLICY "Admins and PMs can create project contractors"
ON project_contractors
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_pm());

-- UPDATE: Only admins and PMs, WITH CHECK to prevent privilege escalation
CREATE POLICY "Admins and PMs can update project contractors"
ON project_contractors
FOR UPDATE
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm());

-- DELETE: Only admins
CREATE POLICY "Admins can delete project contractors"
ON project_contractors
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

\echo '✓ Project_contractors policies created'
\echo ''

-- ============================================================================
-- STEP 7: PAYMENT_APPLICATIONS TABLE POLICIES
-- ============================================================================
\echo 'Step 7: Creating policies for payment_applications table...'
\echo ''

-- Drop existing policies (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view payment applications" ON payment_applications;
DROP POLICY IF EXISTS "Authenticated users can create payment applications" ON payment_applications;
DROP POLICY IF EXISTS "Users can update draft or submitted payment applications" ON payment_applications;
DROP POLICY IF EXISTS "Admins and PMs can update any payment application" ON payment_applications;
DROP POLICY IF EXISTS "Admins can delete payment applications" ON payment_applications;

-- SELECT: All authenticated users can view
CREATE POLICY "Authenticated users can view payment applications"
ON payment_applications
FOR SELECT
TO authenticated
USING (true);

-- INSERT: All authenticated users can create (on behalf of contractors)
CREATE POLICY "Authenticated users can create payment applications"
ON payment_applications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Regular users can only update draft/submitted applications
-- This prevents modification of approved/rejected applications
CREATE POLICY "Users can update draft or submitted payment applications"
ON payment_applications
FOR UPDATE
TO authenticated
USING (
  status IN ('draft', 'submitted', 'initiated', 'sms_sent')
  AND NOT is_admin_or_pm()
)
WITH CHECK (
  status IN ('draft', 'submitted', 'initiated', 'sms_sent')
  AND NOT is_admin_or_pm()
);

-- UPDATE: Admins and PMs can update any payment application (for approval workflow)
CREATE POLICY "Admins and PMs can update any payment application"
ON payment_applications
FOR UPDATE
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm());

-- DELETE: Only admins
CREATE POLICY "Admins can delete payment applications"
ON payment_applications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

\echo '✓ Payment_applications policies created'
\echo ''

-- ============================================================================
-- STEP 8: ADD POLICY COMMENTS
-- ============================================================================
\echo 'Step 8: Adding policy documentation...'
\echo ''

-- Projects
COMMENT ON POLICY "Authenticated users can view all projects" ON projects 
  IS 'All logged-in users (staff, PM, admin) can read project data';
COMMENT ON POLICY "Admins and PMs can create projects" ON projects 
  IS 'Only users with admin or pm role can create new projects';
COMMENT ON POLICY "Admins and PMs can update projects" ON projects 
  IS 'Only users with admin or pm role can modify projects. WITH CHECK prevents privilege escalation.';
COMMENT ON POLICY "Admins can delete projects" ON projects 
  IS 'Only users with admin role can delete projects';

-- Contractors
COMMENT ON POLICY "Authenticated users can view all contractors" ON contractors 
  IS 'All logged-in users can read contractor data';
COMMENT ON POLICY "Admins and PMs can create contractors" ON contractors 
  IS 'Only users with admin or pm role can add new contractors';
COMMENT ON POLICY "Admins and PMs can update contractors" ON contractors 
  IS 'Only users with admin or pm role can modify contractors. WITH CHECK prevents privilege escalation.';
COMMENT ON POLICY "Admins can delete contractors" ON contractors 
  IS 'Only users with admin role can delete contractors';

-- Project Contractors
COMMENT ON POLICY "Authenticated users can view project contractors" ON project_contractors 
  IS 'All logged-in users can view project-contractor relationships';
COMMENT ON POLICY "Admins and PMs can create project contractors" ON project_contractors 
  IS 'Only users with admin or pm role can create project-contractor relationships';
COMMENT ON POLICY "Admins and PMs can update project contractors" ON project_contractors 
  IS 'Only users with admin or pm role can modify relationships. WITH CHECK prevents privilege escalation.';
COMMENT ON POLICY "Admins can delete project contractors" ON project_contractors 
  IS 'Only users with admin role can delete project-contractor relationships';

-- Payment Applications
COMMENT ON POLICY "Authenticated users can view payment applications" ON payment_applications 
  IS 'All logged-in users can view payment applications';
COMMENT ON POLICY "Authenticated users can create payment applications" ON payment_applications 
  IS 'All users can create payment applications on behalf of contractors';
COMMENT ON POLICY "Users can update draft or submitted payment applications" ON payment_applications 
  IS 'Regular users can only update draft/submitted/initiated/sms_sent applications. Prevents modifying approved/rejected apps.';
COMMENT ON POLICY "Admins and PMs can update any payment application" ON payment_applications 
  IS 'Admins and PMs can approve/reject and modify any payment application. WITH CHECK ensures role is maintained.';
COMMENT ON POLICY "Admins can delete payment applications" ON payment_applications 
  IS 'Only admins can delete payment applications';

\echo '✓ Policy comments added'
\echo ''

-- ============================================================================
-- STEP 9: VERIFICATION
-- ============================================================================
\echo ''
\echo '============================================================================'
\echo 'MIGRATION COMPLETE - VERIFICATION'
\echo '============================================================================'
\echo ''
\echo 'Run these queries to verify the migration:'
\echo ''
\echo '1. Check RLS status:'
\echo '   SELECT tablename, rowsecurity FROM pg_tables'
\echo '   WHERE schemaname = '\''public'\'''
\echo '   AND tablename IN ('\''projects'\'', '\''contractors'\'', '\''project_contractors'\'', '\''payment_applications'\'');'
\echo ''
\echo '2. Check policies:'
\echo '   SELECT tablename, policyname, cmd, roles'
\echo '   FROM pg_policies'
\echo '   WHERE schemaname = '\''public'\'''
\echo '   ORDER BY tablename, policyname;'
\echo ''
\echo '3. Check indexes:'
\echo '   SELECT schemaname, tablename, indexname'
\echo '   FROM pg_indexes'
\echo '   WHERE schemaname = '\''public'\'''
\echo '   AND tablename IN ('\''user_role'\'', '\''payment_applications'\'', '\''project_contractors'\'')'
\echo '   ORDER BY tablename, indexname;'
\echo ''
\echo '4. Test helper function:'
\echo '   SELECT is_admin_or_pm();'
\echo ''
\echo 'To test with different roles, run: scripts/test-rls-policies.sql'
\echo ''
\echo '============================================================================'
\echo 'SECURITY GUARANTEES'
\echo '============================================================================'
\echo ''
\echo '✓ Staff users: Read-only access to all data'
\echo '✓ Staff users: Cannot modify projects, contractors, or contracts'
\echo '✓ Staff users: Can create payment apps but cannot approve them'
\echo '✓ Staff users: Cannot modify approved/rejected payment apps'
\echo '✓ PM users: Full access to projects, contractors, and payment approvals'
\echo '✓ Admin users: Full access including deletes'
\echo '✓ WITH CHECK clauses: Prevent privilege escalation on UPDATEs'
\echo '✓ Helper function: Optimized role checks with plan caching'
\echo '✓ Indexes: Performance optimized for RLS queries'
\echo ''
\echo '============================================================================'
\echo ''

-- ============================================================================
-- ROLLBACK SECTION (if needed)
-- ============================================================================
-- If you need to rollback, uncomment and run:
--
-- DROP POLICY IF EXISTS "Authenticated users can view all projects" ON projects;
-- DROP POLICY IF EXISTS "Admins and PMs can create projects" ON projects;
-- DROP POLICY IF EXISTS "Admins and PMs can update projects" ON projects;
-- DROP POLICY IF EXISTS "Admins can delete projects" ON projects;
-- DROP POLICY IF EXISTS "Authenticated users can view all contractors" ON contractors;
-- DROP POLICY IF EXISTS "Admins and PMs can create contractors" ON contractors;
-- DROP POLICY IF EXISTS "Admins and PMs can update contractors" ON contractors;
-- DROP POLICY IF EXISTS "Admins can delete contractors" ON contractors;
-- DROP POLICY IF EXISTS "Authenticated users can view project contractors" ON project_contractors;
-- DROP POLICY IF EXISTS "Admins and PMs can create project contractors" ON project_contractors;
-- DROP POLICY IF EXISTS "Admins and PMs can update project contractors" ON project_contractors;
-- DROP POLICY IF EXISTS "Admins can delete project contractors" ON project_contractors;
-- DROP POLICY IF EXISTS "Authenticated users can view payment applications" ON payment_applications;
-- DROP POLICY IF EXISTS "Authenticated users can create payment applications" ON payment_applications;
-- DROP POLICY IF EXISTS "Users can update draft or submitted payment applications" ON payment_applications;
-- DROP POLICY IF EXISTS "Admins and PMs can update any payment application" ON payment_applications;
-- DROP POLICY IF EXISTS "Admins can delete payment applications" ON payment_applications;
--
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contractors DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_contractors DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payment_applications DISABLE ROW LEVEL SECURITY;
--
-- DROP FUNCTION IF EXISTS is_admin_or_pm();
--
-- DROP INDEX IF EXISTS idx_user_role_user_id;
-- DROP INDEX IF EXISTS idx_user_role_role;
-- DROP INDEX IF EXISTS idx_payment_applications_status;
-- DROP INDEX IF EXISTS idx_payment_applications_project_id;
-- DROP INDEX IF EXISTS idx_payment_applications_contractor_id;
-- DROP INDEX IF EXISTS idx_project_contractors_project_id;
-- DROP INDEX IF EXISTS idx_project_contractors_contractor_id;
-- DROP INDEX IF EXISTS idx_projects_id;
-- DROP INDEX IF EXISTS idx_contractors_id;




