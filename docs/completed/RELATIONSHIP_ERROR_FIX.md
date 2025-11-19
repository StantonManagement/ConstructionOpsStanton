# Fixing Database Relationship Errors

This document explains how to fix the "Could not find a relationship between 'payment_applications' and 'projects'" error and related issues.

## Problem

When Supabase relationship queries fail, you may see errors like:
- "Could not find a relationship between 'payment_applications' and 'projects' in the schema cache"
- "Failed to load projects"
- Projects view not loading even though projects table has data

## Root Causes

1. **Missing Foreign Key Constraints**: The database may lack proper foreign key relationships
2. **Schema Cache Not Updated**: Supabase schema cache may not recognize existing relationships
3. **Missing Service Role Key**: Some relationship queries require `SUPABASE_SERVICE_ROLE_KEY`

## Solution Steps

### Step 1: Verify and Fix Foreign Key Constraints

1. Go to your Supabase SQL Editor: https://app.supabase.com/project/_/sql/new
2. Run the script: `scripts/check-and-fix-relationships.sql`
3. This script will:
   - Check current foreign key status
   - Create missing foreign keys automatically
   - Verify all constraints were created

### Step 2: Verify Environment Variables

Ensure your `.env` file has:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get your service role key from: https://app.supabase.com/project/_/settings/api

### Step 3: Restart Development Server

After running the SQL script:
1. Wait a few seconds for Supabase schema cache to refresh
2. Restart your development server: `npm run dev`

### Step 4: Test

The application should now:
- Load projects even if stats queries fail (graceful degradation)
- Show helpful error messages if relationship issues persist
- Continue working with partial data if some queries fail

## What Changed

### Error Handling Improvements

1. **DataContext** (`src/app/context/DataContext.tsx`):
   - Now checks and logs projects errors specifically
   - Doesn't fail completely if one table fails
   - Provides helpful relationship error messages

2. **ProjectsView** (`src/app/components/ProjectsView.tsx`):
   - Projects load even if stats queries fail
   - Uses `Promise.allSettled` for non-blocking stats queries
   - Shows which statistics failed but still displays projects
   - Provides specific error messages

3. **Database Scripts**:
   - Created `scripts/check-and-fix-relationships.sql` for easy verification and fixing

## Troubleshooting

If you still see errors after running the fix:

1. **Check Browser Console**: Look for specific error messages with `[DataContext]` or `[ProjectsView]` prefixes
2. **Verify Foreign Keys**: Run `scripts/verify-foreign-keys.sql` to check constraint status
3. **Check Service Role Key**: Ensure it's set in `.env` and restart the server
4. **Supabase Dashboard**: Go to Database > Relationships to visually verify foreign keys exist

## Error Messages

The application now shows more helpful errors:

- **"Failed to load projects: [specific error]"**: The projects table query failed
- **"Projects loaded, but some statistics could not be loaded. [details]"**: Projects loaded successfully, but stats queries failed (non-critical)
- **Relationship warnings**: Console warnings include instructions to run the fix script

## Prevention

To prevent these issues in the future:
- Always create foreign key constraints when creating tables
- Run migration scripts in order
- Verify constraints after database changes
- Keep service role key configured for development

