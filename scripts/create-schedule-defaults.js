const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createScheduleDefaultsTable() {
  console.log('Creating schedule_defaults table...');
  
  const sql = `
    CREATE TABLE IF NOT EXISTS schedule_defaults (
      id SERIAL PRIMARY KEY,
      budget_category VARCHAR(255) NOT NULL UNIQUE,
      default_duration_days INTEGER NOT NULL DEFAULT 3,
      display_order INTEGER NOT NULL DEFAULT 999,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    CREATE INDEX IF NOT EXISTS idx_schedule_defaults_budget_category 
    ON schedule_defaults(budget_category);

    CREATE INDEX IF NOT EXISTS idx_schedule_defaults_display_order 
    ON schedule_defaults(display_order);
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error creating table:', error);
      console.log('\n⚠️  Please run this SQL in your Supabase SQL Editor:');
      console.log('---------------------------------------------------');
      console.log(sql);
      console.log('---------------------------------------------------\n');
      return false;
    }
    
    console.log('✅ Table created successfully');
    return true;
  } catch (err) {
    console.error('Error:', err.message);
    console.log('\n⚠️  Please run this SQL in your Supabase SQL Editor:');
    console.log('---------------------------------------------------');
    console.log(sql);
    console.log('---------------------------------------------------\n');
    return false;
  }
}

async function insertDefaults() {
  console.log('Inserting default values...');
  
  const defaults = [
    { budget_category: 'Site Work', default_duration_days: 5, display_order: 10 },
    { budget_category: 'Demolition / Cleanup', default_duration_days: 3, display_order: 20 },
    { budget_category: 'Foundation', default_duration_days: 7, display_order: 30 },
    { budget_category: 'Framing', default_duration_days: 14, display_order: 40 },
    { budget_category: 'Roofing', default_duration_days: 5, display_order: 50 },
    { budget_category: 'Windows', default_duration_days: 3, display_order: 60 },
    { budget_category: 'Exterior Doors', default_duration_days: 2, display_order: 70 },
    { budget_category: 'Siding', default_duration_days: 7, display_order: 80 },
    { budget_category: 'Plumbing - Rough', default_duration_days: 5, display_order: 90 },
    { budget_category: 'HVAC - Rough', default_duration_days: 5, display_order: 100 },
    { budget_category: 'Electrical - Rough', default_duration_days: 5, display_order: 110 },
    { budget_category: 'Insulation', default_duration_days: 3, display_order: 120 },
    { budget_category: 'Drywall', default_duration_days: 7, display_order: 130 },
    { budget_category: 'Interior Doors', default_duration_days: 2, display_order: 140 },
    { budget_category: 'Trim / Millwork', default_duration_days: 5, display_order: 150 },
    { budget_category: 'Cabinets', default_duration_days: 3, display_order: 160 },
    { budget_category: 'Countertops', default_duration_days: 2, display_order: 170 },
    { budget_category: 'Flooring', default_duration_days: 5, display_order: 180 },
    { budget_category: 'Tile', default_duration_days: 4, display_order: 190 },
    { budget_category: 'Painting', default_duration_days: 7, display_order: 200 },
    { budget_category: 'Plumbing - Finish', default_duration_days: 3, display_order: 210 },
    { budget_category: 'HVAC - Finish', default_duration_days: 2, display_order: 220 },
    { budget_category: 'Electrical - Finish', default_duration_days: 3, display_order: 230 },
    { budget_category: 'Appliances', default_duration_days: 1, display_order: 240 },
    { budget_category: 'Landscaping', default_duration_days: 5, display_order: 250 },
    { budget_category: 'Final Cleanup', default_duration_days: 2, display_order: 260 },
    { budget_category: 'Inspection', default_duration_days: 1, display_order: 270 },
    { budget_category: 'Punchlist', default_duration_days: 3, display_order: 280 }
  ];

  try {
    const { data, error } = await supabase
      .from('schedule_defaults')
      .upsert(defaults, { onConflict: 'budget_category' });
    
    if (error) {
      console.error('Error inserting defaults:', error);
      return false;
    }
    
    console.log(`✅ Inserted ${defaults.length} default categories`);
    return true;
  } catch (err) {
    console.error('Error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Setting up schedule_defaults table...\n');
  
  // Try to insert directly - if table doesn't exist, it will fail
  const insertSuccess = await insertDefaults();
  
  if (!insertSuccess) {
    console.log('\n⚠️  Table may not exist. Creating it...\n');
    const createSuccess = await createScheduleDefaultsTable();
    
    if (createSuccess) {
      await insertDefaults();
    }
  }
  
  console.log('\n✅ Setup complete!');
}

main().catch(console.error);
