-- 003_create_blocking_views.sql
-- Based on PHASE_4_BLOCKING.md
-- Adjusted to use 'projects' table instead of 'c_properties' based on existing schema

-- View 1: location_stats
-- Computes aggregated stats for each location based on its tasks
CREATE OR REPLACE VIEW location_stats AS
SELECT 
  l.id as location_id,
  l.project_id,
  l.name,
  l.status,
  l.blocked_reason,
  l.blocked_note,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'verified' THEN 1 END) as verified_tasks,
  COUNT(CASE WHEN t.status = 'worker_complete' THEN 1 END) as pending_verify_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'not_started' THEN 1 END) as not_started_tasks,
  COALESCE(SUM(t.estimated_cost), 0) as total_estimated_cost,
  -- Verified cost logic: use actual_cost if available, otherwise fall back to estimated (or 0 if strict)
  -- Requirement says: "only verified tasks count toward verified_cost"
  COALESCE(SUM(CASE WHEN t.status = 'verified' THEN COALESCE(t.actual_cost, t.estimated_cost, 0) ELSE 0 END), 0) as verified_cost
FROM locations l
LEFT JOIN tasks t ON t.location_id = l.id
GROUP BY l.id;

-- View 2: project_stats (equivalent to property_stats)
-- Aggregates location_stats to the project level
CREATE OR REPLACE VIEW project_stats AS
SELECT
  p.id as project_id,
  p.name as project_name,
  COUNT(DISTINCT l.id) as total_locations,
  -- Complete location = all tasks verified AND > 0 tasks
  COUNT(DISTINCT CASE WHEN ls.verified_tasks = ls.total_tasks AND ls.total_tasks > 0 THEN l.id END) as complete_locations,
  -- Blocked location = status is 'on_hold'
  COUNT(DISTINCT CASE WHEN l.status = 'on_hold' THEN l.id END) as blocked_locations,
  COALESCE(SUM(ls.total_tasks), 0) as total_tasks,
  COALESCE(SUM(ls.verified_tasks), 0) as verified_tasks,
  COALESCE(SUM(ls.total_estimated_cost), 0) as total_estimated_cost,
  COALESCE(SUM(ls.verified_cost), 0) as verified_cost,
  
  -- Progress percentage
  CASE 
    WHEN SUM(ls.total_tasks) > 0 THEN 
      ROUND((SUM(ls.verified_tasks)::decimal / SUM(ls.total_tasks)::decimal) * 100, 1)
    ELSE 0 
  END as completion_percentage
FROM projects p
LEFT JOIN locations l ON l.project_id = p.id
LEFT JOIN location_stats ls ON ls.location_id = l.id
GROUP BY p.id, p.name;

-- View 3: blocking_report
-- Lists all blocked locations with details
CREATE OR REPLACE VIEW blocking_report AS
SELECT
  l.blocked_reason,
  l.project_id,
  p.name as project_name,
  l.id as location_id,
  l.name as location_name,
  l.blocked_note,
  l.updated_at as blocked_since,
  COUNT(t.id) as affected_tasks,
  COALESCE(SUM(t.estimated_cost), 0) as affected_cost
FROM locations l
JOIN projects p ON p.id = l.project_id
LEFT JOIN tasks t ON t.location_id = l.id
WHERE l.status = 'on_hold' AND l.blocked_reason IS NOT NULL
GROUP BY l.blocked_reason, l.project_id, p.name, l.id, l.name, l.blocked_note, l.updated_at
ORDER BY l.blocked_reason, l.updated_at DESC;
