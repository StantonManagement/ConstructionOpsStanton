# Deployment Checklist

Use this checklist for every production deployment. Copy the relevant section and paste into your deployment PR or tracking issue.

---

## Pre-Deployment Checklist

**Date:** _____________
**Deployer:** _____________
**Release Version:** _____________

### Code Ready
- [ ] All code merged to `staging` branch
- [ ] All PRs have been code reviewed and approved
- [ ] Build passes with 0 errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All new features tested locally
- [ ] Git tags created for version

### Testing Complete
- [ ] Feature tested on local development
- [ ] Feature tested on staging environment
- [ ] Dan has reviewed and approved features on staging
- [ ] No critical bugs reported on staging
- [ ] Edge cases tested
- [ ] Mobile responsiveness verified (if UI changes)
- [ ] Cross-browser testing done (if UI changes)

### Database Ready
- [ ] Database migrations tested on staging
- [ ] Migrations are reversible
- [ ] Rollback scripts created and tested
- [ ] RLS policies tested with actual user roles
- [ ] No destructive operations (DROP, TRUNCATE)
- [ ] Performance impact assessed
- [ ] Database backup scheduled before deployment

### Documentation
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if needed)
- [ ] API documentation updated (if API changes)
- [ ] User-facing documentation updated
- [ ] Deployment notes written in PR description

### Communication
- [ ] Dan notified 24 hours in advance
- [ ] Team notified in Slack
- [ ] Deployment time scheduled (Tue-Thu, 10 AM-2 PM EST preferred)
- [ ] Team available to monitor deployment
- [ ] No important meetings or demos scheduled immediately after

### Rollback Plan
- [ ] Rollback procedure documented
- [ ] Previous version tag identified
- [ ] Rollback tested on staging (if major changes)
- [ ] Team knows how to execute rollback
- [ ] Database rollback scripts ready (if migrations)

---

## Deployment Execution Checklist

### Step 1: Final Checks
- [ ] Verify staging is stable (no errors in last 24 hours)
- [ ] Verify PR from `staging` to `production` is ready
- [ ] All required approvals obtained
- [ ] All checks passing

### Step 2: Backup
- [ ] Database snapshot taken
- [ ] Previous deployment tag noted: ______________
- [ ] Environment variables backed up

### Step 3: Deploy
- [ ] PR merged to `production` branch
- [ ] Auto-deployment triggered
- [ ] Deployment logs monitored - NO ERRORS
- [ ] Deployment completed successfully

### Step 4: Immediate Verification (Within 5 minutes)
- [ ] Application loads: https://app.example.com
- [ ] Homepage renders correctly
- [ ] Login works
- [ ] No JavaScript errors in console
- [ ] No 500 errors in server logs

### Step 5: Functionality Testing (Within 15 minutes)
- [ ] **Critical workflows work:**
  - [ ] User can create new project
  - [ ] User can assign contractors to projects
  - [ ] User can create payment applications
  - [ ] User can create/view daily logs
  - [ ] User can access contractors page
  - [ ] User can access inventory (if applicable)
- [ ] **Database changes applied:**
  - [ ] Migrations ran successfully
  - [ ] New tables exist (if added)
  - [ ] RLS policies active
- [ ] **New features work:**
  - [ ] [List new feature 1]
  - [ ] [List new feature 2]
  - [ ] [List new feature 3]

### Step 6: Monitoring (First hour)
- [ ] No error spikes in logs
- [ ] No user reports of issues
- [ ] Performance metrics normal
- [ ] Database connections stable
- [ ] Memory usage normal

---

## Post-Deployment Checklist

### Communication
- [ ] Posted deployment success in Slack
- [ ] Dan notified of completion
- [ ] Team given all-clear
- [ ] Users notified (if user-facing changes)

### Documentation
- [ ] Git tag created: `v_______________`
- [ ] Release notes published
- [ ] CHANGELOG.md updated with release date
- [ ] Deployment documented in team wiki/notes

### Cleanup
- [ ] Feature branches deleted
- [ ] `development` and `staging` synced with `production`
- [ ] Old backups cleaned up (keep last 5)

### Follow-up
- [ ] Monitor application for 24 hours
- [ ] Review any issues reported
- [ ] Schedule retrospective if any issues occurred

---

## Rollback Checklist

**If deployment fails or critical issues found:**

### Immediate Actions
- [ ] **STOP** - Don't make more changes
- [ ] Notify Dan immediately: "Production deployment has issues"
- [ ] Post in Slack: "@channel Production rollback in progress"
- [ ] Follow [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md)

### Rollback Steps
- [ ] Identify issue severity (Can it wait? Or rollback now?)
- [ ] Execute git revert or redeploy previous version
- [ ] Verify rollback successful
- [ ] Test critical workflows post-rollback
- [ ] Rollback database migrations (if applicable)

### Post-Rollback
- [ ] Document what went wrong
- [ ] Create incident report
- [ ] Schedule fix
- [ ] Update team on timeline

---

## Hotfix Deployment Checklist

**For critical production bugs requiring immediate fix:**

### Pre-Hotfix
- [ ] Severity confirmed (Is this really a hotfix?)
- [ ] Dan aware and approved emergency deployment
- [ ] Team available to assist

### Hotfix Execution
- [ ] Hotfix branch created from `production`
- [ ] Minimal fix implemented
- [ ] Tested locally
- [ ] PR created to `production`
- [ ] Emergency approval obtained
- [ ] Hotfix deployed
- [ ] Issue verified fixed

### Post-Hotfix
- [ ] Hotfix merged back to `staging`
- [ ] Hotfix merged back to `development`
- [ ] Root cause analysis scheduled
- [ ] Process improvements identified

---

## Deployment Templates

### GitHub PR Template for Production Deployment

```markdown
## Production Deployment - [Date] - v[X.Y.Z]

### Features/Fixes Included
- Feature 1: Description
- Feature 2: Description
- Fix 1: Description

### Database Changes
- [ ] No database changes
- [ ] Migrations included (list below):
  - Migration 1: Description
  - Migration 2: Description

### Testing Performed
- [x] Tested on local development
- [x] Tested on staging environment
- [x] Dan reviewed and approved on staging
- [x] No critical bugs found

### Rollback Plan
- Previous version: v[X.Y.Z-1]
- Rollback command: `git revert [commit-hash]`
- Database rollback: [Script name or "N/A"]

### Deployment Window
- Scheduled for: [Day, Date, Time EST]
- Deployer: [Name]
- Monitor team: [Names]

### Risks
- [ ] Low risk (minor changes, well tested)
- [ ] Medium risk (significant changes, tested on staging)
- [ ] High risk (major changes, database migrations)

### Pre-Deployment Checklist
- [ ] All items from DEPLOYMENT_CHECKLIST.md completed
- [ ] Dan approved
- [ ] Team notified

### Approvals Required
- [ ] Code review approval
- [ ] Dan's approval (comment below)
```

### Slack Deployment Announcement Template

```
🚀 Production Deployment Scheduled

Version: v1.2.0
Date/Time: Thursday, March 7, 2026 at 11:00 AM EST
Deployer: @AlexDev
Expected duration: 15 minutes

What's being deployed:
• Truck inventory management system
• Contractor search improvements
• Bug fix: RLS policies for project creation

All testing complete ✅
Dan approved ✅
Rollback plan ready ✅

Will monitor for 1 hour post-deployment.
```

### Post-Deployment Success Message

```
✅ Production Deployment Successful

Version: v1.2.0
Deployed at: 11:05 AM EST
Duration: 12 minutes

All systems operational ✅
Critical workflows tested ✅
No errors detected ✅

New features live:
• Truck inventory management at /trucks and /inventory
• Improved contractor search
• Fixed project creation RLS bug

Monitoring for next hour. Please report any issues immediately.
```

---

## Emergency Contact List

If deployment issues occur:

1. **Dan (Product Owner):** [Contact info]
2. **Lead Developer:** [Contact info]
3. **DevOps/Infrastructure:** [Contact info]
4. **Database Admin:** [Contact info]

**Escalation:**
- Minor issue: Post in Slack, continue monitoring
- Major issue: Call Dan, initiate rollback
- Critical/down: Call entire team, emergency response

---

## Checklist Version History

- **2026-03-03:** Initial version created
