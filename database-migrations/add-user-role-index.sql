-- Add index to user_role.user_id for fast role lookups
-- This should reduce role query times from 30+ seconds to <100ms

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_role'
    AND indexname = 'idx_user_role_user_id';

-- Test query performance (should be very fast now)
EXPLAIN ANALYZE
SELECT role 
FROM user_role 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1);





