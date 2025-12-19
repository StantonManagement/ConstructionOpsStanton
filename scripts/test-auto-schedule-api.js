const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoSchedule() {
  try {
    console.log('🧪 Testing auto-schedule API...\n');

    // Get first project with a schedule
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);

    if (!projects || projects.length === 0) {
      console.log('❌ No projects found');
      return;
    }

    const projectId = projects[0].id;
    console.log(`Testing with project ${projectId}: ${projects[0].name}\n`);

    // Call auto-schedule API
    const response = await fetch(`http://localhost:3001/api/projects/${projectId}/auto-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response status: ${response.status}`);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Auto-schedule succeeded!');
    } else {
      console.log('\n❌ Auto-schedule failed');
      console.log('Error:', data.error);
      if (data.details) console.log('Details:', data.details);
    }

  } catch (err) {
    console.error('❌ Test error:', err.message);
  }
}

testAutoSchedule();
