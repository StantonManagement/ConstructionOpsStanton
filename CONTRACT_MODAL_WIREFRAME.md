# Contract Modal Wireframe - Phase 1

## Modal Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Add/Edit Contract                                                      [X] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONTRACT DETAILS                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Project *          [Dropdown: Select Project         ▼]          │      │
│  │ Subcontractor *    [Dropdown: Select Contractor      ▼]          │      │
│  │ Contract Amount *  [$____________]                                │      │
│  │ Contract Nickname* [____________________________]                 │      │
│  │ Start Date        [____/____/____]                               │      │
│  │ End Date          [____/____/____]                               │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  LINE ITEMS                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ ⚠ Contract Locked: Line items cannot be edited after first payment│      │
│  │   application has been submitted.                                 │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  [+ Add Row]  [🗑 Delete Selected]  [↩ Undo (Ctrl+Z)]  [📥 Import CSV]     │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ │☐│#│ Description of Work    │ Scheduled Value │ Actions │            │ │
│  ├───────────────────────────────────────────────────────────────────────┤ │
│  │ │☐│1│ [Click to edit______] │ [$__________]   │ [⋮]     │            │ │
│  │ │☐│2│ [Click to edit______] │ [$__________]   │ [⋮]     │            │ │
│  │ │☐│3│ [Click to edit______] │ [$__________]   │ [⋮]     │            │ │
│  │ │☐│4│ [Click to edit______] │ [$__________]   │ [⋮]     │            │ │
│  │ │☐│5│ [Click to edit______] │ [$__________]   │ [⋮]     │            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ⚠ Line items must have both description and value                          │
│  ✓ Total Scheduled Value: $125,000.00                                       │
│                                                                              │
│  [Cancel]                                              [Save Contract]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Modal Container
- **Width**: Max 4xl (896px)
- **Height**: Max 90vh with scroll
- **Background**: White with shadow-2xl
- **Border Radius**: Rounded-xl

### 2. Header
```
┌─────────────────────────────────────┐
│ 📄 Add Contract               [X]   │
└─────────────────────────────────────┘
```
- Icon: FilePlus (blue)
- Title: Dynamic ("Add Contract" / "Edit Contract")
- Close button: X icon, hover effect

### 3. Contract Details Section
Form fields in 2-column grid on desktop, stacked on mobile:

| Field | Type | Validation |
|-------|------|------------|
| Project | Dropdown | Required |
| Subcontractor | Dropdown | Required |
| Contract Amount | Number input | Required, >0 |
| Contract Nickname | Text input | Required |
| Start Date | Date picker | Optional |
| End Date | Date picker | Optional |

### 4. Line Items Section

#### 4.1 Locked State Banner (if applicable)
```
┌─────────────────────────────────────────────────────┐
│ ⚠ Contract Locked: Cannot edit after first payment │
└─────────────────────────────────────────────────────┘
```
- **Condition**: Shows when contract has non-draft payment applications
- **Style**: Yellow background, warning icon
- **Behavior**: All line items become read-only

#### 4.2 Action Bar
```
[+ Add Row]  [🗑 Delete Selected (3)]  [↩ Undo]  [📥 Import CSV (Soon)]
```

| Button | Shortcut | State | Action |
|--------|----------|-------|--------|
| Add Row | - | Always enabled | Adds new empty row at bottom |
| Delete Selected | Del | Enabled when rows selected | Deletes checked rows |
| Undo | Ctrl+Z / Cmd+Z | Enabled when canUndo | Reverts last change |
| Import CSV | - | Disabled (Phase 2) | Shows "Coming Soon" tooltip |

#### 4.3 Editable Table
```
┌──────────────────────────────────────────────────────────┐
│ │☐│ # │ Description       │ Value      │ ... │ Actions  │
├──────────────────────────────────────────────────────────┤
│ │☑│ 1 │ Foundation Work   │ $25,000.00 │ ... │ [⋮]      │
│ │☐│ 2 │ Framing           │ $45,000.00 │ ... │ [⋮]      │
│ │☐│ 3 │ [Empty]           │ $0.00      │ ... │ [⋮]      │
└──────────────────────────────────────────────────────────┘
```

**Columns:**
1. **Checkbox** (40px) - Multi-select for deletion
2. **Item #** (60px) - Auto-numbered, read-only, drag handle
3. **Description** (Flex 1, min 200px) - Inline editable
4. **Scheduled Value** (150px) - Currency input, right-aligned
5. **Actions** (40px) - Kebab menu (⋮)

**Features:**
- ✅ Click cell to edit (Excel-like)
- ✅ Enter to move down, Tab to move right
- ✅ Escape to cancel edit
- ✅ Drag rows to reorder (drag handle on # column)
- ✅ Auto-renumbers after reorder/delete
- ✅ Highlights empty/invalid rows in red
- ✅ Currency formatting on blur

### 5. Validation Section
```
⚠ 2 line items have missing values
✓ Total Scheduled Value: $125,000.00
❌ Total must match Contract Amount ($150,000.00)
```

**Validation Rules:**
- Line items must have BOTH description AND value
- Total scheduled value must equal contract amount
- Empty rows are allowed but flagged
- Blocks save if validation fails

### 6. Footer Actions
```
[Cancel]                    [Save Contract]
```
- **Cancel**: Gray button, left-aligned
- **Save**: Blue button, right-aligned, disabled during save
- **Loading state**: Shows spinner and "Saving..."

## User Flows

### Flow 1: Create New Contract (Happy Path)
1. User clicks "+ Add Contract" button
2. Modal opens with 5 empty line item rows
3. User fills contract details (all required fields)
4. User clicks first Description cell → types "Foundation Work"
5. User presses Tab → moves to Value cell → types "25000"
6. User presses Enter → moves to next row
7. User fills 2-3 more line items
8. Total updates in real-time (green checkmark)
9. User clicks "Save Contract"
10. Modal closes, success notification shows

### Flow 2: Add Line Items with Validation
1. Modal open with contract details filled
2. User fills line item: "Framing" / "$45000"
3. User adds another: "" / "$5000" (empty description)
4. Validation shows: "⚠ 1 line item has missing values"
5. Empty row highlighted in red
6. Save button remains enabled (can fix later)
7. User fills missing description
8. Validation clears, line item normal color
9. Save succeeds

### Flow 3: Reorder Line Items (Drag & Drop)
1. User has 5 line items filled
2. User hovers over Item #3 → cursor changes to move
3. User drags Item #3 to position 1
4. Items auto-renumber: 3→1, 1→2, 2→3
5. Undo button activates
6. User can press Ctrl+Z to revert

### Flow 4: Delete Multiple Line Items
1. User checks 3 line items (rows 2, 4, 6)
2. Delete button shows "Delete Selected (3)"
3. User clicks Delete
4. 3 rows removed
5. Remaining items renumber automatically
6. Undo button activates

### Flow 5: Edit Locked Contract
1. User clicks Edit on contract with payment apps
2. Modal opens with yellow "Contract Locked" banner
3. Contract details are editable
4. Line items table is read-only (grayed out)
5. Add/Delete/Undo buttons disabled
6. User can only update contract details
7. Save updates contract only, not line items

## Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Cell editing | Move to next cell (right) |
| Shift+Tab | Cell editing | Move to previous cell (left) |
| Enter | Cell editing | Save and move down |
| Escape | Cell editing | Cancel edit, revert changes |
| Ctrl+Z / Cmd+Z | Anywhere | Undo last line item change |
| Delete | Rows selected | Delete selected rows |
| Arrow keys | Cell editing | Normal text navigation |

## Visual States

### Line Item Row States

**Normal Row:**
```
│☐│ 2 │ Framing Work      │ $45,000.00 │
```
- White background
- Black text
- Blue highlight on hover

**Selected Row:**
```
│☑│ 2 │ Framing Work      │ $45,000.00 │
```
- Light blue background (#EBF5FF)
- Checkbox checked

**Editing Cell:**
```
│☐│ 2 │ [Framing Work_]   │ $45,000.00 │
```
- Blue border around cell
- Cursor visible
- White background

**Invalid Row (Missing Data):**
```
│☐│ 3 │ Foundation Work   │            │
```
- Light red background (#FEE2E2)
- Red border on empty required cell

**Empty Row:**
```
│☐│ 5 │                   │            │
```
- White background
- Placeholder text: "Click to add description..."
- Gray text color

## Responsive Design

### Desktop (>1024px)
- Modal: 896px wide
- 2-column form layout
- Full table visible
- All columns shown

### Tablet (768px - 1024px)
- Modal: 90% width
- 2-column form layout
- Table scrolls horizontally
- All columns shown

### Mobile (<768px)
- Modal: Full screen
- 1-column form layout
- Table scrolls horizontally
- Simplified columns (hide extras)
- Larger touch targets (48px min)

## Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Primary Blue | Save button, links | #3B82F6 |
| Success Green | Validation checkmark | #10B981 |
| Warning Yellow | Locked banner | #F59E0B |
| Error Red | Validation errors | #EF4444 |
| Gray 50 | Background | #F9FAFB |
| Gray 700 | Text | #374151 |
| Gray 300 | Borders | #D1D5DB |

## Accessibility

- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation fully supported
- ✅ Focus indicators visible
- ✅ Color contrast meets WCAG AA
- ✅ Screen reader friendly
- ✅ Error messages announced
- ✅ Loading states announced

## Performance Targets

- Initial render: <100ms
- Cell edit response: <50ms
- Drag & drop: 60fps
- Save operation: <2s
- Undo operation: Instant

## Future Enhancements (Phase 2)

- 📥 CSV Import
- 📤 CSV Export
- 📋 Copy/Paste from Excel
- 🔍 Search/Filter line items
- 📊 Bulk edit selected rows
- 🎨 Custom line item categories
- 📝 Notes field per line item

