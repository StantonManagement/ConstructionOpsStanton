-- ============================================================================
-- FIX RLS POLICIES FOR PROJECTS AND PROJECT_CONTRACTORS
-- ============================================================================
-- Purpose: Fix Row Level Security policies that are blocking project creation
--          and contractor assignments
-- Issue: RLS was enabled on tables but no policies were created, blocking all operations
-- Date: February 27, 2026
-- Related: TASKS_FROM_DAN_CHECKIN.md - Tasks 1 & 2
-- ============================================================================

-- ============================================================================
-- FIX 1: PROJECTS TABLE RLS POLICIES
-- ============================================================================

-- Enable Row Level Security on projects table (if not already enabled)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- Policy 1: Allow authenticated users to view all projects
CREATE POLICY "Authenticated users can view projects" ON projects
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users to create projects
CREATE POLICY "Authenticated users can create projects" ON projects
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow authenticated users to update projects
-- (In a multi-tenant system, you might want to restrict this to project owners,
--  but for now allowing all authenticated users as per business requirements)
CREATE POLICY "Authenticated users can update projects" ON projects
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users to delete projects
CREATE POLICY "Authenticated users can delete projects" ON projects
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- FIX 2: PROJECT_CONTRACTORS TABLE RLS POLICIES
-- ============================================================================

-- Enable Row Level Security on project_contractors table (if not already enabled)
ALTER TABLE project_contractors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Authenticated users can assign contractors" ON project_contractors;
DROP POLICY IF EXISTS "Authenticated users can update contractor assignments" ON project_contractors;
DROP POLICY IF EXISTS "Authenticated users can remove contractors" ON project_contractors;

-- Policy 1: Allow authenticated users to view all project-contractor assignments
CREATE POLICY "Authenticated users can view project contractors" ON project_contractors
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users to assign contractors to projects
CREATE POLICY "Authenticated users can assign contractors" ON project_contractors
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow authenticated users to update contractor assignments
CREATE POLICY "Authenticated users can update contractor assignments" ON project_contractors
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users to remove contractors from projects
CREATE POLICY "Authenticated users can remove contractors" ON project_contractors
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- FIX 3: BUDGET_LINE_ITEMS TABLE RLS POLICIES (if needed)
-- ============================================================================
-- The task mentions "assign contractors to budget lines" which might involve
-- budget_line_items table as well

-- Enable Row Level Security on budget_line_items table (if exists and if not already enabled)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'budget_line_items'
    ) THEN
        EXECUTE 'ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY';

        -- Drop existing policies if any
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view budget line items" ON budget_line_items';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create budget line items" ON budget_line_items';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update budget line items" ON budget_line_items';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete budget line items" ON budget_line_items';

        -- Create policies
        EXECUTE 'CREATE POLICY "Authenticated users can view budget line items" ON budget_line_items
            FOR SELECT USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can create budget line items" ON budget_line_items
            FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can update budget line items" ON budget_line_items
            FOR UPDATE USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can delete budget line items" ON budget_line_items
            FOR DELETE USING (auth.role() = ''authenticated'')';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('projects', 'project_contractors', 'budget_line_items')
    AND schemaname = 'public';

-- Verify policies exist
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE tablename IN ('projects', 'project_contractors', 'budget_line_items')
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST QUERIES (run these after migration to verify fixes)
-- ============================================================================

-- Test 1: Can authenticated users insert into projects?
-- (This should succeed after fix)
-- INSERT INTO projects (name, client_name, status) VALUES ('Test Project', 'Test Client', 'active');

-- Test 2: Can authenticated users insert into project_contractors?
-- (This should succeed after fix)
-- INSERT INTO project_contractors (project_id, contractor_id, contract_amount, contract_status)
-- VALUES (1, 1, 10000, 'active');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE projects IS 'Construction projects - RLS policies allow all authenticated users to perform CRUD operations';
COMMENT ON TABLE project_contractors IS 'Contractor assignments to projects - RLS policies allow all authenticated users to perform CRUD operations';

-- ============================================================================
-- NOTES FOR FUTURE
-- ============================================================================
-- 1. These policies allow ALL authenticated users to perform all operations
-- 2. For a multi-tenant system, you may want to restrict based on:
--    - User role (admin, pm, contractor)
--    - Project ownership (users table project_id or team membership)
--    - Organization/tenant isolation
-- 3. Update these policies when implementing proper role-based access control
-- 4. Current approach prioritizes fixing production bug over fine-grained permissions
-- ============================================================================
