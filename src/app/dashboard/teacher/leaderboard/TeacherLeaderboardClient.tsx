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

// Cấu hình danh hiệu cho Top 7 tiếp theo (#4 đến #10)
const TOP_7_HONORS = [
  {
    rank: 4,
    title: 'Top 4 - Tinh Anh',
    badgeColor: 'from-purple-500/25 to-indigo-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]',
    avatarRing: 'border-purple-400/70 text-purple-300 bg-purple-500/20',
    statAccent: 'text-purple-300',
    numberBadge: 'bg-purple-600/40 text-purple-200 border-purple-400/50',
    icon: <Sparkles className="w-3.5 h-3.5 text-purple-300" />
  },
  {
    rank: 5,
    title: 'Top 5 - Bứt Phá',
    badgeColor: 'from-emerald-500/25 to-teal-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
    avatarRing: 'border-emerald-400/70 text-emerald-300 bg-emerald-500/20',
    statAccent: 'text-emerald-300',
    numberBadge: 'bg-emerald-600/40 text-emerald-200 border-emerald-400/50',
    icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
  },
  {
    rank: 6,
    title: 'Top 6 - Vững Vàng',
    badgeColor: 'from-cyan-500/25 to-blue-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]',
    avatarRing: 'border-cyan-400/70 text-cyan-300 bg-cyan-500/20',
    statAccent: 'text-cyan-300',
    numberBadge: 'bg-cyan-600/40 text-cyan-200 border-cyan-400/50',
    icon: <Flame className="w-3.5 h-3.5 text-cyan-300" />
  },
  {
    rank: 7,
    title: 'Top 7 - Nỗ Lực',
    badgeColor: 'from-amber-500/25 to-orange-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    avatarRing: 'border-amber-400/70 text-amber-300 bg-amber-500/20',
    statAccent: 'text-amber-300',
    numberBadge: 'bg-amber-600/40 text-amber-200 border-amber-400/50',
    icon: <Zap className="w-3.5 h-3.5 text-amber-300" />
  },
  {
    rank: 8,
    title: 'Top 8 - Quyết Tâm',
    badgeColor: 'from-pink-500/25 to-rose-500/20 text-pink-300 border-pink-400/40 shadow-[0_0_15px_rgba(236,72,153,0.25)]',
    avatarRing: 'border-pink-400/70 text-pink-300 bg-pink-500/20',
    statAccent: 'text-pink-300',
    numberBadge: 'bg-pink-600/40 text-pink-200 border-pink-400/50',
    icon: <Star className="w-3.5 h-3.5 text-pink-300" />
  },
  {
    rank: 9,
    title: 'Top 9 - Vươn Lên',
    badgeColor: 'from-blue-500/25 to-indigo-500/20 text-blue-300 border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]',
    avatarRing: 'border-blue-400/70 text-blue-300 bg-blue-500/20',
    statAccent: 'text-blue-300',
    numberBadge: 'bg-blue-600/40 text-blue-200 border-blue-400/50',
    icon: <ArrowUpRight className="w-3.5 h-3.5 text-blue-300" />
  },
  {
    rank: 10,
    title: 'Top 10 - Tiềm Năng',
    badgeColor: 'from-teal-500/25 to-emerald-500/20 text-teal-300 border-teal-400/40 shadow-[0_0_15px_rgba(20,184,166,0.25)]',
    avatarRing: 'border-teal-400/70 text-teal-300 bg-teal-500/20',
    statAccent: 'text-teal-300',
    numberBadge: 'bg-teal-600/40 text-teal-200 border-teal-400/50',
    icon: <Medal className="w-3.5 h-3.5 text-teal-300" />
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

      // Xếp loại học lực khảo thí
      let rankTier = 'Chưa thi';
      let tierColor = 'text-slate-400 border-slate-500/30 bg-slate-500/10';
      if (examCount > 0) {
        if (avgScore >= 9.0) {
          rankTier = 'Xuất sắc';
          tierColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/15';
        } else if (avgScore >= 8.0) {
          rankTier = 'Giỏi';
          tierColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/15';
        } else if (avgScore >= 6.5) {
          rankTier = 'Khá';
          tierColor = 'text-amber-400 border-amber-500/30 bg-amber-500/15';
        } else if (avgScore >= 5.0) {
          rankTier = 'Trung bình';
          tierColor = 'text-orange-400 border-orange-500/30 bg-orange-500/15';
        } else {
          rankTier = 'Cần cố gắng';
          tierColor = 'text-rose-400 border-rose-500/30 bg-rose-500/15';
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
    <div className="space-y-6 w-full animate-fade-in text-white">
      
      {/* 1. HEADER BẢNG VÀNG ĐÓNG KHUNG KÍNH MỜ XANH CÔNG NGHỆ */}
      <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,12,40,0.5)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Bảng Vàng Vinh Danh Học Sinh
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Cập nhật liên tục
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0 flex flex-wrap items-center gap-2.5">
            Bảng Vàng Vinh Danh:
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 font-black">
              {currentSubjectDisplayName}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium m-0 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-cyan-300 font-bold">{periodDescription}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer active:scale-95 border border-cyan-400/40"
          >
            <Download className="w-4 h-4" /> Xuất Bảng Vàng (Excel)
          </button>
        </div>
      </div>

      {/* 2. THANH CHỌN MÔN HỌC (MỖI MÔN 1 BẢNG) */}
      <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,10,35,0.4)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Chọn Môn Học Khảo Thí:</span>
          </div>
          <span className="text-[11px] text-cyan-300 font-semibold hidden sm:inline">
            Mỗi môn có 1 bảng vinh danh Top 3 + Top 7 riêng biệt
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-cyan-500/30">
          {/* Nút Tất cả các môn */}
          <button
            onClick={() => {
              setSelectedSubjectId('all');
              setSelectedExamId('all');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              selectedSubjectId === 'all'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
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
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-blue-500/50 hover:text-white'
                }`}
              >
                <span>{sub.name}</span>
                {isSelected && <Check className="w-3 h-3 text-cyan-300" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BỘ ĐIỀU KHIỂN CHU KỲ THỜI GIAN: THEO TUẦN (1, 2, 3, 4, HIỆN TẠI) & THEO THÁNG (4 TUẦN) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,10,35,0.4)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Chọn Tháng */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 shrink-0">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Tháng:</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9.5 px-3 rounded-xl bg-slate-800/90 border border-cyan-500/40 text-white text-xs font-bold focus:border-cyan-400 transition-colors cursor-pointer"
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
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)] font-black'
                : 'bg-slate-800/80 text-amber-300 border-amber-500/30 hover:border-amber-400/60'
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
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] font-black'
                : 'bg-slate-800/80 text-emerald-300 border-emerald-500/30 hover:border-emerald-400/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            Tuần Hiện Tại (Live)
          </button>

          {/* Tuần 1 */}
          <button
            onClick={() => setTimePeriod('week_1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_1'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-white'
            }`}
          >
            Tuần 1 (01-07)
          </button>

          {/* Tuần 2 */}
          <button
            onClick={() => setTimePeriod('week_2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_2'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-white'
            }`}
          >
            Tuần 2 (08-14)
          </button>

          {/* Tuần 3 */}
          <button
            onClick={() => setTimePeriod('week_3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_3'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-white'
            }`}
          >
            Tuần 3 (15-21)
          </button>

          {/* Tuần 4 */}
          <button
            onClick={() => setTimePeriod('week_4')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'week_4'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-cyan-500/50 hover:text-white'
            }`}
          >
            Tuần 4 (22-Hết)
          </button>

          {/* Toàn thời gian */}
          <button
            onClick={() => setTimePeriod('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              timePeriod === 'all'
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-indigo-500/50 hover:text-white'
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

      {/* 5. BỤC VINH DANH TOP 3 DẪN ĐẦU (PODIUM NEON ÁNH KIM) */}
      {top3.length > 0 ? (
        <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,12,40,0.5)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 m-0">
              <Crown className="w-5 h-5 text-amber-400" /> Bục Vinh Danh Top 3 Học Sinh Dẫn Đầu
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold ml-1">
                {currentSubjectDisplayName}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                {periodDescription}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Top 2: Á Quân (Bên trái) */}
            {top3[1] && (
              <div className="order-2 md:order-1 p-5.5 rounded-2xl bg-gradient-to-b from-[#1E293B] via-[#0B1B55] to-[#061028] border border-slate-300/40 shadow-[0_0_20px_rgba(148,163,184,0.2)] text-center relative overflow-hidden flex flex-col items-center justify-between group hover:border-slate-200 transition-all">
                <div className="absolute top-3 right-3 text-2xl font-black font-tech text-slate-400/50">#2</div>
                <div className="w-14 h-14 rounded-full bg-slate-400/20 border-2 border-slate-300 flex items-center justify-center font-black font-heading text-xl text-slate-100 shadow-[0_0_15px_rgba(148,163,184,0.4)] mb-3">
                  {top3[1].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-400/20 text-slate-100 border border-slate-300/30 mb-1">
                    <Medal className="w-3.5 h-3.5 text-slate-200" /> Á Quân
                  </div>
                  <h3 className="text-base font-bold font-heading text-white truncate max-w-[200px] m-0">{top3[1].fullName}</h3>
                  <p className="text-xs text-slate-300 font-medium">Lớp: {top3[1].className} &bull; MSHS: {top3[1].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm TB</span>
                    <span className="font-black font-heading text-base text-[#00DFFF]">{top3[1].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm cao nhất</span>
                    <span className="font-black font-heading text-base text-[#E9A23B]">{top3[1].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Đã nộp</span>
                    <span className="font-black font-heading text-base text-purple-300">{top3[1].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 1: Quán Quân (Ở giữa - Cao nhất và nổi bật nhất) */}
            {top3[0] && (
              <div className="order-1 md:order-2 p-6.5 rounded-2xl bg-gradient-to-b from-[#2E2005] via-[#0B1B55] to-[#061028] border-2 border-amber-400/90 shadow-[0_0_35px_rgba(251,191,36,0.35)] text-center relative overflow-hidden flex flex-col items-center justify-between md:-translate-y-2 group hover:border-amber-300 transition-all">
                <div className="absolute top-2 right-3 text-3xl font-black font-tech text-amber-400/60">#1</div>
                <div className="relative mb-3">
                  <Crown className="w-8 h-8 text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center font-black font-heading text-2xl text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                    {top3[0].fullName[0].toUpperCase()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400/25 text-amber-300 border border-amber-400/50 mb-1">
                    <Crown className="w-3.5 h-3.5 text-amber-300" /> Quán Quân Bảng Vàng
                  </div>
                  <h3 className="text-lg font-black font-heading text-white truncate max-w-[220px] m-0">{top3[0].fullName}</h3>
                  <p className="text-xs text-amber-200/90 font-medium">Lớp: {top3[0].className} &bull; MSHS: {top3[0].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-500/30 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm TB</span>
                    <span className="font-black font-heading text-lg text-[#00DFFF]">{top3[0].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm cao nhất</span>
                    <span className="font-black font-heading text-lg text-emerald-400">{top3[0].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Đã nộp</span>
                    <span className="font-black font-heading text-lg text-[#087CFF]">{top3[0].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3: Quý Quân (Bên phải) */}
            {top3[2] && (
              <div className="order-3 p-5.5 rounded-2xl bg-gradient-to-b from-[#2E1205] via-[#0B1B55] to-[#061028] border border-amber-600/50 shadow-[0_0_20px_rgba(217,119,6,0.2)] text-center relative overflow-hidden flex flex-col items-center justify-between group hover:border-amber-500 transition-all">
                <div className="absolute top-3 right-3 text-2xl font-black font-tech text-amber-700/50">#3</div>
                <div className="w-14 h-14 rounded-full bg-amber-700/20 border-2 border-amber-600 flex items-center justify-center font-black font-heading text-xl text-amber-300 shadow-[0_0_15px_rgba(217,119,6,0.3)] mb-3">
                  {top3[2].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-700/20 text-amber-300 border border-amber-600/40 mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Quý Quân
                  </div>
                  <h3 className="text-base font-bold font-heading text-white truncate max-w-[200px] m-0">{top3[2].fullName}</h3>
                  <p className="text-xs text-slate-300 font-medium">Lớp: {top3[2].className} &bull; MSHS: {top3[2].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm TB</span>
                    <span className="font-black font-heading text-base text-[#00DFFF]">{top3[2].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Điểm cao nhất</span>
                    <span className="font-black font-heading text-base text-[#E9A23B]">{top3[2].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Đã nộp</span>
                    <span className="font-black font-heading text-base text-purple-300">{top3[2].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Chưa có kết quả nộp bài trong chu kỳ này</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Học sinh chưa nộp bài thi nào trong {periodDescription.toLowerCase()}. Hãy chọn chu kỳ khác hoặc chuyển sang &quot;Tổng kết 4 Tuần&quot; / &quot;Toàn thời gian&quot;.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setTimePeriod('month_all')}
              className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
            >
              Xem Tổng kết 4 Tuần
            </button>
            <button
              onClick={() => setTimePeriod('all')}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
            >
              Xem Toàn thời gian
            </button>
          </div>
        </div>
      )}

      {/* 6. KHỐI VINH DANH TOP 7 TIẾP THEO (HẠNG #4 ĐẾN #10) */}
      {top7.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,12,40,0.5)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30">
                <Medal className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white m-0 flex items-center gap-2">
                  Top 7 Gương Mặt Tiêu Biểu Bứt Phá (Hạng #4 - #10)
                </h3>
                <p className="text-[11px] text-slate-400 m-0">
                  Những học sinh có thành tích xuất sắc và phong độ bứt phá tiếp theo trong kỳ khảo thí môn {currentSubjectDisplayName}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/25 shrink-0">
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
                  className={`p-4 rounded-2xl bg-gradient-to-b ${honorConfig.badgeColor} border backdrop-blur-xl transition-all hover:scale-[1.02] flex flex-col justify-between space-y-3 relative overflow-hidden group`}
                >
                  {/* Số thứ hạng góc trên bên phải */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${honorConfig.numberBadge}`}>
                      {honorConfig.icon} #{rankNum}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">
                      {honorConfig.title}
                    </span>
                  </div>

                  {/* Thông tin học sinh */}
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-black text-base shrink-0 shadow-md ${honorConfig.avatarRing}`}>
                      {student.fullName[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate m-0 group-hover:text-cyan-300 transition-colors">
                        {student.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-300 m-0 truncate">
                        Lớp: <span className="font-semibold text-white">{student.className}</span> • {student.mshs}
                      </p>
                    </div>
                  </div>

                  {/* 3 Chỉ số quan trọng */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-700/50 text-center text-xs">
                    <div>
                      <span className="block text-[9px] text-slate-400">Điểm TB</span>
                      <span className={`font-black text-xs ${honorConfig.statAccent}`}>{student.avgScore}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400">Cao nhất</span>
                      <span className="font-black text-xs text-amber-300">{student.maxScore}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400">Đã nộp</span>
                      <span className="font-black text-xs text-cyan-300">{student.examCount} đề</span>
                    </div>
                  </div>

                  {/* Nút xem chi tiết */}
                  <button
                    onClick={() => setViewingStudentId(student.studentId)}
                    className="w-full py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-slate-600/50"
                  >
                    <Eye className="w-3 h-3 text-cyan-400" /> Xem lịch sử thi
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. BỘ LỌC CHI TIẾT & TÌM KIẾM CHO BẢNG TỔNG HỢP */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,10,35,0.4)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên học sinh, MSHS, lớp..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-800/80 border border-cyan-500/30 text-white placeholder-slate-400 text-xs font-medium focus:border-cyan-400 transition-colors"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Các dropdown bộ lọc */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc theo lớp */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className="hidden sm:inline">Lớp:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-800/80 border border-cyan-500/30 text-white text-xs font-semibold focus:border-cyan-400 transition-colors"
            >
              <option value="all">Tất cả các lớp</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo đề thi */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className="hidden sm:inline">Đề thi:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-800/80 border border-cyan-500/30 text-white text-xs font-semibold focus:border-cyan-400 transition-colors max-w-[200px] truncate"
            >
              <option value="all">Tất cả đề {currentSubjectDisplayName}</option>
              {availableExamsForSubject.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>
          </div>

          {/* Tiêu chí xếp hạng */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className="hidden sm:inline">Xếp theo:</span>
            <select
              value={sortCriteria}
              onChange={(e: any) => setSortCriteria(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-800/80 border border-cyan-500/30 text-white text-xs font-bold focus:border-cyan-400 transition-colors"
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
      <div className="rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,12,40,0.5)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white m-0">
              Danh Sách Đầy Đủ ({studentRankings.length} học sinh) • Môn: {currentSubjectDisplayName}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Sắp xếp theo: <strong className="text-cyan-300 font-bold">
              {sortCriteria === 'avg_score' ? 'Điểm trung bình' : sortCriteria === 'max_score' ? 'Điểm cao nhất' : sortCriteria === 'exam_count' ? 'Số đề đã nộp' : 'Tổng điểm tích lũy'}
            </strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cyan-500/20 bg-slate-800/60 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y divide-cyan-500/10">
              {studentRankings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-500" />
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
                      className="hover:bg-cyan-500/10 transition-colors group"
                    >
                      {/* Cột Thứ Hạng */}
                      <td className="py-3.5 px-4 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-slate-900 font-black text-xs shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-[0_0_10px_rgba(203,213,225,0.5)]">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white font-black text-xs shadow-[0_0_10px_rgba(217,119,6,0.5)]">
                            3
                          </span>
                        ) : rank <= 10 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-xs border border-cyan-500/30">
                            {rank}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-400 group-hover:text-cyan-300">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Cột Học Sinh */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            rank === 1 ? 'bg-amber-400/20 text-amber-300 border border-amber-400' :
                            rank === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-300' :
                            rank === 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-600' :
                            'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                          }`}>
                            {student.fullName[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white group-hover:text-cyan-300 transition-colors block">
                              {student.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              MSHS: {student.mshs}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột Lớp */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold text-[11px]">
                          {student.className}
                        </span>
                      </td>

                      {/* Cột Số Đề Đã Làm */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-white">
                          {student.examCount} <span className="text-[10px] text-slate-400 font-normal">đề</span>
                        </span>
                      </td>

                      {/* Cột Điểm Trung Bình */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-sm font-black ${student.avgScore >= 8 ? 'text-cyan-400' : student.avgScore >= 5 ? 'text-slate-200' : 'text-rose-400'}`}>
                          {student.examCount > 0 ? student.avgScore : '-'}
                        </span>
                      </td>

                      {/* Cột Điểm Cao Nhất */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-sm font-black ${student.maxScore >= 9 ? 'text-amber-300' : 'text-slate-300'}`}>
                          {student.examCount > 0 ? student.maxScore : '-'}
                        </span>
                      </td>

                      {/* Cột Tỉ Lệ Làm Đúng */}
                      <td className="py-3.5 px-4 text-center">
                        {student.examCount > 0 ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-bold text-slate-200">{student.accuracyRate}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
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
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-600/30 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_12px_48px_rgba(0,15,50,0.8)] overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-cyan-500/20 flex items-center justify-between bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-black text-cyan-300 text-lg">
                  {viewingStudent.fullName[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white m-0">{viewingStudent.fullName}</h3>
                  <p className="text-xs text-slate-400 m-0">Lớp: {viewingStudent.className} • MSHS: {viewingStudent.mshs}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudentId(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Lịch sử nộp bài */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-800/50 border border-cyan-500/20 text-center">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Điểm trung bình</span>
                  <span className="text-xl font-black text-cyan-400">{viewingStudent.avgScore}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Điểm cao nhất</span>
                  <span className="text-xl font-black text-amber-400">{viewingStudent.maxScore}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Tổng số đề</span>
                  <span className="text-xl font-black text-purple-400">{viewingStudent.examCount}</span>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-2">
                Chi Tiết Các Đợt Thi Đã Nộp ({currentSubjectDisplayName}):
              </h4>

              <div className="space-y-2.5">
                {viewingStudent.results.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có kết quả nộp bài trong chu kỳ này.</p>
                ) : (
                  viewingStudent.results.map((r, idx) => (
                    <div 
                      key={r.id || idx}
                      className="p-3.5 rounded-2xl bg-slate-800/40 border border-cyan-500/20 flex items-center justify-between hover:border-cyan-400/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-white text-xs block">
                          {r.exams?.title || `Đề thi #${r.exam_id.slice(0, 8)}`}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" /> {Math.round(r.time_spent_seconds / 60)} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {r.correct_answers}/{r.total_questions} câu
                          </span>
                          <span>{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-cyan-400">
                          {r.score}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-semibold">điểm</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-cyan-500/20 bg-slate-800/40 text-right">
              <button
                onClick={() => setViewingStudentId(null)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-colors cursor-pointer"
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
