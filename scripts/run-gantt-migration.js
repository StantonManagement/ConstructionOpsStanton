require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Checking current schema...');
  
  // Check if columns exist
  const { data: sample, error: sampleError } = await supabase
    .from('schedule_tasks')
    .select('*')
    .limit(1);
  
  if (sampleError) {
    console.error('Error fetching sample:', sampleError.message);
    return;
  }

  const existingColumns = sample && sample[0] ? Object.keys(sample[0]) : [];
  console.log('Existing columns:', existingColumns);

  const needsConstraintType = !existingColumns.includes('constraint_type');
  const needsConstraintDate = !existingColumns.includes('constraint_date');

  if (!needsConstraintType && !needsConstraintDate) {
    console.log('All columns already exist. No migration needed.');
    return;
  }

  console.log('Need to add:', {
    constraint_type: needsConstraintType,
    constraint_date: needsConstraintDate
  });

  // Unfortunately, Supabase JS client cannot run DDL statements directly.
  // The migration must be run via Supabase Dashboard SQL Editor or CLI.
  console.log('\n⚠️  DDL statements cannot be run via the Supabase JS client.');
  console.log('Please run the following SQL in your Supabase Dashboard SQL Editor:\n');
  
  if (needsConstraintType) {
    console.log(`ALTER TABLE schedule_tasks ADD COLUMN constraint_type VARCHAR(20);`);
  }
  if (needsConstraintDate) {
    console.log(`ALTER TABLE schedule_tasks ADD COLUMN constraint_date DATE;`);
  }
  
  console.log('\nAlternatively, the Gantt chart will work without these columns.');
  console.log('Constraint-based scheduling will just be disabled until the columns are added.');
}

runMigration().catch(console.error);
