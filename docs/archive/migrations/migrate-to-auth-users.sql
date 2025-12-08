-- Migration script to work with auth.users and user_role table
-- This script helps ensure the system works correctly with the existing structure
--
-- ⚠️  IMPORTANT: Run scripts/create-user-role-table.sql FIRST to create the user_role table
-- This migration assumes the user_role table already exists with proper RLS policies

-- 1. First, let's create a backup of the current users table (if it exists)
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- 2. Update existing auth users with metadata from the public.users table
-- This will sync user metadata for users that already exist in auth.users
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT u.*, au.id as auth_id 
        FROM users u 
        LEFT JOIN auth.users au ON u.uuid = au.id::text
        WHERE au.id IS NOT NULL
    LOOP
        -- Update auth user metadata with data from public.users
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_build_object(
            'name', user_record.name,
            'system_access', COALESCE(user_record.system_access, ARRAY['construction']),
            'phone', user_record.phone,
            'company', user_record.company,
            'address', user_record.address,
            'avatar_url', user_record.avatar_url
        )
        WHERE id = user_record.auth_id;
    END LOOP;
END $$;

-- 3. Ensure user_role table has entries for all auth users
-- Insert missing role entries for users that exist in auth.users but not in user_role
-- NOTE: This preserves existing roles from the old 'users' table during migration
-- For fresh setups, scripts/create-user-role-table.sql handles this better (with admin bootstrap)
INSERT INTO user_role (user_id, role)
SELECT au.id, COALESCE(u.role, 'staff') as role
FROM auth.users au
LEFT JOIN users u ON au.id::text = u.uuid
LEFT JOIN user_role ur ON au.id = ur.user_id
WHERE ur.user_id IS NULL
AND au.email_confirmed_at IS NOT NULL -- Only confirmed users
ON CONFLICT (user_id) DO NOTHING; -- Skip if role already exists

-- 4. Create a view to help with the transition (optional)
CREATE OR REPLACE VIEW auth_users_view AS
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'name' as name,
    ur.role,
    au.raw_user_meta_data->>'phone' as phone,
    au.raw_user_meta_data->>'company' as company,
    au.raw_user_meta_data->>'address' as address,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    au.raw_user_meta_data->'system_access' as system_access,
    au.created_at,
    au.last_sign_in_at as last_login,
    au.email_confirmed_at,
    CASE 
        WHEN au.banned_until IS NOT NULL THEN false 
        ELSE true 
    END as is_active
FROM auth.users au
LEFT JOIN user_role ur ON au.id = ur.user_id;

-- 5. Add comments for documentation
COMMENT ON VIEW auth_users_view IS 'View to access user data from auth.users with user_role table';
COMMENT ON TABLE users_backup IS 'Backup of the original public.users table before migration';

-- 6. Create a function to help migrate new users
CREATE OR REPLACE FUNCTION migrate_user_to_auth(
    p_email TEXT,
    p_name TEXT,
    p_role TEXT DEFAULT 'staff',
    p_system_access TEXT[] DEFAULT ARRAY['construction']
)
RETURNS TEXT AS $$
DECLARE
    auth_user_id TEXT;
BEGIN
    -- Check if user already exists in auth.users
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = p_email;
    
    IF auth_user_id IS NOT NULL THEN
        -- Update existing auth user metadata
        UPDATE auth.users 
        SET raw_user_meta_data = jsonb_build_object(
            'name', p_name,
            'system_access', p_system_access
        )
        WHERE id = auth_user_id;
        
        -- Update or insert role
        INSERT INTO user_role (user_id, role)
        VALUES (auth_user_id, p_role)
        ON CONFLICT (user_id) DO UPDATE SET
            role = EXCLUDED.role;
        
        RETURN auth_user_id;
    ELSE
        RAISE EXCEPTION 'User with email % does not exist in auth.users', p_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
GRANT SELECT ON auth_users_view TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_user_to_auth TO authenticated;

-- 8. Create RLS policies for the view (if needed)
ALTER VIEW auth_users_view ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view their own data" ON auth_users_view
    FOR SELECT USING (auth.uid()::text = id);

-- Policy: Admins can view all user data
CREATE POLICY "Admins can view all user data" ON auth_users_view
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_role 
            WHERE user_id = auth.uid()::text 
            AND role IN ('admin', 'super_admin')
        )
    );

-- 9. Create a function to get user profile data
CREATE OR REPLACE FUNCTION get_user_profile(user_id TEXT)
RETURNS JSON AS $$
DECLARE
    user_data JSON;
BEGIN
    SELECT json_build_object(
        'id', au.id,
        'email', au.email,
        'name', au.raw_user_meta_data->>'name',
        'role', ur.role,
        'system_access', au.raw_user_meta_data->'system_access',
        'phone', au.raw_user_meta_data->>'phone',
        'company', au.raw_user_meta_data->>'company',
        'address', au.raw_user_meta_data->>'address',
        'avatar_url', au.raw_user_meta_data->>'avatar_url',
        'created_at', au.created_at,
        'last_login', au.last_sign_in_at,
        'is_active', CASE WHEN au.banned_until IS NOT NULL THEN false ELSE true END
    ) INTO user_data
    FROM auth.users au
    LEFT JOIN user_role ur ON au.id = ur.user_id
    WHERE au.id = user_id;
    
    RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_profile TO authenticated;

-- 10. Add unique constraint to user_role table if not exists
ALTER TABLE user_role ADD CONSTRAINT IF NOT EXISTS user_role_user_id_unique UNIQUE (user_id);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role ON user_role(role);

-- 12. Final step: After confirming everything works, you can optionally drop the old table
-- WARNING: Only run this after confirming the migration is successful!
-- DROP TABLE IF EXISTS users CASCADE;
