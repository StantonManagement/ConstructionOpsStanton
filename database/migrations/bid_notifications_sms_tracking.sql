-- Bid Notifications Tracking Table (SMS Only)
-- This table tracks SMS invitations sent to contractors for bid rounds
-- Run this migration to enable SMS notification tracking and delivery status monitoring

CREATE TABLE IF NOT EXISTS bid_notifications (
  id SERIAL PRIMARY KEY,
  bid_round_id INTEGER NOT NULL REFERENCES bid_rounds(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'sms',
  phone_number VARCHAR(50),
  message_content TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  twilio_sid VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bid_notifications_bid_round_id ON bid_notifications(bid_round_id);
CREATE INDEX IF NOT EXISTS idx_bid_notifications_contractor_id ON bid_notifications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bid_notifications_sent_at ON bid_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_bid_notifications_status ON bid_notifications(status);

-- Add RLS (Row Level Security) policies
ALTER TABLE bid_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all bid notifications
CREATE POLICY "Users can view bid notifications"
  ON bid_notifications
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert bid notifications
CREATE POLICY "Authenticated users can insert bid notifications"
  ON bid_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Authenticated users can update their bid notifications
CREATE POLICY "Authenticated users can update bid notifications"
  ON bid_notifications
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE bid_notifications IS 'Tracks SMS and other notifications sent to contractors for bid rounds';
COMMENT ON COLUMN bid_notifications.notification_type IS 'Type of notification: sms, email, portal, etc.';
COMMENT ON COLUMN bid_notifications.status IS 'Status: sent, failed, delivered, read, etc.';
COMMENT ON COLUMN bid_notifications.twilio_sid IS 'Twilio message SID for tracking delivery status';
