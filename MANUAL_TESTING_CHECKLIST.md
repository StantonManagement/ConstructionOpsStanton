# Manual Testing Checklist
**Complete these tests to verify all CRUD operations are working**

---

## ✅ Pre-Testing Setup
- [x] SQL migration `verify-cascade-delete-constraints.sql` has been run
- [x] Dev server is running (`npm run dev`)
- [ ] You are logged in as an Admin user
- [ ] You have at least one test project with contractors

---

## 🧪 Test 1: Remove Contract from Project
**Location:** Projects → [Select Project] → Contractors Tab

### Steps:
1. [ ] Navigate to Projects tab
2. [ ] Click on any project to open detail view
3. [ ] Click on "Contractors" sub-tab
4. [ ] Find a contractor card (should have Edit, Details, and "Remove from Project" buttons)
5. [ ] Click the orange "Remove from Project" button
6. [ ] Verify confirmation modal appears with:
   - [ ] Modal title: "Remove from Project"
   - [ ] Contractor name displayed
   - [ ] Contract amount shown
   - [ ] Warning about removing contract and line items
   - [ ] Green text stating "The contractor will remain in your system for other projects"
7. [ ] Click "Remove from Project" button
8. [ ] Verify contract is removed from the list
9. [ ] Verify contractor still exists in the system (check Contractors/Vendors view)

### Expected Results:
- ✅ "Remove from Project" button is visible (orange color, not red)
- ✅ Modal clearly states contractor remains in system
- ✅ After removal, contractor disappears from THIS project's list
- ✅ Contractor still exists in main Contractors list
- ✅ No errors in browser console

### If Contract Has Active Payment Applications:
10. [ ] Try removing a contractor with pending/approved payment apps
11. [ ] Verify you get error: "Cannot remove contractor with active or approved payment applications"

---

## 🧪 Test 2: Edit Project
**Location:** Projects Tab

### Steps:
1. [ ] Navigate to Projects tab
2. [ ] Find any project card
3. [ ] Click the blue "Edit" button
4. [ ] Verify modal opens with current project data
5. [ ] Change the project name (e.g., add "- UPDATED")
6. [ ] Change the budget amount
7. [ ] Click "Save" or "Update Project"
8. [ ] Verify success message appears
9. [ ] Verify project card shows updated information

### Expected Results:
- ✅ Edit button is visible on project cards
- ✅ Modal opens with pre-filled data
- ✅ Can modify all fields
- ✅ Changes are saved successfully
- ✅ UI updates without page refresh

---

## 🧪 Test 3: Delete Project (with Dependency Check)
**Location:** Projects Tab

### Test 3A: Delete Project WITH Contractors (Should Fail)
1. [ ] Find a project that has contractors assigned
2. [ ] Click the red "Delete" button
3. [ ] Click "Delete Project" in the confirmation modal
4. [ ] Verify you get error message: "Cannot delete project with X associated contractor(s)"
5. [ ] Verify project is NOT deleted

### Test 3B: Delete Project WITHOUT Contractors (Should Succeed)
1. [ ] Create a new test project (or find one with no contractors)
2. [ ] Click the red "Delete" button
3. [ ] Verify confirmation modal shows project name
4. [ ] Click "Delete Project"
5. [ ] Verify success message
6. [ ] Verify project disappears from the list (status set to 'deleted')

### Expected Results:
- ✅ Cannot delete projects with dependencies
- ✅ Can delete empty projects
- ✅ Clear error messages when blocked
- ✅ Confirmation modal shows warnings

---

## 🧪 Test 4: Edit Contractor Information
**Location:** Contractors/Vendors Detail View

### Steps:
1. [ ] Navigate to a contractor detail view (from Projects → Contractors → Click contractor)
2. [ ] Look for an "Edit" or pencil icon button
3. [ ] Click to open edit modal
4. [ ] Verify form shows current contractor data including:
   - [ ] Company Name
   - [ ] Trade
   - [ ] Phone
   - [ ] Email
   - [ ] Street Address (NEW FIELD)
   - [ ] City (NEW FIELD)
   - [ ] State (NEW FIELD)
   - [ ] Zip (NEW FIELD)
   - [ ] Contact Name/Officer (NEW FIELD)
5. [ ] Update some fields (e.g., add address information)
6. [ ] Click "Save"
7. [ ] Verify changes are saved
8. [ ] Verify updated information displays in the view

### Expected Results:
- ✅ Edit modal includes new address fields
- ✅ Can update all contractor information
- ✅ Changes persist after save
- ✅ No errors in console

---

## 🧪 Test 5: Remove from Project (Additional Views)
**Location:** ContractorDetailView and VendorDetailView

### Test 5A: Remove from ContractorDetailView
1. [ ] Navigate to Projects → [Select Project] → Contractors → [Click contractor name]
2. [ ] Look for orange "Remove from Project" button in header
3. [ ] Click button and verify modal appears
4. [ ] Confirm removal
5. [ ] Verify you're navigated back to project view
6. [ ] Verify contractor is removed from project but still exists in system

### Test 5B: Remove from VendorDetailView
1. [ ] Navigate to Contractors/Vendors view
2. [ ] Click on a contractor to see all their projects
3. [ ] Expand a project to see contract details
4. [ ] Look for orange "Remove from Project" button
5. [ ] Click and confirm removal
6. [ ] Verify contract is removed from that project
7. [ ] Verify contractor still shows other projects

### Expected Results:
- ✅ "Remove from Project" button appears in both views (orange color)
- ✅ Removal works consistently across all views
- ✅ Contractor remains in system after removal

---

## 🧪 Test 6: Cascade Delete Verification
**This tests database-level cascade deletes**

### Test 5A: Contract → Line Items Cascade
1. [ ] Open browser DevTools → Network tab
2. [ ] Delete a contract (from Test 1)
3. [ ] Check database or verify in UI that:
   - [ ] Contract is deleted from `project_contractors`
   - [ ] Associated line items are automatically deleted from `project_line_items`

### Test 6B: Payment App → Progress Records Cascade
1. [ ] Navigate to Payments tab
2. [ ] Find a payment application
3. [ ] Delete it (if delete button exists)
4. [ ] Verify associated `payment_line_item_progress` records are also deleted

### Expected Results:
- ✅ Deleting parent records cascades to child records
- ✅ No orphaned records left in database
- ✅ No foreign key constraint errors

---

## 🧪 Test 7: API Endpoints (Optional - For Developers)

### Test with Browser DevTools or Postman:

#### GET Contractor
```
GET /api/contractors/[id]
Authorization: Bearer [your-token]
```
- [ ] Returns contractor with stats

#### PUT Contractor
```
PUT /api/contractors/[id]
Authorization: Bearer [your-token]
Body: { "name": "Updated Name", "address": "123 Main St" }
```
- [ ] Updates contractor successfully

#### DELETE Contractor (with dependencies)
```
DELETE /api/contractors/[id]
Authorization: Bearer [your-token]
```
- [ ] Returns 409 error if contractor has contracts
- [ ] Returns 200 if no dependencies

---

## 🐛 Common Issues to Watch For

### Issue 1: "Cannot read property 'id' of null"
- **Cause:** Trying to delete when no item selected
- **Fix:** Already handled in code with null checks

### Issue 2: "Remove from Project" button not appearing
- **Cause:** Component not receiving onDelete prop
- **Check:** Verify ProjectContractorsTab has `onDelete={handleDeleteClick}` prop passed correctly

### Issue 3: Modal doesn't close after removal
- **Cause:** State not being reset
- **Check:** Verify `setShowDeleteConfirmation(false)` is called after successful removal

### Issue 4: "Service unavailable" error
- **Cause:** Supabase client not initialized
- **Check:** Verify environment variables are set correctly

---

## 📊 Testing Results

### Summary:
- [ ] Test 1: Remove Contract from Project - PASS / FAIL
- [ ] Test 2: Edit Project - PASS / FAIL
- [ ] Test 3: Delete Project - PASS / FAIL
- [ ] Test 4: Edit Contractor - PASS / FAIL
- [ ] Test 5: Remove from Project (Additional Views) - PASS / FAIL
- [ ] Test 6: Cascade Deletes - PASS / FAIL
- [ ] Test 7: API Endpoints - PASS / FAIL

### Notes:
```
[Add any issues or observations here]




```

---

## ✅ Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Overall Status:** PASS / FAIL / NEEDS WORK  

**Ready for Production:** YES / NO

---

## 🚀 Next Steps After Testing

If all tests pass:
1. [ ] Commit changes to version control
2. [ ] Deploy to staging environment
3. [ ] Run tests again in staging
4. [ ] Get user acceptance testing
5. [ ] Deploy to production
6. [ ] Monitor logs for any issues

If tests fail:
1. [ ] Document the failure in Notes section above
2. [ ] Check browser console for errors
3. [ ] Check server logs in terminal
4. [ ] Report issues to development team

