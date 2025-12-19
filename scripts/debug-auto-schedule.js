const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const client = new Client({
  host: 'db.iyiqdgmpcuczzigotjhf.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: ')c#n6b~T7%vs&rB\'B\\Rk',
  ssl: { rejectUnauthorized: false }
});

async function debugAutoSchedule() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Check if schedule_defaults exists and has data
    console.log('1. Checking schedule_defaults table...');
    const defaultsResult = await client.query('SELECT COUNT(*) as count FROM schedule_defaults');
    console.log(`   ✅ schedule_defaults has ${defaultsResult.rows[0].count} rows\n`);

    // 2. Check if property_budgets exists
    console.log('2. Checking property_budgets table...');
    try {
      const budgetsResult = await client.query('SELECT COUNT(*) as count FROM property_budgets');
      console.log(`   ✅ property_budgets has ${budgetsResult.rows[0].count} rows\n`);
    } catch (err) {
      console.log(`   ❌ property_budgets error: ${err.message}\n`);
    }

    // 3. Check if project_schedules exists
    console.log('3. Checking project_schedules table...');
    try {
      const schedulesResult = await client.query('SELECT COUNT(*) as count FROM project_schedules');
      console.log(`   ✅ project_schedules has ${schedulesResult.rows[0].count} rows\n`);
    } catch (err) {
      console.log(`   ❌ project_schedules error: ${err.message}\n`);
    }

    // 4. Check if schedule_tasks exists
    console.log('4. Checking schedule_tasks table...');
    try {
      const tasksResult = await client.query('SELECT COUNT(*) as count FROM schedule_tasks');
      console.log(`   ✅ schedule_tasks has ${tasksResult.rows[0].count} rows\n`);
    } catch (err) {
      console.log(`   ❌ schedule_tasks error: ${err.message}\n`);
    }

    // 5. Check projects table
    console.log('5. Checking projects table...');
    const projectsResult = await client.query('SELECT id, name, start_date FROM projects LIMIT 5');
    console.log(`   ✅ Found ${projectsResult.rows.length} projects:`);
    projectsResult.rows.forEach(p => {
      console.log(`      - ID ${p.id}: ${p.name} (start: ${p.start_date || 'NULL'})`);
    });
    console.log('');

    // 6. For first project, check if it has budget and schedule
    if (projectsResult.rows.length > 0) {
      const projectId = projectsResult.rows[0].id;
      console.log(`6. Checking project ${projectId} details...\n`);

      // Check budget
      try {
        const budgetCheck = await client.query(
          'SELECT COUNT(*) as count FROM property_budgets WHERE project_id = $1',
          [projectId]
        );
        console.log(`   Budget categories: ${budgetCheck.rows[0].count}`);
      } catch (err) {
        console.log(`   ❌ Budget check error: ${err.message}`);
      }

      // Check schedule
      try {
        const scheduleCheck = await client.query(
          'SELECT id FROM project_schedules WHERE project_id = $1',
          [projectId]
        );
        if (scheduleCheck.rows.length > 0) {
          console.log(`   ✅ Schedule exists: ${scheduleCheck.rows[0].id}`);
        } else {
          console.log(`   ❌ No schedule found for project ${projectId}`);
        }
      } catch (err) {
        console.log(`   ❌ Schedule check error: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSIS:');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

debugAutoSchedule();
