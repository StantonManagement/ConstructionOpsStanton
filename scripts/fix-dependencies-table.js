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

async function fixDependenciesTable() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if task_dependencies exists
    const checkTask = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_dependencies'
      );
    `);

    // Check if schedule_dependencies exists
    const checkSchedule = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schedule_dependencies'
      );
    `);

    console.log('task_dependencies exists:', checkTask.rows[0].exists);
    console.log('schedule_dependencies exists:', checkSchedule.rows[0].exists);
    console.log('');

    if (checkSchedule.rows[0].exists) {
      console.log('✅ schedule_dependencies already exists. Nothing to do.');
    } else if (checkTask.rows[0].exists) {
      console.log('Renaming task_dependencies to schedule_dependencies...');
      await client.query('ALTER TABLE task_dependencies RENAME TO schedule_dependencies;');
      console.log('✅ Table renamed successfully');
    } else {
      console.log('Creating schedule_dependencies table...');
      await client.query(`
        CREATE TABLE schedule_dependencies (
          id SERIAL PRIMARY KEY,
          source_task_id VARCHAR(255) NOT NULL,
          target_task_id VARCHAR(255) NOT NULL,
          dependency_type VARCHAR(50) DEFAULT 'finish_to_start',
          lag_days INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          UNIQUE(source_task_id, target_task_id),
          CHECK (source_task_id != target_task_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_schedule_dependencies_source ON schedule_dependencies(source_task_id);
        CREATE INDEX IF NOT EXISTS idx_schedule_dependencies_target ON schedule_dependencies(target_task_id);
      `);
      console.log('✅ Table created successfully');
    }

    console.log('\n✅ Dependencies table is ready!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

fixDependenciesTable();
