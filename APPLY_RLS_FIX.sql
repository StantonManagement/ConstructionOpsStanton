-- ============================================================================
-- QUICK FIX: Apply RLS Policies to Fix Console Errors
-- ============================================================================
-- Run this in Supabase SQL Editor to fix the database errors
-- ============================================================================

-- Fix property_budgets table
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE property_budgets ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Authenticated users can view property budgets" ON property_budgets;
    DROP POLICY IF EXISTS "Authenticated users can create property budgets" ON property_budgets;
    DROP POLICY IF EXISTS "Authenticated users can update property budgets" ON property_budgets;
    DROP POLICY IF EXISTS "Authenticated users can delete property budgets" ON property_budgets;

    -- Create new policies
    CREATE POLICY "Authenticated users can view property budgets"
        ON property_budgets FOR SELECT
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can create property budgets"
        ON property_budgets FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can update property budgets"
        ON property_budgets FOR UPDATE
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can delete property budgets"
        ON property_budgets FOR DELETE
        USING (auth.role() = 'authenticated');

    RAISE NOTICE 'Fixed property_budgets RLS policies';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'property_budgets table does not exist or error: %', SQLERRM;
END $$;

-- Fix payment_applications table
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Authenticated users can view payment applications" ON payment_applications;
    DROP POLICY IF EXISTS "Authenticated users can create payment applications" ON payment_applications;
    DROP POLICY IF EXISTS "Authenticated users can update payment applications" ON payment_applications;
    DROP POLICY IF EXISTS "Authenticated users can delete payment applications" ON payment_applications;

    -- Create new policies
    CREATE POLICY "Authenticated users can view payment applications"
        ON payment_applications FOR SELECT
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can create payment applications"
        ON payment_applications FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can update payment applications"
        ON payment_applications FOR UPDATE
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can delete payment applications"
        ON payment_applications FOR DELETE
        USING (auth.role() = 'authenticated');

    RAISE NOTICE 'Fixed payment_applications RLS policies';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'payment_applications table does not exist or error: %', SQLERRM;
END $$;

-- Fix contractors table
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Authenticated users can view contractors" ON contractors;
    DROP POLICY IF EXISTS "Authenticated users can create contractors" ON contractors;
    DROP POLICY IF EXISTS "Authenticated users can update contractors" ON contractors;
    DROP POLICY IF EXISTS "Authenticated users can delete contractors" ON contractors;

    -- Create new policies
    CREATE POLICY "Authenticated users can view contractors"
        ON contractors FOR SELECT
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can create contractors"
        ON contractors FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can update contractors"
        ON contractors FOR UPDATE
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can delete contractors"
        ON contractors FOR DELETE
        USING (auth.role() = 'authenticated');

    RAISE NOTICE 'Fixed contractors RLS policies';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'contractors table does not exist or error: %', SQLERRM;
END $$;

-- Fix project_contractors table
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE project_contractors ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Authenticated users can view project contractors" ON project_contractors;
    DROP POLICY IF EXISTS "Authenticated users can assign contractors" ON project_contractors;
    DROP POLICY IF EXISTS "Authenticated users can update contractor assignments" ON project_contractors;
    DROP POLICY IF EXISTS "Authenticated users can remove contractors" ON project_contractors;

    -- Create new policies
    CREATE POLICY "Authenticated users can view project contractors"
        ON project_contractors FOR SELECT
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can assign contractors"
        ON project_contractors FOR INSERT
        WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can update contractor assignments"
        ON project_contractors FOR UPDATE
        USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can remove contractors"
        ON project_contractors FOR DELETE
        USING (auth.role() = 'authenticated');

    RAISE NOTICE 'Fixed project_contractors RLS policies';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'project_contractors table does not exist or error: %', SQLERRM;
END $$;

-- Verify everything worked
SELECT
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('property_budgets', 'payment_applications', 'contractors', 'project_contractors')
GROUP BY tablename
ORDER BY tablename;
