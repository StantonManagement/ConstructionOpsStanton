-- Punch List System Database Migration
-- Creates tables for managing punch list items and photos

-- Create punch_list_items table
CREATE TABLE IF NOT EXISTS punch_list_items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE,
  location_area VARCHAR(255),
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'complete', 'verified')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  contractor_notes TEXT,
  gc_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create punch_list_photos table
CREATE TABLE IF NOT EXISTS punch_list_photos (
  id SERIAL PRIMARY KEY,
  punch_list_item_id INTEGER NOT NULL REFERENCES punch_list_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_by VARCHAR(20) CHECK (uploaded_by IN ('contractor', 'gc')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create contractor_portal_tokens table for secure contractor access
CREATE TABLE IF NOT EXISTS contractor_portal_tokens (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_punch_list_items_project_id ON punch_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_items_contractor_id ON punch_list_items(contractor_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_items_status ON punch_list_items(status);
CREATE INDEX IF NOT EXISTS idx_punch_list_items_project_contractor ON punch_list_items(project_id, contractor_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_photos_item_id ON punch_list_photos(punch_list_item_id);
CREATE INDEX IF NOT EXISTS idx_contractor_portal_tokens_token ON contractor_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_contractor_portal_tokens_contractor_id ON contractor_portal_tokens(contractor_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_punch_list_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_punch_list_items_updated_at
  BEFORE UPDATE ON punch_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_punch_list_items_updated_at();

-- Enable Row Level Security
ALTER TABLE punch_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_list_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_portal_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for punch_list_items
-- Authenticated users can view all punch list items
CREATE POLICY "Users can view punch list items"
  ON punch_list_items FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert punch list items
CREATE POLICY "Users can create punch list items"
  ON punch_list_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update punch list items
CREATE POLICY "Users can update punch list items"
  ON punch_list_items FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete punch list items
CREATE POLICY "Users can delete punch list items"
  ON punch_list_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for punch_list_photos
-- Authenticated users can view all photos
CREATE POLICY "Users can view punch list photos"
  ON punch_list_photos FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert photos
CREATE POLICY "Users can create punch list photos"
  ON punch_list_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can delete photos
CREATE POLICY "Users can delete punch list photos"
  ON punch_list_photos FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for contractor_portal_tokens
-- Service role only for tokens (managed by API)
CREATE POLICY "Service role can manage tokens"
  ON contractor_portal_tokens FOR ALL
  TO authenticated
  USING (true);

COMMENT ON TABLE punch_list_items IS 'Stores punch list items for construction project closeout';
COMMENT ON TABLE punch_list_photos IS 'Stores photos associated with punch list items';
COMMENT ON TABLE contractor_portal_tokens IS 'Stores secure tokens for contractor portal access';

