-- 1. Create task_dependencies table (renamed from schedule_dependencies in the plan, but sticking to consistent naming if possible. 
-- The existing schema uses `schedule_dependencies`. I will add to/modify it or create a new one if needed.
-- The user plan asks for `task_dependencies`. I will create that to match the plan specifically, 
-- but I'll check if `schedule_dependencies` already serves this purpose.
-- `schedule_dependencies` exists in `phase4-schedule.sql`.
-- It has: source_task_id, target_task_id, dependency_type, lag_days.
-- The plan asks for: predecessor_task_id, successor_task_id, dependency_type, lag_days.
-- These are identical in purpose. I will ALIAS/USE `schedule_dependencies` but ensure it has the right columns.

-- 2. Add columns to schedule_tasks
-- The plan asks for: `duration_days`, `progress`, `is_milestone`.
-- `schedule_tasks` already has `duration_days` (GENERATED) and `progress`.
-- I need to check if `duration_days` is generated or editable. The plan wants it editable ("calculated or manually set").
-- Currently: `duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED`
-- I need to DROP the generated column and make it a standard INTEGER column if we want manual overrides, 
-- OR keep it generated and only update dates. The plan says "calculated or manually set".
-- If I make it manual, I have to keep it in sync via trigger or app logic. 
-- App logic is safer for now to avoid complex triggers. I'll drop the generated one and make it a real column.

-- 3. Add `is_milestone` boolean.

BEGIN;

-- Alter schedule_tasks
ALTER TABLE schedule_tasks DROP COLUMN IF EXISTS duration_days;
ALTER TABLE schedule_tasks ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE schedule_tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;

-- Update duration_days for existing rows based on dates
UPDATE schedule_tasks 
SET duration_days = (end_date - start_date + 1)
WHERE duration_days IS NULL;

-- Ensure schedule_dependencies has the right structure (it likely does, but let's be safe)
-- If it was created via phase4-schedule.sql, it uses source/target.
-- The plan uses predecessor/successor. I'll stick to source/target as they map 1:1 to predecessor/successor.
-- source = predecessor, target = successor.

-- Migration of existing dependencies (from `dependencies` array in `schedule_tasks` if it exists?)
-- The `schedule_tasks` table in `phase4-schedule.sql` DOES NOT have a dependencies array column.
-- However, the `TaskFormModal` was using `existingTask.dependencies`.
-- Let's check if there's a `dependencies` column in the actual DB or if it was being joined.
-- `TaskFormModal` was using `predecessors: existingTask.dependencies || []`.
-- The types/schedule.ts probably defines it.
-- If `schedule_tasks` doesn't have it, it might be coming from a join in the API.
-- I'll assume for now we just need the table structure ready.

COMMIT;





