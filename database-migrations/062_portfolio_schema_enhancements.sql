-- Add missing columns to portfolios and funding_sources
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS owner_entity_id INTEGER REFERENCES owner_entities(id);
ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS loan_number VARCHAR(50);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_funding_sources_portfolio ON funding_sources(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_type ON funding_sources(type);
CREATE INDEX IF NOT EXISTS idx_funding_sources_active ON funding_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_portfolio ON projects(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_active ON portfolios(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;
CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_funding_sources_updated_at ON funding_sources;
CREATE TRIGGER update_funding_sources_updated_at
    BEFORE UPDATE ON funding_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
