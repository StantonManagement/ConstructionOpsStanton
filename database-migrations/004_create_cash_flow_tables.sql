-- 004_create_cash_flow_tables.sql
-- Based on PHASE_5_CASH_FLOW.md
-- Adapted to use 'projects' table instead of 'c_properties'

-- Create draw_status enum
DO $$ BEGIN
    CREATE TYPE draw_status AS ENUM ('draft', 'submitted', 'approved', 'funded', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create construction_draws table
CREATE TABLE IF NOT EXISTS construction_draws (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    draw_number INTEGER NOT NULL,
    amount_requested DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_approved DECIMAL(12,2),
    status draw_status NOT NULL DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    funded_at TIMESTAMPTZ,
    notes TEXT,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: draw_number unique per project
    CONSTRAINT idx_draws_project_number UNIQUE (project_id, draw_number)
);

-- Trigger for updated_at on construction_draws
DROP TRIGGER IF EXISTS update_construction_draws_updated_at ON construction_draws;
CREATE TRIGGER update_construction_draws_updated_at
    BEFORE UPDATE ON construction_draws
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create draw_line_items table
CREATE TABLE IF NOT EXISTS draw_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID NOT NULL REFERENCES construction_draws(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT, -- Don't allow deleting task if in a draw
    budget_category_id BIGINT REFERENCES property_budgets(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: A task can only appear in ONE draw across all draws
    -- This enforces "Task can only be in ONE draw" rule
    CONSTRAINT idx_draw_line_items_task_unique UNIQUE (task_id)
);

-- Create cash_flow_forecast view
-- Forecasts cash needs based on scheduled tasks that are NOT verified
CREATE OR REPLACE VIEW cash_flow_forecast AS
SELECT
  DATE_TRUNC('week', t.scheduled_start) as week_start,
  l.project_id,
  p.name as project_name,
  pb.category as budget_category,
  COUNT(t.id) as task_count,
  COALESCE(SUM(t.estimated_cost), 0) as forecasted_cost
FROM tasks t
JOIN locations l ON l.id = t.location_id
JOIN projects p ON p.id = l.project_id
LEFT JOIN property_budgets pb ON pb.id = t.budget_category_id
WHERE t.scheduled_start IS NOT NULL
  AND t.status != 'verified'
GROUP BY DATE_TRUNC('week', t.scheduled_start), l.project_id, p.name, pb.category
ORDER BY week_start, project_name;

-- Create draw_eligibility view
-- Shows what can be drawn based on verified tasks
CREATE OR REPLACE VIEW draw_eligibility AS
SELECT
  l.project_id,
  p.name as project_name,
  pb.id as budget_category_id,
  pb.category as budget_category,
  COUNT(t.id) as verified_task_count,
  COALESCE(SUM(COALESCE(t.actual_cost, t.estimated_cost, 0)), 0) as verified_cost,
  COALESCE(SUM(dli.amount), 0) as already_drawn,
  COALESCE(SUM(COALESCE(t.actual_cost, t.estimated_cost, 0)), 0) - COALESCE(SUM(dli.amount), 0) as eligible_to_draw
FROM tasks t
JOIN locations l ON l.id = t.location_id
JOIN projects p ON p.id = l.project_id
LEFT JOIN property_budgets pb ON pb.id = t.budget_category_id
LEFT JOIN draw_line_items dli ON dli.task_id = t.id
WHERE t.status = 'verified'
GROUP BY l.project_id, p.name, pb.id, pb.category
HAVING (COALESCE(SUM(COALESCE(t.actual_cost, t.estimated_cost, 0)), 0) - COALESCE(SUM(dli.amount), 0)) > 0;
