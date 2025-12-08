const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the app
const supabaseUrl = 'https://iyiqdgmpcuczzigotjhf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aXFkZ21wY3VjenppZ290amhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjkwMzksImV4cCI6MjA2NTc0NTAzOX0.iRYrhPiYHi4NjVBLk0c3AmwQfjZlT3-O8HHZHMsbY68';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log('🔍 Checking database state...\n');

  try {
    // 1. Check if current_period_value column exists
    console.log('1. Checking payment_applications table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'payment_applications')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error checking table structure:', columnsError);
    } else {
      console.log('✅ Table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // 2. Check sample payment applications
    console.log('\n2. Checking sample payment applications...');
    const { data: apps, error: appsError } = await supabase
      .from('payment_applications')
      .select(`
        id,
        status,
        current_payment,
        current_period_value,
        previous_payments,
        created_at,
        project:projects(id, name),
        contractor:contractors(id, name)
      `)
      .limit(5)
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error('❌ Error fetching payment applications:', appsError);
    } else {
      console.log('✅ Sample payment applications:');
      apps.forEach(app => {
        console.log(`   - ID: ${app.id}, Status: ${app.status}`);
        console.log(`     Current Payment: $${app.current_payment || 0}`);
        console.log(`     Current Period Value: $${app.current_period_value || 0}`);
        console.log(`     Previous Payments: $${app.previous_payments || 0}`);
        console.log(`     Project: ${app.project?.name || 'N/A'}`);
        console.log(`     Contractor: ${app.contractor?.name || 'N/A'}`);
        console.log('');
      });
    }

    // 3. Check line items for one application
    if (apps && apps.length > 0) {
      console.log('3. Checking line items for first application...');
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('payment_line_item_progress')
        .select(`
          id,
          payment_application_id,
          line_item:project_line_items(
            id,
            description_of_work,
            amount_for_this_period,
            from_previous_application
          )
        `)
        .eq('payment_application_id', apps[0].id);

      if (lineItemsError) {
        console.error('❌ Error fetching line items:', lineItemsError);
      } else {
        console.log('✅ Line items for application', apps[0].id, ':');
        lineItems.forEach(item => {
          console.log(`   - Line Item: ${item.line_item?.description_of_work || 'N/A'}`);
          console.log(`     Amount for this period: $${item.line_item?.amount_for_this_period || 0}`);
          console.log(`     From previous application: ${item.line_item?.from_previous_application || 0}%`);
        });
      }
    }

    // 4. Check if migration was run
    console.log('\n4. Checking if current_period_value has data...');
    const { data: migrationCheck, error: migrationError } = await supabase
      .from('payment_applications')
      .select('id, current_period_value')
      .not('current_period_value', 'is', null)
      .limit(1);

    if (migrationError) {
      console.error('❌ Error checking migration:', migrationError);
    } else {
      if (migrationCheck && migrationCheck.length > 0) {
        console.log('✅ Migration appears to have been run - current_period_value has data');
      } else {
        console.log('⚠️  Migration may not have been run - current_period_value is null for all records');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDatabase();
