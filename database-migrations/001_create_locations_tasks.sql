-- 001_create_locations_tasks.sql
-- Based on PHASE_1_FOUNDATION.md

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE location_type AS ENUM ('unit', 'common_area', 'exterior', 'building_wide');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_type AS ENUM ('studio', '1BR', '2BR', '3BR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE location_status AS ENUM ('not_started', 'in_progress', 'complete', 'on_hold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE blocked_reason AS ENUM ('materials', 'labor', 'cash', 'dependency', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'worker_complete', 'verified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create locations table
-- NOTE: referencing 'projects' table instead of 'c_properties' as projects appears to be the main entity table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type location_type NOT NULL,
    unit_type unit_type, -- Only for type='unit'
    unit_number VARCHAR(20),
    floor INTEGER,
    status location_status NOT NULL DEFAULT 'not_started',
    blocked_reason blocked_reason,
    blocked_note TEXT,
    template_applied_id UUID, -- Will reference templates table later
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: blocked_reason only when status is on_hold
    CONSTRAINT check_blocked_reason CHECK (
        (status = 'on_hold' AND blocked_reason IS NOT NULL) OR
        (status != 'on_hold' AND blocked_reason IS NULL)
    ),
    
    -- Constraint: unit_type only when type is unit
    CONSTRAINT check_unit_type CHECK (
        (type = 'unit' AND unit_type IS NOT NULL) OR
        (type != 'unit') -- Relaxed to allow null unit_type for units if needed, but strictly enforcing non-unit types shouldn't have it is optional.
                         -- Sticking to requirements: "nullable, only for type='unit'" implies logical restriction.
    )
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'not_started',
    priority priority_level NOT NULL DEFAULT 'medium',
    assigned_contractor_id BIGINT REFERENCES contractors(id), -- contractors.id is BIGINT/Integer
    budget_category_id BIGINT REFERENCES property_budgets(id), -- budget_categories table seems to be property_budgets in schema
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    duration_days INTEGER,
    scheduled_start DATE,
    scheduled_end DATE,
    worker_completed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(uuid), -- Assuming users.uuid matches auth.users
    verification_photo_url TEXT,
    verification_notes TEXT,
    sort_order INTEGER DEFAULT 0,
    tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: verified status requires photo
    CONSTRAINT check_verification_photo CHECK (
        (status = 'verified' AND verification_photo_url IS NOT NULL) OR
        (status != 'verified')
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_project_id ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
CREATE INDEX IF NOT EXISTS idx_tasks_location_id ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_contractor_id ON tasks(assigned_contractor_id);

-- Trigger for updated_at on locations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
