#!/usr/bin/env node

/**
 * Analyze Portfolio Data
 * 
 * Queries the database to understand current portfolio_name usage
 * and prepare for migration to normalized portfolios table.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

async function analyzePortfolios(client) {
  log('\n📊 Analyzing Portfolio Data\n', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const { data: projects, error } = await client
    .from('projects')
    .select('id, name, portfolio_name, owner_entity_id, status')
    .order('portfolio_name', { ascending: true });

  if (error) {
    log(`❌ Error querying projects: ${error.message}`, colors.red);
    return;
  }

  const portfolioMap = {};
  let nullCount = 0;

  projects.forEach(project => {
    const portfolio = project.portfolio_name || '(null)';
    if (!project.portfolio_name) nullCount++;
    
    if (!portfolioMap[portfolio]) {
      portfolioMap[portfolio] = [];
    }
    portfolioMap[portfolio].push(project);
  });

  log(`\n📁 Found ${Object.keys(portfolioMap).length} unique portfolio names:\n`, colors.green);

  Object.entries(portfolioMap).forEach(([portfolio, projects]) => {
    const activeCount = projects.filter(p => p.status === 'active').length;
    log(`  ${portfolio}`, colors.yellow);
    log(`    Projects: ${projects.length} (${activeCount} active)`, colors.reset);
    log(`    IDs: ${projects.map(p => p.id).join(', ')}`, colors.reset);
  });

  if (nullCount > 0) {
    log(`\n⚠️  Warning: ${nullCount} projects have null portfolio_name`, colors.yellow);
  }

  const { data: entities, error: entitiesError } = await client
    .from('owner_entities')
    .select('*')
    .order('name', { ascending: true });

  if (!entitiesError && entities) {
    log(`\n🏢 Owner Entities (${entities.length}):\n`, colors.cyan);
    entities.forEach(entity => {
      const entityProjects = projects.filter(p => p.owner_entity_id === entity.id);
      log(`  ${entity.name} (ID: ${entity.id})`, colors.yellow);
      log(`    Projects: ${entityProjects.length}`, colors.reset);
    });
  }

  log('\n\n💡 Suggested Portfolio Structure:\n', colors.magenta);
  log('Based on existing data, create these portfolios:', colors.reset);
  
  const suggestedPortfolios = Object.keys(portfolioMap)
    .filter(p => p !== '(null)')
    .map(name => {
      const code = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return { name, code };
    });

  suggestedPortfolios.forEach(({ name, code }) => {
    log(`  - ${name} (code: ${code})`, colors.green);
  });

  log('\n✅ Analysis complete!\n', colors.green);
}

async function main() {
  const client = createAdminClient();
  await analyzePortfolios(client);
}

main().catch(e => {
  log(`\n❌ Error: ${e.message}`, colors.red);
  process.exit(1);
});
