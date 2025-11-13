# ConstructionOps User Flows

## Table of Contents
1. [Overview](#overview)
2. [Authentication Flows](#authentication-flows)
3. [Admin Role Flows](#admin-role-flows)
4. [PM Role Flows](#pm-role-flows)
5. [Staff Role Flows](#staff-role-flows)
6. [Payment Application Lifecycle](#payment-application-lifecycle)
7. [Project Management Flows](#project-management-flows)
8. [Error Handling & Recovery](#error-handling--recovery)

---

## Overview

This document outlines all user journeys through the ConstructionOps system, organized by role and feature. Each flow includes:
- **Entry Point**: Where the user starts
- **Steps**: Detailed step-by-step actions
- **Decision Points**: Branching logic
- **Success/Error States**: Outcomes
- **System Actions**: Background operations

---

## Authentication Flows

### 1. User Login Flow

```
┌──────────────┐
│   Browser    │
│  Opens App   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  AuthProvider        │
│  Checks Session      │
└──────┬───────────────┘
       │
       ├─────────────────────────────┐
       │                             │
       ▼ No Session                  ▼ Has Session
┌──────────────────────┐      ┌─────────────────────┐
│  AuthScreen          │      │ Fetch User Role     │
│  (Login Page)        │      └─────────┬───────────┘
└──────┬───────────────┘                │
       │                                ▼
       │ User Enters                 ┌──────────────────┐
       │ Email/Password              │ Role-Based Route │
       │                             └────────┬─────────┘
       ▼                                      │
┌──────────────────────┐                     ├──────────────────────┐
│ Supabase Auth        │                     │                      │
│ signInWithPassword() │                     ▼ admin/staff          ▼ pm
└──────┬───────────────┘              ┌──────────────┐      ┌────────────┐
       │                              │Construction  │      │    PM      │
       ├────────────┐                 │  Dashboard   │      │  Dashboard │
       │            │                 └──────────────┘      └────────────┘
       ▼ Success    ▼ Error
┌──────────────┐  ┌──────────────┐
│ Set Session  │  │ Show Error   │
│ Fetch Role   │  │ Stay on Login│
│ Route User   │  └──────────────┘
└──────────────┘
```

**Steps:**
1. User navigates to application
2. `AuthProvider` checks for existing session
3. **If no session**: Show `AuthScreen` (login page)
4. User enters email and password
5. `supabase.auth.signInWithPassword()` called
6. **If success**: 
   - Store JWT token in httpOnly cookie
   - Fetch user role from `user_role` table
   - Route to appropriate dashboard based on role
7. **If error**: Display error message, stay on login page

**Error Scenarios:**
- Invalid credentials → "Invalid email or password"
- Network error → "Unable to connect. Please try again."
- No role assigned → Default to "staff" role

---

### 2. Password Reset Flow

```
┌──────────────┐
│ Login Screen │
│              │
│ Click        │
│ "Forgot      │
│  Password?"  │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Password Reset Modal │
│ Enter Email          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Supabase             │
│ resetPasswordForEmail│
└──────┬───────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼ Success         ▼ Error
┌──────────────┐  ┌──────────────┐
│ Show Success │  │ Show Error   │
│ "Check Email"│  │ Message      │
└──────────────┘  └──────────────┘
       │
       ▼
┌──────────────────────┐
│ User Clicks Email    │
│ Reset Link           │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Reset Password Page  │
│ Enter New Password   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Update Password      │
│ Redirect to Login    │
└──────────────────────┘
```

**Steps:**
1. User clicks "Forgot Password?" link on login screen
2. Modal opens requesting email address
3. User enters email and submits
4. `supabase.auth.resetPasswordForEmail()` called
5. **If success**: Show "Check your email for reset link"
6. User receives email with reset link
7. User clicks link, opens reset password page
8. User enters new password (twice for confirmation)
9. Password updated, redirect to login page

---

## Admin Role Flows

### 1. Create New Project Flow

```
START: Admin Dashboard → Manage Tab → Projects Sub-tab
       │
       ▼
┌──────────────────────┐
│ Click "+ Add Project"│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Add Project Modal Opens          │
│                                  │
│ Fields:                          │
│ • Project Name *                 │
│ • Client Name *                  │
│ • Budget *                       │
│ • Current Phase                  │
│ • Start Date                     │
│ • Target Completion Date         │
│ • Status                         │
│ • At Risk Checkbox               │
└──────┬───────────────────────────┘
       │
       │ Admin fills form
       │
       ▼
┌──────────────────────────────────┐
│ Click "Save Project"             │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Client-Side Validation           │
│ • All required fields filled?    │
│ • Budget is positive number?     │
│ • Dates valid?                   │
└──────┬───────────────────────────┘
       │
       ├────────────────────────┐
       │                        │
       ▼ Valid                  ▼ Invalid
┌──────────────────┐     ┌─────────────────┐
│ Call React Query │     │ Show Errors     │
│ createProject()  │     │ Highlight Fields│
└──────┬───────────┘     └─────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Optimistic UI Update             │
│ • Add project to list immediately│
│ • Show loading spinner on card   │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Supabase Insert                  │
│ INSERT INTO projects ...         │
└──────┬───────────────────────────┘
       │
       ├────────────────────────┐
       │                        │
       ▼ Success                ▼ Error
┌──────────────────┐     ┌─────────────────────┐
│ Invalidate Cache │     │ Rollback UI         │
│ Refetch Projects │     │ Show Error Toast    │
│ Close Modal      │     │ Keep Modal Open     │
│ Success Toast    │     └─────────────────────┘
└──────────────────┘

END: Project appears in list
```

**Steps:**
1. Admin navigates to Manage → Projects
2. Clicks "+ Add Project" button
3. Modal opens with empty form
4. Admin fills in required fields:
   - Project Name
   - Client Name
   - Budget
5. Admin optionally fills:
   - Current Phase (dropdown)
   - Start Date (date picker)
   - Target Completion Date (date picker)
   - Status (dropdown: active, on_hold, completed)
   - At Risk checkbox
6. Admin clicks "Save Project"
7. **Client-side validation**:
   - All required fields filled?
   - Budget is positive number?
   - Target date after start date?
8. **If validation passes**:
   - Optimistic update: Add project to list immediately
   - Send insert request to Supabase
   - **If database success**: 
     - Invalidate React Query cache
     - Refetch projects
     - Close modal
     - Show success toast
   - **If database error**:
     - Rollback optimistic update
     - Show error message
     - Keep modal open
9. **If validation fails**:
   - Highlight invalid fields
   - Show error messages
   - Keep modal open

**Success State:** Project appears in projects list
**Error States:** Validation errors, network errors, database constraints

---

### 2. Add Contract with Line Items Flow

```
START: Admin Dashboard → Manage Tab → Contracts Sub-tab
       │
       ▼
┌──────────────────────┐
│ Click "+ Add         │
│     Contract"        │
└──────┬───────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────┐
│ Add Contract Modal Opens                              │
│                                                       │
│ Section 1: Contract Details                          │
│ • Project *          (dropdown)                       │
│ • Subcontractor *    (dropdown)                       │
│ • Contract Amount *  ($350,000)                       │
│ • Contract Nickname *                                 │
│                                                       │
│ Section 2: Line Items Table (Excel-like)             │
│ ┌─────────────────────────────────────────────────┐  │
│ │ ☐ │≡│ # │ Description │ Scheduled Value │ 🗑️  │  │
│ ├───┼─┼───┼─────────────┼─────────────────┼─────┤  │
│ │ ☐ │≡│ 1 │ Panel       │     $50,000     │ 🗑️  │  │
│ │ ☐ │≡│ 2 │ [Empty]     │     [Empty]     │ 🗑️  │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ Total: $50,000 ⚠️ ≠ $350,000                          │
│                                                       │
│ [+ Add Row] [Import CSV (Coming Soon)]               │
└───────────────────────────────────────────────────────┘
       │
       │ Admin fills contract details
       │ Admin adds/edits line items
       │
       ▼
┌──────────────────────────────────────┐
│ Validation (Real-time)               │
│ • Total Scheduled Value must equal   │
│   Contract Amount                    │
│ • No empty rows (description +       │
│   value must both be filled)         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Click "Save Contract"                │
└──────┬───────────────────────────────┘
       │
       ├────────────────────────┐
       │                        │
       ▼ Valid                  ▼ Invalid
┌──────────────────┐     ┌─────────────────────┐
│ Save to Database │     │ Show Validation     │
│                  │     │ Error (red banner)  │
│ 1. Insert        │     └─────────────────────┘
│    contract      │
│                  │
│ 2. Insert all    │
│    line items    │
└──────┬───────────┘
       │
       ├────────────────────────┐
       │                        │
       ▼ Success                ▼ Error
┌──────────────────┐     ┌─────────────────────┐
│ Refetch Contracts│     │ Rollback            │
│ Close Modal      │     │ Show Error          │
│ Success Toast    │     │ Keep Modal Open     │
└──────────────────┘     └─────────────────────┘

END: Contract appears in contracts list
```

**Steps:**
1. Admin navigates to Manage → Contracts
2. Clicks "+ Add Contract" button
3. Modal opens with:
   - Contract details form (top)
   - Line items table (bottom, pre-populated with 5 empty rows)
4. Admin selects:
   - Project from dropdown
   - Subcontractor from dropdown
5. Admin enters:
   - Contract Amount (e.g., $350,000)
   - Contract Nickname (e.g., "Electrical - Main Building")
6. Admin adds line items:
   - **Method 1**: Click cell to edit inline
     - Click description cell, type "Main Panel Install"
     - Press Tab to move to value cell
     - Type "50000"
     - Press Enter to move to next row
   - **Method 2**: Click "+ Add Row" to add more rows
   - **Drag to reorder**: Drag ≡ icon to reorder rows (auto-renumbers)
   - **Delete**: Select checkbox(es), click delete icon
   - **Undo**: Press Ctrl+Z to undo last change
7. **Real-time validation** (as user types):
   - Calculate total of all line item values
   - **If total ≠ contract amount**: Show red banner with error
   - **If any row has description XOR value** (not both): Show error
8. Admin reviews:
   - All line items filled correctly
   - Total matches contract amount (green indicator)
9. Admin clicks "Save Contract"
10. **If validation passes**:
    - Insert contract into `project_contractors` table
    - Insert all line items into `project_line_items` table (with `display_order`)
    - Refetch contracts
    - Close modal
    - Show success toast
11. **If error occurs**:
    - Rollback transaction (if contract inserted, delete it)
    - Show error message
    - Keep modal open for corrections

**Keyboard Shortcuts:**
- **Tab**: Move to next cell (right)
- **Enter**: Move to next row (down)
- **Escape**: Cancel cell edit
- **Ctrl+Z / Cmd+Z**: Undo last change

**Success State:** Contract with all line items saved, appears in list
**Error States:** 
- Validation error: Total ≠ contract amount
- Empty rows: Description or value missing
- Database error: Transaction rolled back

---

### 3. User Management Flow

```
START: Admin Dashboard → User Management Tab
       │
       ▼
┌──────────────────────────────────┐
│ User Management View             │
│                                  │
│ [+ Add User]  [🔍 Search]        │
│                                  │
│ Filter: [All] [Admin] [PM] [Staff]│
│                                  │
│ User Cards:                      │
│ ┌────────────────────────────┐  │
│ │ 👤 John Doe                │  │
│ │ john@example.com           │  │
│ │ Role: Admin                │  │
│ │ [Edit] [Reset] [Deactivate]│  │
│ └────────────────────────────┘  │
└──────────┬───────────────────────┘
           │
           ├───────────────────────────────┐
           │                               │
           ▼ Add User                      ▼ Edit User
┌──────────────────────┐         ┌──────────────────────┐
│ Add User Modal       │         │ Edit User Modal      │
│ • Name               │         │ • Name (editable)    │
│ • Email              │         │ • Email (readonly)   │
│ • Role               │         │ • Role (editable)    │
│ • Phone              │         │ • Phone (editable)   │
│ • Temp Password      │         │ • Company (editable) │
└──────┬───────────────┘         └──────┬───────────────┘
       │                                │
       ▼                                ▼
┌──────────────────────┐         ┌──────────────────────┐
│ Create Supabase User │         │ Update User Record   │
│ (via Service Role)   │         │ Update Role          │
└──────┬───────────────┘         └──────┬───────────────┘
       │                                │
       ├──────────┐                     ├──────────┐
       │          │                     │          │
       ▼ Success  ▼ Error               ▼ Success  ▼ Error
┌──────────┐  ┌──────┐           ┌──────────┐  ┌──────┐
│ Insert   │  │ Show │           │ Refetch  │  │ Show │
│ into     │  │ Error│           │ Users    │  │ Error│
│ users    │  └──────┘           │ Close    │  └──────┘
│ table    │                     │ Modal    │
│          │                     └──────────┘
│ Insert   │
│ into     │
│ user_role│
│          │
│ Send     │
│ welcome  │
│ email    │
└──────────┘
```

**Add User Steps:**
1. Admin clicks "+ Add User"
2. Modal opens with form:
   - Name
   - Email
   - Role (dropdown: Admin, PM, Staff)
   - Phone
   - Optional: Company, Address
3. Admin fills form and clicks "Create User"
4. **System actions** (via API route with service role):
   - Create Supabase Auth user with temporary password
   - Insert record into `users` table
   - Insert record into `user_role` table
   - Send welcome email with password reset link
5. **If success**: Close modal, refetch users, show success toast
6. **If error**: Show error message, keep modal open

**Edit User Steps:**
1. Admin clicks "Edit" on user card
2. Modal opens with pre-filled form (email readonly)
3. Admin modifies fields
4. Admin clicks "Update User"
5. **System actions**:
   - Update `users` table
   - Update `user_role` table (if role changed)
6. **If success**: Close modal, refetch users, show success toast
7. **If error**: Show error message, keep modal open

**Reset Password Steps:**
1. Admin clicks "Reset Password" on user card
2. Confirmation dialog: "Send password reset email to [email]?"
3. Admin clicks "Confirm"
4. System sends password reset email via Supabase
5. Show success toast: "Password reset email sent"

**Deactivate User Steps:**
1. Admin clicks "Deactivate" on user card
2. Confirmation dialog: "Deactivate [name]? They will not be able to log in."
3. Admin clicks "Confirm"
4. Update `users.status` to 'inactive'
5. Refetch users, show success toast

---

## PM Role Flows

### 1. Review Payment Application Flow

```
START: PM Dashboard → Payment Applications Tab
       │
       ▼
┌──────────────────────────────────────────┐
│ Payment Applications List                │
│ Status: [Pending Review (5)] [Approved]  │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │ 💰 Payment #1234                     ││
│ │ ABC Electrical • $45,000             ││
│ │ Status: Submitted • 2 days ago       ││
│ │ [Review Now] [Send SMS] [View Docs]  ││
│ └──────────────────────────────────────┘│
└──────────────┬───────────────────────────┘
               │
               │ PM clicks "Review Now"
               ▼
┌────────────────────────────────────────────────────────┐
│ Payment Verification Page                              │
│ (/payments/1234/verify)                                │
│                                                        │
│ Summary: ABC Electrical, $45,000                       │
│                                                        │
│ Line Items Table:                                      │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Item│ Description  │ Prev%│ This%│ Amount       │  │
│ ├─────┼──────────────┼──────┼──────┼──────────────┤  │
│ │ 01  │ Main Panel   │ 60%  │[85%] │$12,500 ✏️   │  │
│ │ 02  │ Sub-panel    │ 40%  │[70%] │$22,500 ✏️   │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Photos & Documents:                                    │
│ ┌─────┐ ┌─────┐ ┌─────┐                              │
│ │[IMG]│ │[IMG]│ │[PDF]│                              │
│ └─────┘ └─────┘ └─────┘                              │
│                                                        │
│ PM Notes:                                              │
│ ┌────────────────────────────────────────────────┐    │
│ │ [Text area for PM notes]                       │    │
│ └────────────────────────────────────────────────┘    │
│                                                        │
│ Actions:                                               │
│ [✅ Approve] [❌ Reject] [💬 Request Clarification]   │
└────────────────────────────────────────────────────────┘
               │
               ├──────────────────────────────┐
               │                              │
               ▼ Approve                      ▼ Reject
┌──────────────────────────┐      ┌──────────────────────────┐
│ Approve Dialog           │      │ Reject Dialog            │
│ "Approve $45,000?"       │      │ "Reject Payment?"        │
│                          │      │                          │
│ Approval Notes:          │      │ Rejection Reason:        │
│ ┌──────────────────────┐ │      │ ┌──────────────────────┐ │
│ │ [Optional text]      │ │      │ │ [Required text]      │ │
│ └──────────────────────┘ │      │ └──────────────────────┘ │
│                          │      │                          │
│ [Cancel] [Confirm]       │      │ [Cancel] [Confirm]       │
└──────┬───────────────────┘      └──────┬───────────────────┘
       │                                 │
       ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ API: POST /api/payments/ │      │ API: POST /api/payments/ │
│      1234/approve        │      │      1234/reject         │
└──────┬───────────────────┘      └──────┬───────────────────┘
       │                                 │
       ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ Update Database:         │      │ Update Database:         │
│ • status = 'approved'    │      │ • status = 'rejected'    │
│ • approved_by = PM ID    │      │ • rejected_by = PM ID    │
│ • approved_at = NOW()    │      │ • rejected_at = NOW()    │
│ • approval_notes = ...   │      │ • rejection_notes = ...  │
│                          │      │                          │
│ Generate G-703 PDF       │      │ Send rejection SMS       │
│ Send SMS notification    │      │ to contractor            │
└──────┬───────────────────┘      └──────┬───────────────────┘
       │                                 │
       ▼                                 ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│ Success:                 │      │ Success:                 │
│ • Redirect to list       │      │ • Redirect to list       │
│ • Show success toast     │      │ • Show success toast     │
│ • Payment moves to       │      │ • Payment moves to       │
│   "Approved" filter      │      │   "Rejected" filter      │
└──────────────────────────┘      └──────────────────────────┘

END: Payment application status updated
```

**Steps:**
1. PM logs in, navigates to Payment Applications tab
2. PM sees list of pending payment applications
3. PM clicks "Review Now" on a payment application
4. **Verification Page Loads**:
   - Payment summary (contractor, amount, project, period)
   - Line items table with editable percentages
   - Photos/documents viewer
   - PM notes section
5. **PM Reviews**:
   - Check photos match claimed progress
   - Verify percentages are accurate
   - **Optionally adjust percentages** (click cell, edit, recalculates amount)
   - Add PM notes
6. **PM Decides**:
   - **Option A: Approve**
     - Click "Approve" button
     - Confirmation dialog: "Approve $45,000?"
     - Enter optional approval notes
     - Click "Confirm"
     - **System actions**:
       - Update `status` to 'approved'
       - Set `approved_by`, `approved_at`, `approval_notes`
       - Generate G-703 PDF
       - Send SMS notification to contractor
       - Update project `spent` amount
     - Redirect to list, show success toast
   - **Option B: Reject**
     - Click "Reject" button
     - Confirmation dialog: "Reject Payment?"
     - Enter rejection reason (required)
     - Click "Confirm"
     - **System actions**:
       - Update `status` to 'rejected'
       - Set `rejected_by`, `rejected_at`, `rejection_notes`
       - Send SMS notification to contractor with reason
     - Redirect to list, show success toast
   - **Option C: Request Clarification**
     - Click "Request Clarification" button
     - Modal: Enter question/request
     - Send SMS to contractor
     - Status remains 'submitted'

**Success States:**
- Approved: Payment moves to "Approved" filter, contractor notified
- Rejected: Payment moves to "Rejected" filter, contractor notified with reason

**Error States:**
- Network error: Show error toast, stay on page
- Database error: Show error toast, stay on page

---

### 2. Initiate Payment Request via SMS

```
START: PM Dashboard → Projects Tab
       │
       ▼
┌──────────────────────────────────┐
│ Projects Overview                │
│                                  │
│ ┌────────────────────────────┐  │
│ │ 🏗️ Downtown Office Complex │  │
│ │ 5 Active Contractors       │  │
│ │ [View Contractors →]       │  │
│ └────────────────────────────┘  │
└──────┬───────────────────────────┘
       │ PM clicks project
       ▼
┌──────────────────────────────────┐
│ Contractor Selection View        │
│                                  │
│ ┌────────────────────────────┐  │
│ │ ABC Electrical             │  │
│ │ 📱 (555) 123-4567          │  │
│ │ Contract: $350K | Paid: $200K│
│ │                            │  │
│ │ [Request Payment via SMS]  │  │
│ └────────────────────────────┘  │
└──────┬───────────────────────────┘
       │ PM clicks "Request Payment"
       ▼
┌──────────────────────────────────┐
│ Confirmation Dialog              │
│ "Send payment request to         │
│  ABC Electrical via SMS?"        │
│                                  │
│ Phone: (555) 123-4567            │
│                                  │
│ [Cancel] [Confirm]               │
└──────┬───────────────────────────┘
       │ PM clicks "Confirm"
       ▼
┌──────────────────────────────────┐
│ API: POST /api/sms/initiate      │
│ Body: {                          │
│   project_id: 123,               │
│   contractor_id: 456,            │
│   phone: "(555) 123-4567"        │
│ }                                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Database Insert:                 │
│ 1. Create payment_application    │
│    status = 'initiated'          │
│ 2. Create payment_sms_conversation│
│    state = 'awaiting_start'      │
│ 3. Fetch contract line items     │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Twilio: Send SMS                 │
│ To: (555) 123-4567               │
│ Message: "Hi! Time to submit your│
│ payment application for Downtown │
│ Office Complex. Reply START when │
│ ready."                          │
└──────┬───────────────────────────┘
       │
       ├──────────────────┐
       │                  │
       ▼ Success          ▼ Error
┌──────────────┐   ┌─────────────────┐
│ Update status│   │ Mark as failed  │
│ = 'sms_sent' │   │ Show error toast│
│ Success toast│   └─────────────────┘
└──────────────┘

CONTRACTOR RECEIVES SMS:
┌──────────────────────────────────┐
│ 📱 Contractor Phone              │
│                                  │
│ ConstructionOps:                 │
│ "Hi! Time to submit your payment │
│  application for Downtown Office │
│  Complex. Reply START when ready."│
└──────────────────────────────────┘
       │
       │ Contractor replies "START"
       ▼
┌──────────────────────────────────┐
│ Twilio Webhook: POST /api/sms/   │
│                      webhook     │
│ Body: {                          │
│   From: "+15551234567",          │
│   Body: "START"                  │
│ }                                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Process Message:                 │
│ • Lookup conversation by phone   │
│ • Recognize "START" command      │
│ • Update state = 'in_progress'   │
│ • Set current_question_index = 0 │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Send First Question:             │
│ "Great! Let's start. For line    │
│  item 1 (Main Panel Install),    │
│  what % is complete? (0-100)"    │
└──────────────────────────────────┘
       │
       │ ... continues for all line items ...
       │
       ▼
┌──────────────────────────────────┐
│ Final Message:                   │
│ "Thanks! Your payment application│
│  has been submitted. Total: $45K │
│  We'll review and get back to you│
│  soon."                          │
│                                  │
│ Update status = 'submitted'      │
└──────────────────────────────────┘

END: Payment application appears in PM's "Pending Review" list
```

**Steps:**
1. PM navigates to Projects tab
2. PM selects a project
3. Contractor Selection View shows all contractors for that project
4. PM clicks "Request Payment via SMS" for a contractor
5. Confirmation dialog shows contractor name and phone
6. PM confirms
7. **System creates**:
   - `payment_application` record (status: 'initiated')
   - `payment_sms_conversation` record (state: 'awaiting_start')
8. **Twilio sends SMS**: "Reply START when ready"
9. **Contractor replies** "START"
10. **Twilio webhook** receives message, routes to `/api/sms/webhook`
11. **System processes**:
    - Lookup conversation by phone number
    - Recognize "START" command
    - Update state to 'in_progress'
    - Send first question about line item 1
12. **Contractor replies** with percentage (e.g., "85")
13. **System processes**:
    - Validate percentage (0-100)
    - Store response
    - Increment question index
    - Send next question
14. **Repeat** for all line items
15. **After last question**:
    - Calculate total amount
    - Update status to 'submitted'
    - Send confirmation SMS
16. **Payment application** now appears in PM's "Pending Review" list

---

## Staff Role Flows

### 1. View Projects (Read-Only)

```
START: Staff Dashboard → Projects Tab
       │
       ▼
┌──────────────────────────────────┐
│ Projects View                    │
│ (Read-Only)                      │
│                                  │
│ No "+ Add Project" button        │
│ No "Edit" buttons                │
│                                  │
│ ┌────────────────────────────┐  │
│ │ 🏗️ Downtown Office Complex │  │
│ │ Budget: $2.5M | Spent: $2.1M│
│ │ Status: Active ✅          │  │
│ │ [View Details]             │  │
│ └────────────────────────────┘  │
└──────┬───────────────────────────┘
       │ Staff clicks "View Details"
       ▼
┌──────────────────────────────────┐
│ Project Detail Modal             │
│ (Read-Only)                      │
│                                  │
│ Project: Downtown Office Complex │
│ Client: Acme Corp                │
│ Budget: $2,500,000               │
│ Spent: $2,100,000 (84%)          │
│ Status: Active                   │
│ Phase: Electrical                │
│ Target: Dec 15, 2025             │
│                                  │
│ Contractors (5):                 │
│ • ABC Electrical - $350K         │
│ • XYZ Plumbing - $180K           │
│ ...                              │
│                                  │
│ [Close]                          │
└──────────────────────────────────┘

END: Staff views project information
```

**Staff Permissions:**
- ✅ View projects
- ✅ View project details
- ✅ View contractors
- ✅ View payment applications
- ❌ Create/Edit/Delete projects
- ❌ Create/Edit/Delete contractors
- ❌ Approve/Reject payments
- ❌ User management

---

## Payment Application Lifecycle

### Complete Lifecycle Diagram

```
┌─────────────┐
│   PM        │
│ Initiates   │
│ SMS Request │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Status:         │
│ 'initiated'     │
└──────┬──────────┘
       │
       │ System sends SMS
       ▼
┌─────────────────┐
│ Status:         │
│ 'sms_sent'      │
└──────┬──────────┘
       │
       │ Contractor replies START
       │ and answers questions
       ▼
┌─────────────────┐
│ Status:         │
│ 'submitted'     │
└──────┬──────────┘
       │
       │ PM reviews
       │
       ├──────────────────────────┐
       │                          │
       ▼ Approve                  ▼ Reject
┌─────────────────┐       ┌─────────────────┐
│ Status:         │       │ Status:         │
│ 'approved' ✅   │       │ 'rejected' ❌   │
│                 │       │                 │
│ • Generate PDF  │       │ • Send SMS      │
│ • Update spent  │       │   with reason   │
│ • Send SMS      │       │                 │
└─────────────────┘       └─────────────────┘

                          ┌─────────────────┐
                          │ PM can recall   │
                          │ back to         │
                          │ 'submitted'     │
                          └─────────────────┘
```

**Status Transitions:**
1. **initiated** → Created by PM, waiting for SMS to send
2. **sms_sent** → SMS sent to contractor, waiting for START reply
3. **submitted** → Contractor completed SMS workflow, pending PM review
4. **approved** → PM approved, PDF generated, contractor paid
5. **rejected** → PM rejected, contractor notified

**Reversible Actions:**
- PM can **recall** an approved payment back to 'submitted' (before payment issued)

---

## Project Management Flows

### Complete Project Lifecycle

```
┌──────────────┐
│ Admin Creates│
│   Project    │
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│ Status: 'active'       │
│ Budget: $2.5M          │
│ Spent: $0              │
└──────┬─────────────────┘
       │
       │ Admin adds contracts
       ▼
┌────────────────────────┐
│ Contracts:             │
│ • ABC Electrical: $350K│
│ • XYZ Plumbing: $180K  │
│ • DEF Concrete: $500K  │
│ Total: $1.03M          │
└──────┬─────────────────┘
       │
       │ PM requests payments
       │ Payments get approved
       ▼
┌────────────────────────┐
│ Spent increases:       │
│ • $45K (ABC)           │
│ • $32K (XYZ)           │
│ Spent: $77K            │
└──────┬─────────────────┘
       │
       │ ... payments continue ...
       ▼
┌────────────────────────┐
│ Budget: $2.5M          │
│ Spent: $2.4M (96%)     │
│ Status: 'active'       │
└──────┬─────────────────┘
       │
       │ Project completed
       ▼
┌────────────────────────┐
│ Status: 'completed' ✅ │
│ Final Spent: $2.45M    │
│ Under Budget: $50K     │
└────────────────────────┘
```

---

## Error Handling & Recovery

### 1. Network Error During Save

```
User Submits Form
       │
       ▼
Optimistic Update (UI shows success immediately)
       │
       ▼
Network Request Fails ❌
       │
       ▼
┌──────────────────────────┐
│ Error Handler:           │
│ • Rollback UI changes    │
│ • Show error toast       │
│ • Keep form open         │
│ • Preserve user input    │
└──────────────────────────┘
       │
       ▼
User Can:
• [Retry] - Try again
• [Cancel] - Discard changes
• [Save Draft] - Save locally (future feature)
```

### 2. SMS Timeout (Contractor Doesn't Reply)

```
SMS Sent to Contractor
       │
       ▼
Wait 2 hours
       │
       ▼
No Reply? ⏰
       │
       ▼
Send Reminder SMS:
"You haven't replied yet. Reply START to begin payment application."
       │
       ▼
Wait 4 more hours
       │
       ▼
Still No Reply? ⏰⏰
       │
       ▼
Escalate to PM:
• Email notification
• Dashboard alert
• Status: 'escalated'
       │
       ▼
PM Can:
• Send another SMS
• Call contractor
• Cancel and restart
```

### 3. Validation Error

```
User Submits Form
       │
       ▼
Client-Side Validation Fails ❌
       │
       ▼
┌──────────────────────────┐
│ • Highlight invalid      │
│   fields (red border)    │
│ • Show error messages    │
│ • Focus first error      │
│ • Disable submit button  │
│   until fixed            │
└──────────────────────────┘
       │
       ▼
User Fixes Errors
       │
       ▼
Real-Time Validation Passes ✅
       │
       ▼
Submit Button Enabled
```

---

## Summary

**User Flows Documented:**
- ✅ Authentication (Login, Password Reset)
- ✅ Admin Flows (Projects, Contracts, Users)
- ✅ PM Flows (Payment Review, SMS Initiation)
- ✅ Staff Flows (Read-Only Access)
- ✅ Payment Application Lifecycle
- ✅ Error Handling & Recovery

**Key Principles:**
1. **Optimistic Updates**: UI updates immediately for better UX
2. **Real-Time Validation**: Errors shown as user types
3. **Clear Feedback**: Success/error toasts, status indicators
4. **Reversible Actions**: Undo, recall, rollback capabilities
5. **Progressive Disclosure**: Show details when needed
6. **Error Recovery**: Clear paths to retry/fix errors
7. **Role-Based Access**: Appropriate permissions per role

