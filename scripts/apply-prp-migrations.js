#!/usr/bin/env node

/**
 * Apply PRP Migrations via Supabase MCP
 * Runs migrations 060, 061, 062 for PRPs 001-003
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

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

const migrations = [
  '060_create_portfolios_funding_sources.sql',
  '061_enhance_construction_draws.sql',
  '062_create_backlog_items.sql'
];

async function main() {
  log('\n🚀 PRP Database Migrations\n', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  log('\n⚠️  These migrations must be run via Supabase SQL Editor', colors.yellow);
  log('   Navigate to: https://supabase.com/dashboard/project/_/sql\n', colors.cyan);
  
  for (const migration of migrations) {
    const filePath = path.join(__dirname, '..', 'database-migrations', migration);
    
    if (!fs.existsSync(filePath)) {
      log(`❌ Migration file not found: ${migration}`, colors.red);
      continue;
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    log(`\n📄 ${migration}`, colors.green);
    log('─'.repeat(60), colors.cyan);
    log(sql.substring(0, 200) + '...', colors.reset);
    log('─'.repeat(60), colors.cyan);
  }
  
  log('\n✅ Copy each migration above and run in Supabase SQL Editor', colors.green);
  log('   Then proceed with API and UI implementation\n', colors.cyan);
}

main().catch(e => {
  log(`\n❌ Error: ${e.message}`, colors.red);
  process.exit(1);
});
