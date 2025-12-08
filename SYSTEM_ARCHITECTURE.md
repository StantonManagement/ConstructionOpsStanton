# ConstructionOps System Architecture

> Last Updated: December 2024

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Component Structure](#component-structure)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)
7. [Infrastructure](#infrastructure)
8. [API Reference](#api-reference)

---

## Overview

**Construction Operations Center** is a full-stack construction project management platform built on Next.js 16 with React 19, using Supabase as the backend database and authentication provider. The system follows a modern serverless architecture with edge-optimized rendering and real-time data synchronization.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   Mobile     │  │   Tablet     │          │
│  │   (Chrome)   │  │   (Safari)   │  │   (Edge)     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         └────────────┬─────┴────────────┬────┘                  │
│                      │                   │                       │
└──────────────────────┼───────────────────┼───────────────────────┘
                       │                   │
                       ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NEXT.JS APPLICATION                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    ROUTING LAYER                            │ │
│  │  • app/page.tsx (Entry Point)                              │ │
│  │  • app/payments/[id]/verify/page.tsx (Dynamic Routes)      │ │
│  │  • app/api/* (API Routes)                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  PRESENTATION LAYER                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ Auth Screen  │  │Construction  │  │ PM Dashboard │     │ │
│  │  │              │  │  Dashboard   │  │              │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   STATE MANAGEMENT LAYER                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ AuthProvider │  │ React Query  │  │ DataContext  │     │ │
│  │  │              │  │   (Primary)  │  │  (Legacy)    │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    BUSINESS LOGIC LAYER                     │ │
│  │  • Custom Hooks (useLineItemsState, useProjects, etc.)     │ │
│  │  • Validation Logic                                         │ │
│  │  • Data Transformations                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Supabase   │  │    Twilio    │  │     AWS      │          │
│  │   Client     │  │     SMS      │  │     S3       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Supabase   │  │    Twilio    │  │     AWS      │          │
│  │  PostgreSQL  │  │   Platform   │  │   Storage    │          │
│  │  + Auth      │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Stack

```
┌─────────────────────────────────────────┐
│         FRONTEND ARCHITECTURE           │
├─────────────────────────────────────────┤
│  Framework: Next.js 16                  │
│  React: 19 (with Server Components)     │
│  TypeScript: ^5.0                       │
│  Build Tool: Turbopack (dev)            │
├─────────────────────────────────────────┤
│  UI Layer:                              │
│  • Tailwind CSS (styling)               │
│  • Radix UI (component primitives)      │
│  • Lucide React (icons)                 │
│  • @dnd-kit (drag-and-drop)             │
├─────────────────────────────────────────┤
│  State Management:                      │
│  • @tanstack/react-query (v5)           │
│  • React Context (auth, legacy)         │
│  • Custom Hooks                         │
├─────────────────────────────────────────┤
│  Form Handling:                         │
│  • Controlled Components                │
│  • Custom Validation                    │
│  • Optimistic Updates                   │
└─────────────────────────────────────────┘
```

### Backend Stack

```
┌─────────────────────────────────────────┐
│          BACKEND ARCHITECTURE           │
├─────────────────────────────────────────┤
│  Runtime: Next.js API Routes            │
│  Database: Supabase (PostgreSQL 15)     │
│  Auth: Supabase Auth (JWT)              │
├─────────────────────────────────────────┤
│  External Services:                     │
│  • AWS S3 (file storage)                │
│  • Twilio (SMS/voice)                   │
│  • pdf-lib (PDF generation)             │
│  • OpenAI API (AI features)             │
└─────────────────────────────────────────┘
```

---

## Architecture Layers

### 1. Routing Layer

**Next.js App Router** handles all routing with file-based conventions:

```
app/
├── page.tsx                          # Entry point (role-based routing)
├── layout.tsx                        # Root layout (providers)
├── payments/
│   └── [id]/
│       └── verify/
│           └── page.tsx              # Payment verification page
├── pm-dashboard/
│   └── page.tsx                      # PM dashboard route
└── api/                              # API routes
    ├── users/
    │   └── route.ts                  # User management
    ├── payments/
    │   ├── [id]/
    │   │   ├── approve/route.ts      # Payment approval
    │   │   └── reject/route.ts       # Payment rejection
    │   └── route.ts                  # Payment CRUD
    ├── projects/
    │   └── route.ts                  # Project operations
    └── sms/
        └── webhook/route.ts          # Twilio webhook handler
```

### 2. Presentation Layer

**Component Hierarchy:**

```
AuthProvider (Session + Role)
└── ReactQueryProvider (Data Cache)
    └── DataProvider (Legacy Context - being phased out)
        ├── ConstructionDashboard (Admin/Staff)
        │   ├── Header
        │   ├── Navigation
        │   └── View Components
        │       ├── OverviewView
        │       ├── ProjectsView
        │       ├── PaymentApplicationsView
        │       ├── PaymentProcessingView
        │       ├── SubcontractorSelectionView
        │       ├── SubcontractorsView
        │       ├── ManageView
        │       ├── DailyLogsView
        │       ├── ComplianceView
        │       ├── MetricsView
        │       └── UserManagementView
        │
        └── PMDashboard (Project Manager)
            ├── Header
            ├── TabNavigation
            └── Content Views
                ├── Payment Applications List
                ├── Projects Overview
                └── Daily Log Requests
```

### 3. State Management Layer

**Modern Architecture (React Query):**

```typescript
// Query Hooks (Read Operations)
hooks/queries/
├── useProjects.ts        // Fetch all projects
├── useContractors.ts     // Fetch all contractors
├── useContracts.ts       // Fetch all contracts
└── usePaymentApplications.ts

// Mutation Hooks (Write Operations)
hooks/mutations/
├── useProjectMutations.ts     // Create/Update/Delete projects
├── useContractorMutations.ts  // Create/Update/Delete contractors
└── useContractMutations.ts    // Create/Update/Delete contracts

// Custom Business Logic Hooks
hooks/
└── useLineItemsState.ts       // Line item management with undo/redo
```

**Legacy Architecture (DataContext) - Being Phased Out:**

```typescript
DataContext
├── State: { projects, contractors, contracts, paymentApplications, loading }
├── Actions: { ADD_PROJECT, UPDATE_PROJECT, DELETE_PROJECT, ... }
└── Methods: { refreshData, addProject, updateProject, ... }
```

### 4. Authentication & Authorization

```
┌──────────────────────────────────────────────┐
│         AUTHENTICATION FLOW                   │
└──────────────────────────────────────────────┘
                     │
                     ▼
         ┌────────────────────┐
         │   AuthProvider     │
         │  (Session + Role)  │
         └─────────┬──────────┘
                   │
                   ▼
     ┌─────────────┴─────────────┐
     │                           │
     ▼                           ▼
┌──────────┐              ┌──────────┐
│   User   │              │   Role   │
│ Session  │              │  admin   │
│  (JWT)   │              │   pm     │
└──────────┘              │  staff   │
                          └──────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Role-Based Routing  │
                    └───────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────┐     ┌──────────┐
        │  Admin   │      │    PM    │     │  Staff   │
        │Dashboard │      │Dashboard │     │Dashboard │
        └──────────┘      └──────────┘     └──────────┘
```

**Role Permissions Matrix:**

| Feature | Admin | PM | Staff |
|---------|-------|----|----- ---|
| View Projects | ✅ | ✅ | ✅ |
| Create/Edit Projects | ✅ | ❌ | ❌ |
| Delete Projects | ✅ | ❌ | ❌ |
| View Payment Apps | ✅ | ✅ | ✅ |
| Approve Payments | ✅ | ✅ | ❌ |
| Create Contracts | ✅ | ❌ | ❌ |
| Edit Contracts | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| View Metrics | ✅ | ✅ | ✅ |
| Daily Logs | ✅ | ✅ | ❌ |

---

## Component Structure

### Core Component Patterns

**1. View Components** (Tab Content)
```typescript
interface ViewProps {
  searchQuery?: string;
  onProjectSelect?: (project: Project) => void;
}

// Pattern: Lazy-loaded, self-contained views
const ProjectsView: React.FC<ViewProps> = ({ searchQuery }) => {
  const { data: projects, isLoading, error } = useProjects();
  // View logic...
};
```

**2. Modal Components** (CRUD Operations)
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: T;
  onSave: (data: T) => void;
}

// Pattern: Controlled modals with form state
const AddContractModal: React.FC<ModalProps> = ({ isOpen, onClose, initialData }) => {
  const [formData, setFormData] = useState(initialData || {});
  // Modal logic...
};
```

**3. Custom Hooks** (Business Logic)
```typescript
// Pattern: Encapsulate complex state logic
const useLineItemsState = (initialItems) => {
  const [items, setItems] = useState(initialItems);
  const [history, setHistory] = useState([]);
  
  return {
    items,
    addItem,
    updateItem,
    deleteItems,
    undo,
    canUndo,
    totalScheduledValue,
    hasEmptyRows
  };
};
```

### Component File Structure

```
src/
├── app/
│   ├── components/          # Feature components
│   │   ├── __tests__/       # Component tests
│   │   ├── OverviewView.tsx
│   │   ├── ProjectsView.tsx
│   │   ├── ManageView.tsx
│   │   └── ...
│   ├── context/            # Legacy context (being phased out)
│   │   └── DataContext.tsx
│   └── layout.tsx          # Root layout with providers
│
├── hooks/
│   ├── queries/            # React Query read hooks
│   │   ├── useProjects.ts
│   │   ├── useContractors.ts
│   │   └── useContracts.ts
│   ├── mutations/          # React Query write hooks
│   │   ├── useProjectMutations.ts
│   │   └── useContractorMutations.ts
│   └── useLineItemsState.ts # Custom business logic
│
├── providers/
│   ├── AuthProvider.tsx    # Authentication provider
│   └── ReactQueryProvider.tsx
│
├── lib/
│   ├── supabaseClient.ts   # Supabase client config
│   └── queryClient.ts      # React Query config
│
└── components/             # Shared UI components
    ├── ActionButton.tsx
    └── LoadingStates.tsx
```

---

## Data Flow

### Read Operations (React Query)

```
┌──────────────┐
│  Component   │
└──────┬───────┘
       │ useProjects()
       ▼
┌──────────────┐
│ React Query  │ ← Cache check
│   Hook       │
└──────┬───────┘
       │ Cache miss
       ▼
┌──────────────┐
│  Supabase    │ ← Database query
│   Client     │
└──────┬───────┘
       │ Response
       ▼
┌──────────────┐
│ React Query  │ ← Update cache
│   Cache      │
└──────┬───────┘
       │ Return data
       ▼
┌──────────────┐
│  Component   │ ← Re-render
│   Updates    │
└──────────────┘
```

### Write Operations (Optimistic Updates)

```
┌──────────────┐
│ User Action  │ (Click "Save")
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Component   │ ← Call mutation
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Optimistic UI │ ← Update UI immediately
│   Update     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Supabase    │ ← Send to database
│   Mutation   │
└──────┬───────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
Success   Error
   │        │
   │        ▼
   │   ┌──────────┐
   │   │ Rollback │ ← Revert UI changes
   │   │    UI    │
   │   └──────────┘
   │
   ▼
┌──────────────┐
│ Invalidate   │ ← Refetch data
│   Queries    │
└──────────────┘
```

### Payment Application Flow

```
┌─────────────────┐
│ Contractor SMS  │
│  "Start Pay"    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Twilio Webhook  │ ← /api/sms/webhook
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create PayApp  │ ← Database insert
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   SMS Dialog    │ ← Line item questions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PM Dashboard   │ ← Shows "Submitted"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Verify Page     │ ← PM reviews & edits
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Approve/Reject  │ ← Final decision
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate PDF    │ ← G-703 form
│ Update Status   │
└─────────────────┘
```

---

## Security Architecture

### Authentication Flow

```typescript
// 1. User logs in via AuthScreen
await supabase.auth.signInWithPassword({ email, password });

// 2. Supabase returns JWT token
// Token stored in httpOnly cookie automatically

// 3. AuthProvider fetches user role
const { data } = await supabase
  .from('user_role')
  .select('role')
  .eq('user_id', userId)
  .single();

// 4. Role-based routing
if (role === 'pm') return <PMDashboard />;
else return <ConstructionDashboard />;
```

### Row Level Security (RLS)

**Projects Table:**
```sql
-- Users can only see projects they have access to
CREATE POLICY "Users can view their projects"
ON projects FOR SELECT
USING (
  id IN (
    SELECT project_id FROM user_project_access
    WHERE user_id = auth.uid()
  )
);
```

**Payment Applications Table:**
```sql
-- Only admins and PMs can approve payments
CREATE POLICY "Admins and PMs can approve"
ON payment_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'pm')
  )
);
```

### API Route Security

```typescript
// Pattern: Verify session on every API call
export async function POST(request: Request) {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Verify role for admin-only operations
  const { data: roleData } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (roleData?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Proceed with operation...
}
```

---

## Infrastructure

### Development Environment

```
┌──────────────────────────────────────┐
│      LOCAL DEVELOPMENT                │
├──────────────────────────────────────┤
│  • npm run dev (Turbopack)            │
│  • Hot Module Replacement             │
│  • Local Supabase connection          │
│  • Environment: .env.local            │
└──────────────────────────────────────┘
```

### Production Environment (Railway)

```
┌──────────────────────────────────────┐
│      RAILWAY DEPLOYMENT               │
├──────────────────────────────────────┤
│  Build:                               │
│  • npm run build                      │
│  • Next.js optimized build            │
│  • Static asset optimization          │
│                                       │
│  Runtime:                             │
│  • npm run start                      │
│  • Node.js server                     │
│  • Port 8080                          │
│                                       │
│  Environment Variables:               │
│  • NEXT_PUBLIC_SUPABASE_URL           │
│  • NEXT_PUBLIC_SUPABASE_ANON_KEY      │
│  • SUPABASE_SERVICE_ROLE_KEY          │
│  • TWILIO_*                           │
│  • AWS S3 credentials                 │
└──────────────────────────────────────┘
```

### Performance Optimizations

**Bundle Optimization:**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'lucide-react',
    ],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      cacheGroups: {
        supabase: { name: 'supabase', chunks: 'all' },
        radix: { name: 'radix', chunks: 'all' },
      },
    };
    return config;
  },
};
```

**React Query Caching:**
```typescript
// Default cache times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,      // 30 seconds
      cacheTime: 300000,     // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

**Lazy Loading:**
```typescript
// Tab components are lazy-loaded
const ProjectsView = React.lazy(() => import('./ProjectsView'));
const PaymentApplicationsView = React.lazy(() => import('./PaymentApplicationsView'));
```

---

## Migration Strategy

### Current State (Hybrid)
- ✅ AuthProvider (React Query for auth)
- ✅ ManageView (React Query for data)
- ⚠️ Other views still use DataContext
- ⚠️ DataContext wraps ConstructionDashboard

### Target State (Full React Query)
```
AuthProvider
└── ReactQueryProvider
    └── ConstructionDashboard
        └── All views use React Query hooks
```

**Migration Checklist:**
- [x] Create AuthProvider
- [x] Create React Query hooks for projects, contractors, contracts
- [x] Migrate ManageView to React Query
- [ ] Migrate ProjectsView
- [ ] Migrate PaymentApplicationsView
- [ ] Migrate OverviewView
- [ ] Remove DataContext
- [ ] Update all imports

---

## Monitoring & Logging

### Client-Side Logging
```typescript
// Console logs for development
console.log('[Auth] User role:', role);
console.log('[ManageView] Fetching contracts...');

// Error tracking (production)
if (error) {
  console.error('[Component] Error:', error);
  // TODO: Send to error tracking service (Sentry, etc.)
}
```

### Server-Side Logging
```typescript
// API route logging
console.log(`[API] POST /api/payments - User: ${session.user.id}`);
console.error(`[API] Error processing payment:`, error);
```

### Performance Monitoring
- React DevTools Profiler
- Next.js Analytics (if enabled)
- Supabase Dashboard (query performance)
- Railway Metrics (CPU, memory, response times)

---

## File Upload Architecture

```
┌──────────────┐
│   Browser    │ ← User selects file
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  API Route   │ ← /api/upload
│  (presigned) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   AWS S3     │ ← Direct upload
│   Bucket     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Database    │ ← Save URL reference
│  (Supabase)  │
└──────────────┘
```

---

## SMS Integration Architecture

```
┌──────────────┐
│ Contractor   │ ← Sends SMS
│   Phone      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Twilio     │ ← Receives SMS
│   Platform   │
└──────┬───────┘
       │ Webhook
       ▼
┌──────────────┐
│ /api/sms/    │ ← Process message
│  webhook     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Database    │ ← Update conversation
│  (Supabase)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Twilio     │ ← Send response
│   Reply      │
└──────────────┘
```

---

## Deployment Architecture

### Railway Configuration

```yaml
# railway.toml
[build]
  builder = "NIXPACKS"
  buildCommand = "npm run build"

[deploy]
  startCommand = "npm run start"
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 10

[env]
  PORT = "8080"
  NODE_ENV = "production"
```

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Twilio
TWILIO_ACCOUNT_SID=ACxxx...
TWILIO_AUTH_TOKEN=xxx...
TWILIO_PHONE_NUMBER=+1xxx...

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=xxx

# Other
OPENAI_API_KEY=sk-xxx...
SECRET_KEY=xxx...
```

---

## API Reference

### Dashboard APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/summary` | GET | Dashboard stats (needs approval, pending, overdue) |
| `/api/dashboard/queue` | GET | Action queue items (urgent, needs review, ready to pay) |
| `/api/dashboard/activity` | GET | Recent activity feed |

### Project APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET/POST | List/create projects |
| `/api/projects/[id]` | GET/PUT/DELETE | Project CRUD |
| `/api/projects/[id]/summary` | GET | Project summary with budget stats |
| `/api/projects/[id]/contractors/with-payments` | GET | Contractors with payment status |

### Payment APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payment-applications/list` | POST | List payment applications with filters |
| `/api/payment-applications/[id]` | GET/PATCH | Payment application CRUD |
| `/api/payments/[id]/update-percentage` | POST | Update line item percentages |

### Contractor APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contractors` | GET/POST | List/create contractors |
| `/api/contractors/[id]` | GET/PUT/DELETE | Contractor CRUD |

### Change Order APIs
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/change-orders` | GET/POST | List/create change orders |
| `/api/change-orders/[id]` | GET/PATCH/DELETE | Change order CRUD |

---

## Summary

This architecture provides:
- ✅ **Scalability**: Serverless architecture with edge optimization
- ✅ **Performance**: React Query caching, lazy loading, optimistic updates
- ✅ **Security**: JWT authentication, RLS policies, role-based access
- ✅ **Maintainability**: Clear separation of concerns, custom hooks, TypeScript
- ✅ **Developer Experience**: Hot reload, TypeScript, comprehensive logging
- ✅ **Production Ready**: Deployed on Railway with monitoring and error handling

**Key Architectural Decisions:**
1. **React Query over custom context** for better caching and performance
2. **Supabase** for database + auth in one platform
3. **Next.js App Router** for modern routing and Server Components
4. **TypeScript** for type safety
5. **Tailwind + Radix** for consistent, accessible UI
6. **Optimistic updates** for better UX

