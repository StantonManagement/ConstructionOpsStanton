-- QUICK FIX: Update your existing daily log request phone number
-- Run this RIGHT NOW to fix the current issue

-- Update the phone number to normalized format
UPDATE daily_log_requests
SET pm_phone_number = '+18603516816'
WHERE pm_phone_number LIKE '%8603516816'
AND pm_phone_number != '+18603516816';

-- Close ALL active payment conversations for this phone (all formats)
UPDATE payment_sms_conversations
SET conversation_state = 'completed',
    completed_at = NOW()
WHERE contractor_phone IN ('+18603516816', '+8603516816', '8603516816', '18603516816')
AND conversation_state IN ('awaiting_start', 'in_progress', 'awaiting_confirmation');

-- Verify the fixes
SELECT 'Daily Log Requests:' as check;
SELECT id, pm_phone_number, request_status FROM daily_log_requests WHERE pm_phone_number LIKE '%860%';

SELECT 'Payment Conversations (should be empty or completed):' as check;
SELECT id, contractor_phone, conversation_state FROM payment_sms_conversations
WHERE contractor_phone LIKE '%860%'
ORDER BY created_at DESC
LIMIT 5;
