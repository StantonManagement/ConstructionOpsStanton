-- ============================================================================
-- Add Media URLs Column to Daily Log Requests
-- ============================================================================
-- Adds a column to store image URLs from MMS responses
-- ============================================================================

-- Add received_media_urls column (array of text URLs)
ALTER TABLE daily_log_requests
ADD COLUMN IF NOT EXISTS received_media_urls TEXT[];

-- Add comment
COMMENT ON COLUMN daily_log_requests.received_media_urls IS 'Array of image URLs from MMS responses';

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_log_requests'
AND column_name = 'received_media_urls';

-- ============================================================================
-- DONE!
-- ============================================================================
