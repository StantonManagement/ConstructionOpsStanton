## ConstructionOps – Compact Wireframes

This is a reduced, “at a glance” version of `docs/wireframes.md` for fast orientation. Each row focuses on **purpose**, **core interactions**, and **who uses it**.

---

## Global & Access

- **Auth Screen (`AuthScreen.tsx`)**
  - **Purpose**: Combined login / sign-up / reset for all roles.
  - **Core**: Email+password auth, password reset, role-based routing via Supabase.
  - **Who**: All users.

- **Construction Dashboard Shell (`ConstructionDashboard.tsx`, `Header.tsx`, `Navigation.tsx`, `UserProfile.tsx`)**
  - **Purpose**: Main admin/staff workspace frame.
  - **Core**: Role-aware nav tabs, global search, profile drawer, URL-synced `tab` / `project` / `subtab`.
  - **Who**: Admin, Staff.

- **PM Dashboard (`PMDashboard.tsx`)**
  - **Purpose**: Focused PM view on payment apps, projects, and daily logs.
  - **Core**: Local tab state, PM-scoped queries, quick “Verify” routes into payments.
  - **Who**: Project Managers.

---

## Admin/Staff Tabs (Dashboard)

- **Overview (`OverviewView.tsx`)**
  - **Purpose**: Portfolio health snapshot.
  - **Core**: KPI cards, “Decisions Queue” for payment attention, project tiles that deep-link into Projects.

- **Projects (`ProjectsView.tsx` + `ProjectDetailView.tsx` + `ProjectContractorsTab.tsx` + `ProjectBudgetDetail.tsx`)**
  - **Purpose**: Master-detail cockpit for a single job.
  - **Core**: Project list, detail subtabs (Contractors, Budget, Payments, Punch Lists, Docs), project create/edit, delete.

- **Field Ops (`FieldOpsView.tsx` + `ScheduleView.tsx` + `PhotoGalleryView.tsx` + `WarrantiesList.tsx`)**
  - **Purpose**: Daily field execution—schedule, photos, and warranties.
  - **Core**: Calendar/list schedule, photo upload + gallery, warranty table with filters.

- **Payments (`PaymentsView.tsx` + `PaymentApplicationsView.tsx` + `PaymentProcessingView.tsx` + `ManualPaymentEntryModal.tsx`)**
  - **Purpose**: End‑to‑end payment application pipeline.
  - **Core**: Status KPIs, filters+pagination, bulk select (SMS / approve / delete), detail drawers, manual payment entry.

- **Contractors & Subs (`ContractorsView.tsx`, `ContractorDetailView.tsx`, `VendorDetailView.tsx`, `SubcontractorsView.tsx`)**
  - **Purpose**: CRM for vendors and subcontractors.
  - **Core**: Search/filter, add/edit contractor, SMS contact, performance notes, compliance view.

- **Change Orders (`ChangeOrdersView.tsx`, `ChangeOrderForm.tsx`)**
  - **Purpose**: Track and approve change orders.
  - **Core**: CO table with status, approve/reject flows, attachments, creation/edit modal.

- **Budget Dashboard (`BudgetDashboard.tsx`, `ExcelBudgetTable.tsx`, `ProjectBudgetDetail.tsx`, `PropertyBudgetView.tsx`)**
  - **Purpose**: Portfolio and per‑project budget vs actuals.
  - **Core**: Hero metrics, status cards, alerts, chart, DataTable per project or per line item.

- **Compliance (`ComplianceView.tsx`)**
  - **Purpose**: Permit/compliance status across projects.
  - **Core**: KPI cards, permit‑type progress bars, project compliance cards, action items list.

- **Metrics (`MetricsView.tsx`)**
  - **Purpose**: Portfolio analytics and trends.
  - **Core**: Metric cards, financial overview, performance metrics, recent activity, status distribution.

- **Settings (`SettingsView.tsx`, `UserManagementView.tsx`, `PermissionsManagement.tsx`, `EntityManagementView.tsx`)**
  - **Purpose**: Admin configuration and user/entity management.
  - **Core**: Users table + invite, permissions matrix, entities CRUD, company + preferences forms, integrations summary.

- **Daily Logs (`DailyLogsView.tsx`)**
  - **Purpose**: Automate daily log SMS/email prompts.
  - **Core**: Request cards, add/delete request modals, error banner, refresh.

---

## Payments – Deep Flows

- **Payment Applications List (`PaymentApplicationsView.tsx`)**
  - **Purpose**: Operational queue for all payment apps.
  - **Core**: Status + project filters, search, mobile cards + desktop table, bulk approve/delete, DocuSign send hooks.

- **Payment Processing (`PaymentProcessingView.tsx`)**
  - **Purpose**: Create/prepare payment apps and send reminders.
  - **Core**: Project selection grid (“Create Payment Apps”), outstanding vs upcoming apps, SMS/email reminders, quick “prepare payment” (status → approved).

- **Payment Verification Page (`payments/[id]/verify/page.tsx`)**
  - **Purpose**: Verify a single payment app in detail.
  - **Core**: Sticky header + status, payment summary, PM notes, embedded PDF (if any), editable line‑item table (PM‑verified %), optional change orders, G703 PDF download, approve/reject/recall with optional vendor notification.

---

## Punch Lists & Contractor Portal

- **Punch List View (`PunchListView.tsx`)**
  - **Purpose**: Global punch list workspace.
  - **Core**: Summary cards, filters, list vs kanban toggle, item create/edit/detail via modals.

- **Project Punch Lists (`PunchListsTab.tsx`)**
  - **Purpose**: Project‑scoped punch items.
  - **Core**: Status cards, contractor/priority filters, DataTable, verify/delete actions, create flow.

- **Contractor Portal (`contractor-portal/[token]/page.tsx`)**
  - **Purpose**: External portal for subs to work punch items.
  - **Core**: Token‑based access, stats, project/status filters, per‑item cards with Start/Complete and photo upload, expanded notes/photos/timeline.

---

## Schedule & Warranty

- **Schedule (`ScheduleView.tsx`, `GanttChartContainer.tsx`, `TaskFormModal.tsx`, `MobileTaskTimeline.tsx`)**
  - **Purpose**: Manage project schedule visually.
  - **Core**: Project selector, Gantt vs list vs timeline modes, drag‑to‑adjust tasks, task create/edit with predecessors.

- **Warranties (`WarrantiesList.tsx`, `WarrantyFormModal.tsx`)**
  - **Purpose**: Track warranties across projects.
  - **Core**: Filters (project/status), warranties table, add/edit modal, document download.

---

## Key Shared Pieces (Very Short)

- **ConfirmDialog / Toast / EmptyState**
  - **Use**: Standard confirmation, notifications, and empty‑state patterns across the app.

- **Virtualized Lists & Lazy Sections**
  - **Use**: Performance helpers for large lists and off‑screen content.

- **Line Item Tools (`LineItemFormModal.tsx`, `LineItemVerification.tsx`, `LienWaiverManager.tsx`)**
  - **Use**: Current modal for line‑item CRUD; placeholder shells for future fine‑grained verification and lien workflow screens.



