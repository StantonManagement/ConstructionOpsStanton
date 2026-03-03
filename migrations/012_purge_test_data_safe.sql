-- Migration: Purge Test Data (SAFE VERSION)
-- Purpose: Remove all test/dummy data while preserving schema and structure
-- Date: 2026-03-03
-- Task: Task 11 - Data Migration

-- IMPORTANT: This script removes ALL data from project-related tables.
-- Only run this after:
-- 1. Backing up the database
-- 2. Confirming with Dan that all data is test data
-- 3. Having real project data ready to import
-- 4. Collecting real project data using REAL_PROJECT_DATA_TEMPLATE.md

-- WARNING: This is a destructive operation. Make sure you have a backup!

BEGIN;

-- Helper function to safely delete from table if it exists
DO $$
DECLARE
    tbl_name TEXT;
    tables_to_purge TEXT[] := ARRAY[
        -- Most dependent tables first (leaf nodes)
        'lien_waivers',
        'payment_application_photos',
        'payment_applications',
        'daily_log_photos',
        'daily_log_audio',
        'daily_logs',
        'daily_log_requests',
        'punch_list_photos',
        'punch_list_comments',
        'punch_list_items',
        'bid_responses',
        'bid_invitations',
        'bid_rounds',
        'change_orders',
        'task_dependencies',
        'tasks',
        'schedule_milestones',
        'schedules',
        'template_tasks',
        'scope_templates',
        'budget_payments',
        'draw_line_items',
        'draws',
        'loan_budget_items',
        'loans',
        'project_contractors',
        'project_line_items',  -- Added: must come before line_items and contracts
        'line_items',
        'budgets',
        'contracts',
        'action_items',
        'inventory_transactions',
        'inventory_locations',
        'inventory_items',
        'trucks',
        'projects',
        'properties',
        'locations',
        'portfolios',
        'entities',
        'funding_sources',
        'warranty_claims',
        'warranties'
    ];
    deleted_count INTEGER;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting safe test data purge...';
    RAISE NOTICE '----------------------------------------';

    FOREACH tbl_name IN ARRAY tables_to_purge
    LOOP
        -- Check if table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = tbl_name
        ) INTO table_exists;

        IF table_exists THEN
            -- Execute delete and get count
            EXECUTE format('DELETE FROM %I', tbl_name);
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % rows from %', deleted_count, tbl_name;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', tbl_name;
        END IF;
    END LOOP;

    -- Special handling for photos and documents (conditional delete)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'photos') THEN
        DELETE FROM photos WHERE project_id IS NOT NULL;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % project photos from photos table', deleted_count;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
        DELETE FROM documents WHERE project_id IS NOT NULL;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % project documents from documents table', deleted_count;
    END IF;

    -- Optional: Delete contractors (uncomment if needed)
    -- IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contractors') THEN
    --     DELETE FROM contractors;
    --     GET DIAGNOSTICS deleted_count = ROW_COUNT;
    --     RAISE NOTICE 'Deleted % contractors', deleted_count;
    -- END IF;

    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Purge complete!';
END $$;

-- Verify data was purged
DO $$
DECLARE
    project_count INTEGER;
    contractor_count INTEGER;
    payment_count INTEGER;
    user_count INTEGER;
    users_table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '----------------------------------------';

    -- Check key tables
    SELECT COUNT(*) INTO project_count FROM projects;
    RAISE NOTICE 'Projects remaining: %', project_count;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contractors') THEN
        SELECT COUNT(*) INTO contractor_count FROM contractors;
        RAISE NOTICE 'Contractors remaining: %', contractor_count;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_applications') THEN
        SELECT COUNT(*) INTO payment_count FROM payment_applications;
        RAISE NOTICE 'Payment applications remaining: %', payment_count;
    END IF;

    -- Check if users table exists (might be in auth schema instead of public)
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
    ) INTO users_table_exists;

    IF users_table_exists THEN
        SELECT COUNT(*) INTO user_count FROM users;
        RAISE NOTICE 'Users preserved: %', user_count;
    ELSE
        RAISE NOTICE 'Users table not in public schema (likely using Supabase auth.users)';
    END IF;

    IF project_count > 0 THEN
        RAISE WARNING 'Some projects were not deleted (likely due to FK constraints)';
    END IF;

    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Purge complete! Authentication data preserved.';
END $$;

COMMIT;

-- Rollback command (if you need to undo immediately):
-- ROLLBACK;

-- Post-migration verification queries (run these manually if needed):
/*
-- Check that tables are empty
SELECT
    (SELECT COUNT(*) FROM projects) as projects,
    (SELECT COUNT(*) FROM contractors) as contractors,
    (SELECT COUNT(*) FROM budgets) as budgets,
    (SELECT COUNT(*) FROM tasks) as tasks;

-- Note: Users are in auth schema (auth.users), not public schema
*/
