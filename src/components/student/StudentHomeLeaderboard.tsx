'use client';

import React, { useState, useMemo } from 'react';
import { 
  Trophy, Medal, Award, Crown, Calendar, Zap, 
  TrendingUp, Sparkles, Flame, Star, ArrowUpRight, 
  Check, ChevronRight, BookOpen, AlertCircle, Eye
} from 'lucide-react';
import Link from 'next/link';

export interface StudentLeaderboardProps {
  students: any[];
  examResults: any[];
  allSubjects: {
    id: string;
    name: string;
  }[];
  currentStudentId?: string;
}

// Cấu hình danh hiệu cho Top 7 tiếp theo (#4 đến #10) - Chuẩn Future Blue 2.0
const TOP_7_HONORS = [
  {
    rank: 4,
    title: 'Top 4 - Tinh Anh',
    badgeColor: 'from-purple-50/80 to-white dark:from-purple-500/20 dark:to-indigo-500/20 border-purple-200 dark:border-purple-400/40',
    avatarRing: 'border-purple-300 dark:border-purple-400/70 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/20',
    statAccent: 'text-purple-600 dark:text-purple-300',
    numberBadge: 'bg-purple-100 dark:bg-purple-600/40 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-400/50',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
  },
  {
    rank: 5,
    title: 'Top 5 - Bứt Phá',
    badgeColor: 'from-emerald-50/80 to-white dark:from-emerald-500/20 dark:to-teal-500/20 border-emerald-200 dark:border-emerald-400/40',
    avatarRing: 'border-emerald-300 dark:border-emerald-400/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20',
    statAccent: 'text-emerald-600 dark:text-emerald-300',
    numberBadge: 'bg-emerald-100 dark:bg-emerald-600/40 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-400/50',
    icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
  },
  {
    rank: 6,
    title: 'Top 6 - Vững Vàng',
    badgeColor: 'from-sky-50/80 to-white dark:from-cyan-500/20 dark:to-blue-500/20 border-sky-200 dark:border-cyan-400/40',
    avatarRing: 'border-sky-300 dark:border-cyan-400/70 text-[#1746D1] dark:text-cyan-300 bg-sky-50 dark:bg-cyan-500/20',
    statAccent: 'text-[#1746D1] dark:text-cyan-300',
    numberBadge: 'bg-sky-100 dark:bg-cyan-600/40 text-[#1746D1] dark:text-cyan-200 border-sky-200 dark:border-cyan-400/50',
    icon: <Flame className="w-3.5 h-3.5 text-[#087CFF] dark:text-cyan-300" />
  },
  {
    rank: 7,
    title: 'Top 7 - Nỗ Lực',
    badgeColor: 'from-amber-50/80 to-white dark:from-amber-500/20 dark:to-orange-500/20 border-amber-200 dark:border-amber-400/40',
    avatarRing: 'border-amber-300 dark:border-amber-400/70 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/20',
    statAccent: 'text-amber-600 dark:text-amber-300',
    numberBadge: 'bg-amber-100 dark:bg-amber-600/40 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-400/50',
    icon: <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
  },
  {
    rank: 8,
    title: 'Top 8 - Quyết Tâm',
    badgeColor: 'from-rose-50/80 to-white dark:from-pink-500/20 dark:to-rose-500/20 border-rose-200 dark:border-pink-400/40',
    avatarRing: 'border-rose-300 dark:border-pink-400/70 text-rose-700 dark:text-pink-300 bg-rose-50 dark:bg-pink-500/20',
    statAccent: 'text-rose-600 dark:text-pink-300',
    numberBadge: 'bg-rose-100 dark:bg-pink-600/40 text-rose-700 dark:text-pink-200 border-rose-200 dark:border-pink-400/50',
    icon: <Star className="w-3.5 h-3.5 text-rose-600 dark:text-pink-300" />
  },
  {
    rank: 9,
    title: 'Top 9 - Vươn Lên',
    badgeColor: 'from-blue-50/80 to-white dark:from-blue-500/20 dark:to-indigo-500/20 border-blue-200 dark:border-blue-400/40',
    avatarRing: 'border-blue-300 dark:border-blue-400/70 text-[#1746D1] dark:text-blue-300 bg-blue-50 dark:bg-blue-500/20',
    statAccent: 'text-[#1746D1] dark:text-blue-300',
    numberBadge: 'bg-blue-100 dark:bg-blue-600/40 text-[#1746D1] dark:text-blue-200 border-blue-200 dark:border-blue-400/50',
    icon: <ArrowUpRight className="w-3.5 h-3.5 text-[#1746D1] dark:text-blue-300" />
  },
  {
    rank: 10,
    title: 'Top 10 - Tiềm Năng',
    badgeColor: 'from-teal-50/80 to-white dark:from-teal-500/20 dark:to-emerald-500/20 border-teal-200 dark:border-teal-400/40',
    avatarRing: 'border-teal-300 dark:border-teal-400/70 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/20',
    statAccent: 'text-teal-600 dark:text-teal-300',
    numberBadge: 'bg-teal-100 dark:bg-teal-600/40 text-teal-700 dark:text-teal-200 border-teal-200 dark:border-teal-400/50',
    icon: <Medal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
  }
];

function getWeekOfMonth(d: Date): number {
  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function getMonthKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function StudentHomeLeaderboard({
  students,
  examResults,
  allSubjects,
  currentStudentId
}: StudentLeaderboardProps) {
  // 1. Môn học đang chọn: mặc định 'all'
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // 2. Danh sách tháng có dữ liệu
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    set.add(getMonthKey(now));
    examResults.forEach(r => {
      if (r.created_at) {
        try {
          const d = new Date(r.created_at);
          if (!isNaN(d.getTime())) {
            set.add(getMonthKey(d));
          }
        } catch (e) {}
      }
    });
    return Array.from(set).sort().reverse();
  }, [examResults]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || getMonthKey(new Date());
  });

  // 3. Chu kỳ thời gian: 'month_all' (Tổng kết 4 tuần của tháng), 'current_week' (Live), 'week_1', 'week_2', 'week_3', 'week_4', 'all'
  const [timePeriod, setTimePeriod] = useState<'month_all' | 'current_week' | 'week_1' | 'week_2' | 'week_3' | 'week_4' | 'all'>('month_all');

  // Tên môn học hiển thị
  const currentSubjectName = useMemo(() => {
    if (selectedSubjectId === 'all') return 'Tất cả các môn';
    const sub = allSubjects.find(s => s.id === selectedSubjectId);
    return sub?.name || 'Môn học';
  }, [selectedSubjectId, allSubjects]);

  // Kiểm tra thời gian kết quả thi
  const checkTimePeriod = (createdAtStr: string): boolean => {
    if (timePeriod === 'all') return true;
    if (!createdAtStr) return false;

    const d = new Date(createdAtStr);
    if (isNaN(d.getTime())) return false;

    const mKey = getMonthKey(d);
    const day = d.getDate();
    const weekNum = getWeekOfMonth(d);

    if (timePeriod === 'current_week') {
      const now = new Date();
      return mKey === getMonthKey(now) && weekNum === getWeekOfMonth(now);
    }

    if (selectedMonth !== 'all' && mKey !== selectedMonth) {
      return false;
    }

    if (timePeriod === 'month_all') return true;
    if (timePeriod === 'week_1') return day >= 1 && day <= 7;
    if (timePeriod === 'week_2') return day >= 8 && day <= 14;
    if (timePeriod === 'week_3') return day >= 15 && day <= 21;
    if (timePeriod === 'week_4') return day >= 22;

    return true;
  };

  // Tính toán bảng xếp hạng
  const { top3, top7, totalActiveStudents, currentStudentRank } = useMemo(() => {
    // 1. Lọc examResults
    const filteredResults = examResults.filter(r => {
      if (selectedSubjectId !== 'all') {
        const examObj = Array.isArray(r.exams) ? r.exams[0] : r.exams;
        const sId = examObj?.subject_id;
        if (sId !== selectedSubjectId) return false;
      }
      return checkTimePeriod(r.created_at);
    });

    // 2. Nhóm theo học sinh
    const resultsByStudent = new Map<string, typeof examResults>();
    filteredResults.forEach(r => {
      if (!resultsByStudent.has(r.student_id)) {
        resultsByStudent.set(r.student_id, []);
      }
      resultsByStudent.get(r.student_id)!.push(r);
    });

    // 3. Tính chỉ số
    const rankings = students.map(s => {
      const results = resultsByStudent.get(s.student_id) || [];
      const examCount = results.length;

      let maxScore = 0;
      let totalScore = 0;
      results.forEach(r => {
        const sc = Number(r.score) || 0;
        if (sc > maxScore) maxScore = sc;
        totalScore += sc;
      });

      const avgScore = examCount > 0 ? Number((totalScore / examCount).toFixed(2)) : 0;
      const classObj = Array.isArray(s.classes) ? s.classes[0] : s.classes;
      const className = classObj?.name || '12';

      return {
        studentId: s.student_id,
        fullName: s.full_name,
        mshs: s.mshs,
        className,
        examCount,
        maxScore,
        avgScore,
        totalScore
      };
    });

    // 4. Sắp xếp: Ưu tiên có làm bài, sau đó theo điểm trung bình, điểm cao nhất
    rankings.sort((a, b) => {
      if (a.examCount > 0 && b.examCount === 0) return -1;
      if (a.examCount === 0 && b.examCount > 0) return 1;
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
      return b.examCount - a.examCount;
    });

    const activeList = rankings.filter(s => s.examCount > 0);
    const top3List = activeList.slice(0, 3);
    const top7List = activeList.slice(3, 10);

    // Thứ hạng của học sinh đang đăng nhập
    let myRank: { rank: number; avgScore: number; examCount: number } | null = null;
    if (currentStudentId) {
      const idx = activeList.findIndex(s => s.studentId === currentStudentId);
      if (idx !== -1) {
        myRank = {
          rank: idx + 1,
          avgScore: activeList[idx].avgScore,
          examCount: activeList[idx].examCount
        };
      }
    }

    return {
      top3: top3List,
      top7: top7List,
      totalActiveStudents: activeList.length,
      currentStudentRank: myRank
    };
  }, [students, examResults, selectedSubjectId, timePeriod, selectedMonth, currentStudentId]);

  // Chuỗi mô tả chu kỳ thời gian
  const periodLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const monthText = `Tháng ${m}/${y}`;
    switch (timePeriod) {
      case 'month_all':
        return `Tổng kết 4 tuần của ${monthText} (Cả tháng)`;
      case 'current_week': {
        const now = new Date();
        return `Tuần ${getWeekOfMonth(now)} Hiện Tại (Live) • Cập nhật liên tục`;
      }
      case 'week_1':
        return `Tuần 1 (01 - 07) • ${monthText}`;
      case 'week_2':
        return `Tuần 2 (08 - 14) • ${monthText}`;
      case 'week_3':
        return `Tuần 3 (15 - 21) • ${monthText}`;
      case 'week_4':
        return `Tuần 4 (22 - Cuối tháng) • ${monthText}`;
      case 'all':
        return 'Toàn bộ thời gian (Tất cả đợt thi)';
      default:
        return monthText;
    }
  }, [timePeriod, selectedMonth]);

  return (
    <div className="rounded-3xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm overflow-hidden">
      
      {/* 1. HEADER SECTION - FUTURE BLUE 2.0 ĐỒNG BỘ QUẢN TRỊ VIÊN */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-5 sm:p-7 text-white border-b border-[#00DFFF]/25">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#00DFFF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#087CFF]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/15 text-[#00DFFF] border border-white/20 backdrop-blur-md">
                <Crown className="w-3.5 h-3.5 text-amber-300" /> BẢNG VÀNG VINH DANH HỌC SINH
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/35">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Cập nhật liên tục theo tuần
              </span>
              {currentStudentRank && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-blue-100 border border-white/20">
                  Thứ hạng của bạn: <strong className="text-white font-black">#{currentStudentRank.rank}</strong> ({currentStudentRank.avgScore}đ)
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-heading text-white m-0 tracking-tight flex flex-wrap items-center gap-2">
              Vinh Danh Năng Lực:
              <span className="text-amber-300 font-black">
                {currentSubjectName}
              </span>
            </h2>

            <p className="text-xs text-blue-100/90 font-medium m-0 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
              <span>{periodLabel}</span>
            </p>
          </div>

          {/* Nút xem toàn bộ bảng vàng */}
          <Link
            href="/dashboard/student/leaderboard"
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#0B1B55] font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 border border-white/60 shrink-0 self-start md:self-center"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Mở Bảng Vàng Chi Tiết</span>
            <ChevronRight className="w-4 h-4 text-[#1746D1]" />
          </Link>
        </div>
      </div>

      {/* NỘI DUNG BẢNG VÀNG TRÊN NỀN TRẮNG FUTURE BLUE 2.0 */}
      <div className="p-5 sm:p-7 space-y-6">

      {/* 2. CHỌN MÔN HỌC (MỖI MÔN 1 BẢNG) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-slate-300 uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-[#1746D1] dark:text-[#00DFFF]">
            <BookOpen className="w-3.5 h-3.5" /> Chọn Môn Học:
          </span>
          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium normal-case">
            Mỗi môn 1 bảng Top 3 + Top 7 riêng biệt
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              selectedSubjectId === 'all'
                ? 'bg-[#0B1B55] dark:bg-[#1746D1] text-white border-[#0B1B55] dark:border-[#087CFF] shadow-sm font-extrabold'
                : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/40 hover:bg-blue-50 hover:text-[#1746D1]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Tất cả các môn
          </button>

          {allSubjects.map(sub => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0B1B55] to-[#1746D1] text-white border-[#1746D1] shadow-sm font-extrabold'
                    : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/40 hover:bg-blue-50 hover:text-[#1746D1]'
                }`}
              >
                <span>{sub.name}</span>
                {isSelected && <Check className="w-3 h-3 text-[#00DFFF]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CHỌN CHU KỲ THỜI GIAN: TUẦN 1, 2, 3, 4, TUẦN HIỆN TẠI (LIVE) & TỔNG KẾT 4 TUẦN (CẢ THÁNG) */}
      <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0D2063]/70 border border-[#E2E8F0] dark:border-[#1B317A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Chọn Tháng */}
        <div className="flex items-center gap-2 text-xs font-bold text-[#14213D] dark:text-slate-200 shrink-0">
          <Calendar className="w-4 h-4 text-[#1746D1] dark:text-[#00DFFF]" />
          <span>Tháng:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8.5 px-2.5 rounded-lg bg-white dark:bg-[#0B1B55] border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-white text-xs font-bold focus:border-[#1746D1] transition-colors cursor-pointer"
          >
            {availableMonths.map(m => {
              const [y, mo] = m.split('-');
              return (
                <option key={m} value={m}>
                  Tháng {mo}/{y} {m === getMonthKey(new Date()) ? '(Hiện tại)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Chu kỳ Tuần / Tháng */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
          {/* Tổng kết 4 tuần */}
          <button
            onClick={() => setTimePeriod('month_all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
              timePeriod === 'month_all'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-sm font-extrabold'
                : 'bg-white dark:bg-[#0B1B55] text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:bg-amber-50'
            }`}
          >
            <Crown className="w-3 h-3" />
            Tổng kết 4 Tuần (Cả tháng)
          </button>

          {/* Tuần hiện tại */}
          <button
            onClick={() => setTimePeriod('current_week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
              timePeriod === 'current_week'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-extrabold'
                : 'bg-white dark:bg-[#0B1B55] text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-50'
            }`}
          >
            <Zap className="w-3 h-3" />
            Tuần Hiện Tại (Live)
          </button>

          {/* Tuần 1 */}
          <button
            onClick={() => setTimePeriod('week_1')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_1'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-white dark:bg-[#0B1B55] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 1
          </button>

          {/* Tuần 2 */}
          <button
            onClick={() => setTimePeriod('week_2')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_2'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-white dark:bg-[#0B1B55] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 2
          </button>

          {/* Tuần 3 */}
          <button
            onClick={() => setTimePeriod('week_3')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_3'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-white dark:bg-[#0B1B55] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 3
          </button>

          {/* Tuần 4 */}
          <button
            onClick={() => setTimePeriod('week_4')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_4'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-white dark:bg-[#0B1B55] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 4
          </button>
        </div>

      </div>

      {/* 4. BỤC VINH DANH TOP 3 DẪN ĐẦU */}
      {top3.length > 0 ? (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-extrabold text-[#14213D] dark:text-white flex items-center gap-2 m-0 uppercase tracking-wider">
              <Crown className="w-4 h-4 text-amber-500" /> Bục Vinh Danh Top 3 Dẫn Đầu
            </h3>
            <span className="text-[11px] font-semibold text-[#64748B] dark:text-slate-300">
              Tổng số {totalActiveStudents} học sinh đã tham gia khảo thí
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Top 2: Á Quân (Bên trái) */}
            {top3[1] && (
              <div className="order-2 md:order-1 p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-[#0D2063] dark:to-[#0B1B55] border border-slate-300 dark:border-slate-500/40 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-between">
                <div className="absolute top-3 right-3 text-2xl font-black text-slate-300 dark:text-slate-500/40">#2</div>
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-400/20 border-2 border-slate-400 flex items-center justify-center font-black text-xl text-slate-700 dark:text-slate-200 mb-3">
                  {top3[1].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-400/20 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-300/30 mb-1">
                    <Medal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" /> Á Quân
                  </div>
                  <h4 className="text-base font-extrabold text-[#14213D] dark:text-white truncate max-w-[200px] m-0">{top3[1].fullName}</h4>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Lớp: {top3[1].className} • MSHS: {top3[1].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Điểm TB</span>
                    <span className="font-black text-base text-[#1746D1] dark:text-cyan-300">{top3[1].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-base text-amber-600 dark:text-amber-300">{top3[1].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Đã nộp</span>
                    <span className="font-black text-base text-purple-600 dark:text-purple-300">{top3[1].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 1: Quán Quân (Ở giữa - Nổi bật nhất) */}
            {top3[0] && (
              <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-amber-50 via-white to-blue-50/40 dark:from-amber-500/25 dark:via-[#0D2063] dark:to-[#0B1B55] border-2 border-amber-400 shadow-md shadow-amber-500/15 text-center relative overflow-hidden flex flex-col items-center justify-between md:-translate-y-1.5">
                <div className="absolute top-2 right-3 text-3xl font-black text-amber-300 dark:text-amber-400/40">#1</div>
                <div className="relative mb-3 mt-2">
                  <Crown className="w-7 h-7 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-400/20 border-2 border-amber-500 flex items-center justify-center font-black text-2xl text-amber-700 dark:text-amber-300">
                    {top3[0].fullName[0].toUpperCase()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-400/25 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/50 mb-1">
                    <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" /> Quán Quân Bảng Vàng
                  </div>
                  <h4 className="text-lg font-black text-[#14213D] dark:text-white truncate max-w-[220px] m-0">{top3[0].fullName}</h4>
                  <p className="text-xs text-[#64748B] dark:text-amber-200/80 font-semibold">Lớp: {top3[0].className} • MSHS: {top3[0].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-500/30 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Điểm TB</span>
                    <span className="font-black text-lg text-amber-600 dark:text-amber-300">{top3[0].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">{top3[0].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Đã nộp</span>
                    <span className="font-black text-lg text-[#1746D1] dark:text-cyan-300">{top3[0].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3: Quý Quân (Bên phải) */}
            {top3[2] && (
              <div className="order-3 p-5 rounded-2xl bg-gradient-to-b from-orange-50/80 to-white dark:from-amber-900/30 dark:to-[#0B1B55] border border-orange-300 dark:border-amber-600/50 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-between">
                <div className="absolute top-3 right-3 text-2xl font-black text-orange-200 dark:text-amber-700/40">#3</div>
                <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-amber-700/20 border-2 border-orange-500 flex items-center justify-center font-black text-xl text-orange-700 dark:text-amber-400 mb-3">
                  {top3[2].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-amber-700/20 text-orange-700 dark:text-amber-400 border border-orange-300 dark:border-amber-600/40 mb-1">
                    <Award className="w-3.5 h-3.5 text-orange-600 dark:text-amber-400" /> Quý Quân
                  </div>
                  <h4 className="text-base font-extrabold text-[#14213D] dark:text-white truncate max-w-[200px] m-0">{top3[2].fullName}</h4>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium">Lớp: {top3[2].className} • MSHS: {top3[2].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Điểm TB</span>
                    <span className="font-black text-base text-[#1746D1] dark:text-cyan-300">{top3[2].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-base text-amber-600 dark:text-amber-300">{top3[2].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400">Đã nộp</span>
                    <span className="font-black text-base text-purple-600 dark:text-purple-300">{top3[2].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#F8FAFC] dark:bg-[#0D2063]/60 border border-dashed border-[#CBD5E1] dark:border-[#1B317A] text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm font-bold text-[#14213D] dark:text-white m-0">Chưa có lượt nộp bài thi nào trong chu kỳ này</p>
          <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto m-0">
            Bạn có thể chọn &quot;Tổng kết 4 Tuần&quot; hoặc &quot;Toàn thời gian&quot; để xem thành tích các đợt thi trước.
          </p>
          <button
            onClick={() => setTimePeriod('month_all')}
            className="mt-2 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-400/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" /> Xem Tổng kết 4 Tuần (Cả tháng)
          </button>
        </div>
      )}

      {/* 5. KHỐI VINH DANH TOP 7 TIẾP THEO (HẠNG #4 ĐẾN #10) */}
      {top7.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#1B317A] pt-4">
            <h3 className="text-sm font-extrabold text-[#14213D] dark:text-white flex items-center gap-2 m-0 uppercase tracking-wider">
              <Medal className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Top 7 Gương Mặt Tiêu Biểu Bứt Phá (Hạng #4 - #10)
            </h3>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/25">
              {top7.length}/7 Học sinh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {top7.map((student, idx) => {
              const rankNum = idx + 4;
              const honorConfig = TOP_7_HONORS[idx] || TOP_7_HONORS[TOP_7_HONORS.length - 1];

              return (
                <div
                  key={student.studentId}
                  className={`p-3.5 rounded-2xl bg-gradient-to-b ${honorConfig.badgeColor} border transition-all hover:shadow-md flex flex-col justify-between space-y-2.5 relative overflow-hidden group`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${honorConfig.numberBadge}`}>
                      {honorConfig.icon} #{rankNum}
                    </span>
                    <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-300 truncate max-w-[110px]">
                      {honorConfig.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 ${honorConfig.avatarRing}`}>
                      {student.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-[#14213D] dark:text-white truncate m-0 group-hover:text-[#1746D1] dark:group-hover:text-cyan-300 transition-colors">
                        {student.fullName}
                      </h4>
                      <p className="text-[10px] text-[#64748B] dark:text-slate-300 m-0 truncate">
                        Lớp: <span className="font-bold text-[#14213D] dark:text-white">{student.className}</span> • {student.mshs}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 p-1.5 rounded-xl bg-white/90 dark:bg-[#0B1B55]/80 border border-[#E2E8F0] dark:border-[#1B317A] text-center text-xs">
                    <div>
                      <span className="block text-[8px] text-[#64748B] dark:text-slate-400">Điểm TB</span>
                      <span className={`font-black text-[11px] ${honorConfig.statAccent}`}>{student.avgScore}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-[#64748B] dark:text-slate-400">Cao nhất</span>
                      <span className="font-black text-[11px] text-amber-600 dark:text-amber-300">{student.maxScore}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-[#64748B] dark:text-slate-400">Đã nộp</span>
                      <span className="font-black text-[11px] text-[#1746D1] dark:text-cyan-300">{student.examCount} đề</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. FOOTER ACTION */}
      <div className="pt-3 text-center border-t border-[#E2E8F0] dark:border-[#1B317A]">
        <Link
          href="/dashboard/student/leaderboard"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-[#1746D1] dark:text-[#00DFFF] hover:text-[#087CFF] transition-colors"
        >
          <span>Xem Bảng Xếp Hạng Đầy Đủ Của Toàn Khối & Tất Cả Học Sinh</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      </div>
    </div>
  );
}
