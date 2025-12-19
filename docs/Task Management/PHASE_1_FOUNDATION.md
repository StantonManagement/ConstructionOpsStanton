# PRP: Phase 1 — Foundation

> Product Requirements Prompt for Windsurf
> Read `TASK_MANAGEMENT_INITIAL.md` first for full business context

---

## OBJECTIVE

Create the database foundation and basic CRUD for locations and tasks. By the end of this phase, we can:
- Add locations to a property
- Add tasks to a location
- View locations list on property detail page
- See task counts on location cards

---

## CONTEXT TO LOAD

Before starting, read these files to understand existing patterns:

| File | Why |
|------|-----|
| `WINDSURF_SYSTEM.md` | API route patterns, component patterns |
| `src/types/schema.ts` | Existing type definitions — add new types here |
| `src/app/api/projects/route.ts` | API route pattern to follow |
| `src/hooks/queries/useProjects.ts` | React Query pattern to follow |
| `DATABASE_SCHEMA.md` | Existing table structures |

---

## DATABASE WORK

### Step 1: Check Existing Tables

Before any CREATE statements, query the database:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('locations', 'tasks');
```

If tables exist, use ALTER to add missing columns. Never drop and recreate.

### Step 2: Create Tables

**Table: `locations`**

Required columns:
- `id` — UUID primary key
- `property_id` — FK to c_properties.uuid (NOT NULL)
- `name` — VARCHAR(100), e.g., "Unit 203", "Hallway 2F"
- `type` — ENUM: 'unit', 'common_area', 'exterior', 'building_wide'
- `unit_type` — ENUM: 'studio', '1BR', '2BR', '3BR' (nullable, only for type='unit')
- `unit_number` — VARCHAR(20) (nullable)
- `floor` — INTEGER (nullable)
- `status` — ENUM: 'not_started', 'in_progress', 'complete', 'on_hold'
- `blocked_reason` — ENUM: 'materials', 'labor', 'cash', 'dependency', 'other' (nullable)
- `blocked_note` — TEXT (nullable)
- `template_applied_id` — UUID (nullable, FK to templates table in Phase 2)
- `tenant_id` — UUID, DEFAULT '00000000-0000-0000-0000-000000000001'
- `created_at`, `updated_at` — TIMESTAMPTZ with defaults

**Constraints to enforce:**
- `type` must be one of the enum values
- `status` must be one of the enum values
- `blocked_reason` can only be non-null when status = 'on_hold'
- Add index on `property_id`
- Add index on `status`

**Table: `tasks`**

Required columns:
- `id` — UUID primary key
- `location_id` — FK to locations.id (NOT NULL, CASCADE delete)
- `name` — VARCHAR(200)
- `description` — TEXT (nullable)
- `status` — ENUM: 'not_started', 'in_progress', 'worker_complete', 'verified'
- `priority` — ENUM: 'low', 'medium', 'high', 'urgent', DEFAULT 'medium'
- `assigned_contractor_id` — UUID (nullable, FK to contractors)
- `budget_category_id` — UUID (nullable, FK to budget_categories)
- `estimated_cost` — DECIMAL(10,2) (nullable)
- `actual_cost` — DECIMAL(10,2) (nullable)
- `duration_days` — INTEGER (nullable)
- `scheduled_start` — DATE (nullable)
- `scheduled_end` — DATE (nullable)
- `worker_completed_at` — TIMESTAMPTZ (nullable)
- `verified_at` — TIMESTAMPTZ (nullable)
- `verified_by` — UUID (nullable, FK to users)
- `verification_photo_url` — TEXT (nullable)
- `verification_notes` — TEXT (nullable)
- `sort_order` — INTEGER, DEFAULT 0
- `tenant_id` — UUID, DEFAULT '00000000-0000-0000-0000-000000000001'
- `created_at`, `updated_at` — TIMESTAMPTZ with defaults

**Constraints to enforce:**
- `status` must be one of the enum values
- If status = 'verified', then `verification_photo_url` must NOT be null
- Add index on `location_id`
- Add index on `status`
- Add index on `assigned_contractor_id`

---

## API ENDPOINTS TO CREATE

### Locations API: `src/app/api/locations/route.ts`

| Method | Purpose | Notes |
|--------|---------|-------|
| GET | List locations | Filter by `property_id` (required query param) |
| POST | Create location | Requires `property_id`, `name`, `type` |

**Follow the pattern in `src/app/api/projects/route.ts`:**
- Use `withAuth` wrapper
- Use `supabaseAdmin` for queries
- Use `successResponse` / `errorResponse` helpers
- Validate required fields before insert

### Locations by ID: `src/app/api/locations/[id]/route.ts`

| Method | Purpose |
|--------|---------|
| GET | Get single location with tasks |
| PUT | Update location |
| DELETE | Delete location (cascades to tasks) |

### Tasks API: `src/app/api/tasks/route.ts`

| Method | Purpose | Notes |
|--------|---------|-------|
| GET | List tasks | Filter by `location_id` (required) |
| POST | Create task | Requires `location_id`, `name` |

### Tasks by ID: `src/app/api/tasks/[id]/route.ts`

| Method | Purpose |
|--------|---------|
| GET | Get single task |
| PUT | Update task |
| DELETE | Delete task |

---

## TYPES TO ADD

Add to `src/types/schema.ts` (do NOT create a new file):

**Types needed:**
- `Location` — matches locations table
- `Task` — matches tasks table
- `LocationWithTasks` — Location with tasks array
- `CreateLocationInput` — for POST body validation
- `CreateTaskInput` — for POST body validation

**Enum types:**
- `LocationType` = 'unit' | 'common_area' | 'exterior' | 'building_wide'
- `UnitType` = 'studio' | '1BR' | '2BR' | '3BR'
- `LocationStatus` = 'not_started' | 'in_progress' | 'complete' | 'on_hold'
- `TaskStatus` = 'not_started' | 'in_progress' | 'worker_complete' | 'verified'
- `BlockedReason` = 'materials' | 'labor' | 'cash' | 'dependency' | 'other'
- `Priority` = 'low' | 'medium' | 'high' | 'urgent'

---

## REACT QUERY HOOKS TO CREATE

Create in `src/hooks/queries/`:

### `useLocations.ts`
- `useLocations(propertyId)` — fetch locations for a property
- `useLocation(id)` — fetch single location with tasks
- `useCreateLocation()` — mutation to create
- `useUpdateLocation()` — mutation to update
- `useDeleteLocation()` — mutation to delete

### `useTasks.ts`
- `useTasks(locationId)` — fetch tasks for a location
- `useCreateTask()` — mutation to create
- `useUpdateTask()` — mutation to update
- `useDeleteTask()` — mutation to delete

**Follow pattern in `useProjects.ts`:**
- Use queryKey arrays for cache invalidation
- Use `enabled` option for conditional fetching
- Invalidate related queries on mutation success

---

## UI COMPONENTS TO CREATE

### `LocationCard.tsx`
Location: `src/components/LocationCard.tsx`

Display:
- Location name and type badge
- Task count: "8/12 tasks complete"
- Status indicator (color = signal)
- Blocked indicator if on_hold (show reason)
- Click navigates to location detail

**Follow pattern in `src/components/ProjectCard.tsx`**

### `LocationList.tsx`
Location: `src/components/LocationList.tsx`

Display:
- Grid or list of LocationCards
- Filter by status
- Sort by name, status, or task completion %
- Empty state for no locations

### Property Detail Integration
Modify existing property detail page to show LocationList

---

## VALIDATION GATES

Run these checks before considering phase complete:

### Database
```sql
-- Tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('locations', 'tasks');

-- Can insert location
INSERT INTO locations (property_id, name, type) 
VALUES ('existing-property-uuid', 'Test Unit', 'unit') RETURNING id;

-- Can insert task
INSERT INTO tasks (location_id, name) 
VALUES ('location-uuid-from-above', 'Test Task') RETURNING id;

-- Cascade delete works
DELETE FROM locations WHERE name = 'Test Unit';
-- Should also delete the task
```

### API
```bash
# GET locations returns empty array for valid property
curl /api/locations?property_id=xxx → { success: true, data: [] }

# POST creates location
curl -X POST /api/locations -d '{"property_id":"xxx","name":"Unit 101","type":"unit"}'
→ { success: true, data: { id: "...", ... } }

# GET tasks returns empty for new location
curl /api/tasks?location_id=xxx → { success: true, data: [] }
```

### Types
- `Location` type exported from `src/types/schema.ts`
- `Task` type exported from `src/types/schema.ts`
- No TypeScript errors in `useLocations.ts` or `useTasks.ts`

### UI
- LocationCard renders without errors
- Location list shows on property detail page
- Task count displays correctly

---

## DO NOT

- ❌ Create types in a new file — add to `src/types/schema.ts`
- ❌ Create new UI primitives — use existing Badge, Card from `src/components/ui/`
- ❌ Use inline Supabase client — import from `@/lib/supabaseClient`
- ❌ Skip the withAuth wrapper on API routes
- ❌ Store derived status on location — calculate from tasks
- ❌ Allow verified status without photo URL constraint

---

## SUCCESS CRITERIA

- [ ] `locations` table exists with all columns and constraints
- [ ] `tasks` table exists with all columns and constraints
- [ ] API routes work: GET, POST, PUT, DELETE for both
- [ ] Types exported from schema.ts
- [ ] React Query hooks work with no TS errors
- [ ] LocationCard displays in property detail
- [ ] Task count shows correctly on location card
