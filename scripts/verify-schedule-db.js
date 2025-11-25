const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Found' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyScheduleData() {
  console.log('🔍 Verifying Schedule Database & Data...\n');

  try {
    // 1. Check Tables Existence & Counts
    console.log('📊 Checking Table Counts:');
    
    const { count: schedulesCount, error: schedulesError } = await supabase
      .from('project_schedules')
      .select('*', { count: 'exact', head: true });

    if (schedulesError) {
      console.error('❌ Error checking project_schedules:', schedulesError.message);
    } else {
      console.log(`✅ project_schedules: ${schedulesCount} records`);
    }

    const { count: tasksCount, error: tasksError } = await supabase
      .from('schedule_tasks')
      .select('*', { count: 'exact', head: true });

    if (tasksError) {
      console.error('❌ Error checking schedule_tasks:', tasksError.message);
    } else {
      console.log(`✅ schedule_tasks: ${tasksCount} records`);
    }

    // 2. Check "31 Park" Project Specifics
    console.log('\n🏗️ Checking "31 Park" Project:');
    
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', '%31 Park%')
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      console.log('❌ Project "31 Park" NOT FOUND.');
    } else {
      const project = projects[0];
      console.log(`✅ Found Project: "${project.name}" (ID: ${project.id})`);

      // Check Schedule for this Project
      const { data: schedule, error: scheduleError } = await supabase
        .from('project_schedules')
        .select('*')
        .eq('project_id', project.id)
        .single();

      if (scheduleError || !schedule) {
        console.log('❌ NO SCHEDULE found for this project.');
      } else {
        console.log(`✅ Found Schedule (ID: ${schedule.id})`);
        console.log(`   - Start Date: ${schedule.start_date}`);
        console.log(`   - Status: ${schedule.status}`);

        // Check Tasks for this Schedule
        const { data: tasks, error: tasksFetchError } = await supabase
          .from('schedule_tasks')
          .select('id, task_name, status, start_date, end_date')
          .eq('schedule_id', schedule.id)
          .order('start_date');

        if (tasksFetchError) {
          console.error('❌ Error fetching tasks:', tasksFetchError.message);
        } else {
          console.log(`\n📋 Tasks Found: ${tasks.length}`);
          if (tasks.length > 0) {
            tasks.slice(0, 5).forEach(t => {
              console.log(`   - [${t.status}] ${t.task_name} (${t.start_date} to ${t.end_date})`);
            });
            if (tasks.length > 5) console.log(`   ... and ${tasks.length - 5} more.`);
          } else {
            console.log('   (No tasks associated with this schedule)');
          }
        }
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verifyScheduleData();




