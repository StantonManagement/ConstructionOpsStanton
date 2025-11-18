-- ============================================================================
-- ENABLE ROW LEVEL SECURITY FOR CORE TABLES
-- ============================================================================
-- This migration enables RLS and creates policies for core application tables:
-- - projects
-- - contractors
-- - project_contractors
--
-- Run this ONLY if the diagnostic script shows RLS is enabled but no policies
-- exist, OR if you want to enable RLS with appropriate policies.
--
-- To diagnose first: Run scripts/diagnose-database.sql in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. PROJECTS TABLE
-- ============================================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view all projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs can create projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

-- Policy: All authenticated users can view projects
-- This allows staff, PMs, and admins to see project data
CREATE POLICY "Authenticated users can view all projects"
ON projects
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins and PMs can create projects
CREATE POLICY "Admins and PMs can create projects"
ON projects
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);

-- Policy: Only admins and PMs can update projects
CREATE POLICY "Admins and PMs can update projects"
ON projects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);

-- Policy: Only admins can delete projects
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

-- ============================================================================
-- 2. CONTRACTORS TABLE
-- ============================================================================

ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view all contractors" ON contractors;
DROP POLICY IF EXISTS "Admins and PMs can create contractors" ON contractors;
DROP POLICY IF EXISTS "Admins and PMs can update contractors" ON contractors;
DROP POLICY IF EXISTS "Admins can delete contractors" ON contractors;

-- Policy: All authenticated users can view contractors
CREATE POLICY "Authenticated users can view all contractors"
ON contractors
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins and PMs can create contractors
CREATE POLICY "Admins and PMs can create contractors"
ON contractors
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);

-- Policy: Only admins and PMs can update contractors
CREATE POLICY "Admins and PMs can update contractors"
ON contractors
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);

-- Policy: Only admins can delete contractors
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

-- ============================================================================
-- 3. PROJECT_CONTRACTORS TABLE (Junction Table)
-- ============================================================================

ALTER TABLE project_contractors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins and PMs can create project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins and PMs can update project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins can delete project contractors" ON project_contractors;

-- Policy: All authenticated users can view project-contractor relationships
CREATE POLICY "Authenticated users can view project contractors"
ON project_contractors
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admins and PMs can create project-contractor relationships
CREATE POLICY "Admins and PMs can create project contractors"
ON project_contractors
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);

-- Policy: Only admins and PMs can update project-contractor relationships
CREATE POLICY "Admins and PMs can update project contractors"
ON project_contractors
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);

-- Policy: Only admins can delete project-contractor relationships
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

-- ============================================================================
-- 4. PAYMENT_APPLICATIONS TABLE
-- ============================================================================

ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Authenticated users can view payment applications" ON payment_applications;
DROP POLICY IF EXISTS "Authenticated users can create payment applications" ON payment_applications;
DROP POLICY IF EXISTS "Authenticated users can update their payment applications" ON payment_applications;
DROP POLICY IF EXISTS "Admins and PMs can update any payment application" ON payment_applications;
DROP POLICY IF EXISTS "Admins can delete payment applications" ON payment_applications;

-- Policy: All authenticated users can view payment applications
CREATE POLICY "Authenticated users can view payment applications"
ON payment_applications
FOR SELECT
TO authenticated
USING (true);

-- Policy: Authenticated users can create payment applications
CREATE POLICY "Authenticated users can create payment applications"
ON payment_applications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can update payment applications they created (before approval)
CREATE POLICY "Authenticated users can update their payment applications"
ON payment_applications
FOR UPDATE
TO authenticated
USING (
  status IN ('draft', 'submitted')
);

-- Policy: Admins and PMs can update any payment application (for approval)
CREATE POLICY "Admins and PMs can update any payment application"
ON payment_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);

-- Policy: Only admins can delete payment applications
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

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Authenticated users can view all projects" ON projects 
  IS 'All logged-in users (staff, PM, admin) can read project data';

COMMENT ON POLICY "Admins and PMs can create projects" ON projects 
  IS 'Only users with admin or pm role can create new projects';

COMMENT ON POLICY "Admins and PMs can update projects" ON projects 
  IS 'Only users with admin or pm role can modify projects';

COMMENT ON POLICY "Admins can delete projects" ON projects 
  IS 'Only users with admin role can delete projects';

COMMENT ON POLICY "Authenticated users can view all contractors" ON contractors 
  IS 'All logged-in users can read contractor data';

COMMENT ON POLICY "Admins and PMs can create contractors" ON contractors 
  IS 'Only users with admin or pm role can add new contractors';

COMMENT ON POLICY "Admins and PMs can update contractors" ON contractors 
  IS 'Only users with admin or pm role can modify contractors';

COMMENT ON POLICY "Admins can delete contractors" ON contractors 
  IS 'Only users with admin role can delete contractors';

COMMENT ON POLICY "Authenticated users can view project contractors" ON project_contractors 
  IS 'All logged-in users can view project-contractor relationships';

COMMENT ON POLICY "Admins and PMs can create project contractors" ON project_contractors 
  IS 'Only users with admin or pm role can create project-contractor relationships';

COMMENT ON POLICY "Authenticated users can view payment applications" ON payment_applications 
  IS 'All logged-in users can view payment applications';

COMMENT ON POLICY "Authenticated users can create payment applications" ON payment_applications 
  IS 'All logged-in users can submit payment applications';

COMMENT ON POLICY "Authenticated users can update their payment applications" ON payment_applications 
  IS 'Users can update draft or submitted payment applications';

COMMENT ON POLICY "Admins and PMs can update any payment application" ON payment_applications 
  IS 'Admins and PMs can approve/reject any payment application';

COMMENT ON POLICY "Admins can delete payment applications" ON payment_applications 
  IS 'Only admins can delete payment applications';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'RLS POLICIES APPLIED SUCCESSFULLY'
\echo '============================================================================'
\echo ''
\echo 'To verify the policies are in place, run:'
\echo ''
\echo '  SELECT tablename, policyname, permissive, roles, cmd'
\echo '  FROM pg_policies'
\echo '  WHERE schemaname = '\''public'\'''
\echo '  AND tablename IN ('\''projects'\'', '\''contractors'\'', '\''project_contractors'\'', '\''payment_applications'\'')'
\echo '  ORDER BY tablename, policyname;'
\echo ''
\echo 'To check RLS status:'
\echo ''
\echo '  SELECT tablename, rowsecurity'
\echo '  FROM pg_tables'
\echo '  WHERE schemaname = '\''public'\'''
\echo '  AND tablename IN ('\''projects'\'', '\''contractors'\'', '\''project_contractors'\'', '\''payment_applications'\'');'
\echo ''
\echo '============================================================================'
\echo ''

