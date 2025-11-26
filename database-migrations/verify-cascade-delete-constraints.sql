-- Migration: Verify and Document Cascade Delete Constraints
-- Description: Ensures proper cascade delete behavior for CRUD operations
-- Date: 2025-11-25

-- This migration documents the expected cascade delete behavior
-- and adds any missing constraints

-- =============================================================================
-- 1. PROJECT_CONTRACTORS (Contracts)
-- =============================================================================
-- When a contract is deleted from project_contractors:
-- - Associated project_line_items should CASCADE DELETE
-- - Payment applications should be BLOCKED (handled in application logic)

-- Verify/Add CASCADE DELETE for project_line_items
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE project_line_items 
    DROP CONSTRAINT IF EXISTS project_line_items_contract_id_fkey;
    
    -- Add constraint with CASCADE DELETE
    ALTER TABLE project_line_items
    ADD CONSTRAINT project_line_items_contract_id_fkey
    FOREIGN KEY (contract_id)
    REFERENCES contracts(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated project_line_items FK constraint with CASCADE DELETE';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update project_line_items constraint: %', SQLERRM;
END $$;

-- =============================================================================
-- 2. PROJECTS
-- =============================================================================
-- When a project is deleted:
-- - Should be SOFT DELETE (status = 'deleted')
-- - Enforced in application logic, not database
-- - Hard delete should be BLOCKED if dependencies exist

-- No database constraints needed - handled in API

-- =============================================================================
-- 3. CONTRACTORS
-- =============================================================================
-- When a contractor is deleted:
-- - Should be SOFT DELETE (status = 'inactive')
-- - Enforced in application logic, not database
-- - Hard delete should be BLOCKED if dependencies exist

-- No database constraints needed - handled in API

-- =============================================================================
-- 4. PAYMENT_APPLICATIONS
-- =============================================================================
-- When a payment application is deleted:
-- - Associated payment_line_item_progress should CASCADE DELETE
-- - Associated payment_documents should CASCADE DELETE (or SET NULL)

-- Verify/Add CASCADE DELETE for payment_line_item_progress
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE payment_line_item_progress 
    DROP CONSTRAINT IF EXISTS payment_line_item_progress_payment_app_id_fkey;
    
    -- Add constraint with CASCADE DELETE
    ALTER TABLE payment_line_item_progress
    ADD CONSTRAINT payment_line_item_progress_payment_app_id_fkey
    FOREIGN KEY (payment_app_id)
    REFERENCES payment_applications(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Updated payment_line_item_progress FK constraint with CASCADE DELETE';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update payment_line_item_progress constraint: %', SQLERRM;
END $$;

-- =============================================================================
-- 5. CHANGE_ORDERS
-- =============================================================================
-- When a change order is deleted:
-- - No cascading needed currently
-- - Standalone entity

-- No changes needed

-- =============================================================================
-- 6. BUDGET ITEMS (property_budgets)
-- =============================================================================
-- When a budget item is deleted:
-- - Associated project_contractors should SET NULL (budget_item_id)
-- - Already configured in link-contracts-to-budget.sql

-- Verify it's set correctly
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE project_contractors 
    DROP CONSTRAINT IF EXISTS project_contractors_budget_item_id_fkey;
    
    -- Add constraint with SET NULL
    ALTER TABLE project_contractors
    ADD CONSTRAINT project_contractors_budget_item_id_fkey
    FOREIGN KEY (budget_item_id)
    REFERENCES property_budgets(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Verified project_contractors budget FK constraint with SET NULL';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not verify project_contractors budget constraint: %', SQLERRM;
END $$;

-- =============================================================================
-- SUMMARY OF CASCADE DELETE BEHAVIOR
-- =============================================================================
-- 
-- HARD DELETES (Database enforced):
-- - project_line_items CASCADE when contract deleted
-- - payment_line_item_progress CASCADE when payment_application deleted
-- - project_contractors.budget_item_id SET NULL when budget item deleted
--
-- SOFT DELETES (Application enforced):
-- - projects: status = 'deleted'
-- - contractors: status = 'inactive'
--
-- BLOCKED DELETES (Application enforced):
-- - Cannot delete project with active contracts
-- - Cannot delete project with payment applications
-- - Cannot delete contractor with active contracts
-- - Cannot delete contractor with payment applications
-- - Cannot delete contract with active/approved payment applications
--
-- =============================================================================

-- Add comments for documentation
COMMENT ON CONSTRAINT project_line_items_contract_id_fkey ON project_line_items 
IS 'CASCADE DELETE: Line items are deleted when parent contract is deleted';

COMMENT ON CONSTRAINT payment_line_item_progress_payment_app_id_fkey ON payment_line_item_progress 
IS 'CASCADE DELETE: Progress records are deleted when parent payment application is deleted';

COMMENT ON CONSTRAINT project_contractors_budget_item_id_fkey ON project_contractors 
IS 'SET NULL: Contract budget link is cleared when budget item is deleted';


