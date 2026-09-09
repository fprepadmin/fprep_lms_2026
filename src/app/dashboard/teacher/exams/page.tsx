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

  // 1. Lấy danh sách lớp và môn học phụ trách
  const [
    assignmentsRes,
    allSubjectsRes,
    allClassesRes
  ] = await Promise.all([
    supabase.from('teacher_classes').select('*, classes(*), subjects(*)').eq('teacher_id', teacherId),
    supabase.from('subjects').select('*'),
    supabase.from('classes').select('*')
  ]);

  const assignments = assignmentsRes.data || [];
  const allSubjects = allSubjectsRes.data || [];
  const allClasses = allClassesRes.data || [];

  let subjectIds = assignments.map((a: any) => a.subject_id).filter(Boolean);
  if (subjectIds.length === 0 && allSubjects.length > 0) {
    subjectIds = allSubjects.map((s: any) => s.id);
  }

  const teacherClassIds = assignments.map((a: any) => a.class_id).filter(Boolean);

  // 2. Lấy toàn bộ đề thi, học sinh và phân công bài tập
  const [
    examsRes,
    allChaptersRes,
    studentsRes
  ] = await Promise.all([
    supabase.from('exams').select('*, subjects(*)').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('chapters').select('*, lessons(*)').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('student_details').select('*, classes(*)').in('class_id', teacherClassIds.length > 0 ? teacherClassIds : (allClasses.length > 0 ? allClasses.map((c: any) => c.id) : [crypto.randomUUID()]))
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
            <ClipboardList className="h-3.5 w-3.5" /> Ngân Hàng Đề Thi & Khảo Thí
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Biên Soạn & Quản Lý Đề Thi
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Soạn đề kiểm tra định kỳ (15p, 45p, giữa kỳ), đề thi thử THPT Quốc Gia, giao bài cho lớp và theo dõi nộp bài chuẩn LMS.
          </p>
        </div>
      </div>

      <TeacherExamsClient
        exams={exams}
        questions={questionsRes.data || []}
        examResults={examResultsRes.data || []}
        examAssignments={examAssignmentsRes.data || []}
        assignments={assignments}
        allSubjects={allSubjects}
        allClasses={allClasses}
        students={students}
        chapters={chapters}
        token={token}
        teacherId={teacherId}
      />
    </div>
  );
}
