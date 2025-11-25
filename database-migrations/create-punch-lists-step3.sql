-- Step 3: Add Triggers and RLS
-- Run this after Step 2 completes

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_punch_list_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_punch_list_items_updated_at ON punch_list_items;
CREATE TRIGGER trigger_punch_list_items_updated_at
  BEFORE UPDATE ON punch_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_punch_list_items_updated_at();

-- Enable RLS
ALTER TABLE punch_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_list_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can view punch list items" ON punch_list_items;
CREATE POLICY "Users can view punch list items"
  ON punch_list_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create punch list items" ON punch_list_items;
CREATE POLICY "Users can create punch list items"
  ON punch_list_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update punch list items" ON punch_list_items;
CREATE POLICY "Users can update punch list items"
  ON punch_list_items FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete punch list items" ON punch_list_items;
CREATE POLICY "Users can delete punch list items"
  ON punch_list_items FOR DELETE
  TO authenticated
  USING (true);

-- Photos policies
DROP POLICY IF EXISTS "Users can view punch list photos" ON punch_list_photos;
CREATE POLICY "Users can view punch list photos"
  ON punch_list_photos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create punch list photos" ON punch_list_photos;
CREATE POLICY "Users can create punch list photos"
  ON punch_list_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete punch list photos" ON punch_list_photos;
CREATE POLICY "Users can delete punch list photos"
  ON punch_list_photos FOR DELETE
  TO authenticated
  USING (true);

-- Token policies
DROP POLICY IF EXISTS "Service role can manage tokens" ON contractor_portal_tokens;
CREATE POLICY "Service role can manage tokens"
  ON contractor_portal_tokens FOR ALL
  TO authenticated
  USING (true);

