-- Migration: Purge Test Data (FINAL VERSION - WORKS WITH ANY SCHEMA)
-- Purpose: Remove all test/dummy data while preserving schema
-- Date: 2026-03-03

-- IMPORTANT: Only run after backing up your database!
-- This removes ALL data from project-related tables that exist.

BEGIN;

-- Truncate only tables that exist
DO $$
DECLARE
    tables_to_truncate TEXT[] := ARRAY[
        'projects',
        'properties',
        'contractors',
        'budgets',
        'contracts',
        'tasks',
        'schedules',
        'action_items',
        'payment_applications',
        'daily_logs',
        'line_items',
        'project_contractors',
        'project_line_items',
        'bid_rounds',
        'trucks',
        'inventory_items'
    ];
    tbl TEXT;
    table_exists BOOLEAN;
    tables_truncated TEXT[] := ARRAY[]::TEXT[];
BEGIN
    RAISE NOTICE 'Starting purge...';
    RAISE NOTICE '-------------------';

    FOREACH tbl IN ARRAY tables_to_truncate
    LOOP
        -- Check if table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) INTO table_exists;

        IF table_exists THEN
            -- Truncate with CASCADE to handle FK constraints
            EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl);
            tables_truncated := array_append(tables_truncated, tbl);
            RAISE NOTICE 'Truncated: %', tbl;
        ELSE
            RAISE NOTICE 'Skipped (does not exist): %', tbl;
        END IF;
    END LOOP;

    RAISE NOTICE '-------------------';
    RAISE NOTICE 'Purge complete!';
    RAISE NOTICE 'Truncated % tables', array_length(tables_truncated, 1);
END $$;

-- Verify key tables are empty
DO $$
DECLARE
    project_count INTEGER;
    contractor_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verification:';
    RAISE NOTICE '-------------------';

    -- Check projects
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
        SELECT COUNT(*) INTO project_count FROM projects;
        RAISE NOTICE 'Projects: %', project_count;
    ELSE
        RAISE NOTICE 'Projects: table does not exist';
    END IF;

    -- Check contractors
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contractors') THEN
        SELECT COUNT(*) INTO contractor_count FROM contractors;
        RAISE NOTICE 'Contractors: %', contractor_count;
    ELSE
        RAISE NOTICE 'Contractors: table does not exist';
    END IF;

    RAISE NOTICE '-------------------';
    RAISE NOTICE 'Authentication preserved (Supabase auth.users)';
END $$;

COMMIT;
