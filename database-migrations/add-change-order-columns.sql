-- Migration: Add Change Order Tracking Columns
-- Date: 2025-01-13
-- Description: Adds columns for tracking original contract amounts, change orders, and display ordering

-- ============================================
-- Step 1: Add columns to project_contractors
-- ============================================

-- Add display_order for drag-and-drop reordering
ALTER TABLE project_contractors 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add original_contract_amount to track base contract value before change orders
ALTER TABLE project_contractors 
ADD COLUMN IF NOT EXISTS original_contract_amount NUMERIC DEFAULT 0;

-- Populate original_contract_amount from existing contract_amount
-- This preserves the current contract amount as the "original" for existing records
UPDATE project_contractors 
SET original_contract_amount = contract_amount 
WHERE original_contract_amount = 0 OR original_contract_amount IS NULL;

-- ============================================
-- Step 2: Add columns to project_line_items
-- ============================================

-- Add change_order_amount to track $ added/removed by change orders
ALTER TABLE project_line_items
ADD COLUMN IF NOT EXISTS change_order_amount NUMERIC DEFAULT 0;

-- ============================================
-- Step 3: Initialize display_order values
-- ============================================

-- Initialize display_order for existing contractors (order by created_at)
-- This gives each contractor within a project a sequential order number
WITH ordered_contractors AS (
  SELECT id, project_id, 
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as row_num
  FROM project_contractors
  WHERE display_order = 0 OR display_order IS NULL
)
UPDATE project_contractors pc
SET display_order = oc.row_num
FROM ordered_contractors oc
WHERE pc.id = oc.id;

-- Initialize display_order for existing line items (order by created_at)
-- This gives each line item within a contract a sequential order number
WITH ordered_items AS (
  SELECT id, contract_id,
    ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY created_at) as row_num
  FROM project_line_items
  WHERE display_order = 0 OR display_order IS NULL
)
UPDATE project_line_items pli
SET display_order = oi.row_num
FROM ordered_items oi
WHERE pli.id = oi.id;

-- ============================================
-- Step 4: Create indexes for performance
-- ============================================

-- Index for contractor ordering queries
CREATE INDEX IF NOT EXISTS idx_project_contractors_display_order 
  ON project_contractors(project_id, display_order);

-- Index for line item ordering queries
CREATE INDEX IF NOT EXISTS idx_project_line_items_display_order 
  ON project_line_items(contract_id, display_order);

-- ============================================
-- Step 5: Verification queries (run after migration)
-- ============================================

-- Uncomment to verify the migration:
/*
-- Check project_contractors columns
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'project_contractors'
  AND column_name IN ('display_order', 'original_contract_amount');

-- Check project_line_items columns
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'project_line_items'
  AND column_name = 'change_order_amount';

-- Check indexes were created
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename IN ('project_contractors', 'project_line_items')
  AND indexname LIKE '%display_order%';

-- Sample data check (contractors)
SELECT 
  id,
  project_id,
  contract_amount,
  original_contract_amount,
  display_order
FROM project_contractors
ORDER BY project_id, display_order
LIMIT 10;

-- Sample data check (line items)
SELECT 
  id,
  contract_id,
  scheduled_value,
  change_order_amount,
  display_order
FROM project_line_items
ORDER BY contract_id, display_order
LIMIT 10;
*/

