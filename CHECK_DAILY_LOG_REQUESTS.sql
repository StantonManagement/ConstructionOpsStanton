-- Check all daily log requests for today
SELECT
    id,
    project_id,
    pm_phone_number,
    request_status,
    request_date,
    request_time,
    last_request_sent_at,
    received_at
FROM daily_log_requests
WHERE request_date = '2026-03-12'
ORDER BY id DESC;

-- If you want to reset a request back to 'pending' status:
-- UPDATE daily_log_requests
-- SET request_status = 'pending', last_request_sent_at = NULL, received_at = NULL
-- WHERE id = [YOUR_REQUEST_ID];

-- Or delete all today's requests to start fresh:
-- DELETE FROM daily_log_requests WHERE request_date = '2026-03-12';
