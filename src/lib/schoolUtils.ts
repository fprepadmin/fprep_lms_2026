// Tiện ích xử lý dữ liệu trường học, lớp học và giáo viên chuẩn FPT Schools

export interface TeacherInfo {
  id: string;
  email: string;
  fullName: string;
  fptName: string;
  role?: string;
}

// Bảng ánh xạ giáo viên mẫu / chuẩn FPT School
export const KNOWN_TEACHERS: Record<string, { fullName: string; fptName: string }> = {
  'chinh10@fpt.edu.vn': { fullName: 'Thầy Nguyễn Thế Chinh', fptName: 'CHINH10' },
  'muoint@fpt.edu.vn': { fullName: 'Cô Trần Thị Mười', fptName: 'MUOINT' },
  'duybt5@fpt.edu.vn': { fullName: 'Thầy Bùi Tiến Duy', fptName: 'DUYBT5' },
  'duynva3@fpt.edu.vn': { fullName: 'Thầy Nguyễn Văn Anh Duy', fptName: 'DUYNVA3' },
  'tamtt48@fpt.edu.vn': { fullName: 'Cô Trương Thị Tâm', fptName: 'TAMTT48' },
  'hieutt85@fpt.edu.vn': { fullName: 'Thầy Trần Trung Hiếu', fptName: 'HIEUTT85' },
  'phuongtm30@fpt.edu.vn': { fullName: 'Cô Trần Mai Phương', fptName: 'PHUONGTM30' },
  'haonv24@fpt.edu.vn': { fullName: 'Thầy Nguyễn Văn Hảo', fptName: 'HAONV24' },
  'nhanv5@fpt.edu.vn': { fullName: 'Thầy Nguyễn Văn Nhã', fptName: 'NHANV5' },
  'nhilu@fpt.edu.vn': { fullName: 'Cô Lư Uyển Nhi', fptName: 'NHILU' },
  'bythongtran@gmail.com': { fullName: 'Thầy Trần Ngọc Minh Thông', fptName: 'BYTHONGTRAN' },
  'giaoviendemo.bgk@gmail.com': { fullName: 'Giáo Viên Khảo Thí BGK', fptName: 'GV_DEMO' },
  'fprep.fschool@gmail.com': { fullName: 'Quản Trị Viên FPREP', fptName: 'ADMIN' }
};

/**
 * Lấy tên hiển thị và mã FPT của giáo viên
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

  // 1. Kiểm tra nếu có sẵn fullName từ profile
  if (directFullName && directFptName) {
    return { fullName: directFullName, fptName: directFptName, email };
  }

  // 2. Tra cứu trong auditLogs (nếu có)
  if (auditLogs && (id || email)) {
    const log = auditLogs.find(
      (l: any) =>
        (id && l.target_id === id && l.new_values?.fullName) ||
        (email && l.new_values?.email?.toLowerCase() === email && l.new_values?.fullName)
    );
    if (log && log.new_values?.fullName) {
      return {
        fullName: log.new_values.fullName,
        fptName: log.new_values.fptName || email.split('@')[0].toUpperCase(),
        email
      };
    }
  }

  // 3. Tra cứu trong bảng ánh xạ KNOWN_TEACHERS
  if (KNOWN_TEACHERS[email]) {
    return {
      fullName: KNOWN_TEACHERS[email].fullName,
      fptName: KNOWN_TEACHERS[email].fptName,
      email
    };
  }

  // 4. Fallback tự sinh tên đẹp từ email prefix
  const username = email ? email.split('@')[0] : 'GV';
  const cleanName = username
    .replace(/[0-9_]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    fullName: `Thầy/Cô ${cleanName || username}`,
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
