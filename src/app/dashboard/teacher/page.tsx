import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { 
  GraduationCap, Bell, Calendar, BookOpen, Users, 
  Clock, CheckCircle, ChevronRight, Award, MessageSquare,
  FileText, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import AnnouncementManager from './AnnouncementManager';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
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
  const teacherEmail = payload.email || '';

  const supabase = await getSupabaseServerClient();

  // 1. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    profileRes,
    assignmentsRes,
    supportRequestsRes,
    announcementsRes
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', teacherId).single(),
    supabase.from('teacher_classes').select('*, classes(*), subjects(*)').eq('teacher_id', teacherId),
    supabase.from('support_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('announcements').select('*').or(`target_type.eq.all,target_type.eq.teachers,and(target_type.eq.individual,target_user_id.eq.${teacherId}),target_type.is.null`).order('created_at', { ascending: false })
  ]);

  const userRole = profileRes.data?.role || 'teacher';
  const assignments = assignmentsRes.data || [];
  const announcements = announcementsRes.data || [];

  const classIds = assignments.map((a: any) => a.class_id).filter(Boolean);
  const subjectIds = assignments.map((a: any) => a.subject_id).filter(Boolean);

  // 2. Truy vấn học sinh & học liệu thuộc các lớp phụ trách
  const [studentsRes, chaptersRes] = await Promise.all([
    supabase.from('student_details').select('*, classes(*)').in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]),
    supabase.from('chapters').select('*, lessons(*, lesson_materials(*))').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()])
  ]);

  const students = studentsRes.data || [];
  const studentIds = students.map((s: any) => s.student_id);
  const chapters = chaptersRes.data || [];

  let totalLessonsCount = 0;
  let totalMaterialsCount = 0;
  chapters.forEach((chap: any) => {
    totalLessonsCount += chap.lessons?.length || 0;
    chap.lessons?.forEach((les: any) => {
      totalMaterialsCount += les.lesson_materials?.length || 0;
    });
  });

  // 3. Tiến độ gần đây của học sinh
  let recentProgressWithNames: any[] = [];
  if (studentIds.length > 0) {
    const { data: recentProgress } = await supabase
      .from('study_progress')
      .select('*, lessons(*, chapters(*, subjects(*)))')
      .in('student_id', studentIds)
      .eq('completed', true)
      .order('last_accessed_at', { ascending: false })
      .limit(4);

    recentProgressWithNames = (recentProgress || []).map((prog: any) => {
      const student = students.find((s: any) => s.student_id === prog.student_id);
      return {
        ...prog,
        student_name: student?.full_name || 'Học sinh',
        class_name: student?.classes?.name || ''
      };
    });
  }

  return (
    <div className="space-y-6 w-full animate-fade-in">
      
      {/* 1. WELCOME BANNER CHUẨN FMATH */}
      <div className="flat-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <GraduationCap className="h-3.5 w-3.5" /> Giáo viên &bull; THPT FPT Cần Thơ
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Xin chào Thầy/Cô!
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs font-semibold text-[#6c757d]">
            <span>Môn phụ trách: <strong className="text-primary font-bold">{Array.from(new Set(assignments.map((a: any) => a.subjects?.name).filter(Boolean))).join(', ') || 'Chưa phân công'}</strong></span>
            <span>&bull;</span>
            <span>Lớp giảng dạy: <strong className="text-[#212529] dark:text-foreground font-bold">{Array.from(new Set(assignments.map((a: any) => a.classes?.name).filter(Boolean))).join(', ') || 'Chưa phân lớp'}</strong></span>
          </div>
        </div>

        {/* STATS SUMMARY WIDGETS */}
        <div className="flex gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6 shrink-0">
          <div className="text-center">
            <span className="block text-2xl sm:text-3xl font-bold font-heading text-primary">
              {assignments.length}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#6c757d] uppercase tracking-wider">Lớp phụ trách</span>
          </div>
          <div className="text-center border-l border-border pl-4 sm:pl-6">
            <span className="block text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground">
              {students.length}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#6c757d] uppercase tracking-wider">Tổng học sinh</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI: THÔNG BÁO VÀ TIỆN ÍCH */}
        <div className="md:col-span-8 space-y-6">
          
          <div className="flat-card">
            <AnnouncementManager
              initialAnnouncements={announcements}
              userRole={userRole}
              token={token}
              userEmail={teacherEmail}
            />
          </div>

          {/* CÔNG CỤ THAO TÁC NHANH CHO GIÁO VIÊN */}
          <div className="flat-card space-y-4">
              <h2 className="text-base font-bold font-heading flex items-center gap-2 border-b border-border pb-3 m-0 text-[#212529] dark:text-foreground">
                <BookOpen className="h-4.5 w-4.5 text-primary" /> Truy cập nhanh
              </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/dashboard/teacher/students" className="flat-card p-3.5 hover:border-primary/50 flex items-center gap-3 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#e7f1ff] dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-[#b6d4fe]/40">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#212529] dark:text-foreground m-0">Quản lý học sinh</h4>
                  <p className="text-[10px] text-[#6c757d] m-0">Theo dõi tiến độ</p>
                </div>
              </Link>

              <Link href="/dashboard/teacher/materials" className="flat-card p-3.5 hover:border-primary/50 flex items-center gap-3 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#d1e7dd] dark:bg-emerald-500/20 flex items-center justify-center text-[#198754] shrink-0 border border-[#a3cfbb]/40">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#212529] dark:text-foreground m-0">Quản lý học liệu</h4>
                  <p className="text-[10px] text-[#6c757d] m-0">Bài giảng & đề thi</p>
                </div>
              </Link>

              <Link href="/dashboard/teacher/support" className="flat-card p-3.5 hover:border-primary/50 flex items-center gap-3 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#fff3cd] dark:bg-amber-500/20 flex items-center justify-center text-[#ffc107] shrink-0 border border-[#ffe69c]/40">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#212529] dark:text-foreground m-0">Hỏi đáp học sinh</h4>
                  <p className="text-[10px] text-[#6c757d] m-0">Giải đáp thắc mắc</p>
                </div>
              </Link>
            </div>
          </div>

        </div>

        {/* CỘT PHẢI: HOẠT ĐỘNG HỌC TẬP GẦN ĐÂY CỦA HỌC SINH */}
        <div className="md:col-span-4 space-y-6">
          <div className="flat-card space-y-4">
            <h2 className="text-base font-bold font-heading flex items-center gap-2 border-b border-border pb-3 m-0 text-[#212529] dark:text-foreground">
              <Clock className="h-4.5 w-4.5 text-primary" /> Hoạt động gần đây
            </h2>

            {recentProgressWithNames.length === 0 ? (
              <p className="text-xs text-[#6c757d] italic m-0">Chưa có hoạt động.</p>
            ) : (
              <div className="space-y-3">
                {recentProgressWithNames.map((prog: any) => (
                  <div key={prog.id} className="p-3 bg-[#f8f9fa] dark:bg-muted/40 rounded-xl border border-border flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#d1e7dd] flex items-center justify-center text-[#198754] shrink-0 text-xs font-bold mt-0.5">
                      {prog.student_name?.[0]?.toUpperCase() || 'H'}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[#212529] dark:text-foreground">{prog.student_name}</span>
                        {prog.class_name && (
                          <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded border border-primary/20">{prog.class_name}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6c757d] truncate m-0">{prog.lessons?.title}</p>
                      <span className="block text-[9px] text-[#198754] font-bold">Hoàn thành</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
