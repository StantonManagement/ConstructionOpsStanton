-- ============================================================================
-- DIAGNOSTIC: Check all dependencies before migration
-- ============================================================================
-- Run this FIRST to see what needs to be dropped
-- ============================================================================

-- 1. Check user_role.user_id current type
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_role'
ORDER BY ordinal_position;

-- 2. List ALL policies that use is_admin_or_pm() or is_admin() functions
SELECT 
  schemaname,
  tablename,
  policyname,
  pg_get_expr(pg_policy.polqual, pg_policy.polrelid) as using_clause,
  pg_get_expr(pg_policy.polwithcheck, pg_policy.polrelid) as with_check_clause
FROM pg_policies
JOIN pg_policy ON pg_policies.policyname = pg_policy.polname
JOIN pg_class ON pg_policy.polrelid = pg_class.oid AND pg_class.relname = pg_policies.tablename
WHERE schemaname = 'public'
AND (
  pg_get_expr(pg_policy.polqual, pg_policy.polrelid) LIKE '%is_admin%'
  OR pg_get_expr(pg_policy.polwithcheck, pg_policy.polrelid) LIKE '%is_admin%'
  OR pg_get_expr(pg_policy.polqual, pg_policy.polrelid) LIKE '%user_role%'
  OR pg_get_expr(pg_policy.polwithcheck, pg_policy.polrelid) LIKE '%user_role%'
);

-- 3. List ALL policies on user_role table
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_role';

-- 4. List constraints on user_role
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_role'::regclass;

-- 5. List functions that reference user_role
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('is_admin_or_pm', 'is_admin', 'get_user_role');

-- 6. Check for any views depending on user_role
SELECT 
  dependent_view.relname as view_name
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
WHERE source_table.relname = 'user_role'
AND dependent_view.relkind = 'v';








