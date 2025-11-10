#!/usr/bin/env node

/**
 * Railway Cron Job Runner
 * 
 * This script runs as a separate Railway service to handle scheduled tasks.
 * It makes HTTP requests to the cron API endpoints in the main web service.
 * 
 * Environment variables required:
 * - RAILWAY_WEB_SERVICE_URL: URL of the main web service (e.g., https://your-app.railway.app)
 * - CRON_SECRET: Secret token for authenticating cron requests
 */

const cron = require('node-cron');
const https = require('https');
const http = require('http');

// Configuration
const WEB_SERVICE_URL = process.env.RAILWAY_WEB_SERVICE_URL || process.env.NEXT_PUBLIC_SITE_URL;
const CRON_SECRET = process.env.CRON_SECRET || 'railway-cron-secret';

if (!WEB_SERVICE_URL) {
  console.error('ERROR: RAILWAY_WEB_SERVICE_URL or NEXT_PUBLIC_SITE_URL environment variable is required');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('Railway Cron Job Runner');
console.log('='.repeat(60));
console.log(`Web Service URL: ${WEB_SERVICE_URL}`);
console.log(`Starting cron jobs...`);
console.log('='.repeat(60));

/**
 * Make HTTP request to a cron endpoint
 */
function callCronEndpoint(path, jobName) {
  const url = new URL(path, WEB_SERVICE_URL);
  const protocol = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'Railway-Cron-Runner/1.0'
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const timestamp = new Date().toISOString();
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[${timestamp}] ✓ ${jobName} completed successfully (${res.statusCode})`);
          try {
            const response = JSON.parse(data);
            if (response.summary) {
              console.log(`  Summary:`, response.summary);
            } else if (response.message) {
              console.log(`  Message: ${response.message}`);
            }
          } catch (e) {
            console.log(`  Response: ${data.substring(0, 200)}`);
          }
          resolve({ success: true, statusCode: res.statusCode, data });
        } else {
          console.error(`[${timestamp}] ✗ ${jobName} failed (${res.statusCode})`);
          console.error(`  Response: ${data.substring(0, 500)}`);
          resolve({ success: false, statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', (error) => {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ✗ ${jobName} error:`, error.message);
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Daily Log Requests Cron Job
 * Runs at 6:00 PM EST every day
 * Cron expression: 0 18 * * * (6:00 PM daily)
 * 
 * Note: Railway runs in UTC, so adjust the schedule accordingly.
 * 6:00 PM EST = 11:00 PM UTC (EST is UTC-5)
 * 6:00 PM EDT = 10:00 PM UTC (EDT is UTC-4)
 * Using 11:00 PM UTC to match EST
 */
cron.schedule('0 23 * * *', async () => {
  console.log('\n' + '-'.repeat(60));
  console.log('Running Daily Log Requests cron job...');
  console.log('-'.repeat(60));
  
  try {
    await callCronEndpoint('/api/cron/daily-log-requests', 'Daily Log Requests');
  } catch (error) {
    console.error('Failed to execute Daily Log Requests cron:', error.message);
  }
}, {
  timezone: "UTC"
});

/**
 * PM Notes Cron Job
 * Runs every minute to check for scheduled PM notes
 * Cron expression: * * * * * (every minute)
 * 
 * The API endpoint handles the logic of checking if notes should be sent
 * based on the scheduled time in EST timezone.
 */
cron.schedule('* * * * *', async () => {
  // Log less frequently to avoid spam (only log on the hour)
  const now = new Date();
  const shouldLog = now.getMinutes() === 0;
  
  if (shouldLog) {
    console.log('\n' + '-'.repeat(60));
    console.log('Running PM Notes cron job (runs every minute)...');
    console.log('-'.repeat(60));
  }
  
  try {
    await callCronEndpoint('/api/cron/pm-notes', 'PM Notes');
  } catch (error) {
    if (shouldLog) {
      console.error('Failed to execute PM Notes cron:', error.message);
    }
  }
}, {
  timezone: "UTC"
});

// Log startup message
console.log('\n✓ Cron jobs scheduled:');
console.log('  - Daily Log Requests: 11:00 PM UTC daily (6:00 PM EST)');
console.log('  - PM Notes: Every minute');
console.log('\nCron runner is now active and waiting for scheduled times...\n');

// Keep the process running
process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Health check - keep process alive
setInterval(() => {
  // This keeps the process running
}, 60000);

