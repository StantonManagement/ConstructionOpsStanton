
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserRole(email: string) {
  console.log(`Checking role for user: ${email}`);

  // 1. Get user ID
  const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();
  
  if (listUsersError) {
    console.error('Error listing users:', listUsersError);
    return;
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`User not found: ${email}`);
    return;
  }

  console.log(`Found user ID: ${user.id}`);

  // 2. Check role in user_role table
  const { data: roleData, error: roleError } = await supabase
    .from('user_role')
    .select('*')
    .eq('user_id', user.id);

  if (roleError) {
    console.error('Error checking role:', roleError);
    return;
  }

  console.log('User Role Data:', roleData);

  // 3. Test is_admin_or_pm function logic by running same query
  const { data: checkData, error: checkError } = await supabase
    .rpc('is_admin_or_pm'); 
    // Note: RPC calls run in context of auth user. Using service role key bypasses RLS so this RPC test 
    // isn't perfect for simulating the user, but we can verify the function exists.
    // To truly test as user, we'd need their session token which we don't have.
    // However, we can simulate the query logic:
    
  const { data: manualCheck, error: manualError } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'pm']);
    
  if (manualError) {
      console.log('Error manual check:', manualError);
  } else {
      console.log('Manual check for admin/pm role:', manualCheck && manualCheck.length > 0 ? 'PASS' : 'FAIL');
  }
}

// We need an email to check. I'll use one from the previous output if available or just check all.
async function checkAllRoles() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    for (const u of users) {
        if (u.email) {
            await checkUserRole(u.email);
        }
    }
}

checkAllRoles();

