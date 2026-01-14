require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addMissingColumns() {
  console.log('🔧 Adding missing columns...\n');

  // Add owner_entity_id to portfolios
  console.log('Adding owner_entity_id to portfolios...');
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS owner_entity_id UUID REFERENCES owner_entities(id);'
  });
  if (e1) console.log('   ⚠️ ', e1.message);
  else console.log('   ✅ Added owner_entity_id');

  // Add loan_number to funding_sources
  console.log('Adding loan_number to funding_sources...');
  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE funding_sources ADD COLUMN IF NOT EXISTS loan_number VARCHAR(50);'
  });
  if (e2) console.log('   ⚠️ ', e2.message);
  else console.log('   ✅ Added loan_number');

  // Add indexes
  console.log('\nAdding indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_funding_sources_portfolio ON funding_sources(portfolio_id);',
    'CREATE INDEX IF NOT EXISTS idx_funding_sources_type ON funding_sources(type);',
    'CREATE INDEX IF NOT EXISTS idx_funding_sources_active ON funding_sources(is_active);',
    'CREATE INDEX IF NOT EXISTS idx_projects_portfolio ON projects(portfolio_id);',
    'CREATE INDEX IF NOT EXISTS idx_portfolios_active ON portfolios(is_active);'
  ];

  for (const sql of indexes) {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) console.log('   ⚠️ ', error.message);
  }
  console.log('   ✅ Indexes created');

  // Add updated_at triggers
  console.log('\nAdding updated_at triggers...');
  
  const triggerFunction = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `;
  
  await supabase.rpc('exec_sql', { sql: triggerFunction });
  
  const triggers = [
    'DROP TRIGGER IF EXISTS update_portfolios_updated_at ON portfolios;',
    'CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
    'DROP TRIGGER IF EXISTS update_funding_sources_updated_at ON funding_sources;',
    'CREATE TRIGGER update_funding_sources_updated_at BEFORE UPDATE ON funding_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();'
  ];

  for (const sql of triggers) {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) console.log('   ⚠️ ', error.message);
  }
  console.log('   ✅ Triggers created');

  console.log('\n✅ Schema enhancements complete!');
}

addMissingColumns().catch(console.error);
