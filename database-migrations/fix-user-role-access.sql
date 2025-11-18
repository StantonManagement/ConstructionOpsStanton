-- ============================================================================
-- FIX USER_ROLE TABLE ACCESS
-- ============================================================================
-- This script fixes RLS policies so users can read their own role
-- Run this in Supabase SQL Editor (it will work!)
-- ============================================================================

-- Step 1: Check if RLS is enabled on user_role
SELECT 
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'user_role'
  AND n.nspname = 'public';

-- Step 2: Show current policies (if any)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_role';

-- Step 3: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_role;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_role;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_role;

-- Step 4: Create policy allowing users to read their own role
-- This is what's missing and causing the UI to show "staff"
CREATE POLICY "Users can view their own role"
ON public.user_role
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Step 5: Allow admins to view all roles (for user management UI)
CREATE POLICY "Admins can view all roles"
ON public.user_role
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Step 6: Allow admins to insert/update/delete roles
CREATE POLICY "Admins can manage roles"
ON public.user_role
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Step 7: Verify the policies were created
SELECT 
  policyname,
  cmd as command,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_role'
ORDER BY policyname;

-- SUCCESS! The user_role table now has proper RLS policies.
-- Users can read their own role, and admins can manage all roles.

