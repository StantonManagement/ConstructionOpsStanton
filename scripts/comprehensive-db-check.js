const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the app
const supabaseUrl = 'https://iyiqdgmpcuczzigotjhf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aXFkZ21wY3VjenppZ290amhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjkwMzksImV4cCI6MjA2NTc0NTAzOX0.iRYrhPiYHi4NjVBLk0c3AmwQfjZlT3-O8HHZHMsbY68';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function comprehensiveDatabaseCheck() {
  console.log('🔍 Comprehensive Database Health Check\n');
  console.log('=' .repeat(60));

  try {
    // 1. Check table row counts
    console.log('\n📊 TABLE ROW COUNTS');
    console.log('-'.repeat(30));
    
    const tables = ['projects', 'contractors', 'contracts', 'payment_applications', 'project_contractors'];
    const rowCounts = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: Error - ${error.message}`);
          rowCounts[table] = 'ERROR';
        } else {
          console.log(`✅ ${table}: ${count} rows`);
          rowCounts[table] = count;
        }
      } catch (err) {
        console.log(`❌ ${table}: Exception - ${err.message}`);
        rowCounts[table] = 'ERROR';
      }
    }

    // 2. Check critical indexes (by testing query performance)
    console.log('\n🔍 INDEX PERFORMANCE CHECK');
    console.log('-'.repeat(30));
    
    // Test project_contractors.project_id index
    console.log('Testing project_contractors.project_id query...');
    const startTime1 = Date.now();
    const { data: pcData, error: pcError } = await supabase
      .from('project_contractors')
      .select('project_id, contract_amount')
      .in('project_id', [1, 2, 3, 4, 5])
      .eq('contract_status', 'active');
    const pcTime = Date.now() - startTime1;
    
    if (pcError) {
      console.log(`❌ project_contractors query failed: ${pcError.message}`);
    } else {
      console.log(`✅ project_contractors query: ${pcTime}ms (${pcData?.length || 0} results)`);
    }

    // Test payment_applications.project_id index
    console.log('Testing payment_applications.project_id query...');
    const startTime2 = Date.now();
    const { data: paData, error: paError } = await supabase
      .from('payment_applications')
      .select('project_id, current_payment')
      .in('project_id', [1, 2, 3, 4, 5])
      .eq('status', 'approved');
    const paTime = Date.now() - startTime2;
    
    if (paError) {
      console.log(`❌ payment_applications query failed: ${paError.message}`);
    } else {
      console.log(`✅ payment_applications query: ${paTime}ms (${paData?.length || 0} results)`);
    }

    // 3. Test the exact queries from ManageView
    console.log('\n⚡ MANAGEVIEW QUERY PERFORMANCE');
    console.log('-'.repeat(30));
    
    // Test projects fetch
    console.log('Testing projects fetch...');
    const startTime3 = Date.now();
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*');
    const projectsTime = Date.now() - startTime3;
    
    if (projectsError) {
      console.log(`❌ Projects fetch failed: ${projectsError.message}`);
    } else {
      console.log(`✅ Projects fetch: ${projectsTime}ms (${projects?.length || 0} projects)`);
    }

    // Test payment applications fetch
    console.log('Testing payment applications fetch...');
    const startTime4 = Date.now();
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_applications')
      .select('current_payment, project_id')
      .eq('status', 'approved');
    const paymentsTime = Date.now() - startTime4;
    
    if (paymentsError) {
      console.log(`❌ Payment applications fetch failed: ${paymentsError.message}`);
    } else {
      console.log(`✅ Payment applications fetch: ${paymentsTime}ms (${payments?.length || 0} payments)`);
    }

    // Test project contractors batch fetch
    if (projects && projects.length > 0) {
      console.log('Testing project contractors batch fetch...');
      const projectIds = projects.slice(0, 10).map(p => p.id); // Test with first 10 projects
      const startTime5 = Date.now();
      const { data: contractors, error: contractorsError } = await supabase
        .from('project_contractors')
        .select('contract_amount, paid_to_date, project_id')
        .in('project_id', projectIds)
        .eq('contract_status', 'active');
      const contractorsTime = Date.now() - startTime5;
      
      if (contractorsError) {
        console.log(`❌ Project contractors fetch failed: ${contractorsError.message}`);
      } else {
        console.log(`✅ Project contractors fetch: ${contractorsTime}ms (${contractors?.length || 0} contracts)`);
      }
    }

    // 4. Check data quality issues
    console.log('\n🔍 DATA QUALITY CHECK');
    console.log('-'.repeat(30));
    
    // Check for orphaned records
    console.log('Checking for orphaned payment applications...');
    const { data: orphanedPayments, error: orphanedError } = await supabase
      .from('payment_applications')
      .select('id, project_id')
      .is('project_id', null);
    
    if (orphanedError) {
      console.log(`❌ Orphaned payments check failed: ${orphanedError.message}`);
    } else {
      console.log(`✅ Orphaned payment applications: ${orphanedPayments?.length || 0}`);
    }

    // Check for null critical fields
    console.log('Checking for null project names...');
    const { data: nullNames, error: nullNamesError } = await supabase
      .from('projects')
      .select('id, name')
      .is('name', null);
    
    if (nullNamesError) {
      console.log(`❌ Null names check failed: ${nullNamesError.message}`);
    } else {
      console.log(`✅ Projects with null names: ${nullNames?.length || 0}`);
    }

    // 5. Check table structure
    console.log('\n📋 TABLE STRUCTURE CHECK');
    console.log('-'.repeat(30));
    
    // Check projects table structure
    console.log('Checking projects table structure...');
    const { data: projectSample, error: projectSampleError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (projectSampleError) {
      console.log(`❌ Projects structure check failed: ${projectSampleError.message}`);
    } else if (projectSample && projectSample.length > 0) {
      console.log(`✅ Projects table columns: ${Object.keys(projectSample[0]).join(', ')}`);
    } else {
      console.log(`⚠️  Projects table is empty`);
    }

    // Check contractors table structure
    console.log('Checking contractors table structure...');
    const { data: contractorSample, error: contractorSampleError } = await supabase
      .from('contractors')
      .select('*')
      .limit(1);
    
    if (contractorSampleError) {
      console.log(`❌ Contractors structure check failed: ${contractorSampleError.message}`);
    } else if (contractorSample && contractorSample.length > 0) {
      console.log(`✅ Contractors table columns: ${Object.keys(contractorSample[0]).join(', ')}`);
    } else {
      console.log(`⚠️  Contractors table is empty`);
    }

    // 6. Performance summary
    console.log('\n📈 PERFORMANCE SUMMARY');
    console.log('-'.repeat(30));
    
    const totalQueries = [pcTime, paTime, projectsTime, paymentsTime].filter(t => t !== undefined);
    const avgQueryTime = totalQueries.reduce((a, b) => a + b, 0) / totalQueries.length;
    
    console.log(`Average query time: ${avgQueryTime.toFixed(2)}ms`);
    console.log(`Total tables checked: ${tables.length}`);
    console.log(`Tables with data: ${Object.values(rowCounts).filter(count => typeof count === 'number' && count > 0).length}`);
    
    if (avgQueryTime > 1000) {
      console.log(`⚠️  WARNING: Average query time is high (${avgQueryTime.toFixed(2)}ms)`);
      console.log(`   Consider adding missing indexes for better performance`);
    } else if (avgQueryTime > 500) {
      console.log(`⚠️  CAUTION: Average query time is moderate (${avgQueryTime.toFixed(2)}ms)`);
    } else {
      console.log(`✅ Query performance looks good`);
    }

    // 7. Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(30));
    
    if (rowCounts.projects > 100 || rowCounts.contractors > 100) {
      console.log('• Large dataset detected - ensure proper indexing');
    }
    
    if (avgQueryTime > 500) {
      console.log('• Consider adding these indexes:');
      console.log('  - CREATE INDEX idx_project_contractors_project_id ON project_contractors(project_id);');
      console.log('  - CREATE INDEX idx_payment_applications_project_id ON payment_applications(project_id);');
    }
    
    if (Object.values(rowCounts).some(count => count === 'ERROR')) {
      console.log('• Some tables have access issues - check RLS policies');
    }

  } catch (error) {
    console.error('❌ Unexpected error during comprehensive check:', error);
  }
}

comprehensiveDatabaseCheck();
