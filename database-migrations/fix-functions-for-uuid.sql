-- ============================================================================
-- FIX: Update helper functions for UUID user_role.user_id
-- ============================================================================
-- Using CASCADE to drop all dependent policies, then recreate essential ones
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop functions with CASCADE (drops all dependent policies)
-- ============================================================================
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS is_admin_or_pm() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- ============================================================================
-- STEP 2: Recreate functions with correct UUID comparison
-- ============================================================================
CREATE FUNCTION public.is_admin_or_pm()
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

CREATE FUNCTION public.is_admin()
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

CREATE FUNCTION public.get_user_role()
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
-- STEP 3: Recreate essential policies on projects
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
-- STEP 4: Recreate essential policies on contractors
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
-- STEP 5: Recreate essential policies on project_contractors
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
-- STEP 6: Recreate essential policies on payment_applications
-- ============================================================================
CREATE POLICY "Admins and PMs can update any payment application"
ON payment_applications FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete payment applications"
ON payment_applications FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 7: Recreate essential policies on punch_list_items
-- ============================================================================
CREATE POLICY "Admins and PMs can create punch items"
ON punch_list_items FOR INSERT TO authenticated
WITH CHECK (is_admin_or_pm());

CREATE POLICY "Admins and PMs can update punch items"
ON punch_list_items FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete punch items"
ON punch_list_items FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 8: Recreate essential policies on warranties
-- ============================================================================
CREATE POLICY "Admins and PMs can create warranties"
ON warranties FOR INSERT TO authenticated
WITH CHECK (is_admin_or_pm());

CREATE POLICY "Admins and PMs can update warranties"
ON warranties FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete warranties"
ON warranties FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 9: Recreate essential policies on warranty_claims
-- ============================================================================
CREATE POLICY "Admins and PMs can update warranty claims"
ON warranty_claims FOR UPDATE TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Admins can delete warranty claims"
ON warranty_claims FOR DELETE TO authenticated
USING (is_admin());

-- ============================================================================
-- STEP 10: Recreate policy on user_role
-- ============================================================================
CREATE POLICY "Admins can manage roles"
ON user_role FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FUNCTIONS AND POLICIES UPDATED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions now use direct UUID comparison:';
  RAISE NOTICE '  user_role.user_id = auth.uid()';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT: Make sure you have a role assigned:';
  RAISE NOTICE '  SELECT * FROM user_role;';
  RAISE NOTICE '';
  RAISE NOTICE 'If empty, run:';
  RAISE NOTICE '  INSERT INTO user_role (user_id, role)';
  RAISE NOTICE '  SELECT id, ''admin'' FROM auth.users';
  RAISE NOTICE '  WHERE email = ''your-email'';';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
END $$;

-- Show updated function to verify
SELECT 'is_admin_or_pm' as function_name, pg_get_functiondef(oid) as definition
FROM pg_proc WHERE proname = 'is_admin_or_pm';
