-- Fix schedule_tasks schema to allow manual duration and milestones
-- This handles cases where previous migrations may have failed or been skipped.

-- 1. Ensure duration_days is a regular integer column (not generated)
DO $$ 
BEGIN
    -- Check if duration_days is generated
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_tasks' 
        AND column_name = 'duration_days' 
        AND is_generated = 'ALWAYS'
    ) THEN
        ALTER TABLE schedule_tasks DROP COLUMN duration_days;
        ALTER TABLE schedule_tasks ADD COLUMN duration_days INTEGER;
        
        -- Update existing rows
        UPDATE schedule_tasks 
        SET duration_days = (end_date - start_date + 1)
        WHERE duration_days IS NULL;
    END IF;
    
    -- If column doesn't exist at all, add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'schedule_tasks' 
        AND column_name = 'duration_days'
    ) THEN
        ALTER TABLE schedule_tasks ADD COLUMN duration_days INTEGER;
        
        -- Update existing rows
        UPDATE schedule_tasks 
        SET duration_days = (end_date - start_date + 1)
        WHERE duration_days IS NULL;
    END IF;
END $$;

-- 2. Ensure is_milestone exists
ALTER TABLE schedule_tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;

-- 3. Ensure schedule_dependencies table exists and has correct columns
CREATE TABLE IF NOT EXISTS schedule_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID REFERENCES schedule_tasks(id) ON DELETE CASCADE NOT NULL,
  target_task_id UUID REFERENCES schedule_tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')) DEFAULT 'finish_to_start',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_task_id, target_task_id)
);

-- 4. Enable RLS on dependencies if not already enabled
ALTER TABLE schedule_dependencies ENABLE ROW LEVEL SECURITY;

-- 5. Create policies if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_dependencies' AND policyname = 'Dependencies are viewable by authenticated users') THEN
        CREATE POLICY "Dependencies are viewable by authenticated users" ON schedule_dependencies FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_dependencies' AND policyname = 'Dependencies are insertable by authenticated users') THEN
        CREATE POLICY "Dependencies are insertable by authenticated users" ON schedule_dependencies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_dependencies' AND policyname = 'Dependencies are updateable by authenticated users') THEN
        CREATE POLICY "Dependencies are updateable by authenticated users" ON schedule_dependencies FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_dependencies' AND policyname = 'Dependencies are deletable by authenticated users') THEN
        CREATE POLICY "Dependencies are deletable by authenticated users" ON schedule_dependencies FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;






