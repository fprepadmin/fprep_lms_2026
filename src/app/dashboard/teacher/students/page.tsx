import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherStudentsClient from './TeacherStudentsClient';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeacherStudentsPage() {
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

  // 0. Lấy profile của giáo viên hiện tại để kiểm tra vai trò
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherId)
    .single();

  const userRole = teacherProfile?.role || 'teacher';
  const isHOD = userRole === 'head_of_department';

  // 1. Xác định môn học phụ trách của Giáo viên / Trưởng bộ môn
  const { data: myTeaching } = await supabase
    .from('teacher_classes')
    .select('subject_id, subjects(*)')
    .eq('teacher_id', teacherId);

  const mySubjectId = myTeaching?.[0]?.subject_id || '';

  // 2. Phân công & Lớp học: HOD thấy toàn bộ lớp của môn mình, GVBM chỉ thấy lớp của mình
  let assignmentQuery = supabase.from('teacher_classes').select('*, classes(*), subjects(*)');
  if (isHOD && mySubjectId) {
    assignmentQuery = assignmentQuery.eq('subject_id', mySubjectId);
  } else {
    assignmentQuery = assignmentQuery.eq('teacher_id', teacherId);
  }

  let studentQuery = supabase.from('student_details').select('*, classes(*)');
  
  const [
    assignmentsRes,
    allClassesRes,
    allTeachersRes,
    chaptersRes,
    allExamsRes,
    examAssignmentsRes
  ] = await Promise.all([
    assignmentQuery,
    supabase.from('classes').select('*').order('name'),
    supabase.from('profiles').select('*').in('role', ['teacher', 'head_of_department']),
    supabase.from('chapters').select('*, lessons(*)'),
    supabase.from('exams').select('*, subjects(*)').order('created_at', { ascending: false }),
    supabase.from('exam_assignments').select('*, classes(*)')
  ]);

  const assignments = assignmentsRes.data || [];
  const allClasses = allClassesRes.data || [];
  const allTeachers = allTeachersRes.data || [];
  const chapters = chaptersRes.data || [];
  const allExams = allExamsRes.data || [];
  const examAssignments = examAssignmentsRes.data || [];

  const classIds = assignments.map((a: any) => a.class_id).filter(Boolean);
  studentQuery = studentQuery.in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]);

  const { data: students } = await studentQuery;
  const studentList = students || [];
  const studentUserIds = studentList.map((s: any) => s.student_id);

  // 2. TỐI ƯU TRUY VẤN SONG SONG CHO CÁC DỮ LIỆU CÒN LẠI
  let progressQuery = supabase.from('study_progress').select('*, lessons(*)');
  let logsQuery = supabase.from('study_logs').select('*, lessons(*)');
  let examResultsQuery = supabase.from('exam_results').select('*, exams(*)');
  let profilesQuery = supabase.from('profiles').select('*').in('id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);

  if (!isHOD) {
    progressQuery = progressQuery.in('student_id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);
    logsQuery = logsQuery.in('student_id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);
    examResultsQuery = examResultsQuery.in('student_id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);
  }

  const [
    studentProfilesRes,
    progressRes,
    logsRes,
    examResultsRes
  ] = await Promise.all([
    profilesQuery,
    progressQuery,
    logsQuery,
    examResultsQuery
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* HEADER QUẢN LÝ HỌC SINH (CHUẨN FPREP BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <Users className="h-3.5 w-3.5" /> Theo dõi & Giám sát Tự học Khối 12
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Theo Dõi Tiến Trình Học Sinh
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Quản lý danh sách lớp học, phân công giảng dạy và theo dõi chi tiết điểm số, thời lượng học của từng học sinh.
          </p>
        </div>
      </div>

      <TeacherStudentsClient
        assignments={assignments}
        students={studentList}
        studentProfiles={studentProfilesRes.data || []}
        allClasses={allClasses}
        progress={progressRes.data || []}
        logs={logsRes.data || []}
        examResults={examResultsRes.data || []}
        chapters={chapters}
        token={token}
        teacherId={teacherId}
        userRole={userRole}
        allTeachers={allTeachers}
        allExams={allExams}
        examAssignments={examAssignments}
      />
    </div>
  );
}
