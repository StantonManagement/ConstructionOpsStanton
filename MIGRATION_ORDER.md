# Database Migration Order - Quick Reference

This guide provides the correct order for running database migrations.

## For Fresh/New Production Deployments

Run migrations in this exact order:

### 1. Base Schema (if needed)
```sql
-- Run: database-migrations.sql
-- Creates base tables for projects, contractors, payment applications, etc.
```

### 2. User Role Table ⭐ CRITICAL
```sql
-- Run: scripts/create-user-role-table.sql
-- This MUST be run before any users try to access the app
```

**What it does:**
- ✅ Creates `user_role` table with RLS policies (fixes 406 errors)
- ✅ Automatically assigns first confirmed user as admin
- ✅ Performance optimized with query plan caching
- ✅ Idempotent - safe to run multiple times

**Prerequisites:**
- At least one user should be confirmed before running
- If no confirmed users exist, you'll get a warning and can promote manually

### 3. Verify Foreign Keys
```sql
-- Run: scripts/verify-foreign-keys.sql
-- Checks that all table relationships are properly configured
```

### 4. Fix Foreign Keys (if needed)
```sql
-- Run: scripts/fix-payment-app-foreign-keys.sql
-- Only if step 3 shows missing foreign keys
```

## For Migrating from Old Structure

If you're migrating from an old system with a `public.users` table:

### 1. Base Schema (if not already present)
```sql
-- Run: database-migrations.sql
```

### 2. User Role Table FIRST
```sql
-- Run: scripts/create-user-role-table.sql
-- MUST be run BEFORE migrate-to-auth-users.sql
```

### 3. Auth Users Migration
```sql
-- Run: migrate-to-auth-users.sql
-- Migrates data from old public.users table to auth.users
-- Preserves existing roles
```

### 4. Verify & Fix Foreign Keys
```sql
-- Run: scripts/verify-foreign-keys.sql
-- Then run: scripts/fix-payment-app-foreign-keys.sql (if needed)
```

## Fixing Production 406 Errors

If your production app is already deployed and showing 406 errors:

1. **Go to Supabase SQL Editor** (production database)
2. **Run:** `scripts/create-user-role-table.sql`
3. **Note the admin user** displayed in output
4. **Restart your app** (Railway auto-restarts)
5. **Test** - errors should be resolved

## Common Mistakes to Avoid

❌ **DON'T** run `migrate-to-auth-users.sql` before `create-user-role-table.sql`
- The old migration expects the table to exist

❌ **DON'T** skip creating at least one confirmed user
- Without confirmed users, no admin will be assigned
- You'll need to manually promote a user later

❌ **DON'T** run migrations in the wrong database
- Always double-check you're in production/staging/local as intended

## Verification

After running migrations, verify with these queries:

```sql
-- Check user_role table exists and has data
SELECT COUNT(*) FROM public.user_role;

-- Check RLS is enabled
SELECT relrowsecurity FROM pg_class 
WHERE relname = 'user_role' AND relnamespace = 'public'::regnamespace;

-- View all users and their roles
SELECT ur.user_id, au.email, ur.role, ur.created_at
FROM public.user_role ur
JOIN auth.users au ON ur.user_id = au.id
ORDER BY ur.role DESC, ur.created_at ASC;

-- Check for admin users
SELECT au.email, ur.role
FROM public.user_role ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.role = 'admin';
```

## Emergency Admin Promotion

If you need to manually promote a user to admin:

```sql
-- By email
UPDATE public.user_role 
SET role = 'admin', updated_at = NOW()
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'user@example.com'
);

-- By UUID
UPDATE public.user_role 
SET role = 'admin', updated_at = NOW()
WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
```

## See Also

- [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) - Comprehensive setup guide
- [AUTH_USERS_MIGRATION_README.md](./AUTH_USERS_MIGRATION_README.md) - Authentication details
- [scripts/create-user-role-table.sql](./scripts/create-user-role-table.sql) - The main migration

