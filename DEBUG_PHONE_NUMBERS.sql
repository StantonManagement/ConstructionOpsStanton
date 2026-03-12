-- Debug phone number storage across tables
-- Check what phone numbers exist and their formats

-- 1. Check daily log requests
SELECT
    id,
    pm_phone_number,
    request_status,
    request_date,
    'daily_log_requests' as source
FROM daily_log_requests
WHERE pm_phone_number LIKE '%860%'
OR pm_phone_number LIKE '%351%'
ORDER BY id DESC;

-- 2. Check payment conversations
SELECT
    id,
    contractor_phone,
    conversation_state,
    created_at,
    'payment_sms_conversations' as source
FROM payment_sms_conversations
WHERE contractor_phone LIKE '%860%'
OR contractor_phone LIKE '%351%'
ORDER BY id DESC;

-- 3. Check exact matches
SELECT
    'Exact phone match check:' as info,
    (SELECT COUNT(*) FROM daily_log_requests WHERE pm_phone_number = '+18603516816') as daily_log_count,
    (SELECT COUNT(*) FROM payment_sms_conversations WHERE contractor_phone = '+18603516816') as payment_conv_count;

-- 4. Show active payment conversations for this phone
SELECT *
FROM payment_sms_conversations
WHERE contractor_phone IN ('+18603516816', '+8603516816', '8603516816', '18603516816')
AND conversation_state IN ('awaiting_start', 'in_progress', 'awaiting_confirmation')
ORDER BY created_at DESC;
