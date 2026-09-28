// Tiện ích xử lý dữ liệu trường học, lớp học và giáo viên chuẩn FPT Schools

export interface TeacherInfo {
  id: string;
  email: string;
  fullName: string;
  fptName: string;
  role?: string;
}

/**
 * Lấy tên hiển thị và mã FPT của giáo viên trực tiếp từ tài khoản / hồ sơ do Admin & Giáo viên thiết lập
 */
export function getTeacherDisplayName(
  profileOrEmail?: string | { id?: string; email?: string; fullName?: string; fptName?: string } | null,
  auditLogs?: any[]
): { fullName: string; fptName: string; email: string } {
  if (!profileOrEmail) {
    return { fullName: 'Chưa phân công', fptName: '', email: '' };
  }

  let email = '';
  let id = '';
  let directFullName = '';
  let directFptName = '';

  if (typeof profileOrEmail === 'string') {
    email = profileOrEmail.trim().toLowerCase();
  } else {
    email = (profileOrEmail.email || '').trim().toLowerCase();
    id = profileOrEmail.id || '';
    directFullName = profileOrEmail.fullName || '';
    directFptName = profileOrEmail.fptName || '';
  }

  // 1. Kiểm tra nếu có sẵn fullName từ profile trực tiếp
  if (directFullName && directFullName.trim()) {
    return {
      fullName: directFullName.trim(),
      fptName: directFptName ? directFptName.trim() : (email ? email.split('@')[0].toUpperCase() : ''),
      email
    };
  }

  // 2. Tra cứu trong auditLogs (Lấy bản ghi mới nhất do Admin / Giáo viên thiết lập trong Database)
  if (auditLogs && auditLogs.length > 0 && (id || email)) {
    const log = auditLogs.find(
      (l: any) =>
        ((id && l.target_id === id) || (email && (l.new_values?.email?.toLowerCase() === email || l.old_values?.email?.toLowerCase() === email))) &&
        l.new_values?.fullName &&
        typeof l.new_values.fullName === 'string' &&
        l.new_values.fullName.trim() !== ''
    );
    if (log && log.new_values?.fullName) {
      return {
        fullName: log.new_values.fullName.trim(),
        fptName: (log.new_values.fptName && log.new_values.fptName.trim()) || (email ? email.split('@')[0].toUpperCase() : ''),
        email
      };
    }
  }

  // 3. Fallback tự sinh tên từ email prefix nếu tài khoản chưa từng được cập nhật họ tên
  const username = email ? email.split('@')[0] : 'GV';
  const cleanName = username
    .replace(/[0-9_]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    fullName: cleanName || username,
    fptName: username.toUpperCase(),
    email
  };
}

/**
 * Sắp xếp danh sách lớp học theo thứ tự tự nhiên của trường THPT
 * (Ban T: 12T1 -> 12T6, Ban X: 12X1 -> 12X4, Ban K: 12K, ...)
 */
export function sortClassesNaturally<T extends { name?: string; group_type?: string }>(classesList: T[]): T[] {
  const groupOrder: Record<string, number> = {
    T: 1,
    X: 2,
    K: 3
  };

  return [...classesList].sort((a, b) => {
    const nameA = (a.name || '').trim().toUpperCase();
    const nameB = (b.name || '').trim().toUpperCase();

    const groupA = (a.group_type || nameA.charAt(2) || 'Z').toUpperCase();
    const groupB = (b.group_type || nameB.charAt(2) || 'Z').toUpperCase();

    const orderA = groupOrder[groupA] ?? 99;
    const orderB = groupOrder[groupB] ?? 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Cùng ban -> sắp xếp theo số thứ tự trong tên lớp (12T1 < 12T2 < ... < 12T10)
    const numA = parseInt(nameA.replace(/\D/g, '').slice(2) || '0', 10);
    const numB = parseInt(nameB.replace(/\D/g, '').slice(2) || '0', 10);

    if (numA !== numB) {
      return numA - numB;
    }

    return nameA.localeCompare(nameB);
  });
}

/**
 * Lấy màu sắc và icon cho môn học
 */
export function getSubjectColorTheme(subjectName: string): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  borderAccent: string;
} {
  const name = (subjectName || '').toLowerCase();

  if (name.includes('toán')) {
    return {
      badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      badgeText: 'text-blue-600 dark:text-blue-400',
      badgeBorder: 'border-blue-500/30',
      dotColor: 'bg-blue-500',
      borderAccent: 'border-l-blue-500'
    };
  }
  if (name.includes('vật lý') || name.includes('lý')) {
    return {
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      badgeText: 'text-amber-600 dark:text-amber-400',
      badgeBorder: 'border-amber-500/30',
      dotColor: 'bg-amber-500',
      borderAccent: 'border-l-amber-500'
    };
  }
  if (name.includes('hóa')) {
    return {
      badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
      badgeText: 'text-rose-600 dark:text-rose-400',
      badgeBorder: 'border-rose-500/30',
      dotColor: 'bg-rose-500',
      borderAccent: 'border-l-rose-500'
    };
  }
  if (name.includes('sinh')) {
    return {
      badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      badgeText: 'text-emerald-600 dark:text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      dotColor: 'bg-emerald-500',
      borderAccent: 'border-l-emerald-500'
    };
  }
  if (name.includes('tin')) {
    return {
      badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      badgeText: 'text-cyan-600 dark:text-cyan-400',
      badgeBorder: 'border-cyan-500/30',
      dotColor: 'bg-cyan-500',
      borderAccent: 'border-l-cyan-500'
    };
  }
  if (name.includes('anh')) {
    return {
      badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      badgeText: 'text-indigo-600 dark:text-indigo-400',
      badgeBorder: 'border-indigo-500/30',
      dotColor: 'bg-indigo-500',
      borderAccent: 'border-l-indigo-500'
    };
  }
  if (name.includes('văn')) {
    return {
      badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20',
      badgeText: 'text-orange-600 dark:text-orange-400',
      badgeBorder: 'border-orange-500/30',
      dotColor: 'bg-orange-500',
      borderAccent: 'border-l-orange-500'
    };
  }
  if (name.includes('sử')) {
    return {
      badgeBg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
      badgeText: 'text-yellow-600 dark:text-yellow-400',
      badgeBorder: 'border-yellow-500/30',
      dotColor: 'bg-yellow-500',
      borderAccent: 'border-l-yellow-500'
    };
  }
  if (name.includes('địa')) {
    return {
      badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      badgeText: 'text-teal-600 dark:text-teal-400',
      badgeBorder: 'border-teal-500/30',
      dotColor: 'bg-teal-500',
      borderAccent: 'border-l-teal-500'
    };
  }

  return {
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-600 dark:text-purple-400',
    badgeBorder: 'border-purple-500/30',
    dotColor: 'bg-purple-500',
    borderAccent: 'border-l-purple-500'
  };
}
