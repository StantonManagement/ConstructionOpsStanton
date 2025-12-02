const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSchema() {
  console.log('--- Checking schedule_tasks ---');
  const { data: taskCols, error: taskError } = await supabase
    .from('information_schema.columns')
    .select('column_name, is_generated, generation_expression, data_type')
    .eq('table_name', 'schedule_tasks')
    .eq('column_name', 'duration_days');

  if (taskError) console.error('Error checking task columns:', taskError);
  else console.log('duration_days column:', taskCols);

  console.log('\n--- Checking schedule_dependencies ---');
  const { data: depCols, error: depError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'schedule_dependencies');

  if (depError) console.error('Error checking dependency columns:', depError);
  else console.log('schedule_dependencies columns:', depCols);
  
  if (depCols && depCols.length === 0) {
      console.log('!! schedule_dependencies table NOT FOUND !!');
  }
}

debugSchema().catch(console.error);




