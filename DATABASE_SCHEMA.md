# ConstructionOps Database Schema

## Overview
Generated automatically by inspecting the live Supabase database via the Service Role API.
**Date:** 12/18/2025, 11:17:00 AM

> **Note:** Since direct database access (information_schema) was restricted, this schema is inferred by sampling rows from each table. Empty tables will show no column details.

## Tables

### change_orders

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `approved_by` | `NULL` | null (unknown) |
| `approved_date` | `NULL` | null (unknown) |
| `budget_category_id` | `NULL` | null (unknown) |
| `co_number` | `CO-2025-8859` | string |
| `contractor_id` | `26` | number |
| `cost_impact` | `1200` | number |
| `created_at` | `2025-11-19T03:43:50.827283` | string |
| `created_by` | `cd4479a3-1c4f-4816-ae4c-bacea6cde504` | string |
| `description` | `Additional electrical outlets in kitchen` | string |
| `id` | `7` | number |
| `justification` | `Client requested more outlets for appliances` | string |
| `notes` | `NULL` | null (unknown) |
| `priority` | `medium` | string |
| `project_id` | `21` | number |
| `reason_category` | `Owner Request` | string |
| `schedule_impact_days` | `2` | number |
| `status` | `approved` | string |
| `submitted_date` | `NULL` | null (unknown) |
| `title` | `Additional Electrical Outlets` | string |
| `updated_at` | `2025-11-19T03:43:50.827283` | string |

---

### contractors

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `address` | `NULL` | null (unknown) |
| `city` | `NULL` | null (unknown) |
| `contact_name` | `NULL` | null (unknown) |
| `created_at` | `2025-08-29T15:28:51.479112` | string |
| `email` | `NULL` | null (unknown) |
| `id` | `26` | number |
| `insurance_status` | `valid` | string |
| `license_status` | `valid` | string |
| `name` | `DNS Construction` | string |
| `performance_score` | `NULL` | null (unknown) |
| `phone` | `+19144478972` | string |
| `state` | `NULL` | null (unknown) |
| `status` | `active` | string |
| `trade` | `Smiting` | string |
| `updated_at` | `2025-08-29T15:28:51.479112` | string |
| `zip` | `NULL` | null (unknown) |

---

### contracts

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `contract_amount` | `100000` | number |
| `contract_nickname` | `Animal Catcher` | string |
| `created_at` | `2025-08-29T15:29:46.632657+00:00` | string |
| `display_order` | `1` | number |
| `end_date` | `2025-09-04` | string |
| `id` | `24` | number |
| `original_contract_amount` | `100000` | number |
| `project_id` | `21` | number |
| `start_date` | `2025-08-29` | string |
| `subcontractor_id` | `26` | number |

---

### owner_entities

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `accounting_ref` | `NULL` | null (unknown) |
| `contact_email` | `NULL` | null (unknown) |
| `contact_name` | `NULL` | null (unknown) |
| `contact_phone` | `NULL` | null (unknown) |
| `created_at` | `2025-11-19T02:10:42.807694` | string |
| `entity_type` | `LLC` | string |
| `id` | `1` | number |
| `is_active` | `true` | boolean |
| `name` | `STANTON REP 90` | string |
| `notes` | `NULL` | null (unknown) |
| `tax_id` | `NULL` | null (unknown) |
| `updated_at` | `2025-11-19T02:10:42.807694` | string |

---

### payment_applications

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `approval_notes` | `NULL` | null (unknown) |
| `approved_at` | `NULL` | null (unknown) |
| `approved_by` | `NULL` | null (unknown) |
| `contractor_id` | `26` | number |
| `created_at` | `2025-08-29T15:30:00.797` | string |
| `current_payment` | `10000000` | number |
| `current_period_value` | `10000000` | number |
| `due_date` | `2025-09-28` | string |
| `final_amount` | `NULL` | null (unknown) |
| `id` | `135` | number |
| `lien_waiver_required` | `false` | boolean |
| `payment_period_end` | `2025-08-29` | string |
| `photos_uploaded_count` | `0` | number |
| `pm_notes` | `SHE BIT ME` | string |
| `pm_verification_completed` | `false` | boolean |
| `previous_payments` | `0` | number |
| `project_id` | `21` | number |
| `rejected_at` | `2025-08-29T17:19:17.904+00:00` | string |
| `rejected_by` | `14` | string |
| `rejection_notes` | `451` | string |
| `sms_conversation_id` | `NULL` | null (unknown) |
| `status` | `rejected` | string |
| `total_contract_amount` | `100` | number |
| `updated_at` | `2025-08-29T15:30:00.797+00:00` | string |

---

### payment_documents

_Table is empty. Columns cannot be inferred via API._

---

### payment_line_item_progress

_Table is empty. Columns cannot be inferred via API._

---

### permissions

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `created_at` | `2025-11-18T01:10:02.414083+00:00` | string |
| `description` | `Can view payment applications and their details` | string |
| `id` | `1` | number |
| `permission_category` | `payments` | string |
| `permission_key` | `payments_view` | string |
| `permission_name` | `View Payment Applications` | string |

---

### photos

_Table is empty. Columns cannot be inferred via API._

---

### project_contractors

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `budget_item_id` | `NULL` | null (unknown) |
| `change_orders_pending` | `false` | boolean |
| `contract_amount` | `100` | number |
| `contract_status` | `active` | string |
| `contractor_id` | `26` | number |
| `display_order` | `1` | number |
| `id` | `94` | number |
| `last_payment_date` | `NULL` | null (unknown) |
| `original_contract_amount` | `100` | number |
| `paid_to_date` | `0` | number |
| `project_id` | `21` | number |
| `updated_at` | `2025-12-01T19:33:00.660201+00:00` | string |

---

### project_line_items

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `amount_for_this_period` | `NULL` | null (unknown) |
| `change_order_amount` | `0` | number |
| `contract_id` | `24` | number |
| `contractor_id` | `26` | number |
| `created_at` | `2025-11-13T01:52:50.100662` | string |
| `description_of_work` | `Rat Catcher` | string |
| `display_order` | `1` | number |
| `from_previous_application` | `0` | number |
| `id` | `37` | number |
| `item_no` | `1` | string |
| `material_presently_stored` | `0` | number |
| `original_contract_amount` | `NULL` | null (unknown) |
| `percent_completed` | `NULL` | null (unknown) |
| `percent_gc` | `0` | number |
| `project_id` | `21` | number |
| `scheduled_value` | `100000` | number |
| `status` | `active` | string |
| `this_period` | `100` | number |
| `updated_at` | `2025-11-13T01:52:50.100662` | string |

---

### project_schedules

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `actual_end_date` | `NULL` | null (unknown) |
| `created_at` | `2025-11-20T03:29:49.596824+00:00` | string |
| `created_by` | `NULL` | null (unknown) |
| `id` | `d95b5c41-955f-47d5-be10-6f0aab36cce8` | string |
| `project_id` | `21` | number |
| `start_date` | `2025-11-20` | string |
| `status` | `on_track` | string |
| `target_end_date` | `2026-02-18` | string |
| `updated_at` | `2025-11-20T03:29:49.596824+00:00` | string |

---

### projects

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `address` | `228 Maple Avenue, Hartford, CT` | string |
| `at_risk` | `false` | boolean |
| `budget` | `NULL` | null (unknown) |
| `client_name` | `SREP SOUTHEND` | string |
| `created_at` | `2025-11-19T03:42:18.036074` | string |
| `current_phase` | `Construction` | string |
| `id` | `30` | number |
| `name` | `228 Ma51ple Avenue` | string |
| `owner_entity_id` | `2` | number |
| `portfolio_name` | `South End Portfolio` | string |
| `project_code` | `e66f6f14-a3e7-49ae-9b51-9747ee068a2a` | string |
| `spent` | `0` | number |
| `start_date` | `2025-11-19` | string |
| `starting_balance` | `0` | number |
| `status` | `deleted` | string |
| `target_completion_date` | `NULL` | null (unknown) |
| `total_units` | `6` | number |
| `updated_at` | `2025-11-19T18:14:54.893` | string |

---

### property_budgets

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `actual_spend` | `11727` | number |
| `category_name` | `Site Work` | string |
| `committed_costs` | `759` | number |
| `created_at` | `2025-11-19T03:42:21.283752` | string |
| `description` | `NULL` | null (unknown) |
| `display_order` | `0` | number |
| `id` | `13` | number |
| `is_active` | `true` | boolean |
| `notes` | `NULL` | null (unknown) |
| `original_amount` | `17746` | number |
| `project_id` | `29` | number |
| `revised_amount` | `17746` | number |
| `updated_at` | `2025-11-19T03:42:21.283752` | string |

---

### role_permissions

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `granted_at` | `2025-11-18T01:10:02.414083+00:00` | string |
| `granted_by` | `NULL` | null (unknown) |
| `id` | `1` | number |
| `permission_id` | `1` | number |
| `role` | `admin` | string |

---

### schedule_defaults

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `budget_category` | `Site Work` | string |
| `created_at` | `2025-12-18T03:36:18.054091+00:00` | string |
| `default_duration_days` | `5` | number |
| `display_order` | `10` | number |
| `id` | `1` | number |
| `updated_at` | `2025-12-18T03:36:18.054091+00:00` | string |

---

### schedule_tasks

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `budget_category_id` | `NULL` | null (unknown) |
| `constraint_date` | `NULL` | null (unknown) |
| `constraint_type` | `NULL` | null (unknown) |
| `contractor_id` | `NULL` | null (unknown) |
| `created_at` | `2025-12-02T20:41:11.990378+00:00` | string |
| `created_by` | `71545a1d-7026-4eec-8d5f-4a9c4568c22a` | string |
| `description` | `` | string |
| `duration_days` | `1` | number |
| `end_date` | `2025-12-02` | string |
| `id` | `c950b508-8d88-4134-9079-3622a739a9b2` | string |
| `is_milestone` | `false` | boolean |
| `parent_task_id` | `NULL` | null (unknown) |
| `progress` | `0` | number |
| `schedule_id` | `7ea1f070-52f3-4657-a57b-b1a9209cdce5` | string |
| `sort_order` | `1` | number |
| `start_date` | `2025-12-02` | string |
| `status` | `not_started` | string |
| `task_name` | `Rough Plumbing` | string |
| `updated_at` | `2025-12-02T20:41:11.990378+00:00` | string |

---

### user_role

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `created_at` | `2025-11-12T22:47:43.083653+00:00` | string |
| `id` | `17` | number |
| `role` | `admin` | string |
| `updated_at` | `2025-12-02T19:44:06.508156+00:00` | string |
| `user_id` | `71545a1d-7026-4eec-8d5f-4a9c4568c22a` | string |

---

### users

| Column | Sample Value | Type (Inferred) |
|---|---|---|
| `address` | `NULL` | null (unknown) |
| `avatar_url` | `NULL` | null (unknown) |
| `company` | `NULL` | null (unknown) |
| `created_at` | `2025-09-29T14:07:46.724029` | string |
| `email` | `bs@stantoncap.com` | string |
| `id` | `77` | number |
| `is_active` | `NULL` | null (unknown) |
| `name` | `NULL` | null (unknown) |
| `phone` | `NULL` | null (unknown) |
| `role` | `contractor` | string |
| `uuid` | `cd4479a3-1c4f-4816-ae4c-bacea6cde504` | string |

---

