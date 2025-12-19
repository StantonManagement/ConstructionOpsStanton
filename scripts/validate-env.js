#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * Validates that all required environment variables are present and properly formatted.
 * Run this on startup or as part of CI/CD to catch configuration issues early.
 * 
 * Usage: node scripts/validate-env.js
 */

require('dotenv').config();

// Color codes for terminal output
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
function logSuccess(message) { log(message, colors.green); }
function logError(message) { log(message, colors.red); }
function logWarning(message) { log(message, colors.yellow); }
function logInfo(message) { log(message, colors.cyan); }

/**
 * Environment variable definitions with validation rules
 */
const ENV_SCHEMA = {
  // Required Supabase variables
  NEXT_PUBLIC_SUPABASE_URL: {
    required: true,
    pattern: /^https:\/\/[a-z0-9]+\.supabase\.co$/,
    description: 'Supabase project URL',
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    required: true,
    pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    description: 'Supabase anonymous/public key (JWT)',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    description: 'Supabase service role key (JWT) - KEEP SECRET',
  },
  
  // Optional but recommended
  SUPABASE_URL: {
    required: false,
    pattern: /^https:\/\/[a-z0-9]+\.supabase\.co$/,
    description: 'Supabase URL (alias for NEXT_PUBLIC_SUPABASE_URL)',
  },
  SUPABASE_KEY: {
    required: false,
    pattern: /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    description: 'Supabase key (alias for NEXT_PUBLIC_SUPABASE_ANON_KEY)',
  },
  
  // Twilio (required for SMS features)
  TWILIO_ACCOUNT_SID: {
    required: false,
    pattern: /^AC[a-f0-9]{32}$/,
    description: 'Twilio Account SID',
  },
  TWILIO_AUTH_TOKEN: {
    required: false,
    pattern: /^[a-f0-9]{32}$/,
    description: 'Twilio Auth Token',
  },
  TWILIO_PHONE_NUMBER: {
    required: false,
    pattern: /^\+1[0-9]{10}$/,
    description: 'Twilio phone number in E.164 format',
  },
  
  // OpenAI (optional)
  OPENAI_API_KEY: {
    required: false,
    pattern: /^sk-[A-Za-z0-9_-]+$/,
    description: 'OpenAI API key',
  },
  
  // Security
  JWT_SECRET: {
    required: false,
    minLength: 32,
    description: 'JWT secret for contractor portal tokens',
  },
  SECRET_KEY: {
    required: false,
    minLength: 16,
    description: 'General secret key',
  },
};

/**
 * Validate a single environment variable
 */
function validateVar(name, schema) {
  const value = process.env[name];
  const errors = [];
  
  // Check if required
  if (schema.required && !value) {
    return { valid: false, errors: [`Missing required variable`] };
  }
  
  // If not set and not required, skip further validation
  if (!value) {
    return { valid: true, skipped: true };
  }
  
  // Check pattern
  if (schema.pattern && !schema.pattern.test(value)) {
    errors.push(`Invalid format (expected pattern: ${schema.pattern})`);
  }
  
  // Check minimum length
  if (schema.minLength && value.length < schema.minLength) {
    errors.push(`Too short (minimum ${schema.minLength} characters)`);
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Main validation function
 */
function validateEnvironment() {
  logInfo('\n🔍 Validating Environment Variables\n');
  logInfo('='.repeat(50) + '\n');
  
  let hasErrors = false;
  let hasWarnings = false;
  const results = {
    valid: [],
    invalid: [],
    skipped: [],
  };
  
  for (const [name, schema] of Object.entries(ENV_SCHEMA)) {
    const result = validateVar(name, schema);
    
    if (result.skipped) {
      results.skipped.push(name);
      log(`   ⚪ ${name}: not set (optional)`);
    } else if (result.valid) {
      results.valid.push(name);
      logSuccess(`   ✅ ${name}: valid`);
    } else {
      if (schema.required) {
        results.invalid.push({ name, errors: result.errors });
        logError(`   ❌ ${name}: ${result.errors.join(', ')}`);
        hasErrors = true;
      } else {
        logWarning(`   ⚠️  ${name}: ${result.errors.join(', ')}`);
        hasWarnings = true;
      }
    }
  }
  
  // Summary
  logInfo('\n' + '='.repeat(50));
  logInfo('📋 Validation Summary\n');
  
  logSuccess(`   ✅ Valid: ${results.valid.length}`);
  if (results.invalid.length > 0) {
    logError(`   ❌ Invalid: ${results.invalid.length}`);
  }
  log(`   ⚪ Skipped: ${results.skipped.length}`);
  
  if (hasErrors) {
    logError('\n❌ Environment validation FAILED');
    logInfo('\nMissing or invalid required variables:');
    results.invalid.forEach(({ name, errors }) => {
      const schema = ENV_SCHEMA[name];
      logError(`   • ${name}: ${schema.description}`);
      errors.forEach(err => log(`     - ${err}`));
    });
    logInfo('\nSee ENV_SETUP.md for configuration instructions.\n');
    return false;
  }
  
  if (hasWarnings) {
    logWarning('\n⚠️  Environment validation passed with warnings');
  } else {
    logSuccess('\n✅ Environment validation PASSED');
  }
  
  return true;
}

/**
 * Check for common configuration issues
 */
function checkCommonIssues() {
  logInfo('\n🔎 Checking for common issues...\n');
  
  // Check if SUPABASE_URL matches NEXT_PUBLIC_SUPABASE_URL
  const url1 = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url2 = process.env.SUPABASE_URL;
  if (url1 && url2 && url1 !== url2) {
    logWarning('   ⚠️  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL are different');
    logWarning(`      NEXT_PUBLIC: ${url1}`);
    logWarning(`      SUPABASE:    ${url2}`);
  }
  
  // Check if anon keys match
  const key1 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key2 = process.env.SUPABASE_KEY;
  if (key1 && key2 && key1 !== key2) {
    logWarning('   ⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_KEY are different');
  }
  
  // Check Twilio configuration completeness
  const twilioVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
  const twilioSet = twilioVars.filter(v => process.env[v]);
  if (twilioSet.length > 0 && twilioSet.length < 3) {
    logWarning('   ⚠️  Incomplete Twilio configuration');
    logWarning(`      Set: ${twilioSet.join(', ')}`);
    logWarning(`      Missing: ${twilioVars.filter(v => !process.env[v]).join(', ')}`);
  }
  
  logSuccess('   ✅ Common issues check complete\n');
}

// Main
function main() {
  const valid = validateEnvironment();
  checkCommonIssues();
  
  if (!valid) {
    process.exit(1);
  }
  
  logSuccess('🎉 Environment is properly configured!\n');
}

main();
