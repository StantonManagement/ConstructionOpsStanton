# Database Schema Reference

> **Last Updated:** January 7, 2026  
> **Database:** Supabase PostgreSQL 15.8.1  
> **Project:** Ops Dashboard Construction (iyiqdgmpcuczzigotjhf)

## Quick Reference

This document provides a comprehensive reference for the ConstructionOps database schema. Use this for development reference when working with database queries and relationships.

## Table Index

### Core Tables
- [users](#users) - User accounts and authentication
- [projects](#projects) - Construction projects/properties
- [contractors](#contractors) - Subcontractors and vendors
- [owner_entities](#owner_entities) - Legal entities owning properties

### Contract & Payment Management
- [contracts](#contracts) - Contract agreements
- [project_contractors](#project_contractors) - Project-contractor relationships
- [project_line_items](#project_line_items) - G-703 line items
- [payment_applications](#payment_applications) - Payment applications
- [payment_documents](#payment_documents) - Payment documents
- [payment_sms_conversations](#payment_sms_conversations) - SMS payment workflows

### Task Management (Renovation Module)
- [locations](#locations) - Physical locations (units, common areas)
- [tasks](#tasks) - Work items within locations
- [task_templates](#task_templates) - Reusable task templates
- [task_dependencies](#task_dependencies) - Task dependencies

### Portfolio & Budgeting
- [portfolios](#portfolios) - Portfolio groupings
- [property_budgets](#property_budgets) - Budget categories
- [funding_sources](#funding_sources) - Funding sources
- [backlog_items](#backlog_items) - Future work items

### Scheduling
- [project_schedules](#project_schedules) - Master schedules
- [schedule_tasks](#schedule_tasks) - Gantt chart tasks
- [schedule_defaults](#schedule_defaults) - Default durations

### Supporting Tables
- [change_orders](#change_orders) - Change orders
- [photos](#photos) - Photo storage
- [notifications](#notifications) - User notifications
- [user_role](#user_role) - User role assignments
- [permissions](#permissions) - Permission definitions
- [role_permissions](#role_permissions) - Role-permission mappings

---

## Core Tables

### users
**Purpose:** User accounts for authentication and authorization  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| uuid | uuid | Yes | null | → auth.users.id |
| name | varchar | Yes | null | Full name |
| email | varchar | No | - | Unique |
| phone | varchar | Yes | null | Contact number |
| role | varchar | No | - | admin/pm/staff/contractor |
| company | varchar | Yes | null | Company name |
| address | text | Yes | null | Physical address |
| avatar_url | text | Yes | null | Profile picture |
| is_active | boolean | Yes | null | Active status |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |

**Referenced By:** payment_application_reviews, site_verification_photos, payment_applications, tasks, notifications

---

### projects
**Purpose:** Construction projects/properties  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| name | varchar | No | - | Project name |
| project_code | varchar | No | gen_random_uuid() | Unique identifier |
| client_name | varchar | No | - | Client/owner |
| address | text | Yes | null | Property address |
| owner_entity_id | integer | Yes | null | → owner_entities.id |
| portfolio_id | uuid | Yes | null | → portfolios.id |
| portfolio_name | varchar | Yes | null | Portfolio grouping |
| total_units | integer | Yes | 1 | Number of units (≥0) |
| current_phase | varchar | Yes | null | Construction phase |
| status | varchar | Yes | 'active' | Project status |
| start_date | date | Yes | null | Start date |
| target_completion_date | date | Yes | null | Target completion |
| budget | numeric | Yes | null | Total budget |
| spent | float4 | Yes | null | Amount spent |
| starting_balance | numeric | Yes | 0 | Initial balance |
| at_risk | boolean | Yes | false | Risk flag |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |
| updated_at | timestamp | Yes | CURRENT_TIMESTAMP | |

**Referenced By:** 40+ tables including contracts, payments, tasks, schedules

---

### contractors
**Purpose:** Subcontractors and vendors  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| name | varchar | No | - | Business name |
| trade | varchar | No | - | Primary trade |
| phone | varchar | No | - | Contact phone |
| email | varchar | Yes | null | Contact email |
| address | text | Yes | null | Street address (G703) |
| city | text | Yes | null | City (G703) |
| state | text | Yes | null | State (G703) |
| zip | text | Yes | null | Zip code (G703) |
| contact_name | text | Yes | null | Officer name (G703) |
| status | varchar | Yes | 'active' | Contractor status |
| insurance_status | varchar | Yes | 'valid' | Insurance status |
| license_status | varchar | Yes | 'valid' | License status |
| performance_score | numeric | Yes | null | Performance rating |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |
| updated_at | timestamp | Yes | CURRENT_TIMESTAMP | |

**Referenced By:** payment_sms_conversations, warranties, contractor_portal_tokens, schedule_tasks, punch_list_items, project_contractors, project_line_items, payment_applications, contracts, tasks

---

### owner_entities
**Purpose:** Legal entities (LLCs) that own properties  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| name | varchar | No | - | Entity name |
| entity_type | varchar | No | - | LLC/Corporation/Partnership |
| tax_id | varchar | Yes | null | EIN/Tax ID |
| contact_name | varchar | Yes | null | Primary contact |
| contact_email | varchar | Yes | null | Contact email |
| contact_phone | varchar | Yes | null | Contact phone |
| accounting_ref | varchar | Yes | null | Accounting reference |
| notes | text | Yes | null | Entity notes |
| is_active | boolean | Yes | true | Active status |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |
| updated_at | timestamp | Yes | CURRENT_TIMESTAMP | |

**Referenced By:** projects.owner_entity_id

---

## Contract & Payment Management

### contracts
**Purpose:** Contract agreements between projects and subcontractors  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| subcontractor_id | integer | No | - | → contractors.id |
| contract_nickname | varchar | No | - | Display name |
| original_contract_amount | numeric | No | - | Initial value |
| contract_amount | numeric | No | - | Current value (with COs) |
| start_date | date | No | - | Contract start |
| end_date | date | Yes | null | Contract end |
| display_order | integer | Yes | 0 | Sort order |
| created_at | timestamptz | Yes | now() | |

**Referenced By:** project_line_items.contract_id

---

### project_contractors
**Purpose:** Junction table linking contractors to projects  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| contractor_id | integer | No | - | → contractors.id |
| budget_item_id | integer | Yes | null | → property_budgets.id |
| original_contract_amount | numeric | No | - | Initial value |
| contract_amount | numeric | No | - | Current value |
| paid_to_date | numeric | Yes | 0 | Total paid |
| contract_status | varchar | Yes | 'active' | Status |
| change_orders_pending | boolean | Yes | false | Has pending COs |
| last_payment_date | date | Yes | null | Last payment |
| display_order | integer | Yes | 0 | Sort order |
| updated_at | timestamptz | Yes | now() | |

---

### project_line_items
**Purpose:** G-703 Continuation Sheet line items  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| contract_id | integer | No | - | → contracts.id |
| contractor_id | integer | No | - | → contractors.id |
| item_no | varchar | No | - | Line item number |
| description_of_work | text | No | - | Work description |
| scheduled_value | numeric | No | - | Total line item value |
| from_previous_application | numeric | Yes | 0 | Previous total |
| this_period | numeric | Yes | 0 | Current period |
| material_presently_stored | numeric | Yes | 0 | Stored materials |
| percent_completed | numeric | Yes | null | Completion % |
| percent_gc | numeric | Yes | 0 | GC % |
| change_order_amount | numeric | Yes | 0 | CO adjustments |
| original_contract_amount | numeric | Yes | null | Original value |
| amount_for_this_period | numeric | Yes | null | Calculated amount |
| status | varchar | Yes | 'active' | Status |
| display_order | integer | Yes | 0 | Sort order |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |
| updated_at | timestamp | Yes | CURRENT_TIMESTAMP | |

---

### payment_applications
**Purpose:** Payment applications submitted by contractors  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| contractor_id | integer | No | - | → contractors.id |
| sms_conversation_id | integer | Yes | null | → payment_sms_conversations.id |
| status | varchar | Yes | 'draft' | Application status |
| payment_period_end | date | No | - | Period ending |
| due_date | date | Yes | null | Payment due |
| total_contract_amount | numeric | No | - | Total contract |
| previous_payments | numeric | Yes | 0 | Previous payments |
| current_period_value | numeric | No | - | Work this period |
| current_payment | numeric | No | - | Amount due |
| final_amount | numeric | Yes | null | Final approved |
| pm_notes | text | Yes | null | PM notes |
| pm_verification_completed | boolean | Yes | false | PM verified |
| photos_uploaded_count | integer | Yes | 0 | Photo count |
| lien_waiver_required | boolean | Yes | false | Lien waiver |
| approved_by | integer | Yes | null | → users.id |
| approved_at | timestamptz | Yes | null | Approval time |
| approval_notes | text | Yes | null | Approval notes |
| rejected_by | varchar | Yes | null | Rejector ID |
| rejected_at | timestamptz | Yes | null | Rejection time |
| rejection_notes | text | Yes | null | Rejection reason |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |
| updated_at | timestamptz | Yes | now() | |

**Referenced By:** payment_application_reviews, site_verification_photos

---

### payment_documents
**Purpose:** Documents attached to payment applications  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| payment_application_id | integer | No | - | → payment_applications.id |
| document_type | varchar | No | - | Document type |
| file_url | text | No | - | S3/storage URL |
| file_name | varchar | No | - | Original filename |
| file_size | integer | Yes | null | Size in bytes |
| uploaded_by | uuid | Yes | null | Uploader |
| created_at | timestamptz | Yes | now() | |

---

### payment_sms_conversations
**Purpose:** SMS-based payment application conversations  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| contractor_id | integer | No | - | → contractors.id |
| phone_number | varchar | No | - | Contractor phone |
| status | varchar | Yes | 'active' | Conversation status |
| current_step | varchar | Yes | null | Current dialog step |
| conversation_data | jsonb | Yes | null | State data |
| started_at | timestamptz | Yes | now() | Start time |
| completed_at | timestamptz | Yes | null | Completion time |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

**Referenced By:** payment_applications.sms_conversation_id

---

## Task Management (Renovation Module)

### locations
**Purpose:** Physical locations within projects (units, common areas)  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| project_id | bigint | No | - | → projects.id |
| name | varchar | No | - | Location name |
| type | location_type | No | - | unit/common_area/exterior/building_wide |
| unit_type | unit_type | Yes | null | studio/1BR/2BR/3BR |
| unit_number | varchar | Yes | null | Unit number |
| floor | integer | Yes | null | Floor number |
| status | location_status | No | 'not_started' | not_started/in_progress/complete/on_hold |
| blocked_reason | blocked_reason | Yes | null | materials/labor/cash/dependency/other |
| blocked_note | text | Yes | null | Blocking details |
| template_applied_id | uuid | Yes | null | → task_templates.id |
| tenant_id | uuid | Yes | '00000000-0000-0000-0000-000000000001' | Multi-tenancy |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

**Referenced By:** tasks.location_id

---

### tasks
**Purpose:** Individual work items within locations  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| location_id | uuid | No | - | → locations.id |
| name | varchar | No | - | Task name |
| description | text | Yes | null | Description |
| status | task_status | No | 'not_started' | not_started/in_progress/worker_complete/verified |
| priority | priority_level | No | 'medium' | low/medium/high/urgent |
| assigned_contractor_id | bigint | Yes | null | → contractors.id |
| budget_category_id | bigint | Yes | null | → property_budgets.id |
| estimated_cost | numeric | Yes | null | Estimated cost |
| actual_cost | numeric | Yes | null | Actual cost |
| duration_days | integer | Yes | null | Duration |
| scheduled_start | date | Yes | null | Start date |
| scheduled_end | date | Yes | null | End date |
| worker_completed_at | timestamptz | Yes | null | Worker completion |
| verified_at | timestamptz | Yes | null | PM verification |
| verified_by | uuid | Yes | null | → users.uuid |
| verification_photo_url | text | Yes | null | Photo URL |
| verification_notes | text | Yes | null | Notes |
| sort_order | integer | Yes | 0 | Display order |
| tenant_id | uuid | Yes | '00000000-0000-0000-0000-000000000001' | Multi-tenancy |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

---

### task_templates
**Purpose:** Reusable task templates for location types  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| name | varchar | No | - | Template name |
| description | text | Yes | null | Description |
| location_type | location_type | No | - | Applicable type |
| unit_type | unit_type | Yes | null | Applicable unit type |
| tasks | jsonb | No | - | Task definitions array |
| is_active | boolean | Yes | true | Active status |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

---

### task_dependencies
**Purpose:** Task dependencies (A must complete before B)  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| task_id | uuid | No | - | Dependent task |
| depends_on_task_id | uuid | No | - | Prerequisite task |
| project_id | bigint | Yes | null | → projects.id |
| dependency_type | varchar | Yes | 'finish_to_start' | Relationship type |
| created_at | timestamptz | Yes | now() | |

---

## Portfolio & Budgeting

### portfolios
**Purpose:** Portfolio groupings for projects  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| name | varchar | No | - | Portfolio name (unique) |
| code | varchar | No | - | Portfolio code (unique) |
| description | text | Yes | null | Description |
| is_active | boolean | Yes | true | Active status |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

**Referenced By:** projects.portfolio_id, backlog_items.portfolio_id, funding_sources.portfolio_id

---

### property_budgets
**Purpose:** Budget categories for projects  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| category_name | varchar | No | - | Category name |
| description | text | Yes | null | Description |
| original_amount | numeric | No | - | Original budget |
| revised_amount | numeric | No | - | Revised (with COs) |
| committed_costs | numeric | Yes | 0 | Committed costs |
| actual_spend | numeric | Yes | 0 | Actual spent |
| display_order | integer | Yes | 0 | Sort order |
| is_active | boolean | Yes | true | Active status |
| notes | text | Yes | null | Notes |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |
| updated_at | timestamp | Yes | CURRENT_TIMESTAMP | |

**Referenced By:** project_contractors.budget_item_id, tasks.budget_category_id, schedule_tasks.budget_category_id

---

### funding_sources
**Purpose:** Funding sources (loans, grants, equity)  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| portfolio_id | uuid | No | - | → portfolios.id |
| name | varchar | No | - | Source name |
| type | funding_type | No | 'loan' | loan/grant/equity/other |
| lender_name | varchar | Yes | null | Lender/investor |
| commitment_amount | numeric | Yes | null | Committed amount |
| description | text | Yes | null | Details |
| is_active | boolean | Yes | true | Active status |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

---

### backlog_items
**Purpose:** Future projects/work items  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| title | varchar | No | - | Item title |
| description | text | Yes | null | Description |
| scope_level | backlog_scope | No | - | portfolio/property |
| portfolio_id | uuid | No | - | → portfolios.id |
| property_id | bigint | Yes | null | → projects.id |
| estimated_cost | numeric | Yes | null | Estimated cost |
| status | backlog_status | Yes | 'active' | active/converted/archived |
| converted_to_project_id | bigint | Yes | null | → projects.id |
| created_by | uuid | Yes | null | Creator |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

---

## Scheduling

### project_schedules
**Purpose:** Master schedule for each project  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| project_id | integer | No | - | → projects.id |
| start_date | date | No | - | Schedule start |
| target_end_date | date | No | - | Target completion |
| actual_end_date | date | Yes | null | Actual completion |
| status | varchar | Yes | 'on_track' | on_track/at_risk/delayed/complete |
| created_by | uuid | Yes | null | Creator |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

**Referenced By:** schedule_tasks.schedule_id

---

### schedule_tasks
**Purpose:** Gantt chart tasks within schedules  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (uuid)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | No | uuid_generate_v4() | Primary key |
| schedule_id | uuid | No | - | → project_schedules.id |
| task_name | varchar | No | - | Task name |
| description | text | Yes | null | Description |
| start_date | date | No | - | Start date |
| end_date | date | No | - | End date |
| duration_days | integer | No | - | Duration |
| progress | integer | Yes | 0 | Completion % (0-100) |
| status | varchar | Yes | 'not_started' | not_started/in_progress/complete |
| contractor_id | integer | Yes | null | → contractors.id |
| budget_category_id | integer | Yes | null | → property_budgets.id |
| parent_task_id | uuid | Yes | null | → schedule_tasks.id |
| is_milestone | boolean | Yes | false | Milestone flag |
| constraint_type | varchar | Yes | null | Constraint type |
| constraint_date | date | Yes | null | Constraint date |
| sort_order | integer | Yes | 0 | Display order |
| created_by | uuid | No | - | Creator |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

---

### schedule_defaults
**Purpose:** Default durations for budget categories  
**RLS:** ❌ Disabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| budget_category | varchar | No | - | Category name |
| default_duration_days | integer | No | - | Default duration |
| display_order | integer | Yes | 0 | Sort order |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

---

## Supporting Tables

### change_orders
**Purpose:** Change orders for projects  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| contractor_id | integer | No | - | → contractors.id |
| budget_category_id | integer | Yes | null | → property_budgets.id |
| co_number | varchar | No | - | CO number |
| title | varchar | No | - | CO title |
| description | text | No | - | Description |
| reason_category | varchar | No | - | Reason category |
| justification | text | No | - | Justification |
| cost_impact | numeric | No | - | Cost impact |
| schedule_impact_days | integer | Yes | 0 | Schedule impact |
| priority | varchar | Yes | 'medium' | low/medium/high/urgent |
| status | varchar | Yes | 'draft' | draft/submitted/approved/rejected |
| submitted_date | date | Yes | null | Submission date |
| approved_date | date | Yes | null | Approval date |
| approved_by | uuid | Yes | null | Approver |
| notes | text | Yes | null | Notes |
| created_by | uuid | No | - | Creator |
| created_at | timestamp | Yes | CURRENT_TIMESTAMP | |
| updated_at | timestamp | Yes | CURRENT_TIMESTAMP | |

---

### photos
**Purpose:** Photo storage for projects/tasks/payments  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| project_id | integer | No | - | → projects.id |
| task_id | uuid | Yes | null | → tasks.id |
| payment_application_id | integer | Yes | null | → payment_applications.id |
| photo_url | text | No | - | S3/storage URL |
| caption | text | Yes | null | Caption |
| taken_by | uuid | Yes | null | Photographer |
| taken_at | timestamptz | Yes | now() | Photo timestamp |
| created_at | timestamptz | Yes | now() | |

---

### notifications
**Purpose:** User notifications  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| user_id | integer | No | - | → users.id |
| type | varchar | No | - | Notification type |
| title | varchar | No | - | Title |
| message | text | No | - | Message |
| link | varchar | Yes | null | Resource link |
| read | boolean | Yes | false | Read status |
| created_at | timestamptz | Yes | now() | |

---

## Authorization

### user_role
**Purpose:** User role assignments  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| user_id | uuid | No | - | → auth.users.id |
| role | varchar | No | - | admin/pm/staff/contractor |
| created_at | timestamptz | Yes | now() | |
| updated_at | timestamptz | Yes | now() | |

---

### permissions
**Purpose:** Permission definitions  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| permission_key | varchar | No | - | Unique key |
| permission_name | varchar | No | - | Display name |
| permission_category | varchar | No | - | Category |
| description | text | Yes | null | Description |
| created_at | timestamptz | Yes | now() | |

---

### role_permissions
**Purpose:** Role-permission mappings  
**RLS:** ✅ Enabled  
**Primary Key:** `id` (integer, auto-increment)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | No | nextval | Primary key |
| role | varchar | No | - | Role name |
| permission_id | integer | No | - | → permissions.id |
| granted_by | uuid | Yes | null | Granter |
| granted_at | timestamptz | Yes | now() | |

---

## Custom Types (Enums)

### location_type
- `unit` - Individual unit
- `common_area` - Common area
- `exterior` - Exterior space
- `building_wide` - Building-wide

### unit_type
- `studio` - Studio apartment
- `1BR` - One bedroom
- `2BR` - Two bedroom
- `3BR` - Three bedroom

### location_status
- `not_started` - Not started
- `in_progress` - In progress
- `complete` - Complete
- `on_hold` - On hold

### blocked_reason
- `materials` - Materials unavailable
- `labor` - Labor unavailable
- `cash` - Cash flow issue
- `dependency` - Waiting on dependency
- `other` - Other reason

### task_status
- `not_started` - Not started
- `in_progress` - In progress
- `worker_complete` - Worker marked complete
- `verified` - PM verified complete

### priority_level
- `low` - Low priority
- `medium` - Medium priority
- `high` - High priority
- `urgent` - Urgent priority

### funding_type
- `loan` - Loan
- `grant` - Grant
- `equity` - Equity
- `other` - Other

### backlog_scope
- `portfolio` - Portfolio-level
- `property` - Property-level

### backlog_status
- `active` - Active
- `converted` - Converted to project
- `archived` - Archived

---

## Common Query Patterns

### Get project with all contractors
```sql
SELECT p.*, c.name as contractor_name
FROM projects p
LEFT JOIN project_contractors pc ON p.id = pc.project_id
LEFT JOIN contractors c ON pc.contractor_id = c.id
WHERE p.id = $1;
```

### Get location with tasks
```sql
SELECT l.*, t.*
FROM locations l
LEFT JOIN tasks t ON l.id = t.location_id
WHERE l.project_id = $1
ORDER BY l.name, t.sort_order;
```

### Get payment application with line items
```sql
SELECT pa.*, pli.*
FROM payment_applications pa
LEFT JOIN project_line_items pli ON pa.project_id = pli.project_id
  AND pa.contractor_id = pli.contractor_id
WHERE pa.id = $1;
```

### Get project budget summary
```sql
SELECT 
  pb.category_name,
  pb.original_amount,
  pb.revised_amount,
  pb.committed_costs,
  pb.actual_spend,
  (pb.revised_amount - pb.actual_spend) as remaining
FROM property_budgets pb
WHERE pb.project_id = $1
  AND pb.is_active = true
ORDER BY pb.display_order;
```
