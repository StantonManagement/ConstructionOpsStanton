-- ============================================================================
-- DATABASE DIAGNOSTIC QUERY
-- ============================================================================
-- This script helps diagnose common database setup issues that can cause
-- infinite loading states or data fetching errors.
-- 
-- Run this in your Supabase SQL Editor to check your database configuration.
-- ============================================================================

\echo '============================================================================'
\echo 'DATABASE DIAGNOSTIC REPORT'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- 1. CHECK IF CORE TABLES EXIST
-- ============================================================================
\echo '1. Checking if core tables exist...'
\echo ''

SELECT 
    'projects' AS table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'projects'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status;

SELECT 
    'contractors' AS table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'contractors'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status;

SELECT 
    'contracts' AS table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'contracts'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status;

SELECT 
    'user_role' AS table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_role'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status;

SELECT 
    'project_contractors' AS table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'project_contractors'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status;

SELECT 
    'payment_applications' AS table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'payment_applications'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END AS status;

\echo ''

-- ============================================================================
-- 2. CHECK ROW LEVEL SECURITY (RLS) STATUS
-- ============================================================================
\echo '2. Checking Row Level Security (RLS) status...'
\echo ''

SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✓ ENABLED'
        ELSE '✗ DISABLED'
    END AS rls_status
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename IN ('projects', 'contractors', 'project_contractors', 'payment_applications', 'user_role')
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 3. CHECK RLS POLICIES
-- ============================================================================
\echo '3. Checking RLS policies for authenticated users...'
\echo ''

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd AS operation,
    qual AS using_expression,
    with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename IN ('projects', 'contractors', 'project_contractors', 'payment_applications', 'user_role')
ORDER BY tablename, policyname;

\echo ''

-- ============================================================================
-- 4. CHECK TABLE RELATIONSHIPS
-- ============================================================================
\echo '4. Checking foreign key relationships...'
\echo ''

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('projects', 'contractors', 'contracts', 'user_role')
ORDER BY tc.table_name;

\echo ''

-- ============================================================================
-- 5. CHECK DATA COUNTS
-- ============================================================================
\echo '5. Checking data counts in tables...'
\echo ''

DO $$
DECLARE
    project_count INTEGER;
    contractor_count INTEGER;
    contract_count INTEGER;
    user_role_count INTEGER;
BEGIN
    -- Check projects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        SELECT COUNT(*) INTO project_count FROM projects;
        RAISE NOTICE 'Projects: % rows', project_count;
    ELSE
        RAISE NOTICE 'Projects: TABLE DOES NOT EXIST';
    END IF;

    -- Check contractors
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractors') THEN
        SELECT COUNT(*) INTO contractor_count FROM contractors;
        RAISE NOTICE 'Contractors: % rows', contractor_count;
    ELSE
        RAISE NOTICE 'Contractors: TABLE DOES NOT EXIST';
    END IF;

    -- Check contracts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        SELECT COUNT(*) INTO contract_count FROM contracts;
        RAISE NOTICE 'Contracts: % rows', contract_count;
    ELSE
        RAISE NOTICE 'Contracts: TABLE DOES NOT EXIST';
    END IF;

    -- Check user_role
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_role') THEN
        SELECT COUNT(*) INTO user_role_count FROM user_role;
        RAISE NOTICE 'User Roles: % rows', user_role_count;
    ELSE
        RAISE NOTICE 'User Roles: TABLE DOES NOT EXIST';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- 6. CHECK FOR COMMON ISSUES
-- ============================================================================
\echo '6. Checking for common issues...'
\echo ''

-- Check if contracts table has proper columns for relationships
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'project_id'
        ) THEN
            RAISE WARNING '⚠ contracts table missing project_id column';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contracts' AND column_name = 'subcontractor_id'
        ) THEN
            RAISE WARNING '⚠ contracts table missing subcontractor_id column';
        END IF;
    END IF;
END $$;

\echo ''
\echo '============================================================================'
\echo 'DIAGNOSTIC REPORT COMPLETE'
\echo '============================================================================'
\echo ''
\echo 'If you see any MISSING tables or RLS issues, run the appropriate migration'
\echo 'scripts to fix them:'
\echo '  - scripts/create-user-role-table.sql (for user_role table)'
\echo '  - Your main database schema setup scripts (for projects, contractors, contracts)'
\echo ''


