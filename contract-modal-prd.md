# Contract Line Items Modal Redesign - PRD

## Overview
Redesign the Add/Edit Contract modal to make line item entry more efficient for users accustomed to Excel workflows. Primary focus: inline-editable table with spreadsheet-like behavior. Secondary: placeholder for CSV import (Phase 2).

## Current State
**File**: `src/app/components/ManageView.tsx` (contains contract modal logic)

**Current Pain Points**:
- Users must fill form above table, click "Update", item appears in table below
- One-at-a-time editing is slow for 15 line items
- No keyboard navigation between fields
- Form stays populated after adding (confusing state)

## Success Metrics
- Users can add 15 line items in <2 minutes (vs current ~5 minutes)
- Zero training needed for Excel-familiar users
- Contract Amount validation catches errors before save

---

## Phase 1: Inline Editable Table (2-3 hours)

### Files to Modify
- `src/app/components/ManageView.tsx` - Main modal component
- Create new: `src/app/components/EditableLineItemsTable.tsx` - Reusable table component
- Create new: `src/hooks/useLineItemsState.ts` - State management hook

### User Stories

#### US-1: Initial State
**As a user**, when I open the Add Contract modal, I see:
- Contract basics at top (Project, Vendor, Amount, Dates, Nickname)
- "Import from CSV (Coming Soon)" button (disabled/grayed, tooltip: "Available in next phase")
- Running total display: "Total Scheduled Value: $0 of $10,000,000 Contract Amount" (green when match, red when mismatch)
- Line Items section with 5 empty rows pre-loaded:
  - Item No: Auto-populated (1, 2, 3, 4, 5) - read-only, grayed out
  - Description: Placeholder text "Enter description..."
  - Scheduled Value: Empty
  - From Previous Application: 0.00 (grayed, not editable during creation)
  - This Period: 0.00 (grayed, not editable during creation)
  - Material Presently Stored: 0.00 (grayed, not editable during creation)
  - % G/C: 0.00 (grayed, not editable during creation)
  - Actions: Drag handle (⋮⋮), Delete (X) icon

**Acceptance Criteria**:
- Modal loads in <500ms with 5 empty rows
- Item Nos 1-5 are visible and grayed
- Running total shows $0 of [Contract Amount]
- CSV button is visible but disabled

#### US-2: Inline Cell Editing
**As a user**, when I click on a Description or Scheduled Value cell:
- Cell becomes editable (shows cursor, border highlights)
- I can type directly
- Pressing Enter saves and moves to same column, next row
- Pressing Tab saves and moves to next column, same row
- If in last column of last row with data, Tab auto-creates new row with next Item No
- Clicking outside cell shows "Save changes?" dialog with Save/Discard options
- Pressing Escape cancels edit and reverts cell

**Acceptance Criteria**:
- Click-to-edit works on Description and Scheduled Value only
- Enter key navigation moves down
- Tab key navigation moves right, creates new row when needed
- Escape reverts changes
- Item No auto-increments correctly (last Item No + 1)
- Save dialog appears on click-away with unsaved changes

#### US-3: Auto-increment and Gap Filling
**As a user**, Item Nos are managed automatically:
- When I Tab from last row's Scheduled Value, new row gets next sequential Item No
- Item No field is read-only (grayed) - I cannot type in it
- If row 5 exists and I manually add row 10, system auto-fills rows 6, 7, 8, 9 with empty Description/Scheduled Value
- If I delete row 3, rows 4-15 auto-renumber to 3-14

**Acceptance Criteria**:
- Item No is never user-editable
- Gap filling creates empty rows with correct Item Nos
- Delete triggers immediate renumbering
- No duplicate Item Nos possible
- Item Nos always sequential starting from 1

#### US-4: Drag and Drop Reordering
**As a user**, I can reorder line items:
- Each row has drag handle (⋮⋮) on left
- I can drag row 5 between rows 2 and 3
- On drop, Item Nos auto-renumber (old 3-5 become new 4-6)
- Running total remains accurate after reorder

**Acceptance Criteria**:
- Drag handle is visible and clickable
- Visual feedback during drag (row opacity, drop zone indicator)
- Item Nos renumber immediately after drop
- Total Scheduled Value unchanged by reorder
- Works with keyboard (not required for Phase 1, can defer)

#### US-5: Delete Line Items
**As a user**, I can delete line items via:
- Click X icon on individual row
- Select multiple rows (checkbox) and click "Delete Selected" button
- Confirmation dialog: "Delete X line item(s)?"
- After delete, Item Nos auto-renumber immediately

**Acceptance Criteria**:
- Individual delete works with single click + confirm
- Multi-select checkboxes appear on left (before drag handle)
- "Delete Selected" button only visible when 1+ rows selected
- Confirmation shows correct count
- Renumbering happens automatically
- Running total updates immediately

#### US-6: Undo Functionality
**As a user**, Ctrl+Z (Cmd+Z on Mac) undoes:
- Last cell edit
- Last row delete
- Last reorder
- One action at a time (no full history, just last action)

**Acceptance Criteria**:
- Ctrl/Cmd+Z works for edit, delete, reorder
- Only last action is undoable
- Visual feedback (toast: "Undone") appears briefly
- Undo state clears after successful save

#### US-7: Running Total Validation
**As a user**, I see live validation:
- Top of Line Items section shows: "Total Scheduled Value: $X,XXX of $Y,YYY Contract Amount"
- Green text when Total = Contract Amount
- Red text when Total ≠ Contract Amount
- When Total ≠ Contract Amount and I click "Create Contract":
  - Error toast at top: "Total Scheduled Value must equal Contract Amount"
  - Contract Amount field highlights red
  - Error message appears above "Create Contract" button: "⚠️ Total ($X) does not match Contract Amount ($Y)"
  - Save is blocked

**Acceptance Criteria**:
- Running total updates on every cell edit
- Color changes immediately (green/red)
- Save blocked when mismatch
- All three error indicators show (toast, field highlight, button message)
- Error clears when totals match

#### US-8: Empty Row Validation
**As a user**, when I click "Create Contract":
- If any row has Item No but empty Description or Scheduled Value:
  - Error toast: "Remove or complete empty line items"
  - Empty rows highlight in red
  - Save is blocked
- Completely empty rows (no Item No) are ignored

**Acceptance Criteria**:
- Partial rows (Item No only) trigger error
- Fully empty rows are silently ignored
- Red highlight on incomplete rows
- Clear error message
- Save blocked until fixed

#### US-9: Maximum Line Items
**As a user**, when I reach 15 line items:
- Tab in last cell does not create new row
- Toast appears: "Maximum 15 line items reached. Contact admin for more."
- Top form's "Add" button is disabled with tooltip
- CSV button remains disabled with tooltip updated

**Acceptance Criteria**:
- Hard limit at 15 items enforced
- Clear message about limit
- No way to add 16th item
- Existing items can still be edited/deleted/reordered

#### US-10: Alternate Form Entry (Top Form Retained)
**As a user**, I can still use the form above the table:
- Fill out Item No (read-only, shows next number), Description, Scheduled Value
- Click "Add" button
- Item appears in table below
- Form stays populated (does not clear)
- Manual edit form fields for next entry
- This is alternate to inline editing (user choice)

**Acceptance Criteria**:
- Top form still functional
- "Add" button appends to table
- Form does not auto-clear
- Item No in form is read-only showing next sequential number
- Both methods can be used interchangeably

#### US-11: Edit Existing Contract (Before First Payment)
**As a user**, when I open Edit Contract modal before first payment request:
- All existing line items load into the editable table
- All inline editing features work (edit cells, reorder, delete, undo)
- Running total validation applies
- After first payment request, entire Edit Contract button shows but modal opens with:
  - Line items are read-only (no edit, no delete, no reorder)
  - Message at top: "⚠️ Contract locked after first payment. Use Change Orders to modify."
  - Only contract basics (dates, nickname) remain editable

**Acceptance Criteria**:
- Pre-payment: full editing enabled
- Post-payment: line items read-only
- Clear message about change orders
- Contract basics still editable post-payment
- No data loss when toggling between edit modes

---

## Phase 2: CSV Import (3-4 hours, separate implementation)

### Files to Create/Modify
- `src/app/components/CSVImportModal.tsx` - Import modal
- `src/lib/csvParser.ts` - Parse and validate CSV
- `src/app/components/EditableLineItemsTable.tsx` - Update to accept imported data

### User Stories

#### US-12: CSV Upload Interface
**As a user**, when I click "Import from CSV" button:
- File picker opens accepting .csv files only
- After file selection, CSV Import Modal opens showing:
  - Preview of first 5 rows
  - Column mapping dropdowns (Your Column → Our Field)
  - Expected format: Item No, Description, Scheduled Value
  - "Import" and "Cancel" buttons

**Acceptance Criteria**:
- Only .csv files accepted
- Preview shows parsed data
- Column mapping saves user preferences
- Clear format instructions
- Validation errors show before import

#### US-13: CSV Data Population
**As a user**, after clicking Import:
- Modal closes
- Line items table populates with CSV data
- All inline editing features work on imported data
- Running total updates immediately
- I can edit, reorder, delete imported items before saving contract

**Acceptance Criteria**:
- CSV data loads into editable table
- Item Nos renumber if needed
- All validation rules apply
- No difference between manual and imported items
- Can mix manual entry with CSV import

---

## Technical Implementation Notes for Cursor

### Phase 1 Implementation Steps

#### Step 1: Create useLineItemsState Hook (30 min)
**File**: `src/hooks/useLineItemsState.ts`

```typescript
interface LineItem {
  itemNo: number;
  description: string;
  scheduledValue: number;
  fromPrevious: number;
  thisPeriod: number;
  materialStored: number;
  percentGC: number;
  id: string; // uuid for React keys
}

export function useLineItemsState(initialItems: LineItem[] = []) {
  // State: items array, selectedIds, lastAction for undo
  // Actions: addItem, updateItem, deleteItems, reorderItem, undo
  // Computed: totalScheduledValue, hasEmptyRows, hasDuplicates
  // Auto-renumbering logic in deleteItems and reorderItem
}
```

**Key Logic**:
- Auto-increment: `Math.max(...items.map(i => i.itemNo), 0) + 1`
- Renumber: `items.map((item, idx) => ({ ...item, itemNo: idx + 1 }))`
- Gap filling: Detect gaps, insert empty items
- Undo: Store last action with previous state

#### Step 2: Create EditableLineItemsTable Component (1.5 hours)
**File**: `src/app/components/EditableLineItemsTable.tsx`

**Props**:
```typescript
interface EditableLineItemsTableProps {
  items: LineItem[];
  onUpdate: (id: string, field: keyof LineItem, value: any) => void;
  onDelete: (ids: string[]) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAdd: () => void;
  isEditable: boolean; // false after first payment
  maxItems?: number; // default 15
}
```

**Features**:
- React DnD or similar for drag-drop
- Contenteditable divs or input elements for cells
- Keyboard event handlers (Enter, Tab, Escape, Ctrl+Z)
- Checkbox column for multi-select
- Running total in header
- Empty row highlighting

**Libraries to Consider**:
- `react-beautiful-dnd` for drag-drop
- `react-hot-keys-hook` for keyboard shortcuts
- Native `contenteditable` or controlled inputs

#### Step 3: Update ManageView Modal (1 hour)
**File**: `src/app/components/ManageView.tsx`

**Changes**:
- Import and use `useLineItemsState` hook
- Replace current line items table with `EditableLineItemsTable`
- Add running total display component above table
- Add validation checks in handleSave
- Keep existing top form, wire to hook's `addItem`
- Add "Import from CSV (Coming Soon)" disabled button
- Add contract locking check (query for payment_applications where contract_id)

**Validation Logic**:
```typescript
const canSave = () => {
  if (totalScheduledValue !== contractAmount) {
    showError("Total must equal Contract Amount");
    return false;
  }
  if (hasEmptyRows) {
    showError("Remove or complete empty line items");
    return false;
  }
  return true;
};
```

#### Step 4: Styling and Polish (30 min)
- Match existing design system colors
- Hover states for drag handles, delete icons
- Focus states for editable cells
- Error state styling (red borders, backgrounds)
- Green/red text for running total
- Disabled state for CSV button with tooltip

### Testing Checklist

**Manual Testing**:
- [ ] Load modal with 5 empty rows
- [ ] Click cell, type, press Enter - moves down
- [ ] Tab through cells - creates new row at end
- [ ] Click away from unsaved cell - shows save dialog
- [ ] Press Escape - reverts cell edit
- [ ] Add 15 items - 16th blocked with message
- [ ] Delete item 3 - items renumber 4→3, 5→4, etc.
- [ ] Drag item 5 to position 2 - renumbers correctly
- [ ] Select multiple, bulk delete - confirmation shows count
- [ ] Ctrl+Z after edit - reverts last change
- [ ] Ctrl+Z after delete - restores row
- [ ] Ctrl+Z after reorder - moves back
- [ ] Running total green when matches Contract Amount
- [ ] Running total red when doesn't match
- [ ] Try to save with mismatch - blocked with 3 error indicators
- [ ] Leave row with Item No but no Description - blocked on save
- [ ] Completely empty rows - ignored on save
- [ ] Top form Add button - works alongside inline editing
- [ ] Open edit modal before payment - full editing enabled
- [ ] Open edit modal after payment - line items read-only

**Automated Tests** (optional for Phase 1):
- Unit tests for `useLineItemsState` renumbering logic
- Unit tests for gap filling
- Integration test for validation rules

### Database Considerations

**No Schema Changes Required** - line items already stored in `project_line_items` table

**Queries Needed**:
```sql
-- Check if contract has payment applications (for locking)
SELECT COUNT(*) FROM payment_applications 
WHERE contract_id = $1 AND status != 'draft';

-- Existing line item CRUD already in place
```

### Edge Cases to Handle

1. **Concurrent Editing**: Not in scope - modal is single-user
2. **Large Numbers**: Format Scheduled Value with commas
3. **Decimal Precision**: Store as cents (multiply by 100), display as dollars
4. **Item No Gaps**: Auto-fill on detection
5. **Browser Compatibility**: Test in Chrome, Safari, Firefox
6. **Mobile View**: Horizontal scroll only (no editing on mobile)

### Performance Optimizations

- Debounce running total calculation (100ms)
- Virtual scrolling if >50 items needed (future)
- Memoize computed values in hook
- Use `React.memo` for table rows

### Accessibility

- ARIA labels on drag handles: "Reorder item X"
- ARIA labels on delete buttons: "Delete item X"
- Focus management (return focus after delete)
- Keyboard-only navigation possible
- Screen reader announces running total changes

---

## Phase 2 Implementation Steps (Future)

### CSV Parser Implementation
**File**: `src/lib/csvParser.ts`

**Requirements**:
- Parse CSV using PapaParse library
- Validate column headers
- Type coercion (string to number for Scheduled Value)
- Error reporting (row-level validation)
- Return array of LineItem objects

### CSV Import Modal
**File**: `src/app/components/CSVImportModal.tsx`

**Features**:
- File upload dropzone
- CSV preview table (first 5 rows)
- Column mapping interface
- Validation error display
- Import progress indicator

### Integration with Existing Table
- Import button becomes enabled
- On import, call `setItems` with parsed data
- All existing validation applies
- No special handling needed

---

## Deployment Notes

1. **Feature Flag**: Consider wrapping in feature flag for gradual rollout
2. **User Training**: Update help docs with GIF of inline editing
3. **Rollback Plan**: Keep old modal code in git history, easy to revert
4. **Monitoring**: Track modal open/close times, save success rate

---

## Open Questions for Alex

1. Should Scheduled Value accept decimals (e.g., $1,234.56) or whole dollars only?
2. What happens to existing contracts' line items on deployment? (Assumes no migration needed)
3. Do you want analytics on CSV import usage once Phase 2 launches?
4. Should we add a "Copy from Contract" feature to duplicate another contract's line items?

---

## Success Criteria

**Phase 1 Complete When**:
- All 11 user stories pass manual testing checklist
- Modal loads and saves without errors
- Users can add 15 items in <2 minutes
- No regressions in existing contract functionality
- CSV button visible but disabled

**Phase 2 Complete When**:
- CSV import works with sample G702 export
- Imported data is editable before save
- All Phase 1 features work with imported data
- Error handling covers malformed CSV files

---

**Estimated Total Time**: 
- Phase 1: 3-4 hours
- Phase 2: 3-4 hours
- Total: 6-8 hours

**Priority**: High - direct impact on user efficiency and adoption
