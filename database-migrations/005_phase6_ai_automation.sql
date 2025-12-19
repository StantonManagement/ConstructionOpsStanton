-- 005_phase6_ai_automation.sql
-- Based on PHASE_6_AI_AUTOMATION.md

-- 1. Add AI analysis columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS ai_confidence INTEGER,
ADD COLUMN IF NOT EXISTS ai_assessment TEXT,
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- 2. Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The dependent task (successor)
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The prerequisite task (predecessor)
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: Prevent duplicate dependency
    CONSTRAINT idx_task_dependencies_unique UNIQUE (task_id, depends_on_task_id),
    
    -- Constraint: Prevent self-dependency
    CONSTRAINT check_no_self_dependency CHECK (task_id != depends_on_task_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- 3. Create sms_log table
CREATE TABLE IF NOT EXISTS sms_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    contractor_id BIGINT REFERENCES contractors(id) ON DELETE SET NULL, -- contractors.id is BIGINT
    phone_number VARCHAR(20),
    message_type VARCHAR(50), -- 'task_assigned', 'task_unblocked', 'rework_needed', 'reminder'
    message_body TEXT,
    twilio_sid VARCHAR(50),
    status VARCHAR(20), -- 'sent', 'delivered', 'failed'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

-- 4. Add dependency support to template_tasks
ALTER TABLE template_tasks
ADD COLUMN IF NOT EXISTS depends_on_sort_order INTEGER;

-- 5. Function to prevent circular dependencies (Simple check depth 1 for now, full recursion complex in SQL)
-- A robust solution usually involves a recursive CTE trigger, but for now we rely on API validation 
-- or a simple trigger that checks if A depends on B, ensuring B doesn't already depend on A.

CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM task_dependencies 
        WHERE task_id = NEW.depends_on_task_id 
        AND depends_on_task_id = NEW.task_id
    ) THEN
        RAISE EXCEPTION 'Circular dependency detected: Task % cannot depend on Task % because the reverse dependency exists.', NEW.task_id, NEW.depends_on_task_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_circular_dependency ON task_dependencies;
CREATE TRIGGER trigger_check_circular_dependency
    BEFORE INSERT ON task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_dependency();
