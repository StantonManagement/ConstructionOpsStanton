# Database Migrations

This directory contains SQL migration files for the Construction Ops database.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run

### Option 2: psql Command Line
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f migrations/006_bid_management.sql
```

### Option 3: Supabase CLI
```bash
supabase db push
```

## Migration Files

- `006_bid_management.sql` - Bid Management System tables and seed data
  - Creates: bid_scope_templates, bid_rounds, bids, bid_scope_items, bid_clarifications
  - Includes seed data for common trade templates (Electrical, Plumbing, HVAC, Drywall)
  - Sets up RLS policies and triggers

## Rollback

To rollback a migration, create a new migration file with DROP TABLE statements:

```sql
DROP TABLE IF EXISTS bid_clarifications CASCADE;
DROP TABLE IF EXISTS bid_scope_items CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS bid_rounds CASCADE;
DROP TABLE IF EXISTS bid_scope_templates CASCADE;
```

## Notes

- All tables have RLS (Row Level Security) enabled
- Timestamps are automatically updated via triggers
- Foreign keys use CASCADE or SET NULL appropriately
- JSONB columns are used for flexible scope item storage
