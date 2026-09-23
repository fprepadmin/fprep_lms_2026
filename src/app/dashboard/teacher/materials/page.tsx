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

  // 1. Lấy thông tin vai trò, danh sách lớp & môn học phân công, và toàn bộ danh mục môn học
  const [
    profileRes,
    assignmentsRes,
    allSubjectsRes
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', teacherId).single(),
    supabase.from('teacher_classes').select('*, classes(*), subjects(*)').eq('teacher_id', teacherId),
    supabase.from('subjects').select('*')
  ]);

  const userRole = profileRes.data?.role || payload.role || 'teacher';
  const isSystemAdmin = userRole === 'admin';
  const assignments = assignmentsRes.data || [];
  const allSubjects = allSubjectsRes.data || [];

  // Lấy các môn học mà giáo viên này ĐƯỢC PHÂN CÔNG GIẢNG DẠY
  const assignedSubjectsMap = new Map<string, any>();
  assignments.forEach((a: any) => {
    if (a.subject_id && a.subjects) {
      assignedSubjectsMap.set(a.subject_id, a.subjects);
    }
  });

  const assignedSubjects = Array.from(assignedSubjectsMap.values());

  // NGUYÊN TẮC QUAN TRỌNG: Giáo viên môn nào thì CHỈ ĐƯỢC soạn bài và xem học liệu môn đó!
  // Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập toàn bộ môn học.
  const allowedSubjects = isSystemAdmin
    ? allSubjects
    : assignedSubjects;

  const subjectIds = allowedSubjects.map((s: any) => s.id);
  const classIds = assignments.map((a: any) => a.class_id).filter(Boolean);

  // 2. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL - CHỈ LẤY DỮ LIỆU CỦA MÔN ĐƯỢC PHÂN CÔNG
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

  const totalLessons = chapters.reduce((acc: number, c: any) => acc + (c.lessons?.length || 0), 0);
  let totalMaterials = 0;
  chapters.forEach((chap: any) => {
    chap.lessons?.forEach((les: any) => {
      totalMaterials += (les.lesson_materials || []).filter((m: any) => m.title !== '__theory_markdown__').length;
    });
  });

  return (
    <div className="space-y-5 w-full animate-fade-in">
      {/* HEADER BIÊN SOẠN HỌC LIỆU CHUẨN LMS */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            {allowedSubjects.length > 0 
              ? `Kho Học Liệu & Bài Giảng: ${allowedSubjects.map(s => s.name).join(', ')}`
              : 'Kho Học Liệu & Bài Giảng'}
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Biên Soạn Bài Giảng & Học Liệu
          </h1>
          <p className="text-xs text-muted-foreground font-semibold m-0">
            {allowedSubjects.length > 0
              ? `Quản lý cấu trúc bài giảng, lý thuyết LaTeX, video và bài tập tự luyện cho môn: ${allowedSubjects.map(s => s.name).join(', ')}.`
              : 'Quản lý cấu trúc chương hồi, soạn thảo lý thuyết chuẩn LaTeX, liên kết video bài giảng và bài tập tự luyện.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <div className="bg-muted/40 border border-border px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase">Chương</span>
            <span className="text-sm font-black text-foreground">{chapters.length}</span>
          </div>
          <div className="bg-muted/40 border border-border px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase">Bài học</span>
            <span className="text-sm font-black text-primary">{totalLessons}</span>
          </div>
          <div className="bg-muted/40 border border-border px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase">Tài liệu</span>
            <span className="text-sm font-black text-green-600">{totalMaterials}</span>
          </div>
        </div>
      </div>

      {allowedSubjects.length === 0 ? (
        <div className="bg-card border border-amber-500/30 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <BookOpen className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Chưa có phân công môn học</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Tài khoản của Thầy/Cô chưa được phân công môn học giảng dạy nào trên hệ thống. 
            Theo quy định, Thầy/Cô chỉ được biên soạn bài giảng cho môn học được phân công. 
            Vui lòng liên hệ Quản trị viên để được gán môn học trước khi bắt đầu soạn bài.
          </p>
        </div>
      ) : (
        <TeacherDashboardClient
          assignments={assignments || []}
          students={students}
          chapters={chapters}
          progress={progressRes.data || []}
          logs={logsRes.data || []}
          examResults={examResultsRes.data || []}
          exams={exams}
          questions={questionsRes.data || []}
          allSubjects={allowedSubjects}
          token={token}
          teacherId={teacherId}
          viewMode="materials"
        />
      )}
    </div>
  );
}
