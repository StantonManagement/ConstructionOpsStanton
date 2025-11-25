-- Make contractor_id optional in punch_list_items table
-- This allows creating punch list items without assigning a contractor

ALTER TABLE punch_list_items 
  ALTER COLUMN contractor_id DROP NOT NULL;

-- Update the status to allow 'unassigned' status for items without contractors
-- (Optional - you can also just keep status as 'assigned' even without contractor)

COMMENT ON COLUMN punch_list_items.contractor_id IS 'Contractor assigned to this punch list item. Can be NULL if not yet assigned.';

