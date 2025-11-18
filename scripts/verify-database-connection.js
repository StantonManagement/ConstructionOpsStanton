#!/usr/bin/env node

/**
 * Database Connection Verification Script
 * 
 * This script verifies:
 * 1. Environment variables are properly set
 * 2. Supabase connection works
 * 3. Required tables exist
 * 4. Foreign key relationships are configured
 * 5. Service role key is accessible
 * 
 * Usage: node scripts/verify-database-connection.js
 */

// Try to load dotenv if available (optional - env vars may already be set)
try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config(); // Also check .env in root
} catch (e) {
  // dotenv not installed - that's OK, env vars may be set already
}

const { createClient } = require('@supabase/supabase-js');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(message, colors.green);
}

function logError(message) {
  log(message, colors.red);
}

function logWarning(message) {
  log(message, colors.yellow);
}

function logInfo(message) {
  log(message, colors.cyan);
}

// Required tables and their key columns
const REQUIRED_TABLES = [
  { name: 'projects', keyColumn: 'id' },
  { name: 'contractors', keyColumn: 'id' },
  { name: 'contracts', keyColumn: 'id' },
  { name: 'payment_applications', keyColumn: 'id' },
  { name: 'project_contractors', keyColumn: 'id' },
  { name: 'user_role', keyColumn: 'user_id' },
];

// Required foreign key relationships
const REQUIRED_FOREIGN_KEYS = [
  {
    table: 'payment_applications',
    column: 'project_id',
    referencesTable: 'projects',
    referencesColumn: 'id',
  },
  {
    table: 'payment_applications',
    column: 'contractor_id',
    referencesTable: 'contractors',
    referencesColumn: 'id',
  },
  {
    table: 'project_contractors',
    column: 'project_id',
    referencesTable: 'projects',
    referencesColumn: 'id',
  },
  {
    table: 'project_contractors',
    column: 'contractor_id',
    referencesTable: 'contractors',
    referencesColumn: 'id',
  },
];

async function verifyEnvironmentVariables() {
  logInfo('\n📋 Step 1: Verifying Environment Variables...\n');

  const requiredVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  let allPresent = true;

  for (const [name, value] of Object.entries(requiredVars)) {
    if (value) {
      logSuccess(`✅ ${name}: Set`);
      if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
        log(`   Value: ${value}`);
      } else if (name.includes('KEY')) {
        log(`   Value: ${value.substring(0, 20)}...${value.substring(value.length - 10)}`);
      }
    } else {
      logError(`❌ ${name}: MISSING`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    logError('\n⚠️  Some environment variables are missing!');
    logError('Please ensure your .env file contains all required variables.');
    logError('See ENV_SETUP.md for details.\n');
    return false;
  }

  logSuccess('\n✅ All required environment variables are present!\n');
  return true;
}

async function verifySupabaseConnection() {
  logInfo('🔌 Step 2: Testing Supabase Connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logError('❌ Cannot test connection - missing environment variables');
    return { anonClient: null, adminClient: null, success: false };
  }

  // Test anonymous client
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await anonClient.from('projects').select('count').limit(1);
    
    if (error) {
      // Check if it's a "table doesn't exist" error vs connection error
      if (error.message.includes('does not exist') || error.code === '42P01') {
        logWarning('⚠️  Connection works, but tables may not exist yet');
        logInfo('   This is OK if you need to run migrations.\n');
        return { anonClient, adminClient: null, success: true, tablesExist: false };
      } else {
        logError(`❌ Connection error: ${error.message}`);
        return { anonClient: null, adminClient: null, success: false };
      }
    } else {
      logSuccess('✅ Anonymous client connection: OK');
    }
  } catch (error) {
    logError(`❌ Connection failed: ${error.message}`);
    return { anonClient: null, adminClient: null, success: false };
  }

  // Test admin client if service key is available
  let adminClient = null;
  if (supabaseServiceKey) {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    try {
      // Test admin access
      const { data, error } = await adminClient.from('projects').select('count').limit(1);
      
      if (error && !error.message.includes('does not exist')) {
        logWarning(`⚠️  Admin client connection issue: ${error.message}`);
      } else {
        logSuccess('✅ Service role client connection: OK');
        logInfo('   Service role key is properly configured for relationship queries.\n');
      }
    } catch (error) {
      logWarning(`⚠️  Admin client error: ${error.message}`);
    }
  } else {
    logWarning('⚠️  Service role key not available - relationship queries may fail');
    logWarning('   Set SUPABASE_SERVICE_ROLE_KEY in your .env file.\n');
  }

  return { anonClient, adminClient, success: true, tablesExist: true };
}

async function verifyDatabaseSchema(clients) {
  logInfo('📊 Step 3: Verifying Database Schema...\n');

  const { anonClient, adminClient } = clients;
  
  if (!anonClient) {
    logError('❌ Cannot verify schema - no database connection');
    return false;
  }

  const client = adminClient || anonClient; // Prefer admin client for schema checks

  let allTablesExist = true;
  const existingTables = [];

  // Check required tables
  for (const table of REQUIRED_TABLES) {
    try {
      const { data, error } = await client
        .from(table.name)
        .select(table.keyColumn)
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          logError(`❌ Table '${table.name}': MISSING`);
          allTablesExist = false;
        } else {
          logWarning(`⚠️  Table '${table.name}': Error - ${error.message}`);
        }
      } else {
        logSuccess(`✅ Table '${table.name}': EXISTS`);
        existingTables.push(table.name);
      }
    } catch (error) {
      logError(`❌ Table '${table.name}': Error - ${error.message}`);
      allTablesExist = false;
    }
  }

  if (!allTablesExist) {
    logWarning('\n⚠️  Some required tables are missing.');
    logInfo('   You may need to run database migrations.');
    logInfo('   See database-migrations.sql and migrate-to-auth-users.sql\n');
  } else {
    logSuccess('\n✅ All required tables exist!\n');
  }

  return { allTablesExist, existingTables };
}

async function verifyForeignKeys(clients, existingTables) {
  logInfo('🔗 Step 4: Verifying Foreign Key Relationships...\n');

  const { adminClient } = clients;

  if (!adminClient) {
    logWarning('⚠️  Cannot verify foreign keys - service role key not available');
    logWarning('   Foreign key verification requires SUPABASE_SERVICE_ROLE_KEY\n');
    return false;
  }

  // Check foreign keys using SQL query
  let allKeysPresent = true;

  for (const fk of REQUIRED_FOREIGN_KEYS) {
    // Skip if referenced table doesn't exist
    if (!existingTables.includes(fk.referencesTable)) {
      logWarning(`⚠️  Skipping FK check: ${fk.table}.${fk.column} -> ${fk.referencesTable}.${fk.referencesColumn} (referenced table missing)`);
      continue;
    }

    if (!existingTables.includes(fk.table)) {
      logWarning(`⚠️  Skipping FK check: ${fk.table}.${fk.column} (table missing)`);
      continue;
    }

    try {
      // Test foreign key by trying to query with relationship syntax
      // If the relationship exists, this query will work; if not, it will fail with relationship error
      const { data, error } = await adminClient
        .from(fk.table)
        .select(`${fk.column}, ${fk.referencesTable}:${fk.referencesTable}(${fk.referencesColumn})`)
        .limit(1);

      if (error) {
        if (error.message.includes('relationship') || error.message.includes('Could not find')) {
          logError(`❌ FK ${fk.table}.${fk.column} -> ${fk.referencesTable}.${fk.referencesColumn}: MISSING`);
          logWarning('   Run scripts/fix-payment-app-foreign-keys.sql if needed');
          allKeysPresent = false;
        } else {
          // Other error - might be permissions or other issue
          logWarning(`⚠️  Could not verify FK ${fk.table}.${fk.column}: ${error.message}`);
        }
      } else {
        logSuccess(`✅ FK ${fk.table}.${fk.column} -> ${fk.referencesTable}.${fk.referencesColumn}: OK`);
      }
    } catch (error) {
      logWarning(`⚠️  Could not verify FK ${fk.table}.${fk.column}: ${error.message}`);
    }
  }

  if (allKeysPresent) {
    logSuccess('\n✅ Foreign key relationships are properly configured!\n');
  } else {
    logWarning('\n⚠️  Some foreign key relationships are missing.');
    logInfo('   Run scripts/verify-foreign-keys.sql in Supabase SQL Editor');
    logInfo('   Then run scripts/fix-payment-app-foreign-keys.sql if needed\n');
  }

  return allKeysPresent;
}

async function main() {
  logInfo('🚀 Database Connection Verification\n');
  logInfo('='.repeat(50) + '\n');

  // Step 1: Verify environment variables
  const envVarsOk = await verifyEnvironmentVariables();
  if (!envVarsOk) {
    process.exit(1);
  }

  // Step 2: Test connection
  const clients = await verifySupabaseConnection();
  if (!clients.success) {
    logError('\n❌ Connection verification failed. Please check your environment variables.');
    process.exit(1);
  }

  // Step 3: Verify schema
  const schemaResult = await verifyDatabaseSchema(clients);
  
  // Step 4: Verify foreign keys (only if tables exist)
  if (schemaResult.allTablesExist) {
    await verifyForeignKeys(clients, schemaResult.existingTables);
  }

  // Final summary
  logInfo('\n' + '='.repeat(50));
  logInfo('📋 Verification Summary\n');
  
  if (envVarsOk && clients.success) {
    if (schemaResult.allTablesExist) {
      logSuccess('✅ Database connection: OK');
      logSuccess('✅ Environment variables: OK');
      logSuccess('✅ Database schema: OK');
      logInfo('\n🎉 Your database is ready to use!\n');
      process.exit(0);
    } else {
      logSuccess('✅ Database connection: OK');
      logSuccess('✅ Environment variables: OK');
      logWarning('⚠️  Database schema: INCOMPLETE');
      logInfo('\n📝 Next steps:');
      logInfo('   1. Run database-migrations.sql in Supabase SQL Editor');
      logInfo('   2. Run migrate-to-auth-users.sql for authentication setup');
      logInfo('   3. Run this verification script again\n');
      process.exit(0);
    }
  } else {
    logError('❌ Verification incomplete - please fix the errors above\n');
    process.exit(1);
  }
}

// Run the verification
main().catch((error) => {
  logError(`\n❌ Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
