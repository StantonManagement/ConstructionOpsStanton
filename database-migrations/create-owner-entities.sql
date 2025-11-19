-- Migration: Create Owner Entities Table for Phase 3A
-- Date: 2024-11-19
-- Description: Creates owner_entities table for LLC/entity management and adds foreign key to projects table
-- Version: 2.0 (Supabase Best Practices)

-- ============================================================
-- 1. Create owner_entities table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.owner_entities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'LLC'
    CHECK (entity_type IN ('LLC', 'Corporation', 'Partnership', 'Sole Proprietorship', 'Other')),
  tax_id VARCHAR(50),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  accounting_ref VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. Add columns to projects table
-- ============================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_entity_id INTEGER;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS portfolio_name VARCHAR(100);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 1;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS address TEXT;

-- Optional: prevent negative totals
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_total_units_nonnegative;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_total_units_nonnegative CHECK (total_units IS NULL OR total_units >= 0);

-- ============================================================
-- 3. Add foreign key constraint (guarded)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_projects_owner_entity'
  ) THEN
    ALTER TABLE public.projects
    ADD CONSTRAINT fk_projects_owner_entity
    FOREIGN KEY (owner_entity_id)
    REFERENCES public.owner_entities(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 4. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_owner_entities_name ON public.owner_entities(name);
CREATE INDEX IF NOT EXISTS idx_owner_entities_is_active ON public.owner_entities(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_owner_entity_id ON public.projects(owner_entity_id);
CREATE INDEX IF NOT EXISTS idx_projects_portfolio_name ON public.projects(portfolio_name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- ============================================================
-- 5. Create/update trigger function (schema-qualified)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Add trigger to owner_entities (schema-qualified)
-- ============================================================
DROP TRIGGER IF EXISTS update_owner_entities_updated_at ON public.owner_entities;
CREATE TRIGGER update_owner_entities_updated_at
  BEFORE UPDATE ON public.owner_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. Insert sample entities (based on wireframe data)
-- ============================================================
INSERT INTO public.owner_entities (name, entity_type, is_active) VALUES
  ('STANTON REP 90', 'LLC', true),
  ('SREP SOUTHEND', 'LLC', true),
  ('SREP NORTHEND', 'LLC', true),
  ('SREP Hartford 1', 'LLC', true),
  ('SREP Park', 'LLC', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 8. Enable Row Level Security
-- ============================================================
ALTER TABLE public.owner_entities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. Create RLS policies (authenticated users have full access)
-- Note: Adjust USING/WITH CHECK clauses for more granular permissions if needed
-- ============================================================
DROP POLICY IF EXISTS owner_entities_select_policy ON public.owner_entities;
CREATE POLICY owner_entities_select_policy
  ON public.owner_entities FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS owner_entities_insert_policy ON public.owner_entities;
CREATE POLICY owner_entities_insert_policy
  ON public.owner_entities FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS owner_entities_update_policy ON public.owner_entities;
CREATE POLICY owner_entities_update_policy
  ON public.owner_entities FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS owner_entities_delete_policy ON public.owner_entities;
CREATE POLICY owner_entities_delete_policy
  ON public.owner_entities FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 10. Add helpful comments for documentation
-- ============================================================
COMMENT ON TABLE public.owner_entities IS 'Stores LLC/entity information that own properties';
COMMENT ON COLUMN public.owner_entities.name IS 'Entity legal name (e.g., "SREP SOUTHEND")';
COMMENT ON COLUMN public.owner_entities.entity_type IS 'Type of legal entity';
COMMENT ON COLUMN public.owner_entities.tax_id IS 'Tax ID/EIN (sensitive - consider encryption)';
COMMENT ON COLUMN public.owner_entities.accounting_ref IS 'Reference ID for accounting system integration';
COMMENT ON COLUMN public.projects.owner_entity_id IS 'Foreign key to owner_entities - which LLC owns this property';
COMMENT ON COLUMN public.projects.portfolio_name IS 'Portfolio grouping (e.g., "90 Park", "South End")';
COMMENT ON COLUMN public.projects.total_units IS 'Number of units in multi-unit properties';

-- ============================================================
-- Migration Complete
-- ============================================================
-- Next steps:
-- 1. Verify with: SELECT * FROM public.owner_entities;
-- 2. Verify columns: SELECT column_name FROM information_schema.columns 
--    WHERE table_name = 'projects' AND column_name IN ('owner_entity_id', 'portfolio_name', 'total_units', 'address');
-- 3. Test entity management in UI
-- 4. Manually assign existing projects to entities via UI
-- 5. Later: Consider making owner_entity_id NOT NULL after all projects are assigned
