-- Create schedule_defaults table for auto-scheduling
CREATE TABLE IF NOT EXISTS schedule_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_category TEXT NOT NULL UNIQUE,
    default_duration_days INTEGER NOT NULL DEFAULT 3,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default values from common construction categories
INSERT INTO schedule_defaults (budget_category, default_duration_days, display_order)
VALUES 
    ('Electrical', 5, 10),
    ('Plumbing & Heating', 5, 20),
    ('Flooring', 3, 30),
    ('Trim', 3, 40),
    ('Kitchen Cabinets', 2, 50),
    ('Kitchen Countertops', 1, 51),
    ('Bathroom Tile', 3, 60),
    ('Bathroom Fixtures', 1, 61),
    ('Interior Doors', 1, 70),
    ('Lighting - Interior', 1, 80)
ON CONFLICT (budget_category) DO NOTHING;

-- Enable RLS but allow all access for now (since it's settings)
ALTER TABLE schedule_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON schedule_defaults
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

