const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the app
const supabaseUrl = 'https://iyiqdgmpcuczzigotjhf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aXFkZ21wY3VjenppZ290amhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjkwMzksImV4cCI6MjA2NTc0NTAzOX0.iRYrhPiYHi4NjVBLk0c3AmwQfjZlT3-O8HHZHMsbY68';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testManageViewQueries() {
  console.log('🧪 Testing ManageView Query Issues\n');
  console.log('=' .repeat(50));

  try {
    // Test the exact fetchEnhancedProjects logic
    console.log('Testing fetchEnhancedProjects logic...\n');
    
    // Step 1: Fetch projects (like ManageView does)
    console.log('1. Fetching projects...');
    const startTime1 = Date.now();
    const { data: freshProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*');
    const projectsTime = Date.now() - startTime1;
    
    if (projectsError) {
      console.log(`❌ Projects fetch failed: ${projectsError.message}`);
      return;
    }
    console.log(`✅ Projects fetched: ${projectsTime}ms (${freshProjects?.length || 0} projects)`);
    
    if (!freshProjects || freshProjects.length === 0) {
      console.log('⚠️  No projects found - this explains why adding projects might hang');
      return;
    }

    // Step 2: Fetch approved payments
    console.log('\n2. Fetching approved payments...');
    const startTime2 = Date.now();
    const { data: approvedPayments } = await supabase
      .from('payment_applications')
      .select('current_payment, project_id')
      .eq('status', 'approved');
    const paymentsTime = Date.now() - startTime2;
    console.log(`✅ Approved payments fetched: ${paymentsTime}ms (${approvedPayments?.length || 0} payments)`);

    // Step 3: Batch fetch contractor data
    console.log('\n3. Batch fetching contractor data...');
    const projectIds = freshProjects.map(p => p.id);
    const startTime3 = Date.now();
    const { data: allContractorData } = await supabase
      .from('project_contractors')
      .select('contract_amount, paid_to_date, project_id')
      .in('project_id', projectIds)
      .eq('contract_status', 'active');
    const contractorsTime = Date.now() - startTime3;
    console.log(`✅ Contractor data fetched: ${contractorsTime}ms (${allContractorData?.length || 0} contracts)`);

    // Step 4: Test the calculation logic
    console.log('\n4. Testing calculation logic...');
    const startTime4 = Date.now();
    
    const approvedPaymentsByProject = (approvedPayments || []).reduce((acc, payment) => {
      if (!acc[payment.project_id]) {
        acc[payment.project_id] = 0;
      }
      acc[payment.project_id] += Number(payment.current_payment) || 0;
      return acc;
    }, {});

    const contractorDataByProject = (allContractorData || []).reduce((acc, contract) => {
      if (!acc[contract.project_id]) {
        acc[contract.project_id] = [];
      }
      acc[contract.project_id].push(contract);
      return acc;
    }, {});

    const enrichedProjects = freshProjects.map((project) => {
      const contractorData = contractorDataByProject[project.id] || [];
      const calculatedBudget = contractorData.reduce((sum, contract) =>
        sum + (Number(contract.contract_amount) || 0), 0);
      const calculatedSpent = approvedPaymentsByProject[project.id] || 0;
      
      return {
        ...project,
        calculatedBudget,
        calculatedSpent,
        spent: calculatedSpent
      };
    });
    
    const calcTime = Date.now() - startTime4;
    console.log(`✅ Calculations completed: ${calcTime}ms`);
    console.log(`   Enriched ${enrichedProjects.length} projects`);

    // Show sample enriched project
    if (enrichedProjects.length > 0) {
      const sample = enrichedProjects[0];
      console.log(`\n📋 Sample enriched project:`);
      console.log(`   Name: ${sample.name}`);
      console.log(`   Calculated Budget: $${sample.calculatedBudget}`);
      console.log(`   Calculated Spent: $${sample.calculatedSpent}`);
    }

    // Test adding a project (simulate the addProject function)
    console.log('\n5. Testing project addition logic...');
    const testProjectData = {
      name: 'Test Project',
      client_name: 'Test Client',
      current_phase: 'Planning',
      budget: 100000,
      start_date: '2024-01-01',
      target_completion_date: '2024-12-31'
    };
    
    console.log('Attempting to insert test project...');
    const startTime5 = Date.now();
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert([testProjectData])
      .select()
      .single();
    const insertTime = Date.now() - startTime5;
    
    if (insertError) {
      console.log(`❌ Project insertion failed: ${insertError.message}`);
      console.log(`   This explains why adding projects hangs!`);
    } else {
      console.log(`✅ Project inserted successfully: ${insertTime}ms`);
      console.log(`   New project ID: ${newProject.id}`);
      
      // Clean up - delete the test project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', newProject.id);
      
      if (deleteError) {
        console.log(`⚠️  Warning: Could not delete test project: ${deleteError.message}`);
      } else {
        console.log(`✅ Test project cleaned up`);
      }
    }

    // Test adding a contractor
    console.log('\n6. Testing contractor addition logic...');
    const testContractorData = {
      name: 'Test Contractor',
      trade: 'General',
      phone: '+1234567890',
      email: 'test@contractor.com'
    };
    
    console.log('Attempting to insert test contractor...');
    const startTime6 = Date.now();
    const { data: newContractor, error: contractorInsertError } = await supabase
      .from('contractors')
      .insert([testContractorData])
      .select()
      .single();
    const contractorInsertTime = Date.now() - startTime6;
    
    if (contractorInsertError) {
      console.log(`❌ Contractor insertion failed: ${contractorInsertError.message}`);
      console.log(`   This explains why adding contractors hangs!`);
    } else {
      console.log(`✅ Contractor inserted successfully: ${contractorInsertTime}ms`);
      console.log(`   New contractor ID: ${newContractor.id}`);
      
      // Clean up - delete the test contractor
      const { error: contractorDeleteError } = await supabase
        .from('contractors')
        .delete()
        .eq('id', newContractor.id);
      
      if (contractorDeleteError) {
        console.log(`⚠️  Warning: Could not delete test contractor: ${contractorDeleteError.message}`);
      } else {
        console.log(`✅ Test contractor cleaned up`);
      }
    }

    console.log('\n📊 SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total fetchEnhancedProjects time: ${projectsTime + paymentsTime + contractorsTime + calcTime}ms`);
    console.log(`Project insertion time: ${insertTime || 'FAILED'}ms`);
    console.log(`Contractor insertion time: ${contractorInsertTime || 'FAILED'}ms`);
    
    if (insertError || contractorInsertError) {
      console.log('\n🚨 CRITICAL FINDING:');
      console.log('Database insertions are failing! This is the root cause of hanging behavior.');
      console.log('The issue is likely in the application code, not the database itself.');
    } else {
      console.log('\n✅ Database operations are working correctly.');
      console.log('The hanging issue is definitely in the application code.');
    }

  } catch (error) {
    console.error('❌ Unexpected error during ManageView testing:', error);
  }
}

testManageViewQueries();
