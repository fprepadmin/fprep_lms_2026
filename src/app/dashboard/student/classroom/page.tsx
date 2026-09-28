import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { Users } from 'lucide-react';
import ClassroomClient from './ClassroomClient';
import { getTeacherDisplayName } from '@/lib/schoolUtils';

export const dynamic = 'force-dynamic';

export default async function ClassroomPage() {
  // 1. Xác thực học sinh
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const studentId = payload.sub;

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

  // Lấy thông tin & hồ sơ giáo viên phụ trách
  const teacherIds = rawTeacherAssignments.map((t: any) => t.teacher_id).filter(Boolean);
  let teacherProfiles: any[] = [];
  let auditLogs: any[] = [];

  if (teacherIds.length > 0) {
    const [tpRes, auditRes] = await Promise.all([
      supabase.from('profiles').select('id, email, role').in('id', teacherIds),
      supabase.from('audit_logs').select('target_id, new_values, old_values').order('created_at', { ascending: false }).limit(200)
    ]);
    teacherProfiles = tpRes.data || [];
    auditLogs = auditRes.data || [];
  }

  const teacherAssignments = rawTeacherAssignments.map((ass: any) => {
    const prof = teacherProfiles.find((tp: any) => tp.id === ass.teacher_id);
    const teacherDisplay = getTeacherDisplayName(prof, auditLogs);
    return {
      ...ass,
      teacherProfile: prof,
      teacherFullName: teacherDisplay.fullName,
      teacherFptName: teacherDisplay.fptName,
      teacherEmail: teacherDisplay.email || prof?.email || ''
    };
  });

  // Lấy danh sách đề thi thuộc các môn của ban học
  const subjectIds = subjects.map((s: any) => s.id);
  let exams: any[] = [];
  if (subjectIds.length > 0) {
    const { data: exData } = await supabase
      .from('exams')
      .select('*, subjects(*)')
      .in('subject_id', subjectIds)
      .order('created_at', { ascending: false });
    exams = exData || [];
  }

  return (
    <ClassroomClient
      classInfo={classInfo}
      classmates={classmates}
      teacherAssignments={teacherAssignments}
      announcements={announcements}
      exams={exams}
      examAssignments={[]}
      examResults={examResults}
      studentId={studentId}
      subjects={subjects}
    />
  );
}
