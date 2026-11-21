import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import StudentDashboardClient from '../StudentDashboardClient';
import { BookOpen } from 'lucide-react';

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

  const supabase = (await getSupabaseServerClient()) || supabaseAdmin;
  if (!supabase) {
    redirect('/dashboard/student');
  }

  // 2. Lấy thông tin lớp học và ban học sinh
  const { data: studentDetail } = await supabase
    .from('student_details')
    .select('*, classes(*)')
    .eq('student_id', studentId)
    .maybeSingle();

  const groupType = studentDetail?.classes?.group_type || 'T';

  // 3. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  // Học sinh lớp tự nhiên (Ban T) được cập nhật thêm môn Tiếng Anh và Lịch Sử
  const subjectsQuery = groupType === 'X'
    ? supabase.from('subjects').select('*').in('group_type', ['X', 'ENG']).order('name')
    : supabase.from('subjects').select('*').or('group_type.eq.T,group_type.eq.ENG,name.ilike.%sử%').order('name');

  const [
    subjectsRes,
    chaptersRes,
    progressRes,
    examsRes
  ] = await Promise.all([
    subjectsQuery,
    supabase.from('chapters').select('*, lessons(*)').order('order_index', { ascending: true }),
    supabase.from('study_progress').select('*').eq('student_id', studentId),
    supabase.from('exams').select('*')
  ]);

  const subjects = subjectsRes.data || [];
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
