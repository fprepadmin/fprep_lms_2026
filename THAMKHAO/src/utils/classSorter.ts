export type StreamType = 'T' | 'X' | 'K' | 'OTHER';

export interface ParsedClassInfo {
  grade: number; // 10, 11, 12, or 99
  stream: StreamType;
  streamOrder: number; // T=1, X=2, K=3, OTHER=4
  classNumber: number; // 1, 2, 3...
  rawName: string;
}

/**
 * Phân tích thông tin Khối, Tổ hợp (T/X/K) và Số lớp từ tên lớp
 * Ví dụ: 
 * - "10T1" => Grade 10, Stream T (Tự nhiên), Number 1
 * - "11X2" => Grade 11, Stream X (Xã hội), Number 2
 * - "12K3" => Grade 12, Stream K (Khai phóng), Number 3
 */
export const parseClassInfo = (name: string): ParsedClassInfo => {
  const cleanName = (name || '').trim().toUpperCase();

  // Pattern match 1: e.g. 10T1, 11X2, 12K3, 10-T1, 11_X_2
  const standardMatch = cleanName.match(/(10|11|12)\s*[-_]?\s*([TXK])\s*[-_]?\s*(\d+)/i);

  if (standardMatch) {
    const grade = parseInt(standardMatch[1], 10);
    const stream = standardMatch[2].toUpperCase() as StreamType;
    const classNumber = parseInt(standardMatch[3], 10);
    const streamOrderMap: Record<StreamType, number> = { 'T': 1, 'X': 2, 'K': 3, 'OTHER': 4 };

    return {
      grade,
      stream,
      streamOrder: streamOrderMap[stream] || 4,
      classNumber,
      rawName: name
    };
  }

  // Fallback parsing for text names like "10 Tự nhiên 1", "Lớp 11 Xã hội 2"
  let grade = 99;
  let stream: StreamType = 'OTHER';
  let classNumber = 999;

  const gradeMatch = cleanName.match(/(10|11|12)/);
  if (gradeMatch) grade = parseInt(gradeMatch[1], 10);

  if (cleanName.includes('TỰ NHIÊN') || cleanName.includes('TU NHIEN') || cleanName.match(/\bT\d+/)) {
    stream = 'T';
  } else if (cleanName.includes('XÃ HỘI') || cleanName.includes('XA HOI') || cleanName.match(/\bX\d+/)) {
    stream = 'X';
  } else if (cleanName.includes('KHAI PHÓNG') || cleanName.includes('KHAI PHONG') || cleanName.match(/\bK\d+/)) {
    stream = 'K';
  }

  const numberMatch = cleanName.match(/\d+$/);
  if (numberMatch) classNumber = parseInt(numberMatch[0], 10);

  const streamOrderMap: Record<StreamType, number> = { 'T': 1, 'X': 2, 'K': 3, 'OTHER': 4 };

  return {
    grade,
    stream,
    streamOrder: streamOrderMap[stream] || 4,
    classNumber,
    rawName: name
  };
};

/**
 * Thuật toán Tự Động Sắp Xếp Lớp Học Đa Tầng:
 * 1. Khối lớp nhỏ -> lớn (10 -> 11 -> 12)
 * 2. Tổ hợp: T (Tự nhiên) -> X (Xã hội) -> K (Khai phóng)
 * 3. Số thứ tự lớp: nhỏ -> lớn (1 -> 2 -> 3...)
 */
export const sortClassesByGradeAndStream = (classList: any[]) => {
  return [...classList].sort((a, b) => {
    const infoA = parseClassInfo(a.name);
    const infoB = parseClassInfo(b.name);

    // 1. Sắp xếp theo Khối Lớp (10 -> 11 -> 12)
    if (infoA.grade !== infoB.grade) {
      return infoA.grade - infoB.grade;
    }

    // 2. Sắp xếp theo Tổ Hợp (T -> X -> K -> Khác)
    if (infoA.streamOrder !== infoB.streamOrder) {
      return infoA.streamOrder - infoB.streamOrder;
    }

    // 3. Sắp xếp theo Số Thứ Tự Lớp (1 -> 2 -> 3...)
    if (infoA.classNumber !== infoB.classNumber) {
      return infoA.classNumber - infoB.classNumber;
    }

    // 4. Fallback sắp xếp theo bảng chữ cái Tiếng Việt
    return (a.name || '').localeCompare(b.name || '', 'vi');
  });
};

/**
 * Lấy nhãn và định dạng hiển thị cho từng Tổ hợp
 */
export const getStreamLabel = (stream: StreamType) => {
  switch (stream) {
    case 'T':
      return { code: 'T', name: 'Tự nhiên', fullLabel: 'T - Tự nhiên' };
    case 'X':
      return { code: 'X', name: 'Xã hội', fullLabel: 'X - Xã hội' };
    case 'K':
      return { code: 'K', name: 'Khai phóng', fullLabel: 'K - Khai phóng' };
    default:
      return { code: 'K', name: 'Chung', fullLabel: 'K - Khai phóng' };
  }
};

/**
 * Lấy Badge CSS style mượt cho từng Tổ hợp
 */
export const getStreamBadgeStyle = (stream: StreamType) => {
  switch (stream) {
    case 'T':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'X':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'K':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};
