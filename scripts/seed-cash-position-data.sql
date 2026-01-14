-- Seed portfolios and funding sources for Cash Position page

-- Insert portfolios
INSERT INTO portfolios (name, code, description, is_active) VALUES
('North End', 'NORTHEND', 'North End Portfolio', true),
('South End', 'SOUTHEND', 'South End Portfolio', true),
('Park Portfolio', 'PARK', 'Park Portfolio', true),
('Hartford', 'HARTFORD', 'Hartford Portfolio', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample funding sources
INSERT INTO funding_sources (portfolio_id, name, type, commitment_amount, drawn_amount, lender_name, interest_rate, maturity_date)
SELECT 
  p.id,
  'Construction Loan - ' || p.name,
  'loan',
  5000000.00,
  2500000.00,
  'First National Bank',
  5.5,
  '2026-12-31'
FROM portfolios p
WHERE p.code IN ('NORTHEND', 'SOUTHEND', 'PARK', 'HARTFORD')
ON CONFLICT DO NOTHING;
