-- Database migrations for payment approval/rejection functionality
-- Run these commands in your Supabase SQL editor

-- 1. Add columns to payment_applications table for approval/rejection tracking
ALTER TABLE payment_applications 
ADD COLUMN IF NOT EXISTS approved_by INTEGER,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS rejected_by INTEGER,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

-- 2. Add foreign key constraints (optional, if users table exists)
-- ALTER TABLE payment_applications 
-- ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
-- ADD CONSTRAINT fk_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id);

-- 3. Create payment_approval_logs table for audit trail
CREATE TABLE IF NOT EXISTS payment_approval_logs (
    id SERIAL PRIMARY KEY,
    payment_app_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'resubmitted')),
    performed_by INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add foreign key constraints for audit table
-- ALTER TABLE payment_approval_logs 
-- ADD CONSTRAINT fk_payment_app FOREIGN KEY (payment_app_id) REFERENCES payment_applications(id) ON DELETE CASCADE,
-- ADD CONSTRAINT fk_performed_by FOREIGN KEY (performed_by) REFERENCES users(id);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_applications_approved_by ON payment_applications(approved_by);
CREATE INDEX IF NOT EXISTS idx_payment_applications_rejected_by ON payment_applications(rejected_by);
CREATE INDEX IF NOT EXISTS idx_payment_applications_status ON payment_applications(status);
CREATE INDEX IF NOT EXISTS idx_payment_approval_logs_payment_app_id ON payment_approval_logs(payment_app_id);

-- 6. Add current_period_value column to payment_applications table
-- This column stores the calculated current period value (this period - previous) for easy UI access
ALTER TABLE payment_applications 
ADD COLUMN IF NOT EXISTS current_period_value NUMERIC DEFAULT 0;

-- 7. Create index for current_period_value for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_applications_current_period_value ON payment_applications(current_period_value);

-- 8. Update existing payment applications to populate current_period_value
-- This calculates the current period value for all existing payment applications
UPDATE payment_applications 
SET current_period_value = current_payment 
WHERE current_period_value IS NULL OR current_period_value = 0;

-- 6. Add RLS policies if needed (uncomment and adjust as needed)
-- Enable RLS
-- ALTER TABLE payment_approval_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read logs
-- CREATE POLICY "Allow authenticated users to read approval logs" ON payment_approval_logs
--   FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert logs
-- CREATE POLICY "Allow authenticated users to insert approval logs" ON payment_approval_logs
--   FOR INSERT TO authenticated WITH CHECK (true);

-- Add request_time column to daily_log_requests table
ALTER TABLE daily_log_requests 
ADD COLUMN request_time TIME DEFAULT '18:00:00';

-- Update existing records to have the default time
UPDATE daily_log_requests 
SET request_time = '18:00:00' 
WHERE request_time IS NULL;