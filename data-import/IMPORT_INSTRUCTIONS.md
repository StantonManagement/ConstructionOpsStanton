# Real Project Data Import Instructions

## Overview
This guide will help you replace the test data in the system with your real project information.

---

## Step 1: Prepare Your Data

### Projects Data (`PROJECT_DATA_TEMPLATE.csv`)

Open the CSV file and fill in real information for each project:

**Required Fields:**
- `project_name` - Full project name (e.g., "Studio at Weston")
- `address` - Complete street address
- `client_name` - Client or owner name
- `budget` - Total project budget (numeric, e.g., 500000)
- `start_date` - Format: YYYY-MM-DD (e.g., 2024-01-15)
- `target_completion_date` - Format: YYYY-MM-DD
- `current_phase` - Options: Planning, Demo, Framing, Rough-In, Finishing, Emergency Repairs, Ongoing
- `status` - Usually "active" for current projects
- `project_type` - Options: renovation, emergency, single_scope, unit_turnover, external, upcoming

**Optional Fields:**
- `portfolio_name` - Group projects together (e.g., "Park Portfolio")
- `total_units` - Number of units (default: 1)
- `notes` - Any additional context

**Example Row:**
```
"Studio at Weston","123 Weston Ave, Boston, MA","Jane Smith","850000","2024-01-15","2024-12-31","Rough-In","active","renovation","Park Portfolio","1","Main renovation project with structural updates"
```

### Contractors Data (`CONTRACTOR_DATA_TEMPLATE.csv`)

Fill in your contractors and subcontractors:

**Required Fields:**
- `contractor_name` - Company name (e.g., "Smith Electric")
- `trade` - Primary trade (e.g., Electrical, Plumbing, HVAC, Framing, etc.)
- `phone` - Format: +1 (555) 123-4567
- `email` - Contact email
- `status` - Usually "active"

**Optional Fields:**
- `performance_score` - 0-100 rating (leave blank if unknown)
- `notes` - Additional info

**Example Row:**
```
"Smith Electric","Electrical","+1 (617) 555-1234","contact@smithelectric.com","active","90","Primary electrician for all Park Portfolio projects"
```

---

## Step 2: Review Your Data

Before importing, double-check:

✅ All dates are in YYYY-MM-DD format
✅ Budget amounts are numbers without $ or commas
✅ Phone numbers include country code (+1)
✅ No special characters that might break import (use standard quotes)
✅ All required fields are filled
✅ Project names match exactly across different files

---

## Step 3: Import Options

You have two options to import your data:

### Option A: Import via Admin UI (Recommended)

1. Log into the application as admin
2. Navigate to `/admin/import` (import page)
3. Upload `PROJECT_DATA_TEMPLATE.csv`
4. Review preview of data to be imported
5. Click "Import Projects"
6. Repeat for `CONTRACTOR_DATA_TEMPLATE.csv`
7. Verify imported data in Projects and Contractors pages

### Option B: Direct Database Import (Advanced)

If you're comfortable with SQL:

1. Save your filled-out CSV files
2. Use the provided import script: `data-import/import_real_data.sql`
3. Run in Supabase SQL Editor
4. Verify data imported correctly

**Note:** Option B requires you to convert CSV to SQL INSERT statements.

---

## Step 4: Clean Up Test Data

After importing real data:

### Remove Test Projects

1. Go to Projects page
2. Identify test/fake projects (usually obvious names)
3. Delete each test project:
   - Click on project
   - Click "Delete" button
   - Confirm deletion

**Or use bulk cleanup:**
```sql
-- WARNING: This deletes ALL existing projects
-- Only run if you want a fresh start
DELETE FROM projects WHERE created_at < '2024-01-01';
```

### Remove Test Contractors

1. Go to Contractors page
2. Delete any fake contractor entries
3. Verify only real contractors remain

---

## Step 5: Link Contractors to Projects

After import, you'll need to assign contractors to projects:

1. Open each project
2. Go to "Contractors" tab
3. Click "Assign Contractor"
4. Select contractor and enter contract amount
5. Set contract status to "active"
6. Save

**Data Format for Bulk Assignment:**

If you want to bulk import project-contractor relationships, create a CSV:

```
project_name,contractor_name,contract_amount,paid_to_date,contract_status
"Studio at Weston","Smith Electric","45000","15000","active"
"Studio at Weston","Jones Plumbing","32000","10000","active"
"31 Park","Smith Electric","28000","28000","completed"
```

---

## Step 6: Verify Data

After import, verify everything loaded correctly:

### Projects Page
- [ ] All 10 projects appear
- [ ] Budgets show correctly
- [ ] Dates are accurate
- [ ] Current phase is correct
- [ ] Projects grouped in portfolios (if applicable)

### Contractors Page
- [ ] All contractors listed
- [ ] Phone numbers formatted correctly
- [ ] Email addresses valid
- [ ] Trades assigned properly

### Project Details
- [ ] Open each project
- [ ] Check all fields populated
- [ ] Verify contractor assignments
- [ ] Confirm budget calculations

---

## Troubleshooting

### Common Issues:

**"Date format invalid"**
- Ensure dates are YYYY-MM-DD format
- Example: 2024-01-15 (not 01/15/2024)

**"Budget must be a number"**
- Remove $ symbols
- Remove commas
- Use plain numbers: 500000 (not $500,000)

**"Project not found"**
- Check spelling matches exactly
- CSV is case-sensitive
- Verify no extra spaces

**"Import failed"**
- Check CSV file encoding (should be UTF-8)
- Verify all required fields present
- Look for special characters causing issues

---

## Step 7: Set Up Project Numbering

After loading real projects, set up a numbering system:

1. Go to Settings → Project Settings
2. Set next project number (e.g., 1001)
3. Choose format: `PROJ-{YEAR}-{NUM}` or custom
4. Save settings

Future projects will auto-number:
- PROJ-2024-1001
- PROJ-2024-1002
- etc.

---

## Timeline Estimate

**Time to complete:**
- Data collection: 2-3 hours
- Data entry into templates: 1-2 hours
- Import and verification: 30 minutes
- Cleanup: 30 minutes
- **Total: 4-6 hours**

---

## Support

If you run into issues:

1. Check the troubleshooting section above
2. Verify your CSV file format
3. Try importing one project at a time
4. Contact support with error messages
5. Keep a backup of your CSV files

---

## Next Steps After Import

Once real data is loaded:

1. **Review accuracy** - Verify all numbers match your records
2. **Add budget line items** - Break down budgets by trade/scope
3. **Upload documents** - Add contracts, permits, photos
4. **Create payment applications** - Start tracking payments
5. **Set up daily logs** - Begin logging daily progress
6. **Train team** - Show team members how to use the system

---

## Current Projects to Load

Based on Dan's list:

1. ✅ Studio at Weston
2. ✅ 31 Park
3. ✅ 213 Buckingham retaining wall
4. ✅ Unit turnovers (multiple units)
5. ✅ 90 Park emergency
6. ✅ 15 Whitmore emergency
7. ✅ Zach's house (New City)
8. ✅ 165 Westland
9. ✅ 10 Walkit
10. ✅ Park Portfolio Water Conservation (upcoming)

**Status:** Templates created with placeholder data
**Next:** Dan fills in real information
**Then:** Import and verify

---

## File Checklist

Data files to prepare:
- [ ] `PROJECT_DATA_TEMPLATE.csv` - Filled with real project data
- [ ] `CONTRACTOR_DATA_TEMPLATE.csv` - Filled with real contractor data
- [ ] (Optional) Project-contractor assignments CSV
- [ ] (Optional) Budget line items CSV
- [ ] (Optional) Payment history CSV

---

**Questions? Contact your development team.**
