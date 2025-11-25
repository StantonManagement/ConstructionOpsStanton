const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Debug env vars
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing');
console.log('Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Please check .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedSchedule() {
  console.log('🚀 Starting database seeding for ALL projects...');

  // 1. Find All Projects
  const { data: projects, error: pError } = await supabase
    .from('projects')
    .select('id, name');

  if (pError || !projects || projects.length === 0) {
    console.error('❌ No projects found or error fetching projects:', pError);
    return;
  }

  console.log(`Found ${projects.length} projects. Processing...`);

  // Process each project
  for (const project of projects) {
    console.log(`\n📦 Processing Project: "${project.name}" (ID: ${project.id})`);

    // 2. Check/Create Schedule
    let scheduleId;
    const { data: existingSchedule } = await supabase
      .from('project_schedules')
      .select('id')
      .eq('project_id', project.id)
      .single();

    if (existingSchedule) {
      console.log('   ℹ️ Schedule exists:', existingSchedule.id);
      scheduleId = existingSchedule.id;
      
      // Check if tasks exist
      const { count } = await supabase
        .from('schedule_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_id', scheduleId);

      if (count > 0) {
        console.log(`   ✅ Schedule has ${count} tasks. Skipping seed.`);
        continue; // Skip if already has data
      } else {
        console.log('   ⚠️ Schedule exists but has no tasks. Seeding tasks...');
      }
    } else {
      const { data: newSchedule, error: sError } = await supabase
        .from('project_schedules')
        .insert({
          project_id: project.id,
          start_date: new Date().toISOString().split('T')[0],
          target_end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
          status: 'on_track'
        })
        .select()
        .single();
        
      if (sError) {
        console.error('   ❌ Error creating schedule:', sError.message);
        continue;
      }
      scheduleId = newSchedule.id;
      console.log('   ✅ Created new schedule:', scheduleId);
    }

    // 3. Create Dummy Tasks
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const addDays = (date, days) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };

    const tasks = [
      {
        task_name: 'Demolition',
        description: 'Remove existing fixtures and drywall',
        start_date: formatDate(today),
        end_date: formatDate(addDays(today, 5)),
        status: 'completed',
        progress: 100,
        sort_order: 1
      },
      {
        task_name: 'Rough Plumbing',
        description: 'Install new drain and supply lines',
        start_date: formatDate(addDays(today, 6)),
        end_date: formatDate(addDays(today, 10)),
        status: 'in_progress',
        progress: 60,
        sort_order: 2
      },
      {
        task_name: 'Rough Electrical',
        description: 'Run new circuits and boxes',
        start_date: formatDate(addDays(today, 8)),
        end_date: formatDate(addDays(today, 12)),
        status: 'not_started',
        progress: 0,
        sort_order: 3
      },
      {
        task_name: 'Insulation & Drywall',
        description: 'Install batt insulation and hang drywall',
        start_date: formatDate(addDays(today, 13)),
        end_date: formatDate(addDays(today, 20)),
        status: 'not_started',
        progress: 0,
        sort_order: 4
      },
      {
        task_name: 'Painting',
        description: 'Prime and paint walls',
        start_date: formatDate(addDays(today, 21)),
        end_date: formatDate(addDays(today, 25)),
        status: 'not_started',
        progress: 0,
        sort_order: 5
      }
    ];

    const { data: createdTasks, error: tError } = await supabase
      .from('schedule_tasks')
      .insert(tasks.map(t => ({ ...t, schedule_id: scheduleId })))
      .select();

    if (tError) {
      console.error('   ❌ Error creating tasks:', tError.message);
      continue;
    }

    console.log(`   ✅ Created ${createdTasks.length} tasks`);

    // 4. Create Dependencies (Demo -> Plumbing -> Drywall)
    // Assuming sort order matches index
    const demo = createdTasks.find(t => t.task_name === 'Demolition');
    const plumbing = createdTasks.find(t => t.task_name === 'Rough Plumbing');
    const electrical = createdTasks.find(t => t.task_name === 'Rough Electrical');
    const drywall = createdTasks.find(t => t.task_name === 'Insulation & Drywall');
    const paint = createdTasks.find(t => t.task_name === 'Painting');

    const dependencies = [
      { source_task_id: demo.id, target_task_id: plumbing.id },
      { source_task_id: demo.id, target_task_id: electrical.id },
      { source_task_id: plumbing.id, target_task_id: drywall.id },
      { source_task_id: electrical.id, target_task_id: drywall.id },
      { source_task_id: drywall.id, target_task_id: paint.id }
    ];

    const { error: dError } = await supabase
      .from('schedule_dependencies')
      .insert(dependencies);

    if (dError) console.error('   ❌ Error creating dependencies:', dError.message);
    else console.log('   ✅ Created dependencies');
  }
  
  console.log('\n✨ Seeding complete!');
}

seedSchedule();
