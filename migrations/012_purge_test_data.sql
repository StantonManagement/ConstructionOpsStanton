-- Migration: Purge Test Data
-- Purpose: Remove all test/dummy data while preserving schema and structure
-- Date: 2026-03-03
-- Task: Task 11 - Data Migration

-- IMPORTANT: This script removes ALL data from project-related tables.
-- Only run this after:
-- 1. Backing up the database
-- 2. Confirming with Dan that all data is test data
-- 3. Having real project data ready to import

-- WARNING: This is a destructive operation. Make sure you have a backup!

BEGIN;

-- Step 1: Disable foreign key checks temporarily (if needed for cascade deletes)
-- (PostgreSQL doesn't have a global setting, but CASCADE will handle it)

-- Step 2: Delete data in reverse dependency order to avoid FK violations

-- Delete payment-related data
DELETE FROM lien_waivers;
DELETE FROM payment_application_photos;
DELETE FROM payment_applications;

-- Delete daily log data
DELETE FROM daily_log_photos;
DELETE FROM daily_log_audio;
DELETE FROM daily_logs;
DELETE FROM daily_log_requests;

-- Delete punch list data
DELETE FROM punch_list_photos;
DELETE FROM punch_list_comments;
DELETE FROM punch_list_items;

-- Delete bid-related data
DELETE FROM bid_responses;
DELETE FROM bid_invitations;
DELETE FROM bid_rounds;

-- Delete change orders
DELETE FROM change_orders;

-- Delete task and schedule data
DELETE FROM task_dependencies;
DELETE FROM tasks;
DELETE FROM schedule_milestones;
DELETE FROM schedules;
DELETE FROM template_tasks;
DELETE FROM scope_templates;

-- Delete budget and contractor assignments
DELETE FROM budget_payments;
DELETE FROM draw_line_items;
DELETE FROM draws;
DELETE FROM loan_budget_items;
DELETE FROM loans;
DELETE FROM project_contractors;
DELETE FROM line_items;
DELETE FROM budgets;
DELETE FROM contracts;

-- Delete project photos and documents
DELETE FROM photos WHERE project_id IS NOT NULL;
DELETE FROM documents WHERE project_id IS NOT NULL;

-- Delete action items (if table exists)
DELETE FROM action_items WHERE TRUE;

-- Delete inventory transactions and locations
DELETE FROM inventory_transactions;
DELETE FROM inventory_locations;
DELETE FROM inventory_items;
DELETE FROM trucks;

-- Delete projects and properties
DELETE FROM projects;
DELETE FROM properties;
DELETE FROM locations WHERE portfolio_id IS NOT NULL;
DELETE FROM portfolios;
DELETE FROM entities;

-- Delete contractors (optional - may want to keep some)
-- Uncomment if you want to purge ALL contractors too
-- DELETE FROM contractors;

-- Delete funding sources
DELETE FROM funding_sources;

-- Delete warranties
DELETE FROM warranty_claims;
DELETE FROM warranties;

-- Step 3: Reset sequences (optional - starts IDs from 1 again)
-- Only uncomment if you want IDs to start from 1 for new data

-- ALTER SEQUENCE projects_id_seq RESTART WITH 1;
-- ALTER SEQUENCE properties_id_seq RESTART WITH 1;
-- ALTER SEQUENCE contractors_id_seq RESTART WITH 1;
-- ALTER SEQUENCE budgets_id_seq RESTART WITH 1;
-- ALTER SEQUENCE line_items_id_seq RESTART WITH 1;
-- ALTER SEQUENCE payment_applications_id_seq RESTART WITH 1;
-- ALTER SEQUENCE daily_logs_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tasks_id_seq RESTART WITH 1;
-- ALTER SEQUENCE action_items_id_seq RESTART WITH 1;

-- Step 4: Verify tables are empty
DO $$
DECLARE
    project_count INTEGER;
    contractor_count INTEGER;
    payment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO contractor_count FROM contractors;
    SELECT COUNT(*) INTO payment_count FROM payment_applications;

    RAISE NOTICE 'Projects remaining: %', project_count;
    RAISE NOTICE 'Contractors remaining: %', contractor_count;
    RAISE NOTICE 'Payment applications remaining: %', payment_count;

    IF project_count > 0 THEN
        RAISE NOTICE 'Warning: Some projects were not deleted (likely due to FK constraints)';
    END IF;
END $$;

-- Step 5: Keep user accounts and roles
-- DO NOT delete from users or user_role tables

COMMIT;

-- Rollback command (if you need to undo immediately):
-- ROLLBACK;

-- Post-migration verification queries:
-- Run these after committing to verify data was purged:

-- SELECT COUNT(*) FROM projects;           -- Should be 0
-- SELECT COUNT(*) FROM properties;         -- Should be 0
-- SELECT COUNT(*) FROM payment_applications; -- Should be 0
-- SELECT COUNT(*) FROM daily_logs;         -- Should be 0
-- SELECT COUNT(*) FROM tasks;              -- Should be 0
-- SELECT COUNT(*) FROM budgets;            -- Should be 0
-- SELECT COUNT(*) FROM action_items;       -- Should be 0

-- SELECT COUNT(*) FROM users;              -- Should NOT be 0 (preserved)
-- SELECT COUNT(*) FROM user_role;          -- Should NOT be 0 (preserved)
