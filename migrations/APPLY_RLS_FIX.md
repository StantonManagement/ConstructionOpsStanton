# How to Apply RLS Fix Migration

**Migration File:** `009_fix_rls_projects_contractors.sql`

**Fixes:**
- Task 1: Cannot create projects (RLS blocking inserts)
- Task 2: Cannot assign contractors to budget lines (RLS blocking inserts)

---

## Option 1: Apply via Supabase Dashboard (Recommended for Production)

1. Log into Supabase Dashboard: https://app.supabase.com
2. Navigate to your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `migrations/009_fix_rls_projects_contractors.sql`
6. Paste into the SQL Editor
7. Click **Run** button
8. Verify output shows successful policy creation
9. Scroll to bottom to see verification queries showing RLS is enabled and policies exist

---

## Option 2: Apply via Supabase CLI (for Staging/Dev)

```bash
# Navigate to project directory
cd /Users/zeff/Desktop/Work/stanton/ConstructionOpsStanton

# Apply migration
supabase db push --file migrations/009_fix_rls_projects_contractors.sql

# Or if using migration system:
supabase migration up
```

---

## Verification After Applying

### 1. Check RLS is Enabled

```sql
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('projects', 'project_contractors')
    AND schemaname = 'public';
```

Expected output:
```
tablename             | rls_enabled
----------------------|-------------
projects              | true
project_contractors   | true
```

### 2. Check Policies Exist

```sql
SELECT
    tablename,
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename IN ('projects', 'project_contractors')
    AND schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected output (8 policies total):
```
tablename             | policyname                                      | operation
----------------------|-------------------------------------------------|-----------
projects              | Authenticated users can view projects           | SELECT
projects              | Authenticated users can create projects         | INSERT
projects              | Authenticated users can update projects         | UPDATE
projects              | Authenticated users can delete projects         | DELETE
project_contractors   | Authenticated users can view project contractors| SELECT
project_contractors   | Authenticated users can assign contractors      | INSERT
project_contractors   | Authenticated users can update contractor...    | UPDATE
project_contractors   | Authenticated users can remove contractors      | DELETE
```

### 3. Test Project Creation (Manual Test)

1. Log into the app as an authenticated user
2. Navigate to Projects page
3. Click "New Project" button
4. Fill out project form
5. Click "Save"
6. **Expected:** Project creates successfully without RLS error
7. **Before Fix:** Would throw "new row violates row-level security policy" error

### 4. Test Contractor Assignment (Manual Test)

1. Open an existing project
2. Go to Contractors tab or Budget section
3. Try to assign a contractor to a budget line
4. **Expected:** Assignment succeeds without RLS error
5. **Before Fix:** Would throw "new row violates row-level security policy" error

---

## Rollback (if needed)

If you need to revert these changes:

```sql
-- Disable RLS on projects table
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Disable RLS on project_contractors table
ALTER TABLE project_contractors DISABLE ROW LEVEL SECURITY;
```

**⚠️ Warning:** Disabling RLS removes all security. Only use for emergency rollback.

Better rollback approach (keep RLS enabled but remove policies):

```sql
-- Remove policies from projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- Remove policies from project_contractors
DROP POLICY IF EXISTS "Authenticated users can view project contractors" ON project_contractors;
DROP POLICY IF EXISTS "Authenticated users can assign contractors" ON project_contractors;
DROP POLICY IF EXISTS "Authenticated users can update contractor assignments" ON project_contractors;
DROP POLICY IF EXISTS "Authenticated users can remove contractors" ON project_contractors;
```

---

## Production Deployment Checklist

- [ ] Backup database before applying migration
- [ ] Apply migration to staging environment first
- [ ] Test project creation in staging
- [ ] Test contractor assignment in staging
- [ ] Verify no other features are broken
- [ ] Apply to production during low-traffic window
- [ ] Monitor error logs for 30 minutes after deployment
- [ ] Have rollback script ready

---

## Security Note

**Current Approach:**
- All authenticated users can create/update/delete projects
- All authenticated users can assign/update/remove contractors

**Future Improvement:**
When implementing proper role-based access control (Task 8 from TASKS_FROM_DAN_CHECKIN.md), update these policies to:
- Restrict project deletion to admins/PMs only
- Restrict contractor assignment to PMs and assigned contractors
- Add tenant/organization isolation if multi-tenant

For now, this permissive approach fixes the production bug and allows the app to function.

---

## What Changed vs What Broke

**What was changed (that caused the bug):**
- Someone enabled RLS on `projects` and `project_contractors` tables via Supabase dashboard
- No policies were created at the same time
- Without policies, RLS blocks **all** operations by default

**This migration fixes it by:**
- Explicitly creating policies that allow authenticated users to perform CRUD operations
- Following the same pattern as other tables (daily_logs, bid_rounds, etc.)
- Maintaining security (authentication required) while allowing functionality
