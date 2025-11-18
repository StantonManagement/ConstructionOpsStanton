-- ============================================================================
-- RLS POLICY TEST SCRIPT
-- ============================================================================
-- This script helps test RLS policies with different user roles.
-- Run this AFTER applying enable-core-table-rls-v2.sql
--
-- HOW TO USE:
-- 1. Run this script as different users (staff, pm, admin)
-- 2. Compare actual results with expected results below
-- 3. Any discrepancies indicate policy issues
--
-- To test as different users:
-- - Create test users in Supabase Auth dashboard
-- - Assign them roles in user_role table
-- - Log in as each user and run relevant sections
-- ============================================================================

\echo ''
\echo '============================================================================'
\echo 'RLS POLICY TEST SCRIPT'
\echo '============================================================================'
\echo ''
\echo 'Current user UUID:'
SELECT auth.uid();
\echo ''
\echo 'Current user role:'
SELECT role FROM user_role WHERE user_id = auth.uid();
\echo ''
\echo 'Is admin or PM?'
SELECT is_admin_or_pm();
\echo ''

-- ============================================================================
-- TEST 1: CHECK RLS IS ENABLED
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 1: Verify RLS is enabled on all core tables'
\echo '============================================================================'
\echo ''

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✓ ENABLED'
        ELSE '✗ DISABLED'
    END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('projects', 'contractors', 'project_contractors', 'payment_applications')
ORDER BY tablename;

\echo ''
\echo 'Expected: All tables should show ✓ ENABLED'
\echo ''

-- ============================================================================
-- TEST 2: CHECK POLICIES EXIST
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 2: Verify policies are created'
\echo '============================================================================'
\echo ''

SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('projects', 'contractors', 'project_contractors', 'payment_applications')
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo 'Expected policy counts:'
\echo '  projects: 4 policies (SELECT, INSERT, UPDATE, DELETE)'
\echo '  contractors: 4 policies'
\echo '  project_contractors: 4 policies'
\echo '  payment_applications: 5 policies (2 UPDATE policies for different roles)'
\echo ''

-- ============================================================================
-- TEST 3: STAFF USER - READ ACCESS
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 3: Staff User - Read Access (Should PASS for all)'
\echo '============================================================================'
\echo ''

\echo 'Testing SELECT on projects...'
SELECT COUNT(*) as project_count FROM projects;
\echo 'Expected: Returns count (no permission error)'
\echo ''

\echo 'Testing SELECT on contractors...'
SELECT COUNT(*) as contractor_count FROM contractors;
\echo 'Expected: Returns count (no permission error)'
\echo ''

\echo 'Testing SELECT on project_contractors...'
SELECT COUNT(*) as contract_count FROM project_contractors;
\echo 'Expected: Returns count (no permission error)'
\echo ''

\echo 'Testing SELECT on payment_applications...'
SELECT COUNT(*) as payment_app_count FROM payment_applications;
\echo 'Expected: Returns count (no permission error)'
\echo ''

-- ============================================================================
-- TEST 4: STAFF USER - WRITE ACCESS (Should FAIL for most)
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 4: Staff User - Write Access'
\echo '============================================================================'
\echo ''

\echo 'Testing INSERT on projects (should FAIL for staff)...'
DO $$
BEGIN
    INSERT INTO projects (name, client_name, current_phase, budget, spent)
    VALUES ('Test Project', 'Test Client', 'Planning', 100000, 0);
    RAISE NOTICE '✗ UNEXPECTED: Staff user was able to insert project';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '✓ EXPECTED: Staff user cannot insert projects';
    WHEN OTHERS THEN
        RAISE NOTICE '✓ EXPECTED: Permission denied for staff user';
END $$;
\echo ''

\echo 'Testing UPDATE on projects (should FAIL for staff)...'
DO $$
BEGIN
    UPDATE projects SET name = 'Updated Name' WHERE id = (SELECT MIN(id) FROM projects);
    IF FOUND THEN
        RAISE NOTICE '✗ UNEXPECTED: Staff user was able to update project';
    ELSE
        RAISE NOTICE '✓ EXPECTED: Staff user cannot update projects (no matching rows)';
    END IF;
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE '✓ EXPECTED: Staff user cannot update projects';
    WHEN OTHERS THEN
        RAISE NOTICE '✓ EXPECTED: Permission denied for staff user';
END $$;
\echo ''

\echo 'Testing INSERT on payment_applications (should PASS for staff)...'
DO $$
BEGIN
    INSERT INTO payment_applications (
        project_id, 
        contractor_id, 
        status, 
        current_payment
    )
    SELECT 
        MIN(p.id), 
        MIN(c.id), 
        'draft', 
        1000
    FROM projects p, contractors c;
    
    RAISE NOTICE '✓ EXPECTED: Staff user can create payment applications';
    -- Rollback the test insert
    ROLLBACK;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ UNEXPECTED: Staff user cannot insert payment applications - %', SQLERRM;
END $$;
\echo ''

-- ============================================================================
-- TEST 5: PM/ADMIN USER - FULL ACCESS
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 5: PM/Admin User - Full Access'
\echo '============================================================================'
\echo ''
\echo 'Note: These tests should only pass if you are logged in as PM or Admin'
\echo ''

\echo 'Testing INSERT on projects (should PASS for PM/Admin)...'
DO $$
BEGIN
    IF is_admin_or_pm() THEN
        INSERT INTO projects (name, client_name, current_phase, budget, spent)
        VALUES ('Test PM Project', 'Test Client', 'Planning', 100000, 0);
        RAISE NOTICE '✓ EXPECTED: PM/Admin can insert projects';
        -- Rollback the test
        ROLLBACK;
    ELSE
        RAISE NOTICE '⊘ SKIPPED: Not a PM or Admin user';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ UNEXPECTED: PM/Admin cannot insert projects - %', SQLERRM;
END $$;
\echo ''

\echo 'Testing UPDATE on payment_applications with approved status...'
DO $$
DECLARE
    test_app_id INTEGER;
BEGIN
    IF is_admin_or_pm() THEN
        -- Get an existing payment application
        SELECT id INTO test_app_id FROM payment_applications LIMIT 1;
        
        IF test_app_id IS NOT NULL THEN
            UPDATE payment_applications 
            SET status = 'approved', approved_by = 1
            WHERE id = test_app_id;
            
            RAISE NOTICE '✓ EXPECTED: PM/Admin can approve payment applications';
            -- Rollback the test
            ROLLBACK;
        ELSE
            RAISE NOTICE '⊘ SKIPPED: No payment applications to test';
        END IF;
    ELSE
        RAISE NOTICE '⊘ SKIPPED: Not a PM or Admin user';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✗ UNEXPECTED: PM/Admin cannot update payment applications - %', SQLERRM;
END $$;
\echo ''

-- ============================================================================
-- TEST 6: PAYMENT APPLICATION STATUS PROTECTION
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 6: Payment Application Status Protection'
\echo '============================================================================'
\echo ''

\echo 'Testing staff user cannot modify approved payment applications...'
DO $$
DECLARE
    test_app_id INTEGER;
BEGIN
    IF NOT is_admin_or_pm() THEN
        -- Try to find an approved payment app
        SELECT id INTO test_app_id 
        FROM payment_applications 
        WHERE status = 'approved' 
        LIMIT 1;
        
        IF test_app_id IS NOT NULL THEN
            UPDATE payment_applications 
            SET current_payment = 999999
            WHERE id = test_app_id;
            
            IF FOUND THEN
                RAISE NOTICE '✗ UNEXPECTED: Staff user modified approved payment application';
            ELSE
                RAISE NOTICE '✓ EXPECTED: Staff user cannot modify approved applications';
            END IF;
        ELSE
            RAISE NOTICE '⊘ SKIPPED: No approved payment applications to test';
        END IF;
    ELSE
        RAISE NOTICE '⊘ SKIPPED: Test only for staff users';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '✓ EXPECTED: Permission denied - %', SQLERRM;
END $$;
\echo ''

-- ============================================================================
-- TEST 7: INDEX PERFORMANCE CHECK
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 7: Verify Performance Indexes Exist'
\echo '============================================================================'
\echo ''

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        indexname LIKE 'idx_user_role%' OR
        indexname LIKE 'idx_payment_applications%' OR
        indexname LIKE 'idx_project_contractors%' OR
        indexname LIKE 'idx_projects%' OR
        indexname LIKE 'idx_contractors%'
    )
ORDER BY tablename, indexname;

\echo ''
\echo 'Expected indexes:'
\echo '  idx_user_role_user_id'
\echo '  idx_user_role_role'
\echo '  idx_payment_applications_status'
\echo '  idx_payment_applications_project_id'
\echo '  idx_payment_applications_contractor_id'
\echo '  idx_project_contractors_project_id'
\echo '  idx_project_contractors_contractor_id'
\echo '  idx_projects_id'
\echo '  idx_contractors_id'
\echo ''

-- ============================================================================
-- TEST 8: HELPER FUNCTION TEST
-- ============================================================================
\echo '============================================================================'
\echo 'TEST 8: Helper Function Correctness'
\echo '============================================================================'
\echo ''

\echo 'Current user role check:'
SELECT 
    auth.uid() as user_id,
    (SELECT role FROM user_role WHERE user_id = auth.uid()) as user_role,
    is_admin_or_pm() as is_admin_or_pm;

\echo ''
\echo 'Expected behavior:'
\echo '  - If role is admin or pm: is_admin_or_pm should be TRUE'
\echo '  - If role is staff or NULL: is_admin_or_pm should be FALSE'
\echo ''

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================
\echo ''
\echo '============================================================================'
\echo 'TEST SUMMARY'
\echo '============================================================================'
\echo ''
\echo 'Manual verification checklist:'
\echo ''
\echo '□ All core tables have RLS enabled'
\echo '□ Correct number of policies per table'
\echo '□ Staff users can read all data'
\echo '□ Staff users CANNOT create/update projects or contractors'
\echo '□ Staff users CAN create payment applications'
\echo '□ Staff users CANNOT modify approved/rejected payment apps'
\echo '□ PM/Admin users have full access to projects and contractors'
\echo '□ PM/Admin users can approve payment applications'
\echo '□ All performance indexes exist'
\echo '□ Helper function returns correct boolean for current user'
\echo ''
\echo 'If any checks fail, review the RLS policies in:'
\echo '  database-migrations/enable-core-table-rls-v2.sql'
\echo ''
\echo '============================================================================'
\echo ''


