-- ============================================================================
-- SET ADMIN ROLE FOR aks@stantoncap.com
-- ============================================================================
-- This script:
-- 1. Adds updated_at column if missing (fixes trigger issues)
-- 2. Updates your role to admin
-- 3. Verifies the change
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Ensure updated_at exists and trigger maintains it, then set admin role
DO $ddl$
BEGIN
  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_role'
      AND column_name = 'updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.user_role ADD COLUMN updated_at timestamptz';
    EXECUTE 'UPDATE public.user_role SET updated_at = NOW() WHERE updated_at IS NULL';
    EXECUTE 'ALTER TABLE public.user_role ALTER COLUMN updated_at SET DEFAULT NOW()';
    RAISE NOTICE 'Added updated_at column to user_role table';
  END IF;

  -- Recreate trigger function to set updated_at
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.update_user_role_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;
  $fn$;

  -- Ensure trigger exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_role'
      AND t.tgname = 'user_role_set_updated_at'
  ) THEN
    EXECUTE '
      CREATE TRIGGER user_role_set_updated_at
      BEFORE INSERT OR UPDATE ON public.user_role
      FOR EACH ROW
      EXECUTE FUNCTION public.update_user_role_updated_at()
    ';
    RAISE NOTICE 'Created trigger for updated_at column';
  END IF;
END
$ddl$;

-- Your original role update logic
DO $op$
DECLARE
    target_user_id uuid;
    current_role text;
BEGIN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'aks@stantoncap.com';

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'ERROR: User % not found in auth.users', 'aks@stantoncap.com';
        RETURN;
    END IF;

    RAISE NOTICE 'Found user: % (ID: %)', 'aks@stantoncap.com', target_user_id;

    SELECT role INTO current_role
    FROM public.user_role
    WHERE user_id = target_user_id;

    IF current_role IS NOT NULL THEN
        UPDATE public.user_role
        SET role = 'admin'
        WHERE user_id = target_user_id;
        RAISE NOTICE 'SUCCESS: Role updated from % to admin', current_role;
    ELSE
        INSERT INTO public.user_role (user_id, role, created_at)
        VALUES (target_user_id, 'admin', NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET role = 'admin';
        RAISE NOTICE 'SUCCESS: Admin role created for user';
    END IF;
END
$op$;

-- Verify
SELECT 
    u.email,
    ur.role,
    ur.created_at,
    ur.updated_at
FROM auth.users u
LEFT JOIN public.user_role ur ON ur.user_id = u.id
WHERE u.email = 'aks@stantoncap.com';

-- ============================================================================
-- NEXT STEPS:
-- ============================================================================
-- 1. The user aks@stantoncap.com now has admin role
-- 2. Clear browser cache or sessionStorage to refresh the cached role:
--    - Press Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
--    - OR log out and log back in
-- 3. Navigate to Settings > Users to verify access
-- 4. Navigate to Settings > Permissions to manage role permissions
-- ============================================================================

