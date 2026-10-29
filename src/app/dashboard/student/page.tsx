import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { 
  Clock, ChevronRight, GraduationCap, Award,
  Bell, FileText, Calendar, CheckCircle2, BookOpen,
  MessageSquare, PlayCircle, Zap, Flame, Trophy,
  TrendingUp, ArrowRight, Users, Sparkles, Target,
  ArrowUpRight, BarChart3, CheckSquare, Layers, Search
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AnnouncementManager from '../teacher/AnnouncementManager';
import SubjectIcon from '@/components/student/SubjectIcon';
import DailyQuote from '@/components/student/DailyQuote';
import GamificationHub from '@/components/student/GamificationHub';
import Grade12Leaderboard from '@/components/student/Grade12Leaderboard';
import ExamScheduleGK1Widget from '@/components/student/ExamScheduleGK1Widget';
import { calculateGamification } from '@/lib/gamification';
import { getSubjectColorTheme } from '@/lib/schoolUtils';
import { fetchLeaderboardFromPython, LeaderboardItem } from '@/lib/pythonBackend';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  // 1. Xác thực học sinh
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) redirect('/');

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) redirect('/');

  const studentId = payload.sub || '';
  const studentEmail = payload.email || '';
  const userRole = payload.role || 'student';

  const supabase = await getSupabaseServerClient();

  // 2. Lấy thông tin học sinh
  let studentDetail: any = null;

  if (studentId) {
    const { data: detailData } = await supabase
      .from('student_details')
      .select('*, classes(*)')
      .eq('student_id', studentId)
      .maybeSingle();

    studentDetail = detailData;
  }

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

      if (detailByProfile) studentDetail = detailByProfile;
    }
  }

  const studentName = studentDetail?.full_name || (studentEmail ? studentEmail.split('@')[0] : 'Học sinh');
  const studentMshs = studentDetail?.mshs || (studentEmail ? studentEmail.split('@')[0].toUpperCase() : 'Chưa cập nhật');
  const className = studentDetail?.classes?.name || 'Chưa xếp lớp';
  const groupType = studentDetail?.classes?.group_type || 'T';

  // 3. Tối ưu truy vấn: Lấy leaderboard từ Python Server (FastAPI cache)
  const pythonLeaderboardPromise = fetchLeaderboardFromPython(15);

  const [
    progressRes,
    logsRes,
    lastAccessedRes,
    announcementsRes,
    recentProgressRes,
    examResultsRes,
    subjectsRes,
    chaptersRes,
    examsRes,
    pythonLeaderboard
  ] = await Promise.all([
    supabase.from('study_progress').select('*').eq('student_id', studentId),
    supabase.from('study_logs').select('duration_seconds').eq('student_id', studentId),
    supabase.from('study_progress').select('*, lessons(*, chapters(*, subjects(*)))').eq('student_id', studentId).order('last_accessed_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('announcements').select('*').or(`target_type.eq.all,and(target_type.eq.individual,target_user_id.eq.${studentId}),target_type.is.null`).order('created_at', { ascending: false }).limit(10),
    supabase.from('study_progress').select('*, lessons(*, chapters(*, subjects(*)))').eq('student_id', studentId).eq('completed', true).order('completed_at', { ascending: false }).limit(4),
    supabase.from('exam_results').select('*').eq('student_id', studentId),
    supabase.from('subjects').select('*').in('group_type', groupType === 'X' ? ['X', 'ENG'] : ['T', 'ENG']).order('name'),
    supabase.from('chapters').select('id, subject_id, lessons(id)').order('order_index', { ascending: true }),
    supabase.from('exams').select('id, subject_id'),
    pythonLeaderboardPromise
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
  const completedLessonsCount = progress.filter((p: any) => p.completed).length;
  const completedExamsCount = new Set(examResults.map((r: any) => r.exam_id)).size;

  const myScores = examResults.map((r: any) => Number(r.score) || 0);
  const myAvgScore = myScores.length > 0 
    ? (myScores.reduce((a: number, b: number) => a + b, 0) / myScores.length).toFixed(1)
    : '---';

  const gamification = calculateGamification(progress, logs, examResults);
  const level = gamification.level;
  const levelTitle = gamification.levelTitle;
  const xp = gamification.totalXp;
  const nextLevelProgress = gamification.progressPercent;

  let leaderboard: LeaderboardItem[] = [];
  if (pythonLeaderboard && pythonLeaderboard.length > 0) {
    leaderboard = pythonLeaderboard;
  } else {
    try {
      const { data: topStudents } = await supabase
        .from('student_details')
        .select('student_id, full_name, mshs')
        .limit(5);

      if (topStudents) {
        leaderboard = topStudents.map((s, idx) => ({
          student_id: s.student_id,
          name: s.full_name || 'Học sinh',
          mshs: s.mshs || '---',
          totalXp: 500,
          level: 2,
          levelTitle: 'Khởi Động Luyện Thi',
          badgeRank: 'bronze' as const,
          completedCount: 0,
          examCount: 0,
          avgScore: 0,
          totalScore: 500,
          rank: idx + 1
        }));
      }
    } catch {
      leaderboard = [];
    }
  }

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

  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-4 sm:space-y-5 w-full animate-fade-in pb-10" suppressHydrationWarning>
      
      {/* =========================================================================
          1. HERO BANNER HIỆN ĐẠI (SÁNG TRẮNG XANH FPREP ROYAL BLUE)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-blue-100/90 dark:border-slate-800 p-5 sm:p-6 lg:p-7 shadow-xs">
        
        {/* Họa tiết ánh sáng & lưới tech chìm cao cấp */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/50 via-indigo-50/30 to-transparent dark:from-blue-900/15 dark:via-indigo-950/10 dark:to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/4 w-80 h-80 bg-sky-50/60 dark:bg-sky-950/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.035] dark:opacity-[0.06] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Thông tin chào đón học sinh */}
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 px-3 py-1 text-xs font-semibold border border-blue-200/80 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 shadow-2xs">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> THPT FPT Cần Thơ &bull; Lớp {className}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-950/70 px-3 py-1 text-xs font-semibold border border-orange-200/80 dark:border-orange-800/80 text-orange-700 dark:text-orange-300 shadow-2xs">
                <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500 animate-pulse" /> Chuỗi {gamification.streakDays} ngày
              </span>
              <Link
                href="/dashboard/student/minigame"
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900/60 px-3 py-1 text-xs font-bold border border-amber-200/80 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 transition-all shadow-2xs active:scale-95 group"
                title="Minigame mùa thi GK1 – Xin Bề Trên"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20 group-hover:rotate-12 transition-transform" />
                <span>Mùa thi GK1</span>
                <span className="text-[9.5px] bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full font-black uppercase">
                  Mới
                </span>
              </Link>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight m-0 text-slate-900 dark:text-white font-heading">
              {greetingText},{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {studentName}
              </span>
              ! 👋
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-[13px] leading-relaxed m-0 font-normal">
              Chào mừng bạn trở lại không gian tự học FPREP. Hãy tiếp tục ôn luyện vững vàng để sẵn sàng bứt phá điểm số trong kỳ thi giữa học kỳ 1 sắp tới!
            </p>
          </div>

          {/* Widget Cấp độ & Điểm XP Tinh Gọn (Sáng Trắng Xanh) */}
          <div className="flex items-center gap-4 bg-gradient-to-br from-blue-50/70 via-slate-50/60 to-indigo-50/50 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-blue-950/40 border border-blue-100/80 dark:border-slate-700/80 p-3.5 sm:p-4 rounded-2xl shrink-0 shadow-2xs relative">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center font-black shadow-md shadow-blue-500/20">
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-blue-200 leading-none">Cấp</span>
                <span className="text-xl leading-none mt-0.5">{level}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-black text-amber-950 shadow-xs">
                ★
              </div>
            </div>

            <div className="min-w-[160px] sm:min-w-[180px] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider truncate">
                  {levelTitle}
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                  {xp.toLocaleString()} <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold">XP</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-2 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 h-full rounded-full transition-all duration-500 shadow-xs" 
                  style={{ width: `${nextLevelProgress}%` }} 
                />
              </div>

              <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Lên Cấp {level + 1}</span>
                <strong className="text-blue-600 dark:text-blue-400 font-bold">{nextLevelProgress}%</strong>
              </div>
            </div>
          </div>

        </div>

        {/* 1-CLICK QUICK RESUME: BÀI ĐANG HỌC DỞ */}
        {lastAccessed && lastAccessed.lessons && (
          <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 dark:bg-slate-800/40 p-3 sm:p-3.5 rounded-2xl border border-blue-100/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <PlayCircle className="h-4.5 w-4.5 fill-white text-blue-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Tiếp tục bài học đang dở &bull; {lastAccessed.lessons.chapters?.subjects?.name}
                </span>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate m-0">
                  {lastAccessed.lessons.title}
                </h4>
              </div>
            </div>

            <Link
              href={`/dashboard/student/lessons/${lastAccessed.lessons.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 self-start sm:self-auto flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              Học tiếp ngay <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

      </div>

      {/* =========================================================================
          2. QUICK ACTIONS (4 THẺ ĐIỀU HƯỚNG TINH TẾ)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link 
          href="/dashboard/student/subjects" 
          className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 hover:border-blue-500/50 hover:shadow-sm transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold border border-blue-200/60 dark:border-blue-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground m-0 group-hover:text-blue-600 transition-colors">
                Học Liệu Số
              </h4>
              <p className="text-[11.5px] text-muted-foreground m-0">
                Lý thuyết & Video
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          href="/dashboard/student/exams" 
          className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 hover:border-emerald-500/50 hover:shadow-sm transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200/60 dark:border-emerald-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground m-0 group-hover:text-emerald-600 transition-colors">
                Luyện Đề 2026
              </h4>
              <p className="text-[11.5px] text-muted-foreground m-0">
                3 dạng thức mới
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          href="/dashboard/student/classroom" 
          className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 hover:border-purple-500/50 hover:shadow-sm transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold border border-purple-200/60 dark:border-purple-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground m-0 group-hover:text-purple-600 transition-colors">
                Lớp Học Của Tôi
              </h4>
              <p className="text-[11.5px] text-muted-foreground m-0">
                {className}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link 
          href="/dashboard/student/support" 
          className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 hover:border-amber-500/50 hover:shadow-sm transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-200/60 dark:border-amber-800/60 shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground m-0 group-hover:text-amber-600 transition-colors">
                Hỏi Đáp Trực Tiếp
              </h4>
              <p className="text-[11.5px] text-muted-foreground m-0">
                Hỗ trợ học tập
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* =========================================================================
          2.2 CỤM MÙA THI GK1: TIẾP SỨC MÙA THI (LỊCH THI) & MINIGAME XIN BỀ TRÊN
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Mục nhỏ tiếp sức mùa thi & Bảng lịch thi GK1 */}
        <ExamScheduleGK1Widget defaultGroupType={groupType} />

        {/* Minigame mùa thi GK1 - Xin bề trên (Đồng bộ phong cách sáng trắng edtech) */}
        <Link
          href="/dashboard/student/minigame"
          className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 hover:border-amber-400 p-4 sm:p-4.5 text-slate-800 dark:text-slate-100 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-extrabold uppercase tracking-wider">
                  Thư giãn mùa thi
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                  PHÚC ĐỨC 3D
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-1 m-0 group-hover:text-amber-600 transition-colors font-serif">
                Minigame Mùa Thi GK1 &ndash; Xin Bề Trên
              </h4>
              <p className="text-[11.5px] text-slate-600 dark:text-slate-400 m-0 mt-0.5 leading-relaxed font-normal">
                Thắp 3 nén tâm hương, tích đức thiện lành &amp; nhận quẻ chúc may mắn vững tâm trước kỳ thi GK1
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 relative z-10 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 italic font-serif">
              &ldquo;Tâm vững, trí sáng, bình tĩnh làm bài&rdquo;
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:text-amber-700 flex items-center gap-1">
              Chiêm bái <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </Link>
      </div>

      {/* =========================================================================
          2.5 HỆ THỐNG GAMIFICATION & HUY HIỆU KIM LOẠI 3D THẬT
          ========================================================================= */}
      <GamificationHub stats={gamification} />

      {/* =========================================================================
          3. KHÔNG GIAN CÁC MÔN HỌC (SUBJECTS HUB HIỆN ĐẠI)
          ========================================================================= */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground m-0">
                Chương Trình Môn Học Khối 12 ({subjects.length})
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 m-0">
              Chọn môn học để khám phá bài giảng số, sơ đồ lý thuyết và bài tập trắc nghiệm.
            </p>
          </div>
          
          <Link 
            href="/dashboard/student/subjects" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors self-start sm:self-auto"
          >
            Xem kho bài giảng đầy đủ <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid thẻ môn học */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectsWithStats.map((sub: any) => {
            const theme = sub.theme;

            return (
              <div
                key={sub.id}
                className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`w-11 h-11 rounded-xl ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform`}>
                      <SubjectIcon name={sub.name} className="h-5 w-5" />
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                      {theme.shortCode}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors m-0">
                      Môn {sub.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 m-0 flex items-center gap-2">
                      <span>{sub.totalChapters} Chương</span>
                      <span>&bull;</span>
                      <span>{sub.totalLessons} Bài học</span>
                      <span>&bull;</span>
                      <span>{sub.totalExams} Đề thi</span>
                    </p>
                  </div>
                </div>

                {/* Progress bar & Nút 1-click */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px] font-medium">Tiến độ</span>
                    <span className={`font-ui ${theme.textColor} font-bold text-[11px]`}>
                      {sub.completedLessons}/{sub.totalLessons} bài ({sub.percent}%)
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${theme.progressBar}`}
                      style={{ width: `${sub.percent}%` }}
                    />
                  </div>

                  <Link
                    href={`/dashboard/student/subjects`}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between transition-all"
                  >
                    <span>Vào học môn {sub.name}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          4. CHỈ SỐ HỌC TẬP TỔNG QUAN (METRICS ROW TINH GỌN)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-200/60 dark:border-blue-800/60">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Bài hoàn thành
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-foreground">
                {completedLessonsCount}
              </span>
              <span className="text-xs text-muted-foreground">bài</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Thời gian học
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-foreground">
                {totalStudyMinutes}
              </span>
              <span className="text-xs text-muted-foreground">phút</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-200/60 dark:border-amber-800/60">
            <Award className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Đề thi đã làm
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-foreground">
                {completedExamsCount}
              </span>
              <span className="text-xs text-muted-foreground">đề</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-200/60 dark:border-purple-800/60">
            <BarChart3 className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Điểm trung bình
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold text-foreground">
                {myAvgScore}
              </span>
              <span className="text-xs text-muted-foreground">{myScores.length > 0 ? '/10đ' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. NỘI DUNG 2 CỘT: THÔNG BÁO & BẢNG VÀNG THI ĐUA TOP 3
          ========================================================================= */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (COL-SPAN-8): THÔNG BÁO & CÂU CHÚC */}
        <div className="md:col-span-8 space-y-4">
          <DailyQuote className="w-full" />

          {/* BẢNG TIN THÔNG BÁO NHÀ TRƯỜNG */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 sm:p-5 shadow-2xs">
            <AnnouncementManager
              initialAnnouncements={announcements}
              userRole={userRole}
              token={token}
              userEmail={studentDetail?.full_name || ''}
            />
          </div>

          {/* BANNER HỎI ĐÁP */}
          <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-blue-50/50 dark:bg-slate-800/40 p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground m-0">
                  Có bài tập khó hoặc thắc mắc kiến thức?
                </h4>
                <p className="text-xs text-muted-foreground m-0 mt-0.5">
                  Gửi câu hỏi trực tiếp để được Thầy Cô THPT FPT giải đáp chi tiết.
                </p>
              </div>
            </div>
            <Link 
              href="/dashboard/student/support"
              className="btn-primary text-xs py-2 px-3.5 shrink-0 self-start sm:self-auto font-bold"
            >
              Gửi câu hỏi <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* CỘT PHẢI (COL-SPAN-4): BẢNG VÀNG KHỐI 12 (TOP 1, 2, 3) & HOẠT ĐỘNG GẦN ĐÂY */}
        <div className="md:col-span-4 space-y-4">
          
          {/* BẢNG VÀNG VINH DANH KHỐI 12 (CHỈ LẤY TOP 1, 2, 3) */}
          <Grade12Leaderboard 
            initialLeaderboard={leaderboard} 
            currentStudentId={studentId} 
          />

          {/* HOẠT ĐỘNG GẦN ĐÂY */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 sm:p-4.5 shadow-2xs space-y-3.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 m-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Hoạt Động Gần Đây
            </h3>

            {(!recentProgress || recentProgress.length === 0) ? (
              <p className="text-xs text-muted-foreground italic m-0">Chưa có bài học nào được hoàn thành gần đây.</p>
            ) : (
              <div className="space-y-3">
                {recentProgress.map((prog: any) => {
                  const subjectName = prog.lessons?.chapters?.subjects?.name || 'Môn học';
                  const theme = getSubjectColorTheme(subjectName);

                  return (
                    <div key={prog.id} className="flex gap-2.5 items-start text-xs border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-b-0 last:pb-0">
                      <div className={`h-7 w-7 rounded-lg ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center shrink-0 mt-0.5`}>
                        <SubjectIcon name={subjectName} className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <p className="font-bold text-foreground line-clamp-2 leading-snug m-0">
                          {prog.lessons?.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-muted-foreground">{subjectName}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">&bull; Hoàn thành</span>
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
