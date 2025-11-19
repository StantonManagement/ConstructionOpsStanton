-- Migration: Create Change Orders Tables for Phase 3C
-- Date: 2024-11-19
-- Description: Creates change_orders, change_order_photos, and change_order_approvals tables
-- Version: 1.0

-- ============================================================
-- 1. Create change_orders table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.change_orders (
  id SERIAL PRIMARY KEY,
  
  -- Identity & linking
  co_number VARCHAR(50) NOT NULL,
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_id INTEGER REFERENCES public.contractors(id) ON DELETE SET NULL,
  budget_category_id INTEGER REFERENCES public.property_budgets(id) ON DELETE SET NULL,
  
  -- Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reason_category VARCHAR(50) NOT NULL CHECK (reason_category IN (
    'Hidden Conditions', 
    'Code Requirement', 
    'Owner Request', 
    'Design Change', 
    'Material Unavailability', 
    'Other'
  )),
  justification TEXT,
  
  -- Financial impact
  cost_impact NUMERIC(15, 2) NOT NULL CHECK (cost_impact >= 0),
  schedule_impact_days INTEGER DEFAULT 0,
  
  -- Workflow status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 
    'pending', 
    'approved', 
    'rejected', 
    'completed'
  )),
  
  -- People tracking
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  submitted_date TIMESTAMP,
  approved_date TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_co_number_per_project UNIQUE (project_id, co_number)
);

-- ============================================================
-- 2. Create change_order_photos table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.change_order_photos (
  id SERIAL PRIMARY KEY,
  change_order_id INTEGER NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 3. Create change_order_approvals table (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.change_order_approvals (
  id SERIAL PRIMARY KEY,
  change_order_id INTEGER NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_info')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 4. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_change_orders_project_id ON public.change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_contractor_id ON public.change_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON public.change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_co_number ON public.change_orders(co_number);
CREATE INDEX IF NOT EXISTS idx_change_orders_created_by ON public.change_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_change_orders_submitted_date ON public.change_orders(submitted_date);

CREATE INDEX IF NOT EXISTS idx_change_order_photos_change_order_id ON public.change_order_photos(change_order_id);
CREATE INDEX IF NOT EXISTS idx_change_order_approvals_change_order_id ON public.change_order_approvals(change_order_id);

-- ============================================================
-- 5. Create trigger for updated_at timestamp
-- ============================================================
DROP TRIGGER IF EXISTS update_change_orders_updated_at ON public.change_orders;
CREATE TRIGGER update_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. Create function to generate CO number
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_co_number(p_project_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  v_max_number INTEGER;
  v_new_number VARCHAR;
BEGIN
  -- Get the highest CO number for this project
  SELECT COALESCE(MAX(CAST(SUBSTRING(co_number FROM 'CO-(\d+)') AS INTEGER)), 0)
  INTO v_max_number
  FROM public.change_orders
  WHERE project_id = p_project_id;
  
  -- Generate new number
  v_new_number := 'CO-' || LPAD((v_max_number + 1)::TEXT, 3, '0');
  
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Create function to auto-update budget when CO approved
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_budget_on_co_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if status changed to 'approved' and budget_category_id exists
  IF NEW.status = 'approved' 
     AND OLD.status != 'approved' 
     AND NEW.budget_category_id IS NOT NULL THEN
    
    -- Update the revised_amount in property_budgets
    UPDATE public.property_budgets
    SET revised_amount = revised_amount + NEW.cost_impact
    WHERE id = NEW.budget_category_id;
    
    -- Log the approval
    INSERT INTO public.change_order_approvals (
      change_order_id,
      approver_id,
      action,
      comment
    ) VALUES (
      NEW.id,
      NEW.approved_by,
      'approved',
      'Automatically logged on approval'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_budget_on_co_approval ON public.change_orders;
CREATE TRIGGER trigger_update_budget_on_co_approval
  AFTER UPDATE ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_on_co_approval();

-- ============================================================
-- 8. Create view for change orders with details
-- ============================================================
CREATE OR REPLACE VIEW public.change_orders_detail AS
SELECT 
  co.*,
  p.name AS project_name,
  p.owner_entity_id,
  c.name AS contractor_name,
  pb.category_name AS budget_category_name,
  u_created.raw_user_meta_data->>'name' AS created_by_name,
  u_approved.raw_user_meta_data->>'name' AS approved_by_name,
  -- Count photos
  (SELECT COUNT(*) FROM public.change_order_photos WHERE change_order_id = co.id) AS photo_count,
  -- Approval tier based on cost
  CASE 
    WHEN co.cost_impact < 500 THEN 'Auto-Approve'
    WHEN co.cost_impact < 2000 THEN 'Standard'
    ELSE 'High-Value'
  END AS approval_tier
FROM public.change_orders co
JOIN public.projects p ON co.project_id = p.id
LEFT JOIN public.contractors c ON co.contractor_id = c.id
LEFT JOIN public.property_budgets pb ON co.budget_category_id = pb.id
LEFT JOIN auth.users u_created ON co.created_by = u_created.id
LEFT JOIN auth.users u_approved ON co.approved_by = u_approved.id;

-- ============================================================
-- 9. Enable Row Level Security
-- ============================================================
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. Create RLS policies
-- ============================================================
-- Change Orders
DROP POLICY IF EXISTS change_orders_select_policy ON public.change_orders;
CREATE POLICY change_orders_select_policy
  ON public.change_orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS change_orders_insert_policy ON public.change_orders;
CREATE POLICY change_orders_insert_policy
  ON public.change_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS change_orders_update_policy ON public.change_orders;
CREATE POLICY change_orders_update_policy
  ON public.change_orders FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS change_orders_delete_policy ON public.change_orders;
CREATE POLICY change_orders_delete_policy
  ON public.change_orders FOR DELETE
  TO authenticated
  USING (status = 'draft'); -- Can only delete drafts

-- Change Order Photos
DROP POLICY IF EXISTS change_order_photos_select_policy ON public.change_order_photos;
CREATE POLICY change_order_photos_select_policy
  ON public.change_order_photos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS change_order_photos_insert_policy ON public.change_order_photos;
CREATE POLICY change_order_photos_insert_policy
  ON public.change_order_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS change_order_photos_delete_policy ON public.change_order_photos;
CREATE POLICY change_order_photos_delete_policy
  ON public.change_order_photos FOR DELETE
  TO authenticated
  USING (true);

-- Change Order Approvals
DROP POLICY IF EXISTS change_order_approvals_select_policy ON public.change_order_approvals;
CREATE POLICY change_order_approvals_select_policy
  ON public.change_order_approvals FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS change_order_approvals_insert_policy ON public.change_order_approvals;
CREATE POLICY change_order_approvals_insert_policy
  ON public.change_order_approvals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 11. Add helpful comments
-- ============================================================
COMMENT ON TABLE public.change_orders IS 'Change orders for tracking scope changes and budget impacts';
COMMENT ON COLUMN public.change_orders.co_number IS 'Auto-generated CO number (e.g., CO-001)';
COMMENT ON COLUMN public.change_orders.reason_category IS 'Reason for the change order';
COMMENT ON COLUMN public.change_orders.cost_impact IS 'Dollar amount this CO adds to budget';
COMMENT ON COLUMN public.change_orders.schedule_impact_days IS 'Days added/subtracted from schedule';
COMMENT ON COLUMN public.change_orders.status IS 'Workflow status (draft -> pending -> approved/rejected -> completed)';

COMMENT ON TABLE public.change_order_photos IS 'Supporting photos for change orders';
COMMENT ON TABLE public.change_order_approvals IS 'Audit trail of approval actions';

COMMENT ON VIEW public.change_orders_detail IS 'Change orders with project, contractor, and user details';

-- ============================================================
-- Migration Complete
-- ============================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Build change order API endpoints
-- 3. Create change order form and workflow UI
-- 4. Test approval workflow and budget updates

