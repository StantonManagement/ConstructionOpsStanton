-- PRP-003: Create backlog_items table
-- Migration 062: Backlog Items

CREATE TABLE IF NOT EXISTS backlog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    scope_level VARCHAR(20) NOT NULL DEFAULT 'property',
    portfolio_id UUID REFERENCES portfolios(id),
    property_id UUID,
    estimated_cost DECIMAL(12,2),
    priority VARCHAR(10) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',
    converted_to_project_id UUID,
    converted_at TIMESTAMPTZ,
    converted_by_id INTEGER,
    notes TEXT,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
ALTER TABLE backlog_items ADD CONSTRAINT backlog_scope_check 
    CHECK (scope_level IN ('portfolio', 'property'));
    
ALTER TABLE backlog_items ADD CONSTRAINT backlog_priority_check 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    
ALTER TABLE backlog_items ADD CONSTRAINT backlog_status_check 
    CHECK (status IN ('active', 'converted', 'archived', 'rejected'));

-- Scope validation
ALTER TABLE backlog_items ADD CONSTRAINT backlog_scope_validation
    CHECK (
        (scope_level = 'portfolio' AND portfolio_id IS NOT NULL) OR
        (scope_level = 'property' AND property_id IS NOT NULL)
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backlog_portfolio ON backlog_items(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_backlog_property ON backlog_items(property_id);
CREATE INDEX IF NOT EXISTS idx_backlog_status ON backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_backlog_priority ON backlog_items(priority);

-- Add source_backlog_id to projects (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'source_backlog_id'
    ) THEN
        ALTER TABLE projects ADD COLUMN source_backlog_id UUID REFERENCES backlog_items(id);
        CREATE INDEX idx_projects_source_backlog ON projects(source_backlog_id);
    END IF;
END $$;
