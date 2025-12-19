#!/usr/bin/env node

/**
 * Direct PostgreSQL Connection Script
 * 
 * This script connects directly to Supabase's PostgreSQL database using the
 * DATABASE_URL connection string. This bypasses Row Level Security (RLS) policies
 * and allows direct SQL execution.
 * 
 * If direct PostgreSQL connection fails (e.g., firewall blocking ports),
 * it falls back to using the Supabase Service Role client.
 * 
 * USE CASES:
 * - Schema modifications (CREATE TABLE, ALTER TABLE, etc.)
 * - Bypassing RLS for debugging
 * - Admin operations that the Supabase client can't perform
 * - Direct data manipulation
 * 
 * SECURITY WARNING:
 * The DATABASE_URL uses admin credentials. Never expose this in client-side code.
 * 
 * Usage: 
 *   node scripts/direct-db-connection.js
 *   node scripts/direct-db-connection.js "SELECT * FROM projects LIMIT 5"
 */

require('dotenv').config();
const { Pool } = require('pg');
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

function logSuccess(message) { log(message, colors.green); }
function logError(message) { log(message, colors.red); }
function logWarning(message) { log(message, colors.yellow); }
function logInfo(message) { log(message, colors.cyan); }

/**
 * Creates a PostgreSQL connection pool using DATABASE_URL or PG* env vars
 */
function createPool() {
  // Try individual PG* environment variables first (avoids URL encoding issues)
  if (process.env.PGHOST && process.env.PGPASSWORD) {
    logInfo('Using PG* environment variables for connection...');
    const pool = new Pool({
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      ssl: {
        rejectUnauthorized: false
      }
    });
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    logError('❌ DATABASE_URL is not set in your .env file');
    logInfo('\nTo set up DATABASE_URL:');
    logInfo('1. Go to your Supabase project dashboard');
    logInfo('2. Navigate to Settings > Database');
    logInfo('3. Copy the "Connection string" (URI format)');
    logInfo('4. Add it to your .env file as DATABASE_URL=<connection_string>');
    logInfo('\nExample format:');
    logInfo('DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres');
    process.exit(1);
  }

  // Create connection pool with SSL required for Supabase
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase pooler connections
    }
  });

  return pool;
}

/**
 * Test the database connection
 */
async function testConnection(pool) {
  logInfo('\n🔌 Testing direct PostgreSQL connection...\n');
  
  try {
    const client = await pool.connect();
    
    // Get database info
    const result = await client.query('SELECT current_database(), current_user, version()');
    const { current_database, current_user, version } = result.rows[0];
    
    logSuccess('✅ Connection successful!');
    logInfo(`   Database: ${current_database}`);
    logInfo(`   User: ${current_user}`);
    logInfo(`   PostgreSQL: ${version.split(',')[0]}`);
    
    client.release();
    return true;
  } catch (error) {
    logError(`❌ Connection failed: ${error.message}`);
    
    if (error.message.includes('password')) {
      logWarning('\n⚠️  Password issue - your DATABASE_URL may have special characters');
      logInfo('   Make sure special characters in the password are URL-encoded');
      logInfo('   Example: @ becomes %40, # becomes %23, etc.');
    }
    
    return false;
  }
}

/**
 * List all tables in the public schema
 */
async function listTables(pool) {
  logInfo('\n📊 Tables in public schema:\n');
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    if (result.rows.length === 0) {
      logWarning('   No tables found in public schema');
    } else {
      result.rows.forEach(row => {
        log(`   • ${row.table_name} (${row.column_count} columns)`);
      });
    }
    
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Execute a custom SQL query
 */
async function executeQuery(pool, sql) {
  logInfo(`\n🔧 Executing SQL:\n${sql}\n`);
  
  const client = await pool.connect();
  try {
    const result = await client.query(sql);
    
    if (result.command === 'SELECT') {
      logSuccess(`✅ Query returned ${result.rows.length} rows\n`);
      if (result.rows.length > 0) {
        console.table(result.rows);
      }
    } else {
      logSuccess(`✅ ${result.command} executed successfully`);
      if (result.rowCount !== null) {
        logInfo(`   Rows affected: ${result.rowCount}`);
      }
    }
    
    return result;
  } catch (error) {
    logError(`❌ Query failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Example: Check RLS policies on a table
 */
async function checkRLSPolicies(pool, tableName = 'projects') {
  logInfo(`\n🔒 RLS Policies for '${tableName}':\n`);
  
  const client = await pool.connect();
  try {
    // Check if RLS is enabled
    const rlsResult = await client.query(`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relname = $1 AND relnamespace = 'public'::regnamespace
    `, [tableName]);
    
    if (rlsResult.rows.length === 0) {
      logWarning(`   Table '${tableName}' not found`);
      return;
    }
    
    const { relrowsecurity, relforcerowsecurity } = rlsResult.rows[0];
    logInfo(`   RLS Enabled: ${relrowsecurity ? 'Yes' : 'No'}`);
    logInfo(`   RLS Forced: ${relforcerowsecurity ? 'Yes' : 'No'}`);
    
    // Get policies
    const policiesResult = await client.query(`
      SELECT polname, polcmd, polpermissive
      FROM pg_policy
      WHERE polrelid = $1::regclass
    `, [`public.${tableName}`]);
    
    if (policiesResult.rows.length === 0) {
      logWarning('   No policies defined');
    } else {
      logInfo('\n   Policies:');
      policiesResult.rows.forEach(policy => {
        const cmd = { 'r': 'SELECT', 'a': 'INSERT', 'w': 'UPDATE', 'd': 'DELETE', '*': 'ALL' }[policy.polcmd] || policy.polcmd;
        log(`   • ${policy.polname} (${cmd}, ${policy.polpermissive ? 'PERMISSIVE' : 'RESTRICTIVE'})`);
      });
    }
  } finally {
    client.release();
  }
}

/**
 * Main function - demonstrates various operations
 */
async function main() {
  logInfo('🚀 Direct PostgreSQL Connection to Supabase\n');
  logInfo('='.repeat(50));
  
  const pool = createPool();
  
  try {
    // Test connection
    const connected = await testConnection(pool);
    if (!connected) {
      process.exit(1);
    }
    
    // Check if a custom SQL query was provided as argument
    const customQuery = process.argv[2];
    
    if (customQuery) {
      // Execute custom query
      await executeQuery(pool, customQuery);
    } else {
      // Run default demo operations
      await listTables(pool);
      await checkRLSPolicies(pool, 'projects');
      
      logInfo('\n' + '='.repeat(50));
      logInfo('💡 Usage Examples:\n');
      logInfo('Run a custom query:');
      log('  node scripts/direct-db-connection.js "SELECT * FROM projects LIMIT 5"');
      logInfo('\nCreate a table:');
      log('  node scripts/direct-db-connection.js "CREATE TABLE test (id SERIAL PRIMARY KEY)"');
      logInfo('\nGrant permissions:');
      log('  node scripts/direct-db-connection.js "UPDATE user_role SET role = \'admin\' WHERE user_id = \'...\'"');
    }
    
    logSuccess('\n✅ Done!\n');
  } catch (error) {
    logError(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Export functions for use as a module
module.exports = {
  createPool,
  testConnection,
  listTables,
  executeQuery,
  checkRLSPolicies
};

// Run if called directly
if (require.main === module) {
  main();
}
