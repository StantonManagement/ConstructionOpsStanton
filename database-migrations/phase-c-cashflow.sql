-- Migration: Phase C - Cash Flow Projections
-- Description: Adds starting_balance to projects and due_date to payment_applications.

-- 1. Add starting_balance to projects
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'starting_balance') THEN
        ALTER TABLE projects 
        ADD COLUMN starting_balance DECIMAL(14,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Add due_date to payment_applications
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_applications' AND column_name = 'due_date') THEN
        ALTER TABLE payment_applications 
        ADD COLUMN due_date DATE;
    END IF;
END $$;

-- 3. Update existing payment applications to have a due_date (default to payment_period_end + 30 days if null)
UPDATE payment_applications 
SET due_date = (payment_period_end::DATE + INTERVAL '30 days')::DATE
WHERE due_date IS NULL AND payment_period_end IS NOT NULL;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_payment_applications_due_date ON payment_applications(due_date);





