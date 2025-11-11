# Database Setup Guide

This guide helps you verify and set up your Supabase database connection after updating your `.env` file.

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

3. **If the database is empty, run migrations** in Supabase SQL Editor:
   - Run `database-migrations.sql` to create base schema
   - Run `migrate-to-auth-users.sql` for authentication setup
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

2. **Authentication Setup** - Run in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of migrate-to-auth-users.sql
   ```

3. **Verify Foreign Keys** - Run in Supabase SQL Editor:
   ```sql
   -- Copy and paste contents of scripts/verify-foreign-keys.sql
   ```

4. **Fix Foreign Keys** (if needed):
   ```sql
   -- Copy and paste contents of scripts/fix-payment-app-foreign-keys.sql
   ```

### If your database already has tables:

1. Verify foreign keys exist:
   ```sql
   -- Run scripts/verify-foreign-keys.sql in Supabase SQL Editor
   ```

2. Fix missing foreign keys if needed:
   ```sql
   -- Run scripts/fix-payment-app-foreign-keys.sql in Supabase SQL Editor
   ```

## Troubleshooting

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

## Additional Resources

- [ENV_SETUP.md](./ENV_SETUP.md) - Detailed environment variable documentation
- [RELATIONSHIP_ERROR_FIX.md](./RELATIONSHIP_ERROR_FIX.md) - Foreign key troubleshooting
- [AUTH_USERS_MIGRATION_README.md](./AUTH_USERS_MIGRATION_README.md) - Authentication setup details






