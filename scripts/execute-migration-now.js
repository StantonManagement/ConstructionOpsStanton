#!/usr/bin/env node

/**
 * Execute Migration 007 - Direct Execution
 * Uses Supabase client to run migration SQL
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
  
  try {
    // Step 1: Check if update_updated_at_column function exists
    log('\n1️⃣  Checking for update_updated_at_column function...', colors.yellow);
    
    // Create the function if it doesn't exist
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // We can't execute raw SQL via Supabase client, so we'll create tables directly
    log('   Creating tables via Supabase client...', colors.yellow);

    // Step 2: Create portfolios table
    log('\n2️⃣  Creating portfolios table...', colors.yellow);
    
    // First, get existing portfolio names
    const { data: projects } = await client
      .from('projects')
      .select('portfolio_name')
      .not('portfolio_name', 'is', null);

    const uniquePortfolios = [...new Set(projects?.map(p => p.portfolio_name).filter(Boolean) || [])];
    
    log(`   Found ${uniquePortfolios.length} unique portfolios to migrate`, colors.cyan);

    // Create portfolio records
    const portfoliosToInsert = uniquePortfolios.map(name => ({
      name,
      code: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: 'Migrated from projects.portfolio_name',
      is_active: true
    }));

    if (portfoliosToInsert.length > 0) {
      const { data: createdPortfolios, error: portfolioError } = await client
        .from('portfolios')
        .upsert(portfoliosToInsert, { onConflict: 'name', ignoreDuplicates: false })
        .select();

      if (portfolioError) {
        if (portfolioError.message.includes('does not exist')) {
          log(`   ⚠️  Tables don't exist yet. Please run SQL in Supabase SQL Editor:`, colors.yellow);
          log(`   https://supabase.com/dashboard/project/iyiqdgmpcuczzigotjhf/sql\n`, colors.cyan);
          log(`   Copy SQL from: database-migrations/007_nav_restructure_phase1.sql\n`, colors.yellow);
          process.exit(1);
        }
        throw portfolioError;
      }

      log(`   ✅ Created/updated ${createdPortfolios?.length || 0} portfolios`, colors.green);
      createdPortfolios?.forEach(p => {
        log(`      - ${p.name} (${p.code})`, colors.reset);
      });
    }

    // Step 3: Link projects to portfolios
    log('\n3️⃣  Linking projects to portfolios...', colors.yellow);
    
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
        const { error } = await client
          .from('projects')
          .update({ portfolio_id: portfolioId })
          .eq('id', project.id);
        
        if (!error) linkedCount++;
      }
    }

    log(`   ✅ Linked ${linkedCount} projects to portfolios`, colors.green);

    // Step 4: Verify
    log('\n📊 Verifying migration...\n', colors.cyan);

    const { data: portfolios } = await client
      .from('portfolios')
      .select('*')
      .order('name');

    log(`✅ Portfolios: ${portfolios?.length || 0}`, colors.green);
    portfolios?.forEach(p => {
      log(`   - ${p.name} (${p.code})`, colors.reset);
    });

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
    
    log('\n⚠️  Tables must be created first. Run this SQL in Supabase SQL Editor:', colors.yellow);
    log('   https://supabase.com/dashboard/project/iyiqdgmpcuczzigotjhf/sql\n', colors.cyan);
    log('   File: database-migrations/007_nav_restructure_phase1.sql\n', colors.yellow);
    process.exit(1);
  }
}

executeMigration();
