'use client';

import React, { useState } from 'react';
import { 
  Sparkles, Zap, Award, Flame, CheckCircle2, Circle, 
  ChevronRight, Lock, Unlock, Trophy, Clock, BookOpen, 
  ClipboardList, GraduationCap, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { GamificationStats, AchievementBadge, DailyQuest } from '@/lib/gamification';

interface GamificationHubProps {
  stats: GamificationStats;
  className?: string;
}

export default function GamificationHub({ stats, className = '' }: GamificationHubProps) {
  const [activeTab, setActiveTab] = useState<'quests' | 'achievements'>('quests');

  // Tự động đồng bộ số liệu Gamification thực tế lên thanh Header ngay lập tức
  React.useEffect(() => {
    if (typeof window !== 'undefined' && stats) {
      window.dispatchEvent(new CustomEvent('fprep_gamification_sync', { detail: stats }));
    }
  }, [stats]);

  // Lấy icon tương ứng cho Achievement
  const renderAchievementIcon = (iconName: string, classNameStr: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className={classNameStr} />;
      case 'ClipboardList': return <ClipboardList className={classNameStr} />;
      case 'Award': return <Award className={classNameStr} />;
      case 'Clock': return <Clock className={classNameStr} />;
      case 'GraduationCap': return <GraduationCap className={classNameStr} />;
      case 'Zap': return <Zap className={classNameStr} />;
      default: return <Trophy className={classNameStr} />;
    }
  };

  const unlockedCount = stats.achievements.filter(a => a.unlocked).length;
  const completedQuestsCount = stats.dailyQuests.filter(q => q.completed).length;

  return (
    <div className={`rounded-3xl border-2 border-[#b6d4fe] dark:border-blue-900/60 bg-gradient-to-br from-[#f8fbff] via-card to-card dark:from-[#081836]/40 dark:via-card dark:to-card p-5 sm:p-7 shadow-xs space-y-6 relative overflow-hidden ${className}`}>
      
      {/* Decorative ambient background glows */}
      <div className="absolute -right-24 -top-24 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-24 -bottom-24 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: CẤP ĐỘ, DANH HIỆU & CHUỖI HỌC TẬP THỰC TẾ */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-border/70 pb-6">
        
        {/* Cụm Cấp độ & Danh hiệu */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md border-2 border-white/30 dark:border-blue-400/30">
              {stats.level}
            </div>
            <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] shadow-sm uppercase tracking-wider border border-white dark:border-[#081a3b]">
              Cấp {stats.level}
            </div>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black font-heading text-xl sm:text-2xl text-foreground tracking-tight m-0">
                {stats.levelTitle}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-primary dark:text-blue-400 font-extrabold text-[11px] border border-blue-500/20">
                <Sparkles className="h-3 w-3 text-primary" /> FPREP Ranking
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-semibold m-0 flex items-center gap-2">
              <span>Tổng tích lũy: <strong className="text-foreground font-black">{stats.totalXp.toLocaleString()} XP</strong></span>
              <span>&bull;</span>
              <span>Còn <strong className="text-orange-500 font-black">{stats.xpNeededForNextLevel.toLocaleString()} XP</strong> để lên Cấp {stats.level + 1}</span>
            </p>

            {/* Thanh tiến độ lên cấp tiếp theo */}
            <div className="pt-2 flex items-center gap-3 max-w-md">
              <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden border border-border/60">
                <div 
                  className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 h-full rounded-full transition-all duration-700 shadow-xs" 
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-black text-primary font-ui min-w-8">
                {stats.progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Cụm Chuỗi học tập (Streak) & Huy hiệu đã mở khóa */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Chuỗi học tập (Streak Flame) */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/15 border-2 border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Flame className="h-6 w-6 text-orange-500 fill-orange-500 animate-bounce" />
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-orange-600/80 dark:text-orange-300">
                Chuỗi ngày học
              </span>
              <span className="text-base font-black text-orange-600 dark:text-orange-400 font-heading">
                {stats.streakDays} ngày liên tiếp
              </span>
            </div>
          </div>

          {/* Huy hiệu thành tựu tổng quan */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-muted/40 border border-border shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Huy hiệu mở khóa
              </span>
              <span className="text-base font-black text-foreground font-heading">
                {unlockedCount}/{stats.achievements.length} danh hiệu
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* NAVIGATION TABS (NHIỆM VỤ HÀNG NGÀY & DANH HIỆU THÀNH TỰU) */}
      <div className="relative z-10 space-y-4">
        
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted/50 border border-border">
            <button
              onClick={() => setActiveTab('quests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'quests'
                  ? 'bg-card text-foreground shadow-xs border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Nhiệm vụ hôm nay ({completedQuestsCount}/{stats.dailyQuests.length})
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'achievements'
                  ? 'bg-card text-foreground shadow-xs border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Award className="h-3.5 w-3.5 text-blue-500" />
              Bộ sưu tập Huy hiệu ({unlockedCount}/{stats.achievements.length})
            </button>
          </div>

          <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
            Tự động cập nhật theo tiến trình học tập thực tế
          </span>
        </div>

        {/* TAB 1: NHIỆM VỤ HÀNG NGÀY (DAILY QUESTS) */}
        {activeTab === 'quests' && (
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.dailyQuests.map(quest => {
              const progressPct = Math.min(100, Math.round((quest.current / quest.target) * 100));

              return (
                <div 
                  key={quest.id} 
                  className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between gap-3 ${
                    quest.completed 
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-card border-border hover:border-border/80'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black text-foreground m-0 flex items-center gap-2">
                        {quest.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        )}
                        {quest.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-[10px] shrink-0 border border-amber-500/25">
                        +{quest.rewardXp} XP
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed m-0">
                      {quest.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">Tiến độ hôm nay</span>
                      <span className={quest.completed ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-foreground font-extrabold'}>
                        {quest.current}/{quest.target} {quest.unit}
                      </span>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          quest.completed ? 'bg-emerald-500' : 'bg-primary'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: HUY HIỆU THÀNH TỰU (ACHIEVEMENTS) */}
        {activeTab === 'achievements' && (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {stats.achievements.map(ach => {
              const progressPct = Math.min(100, Math.round((ach.current / ach.target) * 100));

              return (
                <div 
                  key={ach.id}
                  className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                    ach.unlocked 
                      ? `bg-gradient-to-br ${ach.colorScheme.bg} ${ach.colorScheme.border} shadow-2xs` 
                      : 'bg-muted/20 border-border/70 opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black shrink-0 border shadow-2xs ${
                      ach.unlocked 
                        ? `bg-white dark:bg-[#071735] ${ach.colorScheme.text} ${ach.colorScheme.border}` 
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {renderAchievementIcon(ach.icon, "h-5 w-5")}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-black text-sm text-foreground truncate m-0">
                          {ach.title}
                        </h4>
                        {ach.unlocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-wider border border-emerald-500/30 shrink-0">
                            Đã Đạt
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-black text-[9px] uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Khóa
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed m-0">
                        {ach.description}
                      </p>
                    </div>
                  </div>

                  {/* Tiến độ mở khóa */}
                  <div className="space-y-1.5 pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">Mục tiêu</span>
                      <span className="text-foreground font-extrabold">
                        {ach.current}/{ach.target} {ach.unit} ({progressPct}%)
                      </span>
                    </div>
                    <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          ach.unlocked ? 'bg-primary' : 'bg-muted-foreground/40'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
