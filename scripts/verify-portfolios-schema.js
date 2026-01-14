require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySchema() {
  console.log('🔍 Phase 1: Schema Verification\n');

  // Check portfolios table
  console.log('📋 Checking portfolios table...');
  const { data: portfolios, error: pError } = await supabase
    .from('portfolios')
    .select('*')
    .limit(1);

  if (pError) {
    console.log('   ⚠️  Error querying portfolios:', pError.message);
  } else {
    console.log('   ✅ Portfolios table exists');
    if (portfolios && portfolios.length > 0) {
      const cols = Object.keys(portfolios[0]);
      console.log('   📊 Columns:', cols.join(', '));
      
      const expected = ['id', 'name', 'code', 'description', 'owner_entity_id', 'is_active', 'created_at', 'updated_at'];
      const missing = expected.filter(col => !cols.includes(col));
      if (missing.length > 0) {
        console.log('   ⚠️  Missing columns:', missing.join(', '));
      } else {
        console.log('   ✅ All expected columns present');
      }
    }
  }

  // Check funding_sources table
  console.log('\n📋 Checking funding_sources table...');
  const { data: funding, error: fError } = await supabase
    .from('funding_sources')
    .select('*')
    .limit(1);

  if (fError) {
    console.log('   ⚠️  Error querying funding_sources:', fError.message);
  } else {
    console.log('   ✅ Funding_sources table exists');
    if (funding && funding.length > 0) {
      const cols = Object.keys(funding[0]);
      console.log('   📊 Columns:', cols.join(', '));
      
      const expected = ['id', 'portfolio_id', 'name', 'type', 'lender_name', 'commitment_amount', 'drawn_amount', 'interest_rate', 'maturity_date', 'loan_number', 'notes', 'is_active', 'created_at', 'updated_at'];
      const missing = expected.filter(col => !cols.includes(col));
      if (missing.length > 0) {
        console.log('   ⚠️  Missing columns:', missing.join(', '));
      } else {
        console.log('   ✅ All expected columns present');
      }
    }
  }

  // Check projects.portfolio_id
  console.log('\n📋 Checking projects.portfolio_id...');
  const { data: projects, error: prError } = await supabase
    .from('projects')
    .select('id, name, portfolio_id')
    .limit(1);

  if (prError) {
    console.log('   ⚠️  Error querying projects:', prError.message);
  } else {
    console.log('   ✅ Projects table accessible');
    if (projects && projects.length > 0) {
      if ('portfolio_id' in projects[0]) {
        console.log('   ✅ portfolio_id column exists');
      } else {
        console.log('   ⚠️  portfolio_id column missing');
      }
    }
  }

  // Count existing data
  console.log('\n📊 Existing data counts:');
  const { count: pCount } = await supabase.from('portfolios').select('*', { count: 'exact', head: true });
  const { count: fCount } = await supabase.from('funding_sources').select('*', { count: 'exact', head: true });
  const { count: prCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).not('portfolio_id', 'is', null);
  
  console.log(`   Portfolios: ${pCount || 0}`);
  console.log(`   Funding sources: ${fCount || 0}`);
  console.log(`   Projects with portfolio: ${prCount || 0}`);

  console.log('\n✅ Schema verification complete!');
}

verifySchema().catch(console.error);
