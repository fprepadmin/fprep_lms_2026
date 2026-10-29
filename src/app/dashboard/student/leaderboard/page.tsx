import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { fetchLeaderboardFromPython, LeaderboardItem } from '@/lib/pythonBackend';
import { calculateGamification } from '@/lib/gamification';
import Grade12Leaderboard from '@/components/student/Grade12Leaderboard';
import { Trophy, Award, Crown, Sparkles, Flame, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) redirect('/');

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) redirect('/');

  const studentId = payload.sub || '';
  const studentEmail = payload.email || '';

  const supabase = await getSupabaseServerClient();

  // Lấy dữ liệu học sinh hiện tại và bảng xếp hạng từ Python Server
  const [pythonLeaderboard, studentDetailRes, progressRes, logsRes, examsRes] = await Promise.all([
    fetchLeaderboardFromPython(100),
    supabase.from('student_details').select('*, classes(*)').eq('student_id', studentId).maybeSingle(),
    supabase.from('study_progress').select('*').eq('student_id', studentId),
    supabase.from('study_logs').select('duration_seconds').eq('student_id', studentId),
    supabase.from('exam_results').select('*').eq('student_id', studentId)
  ]);

  const studentDetail = studentDetailRes.data;
  const studentName = studentDetail?.full_name || (studentEmail ? studentEmail.split('@')[0] : 'Học sinh');
  const className = studentDetail?.classes?.name || '12T3';
  const mshs = studentDetail?.mshs || '---';

  const myGamification = calculateGamification(
    progressRes.data || [],
    logsRes.data || [],
    examsRes.data || []
  );

  let leaderboard: LeaderboardItem[] = [];
  if (pythonLeaderboard && pythonLeaderboard.length > 0) {
    leaderboard = pythonLeaderboard;
  } else {
    try {
      const { data: topStudents } = await supabase
        .from('student_details')
        .select('student_id, full_name, mshs, classes(name)')
        .limit(20);

      if (topStudents) {
        leaderboard = topStudents.map((s, idx) => ({
          student_id: s.student_id,
          name: s.full_name || 'Học sinh',
          mshs: s.mshs || '---',
          className: (s as any).classes?.name || '12T3',
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

  // Tìm vị trí xếp hạng của học sinh hiện tại
  const myRankIndex = leaderboard.findIndex(item => item.student_id === studentId || item.mshs === mshs);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '---';

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-16 animate-fade-in">
      
      {/* HEADER BANNER TRANG XẾP HẠNG */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e1a38] via-[#14234b] to-[#1e1b4b] text-white p-6 sm:p-8 shadow-xl border border-blue-900/30">
        
        {/* Họa tiết ánh sáng trang trí nền */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <Link 
                href="/dashboard/student"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur-md border border-white/15 text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Về Trang chủ
              </Link>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                <Crown className="w-3.5 h-3.5" /> Khối 12 (Niên khóa 2026-2027)
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-heading tracking-tight m-0 text-white drop-shadow-sm">
              Bảng Vàng Thi Đua Toàn Diện
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed m-0 font-normal">
              Vinh danh các cá nhân xuất sắc có thành tích tự học kiên trì, luyện đề bứt phá và điểm số dẫn đầu toàn khóa THPT FPT Cần Thơ.
            </p>
          </div>

          {/* VỊ TRÍ XẾP HẠNG CỦA HỌC SINH HIỆN TẠI */}
          <div className="flex items-center gap-4 bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shrink-0 shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-md shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-900 tracking-wider">HẠNG</span>
              <span className="text-2xl leading-none">{myRank}</span>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Thành tích của bạn
              </div>
              <div className="text-base font-black text-white">
                {myGamification.totalXp.toLocaleString()} <span className="text-xs text-amber-300 font-extrabold">XP</span>
              </div>
              <p className="text-[11px] text-slate-300 m-0">
                Cấp {myGamification.level} &bull; {myGamification.levelTitle}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* COMPONENT BẢNG XẾP HẠNG TOÀN DIỆN KHỐI 12 (FULL PAGE CHUYÊN NGHIỆP) */}
      <Grade12Leaderboard
        initialLeaderboard={leaderboard}
        currentStudentId={studentId}
        isFullPage={true}
      />

    </div>
  );
}
