import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherStudentsClient from './TeacherStudentsClient';

import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function TeacherStudentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let teacherId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    teacherId = payload.sub;
  } catch (err) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  // 0. Lấy profile của giáo viên hiện tại để kiểm tra vai trò
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherId)
    .single();

  const userRole = teacherProfile?.role || 'teacher';
  const isHOD = userRole === 'head_of_department';

  // 1. Lấy danh sách phân công lớp học
  // Trưởng bộ môn lấy tất cả phân công, giáo viên thường chỉ lấy của mình
  let assignmentQuery = supabase.from('teacher_classes').select('*, classes(*), subjects(*)');
  if (!isHOD) {
    assignmentQuery = assignmentQuery.eq('teacher_id', teacherId);
  }
  const { data: assignments } = await assignmentQuery;

  const classIds = assignments?.map((a: any) => a.class_id) || [];
  const subjectIds = assignments?.map((a: any) => a.subject_id) || [];

  // 2. Lấy danh sách học sinh
  // Trưởng bộ môn lấy tất cả học sinh, giáo viên thường chỉ lấy học sinh các lớp phụ trách
  let studentQuery = supabase.from('student_details').select('*, classes(*)');
  if (!isHOD) {
    studentQuery = studentQuery.in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]);
  }
  const { data: students } = await studentQuery;

  // 3. Lấy tất cả tài khoản học sinh để lấy Email tương ứng
  const studentUserIds = students?.map((s: any) => s.student_id) || [];
  const { data: studentProfiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);

  // 3.5. Lấy danh sách tất cả các giáo viên để phân bộ môn (Dành cho Trưởng bộ môn)
  const { data: allTeachers } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['teacher', 'head_of_department']);

  // 4. Lấy danh sách tất cả các lớp có trong hệ thống
  const { data: allClasses } = await supabase
    .from('classes')
    .select('*')
    .order('name');

  // 5. Lấy tiến độ học tập
  let progressQuery = supabase.from('study_progress').select('*, lessons(*)');
  if (!isHOD) {
    progressQuery = progressQuery.in('student_id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);
  }
  const { data: progress } = await progressQuery;

  // 6. Lấy logs học tập
  let logsQuery = supabase.from('study_logs').select('*, lessons(*)');
  if (!isHOD) {
    logsQuery = logsQuery.in('student_id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);
  }
  const { data: logs } = await logsQuery;

  // 7. Lấy kết quả thi
  let examResultsQuery = supabase.from('exam_results').select('*, exams(*)');
  if (!isHOD) {
    examResultsQuery = examResultsQuery.in('student_id', studentUserIds.length > 0 ? studentUserIds : [crypto.randomUUID()]);
  }
  const { data: examResults } = await examResultsQuery;

  // 8. Lấy chương học và bài giảng
  let chaptersQuery = supabase.from('chapters').select('*, lessons(*)');
  if (!isHOD) {
    chaptersQuery = chaptersQuery.in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]);
  }
  const { data: chapters } = await chaptersQuery;



  return (
    <div className="space-y-8 w-full">
      {/* HEADER QUẢN LÝ HỌC SINH */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            Học vụ chính khóa THPT FPT
          </div>
          <h1 className="text-3xl font-black text-foreground">
            {isHOD ? 'Quản Lý Lớp & Phân Công Giáo Viên' : 'Quản Lý Lớp & Phân Tích Học Tập'}
          </h1>
          <p className="text-xs text-muted-foreground font-semibold">
            {isHOD 
              ? 'Giao diện Trưởng bộ môn: Quản lý phân công giáo viên bộ môn và theo dõi tổng thể tiến độ các lớp học.' 
              : 'Báo cáo chi tiết biểu đồ học tập, quản lý danh sách học sinh và phân bổ lớp học phụ trách bộ môn.'}
          </p>
        </div>
      </div>

      <TeacherStudentsClient
        assignments={assignments || []}
        students={students || []}
        studentProfiles={studentProfiles || []}
        allClasses={allClasses || []}
        progress={progress || []}
        logs={logs || []}
        examResults={examResults || []}
        chapters={chapters || []}
        token={token}
        teacherId={teacherId}
        userRole={userRole}
        allTeachers={allTeachers || []}
      />
    </div>
  );
}
