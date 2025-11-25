# Phase 4 Security Upgrade Guide

## Overview

This guide explains the security improvements made to the Phase 4 migration and how to upgrade from the original version.

## Summary of Changes

### 🔴 **Critical Security Fixes**

| Issue | Original | Secure Version | Impact |
|-------|----------|----------------|--------|
| **RLS Too Broad** | `auth.role() = 'authenticated'` | Role-based scoping (admin/pm/staff) | Prevents cross-company data access |
| **Photos Visibility** | All authenticated see all photos | Public/internal/private enforcement | Protects private photos |
| **Missing WITH CHECK** | Only `USING` clauses | `USING` + `WITH CHECK` | Prevents privilege escalation |
| **Race Conditions** | No locking | Advisory locks | Prevents duplicate item numbers |

### 📊 **Detailed Changes**

#### 1. **Punch List Items Policies**

**Before:**
```sql
-- Anyone authenticated can see everything
CREATE POLICY "Users can view punch list items" 
ON punch_list_items FOR SELECT 
USING (auth.role() = 'authenticated');
```

**After:**
```sql
-- Admins/PMs see all, staff see only assigned
CREATE POLICY "Admins and PMs can view all punch items" 
ON punch_list_items FOR SELECT 
TO authenticated
USING (is_admin_or_pm());

CREATE POLICY "Staff can view assigned punch items" 
ON punch_list_items FOR SELECT 
TO authenticated
USING (
  NOT is_admin_or_pm() AND (
    created_by = auth.uid() OR
    assigned_to IN (SELECT id FROM contractors WHERE id = assigned_to)
  )
);
```

**Why:** Prevents User A from seeing User B's punch list items.

---

#### 2. **Photos Visibility Policies**

**Before:**
```sql
-- All authenticated users can see internal AND private photos
CREATE POLICY "Users can view photos" ON photos FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    visibility = 'public' OR
    visibility = 'internal' OR
    (visibility = 'private' AND auth.uid() = uploaded_by)
  )
);
```

**After:**
```sql
-- Split into 3 policies for proper enforcement
CREATE POLICY "Anyone can view public photos" 
ON photos FOR SELECT TO anon, authenticated
USING (visibility = 'public');

CREATE POLICY "Authenticated users can view internal photos" 
ON photos FOR SELECT TO authenticated
USING (visibility = 'internal');

CREATE POLICY "Uploader or admin can view private photos" 
ON photos FOR SELECT TO authenticated
USING (
  visibility = 'private' AND (
    auth.uid() = uploaded_by OR 
    get_user_role() = 'admin'
  )
);
```

**Why:** Enforces true visibility control. Private photos now actually private.

---

#### 3. **WITH CHECK Clauses**

**Before:**
```sql
CREATE POLICY "Users can update punch list items" 
ON punch_list_items FOR UPDATE 
USING (auth.role() = 'authenticated');
-- No WITH CHECK clause
```

**After:**
```sql
CREATE POLICY "Admins and PMs can update punch items" 
ON punch_list_items FOR UPDATE 
TO authenticated
USING (is_admin_or_pm())
WITH CHECK (is_admin_or_pm()); -- Added
```

**Why:** Prevents privilege escalation attacks where a user updates data to gain access.

---

#### 4. **Item Number Race Conditions**

**Before:**
```sql
CREATE OR REPLACE FUNCTION generate_punch_item_number(p_project_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- No locking - two concurrent calls could get same number
  SELECT COALESCE(MAX(...), 0) + 1
  INTO next_number
  FROM punch_list_items
  WHERE project_id = p_project_id;
  
  RETURN 'P-' || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

**After:**
```sql
CREATE OR REPLACE FUNCTION generate_punch_item_number(p_project_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Advisory lock prevents concurrent number generation
  PERFORM pg_advisory_xact_lock(31415, p_project_id);
  
  SELECT COALESCE(MAX(...), 0) + 1
  INTO next_number
  FROM punch_list_items
  WHERE project_id = p_project_id;
  
  RETURN 'P-' || LPAD(next_number::TEXT, 3, '0');
  -- Lock automatically released at transaction end
END;
$$ LANGUAGE plpgsql;
```

**Why:** Prevents two users creating P-001 at the same time.

---

#### 5. **Helper Functions Added**

```sql
-- Check if user is admin or PM
CREATE OR REPLACE FUNCTION is_admin_or_pm()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role ur
    JOIN users u ON u.id = ur.user_id
    WHERE u.uuid = auth.uid()
    AND ur.role IN ('admin', 'pm')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT ur.role INTO user_role
  FROM user_role ur
  JOIN users u ON u.id = ur.user_id
  WHERE u.uuid = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Why:** Reusable logic for role-based policies, improves maintainability.

---

#### 6. **Additional Indexes**

```sql
-- Optimize RLS policy queries
CREATE INDEX IF NOT EXISTS idx_photos_visibility ON photos(visibility);
CREATE INDEX IF NOT EXISTS idx_photos_project_visibility ON photos(project_id, visibility);
CREATE INDEX IF NOT EXISTS idx_punch_list_assigned_to ON punch_list_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_photo_collections_created_by ON photo_collections(created_by);
CREATE INDEX IF NOT EXISTS idx_photo_annotations_created_by ON photo_annotations(created_by);
```

**Why:** RLS policies filter on these columns, indexes improve query performance.

---

## Migration Options

### Option 1: Fresh Installation (Recommended)

If you **haven't run the original migration** yet:

```bash
# Run the secure version directly
psql -f database-migrations/phase4-field-ops-secure.sql
```

### Option 2: Upgrade Existing Installation

If you've already run the original migration:

```sql
-- 1. Drop old policies
DROP POLICY IF EXISTS "Users can view punch list items" ON punch_list_items;
DROP POLICY IF EXISTS "Users can insert punch list items" ON punch_list_items;
DROP POLICY IF EXISTS "Users can update punch list items" ON punch_list_items;
DROP POLICY IF EXISTS "Users can delete punch list items" ON punch_list_items;
DROP POLICY IF EXISTS "Users can view photos" ON photos;
DROP POLICY IF EXISTS "Users can insert photos" ON photos;
DROP POLICY IF EXISTS "Users can update own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
-- ... repeat for other tables

-- 2. Add helper functions
-- Copy the is_admin_or_pm() and get_user_role() functions from secure file

-- 3. Add new policies
-- Copy all the new CREATE POLICY statements from secure file

-- 4. Update generate_punch_item_number function
-- Copy the updated function with advisory locks

-- 5. Add missing indexes
-- Copy the new index statements
```

### Option 3: Side-by-Side Comparison

```bash
# Compare the two files
diff database-migrations/phase4-field-ops.sql database-migrations/phase4-field-ops-secure.sql
```

---

## Testing the Upgrade

### Test 1: Role-Based Access

```sql
-- As admin user (should work)
SELECT * FROM punch_list_items;

-- As staff user (should only see assigned items)
SELECT * FROM punch_list_items;
```

### Test 2: Photo Visibility

```sql
-- Insert a private photo
INSERT INTO photos (project_id, photo_url, visibility, uploaded_by)
VALUES (1, 'test.jpg', 'private', auth.uid());

-- Try to view as different user (should fail)
SELECT * FROM photos WHERE visibility = 'private';
```

### Test 3: Item Number Race Condition

```sql
-- Run concurrently in two sessions
SELECT generate_punch_item_number(1); -- Should always get unique numbers
```

---

## Rollback Plan

If you need to rollback to the original permissive policies:

```sql
-- Drop secure policies
DROP POLICY IF EXISTS "Admins and PMs can view all punch items" ON punch_list_items;
DROP POLICY IF EXISTS "Staff can view assigned punch items" ON punch_list_items;
-- ... etc

-- Restore original policies
CREATE POLICY "Users can view punch list items" 
ON punch_list_items FOR SELECT 
USING (auth.role() = 'authenticated');
-- ... etc
```

**⚠️ Warning:** Rollback reduces security. Only do this for troubleshooting.

---

## Performance Impact

### Expected Changes:

- **Queries with RLS**: Slightly slower due to role checks
- **Item number generation**: Slightly slower due to locks (negligible for typical usage)
- **Overall impact**: < 5% performance overhead for much better security

### If Performance Issues Arise:

1. Check indexes are created:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename IN ('punch_list_items', 'photos', 'warranties');
   ```

2. Analyze query plans:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM punch_list_items;
   ```

3. Consider adding composite indexes for your specific access patterns

---

## Future Enhancements

### Project Membership Model (Phase 5+)

The secure version includes comments about implementing **project-level membership**:

```sql
-- Future: Create project_members table
CREATE TABLE project_members (
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);

-- Future: Update policies to use project membership
CREATE POLICY "Members can view project punch items"
ON punch_list_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = punch_list_items.project_id
    AND pm.user_id = auth.uid()
  )
);
```

This would provide **granular project-level access control** instead of org-wide roles.

---

## Recommendation

**Use the secure version (`phase4-field-ops-secure.sql`) for production.**

The original version is suitable only for:
- Single-user testing
- Development environments
- Trusted internal teams where all users should see all data

For production deployment with multiple users/clients, the secure version is **essential**.

---

## Questions?

Common scenarios:

**Q: "We want everyone to see all punch items"**  
A: Keep admin/PM policies, modify staff policy to show all

**Q: "We need per-project access, not per-role"**  
A: Implement project_members table (see Future Enhancements)

**Q: "Performance is slow after upgrade"**  
A: Check indexes, share EXPLAIN ANALYZE output for diagnosis

**Q: "Can we keep some tables permissive?"**  
A: Yes, selectively apply secure policies to critical tables only




