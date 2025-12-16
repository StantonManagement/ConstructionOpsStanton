
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

async function verifyTables() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const tablesToCheck = [
      'projects',
      'contractors',
      'contracts',
      'project_contractors',
      'payment_applications',
      'users',
      'user_role'
    ];

    console.log('\nVerifying Core Tables Existence:');
    
    for (const table of tablesToCheck) {
      const res = await client.query(`
        SELECT to_regclass('public.${table}') as exists;
      `);
      const exists = !!res.rows[0].exists;
      console.log(`- ${table}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      
      if (exists) {
        // Count rows
        try {
            const countRes = await client.query(`SELECT count(*) FROM ${table}`);
            console.log(`  Count: ${countRes.rows[0].count}`);
        } catch (e) {
            console.log(`  Count: Error (RLS?)`);
        }
      }
    }

  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await client.end();
  }
}

verifyTables();

