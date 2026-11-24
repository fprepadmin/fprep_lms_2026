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

// Cấu hình danh hiệu cho Top 7 tiếp theo (#4 đến #10)
const TOP_7_HONORS = [
  {
    rank: 4,
    title: 'Top 4 - Tinh Anh',
    badgeColor: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]',
    avatarRing: 'border-purple-400/70 text-purple-300 bg-purple-500/20',
    statAccent: 'text-purple-300',
    numberBadge: 'bg-purple-600/40 text-purple-200 border-purple-400/50',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-300" />
  },
  {
    rank: 5,
    title: 'Top 5 - Bứt Phá',
    badgeColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    avatarRing: 'border-emerald-400/70 text-emerald-300 bg-emerald-500/20',
    statAccent: 'text-emerald-300',
    numberBadge: 'bg-emerald-600/40 text-emerald-200 border-emerald-400/50',
    icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
  },
  {
    rank: 6,
    title: 'Top 6 - Vững Vàng',
    badgeColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
    avatarRing: 'border-cyan-400/70 text-cyan-300 bg-cyan-500/20',
    statAccent: 'text-cyan-300',
    numberBadge: 'bg-cyan-600/40 text-cyan-200 border-cyan-400/50',
    icon: <Flame className="w-3.5 h-3.5 text-cyan-300" />
  },
  {
    rank: 7,
    title: 'Top 7 - Nỗ Lực',
    badgeColor: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    avatarRing: 'border-amber-400/70 text-amber-300 bg-amber-500/20',
    statAccent: 'text-amber-300',
    numberBadge: 'bg-amber-600/40 text-amber-200 border-amber-400/50',
    icon: <Zap className="w-3.5 h-3.5 text-amber-300" />
  },
  {
    rank: 8,
    title: 'Top 8 - Quyết Tâm',
    badgeColor: 'from-pink-500/20 to-rose-500/20 text-pink-300 border-pink-400/40 shadow-[0_0_15px_rgba(236,72,153,0.2)]',
    avatarRing: 'border-pink-400/70 text-pink-300 bg-pink-500/20',
    statAccent: 'text-pink-300',
    numberBadge: 'bg-pink-600/40 text-pink-200 border-pink-400/50',
    icon: <Star className="w-3.5 h-3.5 text-pink-300" />
  },
  {
    rank: 9,
    title: 'Top 9 - Vươn Lên',
    badgeColor: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    avatarRing: 'border-blue-400/70 text-blue-300 bg-blue-500/20',
    statAccent: 'text-blue-300',
    numberBadge: 'bg-blue-600/40 text-blue-200 border-blue-400/50',
    icon: <ArrowUpRight className="w-3.5 h-3.5 text-blue-300" />
  },
  {
    rank: 10,
    title: 'Top 10 - Tiềm Năng',
    badgeColor: 'from-teal-500/20 to-emerald-500/20 text-teal-300 border-teal-400/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]',
    avatarRing: 'border-teal-400/70 text-teal-300 bg-teal-500/20',
    statAccent: 'text-teal-300',
    numberBadge: 'bg-teal-600/40 text-teal-200 border-teal-400/50',
    icon: <Medal className="w-3.5 h-3.5 text-teal-300" />
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
    <div className="rounded-3xl bg-slate-900/85 backdrop-blur-2xl border-2 border-cyan-500/40 p-5 sm:p-7 shadow-[0_12px_40px_rgba(0,15,50,0.5)] space-y-6 text-white relative overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-5 relative z-10">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-400/40">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> BẢNG VÀNG VINH DANH HỌC SINH
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Cập nhật liên tục theo tuần
            </span>
            {currentStudentRank && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                Thứ hạng của bạn: <strong className="text-white font-black">#{currentStudentRank.rank}</strong> ({currentStudentRank.avgScore}đ)
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight flex flex-wrap items-center gap-2">
            Vinh Danh Năng Lực:
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-black">
              {currentSubjectName}
            </span>
          </h2>

          <p className="text-xs text-cyan-300 font-medium m-0 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{periodLabel}</span>
          </p>
        </div>

        {/* Nút xem toàn bộ bảng vàng */}
        <Link
          href="/dashboard/student/leaderboard"
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer active:scale-95 border border-cyan-400/40 shrink-0"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Mở Bảng Vàng Chi Tiết</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 2. CHỌN MÔN HỌC (MỖI MÔN 1 BẢNG) */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Chọn Môn Học:
          </span>
          <span className="text-[11px] text-cyan-300 font-medium lowercase">
            mỗi môn 1 bảng top 3 + top 7 riêng biệt
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
              selectedSubjectId === 'all'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Tất cả các môn
          </button>

          {allSubjects.map(sub => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-blue-500/50 hover:text-white'
                }`}
              >
                <span>{sub.name}</span>
                {isSelected && <Check className="w-3 h-3 text-cyan-300" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CHỌN CHU KỲ THỜI GIAN: TUẦN 1, 2, 3, 4, TUẦN HIỆN TẠI (LIVE) & TỔNG KẾT 4 TUẦN (CẢ THÁNG) */}
      <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-cyan-500/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-10">
        
        {/* Chọn Tháng */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span>Tháng:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8.5 px-2.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-white text-xs font-bold focus:border-cyan-400 transition-colors cursor-pointer"
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
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)] font-black'
                : 'bg-slate-900/80 text-amber-300 border-amber-500/30 hover:border-amber-400/60'
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
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] font-black'
                : 'bg-slate-900/80 text-emerald-300 border-emerald-500/30 hover:border-emerald-400/60'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            Tuần Hiện Tại (Live)
          </button>

          {/* Tuần 1 */}
          <button
            onClick={() => setTimePeriod('week_1')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_1'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-500/50'
            }`}
          >
            Tuần 1
          </button>

          {/* Tuần 2 */}
          <button
            onClick={() => setTimePeriod('week_2')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_2'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-500/50'
            }`}
          >
            Tuần 2
          </button>

          {/* Tuần 3 */}
          <button
            onClick={() => setTimePeriod('week_3')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_3'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-500/50'
            }`}
          >
            Tuần 3
          </button>

          {/* Tuần 4 */}
          <button
            onClick={() => setTimePeriod('week_4')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_4'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-cyan-500/50'
            }`}
          >
            Tuần 4
          </button>
        </div>

      </div>

      {/* 4. BỤC VINH DANH TOP 3 DẪN ĐẦU (PODIUM ÁNH KIM CHUẨN THIẾT KẾ) */}
      {top3.length > 0 ? (
        <div className="space-y-3 pt-1 relative z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0 uppercase tracking-wider">
              <Crown className="w-4 h-4 text-amber-400" /> Bục Vinh Danh Top 3 Dẫn Đầu
            </h3>
            <span className="text-[11px] font-semibold text-slate-300">
              Tổng số {totalActiveStudents} học sinh đã tham gia khảo thí
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Top 2: Á Quân (Bên trái) */}
            {top3[1] && (
              <div className="order-2 md:order-1 p-5 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-slate-300/40 shadow-[0_0_20px_rgba(148,163,184,0.25)] text-center relative overflow-hidden flex flex-col items-center justify-between">
                <div className="absolute top-3 right-3 text-2xl font-black text-slate-400/40">#2</div>
                <div className="w-14 h-14 rounded-full bg-slate-400/20 border-2 border-slate-300 flex items-center justify-center font-black text-xl text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.4)] mb-3">
                  {top3[1].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-400/20 text-slate-200 border border-slate-300/30 mb-1">
                    <Medal className="w-3.5 h-3.5 text-slate-300" /> Á Quân
                  </div>
                  <h4 className="text-base font-bold text-white truncate max-w-[200px] m-0">{top3[1].fullName}</h4>
                  <p className="text-xs text-slate-400 font-medium">Lớp: {top3[1].className} • MSHS: {top3[1].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm TB</span>
                    <span className="font-black text-base text-cyan-300">{top3[1].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-base text-amber-300">{top3[1].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Đã nộp</span>
                    <span className="font-black text-base text-purple-300">{top3[1].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 1: Quán Quân (Ở giữa - Nổi bật nhất) */}
            {top3[0] && (
              <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-amber-500/25 via-slate-900/90 to-slate-900 border-2 border-amber-400/80 shadow-[0_0_35px_rgba(251,191,36,0.35)] text-center relative overflow-hidden flex flex-col items-center justify-between md:-translate-y-2">
                <div className="absolute top-2 right-3 text-3xl font-black text-amber-400/40">#1</div>
                <div className="relative mb-3">
                  <Crown className="w-8 h-8 text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center font-black text-2xl text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                    {top3[0].fullName[0].toUpperCase()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400/25 text-amber-300 border border-amber-400/50 mb-1">
                    <Crown className="w-3.5 h-3.5 text-amber-300" /> Quán Quân Bảng Vàng
                  </div>
                  <h4 className="text-lg font-black text-white truncate max-w-[220px] m-0">{top3[0].fullName}</h4>
                  <p className="text-xs text-amber-200/80 font-medium">Lớp: {top3[0].className} • MSHS: {top3[0].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-500/30 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm TB</span>
                    <span className="font-black text-lg text-amber-300">{top3[0].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-lg text-emerald-400">{top3[0].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Đã nộp</span>
                    <span className="font-black text-lg text-cyan-300">{top3[0].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3: Quý Quân (Bên phải) */}
            {top3[2] && (
              <div className="order-3 p-5 rounded-2xl bg-gradient-to-b from-amber-900/30 to-slate-900/80 border border-amber-600/50 shadow-[0_0_20px_rgba(217,119,6,0.25)] text-center relative overflow-hidden flex flex-col items-center justify-between">
                <div className="absolute top-3 right-3 text-2xl font-black text-amber-700/40">#3</div>
                <div className="w-14 h-14 rounded-full bg-amber-700/20 border-2 border-amber-600 flex items-center justify-center font-black text-xl text-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.3)] mb-3">
                  {top3[2].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-700/20 text-amber-400 border border-amber-600/40 mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Quý Quân
                  </div>
                  <h4 className="text-base font-bold text-white truncate max-w-[200px] m-0">{top3[2].fullName}</h4>
                  <p className="text-xs text-slate-400 font-medium">Lớp: {top3[2].className} • MSHS: {top3[2].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm TB</span>
                    <span className="font-black text-base text-cyan-300">{top3[2].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-base text-amber-300">{top3[2].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Đã nộp</span>
                    <span className="font-black text-base text-purple-300">{top3[2].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-800/50 border border-cyan-500/20 text-center space-y-2 relative z-10">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-bold text-white m-0">Chưa có lượt nộp bài thi nào trong chu kỳ này</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto m-0">
            Bạn có thể chọn &quot;Tổng kết 4 Tuần&quot; hoặc &quot;Toàn thời gian&quot; để xem thành tích các đợt thi trước.
          </p>
          <button
            onClick={() => setTimePeriod('month_all')}
            className="mt-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" /> Xem Tổng kết 4 Tuần (Cả tháng)
          </button>
        </div>
      )}

      {/* 5. KHỐI VINH DANH TOP 7 TIẾP THEO (HẠNG #4 ĐẾN #10) */}
      {top7.length > 0 && (
        <div className="space-y-3 pt-2 relative z-10">
          <div className="flex items-center justify-between border-t border-cyan-500/20 pt-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0 uppercase tracking-wider">
              <Medal className="w-4 h-4 text-purple-400" /> Top 7 Gương Mặt Tiêu Biểu Bứt Phá (Hạng #4 - #10)
            </h3>
            <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/25">
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
                  className={`p-3.5 rounded-2xl bg-gradient-to-b ${honorConfig.badgeColor} border backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between space-y-2.5 relative overflow-hidden group`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${honorConfig.numberBadge}`}>
                      {honorConfig.icon} #{rankNum}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 truncate max-w-[110px]">
                      {honorConfig.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 shadow-md ${honorConfig.avatarRing}`}>
                      {student.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate m-0 group-hover:text-cyan-300 transition-colors">
                        {student.fullName}
                      </h4>
                      <p className="text-[10px] text-slate-300 m-0 truncate">
                        Lớp: <span className="font-semibold text-white">{student.className}</span> • {student.mshs}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 p-1.5 rounded-xl bg-slate-900/60 border border-slate-700/50 text-center text-xs">
                    <div>
                      <span className="block text-[8px] text-slate-400">Điểm TB</span>
                      <span className={`font-black text-[11px] ${honorConfig.statAccent}`}>{student.avgScore}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400">Cao nhất</span>
                      <span className="font-black text-[11px] text-amber-300">{student.maxScore}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-400">Đã nộp</span>
                      <span className="font-black text-[11px] text-cyan-300">{student.examCount} đề</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. FOOTER ACTION */}
      <div className="pt-2 text-center relative z-10 border-t border-cyan-500/20">
        <Link
          href="/dashboard/student/leaderboard"
          className="inline-flex items-center gap-2 text-xs font-black text-cyan-300 hover:text-white transition-colors"
        >
          <span>Xem Bảng Xếp Hạng Đầy Đủ Của Toàn Khối & Tất Cả Học Sinh</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
