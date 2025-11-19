-- Migration: Create Property Budgets Table for Phase 3B
-- Date: 2024-11-19
-- Description: Creates property_budgets table for tracking budget line items per property
-- Version: 1.0

-- ============================================================
-- 1. Create property_budgets table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.property_budgets (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Budget line item details
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Financial tracking
  original_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (original_amount >= 0),
  revised_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (revised_amount >= 0),
  actual_spend NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (actual_spend >= 0),
  committed_costs NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (committed_costs >= 0),
  
  -- Ordering and status
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_project_category UNIQUE (project_id, category_name)
);

-- ============================================================
-- 2. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_property_budgets_project_id ON public.property_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_property_budgets_category_name ON public.property_budgets(category_name);
CREATE INDEX IF NOT EXISTS idx_property_budgets_is_active ON public.property_budgets(is_active);
CREATE INDEX IF NOT EXISTS idx_property_budgets_display_order ON public.property_budgets(display_order);

-- ============================================================
-- 3. Create trigger for updated_at timestamp
-- ============================================================
DROP TRIGGER IF EXISTS update_property_budgets_updated_at ON public.property_budgets;
CREATE TRIGGER update_property_budgets_updated_at
  BEFORE UPDATE ON public.property_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Create helper function to calculate remaining budget
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_budget_remaining(
  p_revised_amount NUMERIC,
  p_actual_spend NUMERIC,
  p_committed_costs NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN p_revised_amount - p_actual_spend - p_committed_costs;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 5. Create helper function to calculate percent spent
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_percent_spent(
  p_actual_spend NUMERIC,
  p_revised_amount NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  IF p_revised_amount = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((p_actual_spend / p_revised_amount * 100)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 6. Create view for budget summary with calculations
-- ============================================================
CREATE OR REPLACE VIEW public.property_budgets_summary AS
SELECT 
  pb.*,
  p.name AS project_name,
  p.owner_entity_id,
  p.portfolio_name,
  -- Calculated fields
  public.calculate_budget_remaining(pb.revised_amount, pb.actual_spend, pb.committed_costs) AS remaining_amount,
  public.calculate_percent_spent(pb.actual_spend, pb.revised_amount) AS percent_spent,
  -- Status indicators
  CASE 
    WHEN public.calculate_percent_spent(pb.actual_spend, pb.revised_amount) >= 100 THEN 'Over Budget'
    WHEN public.calculate_percent_spent(pb.actual_spend, pb.revised_amount) >= 95 THEN 'Critical'
    WHEN public.calculate_percent_spent(pb.actual_spend, pb.revised_amount) >= 85 THEN 'Warning'
    ELSE 'On Track'
  END AS budget_status,
  -- Variance
  (pb.revised_amount - pb.original_amount) AS budget_variance
FROM public.property_budgets pb
JOIN public.projects p ON pb.project_id = p.id
WHERE pb.is_active = true;

-- ============================================================
-- 7. Enable Row Level Security
-- ============================================================
ALTER TABLE public.property_budgets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. Create RLS policies
-- ============================================================
DROP POLICY IF EXISTS property_budgets_select_policy ON public.property_budgets;
CREATE POLICY property_budgets_select_policy
  ON public.property_budgets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS property_budgets_insert_policy ON public.property_budgets;
CREATE POLICY property_budgets_insert_policy
  ON public.property_budgets FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS property_budgets_update_policy ON public.property_budgets;
CREATE POLICY property_budgets_update_policy
  ON public.property_budgets FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS property_budgets_delete_policy ON public.property_budgets;
CREATE POLICY property_budgets_delete_policy
  ON public.property_budgets FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 9. Insert sample budget categories (for reference)
-- ============================================================
-- Commented out - will be added per-project via UI
-- Common categories for residential renovation:
-- 'Demo & Prep', 'Framing', 'Electrical', 'Plumbing', 'HVAC',
-- 'Insulation', 'Drywall', 'Painting', 'Flooring', 'Fixtures',
-- 'Cabinets & Countertops', 'Appliances', 'Permits & Fees',
-- 'Contingency', 'Other'

-- ============================================================
-- 10. Add helpful comments
-- ============================================================
COMMENT ON TABLE public.property_budgets IS 'Budget line items per property/project';
COMMENT ON COLUMN public.property_budgets.category_name IS 'Budget category (e.g., "Electrical", "Plumbing")';
COMMENT ON COLUMN public.property_budgets.original_amount IS 'Initial budgeted amount';
COMMENT ON COLUMN public.property_budgets.revised_amount IS 'Budget after change orders (starts same as original)';
COMMENT ON COLUMN public.property_budgets.actual_spend IS 'Actual money spent to date';
COMMENT ON COLUMN public.property_budgets.committed_costs IS 'Approved but not yet paid (contracts signed)';
COMMENT ON COLUMN public.property_budgets.display_order IS 'Order for displaying in UI';

COMMENT ON VIEW public.property_budgets_summary IS 'Budget data with calculated remaining, percent spent, and status';

-- ============================================================
-- Migration Complete
-- ============================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Build budget CRUD API endpoints
-- 3. Create budget entry UI
-- 4. Test budget calculations

