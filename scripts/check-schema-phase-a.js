const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking database schema...');

  // Check budget related tables
  const { data: budgetTables, error: budgetError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .ilike('table_name', '%budget%')
    .eq('table_schema', 'public');

  if (budgetError) {
    console.error('Error checking tables:', budgetError);
  } else {
    console.log('Budget related tables:', budgetTables.map(t => t.table_name));
  }

  // Check schedule_tasks columns
  const { data: scheduleColumns, error: scheduleError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'schedule_tasks')
    .eq('table_schema', 'public');

  if (scheduleError) {
    console.error('Error checking schedule_tasks:', scheduleError);
  } else {
    console.log('schedule_tasks columns:', scheduleColumns);
  }
}

checkSchema();





