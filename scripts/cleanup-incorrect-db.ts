
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL is required in .env');
  process.exit(1);
}

// Fix connection string if needed
let fixedConnectionString = connectionString;
try {
  const parts = connectionString.split('@');
  if (parts.length > 2) {
    const lastAt = connectionString.lastIndexOf('@');
    const userPass = connectionString.substring(0, lastAt);
    const hostDb = connectionString.substring(lastAt + 1);
    
    const protocolEnd = userPass.indexOf('://');
    const userPassOnly = userPass.substring(protocolEnd + 3);
    
    const firstColon = userPassOnly.indexOf(':');
    if (firstColon !== -1) {
      const user = userPassOnly.substring(0, firstColon);
      const pass = userPassOnly.substring(firstColon + 1);
      
      const encodedPass = encodeURIComponent(pass);
      fixedConnectionString = `postgresql://${user}:${encodedPass}@${hostDb}`;
    }
  }
} catch (e) {
  // ignore
}

const client = new Client({
  connectionString: fixedConnectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function cleanupTables() {
  try {
    await client.connect();
    console.log('Connected to database (incorrect instance).');

    // Drop the tables we created
    console.log('Dropping contractors table...');
    await client.query('DROP TABLE IF EXISTS contractors CASCADE;');
    
    console.log('Dropping user_role table...');
    await client.query('DROP TABLE IF EXISTS user_role CASCADE;');

    // Drop helper functions we created
    console.log('Dropping helper functions...');
    await client.query('DROP FUNCTION IF EXISTS is_admin_or_pm();');
    await client.query('DROP FUNCTION IF EXISTS is_admin();');

    console.log('Cleanup complete. The incorrect database is now clean.');

  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await client.end();
  }
}

cleanupTables();

