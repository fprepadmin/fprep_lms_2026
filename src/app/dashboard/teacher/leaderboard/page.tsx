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

  // 3. Phân công & Lớp học
  let assignmentQuery = supabase.from('teacher_classes').select('*, classes(*), subjects(*)');
  if (isHOD && mySubjectId) {
    assignmentQuery = assignmentQuery.eq('subject_id', mySubjectId);
  } else {
    assignmentQuery = assignmentQuery.eq('teacher_id', teacherId);
  }

  const [
    assignmentsRes,
    allClassesRes,
    allExamsRes
  ] = await Promise.all([
    assignmentQuery,
    supabase.from('classes').select('*').order('name'),
    supabase.from('exams').select('*, subjects(*)').order('created_at', { ascending: false })
  ]);

  const assignments = assignmentsRes.data || [];
  const allClasses = allClassesRes.data || [];
  const allExams = allExamsRes.data || [];

  const classIds = assignments.map((a: any) => a.class_id).filter(Boolean);

  // 4. Lấy danh sách học sinh thuộc các lớp phụ trách
  let studentQuery = supabase.from('student_details').select('*, classes(*)');
  if (classIds.length > 0) {
    studentQuery = studentQuery.in('class_id', classIds);
  }
  const { data: students } = await studentQuery;
  const studentList = students || [];
  const studentUserIds = studentList.map((s: any) => s.student_id);

  // 5. Lấy kết quả thi và profile học sinh
  let examResultsQuery = supabase
    .from('exam_results')
    .select('*, exams(*)')
    .order('created_at', { ascending: false });

  let profilesQuery = supabase
    .from('profiles')
    .select('*')
    .in('id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);

  if (!isHOD && studentUserIds.length > 0) {
    examResultsQuery = examResultsQuery.in('student_id', studentUserIds);
  }

  const [examResultsRes, profilesRes] = await Promise.all([
    examResultsQuery,
    profilesQuery
  ]);

  const examResults = examResultsRes.data || [];
  const studentProfiles = profilesRes.data || [];

  return (
    <div className="space-y-6 w-full animate-fade-in">
      <TeacherLeaderboardClient
        teacherId={teacherId}
        subjectName={mySubjectName}
        isHOD={isHOD}
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
