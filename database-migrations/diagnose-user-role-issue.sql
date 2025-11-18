-- Comprehensive diagnosis of user_role access issue

\echo '═══════════════════════════════════════════════════════════'
\echo 'DIAGNOSING USER_ROLE ACCESS ISSUE'
\echo '═══════════════════════════════════════════════════════════'
\echo ''

-- 1. Check if user_role table exists
\echo '1. Checking if user_role table exists...'
SELECT 
  schemaname, 
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename = 'user_role';
\echo ''

-- 2. Check RLS status
\echo '2. Checking RLS status on user_role...'
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_role';
\echo ''

-- 3. List all policies on user_role
\echo '3. Listing all RLS policies on user_role...'
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'user_role';
\echo ''

-- 4. Check current user and their role
\echo '4. Checking current authenticated user...'
SELECT 
  auth.uid() as my_user_id,
  auth.email() as my_email;
\echo ''

-- 5. Try to select from user_role (this might fail)
\echo '5. Attempting to read from user_role...'
SELECT 
  user_id,
  role,
  created_at
FROM user_role 
WHERE user_id = auth.uid();
\echo ''

-- 6. Check all records in user_role (using service role if needed)
\echo '6. All user_role records (if you have admin access)...'
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at,
  au.email
FROM user_role ur
LEFT JOIN auth.users au ON au.id = ur.user_id;
\echo ''

\echo '═══════════════════════════════════════════════════════════'
\echo 'DIAGNOSIS COMPLETE'
\echo '═══════════════════════════════════════════════════════════'

