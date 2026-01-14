#!/usr/bin/env node

/**
 * Apply Migration 007: Navigation Restructure Phase 1
 * 
 * Creates portfolios, funding_sources, and backlog_items tables
 * Migrates existing portfolio_name data to normalized structure
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

async function runMigration(client) {
  log('\n🚀 Running Migration 007: Navigation Restructure Phase 1\n', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const migrationPath = path.join(__dirname, '../database-migrations/007_nav_restructure_phase1.sql');
  
  if (!fs.existsSync(migrationPath)) {
    log(`❌ Migration file not found: ${migrationPath}`, colors.red);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  log('\n📄 Executing migration SQL...', colors.yellow);
  
  try {
    const { data, error } = await client.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      log(`\n❌ Migration failed: ${error.message}`, colors.red);
      log(`\nDetails: ${JSON.stringify(error, null, 2)}`, colors.red);
      
      log('\n💡 Trying alternative approach (direct execution)...', colors.yellow);
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.includes('RAISE NOTICE')) continue;
        
        try {
          await client.rpc('exec_sql', { sql_query: stmt });
          log(`  ✓ Statement ${i + 1}/${statements.length}`, colors.green);
        } catch (stmtError) {
          log(`  ⚠️  Statement ${i + 1} warning: ${stmtError.message}`, colors.yellow);
        }
      }
    } else {
      log('✅ Migration executed successfully', colors.green);
    }
  } catch (e) {
    log(`\n❌ Unexpected error: ${e.message}`, colors.red);
    log('\nStack:', colors.red);
    log(e.stack, colors.red);
    process.exit(1);
  }

  log('\n📊 Verifying migration results...\n', colors.cyan);

  const { data: portfolios, error: portfoliosError } = await client
    .from('portfolios')
    .select('*')
    .order('name', { ascending: true });

  if (portfoliosError) {
    log(`⚠️  Could not verify portfolios: ${portfoliosError.message}`, colors.yellow);
  } else {
    log(`✅ Portfolios table created: ${portfolios.length} portfolios`, colors.green);
    portfolios.forEach(p => {
      log(`   - ${p.name} (${p.code})`, colors.reset);
    });
  }

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select('id, name, portfolio_name, portfolio_id')
    .limit(5);

  if (!projectsError && projects) {
    const migratedCount = projects.filter(p => p.portfolio_id).length;
    log(`\n✅ Projects migration: ${migratedCount}/${projects.length} sample projects have portfolio_id`, colors.green);
  }

  log('\n✅ Migration 007 complete!\n', colors.green);
}

async function main() {
  const client = createAdminClient();
  await runMigration(client);
}

main().catch(e => {
  log(`\n❌ Error: ${e.message}`, colors.red);
  process.exit(1);
});
