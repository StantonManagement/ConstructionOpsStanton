// Quick script to add index to user_role table to fix query timeout
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addIndex() {
  console.log('Adding index to user_role.user_id...');
  
  // Create index using RPC or direct SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);'
  });
  
  if (error) {
    console.error('Error creating index:', error);
    
    // Try alternative approach - check if index exists
    console.log('\nChecking if index already exists...');
    const { data: indexes, error: checkError } = await supabase
      .from('pg_indexes')
      .select('*')
      .eq('tablename', 'user_role')
      .eq('indexname', 'idx_user_role_user_id');
    
    if (checkError) {
      console.error('Error checking indexes:', checkError);
    } else if (indexes && indexes.length > 0) {
      console.log('✓ Index already exists!');
    } else {
      console.log('Index does not exist. You need to run this SQL in Supabase SQL Editor:');
      console.log('\nCREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);');
    }
  } else {
    console.log('✓ Index created successfully!');
  }
  
  // Verify the table structure
  console.log('\nChecking user_role table...');
  const { data: roles, error: roleError } = await supabase
    .from('user_role')
    .select('*')
    .limit(1);
  
  if (roleError) {
    console.error('Error querying user_role:', roleError);
  } else {
    console.log('✓ user_role table is accessible');
    console.log('Sample data:', roles);
  }
}

addIndex().catch(console.error);
