# Construction Ops Stanton - System Architecture & Wireframe

## 📐 System Overview

**Construction Ops Stanton** is a construction project management system built with Next.js 14 (App Router), React, TypeScript, Supabase (PostgreSQL), and TanStack Query.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 App Router (React 18 + TypeScript)                 │
│  ├── App Layout (Sidebar Navigation)                            │
│  ├── Pages (with Suspense & Lazy Loading)                       │
│  ├── Components (Native HTML + Tailwind CSS)                    │
│  └── State Management (TanStack Query + React Context)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Next.js API Routes)              │
├─────────────────────────────────────────────────────────────────┤
│  /api/*  - Server-side API endpoints                            │
│  └── Handles business logic, validation, and DB queries         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATABASE (Supabase/PostgreSQL)                │
├─────────────────────────────────────────────────────────────────┤
│  ├── Projects, Locations, Tasks                                 │
│  ├── Contractors, Contracts                                     │
│  ├── Portfolios, Funding Sources                                │
│  ├── Payments, Draws, Cash Flow                                 │
│  ├── Users, Permissions                                         │
│  └── Audit Logs                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Application Structure

### Navigation Hierarchy

```
┌────────────────────────────────────────────────────────────────┐
│  SIDEBAR NAVIGATION (AppLayout)                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🏠 Dashboard                                                   │
│     └── Overview metrics, charts, recent activity              │
│                                                                 │
│  📁 Projects                                                    │
│     ├── Project List (grid/table view)                         │
│     └── Project Detail                                         │
│         ├── Overview Tab                                       │
│         ├── Locations Tab                                      │
│         ├── Contractors Tab                                    │
│         ├── Cash Flow Tab                                      │
│         ├── Documents Tab                                      │
│         └── Photos Tab                                         │
│                                                                 │
│  👷 Contractors                                                 │
│     ├── Contractor List                                        │
│     └── Contractor Detail (with contracts, payments)           │
│                                                                 │
│  📍 Locations                                                   │
│     ├── Location List (filterable, grid/list view)             │
│     └── Location Detail                                        │
│         ├── Tasks & Progress                                   │
│         ├── Verification Status                                │
│         └── Blocking Issues                                    │
│                                                                 │
│  💰 Payments                                                    │
│     ├── Payment Applications List                              │
│     └── Payment Detail                                         │
│         ├── Review & Approve                                   │
│         └── Verify Line Items                                  │
│                                                                 │
│  💵 Cash Position                                               │
│     └── Available funds by portfolio & funding source          │
│                                                                 │
│  💸 Cash Flow                                                   │
│     ├── Cash Flow Dashboard                                    │
│     ├── Forecast View                                          │
│     └── Draw Eligibility                                       │
│                                                                 │
│  📊 Draws                                                       │
│     ├── Draw List                                              │
│     ├── Create New Draw                                        │
│     └── Draw Detail                                            │
│                                                                 │
│  🏢 Portfolios                                                  │
│     ├── Portfolio List                                         │
│     └── Portfolio Detail                                       │
│         ├── Funding Sources                                    │
│         └── Projects                                           │
│                                                                 │
│  💼 Funding Sources                                             │
│     ├── Funding Source List (by portfolio)                     │
│     └── Funding Source Detail                                  │
│                                                                 │
│  🏗️ Renovations                                                 │
│     ├── Portfolio Overview                                     │
│     ├── Locations (renovations-specific)                       │
│     ├── Draws (renovations-specific)                           │
│     └── Templates (scope templates)                            │
│                                                                 │
│  📈 Reports                                                     │
│     ├── Blocking Items Report                                  │
│     └── Trade Report                                           │
│                                                                 │
│  ⚙️ Settings                                                    │
│     ├── Users Tab                                              │
│     ├── Permissions Tab                                        │
│     ├── Entities Tab                                           │
│     ├── Company Tab                                            │
│     ├── Integrations Tab                                       │
│     ├── Preferences Tab                                        │
│     └── Schedule Defaults Tab                                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Component Structure

### Standard Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌────────────┐  ┌────────────────────────────────────────────┐ │
│  │            │  │                                            │ │
│  │  SIDEBAR   │  │  PAGE CONTAINER                            │ │
│  │            │  │  ┌──────────────────────────────────────┐  │ │
│  │  - Logo    │  │  │  HEADER                              │  │ │
│  │  - Nav     │  │  │  ├── Title (text-xl)                 │  │ │
│  │    Links   │  │  │  ├── Subtitle (text-xs)              │  │ │
│  │            │  │  │  └── Actions (buttons, filters)      │  │ │
│  │  - User    │  │  └──────────────────────────────────────┘  │ │
│  │    Menu    │  │                                            │ │
│  │            │  │  ┌──────────────────────────────────────┐  │ │
│  │            │  │  │  CONTENT AREA                        │  │ │
│  │            │  │  │                                      │  │ │
│  │            │  │  │  - Filters/Search (compact)          │  │ │
│  │            │  │  │  - Data Grid/List                    │  │ │
│  │            │  │  │    (4-col on xl, 3-col on lg,        │  │ │
│  │            │  │  │     2-col on md, 1-col on mobile)    │  │ │
│  │            │  │  │                                      │  │ │
│  │            │  │  │  - Cards (p-3, compact)              │  │ │
│  │            │  │  │  - Forms (text-xs inputs)            │  │ │
│  │            │  │  │                                      │  │ │
│  │            │  │  └──────────────────────────────────────┘  │ │
│  │            │  │                                            │ │
│  │            │  │  ┌──────────────────────────────────────┐  │ │
│  │            │  │  │  FOOTER (optional)                   │  │ │
│  │            │  │  │  - Audit Log (collapsible)           │  │ │
│  │            │  │  │  - Pagination                        │  │ │
│  │            │  │  └──────────────────────────────────────┘  │ │
│  │            │  │                                            │ │
│  └────────────┘  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
<AppLayout>                         // Provides sidebar navigation
  <PageContainer>                   // Consistent spacing (p-4 sm:p-6)
    <Suspense fallback={<Loader>}>  // Lazy loading boundary
      <PageContent>                 // Actual page content
        <Header>                    // Page title + actions
        <Filters>                   // Search, dropdowns, toggles
        <DataDisplay>               // Grid/List of items
        <Footer>                    // Pagination, audit log
      </PageContent>
    </Suspense>
  </PageContainer>
</AppLayout>
```

---

## 🔄 Data Flow Architecture

### Request Flow

```
USER ACTION (Click, Submit, etc.)
    │
    ▼
COMPONENT EVENT HANDLER
    │
    ▼
TANSTACK QUERY MUTATION/QUERY
    │
    ├── useMutation (for writes: POST, PUT, DELETE)
    │   └── Optimistic updates
    │
    └── useQuery (for reads: GET)
        └── Automatic caching & revalidation
    │
    ▼
SUPABASE CLIENT
    │
    ├── Direct queries (SELECT)
    │   └── With RLS (Row Level Security)
    │
    └── API Routes (/api/*)
        └── Server-side business logic
    │
    ▼
POSTGRESQL DATABASE
    │
    ├── Tables (normalized schema)
    ├── Views (for complex queries)
    ├── Functions (stored procedures)
    ├── Triggers (audit logs, validations)
    └── RLS Policies (security)
    │
    ▼
RESPONSE BACK TO CLIENT
    │
    ▼
TANSTACK QUERY CACHE UPDATE
    │
    ▼
REACT RE-RENDER (Optimized)
    │
    ▼
UI UPDATED
```

### State Management

```
┌─────────────────────────────────────────┐
│  GLOBAL STATE (React Context)          │
├─────────────────────────────────────────┤
│  - AuthProvider (user, role)            │
│  - DataProvider (projects, contractors) │
│  - PortfolioContext (selected portfolio)│
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  SERVER STATE (TanStack Query)         │
├─────────────────────────────────────────┤
│  - useProjects()                        │
│  - useContractors()                     │
│  - useLocations()                       │
│  - usePayments()                        │
│  - useCashPosition()                    │
│  - etc... (30+ hooks)                   │
│                                         │
│  Features:                              │
│  ✓ Automatic caching                   │
│  ✓ Background refetching                │
│  ✓ Optimistic updates                   │
│  ✓ Request deduplication                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  LOCAL STATE (useState/useReducer)     │
├─────────────────────────────────────────┤
│  - Form inputs                          │
│  - UI state (modals, filters)           │
│  - Temporary selections                 │
└─────────────────────────────────────────┘
```

---

## 🗄️ Database Schema (Core Tables)

```
┌──────────────┐
│   USERS      │
│──────────────│
│ id (PK)      │
│ email        │
│ role         │
│ created_at   │
└──────────────┘
       │
       │ has many
       ▼
┌──────────────────┐       ┌──────────────────┐
│   PORTFOLIOS     │───────│  FUNDING_SOURCES │
│──────────────────│       │──────────────────│
│ id (PK)          │       │ id (PK)          │
│ name             │       │ portfolio_id (FK)│
│ code             │       │ type             │
│ is_active        │       │ commitment_amt   │
└──────────────────┘       │ drawn_amt        │
       │                   └──────────────────┘
       │ has many
       ▼
┌──────────────────┐       ┌──────────────────┐
│    PROJECTS      │───────│   CONTRACTORS    │
│──────────────────│  M:M  │──────────────────│
│ id (PK)          │       │ id (PK)          │
│ portfolio_id(FK) │       │ name             │
│ name             │       │ company_name     │
│ address          │       │ email            │
│ status           │       │ phone            │
│ budget           │       └──────────────────┘
└──────────────────┘              │
       │                          │
       │ has many                 │ has many
       ▼                          ▼
┌──────────────────┐       ┌──────────────────┐
│   LOCATIONS      │       │    CONTRACTS     │
│──────────────────│       │──────────────────│
│ id (PK)          │       │ id (PK)          │
│ project_id (FK)  │       │ project_id (FK)  │
│ name             │       │ contractor_id(FK)│
│ type (unit/area) │       │ amount           │
│ status           │       │ status           │
│ is_blocked       │       └──────────────────┘
│ blocked_reason   │              │
└──────────────────┘              │ has many
       │                          ▼
       │ has many          ┌──────────────────┐
       ▼                   │    PAYMENTS      │
┌──────────────────┐       │──────────────────│
│      TASKS       │       │ id (PK)          │
│──────────────────│       │ contract_id (FK) │
│ id (PK)          │       │ amount           │
│ location_id (FK) │       │ status           │
│ name             │       │ verified_at      │
│ cost             │       │ approved_at      │
│ status           │       └──────────────────┘
│ verified_at      │
└──────────────────┘
       │
       │ tracked in
       ▼
┌──────────────────┐
│      DRAWS       │
│──────────────────│
│ id (PK)          │
│ project_id (FK)  │
│ status           │
│ total_amount     │
│ requested_at     │
└──────────────────┘
       │
       │ contains
       ▼
┌──────────────────┐
│  DRAW_LINE_ITEMS │
│──────────────────│
│ id (PK)          │
│ draw_id (FK)     │
│ task_id (FK)     │
│ amount           │
└──────────────────┘

┌──────────────────┐
│   AUDIT_LOGS     │
│──────────────────│
│ id (PK)          │
│ user_id (FK)     │
│ action           │
│ entity_type      │
│ entity_id        │
│ changes (JSONB)  │
│ created_at       │
└──────────────────┘
```

---

## 🔐 Authentication & Authorization

```
USER LOGIN
    │
    ▼
SUPABASE AUTH
    │
    ├── Email/Password
    ├── Magic Link
    └── OAuth (if configured)
    │
    ▼
JWT TOKEN ISSUED
    │
    ▼
STORED IN:
    ├── HTTP-only cookie (secure)
    └── localStorage (session data)
    │
    ▼
ROLE-BASED ACCESS CONTROL (RBAC)
    │
    ├── admin       → Full access
    ├── manager     → Project management
    ├── contractor  → Limited to assigned work
    └── viewer      → Read-only access
    │
    ▼
ROW-LEVEL SECURITY (RLS)
    │
    └── Database policies enforce access at row level
```

### Permission Check Flow

```tsx
// In Component
const { user, role } = useAuth();

// Client-side check (UI only)
if (hasRoleAccess(role, 'admin')) {
  // Show admin features
}

// Server-side check (API Route)
const userId = getUserFromRequest();
if (!canAccessResource(userId, resourceId)) {
  return 403 Forbidden;
}

// Database-level check (RLS Policy)
CREATE POLICY "users_select_own" ON projects
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM project_members WHERE project_id = id)
  );
```

---

## 📦 Key Technologies & Libraries

### Frontend
- **Next.js 14** - App Router (React Server Components)
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **TanStack Query v5** - Server state management
- **Lucide React** - Icon library
- **date-fns** - Date manipulation

### Backend
- **Next.js API Routes** - Server-side endpoints
- **Supabase Client** - Database client
- **PostgreSQL** - Relational database

### Development
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git** - Version control

---

## 🎯 Core Features & User Flows

### 1. Project Management Flow

```
CREATE PROJECT
    │
    ▼
ADD LOCATIONS (units/areas)
    │
    ▼
ASSIGN CONTRACTORS
    │
    ▼
CREATE TASKS per Location
    │
    ▼
CONTRACTORS COMPLETE WORK
    │
    ▼
VERIFY TASKS (site visit/photos)
    │
    ▼
REQUEST DRAW
    │
    ▼
SUBMIT PAYMENT APPLICATION
    │
    ▼
REVIEW & APPROVE
    │
    ▼
PROCESS PAYMENT
```

### 2. Cash Flow Management

```
SETUP FUNDING SOURCES
    │
    ├── Loans
    ├── Grants
    └── Equity
    │
    ▼
ASSIGN TO PORTFOLIOS
    │
    ▼
TRACK DRAWS AGAINST FUNDING
    │
    ├── Commitment Amount
    ├── Drawn Amount
    └── Remaining Available
    │
    ▼
FORECAST FUTURE NEEDS
    │
    └── Based on project schedules & task completion
```

### 3. Payment Application Flow

```
CONTRACTOR SUBMITS PAYMENT APP
    │
    ▼
PROJECT MANAGER REVIEWS
    │
    ├── Line Items
    ├── Supporting Documents
    └── Verification Status
    │
    ▼
VERIFY EACH LINE ITEM
    │
    └── Match to completed tasks
    │
    ▼
APPROVE/REJECT
    │
    ├── Approved → Schedule Payment
    └── Rejected → Send Back with Notes
    │
    ▼
PROCESS PAYMENT
    │
    └── Update funding source balances
```

---

## 🚀 Performance Optimizations

### Implemented
- ✅ React Suspense for code splitting
- ✅ TanStack Query caching (5min stale time)
- ✅ Optimistic updates for mutations
- ✅ Debounced search inputs
- ✅ Virtual scrolling for long lists
- ✅ Image optimization (Next.js Image component)
- ✅ Lazy loading of components
- ✅ Memoization of expensive calculations

### Responsive Design
- ✅ Mobile-first approach
- ✅ Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- ✅ Touch-friendly UI elements
- ✅ Collapsible sidebar on mobile
- ✅ Adaptive grid layouts (1→2→3→4 columns)

---

## 📊 Monitoring & Logging

```
CLIENT-SIDE
    │
    ├── Console errors captured
    ├── React Error Boundaries
    └── Network request tracking
    │
    ▼
SERVER-SIDE
    │
    ├── API route logs
    ├── Database query logs
    └── Error tracking
    │
    ▼
DATABASE
    │
    └── Audit Logs table
        ├── All CRUD operations
        ├── User attribution
        ├── Change tracking (JSONB)
        └── Timestamp + IP address
```

---

## 🔧 Development Workflow

```
LOCAL DEVELOPMENT
    │
    ├── npm run dev (localhost:3000)
    ├── Hot reload enabled
    └── Supabase local or cloud instance
    │
    ▼
GIT WORKFLOW
    │
    ├── Feature branches
    ├── Pull requests
    └── Code review
    │
    ▼
DEPLOYMENT
    │
    └── Vercel (automatic on push to main)
        ├── Build optimization
        ├── CDN distribution
        └── Automatic HTTPS
```

---

## 📱 Mobile Responsiveness

```
BREAKPOINT BEHAVIOR:

Mobile (< 640px)
    ├── Hamburger menu (collapsed sidebar)
    ├── Single column layout
    ├── Stacked cards
    └── Full-width modals

Tablet (640px - 1024px)
    ├── Collapsible sidebar
    ├── 2-column grid
    ├── Hybrid touch/mouse UI
    └── Responsive tables

Desktop (1024px+)
    ├── Persistent sidebar
    ├── 3-4 column grid
    ├── Hover states
    └── Keyboard shortcuts

Large Screen (1280px+)
    ├── 4-column grid
    ├── Side-by-side panels
    └── Maximum content density
```

---

## 🎨 Design System

### Colors
- **Primary**: Blue (#3B82F6) - Actions, links
- **Success**: Green (#10B981) - Completed, verified
- **Warning**: Amber (#F59E0B) - Blocked, pending
- **Danger**: Red (#EF4444) - Errors, rejected
- **Gray Scale**: Gray-50 to Gray-900 - UI elements

### Typography
- **Headers**: text-xl (20px), font-bold
- **Subheaders**: text-sm (14px), font-semibold
- **Body**: text-xs (12px), font-normal
- **Labels**: text-xs (12px), font-medium
- **Captions**: text-[10px], font-normal

### Spacing Scale
- xs: 0.5rem (8px)
- sm: 0.75rem (12px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)

### Component Sizes
- **Buttons**: px-3 py-1.5 text-xs
- **Inputs**: px-2 py-1.5 text-xs
- **Cards**: p-3, rounded-lg
- **Icons**: w-3 h-3 (12px) or w-4 h-4 (16px)
- **Borders**: 1px solid gray-200

---

## 🗺️ File Structure

```
src/
├── app/
│   ├── (dashboard)/          # Dashboard routes
│   │   ├── backlog/
│   │   ├── cash-position/
│   │   ├── funding-sources/
│   │   └── portfolios/
│   ├── auth/                 # Authentication pages
│   ├── api/                  # API routes
│   ├── projects/             # Projects section
│   ├── contractors/          # Contractors section
│   ├── locations/            # Locations section
│   ├── payments/             # Payments section
│   ├── draws/                # Draws section
│   ├── cash-flow/            # Cash flow section
│   ├── renovations/          # Renovations section
│   ├── reports/              # Reports section
│   ├── settings/             # Settings page
│   ├── components/           # Shared components
│   │   ├── AppLayout.tsx     # Main layout with sidebar
│   │   ├── PageContainer.tsx # Page wrapper
│   │   ├── AuditLog.tsx      # Audit log component
│   │   └── ...               # Other components
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home/dashboard page
├── components/               # Reusable UI components
│   └── ui/                   # Base UI components
├── hooks/                    # Custom React hooks
│   └── queries/              # TanStack Query hooks
│       ├── useProjects.ts
│       ├── useContractors.ts
│       └── ...
├── lib/                      # Utility functions
│   ├── supabase.ts           # Supabase client
│   ├── permissions.ts        # Permission helpers
│   └── theme.ts              # Theme utilities
├── providers/                # React context providers
│   ├── AuthProvider.tsx      # Auth context
│   └── DataProvider.tsx      # Data context
├── types/                    # TypeScript types
│   └── schema.ts             # Database types
└── styles/                   # Global styles
    └── globals.css           # Tailwind imports
```

---

## 🔄 Common User Journeys

### Journey 1: Create and Track a Project

```
1. Navigate to Projects → Click "New Project"
2. Fill in project details (name, address, budget, portfolio)
3. Submit → Project created
4. Navigate to Project Detail → Locations tab
5. Add locations (units/areas)
6. For each location, add tasks with costs
7. Assign contractors to project
8. Contractors complete work
9. Verify completed tasks
10. Track progress on dashboard
```

### Journey 2: Process a Payment Application

```
1. Navigate to Payments
2. See new payment application (status: submitted)
3. Click to open → Review line items
4. Click "Verify" → Match line items to tasks
5. Check verification status
6. Add notes if needed
7. Approve or reject payment
8. If approved → Payment scheduled
9. Funding source balance updated
10. Contractor notified
```

### Journey 3: Request a Draw

```
1. Navigate to Draws → "Create New Draw"
2. Select project
3. System shows eligible verified tasks
4. Select tasks to include
5. Review total amount
6. Add notes
7. Submit draw request
8. Draw status: draft → submitted → approved
9. Funds drawn from funding source
10. Available balance updated
```

---

## 📖 Key Concepts

### Portfolio
A collection of projects grouped for funding and reporting purposes. Each portfolio can have multiple funding sources.

### Funding Source
A loan, grant, or equity source that provides capital for projects. Tracked with commitment amount, drawn amount, and remaining balance.

### Location
A physical space within a project (unit, room, area) where work is performed. Has tasks, status, and can be blocked.

### Task
A specific scope of work item with a cost, assigned to a location. Must be verified before being eligible for payment.

### Draw
A request to pull funds from a funding source, based on verified completed work.

### Payment Application
A contractor's request for payment, submitted against a contract, includes line items matched to completed tasks.

### Verification
The process of confirming that work has been completed satisfactorily, typically with photos and site visits.

### Blocking
When a location cannot proceed due to materials, labor, cash flow, or dependency issues.

---

## 🎯 Success Metrics

- **Project Completion Rate**: % of projects completed on time
- **Payment Cycle Time**: Days from submission to approval
- **Verification Rate**: % of tasks verified within 7 days
- **Draw Efficiency**: Average days to process draw request
- **Blocking Resolution**: Average time to resolve blocking issues
- **Budget Variance**: Actual vs budgeted costs
- **Contractor Performance**: On-time completion rate

---

## 🚧 Known Limitations & Future Enhancements

### Current Limitations
- No real-time collaboration features
- Limited offline support
- Manual document management
- No automated notifications (SMS/email not fully integrated)

### Planned Enhancements
- Real-time updates with WebSockets
- Mobile app (React Native)
- Advanced reporting & analytics
- Document OCR and auto-processing
- Automated scheduling
- Contractor portal self-service
- Integration with accounting software (QuickBooks)

---

## 📞 Support & Documentation

- **TODO.md**: Development roadmap and task tracking
- **ARCHITECTURE.md**: This file - system overview
- **Code Comments**: Inline documentation in complex functions
- **Type Definitions**: TypeScript provides self-documenting types

---

## 🏁 Quick Start for New Developers

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd ConstructionOpsStanton
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Add Supabase credentials
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

6. **Study the architecture**
   - Read this file (ARCHITECTURE.md)
   - Review TODO.md for current work
   - Explore AppLayout.tsx and key components
   - Check hooks/queries/ for data fetching patterns

---

## 📚 Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **TanStack Query**: https://tanstack.com/query
- **Tailwind CSS**: https://tailwindcss.com
- **Supabase Docs**: https://supabase.com/docs

---

**Last Updated**: January 28, 2026
**Version**: 1.0
**Maintained By**: Development Team
