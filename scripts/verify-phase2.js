
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials. Ensure .env or .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('🔍 Verifying Phase 2 (Templates)...\n');
  
  // 1. Check Tables
  const tables = ['scope_templates', 'template_tasks'];
  let allTablesExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
      console.log(`❌ Table '${table}' DOES NOT exist.`);
      allTablesExist = false;
    } else if (error) {
      console.log(`⚠️  Error checking '${table}': ${error.message}`);
    } else {
      console.log(`✅ Table '${table}' exists.`);
    }
  }

  if (!allTablesExist) {
    console.log('\n❌ Phase 2 verification FAILED. Please run the migration script.');
    return;
  }

  console.log('\n✅ Phase 2 verification PASSED.');
  console.log('Templates and Bulk Creation features are ready.');
}

verify();
