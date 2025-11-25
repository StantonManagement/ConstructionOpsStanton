-- Migration: Create Settings and Tracking Tables
-- Date: 2024
-- Description: Adds tables for company settings, user preferences, integration credentials, payment reminders, and change orders

-- Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default company settings row
INSERT INTO company_settings (company_name, address, phone, email)
VALUES ('', '', '', '')
ON CONFLICT DO NOTHING;

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT false,
  sms_notifications BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Integration Credentials Table (for storing encrypted API keys)
CREATE TABLE IF NOT EXISTS integration_credentials (
  id SERIAL PRIMARY KEY,
  integration_name VARCHAR(100) NOT NULL UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  config JSON DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Reminders Table (track reminder history)
CREATE TABLE IF NOT EXISTS payment_reminders (
  id SERIAL PRIMARY KEY,
  payment_app_id INTEGER NOT NULL REFERENCES payment_applications(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('sms', 'email')),
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Change Orders Table (track change order history)
CREATE TABLE IF NOT EXISTS change_orders (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  percentage DECIMAL(5, 2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_app_id ON payment_reminders(payment_app_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_change_orders_contract_id ON change_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_created_at ON change_orders(created_at);

-- Add triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_credentials_updated_at
    BEFORE UPDATE ON integration_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_change_orders_updated_at
    BEFORE UPDATE ON change_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE company_settings IS 'Stores company information and settings';
COMMENT ON TABLE user_preferences IS 'Stores individual user notification and display preferences';
COMMENT ON TABLE integration_credentials IS 'Stores encrypted credentials for external integrations (DocuSign, QuickBooks, etc.)';
COMMENT ON TABLE payment_reminders IS 'Tracks history of reminders sent for payment applications';
COMMENT ON TABLE change_orders IS 'Tracks change orders for contracts with approval workflow';




