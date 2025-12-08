-- Multi-System Authentication Database Migration
-- This migration adds support for multiple systems (construction and tenant assessment)

-- 1. Add system_access column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS system_access TEXT[] DEFAULT ARRAY['construction'];

-- 2. Add is_active column to users table for account management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add last_login column to users table for tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 4. Create systems table for system configuration
CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    base_url TEXT NOT NULL,
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert default system configurations
INSERT INTO systems (id, name, display_name, description, base_url, features, is_active) VALUES
('construction', 'construction', 'Construction Operations', 'Manage construction projects, payments, and contractors', '/', ARRAY['projects', 'contractors', 'payment_applications', 'daily_logs', 'pm_notes', 'lien_waivers', 'site_verification'], true),
('tenant_assessment', 'tenant_assessment', 'Tenant Assessment', 'Manage tenant communications and assessments', '/tenant-assessment', ARRAY['tenants', 'properties', 'maintenance_requests', 'communications', 'assessments', 'documents'], true)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    base_url = EXCLUDED.base_url,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- 6. Create user_system_access table for more granular control (optional)
CREATE TABLE IF NOT EXISTS user_system_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    system_id TEXT REFERENCES systems(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, system_id)
);

-- 7. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_system_access ON users USING GIN (system_access);
CREATE INDEX IF NOT EXISTS idx_user_system_access_user_id ON user_system_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_system_access_system_id ON user_system_access(system_id);

-- 8. Add RLS policies for security
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_system_access ENABLE ROW LEVEL SECURITY;

-- Policy for systems table - allow read access to authenticated users
CREATE POLICY "Allow authenticated users to read systems" ON systems
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for user_system_access table - users can only see their own access
CREATE POLICY "Users can view their own system access" ON user_system_access
    FOR SELECT USING (auth.uid()::text = (SELECT uuid FROM users WHERE id = user_system_access.user_id));

-- Policy for user_system_access table - only admins can modify access
CREATE POLICY "Only admins can modify system access" ON user_system_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE uuid = auth.uid()::text 
            AND role IN ('admin', 'super_admin')
        )
    );

-- 9. Create function to sync system_access array with user_system_access table
CREATE OR REPLACE FUNCTION sync_user_system_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the system_access array when user_system_access changes
    UPDATE users 
    SET system_access = (
        SELECT array_agg(system_id) 
        FROM user_system_access 
        WHERE user_id = NEW.user_id 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    )
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to automatically sync system access
CREATE TRIGGER trigger_sync_user_system_access
    AFTER INSERT OR UPDATE OR DELETE ON user_system_access
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_system_access();

-- 11. Update existing users to have construction access by default
UPDATE users 
SET system_access = ARRAY['construction']
WHERE system_access IS NULL OR array_length(system_access, 1) IS NULL;

-- 12. Create view for easy access to user system permissions
CREATE OR REPLACE VIEW user_system_permissions AS
SELECT 
    u.id as user_id,
    u.uuid,
    u.email,
    u.name,
    u.role,
    u.system_access,
    s.id as system_id,
    s.name as system_name,
    s.display_name as system_display_name,
    s.features as system_features,
    usa.granted_at,
    usa.expires_at
FROM users u
CROSS JOIN systems s
LEFT JOIN user_system_access usa ON u.id = usa.user_id AND s.id = usa.system_id
WHERE s.is_active = true
AND (usa.expires_at IS NULL OR usa.expires_at > CURRENT_TIMESTAMP);

-- 13. Add comments for documentation
COMMENT ON TABLE systems IS 'Configuration for different systems in the multi-system platform';
COMMENT ON TABLE user_system_access IS 'Granular control over user access to different systems';
COMMENT ON COLUMN users.system_access IS 'Array of system IDs the user has access to';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.last_login IS 'Timestamp of user''s last login';
