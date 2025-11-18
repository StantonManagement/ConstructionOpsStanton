-- ============================================================================
-- SET ADMIN ROLE FOR aks@stantoncap.com (BYPASS RLS VERSION)
-- ============================================================================
-- This version uses a SECURITY DEFINER function to bypass RLS if needed
-- Run this in your Supabase SQL Editor
-- Note: Uses public.user_role (singular) - columns: id, created_at, user_id, role
-- ============================================================================

-- Create temporary function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION temp_set_admin_role()
RETURNS TABLE(email text, role text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    current_role text;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE auth.users.email = 'aks@stantoncap.com';

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'ERROR: User aks@stantoncap.com not found in auth.users';
        RETURN;
    END IF;

    RAISE NOTICE 'Found user: aks@stantoncap.com (ID: %)', target_user_id;

    -- Check current role
    SELECT public.user_role.role INTO current_role
    FROM public.user_role
    WHERE user_role.user_id = target_user_id;

    IF current_role IS NOT NULL THEN
        RAISE NOTICE 'Current role: %', current_role;
        
        -- Update existing role to admin
        UPDATE public.user_role
        SET role = 'admin'
        WHERE user_role.user_id = target_user_id;
        
        RAISE NOTICE 'SUCCESS: Role updated from % to admin', current_role;
    ELSE
        -- Insert new admin role
        INSERT INTO public.user_role (user_id, role, created_at)
        VALUES (target_user_id, 'admin', now())
        ON CONFLICT (user_id)
        DO UPDATE SET role = 'admin';
        
        RAISE NOTICE 'SUCCESS: Admin role created for user';
    END IF;

    -- Return verification query
    RETURN QUERY
    SELECT 
        u.email::text,
        ur.role::text,
        ur.created_at
    FROM auth.users u
    LEFT JOIN public.user_role ur ON ur.user_id = u.id
    WHERE u.email = 'aks@stantoncap.com';
END;
$$;

-- Execute the function
SELECT * FROM temp_set_admin_role();

-- Drop the temporary function
DROP FUNCTION IF EXISTS temp_set_admin_role();

-- ============================================================================
-- NEXT STEPS:
-- ============================================================================
-- 1. The user aks@stantoncap.com now has admin role
-- 2. Clear browser cache or sessionStorage to refresh the cached role:
--    - Press Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
--    - OR log out and log back in
-- 3. Navigate to Settings > Users to verify access
-- 4. Navigate to Settings > Permissions to manage role permissions
-- ============================================================================

