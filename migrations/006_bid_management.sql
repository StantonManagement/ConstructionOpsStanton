-- Bid Management System Database Schema
-- Migration 006: Create bid management tables

-- ============================================================================
-- BID SCOPE TEMPLATES
-- Stores reusable scope checklists by trade type
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_scope_templates (
  id SERIAL PRIMARY KEY,
  trade VARCHAR(100) NOT NULL, -- e.g., 'Electrical', 'Plumbing', 'HVAC'
  scope_type VARCHAR(100) NOT NULL, -- e.g., 'Rough-in', 'Finish', 'Full Install'
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scope items as JSONB array
  -- Example: [{"item": "Rough wiring", "typically_included": true}, {"item": "Permits", "typically_included": false}]
  scope_items JSONB DEFAULT '[]'::jsonb,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bid_scope_templates_trade ON bid_scope_templates(trade);
CREATE INDEX idx_bid_scope_templates_active ON bid_scope_templates(is_active);

-- ============================================================================
-- BID ROUNDS
-- Groups multiple bids for competitive bidding on a specific job
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_rounds (
  id SERIAL PRIMARY KEY,

  -- Project context
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,

  -- Round details
  name VARCHAR(255) NOT NULL, -- e.g., "Electrical Rough-in - Hartford 1"
  trade VARCHAR(100) NOT NULL,
  scope_type VARCHAR(100),
  description TEXT,

  -- Scope definition (from template or custom)
  scope_template_id INTEGER REFERENCES bid_scope_templates(id) ON DELETE SET NULL,
  scope_items JSONB DEFAULT '[]'::jsonb, -- Actual scope items for this round

  -- Timeline
  deadline_date DATE,
  awarded_date DATE,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, closed, awarded, cancelled

  -- Winner tracking
  winning_bid_id INTEGER, -- Will reference bids(id) after creating bids table

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bid_rounds_project ON bid_rounds(project_id);
CREATE INDEX idx_bid_rounds_portfolio ON bid_rounds(portfolio_id);
CREATE INDEX idx_bid_rounds_status ON bid_rounds(status);
CREATE INDEX idx_bid_rounds_trade ON bid_rounds(trade);

-- ============================================================================
-- BIDS
-- Individual bid submissions (can be standalone or part of a bid round)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,

  -- Context
  bid_round_id INTEGER REFERENCES bid_rounds(id) ON DELETE CASCADE, -- NULL if standalone bid
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,

  -- Bid details
  amount DECIMAL(12, 2) NOT NULL,
  submitted_at TIMESTAMPTZ,

  -- Scope coverage (which items from bid round scope are included)
  -- Example: [{"item": "Rough wiring", "included": true}, {"item": "Permits", "included": false, "add_cost": 500}]
  scope_coverage JSONB DEFAULT '[]'::jsonb,

  -- Notes and descriptions
  notes TEXT,
  contractor_notes TEXT, -- Notes from contractor when submitting
  pm_notes TEXT, -- Project manager's notes about this bid

  -- Source tracking
  source_type VARCHAR(50) DEFAULT 'manual', -- manual, photo, pdf, voice, sms
  source_url TEXT, -- URL to uploaded photo/PDF in storage

  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, won, lost, declined, withdrawn
  decline_reason VARCHAR(100), -- If declined: too_busy, timeline, not_my_work, too_small, too_large, too_far, other
  decline_notes TEXT,

  -- Actual outcome tracking (after project completion)
  actual_cost DECIMAL(12, 2), -- What it actually cost after change orders
  change_orders_total DECIMAL(12, 2) DEFAULT 0,
  variance_percent DECIMAL(5, 2), -- (actual - bid) / bid * 100

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bids_round ON bids(bid_round_id);
CREATE INDEX idx_bids_contractor ON bids(contractor_id);
CREATE INDEX idx_bids_project ON bids(project_id);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_submitted ON bids(submitted_at);

-- Add foreign key constraint for winning_bid_id now that bids table exists
ALTER TABLE bid_rounds
  ADD CONSTRAINT fk_bid_rounds_winning_bid
  FOREIGN KEY (winning_bid_id)
  REFERENCES bids(id)
  ON DELETE SET NULL;

-- ============================================================================
-- BID SCOPE ITEMS
-- Individual scope items that can be checked off for scope coverage
-- Denormalized for easier querying (could be derived from JSONB but this is cleaner)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_scope_items (
  id SERIAL PRIMARY KEY,
  bid_id INTEGER REFERENCES bids(id) ON DELETE CASCADE NOT NULL,

  item_name VARCHAR(255) NOT NULL,
  included BOOLEAN DEFAULT false,
  add_cost DECIMAL(12, 2), -- Additional cost if not included in base bid
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bid_scope_items_bid ON bid_scope_items(bid_id);

-- ============================================================================
-- BID CLARIFICATIONS
-- Track clarification requests and responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS bid_clarifications (
  id SERIAL PRIMARY KEY,
  bid_id INTEGER REFERENCES bids(id) ON DELETE CASCADE NOT NULL,

  question TEXT NOT NULL,
  response TEXT,

  -- Can be multiple items being clarified
  scope_items JSONB DEFAULT '[]'::jsonb,

  asked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  asked_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bid_clarifications_bid ON bid_clarifications(bid_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bid_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_bid_scope_templates_updated_at BEFORE UPDATE ON bid_scope_templates
  FOR EACH ROW EXECUTE FUNCTION update_bid_updated_at();

CREATE TRIGGER update_bid_rounds_updated_at BEFORE UPDATE ON bid_rounds
  FOR EACH ROW EXECUTE FUNCTION update_bid_updated_at();

CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids
  FOR EACH ROW EXECUTE FUNCTION update_bid_updated_at();

CREATE TRIGGER update_bid_scope_items_updated_at BEFORE UPDATE ON bid_scope_items
  FOR EACH ROW EXECUTE FUNCTION update_bid_updated_at();

CREATE TRIGGER update_bid_clarifications_updated_at BEFORE UPDATE ON bid_clarifications
  FOR EACH ROW EXECUTE FUNCTION update_bid_updated_at();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE bid_scope_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_scope_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_clarifications ENABLE ROW LEVEL SECURITY;

-- Basic policies (adjust based on your auth setup)
CREATE POLICY "Enable read access for authenticated users" ON bid_scope_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable all access for authenticated users" ON bid_rounds
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all access for authenticated users" ON bids
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all access for authenticated users" ON bid_scope_items
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all access for authenticated users" ON bid_clarifications
  FOR ALL TO authenticated USING (true);

-- ============================================================================
-- SEED DATA: Common scope templates
-- ============================================================================

INSERT INTO bid_scope_templates (trade, scope_type, name, description, scope_items) VALUES
('Electrical', 'Rough-in', 'Standard Electrical Rough-in', 'Typical electrical rough-in work for residential renovation',
 '[
   {"item": "Rough wiring", "typically_included": true},
   {"item": "Panel installation", "typically_included": true},
   {"item": "Junction boxes", "typically_included": true},
   {"item": "Permits & inspection fees", "typically_included": false},
   {"item": "Fire alarm rough-in", "typically_included": false},
   {"item": "Recessed lighting rough-in", "typically_included": true},
   {"item": "GFCI outlets", "typically_included": true}
 ]'::jsonb),

('Plumbing', 'Rough-in', 'Standard Plumbing Rough-in', 'Typical plumbing rough-in for residential renovation',
 '[
   {"item": "Waste and vent rough-in", "typically_included": true},
   {"item": "Water supply rough-in", "typically_included": true},
   {"item": "Gas line rough-in", "typically_included": false},
   {"item": "Permits & inspection fees", "typically_included": false},
   {"item": "Fixture installation", "typically_included": false}
 ]'::jsonb),

('HVAC', 'Full Install', 'Complete HVAC System', 'Full HVAC installation including equipment',
 '[
   {"item": "Equipment (furnace/AC)", "typically_included": true},
   {"item": "Ductwork", "typically_included": true},
   {"item": "Vents and registers", "typically_included": true},
   {"item": "Thermostat", "typically_included": true},
   {"item": "Permits & inspection fees", "typically_included": false},
   {"item": "Asbestos abatement", "typically_included": false}
 ]'::jsonb),

('Drywall', 'Finish', 'Drywall Finish', 'Drywall hanging, taping, and finishing',
 '[
   {"item": "Drywall hanging", "typically_included": true},
   {"item": "Taping and mudding", "typically_included": true},
   {"item": "Sanding", "typically_included": true},
   {"item": "Primer coat", "typically_included": false},
   {"item": "Corner bead installation", "typically_included": true},
   {"item": "Cleanup and disposal", "typically_included": true}
 ]'::jsonb);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE bid_scope_templates IS 'Reusable scope checklists by trade type';
COMMENT ON TABLE bid_rounds IS 'Competitive bidding rounds for specific jobs';
COMMENT ON TABLE bids IS 'Individual bid submissions (standalone or part of round)';
COMMENT ON TABLE bid_scope_items IS 'Individual scope items for bid coverage tracking';
COMMENT ON TABLE bid_clarifications IS 'Clarification requests and responses for bids';

COMMENT ON COLUMN bids.source_type IS 'How bid was captured: manual, photo, pdf, voice, sms';
COMMENT ON COLUMN bids.variance_percent IS 'Actual cost variance: (actual - bid) / bid * 100';
COMMENT ON COLUMN bid_rounds.scope_items IS 'JSONB array of scope items for this specific round';
