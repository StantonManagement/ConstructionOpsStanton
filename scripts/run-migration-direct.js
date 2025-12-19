const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials in .env.local');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔧 Running database migration...\n');

  const migrations = [
    {
      name: 'schedule_defaults',
      sql: `
        CREATE TABLE IF NOT EXISTS schedule_defaults (
          id SERIAL PRIMARY KEY,
          budget_category VARCHAR(255) NOT NULL UNIQUE,
          default_duration_days INTEGER NOT NULL DEFAULT 3,
          display_order INTEGER NOT NULL DEFAULT 999,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
      `
    },
    {
      name: 'schedule_defaults_indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_schedule_defaults_budget_category ON schedule_defaults(budget_category);
        CREATE INDEX IF NOT EXISTS idx_schedule_defaults_display_order ON schedule_defaults(display_order);
      `
    },
    {
      name: 'schedule_defaults_data',
      sql: `
        INSERT INTO schedule_defaults (budget_category, default_duration_days, display_order) VALUES
          ('Site Work', 5, 10),
          ('Demolition / Cleanup', 3, 20),
          ('Foundation', 7, 30),
          ('Framing', 14, 40),
          ('Roofing', 5, 50),
          ('Windows', 3, 60),
          ('Exterior Doors', 2, 70),
          ('Siding', 7, 80),
          ('Plumbing - Rough', 5, 90),
          ('HVAC - Rough', 5, 100),
          ('Electrical - Rough', 5, 110),
          ('Insulation', 3, 120),
          ('Drywall', 7, 130),
          ('Interior Doors', 2, 140),
          ('Trim / Millwork', 5, 150),
          ('Cabinets', 3, 160),
          ('Countertops', 2, 170),
          ('Flooring', 5, 180),
          ('Tile', 4, 190),
          ('Painting', 7, 200),
          ('Plumbing - Finish', 3, 210),
          ('HVAC - Finish', 2, 220),
          ('Electrical - Finish', 3, 230),
          ('Appliances', 1, 240),
          ('Landscaping', 5, 250),
          ('Final Cleanup', 2, 260),
          ('Inspection', 1, 270),
          ('Punchlist', 3, 280)
        ON CONFLICT (budget_category) DO NOTHING;
      `
    },
    {
      name: 'task_dependencies',
      sql: `
        CREATE TABLE IF NOT EXISTS task_dependencies (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          predecessor_task_id VARCHAR(255) NOT NULL,
          successor_task_id VARCHAR(255) NOT NULL,
          dependency_type VARCHAR(2) DEFAULT 'FS',
          lag_days INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          UNIQUE(predecessor_task_id, successor_task_id),
          CHECK (predecessor_task_id != successor_task_id)
        );
        CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor ON task_dependencies(predecessor_task_id);
        CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor ON task_dependencies(successor_task_id);
        CREATE INDEX IF NOT EXISTS idx_task_dependencies_project ON task_dependencies(project_id);
      `
    },
    {
      name: 'company_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS company_settings (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(255),
          company_address TEXT,
          company_phone VARCHAR(50),
          company_email VARCHAR(255),
          company_logo_url TEXT,
          default_payment_terms INTEGER DEFAULT 30,
          default_retainage_percent DECIMAL(5,2) DEFAULT 10.00,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
      `
    },
    {
      name: 'integration_credentials',
      sql: `
        CREATE TABLE IF NOT EXISTS integration_credentials (
          id SERIAL PRIMARY KEY,
          service_name VARCHAR(100) NOT NULL UNIQUE,
          api_key TEXT,
          api_secret TEXT,
          access_token TEXT,
          refresh_token TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
      `
    },
    {
      name: 'payment_reminders',
      sql: `
        CREATE TABLE IF NOT EXISTS payment_reminders (
          id SERIAL PRIMARY KEY,
          payment_app_id INTEGER REFERENCES payment_applications(id) ON DELETE CASCADE,
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          sent_to VARCHAR(255),
          message_type VARCHAR(50) DEFAULT 'sms',
          status VARCHAR(50) DEFAULT 'sent',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
        CREATE INDEX IF NOT EXISTS idx_payment_reminders_payment_app ON payment_reminders(payment_app_id);
        CREATE INDEX IF NOT EXISTS idx_payment_reminders_sent_at ON payment_reminders(sent_at);
      `
    },
    {
      name: 'daily_log_responses',
      sql: `
        CREATE TABLE IF NOT EXISTS daily_log_responses (
          id SERIAL PRIMARY KEY,
          daily_log_id INTEGER REFERENCES daily_logs(id) ON DELETE CASCADE,
          contractor_id INTEGER REFERENCES contractors(id),
          response_text TEXT,
          response_type VARCHAR(50) DEFAULT 'sms',
          received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );
        CREATE INDEX IF NOT EXISTS idx_daily_log_responses_log ON daily_log_responses(daily_log_id);
        CREATE INDEX IF NOT EXISTS idx_daily_log_responses_contractor ON daily_log_responses(contractor_id);
      `
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    try {
      process.stdout.write(`Running ${migration.name}... `);
      
      // Use rpc to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: migration.sql 
      });
      
      if (error) {
        console.log('❌');
        console.error(`  Error: ${error.message}`);
        failCount++;
      } else {
        console.log('✅');
        successCount++;
      }
    } catch (err) {
      console.log('❌');
      console.error(`  Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. You may need to run the SQL manually in Supabase SQL Editor.');
  } else {
    console.log('\n✅ All migrations completed successfully!');
  }
}

runMigration().catch(console.error);
