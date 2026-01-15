# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:ci          # Run tests for CI (no watch)
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Server-Side Rendering
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **UI Components**: Radix UI primitives with custom styling
- **Performance**: Turbopack for development, optimized webpack for production

### Core Application Structure

**Construction Project Management System** with role-based access:
- **Admin Role**: Full CRUD access, user management, system configuration
- **PM Role**: Project management focused dashboard with limited admin features
- **Staff Role**: Basic project viewing and data entry capabilities

### Key Architectural Patterns

#### 1. Context-Based State Management
- **DataContext** (`src/app/context/DataContext.tsx`): Centralized state for projects, contractors, contracts, and payment applications
- Uses React's `useReducer` for predictable state updates
- Implements optimistic updates for better UX (no full refreshes after operations)
- Has built-in loading states and error handling

#### 2. Role-Based Rendering
- Main entry point (`src/app/page.tsx`) routes users based on role:
  - PM role → `PMDashboard.tsx`
  - Admin/Staff → `ConstructionDashboard.tsx` (wrapped in DataProvider)
- Authentication state managed separately from application data

#### 3. Lazy-Loaded Tab Architecture
- **ConstructionDashboard** uses React.lazy() for code splitting
- Tab components only load when accessed
- Each major view (Projects, Payments, Manage, etc.) is a separate component

#### 4. Performance Optimizations
- **Batch Database Queries**: Uses `.in()` queries to avoid N+1 problems
- **Smart Caching**: 30-second cache on complex data fetches
- **Optimistic Updates**: Immediate UI updates followed by background sync
- **Lazy Loading**: Tab content and enhanced data only loads when needed

### Critical Components

#### ProjectsView (`src/app/components/ProjectsView.tsx`)
- Main project listing with card-based interface
- Project stats cards: Contractors, Contracts, Budget progress
- "Create Payment App" button (lines 1149-1169) initiates payment workflow
- Passes project context via URL params to PaymentsView
- Implements skeleton loading and simple fade animations

#### PaymentsView (`src/app/components/PaymentsView.tsx`)
- **Dual-mode component**: Payment applications list OR contractor selection view
- Mode determined by URL params: `?tab=payments&subtab=processing&project={id}`
- **Contractor Selection View** (lines 1462-1649):
  - Shows contractors for specific project with payment history
  - Multi-select interface with checkboxes
  - Displays contract metrics: amount, paid to date, remaining, % complete
  - "Send Payment Requests" button for SMS workflow (TODO: line 1635)
- **Payment Applications List** (default view):
  - Status-based filtering (pending_sms, submitted, approved, etc.)
  - Verification modal for PM review
  - Integration with lien waivers and check issuance
- See "Payment Application Workflow" section below for complete details

#### ManageView (`src/app/components/ManageView.tsx`)
- Unified CRUD interface for Projects, Contractors, and Contracts
- Uses optimistic updates instead of full data refreshes
- Implements tab-based lazy loading with caching

#### DataContext State Flow
```typescript
// Optimistic update pattern used throughout
dispatch({ type: 'ADD_PROJECT', payload: newProject });
// UI updates immediately, no loading screens for operations
```

#### Performance-Critical Queries
- Project enhancement queries batch-fetch all related data
- Payment applications use status-based filtering at database level
- User management API uses service role for admin operations

#### Payment Application Workflow (`src/app/components/PaymentsView.tsx`)

**Overview:**
The payment application system modernizes the traditional AIA G702/G703 construction payment process by replacing paper forms with an SMS-based workflow. The system tracks two levels of payment processing:

1. **Contractor Payment Applications** - Subcontractors requesting payment from GC (currently implemented)
2. **Loan Draw Requests** - GC requesting funds from lender (future feature)

**The Money Flow:**
```
Construction Lender
      ↓ [Loan Draw Request - GC submits]
Your Company (GC/Owner)
      ↓ [Payment Applications - contractors submit]
Subcontractors
```

**Complete Workflow:**

1. **Project Setup**
   - Contractors assigned to projects via `project_contractors` table
   - Each contractor has contract_amount and line items (Schedule of Values)
   - Contract status tracked: 'active', 'pending', 'completed'

2. **Initiate Payment Request** (ProjectsView.tsx:1149-1169)
   - PM clicks "Create Payment App" button on project card
   - System navigates with URL params: `?tab=payments&subtab=processing&project={id}`
   - Button passes project context via URL instead of prop drilling

3. **Contractor Selection View** (PaymentsView.tsx:1462-1649)
   - PaymentsView detects `projectIdFromUrl && subtab === 'processing'`
   - Conditional rendering shows contractor selection interface instead of payment apps list
   - Fetches contractors via `fetchContractorsForProject()` (lines 902-960)

   **Data Enrichment:**
   ```typescript
   // Batch query pattern to avoid N+1
   const contractorsWithPayments = await Promise.all(
     contractors.map(async (pc) => {
       // Fetch payment history for each contractor
       const payments = await supabase
         .from('payment_applications')
         .select('approved_amount, status')
         .eq('project_id', projectId)
         .eq('contractor_id', pc.contractor_id)
         .in('status', ['approved', 'check_issued']);

       // Calculate metrics
       return {
         ...pc,
         total_paid: sum(payments),
         percent_paid: (total_paid / contract_amount) * 100,
         remaining_amount: contract_amount - total_paid
       };
     })
   );
   ```

   **UI Components:**
   - Header with project name and back button
   - Grid of contractor cards (responsive: 1/2/3 columns)
   - Each card shows:
     - Checkbox for multi-select
     - Contractor name, trade, contact info
     - Contract amount, paid to date, remaining balance
     - Progress bar with completion percentage
     - Status badge (active/pending/completed)
   - "Send Payment Requests" button (disabled if none selected)
   - Skeleton loading states while data fetches
   - Empty state if no contractors assigned

4. **SMS Payment Request** (TODO - line 1635)
   ```typescript
   // Future implementation via Twilio API
   // For each selected contractor:
   //   1. Send SMS: "Highland Plaza - Rough Electrical: What % complete? (Last: 40%)"
   //   2. Contractor texts: "60"
   //   3. Webhook receives response
   //   4. Parse percentage, create payment_application record
   //   5. Status: 'pending_sms' → 'submitted'
   ```

5. **PM Verification** (Existing - Verification Modal)
   - PM reviews contractor-submitted percentages
   - Views line items with previous vs. current completion
   - Takes site photos for documentation
   - Approves or adjusts percentages
   - Status: 'submitted' → 'approved'

6. **Lien Waiver** (Existing - if payment ≥ $5,000)
   - System generates lien waiver PDF
   - Sends to contractor via DocuSign
   - Status: 'approved' → 'pending_signature' → 'signed'

7. **Check Issuance** (Existing)
   - PM marks as "Check Issued" with check number
   - Status: 'signed' → 'check_issued'
   - Payment record updated with issue_date

8. **Loan Draw Aggregation** (Future Feature)
   - System aggregates all approved payment apps
   - Generates project-level G702/G703 for lender
   - Tracks draw schedule vs. loan commitment
   - Lender releases funds → GC pays contractors

**Key Design Patterns:**

- **URL-Driven Navigation**: Uses searchParams to control view state
  - Avoids prop drilling through multiple components
  - Enables direct linking to payment processing for specific projects
  - Clean back/forward browser navigation

- **Conditional Component Rendering**: Single component handles multiple views
  ```typescript
  if (projectIdFromUrl && subtab === 'processing') {
    return <ContractorSelectionView />;
  }
  return <PaymentApplicationsList />;
  ```

- **Batch Data Fetching**: Single query fetches contractors + payment history
  - Reduces round trips to database
  - Calculates derived metrics (percent_paid, remaining) on fetch
  - Caches results in component state

- **Progressive Enhancement**:
  - Core functionality works without SMS (manual entry still possible)
  - SMS layer adds convenience, not requirement
  - Graceful fallback to traditional verification flow

**Database Tables:**
```
project_contractors: Links contractors to projects with contract terms
├─ contractor_id (FK → contractors)
├─ project_id (FK → projects)
├─ contract_amount
├─ contract_status ('active', 'pending', 'completed')
└─ line_items (JSONB - Schedule of Values)

payment_applications: Tracks payment requests and lifecycle
├─ project_id (FK → projects)
├─ contractor_id (FK → contractors)
├─ status ('pending_sms', 'submitted', 'approved', 'check_issued')
├─ submitted_amount, approved_amount
├─ submitted_percent, pm_verified_percent
├─ created_at, approved_at, check_issued_at
└─ metadata (photos, notes, change orders)
```

**Integration Points:**
- **ProjectsView** → PaymentsView: URL params with project context
- **PaymentsView** → SMS API: Twilio webhook integration (TODO)
- **PaymentsView** → PDF Generation: G702/G703 form creation
- **PaymentsView** → DocuSign: Lien waiver signing workflow

### API Architecture

#### Authentication Pattern
- Uses Supabase Auth with JWT tokens
- API routes validate tokens and check user roles
- Service role client for admin operations (`/api/users`)

#### Key API Endpoints
- `/api/users` - User management (admin only)
- `/api/payments/*` - Payment application lifecycle
- `/api/projects/*` - Project and contractor management
- `/api/sms/*` - SMS integration with Twilio

### Database Considerations

#### Performance-Critical Indexes (if not already present):
```sql
CREATE INDEX IF NOT EXISTS idx_project_contractors_project_id ON project_contractors(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_project_id ON payment_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_applications_status ON payment_applications(status);
CREATE INDEX IF NOT EXISTS idx_project_contractors_project_status ON project_contractors(project_id, contract_status);
```

### File Upload and External Integrations
- **AWS S3**: File storage for documents and images
- **Twilio SMS**: Automated notifications and responses
- **PDF Generation**: pdf-lib for lien waivers and payment documents
- **DocuSign**: Document signing integration (payment applications)

### Performance Notes

#### Avoid These Patterns:
- Full data refreshes after CRUD operations (use optimistic updates)
- N+1 queries in list views (use batch queries with `.in()`)
- Loading entire component trees on initial render (use lazy loading)

#### Current Optimizations:
- Turbopack for development builds
- Webpack code splitting for vendor libraries (Supabase, Radix UI)
- Image optimization with WebP/AVIF formats
- Bundle analysis and tree shaking

### Development Workflow

When adding new features:
1. Check if DataContext needs new actions/state
2. Use optimistic updates for immediate UI feedback
3. Implement proper error handling and rollback
4. Add to appropriate tab in ConstructionDashboard or PMDashboard
5. Consider batch queries for any list operations
6. Test role-based access controls

**For Payment Application Features:**
- Follow the URL-driven navigation pattern (see Payment Application Workflow above)
- Use conditional rendering for context-specific views
- Implement skeleton loading states for data fetching
- Calculate payment metrics (total_paid, percent_paid, remaining) during initial fetch
- Ensure status transitions follow the defined workflow: pending_sms → submitted → approved → signed → check_issued
- Reference USER_STORIES.md for complete payment processing requirements

### Testing Strategy
- Jest with jsdom environment
- Coverage reports available via `npm run test:coverage`
- Focus on critical business logic in DataContext and API routes

---

## Project Documentation

For comprehensive understanding of the Construction Operations Center system:

### Business Context & User Stories
- **[USER_STORIES.md](./USER_STORIES.md)** - Complete developer guide with:
  - Business context and workflow explanation
  - User personas and daily workflows (Dean, Alex, Field Technicians, Contractors)
  - AI Agents Architecture (3-layer foundation system)
  - Detailed user stories for all major features:
    - Payment Processing (G702+703 workflow)
    - Invoice Processing & AI Classification
    - Task & Property Management
    - Reporting & Cash Flow
  - Database schema overview
  - Business rules reference
  - GL code quick reference

### Technical Architecture Documents
- **SYSTEM_ARCHITECTURE.md** - System design and architecture patterns
- **DATABASE_SCHEMA.md** - Complete database schema documentation
- **DEPLOYMENT.md** - Deployment and infrastructure guide

### Feature & Implementation Documents
- **PROJECT_DEFINITION.md** - Project scope and requirements
- **PERFORMANCE_OPTIMIZATIONS.md** - Performance patterns and optimizations
- **PERMISSION_SYSTEM_UPDATE.md** - Permission and authorization system
- **DAILY_LOG_SETUP.md** - Daily log feature implementation
- **PM_NOTES_SETUP.md** - PM notes system setup
- **CONTRACT_MODAL_WIREFRAME.md** - Contract modal UI specifications
- **APPLICATION_WIREFRAMES.md** - Application UI wireframes
- **ACCESSIBILITY_REPORT.md** - Accessibility compliance report

### Migration & Setup Guides
- **DATABASE_SETUP_GUIDE.md** - Database setup instructions
- **ENV_SETUP.md** - Environment configuration guide
- **AUTH_USERS_MIGRATION_README.md** - Authentication migration guide
- **MULTI_SYSTEM_AUTH_README.md** - Multi-system authentication setup

### Before Implementing New Features
1. **Start with USER_STORIES.md** - Understand the business context, user workflows, and specific user story requirements
2. Review relevant technical architecture in SYSTEM_ARCHITECTURE.md
3. Check DATABASE_SCHEMA.md for data model requirements
4. Follow established patterns documented in this CLAUDE.md
5. Verify database schema compatibility and create migrations if needed
6. Test role-based access controls (Admin, PM, Staff roles)