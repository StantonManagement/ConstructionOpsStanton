-- Migration: Link Contracts to Budget Items
-- Description: Adds budget_item_id FK to project_contractors to enable "Many Contracts -> 1 Budget Item" logic
-- Date: 2024-11-21

-- 1. Add budget_item_id column to project_contractors
ALTER TABLE public.project_contractors
  ADD COLUMN IF NOT EXISTS budget_item_id integer;

-- 2. Add explicit foreign key constraint
ALTER TABLE public.project_contractors
  ADD CONSTRAINT project_contractors_budget_item_id_fkey
  FOREIGN KEY (budget_item_id)
  REFERENCES public.property_budgets(id)
  ON DELETE SET NULL
  NOT DEFERRABLE INITIALLY IMMEDIATE;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_contractors_budget_item_id
  ON public.project_contractors (budget_item_id);

-- Optional composite index for project-scoped queries
CREATE INDEX IF NOT EXISTS idx_project_contractors_project_budget
  ON public.project_contractors (project_id, budget_item_id);

-- 4. Comment explaining the relationship
COMMENT ON COLUMN public.project_contractors.budget_item_id IS 'Link to property_budgets table. Allows multiple contracts to feed into one budget line item.';

-- 5. Helper view or function could be added here later to auto-calculate committed costs
-- For now, the application layer (API) will handle the summation logic.

