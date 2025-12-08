-- Create notification_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type VARCHAR(50) NOT NULL,
  recipient_type VARCHAR(50) NOT NULL,
  recipient_id BIGINT,
  payment_app_id BIGINT REFERENCES payment_applications(id),
  message TEXT NOT NULL,
  channels JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_payment_app_id ON notification_logs(payment_app_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Add comments
COMMENT ON TABLE notification_logs IS 'Stores logs of notifications sent to vendors/contractors';
COMMENT ON COLUMN notification_logs.type IS 'Type of notification (vendor_notification, payment_reminder, etc.)';
COMMENT ON COLUMN notification_logs.recipient_type IS 'Type of recipient (contractor, vendor, etc.)';
COMMENT ON COLUMN notification_logs.recipient_id IS 'ID of the recipient';
COMMENT ON COLUMN notification_logs.channels IS 'JSON object indicating which channels were used (sms, email, etc.)';
COMMENT ON COLUMN notification_logs.status IS 'Status of notification (sent, failed, pending, etc.)';