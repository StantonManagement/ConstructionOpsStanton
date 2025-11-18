-- Run this query to verify your user setup
-- This will help us diagnose why the UI shows "staff" instead of "admin"

-- 1. Check current authenticated user
SELECT auth.uid() as current_user_id;

-- 2. Check your user_role record
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at,
  au.email
FROM user_role ur
LEFT JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'aks@stantoncap.com';

-- 3. Verify the user exists in auth.users
SELECT 
  id as user_id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'aks@stantoncap.com';

-- 4. Check if there are duplicate user_role entries (shouldn't be, but let's verify)
SELECT 
  user_id,
  role,
  COUNT(*) as count
FROM user_role
GROUP BY user_id, role
HAVING COUNT(*) > 1;

-- 5. Test the permission check function
SELECT user_has_permission('permissions_manage') as can_manage_permissions;

