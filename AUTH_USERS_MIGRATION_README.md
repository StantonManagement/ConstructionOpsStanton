# Migration to auth.users with user_role table

This document explains the correct database structure using Supabase's built-in `auth.users` table with a separate `user_role` table for role management.

## Current Database Structure

The system correctly uses:
1. `auth.users` (Supabase Auth) - for authentication and basic user data
2. `public.user_role` table - for storing user roles with foreign key to `auth.users.id`
3. `public.users` table - for additional profile data (optional, can be migrated to auth metadata)

## Problem Solved

The previous implementation was creating users in both:
1. `auth.users` (Supabase Auth)
2. `public.users` (custom table)

This caused conflicts and duplication issues. Now we use the proper structure with `auth.users` and `user_role`.

## Solution

We've updated the system to use:
- `auth.users` for authentication and user metadata
- `user_role` table for role management
- Proper foreign key relationships

## Changes Made

### 1. API Routes (`src/app/api/users/route.ts`)

- **GET**: Now fetches users from `auth.users` and joins with `user_role` table
- **POST**: Creates users in `auth.users` and inserts role into `user_role` table
- **PUT**: Updates user metadata in `auth.users` and role in `user_role` table
- **DELETE**: Deletes users from both `auth.users` and `user_role` table

### 2. User Management View (`src/app/components/UserManagementView.tsx`)

- Updated to fetch users from the API endpoint which now uses `auth.users` + `user_role`
- User role fetching now uses `user_role` table instead of database queries

### 3. Authentication Service (`src/lib/auth.ts`)

- `getCurrentUser()`: Now reads from auth metadata and `user_role` table
- `signUp()`: Updates user metadata and inserts role into `user_role` table
- `updateProfile()`: Updates auth metadata and role in `user_role` table

### 4. Auth Screen (`src/app/components/AuthScreen.tsx`)

- User creation now updates auth metadata and inserts role into `user_role` table
- Role fetching uses `user_role` table

## Database Schema

### auth.users
- `id` (UUID) - Primary key
- `email` - User email
- `raw_user_meta_data` - JSON metadata (name, phone, company, etc.)
- `created_at` - Account creation date
- `last_sign_in_at` - Last login date

### user_role
- `id` (BIGINT) - Primary key
- `user_id` (UUID) - Foreign key to auth.users.id
- `role` (TEXT) - User role (staff, pm, admin)
- `created_at` - Role assignment date

## User Data Structure

User data is now stored across two tables:

**auth.users metadata:**
```json
{
  "name": "User Name",
  "system_access": ["construction"],
  "phone": "123-456-7890",
  "company": "Company Name",
  "address": "User Address",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**user_role table:**
```sql
user_id: "uuid-from-auth-users"
role: "staff|pm|admin"
```

## Migration Steps

### 1. Run the Migration Script

Execute the migration script to ensure proper structure:

```sql
-- Run the migration file: migrate-to-auth-users.sql
```

This will:
- Create a backup of the current `users` table
- Update existing auth users with metadata from `public.users`
- Ensure all auth users have corresponding entries in `user_role` table
- Create helper views and functions

### 2. Test the Changes

1. Test user creation through the admin interface
2. Test user updates and role changes
3. Test authentication flow
4. Verify user data is properly stored in both tables

### 3. Clean Up (Optional)

After confirming everything works:

```sql
-- Only run after confirming the migration is successful!
DROP TABLE IF EXISTS users CASCADE;
```

## Benefits

1. **No More Conflicts**: Proper separation of concerns
2. **Better Security**: Leverages Supabase Auth's built-in security features
3. **Simplified Code**: Clear distinction between auth and role data
4. **Better Performance**: Optimized queries with proper indexing
5. **Built-in Features**: Automatic email confirmation, password reset, etc.

## Important Notes

### User IDs

- User IDs are UUIDs from `auth.users`
- The `user_role` table uses these UUIDs as foreign keys
- The `id` field in the API responses contains the auth user UUID

### Role Management

- Roles are stored in the `user_role` table
- Each user can have only one role (enforced by unique constraint)
- Role changes are handled through upsert operations

### Permissions

- Admin operations require the service role key
- Regular users can only update their own metadata
- Use RLS policies for additional security

## Troubleshooting

### Common Issues

1. **User not found**: Check if the user exists in `auth.users`
2. **Role not found**: Check if the user has an entry in `user_role` table
3. **Permission denied**: Ensure you're using the service role key for admin operations

### Debugging

Use the helper functions created in the migration:

```sql
-- Get user profile data
SELECT get_user_profile('user-uuid-here');

-- View all auth users with roles
SELECT * FROM auth_users_view;

-- Check user roles
SELECT * FROM user_role WHERE user_id = 'user-uuid-here';
```

## Rollback Plan

If you need to rollback:

1. Restore the `users` table from the backup
2. Revert the code changes
3. Update any foreign key references back to the integer IDs

## Future Considerations

1. **Profile Table**: For extensive user data, consider a separate `user_profiles` table
2. **Audit Trail**: Implement logging for user changes
3. **Bulk Operations**: For large user imports, use Supabase's bulk user creation
4. **Custom Claims**: Use JWT claims for additional user data if needed
