-- PRP-002: Enhance construction_draws table
-- Migration 061: Construction Draws Enhancement

-- Add funding_source_id to construction_draws (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'construction_draws' AND column_name = 'funding_source_id'
    ) THEN
        ALTER TABLE construction_draws ADD COLUMN funding_source_id UUID REFERENCES funding_sources(id);
        CREATE INDEX idx_draws_funding_source ON construction_draws(funding_source_id);
    END IF;
END $$;

-- Add status tracking fields (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'construction_draws' AND column_name = 'status'
    ) THEN
        ALTER TABLE construction_draws ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
    END IF;
END $$;

-- Add status constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'draws_status_check'
    ) THEN
        ALTER TABLE construction_draws 
        ADD CONSTRAINT draws_status_check 
        CHECK (status IN ('draft', 'submitted', 'approved', 'funded', 'rejected'));
    END IF;
END $$;

-- Add approval workflow fields
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'construction_draws' AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE construction_draws ADD COLUMN submitted_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'construction_draws' AND column_name = 'approved_at'
    ) THEN
        ALTER TABLE construction_draws ADD COLUMN approved_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'construction_draws' AND column_name = 'approved_by_id'
    ) THEN
        ALTER TABLE construction_draws ADD COLUMN approved_by_id INTEGER;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'construction_draws' AND column_name = 'funded_at'
    ) THEN
        ALTER TABLE construction_draws ADD COLUMN funded_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create draw_line_items table
CREATE TABLE IF NOT EXISTS draw_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_id UUID NOT NULL REFERENCES construction_draws(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    budget_category_id UUID,
    property_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draw_line_items_draw ON draw_line_items(draw_id);
CREATE INDEX IF NOT EXISTS idx_draw_line_items_task ON draw_line_items(task_id);
