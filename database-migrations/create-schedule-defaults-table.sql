-- Create schedule_defaults table
-- This table stores default durations and display order for budget categories in schedules

CREATE TABLE IF NOT EXISTS schedule_defaults (
  id SERIAL PRIMARY KEY,
  budget_category VARCHAR(255) NOT NULL UNIQUE,
  default_duration_days INTEGER NOT NULL DEFAULT 3,
  display_order INTEGER NOT NULL DEFAULT 999,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create index on budget_category for fast lookups
CREATE INDEX IF NOT EXISTS idx_schedule_defaults_budget_category 
ON schedule_defaults(budget_category);

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_schedule_defaults_display_order 
ON schedule_defaults(display_order);

-- Insert default values for common construction budget categories
INSERT INTO schedule_defaults (budget_category, default_duration_days, display_order) VALUES
  ('Site Work', 5, 10),
  ('Demolition / Cleanup', 3, 20),
  ('Foundation', 7, 30),
  ('Framing', 14, 40),
  ('Roofing', 5, 50),
  ('Windows', 3, 60),
  ('Exterior Doors', 2, 70),
  ('Siding', 7, 80),
  ('Plumbing - Rough', 5, 90),
  ('HVAC - Rough', 5, 100),
  ('Electrical - Rough', 5, 110),
  ('Insulation', 3, 120),
  ('Drywall', 7, 130),
  ('Interior Doors', 2, 140),
  ('Trim / Millwork', 5, 150),
  ('Cabinets', 3, 160),
  ('Countertops', 2, 170),
  ('Flooring', 5, 180),
  ('Tile', 4, 190),
  ('Painting', 7, 200),
  ('Plumbing - Finish', 3, 210),
  ('HVAC - Finish', 2, 220),
  ('Electrical - Finish', 3, 230),
  ('Appliances', 1, 240),
  ('Landscaping', 5, 250),
  ('Final Cleanup', 2, 260),
  ('Inspection', 1, 270),
  ('Punchlist', 3, 280)
ON CONFLICT (budget_category) DO NOTHING;

-- Add comment
COMMENT ON TABLE schedule_defaults IS 'Default durations and display order for budget categories in auto-scheduling';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_schedule_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schedule_defaults_updated_at
BEFORE UPDATE ON schedule_defaults
FOR EACH ROW
EXECUTE FUNCTION update_schedule_defaults_updated_at();
