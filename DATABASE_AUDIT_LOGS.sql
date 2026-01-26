-- Audit Logs Table Migration
-- This creates a comprehensive audit log system to track all user activities

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_name TEXT,
  changes JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_composite ON audit_logs(entity_type, entity_id);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read audit logs
CREATE POLICY "Users can read audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only allow system/service role to insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a function to automatically log changes
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_user_id UUID,
  p_user_name TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    changes,
    metadata
  ) VALUES (
    p_user_id,
    p_user_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_changes,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Create trigger function for automatic audit logging on projects
CREATE OR REPLACE FUNCTION audit_project_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_changes JSONB;
  v_user_id UUID;
  v_user_name TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'create_project';
    v_changes := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update_project';
    v_changes := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete_project';
    v_changes := to_jsonb(OLD);
  END IF;

  -- Get current user (if available)
  v_user_id := auth.uid();

  -- Get user name from auth.users
  SELECT raw_user_meta_data->>'full_name' INTO v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    changes
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'System'),
    v_action,
    'project',
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    COALESCE(NEW.name, OLD.name),
    v_changes
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for projects table
DROP TRIGGER IF EXISTS audit_projects_insert ON projects;
DROP TRIGGER IF EXISTS audit_projects_update ON projects;
DROP TRIGGER IF EXISTS audit_projects_delete ON projects;

CREATE TRIGGER audit_projects_insert
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION audit_project_changes();

CREATE TRIGGER audit_projects_update
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION audit_project_changes();

CREATE TRIGGER audit_projects_delete
  AFTER DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION audit_project_changes();

-- Add comment
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log tracking all user activities and data changes';
COMMENT ON FUNCTION log_audit_entry IS 'Helper function to manually insert audit log entries';
COMMENT ON FUNCTION audit_project_changes IS 'Automatic trigger function to log project changes';
