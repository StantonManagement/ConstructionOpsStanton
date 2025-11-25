-- Fix user tracking fields in punch_list_items
-- assigned_by and verified_by should be UUID (to match Supabase auth.users.id)
-- not INTEGER

ALTER TABLE punch_list_items 
  ALTER COLUMN assigned_by TYPE UUID USING assigned_by::text::uuid,
  ALTER COLUMN verified_by TYPE UUID USING verified_by::text::uuid;

-- Add proper foreign key constraints to users table (optional but recommended)
-- Note: Supabase auth.users is in the 'auth' schema, not 'public'
-- So we'll just add a comment explaining the relationship

COMMENT ON COLUMN punch_list_items.assigned_by IS 'UUID of the user who assigned this punch list item (references auth.users.id)';
COMMENT ON COLUMN punch_list_items.verified_by IS 'UUID of the user who verified this punch list item (references auth.users.id)';

