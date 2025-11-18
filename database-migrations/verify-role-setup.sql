-- ============================================================================
-- VERIFY YOUR USER ROLE SETUP
-- ============================================================================
-- Run this AFTER running fix-user-role-access.sql
-- This checks if your role is properly set up
-- ============================================================================

-- Check your user record in user_role table
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at,
  au.email,
  au.created_at as user_created_at
FROM public.user_role ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'aks@stantoncap.com';

-- If the above returns nothing, you need to create the role:
-- (Uncomment and run this if needed)
/*
INSERT INTO public.user_role (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'aks@stantoncap.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
*/

-- Verify RLS policies exist
SELECT 
  policyname,
  cmd as applies_to
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_role'
ORDER BY policyname;

