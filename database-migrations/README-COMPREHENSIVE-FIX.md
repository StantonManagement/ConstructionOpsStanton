# Comprehensive Fix: Project Creation UUID Mismatch Error

## Problem Summary

**Error**: `"operator does not exist: integer = uuid"`

**Root Cause**: The `user_role` table has a fundamental design mismatch:

| Component | Expected | Actual |
|-----------|----------|--------|
| `user_role.user_id` column | UUID | INTEGER |
| `auth.uid()` returns | UUID | UUID |
| `AuthScreen.tsx` inserts | UUID (`user.id`) | UUID |
| RLS policies compare | UUID | INTEGER vs UUID ❌ |

The application code (AuthScreen.tsx) has been inserting UUIDs into an INTEGER column, and RLS policies have been comparing INTEGER with UUID.

## Solution

Change `user_role.user_id` from INTEGER to UUID. This aligns with:
- How the application code uses it
- How Supabase auth works (`auth.uid()` returns UUID)
- How RLS policies should work

## Migration Steps

### Step 1: Run the Comprehensive Migration

**IMPORTANT**: This migration will:
1. Backup existing `user_role` data
2. Drop all RLS policies that depend on `user_role`
3. Change `user_role.user_id` from INTEGER to UUID
4. Recreate helper functions (`is_admin_or_pm()`, `is_admin()`)
5. Recreate all RLS policies using the helper functions
6. Repopulate `user_role` with correct UUIDs from `users` table

Run this in Supabase SQL Editor:
```
database-migrations/fix-user-role-uuid-comprehensive.sql
```

### Step 2: Manually Assign Your Admin Role

After the migration, you need to assign yourself an admin role:

```sql
-- Find your user UUID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Insert your admin role (replace YOUR_UUID with the actual UUID)
INSERT INTO user_role (user_id, role)
VALUES ('YOUR_UUID', 'admin')
ON CONFLICT DO NOTHING;

-- Verify
SELECT * FROM user_role;
```

### Step 3: Test Project Creation

1. Refresh your browser (hard refresh: Ctrl+Shift+R)
2. Navigate to Projects tab
3. Click "New Project"
4. Fill in required fields
5. Click "Create Project"

**Expected**: Project creates successfully ✅

## Verification Queries

After running the migration, verify with these queries:

```sql
-- 1. Check column type (should be 'uuid')
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_role';

-- 2. Check your role
SELECT * FROM user_role;

-- 3. Test helper function (should return true if you're admin/pm)
SELECT is_admin_or_pm();

-- 4. Check policies use functions
SELECT polname, pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
JOIN pg_class ON pg_policy.polrelid = pg_class.oid
WHERE pg_class.relname = 'projects';
```

## What Changed

### Database Changes
- `user_role.user_id`: INTEGER → UUID
- Foreign key now references `auth.users(id)` instead of `users(id)`
- All RLS policies now use helper functions (`is_admin_or_pm()`, `is_admin()`)

### No Code Changes Required
The frontend code in `AuthScreen.tsx` was already using `user.id` (UUID), which is correct for the new schema.

## Rollback (If Needed)

A backup table `user_role_backup` is created during migration. To rollback:

```sql
-- Restore from backup (WARNING: This will reintroduce the bug)
DROP TABLE user_role;
ALTER TABLE user_role_backup RENAME TO user_role;
```

## Files Involved

- **Migration**: `database-migrations/fix-user-role-uuid-comprehensive.sql`
- **Frontend (no changes needed)**: `src/app/components/AuthScreen.tsx`
- **Frontend (already fixed)**: `src/app/components/ProjectsView.tsx`

## Technical Details

### Before (Broken Architecture)
```
users.id (INTEGER) ←── user_role.user_id (INTEGER)
users.uuid (UUID)
auth.users.id (UUID) ←── auth.uid() returns this

RLS Policy: WHERE user_role.user_id = auth.uid()
                   ↑ INTEGER            ↑ UUID
                   ❌ TYPE MISMATCH!
```

### After (Fixed Architecture)
```
users.id (INTEGER)
users.uuid (UUID)
auth.users.id (UUID) ←── user_role.user_id (UUID) ←── auth.uid()

RLS Policy: WHERE user_role.user_id = auth.uid()
                   ↑ UUID              ↑ UUID
                   ✅ TYPES MATCH!
```

## Success Criteria

✅ `user_role.user_id` is UUID type
✅ RLS policies use `is_admin_or_pm()` and `is_admin()` functions
✅ Project creation works without errors
✅ All admin/PM operations work correctly







