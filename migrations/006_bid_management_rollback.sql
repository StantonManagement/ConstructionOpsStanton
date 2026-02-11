-- Rollback script for Bid Management System
-- Run this FIRST if you need to clean up before re-running the migration

-- Drop tables in reverse order (due to foreign key constraints)
DROP TABLE IF EXISTS bid_clarifications CASCADE;
DROP TABLE IF EXISTS bid_scope_items CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS bid_rounds CASCADE;
DROP TABLE IF EXISTS bid_scope_templates CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_bid_updated_at() CASCADE;
