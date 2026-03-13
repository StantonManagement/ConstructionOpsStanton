-- Debug why webhook can't find the daily log request
-- Check the current state of daily log requests

-- 1. Show all daily log requests for this phone
SELECT
    id,
    pm_phone_number,
    request_status,
    request_date,
    last_request_sent_at,
    received_at
FROM daily_log_requests
WHERE pm_phone_number = '+18603516816'
ORDER BY id DESC
LIMIT 5;

-- 2. The webhook looks for request_status = 'sent'
-- Check if any exist
SELECT
    id,
    pm_phone_number,
    request_status,
    project_id
FROM daily_log_requests
WHERE pm_phone_number = '+18603516816'
AND request_status = 'sent'
LIMIT 1;

-- 3. If the status is still 'pending', update it to 'sent'
UPDATE daily_log_requests
SET request_status = 'sent',
    last_request_sent_at = NOW()
WHERE pm_phone_number = '+18603516816'
AND request_status = 'pending'
AND request_date = CURRENT_DATE;

-- 4. Verify the update
SELECT
    id,
    pm_phone_number,
    request_status,
    'AFTER UPDATE' as note
FROM daily_log_requests
WHERE pm_phone_number = '+18603516816'
ORDER BY id DESC
LIMIT 3;
