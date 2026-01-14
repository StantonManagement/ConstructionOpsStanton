#!/usr/bin/env node

/**
 * Execute Migration 007 via Direct PostgreSQL Connection
 * Uses the pg library to execute SQL directly
 */

require('dotenv').config();
const { Client } = require('pg');
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

async function runMigration() {
  log('\n🚀 Executing Migration 007 via PostgreSQL\n', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    log('\n📡 Connecting to database...', colors.yellow);
    await client.connect();
    log('✅ Connected!', colors.green);

    const migrationPath = path.join(__dirname, '../database-migrations/007_nav_restructure_phase1.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    log('\n📄 Executing migration SQL...', colors.yellow);
    await client.query(sql);
    log('✅ Migration executed successfully!', colors.green);

    log('\n📊 Verifying results...', colors.cyan);

    const portfolios = await client.query('SELECT * FROM portfolios ORDER BY name');
    log(`\n✅ Portfolios created: ${portfolios.rows.length}`, colors.green);
    portfolios.rows.forEach(p => {
      log(`   - ${p.name} (${p.code})`, colors.reset);
    });

    const projects = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(portfolio_id) as migrated
      FROM projects
    `);
    log(`\n✅ Projects: ${projects.rows[0].migrated}/${projects.rows[0].total} migrated`, colors.green);

    const fundingSources = await client.query('SELECT COUNT(*) as count FROM funding_sources');
    log(`✅ Funding sources table: ${fundingSources.rows[0].count} records`, colors.green);

    const backlogItems = await client.query('SELECT COUNT(*) as count FROM backlog_items');
    log(`✅ Backlog items table: ${backlogItems.rows[0].count} records`, colors.green);

    log('\n✅ Migration 007 completed successfully!\n', colors.green);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    if (error.stack) {
      log('\nStack trace:', colors.red);
      log(error.stack, colors.red);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
