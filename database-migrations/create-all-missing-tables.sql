-- ============================================
-- CREATE ALL MISSING TABLES
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- 1. SCHEDULE_DEFAULTS
CREATE TABLE IF NOT EXISTS schedule_defaults (
  id SERIAL PRIMARY KEY,
  budget_category VARCHAR(255) NOT NULL UNIQUE,
  default_duration_days INTEGER NOT NULL DEFAULT 3,
  display_order INTEGER NOT NULL DEFAULT 999,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_schedule_defaults_budget_category ON schedule_defaults(budget_category);
CREATE INDEX IF NOT EXISTS idx_schedule_defaults_display_order ON schedule_defaults(display_order);

INSERT INTO schedule_defaults (budget_category, default_duration_days, display_order) VALUES
  ('Site Work', 5, 10),
  ('Demolition / Cleanup', 3, 20),
  ('Foundation', 7, 30),
  ('Framing', 14, 40),
  ('Roofing', 5, 50),
  ('Windows', 3, 60),
  ('Exterior Doors', 2, 70),
  ('Siding', 7, 80),
  ('Plumbing - Rough', 5, 90),
  ('HVAC - Rough', 5, 100),
  ('Electrical - Rough', 5, 110),
  ('Insulation', 3, 120),
  ('Drywall', 7, 130),
  ('Interior Doors', 2, 140),
  ('Trim / Millwork', 5, 150),
  ('Cabinets', 3, 160),
  ('Countertops', 2, 170),
  ('Flooring', 5, 180),
  ('Tile', 4, 190),
  ('Painting', 7, 200),
  ('Plumbing - Finish', 3, 210),
  ('HVAC - Finish', 2, 220),
  ('Electrical - Finish', 3, 230),
  ('Appliances', 1, 240),
  ('Landscaping', 5, 250),
  ('Final Cleanup', 2, 260),
  ('Inspection', 1, 270),
  ('Punchlist', 3, 280)
ON CONFLICT (budget_category) DO NOTHING;

-- 2. TASK_DEPENDENCIES
CREATE TABLE IF NOT EXISTS task_dependencies (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_task_id VARCHAR(255) NOT NULL,
  successor_task_id VARCHAR(255) NOT NULL,
  dependency_type VARCHAR(2) DEFAULT 'FS',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(predecessor_task_id, successor_task_id),
  CHECK (predecessor_task_id != successor_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor ON task_dependencies(predecessor_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor ON task_dependencies(successor_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_project ON task_dependencies(project_id);

-- 3. PUNCH_LIST_CATEGORIES
CREATE TABLE IF NOT EXISTS punch_list_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 999,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

INSERT INTO punch_list_categories (name, description, display_order) VALUES
  ('Drywall', 'Drywall repairs and touch-ups', 10),
  ('Paint', 'Paint touch-ups and corrections', 20),
  ('Flooring', 'Flooring issues and repairs', 30),
  ('Electrical', 'Electrical fixtures and outlets', 40),
  ('Plumbing', 'Plumbing fixtures and connections', 50),
  ('HVAC', 'HVAC system issues', 60),
  ('Doors', 'Door installation and hardware', 70),
  ('Windows', 'Window installation and operation', 80),
  ('Trim', 'Trim and molding issues', 90),
  ('Cabinets', 'Cabinet installation and hardware', 100),
  ('Countertops', 'Countertop installation', 110),
  ('Tile', 'Tile work and grouting', 120),
  ('Exterior', 'Exterior work and siding', 130),
  ('Landscaping', 'Landscaping and grading', 140),
  ('Other', 'Miscellaneous items', 999)
ON CONFLICT (name) DO NOTHING;

-- 4. PUNCH_LIST_COMMENTS
CREATE TABLE IF NOT EXISTS punch_list_comments (
  id SERIAL PRIMARY KEY,
  punch_list_item_id INTEGER REFERENCES punch_list_items(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_punch_list_comments_item ON punch_list_comments(punch_list_item_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_comments_user ON punch_list_comments(user_id);

-- 5. PUNCH_LIST_PHOTOS
CREATE TABLE IF NOT EXISTS punch_list_photos (
  id SERIAL PRIMARY KEY,
  punch_list_item_id INTEGER REFERENCES punch_list_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_punch_list_photos_item ON punch_list_photos(punch_list_item_id);

-- 6. COMPANY_SETTINGS
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  company_logo_url TEXT,
  default_payment_terms INTEGER DEFAULT 30,
  default_retainage_percent DECIMAL(5,2) DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default company settings
INSERT INTO company_settings (company_name) VALUES ('Stanton Management')
ON CONFLICT DO NOTHING;

-- 7. INTEGRATION_CREDENTIALS
CREATE TABLE IF NOT EXISTS integration_credentials (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL UNIQUE,
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. PAYMENT_REMINDERS
CREATE TABLE IF NOT EXISTS payment_reminders (
  id SERIAL PRIMARY KEY,
  payment_app_id INTEGER REFERENCES payment_applications(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  sent_to VARCHAR(255),
  message_type VARCHAR(50) DEFAULT 'sms',
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_app ON payment_reminders(payment_app_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at);

-- 9. DAILY_LOG_RESPONSES
CREATE TABLE IF NOT EXISTS daily_log_responses (
  id SERIAL PRIMARY KEY,
  daily_log_id INTEGER REFERENCES daily_logs(id) ON DELETE CASCADE,
  contractor_id INTEGER REFERENCES contractors(id),
  response_text TEXT,
  response_type VARCHAR(50) DEFAULT 'sms',
  received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_daily_log_responses_log ON daily_log_responses(daily_log_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_responses_contractor ON daily_log_responses(contractor_id);

-- ============================================
-- VERIFICATION QUERY
-- Run this after to confirm all tables exist
-- ============================================

SELECT 
  'All missing tables created successfully!' as status,
  COUNT(*) as new_tables_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'schedule_defaults',
    'task_dependencies',
    'punch_list_categories',
    'punch_list_comments',
    'punch_list_photos',
    'company_settings',
    'integration_credentials',
    'payment_reminders',
    'daily_log_responses'
  );
