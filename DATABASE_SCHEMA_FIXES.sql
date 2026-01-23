-- ============================================
-- DATABASE SCHEMA FIXES
-- ============================================
-- Purpose: Fix missing database objects causing API errors
-- Date: January 23, 2026
-- ============================================

-- ============================================
-- FIX 1: Create project_stats VIEW
-- ============================================
-- This view aggregates statistics about projects from components (locations) and tasks
-- Note: Using actual table names from your schema: 'components' and 'tasks'

CREATE OR REPLACE VIEW project_stats AS
SELECT
  p.id as project_id,
  COUNT(DISTINCT c.id) as total_locations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'complete') as complete_locations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'on_hold') as blocked_locations,
  COUNT(t.id) as total_tasks,
  COUNT(t.id) FILTER (WHERE t.status = 'verified') as verified_tasks,
  COALESCE(SUM(t.estimated_cost), 0) as total_estimated_cost,
  COALESCE(SUM(t.estimated_cost) FILTER (WHERE t.status = 'verified'), 0) as verified_cost,
  CASE
    WHEN COUNT(DISTINCT c.id) = 0 THEN 0
    ELSE ROUND((COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'complete')::numeric / COUNT(DISTINCT c.id)::numeric) * 100, 2)
  END as completion_percentage
FROM projects p
LEFT JOIN components c ON c.project_id = p.id
LEFT JOIN tasks t ON t.location_id = c.id
GROUP BY p.id;

COMMENT ON VIEW project_stats IS 'Aggregated statistics for projects including components (locations) and task metrics';

-- ============================================
-- FIX 2: Create scope_templates table FIRST
-- ============================================
-- This must be created before template_tasks because of the foreign key

CREATE TABLE IF NOT EXISTS scope_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scope_templates_active ON scope_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_scope_templates_tenant ON scope_templates(tenant_id);

COMMENT ON TABLE scope_templates IS 'Reusable templates for scopes of work';

-- ============================================
-- FIX 3: Create template_tasks TABLE
-- ============================================
-- This table stores tasks that can be added to scope templates

CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_duration_days INTEGER,
  default_budget_category_id UUID,
  estimated_cost NUMERIC(12, 2),
  sort_order INTEGER DEFAULT 0,
  depends_on_sort_order INTEGER,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to scope_templates
ALTER TABLE template_tasks
DROP CONSTRAINT IF EXISTS template_tasks_template_id_fkey;

ALTER TABLE template_tasks
ADD CONSTRAINT template_tasks_template_id_fkey
FOREIGN KEY (template_id) REFERENCES scope_templates(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_template_tasks_template_id ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks_sort_order ON template_tasks(template_id, sort_order);

COMMENT ON TABLE template_tasks IS 'Tasks that belong to scope templates';
COMMENT ON COLUMN template_tasks.depends_on_sort_order IS 'References sort_order of another task in the same template that must be completed first';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify project_stats view
SELECT
  'project_stats view' as object_name,
  'VIEW' as object_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'project_stats'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Verify template_tasks table
SELECT
  'template_tasks table' as object_name,
  'TABLE' as object_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'template_tasks'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Verify foreign key relationship
SELECT
  constraint_name,
  table_name,
  column_name,
  '✅ Foreign key exists' as status
FROM information_schema.key_column_usage
WHERE table_schema = 'public'
  AND table_name = 'template_tasks'
  AND column_name = 'template_id';

-- Test project_stats view with sample data
SELECT
  project_id,
  total_locations,
  complete_locations,
  blocked_locations,
  total_tasks,
  verified_tasks,
  completion_percentage
FROM project_stats
LIMIT 5;
