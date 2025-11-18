-- ============================================
-- Check and Fix Database Relationships
-- ============================================
-- This script verifies and fixes foreign key constraints
-- to enable Supabase relationship queries
--
-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql/new
-- ============================================

-- Step 1: Check current foreign key status
SELECT 
    '=== CURRENT FOREIGN KEY STATUS ===' AS status;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('payment_applications', 'contracts', 'project_contractors')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Step 2: Fix payment_applications.project_id -> projects.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'payment_applications'
            AND kcu.column_name = 'project_id'
            AND ccu.table_name = 'projects'
            AND tc.table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_applications
        ADD CONSTRAINT payment_applications_project_id_fkey 
        FOREIGN KEY (project_id) 
        REFERENCES public.projects(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
        
        RAISE NOTICE '✓ Created foreign key: payment_applications.project_id -> projects.id';
    ELSE
        RAISE NOTICE '✓ Foreign key already exists: payment_applications.project_id -> projects.id';
    END IF;
END $$;

-- Step 3: Fix payment_applications.contractor_id -> contractors.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'payment_applications'
            AND kcu.column_name = 'contractor_id'
            AND ccu.table_name = 'contractors'
            AND tc.table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_applications
        ADD CONSTRAINT payment_applications_contractor_id_fkey 
        FOREIGN KEY (contractor_id) 
        REFERENCES public.contractors(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
        
        RAISE NOTICE '✓ Created foreign key: payment_applications.contractor_id -> contractors.id';
    ELSE
        RAISE NOTICE '✓ Foreign key already exists: payment_applications.contractor_id -> contractors.id';
    END IF;
END $$;

-- Step 4: Verify all constraints were created
SELECT 
    '=== VERIFICATION ===' AS status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'payment_applications'
                AND kcu.column_name = 'project_id'
                AND ccu.table_name = 'projects'
                AND tc.table_schema = 'public'
        ) 
        THEN '✓ OK - payment_applications.project_id -> projects.id EXISTS'
        ELSE '✗ MISSING CONSTRAINT - payment_applications.project_id -> projects.id MISSING'
    END AS status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'payment_applications'
                AND kcu.column_name = 'contractor_id'
                AND ccu.table_name = 'contractors'
                AND tc.table_schema = 'public'
        ) 
        THEN '✓ OK - payment_applications.contractor_id -> contractors.id EXISTS'
        ELSE '✗ MISSING CONSTRAINT - payment_applications.contractor_id -> contractors.id MISSING'
    END AS status;

-- After running this script:
-- 1. Wait a few seconds for Supabase schema cache to refresh
-- 2. Restart your development server (npm run dev)
-- 3. Test relationship queries again
-- 4. If still failing, ensure SUPABASE_SERVICE_ROLE_KEY is set in .env

