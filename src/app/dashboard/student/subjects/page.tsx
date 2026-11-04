import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import StudentDashboardClient from '../StudentDashboardClient';
import { BookOpen } from 'lucide-react';
import { filterAccessibleSubjectsForStudent } from '@/lib/schoolUtils';

export const dynamic = 'force-dynamic';

export default async function StudentSubjectsPage() {
  // 1. Xác thực học sinh
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const studentId = payload.sub;
  const studentEmail = payload.email || '';

  const supabase = (await getSupabaseServerClient()) || supabaseAdmin;
  if (!supabase) {
    redirect('/dashboard/student');
  }

  // 2. Lấy thông tin lớp học và ban học sinh (với cơ chế dự phòng tra cứu theo email)
  let studentDetail: any = null;
  if (studentId) {
    const { data: detailData } = await supabase
      .from('student_details')
      .select('*, classes(*)')
      .eq('student_id', studentId)
      .maybeSingle();

    studentDetail = detailData;
  }

  if (!studentDetail && studentEmail) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', studentEmail.trim().toLowerCase())
      .maybeSingle();

    if (profileByEmail) {
      const { data: detailByProfile } = await supabase
        .from('student_details')
        .select('*, classes(*)')
        .eq('student_id', profileByEmail.id)
        .maybeSingle();

      if (detailByProfile) studentDetail = detailByProfile;
    }
  }

  const classId = studentDetail?.class_id;
  const groupType = studentDetail?.classes?.group_type || 'T';

  // 3. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    allSubjectsRes,
    teacherClassesRes,
    chaptersRes,
    progressRes,
    examsRes
  ] = await Promise.all([
    supabase.from('subjects').select('*').order('name'),
    classId 
      ? supabase.from('teacher_classes').select('subject_id').eq('class_id', classId)
      : Promise.resolve({ data: [] }),
    supabase.from('chapters').select('*, lessons(*)').order('order_index', { ascending: true }),
    supabase.from('study_progress').select('*').eq('student_id', studentId),
    supabase.from('exams').select('*')
  ]);

  const assignedSubjectIds = (teacherClassesRes.data || []).map((t: any) => t.subject_id).filter(Boolean);
  const subjects = filterAccessibleSubjectsForStudent(allSubjectsRes.data || [], groupType, assignedSubjectIds);
  const subjectIds = new Set(subjects.map((s: any) => s.id));
  const chapters = (chaptersRes.data || []).filter((c: any) => subjectIds.has(c.subject_id));
  const progress = progressRes.data || [];
  const exams = (examsRes.data || []).filter((e: any) => subjectIds.has(e.subject_id));

  return (
    <div className="w-full animate-fade-in">
      <StudentDashboardClient 
        subjects={subjects}
        chapters={chapters}
        progress={progress}
        exams={exams}
        examResults={[]}
      />
    </div>
  );
}
