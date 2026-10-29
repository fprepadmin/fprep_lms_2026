import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { 
  GraduationCap, Bell, Calendar, BookOpen, Users, 
  Clock, CheckCircle, ChevronRight, Award, MessageSquare,
  FileText, ShieldCheck, ClipboardList, BarChart2, ArrowRight,
  Sparkles, Layers, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import AnnouncementManager from './AnnouncementManager';

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

  // 2. Truy vấn học sinh, học liệu, đề thi & lượt nộp bài thuộc phạm vi phụ trách
  const [studentsRes, chaptersRes, examsRes, examAssignmentsRes, examResultsRes] = await Promise.all([
    supabase.from('student_details').select('*, classes(*)').in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]),
    supabase.from('chapters').select('*, lessons(*, lesson_materials(*))').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('exams').select('id, title, duration_minutes').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('exam_assignments').select('*').in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]),
    supabase.from('exam_results').select('id, score, student_id, exam_id')
  ]);

  const students = studentsRes.data || [];
  const studentIds = students.map((s: any) => s.student_id);
  const chapters = chaptersRes.data || [];
  const teacherExams = examsRes.data || [];
  const teacherExamAssignments = examAssignmentsRes.data || [];
  const allResults = examResultsRes.data || [];

  // Lọc kết quả nộp bài của các học sinh thuộc lớp phụ trách
  const studentIdSet = new Set(studentIds);
  const relevantResults = allResults.filter((r: any) => studentIdSet.has(r.student_id));

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
      .limit(5);

    recentProgressWithNames = (recentProgress || []).map((prog: any) => {
      const student = students.find((s: any) => s.student_id === prog.student_id);
      return {
        ...prog,
        student_name: student?.full_name || 'Học sinh',
        class_name: student?.classes?.name || ''
      };
    });
  }

  const subjectNames = Array.from(new Set(assignments.map((a: any) => a.subjects?.name).filter(Boolean)));
  const classNames = Array.from(new Set(assignments.map((a: any) => a.classes?.name).filter(Boolean)));

  return (
    <div className="space-y-4 sm:space-y-5 w-full animate-fade-in pb-10">
      
      {/* 1. HERO BANNER SƯ PHẠM SỐ HIỆN ĐẠI (PREMIUM TEACHER BANNER) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e1a38] via-[#14234b] to-[#1e1b4b] dark:from-[#090e1f] dark:via-[#0c1530] dark:to-[#13112c] text-white p-5 sm:p-6 lg:p-7 shadow-lg border border-blue-900/30">
        
        {/* Họa tiết ánh sáng trang trí nền */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold backdrop-blur-md border border-white/15 text-blue-100">
                <GraduationCap className="h-3.5 w-3.5 text-blue-300" /> THPT FPT Cần Thơ &bull; Giáo viên Bộ môn
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-xs font-semibold backdrop-blur-md border border-emerald-400/25 text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Năm học 2026-2027
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight m-0 text-white font-heading drop-shadow-sm">
              Không Gian Sư Phạm &bull;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-amber-200">
                Quản Lý Giảng Dạy
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-medium">
              <span>Môn phụ trách: <strong className="text-amber-300 font-bold">{subjectNames.join(', ') || 'Chưa phân công'}</strong></span>
              <span>&bull;</span>
              <span>Lớp giảng dạy: <strong className="text-sky-300 font-bold">{classNames.map(c => `Lớp ${c}`).join(', ') || 'Chưa phân lớp'}</strong></span>
            </div>
          </div>

          {/* 4 THẺ CHỈ SỐ SƯ PHẠM NHANH */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-amber-300 font-heading">
                {assignments.length}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Lớp phụ trách</span>
            </div>

            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-white font-heading">
                {students.length}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Tổng học sinh</span>
            </div>

            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-sky-300 font-heading">
                {teacherExams.length}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Đề thi & bài tập</span>
            </div>

            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-emerald-400 font-heading">
                {relevantResults.length}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Lượt nộp bài</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. CÔNG CỤ TRUY CẬP NHANH (4 THẺ ĐIỀU HƯỚNG SƯ PHẠM SỐ) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link 
          href="/dashboard/teacher/exams" 
          className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 hover:border-blue-500/60 hover:shadow-md transition-all flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-blue-200/60 dark:border-blue-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground m-0 group-hover:text-blue-600 transition-colors">
                Giao Bài & Chấm Thi
              </h4>
              <p className="text-[11px] text-muted-foreground m-0">
                Soạn đề, giao bài & sổ điểm
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          href="/dashboard/teacher/students" 
          className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 hover:border-emerald-500/60 hover:shadow-md transition-all flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200/60 dark:border-emerald-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground m-0 group-hover:text-emerald-600 transition-colors">
                Quản Lý Học Sinh
              </h4>
              <p className="text-[11px] text-muted-foreground m-0">
                Theo dõi tiến độ & phân lớp
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          href="/dashboard/teacher/materials" 
          className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 hover:border-purple-500/60 hover:shadow-md transition-all flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold border border-purple-200/60 dark:border-purple-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground m-0 group-hover:text-purple-600 transition-colors">
                Quản Lý Học Liệu
              </h4>
              <p className="text-[11px] text-muted-foreground m-0">
                Bài giảng, video & tài liệu
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          href="/dashboard/teacher/support" 
          className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 hover:border-amber-500/60 hover:shadow-md transition-all flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-200/60 dark:border-amber-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground m-0 group-hover:text-amber-600 transition-colors">
                Hỏi Đáp Trực Tuyến
              </h4>
              <p className="text-[11px] text-muted-foreground m-0">
                Giải đáp thắc mắc học sinh
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* 3. BẢNG TIN VÀ HOẠT ĐỘNG GẦN ĐÂY */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (COL-SPAN-8): THÔNG BÁO NHÀ TRƯỜNG */}
        <div className="md:col-span-8 space-y-4">
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 sm:p-5 shadow-xs">
            <AnnouncementManager
              initialAnnouncements={announcements}
              userRole={userRole}
              token={token}
              userEmail={teacherEmail}
            />
          </div>
        </div>

        {/* CỘT PHẢI (COL-SPAN-4): HOẠT ĐỘNG HỌC TẬP GẦN ĐÂY CỦA HỌC SINH */}
        <div className="md:col-span-4 space-y-4">
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h2 className="text-sm font-extrabold flex items-center gap-2 m-0 text-foreground">
                <Clock className="h-4 w-4 text-primary" /> Hoạt Động Gần Đây
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {recentProgressWithNames.length} hoạt động
              </span>
            </div>

            {recentProgressWithNames.length === 0 ? (
              <p className="text-xs text-muted-foreground italic m-0 py-4 text-center">Chưa có bài học nào được hoàn thành gần đây.</p>
            ) : (
              <div className="space-y-2.5">
                {recentProgressWithNames.map((prog: any) => (
                  <div key={prog.id} className="p-3 bg-muted/30 dark:bg-slate-900/50 rounded-2xl border border-border flex items-start gap-3 transition-colors hover:border-primary/40">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 text-xs font-black mt-0.5">
                      {prog.student_name?.[0]?.toUpperCase() || 'H'}
                    </div>
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-extrabold text-xs text-foreground truncate">{prog.student_name}</span>
                        {prog.class_name && (
                          <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded border border-primary/20">
                            Lớp {prog.class_name}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate m-0 font-medium">{prog.lessons?.title}</p>
                      <span className="inline-flex items-center gap-1 text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Hoàn thành bài học
                      </span>
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
