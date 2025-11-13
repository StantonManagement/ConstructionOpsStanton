-- Enable Row Level Security for Settings Tables
-- This allows fine-grained access control based on user roles

-- ============================================
-- 1. COMPANY SETTINGS
-- ============================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read company settings
CREATE POLICY "Anyone authenticated can view company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update company settings
CREATE POLICY "Only admins can modify company settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 2. USER PREFERENCES
-- ============================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can create their own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences"
  ON user_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 3. INTEGRATION CREDENTIALS
-- ============================================

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can read integration credentials
CREATE POLICY "Only admins can view integrations"
  ON integration_credentials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can modify integration credentials
CREATE POLICY "Only admins can modify integrations"
  ON integration_credentials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 4. PAYMENT REMINDERS
-- ============================================

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view reminders for payment apps they have access to
CREATE POLICY "Users can view payment reminders"
  ON payment_reminders
  FOR SELECT
  TO authenticated
  USING (true);  -- Adjust based on your project access logic

-- Authenticated users can create payment reminders
CREATE POLICY "Users can create payment reminders"
  ON payment_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (sent_by = auth.uid());

-- Users can update their own reminders
CREATE POLICY "Users can update their own reminders"
  ON payment_reminders
  FOR UPDATE
  TO authenticated
  USING (sent_by = auth.uid());

-- ============================================
-- 5. CHANGE ORDERS
-- ============================================

ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view change orders
CREATE POLICY "Users can view change orders"
  ON change_orders
  FOR SELECT
  TO authenticated
  USING (true);  -- Adjust based on your project access logic

-- Users can create change orders
CREATE POLICY "Users can create change orders"
  ON change_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update change orders they created (before approval)
CREATE POLICY "Users can update their own pending change orders"
  ON change_orders
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    AND status = 'pending'
  );

-- Admins can approve/reject change orders
CREATE POLICY "Admins can approve/reject change orders"
  ON change_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Anyone authenticated can view company settings" ON company_settings 
  IS 'All logged-in users can read company information';

COMMENT ON POLICY "Only admins can modify company settings" ON company_settings 
  IS 'Only users with admin role can create/update/delete company settings';

COMMENT ON POLICY "Users can view their own preferences" ON user_preferences 
  IS 'Users can only see their own notification and display preferences';

COMMENT ON POLICY "Users can create their own preferences" ON user_preferences 
  IS 'Users can initialize their preference settings';

COMMENT ON POLICY "Users can update their own preferences" ON user_preferences 
  IS 'Users can modify their own preference settings';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify policies are in place:
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('company_settings', 'user_preferences', 'integration_credentials', 'payment_reminders', 'change_orders')
-- ORDER BY tablename, policyname;

