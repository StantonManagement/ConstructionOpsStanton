-- Fix missing columns in schedule_tasks table
-- This migration ensures that is_milestone and other fields required by the frontend exist.

BEGIN;

-- 1. Add is_milestone
ALTER TABLE schedule_tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;

-- 2. Add budget_category_id (if missing)
ALTER TABLE schedule_tasks ADD COLUMN IF NOT EXISTS budget_category_id INTEGER REFERENCES property_budgets(id) ON DELETE SET NULL;

-- 3. Add progress (if missing)
ALTER TABLE schedule_tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- 4. duration_days
-- We want this to be a regular column, not generated, to allow manual overrides.
-- If it is generated, we drop and recreate.
DO $$
DECLARE
    is_generated BOOLEAN;
BEGIN
    SELECT is_generated = 'ALWAYS' 
    INTO is_generated
    FROM information_schema.columns 
    WHERE table_name = 'schedule_tasks' AND column_name = 'duration_days';

    IF is_generated THEN
        ALTER TABLE schedule_tasks DROP COLUMN duration_days;
        ALTER TABLE schedule_tasks ADD COLUMN duration_days INTEGER;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedule_tasks' AND column_name = 'duration_days') THEN
        ALTER TABLE schedule_tasks ADD COLUMN duration_days INTEGER;
    END IF;
END $$;

COMMIT;


