import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherLeaderboardClient from './TeacherLeaderboardClient';

export const dynamic = 'force-dynamic';

export default async function TeacherLeaderboardPage() {
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

  // 1. Lấy thông tin profile của giáo viên
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherId)
    .single();

  const userRole = teacherProfile?.role || 'teacher';
  const isHOD = userRole === 'head_of_department';

  // 2. Xác định môn học phụ trách của Giáo viên / Trưởng bộ môn
  const { data: myTeaching } = await supabase
    .from('teacher_classes')
    .select('subject_id, subjects(*)')
    .eq('teacher_id', teacherId);

  const mySubjectId = myTeaching?.[0]?.subject_id || '';
  const mySubjectName = (myTeaching?.[0] as any)?.subjects?.name || 'Toán học';

  // 3. Phân công & Lớp học & Môn học
  let assignmentQuery = supabase.from('teacher_classes').select('*, classes(*), subjects(*)');
  if (isHOD && mySubjectId) {
    assignmentQuery = assignmentQuery.eq('subject_id', mySubjectId);
  } else if (!['admin', 'head_of_department'].includes(userRole)) {
    assignmentQuery = assignmentQuery.eq('teacher_id', teacherId);
  }

  const [
    subjectsRes,
    assignmentsRes,
    allClassesRes,
    allExamsRes
  ] = await Promise.all([
    supabase.from('subjects').select('*').order('name'),
    assignmentQuery,
    supabase.from('classes').select('*').order('name'),
    supabase.from('exams').select('*, subjects(*)').order('created_at', { ascending: false })
  ]);

  const allSubjects = subjectsRes.data || [];
  const assignments = assignmentsRes.data || [];
  const allClasses = allClassesRes.data || [];
  const allExams = allExamsRes.data || [];

  const classIds = assignments.map((a: any) => a.class_id).filter(Boolean);

  // 4. Lấy danh sách toàn bộ học sinh để hỗ trợ bảng vàng theo từng môn toàn khối
  const { data: students } = await supabase.from('student_details').select('*, classes(*)');
  const studentList = students || [];
  const studentUserIds = studentList.map((s: any) => s.student_id);

  // 5. Lấy kết quả thi và profile học sinh kèm thông tin đề thi và môn học
  const [examResultsRes, profilesRes] = await Promise.all([
    supabase
      .from('exam_results')
      .select('*, exams(id, title, subject_id, exam_type, exam_category)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .in('id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()])
  ]);

  const examResults = examResultsRes.data || [];
  const studentProfiles = profilesRes.data || [];

  return (
    <div className="space-y-6 w-full animate-fade-in">
      <TeacherLeaderboardClient
        teacherId={teacherId}
        subjectName={mySubjectName}
        mySubjectId={mySubjectId}
        allSubjects={allSubjects}
        isHOD={isHOD}
        userRole={userRole}
        classes={allClasses}
        assignedClassIds={classIds}
        students={studentList}
        studentProfiles={studentProfiles}
        exams={allExams}
        examResults={examResults}
      />
    </div>
  );
}
