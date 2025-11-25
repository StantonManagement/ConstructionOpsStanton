-- ============================================================================
-- COMPREHENSIVE FIX: user_role UUID Mismatch (CORRECTED ORDER)
-- ============================================================================
-- 
-- This migration changes user_role.user_id from INTEGER to UUID.
-- 
-- CRITICAL: Must drop ALL policies that reference user_role BEFORE changing type
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'user_role' AND column_name = 'user_id';
  
  RAISE NOTICE 'Current user_role.user_id type: %', COALESCE(col_type, 'column not found');
  
  IF col_type = 'uuid' THEN
    RAISE NOTICE 'Column is already UUID type - you can skip to Step 8';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop ALL policies on ALL tables that might reference user_role
-- ============================================================================
-- These policies use is_admin_or_pm() or is_admin() which query user_role

-- Projects
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs can create projects" ON projects;
DROP POLICY IF EXISTS "Admins and PMs can update projects" ON projects;

-- Contractors
DROP POLICY IF EXISTS "Admins can delete contractors" ON contractors;
DROP POLICY IF EXISTS "Admins and PMs can create contractors" ON contractors;
DROP POLICY IF EXISTS "Admins and PMs can update contractors" ON contractors;

-- Project_contractors
DROP POLICY IF EXISTS "Admins can delete project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins and PMs can create project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Admins and PMs can update project contractors" ON project_contractors;

-- Payment_applications
DROP POLICY IF EXISTS "Admins can delete payment applications" ON payment_applications;
DROP POLICY IF EXISTS "Admins and PMs can update any payment application" ON payment_applications;

-- User_role itself
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_role'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_role', pol.policyname);
    RAISE NOTICE 'Dropped policy on user_role: %', pol.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Drop the helper functions that reference user_role
-- ============================================================================
DROP FUNCTION IF EXISTS is_admin_or_pm();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS get_user_role();

-- ============================================================================
-- STEP 4: Drop constraints on user_role
-- ============================================================================
ALTER TABLE user_role DROP CONSTRAINT IF EXISTS user_role_user_id_fkey;
ALTER TABLE user_role DROP CONSTRAINT IF EXISTS fk_user_role_user;
ALTER TABLE user_role DROP CONSTRAINT IF EXISTS user_role_pkey;

DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'user_role'::regclass
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE user_role DROP CONSTRAINT IF EXISTS %I', con.conname);
      RAISE NOTICE 'Dropped constraint: %', con.conname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop constraint %: %', con.conname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 5: Drop indexes on user_role
-- ============================================================================
DROP INDEX IF EXISTS idx_user_role_user_id;
DROP INDEX IF EXISTS user_role_user_id_idx;

-- ============================================================================
-- STEP 6: Clear data and change column type
-- ============================================================================
DELETE FROM user_role;

ALTER TABLE user_role 
  ALTER COLUMN user_id TYPE UUID USING NULL::UUID;

-- ============================================================================
-- STEP 7: Add foreign key to auth.users and index
-- ============================================================================
ALTER TABLE user_role
  ADD CONSTRAINT user_role_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);

-- ============================================================================
-- STEP 8: Recreate helper functions (now types match: UUID = UUID)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_pm()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_role_value text;
BEGIN
  SELECT role INTO user_role_value
  FROM user_role
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role_value, 'staff');
END;
$function$;

-- ============================================================================
-- STEP 9: Recreate RLS policies on user_role
-- ============================================================================
ALTER TABLE user_role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role"
ON user_role FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON user_role FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- STEP 10: Recreate RLS policies on projects
-- ============================================================================
CREATE POLICY "Admins and PMs can create projects"
ON projects FOR INSERT TO authenticated
WITH CHECK (is_admin_or_pm());

CREATE POLICY "Admins and PMs can update projects"
ON projects FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete projects"
ON projects FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 11: Recreate RLS policies on contractors
-- ============================================================================
CREATE POLICY "Admins and PMs can create contractors"
ON contractors FOR INSERT TO authenticated
WITH CHECK (is_admin_or_pm());

CREATE POLICY "Admins and PMs can update contractors"
ON contractors FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete contractors"
ON contractors FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 12: Recreate RLS policies on project_contractors
-- ============================================================================
CREATE POLICY "Admins and PMs can create project contractors"
ON project_contractors FOR INSERT TO authenticated
WITH CHECK (is_admin_or_pm());

CREATE POLICY "Admins and PMs can update project contractors"
ON project_contractors FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete project contractors"
ON project_contractors FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 13: Recreate RLS policies on payment_applications
-- ============================================================================
CREATE POLICY "Admins and PMs can update any payment application"
ON payment_applications FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete payment applications"
ON payment_applications FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 14: Verification
-- ============================================================================
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'user_role' AND column_name = 'user_id';
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'MIGRATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'user_role.user_id type: % (should be uuid)', col_type;
  RAISE NOTICE '';
  RAISE NOTICE 'NOW RUN THIS TO ADD YOUR ADMIN ROLE:';
  RAISE NOTICE '';
  RAISE NOTICE 'INSERT INTO user_role (user_id, role)';
  RAISE NOTICE 'SELECT id, ''admin'' FROM auth.users';
  RAISE NOTICE 'WHERE email = ''your-email@example.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;
