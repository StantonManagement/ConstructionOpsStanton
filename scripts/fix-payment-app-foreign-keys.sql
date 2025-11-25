-- ============================================
-- Fix Foreign Key Constraints for payment_applications
-- ============================================
-- This script ensures the required foreign key constraints exist
-- for the payment_applications table to enable Supabase relationship queries
--
-- IMPORTANT: Run scripts/verify-foreign-keys.sql first to check current state
-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql/new
-- ============================================

-- Check if project_id foreign key exists, create if missing
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
        -- Add foreign key constraint for project_id
        ALTER TABLE public.payment_applications
        ADD CONSTRAINT payment_applications_project_id_fkey 
        FOREIGN KEY (project_id) 
        REFERENCES public.projects(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: payment_applications.project_id -> projects.id';
    ELSE
        RAISE NOTICE 'Foreign key already exists: payment_applications.project_id -> projects.id';
    END IF;
END $$;

-- Check if contractor_id foreign key exists, create if missing
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
        -- Add foreign key constraint for contractor_id
        ALTER TABLE public.payment_applications
        ADD CONSTRAINT payment_applications_contractor_id_fkey 
        FOREIGN KEY (contractor_id) 
        REFERENCES public.contractors(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Created foreign key: payment_applications.contractor_id -> contractors.id';
    ELSE
        RAISE NOTICE 'Foreign key already exists: payment_applications.contractor_id -> contractors.id';
    END IF;
END $$;

-- Verify the constraints were created
SELECT 
    'Verification: Foreign keys on payment_applications' AS status,
    COUNT(*) AS total_foreign_keys
FROM information_schema.table_constraints AS tc
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'payment_applications'
    AND tc.table_schema = 'public';

-- After running this script:
-- 1. Restart your development server
-- 2. Clear Supabase schema cache (may require Supabase dashboard refresh)
-- 3. Test relationship queries again
-- 4. If still failing, ensure SUPABASE_SERVICE_ROLE_KEY is set in .env










