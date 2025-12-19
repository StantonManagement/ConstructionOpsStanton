# Comprehensive Database Table Check

**CRITICAL:** Run this immediately to identify all missing tables.

---

## 🚨 Quick Check - Run This SQL Now

Copy and paste this into your **Supabase SQL Editor**:

```sql
-- Quick check for missing tables
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
  '❌ MISSING: ' || e.table_name as status
FROM expected_tables e
LEFT JOIN existing_tables ex ON e.table_name = ex.table_name
WHERE ex.table_name IS NULL
ORDER BY e.table_name;
```

---

## 📋 Expected Tables (40 total)

### Core Tables (7)
- [ ] `users`
- [ ] `user_role`
- [ ] `projects`
- [ ] `contractors`
- [ ] `contracts`
- [ ] `project_contractors`
- [ ] `project_line_items`

### Budget & Financial (3)
- [ ] `property_budgets`
- [ ] `owner_entities`
- [ ] `loans`
- [ ] `loan_draws`

### Schedule (4)
- [ ] `project_schedules`
- [ ] `schedule_tasks`
- [ ] `schedule_defaults` ⚠️ **KNOWN MISSING**
- [ ] `task_dependencies`

### Payment Applications (4)
- [ ] `payment_applications`
- [ ] `payment_line_item_progress`
- [ ] `payment_documents`
- [ ] `lien_waivers`

### Change Orders (1)
- [ ] `change_orders`

### Punch Lists (5)
- [ ] `punch_lists`
- [ ] `punch_list_items`
- [ ] `punch_list_comments`
- [ ] `punch_list_photos`
- [ ] `punch_list_categories`

### Photos & Documents (2)
- [ ] `photos`
- [ ] `project_documents`

### Warranties (3)
- [ ] `warranties`
- [ ] `warranty_claims`
- [ ] `warranty_types`

### Settings & Notifications (5)
- [ ] `company_settings`
- [ ] `user_preferences`
- [ ] `notifications`
- [ ] `integration_credentials`
- [ ] `payment_reminders`

### Permissions (2)
- [ ] `permissions`
- [ ] `role_permissions`

### SMS & Communication (2)
- [ ] `sms_conversations`
- [ ] `sms_messages`

### Daily Logs (2)
- [ ] `daily_logs`
- [ ] `daily_log_responses`

---

## 🔧 How to Fix Missing Tables

### 1. For `schedule_defaults` (CONFIRMED MISSING)

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS schedule_defaults (
  id SERIAL PRIMARY KEY,
  budget_category VARCHAR(255) NOT NULL UNIQUE,
  default_duration_days INTEGER NOT NULL DEFAULT 3,
  display_order INTEGER NOT NULL DEFAULT 999,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_schedule_defaults_budget_category 
ON schedule_defaults(budget_category);

CREATE INDEX IF NOT EXISTS idx_schedule_defaults_display_order 
ON schedule_defaults(display_order);

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
```

### 2. For Other Missing Tables

Once you identify which tables are missing from the check above, look for migration files in:
- `database-migrations/` folder
- Run the appropriate migration SQL files

---

## 🎯 API Endpoints Affected by Missing Tables

### `schedule_defaults` Missing → Breaks:
- ❌ `/api/projects/[id]/auto-schedule` - 500 error
- ❌ `/api/settings/schedule-defaults` - May fail

### Other Potential Issues:
- Missing `punch_list_*` tables → Punch list features broken
- Missing `warranty_*` tables → Warranty features broken
- Missing `daily_logs` tables → Daily log features broken
- Missing `sms_*` tables → SMS features broken
- Missing `notifications` table → Notification system broken

---

## 📊 After Running the Check

1. **Copy the results** from the SQL query
2. **Share the missing table list** 
3. I will create migrations for ALL missing tables
4. Run the migrations in order
5. Verify all APIs work

---

## ⚠️ Why This Happened

The API code references tables that were never created in the database. This is a schema drift issue where:
- Code was written assuming tables exist
- Migrations were not run or don't exist
- Database was not fully initialized

**Solution:** Create all missing tables with proper migrations.

---

## 🚀 Next Steps

1. **Run the SQL check above** in Supabase SQL Editor
2. **Copy the output** showing missing tables
3. **Share the results** so I can create all necessary migrations
4. **Run migrations** to create missing tables
5. **Test APIs** to verify everything works

This will fix not just `schedule_defaults` but ALL missing tables at once.
