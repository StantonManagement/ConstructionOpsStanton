#!/usr/bin/env node

/**
 * Phase 3 Test Data Seeding Script
 * 
 * Seeds test data for:
 * - Owner Entities (LLCs)
 * - Projects with entities
 * - Property Budgets
 * - Change Orders
 * 
 * Usage: node scripts/seed-phase3-test-data.js
 */

// Load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config();
} catch (e) {
  console.log('⚠️  dotenv not installed - using existing env vars');
}

const { createClient } = require('@supabase/supabase-js');

// Colors for terminal output
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
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logError('Missing required environment variables!');
  logError('Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test data
const TEST_DATA = {
  entities: [
    { name: 'STANTON REP 90', entity_type: 'LLC', is_active: true, contact_name: 'Zach Stanton', contact_email: 'zach@stantonrep.com' },
    { name: 'SREP SOUTHEND', entity_type: 'LLC', is_active: true, contact_name: 'Zach Stanton', contact_email: 'zach@stantonrep.com' },
    { name: 'SREP NORTHEND', entity_type: 'LLC', is_active: true, contact_name: 'Zach Stanton', contact_email: 'zach@stantonrep.com' },
    { name: 'SREP Hartford 1', entity_type: 'LLC', is_active: true, contact_name: 'Zach Stanton', contact_email: 'zach@stantonrep.com' },
  ],

  projects: [
    { name: '31 Park Street', client_name: 'STANTON REP 90', current_phase: 'Construction', status: 'active', portfolio_name: '90 Park Portfolio', total_units: 4, address: '31 Park Street, Hartford, CT' },
    { name: '228 Maple Avenue', client_name: 'SREP SOUTHEND', current_phase: 'Construction', status: 'active', portfolio_name: 'South End Portfolio', total_units: 6, address: '228 Maple Avenue, Hartford, CT' },
    { name: '93 Maple Street', client_name: 'SREP NORTHEND', current_phase: 'Pre-Construction', status: 'active', portfolio_name: 'North End Portfolio', total_units: 8, address: '93 Maple Street, Hartford, CT' },
  ],

  budgetCategories: [
    { category: 'Site Work', typical_amount: 15000 },
    { category: 'Foundation', typical_amount: 25000 },
    { category: 'Framing', typical_amount: 45000 },
    { category: 'Roofing', typical_amount: 18000 },
    { category: 'Windows & Doors', typical_amount: 12000 },
    { category: 'Plumbing', typical_amount: 22000 },
    { category: 'Electrical', typical_amount: 20000 },
    { category: 'HVAC', typical_amount: 15000 },
    { category: 'Drywall', typical_amount: 14000 },
    { category: 'Flooring', typical_amount: 16000 },
    { category: 'Cabinets & Countertops', typical_amount: 25000 },
    { category: 'Painting', typical_amount: 8000 },
  ],

  contractors: [
    { name: 'ABC Electric', trade: 'Electrical', phone: '860-555-0001', email: 'abc@electric.com', status: 'active' },
    { name: 'XYZ Plumbing', trade: 'Plumbing', phone: '860-555-0002', email: 'xyz@plumbing.com', status: 'active' },
    { name: 'Quality Framing', trade: 'Framing', phone: '860-555-0003', email: 'info@qualityframing.com', status: 'active' },
  ],
};

async function seedEntities() {
  logInfo('🏢 Seeding Owner Entities...');

  for (const entity of TEST_DATA.entities) {
    // Check if exists
    const { data: existing } = await supabase
      .from('owner_entities')
      .select('id, name')
      .eq('name', entity.name)
      .single();

    if (existing) {
      logWarning(`Entity "${entity.name}" already exists (ID: ${existing.id})`);
      continue;
    }

    // Insert
    const { data, error } = await supabase
      .from('owner_entities')
      .insert([entity])
      .select()
      .single();

    if (error) {
      logError(`Failed to create "${entity.name}": ${error.message}`);
    } else {
      logSuccess(`Created entity "${entity.name}" (ID: ${data.id})`);
    }
  }
}

async function seedProjects() {
  logInfo('\n🏗️  Seeding Projects...');

  // First, get entity IDs
  const { data: entities } = await supabase
    .from('owner_entities')
    .select('id, name');

  const entityMap = {};
  entities.forEach(e => {
    entityMap[e.name] = e.id;
  });

  for (const project of TEST_DATA.projects) {
    // Check if exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id, name')
      .eq('name', project.name)
      .single();

    if (existing) {
      logWarning(`Project "${project.name}" already exists (ID: ${existing.id})`);
      continue;
    }

    // Link to entity
    const entityId = entityMap[project.client_name];
    
    const projectData = {
      ...project,
      owner_entity_id: entityId || null,
      budget: 0, // Will be calculated from budget items
      spent: 0,
      start_date: new Date().toISOString().split('T')[0],
      target_completion_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      logError(`Failed to create "${project.name}": ${error.message}`);
    } else {
      logSuccess(`Created project "${project.name}" (ID: ${data.id})`);
    }
  }
}

async function seedBudgets() {
  logInfo('\n💰 Seeding Property Budgets...');

  // Get all projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name');

  if (!projects || projects.length === 0) {
    logWarning('No projects found - skipping budget seeding');
    return;
  }

  for (const project of projects) {
    logInfo(`  Creating budgets for "${project.name}"...`);

    for (const budgetCat of TEST_DATA.budgetCategories) {
      // Check if budget already exists for this category
      const { data: existing } = await supabase
        .from('property_budgets')
        .select('id')
        .eq('project_id', project.id)
        .eq('category_name', budgetCat.category)
        .single();

      if (existing) {
        continue; // Skip if already exists
      }

      // Create some variety in amounts
      const variance = 0.8 + Math.random() * 0.4; // 80-120% of typical
      const originalAmount = Math.round(budgetCat.typical_amount * variance);
      const actualSpend = Math.round(originalAmount * (0.3 + Math.random() * 0.5)); // 30-80% spent
      const committed = Math.round(originalAmount * (Math.random() * 0.15)); // 0-15% committed

      const budgetData = {
        project_id: project.id,
        category_name: budgetCat.category,
        original_amount: originalAmount,
        revised_amount: originalAmount,
        actual_spend: actualSpend,
        committed_costs: committed,
        is_active: true,
        display_order: TEST_DATA.budgetCategories.indexOf(budgetCat),
      };

      const { error } = await supabase
        .from('property_budgets')
        .insert([budgetData]);

      if (error) {
        logError(`    Failed to create budget for "${budgetCat.category}": ${error.message}`);
      } else {
        logSuccess(`    Created budget: ${budgetCat.category} ($${originalAmount.toLocaleString()})`);
      }
    }
  }
}

async function seedContractors() {
  logInfo('\n👷 Seeding Contractors...');

  for (const contractor of TEST_DATA.contractors) {
    // Check if exists
    const { data: existing } = await supabase
      .from('contractors')
      .select('id, name')
      .eq('name', contractor.name)
      .single();

    if (existing) {
      logWarning(`Contractor "${contractor.name}" already exists (ID: ${existing.id})`);
      continue;
    }

    const { data, error } = await supabase
      .from('contractors')
      .insert([contractor])
      .select()
      .single();

    if (error) {
      logError(`Failed to create "${contractor.name}": ${error.message}`);
    } else {
      logSuccess(`Created contractor "${contractor.name}" (ID: ${data.id})`);
    }
  }
}

async function seedChangeOrders() {
  logInfo('\n📝 Seeding Change Orders...');

  // Get projects and contractors
  const { data: projects } = await supabase.from('projects').select('id, name').limit(2);
  const { data: contractors } = await supabase.from('contractors').select('id, name').limit(2);

  if (!projects || projects.length === 0) {
    logWarning('No projects found - skipping change orders');
    return;
  }

  if (!contractors || contractors.length === 0) {
    logWarning('No contractors found - skipping change orders');
    return;
  }

  // Get a valid user ID from the database
  const { data: users } = await supabase
    .from('user_role')
    .select('user_id')
    .limit(1);
  
  const userId = users && users.length > 0 ? users[0].user_id : null;

  const changeOrders = [
    {
      project_id: projects[0].id,
      contractor_id: contractors[0].id,
      title: 'Additional Electrical Outlets',
      description: 'Additional electrical outlets in kitchen',
      reason_category: 'Owner Request',
      justification: 'Client requested more outlets for appliances',
      cost_impact: 1200,
      schedule_impact_days: 2,
      status: 'approved',
      created_by: userId,
    },
    {
      project_id: projects[0].id,
      contractor_id: contractors[1]?.id || contractors[0].id,
      title: 'Plumbing Fixture Upgrade',
      description: 'Upgrade plumbing fixtures to premium grade',
      reason_category: 'Owner Request',
      justification: 'Better quality fixtures for rental properties',
      cost_impact: 3500,
      schedule_impact_days: 0,
      status: 'pending',
      created_by: userId,
    },
    {
      project_id: projects[1]?.id || projects[0].id,
      contractor_id: contractors[0].id,
      title: 'Structural Beam Replacement',
      description: 'Structural beam replacement due to water damage',
      reason_category: 'Hidden Conditions',
      justification: 'Hidden damage discovered during demolition',
      cost_impact: 8500,
      schedule_impact_days: 5,
      status: 'pending',
      created_by: userId,
    },
  ];

  for (const co of changeOrders) {
    // Generate a CO number manually since trigger might not fire
    const coNumber = `CO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
    
    const { data, error} = await supabase
      .from('change_orders')
      .insert([{ ...co, co_number: coNumber }])
      .select()
      .single();

    if (error) {
      logError(`Failed to create change order: ${error.message}`);
    } else {
      logSuccess(`Created change order "${co.title}" (${coNumber}) - $${co.cost_impact.toLocaleString()} - ${co.status}`);
    }
  }
}

async function main() {
  log('\n🌱 Phase 3 Test Data Seeding Script', colors.blue);
  log('='.repeat(60), colors.blue);
  log('');

  try {
    // Seed in order (due to foreign key dependencies)
    await seedEntities();
    await seedProjects();
    await seedContractors();
    await seedBudgets();
    await seedChangeOrders();

    log('\n' + '='.repeat(60), colors.green);
    logSuccess('✨ Seeding complete!');
    log('');
    logInfo('Next steps:');
    logInfo('  1. Login to your app');
    logInfo('  2. Navigate to Projects → Click a project → Budget tab');
    logInfo('  3. Navigate to Change Orders tab');
    logInfo('  4. Navigate to Budget Dashboard');
    log('');
  } catch (error) {
    log('\n' + '='.repeat(60), colors.red);
    logError(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();

