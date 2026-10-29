'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, Medal, Crown, Flame, Award, Sparkles, 
  ChevronRight, Users, Star, ArrowUpRight, CheckCircle2,
  Search, Filter, ArrowRight, RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { LeaderboardItem } from '@/lib/pythonBackend';

interface Grade12LeaderboardProps {
  initialLeaderboard: LeaderboardItem[];
  currentStudentId?: string;
  isFullPage?: boolean;
  className?: string;
}

export default function Grade12Leaderboard({
  initialLeaderboard,
  currentStudentId,
  isFullPage = false,
  className = ''
}: Grade12LeaderboardProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardItem[]>(initialLeaderboard || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'xp' | 'score' | 'exams'>('xp');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const classesList = ['12T1', '12T2', '12T3', '12T4', '12T5', '12T6', '12X1', '12X2', '12X3', '12X4', '12K'];

  // Tự động tải dữ liệu thật từ API nếu dữ liệu ban đầu rỗng hoặc có giá trị mặc định
  useEffect(() => {
    const isDummy = !initialLeaderboard || initialLeaderboard.length === 0 || 
      (initialLeaderboard.length <= 5 && initialLeaderboard.every(x => x.totalXp === 500));

    if (isDummy) {
      setLoading(true);
      fetch('/api/student/leaderboard?limit=100')
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setLeaderboardData(json.data);
          }
        })
        .catch(err => console.error('Error fetching leaderboard client:', err))
        .finally(() => setLoading(false));
    } else {
      setLeaderboardData(initialLeaderboard);
    }
  }, [initialLeaderboard]);

  const filteredLeaderboard = useMemo(() => {
    let list = [...leaderboardData];

    // Lọc theo lớp
    if (filterClass !== 'all') {
      list = list.filter(item => {
        const c = item.className || '';
        return c.toLowerCase().includes(filterClass.toLowerCase());
      });
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.mshs.toLowerCase().includes(q)
      );
    }

    // Sắp xếp
    if (sortBy === 'score') {
      list.sort((a, b) => b.avgScore - a.avgScore || b.totalXp - a.totalXp);
    } else if (sortBy === 'exams') {
      list.sort((a, b) => (b.examCount || 0) - (a.examCount || 0) || b.totalXp - a.totalXp);
    } else {
      list.sort((a, b) => b.totalXp - a.totalXp || b.avgScore - a.avgScore);
    }

    return list;
  }, [leaderboardData, filterClass, searchQuery, sortBy]);

  const top3 = useMemo(() => {
    return filteredLeaderboard.slice(0, 3);
  }, [filteredLeaderboard]);

  // Vị trí của học sinh hiện tại
  const myRankIndex = useMemo(() => {
    if (!currentStudentId) return -1;
    return filteredLeaderboard.findIndex(item => item.student_id === currentStudentId);
  }, [filteredLeaderboard, currentStudentId]);

  const myStudentData = myRankIndex !== -1 ? filteredLeaderboard[myRankIndex] : null;

  const getRankEmblem = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-md shadow-amber-500/30 border border-white/40 shrink-0">
            <Crown className="w-4 h-4 fill-slate-950 text-slate-950" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 text-slate-900 font-black text-xs flex items-center justify-center shadow-md shadow-slate-400/30 border border-white/40 shrink-0">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-800 text-white font-black text-xs flex items-center justify-center shadow-md shadow-amber-800/30 border border-white/40 shrink-0">
            3
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground font-bold text-xs flex items-center justify-center border border-border shrink-0">
            {rank}
          </div>
        );
    }
  };

  const getBadgeRankPill = (rank: string) => {
    switch (rank) {
      case 'master':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">Master</span>;
      case 'diamond':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">Kim Cương</span>;
      case 'platinum':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">Bạch Kim</span>;
      case 'gold':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">Vàng</span>;
      case 'silver':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">Bạc</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-900/15 text-amber-800 dark:text-amber-400 border border-amber-800/30">Đồng</span>;
    }
  };

  // =========================================================================
  // GIAO DIỆN COMPACT CHO DASHBOARD: CHỈ LẤY ĐÚNG TOP 1, 2, 3 THEO YÊU CẦU
  // =========================================================================
  if (!isFullPage) {
    return (
      <div className={`rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 sm:p-5 shadow-xs space-y-3.5 ${className}`}>
        
        {/* Header tinh gọn */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-foreground m-0 leading-tight">
                Bảng Vàng Khối 12
              </h3>
              <span className="text-[10.5px] font-semibold text-muted-foreground block">
                Top 3 Thủ Khoa & Á Khoa
              </span>
            </div>
          </div>

          <Link
            href="/dashboard/student/leaderboard"
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            Chi tiết <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Danh sách ĐÚNG TOP 1 2 3 */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : top3.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Đang đồng bộ dữ liệu xếp hạng...
            </div>
          ) : (
            top3.map((item, idx) => {
              const rank = idx + 1;
              const isMe = currentStudentId && item.student_id === currentStudentId;

              // Màu sắc theo vị trí Top 1 (Vàng), Top 2 (Bạc), Top 3 (Đồng)
              const cardBorder = 
                rank === 1 ? 'border-amber-400/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15' :
                rank === 2 ? 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30' :
                'border-amber-700/30 bg-amber-900/5 dark:bg-amber-950/20';

              return (
                <div
                  key={item.student_id || idx}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${cardBorder} ${
                    isMe ? 'ring-2 ring-amber-500/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getRankEmblem(rank)}
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-foreground truncate block" title={item.name}>
                          {item.name}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[9px] shrink-0">
                            BẠN
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] font-semibold text-muted-foreground block truncate">
                        Lớp {item.className || '12T3'} &bull; <strong className="text-blue-600 dark:text-blue-400 font-normal">{item.avgScore}đ TB</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-xs text-amber-600 dark:text-amber-400 block font-mono">
                      {item.totalXp.toLocaleString()} XP
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Cấp {item.level}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vị trí của bạn nếu không nằm trong Top 3 */}
        {myRankIndex >= 3 && myStudentData && (
          <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Vị trí của bạn: <strong className="text-foreground font-black">Hạng #{myRankIndex + 1}</strong>
            </span>
            <span className="font-black text-blue-600 dark:text-blue-400 font-mono text-[11.5px]">
              {myStudentData.totalXp.toLocaleString()} XP
            </span>
          </div>
        )}

        {/* Nút xem toàn bộ bảng xếp hạng */}
        <Link
          href="/dashboard/student/leaderboard"
          className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <span>Xem BXH Toàn Khối 12</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN FULL PAGE (TRANG XẾP HẠNG CHUYÊN BIỆT)
  // =========================================================================
  return (
    <div className={`rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-5 ${className}`}>
      
      {/* HEADER BẢNG XẾP HẠNG FULL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="font-black text-base text-foreground m-0 tracking-tight">
              Bảng Vàng Thi Đua Khối 12 (2026-2027)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground font-medium m-0 mt-1">
            Xếp hạng theo tổng điểm kinh nghiệm (XP), số đề thi hoàn thành và điểm khảo thí chuẩn xác.
          </p>
        </div>

        {/* Lớp filter dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Lớp:</span>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Toàn Khối 12</option>
            {classesList.map(c => (
              <option key={c} value={c}>Lớp {c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* THANH TÌM KIẾM & TIÊU CHÍ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tìm theo tên học sinh hoặc MSHS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3.5 py-2 pl-9 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase shrink-0">Xếp theo:</span>
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border text-xs font-bold">
            <button
              onClick={() => setSortBy('xp')}
              className={`px-3 py-1 rounded-lg transition-colors ${sortBy === 'xp' ? 'bg-amber-500 text-slate-950 font-black' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Tổng XP
            </button>
            <button
              onClick={() => setSortBy('score')}
              className={`px-3 py-1 rounded-lg transition-colors ${sortBy === 'score' ? 'bg-amber-500 text-slate-950 font-black' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Điểm TB
            </button>
            <button
              onClick={() => setSortBy('exams')}
              className={`px-3 py-1 rounded-lg transition-colors ${sortBy === 'exams' ? 'bg-amber-500 text-slate-950 font-black' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Số đề thi
            </button>
          </div>
        </div>
      </div>

      {/* PODIUM TOP 3 DANH DỰ TOÀN DIỆN */}
      {top3.length >= 3 && !searchQuery.trim() && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 pb-2">
          {/* Rank 2 - Á Khoa 1 */}
          <div className="rounded-3xl border border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-100/90 via-slate-50 to-card dark:from-slate-800/50 dark:to-card p-5 text-center flex flex-col justify-between items-center gap-3 shadow-md order-2 sm:order-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-300 via-slate-100 to-slate-400 text-slate-900 flex items-center justify-center font-black text-lg shadow-md border border-white/50">
              2
            </div>
            <div className="w-full">
              <h4 className="font-black text-sm sm:text-base text-foreground m-0">
                {top3[1].name}
              </h4>
              <span className="text-xs font-bold text-muted-foreground block mt-0.5">
                Lớp {top3[1].className || '12T2'} &bull; <span className="font-mono">{top3[1].mshs}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-black">
                {top3[1].totalXp.toLocaleString()} XP
              </span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                {top3[1].avgScore}đ TB
              </span>
            </div>
          </div>

          {/* Rank 1 - Thủ Khoa Khối 12 */}
          <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-card p-6 text-center flex flex-col justify-between items-center gap-3.5 relative shadow-xl shadow-amber-500/10 order-1 sm:order-2 sm:-translate-y-2">
            <div className="absolute -top-3.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1.5 border border-white/40">
              <Crown className="w-3.5 h-3.5 text-slate-950 fill-slate-950" /> Thủ Khoa Khối 12
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white/60">
              1
            </div>
            <div className="w-full">
              <h4 className="font-black text-base sm:text-lg text-foreground m-0">
                {top3[0].name}
              </h4>
              <span className="text-xs font-bold text-muted-foreground block mt-0.5">
                Lớp {top3[0].className || '12T3'} &bull; <span className="font-mono">{top3[0].mshs}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shadow-sm">
                {top3[0].totalXp.toLocaleString()} XP
              </span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {top3[0].avgScore}đ TB
              </span>
            </div>
          </div>

          {/* Rank 3 - Á Khoa 2 */}
          <div className="rounded-3xl border border-amber-700/40 bg-gradient-to-b from-amber-700/15 via-amber-700/5 to-card p-5 text-center flex flex-col justify-between items-center gap-3 shadow-md order-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-800 text-white flex items-center justify-center font-black text-lg shadow-md border border-white/40">
              3
            </div>
            <div className="w-full">
              <h4 className="font-black text-sm sm:text-base text-foreground m-0">
                {top3[2].name}
              </h4>
              <span className="text-xs font-bold text-muted-foreground block mt-0.5">
                Lớp {top3[2].className || '12T2'} &bull; <span className="font-mono">{top3[2].mshs}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-amber-700/20 text-amber-700 dark:text-amber-300 text-xs font-black">
                {top3[2].totalXp.toLocaleString()} XP
              </span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                {top3[2].avgScore}đ TB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH TOÀN BỘ HỌC SINH */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            Không tìm thấy học sinh nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredLeaderboard.map((item, idx) => {
            const isMe = currentStudentId && item.student_id === currentStudentId;
            const rankNum = item.rank || idx + 1;

            return (
              <div
                key={item.student_id || idx}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isMe
                    ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/40 shadow-xs'
                    : 'bg-background hover:bg-muted/40 border-border/80'
                }`}
              >
                {/* Thứ hạng & Thông tin học sinh */}
                <div className="flex items-center gap-3 min-w-0">
                  {getRankEmblem(rankNum)}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs sm:text-sm text-foreground">
                        {item.name}
                      </span>
                      {isMe && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black text-[9px]">
                          BẠN
                        </span>
                      )}
                      {getBadgeRankPill(item.badgeRank)}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                      <span className="font-bold text-blue-600 dark:text-blue-400">Lớp {item.className || '12T3'}</span>
                      <span>&bull;</span>
                      <span className="font-mono">{item.mshs}</span>
                      <span>&bull;</span>
                      <span>{item.examCount || 0} đề thi đã nộp</span>
                    </div>
                  </div>
                </div>

                {/* Điểm số & Cấp độ */}
                <div className="text-right shrink-0">
                  <div className="font-black text-sm sm:text-base text-foreground font-mono">
                    {item.totalXp.toLocaleString()} <span className="text-[10px] text-amber-500">XP</span>
                  </div>
                  <span className="text-[10.5px] font-extrabold text-muted-foreground block">
                    Cấp {item.level} &bull; <strong className="text-blue-600 dark:text-blue-400">{item.avgScore}đ TB</strong>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
