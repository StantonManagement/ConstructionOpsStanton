
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
  log('🚀 Attempting to apply Phase 2 Migration...', colors.cyan);

  // Prefer DATABASE_URL from env as it likely has the correct encoding
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

    const migrationPath = path.join(__dirname, '..', 'database-migrations', '002_create_templates.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    log('📝 Reading migration file: 002_create_templates.sql', colors.cyan);
    
    // Split by semicolon to run statements individually if needed, or run as one block.
    // Usually pg can run multiple statements in one query.
    
    log('▶️ Executing SQL...', colors.cyan);
    await client.query(migrationSql);

    log('✅ Migration applied successfully!', colors.green);
    client.release();
  } catch (err) {
    log(`❌ Migration failed: ${err.message}`, colors.red);
    if (err.message.includes('password')) {
        log('💡 Hint: Check if the password in DATABASE_URL is correctly URL-encoded.', colors.yellow);
    }
  } finally {
    await pool.end();
  }
}

runMigration();
