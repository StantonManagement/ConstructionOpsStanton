const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('Checking schedule_dependencies schema...');
  
  // Check columns
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'schedule_dependencies');
    
  if (colError) {
    console.error('Error fetching columns:', colError);
  } else {
    console.log('Columns:', JSON.stringify(columns, null, 2));
  }
  
  // Check schedule_tasks columns to ensure IDs match
  const { data: taskColumns, error: taskColError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'schedule_tasks')
    .eq('column_name', 'id');

  if (taskColError) {
     console.error('Error fetching task columns:', taskColError);
  } else {
     console.log('Task ID Type:', JSON.stringify(taskColumns, null, 2));
  }

}

checkSchema();




