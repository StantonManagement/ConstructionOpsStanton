# Audit Log System

## Overview
A comprehensive audit logging system that tracks all user activities and data changes across the application. The system is designed to be minimalist, non-intrusive, and provides full visibility into system activities.

## Features

### 1. **AuditLog Component** (`src/app/components/AuditLog.tsx`)
- **Minimalist Design**: Collapsible section at the bottom of pages
- **Smart Filtering**: Can filter by entity type and entity ID
- **Expandable/Collapsible**: Starts collapsed to save space, expands on click
- **Real-time Updates**: Fetches latest activity logs
- **Activity Icons**: Visual indicators for different action types (create, update, delete, etc.)
- **Detailed View**: Option to view change details in JSON format
- **Time Display**: Shows relative time ("2 minutes ago") with full timestamp on hover

### 2. **Database Schema** (`DATABASE_AUDIT_LOGS.sql`)

#### audit_logs Table
```sql
- id: UUID (Primary Key)
- user_id: UUID (References auth.users)
- user_name: TEXT
- action: TEXT (e.g., "create_project", "update_payment")
- entity_type: TEXT (e.g., "project", "payment", "contractor")
- entity_id: TEXT
- entity_name: TEXT
- changes: JSONB (Stores old/new values)
- metadata: JSONB (Additional context)
- ip_address: INET (Optional)
- user_agent: TEXT (Optional)
- created_at: TIMESTAMPTZ
```

#### Indexes
- `created_at DESC` - Fast retrieval of recent logs
- `user_id` - Quick filtering by user
- `entity_type` - Filter by resource type
- `entity_id` - Find specific entity logs
- `(entity_type, entity_id)` - Composite index for entity queries

### 3. **Automatic Triggers**
The system includes automatic triggers for the `projects` table that log:
- Project creation
- Project updates (with old/new values)
- Project deletion

Additional triggers can be easily added for other tables.

### 4. **Manual Logging Function**
```sql
SELECT log_audit_entry(
  p_user_id := auth.uid(),
  p_user_name := 'John Doe',
  p_action := 'approve_payment',
  p_entity_type := 'payment_application',
  p_entity_id := '123',
  p_entity_name := 'Payment #5 - ACME Corp',
  p_changes := '{"status": {"old": "pending", "new": "approved"}}'::jsonb,
  p_metadata := '{"amount": 50000, "project": "Main Street Renovation"}'::jsonb
);
```

## Implementation

### Pages with Audit Logs
1. **Dashboard** (`ImprovedOverviewView.tsx`) - Global activity
2. **Projects** (`ProjectsView.tsx`) - All project activities
3. **Contractors** (`ContractorsView.tsx`) - Contractor management activities
4. **Payments** (`PaymentsView.tsx`) - Payment processing activities
5. **Documents** (`DocumentsView.tsx`) - Project-specific document activities
6. **Settings** (`SettingsView.tsx`) - System configuration changes

### Usage in Components

#### Global Audit Log (all activities)
```tsx
<AuditLog limit={15} />
```

#### Entity-Specific Audit Log
```tsx
<AuditLog
  entityType="project"
  entityId={projectId.toString()}
  limit={15}
/>
```

## Installation

1. **Run the migration**:
```bash
# Using Supabase CLI
supabase migration new audit_logs
# Copy contents from DATABASE_AUDIT_LOGS.sql

# Or execute directly in SQL Editor
psql -d your_database -f DATABASE_AUDIT_LOGS.sql
```

2. **Verify installation**:
```sql
-- Check table exists
SELECT * FROM audit_logs LIMIT 1;

-- Test the logging function
SELECT log_audit_entry(
  p_user_id := auth.uid(),
  p_user_name := 'Test User',
  p_action := 'test_action',
  p_entity_type := 'test'
);
```

## Action Types

### Standard Actions
- `create_*` - Entity creation (✨ icon)
- `update_*` / `edit_*` - Entity updates (✏️ icon)
- `delete_*` - Entity deletion (🗑️ icon)
- `approve_*` - Approval actions (✅ icon)
- `reject_*` - Rejection actions (❌ icon)
- `upload_*` - File uploads (📤 icon)
- `download_*` - File downloads (📥 icon)
- Default - Generic actions (📝 icon)

### Entity Types
- `project` - Projects
- `contractor` - Contractors/Vendors
- `payment_application` - Payment applications
- `contract` - Contracts
- `document` - Documents
- `user` - User management
- `settings` - System settings
- Custom types as needed

## Color Coding
- **Green** - Create actions
- **Blue** - Update/Edit actions
- **Red** - Delete actions
- **Dark Green** - Approve actions
- **Dark Red** - Reject actions
- **Gray** - Default actions

## Security

### Row Level Security (RLS)
- **Read**: All authenticated users can read audit logs
- **Insert**: All authenticated users can insert logs (for manual logging)
- **Update/Delete**: No policies (audit logs are immutable)

### Best Practices
1. Never delete audit logs (for compliance)
2. Archive old logs periodically (after 1-2 years)
3. Use the `log_audit_entry()` function for consistent logging
4. Always include meaningful entity names for readability
5. Store sensitive change details in encrypted JSONB if needed

## Future Enhancements

### Planned Features
- [ ] Export audit logs to CSV/PDF
- [ ] Advanced filtering (date ranges, action types)
- [ ] Audit log dashboard with analytics
- [ ] Email notifications for critical actions
- [ ] Retention policies and automatic archiving
- [ ] Search functionality across all logs
- [ ] IP address and user agent tracking
- [ ] Integration with external logging services (e.g., Datadog, Splunk)

### Additional Triggers
Consider adding automatic triggers for:
- `contractors` table
- `payment_applications` table
- `contracts` table
- `project_contractors` table
- `users` table (for user management)
- `documents` table

## Example Queries

### Get all activities for a project
```sql
SELECT * FROM audit_logs
WHERE entity_type = 'project' AND entity_id = '123'
ORDER BY created_at DESC;
```

### Get all activities by a user
```sql
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 50;
```

### Get recent deletions
```sql
SELECT * FROM audit_logs
WHERE action LIKE 'delete_%'
ORDER BY created_at DESC
LIMIT 20;
```

### Activity summary by type
```sql
SELECT
  entity_type,
  COUNT(*) as action_count,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY entity_type
ORDER BY action_count DESC;
```

## Dependencies
- `date-fns` - For relative time formatting ("2 minutes ago")
- `lucide-react` - Icons
- Supabase client - Database access

## Maintenance

### Monitoring
Check audit log growth periodically:
```sql
SELECT
  COUNT(*) as total_logs,
  pg_size_pretty(pg_total_relation_size('audit_logs')) as table_size,
  MIN(created_at) as oldest_log,
  MAX(created_at) as newest_log
FROM audit_logs;
```

### Cleanup (if needed)
Archive logs older than 2 years:
```sql
-- Create archive table first
CREATE TABLE audit_logs_archive (LIKE audit_logs INCLUDING ALL);

-- Move old records
INSERT INTO audit_logs_archive
SELECT * FROM audit_logs
WHERE created_at < NOW() - INTERVAL '2 years';

-- Delete from main table
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '2 years';
```
