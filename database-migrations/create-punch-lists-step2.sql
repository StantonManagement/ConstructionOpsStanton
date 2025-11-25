-- Step 2: Create Indexes
-- Run this after Step 1 completes

CREATE INDEX IF NOT EXISTS idx_punch_list_items_project_id ON punch_list_items(project_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_items_contractor_id ON punch_list_items(contractor_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_items_status ON punch_list_items(status);
CREATE INDEX IF NOT EXISTS idx_punch_list_items_project_contractor ON punch_list_items(project_id, contractor_id);
CREATE INDEX IF NOT EXISTS idx_punch_list_photos_item_id ON punch_list_photos(punch_list_item_id);
CREATE INDEX IF NOT EXISTS idx_contractor_portal_tokens_token ON contractor_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_contractor_portal_tokens_contractor_id ON contractor_portal_tokens(contractor_id);

