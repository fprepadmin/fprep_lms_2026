/**
 * HỆ THỐNG GAMIFICATION CHUẨN HOÁ FPREP (TÍNH TOÁN DỰA TRÊN DỮ LIỆU THẬT)
 * THPT FPT Cần Thơ - Niên khóa 2024-2027
 */

export interface GamificationStats {
  totalXp: number;
  level: number;
  levelTitle: string;
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
  description: string;
  icon: string;
  category: 'study' | 'exam' | 'streak' | 'mastery';
  target: number;
  current: number;
  unit: string;
  unlocked: boolean;
  unlockedAt?: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
}

// Bảng thang Cấp độ & Danh hiệu
export const LEVEL_TIERS = [
  { level: 1, minXp: 0, title: 'Tân Binh FPREP' },
  { level: 2, minXp: 200, title: 'Người Khởi Đầu' },
  { level: 3, minXp: 500, title: 'Học Sinh Chăm Chỉ' },
  { level: 4, minXp: 1000, title: 'Bứt Phá Điểm Số' },
  { level: 5, minXp: 1800, title: 'Chiến Binh Học Thuật' },
  { level: 6, minXp: 2800, title: 'Chiến Binh 2024-2027' },
  { level: 7, minXp: 4000, title: 'Cao Thủ Luyện Đề' },
  { level: 8, minXp: 5500, title: 'Tinh Anh F-School' },
  { level: 9, minXp: 7500, title: 'Đại Sư Tri Thức' },
  { level: 10, minXp: 10000, title: 'Thủ Khoa Tương Lai' }
];

/**
 * Tính toán toàn bộ thông số Gamification từ dữ liệu thực tế trong Supabase
 */
export function calculateGamification(
  progressList: any[] = [],
  studyLogsList: any[] = [],
  examResultsList: any[] = []
): GamificationStats {
  // 1. Dữ liệu thực tế cơ bản
  const completedLessons = progressList.filter(p => p.completed);
  const completedLessonsCount = completedLessons.length;
  
  const totalStudySeconds = studyLogsList.reduce((acc, curr) => acc + (Number(curr.duration_seconds) || 0), 0);
  const totalStudyMinutes = Math.round(totalStudySeconds / 60);

  const completedExamsCount = new Set(examResultsList.map(r => r.exam_id)).size;
  const allScores = examResultsList.map(r => Number(r.score) || 0);
  const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;

  // 2. Tính tổng XP thực tế
  // - Mỗi bài học hoàn thành: +100 XP
  // - Mỗi phút tự học: +2 XP
  // - Mỗi đề thi tham gia: +50 XP
  // - Điểm thi giỏi (>= 8.0): +50 XP; Điểm xuất sắc (>= 9.0): +100 XP
  let examBonusXp = 0;
  allScores.forEach(score => {
    if (score >= 9.0) examBonusXp += 100;
    else if (score >= 8.0) examBonusXp += 50;
  });

  const totalXp = (completedLessonsCount * 100) + 
                  (totalStudyMinutes * 2) + 
                  (examResultsList.length * 50) + 
                  examBonusXp;

  // 3. Tính Cấp độ & Danh hiệu
  let currentTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1];

  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || { level: currentTier.level + 1, minXp: currentTier.minXp + 2500, title: 'Huyền Thoại FPREP' };
      break;
    }
  }

  const level = currentTier.level;
  const levelTitle = currentTier.title;
  const currentLevelMinXp = currentTier.minXp;
  const nextLevelXp = nextTier.minXp;
  const span = Math.max(1, nextLevelXp - currentLevelMinXp);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalXp - currentLevelMinXp) / span) * 100)));
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - totalXp);

  // 4. Tính Chuỗi ngày học liên tục (Streak) dựa trên logs & progress & exams
  const activityDates = new Set<string>();
  
  studyLogsList.forEach(log => {
    if (log.created_at) {
      activityDates.add(new Date(log.created_at).toISOString().split('T')[0]);
    }
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

  // Nếu hôm nay hoặc hôm qua có học thì bắt đầu tính streak
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
  // Mặc định ít nhất 1 ngày nếu có bất kỳ hoạt động nào
  if (streakDays === 0 && activityDates.size > 0) {
    streakDays = 1;
  }

  // 5. Nhiệm vụ hàng ngày (Daily Quests) tính theo hoạt động trong ngày hôm nay
  const todayLogs = studyLogsList.filter(l => l.created_at && l.created_at.startsWith(todayStr));
  const todayStudyMinutes = Math.round(todayLogs.reduce((acc, curr) => acc + (Number(curr.duration_seconds) || 0), 0) / 60);
  
  const todayProgress = progressList.filter(p => p.completed && p.completed_at && p.completed_at.startsWith(todayStr));
  const todayExams = examResultsList.filter(r => r.created_at && r.created_at.startsWith(todayStr));

  const dailyQuests: DailyQuest[] = [
    {
      id: 'quest_study_time',
      title: 'Tự học chăm chỉ',
      description: 'Dành ít nhất 15 phút học lý thuyết hoặc xem video bài giảng hôm nay',
      target: 15,
      current: Math.min(15, todayStudyMinutes),
      unit: 'phút',
      rewardXp: 40,
      completed: todayStudyMinutes >= 15
    },
    {
      id: 'quest_lesson_finish',
      title: 'Chinh phục bài giảng',
      description: 'Hoàn thành ít nhất 1 bài học trên hệ thống hôm nay',
      target: 1,
      current: Math.min(1, todayProgress.length),
      unit: 'bài',
      rewardXp: 60,
      completed: todayProgress.length >= 1
    },
    {
      id: 'quest_exam_practice',
      title: 'Rèn luyện thực chiến',
      description: 'Nộp ít nhất 1 đề thi hoặc bài kiểm tra trắc nghiệm hôm nay',
      target: 1,
      current: Math.min(1, todayExams.length),
      unit: 'đề',
      rewardXp: 80,
      completed: todayExams.length >= 1
    }
  ];

  // 6. Danh sách Huy hiệu Thành tựu (Achievements Badges) thực tế
  const achievements: AchievementBadge[] = [
    {
      id: 'badge_first_lesson',
      title: 'Khởi Đầu Nan',
      description: 'Hoàn thành bài giảng đầu tiên trên hệ thống FPREP',
      icon: 'BookOpen',
      category: 'study',
      target: 1,
      current: completedLessonsCount,
      unit: 'bài',
      unlocked: completedLessonsCount >= 1,
      colorScheme: {
        bg: 'from-blue-500/15 to-indigo-500/15',
        border: 'border-blue-400/40',
        text: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-500/20'
      }
    },
    {
      id: 'badge_first_exam',
      title: 'Bản Lĩnh Phòng Thi',
      description: 'Hoàn thành và nộp bài kiểm tra trắc nghiệm đầu tiên',
      icon: 'ClipboardList',
      category: 'exam',
      target: 1,
      current: completedExamsCount,
      unit: 'đề',
      unlocked: completedExamsCount >= 1,
      colorScheme: {
        bg: 'from-amber-500/15 to-orange-500/15',
        border: 'border-amber-400/40',
        text: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-500/20'
      }
    },
    {
      id: 'badge_high_score',
      title: 'Đỉnh Cao Điểm Số',
      description: 'Đạt điểm từ 8.0 trở lên trong bất kỳ bài luyện thi nào',
      icon: 'Award',
      category: 'mastery',
      target: 8.0,
      current: highestScore,
      unit: 'điểm',
      unlocked: highestScore >= 8.0,
      colorScheme: {
        bg: 'from-emerald-500/15 to-teal-500/15',
        border: 'border-emerald-400/40',
        text: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-500/20'
      }
    },
    {
      id: 'badge_deep_study',
      title: 'Chiến Sĩ Kiên Trì',
      description: 'Tích lũy tổng thời gian tự học trên hệ thống đạt 60 phút',
      icon: 'Clock',
      category: 'study',
      target: 60,
      current: totalStudyMinutes,
      unit: 'phút',
      unlocked: totalStudyMinutes >= 60,
      colorScheme: {
        bg: 'from-purple-500/15 to-pink-500/15',
        border: 'border-purple-400/40',
        text: 'text-purple-600 dark:text-purple-400',
        glow: 'shadow-purple-500/20'
      }
    },
    {
      id: 'badge_study_master',
      title: 'Học Bá Chuyên Cần',
      description: 'Tự học và hoàn thành thành công từ 5 bài giảng trở lên',
      icon: 'GraduationCap',
      category: 'study',
      target: 5,
      current: completedLessonsCount,
      unit: 'bài',
      unlocked: completedLessonsCount >= 5,
      colorScheme: {
        bg: 'from-sky-500/15 to-blue-500/15',
        border: 'border-sky-400/40',
        text: 'text-sky-600 dark:text-sky-400',
        glow: 'shadow-sky-500/20'
      }
    },
    {
      id: 'badge_exam_streak',
      title: 'Vua Luyện Đề',
      description: 'Luyện tập và hoàn tất thành công từ 3 đề thi khác nhau',
      icon: 'Zap',
      category: 'exam',
      target: 3,
      current: completedExamsCount,
      unit: 'đề',
      unlocked: completedExamsCount >= 3,
      colorScheme: {
        bg: 'from-orange-500/15 to-rose-500/15',
        border: 'border-orange-400/40',
        text: 'text-orange-600 dark:text-orange-400',
        glow: 'shadow-orange-500/20'
      }
    }
  ];

  return {
    totalXp,
    level,
    levelTitle,
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
