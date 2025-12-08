-- Migration to add current_period_value column to payment_applications table
-- Run this in your Supabase SQL editor

-- Add current_period_value column to payment_applications table
-- This column stores the calculated current period value (this period - previous) for easy UI access
ALTER TABLE payment_applications 
ADD COLUMN IF NOT EXISTS current_period_value NUMERIC DEFAULT 0;

-- Create index for current_period_value for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_applications_current_period_value ON payment_applications(current_period_value);

-- Update existing payment applications to populate current_period_value
-- This calculates the current period value for all existing payment applications
UPDATE payment_applications 
SET current_period_value = current_payment 
WHERE current_period_value IS NULL OR current_period_value = 0;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'payment_applications' 
  AND column_name = 'current_period_value';
