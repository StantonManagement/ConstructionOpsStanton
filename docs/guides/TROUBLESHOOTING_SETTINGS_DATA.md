# Troubleshooting: Settings Data Not Showing Up

## Issue
After creating the settings tables and API endpoints, data isn't appearing in the UI.

## Most Likely Causes

### 1. RLS Blocking Queries ⚠️
**Symptom:** API returns 401/403 or empty results
**Solution:** Run the RLS migration

```sql
-- Run this in Supabase SQL Editor:
-- Copy/paste contents of: database-migrations/enable-settings-rls.sql
```

### 2. Empty Default Data ✅
**Symptom:** Form loads but all fields are empty
**Explanation:** The migration inserts a default row with empty strings:
```sql
INSERT INTO company_settings (company_name, address, phone, email)
VALUES ('', '', '', '')
```

**This is NORMAL!** The form is working correctly - you just need to fill it in and save.

### 3. API Authentication Issues 🔐
**Symptom:** Console shows 401 errors
**Check:**
```javascript
// Open browser console (F12)
// Look for errors like:
// "Failed to load company settings"
// "Unauthorized"
```

**Solution:** Make sure you're logged in and have a valid session

### 4. Browser Console Errors 🐛
**Check the browser console for:**
- Network errors (API calls failing)
- CORS issues
- Authentication errors
- JavaScript errors

## How to Verify Everything Works

### Step 1: Check if tables exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('company_settings', 'user_preferences');
```

### Step 2: Check if default row exists
```sql
SELECT * FROM company_settings;
-- Should return 1 row with empty strings
```

### Step 3: Check if RLS is enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('company_settings', 'user_preferences');
-- rowsecurity should be TRUE
```

### Step 4: Check if policies exist
```sql
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('company_settings', 'user_preferences')
ORDER BY tablename, policyname;
-- Should show multiple policies per table
```

### Step 5: Test the API directly
```bash
# In browser console (F12), run:
fetch('/api/settings/company')
  .then(r => r.json())
  .then(console.log)

# Should return:
# {
#   company_name: "",
#   address: "",
#   phone: "",
#   email: ""
# }
```

### Step 6: Save some data
1. Go to Settings → Company
2. Fill in the form fields:
   - Company Name: "Test Company"
   - Address: "123 Main St"
   - Phone: "555-1234"
   - Email: "info@test.com"
3. Click "Save Changes"
4. Refresh the page
5. Data should persist

### Step 7: Test user preferences
1. Go to Settings → Preferences
2. Toggle any switch (Email Notifications, SMS, Dark Mode)
3. Refresh the page
4. Toggle state should persist

## Common Solutions

### If you see "Unauthorized" errors:
```sql
-- Check if your user has a profile with role
SELECT id, email FROM auth.users WHERE id = auth.uid();
SELECT id, role FROM profiles WHERE id = auth.uid();

-- If no profile exists, create one:
INSERT INTO profiles (id, email, role, full_name)
VALUES (auth.uid(), 'your@email.com', 'admin', 'Your Name');
```

### If RLS blocks everything:
```sql
-- Temporarily disable RLS for testing (NOT for production!)
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- Test if data appears now
-- If it works, re-enable and check policies:
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
```

### If policies aren't working:
```sql
-- Check the profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('id', 'role');

-- Verify your role is 'admin'
SELECT role FROM profiles WHERE id = auth.uid();
```

## Expected Behavior

### Company Settings (First Load)
- ✅ Form appears
- ✅ All fields are empty (default values)
- ✅ "Save Changes" button is disabled (no changes yet)
- ✅ No errors in console

**This is correct!** Empty fields mean the API is working and returning the default row.

### After Saving Data
- ✅ Data persists after page refresh
- ✅ "Save Changes" button becomes enabled when you edit
- ✅ "Reset" button reverts to last saved values
- ✅ Success alert appears after saving

### User Preferences (First Load)
- ✅ All toggles are OFF (default is false)
- ✅ No errors in console

### After Toggling
- ✅ Dark mode applies immediately
- ✅ Toggle state persists after page refresh
- ✅ Settings are per-user (different users have different preferences)

## Still Not Working?

### Get detailed error information:
```javascript
// In browser console (F12)
// Check the Network tab:
// 1. Go to Settings page
// 2. Open Network tab
// 3. Filter by "Fetch/XHR"
// 4. Look for "/api/settings/company" request
// 5. Check the Response and Preview tabs

// Check for JavaScript errors:
// Look in the Console tab for red error messages
```

### Check the terminal where `npm run dev` is running:
- Look for API route errors
- Check for database connection issues
- Look for authentication errors

### Quick Diagnostic Script:
```javascript
// Run this in browser console (F12) while logged in:
(async () => {
  console.log('=== Settings Diagnostic ===');
  
  // Test company settings
  try {
    const companyRes = await fetch('/api/settings/company');
    console.log('Company Settings Status:', companyRes.status);
    const companyData = await companyRes.json();
    console.log('Company Settings Data:', companyData);
  } catch (e) {
    console.error('Company Settings Error:', e);
  }
  
  // Test user preferences
  try {
    const prefsRes = await fetch('/api/settings/preferences');
    console.log('User Preferences Status:', prefsRes.status);
    const prefsData = await prefsRes.json();
    console.log('User Preferences Data:', prefsData);
  } catch (e) {
    console.error('User Preferences Error:', e);
  }
  
  console.log('=== End Diagnostic ===');
})();
```

## Summary

**If you see empty form fields, that's probably normal!** The migration creates empty default values. Just fill in the form and click Save.

**If you see errors in the console**, follow the troubleshooting steps above.

**Next step:** Run `enable-settings-rls.sql` to ensure RLS policies are in place.



