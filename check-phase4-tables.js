const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  const tablesToCheck = [
    'punch_list_items',
    'photos',
    'warranties',
    'project_schedules' // This one should NOT exist yet if Feature 3 is not done
  ];

  for (const table of tablesToCheck) {
    const { error } = await supabase
      .from(table)
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') { // undefined_table
        console.log(`Table '${table}' does NOT exist.`);
      } else {
        console.error(`Error checking '${table}':`, error.message);
      }
    } else {
      console.log(`Table '${table}' exists.`);
    }
  }
}

checkTables();

