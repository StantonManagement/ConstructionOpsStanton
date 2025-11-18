-- Fix RLS policies for user_role table
-- This allows users to read their own role

-- First, check if RLS is enabled on user_role
\echo 'Checking RLS status on user_role table...'
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_role';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own role" ON user_role;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_role;

-- Create policy allowing users to read their own role
CREATE POLICY "Users can view their own role"
ON user_role
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy allowing admins to view all roles (for user management)
CREATE POLICY "Admins can view all roles"
ON user_role
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Allow admins to manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON user_role;
CREATE POLICY "Admins can manage roles"
ON user_role
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

\echo '✓ RLS policies for user_role table have been fixed'
\echo 'Users can now read their own role'
\echo 'Admins can manage all roles'

