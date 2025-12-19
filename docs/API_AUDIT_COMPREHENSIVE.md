# Comprehensive API Audit & Error Check

**Date:** December 17, 2025  
**Status:** In Progress  
**Priority:** HIGH - Multiple endpoints suspected broken

---

## 🎯 Audit Scope

Checking all API endpoints for:
1. Error handling consistency
2. Authentication validation
3. Database query safety
4. Response format standardization
5. Null/undefined checks
6. Type validation

---

## 📋 API Endpoints Inventory

### Authentication & Users
- [ ] `/api/auth/*` - Authentication endpoints
- [ ] `/api/users/*` - User management

### Projects
- [x] `/api/projects` - POST (Create) - **WORKING**
- [ ] `/api/projects/list` - POST (List with filters)
- [ ] `/api/projects/[id]` - GET, PUT, DELETE
- [x] `/api/projects/[id]/auto-schedule` - POST - **BROKEN (500 error)**

### Contractors
- [x] `/api/contractors` - POST, GET - **WORKING**
- [x] `/api/contractors/[id]` - PUT, DELETE - **WORKING**

### Contracts
- [x] `/api/contracts` - POST, GET - **WORKING**
- [x] `/api/contracts/[id]` - GET, PUT, DELETE - **WORKING**

### Budgets
- [ ] `/api/budgets` - GET, POST
- [ ] `/api/budgets/[id]` - GET, PUT, DELETE

### Schedules
- [ ] `/api/schedules` - GET, POST
- [ ] `/api/schedules/[id]` - GET, PUT, DELETE
- [ ] `/api/schedules/[id]/tasks` - GET, POST
- [ ] `/api/schedules/[id]/tasks/[taskId]` - GET, PUT, DELETE

### Payment Applications
- [ ] `/api/payments/*` - Various payment endpoints

### Dashboard
- [x] `/api/dashboard/queue` - GET - **FIXED (column error)**

### Entities
- [ ] `/api/entities` - GET, POST

---

## 🔴 Known Issues

### 1. Auto-Schedule API (HIGH PRIORITY)
**Endpoint:** `/api/projects/[id]/auto-schedule`  
**Status:** 500 Error  
**Error:** "Failed to auto-schedule tasks"

**Suspected Causes:**
- Missing `project_schedules` table or data
- Missing `schedule_defaults` table
- Missing `property_budgets` data
- Authentication issue
- Database query failure

**Investigation Needed:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('project_schedules', 'schedule_defaults', 'schedule_tasks');

-- Check if schedule exists for project
SELECT * FROM project_schedules WHERE project_id = <project_id>;

-- Check if defaults exist
SELECT * FROM schedule_defaults;

-- Check if budget categories exist
SELECT * FROM property_budgets WHERE project_id = <project_id>;
```

### 2. Gantt Chart Not Displaying
**Component:** `ScheduleView.tsx`, `GanttChartContainer.tsx`  
**Status:** Empty display, loading spinner stuck

**Possible Causes:**
- No schedule created for project
- No tasks in schedule
- Tasks not being fetched correctly
- Gantt library not rendering
- ViewMode enum not working

**Debug Logs Added:**
- `[ScheduleView] Fetching schedule for project`
- `[ScheduleView] Schedules found`
- `[ScheduleView] Tasks loaded`
- `[GanttChartContainer] Rendering with`

### 3. View Mode Changes Not Working
**Component:** `GanttToolbar.tsx`, `ScheduleView.tsx`  
**Status:** Day/Week/Month/Year views look identical

**Fixed:** ViewMode enum mapping
**Status:** Needs verification

---

## 🔍 Systematic API Check

### Step 1: Check API Helper Functions

