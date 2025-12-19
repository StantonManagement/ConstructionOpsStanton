const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables referenced in API code
const EXPECTED_TABLES = [
  // Core tables
  'users',
  'user_role',
  'projects',
  'contractors',
  'contracts',
  'project_contractors',
  'project_line_items',
  
  // Budget & Financial
  'property_budgets',
  'owner_entities',
  'loans',
  'loan_draws',
  
  // Schedule
  'project_schedules',
  'schedule_tasks',
  'schedule_defaults',
  'task_dependencies',
  
  // Payment Applications
  'payment_applications',
  'payment_line_item_progress',
  'payment_documents',
  'lien_waivers',
  
  // Change Orders
  'change_orders',
  
  // Punch Lists
  'punch_lists',
  'punch_list_items',
  'punch_list_comments',
  'punch_list_photos',
  'punch_list_categories',
  
  // Photos & Documents
  'photos',
  'project_documents',
  
  // Warranties
  'warranties',
  'warranty_claims',
  'warranty_types',
  
  // Settings & Notifications
  'company_settings',
  'user_preferences',
  'notifications',
  'integration_credentials',
  'payment_reminders',
  
  // Permissions (if used)
  'permissions',
  'role_permissions',
  
  // SMS & Communication
  'sms_conversations',
  'sms_messages',
  
  // Daily Logs
  'daily_logs',
  'daily_log_responses'
];

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (error) {
      // Check if error is about table not existing
      if (error.message.includes('does not exist') || error.code === '42P01') {
        return { exists: false, error: error.message };
      }
      // Other errors (like RLS) mean table exists
      return { exists: true, error: null };
    }
    
    return { exists: true, error: null };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 Checking all database tables...\n');
  
  const results = {
    existing: [],
    missing: [],
    errors: []
  };
  
  for (const tableName of EXPECTED_TABLES) {
    process.stdout.write(`Checking ${tableName}... `);
    const result = await checkTableExists(tableName);
    
    if (result.exists) {
      console.log('✅');
      results.existing.push(tableName);
    } else {
      console.log('❌ MISSING');
      results.missing.push({ table: tableName, error: result.error });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Existing tables: ${results.existing.length}`);
  console.log(`❌ Missing tables: ${results.missing.length}`);
  
  if (results.missing.length > 0) {
    console.log('\n🚨 MISSING TABLES:');
    results.missing.forEach(({ table, error }) => {
      console.log(`  - ${table}`);
      if (error) console.log(`    Error: ${error}`);
    });
    
    // Write to file
    const report = {
      timestamp: new Date().toISOString(),
      existing: results.existing,
      missing: results.missing.map(m => m.table),
      details: results.missing
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../docs/MISSING_TABLES_REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Full report saved to: docs/MISSING_TABLES_REPORT.json');
  } else {
    console.log('\n✅ All expected tables exist!');
  }
}

main().catch(console.error);
