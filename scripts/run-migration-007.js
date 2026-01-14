require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

const migrationSQL = `
-- 007_nav_restructure_phase1.sql
-- Navigation Restructure Phase 1: Portfolio & Funding Source Tables

-- ============================================
-- STEP 1: Create portfolios table
-- ============================================

CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;
CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: Create funding_sources table
-- ============================================

DO $$ BEGIN
    CREATE TYPE funding_type AS ENUM ('loan', 'grant', 'equity', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS funding_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type funding_type NOT NULL DEFAULT 'loan',
  commitment_amount DECIMAL(12,2),
  description TEXT,
  lender_name VARCHAR(200),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_funding_sources_updated_at ON funding_sources;
CREATE TRIGGER update_funding_sources_updated_at
    BEFORE UPDATE ON funding_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 3: Create backlog_items table
-- ============================================

DO $$ BEGIN
    CREATE TYPE backlog_scope AS ENUM ('portfolio', 'property');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE backlog_status AS ENUM ('active', 'converted', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS backlog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  scope_level backlog_scope NOT NULL,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  property_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  estimated_cost DECIMAL(12,2),
  status backlog_status DEFAULT 'active',
  converted_to_project_id BIGINT REFERENCES projects(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT backlog_property_required CHECK (
    (scope_level = 'portfolio' AND property_id IS NULL) OR
    (scope_level = 'property' AND property_id IS NOT NULL)
  )
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_backlog_items_updated_at ON backlog_items;
CREATE TRIGGER update_backlog_items_updated_at
    BEFORE UPDATE ON backlog_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 4: Seed portfolios from existing data
-- ============================================

INSERT INTO portfolios (name, code, description)
SELECT DISTINCT 
  portfolio_name,
  LOWER(REGEXP_REPLACE(portfolio_name, '[^a-zA-Z0-9]+', '-', 'g')),
  'Migrated from projects.portfolio_name'
FROM projects
WHERE portfolio_name IS NOT NULL
  AND portfolio_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM portfolios WHERE name = projects.portfolio_name
  )
ORDER BY portfolio_name;

-- ============================================
-- STEP 5: Add portfolio_id to projects
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'portfolio_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN portfolio_id UUID REFERENCES portfolios(id);
  END IF;
END $$;

UPDATE projects p
SET portfolio_id = pf.id
FROM portfolios pf
WHERE p.portfolio_name = pf.name
  AND p.portfolio_id IS NULL;

-- ============================================
-- STEP 6: Add funding_source_id to construction_draws
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'construction_draws' AND column_name = 'funding_source_id'
  ) THEN
    ALTER TABLE construction_draws ADD COLUMN funding_source_id UUID REFERENCES funding_sources(id);
  END IF;
END $$;

-- ============================================
-- STEP 7: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_portfolio_id ON projects(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_portfolio_id ON funding_sources(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_construction_draws_funding_source_id ON construction_draws(funding_source_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_portfolio_id ON backlog_items(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_property_id ON backlog_items(property_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(status);

-- ============================================
-- STEP 8: Create views for portfolio metrics
-- ============================================

CREATE OR REPLACE VIEW portfolio_summary AS
SELECT
  p.id,
  p.name,
  p.code,
  COUNT(DISTINCT pr.id) as project_count,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.status = 'active') as active_project_count,
  COUNT(DISTINCT fs.id) as funding_source_count,
  COALESCE(SUM(fs.commitment_amount), 0) as total_commitment,
  COALESCE(SUM(pr.budget), 0) as total_budget,
  COALESCE(SUM(pr.spent), 0) as total_spent
FROM portfolios p
LEFT JOIN projects pr ON pr.portfolio_id = p.id
LEFT JOIN funding_sources fs ON fs.portfolio_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.code;

-- ============================================
-- VALIDATION
-- ============================================

DO $$
DECLARE
  portfolio_count INT;
  migrated_projects INT;
  unmigrated_projects INT;
BEGIN
  SELECT COUNT(*) INTO portfolio_count FROM portfolios;
  SELECT COUNT(*) INTO migrated_projects FROM projects WHERE portfolio_id IS NOT NULL;
  SELECT COUNT(*) INTO unmigrated_projects FROM projects WHERE portfolio_id IS NULL AND portfolio_name IS NOT NULL;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration Phase 1 Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Portfolios created: %', portfolio_count;
  RAISE NOTICE 'Projects migrated: %', migrated_projects;
  RAISE NOTICE 'Projects unmigrated: %', unmigrated_projects;
  RAISE NOTICE '==============================================';
END $$;
`;

async function runMigration() {
  console.log('🚀 Starting Migration 007...\n');
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    await client.query(migrationSQL);
    console.log('✅ Migration 007 completed successfully!\n');
    
    const portfoliosResult = await client.query('SELECT * FROM portfolios ORDER BY name');
    console.log(`📊 Portfolios created: ${portfoliosResult.rows.length}`);
    portfoliosResult.rows.forEach(p => console.log(`   - ${p.name} (${p.code})`));
    
    const projectsResult = await client.query('SELECT COUNT(*) as count FROM projects WHERE portfolio_id IS NOT NULL');
    console.log(`\n🏗️  Projects migrated: ${projectsResult.rows[0].count}`);
    
    console.log('\n✅ Migration complete!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('Details:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
