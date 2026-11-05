import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherExamsClient from '../../teacher/exams/TeacherExamsClient';
import { ClipboardList, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminExamsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const adminId = payload.sub;
  const adminEmail = payload.email || '';
  const userRole = payload.role || 'admin';

  if (userRole !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await getSupabaseServerClient();

  // Xác định ID hồ sơ chuẩn trong CSDL
  let effectiveAdminId = adminId;
  if (adminEmail) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', adminEmail.trim().toLowerCase())
      .maybeSingle();
    if (prof) {
      effectiveAdminId = prof.id;
    }
  }

  // 1. Quản trị viên có toàn quyền truy cập tất cả môn học, lớp học và đề thi
  const [
    allSubjectsRes,
    allClassesRes,
    examsRes,
    allChaptersRes,
    studentsRes,
    assignmentsRes
  ] = await Promise.all([
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('classes').select('*').order('name', { ascending: true }),
    supabase.from('exams').select('*, subjects(*)').order('created_at', { ascending: false }),
    supabase.from('chapters').select('*, lessons(*)'),
    supabase.from('student_details').select('*, classes(*)'),
    supabase.from('teacher_classes').select('*, classes(*), subjects(*)')
  ]);

  const allSubjects = allSubjectsRes.data || [];
  const allClasses = allClassesRes.data || [];
  const exams = examsRes.data || [];
  const chapters = allChaptersRes.data || [];
  const students = studentsRes.data || [];
  const assignments = assignmentsRes.data || [];
  const examIds = exams.map((e: any) => e.id);

  // 2. Lấy toàn bộ câu hỏi, kết quả thi và phân công giao bài
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
      {/* HEADER QUẢN LÝ ĐỀ THI TOÀN HỆ THỐNG */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 dark:bg-red-500/20 px-3 py-0.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20">
            <ShieldCheck className="h-3.5 w-3.5" /> 
            Quản Trị Viên • Toàn Quyền Quản Lý Ngân Hàng Đề Thi & Khảo Thí
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Quản Lý & Sao Chép Đề Thi Toàn Trường
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Biên soạn, rà soát đề thi tất cả các môn, tự động sao chép JSON chuẩn Dạng 2 và theo dõi nộp bài toàn diện.
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
        teacherId={effectiveAdminId}
      />
    </div>
  );
}
