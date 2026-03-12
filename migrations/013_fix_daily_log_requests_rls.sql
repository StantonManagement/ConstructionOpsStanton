-- ============================================================================
-- Fix Daily Log Requests RLS
-- ============================================================================
-- Disable Row Level Security on daily_log_requests table
-- This allows authenticated users to create/read/update daily log requests
-- ============================================================================

-- Disable RLS on daily_log_requests table
ALTER TABLE IF EXISTS daily_log_requests DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'daily_log_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- Verify RLS is disabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'daily_log_requests';

-- ============================================================================
-- DONE!
-- ============================================================================
-- RLS is now disabled on daily_log_requests table
-- All authenticated users can create/read/update daily log requests
-- ============================================================================
