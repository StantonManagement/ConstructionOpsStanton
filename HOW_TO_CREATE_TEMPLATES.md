# How to Create Scope Templates

## What Are Scope Templates?

**Scope templates** are reusable checklists for common types of work. Instead of defining scope items from scratch every time, you create a template once and reuse it for similar projects.

**Example Templates:**
- "Standard Electrical Rough-in"
- "Full HVAC Installation"
- "Drywall Finish Work"
- "Standard Plumbing Rough-in"

---

## Why Use Templates?

### 1. **Save Time**
```
Without Template:
  Create bid round → Manually type 10-15 scope items → Takes 10 minutes

With Template:
  Create bid round → Select template → Auto-populates → Takes 30 seconds
```

### 2. **Consistency**
- Same scope items across similar projects
- No forgetting important items
- Standardized language

### 3. **Institutional Knowledge**
- Capture what's "typically included" vs "often excluded"
- Document common exclusions (permits, cleanup, etc.)
- Build best practices into the system

### 4. **Better Bidding**
- Contractors see clear, detailed scope
- Fewer questions and clarifications
- More accurate bids

---

## How to Create a Template

### Step-by-Step Process

**1. Navigate to Templates**
```
Sidebar → Click "Scope Templates" (📋 icon)
  ↓
Templates list page loads
```

**2. Click "New Template"**
```
Click the "New Template" button (top right)
  ↓
ScopeTemplateCreateModal opens
```

**3. Fill in Basic Information**

```
┌─────────────────────────────────────────────────────┐
│  Template Name*: Standard Electrical Rough-in       │
│  Trade*:         Electrical (dropdown)              │
│  Scope Type:     Rough-in                          │
│  Description:    Standard rough-in work for        │
│                  residential units                  │
└─────────────────────────────────────────────────────┘

* Required fields
```

**Field Explanations:**

- **Template Name**: Descriptive name (e.g., "Standard Electrical Rough-in")
- **Trade**: Category (Electrical, Plumbing, HVAC, etc.)
- **Scope Type**: Sub-category (Rough-in, Finish, Full Install)
- **Description**: Brief explanation of what this template covers

**4. Add Scope Items**

Click "Add Item" button for each scope item:

```
┌─────────────────────────────────────────────────────┐
│  ☑ [x] Panel installation                          │
│     Notes: Includes 100-amp service panel          │
│                                                     │
│  ☑ [x] Wire runs (rough)                          │
│     Notes: All unit wiring per code                │
│                                                     │
│  ☑ [x] Conduit installation                       │
│     Notes: EMT conduit, all exposed areas          │
│                                                     │
│  ☑ [ ] Permits & inspection fees                  │
│     Notes: Often excluded - verify with contractor │
│                                                     │
│  ☑ [ ] Fire alarm rough-in                        │
│     Notes: Often excluded from electrical bid      │
│                                                     │
│  ☑ [ ] Cleanup                                     │
│     Notes: Often excluded                          │
└─────────────────────────────────────────────────────┘

Legend:
[x] = Checked = Typically included
[ ] = Unchecked = Often excluded (watch for this!)
```

**Checkbox Meaning:**

- **Checked (✅)** = Typically included in bids
  - Most contractors include this by default
  - Safe assumption

- **Unchecked (⬜)** = Often excluded
  - Many contractors leave this out
  - Warns you to check during comparison
  - Highlighted in comparison view

**5. Review and Save**

```
Check your template:
  • At least 1 scope item required
  • All items have descriptions
  • Checked items = typically included
  • Unchecked items = watch for exclusions
  ↓
Click "Create Template"
  ↓
Template saved and ready to use!
```

---

## Example: Creating an Electrical Template

### Scenario
You frequently need bids for electrical rough-in work. Let's create a reusable template.

### Template Details

```yaml
Template Name: Standard Electrical Rough-in
Trade: Electrical
Scope Type: Rough-in
Description: Standard rough-in electrical work for residential units, per NEC code

Scope Items:

☑ Typically Included:
  1. Panel installation
     Notes: 100-amp service panel, circuit breakers

  2. Wire runs (rough)
     Notes: All unit wiring per electrical plan

  3. Conduit installation
     Notes: EMT conduit for all exposed areas

  4. Junction boxes
     Notes: Per electrical plan locations

  5. Main service connection
     Notes: From meter to panel

☐ Often Excluded (Watch for these!):
  6. Permits & inspection fees
     Notes: Often excluded - verify with contractor

  7. Fire alarm rough-in wiring
     Notes: Sometimes separate bid, verify scope

  8. Temporary power
     Notes: Often separate charge

  9. Site cleanup
     Notes: Often excluded from electrical scope
```

### Using This Template

**Next time you need electrical bids:**

```
Create Bid Round
  ↓
Select Template: "Standard Electrical Rough-in"
  ↓
All 9 items auto-populate
  ↓
Customize if needed:
  • Remove items not applicable
  • Add project-specific items
  • Adjust notes
  ↓
Ready to invite contractors!
```

---

## Example: Creating a Plumbing Template

```yaml
Template Name: Standard Plumbing Rough-in
Trade: Plumbing
Scope Type: Rough-in
Description: Rough-in plumbing for residential units

Scope Items:

☑ Typically Included:
  1. Water supply lines (hot & cold)
  2. Waste/drain lines
  3. Vent piping
  4. Fixture blocking/backing
  5. Gas lines (if applicable)

☐ Often Excluded:
  6. Fixtures (sinks, toilets, etc.)
     Notes: Often separate bid
  7. Water heater
     Notes: Verify inclusion
  8. Permits & inspections
  9. Pressure testing
     Notes: Sometimes separate charge
```

---

## Best Practices

### 1. **Be Specific**
```
Bad:  "Electrical work"
Good: "Wire runs per electrical plan, 12/2 and 14/2 Romex"
```

### 2. **Document Exclusions**
```
Common exclusions to note:
  • Permits & inspection fees
  • Cleanup/debris removal
  • Temporary utilities
  • Change orders for unknowns
  • Specialty items
```

### 3. **Use Notes Effectively**
```
Good notes examples:
  • "Includes 100-amp service panel"
  • "Per architectural plan, sheet E-1"
  • "Often excluded - verify with contractor"
  • "Sometimes separate bid"
  • "Requires permit coordination"
```

### 4. **Start Simple, Refine Over Time**
```
Version 1: Basic 5-6 items
  ↓
Use in bid rounds, notice patterns
  ↓
Version 2: Add commonly excluded items
  ↓
Version 3: Add project-specific variations
```

### 5. **Create Multiple Templates**
```
For Electrical:
  • "Electrical Rough-in"
  • "Electrical Finish"
  • "Electrical Full Install"
  • "Service Panel Upgrade"

For HVAC:
  • "HVAC Rough-in"
  • "HVAC Complete Install"
  • "HVAC Replacement"
```

---

## Using Templates in Bid Rounds

### When Creating a Bid Round

**Option 1: Use Template**
```
1. Click "New Bid Round"
2. Select template from dropdown
3. Items auto-populate
4. Customize if needed
5. Create round
```

**Option 2: Custom Scope**
```
1. Click "New Bid Round"
2. Leave template as "Custom scope"
3. Add items manually
4. Create round
```

### Template Selection Example

```
Create Bid Round Modal:

┌─────────────────────────────────────────────────────┐
│  Start from Template (Optional):                   │
│  [▼] Select a template...                          │
│      - Custom scope (start from scratch)           │
│      - Electrical - Rough-in: Standard             │
│      - Electrical - Finish: Standard               │
│      - Plumbing - Rough-in: Standard              │
│      - HVAC - Full Install: Residential           │
└─────────────────────────────────────────────────────┘

Select "Electrical - Rough-in: Standard"
  ↓
Trade: Electrical (auto-filled)
Scope Type: Rough-in (auto-filled)
Name: Electrical Rough-in (suggested, can edit)

Scope Items: (auto-populated)
  ☑ Panel installation
  ☑ Wire runs (rough)
  ☑ Conduit installation
  ...
```

---

## Managing Templates

### View Templates
```
/scope-templates page shows:
  • Grouped by trade
  • Template name, scope type
  • Description
  • Preview of first 5 items
```

### Edit Template
```
Currently: Edit button shows placeholder
Future: Will open edit modal to modify template
```

### Delete Template
```
Click trash icon → Confirmation dialog → Soft delete
Template marked as inactive (is_active = false)
Won't show in dropdown but existing bid rounds unchanged
```

---

## Tips for Success

### 1. **Create Templates from Real Projects**
```
After completing a bid round:
  • Note what was included/excluded
  • Save as template for next time
  • Refine based on actual experience
```

### 2. **Document Contractor Patterns**
```
Notice patterns:
  • "ABC Electric always excludes permits"
  • "Mike's Electric includes everything"

Update template notes:
  • "Permits - often excluded"
  • Helps future comparison
```

### 3. **Share Knowledge**
```
Templates capture:
  • What to expect
  • What to watch for
  • What questions to ask

Team members benefit from collective experience
```

### 4. **Keep Templates Current**
```
Review annually:
  • Update for code changes
  • Add new common exclusions
  • Remove outdated items
```

---

## Summary

**Templates = Time Saver + Consistency + Better Bids**

**Quick Start:**
1. Go to `/scope-templates`
2. Click "New Template"
3. Add 5-10 common items
4. Check what's typically included
5. Save and use in next bid round

**Result:**
- 10-minute bid round creation → 30 seconds
- Consistent scope across projects
- Fewer surprises during bidding
- Better contractor communication

🎉 **Start building your template library today!**
