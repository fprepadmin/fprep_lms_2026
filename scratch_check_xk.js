const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('D:/FPREP/.env.local', 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim().replace(/^['\"]|['\"]$/g, '');
    env[key] = val;
  }
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function filterAccessibleSubjectsForStudent(allSubjects, groupType = 'T', assignedSubjectIds = []) {
  const assignedSet = new Set(assignedSubjectIds.filter(Boolean));
  const normGroup = (groupType || 'T').toUpperCase();

  return (allSubjects || []).filter(sub => {
    if (!sub || !sub.id) return false;

    if (assignedSet.has(sub.id)) {
      return true;
    }

    if (normGroup === 'T' && (sub.group_type === 'T' || sub.group_type === 'ENG')) {
      return true;
    }
    if (normGroup === 'X' && (sub.group_type === 'X' || sub.group_type === 'ENG')) {
      return true;
    }
    if (normGroup === 'K' && (sub.group_type === 'ENG' || sub.group_type === 'K')) {
      return true;
    }

    if (!['T', 'X', 'K'].includes(normGroup)) {
      return sub.group_type === 'T' || sub.group_type === 'ENG';
    }

    return false;
  });
}

async function testStudent(studentId) {
  console.log(`\n================ Testing for student: ${studentId} ================`);
  // 1. studentDetail
  const { data: studentDetail } = await supabase
    .from('student_details')
    .select('*, classes(*)')
    .eq('student_id', studentId)
    .maybeSingle();

  console.log('Class:', studentDetail?.classes?.name, 'Group:', studentDetail?.classes?.group_type);
  const classId = studentDetail?.class_id;
  const groupType = studentDetail?.classes?.group_type || 'T';

  // 2. teacherClasses
  const { data: tcData } = await supabase
    .from('teacher_classes')
    .select('subject_id')
    .eq('class_id', classId);
  const assignedIds = (tcData || []).map(t => t.subject_id);
  console.log('Assigned subject IDs count:', assignedIds.length);

  // 3. allSubjects
  const { data: allSubjects } = await supabase.from('subjects').select('*').order('name');
  const subjects = filterAccessibleSubjectsForStudent(allSubjects, groupType, assignedIds);
  console.log('Accessible subjects:');
  console.table(subjects.map(s => ({ name: s.name, group: s.group_type })));

  // 4. Exams for student
  const subjectIds = new Set(subjects.map(s => s.id));
  const { data: allExams } = await supabase.from('exams').select('id, title, subject_id, subjects(name)');
  const accessibleExams = (allExams || []).filter(e => subjectIds.has(e.subject_id));
  console.log(`Accessible exams count: ${accessibleExams.length} / ${allExams?.length}`);
  const examSubjects = [...new Set(accessibleExams.map(e => e.subjects?.name))];
  console.log('Subjects with accessible exams:', examSubjects);
}

async function run() {
  const { data: ea, error } = await supabase
    .from('exam_assignments')
    .select('*');
  
  console.log('exam_assignments error:', error);
  console.log('Total exam_assignments:', ea?.length);
  console.table(ea);
}

run();
