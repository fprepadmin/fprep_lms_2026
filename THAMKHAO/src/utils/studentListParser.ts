export interface StudentUploadItem {
  student_code: string;
  full_name: string;
  password?: string;
}

export const parseStudentListText = (text: string): StudentUploadItem[] => {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const results: StudentUploadItem[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Hỗ trợ phân cách bằng dấu phẩy (,), tab (\t), hoặc dấu gạch đứng (|)
    const parts = line.split(/[,;\t|]+/).map(p => p.trim());
    if (parts.length >= 2) {
      results.push({
        student_code: parts[0],
        full_name: parts[1],
        password: parts[2] || undefined
      });
    } else if (parts.length === 1 && parts[0]) {
      // Trường hợp chỉ nhập mã SBD
      results.push({
        student_code: parts[0],
        full_name: `Thí sinh ${parts[0]}`,
        password: undefined
      });
    }
  }

  return results;
};
