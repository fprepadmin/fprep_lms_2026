import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { Users } from 'lucide-react';
import ClassroomClient from './ClassroomClient';

export const dynamic = 'force-dynamic';

export default async function ClassroomPage() {
  // 1. Xác thực học sinh
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value;
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let studentId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    studentId = payload.sub;
  } catch (err) {
    redirect('/');
  }

  const supabase = (await getSupabaseServerClient()) || supabaseAdmin;

  // 2. Lấy thông tin lớp học của học sinh
  const { data: studentDetail } = await supabase
    .from('student_details')
    .select('*, classes(*)')
    .eq('student_id', studentId)
    .maybeSingle();

  if (!studentDetail || !studentDetail.class_id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center space-y-4">
        <Users className="h-12 w-12 text-muted-foreground animate-bounce" />
        <h2 className="text-xl font-extrabold text-foreground">Bạn chưa được phân vào lớp nào</h2>
        <p className="text-xs text-muted-foreground">Vui lòng liên hệ Giáo viên chủ nhiệm hoặc Quản trị viên để được xếp lớp.</p>
      </div>
    );
  }

  const classInfo = studentDetail.classes;
  const groupType = classInfo.group_type || 'T';

  // 3. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    classmatesRes,
    rawTeacherAssignmentsRes,
    announcementsRes,
    subjectsRes,
    examResultsRes
  ] = await Promise.all([
    // Danh sách bạn cùng lớp
    supabase.from('student_details').select('student_id, mshs, full_name').eq('class_id', studentDetail.class_id).order('full_name'),
    // Giáo viên phụ trách
    supabase.from('teacher_classes').select('*, subjects(*)').eq('class_id', studentDetail.class_id),
    // Thông báo
    supabase.from('announcements').select('*').or(`target_type.eq.all,and(target_type.eq.individual,target_user_id.eq.${studentId}),target_type.is.null`).order('created_at', { ascending: false }),
    // Môn học thuộc ban
    supabase.from('subjects').select('id, name').in('group_type', groupType === 'X' ? ['X', 'ENG'] : ['T', 'ENG']),
    // Kết quả thi
    supabase.from('exam_results').select('*').eq('student_id', studentId)
  ]);

  const classmates = classmatesRes.data || [];
  const rawTeacherAssignments = rawTeacherAssignmentsRes.data || [];
  const announcements = announcementsRes.data || [];
  const subjects = subjectsRes.data || [];
  const examResults = examResultsRes.data || [];

  // Lấy email giáo viên phụ trách
  const teacherIds = rawTeacherAssignments.map((t: any) => t.teacher_id).filter(Boolean);
  let teacherProfiles: any[] = [];
  if (teacherIds.length > 0) {
    const { data: tp } = await supabase.from('profiles').select('id, email').in('id', teacherIds);
    teacherProfiles = tp || [];
  }

  const teacherAssignments = rawTeacherAssignments.map((ass: any) => ({
    ...ass,
    teacherProfile: teacherProfiles.find((tp: any) => tp.id === ass.teacher_id)
  }));

  // Lấy đề thi thuộc các môn của lớp & đề thi được giao cho lớp
  const subjectIds = subjects.map((s: any) => s.id);
  let exams: any[] = [];
  let examAssignments: any[] = [];

  const [examsRes, assignmentsRes] = await Promise.all([
    subjectIds.length > 0 
      ? supabase.from('exams').select('*, subjects(*)').in('subject_id', subjectIds)
      : Promise.resolve({ data: [] }),
    supabase.from('exam_assignments').select('*, exams(*, subjects(*))').eq('class_id', studentDetail.class_id)
  ]);

  exams = examsRes.data || [];
  examAssignments = assignmentsRes.data || [];

  return (
    <ClassroomClient
      classInfo={classInfo}
      classmates={classmates}
      teacherAssignments={teacherAssignments}
      announcements={announcements}
      exams={exams}
      examAssignments={examAssignments}
      examResults={examResults}
      studentId={studentId}
    />
  );
}
