-- Migration: Purge Test Data (SIMPLE VERSION - GUARANTEED TO WORK)
-- Purpose: Remove all test/dummy data while preserving schema
-- Date: 2026-03-03

-- IMPORTANT: Only run after backing up your database!
-- This removes ALL data from project-related tables.

-- Run this entire script at once - don't run statements individually!

BEGIN;

-- Delete all data (order doesn't matter with CASCADE)
TRUNCATE TABLE
  projects,
  properties,
  contractors,
  budgets,
  contracts,
  tasks,
  schedules,
  action_items
CASCADE;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Purge complete!';
  RAISE NOTICE 'Projects: %', (SELECT COUNT(*) FROM projects);
  RAISE NOTICE 'Contractors: %', (SELECT COUNT(*) FROM contractors);
  RAISE NOTICE 'Authentication preserved (auth.users)';
END $$;

COMMIT;
