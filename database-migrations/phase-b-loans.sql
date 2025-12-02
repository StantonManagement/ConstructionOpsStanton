-- Migration: Phase B - Construction Loans
-- Description: Adds tables for tracking construction loans, lender budgets, and draws.

-- 1. Construction Loans Table
CREATE TABLE IF NOT EXISTS construction_loans (
    id SERIAL PRIMARY KEY,
    project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
    lender_name VARCHAR(255) NOT NULL,
    loan_number VARCHAR(100),
    total_amount DECIMAL(14,2) NOT NULL,
    close_date DATE,
    maturity_date DATE,
    interest_rate DECIMAL(5,3),
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'defaulted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Loan Budget Items Table (Lender's categories)
CREATE TABLE IF NOT EXISTS loan_budget_items (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES construction_loans(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    original_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
    locked_at TIMESTAMP,
    locked_by UUID REFERENCES auth.users(id),
    approved_change_orders DECIMAL(12,2) DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Loan Draws Table
CREATE TABLE IF NOT EXISTS loan_draws (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES construction_loans(id) ON DELETE CASCADE,
    draw_number INTEGER NOT NULL,
    request_date DATE NOT NULL,
    approval_date DATE,
    funded_date DATE,
    amount_requested DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_approved DECIMAL(12,2),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'funded', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Loan Draw Allocations Table (Split draw across budget items)
CREATE TABLE IF NOT EXISTS loan_draw_allocations (
    id SERIAL PRIMARY KEY,
    draw_id INTEGER REFERENCES loan_draws(id) ON DELETE CASCADE,
    budget_item_id INTEGER REFERENCES loan_budget_items(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    UNIQUE(draw_id, budget_item_id)
);

-- 5. Budget Category Mapping (Internal <-> Lender)
CREATE TABLE IF NOT EXISTS budget_category_loan_mapping (
    id SERIAL PRIMARY KEY,
    budget_category_id INTEGER REFERENCES property_budgets(id) ON DELETE CASCADE,
    loan_budget_item_id INTEGER REFERENCES loan_budget_items(id) ON DELETE CASCADE,
    allocation_percentage DECIMAL(5,2) DEFAULT 100,
    UNIQUE(budget_category_id, loan_budget_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_construction_loans_project_id ON construction_loans(project_id);
CREATE INDEX IF NOT EXISTS idx_loan_budget_items_loan_id ON loan_budget_items(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_draws_loan_id ON loan_draws(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_draws_status ON loan_draws(status);

-- Enable RLS
ALTER TABLE construction_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_draw_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_category_loan_mapping ENABLE ROW LEVEL SECURITY;

-- Create policies (Simplified: Authenticated users can access)
-- In a real scenario, restrict to project members/admins.

-- Construction Loans
CREATE POLICY "Loans viewable by authenticated" ON construction_loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Loans insertable by authenticated" ON construction_loans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Loans updateable by authenticated" ON construction_loans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Loans deletable by authenticated" ON construction_loans FOR DELETE TO authenticated USING (true);

-- Budget Items
CREATE POLICY "Budget items viewable by authenticated" ON loan_budget_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Budget items insertable by authenticated" ON loan_budget_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Budget items updateable by authenticated" ON loan_budget_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Budget items deletable by authenticated" ON loan_budget_items FOR DELETE TO authenticated USING (true);

-- Draws
CREATE POLICY "Draws viewable by authenticated" ON loan_draws FOR SELECT TO authenticated USING (true);
CREATE POLICY "Draws insertable by authenticated" ON loan_draws FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Draws updateable by authenticated" ON loan_draws FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Draws deletable by authenticated" ON loan_draws FOR DELETE TO authenticated USING (true);

-- Draw Allocations
CREATE POLICY "Allocations viewable by authenticated" ON loan_draw_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allocations insertable by authenticated" ON loan_draw_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allocations updateable by authenticated" ON loan_draw_allocations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allocations deletable by authenticated" ON loan_draw_allocations FOR DELETE TO authenticated USING (true);

-- Mapping
CREATE POLICY "Mapping viewable by authenticated" ON budget_category_loan_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mapping insertable by authenticated" ON budget_category_loan_mapping FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Mapping updateable by authenticated" ON budget_category_loan_mapping FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Mapping deletable by authenticated" ON budget_category_loan_mapping FOR DELETE TO authenticated USING (true);




