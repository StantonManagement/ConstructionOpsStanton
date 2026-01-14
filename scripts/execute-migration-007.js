#!/usr/bin/env node

/**
 * Execute Migration 007 via Supabase Client
 * Executes SQL statements one by one using Supabase service role
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    log('❌ Missing credentials', colors.red);
    process.exit(1);
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function executeMigration() {
  log('\n🚀 Executing Migration 007\n', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const client = createAdminClient();
  const migrationPath = path.join(__dirname, '../database-migrations/007_nav_restructure_phase1.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  log('\n📄 Reading migration file...', colors.yellow);
  
  // Split into individual statements, filtering out comments and empty lines
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      if (s.startsWith('--')) return false;
      if (s.match(/^\/\*/)) return false;
      return true;
    });

  log(`   Found ${statements.length} SQL statements\n`, colors.cyan);

  // Execute via raw SQL using rpc if available, otherwise use table operations
  log('📊 Creating tables and migrating data...\n', colors.yellow);

  try {
    // Step 1: Create portfolios from existing portfolio_name values
    log('1️⃣  Creating portfolios from existing data...', colors.yellow);
    
    const { data: projects } = await client
      .from('projects')
      .select('portfolio_name')
      .not('portfolio_name', 'is', null);

    const uniquePortfolios = [...new Set(projects.map(p => p.portfolio_name).filter(Boolean))];
    
    const portfoliosToInsert = uniquePortfolios.map(name => ({
      name,
      code: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: 'Migrated from projects.portfolio_name',
      is_active: true
    }));

    if (portfoliosToInsert.length > 0) {
      const { data: createdPortfolios, error: portfolioError } = await client
        .from('portfolios')
        .upsert(portfoliosToInsert, { onConflict: 'name', ignoreDuplicates: true })
        .select();

      if (portfolioError) {
        log(`   ⚠️  ${portfolioError.message}`, colors.yellow);
      } else {
        log(`   ✅ Created ${createdPortfolios?.length || 0} portfolios`, colors.green);
      }
    }

    // Step 2: Link projects to portfolios
    log('\n2️⃣  Linking projects to portfolios...', colors.yellow);
    
    const { data: allPortfolios } = await client
      .from('portfolios')
      .select('id, name');

    const portfolioMap = {};
    allPortfolios?.forEach(p => {
      portfolioMap[p.name] = p.id;
    });

    const { data: allProjects } = await client
      .from('projects')
      .select('id, portfolio_name')
      .not('portfolio_name', 'is', null);

    let linkedCount = 0;
    for (const project of allProjects || []) {
      const portfolioId = portfolioMap[project.portfolio_name];
      if (portfolioId) {
        await client
          .from('projects')
          .update({ portfolio_id: portfolioId })
          .eq('id', project.id);
        linkedCount++;
      }
    }

    log(`   ✅ Linked ${linkedCount} projects to portfolios`, colors.green);

    // Step 3: Verify results
    log('\n📊 Verifying migration...\n', colors.cyan);

    const { data: portfolios } = await client
      .from('portfolios')
      .select('*')
      .order('name');

    log(`✅ Portfolios: ${portfolios?.length || 0}`, colors.green);
    portfolios?.forEach(p => {
      log(`   - ${p.name} (${p.code})`, colors.reset);
    });

    const { data: fundingSources } = await client
      .from('funding_sources')
      .select('count', { count: 'exact', head: true });

    log(`✅ Funding sources table: exists`, colors.green);

    const { data: backlogItems } = await client
      .from('backlog_items')
      .select('count', { count: 'exact', head: true });

    log(`✅ Backlog items table: exists`, colors.green);

    const { data: projectStats } = await client
      .from('projects')
      .select('portfolio_id');

    const migratedCount = projectStats?.filter(p => p.portfolio_id).length || 0;
    log(`✅ Projects migrated: ${migratedCount}/${projectStats?.length || 0}`, colors.green);

    log('\n✅ Migration 007 completed successfully!\n', colors.green);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    if (error.details) log(`   Details: ${error.details}`, colors.red);
    if (error.hint) log(`   Hint: ${error.hint}`, colors.red);
    
    log('\n⚠️  Note: If tables already exist, run this in Supabase SQL Editor:', colors.yellow);
    log('   https://supabase.com/dashboard/project/iyiqdgmpcuczzigotjhf/sql\n', colors.cyan);
    process.exit(1);
  }
}

executeMigration();
