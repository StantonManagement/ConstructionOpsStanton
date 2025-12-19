-- 002_create_templates.sql
-- Based on PHASE_2_TEMPLATES.md

-- Create scope_templates table
CREATE TABLE IF NOT EXISTS scope_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    unit_type unit_type, -- Can be NULL (applies to any)
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template_tasks table
CREATE TABLE IF NOT EXISTS template_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES scope_templates(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_duration_days INTEGER,
    default_budget_category_id BIGINT REFERENCES property_budgets(id),
    estimated_cost DECIMAL(10,2),
    sort_order INTEGER DEFAULT 0,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_scope_templates_unit_type ON scope_templates(unit_type);
CREATE INDEX IF NOT EXISTS idx_scope_templates_is_active ON scope_templates(is_active);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_scope_templates_updated_at ON scope_templates;
CREATE TRIGGER update_scope_templates_updated_at
    BEFORE UPDATE ON scope_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_tasks_updated_at ON template_tasks;
CREATE TRIGGER update_template_tasks_updated_at
    BEFORE UPDATE ON template_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
