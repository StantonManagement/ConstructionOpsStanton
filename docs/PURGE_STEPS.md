# Database Purge Steps

## Quick Reference for Purging Test Data

### Prerequisites
- [ ] Database backup created (if needed)
- [ ] Next.js app is stopped (no process on port 3000)
- [ ] Database credentials available (check .env.local)

### Step 1: Stop the App

```bash
# Check if app is running
lsof -ti :3000

# If a process is found, kill it
lsof -ti :3000 | xargs kill -9

# Or just Ctrl+C in the terminal running npm run dev
```

### Step 2: Connect to Database

**Option A: Using psql**
```bash
# Get credentials from .env.local
psql "postgresql://[user]:[password]@[host]:5432/[database]"
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project
2. Click "SQL Editor" in left sidebar
3. Click "New query"

### Step 3: Run Purge Script

Copy and paste the contents of: `migrations/012_purge_test_data_FINAL.sql`

Or run directly:
```bash
psql "postgresql://..." -f migrations/012_purge_test_data_FINAL.sql
```

### Step 4: Verify Purge

```sql
-- All these should return 0
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM contractors;
SELECT COUNT(*) FROM payment_applications;
SELECT COUNT(*) FROM daily_logs;
```

### What Gets Deleted
- All projects and related data
- All contractors (unless commented out)
- All budgets, contracts, tasks
- All payment applications and daily logs
- All action items, schedules, etc.

### What Gets Preserved
- Database schema (all tables remain)
- User authentication (auth.users)
- RLS policies
- Database functions and triggers

### After Purge

The database will be empty. To populate with real data:

1. Schedule data collection session with Dan (60-90 min)
2. Fill out `docs/REAL_PROJECT_DATA_TEMPLATE.md`
3. Convert to JSON format
4. Import using `/api/data-migration/import-real-projects`

See `docs/DATA_MIGRATION_GUIDE.md` for full migration process.

---

## Script Versions

Three versions available:

1. **012_purge_test_data_FINAL.sql** - RECOMMENDED
   - Checks table existence before truncating
   - Uses TRUNCATE CASCADE (fastest)
   - Provides detailed output

2. **012_purge_test_data_safe.sql**
   - Uses DELETE instead of TRUNCATE
   - Slower but more conservative
   - Checks table existence

3. **012_purge_test_data_SIMPLE.sql**
   - Simple TRUNCATE CASCADE
   - Assumes tables exist
   - May fail if tables missing

---

## Troubleshooting

**Deadlock Error:**
- App is still running - stop it first

**Table Does Not Exist:**
- Use FINAL version which checks existence

**Foreign Key Violation:**
- Use CASCADE (FINAL version handles this)

**Permission Denied:**
- Check database user has proper permissions
- Use service role credentials if using Supabase
