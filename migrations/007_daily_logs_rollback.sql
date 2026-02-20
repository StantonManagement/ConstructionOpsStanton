-- Rollback Daily Logs Feature

-- Drop tables in reverse order (children first, then parent)
DROP TABLE IF EXISTS daily_log_audio CASCADE;
DROP TABLE IF EXISTS daily_log_photos CASCADE;
DROP TABLE IF EXISTS daily_logs CASCADE;
