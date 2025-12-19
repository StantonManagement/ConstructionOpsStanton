# PRP: Phase 3 — Field Tool

> Product Requirements Prompt for Windsurf
> Requires Phases 1-2 complete. Read `TASK_MANAGEMENT_INITIAL.md` for business context.

---

## OBJECTIVE

Build the mobile-optimized field verification tool Dean uses daily. By the end of this phase:
- Dean can walk units and verify tasks with photos from his phone
- Photo capture works directly in browser (no app download)
- Punch list view shows all tasks for a location
- Status transitions enforce business rules (photo required for verify)

---

## CONTEXT TO LOAD

| File | Why |
|------|-----|
| `Web_Camera_Capture_-_Implementation_Guide.md` | Existing camera capture implementation |
| `STYLE_AND_DESIGN_SYSTEM.md` | Mobile-first, color = signal |
| `src/components/ui/` | Existing UI components to use |

---

## THE USER: DEAN (Field PM)

**Environment:**
- On construction site, noisy, dusty
- Using iPhone in one hand
- Gloves sometimes, hard to type
- Cell network, not always great signal
- Needs to move fast — 20+ units per day

**Workflow:**
1. Pull up property on phone
2. See list of locations needing attention
3. Tap location → see punch list
4. For each task: mark complete OR verify with photo
5. If blocked: quick tap to set reason
6. Move to next location

**Pain points to solve:**
- Minimize typing
- Large touch targets
- Clear visual feedback
- Works offline-ish (graceful degradation)

---

## UI COMPONENTS TO CREATE

### Location Punch List Page

Location: `src/app/(dashboard)/locations/[id]/page.tsx`

**Layout (mobile-first):**
```
┌─────────────────────────────┐
│ ← Back    Unit 203    ⋮     │  Header with location name
├─────────────────────────────┤
│ 5/12 Complete  ████░░░░ 42% │  Progress bar
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ ○ Paint Bathroom        │ │  Task row
│ │   Not Started           │ │  Status badge
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ● Install Flooring      │ │  Different status indicator
│ │   In Progress           │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ◐ Replace Fixtures      │ │  Worker complete (needs verify)
│ │   Ready to Verify  📷   │ │  Camera icon = needs photo
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ✓ Demo Old Cabinets     │ │  Verified (green check)
│ │   Verified 2h ago       │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Interactions:**
- Tap task row → expand to show actions
- Swipe right → mark as in_progress (if not_started)
- Swipe left → mark as worker_complete (if in_progress)
- Tap camera icon → open verify flow

### Task Action Panel

When task is tapped, show action panel:

```
┌─────────────────────────────┐
│ Install Flooring            │
│ In Progress                 │
├─────────────────────────────┤
│ [Mark Complete]  [Block]    │  Primary actions
├─────────────────────────────┤
│ Assigned: ABC Flooring      │  Details
│ Est: $1,200                 │
│ Started: Dec 15             │
└─────────────────────────────┘
```

Actions based on current status:
- `not_started` → "Start" button
- `in_progress` → "Mark Complete" button
- `worker_complete` → "Verify with Photo" button (primary, large)
- `verified` → View verification photo

### Photo Verification Flow

Location: `src/components/PhotoVerificationModal.tsx`

**Flow:**
1. Modal opens with camera viewfinder
2. Dean takes photo (use existing camera capture from `Web_Camera_Capture_-_Implementation_Guide.md`)
3. Preview photo with "Retake" and "Confirm" buttons
4. Optional: Add verification notes (text input, not required)
5. On confirm:
   - Upload photo to Supabase Storage
   - Update task: status='verified', verified_at=now(), verification_photo_url=url
   - Close modal, show success toast
6. If upload fails: show retry option, don't lose the photo

**Technical requirements:**
- Use `navigator.mediaDevices.getUserMedia` for camera access
- Upload to Supabase Storage bucket (create `verification-photos` bucket)
- Generate unique filename: `{task_id}_{timestamp}.jpg`
- Compress image before upload (max 1MB)

### Block Task Flow

Location: `src/components/BlockTaskModal.tsx`

**Flow:**
1. Tap "Block" on any task
2. Modal shows radio buttons for reason:
   - 🏗️ Materials (waiting on delivery)
   - 👷 Labor (no workers available)
   - 💰 Cash (payment issue)
   - 🔗 Dependency (waiting on other task)
   - ❓ Other
3. Text input for note (required, but can be brief)
4. Confirm → updates location status to on_hold, sets blocked_reason and blocked_note

---

## API ENDPOINTS TO CREATE OR MODIFY

### Task Status Transitions: `src/app/api/tasks/[id]/status/route.ts`

| Method | Body | Purpose |
|--------|------|---------|
| PUT | `{ status, verification_photo_url?, verification_notes? }` | Transition task status |

**Transition rules to enforce:**

| From | To | Requirements |
|------|-----|--------------|
| not_started | in_progress | None |
| in_progress | worker_complete | None |
| worker_complete | verified | `verification_photo_url` required |
| * | not_started | Allowed (reset) |
| verified | * | Not allowed (immutable once verified) |

Return 400 error if transition rules violated.

### Photo Upload: `src/app/api/upload/verification-photo/route.ts`

| Method | Body | Purpose |
|--------|------|---------|
| POST | FormData with image | Upload verification photo |

**Returns:** `{ url: string }` — the public URL of uploaded photo

**Storage setup:**
- Bucket: `verification-photos`
- Path: `{property_id}/{location_id}/{task_id}_{timestamp}.jpg`
- Public access for viewing

### Location Block: `src/app/api/locations/[id]/block/route.ts`

| Method | Body | Purpose |
|--------|------|---------|
| PUT | `{ blocked_reason, blocked_note }` | Set location as blocked |
| DELETE | None | Unblock location |

---

## REACT QUERY HOOKS TO ADD

### `useTasks.ts` additions

| Hook | Purpose |
|------|---------|
| `useUpdateTaskStatus()` | Transition task status |
| `useVerifyTask()` | Upload photo + update status in one call |

### `useLocations.ts` additions

| Hook | Purpose |
|------|---------|
| `useBlockLocation()` | Block location with reason |
| `useUnblockLocation()` | Unblock location |

---

## MOBILE UX REQUIREMENTS

### Touch Targets
- Minimum 44x44px for all interactive elements
- Spacing between buttons: at least 8px
- Full-width buttons on mobile

### Visual Feedback
- Loading states: skeleton or spinner
- Success: green toast, brief (1.5s)
- Error: red toast, stays until dismissed
- Status colors match design system:
  - Gray = not_started
  - Blue = in_progress
  - Orange = worker_complete (needs attention)
  - Green = verified

### Offline Considerations
- Cache location/task data with React Query
- Show stale data with "Last updated X ago" indicator
- Queue failed uploads for retry
- Don't block UI on slow network

### Camera Permissions
- Check for camera permission before showing camera
- Clear error message if denied: "Camera access needed to verify tasks"
- Fallback: file upload input if camera unavailable

---

## VALIDATION GATES

### Photo Upload
```bash
# Upload works
curl -X POST /api/upload/verification-photo -F "file=@test.jpg"
→ { "url": "https://..." }

# URL is accessible
curl <returned-url> → 200 OK
```

### Status Transitions
```bash
# Can transition not_started → in_progress
curl -X PUT /api/tasks/{id}/status -d '{"status":"in_progress"}'
→ 200 OK

# Cannot verify without photo
curl -X PUT /api/tasks/{id}/status -d '{"status":"verified"}'
→ 400 { "error": "Verification photo required" }

# Can verify with photo
curl -X PUT /api/tasks/{id}/status -d '{
  "status":"verified",
  "verification_photo_url":"https://..."
}'
→ 200 OK
```

### Mobile UX
- [ ] Punch list loads in < 2 seconds on 3G
- [ ] All buttons are at least 44px touch target
- [ ] Camera opens without app reload
- [ ] Photo upload completes with progress indicator
- [ ] Blocked tasks show reason badge

---

## BUSINESS RULES TO ENFORCE

1. **Cannot verify without photo** — API must reject
2. **Verified tasks are immutable** — cannot change status after verified
3. **Blocked requires reason** — blocked_reason cannot be null if status is on_hold
4. **Only PM/Admin can verify** — check user role in API
5. **Photo stored permanently** — don't delete verification photos

---

## DO NOT

- ❌ Require app download — must work in mobile Safari/Chrome
- ❌ Use tiny touch targets — 44px minimum
- ❌ Block UI while uploading — show progress
- ❌ Allow verify without photo — enforce in API
- ❌ Delete verification photos — they're audit trail
- ❌ Create new camera component — use existing pattern from `Web_Camera_Capture_-_Implementation_Guide.md`

---

## SUCCESS CRITERIA

- [ ] Punch list page loads and shows tasks
- [ ] Can transition task through all statuses
- [ ] Photo capture works on iPhone Safari
- [ ] Photo upload to Supabase Storage works
- [ ] Cannot verify without photo (API rejects)
- [ ] Block flow captures reason and note
- [ ] All touch targets are 44px+
- [ ] Works acceptably on 3G connection
