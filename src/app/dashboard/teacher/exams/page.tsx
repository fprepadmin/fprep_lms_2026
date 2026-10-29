import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherExamsClient from './TeacherExamsClient';
import { ClipboardList } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeacherExamsPage() {
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

  // 1. Lấy thông tin vai trò, danh sách lớp và môn học phụ trách
  const [
    profileRes,
    assignmentsRes,
    allSubjectsRes,
    allClassesRes
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', teacherId).single(),
    supabase.from('teacher_classes').select('*, classes(*), subjects(*)').eq('teacher_id', teacherId),
    supabase.from('subjects').select('*'),
    supabase.from('classes').select('*')
  ]);

  const userRole = profileRes.data?.role || payload.role || 'teacher';
  const isSystemAdmin = userRole === 'admin';
  const assignments = assignmentsRes.data || [];
  const allSubjects = allSubjectsRes.data || [];
  const allClasses = allClassesRes.data || [];

  // Lọc các môn học được phân công cho Giáo viên
  const assignedSubjectsMap = new Map<string, any>();
  assignments.forEach((a: any) => {
    if (a.subject_id && a.subjects) {
      assignedSubjectsMap.set(a.subject_id, a.subjects);
    }
  });

  const assignedSubjects = Array.from(assignedSubjectsMap.values());

  // NGUYÊN TẮC: Giáo viên môn nào thì CHỈ ĐƯỢC soạn đề và quản lý đề thi môn đó!
  // Chỉ tài khoản System Admin mới được quản lý tất cả các môn.
  const allowedSubjects = isSystemAdmin
    ? allSubjects
    : assignedSubjects;

  const subjectIds = allowedSubjects.map((s: any) => s.id);
  const teacherClassIds = assignments.map((a: any) => a.class_id).filter(Boolean);
  const allowedClasses = teacherClassIds.length > 0
    ? allClasses.filter((c: any) => teacherClassIds.includes(c.id))
    : (isSystemAdmin ? allClasses : []);

  // 2. Lấy toàn bộ đề thi, chương học của ĐÚNG CÁC MÔN ĐƯỢC PHÂN CÔNG
  const [
    examsRes,
    allChaptersRes,
    studentsRes
  ] = await Promise.all([
    supabase.from('exams').select('*, subjects(*)').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('chapters').select('*, lessons(*)').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('student_details').select('*, classes(*)').in('class_id', teacherClassIds.length > 0 ? teacherClassIds : (isSystemAdmin && allClasses.length > 0 ? allClasses.map((c: any) => c.id) : [crypto.randomUUID()]))
  ]);

  const exams = examsRes.data || [];
  const chapters = allChaptersRes.data || [];
  const students = studentsRes.data || [];
  const examIds = exams.map((e: any) => e.id);

  // 3. Lấy câu hỏi, kết quả thi và phân công giao bài
  const [
    questionsRes,
    examResultsRes,
    examAssignmentsRes
  ] = await Promise.all([
    supabase.from('questions').select('*').in('exam_id', examIds.length > 0 ? examIds : [crypto.randomUUID()]),
    supabase.from('exam_results').select('*').in('exam_id', examIds.length > 0 ? examIds : [crypto.randomUUID()]),
    supabase.from('exam_assignments').select('*, classes(*)').in('exam_id', examIds.length > 0 ? examIds : [crypto.randomUUID()])
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* HEADER QUẢN LÝ & SOẠN ĐỀ THI */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <ClipboardList className="h-3.5 w-3.5" /> 
            {allowedSubjects.length > 0
              ? `Ngân Hàng Đề Thi Môn: ${allowedSubjects.map(s => s.name).join(', ')}`
              : 'Ngân Hàng Đề Thi & Khảo Thí'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Biên Soạn & Quản Lý Đề Thi
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            {allowedSubjects.length > 0
              ? `Soạn đề kiểm tra định kỳ (15p, 45p, giữa kỳ), đề thi thử THPT Quốc Gia cho môn: ${allowedSubjects.map(s => s.name).join(', ')}.`
              : 'Soạn đề kiểm tra định kỳ (15p, 45p, giữa kỳ), đề thi thử THPT Quốc Gia, giao bài cho lớp và theo dõi nộp bài chuẩn LMS.'}
          </p>
        </div>
      </div>

      {allowedSubjects.length === 0 ? (
        <div className="bg-card border border-amber-500/30 rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">Chưa có phân công môn học</h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Tài khoản của Thầy/Cô chưa được phân công môn học giảng dạy nào trên hệ thống. 
            Theo quy định, Thầy/Cô chỉ được biên soạn và quản lý đề thi cho môn học được phân công. 
            Vui lòng liên hệ Quản trị viên để được gán môn học trước khi bắt đầu tạo đề thi.
          </p>
        </div>
      ) : (
        <TeacherExamsClient
          exams={exams}
          questions={questionsRes.data || []}
          examResults={examResultsRes.data || []}
          examAssignments={examAssignmentsRes.data || []}
          assignments={assignments}
          allSubjects={allowedSubjects}
          allClasses={allowedClasses}
          students={students}
          chapters={chapters}
          token={token}
          teacherId={teacherId}
        />
      )}
    </div>
  );
}
