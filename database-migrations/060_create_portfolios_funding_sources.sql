-- PRP-001: Create portfolios and funding_sources tables
-- Migration 060: Portfolios and Funding Sources

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_code ON portfolios(code);
CREATE INDEX IF NOT EXISTS idx_portfolios_active ON portfolios(is_active);

-- Create funding_sources table
CREATE TABLE IF NOT EXISTS funding_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    lender_name VARCHAR(100),
    commitment_amount DECIMAL(12,2) NOT NULL,
    drawn_amount DECIMAL(12,2) DEFAULT 0,
    interest_rate DECIMAL(5,3),
    maturity_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funding_sources ADD CONSTRAINT funding_sources_type_check 
    CHECK (type IN ('construction_loan', 'grant', 'equity', 'line_of_credit', 'other'));

CREATE INDEX IF NOT EXISTS idx_funding_sources_portfolio ON funding_sources(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_type ON funding_sources(type);
CREATE INDEX IF NOT EXISTS idx_funding_sources_active ON funding_sources(is_active);

-- Add portfolio_id to properties (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'portfolio_id'
    ) THEN
        ALTER TABLE properties ADD COLUMN portfolio_id UUID REFERENCES portfolios(id);
        CREATE INDEX idx_properties_portfolio ON properties(portfolio_id);
    END IF;
END $$;

-- Seed initial portfolios
INSERT INTO portfolios (name, code, description) VALUES
('North End', 'NORTHEND', 'North End Portfolio'),
('South End', 'SOUTHEND', 'South End Portfolio'),
('Park Portfolio', 'PARK', 'Park Portfolio'),
('Hartford', 'HARTFORD', 'Hartford Portfolio')
ON CONFLICT (code) DO NOTHING;

-- Create RPC function to increment drawn amount
CREATE OR REPLACE FUNCTION increment_drawn_amount(
  p_funding_source_id UUID,
  p_amount DECIMAL
) RETURNS void AS $$
BEGIN
  UPDATE funding_sources 
  SET drawn_amount = drawn_amount + p_amount,
      updated_at = NOW()
  WHERE id = p_funding_source_id;
END;
$$ LANGUAGE plpgsql;
