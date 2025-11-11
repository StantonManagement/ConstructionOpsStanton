-- ============================================
-- Verify Foreign Key Constraints
-- ============================================
-- This script checks if the required foreign key constraints exist
-- for the payment_applications table to enable Supabase relationship queries
--
-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql/new
-- ============================================

-- Check all foreign keys on payment_applications table
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
    AND tc.table_name = 'payment_applications'
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- Specifically check for the project_id foreign key (required for relationships)
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
        THEN 'OK - Foreign key payment_applications.project_id -> projects.id EXISTS'
        ELSE 'MISSING - Foreign key payment_applications.project_id -> projects.id MISSING'
    END AS status;

-- Specifically check for the contractor_id foreign key
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
        THEN 'OK - Foreign key payment_applications.contractor_id -> contractors.id EXISTS'
        ELSE 'MISSING - Foreign key payment_applications.contractor_id -> contractors.id MISSING'
    END AS status;

