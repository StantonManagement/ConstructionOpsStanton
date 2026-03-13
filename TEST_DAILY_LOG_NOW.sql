-- ============================================================================
-- Temporary: Set Daily Log Request to Current Time for Testing
-- ============================================================================
-- This updates the request time to the current EST time so you can test
-- the cron job immediately
-- ============================================================================

-- Get current time in EST and update the most recent daily log request
-- First, let's see what we have:
SELECT
    id,
    project_id,
    pm_phone_number,
    request_time,
    request_status,
    request_date
FROM daily_log_requests
ORDER BY id DESC
LIMIT 5;

-- Now update the most recent request to current time (you'll need to adjust the time)
-- Replace 'XX:XX' with the current EST time (e.g., '03:22')
-- UPDATE daily_log_requests
-- SET request_time = '03:22'
-- WHERE id = (SELECT id FROM daily_log_requests ORDER BY id DESC LIMIT 1);

-- After updating, verify:
-- SELECT id, project_id, pm_phone_number, request_time, request_status
-- FROM daily_log_requests
-- ORDER BY id DESC
-- LIMIT 1;

-- ============================================================================
-- IMPORTANT: After testing, change it back to the original time!
-- UPDATE daily_log_requests SET request_time = '18:00' WHERE id = X;
-- ============================================================================
