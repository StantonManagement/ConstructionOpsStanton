# Rollback Procedure

## Overview

This document provides step-by-step instructions for rolling back a failed production deployment. Rollbacks should be executed quickly but carefully to restore service while minimizing data loss.

**Last Updated:** March 3, 2026
**Status:** ACTIVE - Follow these procedures for any production rollback

---

## When to Rollback

### Immediate Rollback Required (Execute within 5 minutes)

- Application completely down or inaccessible
- Critical security vulnerability exposed
- Data corruption in progress
- Core functionality broken (unable to create projects, assign contractors, etc.)
- Database connection failures
- Authentication completely broken

### Planned Rollback (Can take 15-30 minutes to assess)

- Non-critical features broken
- UI glitches affecting usability
- Performance degradation (but app still usable)
- Minor bugs affecting subset of users
- Errors in logs but core functionality works

### No Rollback Needed (Fix Forward)

- Cosmetic issues (typos, styling)
- Minor bugs with workarounds
- Non-blocking errors
- Issues that can be hotfixed quickly

---

## Rollback Decision Tree

```
Is production down or data being corrupted?
├─ YES → IMMEDIATE ROLLBACK (see Emergency Rollback)
└─ NO ↓

Are critical workflows broken (create projects, assign contractors, payments)?
├─ YES → IMMEDIATE ROLLBACK
└─ NO ↓

Can users work around the issue?
├─ YES → Assess if hotfix is faster than rollback
└─ NO → PLANNED ROLLBACK

Is the issue cosmetic or minor?
├─ YES → Fix forward with hotfix or next deployment
└─ NO → PLANNED ROLLBACK
```

---

## Pre-Rollback Checklist

Before executing rollback:

- [ ] **STOP** - Don't make additional changes
- [ ] Notify Dan immediately: "Production has issues, initiating rollback"
- [ ] Post in team Slack: "@channel Production rollback in progress - do not push any code"
- [ ] Identify the problematic deployment
  - Check git log: `git log production --oneline -10`
  - Note the commit hash of the bad deployment
  - Note the commit hash of the last known good version
- [ ] Assess impact:
  - How many users affected?
  - What functionality is broken?
  - Any data corruption?
- [ ] Decide rollback scope:
  - Code only?
  - Code + database migrations?
  - Partial rollback (specific files)?

---

## Rollback Type 1: Simple Code Rollback (No Database Changes)

**Use when:** Recent deployment broke code but made no database changes.

**Time Required:** 5-10 minutes

### Step 1: Identify Last Good Version

```bash
# View recent production commits
git log production --oneline -10

# Identify the last working commit (before the bad deployment)
# Example output:
# abc1234 (HEAD -> production) Fix: Updated RLS policies (BAD - just deployed)
# def5678 feat: Add truck inventory (LAST GOOD - working before)
# ghi9012 fix: Modal dismiss behavior
```

### Step 2: Revert the Bad Commit

```bash
# Make sure you're on production branch
git checkout production
git pull origin production

# Revert the bad commit (creates a new revert commit)
git revert HEAD --no-edit

# Push the revert
git push origin production
```

**Alternative: Reset to Last Good Commit (More Risky)**

Only use if revert doesn't work or multiple bad commits:

```bash
git checkout production
git reset --hard def5678  # Use the last good commit hash
git push origin production --force

# ⚠️ WARNING: Force push is dangerous - only use in emergencies
# ⚠️ Coordinate with team first
```

### Step 3: Verify Auto-Deployment

- Watch deployment logs for errors
- Verify build completes successfully
- Check that application loads

### Step 4: Immediate Verification

- [ ] Application loads: https://app.example.com
- [ ] Login works
- [ ] Homepage renders
- [ ] No JavaScript console errors
- [ ] Critical workflows functional

### Step 5: Communication

```
✅ Rollback Complete

Previous deployment rolled back successfully.
Application is now running on version: [commit hash]
Issue that caused rollback: [brief description]

Monitoring for 30 minutes. Please report any issues immediately.

Next steps:
- Root cause analysis scheduled
- Fix will be developed on development branch
- Will test on staging before next production deployment
```

---

## Rollback Type 2: Code + Database Rollback

**Use when:** Deployment included database migrations that are causing issues.

**Time Required:** 15-30 minutes

### Step 1: Assess Database Impact

```bash
# Connect to production database
psql -h [production-db-host] -U [username] -d [database]

# Check recent migrations
SELECT * FROM schema_migrations ORDER BY id DESC LIMIT 10;

# Identify which migration(s) need to be rolled back
```

### Step 2: Create Database Backup

**CRITICAL: Always backup before rolling back database**

```bash
# Create snapshot/backup of current database state
pg_dump -h [host] -U [user] -d [database] -F c -f rollback_backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup created
ls -lh rollback_backup_*.dump
```

### Step 3: Rollback Database Migrations

**Option A: If migration has down/rollback script**

```bash
# Run the rollback script
psql -h [host] -U [user] -d [database] -f migrations/rollback/011_rollback_truck_inventory.sql

# Verify rollback
psql -h [host] -U [user] -d [database] -c "\dt"  # List tables
```

**Option B: If no rollback script exists**

You'll need to manually reverse the migration:

```sql
-- Example: Reversing a table creation
DROP TABLE IF EXISTS new_table_name CASCADE;

-- Example: Reversing a column addition
ALTER TABLE existing_table DROP COLUMN new_column_name;

-- Example: Reversing RLS policy
DROP POLICY IF EXISTS new_policy_name ON table_name;

-- Remove from migrations tracking
DELETE FROM schema_migrations WHERE version = '011';
```

### Step 4: Rollback Application Code

Follow "Rollback Type 1" steps to revert code changes.

### Step 5: Verification

- [ ] Database rollback successful (check tables/columns)
- [ ] Application code rolled back
- [ ] Application loads and connects to database
- [ ] RLS policies working correctly
- [ ] Test critical workflows:
  - [ ] Create project
  - [ ] Assign contractor
  - [ ] Create payment application
  - [ ] View daily logs

### Step 6: Document What Happened

Create incident report (see INCIDENT_RESPONSE.md):
- What migrations were rolled back
- What data was affected (if any)
- Steps taken to rollback
- Current state of database

---

## Rollback Type 3: Emergency Rollback (Production Down)

**Use when:** Production is completely down and every second counts.

**Time Required:** 2-5 minutes

### Fastest Rollback Method

```bash
# 1. Checkout production branch
git checkout production

# 2. Hard reset to last known good commit (get from git log or tags)
git reset --hard v1.2.0  # Or use specific commit hash

# 3. Force push (EMERGENCY ONLY)
git push origin production --force

# 4. Monitor deployment
# Watch logs for build completion
# Application should be back online in 2-3 minutes
```

### Immediate Communication

Post immediately in Slack:

```
🚨 EMERGENCY ROLLBACK IN PROGRESS 🚨

Production was down. Rolling back to v1.2.0.
ETA for restoration: 3 minutes.

DO NOT push any code.
DO NOT merge any PRs.
```

### Post-Emergency Steps

Once application is back online:

1. Verify core functionality works
2. Post success message in Slack
3. Schedule immediate incident review
4. Document what went wrong
5. Create plan to fix and test properly

---

## Rollback Type 4: Partial Rollback (Specific Files)

**Use when:** Only specific files are causing issues, not entire deployment.

**Time Required:** 10-15 minutes

### Step 1: Identify Problematic Files

```bash
# Check what changed in last deployment
git diff HEAD~1 HEAD --name-only

# Identify which files are causing issues
# Example: src/app/api/projects/route.ts
```

### Step 2: Revert Specific Files

```bash
git checkout production
git pull origin production

# Revert specific files to previous version
git checkout HEAD~1 -- src/app/api/projects/route.ts
git checkout HEAD~1 -- src/app/components/ProjectsView.tsx

# Create commit
git add .
git commit -m "fix: revert problematic project files to previous version

Reverting changes to projects API and view component that caused
production errors. Full rollback not needed as other changes are working.

Affected files:
- src/app/api/projects/route.ts
- src/app/components/ProjectsView.tsx"

git push origin production
```

### Step 3: Verify

- [ ] Deployment completes
- [ ] Reverted functionality works
- [ ] Other new features still working

---

## Database Rollback Scripts

### Creating Rollback Scripts (Prevention)

**ALWAYS create rollback scripts BEFORE deploying database changes.**

For every migration file, create a corresponding rollback file:

**Example Migration: `migrations/012_add_notifications.sql`**
```sql
-- Add notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_user_policy ON notifications
  FOR ALL USING (auth.uid() = user_id);
```

**Corresponding Rollback: `migrations/rollback/012_rollback_notifications.sql`**
```sql
-- Remove RLS policies
DROP POLICY IF EXISTS notifications_user_policy ON notifications;

-- Remove table
DROP TABLE IF EXISTS notifications CASCADE;

-- Remove from migrations tracking
DELETE FROM schema_migrations WHERE version = '012';
```

### Common Rollback Patterns

**Rollback Table Creation:**
```sql
DROP TABLE IF EXISTS table_name CASCADE;
```

**Rollback Column Addition:**
```sql
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;
```

**Rollback RLS Policy:**
```sql
DROP POLICY IF EXISTS policy_name ON table_name;
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

**Rollback Index:**
```sql
DROP INDEX IF EXISTS index_name;
```

**Rollback Data Changes:**
```sql
-- Restore from backup
-- OR manually reverse the changes
UPDATE table_name SET column = 'old_value' WHERE column = 'new_value';
```

---

## Post-Rollback Procedures

### Immediate Actions (Within 1 hour)

- [ ] Post rollback success message in Slack
- [ ] Notify Dan that rollback is complete
- [ ] Monitor application for stability (30-60 minutes)
- [ ] Check error logs for any residual issues
- [ ] Verify database integrity (if database was rolled back)

### Communication Template

```
✅ Production Rollback Successful

Rollback completed at: [TIME]
Rolled back to: [VERSION/COMMIT]
Rollback type: [Code only / Code + Database]

Current Status:
✅ Application online and stable
✅ Critical workflows tested
✅ Database integrity verified
✅ No errors in logs

What went wrong:
[Brief explanation of the issue]

Next Steps:
1. Root cause analysis scheduled for [DATE/TIME]
2. Fix will be developed on development branch
3. Enhanced testing planned before next deployment
4. [Any other action items]

Team can resume normal work. Please report any issues immediately.
```

### Within 24 Hours

- [ ] Conduct incident retrospective meeting
- [ ] Document what went wrong (see INCIDENT_RESPONSE.md)
- [ ] Create GitHub issue for the bug that caused rollback
- [ ] Update CHANGELOG.md with rollback event
- [ ] Review and update deployment procedures if needed

### Root Cause Analysis

Answer these questions in incident report:

1. **What happened?** (Timeline of events)
2. **What was the root cause?** (Technical reason for failure)
3. **Why wasn't it caught?** (Gap in testing/review process)
4. **How did we detect it?** (Monitoring, user report, etc.)
5. **What was the impact?** (Users affected, duration, data loss)
6. **How did we fix it?** (Rollback procedure used)
7. **How do we prevent it?** (Process improvements, better testing, etc.)

---

## Rollback Best Practices

### DO:

- ✅ Create database rollback scripts BEFORE deploying migrations
- ✅ Take database snapshot before any rollback
- ✅ Communicate early and often during rollback
- ✅ Verify each step before moving to the next
- ✅ Test critical workflows after rollback
- ✅ Document what happened in incident report
- ✅ Use `git revert` for clean history (preferred over reset)
- ✅ Monitor application for 30-60 minutes after rollback

### DON'T:

- ❌ Panic and make hasty decisions
- ❌ Skip communication with team
- ❌ Forget to backup database before rollback
- ❌ Use `git push --force` unless absolute emergency
- ❌ Rollback in production without testing rollback script in staging first (if time allows)
- ❌ Make additional "fixes" during rollback - just restore to working state
- ❌ Skip post-rollback verification
- ❌ Forget to sync development and staging branches after rollback

---

## Common Rollback Scenarios

### Scenario 1: RLS Policy Broke Project Creation

**What happened:** New RLS policy prevents users from creating projects.

**Rollback Steps:**
1. Identify the migration that added the policy
2. Create/run rollback script to drop the policy
3. Revert application code if needed
4. Test project creation
5. Fix policy on development branch
6. Test thoroughly on staging before redeploying

### Scenario 2: Database Migration Runs Forever

**What happened:** Migration started but hasn't completed after 10 minutes.

**Immediate Actions:**
1. Check if migration is still running: `SELECT * FROM pg_stat_activity;`
2. If stuck, assess if safe to cancel
3. If safe: `SELECT pg_cancel_backend(pid);`
4. If not safe: Let it complete, even if it takes hours
5. If cancelled: Rollback partial migration
6. Restore from backup if data corrupted

### Scenario 3: Build Failing After Merge

**What happened:** TypeScript errors after merging to production.

**Rollback Steps:**
1. Revert the commit immediately
2. Build should succeed with previous code
3. Fix TypeScript errors on development branch
4. Run `npm run build` locally before next deployment
5. Consider adding pre-commit build checks

### Scenario 4: Performance Degradation

**What happened:** Application slow after deployment, but still functional.

**Assessment:**
- Is it unusable? → Immediate rollback
- Is it just slow? → Assess if hotfix is faster
- Check: Database query issues? Missing index? N+1 queries?

**Decision:**
- If quick fix available: Hotfix
- If complex issue: Rollback and fix properly

---

## Rollback Contacts

If you need help during rollback:

1. **Dan (Product Owner):** [Contact] - Decision authority
2. **Lead Developer:** [Contact] - Technical execution
3. **Database Admin:** [Contact] - Database rollbacks
4. **DevOps:** [Contact] - Infrastructure issues

**Escalation Matrix:**
- Minor issue: Post in Slack, proceed with rollback
- Major issue: Call Dan + Lead Developer
- Critical/Emergency: Call entire team

---

## Testing Your Rollback Procedure

**Practice rollbacks on staging environment quarterly:**

1. Deploy a feature to staging
2. Simulate a failure scenario
3. Execute rollback procedure
4. Document any issues with the process
5. Update this document as needed

**Last Tested:** [DATE]
**Next Test Due:** [DATE]

---

## Quick Reference Card

**Print this and keep it handy:**

```
EMERGENCY ROLLBACK - QUICK STEPS

1. STOP & COMMUNICATE
   ├─ Post in Slack: "@channel Rollback in progress"
   └─ Notify Dan

2. IDENTIFY LAST GOOD VERSION
   ├─ git log production --oneline -10
   └─ Note the last working commit hash

3. EXECUTE ROLLBACK
   ├─ git checkout production
   ├─ git revert HEAD --no-edit
   └─ git push origin production

4. VERIFY
   ├─ Watch deployment logs
   ├─ Test application loads
   ├─ Test critical workflows
   └─ Check for errors

5. COMMUNICATE SUCCESS
   └─ Post in Slack: "Rollback complete"

6. INCIDENT REPORT
   └─ Document what happened (INCIDENT_RESPONSE.md)

For database rollbacks or complex issues, see full ROLLBACK_PROCEDURE.md
```

---

## Document History

- **2026-03-03:** Initial version created

## Related Documents

- [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md) - Deployment procedures
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment checklists
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident response plan
