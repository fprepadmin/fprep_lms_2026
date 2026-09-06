import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import StudentDashboardClient from '../StudentDashboardClient';
import { BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentSubjectsPage() {
  // 1. Xác thực học sinh
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value;
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let studentId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    studentId = payload.sub;
  } catch (err) {
    redirect('/');
  }

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
  const [
    subjectsRes,
    chaptersRes,
    progressRes,
    examsRes
  ] = await Promise.all([
    supabase.from('subjects').select('*').in('group_type', groupType === 'X' ? ['X', 'ENG'] : ['T', 'ENG']).order('name'),
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
