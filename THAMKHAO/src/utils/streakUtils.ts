/**
 * Utility cho Hệ thống Streak (Chuỗi Học Tập) FMath12
 */

// Lấy ngày dưới dạng chuỗi YYYY-MM-DD theo giờ địa phương
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Lấy ngày hôm qua YYYY-MM-DD
export const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
};

export interface StreakUpdateResult {
  streak: number;
  updated: boolean;
  lastActiveDate: string;
  message?: string;
}

/**
 * Tính toán Streak khi người dùng hoàn thành 1 hoạt động học tập (Quiz hoặc Bài giảng)
 */
export const calculateStreakUpdate = (
  currentStreak: number = 0,
  lastActiveDate?: string | null
): StreakUpdateResult => {
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();

  // 1. Đã điểm danh/hoàn thành hoạt động trong ngày hôm nay rồi
  if (lastActiveDate === todayStr) {
    return {
      streak: Math.max(1, currentStreak),
      updated: false,
      lastActiveDate: todayStr,
      message: 'Bạn đã hoàn thành hoạt động hôm nay rồi!'
    };
  }

  // 2. Ngày hoạt động gần nhất là ngày hôm qua -> Tiếp tục chuỗi Streak (+1)
  if (lastActiveDate === yesterdayStr) {
    const newStreak = (currentStreak || 0) + 1;
    return {
      streak: newStreak,
      updated: true,
      lastActiveDate: todayStr,
      message: `Xuất sắc! Chuỗi học tập đạt ${newStreak} ngày 🔥`
    };
  }

  // 3. Bỏ lỡ ngày trước hoặc mới lần đầu hoạt động -> Bắt đầu/Reset Streak = 1
  return {
    streak: 1,
    updated: true,
    lastActiveDate: todayStr,
    message: 'Bắt đầu chuỗi học tập mới! Cố gắng duy trì mỗi ngày nhé 💪'
  };
};

/**
 * Kiểm tra xem Streak có bị đứt không khi mở App
 */
export const checkStreakValidity = (
  currentStreak: number = 0,
  lastActiveDate?: string | null
): { streak: number; isBroken: boolean } => {
  if (!lastActiveDate) {
    return { streak: 0, isBroken: false };
  }

  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();

  // Nếu ngày hoạt động gần nhất trước ngày hôm qua (và không phải hôm nay) -> Bị đứt streak
  if (lastActiveDate !== todayStr && lastActiveDate !== yesterdayStr) {
    return { streak: 0, isBroken: true };
  }

  return { streak: currentStreak, isBroken: false };
};
