# Deployment Workflow

## Overview

This document outlines the branch-based deployment workflow for the Construction Ops application. This workflow was implemented after a critical production incident where untested changes were pushed directly to production, breaking core functionality during a live demo.

**Last Updated:** March 3, 2026
**Status:** ACTIVE - MANDATORY FOR ALL DEPLOYMENTS

---

## The Problem We're Solving

On February 26, 2026, RLS (Row Level Security) changes were pushed directly to the `main` branch without testing. The next day during a live demo with Dan:
- Users couldn't create new projects
- Users couldn't assign contractors to budget lines
- Core functionality was completely broken

**Dan's directive:** "Stop pushing directly to production. Use branches. Test before deploying. If something breaks, communicate it immediately."

---

## Branch Structure

We use a three-branch workflow:

### 1. `development` Branch
- **Purpose:** Active development and integration
- **Environment:** Local development machines
- **Stability:** Can be broken, experimental features allowed
- **Auto-deploy:** No
- **Protection:** Minimal (allows direct commits for rapid development)

### 2. `staging` Branch
- **Purpose:** Pre-production testing with production-like data
- **Environment:** `test.example.com` (or staging subdomain)
- **Stability:** Should be stable, mirrors production
- **Auto-deploy:** Yes (to staging environment)
- **Protection:** Requires PR from `development`, code review required
- **Data:** Production-like test data (sanitized)

### 3. `production` Branch
- **Purpose:** Live production code
- **Environment:** `app.example.com` (production domain)
- **Stability:** MUST be stable at all times
- **Auto-deploy:** Yes (to production environment)
- **Protection:** STRICT - Requires PR from `staging`, Dan's approval, passing tests
- **Data:** Real customer data

**Note:** The `main` branch currently serves as `production`. We will transition to using `production` as the primary production branch.

---

## Development Workflow

### Step 1: Create Feature Branch

Start all new work from the `development` branch:

```bash
# Make sure you're on development and up to date
git checkout development
git pull origin development

# Create your feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features (e.g., `feature/truck-inventory`)
- `fix/` - Bug fixes (e.g., `fix/rls-project-creation`)
- `hotfix/` - Emergency production fixes (e.g., `hotfix/critical-auth-bug`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Step 2: Develop and Test Locally

```bash
# Make your changes
# Test thoroughly on your local machine

# Run the build
npm run build

# Fix any TypeScript errors
# Test all affected functionality
# Verify no regressions

# Commit your changes
git add .
git commit -m "feat: add truck inventory management system

- Created trucks table and API
- Built UI components
- Added to navigation"
```

### Step 3: Push to Feature Branch

```bash
git push origin feature/your-feature-name
```

### Step 4: Open Pull Request to `development`

1. Go to GitHub repository
2. Click "New Pull Request"
3. Base: `development` ← Compare: `feature/your-feature-name`
4. Fill out PR template:
   - **Title:** Clear, descriptive title
   - **Description:** What changed and why
   - **Testing:** How you tested it
   - **Screenshots:** If UI changes
   - **Breaking Changes:** Any breaking changes
5. Request review from team member
6. Wait for approval

### Step 5: Merge to `development`

Once approved:
- Use "Squash and Merge" for clean history
- Delete feature branch after merge
- Verify merge was successful

---

## Staging Deployment

### When to Deploy to Staging

Deploy to staging when:
- Multiple features are complete and tested on `development`
- You want to test with production-like data
- Before any production deployment
- Dan wants to review new features

### Step 1: Open PR from `development` to `staging`

```bash
# Ensure development is up to date
git checkout development
git pull origin development
```

1. Go to GitHub
2. New Pull Request
3. Base: `staging` ← Compare: `development`
4. Title: "Deploy to Staging - [Date] - [Feature List]"
5. Description: List all features/fixes being deployed

### Step 2: Code Review

- **Required:** At least one team member review
- **Focus:**
  - Database migrations are safe
  - No hardcoded production credentials
  - RLS policies are correct
  - API changes are backward compatible

### Step 3: Merge and Auto-Deploy

- Merge PR to `staging`
- Automatic deployment to staging environment triggers
- Monitor deployment logs for errors

### Step 4: Test on Staging

**Mandatory Testing on Staging:**
- [ ] Login/authentication works
- [ ] All new features work as expected
- [ ] No regressions in existing features
- [ ] Database migrations applied successfully
- [ ] RLS policies allow proper access
- [ ] API endpoints return expected data
- [ ] Mobile responsiveness (if UI changes)
- [ ] Dan reviews and approves

**Testing with Production-Like Data:**
- Use sanitized production data snapshot
- Test edge cases that don't exist in dev data
- Verify performance with realistic data volumes

---

## Production Deployment

### Prerequisites

**BEFORE opening a PR to production, ensure:**
- ✅ All features tested and working on staging
- ✅ Dan has reviewed and approved on staging
- ✅ No critical bugs or issues reported
- ✅ Database migrations are reversible (if applicable)
- ✅ Rollback plan is documented
- ✅ Team is available to monitor deployment

### Step 1: Schedule Deployment Window

**Preferred deployment times:**
- Tuesday-Thursday, 10 AM - 2 PM EST
- Avoid Mondays (start of week issues)
- Avoid Fridays (no weekend coverage)
- Never deploy right before demos or important meetings

**Communication:**
- Notify Dan 24 hours in advance
- Post in team Slack channel
- Document what's being deployed

### Step 2: Open PR from `staging` to `production`

1. Go to GitHub
2. New Pull Request
3. Base: `production` (or `main` until migration) ← Compare: `staging`
4. Title: "Production Deployment - [Date] - [Version]"
5. Description:
   - List of features/fixes
   - Database migrations included
   - Rollback plan
   - Testing performed

### Step 3: Final Review and Approval

**Required Approvals:**
- At least one senior developer
- Dan's explicit approval (comment on PR)

**Final Checks:**
- [ ] All tests pass
- [ ] Staging is stable
- [ ] Rollback plan documented
- [ ] Team available for monitoring

### Step 4: Deploy to Production

```bash
# Merge PR to production
# Auto-deployment triggers

# Monitor deployment
# Watch logs for errors
# Check application health
```

### Step 5: Post-Deployment Verification

**Immediately after deployment:**
- [ ] Application loads successfully
- [ ] Login works
- [ ] Critical workflows functional:
  - [ ] Create new project
  - [ ] Assign contractors
  - [ ] Create payment application
  - [ ] Daily logs work
- [ ] No error spikes in logs
- [ ] Database migrations completed
- [ ] Check Sentry/error tracking (if configured)

**Monitor for 1 hour:**
- Watch for error reports
- Monitor user activity
- Check performance metrics
- Be ready to rollback if needed

### Step 6: Communication

**Success:**
- Post in Slack: "Production deployment successful ✅"
- List deployed features
- Note any known issues

**Issues:**
- Follow Incident Response Plan (see INCIDENT_RESPONSE.md)
- Notify Dan immediately
- Initiate rollback if critical

---

## Hotfix Workflow

For critical production bugs that need immediate fixing:

### Step 1: Create Hotfix Branch from `production`

```bash
git checkout production
git pull origin production
git checkout -b hotfix/critical-bug-description
```

### Step 2: Fix the Bug

- Make minimal changes to fix only the critical issue
- Test thoroughly locally
- Verify fix doesn't introduce new issues

### Step 3: Deploy Hotfix

```bash
# Push hotfix branch
git push origin hotfix/critical-bug-description

# Open PR to production
# Get emergency approval from Dan
# Merge and deploy

# IMPORTANT: Also merge hotfix back to staging and development
git checkout staging
git merge hotfix/critical-bug-description
git push origin staging

git checkout development
git merge hotfix/critical-bug-description
git push origin development
```

**Hotfix Criteria:**
- Application is completely down
- Critical security vulnerability
- Data loss or corruption in progress
- Core functionality broken (like the RLS bug)

**Not a hotfix:**
- UI glitches (wait for normal deployment)
- Minor bugs (add to next release)
- Feature requests (go through normal workflow)

---

## Branch Protection Rules

### `production` Branch Protection

**Required settings in GitHub:**
- ✅ Require pull request before merging
- ✅ Require at least 1 approval
- ✅ Dismiss stale reviews when new commits pushed
- ✅ Require status checks to pass (if CI/CD configured)
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (no one bypasses rules)
- ✅ Restrict who can push (only designated deployers)
- ❌ Allow force pushes: NEVER
- ❌ Allow deletions: NEVER

### `staging` Branch Protection

**Required settings:**
- ✅ Require pull request before merging
- ✅ Require at least 1 approval
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ❌ Allow force pushes: NEVER

### `development` Branch Protection

**Optional settings:**
- Lighter protection for rapid development
- Can allow direct commits for small fixes
- Still recommend PRs for major features

---

## Database Migrations

### Migration Safety Rules

1. **Always reversible:** Every migration must have a rollback script
2. **Test on staging first:** Never run untested migrations on production
3. **Backup first:** Take database snapshot before running migrations
4. **Non-destructive:** Avoid `DROP` commands if possible, use `ALTER` carefully

### Migration Checklist

Before deploying database changes:
- [ ] Migration tested locally
- [ ] Migration tested on staging
- [ ] Rollback script created and tested
- [ ] Database backup scheduled
- [ ] Migration is backward compatible with current code
- [ ] RLS policies tested with actual user roles
- [ ] Performance impact assessed (for large tables)

---

## Rollback Procedures

See [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md) for detailed rollback instructions.

**Quick Rollback:**
```bash
# If deployment just happened and is clearly broken
git checkout production
git revert HEAD
git push origin production
# Auto-deploy triggers, rolling back to previous version
```

---

## Common Pitfalls to Avoid

### ❌ DON'T:
- Push directly to `production`/`main` branch
- Skip testing on staging
- Deploy on Fridays or before important meetings
- Merge without code review
- Deploy database changes without rollback plan
- Deploy when team is unavailable to monitor

### ✅ DO:
- Create feature branches
- Test everything locally first
- Get code reviewed
- Test on staging before production
- Have rollback plan ready
- Monitor deployments closely
- Communicate with team
- Document what you're deploying

---

## Team Responsibilities

### Developers
- Create feature branches from `development`
- Write tests for new features
- Test locally before pushing
- Request code reviews
- Document changes in PR descriptions

### Code Reviewers
- Review code for bugs and security issues
- Verify tests are included
- Check database migrations
- Ensure documentation is updated

### Dan (Product Owner)
- Review features on staging
- Approve production deployments
- Final say on what gets deployed
- Incident escalation point

---

## Version Tracking

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (1.0.0 → 2.0.0)
- **MINOR:** New features (1.0.0 → 1.1.0)
- **PATCH:** Bug fixes (1.0.0 → 1.0.1)

Tag releases in git:
```bash
git tag -a v1.2.0 -m "Release version 1.2.0: Truck inventory system"
git push origin v1.2.0
```

---

## Questions?

If anything is unclear about the deployment process:
1. Check this document first
2. Ask in team Slack channel
3. Escalate to Dan if needed

**When in doubt: Don't deploy. Ask first.**

---

## Document History

- **2026-03-03:** Initial version created after RLS incident
