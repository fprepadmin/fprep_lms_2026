import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherDashboardClient from '../TeacherDashboardClient';
import { BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeacherMaterialsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const teacherId = payload.sub;

  const supabase = await getSupabaseServerClient();

  // 1. Lấy danh sách lớp, môn học phân công và toàn bộ danh mục môn học
  const [
    assignmentsRes,
    allSubjectsRes
  ] = await Promise.all([
    supabase.from('teacher_classes').select('*, classes(*), subjects(*)').eq('teacher_id', teacherId),
    supabase.from('subjects').select('*')
  ]);

  const assignments = assignmentsRes.data || [];
  const allSubjects = allSubjectsRes.data || [];

  let classIds = assignments.map((a: any) => a.class_id).filter(Boolean);
  let subjectIds = assignments.map((a: any) => a.subject_id).filter(Boolean);

  // Fallback nếu giáo viên chưa được gán teacher_classes trực tiếp (như demo mode hoặc HOD)
  if (subjectIds.length === 0 && allSubjects.length > 0) {
    subjectIds = allSubjects.map((s: any) => s.id);
  }

  // 2. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    studentsRes,
    chaptersRes,
    examsRes
  ] = await Promise.all([
    supabase.from('student_details').select('*, classes(*)').in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]),
    supabase.from('chapters').select('*, lessons(*, lesson_materials(*))').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]).order('order_index', { ascending: true }),
    supabase.from('exams').select('*').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()])
  ]);

  const students = studentsRes.data || [];
  const chapters = chaptersRes.data || [];
  const exams = examsRes.data || [];
  const studentIds = students.map((s: any) => s.student_id);
  const examIds = exams.map((e: any) => e.id);

  // 3. Lấy tiến độ, logs, kết quả thi và câu hỏi song song
  const [
    progressRes,
    logsRes,
    examResultsRes,
    questionsRes
  ] = await Promise.all([
    supabase.from('study_progress').select('*, lessons(*)').in('student_id', studentIds.length > 0 ? studentIds : [crypto.randomUUID()]),
    supabase.from('study_logs').select('*, lessons(*)').in('student_id', studentIds.length > 0 ? studentIds : [crypto.randomUUID()]),
    supabase.from('exam_results').select('*').in('student_id', studentIds.length > 0 ? studentIds : [crypto.randomUUID()]),
    supabase.from('questions').select('*').in('exam_id', examIds.length > 0 ? examIds : [crypto.randomUUID()])
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* HEADER BIÊN SOẠN HỌC LIỆU (CHUẨN FMATH BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <BookOpen className="h-3.5 w-3.5" /> Biên soạn nội dung tự học & Đề thi
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Biên Soạn Bài Giảng & Đề Thi
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Tạo chương, bài học học liệu, biên soạn bộ câu hỏi trắc nghiệm tự luyện cho học sinh khối 12.
          </p>
        </div>
      </div>

      <TeacherDashboardClient
        assignments={assignments || []}
        students={students}
        chapters={chapters}
        progress={progressRes.data || []}
        logs={logsRes.data || []}
        examResults={examResultsRes.data || []}
        exams={exams}
        questions={questionsRes.data || []}
        allSubjects={allSubjects}
        token={token}
        teacherId={teacherId}
        viewMode="materials"
      />
    </div>
  );
}
