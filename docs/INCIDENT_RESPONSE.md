# Incident Response Plan

## Overview

This document outlines the incident response procedures for production issues with the Construction Ops application. The goal is to restore service quickly, communicate effectively, and learn from incidents to prevent future occurrences.

**Last Updated:** March 3, 2026
**Status:** ACTIVE - Follow these procedures for all production incidents

---

## Incident Severity Levels

### P0 - Critical (Respond Immediately)

**Definition:** Production is completely down or critical data loss is occurring.

**Examples:**
- Application completely inaccessible (500 errors, timeouts)
- Database connection failures affecting all users
- Authentication completely broken - no one can log in
- Active data corruption in progress
- Security breach or vulnerability actively exploited

**Response Time:** Immediate (< 5 minutes)
**Escalation:** Call Dan + entire dev team immediately
**Communication:** Post in Slack every 10 minutes with status updates

---

### P1 - High (Respond Within 15 Minutes)

**Definition:** Core functionality broken, significant user impact.

**Examples:**
- Users cannot create projects
- Users cannot assign contractors to budget lines
- Payment applications not working
- Daily logs completely broken
- RLS policies blocking legitimate access

**Response Time:** < 15 minutes
**Escalation:** Notify Dan, post in Slack
**Communication:** Status updates every 30 minutes

---

### P2 - Medium (Respond Within 1 Hour)

**Definition:** Important features broken, but workarounds exist.

**Examples:**
- Search functionality broken
- Reports failing to generate
- Email notifications not sending
- Performance degradation (slow but usable)
- Non-critical UI features broken

**Response Time:** < 1 hour during business hours
**Escalation:** Post in Slack, notify Dan during business hours
**Communication:** Status update when identified, and when resolved

---

### P3 - Low (Respond Within 24 Hours)

**Definition:** Minor issues with minimal user impact.

**Examples:**
- Cosmetic UI glitches
- Typos in text
- Minor styling issues
- Edge case bugs with simple workarounds
- Non-urgent feature requests

**Response Time:** < 24 hours
**Escalation:** Create GitHub issue, mention in daily standup
**Communication:** Not urgent, can be batched in regular updates

---

## Incident Response Workflow

### Phase 1: Detection & Initial Response (0-5 minutes)

**1. Incident Detected**

How incidents are detected:
- User reports issue to Dan
- Error monitoring alerts (if configured)
- Team member discovers issue
- Failed deployment noticed

**2. Assess Severity**

- Determine severity level (P0-P3)
- How many users affected?
- What functionality is broken?
- Is data being corrupted?
- Can users work around it?

**3. Initial Communication**

**For P0/P1 - Post in Slack Immediately:**
```
🚨 PRODUCTION INCIDENT - P0

Issue: Application completely down - 500 errors
Detected: 2:15 PM EST
Impact: All users unable to access application
Status: Investigating

Response team assembling. Updates every 10 minutes.
```

**For P2/P3:**
```
⚠️ Production Issue - P2

Issue: Search functionality not working
Impact: Users can manually browse instead
Status: Investigating
ETA: 1 hour
```

---

### Phase 2: Triage & Diagnosis (5-15 minutes)

**1. Gather Information**

- [ ] What changed recently? (Check recent deployments)
- [ ] When did it start? (Exact time if possible)
- [ ] Is it affecting all users or specific users/roles?
- [ ] Any error messages in logs?
- [ ] Database connection status?
- [ ] Server resource usage (CPU, memory, disk)?

**2. Check Recent Changes**

```bash
# View recent production commits
git log production --oneline -10

# Check deployment logs
# Review what was deployed in last 24 hours
```

**3. Review Error Logs**

```bash
# Check application logs for errors
# Look for patterns, stack traces
# Identify error frequency and timing
```

**4. Test Reproduction**

- Can you reproduce the issue?
- What are the exact steps to trigger it?
- Is it consistent or intermittent?

---

### Phase 3: Containment & Mitigation (15-30 minutes)

**Decision: Rollback or Fix Forward?**

**Choose Rollback if:**
- Issue is widespread (all users affected)
- Data corruption is occurring
- Cause is unclear and needs investigation
- Quick fix is not obvious
- Severity is P0 or P1

**Choose Fix Forward if:**
- Issue is isolated (specific feature or users)
- Root cause is clear and fix is simple
- Hotfix can be deployed faster than rollback
- Severity is P2 or P3
- Recent deployment is working except for one small issue

**Execute Chosen Strategy:**

**If Rollback:** Follow [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md)

**If Fix Forward:**
1. Create hotfix branch from production
2. Implement minimal fix
3. Test locally
4. Deploy hotfix (requires Dan approval for P0/P1)
5. Verify fix resolves issue
6. Merge hotfix back to staging and development

---

### Phase 4: Resolution & Verification (30-60 minutes)

**1. Verify Fix**

- [ ] Application loads successfully
- [ ] Login works
- [ ] Broken functionality now works
- [ ] No new errors in logs
- [ ] Performance is normal

**2. Test Critical Workflows**

- [ ] Create new project
- [ ] Assign contractors to budget lines
- [ ] Create payment application
- [ ] View/create daily logs
- [ ] Navigate to key pages (contractors, payments, projects)

**3. Monitor for Stability**

- Watch for 30-60 minutes
- Check error rates
- Monitor user activity
- Verify no new issues introduced

**4. Communication - Resolution**

```
✅ INCIDENT RESOLVED - P0

Issue: Application completely down
Resolved: 2:45 PM EST
Duration: 30 minutes
Resolution: Rolled back to v1.2.0

Root Cause: Database migration error
Impact: All users unable to access app for 30 min

Application is now stable and fully operational.
Monitoring for next hour. Please report any issues.

Post-mortem scheduled for tomorrow 10 AM.
```

---

### Phase 5: Post-Incident Review (24-48 hours after resolution)

**1. Create Incident Report**

Use the template below to document the incident.

**2. Schedule Post-Mortem Meeting**

- **Who:** Dan, dev team, anyone involved in response
- **When:** Within 24-48 hours of resolution
- **Duration:** 30-60 minutes
- **Goal:** Learn and improve, not blame

**3. Conduct Post-Mortem**

Discussion topics:
- Timeline of events
- What went well?
- What could be improved?
- Why didn't we catch this before production?
- How do we prevent this in the future?

**4. Create Action Items**

Based on post-mortem, create specific action items:
- Process improvements
- Better testing procedures
- Monitoring/alerting enhancements
- Documentation updates
- Code improvements

**5. Update Procedures**

- Update DEPLOYMENT_WORKFLOW.md if needed
- Update ROLLBACK_PROCEDURE.md if needed
- Update this document if needed
- Share learnings with team

---

## Incident Report Template

Copy this template for every P0/P1 incident:

```markdown
# Incident Report: [Brief Description]

**Date:** YYYY-MM-DD
**Incident ID:** INC-YYYYMMDD-001
**Severity:** P0 / P1 / P2
**Status:** Resolved / Investigating / Monitoring

## Summary

[2-3 sentence summary of what happened]

## Impact

- **Users Affected:** [All users / Specific role / Number of users]
- **Duration:** [Start time - End time] ([Total duration])
- **Functionality Affected:** [List broken features]
- **Data Loss:** [Yes/No - If yes, describe]

## Timeline

| Time (EST) | Event |
|------------|-------|
| 2:15 PM | Deployment to production completed |
| 2:17 PM | First user report of 500 errors |
| 2:20 PM | Incident declared P0, team notified |
| 2:25 PM | Root cause identified: database migration error |
| 2:30 PM | Decision made to rollback |
| 2:35 PM | Rollback initiated |
| 2:42 PM | Rollback completed |
| 2:45 PM | Verification complete, incident resolved |
| 3:45 PM | Monitoring period ended, all clear |

## Root Cause

[Detailed technical explanation of what went wrong and why]

Example:
```
The database migration in commit abc1234 added a new RLS policy to the
projects table. However, the policy had incorrect logic that blocked all
INSERT operations, including those by authenticated users. This was not
caught in testing because:
1. Local development doesn't have RLS enabled
2. Staging environment wasn't tested after deployment
3. The migration was deployed during a live demo
```

## Detection

[How was the incident detected?]
- User report
- Monitoring alert
- Failed deployment
- Team member noticed

## Response Actions Taken

1. [Action 1 - with time]
2. [Action 2 - with time]
3. [Action 3 - with time]

## Resolution

[How was the issue resolved?]
- Rollback to v1.2.0
- Hotfix deployed
- Configuration change
- etc.

## What Went Well

- Quick detection (2 minutes after deployment)
- Clear communication in Slack
- Fast rollback execution (15 minutes)
- Team availability and response

## What Could Be Improved

- Should have tested on staging before production
- Database migration should have had rollback script ready
- Could have used better RLS policy testing procedures
- Should not deploy during live demos

## Action Items

- [ ] Create RLS testing procedures (Owner: @developer, Due: 2026-03-10)
- [ ] Require staging approval before production (Owner: @dan, Due: 2026-03-08)
- [ ] Add pre-deployment checklist enforcement (Owner: @lead, Due: 2026-03-15)
- [ ] Schedule deployment training session (Owner: @dan, Due: 2026-03-12)

## Prevention Measures

To prevent this specific issue from happening again:
1. Always test RLS policies with actual user roles on staging
2. Never deploy during important meetings or demos
3. Always create and test rollback scripts for database migrations
4. Require Dan's approval on staging before production deployment

## Related Documents

- [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md)
- [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md)
- [GitHub Issue #123](https://github.com/org/repo/issues/123)

---

**Incident Owner:** [Name]
**Report Created:** YYYY-MM-DD
**Post-Mortem Date:** YYYY-MM-DD
```

---

## Communication Templates

### P0 - Initial Alert

```
🚨 PRODUCTION INCIDENT - P0

Issue: [Brief description]
Detected: [Time]
Impact: [Who/what affected]
Status: Investigating

Response team assembling.
Updates every 10 minutes.

DO NOT:
- Push any code
- Merge any PRs
- Make any changes to production
```

### P0 - Status Update (Every 10 minutes)

```
🔄 P0 UPDATE - [Time]

Current Status: [Investigating / Fixing / Rolling Back / Testing]
Progress: [What we've learned / What we're doing]
ETA: [Estimated resolution time]

Next update in 10 minutes.
```

### P0 - Resolution

```
✅ P0 RESOLVED - [Time]

Issue: [Brief description]
Duration: [Total time]
Resolution: [What we did]
Impact: [Summary of impact]

Application is stable. Monitoring for 1 hour.
Normal operations can resume.

Post-mortem scheduled: [Date/Time]
```

### P1 - Initial Alert

```
⚠️ PRODUCTION INCIDENT - P1

Issue: [Brief description]
Impact: [What's broken]
Status: [Investigating / Working on fix]
ETA: [Estimated time to fix]

Will update in 30 minutes or when resolved.
```

### P2/P3 - Issue Notice

```
ℹ️ Production Issue - P2

Issue: [Description]
Impact: [What's affected]
Workaround: [If available]
ETA for fix: [Estimate]

Not urgent, being tracked in [GitHub issue #123]
```

---

## Escalation Matrix

### P0 - Critical

1. **Immediate (< 5 min):**
   - Post in Slack #engineering (mention @channel)
   - Call Dan directly
   - Call lead developer

2. **If no response in 5 min:**
   - Call all team members
   - Escalate to backup contacts

3. **If still no response in 10 min:**
   - Make best judgment call
   - Execute emergency rollback if safe
   - Document all actions taken

### P1 - High

1. **Within 15 min:**
   - Post in Slack #engineering
   - Notify Dan (Slack or phone)
   - Notify available developers

2. **If no response in 30 min:**
   - Call Dan
   - Proceed with fix/rollback if confident

### P2 - Medium

1. **Within 1 hour:**
   - Post in Slack
   - Notify Dan during business hours
   - Create GitHub issue

2. **No urgent escalation needed**

### P3 - Low

1. **Within 24 hours:**
   - Create GitHub issue
   - Mention in daily standup
   - Add to sprint backlog

---

## On-Call Responsibilities

### Primary On-Call (Rotation TBD)

**Responsibilities:**
- Monitor Slack for production alerts
- Respond to P0/P1 incidents immediately
- Coordinate incident response
- Execute rollbacks if needed
- Communicate status updates
- Create incident reports

**Response Times:**
- P0: < 5 minutes
- P1: < 15 minutes
- P2: < 1 hour (business hours)
- P3: Next business day

### Backup On-Call

**Responsibilities:**
- Be available if primary doesn't respond
- Step in after escalation timeframe
- Support primary during incidents

---

## Emergency Contacts

**During Production Incidents:**

1. **Dan (Product Owner & Escalation)**
   - Slack: @dan
   - Phone: [Contact info]
   - Availability: Mon-Fri 8 AM - 6 PM EST, some weekend availability

2. **Lead Developer**
   - Slack: @lead
   - Phone: [Contact info]
   - Availability: [Schedule]

3. **Development Team**
   - Slack: @channel in #engineering
   - Individual contacts: [List]

4. **Database Admin / DevOps**
   - Contact: [If different from above]
   - For database emergencies

**Escalation Order for P0:**
1. Post in Slack @channel
2. Call Dan (wait 5 min max)
3. Call lead developer (wait 5 min max)
4. Call any available team member
5. Execute emergency rollback if safe to do so

---

## Incident Prevention

### Proactive Measures

**Before Deployment:**
- [ ] Follow DEPLOYMENT_WORKFLOW.md strictly
- [ ] Test on staging environment
- [ ] Get Dan's approval
- [ ] Review DEPLOYMENT_CHECKLIST.md
- [ ] Have rollback plan ready
- [ ] Deploy during safe hours (Tue-Thu, 10 AM-2 PM)
- [ ] Never deploy before important meetings/demos

**Monitoring:**
- Set up error rate monitoring (future enhancement)
- Configure uptime monitoring (future enhancement)
- Enable database connection monitoring
- Set up Slack alerts for critical errors

**Testing:**
- Test RLS policies with actual user roles
- Test database migrations on staging first
- Run full build locally before pushing
- Test critical workflows after every deployment

---

## Post-Incident Learning

### Incident Review Meeting Agenda

**1. Timeline Review (10 min)**
- Walk through timeline of events
- No blame, just facts

**2. What Went Well (5 min)**
- What did we do right?
- What helped us respond quickly?

**3. What Could Be Improved (15 min)**
- What slowed us down?
- What could we have done differently?
- What warning signs did we miss?

**4. Root Cause Analysis (10 min)**
- Why did this happen?
- Why didn't we catch it earlier?
- What process failed?

**5. Action Items (10 min)**
- Specific, actionable improvements
- Assign owners and due dates
- Add to sprint backlog

**6. Documentation (5 min)**
- Update procedures if needed
- Share learnings with team

### Blameless Culture

**Remember:**
- Focus on systems and processes, not individuals
- Assume good intentions
- Ask "why did the process allow this?" not "who did this?"
- Celebrate good incident response
- Learn and improve continuously

**Good Questions:**
- "What process could have prevented this?"
- "How can we make this safer?"
- "What early warning signs could we monitor?"

**Avoid:**
- "Who deployed this?"
- "Why didn't you test it?"
- "This never should have happened"

---

## Metrics to Track

**Incident Metrics:**
- Number of incidents per month (by severity)
- Mean Time To Detect (MTTD)
- Mean Time To Resolve (MTTR)
- Number of rollbacks
- Percentage of incidents caught in staging vs production

**Goal Metrics:**
- P0 incidents: 0 per quarter
- P1 incidents: < 2 per quarter
- MTTR for P0: < 30 minutes
- MTTR for P1: < 2 hours
- 100% of database changes tested on staging first

---

## Incident Log

Track all P0/P1 incidents here:

| Date | ID | Severity | Issue | Duration | Resolution | Post-Mortem |
|------|--------|----------|-------|----------|------------|-------------|
| 2026-02-27 | INC-001 | P1 | RLS bug broke project creation | 2 hours | Fixed via hotfix | [Link] |
| | | | | | | |

---

## Quick Reference - Response Checklist

**Print this and keep it visible:**

```
PRODUCTION INCIDENT RESPONSE

□ DETECT
  └─ Assess severity (P0/P1/P2/P3)

□ COMMUNICATE (P0/P1 only)
  ├─ Post in Slack: "@channel INCIDENT - [Severity]"
  └─ Notify Dan

□ INVESTIGATE
  ├─ What changed recently?
  ├─ Check error logs
  ├─ When did it start?
  └─ How many users affected?

□ DECIDE
  ├─ Rollback? (if widespread, data corruption, unclear cause)
  └─ Fix forward? (if isolated, clear fix, quick)

□ EXECUTE
  ├─ Follow ROLLBACK_PROCEDURE.md OR
  └─ Deploy hotfix

□ VERIFY
  ├─ Application loads
  ├─ Broken feature works
  ├─ No new errors
  └─ Monitor 30-60 min

□ COMMUNICATE RESOLUTION
  └─ Post in Slack: "✅ RESOLVED"

□ POST-MORTEM (within 24-48 hours)
  ├─ Create incident report
  ├─ Schedule review meeting
  ├─ Create action items
  └─ Update procedures
```

---

## Document History

- **2026-03-03:** Initial version created

## Related Documents

- [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md) - Deployment procedures
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- [ROLLBACK_PROCEDURE.md](./ROLLBACK_PROCEDURE.md) - How to rollback deployments
