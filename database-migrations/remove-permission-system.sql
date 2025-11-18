-- ============================================================================
-- SIMPLIFY: REMOVE PERMISSION SYSTEM COMPLEXITY
-- ============================================================================
-- All authenticated users now have the same access
-- Permission system can be added back later if needed
-- ============================================================================

-- Disable RLS on user_role (if not already done)
ALTER TABLE IF EXISTS public.user_role DISABLE ROW LEVEL SECURITY;

-- Drop permission-related policies if they exist
DROP POLICY IF EXISTS "All authenticated users can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Only admins can modify permissions" ON public.permissions;
DROP POLICY IF EXISTS "All authenticated users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only admins can modify role permissions" ON public.role_permissions;

-- Disable RLS on permissions tables
ALTER TABLE IF EXISTS public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions DISABLE ROW LEVEL SECURITY;

-- Verify all RLS is disabled
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN ('user_role', 'permissions', 'role_permissions');

-- All tables should show: rls_enabled = false

