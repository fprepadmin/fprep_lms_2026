import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import StudentDashboardClient from '../StudentDashboardClient';
import { BookOpen } from 'lucide-react';

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

  if (!supabaseAdmin) {
    redirect('/dashboard/student');
  }

  // 2. Lấy thông tin lớp học và ban học sinh
  const { data: studentDetail } = await supabaseAdmin
    .from('student_details')
    .select('*, classes(*)')
    .eq('student_id', studentId)
    .single();

  const groupType = studentDetail?.classes?.group_type || 'T';

  // 3. Lấy danh sách môn học thuộc ban đào tạo của học sinh
  let subjectQuery = supabaseAdmin.from('subjects').select('*');
  if (groupType === 'T') {
    subjectQuery = subjectQuery.in('group_type', ['T', 'ENG']);
  } else if (groupType === 'X') {
    subjectQuery = subjectQuery.in('group_type', ['X', 'ENG']);
  }
  const { data: subjects } = await subjectQuery;
  const subjectIds = subjects?.map((s: any) => s.id) || [];

  // 4. Lấy tất cả chương học và bài học của các môn học này
  const { data: chapters } = await supabaseAdmin
    .from('chapters')
    .select('*, lessons(*)')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()])
    .order('order_index', { ascending: true });

  // 5. Lấy tiến độ học tập (các bài đã hoàn thành)
  const { data: progress } = await supabaseAdmin
    .from('study_progress')
    .select('*')
    .eq('student_id', studentId);

  // 6. Lấy tất cả đề thi của các môn học này
  const { data: exams } = await supabaseAdmin
    .from('exams')
    .select('*')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]);

  return (
    <div className="space-y-8 w-full">
      
      {/* HEADER MÔN HỌC */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            <BookOpen className="h-3.5 w-3.5" /> Chương trình học chính thức
          </div>
          <h1 className="text-3xl font-black text-foreground">Môn Học Tự Học</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Bấm chọn môn học để xem các chương học, bài giảng và học liệu tương ứng.
          </p>
        </div>
      </div>

      <StudentDashboardClient 
        subjects={subjects || []}
        chapters={chapters || []}
        progress={progress || []}
        exams={exams || []}
        examResults={[]}
      />
    </div>
  );
}
