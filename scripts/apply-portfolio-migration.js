require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔧 Applying portfolio schema enhancements...\n');

  const migrationPath = path.join(__dirname, '..', 'database-migrations', '062_portfolio_schema_enhancements.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      // Use the REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        // Try direct query execution via pg_stat_statements or just log
        console.log(`   ⚠️  REST API failed, trying direct execution...`);
        
        // For DDL statements, we need to use a different approach
        // Let's try using a simple query that will execute the SQL
        const { error } = await supabase.from('_migrations').select('*').limit(0);
        
        // Since we can't execute DDL directly, let's just log what needs to be done
        console.log(`   ℹ️  Statement: ${statement.substring(0, 100)}...`);
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${error.message}`);
    }
  }

  console.log('\n📝 Migration file created at: database-migrations/062_portfolio_schema_enhancements.sql');
  console.log('⚠️  Please run this migration manually in Supabase SQL Editor:');
  console.log('   1. Go to Supabase Dashboard > SQL Editor');
  console.log('   2. Copy the contents of 062_portfolio_schema_enhancements.sql');
  console.log('   3. Paste and run the SQL');
  console.log('\nOr use the Supabase CLI:');
  console.log('   supabase db push');
}

applyMigration().catch(console.error);
