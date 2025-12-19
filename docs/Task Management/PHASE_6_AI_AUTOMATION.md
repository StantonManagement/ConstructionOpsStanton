# PRP: Phase 6 — AI & Automation

> Product Requirements Prompt for Windsurf
> Requires Phases 1-5 complete. Read `TASK_MANAGEMENT_INITIAL.md` for business context.

---

## OBJECTIVE

Add intelligent automation to reduce manual work. By the end of this phase:
- AI analyzes verification photos for quality/completion confidence
- Tasks auto-schedule based on dependencies
- Contractors receive SMS updates when tasks are assigned/unblocked

---

## CONTEXT TO LOAD

| File | Why |
|------|-----|
| `Construction_Invoice_Processing_System__AI-Assisted_Classification_Framework.md` | AI patterns we've used |
| `src/lib/twilio/` | Existing Twilio SMS setup |
| `Supplementary_Implementation_Notes__Construction_Invoice_AI_System.md` | AI implementation notes |

---

## FEATURE 1: AI PHOTO VERIFICATION

### The Problem
Dean verifies 50+ tasks per day. Some verification photos are:
- Blurry or dark (should retake)
- Showing incomplete work (shouldn't verify)
- Showing wrong area (mismatched)

### The Solution
AI reviews photo before allowing verification, providing:
- Confidence score (0-100)
- Assessment: "Photo shows completed flooring installation"
- Flag low-confidence for human review

### Implementation Approach

**When:** After photo is captured, before task is marked verified

**AI Provider:** Anthropic Claude (vision capability)

**Prompt strategy:**
```
You are reviewing a construction verification photo.
Task: {task.name}
Description: {task.description}
Location: {location.name}

Analyze this photo and determine:
1. Is the photo clear enough to verify work? (not blurry, well-lit)
2. Does the photo show the type of work described?
3. Does the work appear complete?

Respond with JSON:
{
  "confidence": 0-100,
  "is_clear": boolean,
  "shows_correct_work": boolean,
  "appears_complete": boolean,
  "assessment": "Brief explanation"
}
```

### API Endpoint: `src/app/api/ai/analyze-photo/route.ts`

| Method | Body | Purpose |
|--------|------|---------|
| POST | `{ image_base64, task_id }` | Analyze verification photo |

**Returns:**
```json
{
  "confidence": 85,
  "is_clear": true,
  "shows_correct_work": true,
  "appears_complete": true,
  "assessment": "Photo clearly shows completed LVP flooring installation with proper transitions at doorways.",
  "recommendation": "approve"  // or "review" or "retake"
}
```

**Recommendation logic:**
- confidence >= 80 → "approve"
- confidence 50-79 → "review" (show warning, allow override)
- confidence < 50 → "retake" (require new photo)

### UI Changes

**Photo Verification Modal (update):**
1. User takes photo
2. Show loading: "AI is reviewing..."
3. Display result:
   - High confidence: Green check, "Looks good!" → Confirm button
   - Medium confidence: Yellow warning, assessment text → "Verify Anyway" + "Retake"
   - Low confidence: Red warning, "Photo may not be sufficient" → "Retake" only

### Database: Track AI Analysis

Add columns to `tasks` table:
- `ai_confidence` — INTEGER (nullable)
- `ai_assessment` — TEXT (nullable)
- `ai_analyzed_at` — TIMESTAMPTZ (nullable)

---

## FEATURE 2: AUTO-SCHEDULING

### The Problem
Tasks have dependencies (can't install flooring until demo is done). Manually tracking these is error-prone.

### The Solution
When a task is verified, auto-schedule dependent tasks.

### Database: Task Dependencies

**New table: `task_dependencies`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `task_id` | UUID | FK to tasks (the dependent task) |
| `depends_on_task_id` | UUID | FK to tasks (the prerequisite) |
| `created_at` | TIMESTAMPTZ | |

**Constraint:** No circular dependencies (check on insert)

### Auto-Schedule Logic

**Trigger:** When task status changes to `verified`

**Logic:**
1. Find all tasks that depend on this task
2. For each dependent task:
   - If it has no other unverified dependencies
   - AND it has no `scheduled_start` set
   - THEN set `scheduled_start` = verified task's `verified_at` + 1 day
3. Log the auto-schedule action

### API Endpoints

**Dependencies CRUD:** `src/app/api/tasks/[id]/dependencies/route.ts`

| Method | Body/Query | Purpose |
|--------|------------|---------|
| GET | | List dependencies for task |
| POST | `{ depends_on_task_id }` | Add dependency |
| DELETE | `?depends_on_task_id=xxx` | Remove dependency |

**Validation:**
- Cannot depend on task in different location (for now)
- Cannot create circular dependency

### Template Enhancement

Add dependencies to `template_tasks`:

| Column | Type | Notes |
|--------|------|-------|
| `depends_on_sort_order` | INTEGER | Sort order of prerequisite task in same template (nullable) |

When template is applied:
- Create tasks with dependencies based on `depends_on_sort_order`
- Maps to actual task IDs in the created tasks

---

## FEATURE 3: SMS NOTIFICATIONS

### The Problem
Contractors don't use the app. They need to know when:
- A new task is assigned to them
- A blocked task is now ready
- Verification failed and rework is needed

### The Solution
Automated SMS via Twilio (already configured).

### SMS Triggers

| Trigger | Template |
|---------|----------|
| Task assigned | "New task assigned: {task.name} at {location.name}. Questions? Reply to this message." |
| Task unblocked | "Task ready: {task.name} at {location.name} is now unblocked and ready to start." |
| Verification failed | "Rework needed: {task.name} at {location.name}. PM notes: {notes}" |
| Task due tomorrow | "Reminder: {task.name} at {location.name} is scheduled to start tomorrow." |

### Implementation

**SMS Service:** `src/lib/sms/taskNotifications.ts`

Functions:
- `sendTaskAssignedSMS(task, contractor)`
- `sendTaskUnblockedSMS(task, contractor)`
- `sendReworkNeededSMS(task, contractor, notes)`
- `sendTaskReminderSMS(task, contractor)`

**Requirements:**
- Contractor must have `phone` field populated
- Use existing Twilio configuration
- Log all sent messages
- Handle send failures gracefully (don't block task updates)

### API Integration

Modify existing task update endpoints to trigger SMS:

**Task assignment change:**
- Old contractor (if any): no notification
- New contractor: send "Task assigned" SMS

**Location unblocked:**
- Find all in_progress tasks for location
- Send "Task unblocked" SMS to each assigned contractor

**Verification rejected (new feature):**
- Add `reject` action to verification flow
- Sets status back to `in_progress`
- Adds rejection notes
- Sends "Rework needed" SMS

### Database: SMS Log

**New table: `sms_log`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `task_id` | UUID | FK to tasks (nullable) |
| `contractor_id` | UUID | FK to contractors |
| `phone_number` | VARCHAR(20) | |
| `message_type` | VARCHAR(50) | 'task_assigned', 'task_unblocked', etc. |
| `message_body` | TEXT | |
| `twilio_sid` | VARCHAR(50) | Twilio message SID |
| `status` | VARCHAR(20) | 'sent', 'delivered', 'failed' |
| `sent_at` | TIMESTAMPTZ | |
| `error_message` | TEXT | If failed |

### Scheduled Job: Daily Reminders

**Cron job:** Run daily at 7am local time

**Logic:**
1. Find tasks where `scheduled_start` = tomorrow
2. Task status is `not_started` or `in_progress`
3. Task has assigned contractor with phone
4. Send reminder SMS

**Implementation:** Use existing Railway cron or create Next.js API route called by external cron

---

## REACT QUERY HOOKS TO CREATE

### `useAI.ts`
| Hook | Purpose |
|------|---------|
| `useAnalyzePhoto()` | Submit photo for AI analysis |

### `useTaskDependencies.ts`
| Hook | Purpose |
|------|---------|
| `useTaskDependencies(taskId)` | Get dependencies for task |
| `useAddDependency()` | Add dependency |
| `useRemoveDependency()` | Remove dependency |

### `useSMS.ts` (optional, for viewing logs)
| Hook | Purpose |
|------|---------|
| `useSMSLog(taskId)` | Get SMS history for task |

---

## UI COMPONENTS TO CREATE/UPDATE

### Photo Verification Modal (Update)
- Add AI analysis step
- Show confidence score
- Handle low-confidence warnings

### Task Detail Panel (Update)
- Show dependencies section
- "Depends on" list
- "Blocks" list (tasks that depend on this one)
- Add/remove dependencies

### Template Task Editor (Update)
- Add dependency picker
- Select prerequisite task by sort order

### SMS Log View (Optional)
Location: `src/app/(dashboard)/sms-log/page.tsx`
- Table of sent SMS messages
- Filter by contractor, date, status
- Useful for debugging

---

## VALIDATION GATES

### AI Photo Analysis
```bash
# Endpoint responds
curl -X POST /api/ai/analyze-photo -d '{"image_base64":"...", "task_id":"..."}'
→ Returns confidence score and assessment

# Low confidence returns "retake" recommendation
# (test with blurry image)
```

### Dependencies
```bash
# Can add dependency
curl -X POST /api/tasks/{id}/dependencies -d '{"depends_on_task_id":"..."}'
→ 200 OK

# Cannot create circular dependency
curl -X POST /api/tasks/A/dependencies -d '{"depends_on_task_id":"B"}'
curl -X POST /api/tasks/B/dependencies -d '{"depends_on_task_id":"A"}'
→ Second request should fail with 400

# Auto-schedule triggers
# Verify task A → Task B (depends on A) gets scheduled_start set
```

### SMS
```bash
# Assign task to contractor with phone → SMS sent
# Check sms_log table for record
# Check Twilio dashboard for delivery

# Unblock location → SMS sent to assigned contractors
```

---

## BUSINESS RULES TO ENFORCE

### AI Photo Analysis
1. **AI is advisory, not blocking** — PM can override low confidence
2. **Always store AI assessment** — for audit trail
3. **Don't retry failed AI calls** — proceed without AI if service down

### Dependencies
1. **Same location only** — can't depend on task in different unit (for now)
2. **No circular dependencies** — validate on creation
3. **Auto-schedule is automatic** — no user action required
4. **Auto-schedule only if not manually scheduled** — don't override human decisions

### SMS
1. **Only send if phone exists** — skip silently if no phone
2. **Log all attempts** — success and failure
3. **Don't block on SMS failure** — task update succeeds even if SMS fails
4. **Rate limit** — max 1 SMS per task per hour per type

---

## DO NOT

- ❌ Block task verification on AI failure — it's advisory
- ❌ Create cross-location dependencies — too complex for now
- ❌ Send SMS to contractors without phone — fail silently
- ❌ Block task updates on SMS failure — log and continue
- ❌ Over-engineer AI prompts — keep them simple
- ❌ Build complex scheduling UI — auto-schedule should be invisible

---

## SUCCESS CRITERIA

### AI Photo Analysis
- [ ] AI analyzes photo before verification
- [ ] Confidence score displays in UI
- [ ] Low confidence shows warning
- [ ] PM can override and verify anyway
- [ ] AI assessment stored in database

### Dependencies
- [ ] Can add/remove task dependencies
- [ ] Circular dependency prevented
- [ ] Template tasks can have dependencies
- [ ] Auto-schedule works when task verified
- [ ] Auto-schedule only affects unscheduled tasks

### SMS
- [ ] Task assigned SMS sends
- [ ] Unblock SMS sends to affected contractors  
- [ ] SMS log table populated
- [ ] Failed SMS logged with error
- [ ] Daily reminder job works

---

## FUTURE CONSIDERATIONS (NOT THIS PHASE)

- AI: Train on historical photos for better accuracy
- AI: Detect specific trade work (electrical vs plumbing)
- Dependencies: Cross-location dependencies
- Dependencies: Critical path calculation
- SMS: Two-way messaging (contractor replies)
- SMS: WhatsApp as alternative channel
