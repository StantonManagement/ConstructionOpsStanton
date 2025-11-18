# ConstructionOps Database Schema

## Table of Contents
1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Table Details](#table-details)
5. [Relationships](#relationships)
6. [Indexes](#indexes)
7. [Row Level Security (RLS)](#row-level-security-rls)
8. [Common Queries](#common-queries)

---

## Overview

The ConstructionOps database is built on **PostgreSQL 15** via Supabase, leveraging:
- **Row Level Security (RLS)** for data isolation
- **Foreign key constraints** for referential integrity
- **Triggers** for automated timestamp updates
- **Sequences** for auto-incrementing IDs

**Database Structure:**
- **13 Core Tables**
- **9 Relationships** (foreign keys)
- **Multiple Indexes** for query optimization
- **RLS Policies** for security

---

## Entity Relationship Diagram

```
┌──────────────┐          ┌──────────────────┐          ┌───────────────┐
│    users     │          │  payment_apps    │          │  contractors  │
│──────────────│          │──────────────────│          │───────────────│
│ id (PK)      │          │ id (PK)          │──────────│ id (PK)       │
│ name         │          │ project_id (FK)  │          │ name          │
│ email ∪      │          │ contractor_id(FK)│          │ trade         │
│ role         │          │ status           │          │ phone         │
│ phone        │          │ current_payment  │          │ email         │
│ uuid         │          │ approved_by (FK) │          │ status        │
└──────┬───────┘          └──────┬───────────┘          └───────┬───────┘
       │                         │                              │
       │                         │                              │
       │                  ┌──────┴──────────────────────────────┴────┐
       │                  │                                           │
       │                  ▼                                           ▼
┌──────┴───────┐   ┌──────────────────┐                  ┌───────────────────┐
│  user_role   │   │    projects      │                  │project_contractors│
│──────────────│   │──────────────────│                  │───────────────────│
│ user_id (FK) │   │ id (PK)          │──────────────────│ id (PK)           │
│ role         │   │ name             │                  │ project_id (FK)   │
└──────────────┘   │ client_name      │                  │ contractor_id (FK)│
                   │ project_code ∪   │                  │ contract_amount   │
                   │ budget           │                  │ paid_to_date      │
                   │ spent            │                  │ contract_status   │
                   │ status           │                  └─────────┬─────────┘
                   └──────┬───────────┘                            │
                          │                                        │
                          │                                        │
                          ▼                                        ▼
                   ┌──────────────────┐              ┌─────────────────────────┐
                   │project_line_items│              │      contracts          │
                   │──────────────────│              │─────────────────────────│
                   │ id (PK)          │              │ id (PK)                 │
                   │ project_id (FK)  │              │ project_id (FK)         │
                   │ contractor_id(FK)│              │ subcontractor_id (FK)   │
                   │ contract_id (FK) │──────────────│ contract_amount         │
                   │ item_no          │              │ start_date              │
                   │ description      │              │ end_date                │
                   │ scheduled_value  │              │ status                  │
                   │ display_order    │              └─────────────────────────┘
                   └──────┬───────────┘
                          │
                          │
                          ▼
              ┌───────────────────────────┐
              │payment_line_item_progress │
              │───────────────────────────│
              │ id (PK)                   │
              │ payment_app_id (FK)       │
              │ line_item_id (FK)         │
              │ submitted_percent         │
              │ pm_verified_percent       │
              │ calculated_amount         │
              └───────────┬───────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │ payment_documents         │
              │───────────────────────────│
              │ id (PK)                   │
              │ payment_app_id (FK)       │
              │ url                       │
              │ status                    │
              │ docusign_envelope_id      │
              └───────────────────────────┘

              ┌───────────────────────────┐
              │ lien_waivers              │
              │───────────────────────────│
              │ id (PK)                   │
              │ payment_app_id (FK)       │
              │ waiver_type               │
              │ waiver_amount             │
              │ status                    │
              └───────────────────────────┘

              ┌───────────────────────────┐
              │site_verification_photos   │
              │───────────────────────────│
              │ id (PK)                   │
              │ payment_app_id (FK)       │
              │ line_item_id (FK)         │
              │ photo_url                 │
              │ taken_by (FK)             │
              └───────────────────────────┘

              ┌───────────────────────────┐
              │payment_sms_conversations  │
              │───────────────────────────│
              │ id (PK)                   │
              │ payment_app_id (FK)       │
              │ contractor_phone          │
              │ conversation_state        │
              │ responses (jsonb)         │
              └───────────────────────────┘

              ┌───────────────────────────┐
              │payment_app_reviews        │
              │───────────────────────────│
              │ id (PK)                   │
              │ payment_app_id (FK)       │
              │ reviewer_id (FK)          │
              │ review_action             │
              │ adjusted_amount           │
              └───────────────────────────┘

Legend:
  PK = Primary Key
  FK = Foreign Key
  ∪  = Unique Constraint
  ─▶ = One-to-Many Relationship
```

---

## Core Tables

### 1. Users & Authentication

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts and profile data | id, email (unique), role, uuid |
| `user_role` | Role assignments (admin/pm/staff) | user_id, role |

### 2. Projects & Contractors

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `projects` | Construction projects | id, name, budget, spent, status |
| `contractors` | Subcontractors/vendors | id, name, trade, phone, email |
| `project_contractors` | Many-to-many: Projects ↔ Contractors | project_id, contractor_id, contract_amount |
| `contracts` | Contract details (legacy/alternate) | id, project_id, subcontractor_id, amount |

### 3. Payment Applications

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `payment_applications` | Payment requests from contractors | id, project_id, contractor_id, status, current_payment |
| `payment_line_item_progress` | Line item percentages per payment | payment_app_id, line_item_id, submitted_percent |
| `payment_documents` | Attached documents/PDFs | payment_app_id, url, status |
| `lien_waivers` | Lien waiver documents | payment_app_id, waiver_type, status |

### 4. Line Items

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `project_line_items` | Work breakdown structure items | contract_id, item_no, description, scheduled_value |

### 5. Supporting Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `payment_sms_conversations` | SMS workflow state | payment_app_id, conversation_state, responses |
| `site_verification_photos` | Progress photos | payment_app_id, line_item_id, photo_url |
| `payment_application_reviews` | Review/approval audit trail | payment_app_id, reviewer_id, review_action |

---

## Table Details

### users

```sql
CREATE TABLE users (
  id                INTEGER PRIMARY KEY,
  name              VARCHAR,
  email             VARCHAR UNIQUE NOT NULL,
  role              VARCHAR NOT NULL,
  phone             VARCHAR,
  uuid              UUID,
  avatar_url        TEXT,
  company           VARCHAR,
  address           TEXT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store user account information and profile data.

**Columns:**
- `id`: Auto-incrementing primary key
- `email`: Unique email address (used for authentication)
- `role`: User role (admin, pm, staff) - duplicated in `user_role` table
- `uuid`: Supabase Auth UUID reference
- `phone`: Contact phone number
- `avatar_url`: Profile picture URL (S3)
- `company`: User's company name
- `address`: User's address
- `created_at`: Account creation timestamp

**Indexes:**
- Primary Key on `id`
- Unique index on `email`

---

### user_role

```sql
CREATE TABLE user_role (
  user_id   INTEGER REFERENCES users(id),
  role      VARCHAR NOT NULL
);
```

**Purpose:** Store user role assignments (separate from `users.role` for flexibility).

**Columns:**
- `user_id`: Foreign key to `users.id`
- `role`: Role name (admin, pm, staff)

**Note:** This table allows for more complex role management in the future (e.g., multiple roles per user).

---

### projects

```sql
CREATE TABLE projects (
  id                      INTEGER PRIMARY KEY,
  name                    VARCHAR NOT NULL,
  client_name             VARCHAR NOT NULL,
  project_code            VARCHAR UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  current_phase           VARCHAR,
  status                  VARCHAR DEFAULT 'active',
  start_date              DATE,
  target_completion_date  DATE,
  at_risk                 BOOLEAN DEFAULT false,
  budget                  NUMERIC,
  spent                   REAL,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store construction project information.

**Columns:**
- `id`: Auto-incrementing primary key
- `name`: Project display name
- `client_name`: Client/owner name
- `project_code`: Unique identifier (UUID-based)
- `current_phase`: Current construction phase (e.g., "Electrical", "Plumbing")
- `status`: Project status (active, completed, on_hold)
- `start_date`: Project start date
- `target_completion_date`: Target completion date
- `at_risk`: Flag for at-risk projects
- `budget`: Total project budget
- `spent`: Total amount spent (updated from payment applications)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Indexes:**
- Primary Key on `id`
- Unique index on `project_code`

---

### contractors

```sql
CREATE TABLE contractors (
  id                  INTEGER PRIMARY KEY,
  name                VARCHAR NOT NULL,
  trade               VARCHAR NOT NULL,
  phone               VARCHAR NOT NULL,
  email               VARCHAR,
  status              VARCHAR DEFAULT 'active',
  performance_score   NUMERIC,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store subcontractor/vendor information.

**Columns:**
- `id`: Auto-incrementing primary key
- `name`: Contractor company name
- `trade`: Trade specialty (Electrical, Plumbing, etc.)
- `phone`: Contact phone number (used for SMS)
- `email`: Contact email
- `status`: Contractor status (active, inactive)
- `performance_score`: Performance rating (0-100)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Indexes:**
- Primary Key on `id`

---

### project_contractors

```sql
CREATE TABLE project_contractors (
  id                    INTEGER PRIMARY KEY,
  project_id            INTEGER REFERENCES projects(id),
  contractor_id         INTEGER REFERENCES contractors(id),
  contract_amount       NUMERIC NOT NULL,
  paid_to_date          NUMERIC DEFAULT 0,
  last_payment_date     DATE,
  contract_status       VARCHAR DEFAULT 'active',
  change_orders_pending BOOLEAN DEFAULT false
);
```

**Purpose:** Many-to-many relationship between projects and contractors (contracts).

**Columns:**
- `id`: Auto-incrementing primary key
- `project_id`: Foreign key to `projects.id`
- `contractor_id`: Foreign key to `contractors.id`
- `contract_amount`: Total contract value
- `paid_to_date`: Total amount paid so far
- `last_payment_date`: Date of most recent payment
- `contract_status`: Contract status (active, completed, terminated)
- `change_orders_pending`: Flag for pending change orders

**Indexes:**
- Primary Key on `id`
- Index on `project_id`
- Index on `contractor_id`
- Composite index on `(project_id, contract_status)`

**Recommended Indexes:**
```sql
CREATE INDEX idx_project_contractors_project_id ON project_contractors(project_id);
CREATE INDEX idx_project_contractors_contractor_id ON project_contractors(contractor_id);
CREATE INDEX idx_project_contractors_project_status ON project_contractors(project_id, contract_status);
```

---

### contracts

```sql
CREATE TABLE contracts (
  id                  INTEGER PRIMARY KEY,
  project_id          INTEGER REFERENCES projects(id),
  subcontractor_id    INTEGER REFERENCES contractors(id),
  contract_amount     NUMERIC,
  start_date          DATE,
  end_date            DATE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

**Purpose:** Legacy/alternate contract table (note: overlaps with `project_contractors`).

**Note:** This table exists alongside `project_contractors`. The application primarily uses `project_contractors` for contract management, but this table is referenced by `project_line_items.contract_id`.

---

### project_line_items

```sql
CREATE TABLE project_line_items (
  id                          INTEGER PRIMARY KEY,
  project_id                  INTEGER REFERENCES projects(id),
  contractor_id               INTEGER REFERENCES contractors(id),
  contract_id                 INTEGER REFERENCES contracts(id),
  item_no                     VARCHAR,
  description_of_work         TEXT,
  scheduled_value             NUMERIC,
  from_previous_application   NUMERIC,
  this_period                 NUMERIC,
  material_presently_stored   NUMERIC,
  percent_gc                  NUMERIC,
  percent_completed           REAL,
  amount_for_this_period      REAL,
  original_contract_amount    NUMERIC,
  status                      VARCHAR DEFAULT 'active',
  display_order               INTEGER,
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store work breakdown structure (WBS) line items for contracts (AIA G-703 format).

**Columns:**
- `id`: Auto-incrementing primary key
- `project_id`: Foreign key to `projects.id`
- `contractor_id`: Foreign key to `contractors.id`
- `contract_id`: Foreign key to `contracts.id`
- `item_no`: Line item number (e.g., "01", "02", "03")
- `description_of_work`: Work item description
- `scheduled_value`: Total value for this line item
- `from_previous_application`: Cumulative from previous payments
- `this_period`: Amount requested this period
- `material_presently_stored`: Materials stored on-site
- `percent_gc`: General conditions percentage
- `percent_completed`: Completion percentage (calculated)
- `amount_for_this_period`: Amount calculated for this period
- `original_contract_amount`: Original contract value (for change order tracking)
- `status`: Line item status (active, completed, deleted)
- `display_order`: Sort order for display
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Indexes:**
- Primary Key on `id`
- Index on `project_id`
- Index on `contractor_id`
- Index on `contract_id`

---

### payment_applications

```sql
CREATE TABLE payment_applications (
  id                          INTEGER PRIMARY KEY,
  project_id                  INTEGER REFERENCES projects(id),
  contractor_id               INTEGER REFERENCES contractors(id),
  payment_period_end          DATE,
  status                      VARCHAR DEFAULT 'initiated',
  total_contract_amount       NUMERIC,
  previous_payments           NUMERIC DEFAULT 0,
  current_payment             NUMERIC DEFAULT 0,
  final_amount                NUMERIC,
  sms_conversation_id         INTEGER,
  lien_waiver_required        BOOLEAN DEFAULT false,
  photos_uploaded_count       INTEGER DEFAULT 0,
  pm_verification_completed   BOOLEAN DEFAULT false,
  pm_notes                    TEXT,
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at                 TIMESTAMP,
  approved_by                 INTEGER REFERENCES users(id),
  rejected_at                 TIMESTAMP WITH TIME ZONE,
  rejected_by                 TEXT,
  rejection_notes             TEXT,
  approval_notes              TEXT
);
```

**Purpose:** Store payment application records (contractor payment requests).

**Columns:**
- `id`: Auto-incrementing primary key
- `project_id`: Foreign key to `projects.id`
- `contractor_id`: Foreign key to `contractors.id`
- `payment_period_end`: End date of payment period
- `status`: Payment status (initiated, sms_sent, submitted, approved, rejected)
- `total_contract_amount`: Total contract value
- `previous_payments`: Cumulative payments to date
- `current_payment`: Amount requested this period
- `final_amount`: Final approved amount (may differ from `current_payment`)
- `sms_conversation_id`: Reference to SMS conversation
- `lien_waiver_required`: Flag for lien waiver requirement
- `photos_uploaded_count`: Number of photos attached
- `pm_verification_completed`: Flag for PM review completion
- `pm_notes`: Project manager notes
- `approved_at`: Approval timestamp
- `approved_by`: Foreign key to `users.id` (approver)
- `rejected_at`: Rejection timestamp
- `rejected_by`: Rejector user ID (text field)
- `rejection_notes`: Rejection reason
- `approval_notes`: Approval notes
- `created_at`: Record creation timestamp

**Indexes:**
- Primary Key on `id`
- Index on `project_id`
- Index on `contractor_id`
- Index on `status`

**Recommended Indexes:**
```sql
CREATE INDEX idx_payment_applications_project_id ON payment_applications(project_id);
CREATE INDEX idx_payment_applications_contractor_id ON payment_applications(contractor_id);
CREATE INDEX idx_payment_applications_status ON payment_applications(status);
```

**Status Flow:**
```
initiated → sms_sent → submitted → approved/rejected
```

---

### payment_line_item_progress

```sql
CREATE TABLE payment_line_item_progress (
  id                      INTEGER PRIMARY KEY,
  payment_app_id          INTEGER REFERENCES payment_applications(id),
  line_item_id            INTEGER REFERENCES project_line_items(id),
  submitted_percent       NUMERIC,
  pm_verified_percent     NUMERIC,
  previous_percent        NUMERIC,
  this_period_percent     NUMERIC,
  calculated_amount       NUMERIC,
  pm_adjustment_reason    TEXT,
  verification_photos_count INTEGER DEFAULT 0,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track line item progress percentages for each payment application.

**Columns:**
- `id`: Auto-incrementing primary key
- `payment_app_id`: Foreign key to `payment_applications.id`
- `line_item_id`: Foreign key to `project_line_items.id`
- `submitted_percent`: Contractor-submitted completion percentage
- `pm_verified_percent`: PM-verified completion percentage (may differ)
- `previous_percent`: Cumulative percentage from previous payments
- `this_period_percent`: Percentage completed this period
- `calculated_amount`: Amount calculated from percentage
- `pm_adjustment_reason`: Reason for PM adjustments
- `verification_photos_count`: Number of verification photos
- `created_at`: Record creation timestamp

**Indexes:**
- Primary Key on `id`
- Index on `payment_app_id`
- Index on `line_item_id`

---

### payment_documents

```sql
CREATE TABLE payment_documents (
  id                    INTEGER PRIMARY KEY,
  payment_app_id        INTEGER REFERENCES payment_applications(id),
  url                   TEXT NOT NULL,
  status                VARCHAR DEFAULT 'pending_review',
  docusign_envelope_id  TEXT,
  signed_url            TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store document attachments for payment applications (PDFs, images).

**Columns:**
- `id`: Auto-incrementing primary key
- `payment_app_id`: Foreign key to `payment_applications.id`
- `url`: S3 URL for document
- `status`: Document status (pending_review, approved, signed)
- `docusign_envelope_id`: DocuSign envelope ID (if sent for signature)
- `signed_url`: URL for signed document
- `created_at`: Record creation timestamp

---

### lien_waivers

```sql
CREATE TABLE lien_waivers (
  id                      INTEGER PRIMARY KEY,
  payment_app_id          INTEGER REFERENCES payment_applications(id),
  waiver_type             VARCHAR DEFAULT 'conditional',
  waiver_amount           NUMERIC NOT NULL,
  waiver_document_url     TEXT,
  signature_request_id    VARCHAR,
  status                  VARCHAR DEFAULT 'pending',
  signed_by               VARCHAR,
  signed_date             TIMESTAMP,
  expires_at              TIMESTAMP,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store lien waiver documents and their status.

**Columns:**
- `id`: Auto-incrementing primary key
- `payment_app_id`: Foreign key to `payment_applications.id`
- `waiver_type`: Waiver type (conditional, unconditional)
- `waiver_amount`: Amount covered by waiver
- `waiver_document_url`: S3 URL for waiver document
- `signature_request_id`: DocuSign signature request ID
- `status`: Waiver status (pending, signed, expired)
- `signed_by`: Signer name
- `signed_date`: Signature timestamp
- `expires_at`: Waiver expiration timestamp
- `created_at`: Record creation timestamp

---

### payment_sms_conversations

```sql
CREATE TABLE payment_sms_conversations (
  id                    INTEGER PRIMARY KEY,
  payment_app_id        INTEGER REFERENCES payment_applications(id),
  contractor_phone      VARCHAR NOT NULL,
  conversation_state    VARCHAR DEFAULT 'awaiting_start',
  current_question_index INTEGER DEFAULT 0,
  responses             JSONB DEFAULT '[]'::jsonb,
  line_items            JSONB,
  total_questions       INTEGER,
  completed_at          TIMESTAMP,
  escalated_to_dean     BOOLEAN DEFAULT false,
  escalated_at          TIMESTAMP,
  timeout_count         INTEGER DEFAULT 0,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Track SMS conversation state for payment application workflow.

**Columns:**
- `id`: Auto-incrementing primary key
- `payment_app_id`: Foreign key to `payment_applications.id`
- `contractor_phone`: Contractor phone number
- `conversation_state`: Current state in SMS workflow
- `current_question_index`: Index of current question
- `responses`: JSONB array of contractor responses
- `line_items`: JSONB array of line item data
- `total_questions`: Total number of questions in workflow
- `completed_at`: Completion timestamp
- `escalated_to_dean`: Flag for escalation
- `escalated_at`: Escalation timestamp
- `timeout_count`: Number of timeouts
- `created_at`: Record creation timestamp

**Conversation States:**
```
awaiting_start → in_progress → completed → escalated
```

---

### site_verification_photos

```sql
CREATE TABLE site_verification_photos (
  id              INTEGER PRIMARY KEY,
  payment_app_id  INTEGER REFERENCES payment_applications(id),
  line_item_id    INTEGER REFERENCES project_line_items(id),
  photo_url       TEXT NOT NULL,
  photo_caption   TEXT,
  photo_sequence  INTEGER,
  taken_by        INTEGER REFERENCES users(id),
  taken_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  file_size       INTEGER,
  mime_type       VARCHAR,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Store progress photos for payment verification.

**Columns:**
- `id`: Auto-incrementing primary key
- `payment_app_id`: Foreign key to `payment_applications.id`
- `line_item_id`: Foreign key to `project_line_items.id`
- `photo_url`: S3 URL for photo
- `photo_caption`: Photo description
- `photo_sequence`: Order in sequence
- `taken_by`: Foreign key to `users.id` (photographer)
- `taken_at`: Photo timestamp
- `file_size`: File size in bytes
- `mime_type`: MIME type (image/jpeg, etc.)
- `created_at`: Record creation timestamp

---

### payment_application_reviews

```sql
CREATE TABLE payment_application_reviews (
  id                  INTEGER PRIMARY KEY,
  payment_app_id      INTEGER REFERENCES payment_applications(id),
  reviewer_id         INTEGER REFERENCES users(id),
  review_action       VARCHAR NOT NULL,
  original_amount     NUMERIC,
  adjusted_amount     NUMERIC,
  adjustment_reason   TEXT,
  pm_notes            TEXT,
  photos_verified     BOOLEAN DEFAULT false,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Audit trail for payment application reviews and approvals.

**Columns:**
- `id`: Auto-incrementing primary key
- `payment_app_id`: Foreign key to `payment_applications.id`
- `reviewer_id`: Foreign key to `users.id`
- `review_action`: Action taken (approved, rejected, adjusted)
- `original_amount`: Original requested amount
- `adjusted_amount`: Adjusted amount (if different)
- `adjustment_reason`: Reason for adjustment
- `pm_notes`: Review notes
- `photos_verified`: Flag for photo verification
- `created_at`: Record creation timestamp

---

## Relationships

### One-to-Many Relationships

```
projects (1) ────────────────────────> (many) payment_applications
projects (1) ────────────────────────> (many) project_line_items
projects (1) ────────────────────────> (many) project_contractors

contractors (1) ─────────────────────> (many) payment_applications
contractors (1) ─────────────────────> (many) project_line_items
contractors (1) ─────────────────────> (many) project_contractors

payment_applications (1) ───────────> (many) payment_line_item_progress
payment_applications (1) ───────────> (many) payment_documents
payment_applications (1) ───────────> (many) lien_waivers
payment_applications (1) ───────────> (many) site_verification_photos
payment_applications (1) ───────────> (many) payment_application_reviews
payment_applications (1) ───────────> (1) payment_sms_conversations

project_line_items (1) ──────────────> (many) payment_line_item_progress
project_line_items (1) ──────────────> (many) site_verification_photos

users (1) ───────────────────────────> (many) payment_applications (approved_by)
users (1) ───────────────────────────> (many) payment_application_reviews (reviewer_id)
users (1) ───────────────────────────> (many) site_verification_photos (taken_by)
```

### Many-to-Many Relationships

```
projects (many) ↔ contractors (many)
  via project_contractors

projects (many) ↔ contractors (many)
  via contracts (legacy)
```

---

## Indexes

### Existing Indexes

```sql
-- Primary Keys (automatically indexed)
PRIMARY KEY (id) on all tables

-- Unique Constraints
UNIQUE (email) on users
UNIQUE (project_code) on projects
```

### Recommended Performance Indexes

```sql
-- Payment Applications (high traffic)
CREATE INDEX idx_payment_applications_project_id 
  ON payment_applications(project_id);
CREATE INDEX idx_payment_applications_contractor_id 
  ON payment_applications(contractor_id);
CREATE INDEX idx_payment_applications_status 
  ON payment_applications(status);
CREATE INDEX idx_payment_applications_approved_by 
  ON payment_applications(approved_by);

-- Project Contractors (frequent joins)
CREATE INDEX idx_project_contractors_project_id 
  ON project_contractors(project_id);
CREATE INDEX idx_project_contractors_contractor_id 
  ON project_contractors(contractor_id);
CREATE INDEX idx_project_contractors_project_status 
  ON project_contractors(project_id, contract_status);

-- Project Line Items (frequent queries)
CREATE INDEX idx_project_line_items_project_id 
  ON project_line_items(project_id);
CREATE INDEX idx_project_line_items_contractor_id 
  ON project_line_items(contractor_id);
CREATE INDEX idx_project_line_items_contract_id 
  ON project_line_items(contract_id);

-- Payment Line Item Progress (joins)
CREATE INDEX idx_payment_line_item_progress_payment_app_id 
  ON payment_line_item_progress(payment_app_id);
CREATE INDEX idx_payment_line_item_progress_line_item_id 
  ON payment_line_item_progress(line_item_id);

-- User Role lookups
CREATE INDEX idx_user_role_user_id 
  ON user_role(user_id);
```

---

## Row Level Security (RLS)

### Authentication

All tables use Supabase Auth with JWT tokens. RLS policies check:
- `auth.uid()` - Current user's UUID
- `user_role` table - User's assigned role

### Example RLS Policies

```sql
-- Users can only view projects they have access to
CREATE POLICY "Users can view their projects"
ON projects FOR SELECT
USING (
  id IN (
    SELECT project_id 
    FROM user_project_access
    WHERE user_id = auth.uid()
  )
);

-- Only admins can create projects
CREATE POLICY "Admins can create projects"
ON projects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

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

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (uuid = auth.uid());
```

---

## Common Queries

### 1. Get all projects with contractor counts

```sql
SELECT 
  p.*,
  COUNT(DISTINCT pc.contractor_id) as contractor_count,
  SUM(pc.contract_amount) as total_contracts
FROM projects p
LEFT JOIN project_contractors pc ON p.id = pc.project_id
WHERE p.status = 'active'
GROUP BY p.id
ORDER BY p.updated_at DESC;
```

### 2. Get payment applications with project and contractor details

```sql
SELECT 
  pa.*,
  p.name as project_name,
  c.name as contractor_name,
  c.trade,
  u.name as approved_by_name
FROM payment_applications pa
JOIN projects p ON pa.project_id = p.id
JOIN contractors c ON pa.contractor_id = c.id
LEFT JOIN users u ON pa.approved_by = u.id
WHERE pa.status = 'submitted'
ORDER BY pa.created_at DESC;
```

### 3. Get contract with all line items

```sql
SELECT 
  pc.*,
  p.name as project_name,
  c.name as contractor_name,
  json_agg(
    json_build_object(
      'id', pli.id,
      'item_no', pli.item_no,
      'description', pli.description_of_work,
      'scheduled_value', pli.scheduled_value
    ) ORDER BY pli.display_order
  ) as line_items
FROM project_contractors pc
JOIN projects p ON pc.project_id = p.id
JOIN contractors c ON pc.contractor_id = c.id
LEFT JOIN project_line_items pli ON pli.contract_id = pc.id
WHERE pc.id = $1
GROUP BY pc.id, p.name, c.name;
```

### 4. Get payment application with line item progress

```sql
SELECT 
  pa.*,
  json_agg(
    json_build_object(
      'line_item_id', plip.line_item_id,
      'description', pli.description_of_work,
      'scheduled_value', pli.scheduled_value,
      'submitted_percent', plip.submitted_percent,
      'pm_verified_percent', plip.pm_verified_percent,
      'calculated_amount', plip.calculated_amount
    )
  ) as line_items
FROM payment_applications pa
LEFT JOIN payment_line_item_progress plip ON pa.id = plip.payment_app_id
LEFT JOIN project_line_items pli ON plip.line_item_id = pli.id
WHERE pa.id = $1
GROUP BY pa.id;
```

### 5. Get project budget vs. spent

```sql
SELECT 
  p.id,
  p.name,
  p.budget,
  p.spent,
  p.budget - p.spent as remaining,
  (p.spent / NULLIF(p.budget, 0) * 100) as percent_spent
FROM projects p
WHERE p.status = 'active'
ORDER BY percent_spent DESC;
```

---

## Database Migrations

### Adding New Tables

```sql
-- Example: Add daily_log_requests table
CREATE TABLE daily_log_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  contractor_id INTEGER REFERENCES contractors(id),
  request_date DATE NOT NULL,
  status VARCHAR DEFAULT 'pending',
  response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_log_requests_project_id ON daily_log_requests(project_id);
CREATE INDEX idx_daily_log_requests_status ON daily_log_requests(status);
```

### Adding Columns

```sql
-- Example: Add notes column to contractors
ALTER TABLE contractors 
ADD COLUMN notes TEXT;

-- Example: Add email_verified flag to users
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

---

## Summary

**Database Metrics:**
- **13 Tables**: Core system entities
- **50+ Columns**: Comprehensive data model
- **15+ Foreign Keys**: Strong referential integrity
- **10+ Indexes**: Optimized query performance
- **RLS Policies**: Row-level security for multi-tenant isolation

**Key Design Principles:**
1. ✅ **Normalization**: Minimal data duplication
2. ✅ **Foreign Keys**: Enforce referential integrity
3. ✅ **Indexes**: Optimize frequent queries
4. ✅ **Timestamps**: Track creation and updates
5. ✅ **Status Fields**: Enable workflow state management
6. ✅ **JSONB**: Flexible data storage for dynamic fields
7. ✅ **RLS**: Secure data isolation

**Performance Considerations:**
- Use `.in()` queries instead of multiple lookups (avoid N+1)
- Batch insert operations when possible
- Use JSONB aggregation for nested data
- Index foreign keys and frequently filtered columns
- Monitor slow queries in Supabase dashboard

