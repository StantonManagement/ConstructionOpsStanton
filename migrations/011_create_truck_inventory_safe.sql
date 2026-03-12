-- Truck Inventory Management System (Safe version - checks for existing objects)
-- This migration creates tables for tracking trucks, inventory items, locations, and transactions

-- ============================================================================
-- TRUCKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trucks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE, -- e.g., "Truck #1", "Van A"
  license_plate TEXT,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by identifier
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_trucks_identifier ON trucks(identifier);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks(status);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- INVENTORY ITEMS TABLE
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE inventory_item_category AS ENUM (
    'power_tool',
    'hand_tool',
    'safety_equipment',
    'material',
    'consumable',
    'equipment',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category inventory_item_category NOT NULL,
  sku TEXT UNIQUE,
  is_consumable BOOLEAN NOT NULL DEFAULT FALSE,
  unit TEXT, -- e.g., "each", "box", "roll", "lbs"
  reorder_threshold INTEGER, -- alert when total quantity falls below this
  cost_per_unit NUMERIC(10, 2),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for search and filtering
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- INVENTORY LOCATIONS TABLE
-- Tracks current location and quantity of each item
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE location_type AS ENUM ('truck', 'project_site', 'warehouse', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS inventory_locations (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_type location_type NOT NULL,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  location_name TEXT, -- For warehouse or other locations
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  UNIQUE (item_id, location_type, truck_id, project_id, location_name)
);

-- Indexes for efficient queries
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_item ON inventory_locations(item_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_truck ON inventory_locations(truck_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_project ON inventory_locations(project_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_type ON inventory_locations(location_type);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_locations_assigned_user ON inventory_locations(assigned_to_user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- INVENTORY TRANSACTIONS TABLE
-- Audit log of all check-ins, check-outs, and transfers
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'check_in',
    'check_out',
    'transfer',
    'adjustment',
    'initial_stock'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  quantity INTEGER NOT NULL,

  -- From location
  from_location_type location_type,
  from_truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
  from_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  from_location_name TEXT,

  -- To location
  to_location_type location_type,
  to_truck_id INTEGER REFERENCES trucks(id) ON DELETE SET NULL,
  to_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  to_location_name TEXT,

  -- Metadata
  performed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for reporting and history
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date DESC);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by ON inventory_transactions(performed_by_user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_from_truck ON inventory_transactions(from_truck_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_to_truck ON inventory_transactions(to_truck_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update inventory_locations after a transaction
CREATE OR REPLACE FUNCTION update_inventory_location_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease quantity at "from" location
  IF NEW.from_location_type IS NOT NULL THEN
    UPDATE inventory_locations
    SET
      quantity = quantity - NEW.quantity,
      last_updated = NOW()
    WHERE
      item_id = NEW.item_id
      AND location_type = NEW.from_location_type
      AND (truck_id = NEW.from_truck_id OR (truck_id IS NULL AND NEW.from_truck_id IS NULL))
      AND (project_id = NEW.from_project_id OR (project_id IS NULL AND NEW.from_project_id IS NULL))
      AND (location_name = NEW.from_location_name OR (location_name IS NULL AND NEW.from_location_name IS NULL));

    -- Delete location record if quantity reaches 0
    DELETE FROM inventory_locations
    WHERE
      item_id = NEW.item_id
      AND quantity = 0;
  END IF;

  -- Increase quantity at "to" location
  IF NEW.to_location_type IS NOT NULL THEN
    INSERT INTO inventory_locations (
      item_id,
      location_type,
      truck_id,
      project_id,
      location_name,
      quantity,
      assigned_to_user_id,
      last_updated
    ) VALUES (
      NEW.item_id,
      NEW.to_location_type,
      NEW.to_truck_id,
      NEW.to_project_id,
      NEW.to_location_name,
      NEW.quantity,
      NEW.assigned_to_user_id,
      NOW()
    )
    ON CONFLICT (item_id, location_type, truck_id, project_id, location_name)
    DO UPDATE SET
      quantity = inventory_locations.quantity + NEW.quantity,
      assigned_to_user_id = COALESCE(EXCLUDED.assigned_to_user_id, inventory_locations.assigned_to_user_id),
      last_updated = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update locations when transactions are created
DROP TRIGGER IF EXISTS trigger_update_inventory_location ON inventory_transactions;
CREATE TRIGGER trigger_update_inventory_location
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_location_after_transaction();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_truck_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trucks_updated_at ON trucks;
CREATE TRIGGER trigger_trucks_updated_at
BEFORE UPDATE ON trucks
FOR EACH ROW
EXECUTE FUNCTION update_truck_updated_at();

DROP TRIGGER IF EXISTS trigger_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trigger_inventory_items_updated_at
BEFORE UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_truck_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view trucks" ON trucks;
DROP POLICY IF EXISTS "Authenticated users can modify trucks" ON trucks;
DROP POLICY IF EXISTS "Authenticated users can view inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated users can modify inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated users can view inventory locations" ON inventory_locations;
DROP POLICY IF EXISTS "Authenticated users can modify inventory locations" ON inventory_locations;
DROP POLICY IF EXISTS "Authenticated users can view inventory transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Authenticated users can create inventory transactions" ON inventory_transactions;

-- Policy: Authenticated users can read all trucks
CREATE POLICY "Authenticated users can view trucks"
  ON trucks FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert/update/delete trucks
CREATE POLICY "Authenticated users can modify trucks"
  ON trucks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read all inventory items
CREATE POLICY "Authenticated users can view inventory items"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert/update/delete inventory items
CREATE POLICY "Authenticated users can modify inventory items"
  ON inventory_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read all inventory locations
CREATE POLICY "Authenticated users can view inventory locations"
  ON inventory_locations FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert/update/delete inventory locations
CREATE POLICY "Authenticated users can modify inventory locations"
  ON inventory_locations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read all inventory transactions
CREATE POLICY "Authenticated users can view inventory transactions"
  ON inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert inventory transactions
CREATE POLICY "Authenticated users can create inventory transactions"
  ON inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- Only insert if tables are empty
-- ============================================================================

-- Insert sample trucks (only if none exist)
INSERT INTO trucks (name, identifier, license_plate, make, model, year, status)
SELECT * FROM (VALUES
  ('Main Work Truck', 'Truck #1', 'ABC-1234', 'Ford', 'F-150', 2020, 'active'),
  ('Cargo Van', 'Van A', 'XYZ-5678', 'Chevrolet', 'Express', 2019, 'active'),
  ('Tool Truck', 'Truck #2', 'DEF-9012', 'Ram', '1500', 2021, 'active')
) AS t(name, identifier, license_plate, make, model, year, status)
WHERE NOT EXISTS (SELECT 1 FROM trucks LIMIT 1);

-- Insert sample inventory items (only if none exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM inventory_items LIMIT 1) THEN
    INSERT INTO inventory_items (name, description, category, sku, is_consumable, unit, reorder_threshold) VALUES
      ('Circular Saw', 'DeWalt 7-1/4" Circular Saw', 'power_tool'::inventory_item_category, 'DW-CS-001', false, 'each', null),
      ('Hammer', '16oz Claw Hammer', 'hand_tool'::inventory_item_category, 'HT-HM-001', false, 'each', null),
      ('Safety Glasses', 'Clear Safety Glasses', 'safety_equipment'::inventory_item_category, 'SE-SG-001', true, 'each', 20),
      ('2x4 Lumber', '8ft 2x4 Pressure Treated', 'material'::inventory_item_category, 'MT-24-008', true, 'each', 50),
      ('Drywall Screws', '1-5/8" Coarse Thread Box', 'consumable'::inventory_item_category, 'CS-DS-158', true, 'box', 10),
      ('Paint Roller', '9" Paint Roller Frame', 'hand_tool'::inventory_item_category, 'HT-PR-009', false, 'each', null),
      ('Extension Cord', '50ft 12-Gauge Extension Cord', 'equipment'::inventory_item_category, 'EQ-EC-050', false, 'each', null),
      ('Drill Bits', 'Titanium Drill Bit Set', 'hand_tool'::inventory_item_category, 'HT-DB-SET', false, 'set', 5);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE trucks IS 'Company vehicles used for transporting tools and materials';
COMMENT ON TABLE inventory_items IS 'Catalog of all tools, equipment, and materials tracked in inventory';
COMMENT ON TABLE inventory_locations IS 'Current location and quantity of each inventory item';
COMMENT ON TABLE inventory_transactions IS 'Audit log of all inventory movements (check-in/out, transfers)';
