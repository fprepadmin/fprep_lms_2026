import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherLeaderboardClient from '@/app/dashboard/teacher/leaderboard/TeacherLeaderboardClient';

export const dynamic = 'force-dynamic';

export default async function StudentLeaderboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const currentUserId = payload.sub;

  const supabase = await getSupabaseServerClient();

  const [
    subjectsRes,
    allClassesRes,
    allExamsRes,
    studentsRes
  ] = await Promise.all([
    supabase.from('subjects').select('*').order('name'),
    supabase.from('classes').select('*').order('name'),
    supabase.from('exams').select('*, subjects(*)').order('created_at', { ascending: false }),
    supabase.from('student_details').select('*, classes(*)')
  ]);

  const allSubjects = subjectsRes.data || [];
  const allClasses = allClassesRes.data || [];
  const allExams = allExamsRes.data || [];
  const studentList = studentsRes.data || [];
  const studentUserIds = studentList.map((s: any) => s.student_id);

  // Lấy kết quả thi và profile học sinh kèm thông tin đề thi và môn học
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
        teacherId={currentUserId}
        subjectName="Tất cả các môn"
        mySubjectId=""
        allSubjects={allSubjects}
        isHOD={true}
        userRole="student"
        isStudentView={true}
        classes={allClasses}
        assignedClassIds={[]}
        students={studentList}
        studentProfiles={studentProfiles}
        exams={allExams}
        examResults={examResults}
      />
    </div>
  );
}
