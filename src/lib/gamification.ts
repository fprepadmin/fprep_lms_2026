/**
 * HỆ THỐNG GAMIFICATION CHUẨN HOÁ FPREP
 * THPT FPT Cần Thơ - Niên khóa Khối 12 (2026-2027)
 * 
 * CƠ SỞ KHOA HỌC TÍNH ĐIỂM (XP BASELINE):
 * 1. Hoàn thành 1 bài học (Lý thuyết / Video): +100 XP
 * 2. Tự học sâu: +2 XP cho mỗi phút học (tối đa +120 XP/ngày)
 * 3. Luyện đề thi / Khảo thí:
 *    - Hoàn thành bài thi: +50 XP
 *    - Điểm đạt (>= 5.0): +30 XP
 *    - Điểm giỏi (>= 8.0): +50 XP
 *    - Điểm xuất sắc (>= 9.0): +100 XP
 *    - Điểm tuyệt đối (10.0): +200 XP
 * 4. Chuỗi ngày học tập (Streak Bonus):
 *    - Mỗi ngày duy trì streak: +20 XP * min(streak, 10)
 */

export interface GamificationStats {
  totalXp: number;
  level: number;
  levelTitle: string;
  badgeRank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  nextLevelXp: number;
  currentLevelMinXp: number;
  progressPercent: number;
  xpNeededForNextLevel: number;
  streakDays: number;
  completedLessonsCount: number;
  totalStudyMinutes: number;
  completedExamsCount: number;
  highestScore: number;
  dailyQuests: DailyQuest[];
  achievements: AchievementBadge[];
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  rewardXp: number;
  completed: boolean;
}

export interface AchievementBadge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  icon: string;
  category: 'study' | 'exam' | 'streak' | 'mastery';
  target: number;
  current: number;
  unit: string;
  unlocked: boolean;
  unlockedAt?: string;
  metalStyle: {
    gradient: string;
    border: string;
    shadow: string;
    text: string;
    ring: string;
    glow: string;
    badgeBg: string;
  };
}

// 12 Cấp độ chuẩn hoá cho học sinh Khối 12 (2026-2027)
export const LEVEL_TIERS = [
  { level: 1, minXp: 0, title: 'Tân Binh Khối 12', rank: 'bronze' as const },
  { level: 2, minXp: 250, title: 'Khởi Động Luyện Thi', rank: 'bronze' as const },
  { level: 3, minXp: 600, title: 'Học Sinh Chăm Chỉ', rank: 'silver' as const },
  { level: 4, minXp: 1100, title: 'Chiến Binh Kiên Trì', rank: 'silver' as const },
  { level: 5, minXp: 1800, title: 'Bứt Phá Điểm Số', rank: 'gold' as const },
  { level: 6, minXp: 2800, title: 'Cao Thủ FPREP', rank: 'gold' as const },
  { level: 7, minXp: 4100, title: 'Bậc Thầy Ôn Luyện', rank: 'platinum' as const },
  { level: 8, minXp: 5700, title: 'Tinh Anh F-School', rank: 'platinum' as const },
  { level: 9, minXp: 7600, title: 'Đại Sư Tri Thức', rank: 'diamond' as const },
  { level: 10, minXp: 10000, title: 'Huyền Thoại 2026-2027', rank: 'diamond' as const },
  { level: 11, minXp: 13000, title: 'Thủ Lĩnh Học Đường', rank: 'master' as const },
  { level: 12, minXp: 17000, title: 'Thủ Khoa Tương Lai', rank: 'master' as const },
];

export const BADGE_METAL_STYLES: Record<string, AchievementBadge['metalStyle']> = {
  bronze: {
    gradient: 'from-[#8c5228] via-[#c68642] to-[#6a3818]',
    border: 'border-[#d49b6a]',
    shadow: 'shadow-[0_8px_20px_rgba(140,82,40,0.35)]',
    text: 'text-[#e6a87c]',
    ring: 'ring-[#a35e29]/40',
    glow: 'rgba(198,134,66,0.3)',
    badgeBg: 'bg-amber-900/10 border-amber-800/30 text-amber-700 dark:text-amber-300'
  },
  silver: {
    gradient: 'from-[#718096] via-[#cbd5e1] to-[#475569]',
    border: 'border-[#e2e8f0]',
    shadow: 'shadow-[0_8px_20px_rgba(148,163,184,0.35)]',
    text: 'text-slate-700 dark:text-slate-200',
    ring: 'ring-slate-300/40',
    glow: 'rgba(203,213,225,0.35)',
    badgeBg: 'bg-slate-500/10 border-slate-400/30 text-slate-700 dark:text-slate-300'
  },
  gold: {
    gradient: 'from-[#b45309] via-[#fbbf24] to-[#78350f]',
    border: 'border-[#fef08a]',
    shadow: 'shadow-[0_8px_24px_rgba(245,158,11,0.45)]',
    text: 'text-amber-500 dark:text-amber-300',
    ring: 'ring-amber-400/50',
    glow: 'rgba(251,191,36,0.4)',
    badgeBg: 'bg-amber-500/15 border-amber-400/40 text-amber-600 dark:text-amber-300'
  },
  platinum: {
    gradient: 'from-[#0369a1] via-[#38bdf8] to-[#0c4a6e]',
    border: 'border-[#bae6fd]',
    shadow: 'shadow-[0_8px_24px_rgba(56,189,248,0.45)]',
    text: 'text-sky-500 dark:text-sky-300',
    ring: 'ring-sky-400/50',
    glow: 'rgba(56,189,248,0.4)',
    badgeBg: 'bg-sky-500/15 border-sky-400/40 text-sky-600 dark:text-sky-300'
  },
  diamond: {
    gradient: 'from-[#4338ca] via-[#818cf8] to-[#1e1b4b]',
    border: 'border-[#c7d2fe]',
    shadow: 'shadow-[0_8px_26px_rgba(99,102,241,0.5)]',
    text: 'text-indigo-400 dark:text-indigo-300',
    ring: 'ring-indigo-400/50',
    glow: 'rgba(129,140,248,0.45)',
    badgeBg: 'bg-indigo-500/15 border-indigo-400/40 text-indigo-600 dark:text-indigo-300'
  },
  master: {
    gradient: 'from-[#be123c] via-[#fb7185] to-[#881337]',
    border: 'border-[#fecdd3]',
    shadow: 'shadow-[0_8px_28px_rgba(244,63,94,0.55)]',
    text: 'text-rose-500 dark:text-rose-300',
    ring: 'ring-rose-400/60',
    glow: 'rgba(251,113,133,0.5)',
    badgeBg: 'bg-rose-500/15 border-rose-400/40 text-rose-600 dark:text-rose-300'
  }
};

/**
 * Tính toán toàn bộ thông số Gamification từ dữ liệu thực tế
 */
export function calculateGamification(
  progressList: any[] = [],
  studyLogsList: any[] = [],
  examResultsList: any[] = []
): GamificationStats {
  // 1. Phân tích dữ liệu thực tế
  const completedLessons = progressList.filter(p => p.completed);
  const completedLessonsCount = completedLessons.length;
  
  const totalStudySeconds = studyLogsList.reduce((acc, curr) => acc + (Number(curr.duration_seconds) || 0), 0);
  const totalStudyMinutes = Math.round(totalStudySeconds / 60);

  const completedExamsCount = new Set(examResultsList.map(r => r.exam_id)).size;
  const allScores = examResultsList.map(r => Number(r.score) || 0);
  const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;

  // 2. Tính tổng XP thực tế có cơ sở khoa học
  // Bài học: 100 XP / bài
  const lessonXp = completedLessonsCount * 100;
  // Thời gian học: 2 XP / phút
  const studyXp = totalStudyMinutes * 2;
  // Đề thi: 50 XP tham gia + thưởng thành tích
  let examXp = 0;
  allScores.forEach(score => {
    examXp += 50; // Phí nỗ lực làm bài
    if (score >= 10.0) examXp += 200; // Điểm 10 tuyệt đối
    else if (score >= 9.0) examXp += 100; // Điểm xuất sắc
    else if (score >= 8.0) examXp += 50;  // Điểm giỏi
    else if (score >= 5.0) examXp += 30;  // Điểm đạt
  });

  // 3. Chuỗi học tập (Streak Days)
  const activityDates = new Set<string>();
  studyLogsList.forEach(log => {
    if (log.created_at) activityDates.add(new Date(log.created_at).toISOString().split('T')[0]);
  });
  progressList.forEach(p => {
    if (p.completed_at) activityDates.add(new Date(p.completed_at).toISOString().split('T')[0]);
    else if (p.last_accessed_at) activityDates.add(new Date(p.last_accessed_at).toISOString().split('T')[0]);
  });
  examResultsList.forEach(r => {
    if (r.created_at) activityDates.add(new Date(r.created_at).toISOString().split('T')[0]);
  });

  let streakDays = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let checkDate = new Date();
  if (!activityDates.has(todayStr) && activityDates.has(yesterdayStr)) {
    checkDate = yesterday;
  }

  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (activityDates.has(dStr)) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  if (streakDays === 0 && activityDates.size > 0) {
    streakDays = 1;
  }

  const streakBonusXp = streakDays * 20;
  const totalXp = lessonXp + studyXp + examXp + streakBonusXp;

  // 4. Tính Cấp độ & Danh hiệu
  let currentTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];

  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || { 
        level: currentTier.level + 1, 
        minXp: currentTier.minXp + 3500, 
        title: 'Thần Đồng FPREP',
        rank: 'master' as const
      };
      break;
    }
  }

  const level = currentTier.level;
  const levelTitle = currentTier.title;
  const badgeRank = currentTier.rank;
  const currentLevelMinXp = currentTier.minXp;
  const nextLevelXp = nextTier.minXp;
  const span = Math.max(1, nextLevelXp - currentLevelMinXp);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalXp - currentLevelMinXp) / span) * 100)));
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - totalXp);

  // 5. Nhiệm vụ hàng ngày (Daily Quests)
  const todayLogs = studyLogsList.filter(l => l.created_at && l.created_at.startsWith(todayStr));
  const todayStudyMinutes = Math.round(todayLogs.reduce((acc, curr) => acc + (Number(curr.duration_seconds) || 0), 0) / 60);
  const todayProgress = progressList.filter(p => p.completed && p.completed_at && p.completed_at.startsWith(todayStr));
  const todayExams = examResultsList.filter(r => r.created_at && r.created_at.startsWith(todayStr));

  const dailyQuests: DailyQuest[] = [
    {
      id: 'quest_study_time',
      title: 'Tự học chuyên sâu',
      description: 'Dành ít nhất 15 phút học lý thuyết hoặc xem bài giảng hôm nay',
      target: 15,
      current: Math.min(15, todayStudyMinutes),
      unit: 'phút',
      rewardXp: 40,
      completed: todayStudyMinutes >= 15
    },
    {
      id: 'quest_lesson_finish',
      title: 'Chinh phục bài học',
      description: 'Hoàn thành ít nhất 1 bài học trên hệ thống hôm nay',
      target: 1,
      current: Math.min(1, todayProgress.length),
      unit: 'bài',
      rewardXp: 60,
      completed: todayProgress.length >= 1
    },
    {
      id: 'quest_exam_practice',
      title: 'Luyện đề thực chiến',
      description: 'Nộp ít nhất 1 bài kiểm tra hoặc đề thi thử hôm nay',
      target: 1,
      current: Math.min(1, todayExams.length),
      unit: 'đề',
      rewardXp: 80,
      completed: todayExams.length >= 1
    }
  ];

  // 6. Hệ thống 8 Huy hiệu kim loại vật lý (Physical-like 3D Badges)
  const achievements: AchievementBadge[] = [
    {
      id: 'badge_first_step',
      title: 'Khởi Đầu Nan',
      subtitle: 'Huy Hiệu Đồng Khối 12',
      description: 'Hoàn thành bài giảng đầu tiên trên hệ thống FPREP',
      tier: 'bronze',
      icon: 'BookOpen',
      category: 'study',
      target: 1,
      current: completedLessonsCount,
      unit: 'bài',
      unlocked: completedLessonsCount >= 1,
      metalStyle: BADGE_METAL_STYLES.bronze
    },
    {
      id: 'badge_first_exam',
      title: 'Bản Lĩnh Phòng Thi',
      subtitle: 'Huy Hiệu Bạc Thực Chiến',
      description: 'Hoàn thành và nộp bài khảo thí trắc nghiệm đầu tiên',
      tier: 'silver',
      icon: 'ClipboardList',
      category: 'exam',
      target: 1,
      current: completedExamsCount,
      unit: 'đề',
      unlocked: completedExamsCount >= 1,
      metalStyle: BADGE_METAL_STYLES.silver
    },
    {
      id: 'badge_streak_3',
      title: 'Kỷ Luật Vàng',
      subtitle: 'Chuỗi 3 Ngày Học Liên Tục',
      description: 'Duy trì học tập và làm bài đều đặn ít nhất 3 ngày liên tiếp',
      tier: 'gold',
      icon: 'Flame',
      category: 'streak',
      target: 3,
      current: streakDays,
      unit: 'ngày',
      unlocked: streakDays >= 3,
      metalStyle: BADGE_METAL_STYLES.gold
    },
    {
      id: 'badge_deep_study',
      title: 'Chiến Sĩ Kiên Trì',
      subtitle: 'Tích Lũy 60 Phút Học Sâu',
      description: 'Tổng thời gian học lý thuyết và xem video bài giảng đạt 60 phút',
      tier: 'gold',
      icon: 'Clock',
      category: 'study',
      target: 60,
      current: totalStudyMinutes,
      unit: 'phút',
      unlocked: totalStudyMinutes >= 60,
      metalStyle: BADGE_METAL_STYLES.gold
    },
    {
      id: 'badge_high_score',
      title: 'Đỉnh Cao Điểm Số',
      subtitle: 'Huy Hiệu Bạch Kim Khảo Thí',
      description: 'Đạt điểm từ 8.0 trở lên trong đề thi trắc nghiệm',
      tier: 'platinum',
      icon: 'Award',
      category: 'mastery',
      target: 8.0,
      current: highestScore,
      unit: 'điểm',
      unlocked: highestScore >= 8.0,
      metalStyle: BADGE_METAL_STYLES.platinum
    },
    {
      id: 'badge_study_master',
      title: 'Học Bá Chuyên Cần',
      subtitle: 'Huy Hiệu Bạch Kim Tri Thức',
      description: 'Tự học và hoàn thành thành công từ 5 bài học trên hệ thống',
      tier: 'platinum',
      icon: 'GraduationCap',
      category: 'study',
      target: 5,
      current: completedLessonsCount,
      unit: 'bài',
      unlocked: completedLessonsCount >= 5,
      metalStyle: BADGE_METAL_STYLES.platinum
    },
    {
      id: 'badge_exam_streak',
      title: 'Vua Luyện Đề',
      subtitle: 'Huy Hiệu Kim Cương Khối 12',
      description: 'Luyện tập và hoàn tất thành công từ 5 đề thi khác nhau',
      tier: 'diamond',
      icon: 'Zap',
      category: 'exam',
      target: 5,
      current: completedExamsCount,
      unit: 'đề',
      unlocked: completedExamsCount >= 5,
      metalStyle: BADGE_METAL_STYLES.diamond
    },
    {
      id: 'badge_perfect_score',
      title: 'Thủ Khoa Tuyệt Đối',
      subtitle: 'Huy Hiệu Huyền Thoại Master',
      description: 'Đạt điểm 10 tuyệt đối hoặc điểm thi xuất sắc từ 9.0 trở lên',
      tier: 'master',
      icon: 'Trophy',
      category: 'mastery',
      target: 9.0,
      current: highestScore,
      unit: 'điểm',
      unlocked: highestScore >= 9.0,
      metalStyle: BADGE_METAL_STYLES.master
    }
  ];

  return {
    totalXp,
    level,
    levelTitle,
    badgeRank,
    nextLevelXp,
    currentLevelMinXp,
    progressPercent,
    xpNeededForNextLevel,
    streakDays,
    completedLessonsCount,
    totalStudyMinutes,
    completedExamsCount,
    highestScore,
    dailyQuests,
    achievements
  };
}
