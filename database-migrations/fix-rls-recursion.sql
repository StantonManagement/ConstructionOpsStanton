-- ============================================================================
-- FIX INFINITE RECURSION IN USER_ROLE RLS POLICIES
-- ============================================================================
-- The problem: Policies that query user_role to check if user is admin
-- cause infinite recursion. Solution: Keep it simple!
-- ============================================================================

-- Drop ALL existing policies on user_role
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_role;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_role;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_role;

-- Create ONE simple policy: Users can read their own role
-- This is all the frontend needs!
CREATE POLICY "Users can read own role"
ON public.user_role
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- For INSERT/UPDATE/DELETE by admins, we use the service role in API routes
-- (which bypasses RLS), so we don't need policies for those operations

-- Verify the policy was created
SELECT 
  policyname,
  cmd as applies_to,
  roles
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_role';

-- SUCCESS! No more infinite recursion.
-- Users can read their own role, admins manage via API with service role.

