# PRP: Portfolio System — Phase 1: Schema Verification & Enhancement

## Objective
Verify current database schema for portfolios and funding_sources, then enhance as needed to support full portfolio management.

---

## Pre-Flight: Schema Audit

### Step 1: Verify portfolios table exists and check columns

```sql
-- MCP: Execute this query first
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'portfolios'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- name (varchar)
- code (varchar) — short identifier like "SREP-NE"
- is_active (boolean)
- created_at, updated_at (timestamptz)

**If missing columns, add them:**
```sql
-- Only run if columns are missing
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS owner_entity_id UUID REFERENCES owner_entities(id);
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### Step 2: Verify funding_sources table

```sql
-- MCP: Execute this query
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'funding_sources'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- portfolio_id (uuid, FK to portfolios)
- name (varchar) — e.g., "Arbor Construction Loan"
- type (varchar) — loan, grant, equity, other
- lender_name (varchar) — e.g., "Arbor Realty Trust"
- commitment_amount (numeric)
- drawn_amount (numeric)
- interest_rate (numeric, nullable)
- maturity_date (date, nullable)
- loan_number (varchar, nullable) — external reference
- notes (text, nullable)
- is_active (boolean)
- created_at, updated_at (timestamptz)

**If table doesn't exist or missing columns:**
```sql
-- Create table if not exists
CREATE TABLE IF NOT EXISTS funding_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('loan', 'grant', 'equity', 'other')),
    lender_name VARCHAR(100),
    commitment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    drawn_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    interest_rate NUMERIC(5,3),
    maturity_date DATE,
    loan_number VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table exists
ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS loan_number VARCHAR(50);
ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### Step 3: Verify projects.portfolio_id relationship

```sql
-- MCP: Check projects table has portfolio_id
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'portfolio_id';
```

**If missing:**
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL;
```

**If column exists but needs constraint update:**
```sql
-- Check existing constraint
SELECT constraint_name, delete_rule
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
WHERE kcu.table_name = 'projects' AND kcu.column_name = 'portfolio_id';

-- If delete_rule is not 'SET NULL', drop and recreate:
-- ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_portfolio_id_fkey;
-- ALTER TABLE projects ADD CONSTRAINT projects_portfolio_id_fkey 
--   FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL;
```

### Step 4: Check existing data

```sql
-- MCP: See what portfolios exist
SELECT id, name, code, is_active FROM portfolios ORDER BY name;

-- MCP: See funding sources
SELECT fs.id, fs.name, fs.type, fs.lender_name, fs.commitment_amount, fs.drawn_amount, p.name as portfolio_name
FROM funding_sources fs
LEFT JOIN portfolios p ON fs.portfolio_id = p.id
ORDER BY p.name, fs.name;

-- MCP: Check projects portfolio assignments
SELECT id, name, portfolio_id FROM projects LIMIT 20;
```

---

## Schema Enhancement: Indexes

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_funding_sources_portfolio ON funding_sources(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_type ON funding_sources(type);
CREATE INDEX IF NOT EXISTS idx_funding_sources_active ON funding_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_portfolio ON projects(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_active ON portfolios(is_active);
```

---

## Schema Enhancement: Updated_at Trigger

```sql
-- Create function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;
CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_funding_sources_updated_at ON funding_sources;
CREATE TRIGGER update_funding_sources_updated_at
    BEFORE UPDATE ON funding_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Verification Checklist

After running migrations:

```sql
-- MCP: Final verification
SELECT 
    t.table_name,
    COUNT(c.column_name) as column_count
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name IN ('portfolios', 'funding_sources', 'projects')
AND t.table_schema = 'public'
GROUP BY t.table_name;
```

- [ ] portfolios table has: id, name, code, description, owner_entity_id, is_active, created_at, updated_at
- [ ] funding_sources table has: id, portfolio_id, name, type, lender_name, commitment_amount, drawn_amount, interest_rate, maturity_date, loan_number, notes, is_active, created_at, updated_at
- [ ] projects table has portfolio_id column
- [ ] All indexes created
- [ ] Updated_at triggers in place

---

## Type Definitions to Add

After schema is confirmed, add to `src/types/schema.ts`:

```typescript
export interface Portfolio {
  id: string;
  name: string;
  code: string;
  description?: string;
  owner_entity_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FundingSource {
  id: string;
  portfolio_id: string;
  name: string;
  type: 'loan' | 'grant' | 'equity' | 'other';
  lender_name?: string;
  commitment_amount: number;
  drawn_amount: number;
  interest_rate?: number;
  maturity_date?: string;
  loan_number?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed (not in DB)
  remaining?: number;
  eligible_to_draw?: number;
}
```

---

## Stop Gate

Do NOT proceed to Phase 2 until:
1. All schema queries return expected columns
2. Type definitions added to schema.ts
3. At least one portfolio exists in database (seed if needed)
