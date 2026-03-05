-- Migration: Create Action Items Table
-- Task: Task 12 - Action Items Database Schema
-- Purpose: Enable consolidated dashboard with cross-project priority tracking
-- Date: 2026-03-04

BEGIN;

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id BIGSERIAL PRIMARY KEY,

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,

  -- Priority and categorization
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5),
  type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'open',

  -- Assignment and tracking
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  waiting_on TEXT,
  follow_up_date DATE,

  -- Auto-generation tracking
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  auto_trigger TEXT,

  -- Resolution tracking
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Priority history tracking
  previous_priority INTEGER,
  priority_changed_at TIMESTAMPTZ,

  -- Stale/bumped detection
  stale BOOLEAN DEFAULT FALSE,

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_action_items_project_id ON action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items(priority);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_follow_up_date ON action_items(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_action_items_assigned_to ON action_items(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_source ON action_items(source);
CREATE INDEX IF NOT EXISTS idx_action_items_created_at ON action_items(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_action_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER action_items_updated_at_trigger
  BEFORE UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_action_items_updated_at();

-- Create priority change tracking trigger
CREATE OR REPLACE FUNCTION track_action_item_priority_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if priority actually changed
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    NEW.previous_priority = OLD.priority;
    NEW.priority_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER action_items_priority_change_trigger
  BEFORE UPDATE ON action_items
  FOR EACH ROW
  WHEN (OLD.priority IS DISTINCT FROM NEW.priority)
  EXECUTE FUNCTION track_action_item_priority_change();

-- RLS Policies
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view action items for projects they have access to
-- For now, allow all authenticated users to view all action items
-- TODO: Refine based on project access once user permissions are defined
CREATE POLICY action_items_select_policy ON action_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert action items
CREATE POLICY action_items_insert_policy ON action_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update action items
CREATE POLICY action_items_update_policy ON action_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete action items
CREATE POLICY action_items_delete_policy ON action_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE action_items IS 'Action items for consolidated dashboard - tracks priority tasks across all projects';
COMMENT ON COLUMN action_items.priority IS 'Priority level 1-5: 1=Drop Everything, 2=Today/This Week, 3=Needs Push, 4=On Radar, 5=Parked';
COMMENT ON COLUMN action_items.type IS 'Type of action item: emergency, blocker, waiting_on_external, follow_up, general, etc.';
COMMENT ON COLUMN action_items.status IS 'Status: open, in_progress, waiting, resolved, deferred';
COMMENT ON COLUMN action_items.source IS 'Source: manual (user created) or auto (system generated)';
COMMENT ON COLUMN action_items.stale IS 'True if item was deprioritized and has had no updates for 3+ days';

COMMIT;
