-- Comprehensive Table Existence Check
-- Run this in Supabase SQL Editor to check all required tables

-- Check which tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'users', 'user_role', 'projects', 'contractors', 'contracts', 'project_contractors',
      'project_line_items', 'property_budgets', 'owner_entities', 'loans', 'loan_draws',
      'project_schedules', 'schedule_tasks', 'schedule_defaults', 'task_dependencies',
      'payment_applications', 'payment_line_item_progress', 'payment_documents', 'lien_waivers',
      'change_orders', 'punch_lists', 'punch_list_items', 'punch_list_comments', 
      'punch_list_photos', 'punch_list_categories', 'photos', 'project_documents',
      'warranties', 'warranty_claims', 'warranty_types', 'company_settings', 
      'user_preferences', 'notifications', 'integration_credentials', 'payment_reminders',
      'permissions', 'role_permissions', 'sms_conversations', 'sms_messages',
      'daily_logs', 'daily_log_responses'
    ) THEN '✅ EXPECTED'
    ELSE '⚠️  EXTRA'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check for missing expected tables
WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'users', 'user_role', 'projects', 'contractors', 'contracts', 'project_contractors',
    'project_line_items', 'property_budgets', 'owner_entities', 'loans', 'loan_draws',
    'project_schedules', 'schedule_tasks', 'schedule_defaults', 'task_dependencies',
    'payment_applications', 'payment_line_item_progress', 'payment_documents', 'lien_waivers',
    'change_orders', 'punch_lists', 'punch_list_items', 'punch_list_comments', 
    'punch_list_photos', 'punch_list_categories', 'photos', 'project_documents',
    'warranties', 'warranty_claims', 'warranty_types', 'company_settings', 
    'user_preferences', 'notifications', 'integration_credentials', 'payment_reminders',
    'permissions', 'role_permissions', 'sms_conversations', 'sms_messages',
    'daily_logs', 'daily_log_responses'
  ]) AS table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 
  e.table_name as missing_table
FROM expected_tables e
LEFT JOIN existing_tables ex ON e.table_name = ex.table_name
WHERE ex.table_name IS NULL
ORDER BY e.table_name;

-- Count summary
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
  (SELECT COUNT(*) FROM (
    SELECT unnest(ARRAY[
      'users', 'user_role', 'projects', 'contractors', 'contracts', 'project_contractors',
      'project_line_items', 'property_budgets', 'owner_entities', 'loans', 'loan_draws',
      'project_schedules', 'schedule_tasks', 'schedule_defaults', 'task_dependencies',
      'payment_applications', 'payment_line_item_progress', 'payment_documents', 'lien_waivers',
      'change_orders', 'punch_lists', 'punch_list_items', 'punch_list_comments', 
      'punch_list_photos', 'punch_list_categories', 'photos', 'project_documents',
      'warranties', 'warranty_claims', 'warranty_types', 'company_settings', 
      'user_preferences', 'notifications', 'integration_credentials', 'payment_reminders',
      'permissions', 'role_permissions', 'sms_conversations', 'sms_messages',
      'daily_logs', 'daily_log_responses'
    ]) AS table_name
  ) x) as expected_tables,
  (SELECT COUNT(*) FROM (
    WITH expected_tables AS (
      SELECT unnest(ARRAY[
        'users', 'user_role', 'projects', 'contractors', 'contracts', 'project_contractors',
        'project_line_items', 'property_budgets', 'owner_entities', 'loans', 'loan_draws',
        'project_schedules', 'schedule_tasks', 'schedule_defaults', 'task_dependencies',
        'payment_applications', 'payment_line_item_progress', 'payment_documents', 'lien_waivers',
        'change_orders', 'punch_lists', 'punch_list_items', 'punch_list_comments', 
        'punch_list_photos', 'punch_list_categories', 'photos', 'project_documents',
        'warranties', 'warranty_claims', 'warranty_types', 'company_settings', 
        'user_preferences', 'notifications', 'integration_credentials', 'payment_reminders',
        'permissions', 'role_permissions', 'sms_conversations', 'sms_messages',
        'daily_logs', 'daily_log_responses'
      ]) AS table_name
    ),
    existing_tables AS (
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    )
    SELECT e.table_name
    FROM expected_tables e
    LEFT JOIN existing_tables ex ON e.table_name = ex.table_name
    WHERE ex.table_name IS NULL
  ) y) as missing_tables;
