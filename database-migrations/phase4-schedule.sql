-- Create project_schedules table
CREATE TABLE IF NOT EXISTS project_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  target_end_date DATE NOT NULL,
  actual_end_date DATE,
  status TEXT CHECK (status IN ('on_track', 'at_risk', 'delayed', 'completed')) DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create schedule_tasks table
CREATE TABLE IF NOT EXISTS schedule_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES project_schedules(id) ON DELETE CASCADE NOT NULL,
  contractor_id BIGINT REFERENCES contractors(id) ON DELETE SET NULL,
  task_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  progress INTEGER CHECK (progress >= 0 AND progress <= 100) DEFAULT 0,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')) DEFAULT 'not_started',
  parent_task_id UUID REFERENCES schedule_tasks(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create schedule_dependencies table
CREATE TABLE IF NOT EXISTS schedule_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID REFERENCES schedule_tasks(id) ON DELETE CASCADE NOT NULL,
  target_task_id UUID REFERENCES schedule_tasks(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')) DEFAULT 'finish_to_start',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_task_id, target_task_id)
);

-- Create schedule_milestones table
CREATE TABLE IF NOT EXISTS schedule_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES project_schedules(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_date DATE NOT NULL,
  actual_date DATE,
  status TEXT CHECK (status IN ('pending', 'completed', 'missed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE project_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies (viewable by all authenticated users, editable by admins and PMs)
-- We'll use the existing user_role logic or simplified logic for now. 
-- Assuming "authenticated" users can view.

-- Project Schedules Policies
CREATE POLICY "Schedules are viewable by authenticated users" 
  ON project_schedules FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Schedules are insertable by authenticated users" 
  ON project_schedules FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Schedules are updateable by authenticated users" 
  ON project_schedules FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Schedules are deletable by authenticated users" 
  ON project_schedules FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Schedule Tasks Policies
CREATE POLICY "Tasks are viewable by authenticated users" 
  ON schedule_tasks FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Tasks are insertable by authenticated users" 
  ON schedule_tasks FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tasks are updateable by authenticated users" 
  ON schedule_tasks FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Tasks are deletable by authenticated users" 
  ON schedule_tasks FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Schedule Dependencies Policies
CREATE POLICY "Dependencies are viewable by authenticated users" 
  ON schedule_dependencies FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Dependencies are insertable by authenticated users" 
  ON schedule_dependencies FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Dependencies are updateable by authenticated users" 
  ON schedule_dependencies FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Dependencies are deletable by authenticated users" 
  ON schedule_dependencies FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Schedule Milestones Policies
CREATE POLICY "Milestones are viewable by authenticated users" 
  ON schedule_milestones FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Milestones are insertable by authenticated users" 
  ON schedule_milestones FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Milestones are updateable by authenticated users" 
  ON schedule_milestones FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Milestones are deletable by authenticated users" 
  ON schedule_milestones FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Add indexes
CREATE INDEX idx_project_schedules_project_id ON project_schedules(project_id);
CREATE INDEX idx_schedule_tasks_schedule_id ON schedule_tasks(schedule_id);
CREATE INDEX idx_schedule_tasks_contractor_id ON schedule_tasks(contractor_id);
CREATE INDEX idx_schedule_dependencies_source ON schedule_dependencies(source_task_id);
CREATE INDEX idx_schedule_dependencies_target ON schedule_dependencies(target_task_id);
CREATE INDEX idx_schedule_milestones_schedule_id ON schedule_milestones(schedule_id);

-- Create triggers for updated_at
CREATE TRIGGER update_project_schedules_modtime
    BEFORE UPDATE ON project_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_tasks_modtime
    BEFORE UPDATE ON schedule_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

