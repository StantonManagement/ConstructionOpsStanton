# User Management System - Implementation Strategy

## Overview
Build a comprehensive user management system for admins to manage user accounts, roles, and permissions within the Construction Operations Platform.

---

## Current System Analysis

### Existing Infrastructure ✅
```sql
-- Table: user_role
- id (bigint, primary key)
- created_at (timestamp)
- user_id (uuid, foreign key to auth.users)
- role (text) - Currently: 'admin', 'staff'
- updated_at (timestamp)

-- Auth System
- Supabase Auth (auth.users table)
- Email/password authentication
- JWT-based sessions
```

### Current Users (5 total)
- 3 Admins: zz@stantoncap.com, dd@stantoncap.com, dt@stantoncap.com
- 1 Staff: jzeffsomera@gmail.com
- 1 No Role: admin.test@example.com

### Current Limitations
- No UI for user management
- Manual database updates required to create users
- No audit logging for user actions
- Limited role granularity (only admin/staff)
- No user activity tracking
- No password reset flow UI

---

## Proposed System Architecture

### Phase 1: Core User Management (MVP)
**Timeline: 3-5 days**

#### 1.1 User List Page (`/users`)
**Features:**
- Table view of all users
- Columns:
  - Email
  - Role (badge with color: admin=purple, staff=blue, no role=gray)
  - Status (active, inactive, pending)
  - Created Date
  - Last Login
  - Actions (Edit, Deactivate, Delete)
- Search/filter by email, role, status
- Sort by any column
- Pagination (20 users per page)
- **Admin-only access** (role check)

**Components to Create:**
```typescript
/src/app/users/page.tsx              // Main users page
/src/components/users/UserTable.tsx  // Data table
/src/components/users/UserRow.tsx    // Table row
/src/components/users/UserFilters.tsx // Search & filters
```

#### 1.2 Invite User Modal
**Features:**
- Email input (with validation)
- Role selection dropdown (admin, staff, project_manager, viewer)
- Portfolio assignment (optional)
- Send invitation email via Supabase Auth
- Success/error notifications

**Component:**
```typescript
/src/components/users/InviteUserModal.tsx
```

**Flow:**
1. Admin clicks "Invite User" button
2. Modal opens with form
3. Admin enters email, selects role
4. System sends invitation email via Supabase Auth
5. User receives email with magic link
6. User clicks link → sets password
7. User record created in auth.users
8. Role assigned in user_role table

#### 1.3 Edit User Modal
**Features:**
- Change role
- Change status (active/inactive)
- Update portfolio access
- View user activity summary
- Save button with confirmation

**Component:**
```typescript
/src/components/users/EditUserModal.tsx
```

#### 1.4 Delete User Confirmation
**Features:**
- Warning dialog
- List impacts (e.g., "User has created 5 projects, 12 bids")
- Soft delete vs hard delete option
- Transfer ownership option

**Component:**
```typescript
/src/components/users/DeleteUserDialog.tsx
```

---

### Phase 2: Enhanced Roles & Permissions
**Timeline: 2-3 days**

#### 2.1 Granular Roles
```typescript
enum UserRole {
  ADMIN = 'admin',           // Full access
  STAFF = 'staff',           // Basic access
  PROJECT_MANAGER = 'pm',    // Project management
  VIEWER = 'viewer',         // Read-only
  CONTRACTOR = 'contractor', // Limited to their bids/contracts
}
```

#### 2.2 Permission Matrix
```typescript
const PERMISSIONS = {
  admin: ['*'], // All permissions

  pm: [
    'projects.view',
    'projects.create',
    'projects.edit',
    'bids.view',
    'bids.create',
    'bids.edit',
    'contractors.view',
    'payments.view',
    'draws.view',
  ],

  staff: [
    'projects.view',
    'bids.view',
    'contractors.view',
    'payments.view',
  ],

  viewer: [
    'projects.view',
    'bids.view',
    'reports.view',
  ],

  contractor: [
    'bids.view_own',
    'bids.submit',
    'projects.view_assigned',
  ],
};
```

#### 2.3 Database Schema Updates
```sql
-- Create permissions table
CREATE TABLE user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- Create user activity log
CREATE TABLE user_activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at DESC);
```

---

### Phase 3: User Activity & Audit Trail
**Timeline: 2-3 days**

#### 3.1 Activity Tracking
**Events to Log:**
- Login/logout
- User created/edited/deleted
- Project created/edited/deleted
- Bid submitted/awarded
- Payment approved
- Settings changed

**Implementation:**
```typescript
// /src/lib/activityLogger.ts
export async function logActivity(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  await supabaseAdmin.from('user_activity_log').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
    ip_address: getIpAddress(),
    user_agent: getUserAgent(),
  });
}
```

#### 3.2 Activity Dashboard
**Features:**
- Recent activity feed (last 50 actions)
- Filter by user, action type, date range
- Export to CSV
- Real-time updates (optional)

**Component:**
```typescript
/src/app/users/activity/page.tsx
/src/components/users/ActivityFeed.tsx
/src/components/users/ActivityFilters.tsx
```

---

### Phase 4: Advanced Features
**Timeline: 3-4 days**

#### 4.1 User Profiles
**Features:**
- Profile page (`/users/[id]`)
- Display:
  - Basic info (email, role, join date)
  - Portfolio assignments
  - Recent activity
  - Created projects/bids
  - Performance metrics
- Edit own profile
- Upload avatar (optional)

#### 4.2 Team Management
**Features:**
- Group users into teams
- Assign team lead
- Team-based permissions
- Team activity dashboard

**Schema:**
```sql
CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  team_lead_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE team_members (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

#### 4.3 Session Management
**Features:**
- View active sessions
- Device information (browser, OS, location)
- Last activity time
- Revoke session (force logout)

**Schema:**
```sql
CREATE TABLE user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_info JSONB,
  ip_address TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

#### 4.4 Password Policies
**Features:**
- Minimum password length (8 characters)
- Require uppercase, lowercase, number, special char
- Password expiry (90 days)
- Password history (can't reuse last 5)
- Force password change on first login

---

## API Endpoints to Create

### User Management
```typescript
GET    /api/users                    // List all users (admin only)
GET    /api/users/:id                // Get user details
POST   /api/users/invite             // Invite new user
PATCH  /api/users/:id                // Update user (role, status, etc.)
DELETE /api/users/:id                // Delete user
POST   /api/users/:id/deactivate     // Deactivate user
POST   /api/users/:id/reactivate     // Reactivate user
```

### Activity & Audit
```typescript
GET    /api/users/:id/activity       // Get user activity
GET    /api/activity                 // Get all activity (admin only)
POST   /api/activity/log             // Log activity (internal)
```

### Sessions
```typescript
GET    /api/users/:id/sessions       // Get user sessions
DELETE /api/users/:id/sessions/:sid  // Revoke session
```

### Permissions
```typescript
GET    /api/users/:id/permissions    // Get user permissions
POST   /api/users/:id/permissions    // Grant permission
DELETE /api/users/:id/permissions    // Revoke permission
```

---

## Database Migrations

### Step 1: Add status column to user_role
```sql
ALTER TABLE user_role
ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));

CREATE INDEX idx_user_role_status ON user_role(status);
```

### Step 2: Add extended user profile
```sql
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Step 3: Add last_login tracking
```sql
ALTER TABLE user_role
ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

-- Trigger to update last_login on auth
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_role
  SET last_login = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would need to be on auth.users
-- May need custom Supabase function or middleware
```

---

## Security Considerations

### 1. Row Level Security (RLS)
```sql
-- Only admins can view all users
CREATE POLICY "admins_view_all_users" ON user_role
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_role WHERE role = 'admin'
    )
  );

-- Users can view their own record
CREATE POLICY "users_view_own_record" ON user_role
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only admins can modify user roles
CREATE POLICY "admins_modify_users" ON user_role
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_role WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_role WHERE role = 'admin'
    )
  );
```

### 2. API Route Protection
```typescript
// Middleware to check admin role
export async function requireAdmin(req: NextRequest) {
  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    throw new Error('Unauthorized');
  }

  const { data: userRole } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', session.data.session.user.id)
    .single();

  if (userRole?.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }

  return session.data.session.user;
}
```

### 3. Input Validation
- Email format validation
- Role enum validation
- Prevent self-role-elevation (admin can't promote themselves)
- Prevent last admin deletion

---

## UI/UX Design

### Color Coding
- **Admin:** Purple badge, purple border
- **Staff:** Blue badge, blue border
- **Project Manager:** Green badge, green border
- **Viewer:** Gray badge, gray border
- **Inactive:** Red badge, red border

### Layout
```
┌─────────────────────────────────────────────────┐
│ User Management                  [+ Invite User]│
├─────────────────────────────────────────────────┤
│ [Search...] [Role: All ▼] [Status: All ▼]      │
├──────┬──────────┬────────┬──────────┬───────────┤
│ Email│ Role     │ Status │ Created  │ Actions   │
├──────┼──────────┼────────┼──────────┼───────────┤
│ zz@..│ [Admin]  │ Active │ Dec 2    │ [•••]     │
│ dd@..│ [Admin]  │ Active │ Dec 2    │ [•••]     │
│ jz@..│ [Staff]  │ Active │ Jan 14   │ [•••]     │
└──────┴──────────┴────────┴──────────┴───────────┘
          Showing 1-10 of 25        [< 1 2 3 >]
```

### Invite User Modal
```
┌───────────────────────────────────────┐
│ Invite New User                    [X]│
├───────────────────────────────────────┤
│                                       │
│ Email *                               │
│ ┌───────────────────────────────────┐ │
│ │ user@example.com                  │ │
│ └───────────────────────────────────┘ │
│                                       │
│ Role *                                │
│ ┌───────────────────────────────────┐ │
│ │ Staff                          ▼  │ │
│ └───────────────────────────────────┘ │
│                                       │
│ Portfolio (Optional)                  │
│ ┌───────────────────────────────────┐ │
│ │ Select portfolio...            ▼  │ │
│ └───────────────────────────────────┘ │
│                                       │
│        [Cancel]  [Send Invitation]    │
└───────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests
```typescript
// /src/lib/__tests__/userManagement.test.ts
describe('User Management', () => {
  test('inviteUser creates user and sends email', async () => {
    // Test implementation
  });

  test('updateUserRole requires admin permission', async () => {
    // Test implementation
  });

  test('cannot delete last admin', async () => {
    // Test implementation
  });
});
```

### Integration Tests
- Test full invite flow
- Test role change propagation
- Test activity logging
- Test session revocation

### Manual Testing Checklist
- [ ] Invite user with valid email
- [ ] Invite user with invalid email (should fail)
- [ ] Change user role (admin → staff)
- [ ] Deactivate user (should not be able to login)
- [ ] Reactivate user
- [ ] Delete user (soft delete)
- [ ] View activity log
- [ ] Filter users by role/status
- [ ] Search users by email
- [ ] Pagination works correctly

---

## Implementation Phases - Detailed Timeline

### Week 1: Foundation (5 days)
**Day 1:** Database schema & migrations
- Create user_profiles table
- Add status column to user_role
- Set up RLS policies

**Day 2:** API routes
- GET /api/users (list)
- GET /api/users/:id (detail)
- PATCH /api/users/:id (update)

**Day 3:** User list page
- Create page layout
- Build UserTable component
- Add search & filters
- Implement pagination

**Day 4:** Invite user flow
- Create InviteUserModal
- POST /api/users/invite endpoint
- Email invitation via Supabase Auth
- Success notifications

**Day 5:** Edit & delete flows
- Create EditUserModal
- Create DeleteUserDialog
- DELETE /api/users/:id endpoint
- Test all CRUD operations

### Week 2: Enhanced Features (5 days)
**Day 6:** Permissions system
- Create user_permissions table
- Build permission checking middleware
- Update UI to show/hide based on permissions

**Day 7:** Activity logging
- Create user_activity_log table
- Build logActivity helper function
- Add activity logging to key actions

**Day 8:** Activity dashboard
- Create /users/activity page
- Build ActivityFeed component
- Add filters & search
- Export to CSV feature

**Day 9:** User profiles
- Create /users/[id] page
- Build profile view components
- Add edit profile functionality
- Avatar upload (optional)

**Day 10:** Polish & testing
- Bug fixes
- UI/UX improvements
- Write tests
- Documentation

---

## Success Metrics

1. **Functionality**
   - ✅ Admins can invite users
   - ✅ Admins can manage roles
   - ✅ Activity is logged
   - ✅ Users can view their profile

2. **Performance**
   - User list loads in < 500ms
   - Search results in < 300ms
   - Activity log loads in < 1s

3. **Security**
   - All endpoints protected by auth
   - RLS policies enforced
   - No unauthorized access possible
   - Audit trail complete

4. **Usability**
   - Intuitive UI
   - Clear error messages
   - Helpful empty states
   - Mobile responsive

---

## Future Enhancements (Post-MVP)

1. **SSO Integration**
   - Google Workspace
   - Microsoft Azure AD
   - Okta

2. **Two-Factor Authentication (2FA)**
   - TOTP (Google Authenticator)
   - SMS verification
   - Backup codes

3. **Advanced Analytics**
   - User engagement metrics
   - Login patterns
   - Feature usage tracking
   - Performance dashboards

4. **Bulk Operations**
   - Import users from CSV
   - Bulk role assignment
   - Bulk deactivation
   - Export user data

5. **Notifications**
   - Email notifications for role changes
   - Slack/Teams integration
   - In-app notifications
   - Activity digests

6. **API Keys**
   - Generate API keys for automation
   - Scoped permissions
   - Rate limiting
   - Usage tracking

---

## Questions to Answer Before Starting

1. **Role Granularity:** Do you need more roles than admin/staff? (e.g., PM, viewer, contractor)
2. **User Invitation:** Should users set their own password or receive a generated one?
3. **Email Provider:** Continue with Supabase Auth emails or integrate custom provider?
4. **Soft vs Hard Delete:** Should deleted users be soft-deleted or permanently removed?
5. **Activity Retention:** How long should activity logs be retained? (30 days, 90 days, 1 year?)
6. **Session Timeout:** What should the session timeout be? (24 hours, 7 days, 30 days?)

---

## Recommended Approach: Start with MVP

**Phase 1 (Week 1)** gives you:
- ✅ User list page
- ✅ Invite users
- ✅ Edit roles
- ✅ Delete users
- ✅ Basic search/filter

This provides immediate value and can be extended later with Phases 2-4.

**Start coding order:**
1. Add sidebar navigation item ✅ (DONE)
2. Create `/users` page structure
3. Build API endpoints
4. Create user table component
5. Add invite modal
6. Test thoroughly

---

**Ready to start building? Let me know which phase you want to tackle first!**
