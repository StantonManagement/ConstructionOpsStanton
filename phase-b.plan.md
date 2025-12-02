## Phase B: Construction Loan Budget Implementation Plan

### 1. Database Schema & Migrations
- **Create Migration File**: `database-migrations/phase-b-loans.sql`
- **Tables to Create**:
  - `construction_loans`: Tracks loan details (lender, amount, status) per project.
  - `loan_budget_items`: Lender's budget categories (original, locked, COs).
  - `loan_draws`: Tracks draw requests, approvals, and funding dates.
  - `loan_draw_allocations`: Maps draw amounts to specific loan budget items.
  - `budget_category_loan_mapping`: Maps internal `property_budgets` to `loan_budget_items` (preparation for Phase C).
- **Constraints**:
  - Foreign keys to `projects(id)` and `property_budgets(id)`.
  - Indexes on `project_id`, `loan_id`, `status`.

### 2. Type Definitions
- **Create File**: `src/types/loan.ts`
- **Interfaces**:
  - `ConstructionLoan`: Loan metadata.
  - `LoanBudgetItem`: Budget line item with calculated fields (revised, drawn, remaining).
  - `LoanDraw`: Draw request details.
  - `LoanDrawAllocation`: Join table for draws and items.

### 3. API Endpoints
- **Loan Management**:
  - `GET /api/projects/[id]/loan`: Fetch loan, budget items, and draws for a project.
  - `POST /api/projects/[id]/loan`: Create a new construction loan.
  - `PUT /api/loans/[id]`: Update loan details (status, dates).
- **Budget Items**:
  - `POST /api/loans/[id]/budget-items`: Bulk create/update budget line items.
  - `POST /api/loans/[id]/lock`: Lock the original budget (sets `locked_at`).
- **Draws**:
  - `GET /api/loans/[id]/draws`: Fetch all draws for a loan.
  - `POST /api/loans/[id]/draws`: Create a new draw request (with allocations).
  - `PUT /api/loan-draws/[id]`: Update draw status (approve, fund, reject).

### 4. UI Components (New `src/app/components/loan/` directory)
- **`LoanBudgetView.tsx`**: Main container component. Fetches data and manages state (loading, error, loan data).
- **`LoanDetailsCard.tsx`**: Displays loan summary, progress bar (Drawn vs Total), and "Lock Budget" action.
- **`LoanBudgetTable.tsx`**: 
  - Displays budget items (Original, Locked, COs, Revised, Drawn, Remaining).
  - Allows editing "Original" if unlocked, or "COs" if locked.
- **`DrawsList.tsx`**: Table showing draw history (Date, Amount, Status, Actions).
- **`DrawRequestModal.tsx`**: Form to request a new draw, allowing allocation of amounts to specific budget line items.

### 5. Integration
- **Update `ProjectDetailView.tsx`**:
  - Add 'Loan' to `SubTab` type and `SubTabNavigation`.
  - Render `LoanBudgetView` when the 'Loan' tab is active.
  - Pass `projectId` to `LoanBudgetView`.

### 6. Testing & Validation
- **Manual Test Scenarios**:
  1. **Create Loan**: Verify a new loan can be created for a project.
  2. **Manage Budget**: Add line items, verify totals.
  3. **Lock Budget**: Lock the budget and verify "Original" column becomes read-only.
  4. **Request Draw**: Create a draw, allocate funds, and verify "Drawn" and "Remaining" update correctly in the budget table.
  5. **Status Workflow**: Mark draw as Funded and verify status updates.




