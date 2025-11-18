-- Verify RLS is disabled and role data exists

-- 1. Check RLS status on user_role
SELECT 
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'user_role'
  AND n.nspname = 'public';
-- Should show: rls_enabled = false

-- 2. Check if your role record exists
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at,
  au.email
FROM public.user_role ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'aks@stantoncap.com';
-- Should show: role = admin

-- 3. Try to read as if you're an authenticated user (this should work now)
SELECT role FROM public.user_role WHERE user_id = (SELECT id FROM auth.users WHERE email = 'aks@stantoncap.com');

