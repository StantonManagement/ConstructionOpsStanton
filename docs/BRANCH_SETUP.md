# Git Branch Setup & Protection Rules

## Overview

This document provides step-by-step instructions for setting up the three-branch deployment workflow (development, staging, production) and configuring GitHub branch protection rules.

**Last Updated:** March 3, 2026
**Status:** PENDING IMPLEMENTATION

---

## Current State

**Current Branch Structure:**
- `main` - Currently serves as production branch (has protection rules)

**Target Branch Structure:**
- `development` - Active development (replaces direct commits to main)
- `staging` - Pre-production testing environment
- `production` - Live production code (or continue using `main`)

**Decision Needed:** Should we rename `main` to `production`, or keep `main` as production and create the other branches?

**Recommendation:** Keep `main` as production to avoid breaking existing deployment pipelines and links. Create `development` and `staging` branches from `main`.

---

## Pre-Setup Checklist

Before creating branches, ensure:

- [ ] All team members have committed and pushed their current work
- [ ] `main` branch is in a good, stable state
- [ ] No pending pull requests that need to be merged
- [ ] Dan is aware of the branch structure change
- [ ] Team is notified in Slack about the upcoming changes
- [ ] Deployment schedule is clear (no deployments during setup)

---

## Part 1: Creating Git Branches

### Step 1: Ensure Main Branch is Clean

```bash
# Make sure you're on main and it's up to date
git checkout main
git pull origin main

# Verify clean state
git status
# Should show: "Your branch is up to date with 'origin/main'"
# Should show: "nothing to commit, working tree clean"

# View recent history to confirm it's stable
git log --oneline -10
```

### Step 2: Create Development Branch

```bash
# Create development branch from main
git checkout -b development

# Push to remote
git push origin development

# Set upstream tracking
git branch --set-upstream-to=origin/development development

# Verify
git branch -vv
# Should show: * development abc1234 [origin/development] Latest commit message
```

### Step 3: Create Staging Branch

```bash
# Create staging branch from main (not from development)
git checkout main
git checkout -b staging

# Push to remote
git push origin staging

# Set upstream tracking
git branch --set-upstream-to=origin/staging staging

# Verify
git branch -vv
```

### Step 4: Verify All Branches Exist

```bash
# List all branches (local and remote)
git branch -a

# Expected output:
#   development
#   main
# * staging
#   remotes/origin/HEAD -> origin/main
#   remotes/origin/development
#   remotes/origin/main
#   remotes/origin/staging
```

### Step 5: Set Default Branch (Optional)

If you want `development` to be the default branch for new PRs:

1. Go to GitHub repository
2. Click "Settings" tab
3. Click "Branches" in sidebar
4. Under "Default branch", click the pencil/edit icon
5. Select `development` from dropdown
6. Click "Update"
7. Confirm the change

**Recommendation:** Keep `main` as default for now. Team can explicitly select target branch in PRs.

---

## Part 2: Configure Branch Protection Rules

### Production Branch Protection (`main`)

**Purpose:** Prevent accidental pushes to production, require reviews and approvals.

**Setup Steps:**

1. Go to GitHub repository: `https://github.com/[org]/[repo]/settings/branches`
2. Click "Add rule" or edit existing rule for `main`
3. Configure the following settings:

**Branch name pattern:**
```
main
```

**Protection Rules to Enable:**

✅ **Require a pull request before merging**
- Check: "Require a pull request before merging"
- Required number of approvals before merging: **1**
- Check: "Dismiss stale pull request approvals when new commits are pushed"
- Check: "Require review from Code Owners" (if you have CODEOWNERS file)

✅ **Require status checks to pass before merging**
- If you have CI/CD configured (GitHub Actions, etc.), select required checks
- Check: "Require branches to be up to date before merging"

✅ **Require conversation resolution before merging**
- Check this to ensure all PR comments are addressed

✅ **Require signed commits** (Optional but recommended)
- Check if you want to require GPG signed commits

✅ **Require linear history** (Optional)
- Check this if you want to prevent merge commits (forces rebase or squash)

✅ **Include administrators**
- Check: "Do not allow bypassing the above settings"
- This applies rules to everyone, including admins

✅ **Restrict who can push to matching branches** (Optional but recommended)
- Add: Only designated deployers (Dan + lead developer)

✅ **Allow force pushes**
- **Uncheck** - Never allow force pushes to production

✅ **Allow deletions**
- **Uncheck** - Never allow branch deletion

**Lock branch (Optional):**
- Uncheck (we need to allow PRs to be merged)

**Screenshot of key settings:**
```
[x] Require a pull request before merging
    Required approvals: 1
    [x] Dismiss stale reviews
    [x] Require review from Code Owners

[x] Require status checks to pass
    [x] Require branches to be up to date

[x] Require conversation resolution

[x] Include administrators

[ ] Allow force pushes - NEVER CHECK THIS
[ ] Allow deletions - NEVER CHECK THIS
```

4. Click "Create" or "Save changes"

---

### Staging Branch Protection

**Purpose:** Require PR and review, but less strict than production.

**Setup Steps:**

1. Go to GitHub repository settings > Branches
2. Click "Add rule"
3. Configure the following:

**Branch name pattern:**
```
staging
```

**Protection Rules to Enable:**

✅ **Require a pull request before merging**
- Required approvals: **1**
- Check: "Dismiss stale pull request approvals when new commits are pushed"

✅ **Require status checks to pass before merging**
- Select any CI/CD checks
- Check: "Require branches to be up to date before merging"

✅ **Include administrators** (Optional)
- Can leave unchecked for faster emergency fixes to staging

✅ **Allow force pushes**
- **Uncheck** - Don't allow force pushes

✅ **Allow deletions**
- **Uncheck**

4. Click "Create"

---

### Development Branch Protection (Light Protection)

**Purpose:** Minimal protection, allow fast iteration but prevent accidental deletion.

**Setup Steps:**

1. Go to GitHub repository settings > Branches
2. Click "Add rule"
3. Configure the following:

**Branch name pattern:**
```
development
```

**Protection Rules to Enable:**

✅ **Require a pull request before merging** (Optional)
- If checked, require 1 approval
- Good for code quality, but slows down development
- **Recommendation:** Enable this for consistency

✅ **Allow force pushes**
- **Uncheck** for safety

✅ **Allow deletions**
- **Uncheck**

**Less Strict Settings:**
- Don't require status checks (unless you have fast CI)
- Don't require conversation resolution (can be addressed in PR)
- Don't include administrators (allow team leads to push if needed)

4. Click "Create"

---

## Part 3: Configure Auto-Deployment (If Applicable)

If you have automated deployment set up (Vercel, Netlify, custom CI/CD):

### Production Deployment (main branch)

1. Go to your deployment platform
2. Configure production deployment to trigger on `main` branch
3. Set environment variables for production
4. Set deployment protection to require manual approval (if available)

### Staging Deployment (staging branch)

1. Configure staging deployment to trigger on `staging` branch
2. Set environment variables for staging
3. Allow automatic deployment (no manual approval needed)
4. Use staging database and resources

### Development Deployment (Optional)

Most teams don't auto-deploy development. Developers test locally.

If you want auto-deploy for development:
1. Configure to trigger on `development` branch
2. Use development environment variables
3. Use separate development database

---

## Part 4: Update Documentation Links

After creating branches, update references in docs:

### Files to Update:

1. **README.md** - Update deployment workflow section
2. **DEPLOYMENT_WORKFLOW.md** - Confirm branch names match
3. **CONTRIBUTING.md** (if exists) - Update branching instructions

### Update These Sections:

**In README.md:**
```markdown
## Deployment

We use a three-branch workflow:
- `development` - Active development
- `staging` - Pre-production testing
- `main` - Production (auto-deploys to app.example.com)

See [DEPLOYMENT_WORKFLOW.md](./docs/DEPLOYMENT_WORKFLOW.md) for details.
```

**In DEPLOYMENT_WORKFLOW.md:**
Ensure all references say `main` (or `production` if you renamed it).

---

## Part 5: Team Onboarding

### Notify Team of New Workflow

Post in Slack:

```
📢 New Git Branching Workflow Active

We've implemented a three-branch workflow to improve deployment safety:

✅ development - Create feature branches from here
✅ staging - Pre-production testing environment
✅ main - Production (protected, requires approval)

Key Changes:
• Always start new features from `development`
• Never push directly to `staging` or `main`
• All changes go through Pull Requests
• Staging approval required before production

Documentation:
• Workflow: docs/DEPLOYMENT_WORKFLOW.md
• Checklist: docs/DEPLOYMENT_CHECKLIST.md
• Rollback: docs/ROLLBACK_PROCEDURE.md

Questions? Ask in #engineering or check the docs.
```

### Provide Quick Start Guide

**For Developers:**

```bash
# Start new feature
git checkout development
git pull origin development
git checkout -b feature/my-new-feature

# Work on feature...
git add .
git commit -m "feat: add new feature"
git push origin feature/my-new-feature

# Open PR to development on GitHub
# Get review and merge
# Test on staging before production
```

---

## Part 6: Verification

### Test the Workflow

Before considering setup complete, test the entire workflow:

1. **Test Development Branch:**
   ```bash
   git checkout development
   git checkout -b feature/test-branch-protection
   echo "test" > test.txt
   git add test.txt
   git commit -m "test: verify branch protection"
   git push origin feature/test-branch-protection
   ```
   - Open PR to `development`
   - Verify PR can be created
   - Verify PR requires approval (if configured)
   - Merge PR
   - Delete feature branch

2. **Test Staging Branch:**
   - Open PR from `development` to `staging`
   - Verify PR requires approval
   - Get approval and merge
   - Verify auto-deployment triggered (if configured)
   - Test application on staging environment

3. **Test Production Protection:**
   - Try to push directly to `main`:
     ```bash
     git checkout main
     echo "test" >> README.md
     git add README.md
     git commit -m "test: should be blocked"
     git push origin main
     ```
   - Should fail with message: "protected branch hook declined"

   - Open PR from `staging` to `main`
   - Verify requires approval
   - Get Dan's approval
   - Merge
   - Verify production deployment

4. **Test Force Push Protection:**
   ```bash
   git checkout main
   git push origin main --force
   # Should fail
   ```

---

## Common Issues & Troubleshooting

### Issue: "Protected branch hook declined"

**Problem:** Trying to push directly to protected branch.

**Solution:** Create a feature branch and open a PR:
```bash
git checkout development
git checkout -b feature/my-fix
# make changes
git push origin feature/my-fix
# Open PR on GitHub
```

---

### Issue: "Required status checks not found"

**Problem:** Branch protection requires CI checks that don't exist.

**Solution:**
1. Go to GitHub > Settings > Branches
2. Edit branch protection rule
3. Uncheck "Require status checks to pass" OR
4. Remove the specific required check
5. Save changes

---

### Issue: Can't merge because "branch is out of date"

**Problem:** Protection rule requires branch to be up to date.

**Solution:**
```bash
# Update your feature branch with latest from target
git checkout feature/my-branch
git pull origin development  # Or staging/main depending on target
# Resolve conflicts if any
git push origin feature/my-branch
# Now you can merge PR
```

---

### Issue: Need to make emergency fix but PR requires approval

**Problem:** Dan is unavailable and production is broken.

**Solution:**
1. Check if "Include administrators" is enabled
2. If yes, admin can override (use sparingly)
3. If no, bypass protection for emergency:
   - GitHub Settings > Branches
   - Temporarily disable protection
   - Make fix
   - Re-enable protection
   - Document in incident report

**Better Solution:** Always have backup approvers configured.

---

## Branch Protection Rules Summary

Quick reference for all branches:

| Setting | main (production) | staging | development |
|---------|------------------|---------|-------------|
| Require PR | ✅ Yes | ✅ Yes | ✅ Yes (recommended) |
| Required approvals | 1+ | 1 | 1 |
| Require status checks | ✅ Yes (if CI) | ✅ Yes (if CI) | ❌ No |
| Dismiss stale reviews | ✅ Yes | ✅ Yes | ❌ No |
| Require up to date | ✅ Yes | ✅ Yes | ❌ No |
| Require conversation resolution | ✅ Yes | ❌ No | ❌ No |
| Include administrators | ✅ Yes | ❌ No | ❌ No |
| Allow force pushes | ❌ NEVER | ❌ No | ❌ No |
| Allow deletions | ❌ NEVER | ❌ No | ❌ No |
| Auto-deploy | ✅ Yes (with approval) | ✅ Yes (automatic) | ❌ No |

---

## CODEOWNERS File (Optional)

Create a `.github/CODEOWNERS` file to auto-assign reviewers:

```
# CODEOWNERS
# Lines starting with '#' are comments.
# Each line is a file pattern followed by one or more owners.

# Default owners for everything in the repo
* @dan @lead-developer

# Database migrations require extra review
/migrations/ @dan @database-admin

# API changes require backend team review
/src/app/api/ @backend-team

# Deployment docs require DevOps review
/docs/DEPLOYMENT*.md @dan @devops-lead
```

---

## Migration Strategy

### Conservative Approach (Recommended)

**Week 1: Setup and Testing**
- Create `development` and `staging` branches
- Configure branch protection
- Test workflow with small changes
- Update documentation

**Week 2: Team Training**
- Train team on new workflow
- Update all feature branches to target `development`
- Practice PR workflow

**Week 3: First Staging Deployment**
- Merge accumulated changes from `development` to `staging`
- Test thoroughly on staging environment
- Get Dan's approval

**Week 4: First Production Deployment**
- Deploy from `staging` to `main` (production)
- Monitor closely
- Verify workflow is smooth

### Fast Approach (If Urgent)

**Day 1:**
- Create branches
- Configure protection
- Notify team

**Day 2:**
- Test workflow
- First deployment through new process

**Risk:** Less time for team to adapt, higher chance of mistakes.

---

## Rollback Plan for Branch Setup

If the new branch structure causes problems:

1. **Revert to old workflow temporarily**
   - Remove branch protection from `development` and `staging`
   - Allow direct commits to `main` again (remove protection temporarily)

2. **Fix issues**
   - Address whatever went wrong
   - Update documentation
   - Train team on missing knowledge

3. **Re-enable protection**
   - Once issues resolved, re-enable branch protection
   - Continue with new workflow

---

## Success Criteria

Branch setup is complete when:

- [ ] All three branches exist in GitHub
- [ ] Branch protection rules configured for all branches
- [ ] Auto-deployment configured (if applicable)
- [ ] Team notified and trained
- [ ] Documentation updated
- [ ] Workflow tested successfully
- [ ] First PR merged through each branch
- [ ] First deployment successful through new workflow
- [ ] No direct pushes possible to `main`
- [ ] Dan and team are comfortable with new process

---

## Document History

- **2026-03-03:** Initial version created

## Related Documents

- [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md) - Full deployment workflow
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment checklists
- [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md) - Rollback procedures
- [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) - Incident response plan
