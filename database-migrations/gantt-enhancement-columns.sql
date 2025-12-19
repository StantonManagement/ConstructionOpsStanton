-- Migration: Add Gantt enhancement columns to schedule_tasks
-- This migration adds columns needed for advanced Gantt functionality

-- Add is_milestone column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schedule_tasks' AND column_name = 'is_milestone'
    ) THEN
        ALTER TABLE schedule_tasks ADD COLUMN is_milestone BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add constraint_type column for scheduling constraints
-- ASAP = As Soon As Possible (default behavior)
-- MUST_START_ON = Task must start on constraint_date
-- START_NO_EARLIER = Task cannot start before constraint_date
-- START_NO_LATER = Task cannot start after constraint_date
-- MUST_FINISH_ON = Task must finish on constraint_date
-- FINISH_NO_EARLIER = Task cannot finish before constraint_date
-- FINISH_NO_LATER = Task cannot finish after constraint_date
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schedule_tasks' AND column_name = 'constraint_type'
    ) THEN
        ALTER TABLE schedule_tasks ADD COLUMN constraint_type VARCHAR(20) 
            CHECK (constraint_type IN (
                'ASAP', 
                'MUST_START_ON', 
                'START_NO_EARLIER', 
                'START_NO_LATER',
                'MUST_FINISH_ON',
                'FINISH_NO_EARLIER',
                'FINISH_NO_LATER'
            ));
    END IF;
END $$;

-- Add constraint_date column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schedule_tasks' AND column_name = 'constraint_date'
    ) THEN
        ALTER TABLE schedule_tasks ADD COLUMN constraint_date DATE;
    END IF;
END $$;

-- Add budget_category_id column if not exists (links task to budget)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schedule_tasks' AND column_name = 'budget_category_id'
    ) THEN
        ALTER TABLE schedule_tasks ADD COLUMN budget_category_id BIGINT 
            REFERENCES project_budget_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index on budget_category_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_budget_category 
    ON schedule_tasks(budget_category_id);

-- Create index on is_milestone for filtering milestones
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_milestone 
    ON schedule_tasks(is_milestone) WHERE is_milestone = true;

COMMENT ON COLUMN schedule_tasks.is_milestone IS 'Milestones are zero-duration markers for key project dates';
COMMENT ON COLUMN schedule_tasks.constraint_type IS 'Scheduling constraint type that affects auto-scheduling behavior';
COMMENT ON COLUMN schedule_tasks.constraint_date IS 'Date used with constraint_type for scheduling constraints';
