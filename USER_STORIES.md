# Construction Operations Center - Developer Guide & User Stories

> **For**: New Developer Onboarding
> **Project**: Construction Operations Center (COC)
> **Company**: Stanton Capital
> **Last Updated**: January 2026

---

## Table of Contents

1. [Project Purpose & Business Context](#project-purpose--business-context)
2. [Who Uses This System](#who-uses-this-system)
3. [AI Agents Architecture](#ai-agents-architecture)
4. [Technical Stack & Conventions](#technical-stack--conventions)
5. [Core User Stories: Payment Processing](#core-user-stories-payment-processing)
6. [Core User Stories: Invoice Processing & Classification](#core-user-stories-invoice-processing--classification)
7. [Core User Stories: Task & Property Management](#core-user-stories-task--property-management)
8. [Core User Stories: Reporting & Cash Flow](#core-user-stories-reporting--cash-flow)
9. [Database Schema Overview](#database-schema-overview)
10. [Integration Points](#integration-points)
11. [Business Rules Reference](#business-rules-reference)

---

## Project Purpose & Business Context

### What We Do

Stanton Capital is a real estate investment company managing **value-add renovations across ~400 units** in multiple property portfolios:
- **SREP SOUTHEND**
- **SREP NORTHEND**
- **SREP Hartford 1**

We operate with an **internal construction team** working with **small contractors who can't do paperwork** but provide competitive pricing. This is NOT a typical construction management app—we handle invoicing, payment tracking, and verification internally because our contractors don't use portals.

### The Core Workflow

The fundamental question we answer daily:

> **"Which contractor needs to get paid for which projects today?"**

This is a **contractor-payment-centric workflow**, not a project-centric one. This distinction is critical—larger construction tools focus on RFIs, drawing management, and complex project workflows. We need:
- Simple payment tracking
- Photo verification of work
- SMS-based contractor communication
- Cash flow management for loan draws

### Business Scale

- **~400 units** across multiple properties
- **6-week acquisition timelines** (acquiring properties rapidly)
- **Multiple LLC entities** with different funding sources (Arbor loans, state grants, C4C financing)
- **Construction loan draw deadlines** drive our workflow
- **Small team**: Dean (field PM) + Alex (accounting) = efficiency over enterprise complexity

---

## Who Uses This System

### Dean - Field Project Manager (Primary User)

**Role**: Walks units, verifies completed work, assigns contractors, handles day-to-day operations

**Daily Workflow**:
1. Opens property dashboard → sees what needs attention
2. Filters to on-hold or in-progress items
3. Walks units physically
4. For each completed task: **takes photo → verifies completion**
5. If work is blocked: sets reason + note
6. Approves/adjusts payment applications from contractors

**Critical Insight**: Dean works in noisy, chaotic job sites. UI must be **clear, not decorative**. Mobile-friendly is essential.

### Alex - Accounting & Cash Flow (Secondary User)

**Role**: Manages payments, cash flow projections, construction loan draws

**Daily Workflow**:
1. Cash flow view → sees week's funding needs
2. Compares to loan balance and available funds
3. Requests draws based on verified work totals
4. Pays contractors based on their verified tasks
5. Reviews AI-suggested invoice classifications

### Field Technicians

**Role**: Make purchases, capture receipts, provide context

**Interaction Pattern**:
- Respond to SMS questions about purchases
- Provide voice notes with purchase context
- Mark work as complete (not verified—that's Dean's job)

### Contractors (Subcontractors)

**Role**: Complete work, submit payment applications via SMS

**Interaction Pattern**:
- Receive SMS asking for work completion percentages
- Reply with simple numbers (no complex forms)
- Pick up checks after lien waivers are signed

---

## AI Agents Architecture

### Three-Layer Foundation Agent Structure

The system uses a sophisticated AI architecture with three distinct layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: WORKFLOW AGENTS                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Payment          │  │ Site Verification │  │ Communication    │   │
│  │ Coordinator      │  │ Agent            │  │ Agent            │   │
│  │ Agent            │  │                  │  │                  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                    LAYER 2: FOUNDATION AGENTS                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Project          │  │ Contractor       │  │ Payment          │   │
│  │ Management       │  │ Agent            │  │ Processing       │   │
│  │ Agent            │  │                  │  │ Agent            │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│  ┌──────────────────┐                                                │
│  │ Compliance       │  (Lien waivers, documentation management)      │
│  │ Agent            │                                                │
│  └──────────────────┘                                                │
├─────────────────────────────────────────────────────────────────────┤
│                LAYER 1: MASTER CONTEXTUAL DATABASE                   │
│  • Project data: Plans, specs, change orders, permits                │
│  • Contractor database: Contacts, contracts, certifications          │
│  • Payment history: Previous applications, contract progress         │
│  • Compliance records: Insurance, licensing, lien waiver status      │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent Descriptions

#### Layer 1: Master Contextual Database
The foundation of all AI operations. Contains:
- **Project data**: Plans, specifications, change orders, permits
- **Contractor database**: Contacts, contracts, certifications, performance history
- **Payment history**: Previous applications, contract progress, payment tracking
- **Compliance records**: Insurance, licensing, safety, lien waiver status

#### Layer 2: Foundation Agents

**Project Management Agent**
- Tracks timelines and milestones per project
- Monitors schedule adherence
- Identifies at-risk items

**Contractor Agent**
- Manages subcontractor relationships
- Tracks performance metrics across projects
- Maintains certification status

**Payment Processing Agent**
- Automates G702+703 workflow
- Calculates payment amounts based on percentages
- Tracks payment application status

**Compliance Agent**
- Manages lien waiver requirements
- Tracks documentation completeness
- Alerts on missing compliance items

#### Layer 3: Workflow Agents

**Payment Coordinator Agent**
- Orchestrates end-to-end payment application process
- Coordinates between SMS collection → PM verification → check processing
- Handles escalations and timeouts

**Site Verification Agent**
- Manages PM walkthrough workflows
- Processes photo documentation
- AI-assisted photo verification (future phase)

**Communication Agent**
- Handles SMS and notification management
- Manages conversation state for multi-step SMS flows
- Routes responses to appropriate agents

### AI Classification Engine (Invoice Processing)

The invoice classification system uses a multi-layer decision process:

**Layer 1: Project Context Analysis**
- Lookup project type (rehabilitation, maintenance, new construction)
- Identify current project phase from timeline
- Apply project-specific default rules

**Layer 2: Purpose Recognition**
- Parse purpose descriptions for intent keywords
- "Replace", "repair", "fix" → likely R&M
- "New", "install", "upgrade" → likely CapEx

**Layer 3: Item Analysis**
- Material type recognition
- Amount threshold consideration
- Typical usage patterns

**Layer 4: Historical Pattern Matching**
- Vendor + material type combinations
- Project-specific classification patterns
- Recent decisions on similar items

**Layer 5: Confidence Scoring**
- Weighted combination of all signals
- Higher confidence for consistent signals
- Low confidence flags for human review

### Confidence Display System

| Confidence Level | Color | Action |
|-----------------|-------|--------|
| 70%+ | Green | Can bulk approve |
| 40-70% | Yellow | Requires review |
| <40% | Red | Requires detailed review with alternatives |

---

## Technical Stack & Conventions

### Core Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 15** | App Router, full-stack framework |
| **Supabase** | PostgreSQL + Auth + Storage |
| **React Query** | Data fetching (@tanstack/react-query) |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI components |
| **Twilio** | SMS communication |

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProjectCard.tsx`, `StatusBadge.tsx` |
| API Routes | kebab-case folders + `route.ts` | `src/app/api/projects/route.ts` |
| Hooks | camelCase with `use` prefix | `useProjects.ts` |
| Utilities | camelCase | `supabaseClient.ts`, `apiHelpers.ts` |

### Directory Structure

```
src/
  app/
    api/[resource]/route.ts     # API endpoints
    (dashboard)/[feature]/      # Page components
    components/                 # Feature-specific components
    context/                    # React contexts
  components/
    ui/                         # Atomic UI components (Badge, Button, Card)
    [FeatureName].tsx           # Reusable feature components
  hooks/
    queries/                    # React Query hooks
  lib/
    supabaseClient.ts           # Supabase client config
    apiHelpers.ts               # API utilities (withAuth, successResponse)
  types/
    supabase.ts                 # Generated DB types
```

### Code Patterns to Follow

**Always check before creating**:
1. Check `src/types/schema.ts` before defining types
2. Check `src/components/ui/` before creating UI elements
3. Query `information_schema.tables` before creating database tables

**React Query pattern**:
```typescript
// Use React Query for all data fetching
const { data, isLoading, error } = useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects
});
```

**withAuth wrapper pattern**:
```typescript
// All API routes use withAuth
export async function GET(req: Request) {
  return withAuth(async (user) => {
    // handler logic
  });
}
```

---

## Core User Stories: Payment Processing

### Epic: G702+703 Payment Application Workflow

**Problem Statement**: Subcontractors struggle to complete G702+703 applications and lien waiver process before check pickup. They can't do paperwork but need to get paid.

---

### US-PAY-001: Project Selection for Payment Processing

**As a** Project Manager,
**I want to** see all active projects with their contractors and payment status,
**So that** I can quickly initiate payment applications for the right project.

**Acceptance Criteria**:
- [ ] Dashboard shows project cards with: name, owner entity, current phase
- [ ] Each project card shows contractor count and payment status summary
- [ ] Projects with pending payments are visually highlighted
- [ ] "Create Payment Apps" button initiates workflow for selected project
- [ ] Current pipeline shows: X SMS pending, Y PM review, Z checks ready

**UI Wireframe**:
```
┌─────────────────────────────────────────────────────────────────┐
│  💰 PAYMENT PROCESSING                                          │
│  Select project to initiate payment applications                │
│                                                                 │
│  [Highland Plaza]       [Oak Street Apts]    [Downtown Office]  │
│  Metro Development      City Housing          Corporate Partners│
│  Phase: Electrical      Phase: Finish Work   Phase: Framing    │
│  • ABC Electric         • Paint Co            • Framing Pro     │
│  • Metro Plumbing       • Flooring Plus       • Steel Works     │
│  [Create Payment Apps]  [Create Payment Apps] [Create Payment]  │
│                                                                 │
│  Current Pipeline: 3 SMS pending • 2 PM review • 2 checks ready │
└─────────────────────────────────────────────────────────────────┘
```

---

### US-PAY-002: Contractor Selection for Payment Applications

**As a** Project Manager,
**I want to** select multiple contractors within a project to request payment applications,
**So that** I can efficiently batch-initiate SMS workflows.

**Acceptance Criteria**:
- [ ] Filter contractors by: Trade, Status (Active/Nearing Completion/On Hold), Payment Status
- [ ] Each contractor card shows: name, trade, contract amount, paid to date, remaining, last payment date
- [ ] Checkbox selection for individual contractors
- [ ] "Select All Available" excludes contractors with open applications
- [ ] "Send Payment Requests" shows count of selected contractors
- [ ] Progress bar shows contract completion percentage
- [ ] Orange badge indicates pending change orders
- [ ] Blue badge indicates existing open application

**Filter Options**:
- Trade: All, Electrical, Plumbing, Drywall, HVAC, Flooring, etc.
- Status: All, Active, Nearing Completion, On Hold
- Payment: All, Payment Overdue (30+ days), Has Open Application

---

### US-PAY-003: SMS Payment Application Collection

**As a** Contractor,
**I want to** submit my payment application via simple SMS responses,
**So that** I can report work progress without using a computer.

**Acceptance Criteria**:
- [ ] Initial SMS clearly identifies project: "{Contractor} payment app for {Project}. Ready for {count} questions? Reply YES"
- [ ] Each question shows previous month's percentage for reference
- [ ] Questions follow line item order configured by admin
- [ ] System validates percentage responses (0-100)
- [ ] Final confirmation shows calculated total: "Summary: {items} = Total: ${amount}. Reply OK to submit"
- [ ] 2-hour timeout triggers escalation to Dean
- [ ] Invalid responses get helpful error messages

**SMS Conversation Flow**:
```
SYSTEM: "ABC Electric payment app for Highland Plaza.
        Ready for [4] quick questions? Reply YES"

CONTRACTOR: "YES"

SYSTEM: "Q1: Rough electrical work - what % complete?
        (You reported 60% last month)"

CONTRACTOR: "85"

SYSTEM: "Q2: Finish electrical work - what % complete?
        (You reported 15% last month)"

CONTRACTOR: "45"

SYSTEM: "Q3: Fire alarm rough-in - what % complete?
        (You reported 0% last month)"

CONTRACTOR: "25"

SYSTEM: "Q4: Any change orders this period?
        Reply dollar amount or NONE"

CONTRACTOR: "800"

SYSTEM: "Got it! Rough: 85%, Finish: 45%, Fire alarm: 25%, Changes: $800
        = Total payment: $14,250. Reply OK to submit for PM review"

CONTRACTOR: "OK"

SYSTEM: "✅ Payment application submitted! PM will review."
```

**State Machine**:
```
awaiting_start → collecting_line_items → confirming → completed
      ↓
   timeout → escalation
```

---

### US-PAY-004: PM Site Verification with Photos

**As a** Project Manager,
**I want to** verify contractor-submitted percentages with site photos,
**So that** we only pay for work that's actually complete.

**Acceptance Criteria**:
- [ ] Payment verification screen shows all submitted line items
- [ ] Each line item shows: submitted %, previous %, calculated amount
- [ ] PM can adjust percentage with mandatory reason input
- [ ] Photo upload required for each line item (multiple photos allowed)
- [ ] Photos stored with timestamp and location data
- [ ] "Approve as submitted" quick action for matching percentages
- [ ] Discrepancy notes are recorded and visible to accounting
- [ ] Cannot complete verification without at least one photo

**Business Rule**: "Worker's version of complete is not ours" - two-stage completion where workers mark done, managers verify with photos.

---

### US-PAY-005: Lien Waiver Management

**As an** Accounting team member,
**I want to** ensure lien waivers are completed before check release,
**So that** we maintain legal compliance.

**Acceptance Criteria**:
- [ ] Payments ≥$5,000 require lien waiver before check pickup
- [ ] System generates waiver document from template
- [ ] E-signature integration (DocuSign/HelloSign) for remote signing
- [ ] Waiver status tracked: Not Started, Sent, Signed, Archived
- [ ] Check cannot be released without completed waiver
- [ ] Historical waivers linked to payment records
- [ ] Waiver amounts match approved payment amounts

---

### US-PAY-006: Line Item Management (Admin)

**As an** Administrator,
**I want to** configure line items for each contractor's contract,
**So that** SMS questions are accurate and payments calculate correctly.

**Acceptance Criteria**:
- [ ] Line items tied to specific contractor + project combination
- [ ] Each line item has: code, description, original contract amount, display order
- [ ] Display order determines SMS question sequence
- [ ] Can add/edit/delete line items through dashboard
- [ ] Historical tracking of line item changes
- [ ] Template-based creation for common trade/project combinations

---

## Core User Stories: Invoice Processing & Classification

### Epic: AI-Assisted Expense Classification

**Problem Statement**: Field technicians make purchases at Home Depot but don't know how to properly classify expenses. We need AI to suggest classifications and bookkeepers to review/correct.

---

### US-INV-001: Field Technician Receipt Capture

**As a** Field Technician,
**I want to** quickly document my purchases with minimal effort,
**So that** accounting can properly classify and pay invoices.

**Acceptance Criteria**:
- [ ] Email receipts auto-forwarded to processing system
- [ ] Voice note capture: 15-30 seconds with project name, purpose, work order (if known)
- [ ] Photo capture for paper receipts with OCR processing
- [ ] Voice note matched to receipt by timestamp
- [ ] No complex categorization required from technician

**Voice Note Example**: "May 10th, lumber and drywall for 31 Park bathroom renovation, replacing water-damaged materials"

---

### US-INV-002: AI First-Pass Classification

**As the** Classification System,
**I want to** automatically suggest GL codes for each line item,
**So that** bookkeepers can review suggestions rather than starting from scratch.

**Acceptance Criteria**:
- [ ] Each line item gets: primary suggestion, secondary options, explanation, confidence score
- [ ] Classification considers: project type, project phase, item description, vendor category, historical patterns
- [ ] Confidence thresholds: 70%+ (green/auto-approve eligible), 40-70% (yellow/review), <40% (red/detailed review)
- [ ] System flags: unusual classifications, potential splits, items not matching project scope
- [ ] Explanations are human-readable: "Classified as CapEx based on renovation project phase and item type"

**Classification Logic Layers**:
1. Project Context → project type, phase, budget status
2. Purpose Recognition → keywords like "repair" vs "install"
3. Item Analysis → material type, amount, quantity
4. Historical Patterns → vendor + item combinations
5. Confidence Scoring → weighted signals

---

### US-INV-003: Bookkeeper Review Interface

**As a** Bookkeeper,
**I want to** efficiently review AI suggestions with full context,
**So that** I can make accurate classification decisions quickly.

**Acceptance Criteria**:
- [ ] Three-panel layout: Sidebar (queue/filters), Main (line items), Document viewer (toggleable)
- [ ] Queue shows: pending count, approved count, needs review count
- [ ] Filter by: vendor, priority, assigned bookkeeper, confidence level
- [ ] Each line item shows: amount, description, AI suggestions with confidence, explanation
- [ ] One-click approve for high-confidence suggestions
- [ ] Modify action allows selecting different GL code with reason
- [ ] Split action for items serving multiple purposes
- [ ] Batch operations for similar line items
- [ ] Keyboard shortcuts for power users

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sidebar (Collapsible)     │ Main Content Area        │ Document Viewer     │
│ - Queue Summary           │ - Receipt Header         │ (Toggleable)        │
│ - Filters (Clickable)     │ - Progress Summary       │ - PDF/Image View    │
│   * By Vendor            │ - Line Items List        │ - Fullscreen option │
│   * By Priority          │ - Action Buttons         │                     │
│   * By Bookkeeper        │                          │                     │
│ - Statistics             │                          │                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### US-INV-004: Context Follow-Up via SMS

**As the** System,
**I want to** automatically request missing context from technicians,
**So that** classifications can be made with complete information.

**Acceptance Criteria**:
- [ ] Triggered when: no work order reference, items inconsistent with project context, confidence <65%
- [ ] Initial SMS to purchaser with 2-hour timeout
- [ ] Escalation to supervisor with 4-hour timeout
- [ ] Final escalation to project manager
- [ ] Response quality scoring to improve question formats
- [ ] All responses stored with classification history

**Question Flow**:
```
Initial: "For your Home Depot purchase ($127.86), which work order?
         Reply with number or NONE"

If NONE: "Which property is this for? Reply with address or project code"
         "Is this for: REPAIR, NEW INSTALL, or OTHER?"
```

---

### US-INV-005: Classification Feedback Loop

**As the** System,
**I want to** learn from bookkeeper corrections,
**So that** future classifications improve over time.

**Acceptance Criteria**:
- [ ] Record AI suggestion vs. final bookkeeper decision for every item
- [ ] Track which rules led to incorrect suggestions
- [ ] Weekly pattern mining identifies new rules
- [ ] Draft rules require admin approval before activation
- [ ] Rule effectiveness scoring (% correct applications)
- [ ] Target: >85% classification accuracy over time

**Success Metrics**:
| Metric | Target |
|--------|--------|
| Classification Accuracy | >85% |
| Processing Time | <24 hours receipt to classification |
| Average Review Time | <45 seconds per receipt |

---

### US-INV-006: CapEx vs R&M Classification

**As a** Bookkeeper,
**I want to** clearly understand when items are CapEx vs R&M,
**So that** I can make correct tax and accounting decisions.

**Acceptance Criteria**:
- [ ] Primary toggle: CapEx vs R&M
- [ ] GL code selector filtered by primary classification
- [ ] System suggests based on: project type (renovation=CapEx, maintenance=R&M), keywords ("repair" vs "install"), amount thresholds, project phase
- [ ] Split capability for items that serve both purposes
- [ ] Override capability with mandatory explanation

**Classification Framework**:

| Context | Default Classification |
|---------|----------------------|
| New Construction | Always CapEx |
| Major Renovation/Value-Add | Primarily CapEx |
| Unit Turnover (>$5,000 budget) | CapEx |
| Unit Turnover (<$5,000 budget) | Mixed |
| Occupied Unit Maintenance | Primarily R&M |
| Emergency Repairs | Always R&M |

---

## Core User Stories: Task & Property Management

### Epic: Property Task Management

**Problem Statement**: We need to track ~400 units across multiple properties with clear status visibility, blocking reasons, and cash flow connections.

---

### US-TASK-001: Property Dashboard Overview

**As a** Project Manager,
**I want to** see overall progress for each property at a glance,
**So that** I can identify which properties need attention.

**Acceptance Criteria**:
- [ ] Property cards show: name, unit count, overall progress %, blocked count
- [ ] Status breakdown: not started, in progress, complete, on hold
- [ ] Click-through to property detail
- [ ] Visual indicators for at-risk properties
- [ ] Filter by portfolio (SREP SOUTHEND, SREP NORTHEND, etc.)

---

### US-TASK-002: Location Grid View

**As a** Project Manager,
**I want to** see all locations (units, common areas) within a property,
**So that** I can identify which need attention.

**Acceptance Criteria**:
- [ ] Grid of location cards showing: name, type, status, task progress
- [ ] Filter by: status, type (unit, common_area, exterior, building_wide), floor
- [ ] Status badges: not_started, in_progress, complete, on_hold
- [ ] Blocked indicator with reason preview
- [ ] Click-through to location detail/punch list
- [ ] "Add Location" button for new units/areas

**Location Types**:
- `unit` - individual rental units
- `common_area` - hallways, lobbies, etc.
- `exterior` - parking lots, landscaping
- `building_wide` - systems affecting whole building

---

### US-TASK-003: Location Punch List

**As a** Project Manager,
**I want to** see all tasks for a specific location,
**So that** I can verify completion and unblock work.

**Acceptance Criteria**:
- [ ] List of tasks with: name, status, assigned contractor, progress
- [ ] Two-stage completion visible: worker_complete → verified
- [ ] Photo verification required for verified status
- [ ] Quick actions: mark in progress, mark worker complete, verify with photo
- [ ] Blocking controls: set reason, add note
- [ ] Cannot verify without photo upload

**Task Status Flow**:
```
not_started → in_progress → worker_complete → verified
                  ↓              ↓
               on_hold ←←←←←←←←←←
```

---

### US-TASK-004: Photo Verification

**As a** Project Manager,
**I want to** verify task completion with photographic evidence,
**So that** we have accountability and audit trail.

**Acceptance Criteria**:
- [ ] Photo upload from mobile device
- [ ] Photos stored in Supabase Storage: `{property_id}/{location_id}/{task_id}/{timestamp}.jpg`
- [ ] Multiple photos allowed per task
- [ ] Verification notes field for PM comments
- [ ] Only PM/Admin can mark tasks as verified
- [ ] Verification timestamp and verifier recorded

**Business Rule**: "Cannot mark verified without a photo. PM/Admin only."

---

### US-TASK-005: Blocking Management

**As a** Project Manager,
**I want to** track why work is blocked with specific reasons,
**So that** I can take targeted action to unblock it.

**Acceptance Criteria**:
- [ ] Blocking reasons: materials, labor, cash, dependency, other
- [ ] Mandatory note when setting block reason
- [ ] Dashboard groups blocked items by reason
- [ ] "4 waiting on materials, 8 need labor" → actionable grouping
- [ ] Quick unblock action when issue resolved
- [ ] History of block/unblock events

---

### US-TASK-006: Scope Templates

**As an** Administrator,
**I want to** create templates for common scope patterns,
**So that** setting up new units is fast.

**Acceptance Criteria**:
- [ ] Templates tied to unit type: "1BR Standard", "2BR Premium", "Common Area Refresh"
- [ ] Each template contains: task list with names, default durations, estimated costs, budget categories
- [ ] Apply template to single location or bulk locations
- [ ] Bulk unit creation: "Add units 101-120, type 1BR, apply template" → 200 tasks created
- [ ] Template tasks respect sort order and dependencies

---

### US-TASK-007: Bulk Unit Creation

**As a** Project Manager,
**I want to** quickly add many units at once with standard scope,
**So that** new property setup takes minutes, not hours.

**Acceptance Criteria**:
- [ ] Input: start number, count, unit type, floor (optional), template (optional)
- [ ] Preview before creation
- [ ] Auto-apply template if specified
- [ ] Progress indicator for large batches
- [ ] Handles 100+ units in single operation

**Example**: "Add units 101-120, type 1BR, apply 1BR Standard template" → Creates 20 locations, each with all template tasks

---

## Core User Stories: Reporting & Cash Flow

### Epic: Cash Flow Management

**Problem Statement**: We need to know what cash we need each week and what we can draw from construction loans based on verified work.

---

### US-CASH-001: Weekly Cash Flow Forecast

**As an** Accounting Manager,
**I want to** see projected cash needs by week,
**So that** I can ensure funding is available.

**Acceptance Criteria**:
- [ ] Timeline view showing costs grouped by week
- [ ] Based on scheduled task end dates + estimated costs
- [ ] Filter by: property, date range
- [ ] Shows: week, total estimated, task count
- [ ] Answers: "What do we need available next week?"

---

### US-CASH-002: Draw Eligibility Report

**As an** Accounting Manager,
**I want to** see what verified work is eligible for loan draws,
**So that** I can submit draw requests accurately.

**Acceptance Criteria**:
- [ ] Only includes tasks with status = verified
- [ ] Groups by budget category (matches loan draw line items)
- [ ] Shows: category, total eligible, task count
- [ ] Answers: "What can we draw now?"
- [ ] "Request Draw" links to draw workflow

---

### US-CASH-003: Project Budget Tracking

**As a** Project Manager,
**I want to** see budget vs actual for each project,
**So that** I can prevent overruns.

**Acceptance Criteria**:
- [ ] Budget cards: Total Budget, Spent, Committed, Remaining
- [ ] Remaining = Budget - Spent - Committed
- [ ] Committed = approved payments not yet issued
- [ ] Variance alerts when approaching budget limits
- [ ] Drill-down to contractor-level detail

---

## Database Schema Overview

### Key Tables

**Projects & Properties**
```sql
-- c_projects: Construction projects (links to portfolios)
-- Portfolios contain multiple properties
-- Projects can span multiple properties
```

**Locations & Tasks**
```sql
CREATE TABLE locations (
    id UUID PRIMARY KEY,
    property_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,  -- unit, common_area, exterior, building_wide
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    blocked_reason VARCHAR(20),  -- materials, labor, cash, dependency, other
    blocked_note TEXT
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id),
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    -- not_started, in_progress, worker_complete, verified
    assigned_to_id INTEGER,  -- FK to contractors
    budget_category_id UUID,
    estimated_cost DECIMAL(10,2),
    verification_photo_url TEXT,
    verified_at TIMESTAMPTZ,
    verified_by_id INTEGER
);
```

**Payment Processing**
```sql
CREATE TABLE payment_applications (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    contractor_id INTEGER REFERENCES contractors(id),
    period_ending DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, sms_in_progress, submitted, pm_review, approved, check_ready
    submitted_total DECIMAL(10,2),
    approved_total DECIMAL(10,2),
    sms_conversation_state JSONB
);

CREATE TABLE payment_line_item_progress (
    id SERIAL PRIMARY KEY,
    payment_app_id INTEGER REFERENCES payment_applications(id),
    line_item_id INTEGER REFERENCES project_line_items(id),
    submitted_percent DECIMAL(5,2),
    pm_verified_percent DECIMAL(5,2),
    verification_photos JSONB  -- Array of photo URLs
);
```

**Invoice Classification**
```sql
CREATE TABLE classification_rules (
    id SERIAL PRIMARY KEY,
    rule_type VARCHAR(50) NOT NULL,  -- keyword, vendor_category, project_phase, etc.
    pattern TEXT NOT NULL,
    gl_code VARCHAR(50) NOT NULL,
    confidence_weight DECIMAL(3,2) DEFAULT 0.7,
    effectiveness_score DECIMAL(3,2) DEFAULT 0.5
);

CREATE TABLE classification_feedback (
    id SERIAL PRIMARY KEY,
    line_item_id VARCHAR(50) NOT NULL,
    ai_suggested_gl_code VARCHAR(50) NOT NULL,
    bookkeeper_final_gl_code VARCHAR(50) NOT NULL,
    correction_notes TEXT
);
```

---

## Integration Points

### External Systems

| System | Integration | Purpose |
|--------|------------|---------|
| **Twilio SMS** | Existing | Contractor communication |
| **Supabase Storage** | Existing | Photo storage |
| **QuickBooks** | Planned | Accounting sync |
| **DocuSign/HelloSign** | Planned | Lien waiver signatures |
| **Home Depot Pro Xtra** | Existing | Receipt data export |

### API Patterns

All API routes follow this pattern:
```typescript
// app/api/[resource]/route.ts
export async function GET(req: Request) {
  return withAuth(async (user) => {
    // Query logic
    return successResponse(data);
  });
}

export async function POST(req: Request) {
  return withAuth(async (user) => {
    // Create logic
    return successResponse(created, 201);
  });
}
```

---

## Business Rules Reference

### Payment Processing Rules

1. **Lien waivers required** for payments ≥$5,000
2. **Photo verification required** for all PM verifications
3. **SMS timeout**: 2 hours before escalation to Dean
4. **Payment cycle target**: 3-4 days from SMS to check

### Task Management Rules

1. **Verification requires photo** - no exceptions
2. **Only PM/Admin can verify** - workers can mark complete, not verify
3. **Blocking requires a reason** - can't just say "on hold"
4. **Location status derived from tasks** - all tasks verified = location complete

### Classification Rules

1. **Renovation projects default to CapEx** (17XX GL codes)
2. **Maintenance/occupied units default to R&M** (65XX GL codes)
3. **Items >$500 individual** more likely CapEx
4. **Quantities suggesting multiple units** require split review
5. **High confidence (70%+)** eligible for bulk approval

### Entity Assignment Rules

1. **All construction activities** → Construction Entity
2. **Routine maintenance on occupied units** → Property Management Entity
3. **Construction bills Property Management** for R&M work at 10-15% markup

---

## Appendix: GL Code Quick Reference

### CapEx Codes (17XX Series - Construction Entity)

| Code | Description |
|------|-------------|
| 1420-015 | Waste Removal |
| 1420-020 | Masonry |
| 1420-025 | Framing/Drywall |
| 1420-030 | Carpentry |
| 1420-035 | Plumbing |
| 1420-040 | Electrical |
| 1420-045 | HVAC |
| 1420-055 | Painting |
| 1420-060 | Flooring |

### R&M Codes (65XX Series - Property Management Entity)

| Code | Description |
|------|-------------|
| 6550-005 | Plumbing Repairs |
| 6550-010 | Electrical Repairs |
| 6550-015 | HVAC Repairs |
| 6550-030 | Painting/Touch-up |
| 6550-035 | Flooring Repairs |
| 6550-055 | Hardware/Supplies |
| 6550-060 | General Materials |

---

## Questions? Context Needed?

If you need clarification on any user story or business context, reference the project knowledge documents:
- `WINDSURF_SYSTEM.md` - Technical conventions
- `WINDSURF_TASK_MANAGEMENT_SPEC.md` - Task management details
- `Construction Operations Center: Payment Processing System Design Specification.md` - Payment workflow details
- `Construction Invoice Processing System: AI-Assisted Classification Framework.md` - AI classification details
- `HUD Chart of Accounts for Property Management.md` - GL code framework

---
