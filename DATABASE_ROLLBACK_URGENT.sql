-- ============================================
-- URGENT ROLLBACK - Restore contracts table
-- ============================================
-- Reason: Client confirmed contracts and contractors are DIFFERENT
-- - contractors = people/companies (master list)
-- - contracts = agreements (one contractor can have multiple contracts)
-- ============================================

-- STEP 1: Restore contracts table
ALTER TABLE contracts_deprecated_20260121 RENAME TO contracts;

-- STEP 2: Verify contracts table is back
SELECT COUNT(*) as contracts_restored FROM contracts;

-- STEP 3: Restore foreign key on project_line_items
ALTER TABLE project_line_items
ADD CONSTRAINT project_line_items_contract_id_fkey
FOREIGN KEY (contract_id) REFERENCES contracts(id);

-- STEP 4: Verify everything is restored
SELECT
  c.id as contract_id,
  c.project_id,
  c.subcontractor_id,
  c.contract_amount,
  co.name as contractor_name
FROM contracts c
JOIN contractors co ON co.id = c.subcontractor_id
ORDER BY c.project_id;

-- ============================================
-- IMPORTANT: Keep BOTH tables!
-- ============================================
-- The correct architecture is:
--
-- contractors (master)
--     ↓
-- contracts (agreements - one contractor = many contracts)
--     ↓
-- projects (where work happens)
--
-- We should NOT have been using project_contractors as junction!
-- Contracts table IS the junction table!
