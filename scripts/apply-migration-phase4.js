
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runMigration() {
  log('🚀 Attempting to apply Phase 4 Migration (Blocking Views)...', colors.cyan);

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    log('❌ DATABASE_URL not found in .env', colors.red);
    process.exit(1);
  }

  log(`Using connection string: ${connectionString.replace(/:[^:@]*@/, ':****@')}`, colors.yellow);

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    log('✅ Connected to database!', colors.green);

    const migrationPath = path.join(__dirname, '..', 'database-migrations', '003_create_blocking_views.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    log('📝 Reading migration file: 003_create_blocking_views.sql', colors.cyan);
    
    log('▶️ Executing SQL...', colors.cyan);
    await client.query(migrationSql);

    log('✅ Migration applied successfully!', colors.green);
    client.release();
  } catch (err) {
    log(`❌ Migration failed: ${err.message}`, colors.red);
  } finally {
    await pool.end();
  }
}

runMigration();
