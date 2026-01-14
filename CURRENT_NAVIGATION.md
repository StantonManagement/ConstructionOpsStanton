# Current Navigation Structure & UI Access Guide

> **Purpose:** Complete walkthrough of how to access every feature in the current UI  
> **Last Updated:** January 8, 2026  
> **For:** Claude Project context on navigation organization

---

## 🎯 Navigation Architecture Overview

### **Main Entry Point:** `/` (Root)
- **Auth Check:** Redirects to login if not authenticated
- **Role-Based Routing:**
  - `role === "pm"` → `PMDashboard` component
  - All other roles → `ConstructionDashboard` component (wrapped in DataProvider)

### **Layout Structure:**
```
Root Layout (app/layout.tsx)
├── AuthProvider
├── ReactQueryProvider
├── PortfolioProvider
├── ProjectProvider
└── ModalProvider
    └── Page Content
        ├── Auth Screen (if not logged in)
        ├── PM Dashboard (if role = pm)
        └── Construction Dashboard (admin/staff)
```

---

## 🧭 Sidebar Navigation (Left Side)

**Location:** `src/app/components/Navigation.tsx`  
**Width:** 256px (64 in Tailwind units)  
**Position:** Fixed left, always visible on desktop, hamburger menu on mobile

### **Header Section**
- **Logo:** "Construction Ops" with Building icon
- **Portfolio Filter:** Dropdown (currently hardcoded options)
  - All Portfolios
  - 90 Park Portfolio
  - North End Portfolio
  - Park Portfolio
  - South End Portfolio

---

## 📍 Main Navigation Items

### 1. **Overview** 🏠
- **Route:** `/?tab=overview`
- **Component:** `OverviewView`
- **What it shows:** Dashboard summary, activity feed, key metrics
- **Access:** Click "Overview" in sidebar

---

### 2. **Properties** 🏢
- **Route:** `/properties`
- **Component:** Properties page (dashboard layout)
- **What it shows:** Property list view
- **Access:** Click "Properties" in sidebar
- **Note:** Uses dashboard layout with sidebar

**Sub-route:**
- **Property Detail:** `/(dashboard)/properties/[id]`
- Shows individual property details

---

### 3. **Projects** 📁
- **Route:** `/?tab=projects`
- **Component:** `ProjectsView`
- **What it shows:** Project list, project detail with tabs
- **Access:** Click "Projects" in sidebar

**When a project is selected:**
- URL becomes: `/?tab=projects&project=[id]&subtab=[subtab]`
- Shows `ProjectDetailView` with tabs:
  - Overview
  - Budget
  - Contractors
  - Payments
  - Schedule (Gantt)
  - Photos
  - Punch Lists
  - Change Orders
  - Documents
  - Warranties (if built)

---

### 4. **RENOVATIONS Section** 🔨
**Collapsible section with 3 items:**

#### 4a. **Locations** 📍
- **Route:** `/locations` 
- **Component:** Locations page
- **What it shows:** Location list (units/common areas)
- **Access:** Sidebar → RENOVATIONS → Locations
- **Mobile-optimized:** Yes

**Sub-routes:**
- **Location Detail:** `/renovations/locations/[id]`
  - Shows task list for that location
  - Photo verification workflow
  - Block/unblock controls
  - Next/Previous navigation

#### 4b. **Templates** 📋
- **Route:** `/?tab=templates`
- **Component:** `TemplatesView`
- **What it shows:** Task template library
- **Access:** Sidebar → RENOVATIONS → Templates

#### 4c. **Blocking** ⚠️
- **Route:** `/reports/blocking`
- **Component:** Blocking report page
- **What it shows:** All blocked locations with reasons
- **Access:** Sidebar → RENOVATIONS → Blocking

---

### 5. **FINANCIALS Section** 💰

#### 5a. **Draws** 💵
- **Route:** `/?tab=draws`
- **Component:** Draws view (part of main dashboard)
- **What it shows:** Draw requests, draw history
- **Access:** Sidebar → FINANCIALS → Draws

**Related routes:**
- `/draws/new` - Create new draw
- `/draws/[id]` - Draw detail
- `/renovations/draws` - Renovation-specific draws
- `/renovations/draws/new` - New renovation draw
- `/renovations/draws/[id]` - Renovation draw detail

#### 5b. **Cash Position** 📊
- **Route:** `/?tab=cash-position`
- **Component:** Cash position view
- **What it shows:** Portfolio cash position, funding sources
- **Access:** Sidebar → FINANCIALS → Cash Position

**Alternative route:**
- `/(dashboard)/cash-position` - Standalone page with dashboard layout

---

### 6. **OPERATIONS Section** ⚙️

#### 6a. **Contractors** 👷
- **Route:** `/?tab=contractors`
- **Component:** `ContractorsView`
- **What it shows:** Contractor list, contractor details
- **Access:** Sidebar → OPERATIONS → Contractors

**Sub-views:**
- Contractor detail with tabs:
  - Overview
  - Projects
  - Payments
  - Performance
  - Compliance (if integrated)

#### 6b. **Payments** 💳
- **Route:** `/?tab=payments`
- **Component:** `PaymentsView`
- **What it shows:** Payment applications (G-703), processing queue
- **Access:** Sidebar → OPERATIONS → Payments
- **Badge:** Shows count of pending payments

**Sub-routes:**
- `/payments/[id]/review` - Review payment application
- `/payments/[id]/verify` - Verify payment with photos

---

### 7. **Backlog** 📝
- **Route:** `/backlog`
- **Component:** Backlog page (dashboard layout)
- **What it shows:** Future work items not yet scheduled
- **Access:** Sidebar → Backlog

**Alternative route:**
- `/(dashboard)/backlog` - Same page, different route structure

---

### 8. **Settings** ⚙️
- **Route:** `/?tab=settings`
- **Component:** `SettingsView`
- **What it shows:** User management, permissions, system settings
- **Access:** Sidebar → Settings

**Sub-tabs within Settings:**
- Users
- Entities
- Permissions
- Schedule Defaults
- Notifications

---

## 🎨 Top Header Bar

**Location:** `src/app/components/Header.tsx`  
**Position:** Fixed top, spans full width (offset by sidebar on desktop)  
**Height:** 64px (16 in Tailwind units)

### **Left Side (Desktop Hidden - Sidebar has logo)**
- Mobile: Logo and title

### **Center/Right Side:**

#### **Project Selector** 🏗️
- **Dropdown button** showing current project or "All Projects"
- Click to open project list
- Select project to filter entire app
- Updates URL: `?project=[id]`
- Affects all views that support project filtering

#### **Search Bar** 🔍
- Search projects, contracts, etc.
- Currently functional but search results handling varies by view

#### **Date/Time Display** 🕐
- Shows current time and date
- Updates every second

#### **Notifications Bell** 🔔
- Shows unread count badge
- Click to open notifications dropdown
- Types: payment, contract, project, alert, reminder, system
- Click notification to navigate to related item
- "Mark all as read" button

#### **User Menu** 👤
- Shows user avatar and name
- Dropdown with:
  - Profile Settings
  - Preferences
  - Sign Out

---

## 🚀 Direct Routes (Not in Main Navigation)

### **Renovation Module Routes**
These are accessible but not in the main sidebar:

1. **Renovation Portfolio Overview**
   - Route: `/renovations`
   - Shows: Portfolio stats, property list, blocking alerts
   - Access: Direct URL or internal links

2. **Renovation Locations List**
   - Route: `/renovations/locations`
   - Query params: `?property_id=[id]`
   - Shows: Locations for a property
   - Access: From renovation portfolio

3. **Renovation Templates**
   - Route: `/renovations/templates`
   - Shows: Template management
   - Access: Direct URL

4. **Renovation Blocking Report**
   - Route: `/renovations/blocking`
   - Shows: Blocked locations
   - Access: Direct URL or sidebar link

---

### **Cash Flow Routes**

1. **Cash Flow Dashboard**
   - Route: `/cash-flow`
   - Query params: `?project_id=[id]`
   - Shows: Forecast, draw eligibility, draw history
   - Access: Direct URL or internal links

2. **Draw Eligibility**
   - Route: `/cash-flow/draw-eligibility`
   - Shows: Draw eligibility calculator
   - Access: From cash flow dashboard

3. **Cash Flow Forecast**
   - Route: `/cash-flow/forecast`
   - Shows: Cash flow projections
   - Access: From cash flow dashboard

---

### **Project Sub-Routes**

1. **Project Contractors**
   - Route: `/projects/[id]/contractors`
   - Shows: Contractors assigned to project
   - Access: From project detail tabs

2. **Project Photos**
   - Route: `/projects/[id]/photos`
   - Shows: Photo gallery for project
   - Access: From project detail tabs

---

### **Report Routes**

1. **Blocking Report**
   - Route: `/reports/blocking`
   - Shows: All blocked locations
   - Access: Sidebar → RENOVATIONS → Blocking

2. **Trade Report**
   - Route: `/reports/trade`
   - Shows: Work breakdown by trade
   - Access: Direct URL (not in nav)

---

### **PM Dashboard** (Role-specific)
- **Route:** `/pm-dashboard`
- **Access:** Automatic if `role === "pm"`
- **Alternative:** Direct URL
- **Component:** `PMDashboard` (151KB mega-component)
- **Tabs:**
  - Overview
  - Manage
  - Payments
  - Projects
  - Contractors
  - Field Ops
  - Daily Logs
  - Metrics
  - Settings

---

### **SMS Logs** (Admin Tool)
- **Route:** `/sms-logs`
- **Shows:** SMS notification history
- **Access:** Direct URL only (not in nav)

---

### **SMS Test** (Dev Tool)
- **Route:** `/sms-test`
- **Shows:** SMS testing interface
- **Access:** Direct URL only (not in nav)

---

## 🔒 Hidden/External Routes

### **Contractor Portal** (Token-Based)
- **Route:** `/contractor-portal/[token]`
- **Access:** External link with JWT token
- **No authentication required** (token-based)
- **Shows:** Punch list items for contractor
- **Features:**
  - View assigned punch items
  - Update status
  - Upload photos
  - Add notes
  - Filter by project/status

**How contractors get access:**
1. PM generates token for contractor
2. Token sent via SMS or email
3. Contractor clicks link
4. No login required - token validates access

---

## 📱 Mobile Navigation

### **Mobile Menu Button**
- **Location:** Top-left corner (below header)
- **Icon:** Hamburger menu (☰)
- **Action:** Opens/closes sidebar overlay

### **Mobile Sidebar**
- **Behavior:** Slides in from left
- **Overlay:** Dark background overlay when open
- **Same structure** as desktop sidebar
- **Auto-closes** when navigation item clicked

### **Mobile Header**
- **Simplified:** Shows logo and menu button
- **Dropdown menu** for search, notifications, user menu

---

## 🎯 Tab-Based Navigation (Within Main Dashboard)

When on `/?tab=[tab]`, the main content area shows different views:

### **Tab Values:**
- `overview` - Overview dashboard
- `projects` - Projects list/detail
- `field-ops` - Field operations (limited)
- `payments` - Payment applications
- `contractors` - Contractor management
- `change-orders` - Change orders (if in main dash)
- `budget` - Budget dashboard
- `settings` - Settings
- `daily-logs` - Daily logs (if in main dash)
- `templates` - Templates
- `draws` - Draws management
- `cash-position` - Cash position

### **Old Tab Names (Auto-Redirected):**
- `payment-applications` → `payments`
- `payment` → `payments`
- `subcontractors` → `projects`
- `contracts` → `projects`
- `metrics` → `overview`
- `user-management` → `settings`
- `compliance` → `overview`

---

## 🔄 URL Parameter System

### **Common Parameters:**

1. **`tab`** - Main view selector
   - Example: `?tab=projects`

2. **`project`** - Selected project ID
   - Example: `?project=21`
   - Filters entire app to this project

3. **`subtab`** - Sub-view within a tab
   - Example: `?tab=projects&project=21&subtab=budget`

4. **`returnTo`** - Return navigation path
   - Example: `?returnTo=/renovations`
   - Used for back button navigation

5. **`property_id`** - Property filter
   - Example: `/renovations/locations?property_id=5`

---

## 🗺️ Complete Feature Access Map

### **How to Access Each Feature:**

| Feature | Primary Access | Alternative Access | Notes |
|---------|---------------|-------------------|-------|
| **Overview Dashboard** | Sidebar → Overview | `/?tab=overview` | Default landing |
| **Properties List** | Sidebar → Properties | `/properties` | Dashboard layout |
| **Property Detail** | Click property | `/(dashboard)/properties/[id]` | - |
| **Projects List** | Sidebar → Projects | `/?tab=projects` | - |
| **Project Detail** | Click project | `?tab=projects&project=[id]` | Multi-tab view |
| **Locations List** | Sidebar → RENOVATIONS → Locations | `/locations` | - |
| **Location Detail** | Click location | `/renovations/locations/[id]` | Mobile-optimized |
| **Templates** | Sidebar → RENOVATIONS → Templates | `/?tab=templates` | - |
| **Blocking Report** | Sidebar → RENOVATIONS → Blocking | `/reports/blocking` | - |
| **Draws** | Sidebar → FINANCIALS → Draws | `/?tab=draws` | - |
| **Cash Position** | Sidebar → FINANCIALS → Cash Position | `/?tab=cash-position` | - |
| **Contractors** | Sidebar → OPERATIONS → Contractors | `/?tab=contractors` | - |
| **Payments** | Sidebar → OPERATIONS → Payments | `/?tab=payments` | Badge shows pending |
| **Backlog** | Sidebar → Backlog | `/backlog` | - |
| **Settings** | Sidebar → Settings | `/?tab=settings` | Multi-tab |
| **Cash Flow** | Direct URL | `/cash-flow?project_id=[id]` | Not in sidebar |
| **Renovation Portfolio** | Direct URL | `/renovations` | Not in sidebar |
| **Trade Report** | Direct URL | `/reports/trade` | Not in sidebar |
| **SMS Logs** | Direct URL | `/sms-logs` | Admin only |
| **PM Dashboard** | Auto (if PM role) | `/pm-dashboard` | Role-based |
| **Contractor Portal** | External token link | `/contractor-portal/[token]` | No nav |

---

## 🎨 Project Detail Tabs

When a project is selected (`?tab=projects&project=[id]`), these tabs appear:

1. **Overview** - `?subtab=overview` (default)
2. **Budget** - `?subtab=budget`
3. **Contractors** - `?subtab=contractors`
4. **Payments** - `?subtab=payments`
5. **Schedule** - `?subtab=schedule` (Gantt chart)
6. **Photos** - `?subtab=photos`
7. **Punch Lists** - `?subtab=punch-lists`
8. **Change Orders** - `?subtab=change-orders`
9. **Documents** - `?subtab=documents` (if built)
10. **Warranties** - `?subtab=warranties` (if built)

---

## 🚧 Features Built But Not Visible

### **1. Warranties**
- **API:** Fully built (`/api/warranties`)
- **Components:** `WarrantyList`, `WarrantyForm`
- **Database:** `warranties` table exists
- **Missing:** No route or nav link
- **Suggestion:** Add as project detail tab

### **2. Daily Logs**
- **Component:** `DailyLogsView` exists
- **API:** `/api/daily-log`
- **Missing:** No clear route (may be in PM dashboard)
- **Suggestion:** Add as project detail tab

### **3. Documents**
- **Component:** `DocumentsView` exists
- **Missing:** No route or nav link
- **Suggestion:** Add as project detail tab

### **4. Compliance**
- **Component:** `ComplianceView` exists
- **Missing:** No route or nav link
- **Suggestion:** Add as contractor detail tab

### **5. Field Ops**
- **Component:** `FieldOpsView` exists
- **Route:** `?tab=field-ops`
- **Status:** Minimal implementation
- **Suggestion:** Expand or remove

### **6. Gantt Schedule**
- **Components:** Built in `schedule/` folder
- **Integration:** May be in project detail
- **Status:** Needs better visibility

### **7. AI Photo Analysis**
- **API:** `/api/ai/analyze-photo`
- **Status:** Experimental
- **Missing:** UI integration

---

## 🔍 Navigation Gaps & Issues

### **Inconsistencies:**

1. **Multiple Route Patterns:**
   - Some features use `/?tab=X`
   - Others use `/feature-name`
   - Dashboard routes use `/(dashboard)/feature`
   - Creates confusion

2. **Hidden Features:**
   - Many built features have no navigation
   - Users can't discover them
   - Requires direct URL knowledge

3. **Renovation Module Disconnect:**
   - `/renovations` is separate from main nav
   - Sidebar has "Locations" but not full renovation flow
   - Portfolio view not linked

4. **Cash Flow Disconnect:**
   - `/cash-flow` not in sidebar
   - "Draws" in sidebar but separate from cash flow
   - Duplicate functionality?

5. **Project Detail Inconsistency:**
   - Some tabs exist, others don't
   - Built features not integrated
   - No clear pattern

6. **PM Dashboard Isolation:**
   - Completely separate interface
   - No shared navigation
   - Duplicate features?

---

## 💡 Recommendations for Reorganization

### **1. Consolidate Route Patterns**
Choose one pattern and stick to it:
- Option A: Everything under `/?tab=X&subtab=Y`
- Option B: Feature-based routes `/feature/[id]`
- Option C: Dashboard layout for all: `/(dashboard)/feature`

### **2. Surface Hidden Features**
Add navigation for:
- Warranties (project tab)
- Daily Logs (project tab)
- Documents (project tab)
- Compliance (contractor tab)
- Cash Flow (sidebar)
- Renovation Portfolio (sidebar)

### **3. Unify Renovation Module**
Either:
- Make `/renovations` the main entry point
- Or integrate into main dashboard
- Don't split across both

### **4. Clarify Financial Features**
- Merge Draws + Cash Flow + Cash Position
- Or clearly separate with distinct purposes
- Add to single "Financials" section

### **5. Enhance Project Detail**
Add all built tabs:
- Overview ✅
- Budget ✅
- Schedule (Gantt) ✅
- Contractors ✅
- Payments ✅
- Photos ✅
- Punch Lists ✅
- Change Orders ✅
- **Documents** ⚠️ (add)
- **Warranties** ⚠️ (add)
- **Daily Logs** ⚠️ (add)

### **6. Simplify PM Dashboard**
Either:
- Merge with main dashboard
- Or keep separate but share components
- Avoid duplicate implementations

---

## 🎯 Current User Journey Examples

### **Example 1: Managing a Renovation Unit**
1. Login → Overview dashboard
2. Sidebar → RENOVATIONS → Locations
3. Filter by property (if needed)
4. Click location (e.g., "Unit 201")
5. View task list
6. Mark tasks complete
7. Upload verification photos
8. PM verifies and marks verified

### **Example 2: Processing a Payment**
1. Login → Overview dashboard
2. Sidebar → OPERATIONS → Payments (see badge)
3. View pending payment applications
4. Click payment to review
5. Navigate to `/payments/[id]/review`
6. Review line items
7. Verify photos
8. Approve or reject

### **Example 3: Creating a Draw Request**
1. Login → Overview dashboard
2. Sidebar → FINANCIALS → Draws
3. Click "New Draw"
4. Fill out draw request
5. Add line items
6. Submit to lender

### **Example 4: Viewing Project Budget**
1. Login → Overview dashboard
2. Header → Select project from dropdown
3. Sidebar → Projects (or already on projects)
4. Click project (if not already selected)
5. Click "Budget" tab
6. View/edit budget categories

### **Example 5: Contractor Accessing Punch List**
1. Receive SMS with link
2. Click link: `/contractor-portal/[token]`
3. No login required
4. View assigned punch items
5. Update status
6. Upload photos
7. Add notes

---

## 📊 Navigation Statistics

- **Sidebar Items:** 8 main + 3 renovation + 2 financial + 2 operations = 15 total
- **Hidden Routes:** ~10 built but not linked
- **Tab-Based Views:** ~10 in main dashboard
- **Project Detail Tabs:** 9 visible, 3 hidden
- **Total Accessible Features:** ~27 via navigation
- **Total Built Features:** ~40+ including hidden

---

**This navigation structure shows a mature application with many features, but organization and discoverability need improvement. The core functionality is solid - it just needs better information architecture.**
