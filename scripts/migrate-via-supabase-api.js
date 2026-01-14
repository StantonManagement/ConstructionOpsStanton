#!/usr/bin/env node

/**
 * Execute Migration 007 via Supabase REST API
 * Uses the SQL execution endpoint directly
 */

require('dotenv').config();
const https = require('https');

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

const fs = require('fs');
const path = require('path');

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ sql_query: sql }));
    req.end();
  });
}

async function runMigration() {
  log('\n🚀 Executing Migration 007\n', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const migrationPath = path.join(__dirname, '../database-migrations/007_nav_restructure_phase1.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  log('\n📄 Executing migration SQL via Supabase API...', colors.yellow);

  try {
    await executeSQL(sql);
    log('✅ Migration executed!', colors.green);
  } catch (error) {
    log(`⚠️  Direct execution failed: ${error.message}`, colors.yellow);
    log('\n📋 Please run the SQL manually in Supabase SQL Editor:', colors.cyan);
    log('   https://supabase.com/dashboard/project/iyiqdgmpcuczzigotjhf/sql\n', colors.cyan);
    log('   SQL file: database-migrations/007_nav_restructure_phase1.sql\n', colors.yellow);
    process.exit(1);
  }

  log('\n✅ Migration 007 complete!\n', colors.green);
  log('Run verification: node scripts/verify-migration-007.js\n', colors.cyan);
}

runMigration();
