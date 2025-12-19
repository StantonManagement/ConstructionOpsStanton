#!/usr/bin/env node

/**
 * Admin Database Client Script
 * 
 * Uses the Supabase Service Role Key to bypass RLS and perform admin operations.
 * This works even when direct PostgreSQL connections are blocked by firewalls.
 * 
 * Usage:
 *   node scripts/admin-db-client.js                    # List tables and test connection
 *   node scripts/admin-db-client.js list               # List all tables
 *   node scripts/admin-db-client.js query projects     # Query a table
 *   node scripts/admin-db-client.js count projects     # Count rows in a table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}
function logSuccess(message) { log(message, colors.green); }
function logError(message) { log(message, colors.red); }
function logWarning(message) { log(message, colors.yellow); }
function logInfo(message) { log(message, colors.cyan); }

/**
 * Create admin Supabase client with Service Role Key (bypasses RLS)
 */
function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    logError('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Test connection
 */
async function testConnection(client) {
  logInfo('\n🔌 Testing Supabase Admin Connection...\n');
  
  try {
    const { data, error } = await client.from('projects').select('id').limit(1);
    
    if (error) {
      logError(`❌ Connection error: ${error.message}`);
      return false;
    }
    
    logSuccess('✅ Connection successful!');
    logInfo(`   Using Service Role Key (RLS bypassed)`);
    return true;
  } catch (error) {
    logError(`❌ Connection failed: ${error.message}`);
    return false;
  }
}

/**
 * List known tables
 */
async function listTables(client) {
  logInfo('\n📊 Checking known tables:\n');
  
  const tables = [
    'projects', 'contractors', 'contracts', 'payment_applications',
    'project_contractors', 'user_role', 'schedule_tasks', 'daily_reports',
    'photos', 'rfis', 'submittals', 'change_orders'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          log(`   ⚪ ${table}: not found`);
        } else {
          logWarning(`   ⚠️  ${table}: ${error.message}`);
        }
      } else {
        logSuccess(`   ✅ ${table}: ${count} rows`);
      }
    } catch (e) {
      logError(`   ❌ ${table}: ${e.message}`);
    }
  }
}

/**
 * Query a table
 */
async function queryTable(client, tableName, limit = 10) {
  logInfo(`\n🔍 Querying '${tableName}' (limit ${limit}):\n`);
  
  try {
    const { data, error } = await client.from(tableName).select('*').limit(limit);
    
    if (error) {
      logError(`❌ Query error: ${error.message}`);
      return;
    }
    
    if (data.length === 0) {
      logWarning('   No rows found');
    } else {
      console.table(data);
    }
  } catch (e) {
    logError(`❌ Error: ${e.message}`);
  }
}

/**
 * Count rows in a table
 */
async function countTable(client, tableName) {
  try {
    const { count, error } = await client.from(tableName).select('*', { count: 'exact', head: true });
    
    if (error) {
      logError(`❌ Count error: ${error.message}`);
      return;
    }
    
    logSuccess(`✅ ${tableName}: ${count} rows`);
  } catch (e) {
    logError(`❌ Error: ${e.message}`);
  }
}

/**
 * Main
 */
async function main() {
  logInfo('🚀 Supabase Admin Client (Service Role)\n');
  logInfo('='.repeat(50));
  
  const client = createAdminClient();
  const connected = await testConnection(client);
  
  if (!connected) {
    process.exit(1);
  }
  
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'list':
      await listTables(client);
      break;
    case 'query':
      if (!arg) {
        logError('Usage: node scripts/admin-db-client.js query <table_name>');
        process.exit(1);
      }
      await queryTable(client, arg);
      break;
    case 'count':
      if (!arg) {
        logError('Usage: node scripts/admin-db-client.js count <table_name>');
        process.exit(1);
      }
      await countTable(client, arg);
      break;
    default:
      await listTables(client);
      logInfo('\n💡 Commands:');
      log('  node scripts/admin-db-client.js list');
      log('  node scripts/admin-db-client.js query <table>');
      log('  node scripts/admin-db-client.js count <table>');
  }
  
  logSuccess('\n✅ Done!\n');
}

main().catch(e => {
  logError(`\n❌ Error: ${e.message}`);
  process.exit(1);
});
