-- Migration: Create action_items table for consolidated dashboard
-- Description: Stores priority-based action items that need PM attention
-- Author: System
-- Date: 2026-02-27

-- Create enum types for action items
CREATE TYPE action_item_type AS ENUM (
  'emergency',
  'blocker',
  'waiting_on_external',
  'waiting_on_bid',
  'waiting_on_contractor',
  'decision_needed',
  'verification_needed',
  'follow_up',
  'upcoming'
);

CREATE TYPE action_item_status AS ENUM (
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'deferred'
);

CREATE TYPE action_item_source AS ENUM (
  'manual',
  'auto_bid_due',
  'auto_overdue_task',
  'auto_verification',
  'auto_payment_review',
  'auto_daily_log_missing',
  'auto_milestone_upcoming'
);

-- Create action_items table
CREATE TABLE IF NOT EXISTS action_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5),
  type action_item_type NOT NULL DEFAULT 'follow_up',
  status action_item_status NOT NULL DEFAULT 'open',
  source action_item_source NOT NULL DEFAULT 'manual',

  -- Context fields
  waiting_on TEXT,
  follow_up_date DATE,

  -- Stale tracking
  is_stale BOOLEAN NOT NULL DEFAULT FALSE,
  days_bumped INTEGER DEFAULT 0,
  prev_priority INTEGER CHECK (prev_priority IS NULL OR (prev_priority >= 1 AND prev_priority <= 5)),
  last_touched_at TIMESTAMP WITH TIME ZONE,

  -- Resolution
  resolution_note TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by INTEGER REFERENCES users(id),

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),

  -- Indexes for common queries
  CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 5)
);

-- Create indexes for performance
CREATE INDEX idx_action_items_project_id ON action_items(project_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_priority ON action_items(priority);
CREATE INDEX idx_action_items_type ON action_items(type);
CREATE INDEX idx_action_items_is_stale ON action_items(is_stale);
CREATE INDEX idx_action_items_follow_up_date ON action_items(follow_up_date);
CREATE INDEX idx_action_items_created_at ON action_items(created_at DESC);

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

-- Enable RLS
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view all action items" ON action_items
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create action items" ON action_items
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update action items" ON action_items
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete action items" ON action_items
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add some sample data for testing (can be removed in production)
-- This will be populated by the application
