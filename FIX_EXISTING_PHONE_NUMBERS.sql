-- Fix existing daily log requests with non-normalized phone numbers
-- This updates all phone numbers to E.164 format for consistent matching

-- First, check current phone numbers
SELECT id, pm_phone_number, request_status, request_date
FROM daily_log_requests
WHERE pm_phone_number NOT LIKE '+1%'
ORDER BY id DESC;

-- Update phone numbers to E.164 format (add +1 prefix if missing)
-- Only updates US numbers that don't already have +1
UPDATE daily_log_requests
SET pm_phone_number = '+1' || REGEXP_REPLACE(pm_phone_number, '[^0-9]', '', 'g')
WHERE pm_phone_number !~ '^\+1'
AND REGEXP_REPLACE(pm_phone_number, '[^0-9]', '', 'g') ~ '^[0-9]{10}$';

-- Verify the updates
SELECT id, pm_phone_number, request_status, request_date
FROM daily_log_requests
ORDER BY id DESC
LIMIT 10;
