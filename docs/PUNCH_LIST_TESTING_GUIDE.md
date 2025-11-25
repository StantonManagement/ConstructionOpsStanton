# Punch List System - Testing Guide

## Overview
This guide provides step-by-step instructions for testing the complete punch list workflow from creation to contractor completion and GC verification.

## Prerequisites

### 1. Database Setup
Run the database migration:
```sql
-- Execute the migration file
\i database-migrations/create-punch-lists.sql
```

Verify tables are created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('punch_list_items', 'punch_list_photos', 'contractor_portal_tokens');
```

### 2. Environment Variables
Ensure these are set in your `.env` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret_for_tokens
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Test Data
You need:
- At least one active project
- At least one contractor assigned to that project (via contracts table)
- The contractor must have a valid phone number for SMS testing

## Testing Workflow

### Phase 1: GC Creates Punch List

#### Test 1.1: Navigate to Punch Lists Tab
1. Login as an Admin or PM user
2. Navigate to Projects tab
3. Click on a project to open ProjectDetailView
4. Click on the "Punch Lists" tab
5. **Expected**: Tab displays with empty state and "Create Punch List" button

#### Test 1.2: Open Create Punch List Modal
1. Click "Create Punch List" button
2. **Expected**: Modal opens with Step 1: "Add Items"
3. **Expected**: One empty item form is displayed
4. **Expected**: Progress indicator shows Step 1 of 3

#### Test 1.3: Add Multiple Punch List Items
1. Fill in first item:
   - Description: "Fix drywall in hallway"
   - Priority: High
   - Location: "2nd Floor Hallway"
   - Due Date: Tomorrow's date
   - GC Notes: "Near elevator"
2. Click "Add Item" button
3. Fill in second item:
   - Description: "Touch up paint in lobby"
   - Priority: Medium
   - Location: "Main Lobby"
4. Add third item:
   - Description: "Replace damaged ceiling tile"
   - Priority: Low
   - Location: "Room 201"
5. **Expected**: All three items displayed with color-coded priority borders

#### Test 1.4: Validate Form Requirements
1. Clear all item descriptions
2. Click "Next" button
3. **Expected**: Error message: "Please add at least one punch list item with a description"
4. Fill in at least one description
5. Click "Next"
6. **Expected**: Advances to Step 2

#### Test 1.5: Select Contractor
1. **Expected**: List of contractors for the project is displayed
2. **Expected**: Each contractor shows name, trade, and phone
3. Click on a contractor to select them
4. **Expected**: Selected contractor highlighted with blue border and checkmark
5. Click "Next"
6. **Expected**: Advances to Step 3

#### Test 1.6: Review and Send
1. **Expected**: Review screen shows:
   - Selected contractor name and trade
   - All punch list items with their details
   - SMS notification message
2. Verify all information is correct
3. Click "Send Punch List" button
4. **Expected**: Button shows "Sending..." with loading spinner
5. **Expected**: Modal closes
6. **Expected**: Success message appears
7. **Expected**: Punch list items appear in the table

### Phase 2: SMS Notification

#### Test 2.1: Verify SMS Sent
1. Check the contractor's phone
2. **Expected**: SMS received with text like:
   ```
   New punch list for [Project Name]. You have 3 items assigned. 
   View details: http://localhost:3000/contractor-portal/[token]
   ```
3. **Expected**: Link is a valid URL

#### Test 2.2: Verify Token Created
Query database:
```sql
SELECT * FROM contractor_portal_tokens 
WHERE contractor_id = [contractor_id]
ORDER BY created_at DESC LIMIT 1;
```
**Expected**: Token exists with expires_at 30 days in future

### Phase 3: Contractor Portal Access

#### Test 3.1: Access Portal via Link
1. Click the link from the SMS (or copy/paste URL)
2. **Expected**: Contractor portal page loads
3. **Expected**: Header shows: "Punch Lists" and contractor name/trade
4. **Expected**: Stats cards show counts (3 assigned, 0 in progress, etc.)
5. **Expected**: All 3 punch list items displayed

#### Test 3.2: View Item Details
1. Click on a punch list item to expand it
2. **Expected**: Item expands showing:
   - GC notes (if any)
   - Timeline with "Assigned" timestamp
   - Photo count
3. Click again to collapse
4. **Expected**: Item collapses

#### Test 3.3: Filter by Status
1. Change status filter dropdown to "In Progress"
2. **Expected**: No items shown (all are "assigned")
3. Change back to "All Statuses"
4. **Expected**: All items shown again

### Phase 4: Contractor Updates Items

#### Test 4.1: Start Working on Item
1. Find an item with status "Assigned"
2. Click "Start Working" button
3. **Expected**: Item status changes to "In Progress"
4. **Expected**: Yellow status badge appears
5. Refresh page
6. **Expected**: Status persists
7. **Expected**: Stats updated (1 in progress, 2 assigned)

#### Test 4.2: Upload Photo
1. On any item, click "Upload Photo" button
2. Select an image file from your device
3. **Expected**: Button shows "Uploading..."
4. **Expected**: Page refreshes automatically
5. **Expected**: Photo appears in the expanded item view
6. Expand the item
7. **Expected**: Photo displayed in gallery with "You" badge

#### Test 4.3: Mark Item Complete
1. On an item (assigned or in progress), click "Mark Complete"
2. **Expected**: Prompt appears: "Add completion notes (optional):"
3. Enter note: "Completed as requested"
4. Click OK
5. **Expected**: Item status changes to "Complete"
6. **Expected**: Green status badge with checkmark
7. **Expected**: "Start Working" and "Mark Complete" buttons disappear
8. **Expected**: Upload photo button still available
9. **Expected**: Stats updated

#### Test 4.4: Complete All Items
1. Mark remaining items as complete (with or without notes)
2. **Expected**: Stats show: 0 assigned, 0 in progress, 3 complete, 0 verified

### Phase 5: GC Verification

#### Test 5.1: View Completed Items in GC Portal
1. Switch to GC user view
2. Navigate to project > Punch Lists tab
3. **Expected**: Items show "Complete" status
4. **Expected**: Stats cards updated
5. Filter by status: "Complete"
6. **Expected**: All 3 items shown

#### Test 5.2: View Contractor Photos
1. Click "View details" (eye icon) on an item
2. **Expected**: Modal/details view shows uploaded photos
3. **Expected**: Photos marked as uploaded by "contractor"

#### Test 5.3: Verify Item
1. On a complete item, click the green checkmark (Verify) button
2. **Expected**: Item status changes to "Verified"
3. **Expected**: Purple status badge
4. **Expected**: Verify button disappears
5. Refresh page
6. **Expected**: Status persists

#### Test 5.4: View from Contractor Portal
1. Go back to contractor portal (refresh the page)
2. **Expected**: Verified items show purple status
3. **Expected**: No action buttons on verified items
4. **Expected**: Stats show: 0 assigned, 0 in progress, 2 complete, 1 verified

### Phase 6: Filtering and Management

#### Test 6.1: Filter by Contractor (GC Portal)
1. In GC portal, create punch lists for different contractors
2. Use contractor filter dropdown
3. **Expected**: Only items for selected contractor shown

#### Test 6.2: Filter by Priority
1. Use priority filter dropdown
2. Select "High"
3. **Expected**: Only high-priority items shown
4. Test with "Medium" and "Low"

#### Test 6.3: Filter by Status
1. Use status filter dropdown
2. Test each status: Assigned, In Progress, Complete, Verified
3. **Expected**: Correct items shown for each filter

#### Test 6.4: Delete Item (GC Only)
1. Click trash icon on any item
2. **Expected**: Confirmation dialog appears
3. Click "Cancel"
4. **Expected**: Item not deleted
5. Click trash icon again
6. Click "OK" to confirm
7. **Expected**: Item removed from list
8. Refresh page
9. **Expected**: Item still deleted

### Phase 7: Error Handling

#### Test 7.1: Expired Token
1. In database, set token expiration to past:
   ```sql
   UPDATE contractor_portal_tokens 
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE token = '[token_from_url]';
   ```
2. Try to access contractor portal
3. **Expected**: Error page with message about expired token

#### Test 7.2: Invalid Token
1. Access contractor portal with modified token URL
2. **Expected**: Error page with message about invalid token

#### Test 7.3: Missing Phone Number
1. Create contractor without phone number
2. Try to assign punch list
3. **Expected**: SMS status shows "missing_phone"
4. **Expected**: Items still created and assigned

#### Test 7.4: Network Errors
1. Disconnect from internet
2. Try to create punch list
3. **Expected**: Error message displayed
4. Reconnect
5. **Expected**: Can retry successfully

### Phase 8: Mobile Responsiveness

#### Test 8.1: Contractor Portal on Mobile
1. Access contractor portal on mobile device or resize browser
2. **Expected**: Layout adapts to mobile screen
3. **Expected**: Stats cards stack vertically
4. **Expected**: All buttons accessible
5. **Expected**: Photo upload works with mobile camera

#### Test 8.2: GC Portal on Mobile
1. Access ProjectDetailView on mobile
2. Navigate to Punch Lists tab
3. **Expected**: Table scrolls horizontally on small screens
4. **Expected**: Create button accessible
5. **Expected**: Modal works on mobile

## Database Verification Queries

### Check Punch List Items
```sql
SELECT 
  pli.*,
  p.name as project_name,
  c.name as contractor_name
FROM punch_list_items pli
LEFT JOIN projects p ON pli.project_id = p.id
LEFT JOIN contractors c ON pli.contractor_id = c.id
ORDER BY pli.created_at DESC;
```

### Check Photos
```sql
SELECT 
  plp.*,
  pli.description
FROM punch_list_photos plp
LEFT JOIN punch_list_items pli ON plp.punch_list_item_id = pli.id
ORDER BY plp.created_at DESC;
```

### Check Tokens
```sql
SELECT 
  cpt.*,
  c.name as contractor_name,
  CASE 
    WHEN cpt.expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END as token_status
FROM contractor_portal_tokens cpt
LEFT JOIN contractors c ON cpt.contractor_id = c.id
ORDER BY cpt.created_at DESC;
```

### Check Status Counts
```sql
SELECT 
  project_id,
  status,
  COUNT(*) as count
FROM punch_list_items
GROUP BY project_id, status
ORDER BY project_id, status;
```

## Performance Testing

### Test Load Time
1. Create 50+ punch list items for a project
2. Load Punch Lists tab
3. **Expected**: Page loads in < 2 seconds
4. Filter by contractor
5. **Expected**: Filter applies instantly

### Test Photo Upload
1. Upload 10MB image
2. **Expected**: Upload completes successfully (after compression)
3. Upload very small image
4. **Expected**: Upload works
5. Upload non-image file
6. **Expected**: Error message about file type

## Security Testing

### Test 1: Unauthorized Access
1. Try to access `/api/punch-lists/[projectId]` without auth token
2. **Expected**: 401 or 503 error

### Test 2: Contractor Can Only Edit Their Items
1. Get contractor token
2. Try to update punch list item for different contractor
3. **Expected**: 404 error

### Test 3: Contractor Cannot Verify Items
1. Try to set status to "verified" from contractor portal
2. **Expected**: Error message about invalid status

## Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| SMS not sent | Twilio not configured | Check environment variables |
| Token expired immediately | Server time zone issue | Verify server time is correct |
| Photos not uploading | Supabase storage not configured | Check storage bucket exists |
| Items not showing | RLS policies blocking | Verify RLS policies are correct |
| Portal link broken | NEXT_PUBLIC_APP_URL not set | Check environment variable |

## Success Criteria

All tests pass when:
- ✅ GC can create multiple punch list items in one session
- ✅ GC can assign items to contractor
- ✅ SMS notification sent with valid portal link
- ✅ Contractor can access portal via link
- ✅ Contractor can upload photos and add notes
- ✅ Contractor can update status to "in_progress" and "complete"
- ✅ GC can verify completed items
- ✅ Photos display correctly in both GC and contractor views
- ✅ Proper error handling for expired tokens
- ✅ Mobile-responsive contractor portal
- ✅ Filters work correctly
- ✅ Items persist after page refresh
- ✅ Stats update in real-time

## Automated Testing (Future)

Consider adding:
- Jest unit tests for components
- API endpoint tests with Supertest
- E2E tests with Playwright or Cypress
- Visual regression tests with Percy

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots/videos
5. Browser/device information
6. Console errors
7. Network tab information (for API errors)

