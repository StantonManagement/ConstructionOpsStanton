#!/usr/bin/env node

/**
 * Verify Migration 007
 * 
 * Checks that portfolios, funding_sources, and backlog_items tables exist
 * and that data was migrated correctly
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

async function verifyMigration(client) {
  log('\n🔍 Verifying Migration 007\n', colors.cyan);
  log('='.repeat(60), colors.cyan);

  let allPassed = true;

  // Check portfolios table
  log('\n1️⃣  Checking portfolios table...', colors.yellow);
  const { data: portfolios, error: portfoliosError } = await client
    .from('portfolios')
    .select('*')
    .order('name', { ascending: true });

  if (portfoliosError) {
    log(`   ❌ FAILED: ${portfoliosError.message}`, colors.red);
    allPassed = false;
  } else {
    log(`   ✅ PASSED: ${portfolios.length} portfolios found`, colors.green);
    portfolios.forEach(p => {
      log(`      - ${p.name} (${p.code})`, colors.reset);
    });
  }

  // Check funding_sources table
  log('\n2️⃣  Checking funding_sources table...', colors.yellow);
  const { data: fundingSources, error: fundingError } = await client
    .from('funding_sources')
    .select('*');

  if (fundingError) {
    log(`   ❌ FAILED: ${fundingError.message}`, colors.red);
    allPassed = false;
  } else {
    log(`   ✅ PASSED: Table exists (${fundingSources.length} funding sources)`, colors.green);
  }

  // Check backlog_items table
  log('\n3️⃣  Checking backlog_items table...', colors.yellow);
  const { data: backlogItems, error: backlogError } = await client
    .from('backlog_items')
    .select('*');

  if (backlogError) {
    log(`   ❌ FAILED: ${backlogError.message}`, colors.red);
    allPassed = false;
  } else {
    log(`   ✅ PASSED: Table exists (${backlogItems.length} backlog items)`, colors.green);
  }

  // Check projects.portfolio_id column
  log('\n4️⃣  Checking projects.portfolio_id migration...', colors.yellow);
  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select('id, name, portfolio_name, portfolio_id');

  if (projectsError) {
    log(`   ❌ FAILED: ${projectsError.message}`, colors.red);
    allPassed = false;
  } else {
    const migratedCount = projects.filter(p => p.portfolio_id).length;
    const totalCount = projects.length;
    const nullPortfolioCount = projects.filter(p => !p.portfolio_name).length;
    
    log(`   ✅ PASSED: Column exists`, colors.green);
    log(`      - ${migratedCount}/${totalCount} projects have portfolio_id`, colors.reset);
    log(`      - ${nullPortfolioCount} projects had null portfolio_name (expected)`, colors.reset);
    
    if (migratedCount > 0) {
      log(`\n   Sample migrated projects:`, colors.cyan);
      projects.filter(p => p.portfolio_id).slice(0, 3).forEach(p => {
        log(`      - ${p.name} → portfolio_id: ${p.portfolio_id}`, colors.reset);
      });
    }
  }

  // Check construction_draws.funding_source_id column
  log('\n5️⃣  Checking construction_draws.funding_source_id...', colors.yellow);
  const { data: draws, error: drawsError } = await client
    .from('construction_draws')
    .select('id, funding_source_id')
    .limit(1);

  if (drawsError) {
    log(`   ❌ FAILED: ${drawsError.message}`, colors.red);
    allPassed = false;
  } else {
    log(`   ✅ PASSED: Column exists`, colors.green);
  }

  // Check portfolio_summary view
  log('\n6️⃣  Checking portfolio_summary view...', colors.yellow);
  const { data: summary, error: summaryError } = await client
    .from('portfolio_summary')
    .select('*');

  if (summaryError) {
    log(`   ❌ FAILED: ${summaryError.message}`, colors.red);
    allPassed = false;
  } else {
    log(`   ✅ PASSED: View exists`, colors.green);
    if (summary.length > 0) {
      log(`\n   Portfolio Summary:`, colors.cyan);
      summary.forEach(p => {
        log(`      - ${p.name}: ${p.project_count} projects, $${p.total_budget || 0} budget`, colors.reset);
      });
    }
  }

  // Final result
  log('\n' + '='.repeat(60), colors.cyan);
  if (allPassed) {
    log('\n✅ ALL CHECKS PASSED - Migration 007 successful!\n', colors.green);
  } else {
    log('\n❌ SOME CHECKS FAILED - Please review errors above\n', colors.red);
    process.exit(1);
  }
}

async function main() {
  const client = createAdminClient();
  await verifyMigration(client);
}

main().catch(e => {
  log(`\n❌ Error: ${e.message}`, colors.red);
  process.exit(1);
});
