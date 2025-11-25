# ConstructionOps Wireframes

This document translates the current Next.js 15 application into text-first wireframes that a UI consultant can quickly digest. It is based on the live React components in `src/app/components` and related modules as of Nov 25 2025.

## How to Use This Document
- Skim the **View Inventory** to confirm coverage.
- Each detailed section follows the shared **Wireframe Template** fields so stakeholders can compare screens consistently.
- Link this write-up with the component source referenced in backticks whenever deeper behavior questions arise.
- Treat "Layout Regions" as placements, not pixel-perfect specs—designers can reinterpret visuals while preserving hierarchy and flows.

## Wireframe Template
Every view description follows the same checklist so designers can extract requirements quickly:

1. **Purpose** – the business problem the screen solves.
2. **Layout Regions** – ordered structural blocks (hero, filters, tables, drawers, etc.) including conditional sections.
3. **Primary Interactions** – core tasks, CTAs, shortcuts, escalation paths, and where alerts/errors surface.
4. **Data & Dependencies** – APIs, contexts, or Supabase tables powering the view plus notable states (loading, empty, error).
5. **Responsive & State Notes** – breakpoints, drawers/modals, mobile nav changes, or role-based gating.

## View Inventory

### Auth & Onboarding
- `src/app/components/AuthScreen.tsx` – combined sign-in/sign-up with password reset flow.
- `src/app/components/OnboardingFlow.tsx` – five-step modal wizard that orients new staff/PM users.

### Global Shell & Shared Overlays
- `src/app/components/Header.tsx` – fixed top bar (search, quick actions, notifications, profile trigger).
- `src/app/components/Navigation.tsx` – role-aware sidebar with desktop + mobile variants.
- `src/app/components/ConstructionDashboard.tsx` – wraps header/nav, tab routing, Suspense boundaries, profile drawer.
- `src/app/components/UserProfile.tsx` – right-side editing panel for account metadata + password reset.
- `src/app/components/ErrorBoundary.tsx` – graceful error recovery wrapper.
- `src/app/components/LoadingStates.tsx` – skeleton and spinner components for loading states.

### Admin/Staff Dashboard Tabs
- `src/app/components/OverviewView.tsx` – portfolio KPIs, decision queue, spotlighted projects.
- `src/app/components/ProjectsView.tsx` + `ProjectDetailView.tsx` + `ProjectContractorsTab.tsx` + `ProjectBudgetDetail.tsx` – master-detail workspace for active jobs, contractors, budgets, punch lists.
- `src/app/components/ManageView.tsx` – legacy power-user surface for contracts/entities with bulk actions.
- `src/app/components/FieldOpsView.tsx` + `schedule/ScheduleView.tsx` + `PhotoGalleryView.tsx` + `warranties/WarrantiesList.tsx` – field operations center (schedule, media, warranty ledger).
- `src/app/components/PaymentsView.tsx` + `PaymentApplicationsView.tsx` + `PaymentProcessingView.tsx` + `ManualPaymentEntryModal.tsx` – payment pipeline management.
- `src/app/components/ContractorsView.tsx` + `ContractorDetailView.tsx` + `VendorDetailView.tsx` – contractor CRM with messaging and performance stats.
- `src/app/components/SubcontractorsView.tsx` – dedicated subcontractor directory with compliance tracking.
- `src/app/components/ChangeOrdersView.tsx` + `ChangeOrderForm.tsx` – change-order list, detail, approval workflow.
- `src/app/components/BudgetDashboard.tsx` + `ExcelBudgetTable.tsx` + `PropertyBudgetView.tsx` – portfolio and per-project cost tracking.
- `src/app/components/SettingsView.tsx` + `UserManagementView.tsx` + `PermissionsManagement.tsx` + `EntityManagementView.tsx` – admin settings area.
- `src/app/components/DailyLogsView.tsx` – automation queue for PM daily log SMS outreach.
- `src/app/components/ComplianceView.tsx` – permit and compliance dashboard with project-level tracking.
- `src/app/components/MetricsView.tsx` – portfolio-wide analytics and performance metrics.

### Punch List System
- `src/app/components/PunchListView.tsx` – full punch list management with list/kanban toggle.
- `src/app/components/PunchListsTab.tsx` – project-scoped punch list tab with filtering.
- `src/app/components/CreatePunchListModal.tsx` – modal for creating new punch list items.
- `src/app/components/punch-list/PunchListDetailModal.tsx` – detail view with status updates and photos.
- `src/app/components/punch-list/PunchListFormModal.tsx` – create/edit form modal.
- `src/app/components/RemoveFromProjectModal.tsx` – contractor removal confirmation.

### Schedule System
- `src/app/components/schedule/ScheduleView.tsx` – main schedule view with calendar/list modes.
- `src/app/components/schedule/GanttChartContainer.tsx` – interactive Gantt chart for task visualization.
- `src/app/components/schedule/TaskFormModal.tsx` – task creation/editing with dependencies.
- `src/app/components/schedule/MobileTaskTimeline.tsx` – touch-optimized task timeline.

### Warranty System
- `src/app/components/warranties/WarrantiesList.tsx` – warranty tracking table.
- `src/app/components/warranties/WarrantyFormModal.tsx` – warranty creation form.

### PM Dashboard
- `src/app/components/PMDashboard.tsx` – dedicated PM workspace with tabs for payment apps, projects, and daily log requests. Reuses modal helpers such as `ProjectOverview` and shared tables.

### Shared Payment Components
- `src/app/components/shared/PaymentApplicationCard.tsx` – mobile-friendly payment app card.
- `src/app/components/shared/PaymentApplicationList.tsx` – card-based list view.
- `src/app/components/shared/PaymentApplicationTable.tsx` – DataTable-based list.
- `src/app/components/shared/PaymentApplicationRow.tsx` – table row component.
- `src/app/components/shared/PaymentStatusBadge.tsx` – status indicator badge.

### UI Utilities
- `src/app/components/ui/ConfirmDialog.tsx` – reusable confirmation modal with variants.
- `src/app/components/ui/EmptyState.tsx` – empty state placeholder.
- `src/app/components/ui/Toast.tsx` – notification toast component.

### Key Modals & Forms
- `src/app/components/ProjectFormWithEntity.tsx`, `SubcontractorSelectionView.tsx`, `EditableLineItemsTable.tsx`.
- `src/app/components/MobileOptimizedTable.tsx` – responsive table with card fallback.
- Budget deep dives: `ProjectBudgetDetail.tsx`, `ExcelBudgetTable.tsx`.
- Payment actions: `ManualPaymentEntryModal.tsx`, `PaymentProcessingView.tsx`.

### Performance & Optimization
- `src/components/optimized/VirtualizedProjectList.tsx` – virtualized scrolling for large project lists.
- `src/components/optimized/VirtualizedContractorList.tsx` – virtualized contractor list.
- `src/components/optimized/LazyCard.tsx` – intersection-observer based lazy loading.
- `src/components/ui/VirtualizedList.tsx` – generic virtualized list component.
- `src/components/ui/LazySection.tsx` – deferred section loading.

---

## Wireframes

### Auth & Access

#### Auth Screen (`AuthScreen.tsx`)
- **Purpose**: Gate access for admins, PMs, staff, and contractors with a combined login/sign-up/reset surface backed by Supabase Auth.
- **Layout Regions**:
  1. Centered hero card on a gradient background with product mark and copy toggle ("Welcome Back" vs "Create Account" vs "Reset Password").
  2. Form card containing name (sign-up only), email, password with visibility toggle, and conditional reset notice.
  3. Error/success alert block that swaps between auth and reset states.
  4. Actions row with submit button and tertiary links for switching modes.
  5. Footer note ("Protected by enterprise-grade security").
- **Primary Interactions**:
  - Sign in via Supabase `signInWithPassword`.
  - Sign up (collects name, creates user record, inserts default `staff` role).
  - Password reset request via `supabase.auth.resetPasswordForEmail`.
  - Toggle password visibility, switch between sign-in/sign-up/reset flows.
- **Data & Dependencies**:
  - Relies on Supabase Auth APIs and `user_role` table to route by role.
  - Handles loading, validation errors, and success states inline.
- **Responsive & State Notes**:
  - Single-column layout scales down to mobile without scroll traps.
  - Copy and CTA text adjust to whichever mode is active; state persists while toggling.

#### Onboarding Flow (`OnboardingFlow.tsx`)
- **Purpose**: Educate first-time users on core workflows (projects, payments, notifications) before landing on dashboards.
- **Layout Regions**:
  1. Modal shell with header area (icon, title, description, skip/close).
  2. Slim progress bar tied to step index.
  3. Scrollable content body showing cards, bullet lists, and visuals.
  4. Footer with step counter, Previous/Next buttons, and final "Get Started".
- **Primary Interactions**:
  - Linear navigation through steps with persistence of completed steps.
  - Skip/close instantly marks onboarding complete via callback.
- **Data & Dependencies**:
  - Local state only; parent controls `isOpen` and completion.
  - Icons come from Lucide set; no backend hits.
- **Responsive & State Notes**:
  - Max width 2xl; content area becomes scrollable on small screens.
  - Completed steps tracked for potential resume logic if reopened later.

### Global Shell & Shared Overlays

#### Header (`Header.tsx`)
- **Purpose**: Provide global search, quick actions, profile access, and responsive toggles for the dashboard proper.
- **Layout Regions**:
  1. Left: breadcrumb/branding plus optional quick filters.
  2. Center: search bar with typeahead + inline status chips.
  3. Right: notification badges, action buttons (add project, refresh), avatar trigger.
- **Primary Interactions**:
  - Search dispatches queries to DataContext consumers.
  - Buttons emit callbacks (open profile, log out, open modals).
- **Data & Dependencies**:
  - Consumes user metadata for greeting and avatar.
  - Ties into `useData` for search and `useAuth` for sign-out.
- **Responsive & State Notes**:
  - Collapses into stacked layout on <lg breakpoints; search becomes full-width row.
  - Sticky at top with drop shadow to signal context.

#### Navigation Sidebar (`Navigation.tsx`)
- **Purpose**: Role-aware primary navigation (overview, projects, field ops, etc.) with mobile drawer behavior.
- **Layout Regions**:
  1. Mobile toggle button and overlay.
  2. Fixed 64px-wide column on desktop hosting brand, selected project callout, nav list, and mini profile.
  3. Nav list with badges and icons (Lucide) filtered by role (admin/pm/staff).
- **Primary Interactions**:
  - Clicking nav updates query params (`tab`, `project`, `subtab`) and closes mobile drawer.
  - Project selection badge toggles when `selectedProject` passed in.
- **Data & Dependencies**:
  - Supabase `user_role` query drives `canAccess`.
  - Notification counts currently include payment queue totals.
- **Responsive & State Notes**:
  - Mobile uses slide-in panel; background click closes.
  - Active tab highlighted with accent border; handles deep links for older tab aliases.

#### Construction Dashboard Shell (`ConstructionDashboard.tsx`)
- **Purpose**: Compose header + nav + main content with Suspense wrappers and URL-synced tab state for staff/admin roles.
- **Layout Regions**:
  1. Global header (search/profile).
  2. Sidebar (Navigation component).
  3. Main `<main>` area with padding and Suspense fallback.
  4. Lazy-loaded `UserProfile` drawer mounted at root level.
- **Primary Interactions**:
  - Tab changes update URL and lazy-load respective views.
  - Profile drawer toggles via header.
- **Data & Dependencies**:
  - Wraps everything in `DataProvider` to supply projects, contractors, etc.
  - Uses Supabase to fetch user metadata for header.
- **Responsive & State Notes**:
  - Off-canvas nav on small screens; main content offset `lg:ml-64`.
  - Maintains selected project in URL for deep-linkable detail views.

#### User Profile Panel (`UserProfile.tsx`)
- **Purpose**: Right-side sheet for updating name/contact info, avatar, and triggering password reset.
- **Layout Regions**:
  1. Gradient header with close button.
  2. Scrollable form (avatar preview, fields for name, email, phone, company, address).
  3. Status alerts for success/error plus inline validation notes.
  4. Footer with save and password reset controls.
- **Primary Interactions**:
  - Upsert to Supabase `users` table.
  - Pressing "Send reset email" dispatches Supabase reset flow.
- **Data & Dependencies**:
  - Pulls current user via `supabase.auth.getUser`.
  - `onProfileUpdate` callback syncs header state after save.
- **Responsive & State Notes**:
  - Locks body scroll while open; ESC closes.
  - Handles avatar load failures with fallback gradient.

### Admin/Staff Tabs

#### Overview Tab (`OverviewView.tsx`)
- **Purpose**: Give leadership a daily health snapshot—budgets, decision queues, active projects.
- **Layout Regions**:
  1. KPI grid (MetricCards for total projects, spend, etc.).
  2. "Decisions Queue" card with grouped payment priorities and CTA to Payments tab.
  3. "Individual Applications" list of top 3 urgent apps.
  4. Project tiles grid showing budget vs spend, contractor counts, schedule badges.
  5. Optional charts (recent spend trend) appended near bottom.
- **Primary Interactions**:
  - Click a project tile → triggers `onProjectSelect` (navigates to Projects tab).
  - Buttons route to Payments tab or Budget tab with query params.
  - Error banners surface Supabase issues with retry button.
- **Data & Dependencies**:
  - DataContext projects + Supabase aggregations (payment apps, contractors).
  - Local storage caches last active project for quick return.
- **Responsive & State Notes**:
  - Cards wrap into single column on small devices.
  - Loading skeletons displayed while stats fetch completes; auto-refresh every 30s for queue.

#### Projects Tab (`ProjectsView.tsx`, `ProjectDetailView.tsx`, `ProjectContractorsTab.tsx`, `ProjectBudgetDetail.tsx`)
- **Purpose**: Master-detail cockpit for running jobs, including budgets, contractors, punch lists, and docs.
- **Layout Regions**:
  1. Header row with search, filters, refresh button, and "New Project" CTA.
  2. Left column: responsive grid/list of project cards (status badges, budget summary, quick actions).
  3. Right column (or slide-out drawer on mobile): `ProjectDetailView` with subtabs (Overview, Contractors, Budget, Payments, Punch Lists, Documents).
  4. Modal stack: data modals (contractor list, payment apps, budgets), project create/edit form, delete confirmation.
- **Primary Interactions**:
  - Selecting project syncs URL and opens detail panel.
  - Inline quick actions: refresh stats, open stats modals, navigate to payments/budget tabs.
  - CRUD flows via `ProjectFormWithEntity` (owner entity selection, contact info, budget inputs).
  - Punch list management (view tab, open `PunchListDetailModal`, create via `CreatePunchListModal`).
- **Data & Dependencies**:
  - Fetches from `/api/projects/list` with enrich flag plus Supabase for contractors/payments.
  - Budget charts reuse `ProjectBudgetDetail`, `ExcelBudgetTable`.
  - Form validations cover required fields, emails, phone numbers.
- **Responsive & State Notes**:
  - Collapses to stacked layout under lg; detail view becomes fullscreen drawer with close CTA.
  - Loading + error states per fetch; optimistic updates push to local state before API response.

#### Manage View (`ManageView.tsx`)
- **Purpose**: Power-user legacy tool for bulk contract/entity operations with expandable cards.
- **Layout Regions**:
  1. Top: search/filter bar with advanced filters drawer.
  2. Quick Actions row (select all, bulk delete, export, "New Contract").
  3. Card grid representing projects/vendors/contracts with status chips and context menus.
  4. Drawer/modals for adding/editing items, uploading documents, editing line items.
- **Primary Interactions**:
  - Bulk selection toggles warning banner and delete CTA.
  - Each card exposes view/edit/delete buttons; clicking body opens detail modal.
  - Inline filters adjust by tab (vendors vs contracts).
- **Data & Dependencies**:
  - Hook-based data (`useProjects`, `useContractors`, etc.) hitting Supabase.
  - Mutations for CRUD operations plus `EditableLineItemsTable`.
- **Responsive & State Notes**:
  - Cards adapt to single-column on mobile; filter panel collapses.
  - Warnings emphasize irreversible deletes; forms reuse validators.

#### Field Ops Tab (`FieldOpsView.tsx`, `ScheduleView.tsx`, `PhotoGalleryView.tsx`, `WarrantiesList.tsx`)
- **Purpose**: Provide field teams with schedule visibility, photo documentation, and warranty tracking.
- **Layout Regions**:
  1. Sub-tab pill bar (Schedule, Photos, Warranties).
  2. Schedule: calendar/list hybrid showing tasks, crew assignments, status chips, drag interactions (per `schedule/ScheduleView`).
  3. Photos: filter bar (project, type, date), upload CTA, responsive gallery grid, lightbox modal, upload modal with drag-and-drop dropzone.
  4. Warranties: table of warranties with status, coverage dates, download actions.
- **Primary Interactions**:
  - Switch sub-tabs to mount relevant component.
  - Photo uploads allow multi-select, dragging, or manual file input; clicking card opens lightbox with metadata.
  - Schedule events link back to projects; warranties support filtering and detail view.
- **Data & Dependencies**:
  - Supabase APIs `/api/projects/list` for filters, `/api/photos` for media, schedule data from dedicated API/hardcoded dataset, warranties from Supabase tables.
  - Upload uses Supabase storage endpoints.
- **Responsive & State Notes**:
  - Sub-tab bar scrollable on narrow screens.
  - Photo grid adjusts columns 2→5 with breakpoints; modals are full-screen on mobile.

#### Payments Tab (`PaymentsView.tsx`, `PaymentApplicationsView.tsx`, `PaymentProcessingView.tsx`, `ManualPaymentEntryModal.tsx`)
- **Purpose**: Track and action payment applications from submission through approval and check pickup.
- **Layout Regions**:
  1. KPI stat cards (SMS pending, review queue, ready checks, weekly totals) acting as quick filters.
  2. Filter/search toolbar with status chips, date pickers, and pagination controls.
  3. Dual layout: card list for condensed view + `DataTable` for power users (column showing project, contractor, status, value, created date).
  4. Detail drawer/panel from `PaymentApplicationsView` showing form fields, attachments, approvals, comments.
  5. Secondary panels for document generation (G703), manual payment entry modal, verification workflow (`PaymentProcessingView`).
- **Primary Interactions**:
  - Bulk select applications for SMS or DocuSign send.
  - CTA buttons: Verify (open processing drawer), Sign (DocuSign), Delete (soft delete).
  - Filter chips update query; pagination controls at bottom of table.
  - Manual entry modal collects bank/check info for manual disbursements.
- **Data & Dependencies**:
  - Fetches from Supabase `payment_applications` with contractor/project joins and statuses.
  - Document mapping uses `generateG703Pdf` library; status badges from `statusColors`.
  - Modal context coordinates toasts/confirmations.
- **Responsive & State Notes**:
  - Card layout default on mobile; table visible on ≥md.
  - Checkboxes use indeterminate state for partial selection; detail drawer becomes full-screen overlay on mobile.

#### Contractors Tab (`ContractorsView.tsx`, `ContractorDetailView.tsx`, `VendorDetailView.tsx`)
- **Purpose**: Serve as contractor CRM for sourcing, performance tracking, communications.
- **Layout Regions**:
  1. Header with search, trade/status filters, performance sorters, refresh button, "Add Contractor".
  2. Contractor cards or table listing core info, aggregated contract totals, activity tags.
  3. Detail panel (`VendorDetailView`) with tabs for profile, contracts, compliance docs, payment history.
  4. Modal stack: add/edit contractor form, SMS contact modal, delete confirm, performance note overlays.
- **Primary Interactions**:
  - Add/edit flows validate phone/email, auto-format phone numbers.
  - Inline actions to message contractor (SMS), archive/delete, open detail view.
  - Detail view includes timeline chips, contract breakdown, attachments (Doc log icons).
- **Data & Dependencies**:
  - Supabase `contractors` table plus `project_contractors` for aggregation.
  - Messaging uses Twilio helper `sendSMS`.
- **Responsive & State Notes**:
  - Search bar syncs with global header query when provided.
  - Cards reorganize to single column on phones; modals occupy full viewport.

#### Subcontractors View (`SubcontractorsView.tsx`)
- **Purpose**: Dedicated directory for managing subcontractor relationships with compliance tracking.
- **Layout Regions**:
  1. Header with count summary ("X of Y subcontractors") and "Add Subcontractor" CTA.
  2. Four-column filter row: search input, trade dropdown, status dropdown, sort selector.
  3. Desktop: DataTable with columns for name/trade, rating (star display), status badge, compliance indicators (insurance/license dots), contact info, actions.
  4. Mobile: Card-based layout with avatar initials, status badges, star ratings, compliance percentages, contact details, and action buttons.
  5. Modal stack: Add/Edit form modal, View detail modal, SMS contact modal.
- **Primary Interactions**:
  - Add subcontractor creates record in `contractors` table via Supabase.
  - Edit updates existing record; phone auto-formats with +1 prefix.
  - Contact opens SMS modal with message textarea and send status.
  - Row/card click opens detailed view modal.
- **Data & Dependencies**:
  - Uses DataContext `subcontractors` array and `dispatch` for updates.
  - Compliance calculated from `insurance` and `license` fields.
  - SMS sent via `sendSMS` helper.
- **Responsive & State Notes**:
  - Desktop shows DataTable; mobile (<lg) shows card layout.
  - Filter dropdowns wrap on narrow screens.
  - Star ratings rendered dynamically from `performance_score`.

#### Change Orders Tab (`ChangeOrdersView.tsx`, `ChangeOrderForm.tsx`)
- **Purpose**: Manage change-order pipeline with status tracking, approvals, and documentation.
- **Layout Regions**:
  1. Header row with search, status filter dropdown, "New Change Order" button.
  2. Table (DataTable) listing CO number, project, contractor, description, cost/schedule impact, status badge, attachment counts.
  3. Detail modal with description, justification, approval log, attachments carousel.
  4. Photo modal showing supporting media.
  5. Form modal for creating/editing change orders (fields for scope, cost, schedule impact, photos).
- **Primary Interactions**:
  - Admin/PM roles get Approve / Reject CTAs; staff limited to view.
  - Delete action available for drafts or admins.
  - Photo button opens image modal; cost impact uses color-coded text.
- **Data & Dependencies**:
  - Supabase tables `change_orders`, `change_order_photos`.
  - Approve/Reject hits `/api/change-orders/:id/approve|reject`.
- **Responsive & State Notes**:
  - Table collapses into cards at small widths.
  - Modals go full-screen on mobile; confirm prompts guard destructive actions.

#### Compliance View (`ComplianceView.tsx`)
- **Purpose**: Provide centralized permit and compliance monitoring across all projects.
- **Layout Regions**:
  1. Header with title "Permit & Compliance Dashboard" and subtitle.
  2. Four KPI cards: Overall Compliance %, Valid Permits count, Expired Items count, Pending Approvals count.
  3. Two-column grid:
     - Left: Permit Types Overview with progress bars per type (building, electrical, etc.).
     - Right: Project Compliance Status distribution (Excellent/Good/Warning/Critical counts).
  4. Project-by-Project grid: cards showing individual project compliance scores, permit status badges, and health icons.
  5. Action Items section (conditional): alerts for expired permits and pending approvals.
- **Primary Interactions**:
  - Status cards can act as filters (not yet implemented).
  - Project cards show drill-down ready states.
  - Progress bars visualize compliance percentages.
- **Data & Dependencies**:
  - Derives metrics from DataContext `projects` array.
  - Calculates compliance from `project.permits` object with status values (approved/valid/expired/pending).
- **Responsive & State Notes**:
  - KPI grid: 4 columns on lg, 2 on md, 1 on mobile.
  - Project cards: 2 columns on lg, 1 on mobile.
  - Color-coded status: green (90%+), blue (75-89%), yellow (50-74%), red (<50%).

#### Metrics View (`MetricsView.tsx`)
- **Purpose**: Provide CFO/leadership with portfolio-wide analytics and performance tracking.
- **Layout Regions**:
  1. Header with title "Metrics & Analytics" and last-updated timestamp.
  2. Four metric cards: Total Projects, Active Projects, Total Budget, Active Vendors (with trend indicators).
  3. Financial Overview card: three-column stats (Total Spent, Remaining Budget, Contract Value) with budget utilization progress bar.
  4. Two-column grid:
     - Performance Metrics: completion rate, average budget, vendor utilization.
     - Recent Activity: event timeline with colored status dots.
  5. Project Status Distribution: three-column breakdown (Active/Completed/Other).
- **Primary Interactions**:
  - Trend arrows indicate period-over-period changes.
  - Budget bar changes color based on utilization (green <75%, yellow 75-90%, red >90%).
- **Data & Dependencies**:
  - Aggregates from DataContext `projects`, `subcontractors`, `contracts`.
  - All calculations done client-side with `useMemo`.
- **Responsive & State Notes**:
  - Metric cards: 4 columns on lg, 2 on md, 1 on mobile.
  - Financial stats stack vertically on mobile.
  - Auto-updates when DataContext changes.

#### Budget Dashboard Tab (`BudgetDashboard.tsx`, `ExcelBudgetTable.tsx`, `ProjectBudgetDetail.tsx`, `PropertyBudgetView.tsx`)
- **Purpose**: Provide CFO/PM view of budget vs actuals for all projects plus drill-down into line items.
- **Layout Regions**:
  1. Header with title swap ("Budget Dashboard" vs specific project), project filter dropdown, "View Project" button when scoped.
  2. Hero stats row (total budget, revised, spent, remaining, percent spent).
  3. Status summary cards (On Track, Warning, Critical, Over Budget) functioning as filters.
  4. Alerts list (info/warning/critical) referencing specific projects or line items.
  5. Chart (Recharts stacked bar) showing top projects or categories.
  6. DataTable:
     - Portfolio mode → rows per project with budget/spent/remaining/status columns.
     - Project mode → budget line items with original/revised/actual/committed/remaining/% used/status.
  7. "Items to Watch" panel highlighting highest-risk budgets.
- **Primary Interactions**:
  - Project filter updates URL (`?project=ID`) and reloads data.
  - Table row click routes to Projects tab budget subtab (`/?tab=projects&project=...&subtab=budget`).
  - Status cards toggle filters; alerts include CTA links.
- **Data & Dependencies**:
  - API `/api/dashboard/budget-metrics` returning hero metrics, projects, alerts, change order summary, optional line items.
  - Formatters from `theme.ts` ensure consistent currency/percent display.
- **Responsive & State Notes**:
  - Charts hidden if dataset empty to avoid layout issues.
  - Table scrollable on mobile with sticky headers; hero stats wrap into cards.

#### Settings Tab (`SettingsView.tsx`, `UserManagementView.tsx`, `PermissionsManagement.tsx`, `EntityManagementView.tsx`)
- **Purpose**: Centralize administration (users, permissions, entities, company info, integrations, preferences).
- **Layout Regions**:
  1. Sub-tab navigation (Users, Permissions, Entities, Company, Integrations, Preferences) filtered by role capabilities.
  2. Users tab: Data table + invite form + role badges + status toggles.
  3. Permissions tab: matrix or cards for role capabilities, toggles per module.
  4. Entities tab: list of owner entities with CRUD forms, nested contact info, linking to projects.
  5. Company tab: form for company name/address/phone/email with unsaved changes banner.
  6. Integrations tab: cards summarizing Twilio, AWS S3, DocuSign, QuickBooks states.
  7. Preferences tab: toggles for email/SMS notifications, dark mode.
  8. Toast container for saving feedback.
- **Primary Interactions**:
  - Tab switching updates URL `subtab`.
  - Forms auto-save via POST requests; reset button restores previous values.
  - Integrations cards show configured/coming soon; no direct configuration yet.
- **Data & Dependencies**:
  - Supabase `user_role`, internal `/api/settings/*` endpoints, localStorage fallbacks.
  - Authorization helpers `hasRoleAccess`, `canAccessUserManagement`.
- **Responsive & State Notes**:
  - Tab nav scrolls horizontally on small screens.
  - Company/preferences forms show skeleton while loading; dark mode toggle manipulates `document.documentElement`.

#### Daily Logs Tab (`DailyLogsView.tsx`)
- **Purpose**: Manage automated SMS/email prompts for PM daily log submissions.
- **Layout Regions**:
  1. Header with stats ("X requests • Updated HH:MM") and buttons for "Add Request" + "Refresh".
  2. Persistent error banner slot.
  3. List of request cards showing project, client, PM phone, schedule, status badge, retry count, latest notes.
  4. Empty state card when no requests exist.
  5. Add Request modal (project selector, PM phone, time picker, validation messages).
  6. Detail modal showing received notes timeline, PM notes pulled from payment applications, delete CTA.
- **Primary Interactions**:
  - Add request triggers Supabase insert; success toast describes SMS schedule.
  - Clicking card opens detail modal; delete icon removes request after confirmation.
  - Refresh button refetches, showing spinner inside icon.
- **Data & Dependencies**:
  - Supabase `daily_log_requests`, `projects`, `payment_applications` for PM notes.
  - `useModal` provides toasts and confirm dialogs.
- **Responsive & State Notes**:
  - Cards full-width on all devices; actions align to right on desktop.
  - Modals go edge-to-edge on small screens; phone validation ensures US numbers.

### Punch List System

#### Punch List View (`PunchListView.tsx`)
- **Purpose**: Comprehensive punch list management with multiple view modes for tracking project closeout items.
- **Layout Regions**:
  1. Header with title "Punch List" and "Add Item" CTA button.
  2. Four summary cards: Open Items, Due This Week, Overdue (red if >0), Completed This Week (green).
  3. Filter bar: search input, status dropdown, severity dropdown, overdue checkbox, view toggle (List/Board).
  4. List View: DataTable with columns for item number, description, location, severity badge, status badge, assigned contractor, due date, actions.
  5. Kanban View: four-column board (Open, In Progress, Completed, Verified) with draggable item cards.
- **Primary Interactions**:
  - "Add Item" opens `PunchListFormModal`.
  - Row/card click opens `PunchListDetailModal`.
  - View toggle switches between list and kanban.
  - Filters update API query params.
- **Data & Dependencies**:
  - API `/api/punch-list` with query params for filtering.
  - Summary calculated from items array.
  - Uses `DataTable` and `SignalBadge` components.
- **Responsive & State Notes**:
  - Kanban columns stack on mobile (1 column).
  - Cards show severity badges with color coding.
  - Loading spinner during fetch; empty state when no items.

#### Punch Lists Tab (`PunchListsTab.tsx`)
- **Purpose**: Project-scoped punch list management within project detail view.
- **Layout Regions**:
  1. Header with icon, title, description, and "Create Punch List" button.
  2. Four status cards: Assigned (blue), In Progress (yellow), Complete (green), Verified (purple).
  3. Filter section: contractor dropdown, status dropdown, priority dropdown.
  4. DataTable with columns: description/location, contractor/trade, priority badge, status badge, due date, photo count, actions.
  5. Empty state with illustration and create CTA.
- **Primary Interactions**:
  - Create button triggers `onCreatePunchList` callback.
  - View button opens detail modal.
  - Verify button (on complete items) marks as verified.
  - Delete button with confirmation.
- **Data & Dependencies**:
  - API `/api/punch-lists/{projectId}` for project-scoped items.
  - Contractor filter from unique contractors in items.
- **Responsive & State Notes**:
  - Responsive DataTable with action buttons.
  - Status icons (Clock, AlertCircle, CheckCircle2) indicate states.
  - Loading/error states with retry option.

#### Punch List Form Modal (`punch-list/PunchListFormModal.tsx`)
- **Purpose**: Create and edit punch list items with full field set.
- **Layout Regions**:
  1. Modal header with title and close button.
  2. Form fields: description, location/area, contractor select, severity select, due date, notes.
  3. Photo upload section with preview.
  4. Action buttons: Cancel, Save.
- **Primary Interactions**:
  - Form submission creates/updates item via API.
  - Photo upload handles file selection and preview.
  - Validation on required fields.
- **Data & Dependencies**:
  - Uses DataContext for contractor list.
  - API POST/PUT to `/api/punch-list`.
- **Responsive & State Notes**:
  - Full-screen on mobile; centered modal on desktop.
  - Loading state during save.

#### Punch List Detail Modal (`punch-list/PunchListDetailModal.tsx`)
- **Purpose**: View and update individual punch list item details.
- **Layout Regions**:
  1. Header with item number, status badge, close button.
  2. Info section: description, location, contractor, severity, due date.
  3. Notes section: contractor notes, GC notes.
  4. Photos gallery with lightbox.
  5. Timeline/history of status changes.
  6. Action buttons based on status (Start, Complete, Verify, Reopen).
- **Primary Interactions**:
  - Status update buttons trigger API calls.
  - Notes can be edited inline.
  - Photos open in lightbox.
- **Data & Dependencies**:
  - Full item data passed as prop.
  - API PUT for status updates.
- **Responsive & State Notes**:
  - Scrollable content area.
  - Timeline shows chronological updates.

### Schedule System

#### Schedule View (`schedule/ScheduleView.tsx`)
- **Purpose**: Central schedule management with Gantt chart and task list views.
- **Layout Regions**:
  1. Header with project selector, view mode toggle (Day/Week/Month), and "Add Task" button.
  2. View toggle: Gantt Chart / List / Timeline.
  3. Gantt Chart view: `GanttChartContainer` with drag-resize interactions.
  4. List view: DataTable with task name, dates, progress, contractor, status, actions.
  5. Filter bar: contractor filter, status filter, date range.
- **Primary Interactions**:
  - Add Task opens `TaskFormModal`.
  - Gantt drag updates task dates/progress.
  - Double-click task opens edit modal.
  - Delete task with confirmation.
- **Data & Dependencies**:
  - API `/api/schedules/{id}/tasks` for CRUD.
  - Uses `gantt-task-react` library for Gantt visualization.
- **Responsive & State Notes**:
  - Gantt has horizontal scroll on smaller screens.
  - List view as fallback for mobile.
  - Empty state prompts task creation.

#### Gantt Chart Container (`schedule/GanttChartContainer.tsx`)
- **Purpose**: Wrapper for gantt-task-react library with custom styling and interactions.
- **Layout Regions**:
  1. Gantt chart with task bars, timeline header, and task list.
  2. Empty state when no tasks exist.
- **Primary Interactions**:
  - Date change via drag updates parent.
  - Progress change via bar resize.
  - Double-click opens edit modal.
  - Expander click for parent/child tasks.
- **Data & Dependencies**:
  - Converts `ScheduleTask` to Gantt `Task` format.
  - View mode controls column width (Day=65px, Month=300px).
- **Responsive & State Notes**:
  - Min height 500px.
  - Task list column 155px wide.
  - Scroll container for overflow.

#### Task Form Modal (`schedule/TaskFormModal.tsx`)
- **Purpose**: Create and edit schedule tasks with dependency management.
- **Layout Regions**:
  1. Modal header with "New Task" or "Edit Task" title.
  2. Form fields: task name (required), description, start date, end date, contractor select, status select, progress slider.
  3. Predecessors multi-select for dependency management.
  4. Action buttons: Cancel, Save Task.
- **Primary Interactions**:
  - Form validation ensures required fields.
  - End date minimum set to start date.
  - Multi-select for predecessors (Ctrl/Cmd to select multiple).
  - Submit creates/updates task via API.
- **Data & Dependencies**:
  - Fetches contractors from Supabase.
  - Uses existing tasks for predecessor options.
  - API POST/PUT to `/api/schedules/{id}/tasks`.
- **Responsive & State Notes**:
  - Max height 90vh with scroll.
  - Loading state during save.
  - Excludes self from predecessor list.

### Warranty System

#### Warranties List (`warranties/WarrantiesList.tsx`)
- **Purpose**: Track and manage warranty records across projects.
- **Layout Regions**:
  1. Header with filter controls and "Add Warranty" button.
  2. Filter bar: project filter, status filter (active/expiring/expired), search.
  3. DataTable with columns: project, contractor, type, coverage, dates, status, actions.
  4. Detail drawer for warranty details and documents.
- **Primary Interactions**:
  - Add warranty opens `WarrantyFormModal`.
  - Row click opens detail view.
  - Download warranty documents.
  - Status badges indicate active/expiring/expired.
- **Data & Dependencies**:
  - API `/api/warranties` for CRUD.
  - Warranty types from `/api/warranties/types`.
- **Responsive & State Notes**:
  - Expiring warranties highlighted.
  - Table scrollable on mobile.

#### Warranty Form Modal (`warranties/WarrantyFormModal.tsx`)
- **Purpose**: Log new warranty records with coverage details.
- **Layout Regions**:
  1. Modal header "Log New Warranty" with close button.
  2. Two-column form grid:
     - Project select (required), contractor select.
     - Warranty type dropdown, duration months input.
     - Start date (required), end date (auto-calculated, read-only).
  3. Full-width fields: coverage description (required), notes/exclusions.
  4. Action buttons: Cancel, Save Warranty.
- **Primary Interactions**:
  - End date auto-calculates from start date + duration.
  - Warranty types fetched from API.
  - Form validation on required fields.
- **Data & Dependencies**:
  - DataContext for projects and subcontractors.
  - API POST to `/api/warranties`.
  - Warranty types from `/api/warranties/types`.
- **Responsive & State Notes**:
  - Two columns on md+, single column on mobile.
  - Max height 90vh with scroll.
  - Loading state during save.

### PM Dashboard (`PMDashboard.tsx`)

#### PM Dashboard Shell
- **Purpose**: Role-specific experience for project managers focusing on approvals, project stats, and daily log reviews without admin clutter.
- **Layout Regions**:
  1. Shared Header + profile drawer (same component) plus PM-specific quick actions (create payment app).
  2. Tab navigation (Payment Applications, Projects, Daily Log Requests).
  3. Content area that swaps per tab, reusing DataTable/SignalBadge patterns.
- **Primary Interactions**:
  - Tab switching is local state; not tied to global nav.
  - Header search limited to PM data scope.
- **Data & Dependencies**:
  - Supabase for all queries; uses `useModal` for toasts and confirm.
- **Responsive & State Notes**:
  - Tab nav compresses to emoji icons + short labels on small screens.

#### PM Payment Applications Tab
- **Purpose**: Rapid triage of incoming payment apps needing PM attention.
- **Layout Regions**:
  1. Summary row with stat cards (active apps, completed, budget totals).
  2. Queue list grouped by project with priority badges, progress chips.
  3. Individual payment cards (status, contractor, amount, created date, Verify button).
  4. Modal/drawer for verifying an application (`/payments/:id/verify` link with `returnTo` param).
  5. Data modal accessible via stat cards (contractors list, pending apps, completed apps).
- **Primary Interactions**:
  - Stat cards open modal with relevant data set (contractors, payment apps).
  - "Verify" button routes to payment verification page while passing context.
- **Data & Dependencies**:
  - Supabase queries for project contractors, payment apps filtered by status.
  - Formatters for currency, statuses.
- **Responsive & State Notes**:
  - Cards switch from grid to stacked on mobile.
  - Loading skeleton shown while stats fetch; setInterval refresh.

#### PM Projects Tab
- **Purpose**: Provide PM-specific summary of each assigned project with KPIs and quick actions.
- **Layout Regions**:
  1. Project cards showing contract counts, payment counts, budget totals, completion percentage.
  2. "View Project" button launching detailed modal with contractors, payment history, daily logs, PM notes, line items (via Promise.all query).
  3. Contract modal, payment modal, daily log modal within project detail.
- **Primary Interactions**:
  - Click project card to open deep modal; inside, tabs for sections plus CTAs (create payment app, open payment verify view).
  - Stats refresh button recalculates metrics live.
- **Data & Dependencies**:
  - Multiple Supabase tables (projects, project_contractors, payment_applications, daily_log_requests, pm_notes, contracts, line items).
- **Responsive & State Notes**:
  - Cards highlight high/low statuses with SignalBadge.
  - Modals occupy large portion of viewport; nested modals guard scroll.

#### PM Daily Log Requests Tab
- **Purpose**: Mirror admin Daily Logs but scoped to PM follow-ups.
- **Layout Regions & Interactions**: Same core structure as admin view but limited to PM-managed projects, with quick actions to create payment applications from notes context.
- **Data & Dependencies**: Supabase `daily_log_requests` filtered by PM assignment, plus pm_notes.
- **Responsive Notes**: Copies responsive behaviors from admin tab to keep training consistent.

### Shared Payment Components

#### Payment Application Card (`shared/PaymentApplicationCard.tsx`)
- **Purpose**: Mobile-first card component for displaying payment application summaries.
- **Layout Regions**:
  1. Header row: checkbox (optional), app ID, status badge, amount.
  2. Info section: contractor name, project name, date.
  3. Actions row: Review/View button, Delete button.
- **Primary Interactions**:
  - Checkbox for bulk selection.
  - Card click triggers `onClick` handler.
  - Review button calls `onVerify`.
  - Delete button calls `onDelete`.
- **Data & Dependencies**:
  - `PaymentApplication` type with contractor/project joins.
  - `PaymentStatusBadge` for status display.
- **Responsive & State Notes**:
  - Compact mode hides info section.
  - Selected state shows blue border/background.
  - Completed apps show "View" instead of "Review".

### UI Utilities

#### Confirm Dialog (`ui/ConfirmDialog.tsx`)
- **Purpose**: Reusable confirmation modal with semantic variants.
- **Layout Regions**:
  1. Backdrop with blur effect.
  2. Modal card with:
     - Header: icon (variant-specific), title, close button.
     - Message box with colored background.
     - Optional textarea input.
     - Two-button footer (Cancel/Confirm).
- **Primary Interactions**:
  - Backdrop click triggers cancel.
  - Confirm button supports async operations with loading state.
  - ESC key closes (via backdrop).
- **Data & Dependencies**:
  - Props control all content and callbacks.
  - Variants: `delete` (red), `warning` (orange), `success` (green), `info` (blue).
- **Responsive & State Notes**:
  - Centered with max-width.
  - Loading spinner replaces confirm text.
  - Uses CSS custom properties for status colors.

### Key Modals & Forms

#### Project & Entity Forms (`ProjectFormWithEntity.tsx`, `EntityManagementView.tsx`)
- **Purpose**: Compose or edit project records with owner entity linkage, contacts, and budget baseline.
- **Highlights**:
  - Multi-section form (Project Info, Owner Entity, Financials, Key Dates).
  - Entity picker allows inline creation (modal) if needed.
  - Uses validators for required fields, email, phone, numeric budgets.
  - Save/cancel buttons persist data via API, with spinner states.

#### Payment Verification (`PaymentProcessingView.tsx`, `ManualPaymentEntryModal.tsx`)
- **Purpose**: Walk reviewers through verifying line items, attachments, SMS submissions, and issuing payments.
- **Highlights**:
  - Multi-step vertical wizard (Submission data → Documents → Approvals → Payout).
  - Manual entry modal collects payment medium, check number, memo, attachments.
  - Includes DocuSign status, SMS audit trail, and ability to resend.

#### Contractor Contact & Delete Modals (embedded in `ContractorsView.tsx`)
- **Purpose**: Provide quick outreach and safe deletes.
- **Highlights**:
  - SMS modal with phone preview, message textarea, status states (sending/success/error).
  - Delete confirmation outlines impact (number of contracts) and requires explicit confirm.

#### Change Order Form (`ChangeOrderForm.tsx`)
- **Purpose**: Collect scope, justification, cost, schedule impact, approvals, and attachments for a CO.
- **Highlights**:
  - Sectioned form with progress indicator, support for multi-photo upload, justification text area.
  - Save as draft vs submit for approval.

#### Budget Deep Dive (`ExcelBudgetTable.tsx`, `ProjectBudgetDetail.tsx`, `PropertyBudgetView.tsx`)
- **Purpose**: Provide spreadsheet-like editing or review of budget line items when users drill from dashboard.
- **Highlights**:
  - Sticky headers, inline editing for certain cells, conditional formatting (critical/warning).
  - Row grouping by division/trade with collapsible sections.

### Performance Components

#### Virtualized Lists (`src/components/ui/VirtualizedList.tsx`, `optimized/VirtualizedProjectList.tsx`)
- **Purpose**: Render large lists efficiently using windowing technique.
- **Highlights**:
  - Only renders visible items plus overscan buffer.
  - Supports variable height items.
  - Used for project and contractor lists with 50+ items.

#### Lazy Loading (`ui/LazySection.tsx`, `optimized/LazyCard.tsx`)
- **Purpose**: Defer loading of off-screen content.
- **Highlights**:
  - Uses Intersection Observer API.
  - Skeleton placeholder until content enters viewport.
  - Reduces initial bundle and render time.

---

## Component Quick Reference

| Component | Tab/Location | Key Features |
|-----------|--------------|--------------|
| `OverviewView` | Overview | KPIs, decision queue, project tiles |
| `ProjectsView` | Projects | Master-detail, subtabs, CRUD |
| `ContractorsView` | Contractors | CRM, messaging, performance |
| `SubcontractorsView` | Contractors | Directory, compliance, ratings |
| `PaymentsView` | Payments | Pipeline, bulk actions, verification |
| `ChangeOrdersView` | Change Orders | Approval workflow, attachments |
| `BudgetDashboard` | Budget | Portfolio view, drill-down, alerts |
| `ComplianceView` | Compliance | Permit tracking, project health |
| `MetricsView` | Metrics | Analytics, trends, utilization |
| `FieldOpsView` | Field Ops | Schedule, photos, warranties |
| `PunchListView` | Punch Lists | List/kanban, severity tracking |
| `SettingsView` | Settings | Users, permissions, integrations |
| `DailyLogsView` | Daily Logs | SMS automation, PM notes |

---

These wireframes reflect the current production components. Hand this document to the UI consultant alongside access to the repository so they can explore detailed states within each referenced file.
