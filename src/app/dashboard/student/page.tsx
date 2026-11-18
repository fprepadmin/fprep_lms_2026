import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { 
  Clock, ChevronRight, GraduationCap, Award,
  Bell, FileText, Calendar, CheckCircle2, BookOpen,
  MessageSquare, PlayCircle, Zap, Flame, Trophy,
  TrendingUp, ArrowRight, Users, Sparkles, Target,
  ArrowUpRight, BarChart3, CheckSquare, Layers
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AnnouncementManager from '../teacher/AnnouncementManager';
import SubjectIcon from '@/components/student/SubjectIcon';
import DailyQuote from '@/components/student/DailyQuote';
import GamificationHub from '@/components/student/GamificationHub';
import { calculateGamification } from '@/lib/gamification';
import { getSubjectColorTheme } from '@/lib/schoolUtils';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  // 1. Xác thực học sinh & Lấy thông tin tài khoản đăng nhập
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }

  const studentId = payload.sub || '';
  const studentEmail = payload.email || '';
  const userRole = payload.role || 'student';

  const supabase = await getSupabaseServerClient();

  // 2. Lấy thông tin học sinh từ student_details theo student_id
  let studentDetail: any = null;

  if (studentId) {
    const { data: detailData } = await supabase
      .from('student_details')
      .select('*, classes(*)')
      .eq('student_id', studentId)
      .maybeSingle();

    studentDetail = detailData;
  }

  // Nếu chưa tìm thấy (ví dụ tài khoản tạo bởi Admin chưa đồng bộ UID), tra cứu nhanh theo email
  if (!studentDetail && studentEmail) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', studentEmail.trim().toLowerCase())
      .maybeSingle();

    if (profileByEmail) {
      const { data: detailByProfile } = await supabase
        .from('student_details')
        .select('*, classes(*)')
        .eq('student_id', profileByEmail.id)
        .maybeSingle();

      if (detailByProfile) {
        studentDetail = detailByProfile;
      }
    }
  }

  const studentName = studentDetail?.full_name || (studentEmail ? studentEmail.split('@')[0] : 'Học sinh');
  const studentMshs = studentDetail?.mshs || (studentEmail ? studentEmail.split('@')[0].toUpperCase() : 'Chưa cập nhật');
  const className = studentDetail?.classes?.name || 'Chưa xếp lớp';
  const groupType = studentDetail?.classes?.group_type || 'T';
  const academicYear = '2024-2027';

  // 3. TỐI ƯU HÓA TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    progressRes,
    logsRes,
    lastAccessedRes,
    announcementsRes,
    recentProgressRes,
    examResultsRes,
    allDetailsRes,
    allProgressRes,
    allExamResultsRes,
    subjectsRes,
    chaptersRes,
    examsRes
  ] = await Promise.all([
    // Tiến độ của học sinh
    supabase.from('study_progress').select('*').eq('student_id', studentId || crypto.randomUUID()),
    // Thời gian học
    supabase.from('study_logs').select('duration_seconds').eq('student_id', studentId || crypto.randomUUID()),
    // Bài học dang dở gần nhất
    supabase.from('study_progress').select('*, lessons(*, chapters(*, subjects(*)))').eq('student_id', studentId || crypto.randomUUID()).order('last_accessed_at', { ascending: false }).limit(1).maybeSingle(),
    // Thông báo
    supabase.from('announcements').select('*').or(`target_type.eq.all,and(target_type.eq.individual,target_user_id.eq.${studentId}),target_type.is.null`).order('created_at', { ascending: false }),
    // Hoạt động gần đây
    supabase.from('study_progress').select('*, lessons(*, chapters(*, subjects(*)))').eq('student_id', studentId || crypto.randomUUID()).eq('completed', true).order('completed_at', { ascending: false }).limit(4),
    // Đề thi đã làm
    supabase.from('exam_results').select('*').eq('student_id', studentId || crypto.randomUUID()),
    // Bảng vàng: Học sinh
    supabase.from('student_details').select('student_id, full_name, mshs'),
    // Bảng vàng: Tiến độ tất cả
    supabase.from('study_progress').select('student_id, completed').eq('completed', true),
    // Bảng vàng: Điểm thi tất cả
    supabase.from('exam_results').select('student_id, score'),
    // Danh sách môn học theo phân ban
    supabase.from('subjects').select('*').in('group_type', groupType === 'X' ? ['X', 'ENG'] : ['T', 'ENG']).order('name'),
    // Danh sách chương & bài học
    supabase.from('chapters').select('id, subject_id, lessons(id)').order('order_index', { ascending: true }),
    // Danh sách đề thi
    supabase.from('exams').select('id, subject_id')
  ]);

  const progress = progressRes.data || [];
  const logs = logsRes.data || [];
  const lastAccessed = lastAccessedRes.data;
  const announcements = announcementsRes.data || [];
  const recentProgress = recentProgressRes.data || [];
  const examResults = examResultsRes.data || [];
  const subjects = subjectsRes.data || [];
  const chapters = chaptersRes.data || [];
  const exams = examsRes.data || [];

  const totalStudySeconds = logs.reduce((acc: number, curr: any) => acc + (curr.duration_seconds || 0), 0);
  const totalStudyMinutes = Math.round(totalStudySeconds / 60);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
  const completedLessonsCount = progress.filter((p: any) => p.completed).length;
  const completedExamsCount = new Set(examResults.map((r: any) => r.exam_id)).size;

  // Điểm trung bình của học sinh
  const myScores = examResults.map((r: any) => Number(r.score) || 0);
  const myAvgScore = myScores.length > 0 
    ? (myScores.reduce((a: number, b: number) => a + b, 0) / myScores.length).toFixed(1)
    : '---';

  // Cấp độ, Kinh nghiệm & Thành tựu thực tế từ Gamification Engine
  const gamification = calculateGamification(progress, logs, examResults);
  const level = gamification.level;
  const levelTitle = gamification.levelTitle;
  const xp = gamification.totalXp;
  const nextLevelProgress = gamification.progressPercent;

  // Tính toán số liệu từng môn học
  const subjectsWithStats = subjects.map((sub: any) => {
    const subChapters = chapters.filter((chap: any) => chap.subject_id === sub.id);
    const subLessonIds: string[] = subChapters.reduce((acc: string[], chap: any) => {
      const ids = (chap.lessons || []).map((les: any) => les.id);
      return [...acc, ...ids];
    }, []);

    const totalLessons = subLessonIds.length;
    const completedInSubject = subLessonIds.filter(id => 
      progress.some((p: any) => p.lesson_id === id && p.completed)
    ).length;

    const percent = totalLessons > 0 ? Math.round((completedInSubject / totalLessons) * 100) : 0;
    const subExamsCount = exams.filter((e: any) => e.subject_id === sub.id).length;
    const theme = getSubjectColorTheme(sub.name);

    return {
      ...sub,
      totalChapters: subChapters.length,
      totalLessons,
      completedLessons: completedInSubject,
      percent,
      totalExams: subExamsCount,
      theme
    };
  });

  // Tính toán bảng xếp hạng
  let leaderboard: any[] = [];
  const allDetails = allDetailsRes.data;
  const allProgress = allProgressRes.data;
  const allExamResults = allExamResultsRes.data;

  if (allDetails && allDetails.length > 0) {
    leaderboard = allDetails.map((s: any) => {
      const completedCount = allProgress?.filter((p: any) => p.student_id === s.student_id).length || 0;
      const studentScores = allExamResults?.filter((e: any) => e.student_id === s.student_id).map((e: any) => Number(e.score)) || [];
      const avgScore = studentScores.length > 0
        ? Math.round((studentScores.reduce((a: number, b: number) => a + b, 0) / studentScores.length) * 10) / 10
        : 0;

      return {
        name: s.full_name,
        mshs: s.mshs,
        completedCount,
        avgScore,
        totalScore: completedCount * 10 + avgScore * 5
      };
    })
    .sort((a: any, b: any) => {
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      return b.avgScore - a.avgScore;
    })
    .slice(0, 5);
  }

  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-6 sm:space-y-8 w-full animate-fade-in pb-10" suppressHydrationWarning>
      
      {/* =========================================================================
          1. HERO GREETING BANNER & LEVEL CAPSULE (NỀN XANH CHUẨN FPREP & FPT)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-[#b6d4fe] dark:border-blue-900/60 bg-gradient-to-br from-[#d9ebff] via-[#e7f1ff] to-[#f0f7ff] dark:from-[#0c224a] dark:via-[#081836] dark:to-[#040e21] p-6 sm:p-8 shadow-sm transition-all">
        

        {/* Glow hiệu ứng nền */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/20 dark:bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-sky-400/20 dark:bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Thông tin học sinh */}
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-[#071735]/90 px-3.5 py-1 text-xs font-black text-[#0d6efd] dark:text-blue-400 border border-[#b6d4fe] dark:border-blue-700/50 shadow-2xs backdrop-blur-md">
                <GraduationCap className="h-3.5 w-3.5 text-primary" /> Khối 12 &bull; THPT FPT Cần Thơ
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-[#071735]/90 px-3 py-1 text-[11px] font-black text-orange-600 dark:text-orange-400 border border-orange-300/60 dark:border-orange-500/40 shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-orange-500" /> Niên khóa {academicYear}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-[#052c65] dark:text-white tracking-tight m-0">
              {greetingText}, {studentName}!
            </h1>
            
            <p className="text-[#084298] dark:text-blue-100 font-semibold text-xs sm:text-sm max-w-xl leading-relaxed m-0">
              Chào mừng bạn đến với hệ thống tự học trực tuyến FPREP. Hãy hoàn thành các mục tiêu hôm nay để bứt phá điểm số nhé!
            </p>
            
            {/* Badges thông tin lớp */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-[#084298] dark:text-blue-200">
              <div className="bg-white/90 dark:bg-[#071735]/90 px-3.5 py-1.5 rounded-xl border border-[#b6d4fe] dark:border-blue-800/60 font-bold shadow-2xs">
                MSHS: <strong className="text-[#052c65] dark:text-blue-300 font-black">{studentMshs}</strong>
              </div>
              <div className="bg-white/90 dark:bg-[#071735]/90 px-3.5 py-1.5 rounded-xl border border-[#b6d4fe] dark:border-blue-800/60 font-bold shadow-2xs">
                Lớp: <strong className="text-primary font-black">{className}</strong> ({groupType === 'T' ? 'Tự Nhiên' : groupType === 'X' ? 'Xã Hội' : 'Khác'})
              </div>
              <div className="bg-white/90 dark:bg-[#071735]/90 px-3.5 py-1.5 rounded-xl border border-[#b6d4fe] dark:border-blue-800/60 font-bold shadow-2xs">
                Niên khóa: <strong className="text-[#052c65] dark:text-blue-300 font-black">{academicYear}</strong>
              </div>
            </div>
          </div>

          {/* Cột phải: Capsule Cấp độ & Điểm kinh nghiệm XP + Tiến độ + Quote tự đổi */}
          <div className="relative z-10 flex flex-col gap-3 shrink-0 w-full lg:w-auto">
            {/* Capsule 3 Trụ Cột: Cấp độ - Kinh nghiệm - Đã hoàn thành */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3.5 bg-white/95 dark:bg-[#081a3b]/95 p-4 sm:p-5 rounded-3xl backdrop-blur-md border-2 border-[#b6d4fe] dark:border-blue-700/50 shadow-sm">
              
              {/* Pillar 1: Cấp độ */}
              <div className="flex items-center gap-3 sm:pr-3.5 border-b sm:border-b-0 sm:border-r border-[#b6d4fe]/70 dark:border-blue-800/60 pb-3 sm:pb-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                  {level}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-[#084298] dark:text-blue-300 uppercase tracking-wider">Cấp Độ &bull; {levelTitle}</div>
                  <div className="text-sm font-black text-[#052c65] dark:text-white font-heading truncate">Cấp {level}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-14 bg-[#e2eeff] dark:bg-blue-950 rounded-full h-1.5 overflow-hidden border border-[#b6d4fe]/60">
                      <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${nextLevelProgress}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-primary">{nextLevelProgress}%</span>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Tổng Kinh Nghiệm & Chuỗi Streak */}
              <div className="flex items-center gap-3 sm:pr-3.5 border-b sm:border-b-0 sm:border-r border-[#b6d4fe]/70 dark:border-blue-800/60 pb-3 sm:pb-0">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-400/40 shrink-0">
                  <Flame className="h-5 w-5 fill-orange-500 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-[#084298] dark:text-blue-300 uppercase tracking-wider">Kinh Nghiệm</div>
                  <div className="text-sm font-black text-[#052c65] dark:text-white font-heading truncate flex items-baseline gap-1">
                    {xp.toLocaleString()} <span className="text-[11px] font-black text-orange-500">XP</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    Chuỗi {gamification.streakDays} ngày
                  </span>
                </div>
              </div>

              {/* Pillar 3: Đã Hoàn Thành */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-400/40 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold text-[#084298] dark:text-blue-300 uppercase tracking-wider">Đã Tự Học</div>
                  <div className="text-sm font-black text-[#052c65] dark:text-white font-heading truncate">
                    {completedLessonsCount} bài học
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {completedExamsCount} đề đã luyện
                  </span>
                </div>
              </div>

            </div>

            {/* Dòng quote truyền cảm hứng tự động đổi */}
            <DailyQuote className="w-full" />
          </div>

        </div>
      </div>

      {/* =========================================================================
          2. QUICK ACTIONS (4 THẺ ĐIỀU HƯỚNG NHANH)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Link 
          href="/dashboard/student/subjects" 
          className="group relative overflow-hidden rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 via-white to-white dark:from-blue-950/30 dark:via-card dark:to-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black border border-blue-500/30 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-foreground m-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            Học Liệu Số
          </h4>
          <p className="text-[11px] text-muted-foreground font-semibold m-0 mt-0.5">
            Lý thuyết & Video bài giảng
          </p>
        </Link>

        <Link 
          href="/dashboard/student/exams" 
          className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/80 via-white to-white dark:from-emerald-950/30 dark:via-card dark:to-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Target className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-foreground m-0 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            Luyện Đề 2026
          </h4>
          <p className="text-[11px] text-muted-foreground font-semibold m-0 mt-0.5">
            Trắc nghiệm 3 dạng thức mới
          </p>
        </Link>

        <Link 
          href="/dashboard/student/classroom" 
          className="group relative overflow-hidden rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/80 via-white to-white dark:from-purple-950/30 dark:via-card dark:to-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-purple-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-foreground m-0 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            Lớp Học Của Tôi
          </h4>
          <p className="text-[11px] text-muted-foreground font-semibold m-0 mt-0.5">
            Thành viên & Giáo viên bộ môn
          </p>
        </Link>

        <Link 
          href="/dashboard/student/support" 
          className="group relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/80 via-white to-white dark:from-amber-950/30 dark:via-card dark:to-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black border border-amber-500/30 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-foreground m-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            Hỏi Đáp Trực Tiếp
          </h4>
          <p className="text-[11px] text-muted-foreground font-semibold m-0 mt-0.5">
            Nhận giải đáp từ Giáo viên
          </p>
        </Link>
      </div>

      {/* =========================================================================
          GAMIFICATION & THÀNH TỰU HOẠT ĐỘNG THỰC TẾ
          ========================================================================= */}
      <GamificationHub stats={gamification} />

      {/* =========================================================================
          3. METRICS CARDS (4 CHỈ SỐ HỌC TẬP TỔNG QUAN)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Metric 1 */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Bài hoàn thành
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-heading text-foreground">
                {completedLessonsCount}
              </span>
              <span className="text-xs font-bold text-muted-foreground">bài</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Thời gian tự học
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-heading text-foreground">
                {totalStudyMinutes}
              </span>
              <span className="text-xs font-bold text-muted-foreground">phút ({totalStudyHours}h)</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/20">
            <Award className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Đề thi đã làm
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-heading text-foreground">
                {completedExamsCount}
              </span>
              <span className="text-xs font-bold text-muted-foreground">đề</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] sm:text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Điểm trung bình
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black font-heading text-foreground">
                {myAvgScore}
              </span>
              <span className="text-xs font-bold text-muted-foreground">{myScores.length > 0 ? '/10đ' : ''}</span>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          4. KHÔNG GIAN MÔN HỌC - MÀU SẮC RIÊNG BIỆT CHO MỖI MÔN (MY SUBJECTS HUB)
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-foreground m-0">
                Không Gian Môn Học Khối 12
              </h2>
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5 m-0">
              Chọn môn học để khám phá bài giảng số, sơ đồ lý thuyết và bài tập rèn luyện.
            </p>
          </div>
          
          <Link 
            href="/dashboard/student/subjects" 
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary hover:text-primary/80 transition-colors self-start sm:self-auto"
          >
            Xem chi tiết tất cả môn học <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid thẻ môn học với màu sắc riêng biệt */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectsWithStats.map((sub: any) => {
            const isMath = sub.name.toLowerCase().includes('toán');
            const theme = sub.theme;

            return (
              <Link
                key={sub.id}
                href={`/dashboard/student/subjects`}
                className={`group relative overflow-hidden rounded-2xl border ${theme.cardBorder} ${theme.cardBorderHover} ${theme.cardBg} p-5 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-4`}
              >
                {/* Dải màu accent bên trái */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.borderAccent}`} />

                <div className="space-y-3.5 pl-1">
                  {/* Top Bar: Icon + Subject Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center font-black text-lg shadow-2xs group-hover:scale-110 transition-transform`}>
                      <SubjectIcon name={sub.name} className="h-6 w-6" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                        {theme.shortCode}
                      </span>
                    </div>
                  </div>

                  {/* Tên môn học & thông tin chương */}
                  <div>
                    <h3 className="font-black font-heading text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors m-0">
                      Môn {sub.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold mt-1 m-0 flex items-center gap-2">
                      <span>{sub.totalChapters} Chương học</span>
                      <span>&bull;</span>
                      <span>{sub.totalLessons} Bài giảng</span>
                      <span>&bull;</span>
                      <span>{sub.totalExams} Đề thi</span>
                    </p>
                  </div>
                </div>

                {/* Progress bar theo màu môn học */}
                <div className="space-y-2 pt-3 border-t border-border/60 pl-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground text-[11px]">Tiến độ học</span>
                    <span className={`font-ui ${theme.textColor}`}>
                      {sub.completedLessons}/{sub.totalLessons} bài ({sub.percent}%)
                    </span>
                  </div>
                  
                  <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${theme.progressBar}`}
                      style={{ width: `${sub.percent}%` }}
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs font-extrabold">
                    <span className="text-muted-foreground text-[11px] group-hover:text-foreground transition-colors">
                      {sub.percent === 100 ? 'Đã hoàn thành' : sub.percent > 0 ? 'Đang học' : 'Bắt đầu ngay'}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[11px] ${theme.textColor} group-hover:translate-x-1 transition-transform`}>
                      Vào học <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

              </Link>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          5. NỘI DUNG CHÍNH (2 CỘT DASHBOARD: BÀI ĐANG DỞ, THÔNG BÁO, BẢNG VÀNG)
          ========================================================================= */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (COL-SPAN-8): BÀI HỌC DANG DỞ, THÔNG BÁO, HỎI ĐÁP */}
        <div className="md:col-span-8 space-y-6">
          
          {/* WIDGET BÀI HỌC ĐANG HỌC DỞ VỚI MÀU SẮC RIÊNG BIỆT */}
          {lastAccessed && lastAccessed.lessons && (
            <div className="rounded-3xl border border-[#b6d4fe] dark:border-border bg-gradient-to-r from-[#e7f1ff]/60 via-card to-card p-5 sm:p-6 shadow-xs space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <span className="text-xs font-extrabold text-[#084298] dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                  <Clock className="h-4 w-4 text-primary" /> Tiếp tục bài học đang dở
                </span>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {lastAccessed.lessons.chapters?.subjects?.name}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base sm:text-lg text-foreground m-0">
                    {lastAccessed.lessons.title}
                  </h4>
                  <p className="text-xs text-muted-foreground font-semibold m-0">
                    {lastAccessed.lessons.chapters?.title}
                  </p>
                </div>
                
                <Link 
                  href={`/dashboard/student/lessons/${lastAccessed.lessons.id}`}
                  className="btn-primary shrink-0 self-start sm:self-auto shadow-sm px-5 py-2.5 text-xs flex items-center gap-2"
                >
                  <PlayCircle className="h-4 w-4" /> Học tiếp ngay
                </Link>
              </div>
            </div>
          )}

          {/* BẢNG TIN THÔNG BÁO NHÀ TRƯỜNG & LỚP */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <AnnouncementManager
              initialAnnouncements={announcements}
              userRole={userRole}
              token={token}
              userEmail={studentDetail?.full_name || ''}
            />
          </div>

          {/* BANNER HỎI ĐÁP HỖ TRỢ HỌC TẬP */}
          <div className="rounded-3xl border border-[#b6d4fe]/70 dark:border-border bg-gradient-to-r from-[#e7f1ff]/40 via-card to-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-foreground m-0">
                  Có câu hỏi hoặc thắc mắc bài giảng?
                </h4>
                <p className="text-xs text-muted-foreground font-semibold m-0 mt-0.5">
                  Gửi câu hỏi trực tiếp cho Giáo viên bộ môn để được giải đáp chi tiết.
                </p>
              </div>
            </div>
            <Link 
              href="/dashboard/student/support"
              className="btn-primary shrink-0 self-start sm:self-auto text-xs py-2.5 px-4"
            >
              Gửi câu hỏi <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

        </div>

        {/* CỘT PHẢI (COL-SPAN-4): BẢNG XẾP HẠNG & HOẠT ĐỘNG */}
        <div className="md:col-span-4 space-y-6">
          
          {/* BẢNG VÀNG THI ĐUA HỌC TẬP (LEADERBOARD) */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-black text-base font-heading flex items-center gap-2 m-0 text-foreground">
                <Trophy className="h-5 w-5 text-amber-500" /> Bảng Vàng Vinh Danh
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                Top 5 Thi Đua
              </span>
            </div>
            
            {leaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground italic m-0">Chưa có dữ liệu xếp hạng học sinh.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((item, index) => {
                  let rankBadge = (
                    <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold border border-border shrink-0">
                      {index + 1}
                    </div>
                  );

                  if (index === 0) {
                    rankBadge = (
                      <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-black shadow-2xs border border-amber-400/40 shrink-0">
                        <Trophy className="h-3.5 w-3.5" />
                      </div>
                    );
                  } else if (index === 1) {
                    rankBadge = (
                      <div className="h-7 w-7 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-black shadow-2xs border border-slate-300 dark:border-slate-700 shrink-0">
                        <Award className="h-3.5 w-3.5" />
                      </div>
                    );
                  } else if (index === 2) {
                    rankBadge = (
                      <div className="h-7 w-7 rounded-lg bg-amber-700/15 text-amber-700 dark:text-amber-500 flex items-center justify-center text-xs font-black shadow-2xs border border-amber-600/30 shrink-0">
                        <Award className="h-3.5 w-3.5" />
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="flex items-center justify-between text-xs border-b border-border/50 pb-2.5 last:border-b-0 last:pb-0 font-semibold">
                      <div className="flex items-center gap-3 min-w-0">
                        {rankBadge}
                        <div className="min-w-0">
                          <p className="font-extrabold text-foreground truncate m-0">{item.name}</p>
                          <span className="block text-[10px] text-muted-foreground uppercase">{item.mshs}</span>
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-black text-primary">{item.avgScore}đ TB</span>
                        <span className="block text-[10px] text-muted-foreground">{item.completedCount} bài học</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HOẠT ĐỘNG GẦN ĐÂY */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-black text-base font-heading flex items-center gap-2 border-b border-border pb-3 m-0 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Hoạt Động Gần Đây
            </h3>

            {(!recentProgress || recentProgress.length === 0) ? (
              <p className="text-xs text-muted-foreground italic m-0">Chưa có bài học nào được hoàn thành gần đây.</p>
            ) : (
              <div className="space-y-3">
                {recentProgress.map((prog: any) => {
                  const subjectName = prog.lessons?.chapters?.subjects?.name || 'Môn học';
                  const theme = getSubjectColorTheme(subjectName);

                  return (
                    <div key={prog.id} className="flex gap-3 items-start text-xs border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                      <div className={`h-8 w-8 rounded-xl ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center shrink-0 mt-0.5`}>
                        <SubjectIcon name={subjectName} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-1 flex-1">
                        <p 
                          className="font-extrabold text-foreground line-clamp-2 break-words leading-snug m-0"
                          title={prog.lessons?.title}
                        >
                          {prog.lessons?.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                            {subjectName}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            Đã hoàn thành
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
