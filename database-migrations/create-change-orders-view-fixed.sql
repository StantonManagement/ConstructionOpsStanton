-- ============================================================
-- Change Orders Detail View (FIXED)
-- Provides enriched change order data with project and entity info
-- ============================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.change_orders_detail CASCADE;

-- Create comprehensive change orders view
CREATE OR REPLACE VIEW public.change_orders_detail AS
SELECT 
  co.id,
  co.co_number,
  co.project_id,
  co.contractor_id,
  co.description,
  co.justification,
  co.cost_impact,
  co.schedule_impact_days,
  co.status,
  co.created_by,
  co.approved_by,
  co.approved_date,
  co.created_at,
  co.updated_at,
  
  -- Project information
  p.name AS project_name,
  p.owner_entity_id,
  p.portfolio_name,
  p.status AS project_status,
  
  -- Entity information (if available)
  oe.name AS owner_entity_name,
  
  -- Contractor information
  c.name AS contractor_name,
  c.trade AS contractor_trade,
  
  -- Creator information
  u_creator.email AS creator_email,
  
  -- Approver information (if approved)
  u_approver.email AS approver_email,
  
  -- Photo count
  (
    SELECT COUNT(*)::INTEGER
    FROM public.change_order_photos cop
    WHERE cop.change_order_id = co.id
  ) AS photo_count,
  
  -- Approval count
  (
    SELECT COUNT(*)::INTEGER
    FROM public.change_order_approvals coa
    WHERE coa.change_order_id = co.id AND coa.action = 'approved'
  ) AS approval_count,
  
  -- Rejection count
  (
    SELECT COUNT(*)::INTEGER
    FROM public.change_order_approvals coa
    WHERE coa.change_order_id = co.id AND coa.action = 'rejected'
  ) AS rejection_count

FROM public.change_orders co
INNER JOIN public.projects p ON co.project_id = p.id
LEFT JOIN public.owner_entities oe ON p.owner_entity_id = oe.id
LEFT JOIN public.contractors c ON co.contractor_id = c.id
LEFT JOIN auth.users u_creator ON co.created_by::text = u_creator.id::text
LEFT JOIN auth.users u_approver ON co.approved_by::text = u_approver.id::text;

-- Add comment
COMMENT ON VIEW public.change_orders_detail IS 'Enriched change order data with project, entity, contractor, and user information';

-- Grant access to authenticated users
GRANT SELECT ON public.change_orders_detail TO authenticated;

-- ============================================================
-- Additional Helper View: Change Orders Summary by Project
-- ============================================================

DROP VIEW IF EXISTS public.change_orders_summary_by_project CASCADE;

CREATE OR REPLACE VIEW public.change_orders_summary_by_project AS
SELECT 
  project_id,
  COUNT(*) AS total_change_orders,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
  SUM(cost_impact) FILTER (WHERE status = 'approved') AS total_approved_cost,
  SUM(cost_impact) FILTER (WHERE status = 'pending') AS total_pending_cost,
  MAX(created_at) AS latest_change_order_date
FROM public.change_orders
GROUP BY project_id;

COMMENT ON VIEW public.change_orders_summary_by_project IS 'Summary statistics of change orders grouped by project';

GRANT SELECT ON public.change_orders_summary_by_project TO authenticated;

-- ============================================================
-- Testing Query (optional - remove after verification)
-- ============================================================

-- Uncomment to test the view after running this migration:
-- SELECT * FROM public.change_orders_detail LIMIT 5;
-- SELECT * FROM public.change_orders_summary_by_project;

