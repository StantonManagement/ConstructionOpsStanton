# Audit Log Setup Guide

## Quick Start

The audit log feature is now integrated into your app, but requires a one-time database setup.

### ⚠️ Current Status
The `audit_logs` table does not exist yet in your database. The app will gracefully hide the audit log component until the migration is run.

### 🚀 Setup (5 minutes)

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `DATABASE_AUDIT_LOGS.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`
6. Verify success - you should see "Success. No rows returned"
7. Refresh your app - audit logs will now appear at the bottom of pages

#### Option 2: Command Line (psql)
```bash
# Connect to your database
psql "your-database-connection-string"

# Run the migration
\i DATABASE_AUDIT_LOGS.sql

# Or in one command:
psql "your-database-connection-string" -f DATABASE_AUDIT_LOGS.sql
```

#### Option 3: Supabase CLI
```bash
# Create a new migration
supabase migration new audit_logs

# Copy the SQL into the migration file
cp DATABASE_AUDIT_LOGS.sql supabase/migrations/XXXXXX_audit_logs.sql

# Apply the migration
supabase db push
```

### ✅ Verification

After running the migration, verify it worked:

1. **In Supabase Dashboard**:
   - Go to **Table Editor**
   - You should see a new `audit_logs` table

2. **In SQL Editor**:
   ```sql
   -- Check table exists
   SELECT COUNT(*) FROM audit_logs;

   -- Test the logging function
   SELECT log_audit_entry(
     p_user_id := auth.uid(),
     p_user_name := 'Test User',
     p_action := 'test_setup',
     p_entity_type := 'system'
   );

   -- Verify the log was created
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1;
   ```

3. **In Your App**:
   - Refresh any page (Dashboard, Projects, etc.)
   - Scroll to the bottom
   - You should see "Activity Log (0)" or "Activity Log (1)" if you ran the test
   - Click to expand and see the test entry

### 🎯 What Gets Created

The migration creates:
- ✅ `audit_logs` table with 8 optimized indexes
- ✅ Row Level Security (RLS) policies
- ✅ Automatic triggers for `projects` table
- ✅ `log_audit_entry()` function for manual logging
- ✅ Trigger function `audit_project_changes()`

### 🔧 Troubleshooting

#### "Permission denied" error
You need database owner/admin permissions. Contact your database administrator or use the Supabase dashboard method.

#### "Already exists" error
The migration is idempotent (safe to run multiple times). If you see this, the table already exists and you're good to go!

#### Still not seeing audit logs after setup
1. Clear your browser cache and refresh
2. Check browser console for errors
3. Verify the table was created in Supabase dashboard
4. Try creating a project or making a change - this should create a log entry

### 📊 Expected Behavior

**Before Migration**:
- No audit log section visible on any page
- Console warning: `[AuditLog] Table does not exist yet. Please run DATABASE_AUDIT_LOGS.sql migration.`

**After Migration**:
- Audit log section appears at bottom of these pages:
  - Dashboard
  - Projects
  - Contractors
  - Payments
  - Documents
  - Settings
- Shows "Activity Log (0)" when collapsed
- Expands to show recent activities when clicked
- Automatically logs project changes

### 🎨 What You'll See

When you expand the audit log, you'll see entries like:
```
✨ create_project "Building A"
   project
   👤 John Doe • 2 minutes ago

✏️ update_payment "Pay App #5"
   payment_application
   👤 Jane Smith • 15 minutes ago
```

### 📝 Next Steps

After setup, the system will automatically log:
- All project changes (create/update/delete)

To log other activities, add triggers for other tables or use the manual logging function. See `AUDIT_LOG_SYSTEM.md` for details.

### 🆘 Need Help?

If you encounter issues:
1. Check the console for error messages
2. Verify your database permissions
3. Ensure you're connected to the correct database
4. Try the Supabase Dashboard method (most reliable)

The audit log is optional - your app will work fine without it until you're ready to set it up.
