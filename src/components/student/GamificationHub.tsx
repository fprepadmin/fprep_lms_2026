'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, Zap, Award, Flame, CheckCircle2, Circle, 
  ChevronRight, Lock, Unlock, Trophy, Clock, BookOpen, 
  ClipboardList, GraduationCap, ArrowUpRight, Shield, Crown,
  Medal, Star, X
} from 'lucide-react';
import Link from 'next/link';
import { GamificationStats, AchievementBadge, DailyQuest, LEVEL_TIERS } from '@/lib/gamification';

interface GamificationHubProps {
  stats: GamificationStats;
  className?: string;
}

export default function GamificationHub({ stats, className = '' }: GamificationHubProps) {
  const [activeTab, setActiveTab] = useState<'badges' | 'quests' | 'tiers'>('badges');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBadge(null);
    };
    if (selectedBadge) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBadge]);

  // Xử lý khóa cuộn trang và phím ESC khi mở Modal
  useEffect(() => {
    if (selectedBadge) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedBadge(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [selectedBadge]);

  // Tự động đồng bộ số liệu Gamification thực tế lên thanh Header ngay lập tức
  React.useEffect(() => {
    if (typeof window !== 'undefined' && stats) {
      window.dispatchEvent(new CustomEvent('fprep_gamification_sync', { detail: stats }));
    }
  }, [stats]);

  const renderBadgeIcon = (iconName: string, classNameStr: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className={classNameStr} />;
      case 'ClipboardList': return <ClipboardList className={classNameStr} />;
      case 'Award': return <Award className={classNameStr} />;
      case 'Clock': return <Clock className={classNameStr} />;
      case 'GraduationCap': return <GraduationCap className={classNameStr} />;
      case 'Zap': return <Zap className={classNameStr} />;
      case 'Flame': return <Flame className={classNameStr} />;
      case 'Trophy': return <Trophy className={classNameStr} />;
      default: return <Medal className={classNameStr} />;
    }
  };

  const unlockedCount = stats.achievements.filter(a => a.unlocked).length;
  const completedQuestsCount = stats.dailyQuests.filter(q => q.completed).length;

  return (
    <div className={`rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-5 sm:p-7 shadow-sm space-y-6 relative overflow-hidden ${className}`}>
      
      {/* Decorative ambient background glows */}
      <div className="absolute -right-24 -top-24 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-24 -bottom-24 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HERO: CẤP ĐỘ, DANH HIỆU & HUY HIỆU KIM LOẠI */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border/80 pb-6">
        
        {/* Cụm Cấp độ & Huy hiệu đại diện 3D */}
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          <div className="relative shrink-0">
            {/* 3D Metal Badge Outer Ring */}
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl p-1 bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 shadow-lg shadow-orange-500/25 flex items-center justify-center relative">
              <div className="w-full h-full rounded-[22px] bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden border border-white/20">
                <div className="absolute inset-0 bg-radial from-white/20 via-transparent to-transparent pointer-events-none" />
                <Crown className="w-4 h-4 text-amber-400 drop-shadow-sm mb-0.5" />
                <span className="font-black text-2xl sm:text-3xl font-heading tracking-tight leading-none text-white">
                  {stats.level}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-300/90 mt-0.5">
                  Cấp độ
                </span>
              </div>
            </div>
            {/* Badge Rank Pill */}
            <div className="absolute -bottom-2 -right-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[10px] shadow-md uppercase tracking-wider border border-white/30">
              {stats.badgeRank}
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black font-heading text-xl sm:text-2xl text-foreground tracking-tight m-0">
                {stats.levelTitle}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] border border-amber-500/25">
                <Sparkles className="h-3 w-3 text-amber-500" /> Khối 12 (2026-2027)
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-semibold m-0 flex flex-wrap items-center gap-2">
              <span>Điểm tích lũy: <strong className="text-foreground font-black text-sm">{stats.totalXp.toLocaleString()} XP</strong></span>
              <span>&bull;</span>
              <span>Còn <strong className="text-orange-600 dark:text-orange-400 font-black">{stats.xpNeededForNextLevel.toLocaleString()} XP</strong> lên Cấp {stats.level + 1}</span>
            </p>

            {/* Thanh tiến độ lên cấp tiếp theo */}
            <div className="pt-1.5 flex items-center gap-3 max-w-md">
              <div className="flex-1 bg-muted/80 rounded-full h-2.5 overflow-hidden border border-border/80">
                <div 
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 h-full rounded-full transition-all duration-700 shadow-xs" 
                  style={{ width: `${stats.progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono min-w-8">
                {stats.progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Cụm Chuỗi học tập (Streak) & Huy hiệu đã mở khóa */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          
          {/* Chuỗi học tập (Streak Flame) */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Flame className="w-6 h-6 text-orange-500 fill-orange-500 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Chuỗi học tập</div>
              <div className="text-lg font-black text-foreground flex items-baseline gap-1">
                {stats.streakDays} <span className="text-xs font-bold text-orange-500">ngày liên tục</span>
              </div>
            </div>
          </div>

          {/* Huy hiệu đạt được */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border text-foreground shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Huy hiệu sở hữu</div>
              <div className="text-lg font-black text-foreground flex items-baseline gap-1">
                {unlockedCount} <span className="text-xs font-bold text-muted-foreground">/ {stats.achievements.length}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'badges'
                ? 'bg-amber-500 text-white shadow-xs font-black'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4" /> Bảng Huy Hiệu Kim Loại ({unlockedCount}/{stats.achievements.length})
          </button>

          <button
            onClick={() => setActiveTab('quests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'quests'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-4 h-4" /> Nhiệm Vụ Ngày ({completedQuestsCount}/{stats.dailyQuests.length})
          </button>

          <button
            onClick={() => setActiveTab('tiers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tiers'
                ? 'bg-purple-600 text-white shadow-xs font-black'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Crown className="w-4 h-4" /> 12 Cấp Bậc Danh Dự
          </button>
        </div>
      </div>

      {/* TAB 1: BẢNG HUY HIỆU VẬT LÝ KIM LOẠI (METALLIC 3D BADGES) */}
      {activeTab === 'badges' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium m-0">
              Huy hiệu vinh danh thực chiến được chế tác riêng cho học sinh Khối 12. Hoàn thành nhiệm vụ để mở khóa hiệu ứng kim loại bóng bẩy.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.achievements.map((badge) => {
              const isUnlocked = badge.unlocked;
              const style = badge.metalStyle;

              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`group relative rounded-2xl border p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-between gap-3 ${
                    isUnlocked
                      ? 'bg-gradient-to-b from-card via-card to-background hover:scale-[1.03] hover:shadow-lg ' + style.border
                      : 'bg-muted/30 border-dashed border-border/80 opacity-60 hover:opacity-85'
                  }`}
                >
                  {/* Status Indicator */}
                  <div className="w-full flex items-center justify-between text-[10px]">
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] border ${
                      isUnlocked ? style.badgeBg : 'bg-muted border-border text-muted-foreground'
                    }`}>
                      {badge.tier}
                    </span>
                    {isUnlocked ? (
                      <span className="text-emerald-500 flex items-center gap-0.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mở khóa
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-0.5 font-medium">
                        <Lock className="w-3 h-3" /> Khóa
                      </span>
                    )}
                  </div>

                  {/* 3D Medal Emblem */}
                  <div className="relative my-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-3 shadow-md ${
                      isUnlocked 
                        ? `bg-gradient-to-tr ${style.gradient} border-2 ${style.border} ${style.shadow}` 
                        : 'bg-muted text-muted-foreground/40 border border-border'
                    }`}>
                      {renderBadgeIcon(badge.icon, `w-8 h-8 ${isUnlocked ? 'text-white drop-shadow-md' : 'text-muted-foreground/50'}`)}
                    </div>
                  </div>

                  {/* Badge Text Info */}
                  <div className="space-y-1 w-full">
                    <h4 className={`font-black text-xs m-0 truncate ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {badge.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 m-0 leading-tight">
                      {badge.description}
                    </p>
                  </div>

                  {/* Progress bar inside card */}
                  <div className="w-full pt-2 border-t border-border/50">
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground mb-1">
                      <span>Tiến độ</span>
                      <span>{badge.current}/{badge.target} {badge.unit}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isUnlocked ? 'bg-gradient-to-r from-amber-500 to-emerald-500' : 'bg-muted-foreground/40'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((badge.current / badge.target) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: NHIỆM VỤ HÀNG NGÀY (DAILY QUESTS) */}
      {activeTab === 'quests' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium m-0">
            Nhiệm vụ làm mới mỗi ngày lúc 00:00. Hoàn thành để nhận thêm điểm XP bứt phá thứ hạng Khối 12.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {stats.dailyQuests.map((quest) => (
              <div 
                key={quest.id}
                className={`p-4 rounded-2xl border transition-all ${
                  quest.completed 
                    ? 'bg-emerald-500/[0.06] border-emerald-500/30' 
                    : 'bg-background border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-xs text-foreground m-0 flex items-center gap-1.5">
                    {quest.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    {quest.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-[10px] shrink-0">
                    +{quest.rewardXp} XP
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground m-0 mb-3 leading-relaxed">
                  {quest.description}
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>{quest.current} / {quest.target} {quest.unit}</span>
                    <span>{quest.completed ? 'Đã nhận thưởng' : 'Chưa hoàn thành'}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        quest.completed ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((quest.current / quest.target) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 12 CẤP BẬC DANH DỰ KHỐI 12 */}
      {activeTab === 'tiers' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium m-0">
            Hệ thống 12 cấp độ chuẩn hóa được thiết kế dành riêng cho kỳ thi tốt nghiệp THPT và ĐGNL năm 2026-2027.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {LEVEL_TIERS.map((tier) => {
              const isCurrent = stats.level === tier.level;
              const isAchieved = stats.totalXp >= tier.minXp;

              return (
                <div 
                  key={tier.level}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/50 ring-2 ring-amber-500/30'
                      : isAchieved
                        ? 'bg-card border-border/80'
                        : 'bg-muted/20 border-dashed border-border/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs text-foreground font-mono">
                      Cấp {tier.level}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      isAchieved ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {tier.rank}
                    </span>
                  </div>

                  <h5 className="font-extrabold text-xs text-foreground m-0 truncate">
                    {tier.title}
                  </h5>

                  <p className="text-[10px] text-muted-foreground m-0 mt-1 font-semibold">
                    Yêu cầu: <strong className="text-foreground">{tier.minXp.toLocaleString()} XP</strong>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT HUY HIỆU DÙNG PORTAL TRÁNH BỊ CLIPPING */}
      {mounted && selectedBadge && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setSelectedBadge(null)}
          className="fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 text-center relative overflow-hidden"
          >
            {/* Nút đóng góc phải */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-xl ${
              selectedBadge.unlocked
                ? `bg-gradient-to-tr ${selectedBadge.metalStyle.gradient} border-2 ${selectedBadge.metalStyle.border}`
                : 'bg-muted text-muted-foreground/40 border border-border'
            }`}>
              {renderBadgeIcon(selectedBadge.icon, 'w-10 h-10 text-white drop-shadow-md')}
            </div>

            <div>
              <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                selectedBadge.unlocked ? selectedBadge.metalStyle.badgeBg : 'bg-muted border-border text-muted-foreground'
              }`}>
                Hạng {selectedBadge.tier}
              </span>
              <h3 className="font-black text-lg text-foreground mt-2 m-0">
                {selectedBadge.title}
              </h3>
              <p className="text-xs font-semibold text-amber-500 mt-0.5">
                {selectedBadge.subtitle}
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {selectedBadge.description}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs font-semibold space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Tiến trình hiện tại:</span>
                <strong className="text-foreground">{selectedBadge.current} / {selectedBadge.target} {selectedBadge.unit}</strong>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Trạng thái:</span>
                <strong className={selectedBadge.unlocked ? 'text-emerald-500' : 'text-amber-500'}>
                  {selectedBadge.unlocked ? 'Đã hoàn thành xuất sắc' : 'Đang trong quá trình chinh phục'}
                </strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs transition-opacity hover:opacity-90"
            >
              Đóng
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
