-- Fix daily_logs to reference projects table (integer ID) instead of properties (UUID)

-- Drop the existing foreign key constraint
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_property_id_fkey;

-- Change property_id from UUID to INTEGER
ALTER TABLE daily_logs ALTER COLUMN property_id TYPE INTEGER USING NULL;

-- Add foreign key constraint to projects table
ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_project_id_fkey
  FOREIGN KEY (property_id) REFERENCES projects(id);

-- Rename the column for clarity (optional but recommended)
ALTER TABLE daily_logs RENAME COLUMN property_id TO project_id;

-- Update the index
DROP INDEX IF EXISTS idx_daily_logs_property_date;
CREATE INDEX idx_daily_logs_project_date ON daily_logs(project_id, log_date);

-- Update any existing records (if any) - this will set them to NULL since we're changing the type
-- Users will need to recreate any test logs
