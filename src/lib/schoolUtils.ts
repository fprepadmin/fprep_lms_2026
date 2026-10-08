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

export interface SubjectTheme {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  borderAccent: string;
  cardBorder: string;
  cardBorderHover: string;
  cardBg: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  progressBar: string;
  textColor: string;
  accentColor: string;
  glowColor: string;
  shortCode: string;
}

/**
 * Lấy màu sắc, gradient, icon background và phong cách riêng biệt cho từng môn học
 */
export function getSubjectColorTheme(subjectName: string): SubjectTheme {
  const name = (subjectName || '').toLowerCase();

  // 1. TOÁN HỌC (Blue / Indigo)
  if (name.includes('toán')) {
    return {
      badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      badgeText: 'text-blue-600 dark:text-blue-400',
      badgeBorder: 'border-blue-500/30',
      dotColor: 'bg-blue-500',
      borderAccent: 'border-l-blue-600',
      cardBorder: 'border-blue-200 dark:border-blue-900/50',
      cardBorderHover: 'hover:border-blue-500/60 dark:hover:border-blue-400/60',
      cardBg: 'bg-gradient-to-br from-blue-50/70 via-card to-card dark:from-blue-950/25 dark:via-card dark:to-card',
      gradient: 'from-blue-500/15 via-blue-500/5 to-transparent dark:from-blue-500/20 dark:via-transparent',
      iconBg: 'bg-blue-100 dark:bg-blue-950/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBorder: 'border-blue-200 dark:border-blue-800/60',
      progressBar: 'bg-blue-600 dark:bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400',
      accentColor: '#2563eb',
      glowColor: 'rgba(37, 99, 235, 0.15)',
      shortCode: 'TOÁN'
    };
  }

  // 2. VẬT LÍ (Amber / Warm Gold)
  if (name.includes('vật lý') || name.includes('vật lí') || name.includes('lý') || name.includes('lí')) {
    return {
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      badgeText: 'text-amber-600 dark:text-amber-400',
      badgeBorder: 'border-amber-500/30',
      dotColor: 'bg-amber-500',
      borderAccent: 'border-l-amber-500',
      cardBorder: 'border-amber-200 dark:border-amber-900/50',
      cardBorderHover: 'hover:border-amber-500/60 dark:hover:border-amber-400/60',
      cardBg: 'bg-gradient-to-br from-amber-50/70 via-card to-card dark:from-amber-950/25 dark:via-card dark:to-card',
      gradient: 'from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-transparent',
      iconBg: 'bg-amber-100 dark:bg-amber-950/60',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBorder: 'border-amber-200 dark:border-amber-800/60',
      progressBar: 'bg-amber-500 dark:bg-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
      accentColor: '#d97706',
      glowColor: 'rgba(217, 119, 6, 0.15)',
      shortCode: 'LÝ'
    };
  }

  // 3. HÓA HỌC (Emerald / Mint)
  if (name.includes('hóa')) {
    return {
      badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      badgeText: 'text-emerald-600 dark:text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      dotColor: 'bg-emerald-500',
      borderAccent: 'border-l-emerald-500',
      cardBorder: 'border-emerald-200 dark:border-emerald-900/50',
      cardBorderHover: 'hover:border-emerald-500/60 dark:hover:border-emerald-400/60',
      cardBg: 'bg-gradient-to-br from-emerald-50/70 via-card to-card dark:from-emerald-950/25 dark:via-card dark:to-card',
      gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-transparent',
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBorder: 'border-emerald-200 dark:border-emerald-800/60',
      progressBar: 'bg-emerald-500 dark:bg-emerald-400',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      accentColor: '#059669',
      glowColor: 'rgba(5, 150, 105, 0.15)',
      shortCode: 'HÓA'
    };
  }

  // 4. SINH HỌC (Lime / Forest Green)
  if (name.includes('sinh')) {
    return {
      badgeBg: 'bg-lime-500/10 dark:bg-lime-500/20',
      badgeText: 'text-lime-700 dark:text-lime-400',
      badgeBorder: 'border-lime-500/30',
      dotColor: 'bg-lime-500',
      borderAccent: 'border-l-lime-500',
      cardBorder: 'border-lime-200 dark:border-lime-900/50',
      cardBorderHover: 'hover:border-lime-500/60 dark:hover:border-lime-400/60',
      cardBg: 'bg-gradient-to-br from-lime-50/70 via-card to-card dark:from-lime-950/25 dark:via-card dark:to-card',
      gradient: 'from-lime-500/15 via-lime-500/5 to-transparent dark:from-lime-500/20 dark:via-transparent',
      iconBg: 'bg-lime-100 dark:bg-lime-950/60',
      iconColor: 'text-lime-700 dark:text-lime-400',
      iconBorder: 'border-lime-200 dark:border-lime-800/60',
      progressBar: 'bg-lime-600 dark:bg-lime-500',
      textColor: 'text-lime-700 dark:text-lime-400',
      accentColor: '#65a30d',
      glowColor: 'rgba(101, 163, 13, 0.15)',
      shortCode: 'SINH'
    };
  }

  // 5. TIN HỌC (Cyan / Electric Sky)
  if (name.includes('tin') || name.includes('cntt')) {
    return {
      badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      badgeText: 'text-cyan-600 dark:text-cyan-400',
      badgeBorder: 'border-cyan-500/30',
      dotColor: 'bg-cyan-500',
      borderAccent: 'border-l-cyan-500',
      cardBorder: 'border-cyan-200 dark:border-cyan-900/50',
      cardBorderHover: 'hover:border-cyan-500/60 dark:hover:border-cyan-400/60',
      cardBg: 'bg-gradient-to-br from-cyan-50/70 via-card to-card dark:from-cyan-950/25 dark:via-card dark:to-card',
      gradient: 'from-cyan-500/15 via-cyan-500/5 to-transparent dark:from-cyan-500/20 dark:via-transparent',
      iconBg: 'bg-cyan-100 dark:bg-cyan-950/60',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBorder: 'border-cyan-200 dark:border-cyan-800/60',
      progressBar: 'bg-cyan-600 dark:bg-cyan-400',
      textColor: 'text-cyan-600 dark:text-cyan-400',
      accentColor: '#0891b2',
      glowColor: 'rgba(8, 145, 178, 0.15)',
      shortCode: 'TIN'
    };
  }

  // 6. TIẾNG ANH (Indigo / Violet)
  if (name.includes('anh') || name.includes('english') || name.includes('ngoại ngữ')) {
    return {
      badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      badgeText: 'text-indigo-600 dark:text-indigo-400',
      badgeBorder: 'border-indigo-500/30',
      dotColor: 'bg-indigo-500',
      borderAccent: 'border-l-indigo-500',
      cardBorder: 'border-indigo-200 dark:border-indigo-900/50',
      cardBorderHover: 'hover:border-indigo-500/60 dark:hover:border-indigo-400/60',
      cardBg: 'bg-gradient-to-br from-indigo-50/70 via-card to-card dark:from-indigo-950/25 dark:via-card dark:to-card',
      gradient: 'from-indigo-500/15 via-indigo-500/5 to-transparent dark:from-indigo-500/20 dark:via-transparent',
      iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBorder: 'border-indigo-200 dark:border-indigo-800/60',
      progressBar: 'bg-indigo-600 dark:bg-indigo-500',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      accentColor: '#4f46e5',
      glowColor: 'rgba(79, 70, 229, 0.15)',
      shortCode: 'ANH'
    };
  }

  // 7. NGỮ VĂN (Rose / Ruby Red)
  if (name.includes('văn') || name.includes('ngữ văn')) {
    return {
      badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
      badgeText: 'text-rose-600 dark:text-rose-400',
      badgeBorder: 'border-rose-500/30',
      dotColor: 'bg-rose-500',
      borderAccent: 'border-l-rose-500',
      cardBorder: 'border-rose-200 dark:border-rose-900/50',
      cardBorderHover: 'hover:border-rose-500/60 dark:hover:border-rose-400/60',
      cardBg: 'bg-gradient-to-br from-rose-50/70 via-card to-card dark:from-rose-950/25 dark:via-card dark:to-card',
      gradient: 'from-rose-500/15 via-rose-500/5 to-transparent dark:from-rose-500/20 dark:via-transparent',
      iconBg: 'bg-rose-100 dark:bg-rose-950/60',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBorder: 'border-rose-200 dark:border-rose-800/60',
      progressBar: 'bg-rose-600 dark:bg-rose-500',
      textColor: 'text-rose-600 dark:text-rose-400',
      accentColor: '#e11d48',
      glowColor: 'rgba(225, 29, 72, 0.15)',
      shortCode: 'VĂN'
    };
  }

  // 8. LỊCH SỬ (Orange / Warm Sunset)
  if (name.includes('sử') || name.includes('lịch sử')) {
    return {
      badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20',
      badgeText: 'text-orange-600 dark:text-orange-400',
      badgeBorder: 'border-orange-500/30',
      dotColor: 'bg-orange-500',
      borderAccent: 'border-l-orange-500',
      cardBorder: 'border-orange-200 dark:border-orange-900/50',
      cardBorderHover: 'hover:border-orange-500/60 dark:hover:border-orange-400/60',
      cardBg: 'bg-gradient-to-br from-orange-50/70 via-card to-card dark:from-orange-950/25 dark:via-card dark:to-card',
      gradient: 'from-orange-500/15 via-orange-500/5 to-transparent dark:from-orange-500/20 dark:via-transparent',
      iconBg: 'bg-orange-100 dark:bg-orange-950/60',
      iconColor: 'text-orange-600 dark:text-orange-400',
      iconBorder: 'border-orange-200 dark:border-orange-800/60',
      progressBar: 'bg-orange-500 dark:bg-orange-400',
      textColor: 'text-orange-600 dark:text-orange-400',
      accentColor: '#ea580c',
      glowColor: 'rgba(234, 88, 12, 0.15)',
      shortCode: 'SỬ'
    };
  }

  // 9. ĐỊA LÍ (Teal / Ocean)
  if (name.includes('địa') || name.includes('địa lí') || name.includes('địa lý')) {
    return {
      badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20',
      badgeText: 'text-teal-600 dark:text-teal-400',
      badgeBorder: 'border-teal-500/30',
      dotColor: 'bg-teal-500',
      borderAccent: 'border-l-teal-500',
      cardBorder: 'border-teal-200 dark:border-teal-900/50',
      cardBorderHover: 'hover:border-teal-500/60 dark:hover:border-teal-400/60',
      cardBg: 'bg-gradient-to-br from-teal-50/70 via-card to-card dark:from-teal-950/25 dark:via-card dark:to-card',
      gradient: 'from-teal-500/15 via-teal-500/5 to-transparent dark:from-teal-500/20 dark:via-transparent',
      iconBg: 'bg-teal-100 dark:bg-teal-950/60',
      iconColor: 'text-teal-600 dark:text-teal-400',
      iconBorder: 'border-teal-200 dark:border-teal-800/60',
      progressBar: 'bg-teal-600 dark:bg-teal-400',
      textColor: 'text-teal-600 dark:text-teal-400',
      accentColor: '#0d9488',
      glowColor: 'rgba(13, 148, 136, 0.15)',
      shortCode: 'ĐỊA'
    };
  }

  // 10. GIÁO DỤC KINH TẾ & PHÁP LUẬT / GDCD (Purple / Violet)
  if (name.includes('kinh tế') || name.includes('pháp luật') || name.includes('ktpl') || name.includes('gdcd')) {
    return {
      badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      badgeText: 'text-purple-600 dark:text-purple-400',
      badgeBorder: 'border-purple-500/30',
      dotColor: 'bg-purple-500',
      borderAccent: 'border-l-purple-500',
      cardBorder: 'border-purple-200 dark:border-purple-900/50',
      cardBorderHover: 'hover:border-purple-500/60 dark:hover:border-purple-400/60',
      cardBg: 'bg-gradient-to-br from-purple-50/70 via-card to-card dark:from-purple-950/25 dark:via-card dark:to-card',
      gradient: 'from-purple-500/15 via-purple-500/5 to-transparent dark:from-purple-500/20 dark:via-transparent',
      iconBg: 'bg-purple-100 dark:bg-purple-950/60',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBorder: 'border-purple-200 dark:border-purple-800/60',
      progressBar: 'bg-purple-600 dark:bg-purple-500',
      textColor: 'text-purple-600 dark:text-purple-400',
      accentColor: '#7c3aed',
      glowColor: 'rgba(124, 58, 237, 0.15)',
      shortCode: 'KTPL'
    };
  }

  // 11. CÔNG NGHỆ (Slate / Titanium)
  if (name.includes('công nghệ') || name.includes('cn')) {
    return {
      badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
      badgeText: 'text-slate-600 dark:text-slate-400',
      badgeBorder: 'border-slate-500/30',
      dotColor: 'bg-slate-500',
      borderAccent: 'border-l-slate-500',
      cardBorder: 'border-slate-200 dark:border-slate-800',
      cardBorderHover: 'hover:border-slate-500/60 dark:hover:border-slate-400/60',
      cardBg: 'bg-gradient-to-br from-slate-50/70 via-card to-card dark:from-slate-950/25 dark:via-card dark:to-card',
      gradient: 'from-slate-500/15 via-slate-500/5 to-transparent dark:from-slate-500/20 dark:via-transparent',
      iconBg: 'bg-slate-100 dark:bg-slate-900/60',
      iconColor: 'text-slate-600 dark:text-slate-400',
      iconBorder: 'border-slate-200 dark:border-slate-800',
      progressBar: 'bg-slate-600 dark:bg-slate-400',
      textColor: 'text-slate-600 dark:text-slate-400',
      accentColor: '#475569',
      glowColor: 'rgba(71, 85, 105, 0.15)',
      shortCode: 'CN'
    };
  }

  // Default / Môn học khác
  return {
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-600 dark:text-blue-400',
    badgeBorder: 'border-blue-500/30',
    dotColor: 'bg-blue-500',
    borderAccent: 'border-l-primary',
    cardBorder: 'border-border',
    cardBorderHover: 'hover:border-primary/60',
    cardBg: 'bg-card',
    gradient: 'from-primary/10 via-primary/5 to-transparent',
    iconBg: 'bg-primary/10 dark:bg-primary/20',
    iconColor: 'text-primary',
    iconBorder: 'border-primary/20',
    progressBar: 'bg-primary',
    textColor: 'text-primary',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.15)',
    shortCode: 'MÔN'
  };
}
