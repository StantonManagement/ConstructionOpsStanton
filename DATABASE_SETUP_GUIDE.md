# Database Setup Guide

This guide helps you verify and set up your Supabase database connection after updating your `.env` file.

> 📘 **Quick Reference:** See [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) for a concise migration order checklist.

## Quick Start

After updating your `.env` file with new Supabase credentials:

1. **Restart your development server**:
   ```powershell
   # Stop the current server (Ctrl+C), then:
   npm run dev
   ```

2. **Run the verification script**:
   ```powershell
   node scripts/verify-database-connection.js
   ```

3. **If the database is empty, run migrations** in Supabase SQL Editor (see [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) for detailed order):
   - Run `database-migrations.sql` to create base schema
   - Run `scripts/create-user-role-table.sql` to create user_role table with RLS policies ⭐ **CRITICAL**
   - Run `migrate-to-auth-users.sql` for authentication setup (OPTIONAL - only if migrating old data)
   - Run `scripts/verify-foreign-keys.sql` to check relationships

4. **Test the application** in your browser and check for any errors

## Verification Script

The `scripts/verify-database-connection.js` script checks:

- ✅ Environment variables are properly set
- ✅ Supabase connection works (both anonymous and service role)
- ✅ Required tables exist in the database
- ✅ Foreign key relationships are properly configured

### Usage

```powershell
node scripts/verify-database-connection.js
```

### Expected Output

**If everything is OK:**
```
✅ Database connection: OK
✅ Environment variables: OK
✅ Database schema: OK
🎉 Your database is ready to use!
```

**If tables are missing:**
```
✅ Database connection: OK
✅ Environment variables: OK
⚠️  Database schema: INCOMPLETE

📝 Next steps:
   1. Run database-migrations.sql in Supabase SQL Editor
   2. Run migrate-to-auth-users.sql for authentication setup
   3. Run this verification script again
```

## Required Environment Variables

Make sure your `.env` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is critical for:
- Database relationship queries (payment_applications -> projects, etc.)
- Admin operations in API routes
- Schema verification

Get these values from: [Supabase Dashboard → Settings → API](https://app.supabase.com/project/_/settings/api)

## Database Migrations

### If your database is empty (fresh/new project):

1. **Base Schema** - Run in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of database-migrations.sql
   ```

2. **User Role Table** - Run in Supabase SQL Editor (REQUIRED BEFORE step 3):
   ```sql
   -- Copy and paste contents of scripts/create-user-role-table.sql
   ```
   
   This creates the `user_role` table with proper RLS policies and fixes 406 errors.
   
   **Important Notes:**
   - The migration automatically assigns the **first confirmed user** as admin to solve the bootstrap problem
   - **At least one user must be confirmed** before running this migration for admin assignment to work
   - If no confirmed users exist, you'll see a warning and can promote a user manually after they confirm
   - Check the migration output to see which user was assigned admin role
   - Uses optimized query plan caching for better performance

3. **Authentication Setup** - Run in Supabase SQL Editor (OPTIONAL - only if migrating from old users table):
   ```sql
   -- Copy and paste contents of migrate-to-auth-users.sql
   ```
   
   This preserves user data from an old `public.users` table if you're migrating.
   Skip this step for fresh/new databases.

4. **Verify Foreign Keys** - Run in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of scripts/verify-foreign-keys.sql
   ```

5. **Fix Foreign Keys** (if needed):
   ```sql
   -- Copy and paste contents of scripts/fix-payment-app-foreign-keys.sql
   ```

### If your database already has tables:

1. **Check for user_role table** - Run in Supabase SQL Editor:
   ```sql
   -- Check if user_role table exists and has RLS policies
   SELECT COUNT(*) FROM public.user_role;
   SELECT * FROM pg_policies WHERE tablename = 'user_role';
   ```
   
   If you get errors or see no policies, run `scripts/create-user-role-table.sql`

2. Verify foreign keys exist:
   ```sql
   -- Run scripts/verify-foreign-keys.sql in Supabase SQL Editor
   ```

3. Fix missing foreign keys if needed:
   ```sql
   -- Run scripts/fix-payment-app-foreign-keys.sql in Supabase SQL Editor
   ```

## Troubleshooting

### "406 (Not Acceptable)" errors when querying user_role table

This error occurs when the `user_role` table is missing or doesn't have proper RLS policies, or when the client isn't properly authenticated.

**Symptoms:**
- Multiple `GET https://...supabase.co/rest/v1/user_role?select=role&user_id=eq.... 406 (Not Acceptable)` errors in browser console
- Users can't access the dashboard
- App shows loading indefinitely

**Common Causes:**
1. The `user_role` table doesn't exist
2. RLS is enabled but no policies allow SELECT for authenticated users
3. Client is querying as `anon` instead of `authenticated`
4. Invalid or expired JWT token (session expired)

**Solution:**

1. Open your Supabase SQL Editor
2. Run the migration: `scripts/create-user-role-table.sql`
3. The migration will:
   - Create the `user_role` table if it doesn't exist
   - Enable RLS (Row Level Security)
   - Add policies allowing authenticated users to read their own roles
   - Automatically assign the **first confirmed user** as 'admin'
   - Migrate all other existing auth users with 'staff' role
   - Display which user was assigned admin role
4. **Note the admin user email** from the migration output
5. Restart your application
6. Clear browser cache/hard refresh (Ctrl+Shift+R)
7. The 406 errors should be resolved

**If errors persist after migration:**
- Check that users are properly authenticated (valid session)
- Verify JWT tokens are being passed correctly to Supabase
- Check browser console for authentication errors
- Try logging out and logging back in to refresh the session
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

**Verification:**

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check if table exists
SELECT COUNT(*) FROM public.user_role;

-- Check if RLS is enabled
SELECT relrowsecurity FROM pg_class 
WHERE relname = 'user_role' AND relnamespace = 'public'::regnamespace;

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'user_role';

-- View all user roles
SELECT ur.user_id, au.email, ur.role 
FROM public.user_role ur
JOIN auth.users au ON ur.user_id = au.id;

-- Manually promote a specific user to admin (if needed)
UPDATE public.user_role 
SET role = 'admin', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

### "Could not find a relationship between X and Y"

This error means foreign key constraints are missing:

1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
2. Restart your development server
3. Run `scripts/verify-foreign-keys.sql` in Supabase SQL Editor
4. If foreign keys are missing, run `scripts/fix-payment-app-foreign-keys.sql`

### "Missing required environment variables"

1. Check your `.env` file in the project root
2. Ensure all three variables are present:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Restart your development server

### Connection works but tables are missing

This is expected if you're setting up a new database:

1. Run `database-migrations.sql` in Supabase SQL Editor
2. Run `migrate-to-auth-users.sql` for authentication
3. Run the verification script again to confirm

## Next Steps

After verification:

1. ✅ Verify connection and schema
2. ✅ Test authentication in the app
3. ✅ Test creating projects, contractors, and payment applications
4. ✅ Check browser console for any errors

## Common Production Issues

### Production Deployment Checklist

When deploying to production (Railway, Render, etc.):

1. ✅ Set all environment variables in the platform dashboard
2. ✅ **Create and confirm at least one user account** before running migrations
3. ✅ Run `scripts/create-user-role-table.sql` in production Supabase SQL Editor
4. ✅ Verify the user_role table has RLS policies enabled
5. ✅ Check migration output to confirm which user was assigned admin role
6. ✅ Test authentication flow after deployment
7. ✅ Check application logs for any database errors

### Quick Fix for 406 Errors in Production

If your production app shows 406 errors:

1. Go to your Supabase project (production database)
2. Open SQL Editor
3. Copy and paste the entire contents of `scripts/create-user-role-table.sql`
4. Run the migration
5. **Check the migration output** for the admin user assigned:
   ```
   👑 ADMIN USER ASSIGNED:
      Email: your-email@example.com
      User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
6. Wait for "🎉 USER_ROLE TABLE MIGRATION COMPLETED SUCCESSFULLY!" message
7. Restart your deployed application (Railway/Render will auto-restart)
8. Login with the admin user to promote other users if needed
9. Test the app - errors should be resolved

**Admin Bootstrap Solution:** The migration automatically makes the first confirmed user an admin, solving the chicken-and-egg problem where only admins can promote users. 

**Critical Requirements:**
- ✅ At least one user must have confirmed their email before running the migration
- ✅ If no confirmed users exist, the migration will warn you and provide instructions
- ✅ You can manually promote users using service_role after they confirm
- ✅ If you need to promote a different user to admin, use the manual promotion queries in the migration file

**Performance Optimizations:**
- Uses scalar subselect pattern for `auth.uid()` for better PostgreSQL query plan caching
- Includes partial unique index on admin roles for faster permission checks
- All operations are idempotent and safe to run multiple times

## Additional Resources

- [ENV_SETUP.md](./ENV_SETUP.md) - Detailed environment variable documentation
- [RELATIONSHIP_ERROR_FIX.md](./RELATIONSHIP_ERROR_FIX.md) - Foreign key troubleshooting
- [AUTH_USERS_MIGRATION_README.md](./AUTH_USERS_MIGRATION_README.md) - Authentication setup details
- [scripts/create-user-role-table.sql](./scripts/create-user-role-table.sql) - User role table migration







