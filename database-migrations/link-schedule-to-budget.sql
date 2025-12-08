-- Migration: Add budget_category_id to schedule_tasks
-- Description: Links schedule tasks to property budget categories for cash flow projection
-- Phase: A

-- 1. Add column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedule_tasks' AND column_name = 'budget_category_id') THEN
        ALTER TABLE schedule_tasks 
        ADD COLUMN budget_category_id INTEGER REFERENCES property_budgets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_budget_category_id ON schedule_tasks(budget_category_id);

-- 3. Add comment
COMMENT ON COLUMN schedule_tasks.budget_category_id IS 'Link to property_budgets table for cash flow projections';





