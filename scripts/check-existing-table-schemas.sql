-- Check actual schema of existing tables to avoid column mismatches
-- Run this in Supabase SQL Editor

-- 1. Check punch_list_categories structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'punch_list_categories'
ORDER BY ordinal_position;

-- 2. Check punch_list_items structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'punch_list_items'
ORDER BY ordinal_position;

-- 3. Check daily_logs structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'daily_logs'
ORDER BY ordinal_position;

-- 4. Check payment_applications structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'payment_applications'
ORDER BY ordinal_position;

-- 5. List all existing tables to see what we actually have
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
