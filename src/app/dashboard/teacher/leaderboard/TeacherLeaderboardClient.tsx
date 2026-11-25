'use client';

import React, { useState, useMemo } from 'react';
import { 
  Trophy, Medal, Award, Crown, Search, Filter, 
  Download, Users, BookOpen, Clock, CheckCircle2, 
  TrendingUp, Sparkles, Eye, X, ChevronRight,
  GraduationCap, Flame, ArrowUpRight, BarChart3, AlertCircle,
  Calendar, Clock3, Star, Zap, Check, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ClassItem {
  id: string;
  name: string;
  group_type?: string;
  academic_year?: string;
}

export interface StudentItem {
  student_id: string;
  mshs: string;
  full_name: string;
  class_id: string | null;
  classes?: {
    id: string;
    name: string;
  };
}

export interface ProfileItem {
  id: string;
  email: string;
  role: string;
}

export interface ExamItem {
  id: string;
  title: string;
  subject_id?: string;
  exam_type?: string;
  exam_category?: string;
  created_at?: string;
}

export interface ExamResultItem {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  created_at: string;
  exams?: {
    id: string;
    title: string;
    subject_id?: string;
    exam_type?: string;
    exam_category?: string;
  };
}

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
}

export interface TeacherLeaderboardClientProps {
  teacherId: string;
  subjectName: string;
  mySubjectId?: string;
  allSubjects?: SubjectItem[];
  isHOD?: boolean;
  userRole?: string;
  isStudentView?: boolean;
  classes: ClassItem[];
  assignedClassIds: string[];
  students: StudentItem[];
  studentProfiles: ProfileItem[];
  exams: ExamItem[];
  examResults: ExamResultItem[];
}

// Cấu hình danh hiệu cho Top 7 tiếp theo (#4 đến #10) - Chuẩn Future Blue 2.0
const TOP_7_HONORS = [
  {
    rank: 4,
    title: 'Top 4 - Tinh Anh',
    badgeColor: 'from-purple-50/80 to-white dark:from-purple-500/25 dark:to-indigo-500/20 border-purple-200 dark:border-purple-400/40',
    avatarRing: 'border-purple-300 dark:border-purple-400/70 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/20',
    statAccent: 'text-purple-600 dark:text-purple-300',
    numberBadge: 'bg-purple-100 dark:bg-purple-600/40 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-400/50',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
  },
  {
    rank: 5,
    title: 'Top 5 - Bứt Phá',
    badgeColor: 'from-emerald-50/80 to-white dark:from-emerald-500/25 dark:to-teal-500/20 border-emerald-200 dark:border-emerald-400/40',
    avatarRing: 'border-emerald-300 dark:border-emerald-400/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20',
    statAccent: 'text-emerald-600 dark:text-emerald-300',
    numberBadge: 'bg-emerald-100 dark:bg-emerald-600/40 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-400/50',
    icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
  },
  {
    rank: 6,
    title: 'Top 6 - Vững Vàng',
    badgeColor: 'from-sky-50/80 to-white dark:from-cyan-500/25 dark:to-blue-500/20 border-sky-200 dark:border-cyan-400/40',
    avatarRing: 'border-sky-300 dark:border-cyan-400/70 text-[#1746D1] dark:text-cyan-300 bg-sky-50 dark:bg-cyan-500/20',
    statAccent: 'text-[#1746D1] dark:text-cyan-300',
    numberBadge: 'bg-sky-100 dark:bg-cyan-600/40 text-[#1746D1] dark:text-cyan-200 border-sky-200 dark:border-cyan-400/50',
    icon: <Flame className="w-3.5 h-3.5 text-[#087CFF] dark:text-cyan-300" />
  },
  {
    rank: 7,
    title: 'Top 7 - Nỗ Lực',
    badgeColor: 'from-amber-50/80 to-white dark:from-amber-500/25 dark:to-orange-500/20 border-amber-200 dark:border-amber-400/40',
    avatarRing: 'border-amber-300 dark:border-amber-400/70 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/20',
    statAccent: 'text-amber-600 dark:text-amber-300',
    numberBadge: 'bg-amber-100 dark:bg-amber-600/40 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-400/50',
    icon: <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
  },
  {
    rank: 8,
    title: 'Top 8 - Quyết Tâm',
    badgeColor: 'from-rose-50/80 to-white dark:from-pink-500/25 dark:to-rose-500/20 border-rose-200 dark:border-pink-400/40',
    avatarRing: 'border-rose-300 dark:border-pink-400/70 text-rose-700 dark:text-pink-300 bg-rose-50 dark:bg-pink-500/20',
    statAccent: 'text-rose-600 dark:text-pink-300',
    numberBadge: 'bg-rose-100 dark:bg-pink-600/40 text-rose-700 dark:text-pink-200 border-rose-200 dark:border-pink-400/50',
    icon: <Star className="w-3.5 h-3.5 text-rose-600 dark:text-pink-300" />
  },
  {
    rank: 9,
    title: 'Top 9 - Vươn Lên',
    badgeColor: 'from-blue-50/80 to-white dark:from-blue-500/25 dark:to-indigo-500/20 border-blue-200 dark:border-blue-400/40',
    avatarRing: 'border-blue-300 dark:border-blue-400/70 text-[#1746D1] dark:text-blue-300 bg-blue-50 dark:bg-blue-500/20',
    statAccent: 'text-[#1746D1] dark:text-blue-300',
    numberBadge: 'bg-blue-100 dark:bg-blue-600/40 text-[#1746D1] dark:text-blue-200 border-blue-200 dark:border-blue-400/50',
    icon: <ArrowUpRight className="w-3.5 h-3.5 text-[#1746D1] dark:text-blue-300" />
  },
  {
    rank: 10,
    title: 'Top 10 - Tiềm Năng',
    badgeColor: 'from-teal-50/80 to-white dark:from-teal-500/25 dark:to-emerald-500/20 border-teal-200 dark:border-teal-400/40',
    avatarRing: 'border-teal-300 dark:border-teal-400/70 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/20',
    statAccent: 'text-teal-600 dark:text-teal-300',
    numberBadge: 'bg-teal-100 dark:bg-teal-600/40 text-teal-700 dark:text-teal-200 border-teal-200 dark:border-teal-400/50',
    icon: <Medal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
  }
];

// Hàm xác định tuần trong tháng (Tuần 1: 1-7, Tuần 2: 8-14, Tuần 3: 15-21, Tuần 4: 22-cuối tháng)
function getWeekOfMonth(d: Date): number {
  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function getMonthKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function TeacherLeaderboardClient({
  teacherId,
  subjectName,
  mySubjectId,
  allSubjects = [],
  isHOD = false,
  userRole,
  isStudentView = false,
  classes,
  assignedClassIds,
  students,
  studentProfiles,
  exams,
  examResults,
}: TeacherLeaderboardClientProps) {
  // 1. Bộ lọc Môn học (mặc định là môn phụ trách, hoặc 'all')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(mySubjectId || 'all');

  // 2. Tính danh sách các tháng có dữ liệu
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    set.add(getMonthKey(now));
    examResults.forEach(r => {
      if (r.created_at) {
        try {
          const d = new Date(r.created_at);
          if (!isNaN(d.getTime())) {
            set.add(getMonthKey(d));
          }
        } catch (e) {}
      }
    });
    return Array.from(set).sort().reverse();
  }, [examResults]);

  // Tháng đang chọn
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || getMonthKey(new Date());
  });

  // Chu kỳ thời gian: 'month_all' (Tổng hợp 4 tuần), 'week_1', 'week_2', 'week_3', 'week_4', 'current_week', 'all'
  const [timePeriod, setTimePeriod] = useState<'month_all' | 'week_1' | 'week_2' | 'week_3' | 'week_4' | 'current_week' | 'all'>('month_all');

  // Bộ lọc Lớp & Đề thi & Tìm kiếm
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [sortCriteria, setSortCriteria] = useState<'avg_score' | 'max_score' | 'exam_count' | 'total_score'>('avg_score');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modal xem chi tiết lịch sử thi của 1 học sinh
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  // Map đề thi để tra cứu subject_id nhanh
  const examMap = useMemo(() => {
    const map = new Map<string, ExamItem>();
    exams.forEach(ex => map.set(ex.id, ex));
    return map;
  }, [exams]);

  // Map profile info
  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileItem>();
    studentProfiles.forEach(p => map.set(p.id, p));
    return map;
  }, [studentProfiles]);

  // Map class info
  const classMap = useMemo(() => {
    const map = new Map<string, ClassItem>();
    classes.forEach(c => map.set(c.id, c));
    return map;
  }, [classes]);

  // Tên môn học hiển thị hiện tại
  const currentSubjectDisplayName = useMemo(() => {
    if (selectedSubjectId === 'all') return 'Tất cả các môn';
    const found = allSubjects.find(s => s.id === selectedSubjectId);
    return found?.name || subjectName || 'Chung';
  }, [selectedSubjectId, allSubjects, subjectName]);

  // Danh sách đề thi thuộc môn đang chọn (dùng cho dropdown lọc đề)
  const availableExamsForSubject = useMemo(() => {
    if (selectedSubjectId === 'all') return exams;
    return exams.filter(ex => ex.subject_id === selectedSubjectId);
  }, [exams, selectedSubjectId]);

  // Lọc học sinh theo lớp
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedClassId !== 'all') {
        return s.class_id === selectedClassId;
      }
      return true;
    });
  }, [students, selectedClassId]);

  // Hàm kiểm tra một kết quả thi có thuộc chu kỳ thời gian đang chọn không
  const checkTimePeriod = (createdAtStr: string): boolean => {
    if (timePeriod === 'all') return true;
    if (!createdAtStr) return false;

    const d = new Date(createdAtStr);
    if (isNaN(d.getTime())) return false;

    const mKey = getMonthKey(d);
    const day = d.getDate();
    const weekNum = getWeekOfMonth(d);

    if (timePeriod === 'current_week') {
      const now = new Date();
      return mKey === getMonthKey(now) && weekNum === getWeekOfMonth(now);
    }

    // Với các chu kỳ còn lại, so khớp với selectedMonth
    if (selectedMonth !== 'all' && mKey !== selectedMonth) {
      return false;
    }

    if (timePeriod === 'month_all') {
      // Tổng kết cả 4 tuần trong tháng
      return true;
    }
    if (timePeriod === 'week_1') {
      return day >= 1 && day <= 7;
    }
    if (timePeriod === 'week_2') {
      return day >= 8 && day <= 14;
    }
    if (timePeriod === 'week_3') {
      return day >= 15 && day <= 21;
    }
    if (timePeriod === 'week_4') {
      return day >= 22;
    }

    return true;
  };

  // Tổng hợp dữ liệu kết quả thi theo từng học sinh dựa trên Môn học & Chu kỳ thời gian
  const studentRankings = useMemo(() => {
    // 1. Lọc examResults theo môn học, đề thi và chu kỳ thời gian
    const filteredResults = examResults.filter(r => {
      // Lọc theo môn học
      if (selectedSubjectId !== 'all') {
        const subjId = r.exams?.subject_id || examMap.get(r.exam_id)?.subject_id;
        if (subjId !== selectedSubjectId) return false;
      }

      // Lọc theo đề thi cụ thể nếu chọn
      if (selectedExamId !== 'all') {
        if (r.exam_id !== selectedExamId) return false;
      }

      // Lọc theo chu kỳ thời gian (Tuần / Tháng)
      if (!checkTimePeriod(r.created_at)) {
        return false;
      }

      return true;
    });

    // 2. Nhóm kết quả theo student_id
    const resultsByStudent = new Map<string, ExamResultItem[]>();
    filteredResults.forEach(r => {
      if (!resultsByStudent.has(r.student_id)) {
        resultsByStudent.set(r.student_id, []);
      }
      resultsByStudent.get(r.student_id)!.push(r);
    });

    // 3. Tính toán các chỉ số của từng học sinh
    const list = filteredStudents.map(student => {
      const results = resultsByStudent.get(student.student_id) || [];
      const examCount = results.length;

      let maxScore = 0;
      let totalScore = 0;
      let totalCorrect = 0;
      let totalQuestions = 0;
      let totalTime = 0;

      results.forEach(r => {
        const sc = Number(r.score) || 0;
        if (sc > maxScore) maxScore = sc;
        totalScore += sc;
        totalCorrect += Number(r.correct_answers) || 0;
        totalQuestions += Number(r.total_questions) || 0;
        totalTime += Number(r.time_spent_seconds) || 0;
      });

      const avgScore = examCount > 0 ? Number((totalScore / examCount).toFixed(2)) : 0;
      const accuracyRate = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const avgTime = examCount > 0 ? Math.round(totalTime / examCount) : 0;

      const profile = profileMap.get(student.student_id);
      const cls = student.class_id ? classMap.get(student.class_id) : undefined;
      const className = cls?.name || student.classes?.name || 'Chưa xếp lớp';

      // Xếp loại học lực khảo thí (Chuẩn Future Blue 2.0 Light + Dark)
      let rankTier = 'Chưa thi';
      let tierColor = 'text-[#64748B] dark:text-slate-400 border-[#E2E8F0] dark:border-slate-500/30 bg-[#F1F5F9] dark:bg-slate-500/10';
      if (examCount > 0) {
        if (avgScore >= 9.0) {
          rankTier = 'Xuất sắc';
          tierColor = 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15';
        } else if (avgScore >= 8.0) {
          rankTier = 'Giỏi';
          tierColor = 'text-[#1746D1] dark:text-cyan-300 border-blue-200 dark:border-cyan-500/30 bg-blue-50 dark:bg-cyan-500/15';
        } else if (avgScore >= 6.5) {
          rankTier = 'Khá';
          tierColor = 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15';
        } else if (avgScore >= 5.0) {
          rankTier = 'Trung bình';
          tierColor = 'text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/15';
        } else {
          rankTier = 'Cần cố gắng';
          tierColor = 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/15';
        }
      }

      return {
        studentId: student.student_id,
        fullName: student.full_name,
        mshs: student.mshs,
        email: profile?.email || '',
        className,
        classId: student.class_id,
        examCount,
        maxScore,
        avgScore,
        totalScore: Number(totalScore.toFixed(2)),
        accuracyRate,
        avgTime,
        rankTier,
        tierColor,
        results
      };
    });

    // 4. Lọc theo từ khóa tìm kiếm
    let filtered = list;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.fullName.toLowerCase().includes(kw) ||
        s.mshs.toLowerCase().includes(kw) ||
        s.className.toLowerCase().includes(kw)
      );
    }

    // 5. Sắp xếp theo tiêu chí
    filtered.sort((a, b) => {
      if (a.examCount > 0 && b.examCount === 0) return -1;
      if (a.examCount === 0 && b.examCount > 0) return 1;

      if (sortCriteria === 'avg_score') {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        return b.maxScore - a.maxScore;
      }
      if (sortCriteria === 'max_score') {
        if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
        return b.avgScore - a.avgScore;
      }
      if (sortCriteria === 'exam_count') {
        if (b.examCount !== a.examCount) return b.examCount - a.examCount;
        return b.avgScore - a.avgScore;
      }
      if (sortCriteria === 'total_score') {
        return b.totalScore - a.totalScore;
      }
      return 0;
    });

    return filtered;
  }, [
    filteredStudents, 
    examResults, 
    selectedSubjectId, 
    selectedExamId, 
    timePeriod, 
    selectedMonth, 
    examMap, 
    profileMap, 
    classMap, 
    searchKeyword, 
    sortCriteria
  ]);

  // Thống kê nhanh toàn bảng
  const statsOverview = useMemo(() => {
    const totalStudents = studentRankings.length;
    const activeStudents = studentRankings.filter(s => s.examCount > 0);
    const activeCount = activeStudents.length;

    let totalAvgScore = 0;
    let excellentCount = 0;
    let perfectScoreCount = 0;

    activeStudents.forEach(s => {
      totalAvgScore += s.avgScore;
      if (s.avgScore >= 8.0) excellentCount++;
      if (s.maxScore >= 10.0) perfectScoreCount++;
    });

    const averageCohort = activeCount > 0 ? Number((totalAvgScore / activeCount).toFixed(2)) : 0;
    const excellentPercent = activeCount > 0 ? Math.round((excellentCount / activeCount) * 100) : 0;

    return {
      totalStudents,
      activeCount,
      averageCohort,
      excellentPercent,
      perfectScoreCount
    };
  }, [studentRankings]);

  // Top 3 học sinh dẫn đầu (đã nộp ít nhất 1 bài)
  const top3 = useMemo(() => {
    return studentRankings.filter(s => s.examCount > 0).slice(0, 3);
  }, [studentRankings]);

  // Top 7 học sinh tiếp theo (#4 đến #10)
  const top7 = useMemo(() => {
    return studentRankings.filter(s => s.examCount > 0).slice(3, 10);
  }, [studentRankings]);

  // Xuất file Excel
  const handleExportExcel = () => {
    if (studentRankings.length === 0) {
      alert('Không có dữ liệu để xuất file!');
      return;
    }

    const exportData = studentRankings.map((s, index) => ({
      'Thứ hạng': index + 1,
      'Mã số HS': s.mshs,
      'Họ và tên': s.fullName,
      'Lớp': s.className,
      'Môn học': currentSubjectDisplayName,
      'Chu kỳ': timePeriod === 'month_all' ? `Tổng kết Tháng ${selectedMonth}` : timePeriod,
      'Số đề đã nộp': s.examCount,
      'Điểm trung bình': s.avgScore,
      'Điểm cao nhất': s.maxScore,
      'Tổng điểm tích lũy': s.totalScore,
      'Tỉ lệ đúng (%)': `${s.accuracyRate}%`,
      'Xếp loại': s.rankTier
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangVang');
    XLSX.writeFile(wb, `FPREP_BangVang_${currentSubjectDisplayName}_${timePeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Xem chi tiết học sinh đang chọn
  const viewingStudent = useMemo(() => {
    if (!viewingStudentId) return null;
    return studentRankings.find(s => s.studentId === viewingStudentId) || null;
  }, [viewingStudentId, studentRankings]);

  // Chuỗi mô tả chu kỳ thời gian hiện tại
  const periodDescription = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const monthText = `Tháng ${m}/${y}`;
    switch (timePeriod) {
      case 'month_all':
        return `Tổng kết 4 tuần của ${monthText} (Cả tháng)`;
      case 'week_1':
        return `Tuần 1 (Ngày 01 - 07) • ${monthText}`;
      case 'week_2':
        return `Tuần 2 (Ngày 08 - 14) • ${monthText}`;
      case 'week_3':
        return `Tuần 3 (Ngày 15 - 21) • ${monthText}`;
      case 'week_4':
        return `Tuần 4 (Ngày 22 - Cuối tháng) • ${monthText}`;
      case 'current_week': {
        const now = new Date();
        return `Tuần ${getWeekOfMonth(now)} Hiện Tại (Tháng ${now.getMonth() + 1}/${now.getFullYear()}) • Cập nhật liên tục`;
      }
      case 'all':
        return 'Toàn bộ thời gian (Tất cả đợt thi)';
      default:
        return monthText;
    }
  }, [timePeriod, selectedMonth]);

  return (
    <div className="space-y-6 w-full animate-fade-in text-[#14213D] dark:text-white">
      
      {/* 1. HEADER BẢNG VÀNG - FUTURE BLUE 2.0 ĐỒNG BỘ QUẢN TRỊ VIÊN */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] border border-[#00DFFF]/30 shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden text-white">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#00DFFF]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[#087CFF]/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-white/10 text-[#00DFFF] border border-white/15 backdrop-blur-md">
              <Crown className="w-3.5 h-3.5 text-amber-300" /> Bảng Vàng Vinh Danh Học Sinh
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/35">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Cập nhật liên tục
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-white m-0 flex flex-wrap items-center gap-2.5">
            Bảng Vàng Vinh Danh:
            <span className="text-amber-300 font-black">
              {currentSubjectDisplayName}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl font-medium m-0 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#00DFFF] shrink-0" />
            <span className="text-white font-bold">{periodDescription}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#0B1B55] font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95 border border-white/60"
          >
            <Download className="w-4 h-4 text-[#1746D1]" /> Xuất Bảng Vàng (Excel)
          </button>
        </div>
      </div>

      {/* 2. THANH CHỌN MÔN HỌC (MỖI MÔN 1 BẢNG) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[#1746D1] dark:text-[#00DFFF] uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Chọn Môn Học Khảo Thí:</span>
          </div>
          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold hidden sm:inline">
            Mỗi môn có 1 bảng vinh danh Top 3 + Top 7 riêng biệt
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Nút Tất cả các môn */}
          <button
            onClick={() => {
              setSelectedSubjectId('all');
              setSelectedExamId('all');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              selectedSubjectId === 'all'
                ? 'bg-[#0B1B55] dark:bg-[#1746D1] text-white border-[#0B1B55] dark:border-[#087CFF] shadow-sm font-extrabold'
                : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/40 hover:bg-blue-50 hover:text-[#1746D1]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Tất cả các môn
          </button>

          {/* Các môn học */}
          {allSubjects.map(sub => {
            const isSelected = selectedSubjectId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => {
                  setSelectedSubjectId(sub.id);
                  setSelectedExamId('all');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0B1B55] to-[#1746D1] text-white border-[#1746D1] shadow-sm font-extrabold'
                    : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/40 hover:bg-blue-50 hover:text-[#1746D1]'
                }`}
              >
                <span>{sub.name}</span>
                {isSelected && <Check className="w-3 h-3 text-[#00DFFF]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BỘ ĐIỀU KHIỂN CHU KỲ THỜI GIAN: THEO TUẦN (1, 2, 3, 4, HIỆN TẠI) & THEO THÁNG (4 TUẦN) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Chọn Tháng */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#14213D] dark:text-slate-200 shrink-0">
            <Calendar className="w-4 h-4 text-[#1746D1] dark:text-[#00DFFF]" />
            <span>Tháng:</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9.5 px-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0D2063] border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-white text-xs font-bold focus:border-[#1746D1] transition-colors cursor-pointer"
          >
            {availableMonths.map(m => {
              const [y, mo] = m.split('-');
              return (
                <option key={m} value={m}>
                  Tháng {mo}/{y} {m === getMonthKey(new Date()) ? '(Hiện tại)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Chu kỳ Tuần / Tháng */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto">
          {/* Tổng kết 4 tuần (Cuối tháng) */}
          <button
            onClick={() => setTimePeriod('month_all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              timePeriod === 'month_all'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-sm font-extrabold'
                : 'bg-amber-50 dark:bg-[#0D2063] text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Tổng kết 4 Tuần (Cả tháng)
          </button>

          {/* Tuần hiện tại */}
          <button
            onClick={() => setTimePeriod('current_week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              timePeriod === 'current_week'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-extrabold'
                : 'bg-emerald-50 dark:bg-[#0D2063] text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Tuần Hiện Tại (Live)
          </button>

          {/* Tuần 1 */}
          <button
            onClick={() => setTimePeriod('week_1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_1'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 1 (01-07)
          </button>

          {/* Tuần 2 */}
          <button
            onClick={() => setTimePeriod('week_2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_2'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 2 (08-14)
          </button>

          {/* Tuần 3 */}
          <button
            onClick={() => setTimePeriod('week_3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_3'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 3 (15-21)
          </button>

          {/* Tuần 4 */}
          <button
            onClick={() => setTimePeriod('week_4')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_4'
                ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-sm'
                : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Tuần 4 (22-Hết)
          </button>

          {/* Toàn thời gian */}
          <button
            onClick={() => setTimePeriod('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'all'
                ? 'bg-[#0B1B55] text-white border-[#0B1B55] shadow-sm'
                : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
            }`}
          >
            Toàn thời gian
          </button>
        </div>

      </div>

      {/* 4. KHỐI 4 CARD THỐNG KÊ SỐ LIỆU NỔI BẬT */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm relative overflow-hidden group hover:border-[#087CFF] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Học sinh tham gia</span>
            <div className="p-2.5 rounded-xl bg-[#1746D1]/10 text-[#1746D1] dark:bg-blue-500/20 dark:text-blue-300 border border-[#1746D1]/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white">
            {statsOverview.activeCount} <span className="text-xs text-[#64748B] font-semibold">/ {statsOverview.totalStudents} HS</span>
          </div>
          <p className="text-[11px] text-[#087CFF] dark:text-cyan-300 mt-1 font-semibold">
            {statsOverview.totalStudents > 0 ? Math.round((statsOverview.activeCount / statsOverview.totalStudents) * 100) : 0}% tỷ lệ nộp bài
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm relative overflow-hidden group hover:border-[#087CFF] transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Điểm Trung Bình</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-heading text-[#1746D1] dark:text-cyan-400">
            {statsOverview.averageCohort} <span className="text-xs text-[#64748B] font-semibold">/ 10.0</span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-300 mt-1 font-medium">{currentSubjectDisplayName}</p>
        </div>

        {/* Card 3 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Tỷ Lệ Giỏi (≥ 8.0)</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-heading text-[#E9A23B]">
            {statsOverview.excellentPercent}%
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-1 font-semibold">Đạt ngưỡng năng lực cao</p>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm relative overflow-hidden group hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Điểm 10 Tuyệt Đối</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-500/20">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black font-heading text-purple-600 dark:text-purple-300">
            {statsOverview.perfectScoreCount} <span className="text-xs text-[#64748B] font-semibold">lượt đạt 10</span>
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-300 mt-1 font-semibold">Kỷ lục điểm số cao nhất</p>
        </div>
      </div>

      {/* 5. BỤC VINH DANH TOP 3 DẪN ĐẦU (FUTURE BLUE 2.0) */}
      {top3.length > 0 ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-[#14213D] dark:text-white flex items-center gap-2 m-0">
              <Crown className="w-5 h-5 text-amber-500" /> Bục Vinh Danh Top 3 Học Sinh Dẫn Đầu
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold ml-1">
                {currentSubjectDisplayName}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1746D1] dark:text-cyan-300 bg-blue-50 dark:bg-cyan-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-cyan-500/20">
                {periodDescription}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Top 2: Á Quân (Bên trái) */}
            {top3[1] && (
              <div className="order-2 md:order-1 p-5.5 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-[#1E293B] dark:via-[#0B1B55] dark:to-[#061028] border border-slate-300 dark:border-slate-300/40 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-between group hover:border-slate-400 transition-all">
                <div className="absolute top-3 right-3 text-2xl font-black font-tech text-slate-300 dark:text-slate-400/50">#2</div>
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-400/20 border-2 border-slate-400 flex items-center justify-center font-black font-heading text-xl text-slate-700 dark:text-slate-100 mb-3">
                  {top3[1].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-400/20 text-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-300/30 mb-1">
                    <Medal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-200" /> Á Quân
                  </div>
                  <h3 className="text-base font-extrabold font-heading text-[#14213D] dark:text-white truncate max-w-[200px] m-0">{top3[1].fullName}</h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-300 font-medium">Lớp: {top3[1].className} &bull; MSHS: {top3[1].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Điểm TB</span>
                    <span className="font-black font-heading text-base text-[#1746D1] dark:text-[#00DFFF]">{top3[1].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Điểm cao nhất</span>
                    <span className="font-black font-heading text-base text-amber-600 dark:text-[#E9A23B]">{top3[1].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Đã nộp</span>
                    <span className="font-black font-heading text-base text-purple-600 dark:text-purple-300">{top3[1].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 1: Quán Quân (Ở giữa - Cao nhất và nổi bật nhất) */}
            {top3[0] && (
              <div className="order-1 md:order-2 p-6.5 rounded-2xl bg-gradient-to-b from-amber-50 via-white to-blue-50/40 dark:from-[#2E2005] dark:via-[#0B1B55] dark:to-[#061028] border-2 border-amber-400 shadow-md shadow-amber-500/15 text-center relative overflow-hidden flex flex-col items-center justify-between md:-translate-y-1.5 group hover:border-amber-500 transition-all">
                <div className="absolute top-2 right-3 text-3xl font-black font-tech text-amber-300 dark:text-amber-400/60">#1</div>
                <div className="relative mb-3 mt-2">
                  <Crown className="w-8 h-8 text-amber-500 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-400/20 border-2 border-amber-500 flex items-center justify-center font-black font-heading text-2xl text-amber-700 dark:text-amber-300">
                    {top3[0].fullName[0].toUpperCase()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-400/25 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/50 mb-1">
                    <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" /> Quán Quân Bảng Vàng
                  </div>
                  <h3 className="text-lg font-black font-heading text-[#14213D] dark:text-white truncate max-w-[220px] m-0">{top3[0].fullName}</h3>
                  <p className="text-xs text-[#64748B] dark:text-amber-200/90 font-semibold">Lớp: {top3[0].className} &bull; MSHS: {top3[0].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-500/30 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Điểm TB</span>
                    <span className="font-black font-heading text-lg text-[#1746D1] dark:text-[#00DFFF]">{top3[0].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Điểm cao nhất</span>
                    <span className="font-black font-heading text-lg text-emerald-600 dark:text-emerald-400">{top3[0].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Đã nộp</span>
                    <span className="font-black font-heading text-lg text-[#087CFF]">{top3[0].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3: Quý Quân (Bên phải) */}
            {top3[2] && (
              <div className="order-3 p-5.5 rounded-2xl bg-gradient-to-b from-orange-50/80 to-white dark:from-[#2E1205] dark:via-[#0B1B55] dark:to-[#061028] border border-orange-300 dark:border-amber-600/50 shadow-sm text-center relative overflow-hidden flex flex-col items-center justify-between group hover:border-orange-400 transition-all">
                <div className="absolute top-3 right-3 text-2xl font-black font-tech text-orange-200 dark:text-amber-700/50">#3</div>
                <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-amber-700/20 border-2 border-orange-500 flex items-center justify-center font-black font-heading text-xl text-orange-700 dark:text-amber-300 mb-3">
                  {top3[2].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 dark:bg-amber-700/20 text-orange-700 dark:text-amber-300 border border-orange-300 dark:border-amber-600/40 mb-1">
                    <Award className="w-3.5 h-3.5 text-orange-600 dark:text-amber-400" /> Quý Quân
                  </div>
                  <h3 className="text-base font-extrabold font-heading text-[#14213D] dark:text-white truncate max-w-[200px] m-0">{top3[2].fullName}</h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-300 font-medium">Lớp: {top3[2].className} &bull; MSHS: {top3[2].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Điểm TB</span>
                    <span className="font-black font-heading text-base text-[#1746D1] dark:text-[#00DFFF]">{top3[2].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Điểm cao nhất</span>
                    <span className="font-black font-heading text-base text-amber-600 dark:text-[#E9A23B]">{top3[2].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase tracking-wider font-semibold">Đã nộp</span>
                    <span className="font-black font-heading text-base text-purple-600 dark:text-purple-300">{top3[2].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-dashed border-[#CBD5E1] dark:border-[#1B317A] text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-[#14213D] dark:text-white m-0">Chưa có kết quả nộp bài trong chu kỳ này</h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto">
            Học sinh chưa nộp bài thi nào trong {periodDescription.toLowerCase()}. Hãy chọn chu kỳ khác hoặc chuyển sang &quot;Tổng kết 4 Tuần&quot; / &quot;Toàn thời gian&quot;.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setTimePeriod('month_all')}
              className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-400/40 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer"
            >
              Xem Tổng kết 4 Tuần
            </button>
            <button
              onClick={() => setTimePeriod('all')}
              className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-cyan-500/20 border border-blue-200 dark:border-cyan-400/40 text-[#1746D1] dark:text-cyan-300 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
            >
              Xem Toàn thời gian
            </button>
          </div>
        </div>
      )}

      {/* 6. KHỐI VINH DANH TOP 7 TIẾP THEO (HẠNG #4 ĐẾN #10) */}
      {top7.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                <Medal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#14213D] dark:text-white m-0 flex items-center gap-2">
                  Top 7 Gương Mặt Tiêu Biểu Bứt Phá (Hạng #4 - #10)
                </h3>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 m-0">
                  Những học sinh có thành tích xuất sắc và phong độ bứt phá tiếp theo trong kỳ khảo thí môn {currentSubjectDisplayName}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-500/25 shrink-0">
              Vinh danh {top7.length}/7 vị trí
            </span>
          </div>

          {/* Grid 7 Thẻ Vinh Danh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
            {top7.map((student, idx) => {
              const rankNum = idx + 4;
              const honorConfig = TOP_7_HONORS[idx] || TOP_7_HONORS[TOP_7_HONORS.length - 1];

              return (
                <div
                  key={student.studentId}
                  className={`p-4 rounded-2xl bg-gradient-to-b ${honorConfig.badgeColor} border transition-all hover:shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden group`}
                >
                  {/* Số thứ hạng góc trên bên phải */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${honorConfig.numberBadge}`}>
                      {honorConfig.icon} #{rankNum}
                    </span>
                    <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-300 truncate max-w-[120px]">
                      {honorConfig.title}
                    </span>
                  </div>

                  {/* Thông tin học sinh */}
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-black text-base shrink-0 ${honorConfig.avatarRing}`}>
                      {student.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-[#14213D] dark:text-white truncate m-0 group-hover:text-[#1746D1] dark:group-hover:text-cyan-300 transition-colors">
                        {student.fullName}
                      </h4>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-300 m-0 truncate">
                        Lớp: <span className="font-bold text-[#14213D] dark:text-white">{student.className}</span> • {student.mshs}
                      </p>
                    </div>
                  </div>

                  {/* 3 Chỉ số quan trọng */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-white/90 dark:bg-[#0B1B55]/80 border border-[#E2E8F0] dark:border-[#1B317A] text-center text-xs">
                    <div>
                      <span className="block text-[9px] text-[#64748B] dark:text-slate-400">Điểm TB</span>
                      <span className={`font-black text-xs ${honorConfig.statAccent}`}>{student.avgScore}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748B] dark:text-slate-400">Cao nhất</span>
                      <span className="font-black text-xs text-amber-600 dark:text-amber-300">{student.maxScore}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-[#64748B] dark:text-slate-400">Đã nộp</span>
                      <span className="font-black text-xs text-[#1746D1] dark:text-cyan-300">{student.examCount} đề</span>
                    </div>
                  </div>

                  {/* Nút xem chi tiết */}
                  <button
                    onClick={() => setViewingStudentId(student.studentId)}
                    className="w-full py-1.5 rounded-xl bg-[#F1F5F9] dark:bg-[#0D2063] hover:bg-[#1746D1] text-[#14213D] dark:text-white hover:text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-[#E2E8F0] dark:border-[#1B317A]"
                  >
                    <Eye className="w-3 h-3" /> Xem lịch sử thi
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. BỘ LỌC CHI TIẾT & TÌM KIẾM CHO BẢNG TỔNG HỢP */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên học sinh, MSHS, lớp..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0D2063] border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-white placeholder:text-[#94A3B8] text-xs font-medium focus:border-[#1746D1] transition-colors"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#14213D] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Các dropdown bộ lọc */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc theo lớp */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569] dark:text-slate-300">
            <span className="hidden sm:inline">Lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0D2063] border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-white text-xs font-semibold focus:border-[#1746D1] transition-colors"
            >
              <option value="all">Tất cả các lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo đề thi */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569] dark:text-slate-300">
            <span className="hidden sm:inline">Đề thi:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0D2063] border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-white text-xs font-semibold focus:border-[#1746D1] transition-colors max-w-[200px] truncate"
            >
              <option value="all">Tất cả đề {currentSubjectDisplayName}</option>
              {availableExamsForSubject.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>

          {/* Tiêu chí xếp hạng */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#475569] dark:text-slate-300">
            <span className="hidden sm:inline">Xếp theo:</span>
            <select
              value={sortCriteria}
              onChange={(e: any) => setSortCriteria(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0D2063] border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-white text-xs font-bold focus:border-[#1746D1] transition-colors"
            >
              <option value="avg_score">Điểm trung bình</option>
              <option value="max_score">Điểm cao nhất</option>
              <option value="exam_count">Số đề đã nộp</option>
              <option value="total_score">Tổng điểm tích lũy</option>
            </select>
          </div>
        </div>

      </div>

      {/* 8. BẢNG XẾP HẠNG CHI TIẾT ĐẦY ĐỦ (FULL COHORT TABLE) */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1746D1] dark:text-[#00DFFF]" />
            <h2 className="text-base font-extrabold text-[#14213D] dark:text-white m-0">
              Danh Sách Đầy Đủ ({studentRankings.length} học sinh) • Môn: {currentSubjectDisplayName}
            </h2>
          </div>
          <span className="text-xs text-[#64748B] dark:text-slate-400 font-medium">
            Sắp xếp theo: <strong className="text-[#1746D1] dark:text-cyan-300 font-bold">
              {sortCriteria === 'avg_score' ? 'Điểm trung bình' : sortCriteria === 'max_score' ? 'Điểm cao nhất' : sortCriteria === 'exam_count' ? 'Số đề đã nộp' : 'Tổng điểm tích lũy'}
            </strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 text-center w-16">Hạng</th>
                <th className="py-3 px-4">Học Sinh</th>
                <th className="py-3 px-4">Lớp</th>
                <th className="py-3 px-4 text-center">Đã Nộp</th>
                <th className="py-3 px-4 text-center">Điểm TB</th>
                <th className="py-3 px-4 text-center">Điểm Cao Nhất</th>
                <th className="py-3 px-4 text-center">Tỉ Lệ Đúng</th>
                <th className="py-3 px-4 text-center">Xếp Loại</th>
                <th className="py-3 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1B317A]">
              {studentRankings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#64748B] dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-[#94A3B8]" />
                      <p className="text-sm font-semibold">Không tìm thấy học sinh nào phù hợp với bộ lọc!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                studentRankings.map((student, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr 
                      key={student.studentId}
                      className="hover:bg-blue-50/50 dark:hover:bg-cyan-500/10 transition-colors group"
                    >
                      {/* Cột Thứ Hạng */}
                      <td className="py-3.5 px-4 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-900 font-black text-xs shadow-sm">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-sm">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 text-white font-black text-xs shadow-sm">
                            3
                          </span>
                        ) : rank <= 10 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-50 dark:bg-cyan-500/20 text-[#1746D1] dark:text-cyan-300 font-black text-xs border border-blue-200 dark:border-cyan-500/30">
                            {rank}
                          </span>
                        ) : (
                          <span className="font-bold text-[#64748B] dark:text-slate-400 group-hover:text-[#1746D1] dark:group-hover:text-cyan-300">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Cột Học Sinh */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            rank === 1 ? 'bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400' :
                            rank === 2 ? 'bg-slate-100 dark:bg-slate-300/20 text-slate-700 dark:text-slate-200 border border-slate-400' :
                            rank === 3 ? 'bg-orange-100 dark:bg-amber-600/20 text-orange-700 dark:text-amber-400 border border-orange-400' :
                            'bg-blue-50 dark:bg-cyan-500/20 text-[#1746D1] dark:text-cyan-300 border border-blue-200 dark:border-cyan-400/30'
                          }`}>
                            {student.fullName[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-[#14213D] dark:text-white group-hover:text-[#1746D1] dark:group-hover:text-cyan-300 transition-colors block">
                              {student.fullName}
                            </span>
                            <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono">
                              MSHS: {student.mshs}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột Lớp */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-[#1746D1] dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-bold text-[11px]">
                          {student.className}
                        </span>
                      </td>

                      {/* Cột Số Đề Đã Làm */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-[#14213D] dark:text-white">
                          {student.examCount} <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-normal">đề</span>
                        </span>
                      </td>

                      {/* Cột Điểm Trung Bình */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-sm font-black ${student.avgScore >= 8 ? 'text-[#1746D1] dark:text-cyan-400' : student.avgScore >= 5 ? 'text-[#14213D] dark:text-slate-200' : 'text-rose-600 dark:text-rose-400'}`}>
                          {student.examCount > 0 ? student.avgScore : '-'}
                        </span>
                      </td>

                      {/* Cột Điểm Cao Nhất */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-sm font-black ${student.maxScore >= 9 ? 'text-amber-600 dark:text-amber-300' : 'text-[#475569] dark:text-slate-300'}`}>
                          {student.examCount > 0 ? student.maxScore : '-'}
                        </span>
                      </td>

                      {/* Cột Tỉ Lệ Làm Đúng */}
                      <td className="py-3.5 px-4 text-center">
                        {student.examCount > 0 ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-bold text-[#14213D] dark:text-slate-200">{student.accuracyRate}%</span>
                          </div>
                        ) : (
                          <span className="text-[#94A3B8]">-</span>
                        )}
                      </td>

                      {/* Cột Xếp Loại */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${student.tierColor}`}>
                          {student.rankTier}
                        </span>
                      </td>

                      {/* Cột Thao Tác */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setViewingStudentId(student.studentId)}
                          disabled={student.examCount === 0}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-[#0D2063] hover:bg-[#1746D1] text-[#1746D1] dark:text-cyan-300 hover:text-white border border-blue-200 dark:border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem bài
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. MODAL XEM CHI TIẾT CÁC LẦN NỘP CỦA HỌC SINH */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#0B1B55] border border-[#E2E8F0] dark:border-[#1B317A] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] flex items-center justify-between bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/15 border border-white/30 flex items-center justify-center font-black text-white text-lg">
                  {viewingStudent.fullName[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white m-0">{viewingStudent.fullName}</h3>
                  <p className="text-xs text-blue-100 m-0">Lớp: {viewingStudent.className} • MSHS: {viewingStudent.mshs}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudentId(null)}
                className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Lịch sử nộp bài */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#0D2063] border border-[#E2E8F0] dark:border-[#1B317A] text-center">
                <div>
                  <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase font-bold">Điểm trung bình</span>
                  <span className="text-xl font-black text-[#1746D1] dark:text-cyan-400">{viewingStudent.avgScore}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase font-bold">Điểm cao nhất</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">{viewingStudent.maxScore}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#64748B] dark:text-slate-400 uppercase font-bold">Tổng số đề</span>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400">{viewingStudent.examCount}</span>
                </div>
              </div>

              <h4 className="text-xs font-extrabold text-[#475569] dark:text-slate-300 uppercase tracking-wider pt-2 m-0">
                Chi Tiết Các Đợt Thi Đã Nộp ({currentSubjectDisplayName}):
              </h4>

              <div className="space-y-2.5">
                {viewingStudent.results.length === 0 ? (
                  <p className="text-xs text-[#64748B] dark:text-slate-400 italic">Chưa có kết quả nộp bài trong chu kỳ này.</p>
                ) : (
                  viewingStudent.results.map((r, idx) => (
                    <div 
                      key={r.id || idx}
                      className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0D2063]/60 border border-[#E2E8F0] dark:border-[#1B317A] flex items-center justify-between hover:border-[#1746D1]/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-[#14213D] dark:text-white text-xs block">
                          {r.exams?.title || `Đề thi #${r.exam_id.slice(0, 8)}`}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#1746D1] dark:text-cyan-400" /> {Math.round(r.time_spent_seconds / 60)} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {r.correct_answers}/{r.total_questions} câu
                          </span>
                          <span>{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-[#1746D1] dark:text-cyan-400">
                          {r.score}
                        </span>
                        <span className="text-[10px] text-[#64748B] dark:text-slate-400 block font-semibold">điểm</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D2063]/50 text-right">
              <button
                onClick={() => setViewingStudentId(null)}
                className="px-4 py-2 rounded-xl bg-[#0B1B55] hover:bg-[#1746D1] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
