-- ============================================================================
-- FIX RLS POLICIES FOR PROPERTY_BUDGETS AND RELATED TABLES
-- ============================================================================
-- Purpose: Fix Row Level Security policies blocking budget queries
-- Issue: property_budgets table has RLS enabled but no policies
-- Date: March 12, 2026
-- Related: Console errors in ProjectDetailView and ContractorService
-- ============================================================================

-- ============================================================================
-- FIX 1: PROPERTY_BUDGETS TABLE RLS POLICIES
-- ============================================================================

-- Check if table exists and enable RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'property_budgets'
    ) THEN
        -- Enable Row Level Security
        EXECUTE 'ALTER TABLE property_budgets ENABLE ROW LEVEL SECURITY';

        -- Drop existing policies if any (to avoid conflicts)
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view property budgets" ON property_budgets';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create property budgets" ON property_budgets';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update property budgets" ON property_budgets';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete property budgets" ON property_budgets';

        -- Policy 1: Allow authenticated users to view all property budgets
        EXECUTE 'CREATE POLICY "Authenticated users can view property budgets" ON property_budgets
            FOR SELECT USING (auth.role() = ''authenticated'')';

        -- Policy 2: Allow authenticated users to create property budgets
        EXECUTE 'CREATE POLICY "Authenticated users can create property budgets" ON property_budgets
            FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';

        -- Policy 3: Allow authenticated users to update property budgets
        EXECUTE 'CREATE POLICY "Authenticated users can update property budgets" ON property_budgets
            FOR UPDATE USING (auth.role() = ''authenticated'')';

        -- Policy 4: Allow authenticated users to delete property budgets
        EXECUTE 'CREATE POLICY "Authenticated users can delete property budgets" ON property_budgets
            FOR DELETE USING (auth.role() = ''authenticated'')';

        RAISE NOTICE 'RLS policies created for property_budgets table';
    ELSE
        RAISE NOTICE 'property_budgets table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- FIX 2: PAYMENT_APPLICATIONS TABLE RLS POLICIES
-- ============================================================================

-- Check if table exists and enable RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'payment_applications'
    ) THEN
        -- Enable Row Level Security (may already be enabled)
        EXECUTE 'ALTER TABLE payment_applications ENABLE ROW LEVEL SECURITY';

        -- Drop existing policies if any
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view payment applications" ON payment_applications';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create payment applications" ON payment_applications';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update payment applications" ON payment_applications';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete payment applications" ON payment_applications';

        -- Create policies
        EXECUTE 'CREATE POLICY "Authenticated users can view payment applications" ON payment_applications
            FOR SELECT USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can create payment applications" ON payment_applications
            FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can update payment applications" ON payment_applications
            FOR UPDATE USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can delete payment applications" ON payment_applications
            FOR DELETE USING (auth.role() = ''authenticated'')';

        RAISE NOTICE 'RLS policies created for payment_applications table';
    ELSE
        RAISE NOTICE 'payment_applications table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- FIX 3: CONTRACTORS TABLE RLS POLICIES
-- ============================================================================

-- Check if table exists and enable RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'contractors'
    ) THEN
        -- Enable Row Level Security
        EXECUTE 'ALTER TABLE contractors ENABLE ROW LEVEL SECURITY';

        -- Drop existing policies if any
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view contractors" ON contractors';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create contractors" ON contractors';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update contractors" ON contractors';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete contractors" ON contractors';

        -- Create policies
        EXECUTE 'CREATE POLICY "Authenticated users can view contractors" ON contractors
            FOR SELECT USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can create contractors" ON contractors
            FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can update contractors" ON contractors
            FOR UPDATE USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can delete contractors" ON contractors
            FOR DELETE USING (auth.role() = ''authenticated'')';

        RAISE NOTICE 'RLS policies created for contractors table';
    ELSE
        RAISE NOTICE 'contractors table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- FIX 4: PROPERTIES TABLE RLS POLICIES (if needed)
-- ============================================================================

-- Check if table exists and enable RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'properties'
    ) THEN
        -- Enable Row Level Security
        EXECUTE 'ALTER TABLE properties ENABLE ROW LEVEL SECURITY';

        -- Drop existing policies if any
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view properties" ON properties';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create properties" ON properties';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can update properties" ON properties';
        EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can delete properties" ON properties';

        -- Create policies
        EXECUTE 'CREATE POLICY "Authenticated users can view properties" ON properties
            FOR SELECT USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can create properties" ON properties
            FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can update properties" ON properties
            FOR UPDATE USING (auth.role() = ''authenticated'')';

        EXECUTE 'CREATE POLICY "Authenticated users can delete properties" ON properties
            FOR DELETE USING (auth.role() = ''authenticated'')';

        RAISE NOTICE 'RLS policies created for properties table';
    ELSE
        RAISE NOTICE 'properties table does not exist, skipping';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('property_budgets', 'payment_applications', 'contractors', 'properties')
    AND schemaname = 'public'
ORDER BY tablename;

-- Verify policies exist
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename IN ('property_budgets', 'payment_applications', 'contractors', 'properties')
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE property_budgets IS 'Budget line items for properties - RLS policies allow all authenticated users';
COMMENT ON TABLE payment_applications IS 'Payment applications from contractors - RLS policies allow all authenticated users';
COMMENT ON TABLE contractors IS 'Contractors directory - RLS policies allow all authenticated users';
COMMENT ON TABLE properties IS 'Properties/projects directory - RLS policies allow all authenticated users';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These policies allow ALL authenticated users to perform all operations
-- 2. This is appropriate for internal team tools where all users need full access
-- 3. For external contractor portals, implement separate token-based access
-- 4. Future: Consider role-based policies (admin, pm, staff) if needed
-- ============================================================================
