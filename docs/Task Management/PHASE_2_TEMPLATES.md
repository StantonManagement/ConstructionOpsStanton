# PRP: Phase 2 — Templates

> Product Requirements Prompt for Windsurf
> Requires Phase 1 complete. Read `TASK_MANAGEMENT_INITIAL.md` for business context.

---

## OBJECTIVE

Enable rapid setup of 400+ units through templates and bulk creation. By the end of this phase:
- Create and manage scope templates (e.g., "1BR Standard", "2BR Premium")
- Bulk create locations ("Units 101-120, type 1BR")
- Apply template to locations → creates all tasks instantly
- Setup time for 20 units drops from hours to minutes

---

## CONTEXT TO LOAD

| File | Why |
|------|-----|
| `PRPs/PHASE_1_FOUNDATION.md` | Locations and tasks tables must exist |
| `src/types/schema.ts` | Add template types here |
| `TASK_MANAGEMENT_INITIAL.md` | Business rules for templates |

---

## DATABASE WORK

### Step 1: Create Template Tables

**Table: `scope_templates`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(100) | e.g., "1BR Standard", "2BR Premium" |
| `description` | TEXT | Optional explanation |
| `unit_type` | ENUM | 'studio', '1BR', '2BR', '3BR', NULL (NULL = any) |
| `is_active` | BOOLEAN | DEFAULT true |
| `tenant_id` | UUID | Default tenant pattern |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Table: `template_tasks`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `template_id` | UUID | FK to scope_templates (CASCADE) |
| `name` | VARCHAR(200) | Task name |
| `description` | TEXT | Optional |
| `default_duration_days` | INTEGER | Nullable |
| `default_budget_category_id` | UUID | FK to budget_categories, nullable |
| `estimated_cost` | DECIMAL(10,2) | Nullable |
| `sort_order` | INTEGER | For task ordering |
| `tenant_id` | UUID | |
| `created_at` | TIMESTAMPTZ | |

**Indexes:**
- `template_tasks.template_id`
- `scope_templates.unit_type`
- `scope_templates.is_active`

---

## API ENDPOINTS TO CREATE

### Templates API: `src/app/api/templates/route.ts`

| Method | Query/Body | Purpose |
|--------|------------|---------|
| GET | `?active=true` | List templates (optionally filter active only) |
| POST | `{ name, description?, unit_type? }` | Create template |

### Template by ID: `src/app/api/templates/[id]/route.ts`

| Method | Purpose |
|--------|---------|
| GET | Get template with its template_tasks |
| PUT | Update template |
| DELETE | Delete template (cascades to template_tasks) |

### Template Tasks: `src/app/api/templates/[id]/tasks/route.ts`

| Method | Purpose |
|--------|---------|
| GET | List tasks for template |
| POST | Add task to template |
| PUT | Bulk update task order |

### Apply Template: `src/app/api/templates/[id]/apply/route.ts`

| Method | Body | Purpose |
|--------|------|---------|
| POST | `{ location_ids: UUID[] }` | Apply template to multiple locations |

**Apply Logic:**
1. Fetch all template_tasks for this template
2. For each location_id in the array:
   - For each template_task:
     - Create a new task in `tasks` table
     - Copy: name, description, duration_days, budget_category_id, estimated_cost, sort_order
     - Set: location_id, status='not_started'
   - Update location: set `template_applied_id` = template.id
3. Return count of tasks created

### Bulk Locations: `src/app/api/locations/bulk/route.ts`

| Method | Body | Purpose |
|--------|------|---------|
| POST | See below | Create multiple locations at once |

**Body structure:**
```
{
  property_id: UUID,
  start_number: number,      // e.g., 101
  end_number: number,        // e.g., 120
  prefix?: string,           // e.g., "Unit " → "Unit 101"
  type: LocationType,        // Usually 'unit'
  unit_type?: UnitType,      // e.g., '1BR'
  floor?: number,
  template_id?: UUID         // Optional: apply template immediately
}
```

**Bulk Create Logic:**
1. Validate property_id exists
2. Generate location names: `${prefix}${number}` for each number in range
3. Insert all locations
4. If template_id provided, call apply template logic for all created locations
5. Return array of created location IDs

---

## TYPES TO ADD

Add to `src/types/schema.ts`:

```
ScopeTemplate
TemplateTask
TemplateWithTasks
CreateTemplateInput
CreateTemplateTaskInput
BulkLocationInput
ApplyTemplateInput
```

---

## REACT QUERY HOOKS TO CREATE

### `useTemplates.ts`

| Hook | Purpose |
|------|---------|
| `useTemplates()` | List all active templates |
| `useTemplate(id)` | Get single template with tasks |
| `useCreateTemplate()` | Create template |
| `useUpdateTemplate()` | Update template |
| `useDeleteTemplate()` | Delete template |
| `useAddTemplateTask()` | Add task to template |
| `useApplyTemplate()` | Apply template to locations |

### Update `useLocations.ts`

Add:
| Hook | Purpose |
|------|---------|
| `useBulkCreateLocations()` | Bulk create with optional template |

---

## UI COMPONENTS TO CREATE

### Template Management Page

Location: `src/app/(dashboard)/templates/page.tsx`

Features:
- List all templates with task counts
- Create new template button
- Click template → edit view

### Template Edit View

Location: `src/app/(dashboard)/templates/[id]/page.tsx`

Features:
- Edit template name, description, unit_type
- List of template tasks (drag to reorder)
- Add task to template
- Delete task from template
- Preview: "This template creates X tasks"

### Bulk Location Modal

Location: `src/components/BulkLocationModal.tsx`

Features:
- Select property (or use current)
- Enter range: start number, end number
- Optional prefix (default "Unit ")
- Select location type
- Select unit type (if type = unit)
- Optionally select template to apply
- Preview: "This will create 20 units with 15 tasks each = 300 tasks"
- Confirm button

### Apply Template Modal

Location: `src/components/ApplyTemplateModal.tsx`

Features:
- Select template from dropdown
- Show selected locations count
- Preview task count
- Warning if locations already have template applied
- Confirm button

---

## VALIDATION GATES

### Database
```sql
-- Template tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('scope_templates', 'template_tasks');

-- Can create template with tasks
INSERT INTO scope_templates (name, unit_type) VALUES ('Test 1BR', '1BR') RETURNING id;
INSERT INTO template_tasks (template_id, name, sort_order) VALUES ('template-id', 'Paint Walls', 1);
INSERT INTO template_tasks (template_id, name, sort_order) VALUES ('template-id', 'Install Flooring', 2);
```

### API
```bash
# Create template
curl -X POST /api/templates -d '{"name":"1BR Standard","unit_type":"1BR"}'

# Add task to template
curl -X POST /api/templates/{id}/tasks -d '{"name":"Paint Walls","sort_order":1}'

# Bulk create locations
curl -X POST /api/locations/bulk -d '{
  "property_id":"xxx",
  "start_number":101,
  "end_number":105,
  "type":"unit",
  "unit_type":"1BR"
}'
→ Should create 5 locations

# Apply template
curl -X POST /api/templates/{id}/apply -d '{"location_ids":["loc1","loc2","loc3"]}'
→ Should create tasks for each location
```

### Functional
- [ ] Bulk create 20 units in under 2 seconds
- [ ] Apply template to 20 locations creates correct task count
- [ ] `locations.template_applied_id` is set after apply
- [ ] Template task order is preserved when applied

---

## BUSINESS RULES TO ENFORCE

1. **Templates are global** — no property-specific templates (for now)
2. **Unit type matching is advisory** — can apply any template to any location
3. **Re-applying template to location that has one**: 
   - Warn user but allow it
   - Does NOT delete existing tasks
   - Creates duplicate tasks (user's choice to clean up)
4. **Deleting template** does NOT delete tasks that were created from it
5. **Sort order preserved** — tasks created in same order as template

---

## DO NOT

- ❌ Create property-specific templates — keep them global
- ❌ Auto-delete tasks when template deleted — just orphan them
- ❌ Block re-applying template — warn but allow
- ❌ Create UI in new component library — use existing Badge, Button, Card
- ❌ Forget to update `locations.template_applied_id` on apply

---

## SUCCESS CRITERIA

- [ ] Can create template with multiple tasks
- [ ] Can reorder template tasks
- [ ] Bulk create 20 units works
- [ ] Apply template to 20 locations creates all tasks
- [ ] Template edit page functional
- [ ] Bulk location modal functional
- [ ] Apply template modal functional
- [ ] Performance: bulk operations complete in < 5 seconds
