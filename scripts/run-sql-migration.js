#!/usr/bin/env node

/**
 * Run SQL Migration via Supabase SQL Editor API
 * 
 * This script reads a SQL file and executes it using Supabase's management API
 * Since we can't use exec_sql RPC, we'll execute the migration manually via client methods
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
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

function createAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    log('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', colors.red);
    process.exit(1);
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function runMigrationManually(client) {
  log('\n🚀 Running Migration 007 Manually\n', colors.cyan);
  log('='.repeat(60), colors.cyan);

  try {
    // Step 1: Create portfolios from existing data
    log('\n📊 Step 1: Analyzing existing portfolio data...', colors.yellow);
    
    const { data: projects, error: projectsError } = await client
      .from('projects')
      .select('portfolio_name')
      .not('portfolio_name', 'is', null);

    if (projectsError) {
      log(`❌ Error querying projects: ${projectsError.message}`, colors.red);
      return;
    }

    const uniquePortfolios = [...new Set(projects.map(p => p.portfolio_name).filter(Boolean))];
    log(`   Found ${uniquePortfolios.length} unique portfolios`, colors.green);

    // Step 2: Create portfolios (we'll do this via direct table insert after tables exist)
    log('\n⚠️  Note: Tables must be created via Supabase SQL Editor first', colors.yellow);
    log('   Please run the SQL from database-migrations/007_nav_restructure_phase1.sql', colors.yellow);
    log('   in your Supabase SQL Editor at:', colors.yellow);
    log('   https://supabase.com/dashboard/project/_/sql', colors.cyan);
    
    log('\n📋 Portfolios to create:', colors.cyan);
    uniquePortfolios.forEach(name => {
      const code = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      log(`   - ${name} (code: ${code})`, colors.green);
    });

    log('\n✅ Analysis complete. Please run the SQL migration manually.', colors.green);
    
  } catch (e) {
    log(`\n❌ Error: ${e.message}`, colors.red);
    process.exit(1);
  }
}

async function main() {
  const client = createAdminClient();
  await runMigrationManually(client);
}

main().catch(e => {
  log(`\n❌ Error: ${e.message}`, colors.red);
  process.exit(1);
});
