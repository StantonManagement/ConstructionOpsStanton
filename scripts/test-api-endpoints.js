/**
 * API Endpoint Testing Script
 * Tests all critical API endpoints for errors
 */

const BASE_URL = 'http://localhost:3000';

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: []
};

// Helper to make authenticated requests
async function testEndpoint(name, method, path, body = null, requiresAuth = true) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // Note: In production, you'd need to get a real auth token
    // For now, we're just testing if endpoints respond without crashing
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json().catch(() => null);

    if (response.ok) {
      results.passed.push({ name, method, path, status: response.status });
      console.log(`✅ ${name}: ${method} ${path} - ${response.status}`);
    } else {
      results.failed.push({ 
        name, 
        method, 
        path, 
        status: response.status, 
        error: data?.error || data?.message || 'Unknown error'
      });
      console.log(`❌ ${name}: ${method} ${path} - ${response.status} - ${data?.error || 'Error'}`);
    }
  } catch (error) {
    results.failed.push({ name, method, path, error: error.message });
    console.log(`💥 ${name}: ${method} ${path} - CRASH - ${error.message}`);
  }
}

// Critical endpoints to test
async function runTests() {
  console.log('🔍 Starting API Endpoint Tests...\n');

  // Dashboard endpoints
  await testEndpoint('Dashboard Queue', 'GET', '/api/dashboard/queue');
  await testEndpoint('Dashboard Summary', 'GET', '/api/dashboard/summary');
  await testEndpoint('Dashboard Activity', 'GET', '/api/dashboard/activity');

  // Projects
  await testEndpoint('Projects List', 'POST', '/api/projects/list', {});
  await testEndpoint('Project Create', 'POST', '/api/projects', {
    name: 'Test Project',
    address: '123 Test St',
    client_name: 'Test Client'
  });

  // Contractors
  await testEndpoint('Contractors List', 'GET', '/api/contractors');
  
  // Contracts
  await testEndpoint('Contracts List', 'GET', '/api/contracts');

  // Schedules (these likely need project ID)
  await testEndpoint('Schedules List', 'GET', '/api/schedules');

  // Budgets
  await testEndpoint('Budgets List', 'GET', '/api/budgets');

  // Entities
  await testEndpoint('Entities List', 'GET', '/api/entities');

  // Settings
  await testEndpoint('Schedule Defaults', 'GET', '/api/settings/schedule-defaults');

  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Endpoints:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.method} ${f.path}`);
      console.log(`    Status: ${f.status || 'CRASH'}`);
      console.log(`    Error: ${f.error}`);
    });
  }
}

// Run tests
runTests().catch(console.error);
