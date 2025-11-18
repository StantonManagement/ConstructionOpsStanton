# Database Connection Troubleshooting Guide

This guide helps diagnose and fix common Supabase connection issues that can cause loading spinners, empty data, or authentication errors.

## Quick Start

If you're experiencing loading issues or data not appearing:

1. **Run the diagnostic script** in your Supabase SQL Editor
2. **Review the results** to identify issues
3. **Apply fixes** using the appropriate migration scripts

## Step 1: Run Diagnostic Script

### In Supabase Dashboard:

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy and paste the contents of `scripts/diagnose-database.sql`
5. Click **Run** or press `Ctrl+Enter`

### What the Diagnostic Checks:

- ✅ Core tables exist (projects, contractors, project_contractors, payment_applications, user_role)
- ✅ Row Level Security (RLS) status for each table
- ✅ RLS policies are properly configured
- ✅ Foreign key relationships are set up
- ✅ Data counts in each table

## Step 2: Interpret Results

### Common Issue #1: RLS Enabled Without Policies

**Symptom:** Diagnostic shows RLS is "ENABLED" but no policies listed for a table

**Impact:** Queries return empty results even though data exists

**Example Output:**
```
tablename              | rls_status
-----------------------|------------
projects               | ✓ ENABLED
contractors            | ✓ ENABLED

(No policies shown in section 3)
```

**Fix:** Run the RLS policy migration

### Common Issue #2: Tables Missing

**Symptom:** Diagnostic shows "✗ MISSING" for core tables

**Impact:** Application cannot fetch data, errors in console

**Fix:** Tables need to be created in Supabase dashboard

### Common Issue #3: Missing user_role Table or Policies

**Symptom:** Authentication works but role queries fail

**Impact:** Users default to 'staff' role, permission issues

**Fix:** Run `scripts/create-user-role-table.sql`

### Common Issue #4: No Foreign Key Relationships

**Symptom:** Relationship queries fail, cannot join tables

**Impact:** Enhanced data queries return errors

**Fix:** Run `scripts/check-and-fix-relationships.sql`

## Step 3: Apply Fixes

### Fix #1: Enable RLS Policies (Most Common - PRODUCTION READY)

If diagnostic shows RLS is enabled but no policies exist:

1. In Supabase SQL Editor, open a new query
2. Copy contents of `database-migrations/enable-core-table-rls-v2.sql` (RECOMMENDED)
3. Run the migration
4. Re-run diagnostic to verify
5. Test with `scripts/test-rls-policies.sql`

**⚠️ IMPORTANT: Use v2 for Production**

The v2 migration includes critical security improvements:
- ✅ **Helper function** for optimized role checks with plan caching
- ✅ **Performance indexes** before enabling RLS
- ✅ **WITH CHECK clauses** to prevent privilege escalation
- ✅ **Status-based protection** for payment applications

**Security Model (v2):**
- **Staff users**: Read-only access to all data; can create draft payment apps
- **PM users**: Full access to projects/contractors; can approve payments
- **Admin users**: Full access including deletes
- **Payment protection**: Staff cannot modify approved/rejected payment apps
- **Privilege protection**: WITH CHECK prevents users from escalating their own permissions

**Legacy v1 Migration:**
`database-migrations/enable-core-table-rls.sql` is available but lacks security features. Only use for testing.

### Fix #2: Create user_role Table

If user_role table is missing:

1. In Supabase SQL Editor, open a new query
2. Copy contents of `scripts/create-user-role-table.sql`
3. Run the script
4. Add your user to the table:
   ```sql
   INSERT INTO user_role (user_id, role)
   VALUES ('your-user-uuid', 'admin');
   ```

**To get your user UUID:**
```sql
SELECT id, email FROM auth.users;
```

### Fix #3: Fix Foreign Key Relationships

If relationships are missing:

1. In Supabase SQL Editor, open a new query
2. Copy contents of `scripts/check-and-fix-relationships.sql`
3. Run the script
4. Verify relationships are created

## Common Scenarios

### Scenario 1: "Active Projects" Shows Infinite Loading

**Cause:** Usually a frontend bug (now fixed in OverviewView.tsx)

**Secondary Cause:** RLS blocking data access

**Steps:**
1. Check browser console for errors
2. If you see "✓ Fetched X projects" but still loading, it's the UI bug (fixed)
3. If you see "❌ Error fetching projects", run diagnostic script
4. Apply RLS policies if needed

### Scenario 2: Console Shows "auth.uid() = null" Errors

**Cause:** User not authenticated or session expired

**Steps:**
1. Check if user is logged in
2. Clear browser cookies and re-login
3. Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in `.env`

### Scenario 3: Staff Users Can't See Any Data

**Cause:** RLS policies only allow admin/PM access

**Steps:**
1. Run diagnostic script
2. Check RLS policies in section 3
3. If policies say "role = 'admin'", they need updating
4. Run `database-migrations/enable-core-table-rls-v2.sql` for proper role-based policies

**Note:** The v2 migration ensures staff users can view (SELECT) all data but cannot modify projects or contractors.

### Scenario 4: Relationship Queries Fail (404/500 Errors)

**Cause:** Missing foreign keys or RLS on junction tables

**Steps:**
1. Run diagnostic script section 4 (relationships)
2. Run `scripts/check-and-fix-relationships.sql`
3. Enable RLS on project_contractors table
4. Restart dev server

## Verification Commands

### Check Current RLS Status
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('projects', 'contractors', 'project_contractors', 'payment_applications', 'user_role');
```

### Check Current Policies
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Your User Role
```sql
SELECT ur.role, au.email
FROM user_role ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.id = auth.uid();
```

### Test Data Access as Current User
```sql
-- This should return projects if RLS is working correctly
SELECT * FROM projects LIMIT 5;

-- This should return contractors
SELECT * FROM contractors LIMIT 5;
```

## Environment Variables Checklist

Ensure these are set in your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Get these from:** Supabase Dashboard → Settings → API

## Still Having Issues?

### Enable Detailed Logging

In `src/app/context/DataContext.tsx`, the logging is already enabled. Check browser console for:

```
[DataContext] Starting data fetch...
[DataContext] ✓ Fetched X projects
[DataContext] ❌ Error fetching projects: <error message>
```

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Postgres Logs**
3. Look for permission denied or RLS policy errors
4. Filter by error level

### Network Tab Investigation

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Reload the page
4. Look for failed requests to Supabase
5. Check response status (200, 401, 403, 404)
6. Review response body for error messages

## Prevention

To avoid these issues in the future:

1. **Always enable RLS with policies** when creating tables
2. **Test with different user roles** (staff, pm, admin)
3. **Run diagnostic script** before and after schema changes
4. **Version control your migrations** in `database-migrations/`
5. **Document custom policies** in comments

## Summary of Files

- `scripts/diagnose-database.sql` - Diagnostic tool
- `database-migrations/enable-core-table-rls-v2.sql` - **PRODUCTION-READY** RLS policies (RECOMMENDED)
- `database-migrations/enable-core-table-rls.sql` - Legacy RLS policies (testing only)
- `scripts/test-rls-policies.sql` - Test RLS policies with different roles
- `scripts/create-user-role-table.sql` - User role system setup
- `scripts/check-and-fix-relationships.sql` - Foreign key repair
- This file - Troubleshooting guide

## Quick Reference: What Each Role Can Do

With the v2 RLS policies (`enable-core-table-rls-v2.sql`):

| Action | Staff | PM | Admin |
|--------|-------|----|----|
| View projects | ✅ | ✅ | ✅ |
| Create projects | ❌ | ✅ | ✅ |
| Update projects | ❌ | ✅ | ✅ |
| Delete projects | ❌ | ❌ | ✅ |
| View contractors | ✅ | ✅ | ✅ |
| Create contractors | ❌ | ✅ | ✅ |
| Create payment apps | ✅ | ✅ | ✅ |
| Update draft payment apps | ✅ | ✅ | ✅ |
| Update approved payment apps | ❌ | ✅ | ✅ |
| Approve/reject payment apps | ❌ | ✅ | ✅ |
| Delete payment apps | ❌ | ❌ | ✅ |

### Security Features (v2)

**Privilege Escalation Protection:**
- WITH CHECK clauses prevent users from modifying data in ways that would bypass their permissions
- Staff users cannot change a payment app status to "approved" or "rejected"
- Users cannot grant themselves admin/PM privileges via UPDATE

**Performance Optimization:**
- `is_admin_or_pm()` helper function caches role checks
- Indexes on user_role, payment_applications, and junction tables
- STABLE function attribute enables PostgreSQL query plan caching

**Testing:**
Use `scripts/test-rls-policies.sql` to verify policies work correctly for each role.

Need different permissions? Edit the policies in `database-migrations/enable-core-table-rls-v2.sql`.

