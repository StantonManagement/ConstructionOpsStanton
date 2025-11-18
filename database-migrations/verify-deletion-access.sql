-- ============================================================================
-- VERIFY AND FIX DELETION ACCESS
-- ============================================================================
-- SECURITY NOTE: This disables RLS on deletion-related tables
-- 
-- WHY THIS IS SAFE FOR THIS APP:
-- 1. Small team application (not multi-tenant SaaS)
-- 2. All authenticated users are trusted
-- 3. API layer already checks authentication
-- 4. Service role used for deletions (bypasses RLS anyway)
-- 5. Simpler than maintaining complex RLS policies
--
-- TRADE-OFF: No row-level isolation (acceptable for small teams)
-- ALTERNATIVE: If you need isolation later, create targeted policies
-- ============================================================================

-- Step 1: Check CURRENT RLS status (run this first to see what will change)
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN (
    'payment_applications',
    'payment_line_item_progress',
    'payment_sms_conversations',
    'payment_documents'
  )
ORDER BY c.relname;

-- Expected result: All tables should show rls_enabled = false
-- If any show true, proceed to Step 2

-- Step 2: Disable RLS on all deletion-related tables
-- IMPORTANT: Review Step 1 results before running these commands
-- Once you run these, row-level security is removed for these tables
ALTER TABLE public.payment_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_line_item_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_sms_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_documents DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify again (all should now be false)
SELECT 
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname IN (
    'payment_applications',
    'payment_line_item_progress',
    'payment_sms_conversations',
    'payment_documents'
  )
ORDER BY c.relname;

-- Success! All deletion-related tables should show rls_enabled = false

