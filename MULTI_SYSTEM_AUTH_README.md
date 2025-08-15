# Multi-System Authentication System

This document explains how to use the unified authentication system that works across both your Construction Operations system and Tenant Assessment system.

## Overview

The multi-system authentication allows users to:
- Sign in once and access multiple systems
- Switch between Construction Operations and Tenant Assessment systems
- Have different permissions for each system
- Maintain separate user profiles while using a single authentication

## Database Setup

### 1. Run the Migration

Execute the database migration to add multi-system support:

```sql
-- Run the migration file: database-migrations-multi-system.sql
```

This will:
- Add `system_access` column to the `users` table
- Add `is_active` and `last_login` columns
- Create `systems` table for system configuration
- Create `user_system_access` table for granular control
- Set up RLS policies for security

### 2. Update Existing Users

After running the migration, update existing users to have access to the construction system:

```sql
UPDATE users 
SET system_access = ARRAY['construction']
WHERE system_access IS NULL;
```

## System Configuration

The system supports two main systems:

### Construction Operations System
- **ID**: `construction`
- **Base URL**: `/`
- **Features**: projects, contractors, payment_applications, daily_logs, pm_notes, lien_waivers, site_verification

### Tenant Assessment System
- **ID**: `tenant_assessment`
- **Base URL**: `/tenant-assessment`
- **Features**: tenants, properties, maintenance_requests, communications, assessments, documents

## Usage

### 1. Authentication Flow

Users can sign in at `/auth` and will be redirected to their default system (construction by default).

### 2. System Switching

Users with access to multiple systems can switch between them using the `SystemSwitcher` component:

```tsx
import SystemSwitcher from '@/app/components/SystemSwitcher';

// Add to your navigation
<SystemSwitcher />
```

### 3. Route Protection

Use the `AuthGuard` component to protect routes:

```tsx
import AuthGuard from '@/app/components/AuthGuard';

// Protect a construction-only route
<AuthGuard requiredSystem="construction">
  <ConstructionDashboard />
</AuthGuard>

// Protect a tenant assessment route
<AuthGuard requiredSystem="tenant_assessment">
  <TenantDashboard />
</AuthGuard>

// Protect a route requiring specific feature
<AuthGuard requiredSystem="construction" requiredFeature="payment_applications">
  <PaymentApplications />
</AuthGuard>
```

### 4. Permission Checking

Check user permissions in your components:

```tsx
import { useAuth } from '@/context/AuthContext';

const MyComponent = () => {
  const { hasPermission } = useAuth();

  const canManagePayments = await hasPermission('payment_applications', 'construction');
  
  if (canManagePayments) {
    // Show payment management UI
  }
};
```

## User Management

### Adding System Access

To give a user access to both systems:

```sql
UPDATE users 
SET system_access = ARRAY['construction', 'tenant_assessment']
WHERE email = 'user@example.com';
```

### Removing System Access

To remove access to a system:

```sql
UPDATE users 
SET system_access = ARRAY['construction']
WHERE email = 'user@example.com';
```

### Creating New Users

When creating new users, specify their system access:

```tsx
const { signUp } = useAuth();

await signUp('user@example.com', 'password', 'User Name', ['construction', 'tenant_assessment']);
```

## Integration with Existing Systems

### Construction Operations System

Your existing construction system will continue to work as before. Users with `construction` access will see the system switcher if they have access to multiple systems.

### Tenant Assessment System

For your tenant assessment system in the separate Ops Dashboard:

1. **Database Integration**: The authentication system can work with your existing tenant system database
2. **API Integration**: Use the same authentication tokens across both systems
3. **User Sync**: Users created in one system can be granted access to the other

## Security Features

### Row Level Security (RLS)

The system includes RLS policies to ensure:
- Users can only see their own system access
- Only admins can modify system access
- System configurations are read-only for regular users

### Permission Validation

All feature access is validated server-side to prevent unauthorized access.

## API Endpoints

The authentication system provides these key functions:

- `signIn(email, password)` - Authenticate user
- `signUp(email, password, name, systemAccess)` - Create new user
- `signOut()` - Sign out user
- `switchSystem(systemId)` - Switch between systems
- `hasPermission(feature, systemId)` - Check user permissions
- `updateProfile(updates)` - Update user profile

## Troubleshooting

### Common Issues

1. **User can't access tenant system**
   - Check if user has `tenant_assessment` in their `system_access` array
   - Verify the tenant system is active in the `systems` table

2. **System switcher not showing**
   - Ensure user has access to multiple systems
   - Check if `SystemSwitcher` component is properly imported

3. **Permission denied errors**
   - Verify the feature exists in the system configuration
   - Check if user has the required system access

### Debug Queries

```sql
-- Check user's system access
SELECT email, system_access FROM users WHERE email = 'user@example.com';

-- Check available systems
SELECT * FROM systems WHERE is_active = true;

-- Check user permissions
SELECT * FROM user_system_permissions WHERE email = 'user@example.com';
```

## Next Steps

1. **Run the database migration** to set up the multi-system structure
2. **Update your existing users** to have appropriate system access
3. **Add the SystemSwitcher** to your navigation
4. **Protect your routes** with AuthGuard components
5. **Test the authentication flow** with users having different system access

## Support

For questions or issues with the multi-system authentication, check:
- Database migration logs
- Browser console for authentication errors
- Supabase logs for API errors
- User system access configuration
