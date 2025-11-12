-- ============================================================================
-- CREATE USER_ROLE TABLE MIGRATION
-- ============================================================================
-- This migration creates the user_role table with proper RLS policies
-- Fixes: 406 (Not Acceptable) errors when querying user roles
--
-- Safe to run multiple times (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. CREATE THE USER_ROLE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_role (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('staff', 'pm', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADD FOREIGN KEY CONSTRAINT
-- ============================================================================
-- Link user_role.user_id to auth.users.id
-- ON DELETE CASCADE ensures role entries are removed when users are deleted
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_role_user_id_fkey' 
        AND table_name = 'user_role'
    ) THEN
        ALTER TABLE public.user_role 
        ADD CONSTRAINT user_role_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON public.user_role(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_role ON public.user_role(role);

-- Partial unique index for admin role lookups (performance optimization)
-- This speeds up the EXISTS checks in admin policies
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_role_user_admin 
ON public.user_role(user_id) 
WHERE role = 'admin';

-- 4. CREATE UPDATED_AT TRIGGER
-- ============================================================================
-- Automatically update the updated_at timestamp on row changes
CREATE OR REPLACE FUNCTION public.update_user_role_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it (IF EXISTS for safety)
DROP TRIGGER IF EXISTS trigger_update_user_role_updated_at ON public.user_role;
CREATE TRIGGER trigger_update_user_role_updated_at
    BEFORE UPDATE ON public.user_role
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_role_updated_at();

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.user_role ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_role;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_role;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_role;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_role;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_role;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_role;

-- Policy 1: Authenticated users can read their own role
-- This is the CRITICAL policy that fixes the 406 errors
-- Using scalar subselect for auth.uid() for better query plan caching
CREATE POLICY "Users can read their own role" 
ON public.user_role
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Policy 2: Admins can read all roles
-- Using scalar subselect for auth.uid() for better query plan caching
CREATE POLICY "Admins can read all roles" 
ON public.user_role
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_role 
        WHERE user_id = (SELECT auth.uid()) 
        AND role = 'admin'
    )
);

-- Policy 3: Admins can insert roles
-- Using scalar subselect for auth.uid() for better query plan caching
CREATE POLICY "Admins can insert roles" 
ON public.user_role
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_role 
        WHERE user_id = (SELECT auth.uid()) 
        AND role = 'admin'
    )
);

-- Policy 4: Admins can update roles
-- Using scalar subselect for auth.uid() for better query plan caching
CREATE POLICY "Admins can update roles" 
ON public.user_role
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_role 
        WHERE user_id = (SELECT auth.uid()) 
        AND role = 'admin'
    )
);

-- Policy 5: Admins can delete roles
-- Using scalar subselect for auth.uid() for better query plan caching
CREATE POLICY "Admins can delete roles" 
ON public.user_role
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_role 
        WHERE user_id = (SELECT auth.uid()) 
        AND role = 'admin'
    )
);

-- Policy 6: Service role can bypass RLS (explicit for clarity)
-- Note: service_role bypasses RLS by default, but this makes it explicit
CREATE POLICY "Service role can manage all roles"
ON public.user_role
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. MIGRATE EXISTING AUTH USERS
-- ============================================================================
-- Add role entries for any auth users that don't have one yet
-- Default role: 'staff'
-- Only for confirmed users (email_confirmed_at IS NOT NULL)

-- IMPORTANT: The first confirmed user will be given 'admin' role
-- to solve the admin bootstrap problem. All other users get 'staff'.

WITH first_user AS (
    SELECT id, email
    FROM auth.users
    WHERE email_confirmed_at IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1
)
INSERT INTO public.user_role (user_id, role)
SELECT 
    au.id,
    CASE 
        WHEN au.id = (SELECT id FROM first_user) THEN 'admin'
        ELSE 'staff'
    END as role
FROM auth.users au
LEFT JOIN public.user_role ur ON au.id = ur.user_id
WHERE ur.user_id IS NULL
AND au.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Display the admin user for reference and warn if none exists
DO $$
DECLARE
    admin_user RECORD;
    confirmed_user_count INTEGER;
BEGIN
    -- Check how many confirmed users exist
    SELECT COUNT(*) INTO confirmed_user_count
    FROM auth.users
    WHERE email_confirmed_at IS NOT NULL;
    
    -- Try to find the admin user
    SELECT au.id, au.email INTO admin_user
    FROM auth.users au
    JOIN public.user_role ur ON au.id = ur.user_id
    WHERE ur.role = 'admin'
    ORDER BY au.created_at ASC
    LIMIT 1;
    
    IF admin_user.id IS NOT NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '👑 ADMIN USER ASSIGNED:';
        RAISE NOTICE '   Email: %', admin_user.email;
        RAISE NOTICE '   User ID: %', admin_user.id;
        RAISE NOTICE '';
        RAISE NOTICE 'This user can now promote other users to admin/pm roles.';
        RAISE NOTICE '';
    ELSIF confirmed_user_count = 0 THEN
        RAISE WARNING '';
        RAISE WARNING '⚠️  NO CONFIRMED USERS FOUND - NO ADMIN ASSIGNED!';
        RAISE WARNING '';
        RAISE WARNING 'The migration completed but no users were confirmed yet.';
        RAISE WARNING 'Once a user confirms their email and logs in:';
        RAISE WARNING '1. Use service_role to promote them to admin:';
        RAISE WARNING '   UPDATE public.user_role SET role = ''admin''';
        RAISE WARNING '   WHERE user_id = (SELECT id FROM auth.users WHERE email = ''user@example.com'');';
        RAISE WARNING '';
        RAISE WARNING 'Or re-run this migration after users are confirmed.';
        RAISE WARNING '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ Admin user assigned from existing confirmed users.';
        RAISE NOTICE '';
    END IF;
END $$;

-- 8. GRANT NECESSARY PERMISSIONS
-- ============================================================================
-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.user_role TO authenticated;

-- Grant all permissions to service_role (for API operations)
GRANT ALL ON public.user_role TO service_role;
GRANT USAGE, SELECT ON SEQUENCE user_role_id_seq TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the migration was successful
-- Copy and paste them below this migration if needed

-- Check if table exists and has correct structure
DO $$ 
DECLARE
    table_count INTEGER;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    user_count INTEGER;
    role_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_role';
    
    IF table_count = 0 THEN
        RAISE EXCEPTION '❌ Table user_role does not exist!';
    ELSE
        RAISE NOTICE '✅ Table user_role exists';
    END IF;
    
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'user_role' 
    AND relnamespace = 'public'::regnamespace;
    
    IF NOT rls_enabled THEN
        RAISE EXCEPTION '❌ RLS is not enabled on user_role table!';
    ELSE
        RAISE NOTICE '✅ RLS is enabled on user_role table';
    END IF;
    
    -- Check if policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'user_role' 
    AND schemaname = 'public';
    
    IF policy_count < 1 THEN
        RAISE EXCEPTION '❌ No RLS policies found on user_role table!';
    ELSE
        RAISE NOTICE '✅ Found % RLS policies on user_role table', policy_count;
    END IF;
    
    -- Check user counts
    SELECT COUNT(*) INTO user_count
    FROM auth.users 
    WHERE email_confirmed_at IS NOT NULL;
    
    SELECT COUNT(*) INTO role_count
    FROM public.user_role;
    
    RAISE NOTICE '✅ Auth users (confirmed): %', user_count;
    RAISE NOTICE '✅ User roles: %', role_count;
    
    IF role_count < user_count THEN
        RAISE WARNING '⚠️  Some confirmed users are missing role entries!';
        RAISE NOTICE 'Run the migration again or manually insert missing roles';
    ELSE
        RAISE NOTICE '✅ All confirmed users have roles';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 USER_ROLE TABLE MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Check the admin user assigned above';
    RAISE NOTICE '2. Restart your application to clear any cached errors';
    RAISE NOTICE '3. Login with the admin user to promote other users';
    RAISE NOTICE '4. Test the app - the 406 errors should be resolved';
    RAISE NOTICE '';
    RAISE NOTICE '💡 To manually promote a user to admin:';
    RAISE NOTICE '   UPDATE public.user_role SET role = ''admin'' WHERE user_id = ''<user-uuid>'';';
END $$;

-- ============================================================================
-- MANUAL VERIFICATION QUERIES (Optional)
-- ============================================================================
-- Uncomment and run these to manually verify the setup

-- View all user roles
-- SELECT 
--     ur.user_id,
--     au.email,
--     ur.role,
--     ur.created_at
-- FROM public.user_role ur
-- JOIN auth.users au ON ur.user_id = au.id
-- ORDER BY ur.created_at DESC;

-- View RLS policies
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename = 'user_role';

-- Check for users without roles
-- SELECT 
--     au.id,
--     au.email,
--     au.email_confirmed_at
-- FROM auth.users au
-- LEFT JOIN public.user_role ur ON au.id = ur.user_id
-- WHERE ur.user_id IS NULL
-- AND au.email_confirmed_at IS NOT NULL;

-- ============================================================================
-- MANUAL ADMIN PROMOTION (if needed)
-- ============================================================================
-- If you need to manually promote a specific user to admin, run this:
-- Replace '<user-email@example.com>' with the actual user's email

-- UPDATE public.user_role 
-- SET role = 'admin', updated_at = NOW()
-- WHERE user_id = (
--     SELECT id FROM auth.users WHERE email = '<user-email@example.com>'
-- );

-- Or if you know the user UUID directly:
-- UPDATE public.user_role 
-- SET role = 'admin', updated_at = NOW()
-- WHERE user_id = '<user-uuid>';

-- Verify the promotion:
-- SELECT au.email, ur.role, ur.updated_at
-- FROM public.user_role ur
-- JOIN auth.users au ON ur.user_id = au.id
-- WHERE ur.role = 'admin';

