-- ============================================================================
-- Enable Real-time Replication for Payment Applications
-- ============================================================================
-- This enables real-time subscriptions for the payment_applications table
-- so the UI can auto-update when new payment apps are submitted via SMS
-- ============================================================================

-- Enable replica identity for the table (required for real-time)
-- This allows Supabase to track changes and broadcast them to subscribers
ALTER TABLE payment_applications REPLICA IDENTITY FULL;

-- Enable real-time for the payment_applications table
-- Note: You may also need to enable this in the Supabase Dashboard under:
-- Database > Replication > Select "payment_applications" table
-- This SQL sets it at the database level

-- Add publication for payment_applications if not already included
-- (Supabase automatically creates a 'supabase_realtime' publication)
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'payment_applications'
    ) THEN
        -- Add table to publication
        ALTER PUBLICATION supabase_realtime ADD TABLE payment_applications;
        RAISE NOTICE 'Added payment_applications to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'payment_applications already in supabase_realtime publication';
    END IF;
END $$;

-- Verify the configuration
SELECT
    schemaname,
    tablename,
    'Enabled' as realtime_status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'payment_applications';

-- ============================================================================
-- DONE!
-- ============================================================================
-- Real-time subscriptions are now enabled for payment_applications
-- The ContractorDetailView component will auto-refresh when new payment apps
-- are submitted via SMS
-- ============================================================================
