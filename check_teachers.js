const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envVars[match[1]] = value.trim();
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: teachers } = await supabase.from('profiles').select('id, email, role').in('role', ['teacher', 'head_of_department']);
  console.log('Total teachers in profiles:', teachers?.length);
  for (const t of teachers || []) {
    const { data: tc } = await supabase.from('teacher_classes').select('*, classes(name), subjects(name)').eq('teacher_id', t.id);
    console.log(`Teacher: ${t.email} (${t.role}) [ID: ${t.id}] - Assigned classes: ${tc?.length}`);
    if (tc && tc.length > 0) {
      console.log('   Classes:', tc.map(x => `${x.classes?.name}: ${x.subjects?.name}`).join(', '));
    }
  }
}

run();
