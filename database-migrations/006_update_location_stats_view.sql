-- Update location_stats view to include type and unit_number
CREATE OR REPLACE VIEW location_stats AS
SELECT 
  l.id as location_id,
  l.project_id,
  l.name,
  l.status,
  l.type,
  l.unit_number,
  l.blocked_reason,
  l.blocked_note,
  l.updated_at,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'verified' THEN 1 END) as verified_tasks,
  COUNT(CASE WHEN t.status = 'worker_complete' THEN 1 END) as pending_verify_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'not_started' THEN 1 END) as not_started_tasks,
  COALESCE(SUM(t.estimated_cost), 0) as total_estimated_cost,
  COALESCE(SUM(CASE WHEN t.status = 'verified' THEN COALESCE(t.actual_cost, t.estimated_cost, 0) ELSE 0 END), 0) as verified_cost
FROM locations l
LEFT JOIN tasks t ON t.location_id = l.id
GROUP BY l.id;
