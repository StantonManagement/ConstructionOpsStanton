#!/usr/bin/env node

/**
 * Production Environment Variables Verification Script
 * 
 * This script verifies that all required environment variables are set
 * and provides helpful guidance for deployment platforms (Railway, Render).
 * 
 * Usage:
 *   node scripts/verify-env-production.js
 * 
 * Or set NODE_ENV=production and run:
 *   NODE_ENV=production node scripts/verify-env-production.js
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.RENDER;

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
  log(message, 'cyan');
}

function logSuccess(message) {
  log(message, 'green');
}

function logError(message) {
  log(message, 'red');
}

function logWarning(message) {
  log(message, 'yellow');
}

// Required environment variables
const REQUIRED_VARS = {
  // Build-time variables (must be available during build)
  buildTime: [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      description: 'Your Supabase project URL',
      critical: true,
      getFrom: 'Supabase Dashboard → Settings → API → Project URL',
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      description: 'Supabase anonymous/public key',
      critical: true,
      getFrom: 'Supabase Dashboard → Settings → API → anon public key',
    },
    {
      name: 'NEXT_PUBLIC_SITE_URL',
      description: 'Application URL (production URL)',
      critical: true,
      getFrom: 'Your deployment platform URL',
    },
  ],
  // Runtime variables (must be available at runtime)
  runtime: [
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      description: 'Supabase service role key (server-side only)',
      critical: true,
      getFrom: 'Supabase Dashboard → Settings → API → service_role key',
      note: 'REQUIRED for database relationships and server-side operations',
    },
    {
      name: 'SECRET_KEY',
      description: 'Secret key for session encryption',
      critical: true,
      getFrom: 'Generate with: openssl rand -base64 32',
    },
  ],
  // Conditional variables (only required if using specific features)
  conditional: [
    {
      name: 'TWILIO_ACCOUNT_SID',
      description: 'Twilio account SID',
      critical: false,
      requiredIf: 'using SMS features',
      getFrom: 'Twilio Console → Account Info',
    },
    {
      name: 'TWILIO_AUTH_TOKEN',
      description: 'Twilio auth token',
      critical: false,
      requiredIf: 'using SMS features',
      getFrom: 'Twilio Console → Account Info',
    },
    {
      name: 'TWILIO_PHONE_NUMBER',
      description: 'Twilio phone number',
      critical: false,
      requiredIf: 'using SMS features',
      getFrom: 'Twilio Console → Phone Numbers',
    },
  ],
};

function verifyVariables() {
  logInfo('\n🔍 Verifying Environment Variables for Production Deployment\n');
  logInfo('='.repeat(70));

  let allPassed = true;
  const missing = [];
  const warnings = [];

  // Detect deployment platform
  const platform = process.env.RAILWAY_ENVIRONMENT ? 'Railway' : process.env.RENDER ? 'Render' : 'Local';
  logInfo(`\n📍 Deployment Platform: ${platform}\n`);

  // Check build-time variables
  logInfo('📦 Build-Time Variables (must be set during build):\n');
  for (const variable of REQUIRED_VARS.buildTime) {
    const value = process.env[variable.name];
    if (value) {
      logSuccess(`  ✅ ${variable.name}`);
      if (variable.name.includes('URL')) {
        log(`     ${value}`);
      } else if (variable.name.includes('KEY')) {
        log(`     ${value.substring(0, 20)}...${value.substring(value.length - 10)}`);
      }
    } else {
      logError(`  ❌ ${variable.name} - MISSING`);
      log(`     Description: ${variable.description}`);
      log(`     Get from: ${variable.getFrom}`);
      if (platform === 'Railway') {
        logWarning(`     → Railway: Service → Variables tab → Add Variable`);
      } else if (platform === 'Render') {
        logWarning(`     → Render: Environment tab → Add Environment Variable`);
      }
      missing.push(variable);
      if (variable.critical) {
        allPassed = false;
      }
    }
  }

  // Check runtime variables
  logInfo('\n⚙️  Runtime Variables (must be set at runtime):\n');
  for (const variable of REQUIRED_VARS.runtime) {
    const value = process.env[variable.name];
    if (value) {
      logSuccess(`  ✅ ${variable.name}`);
      if (variable.name.includes('KEY') || variable.name.includes('SECRET')) {
        log(`     ${value.substring(0, 20)}...${value.substring(value.length - 10)}`);
      }
      if (variable.note) {
        log(`     ℹ️  ${variable.note}`);
      }
    } else {
      logError(`  ❌ ${variable.name} - MISSING`);
      log(`     Description: ${variable.description}`);
      log(`     Get from: ${variable.getFrom}`);
      if (variable.note) {
        logWarning(`     ⚠️  ${variable.note}`);
      }
      if (platform === 'Railway') {
        logWarning(`     → Railway: Service → Variables tab → Add Variable`);
      } else if (platform === 'Render') {
        logWarning(`     → Render: Environment tab → Add Environment Variable`);
      }
      missing.push(variable);
      if (variable.critical) {
        allPassed = false;
      }
    }
  }

  // Check conditional variables
  logInfo('\n🔧 Conditional Variables (only if using specific features):\n');
  for (const variable of REQUIRED_VARS.conditional) {
    const value = process.env[variable.name];
    if (value) {
      logSuccess(`  ✅ ${variable.name}`);
    } else {
      logWarning(`  ⚠️  ${variable.name} - Not set`);
      log(`     Description: ${variable.description}`);
      log(`     Required if: ${variable.requiredIf}`);
      log(`     Get from: ${variable.getFrom}`);
      warnings.push(variable);
    }
  }

  // Summary
  logInfo('\n' + '='.repeat(70));
  logInfo('\n📊 Summary:\n');

  if (allPassed && missing.length === 0) {
    logSuccess('✅ All required environment variables are set!');
    
    if (warnings.length > 0) {
      logWarning(`\n⚠️  ${warnings.length} optional variable(s) not set (only needed if using those features)`);
    }

    logInfo('\n🚀 Ready for deployment!\n');
    logInfo('Next steps:');
    logInfo('1. Deploy to your platform (Railway/Render)');
    logInfo('2. Ensure the same variables are set in your deployment platform');
    logInfo('3. Check deployment logs after deployment');
    logInfo('4. Verify runtime logs show Supabase initialization messages\n');

    return true;
  } else {
    logError(`\n❌ ${missing.length} required variable(s) missing!\n`);

    if (platform !== 'Local') {
      logInfo('To fix this:\n');
      if (platform === 'Railway') {
        logInfo('1. Go to your Railway project dashboard');
        logInfo('2. Navigate to your service → Variables tab');
        logInfo('3. Add each missing variable');
        logInfo('4. Railway will automatically redeploy after saving');
        logInfo('5. Check deployment logs to verify variables are loaded\n');
      } else if (platform === 'Render') {
        logInfo('1. Go to your Render Web Service dashboard');
        logInfo('2. Navigate to Environment tab');
        logInfo('3. Add each missing variable');
        logInfo('4. Render will automatically redeploy\n');
      }
    } else {
      logInfo('To fix this:\n');
      logInfo('1. Create or update your .env file in the project root');
      logInfo('2. Add each missing variable');
      logInfo('3. See ENV_SETUP.md for detailed instructions');
      logInfo('4. Restart your development server\n');
    }

    return false;
  }
}

// Main execution
try {
  const success = verifyVariables();
  process.exit(success ? 0 : 1);
} catch (error) {
  logError(`\n❌ Error running verification: ${error.message}\n`);
  console.error(error);
  process.exit(1);
}

