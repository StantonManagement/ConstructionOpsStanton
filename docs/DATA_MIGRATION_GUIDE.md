# Data Migration Guide - Task 11

## Overview

**Task:** Purge test data and load Dan's 10 real active projects

**Priority:** CRITICAL (Prerequisite for consolidated dashboard)

**Estimated Time:** 4-6 hours

**Status:** Ready for Execution

---

## Why This is Critical

The consolidated dashboard (Tasks 12-24) will be useless without real project data. Currently, the app contains 100% test data with fake project names, budgets, and timelines. This migration:

1. **Cleans up test data** - Removes all dummy projects, contractors, budgets, and tasks
2. **Loads real projects** - Imports Dan's 10 active construction projects
3. **Establishes baseline** - Creates foundation for consolidated dashboard and action items
4. **Enables real usage** - Dan can start using the app for actual day-to-day work

---

## Prerequisites

Before starting this migration:

- [ ] **Database Backup Created** - CRITICAL! Take snapshot before any destructive operations
- [ ] **Dan's Availability Confirmed** - Need 60-90 min session to collect project data
- [ ] **RLS Bugs Fixed** - Tasks 1-2 from main checklist completed (ability to create projects)
- [ ] **Admin Access Verified** - Ensure you have admin role in `user_role` table
- [ ] **Test Data Reviewed** - Confirm all current data is test data that can be deleted

---

## Phase 1: Database Backup

### Step 1: Create Backup

**Using Supabase Dashboard:**
1. Log into Supabase project
2. Go to "Database" > "Backups"
3. Click "Create Backup"
4. Name it: `pre-migration-backup-2026-03-03`
5. Wait for backup to complete
6. Verify backup success

**Using pg_dump (Alternative):**
```bash
# If you have direct database access
pg_dump -h [host] -U [user] -d [database] -F c -f backup_pre_migration_$(date +%Y%m%d).dump

# Verify backup file exists and has size > 0
ls -lh backup_pre_migration_*.dump
```

### Step 2: Document Current State

Run these queries to document current data counts:

```sql
SELECT
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM contractors) as contractors,
  (SELECT COUNT(*) FROM budgets) as budgets,
  (SELECT COUNT(*) FROM payment_applications) as payment_apps,
  (SELECT COUNT(*) FROM daily_logs) as daily_logs,
  (SELECT COUNT(*) FROM tasks) as tasks,
  (SELECT COUNT(*) FROM action_items) as action_items,
  (SELECT COUNT(*) FROM users) as users;
```

Save the output - you'll verify users remain unchanged after purge.

---

## Phase 2: Data Collection Session with Dan

### Step 1: Schedule 60-90 Minute Session

Send Dan this meeting invite:

```
Subject: Data Collection for Real Project Import

Hi Dan,

We need to collect information about your 10 active projects to replace the test data in the app. This will enable the consolidated dashboard feature you requested.

Time needed: 60-90 minutes
What to bring: Project information (budgets, timelines, contractor assignments)

We'll go through each project and capture:
- Basic info (name, address, client)
- Budget and timeline
- Current phase and completion %
- Assigned contractors and trades
- Current blockers or urgent items

Template attached: REAL_PROJECT_DATA_TEMPLATE.md

Can you review the template before our session? This will speed things up significantly.

Best times for me: [provide options]

Thanks!
```

### Step 2: Conduct Data Collection Session

**During the session:**

1. **Open template:** `docs/REAL_PROJECT_DATA_TEMPLATE.md`
2. **Go through each of the 10 projects:**
   - Studio at Weston
   - 31 Park
   - 213 Buckingham retaining wall
   - Unit turnovers
   - 90 Park emergency
   - 15 Whitmore emergency
   - Zach's house (New City)
   - 165 Westland
   - 10 Walkit
   - Park Portfolio Water Conservation

3. **For each project, capture:**
   - Name, address, client info
   - Budget total and spent to date
   - Start date, completion date, phase
   - Completion percentage estimate
   - Assigned contractors (company, trade, budget, contact info)
   - Current status: what's happening, what needs attention, blockers

4. **Also capture contractors** who work on multiple projects

5. **Save completed template** as `REAL_PROJECT_DATA_FILLED.md`

### Step 3: Convert to JSON Format

After session, convert template data to JSON for import API.

**Example JSON structure:**

```json
{
  "projects": [
    {
      "name": "Studio at Weston",
      "address": "123 Main St",
      "city": "Weston",
      "state": "MA",
      "zip": "02493",
      "type": "renovation",
      "client_name": "John Doe",
      "client_phone": "555-1234",
      "client_email": "john@example.com",
      "start_date": "2026-01-15",
      "completion_date": "2026-06-30",
      "phase": "rough_in",
      "completion_percentage": 45,
      "total_budget": 250000,
      "budget_spent": 112500,
      "project_manager": "Dan",
      "description": "Studio addition with full bath and kitchenette",
      "contractors": [
        {
          "company": "ABC Plumbing",
          "trade": "Plumbing",
          "contact_person": "Mike Smith",
          "phone": "555-5678",
          "email": "mike@abcplumbing.com",
          "budget": 35000
        },
        {
          "company": "XYZ Electric",
          "trade": "Electrical",
          "contact_person": "Jane Doe",
          "phone": "555-8765",
          "email": "jane@xyzelectric.com",
          "budget": 28000
        }
      ],
      "action_items": [
        {
          "title": "Call inspector about final plumbing inspection",
          "description": "Need to schedule final plumbing inspection for rough-in. Inspector said he'd call back last week.",
          "priority": 1,
          "type": "waiting_on_external",
          "status": "open",
          "waiting_on": "Building Inspector Tom",
          "follow_up_date": "2026-03-10"
        }
      ]
    }
  ]
}
```

Save as: `real_project_data.json`

---

## Phase 3: Test Import (Dry Run)

### Step 1: Verify Import API Works

```bash
# Test GET endpoint (check current state)
curl -X GET http://localhost:3000/api/data-migration/import-real-projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "current_data": {
      "projects": 15,
      "contractors": 8,
      "action_items": 0
    },
    "instructions": [...],
    "template_location": "docs/REAL_PROJECT_DATA_TEMPLATE.md",
    "purge_script": "migrations/012_purge_test_data.sql"
  }
}
```

### Step 2: Run Dry Run Import

```bash
# Dry run - validates data but doesn't import anything
curl -X POST http://localhost:3000/api/data-migration/import-real-projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @real_project_data.json \
  --data-urlencode "dry_run=true" \
  | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "message": "Dry run complete - no data was imported",
    "results": {
      "projects_imported": 10,
      "contractors_imported": 25,
      "action_items_imported": 30,
      "errors": [],
      "dry_run": true
    }
  }
}
```

### Step 3: Fix Any Errors

If `errors` array is not empty:
1. Review each error message
2. Fix issues in `real_project_data.json`
3. Run dry run again until `errors: []`

---

## Phase 4: Purge Test Data

**⚠️ WARNING: This is destructive! Ensure backup exists!**

### Step 1: Connect to Database

```bash
# Using psql
psql -h [host] -U [user] -d [database]

# Or use Supabase SQL Editor in dashboard
```

### Step 2: Review Purge Script

Open and review: `migrations/012_purge_test_data.sql`

Make sure you understand:
- What tables will be cleared
- That users are preserved
- That schemas/structure remain intact

### Step 3: Run Purge Script

```bash
# Option 1: From psql
\i migrations/012_purge_test_data.sql

# Option 2: Direct execution
psql -h [host] -U [user] -d [database] -f migrations/012_purge_test_data.sql

# Option 3: Copy/paste into Supabase SQL Editor
```

### Step 4: Verify Purge

```sql
-- All these should return 0
SELECT COUNT(*) FROM projects;           -- Should be 0
SELECT COUNT(*) FROM properties;         -- Should be 0
SELECT COUNT(*) FROM payment_applications; -- Should be 0
SELECT COUNT(*) FROM daily_logs;         -- Should be 0
SELECT COUNT(*) FROM tasks;              -- Should be 0

-- These should NOT be 0 (preserved)
SELECT COUNT(*) FROM users;              -- Should match backup
SELECT COUNT(*) FROM user_role;          -- Should match backup
```

If anything went wrong:
1. **STOP IMMEDIATELY**
2. Restore from backup
3. Review what went wrong
4. Fix issues and try again

---

## Phase 5: Import Real Data

### Step 1: Run Real Import

```bash
# Real import (dry_run=false or omit parameter)
curl -X POST http://localhost:3000/api/data-migration/import-real-projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @real_project_data.json \
  | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "message": "Real project data imported successfully",
    "results": {
      "projects_imported": 10,
      "contractors_imported": 25,
      "action_items_imported": 30,
      "errors": []
    }
  }
}
```

### Step 2: Verify Import in Database

```sql
-- Verify project count
SELECT COUNT(*) FROM projects;  -- Should be 10

-- View imported projects
SELECT id, name, phase, completion_percentage, total_budget
FROM projects
ORDER BY name;

-- Verify contractors
SELECT COUNT(*) FROM contractors;  -- Should match expected count

-- View contractor assignments
SELECT p.name as project, c.company as contractor, pc.trade, pc.budget_amount
FROM project_contractors pc
JOIN projects p ON pc.project_id = p.id
JOIN contractors c ON pc.contractor_id = c.id
ORDER BY p.name, c.company;

-- Verify action items
SELECT COUNT(*) FROM action_items;  -- Should match expected count

-- View action items by priority
SELECT priority, COUNT(*) as count
FROM action_items
GROUP BY priority
ORDER BY priority;
```

### Step 3: Check for Errors

If there are errors in the response:
1. Review `results.errors` array
2. Some projects may have imported successfully while others failed
3. Fix data for failed projects
4. Re-run import (API will skip duplicates based on project name)

---

## Phase 6: Verification with Dan

### Step 1: Log Into App

1. Open browser: `http://localhost:3000` (or production URL)
2. Log in as Dan
3. Navigate to Projects page

### Step 2: Review Each Project

For each of the 10 projects:

- [ ] **Project name correct**
- [ ] **Address and location accurate**
- [ ] **Budget numbers match** (total, spent, remaining)
- [ ] **Timeline dates correct** (start, completion)
- [ ] **Phase and % complete accurate**
- [ ] **Contractors assigned correctly**
- [ ] **Contact information accurate**

### Step 3: Test Core Workflows

- [ ] Create a new project (verify RLS works)
- [ ] Assign a contractor to a budget line (verify RLS works)
- [ ] Edit project details
- [ ] Add a new contractor
- [ ] View project detail pages

### Step 4: Review Action Items (if imported)

- [ ] Navigate to `/dashboard` or `/dashboard-consolidated`
- [ ] Verify action items appear
- [ ] Check priority grouping (1-5)
- [ ] Verify project associations
- [ ] Test filtering and sorting

---

## Phase 7: Cleanup

### Step 1: Archive Test Data Backup

```bash
# Move backup to archive location
mv backup_pre_migration_*.dump ~/backups/archive/

# Or upload to cloud storage for long-term retention
```

### Step 2: Document Migration Completion

Create migration log:

```
Migration Date: 2026-03-03
Executed By: [Your Name]
Projects Imported: 10
Contractors Imported: 25
Action Items Imported: 30
Status: SUCCESS
Dan Verification: APPROVED on 2026-03-03
Notes: All data verified accurate, no issues found
```

Save as: `MIGRATION_LOG_2026_03_03.md`

### Step 3: Update Task 11 Status

Mark Task 11 as complete in `TASK_2_CONSOLIDATED_DASHBOARD.md`:

```markdown
1. ✅ Task 11: Data Migration (load real projects first)
```

---

## Troubleshooting

### Issue: Import API Returns 403 Forbidden

**Cause:** User doesn't have admin role

**Fix:**
```sql
-- Verify your user role
SELECT u.email, ur.role
FROM users u
LEFT JOIN user_role ur ON u.id = ur.user_id
WHERE u.email = 'your-email@example.com';

-- If role is not 'admin', update it
UPDATE user_role
SET role = 'admin'
WHERE user_id = (SELECT id FROM users WHERE email = 'your-email@example.com');
```

---

### Issue: RLS Policy Error During Import

**Cause:** RLS policies blocking INSERT operations

**Fix:**
1. Verify Tasks 1-2 from main checklist are completed (RLS bugs fixed)
2. Check that `supabaseAdmin` client is being used (bypasses RLS)
3. Review API code: should use `supabaseAdmin`, not regular `supabase`

---

### Issue: Foreign Key Violation During Import

**Cause:** Referenced data doesn't exist (e.g., user_id)

**Fix:**
1. Ensure `created_by_user_id` or `assigned_to_user_id` references valid user
2. Check that user exists: `SELECT id FROM users WHERE id = X;`
3. Update JSON to use correct user ID

---

### Issue: Duplicate Project Name Error

**Cause:** Project with same name already exists

**Fix:**
```sql
-- Check for existing projects
SELECT id, name FROM projects WHERE name = 'Studio at Weston';

-- If duplicate, either:
-- 1. Delete the old one (if it's test data)
DELETE FROM projects WHERE name = 'Studio at Weston' AND id = X;

-- 2. Or update the new project name slightly
-- Change "Studio at Weston" to "Studio at Weston (2026)"
```

---

### Issue: Purge Script Failed

**Cause:** Foreign key constraints or cascade delete issues

**Fix:**
1. Restore from backup: `pg_restore -h [host] -U [user] -d [database] backup_pre_migration_*.dump`
2. Review tables that weren't deleted
3. Manually delete in correct order (child tables first)
4. Or modify purge script to handle specific case

---

## Next Steps After Completion

Once Task 11 is complete, proceed with:

1. **Task 12:** Action Items - Database Schema & API
2. **Task 21:** Initial Action Items Seeding (coordinate with Dan for brain dump)
3. **Task 13:** Priority List UI - Core Features
4. Continue through Tasks 14-24

The real project data is now in place and ready for the consolidated dashboard feature!

---

## Success Criteria

Task 11 is complete when:

- [x] Database backup created
- [x] Data collection session completed with Dan
- [x] Test data purged from database
- [x] 10 real projects imported
- [x] Contractors imported and assigned
- [x] Initial action items seeded (if applicable)
- [x] Dan verified all data is accurate
- [x] Core workflows tested (create project, assign contractor)
- [x] Migration documented
- [x] Ready to proceed with Task 12

---

## Files Created for Task 11

- **Purge Script:** `migrations/012_purge_test_data.sql`
- **Data Template:** `docs/REAL_PROJECT_DATA_TEMPLATE.md`
- **Import API:** `src/app/api/data-migration/import-real-projects/route.ts`
- **Migration Guide:** `docs/DATA_MIGRATION_GUIDE.md` (this file)

---

## Contact

If you encounter any issues during migration:
1. **STOP** - Don't continue if something seems wrong
2. Check troubleshooting section above
3. Review migration logs
4. Contact development team
5. Restore from backup if needed

**Remember:** We have a backup. If anything goes wrong, we can restore and try again.
