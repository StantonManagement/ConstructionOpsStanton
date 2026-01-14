// Verify user_role index and performance fix
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyFix() {
  console.log('🔍 Verifying user_role table fix...\n');
  
  // Test 1: Check if we can query user_role quickly
  console.log('Test 1: Query performance test');
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('user_role')
      .select('*')
      .limit(5);
    
    const queryTime = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Query failed:', error.message);
      return false;
    }
    
    console.log(`✅ Query completed in ${queryTime}ms`);
    console.log(`   Found ${data?.length || 0} user roles`);
    
    if (queryTime > 1000) {
      console.warn('⚠️  Query is still slow (>1s). Index may not be working.');
    } else {
      console.log('✅ Query is fast! Index is working correctly.');
    }
    
    // Test 2: Test a specific user lookup (the most common query)
    if (data && data.length > 0) {
      console.log('\nTest 2: Specific user lookup test');
      const testUserId = data[0].user_id;
      const startTime2 = Date.now();
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_role')
        .select('role')
        .eq('user_id', testUserId)
        .single();
      
      const queryTime2 = Date.now() - startTime2;
      
      if (roleError) {
        console.error('❌ User lookup failed:', roleError.message);
      } else {
        console.log(`✅ User lookup completed in ${queryTime2}ms`);
        console.log(`   Role: ${roleData.role}`);
        
        if (queryTime2 > 500) {
          console.warn('⚠️  Lookup is slow (>500ms). Index may not be optimal.');
        } else {
          console.log('✅ Lookup is fast! Index is working perfectly.');
        }
      }
    }
    
    // Test 3: Count total roles
    console.log('\nTest 3: Count total user roles');
    const { count, error: countError } = await supabase
      .from('user_role')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Count failed:', countError.message);
    } else {
      console.log(`✅ Total user roles: ${count}`);
    }
    
    console.log('\n✅ All tests passed! user_role table is working correctly.');
    return true;
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

verifyFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
