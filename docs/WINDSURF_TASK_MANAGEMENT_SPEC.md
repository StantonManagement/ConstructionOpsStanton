# PROPERTY TASK MANAGEMENT SYSTEM - FULL SPECIFICATION

## OVERVIEW
Manage ~400 units across multiple properties. Track task status, blocking issues, and cash flow for construction loan draws.

### Data Hierarchy
```
Property → Location → Task
```
- **Location** = any place work happens (unit, common area, exterior, building-wide)
- **Task** = individual work item with two-stage completion (worker_complete → verified)

---

## PHASE 1: FOUNDATION

### 1.1 Create Tables

**Table: locations**
```sql
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL,  -- FK to c_properties.uuid
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'unit',
    unit_type VARCHAR(20),
    unit_number VARCHAR(20),
    floor INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    blocked_reason VARCHAR(20),
    blocked_note TEXT,
    template_applied_id UUID,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
ALTER TABLE locations ADD CONSTRAINT locations_type_check 
    CHECK (type IN ('unit', 'common_area', 'exterior', 'building_wide'));
ALTER TABLE locations ADD CONSTRAINT locations_status_check 
    CHECK (status IN ('not_started', 'in_progress', 'complete', 'on_hold'));
ALTER TABLE locations ADD CONSTRAINT locations_blocked_reason_check 
    CHECK (blocked_reason IN ('materials', 'labor', 'cash', 'dependency', 'other') OR blocked_reason IS NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_property ON locations(property_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);
```

**Table: tasks**
```sql
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    blocked_reason VARCHAR(20),
    blocked_note TEXT,
    assigned_to_id INTEGER,  -- FK to contractors.id
    budget_category_id UUID,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    scheduled_start DATE,
    scheduled_end DATE,
    duration_days INTEGER,
    dependency_task_id UUID,
    priority VARCHAR(10) DEFAULT 'medium',
    verification_photo_url TEXT,
    verification_notes TEXT,
    verified_by_id INTEGER,
    verified_at TIMESTAMPTZ,
    worker_completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('not_started', 'in_progress', 'worker_complete', 'verified'));
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to_id);
```

**Table: scope_templates**
```sql
CREATE TABLE IF NOT EXISTS scope_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    unit_type VARCHAR(20),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: template_tasks**
```sql
CREATE TABLE IF NOT EXISTS template_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES scope_templates(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_duration_days INTEGER,
    default_budget_category_id UUID,
    estimated_cost DECIMAL(10,2),
    sort_order INTEGER DEFAULT 0,
    dependency_sort_order INTEGER,  -- References another task by sort_order
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON template_tasks(template_id);
```

### 1.2 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/locations?property_id=X` | List locations for property |
| POST | `/api/locations` | Create location |
| GET | `/api/locations/[id]` | Get location with tasks |
| PUT | `/api/locations/[id]` | Update location |
| DELETE | `/api/locations/[id]` | Delete location + tasks |
| GET | `/api/tasks?location_id=X` | List tasks for location |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/[id]` | Update task |
| DELETE | `/api/tasks/[id]` | Delete task |

### 1.3 UI Components

**File: `app/(dashboard)/properties/[id]/locations/page.tsx`**
- Grid of location cards showing: name, type, status badge, progress (X/Y tasks)
- Filter by: status, type, floor
- "Add Location" button

**File: `components/locations/LocationCard.tsx`**
- Shows: name, unit_number, status badge, task count, blocked indicator
- Click navigates to location detail

### 1.4 Acceptance Criteria
- [ ] Can create location for a property
- [ ] Can create task within location
- [ ] Location list shows on property detail page
- [ ] Task count displays correctly on location cards

---

## PHASE 2: TEMPLATES

### 2.1 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/templates` | List all active templates |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/[id]` | Get template with tasks |
| PUT | `/api/templates/[id]` | Update template |
| POST | `/api/templates/[id]/apply` | Apply template to location(s) |
| POST | `/api/locations/bulk` | Bulk create locations |

### 2.2 Apply Template Logic
```typescript
// POST /api/templates/[id]/apply
// Body: { location_ids: UUID[] }

async function applyTemplate(templateId: UUID, locationIds: UUID[]) {
  const templateTasks = await getTemplateTasks(templateId)
  
  for (const locationId of locationIds) {
    for (const tt of templateTasks) {
      await createTask({
        location_id: locationId,
        name: tt.name,
        description: tt.description,
        duration_days: tt.default_duration_days,
        budget_category_id: tt.default_budget_category_id,
        estimated_cost: tt.estimated_cost,
        sort_order: tt.sort_order,
        status: 'not_started'
      })
    }
    // Update location.template_applied_id
    await updateLocation(locationId, { template_applied_id: templateId })
  }
}
```

### 2.3 Bulk Unit Creation
```typescript
// POST /api/locations/bulk
// Body: { property_id, start_number, count, unit_type, floor?, template_id? }

async function bulkCreateUnits(params) {
  const locations = []
  for (let i = 0; i < params.count; i++) {
    const unitNum = String(params.start_number + i)
    locations.push({
      property_id: params.property_id,
      name: `Unit ${unitNum}`,
      type: 'unit',
      unit_number: unitNum,
      unit_type: params.unit_type,
      floor: params.floor,
      status: 'not_started'
    })
  }
  const created = await insertLocations(locations)
  
  if (params.template_id) {
    await applyTemplate(params.template_id, created.map(l => l.id))
  }
  return created
}
```

### 2.4 UI Components

**File: `app/(dashboard)/admin/templates/page.tsx`**
- List templates with: name, unit_type, task count, active toggle
- Create/edit template modal

**File: `components/templates/TemplateTaskList.tsx`**
- Drag-to-reorder tasks
- Add/edit/delete template tasks
- Set default duration, cost, budget category

**File: `components/locations/BulkCreateModal.tsx`**
- Form: start number, count, unit type, floor (optional), template (optional)
- Preview before creation

### 2.5 Acceptance Criteria
- [ ] Can create template with multiple tasks
- [ ] Can apply template to single location
- [ ] Can apply template to multiple locations at once
- [ ] Bulk unit creation works with template auto-apply
- [ ] Template tasks respect sort_order

---

## PHASE 3: FIELD TOOL

### 3.1 Status Workflow

**Task Status Flow:**
```
not_started → in_progress → worker_complete → verified
                    ↓              ↓
                 on_hold ←←←←←←←←←←
```

**Rules:**
- Anyone can move: not_started → in_progress → worker_complete
- Only PM/Admin can move: worker_complete → verified
- `verified` requires `verification_photo_url` to be set
- Any status can go to on_hold (must set blocked_reason)

### 3.2 Photo Upload

**Supabase Storage bucket:** `task-verification-photos`

**Upload flow:**
1. User captures/selects photo
2. Upload to Supabase Storage: `{property_id}/{location_id}/{task_id}/{timestamp}.jpg`
3. Get public URL
4. Update task.verification_photo_url

### 3.3 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| PUT | `/api/tasks/[id]/status` | Change task status |
| POST | `/api/tasks/[id]/photo` | Upload verification photo |
| PUT | `/api/tasks/[id]/block` | Set blocking reason |
| PUT | `/api/tasks/[id]/unblock` | Clear blocking |

### 3.4 Status Change Logic
```typescript
// PUT /api/tasks/[id]/status
// Body: { status: string, verification_notes?: string }

async function changeStatus(taskId, newStatus, userId, notes) {
  const task = await getTask(taskId)
  const user = await getUser(userId)
  
  // Validation
  if (newStatus === 'verified') {
    if (!task.verification_photo_url) {
      throw new Error('Photo required for verification')
    }
    if (!['pm', 'admin'].includes(user.role)) {
      throw new Error('Only PM or Admin can verify')
    }
  }
  
  // Update
  const updates = { status: newStatus, updated_at: new Date() }
  
  if (newStatus === 'worker_complete') {
    updates.worker_completed_at = new Date()
  }
  if (newStatus === 'verified') {
    updates.verified_at = new Date()
    updates.verified_by_id = userId
    updates.verification_notes = notes
  }
  
  await updateTask(taskId, updates)
  
  // Check if all tasks verified → update location status
  await checkLocationComplete(task.location_id)
}
```

### 3.5 UI Components

**File: `app/(dashboard)/properties/[id]/locations/[locationId]/page.tsx`**
- Task list (punch list style)
- Each task shows: name, status badge, assignee, blocked indicator
- Tap task to expand: status buttons, photo upload, notes

**File: `components/tasks/TaskStatusButtons.tsx`**
- Quick action buttons based on current status
- "Mark In Progress", "Mark Complete", "Verify" (if photo exists)
- "Put On Hold" with reason selector

**File: `components/tasks/PhotoCapture.tsx`**
- Camera capture (mobile) or file upload (desktop)
- Preview before upload
- Compress images client-side before upload

### 3.6 Mobile Responsive Requirements
- Touch targets minimum 44px
- Status buttons full-width on mobile
- Photo capture uses native camera API
- Swipe gestures for quick actions (optional)

### 3.7 Acceptance Criteria
- [ ] Can change task status through workflow
- [ ] Cannot verify without photo
- [ ] Photo uploads to Supabase Storage
- [ ] Location auto-updates to complete when all tasks verified
- [ ] Works on mobile browser

---

## PHASE 4: BLOCKING & VISIBILITY

### 4.1 Blocking Logic

When task is blocked:
1. Set `blocked_reason` (required): materials, labor, cash, dependency, other
2. Set `blocked_note` (optional): freeform explanation
3. Status can remain current or change to show blocked state

Location blocking:
- Location is `on_hold` if ANY task has `blocked_reason` set
- OR location can be directly set to `on_hold`

### 4.2 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/properties/[id]/blocked` | All blocked items for property |
| GET | `/api/properties/[id]/stats` | Roll-up statistics |
| GET | `/api/tasks?trade=X&property_id=Y` | Cross-location trade view |

### 4.3 Stats Calculation
```typescript
// GET /api/properties/[id]/stats
async function getPropertyStats(propertyId) {
  const locations = await getLocationsWithTasks(propertyId)
  
  return {
    total_locations: locations.length,
    locations_complete: locations.filter(l => l.status === 'complete').length,
    locations_in_progress: locations.filter(l => l.status === 'in_progress').length,
    locations_on_hold: locations.filter(l => l.status === 'on_hold').length,
    
    total_tasks: sum(locations.map(l => l.tasks.length)),
    tasks_verified: sum(locations.map(l => l.tasks.filter(t => t.status === 'verified').length)),
    
    blocked_by_reason: {
      materials: countBlockedBy('materials'),
      labor: countBlockedBy('labor'),
      cash: countBlockedBy('cash'),
      dependency: countBlockedBy('dependency'),
      other: countBlockedBy('other')
    }
  }
}
```

### 4.4 UI Components

**File: `app/(dashboard)/properties/[id]/page.tsx`** (Property Dashboard)
- Stats cards: total locations, complete, in progress, on hold
- Progress bar
- Blocked breakdown: "4 waiting on materials, 8 need labor"
- Quick filters

**File: `app/(dashboard)/properties/[id]/blocked/page.tsx`** (Blocking Report)
- Grouped by blocked_reason
- Each item shows: location, task, blocked_note, days blocked
- Click to navigate to task

**File: `app/(dashboard)/properties/[id]/trade/page.tsx`** (Trade View)
- Filter by budget_category or task name pattern
- Shows all matching tasks across all locations
- Bulk assign contractor
- See blocked status

### 4.5 Acceptance Criteria
- [ ] Dashboard shows accurate stats
- [ ] Blocking report groups by reason
- [ ] Trade view filters work correctly
- [ ] Can bulk assign contractor from trade view

---

## PHASE 5: CASH FLOW INTEGRATION

### 5.1 Two Cash Flow Views

**Forecast View:** Sum of `estimated_cost` by `scheduled_start` week
- "Week of Jan 15: $47,000 needed"
- Compare to available funds

**Draw Eligibility View:** Sum of `estimated_cost` for `verified` tasks
- "Verified work: $32,000 - eligible for draw"
- Links to loan draw request

### 5.2 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/properties/[id]/cashflow/forecast` | Weekly forecast |
| GET | `/api/properties/[id]/cashflow/draw-eligible` | Verified work total |

### 5.3 Forecast Calculation
```typescript
// GET /api/properties/[id]/cashflow/forecast
async function getForecast(propertyId) {
  const tasks = await getTasksWithScheduledStart(propertyId)
  
  // Group by week
  const byWeek = groupBy(tasks, t => startOfWeek(t.scheduled_start))
  
  return Object.entries(byWeek).map(([week, tasks]) => ({
    week_start: week,
    total_estimated: sum(tasks.map(t => t.estimated_cost || 0)),
    task_count: tasks.length,
    tasks: tasks.map(t => ({
      id: t.id,
      name: t.name,
      location_name: t.location.name,
      estimated_cost: t.estimated_cost
    }))
  }))
}
```

### 5.4 Draw Eligibility Calculation
```typescript
// GET /api/properties/[id]/cashflow/draw-eligible
async function getDrawEligible(propertyId) {
  const verifiedTasks = await getTasks({
    property_id: propertyId,
    status: 'verified'
  })
  
  // Group by budget category for loan draw line items
  const byCategory = groupBy(verifiedTasks, 'budget_category_id')
  
  return {
    total_eligible: sum(verifiedTasks.map(t => t.estimated_cost || 0)),
    by_category: Object.entries(byCategory).map(([catId, tasks]) => ({
      budget_category_id: catId,
      total: sum(tasks.map(t => t.estimated_cost || 0)),
      task_count: tasks.length
    })),
    verified_tasks: verifiedTasks
  }
}
```

### 5.5 UI Components

**File: `app/(dashboard)/properties/[id]/cashflow/page.tsx`**
- Tab toggle: Forecast | Draw Eligible
- Forecast: Weekly timeline with cost bars
- Draw Eligible: Category breakdown with totals
- "Request Draw" button (links to existing draw workflow)

### 5.6 Acceptance Criteria
- [ ] Forecast shows costs grouped by week
- [ ] Draw eligible shows only verified tasks
- [ ] Totals are accurate
- [ ] Can filter by date range

---

## PHASE 6: AI & AUTOMATION

### 6.1 Photo Verification AI

**Flow:**
1. Photo uploaded → sent to vision model (Claude or GPT-4V)
2. Prompt: "Does this photo show completed {task.name}? Rate confidence 0-100."
3. Low confidence (<70) → flag for PM review
4. High confidence (≥70) → auto-suggest verification (PM still clicks confirm)

**API:**
```typescript
// POST /api/tasks/[id]/analyze-photo
async function analyzePhoto(taskId) {
  const task = await getTask(taskId)
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'url', url: task.verification_photo_url } },
        { type: 'text', text: `Does this photo show completed work for: "${task.name}"? 
          Task description: ${task.description || 'None provided'}
          
          Respond with JSON: { "confidence": 0-100, "assessment": "brief explanation" }` }
      ]
    }]
  })
  
  return JSON.parse(response.content[0].text)
}
```

### 6.2 Auto-Schedule Based on Dependencies

**Logic:**
1. Task A depends on Task B
2. When Task B is verified, check Task A
3. If Task A has no `scheduled_start`, set it to Task B's `verified_at` + 1 day
4. Cascade to downstream dependencies

### 6.3 SMS Updates to Contractors

**Triggers:**
- Task assigned to contractor → SMS: "New task assigned: {task.name} at {location.name}"
- Task unblocked → SMS: "Task ready to resume: {task.name}"
- Task needs rework → SMS: "Verification failed for {task.name}. PM notes: {notes}"

**Integration:** Use existing Twilio setup from payment SMS system.

### 6.4 Acceptance Criteria
- [ ] Photo analysis returns confidence score
- [ ] Low-confidence photos flagged for review
- [ ] Dependency auto-scheduling works
- [ ] SMS sends on task assignment (if contractor has phone)

---

## STATUS ENUMS REFERENCE

**Location Status:** `not_started`, `in_progress`, `complete`, `on_hold`

**Task Status:** `not_started`, `in_progress`, `worker_complete`, `verified`

**Blocked Reason:** `materials`, `labor`, `cash`, `dependency`, `other`, `null`

**Priority:** `low`, `medium`, `high`, `urgent`

**Location Type:** `unit`, `common_area`, `exterior`, `building_wide`

**Unit Type:** `studio`, `1BR`, `2BR`, `3BR`, `null`
