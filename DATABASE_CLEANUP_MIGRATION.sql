-- ============================================
-- DATABASE CLEANUP & MIGRATION PLAN
-- ============================================
-- Purpose: Migrate from dual-table system to single modern table
-- Safe to run: YES - includes rollback steps
-- Generated: January 21, 2026
-- ============================================

-- ============================================
-- STEP 0: SAFETY CHECKS (Run this first to review!)
-- ============================================

-- Check what data exists in contracts but NOT in project_contractors
SELECT
  'NEEDS_MIGRATION' as status,
  c.id as contract_id,
  c.project_id,
  c.subcontractor_id as contractor_id,
  c.contract_amount,
  c.original_contract_amount,
  c.start_date,
  c.end_date,
  c.contract_nickname
FROM contracts c
LEFT JOIN project_contractors pc
  ON c.project_id = pc.project_id
  AND c.subcontractor_id = pc.contractor_id
WHERE pc.id IS NULL;

-- Check what data exists in BOTH tables (potential conflicts)
SELECT
  'DUPLICATE' as status,
  c.id as contract_id,
  pc.id as project_contractor_id,
  c.project_id,
  c.subcontractor_id as contractor_id,
  c.contract_amount as contracts_amount,
  pc.contract_amount as project_contractors_amount,
  CASE
    WHEN c.contract_amount = pc.contract_amount THEN '✅ Amounts match'
    ELSE '❌ AMOUNT MISMATCH!'
  END as amount_status
FROM contracts c
INNER JOIN project_contractors pc
  ON c.project_id = pc.project_id
  AND c.subcontractor_id = pc.contractor_id;

-- ============================================
-- STEP 1: CREATE BACKUP TABLE (Safety First!)
-- ============================================

-- Backup contracts table before any changes
CREATE TABLE contracts_backup_20260121 AS
SELECT * FROM contracts;

-- Verify backup was created
SELECT COUNT(*) as backed_up_rows FROM contracts_backup_20260121;

-- ============================================
-- STEP 2: MIGRATE MISSING DATA
-- ============================================

-- Migrate contractor 31 (and any others not in project_contractors)
INSERT INTO project_contractors (
  project_id,
  contractor_id,
  contract_amount,
  original_contract_amount,
  paid_to_date,
  contract_status,
  display_order,
  change_orders_pending,
  budget_item_id,
  last_payment_date,
  updated_at
)
SELECT
  c.project_id,
  c.subcontractor_id as contractor_id,
  c.contract_amount,
  COALESCE(c.original_contract_amount, c.contract_amount) as original_contract_amount,
  0 as paid_to_date, -- Start at 0, will be updated from payment_applications
  'active' as contract_status,
  COALESCE(c.display_order, 0) as display_order,
  false as change_orders_pending,
  NULL as budget_item_id, -- No budget linking in old system
  NULL as last_payment_date,
  NOW() as updated_at
FROM contracts c
LEFT JOIN project_contractors pc
  ON c.project_id = pc.project_id
  AND c.subcontractor_id = pc.contractor_id
WHERE pc.id IS NULL; -- Only insert what's missing

-- Verify migration
SELECT
  'MIGRATED' as status,
  project_id,
  contractor_id,
  contract_amount
FROM project_contractors
WHERE updated_at >= NOW() - INTERVAL '1 minute';

-- ============================================
-- STEP 3: FIX DATA CONFLICTS (Project 21)
-- ============================================

-- Review conflicts first
SELECT
  pc.id,
  pc.project_id,
  pc.contractor_id,
  pc.contract_amount as current_amount,
  c.contract_amount as contracts_amount,
  pc.paid_to_date,
  pc.contract_status
FROM project_contractors pc
INNER JOIN contracts c
  ON c.project_id = pc.project_id
  AND c.subcontractor_id = pc.contractor_id
WHERE pc.contract_amount != c.contract_amount;

-- ⚠️ MANUAL DECISION NEEDED:
-- For contractor 26 on project 21:
--   contracts table: $100,000
--   project_contractors: $100
--
-- Which is correct? Run ONE of these:

-- OPTION A: If contracts table has correct amount ($100,000)
UPDATE project_contractors
SET
  contract_amount = 100000,
  original_contract_amount = 100000,
  updated_at = NOW()
WHERE project_id = 21
  AND contractor_id = 26
  AND contract_amount = 100;

-- OPTION B: If project_contractors has correct amount ($100)
-- (Do nothing - project_contractors is already correct)

-- ============================================
-- STEP 4: UPDATE PAID_TO_DATE FROM PAYMENT HISTORY
-- ============================================

-- Calculate actual paid_to_date from payment_applications
UPDATE project_contractors pc
SET
  paid_to_date = COALESCE(payment_totals.total_paid, 0),
  last_payment_date = payment_totals.last_payment,
  updated_at = NOW()
FROM (
  SELECT
    project_id,
    contractor_id,
    SUM(COALESCE(final_amount, current_payment, 0)) as total_paid,
    MAX(approved_at) as last_payment
  FROM payment_applications
  WHERE status IN ('approved', 'paid')
  GROUP BY project_id, contractor_id
) payment_totals
WHERE pc.project_id = payment_totals.project_id
  AND pc.contractor_id = payment_totals.contractor_id;

-- Verify paid_to_date updates
SELECT
  pc.project_id,
  pc.contractor_id,
  pc.contract_amount,
  pc.paid_to_date,
  pc.last_payment_date,
  ROUND((pc.paid_to_date / NULLIF(pc.contract_amount, 0)) * 100, 2) as percent_paid
FROM project_contractors pc
WHERE pc.paid_to_date > 0
ORDER BY pc.project_id, pc.contractor_id;

-- ============================================
-- STEP 5: DROP FOREIGN KEY FROM project_line_items
-- ============================================

-- Find the constraint name first
SELECT
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name = 'project_line_items'
  AND column_name = 'contract_id';

-- Drop the foreign key constraint
ALTER TABLE project_line_items
DROP CONSTRAINT IF EXISTS project_line_items_contract_id_fkey;

-- Set contract_id to NULL (preserve contractor_id)
UPDATE project_line_items
SET contract_id = NULL
WHERE contract_id IS NOT NULL;

-- Verify line items still have contractor_id
SELECT
  id,
  project_id,
  contractor_id,
  contract_id, -- Should be NULL now
  description_of_work,
  scheduled_value
FROM project_line_items
WHERE contractor_id IS NOT NULL
LIMIT 10;

-- ============================================
-- STEP 6: DROP FOREIGN KEY FROM change_orders_legacy
-- ============================================

-- Check if change_orders_legacy table exists and has data
SELECT COUNT(*) as legacy_co_count
FROM change_orders_legacy
WHERE contract_id IS NOT NULL;

-- If count > 0, migrate to change_orders first (linking to contractors)
-- Then drop the constraint
ALTER TABLE change_orders_legacy
DROP CONSTRAINT IF EXISTS change_orders_contract_id_fkey;

-- ============================================
-- STEP 7: RENAME contracts TABLE (Don't delete yet!)
-- ============================================

-- Rename instead of dropping (safer)
ALTER TABLE contracts
RENAME TO contracts_deprecated_20260121;

-- Verify table is renamed
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'contracts%'
ORDER BY table_name;

-- ============================================
-- STEP 8: VERIFY EVERYTHING STILL WORKS
-- ============================================

-- Test 1: Can we query project contractors?
SELECT
  pc.id,
  p.name as project_name,
  c.name as contractor_name,
  c.trade,
  pc.contract_amount,
  pc.paid_to_date,
  pc.contract_status
FROM project_contractors pc
JOIN projects p ON p.id = pc.project_id
JOIN contractors c ON c.id = pc.contractor_id
ORDER BY p.id, pc.display_order;

-- Test 2: Can we get payment applications?
SELECT
  pa.id,
  p.name as project_name,
  c.name as contractor_name,
  pa.status,
  pa.current_payment,
  pa.created_at
FROM payment_applications pa
JOIN projects p ON p.id = pa.project_id
JOIN contractors c ON c.id = pa.contractor_id
ORDER BY pa.created_at DESC
LIMIT 10;

-- Test 3: Can we get line items?
SELECT
  pli.id,
  p.name as project_name,
  c.name as contractor_name,
  pli.description_of_work,
  pli.scheduled_value,
  pli.status
FROM project_line_items pli
JOIN projects p ON p.id = pli.project_id
JOIN contractors c ON c.id = pli.contractor_id
WHERE pli.status = 'active'
ORDER BY pli.project_id, pli.display_order
LIMIT 10;

-- ============================================
-- STEP 9: CLEANUP project_line_items (Optional - do after testing)
-- ============================================

-- After confirming everything works, remove the contract_id column entirely
-- ALTER TABLE project_line_items DROP COLUMN contract_id;

-- ============================================
-- STEP 10: FINAL CLEANUP (Optional - do after 1 month)
-- ============================================

-- After 1 month of testing, you can permanently delete the old tables:
-- DROP TABLE contracts_deprecated_20260121;
-- DROP TABLE contracts_backup_20260121;
-- DROP TABLE change_orders_legacy; -- If no longer needed

-- ============================================
-- ROLLBACK PLAN (If something goes wrong)
-- ============================================

-- To rollback:
-- 1. Restore from backup:
--    ALTER TABLE contracts_backup_20260121 RENAME TO contracts;
--
-- 2. Delete migrated data from project_contractors:
--    DELETE FROM project_contractors
--    WHERE updated_at >= '2026-01-21' -- Use actual migration timestamp
--    AND id NOT IN (SELECT id FROM contracts_backup_20260121);
--
-- 3. Restore foreign keys:
--    ALTER TABLE project_line_items
--    ADD CONSTRAINT project_line_items_contract_id_fkey
--    FOREIGN KEY (contract_id) REFERENCES contracts(id);

-- ============================================
-- SUMMARY CHECKLIST
-- ============================================
/*
[ ] STEP 0: Review safety checks - see what needs migration
[ ] STEP 1: Create backup table
[ ] STEP 2: Migrate missing data (contractor 31)
[ ] STEP 3: Fix amount conflicts (decide on contractor 26)
[ ] STEP 4: Update paid_to_date from payment history
[ ] STEP 5: Drop contract_id foreign key from line items
[ ] STEP 6: Drop contract_id foreign key from change_orders_legacy
[ ] STEP 7: Rename contracts table (not drop!)
[ ] STEP 8: Test everything still works
[ ] STEP 9: (Later) Remove contract_id column
[ ] STEP 10: (After 1 month) Drop deprecated tables

IMPORTANT: Run each step separately and verify before moving to next!
*/
