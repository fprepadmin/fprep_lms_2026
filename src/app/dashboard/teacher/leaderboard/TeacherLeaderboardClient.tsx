'use client';

import React, { useState, useMemo } from 'react';
import { 
  Trophy, Medal, Award, Crown, Search, Filter, 
  Download, Users, BookOpen, Clock, CheckCircle2, 
  TrendingUp, Sparkles, Eye, X, ChevronRight,
  GraduationCap, Flame, ArrowUpRight, BarChart3, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClassItem {
  id: string;
  name: string;
  group_type?: string;
  academic_year?: string;
}

interface StudentItem {
  student_id: string;
  mshs: string;
  full_name: string;
  class_id: string | null;
  classes?: {
    id: string;
    name: string;
  };
}

interface ProfileItem {
  id: string;
  email: string;
  role: string;
}

interface ExamItem {
  id: string;
  title: string;
  subject_id?: string;
  exam_type?: string;
}

interface ExamResultItem {
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
  };
}

interface TeacherLeaderboardClientProps {
  teacherId: string;
  subjectName: string;
  isHOD: boolean;
  classes: ClassItem[];
  assignedClassIds: string[];
  students: StudentItem[];
  studentProfiles: ProfileItem[];
  exams: ExamItem[];
  examResults: ExamResultItem[];
}

export default function TeacherLeaderboardClient({
  teacherId,
  subjectName,
  isHOD,
  classes,
  assignedClassIds,
  students,
  studentProfiles,
  exams,
  examResults,
}: TeacherLeaderboardClientProps) {
  // Bộ lọc
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [sortCriteria, setSortCriteria] = useState<'avg_score' | 'max_score' | 'exam_count' | 'total_score'>('avg_score');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modal xem chi tiết lịch sử thi của 1 học sinh
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

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

  // Lọc danh sách học sinh theo lớp
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedClassId !== 'all') {
        return s.class_id === selectedClassId;
      }
      if (!isHOD && assignedClassIds.length > 0) {
        return s.class_id && assignedClassIds.includes(s.class_id);
      }
      return true;
    });
  }, [students, selectedClassId, isHOD, assignedClassIds]);

  // Tổng hợp dữ liệu kết quả thi theo từng học sinh
  const studentRankings = useMemo(() => {
    // Lọc examResults theo exam nếu có
    const filteredResults = examResults.filter(r => {
      if (selectedExamId !== 'all') {
        return r.exam_id === selectedExamId;
      }
      return true;
    });

    // Nhóm kết quả theo student_id
    const resultsByStudent = new Map<string, ExamResultItem[]>();
    filteredResults.forEach(r => {
      if (!resultsByStudent.has(r.student_id)) {
        resultsByStudent.set(r.student_id, []);
      }
      resultsByStudent.get(r.student_id)!.push(r);
    });

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

    // Lọc theo từ khóa tìm kiếm
    let filtered = list;
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.fullName.toLowerCase().includes(kw) ||
        s.mshs.toLowerCase().includes(kw) ||
        s.className.toLowerCase().includes(kw)
      );
    }

    // Sắp xếp theo tiêu chí
    filtered.sort((a, b) => {
      // Ưu tiên học sinh đã làm bài trước
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
  }, [filteredStudents, examResults, selectedExamId, profileMap, classMap, searchKeyword, sortCriteria]);

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
      'Email': s.email,
      'Số đề đã nộp': s.examCount,
      'Điểm trung bình': s.avgScore,
      'Điểm cao nhất': s.maxScore,
      'Tổng điểm tích lũy': s.totalScore,
      'Tỉ lệ đúng (%)': `${s.accuracyRate}%`,
      'Xếp loại': s.rankTier
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BangXepHang');
    XLSX.writeFile(wb, `FPREP_BangXepHang_${subjectName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Xem chi tiết học sinh đang chọn
  const viewingStudent = useMemo(() => {
    if (!viewingStudentId) return null;
    return studentRankings.find(s => s.studentId === viewingStudentId) || null;
  }, [viewingStudentId, studentRankings]);

  return (
    <div className="space-y-6 w-full animate-fade-in text-white">
      
      {/* 1. HEADER BẢNG XẾP HẠNG KHẢO THÍ ĐÓNG KHUNG KÍNH MỜ */}
      <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,12,40,0.5)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Bảng Vinh Danh & Xếp Hạng Khảo Thí
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white m-0 flex items-center gap-3">
            Xếp Hạng Năng Lực Học Sinh
            <span className="text-xs px-2.5 py-1 rounded-xl bg-blue-600/30 text-blue-200 border border-blue-400/30 font-bold">
              Môn: {subjectName}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium m-0">
            Theo dõi tổng điểm, phân tích độ đồng đều và vinh danh những học sinh đạt thành tích cao nhất trong các đợt thi khảo thí.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="relative z-10 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer shrink-0 active:scale-95 border border-cyan-400/40"
        >
          <Download className="w-4 h-4" /> Xuất Báo Cáo Excel
        </button>
      </div>

      {/* 2. KHỐI 4 CARD THỐNG KÊ SỐ LIỆU NỔI BẬT NỀN XANH */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,10,35,0.4)] relative overflow-hidden group hover:border-cyan-400/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Học sinh tham gia</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {statsOverview.activeCount} <span className="text-xs text-slate-400 font-semibold">/ {statsOverview.totalStudents} HS</span>
          </div>
          <p className="text-[11px] text-cyan-300 mt-1 font-medium">
            {statsOverview.totalStudents > 0 ? Math.round((statsOverview.activeCount / statsOverview.totalStudents) * 100) : 0}% tỷ lệ nộp bài
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,10,35,0.4)] relative overflow-hidden group hover:border-cyan-400/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm Trung Bình</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400">
            {statsOverview.averageCohort} <span className="text-xs text-slate-400 font-semibold">/ 10.0</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 font-medium">Toàn bộ lượt làm bài</p>
        </div>

        {/* Card 3 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,10,35,0.4)] relative overflow-hidden group hover:border-cyan-400/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ Lệ Giỏi (≥ 8.0)</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {statsOverview.excellentPercent}%
          </div>
          <p className="text-[11px] text-amber-200/80 mt-1 font-medium">Đạt ngưỡng năng lực cao</p>
        </div>

        {/* Card 4 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/75 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,10,35,0.4)] relative overflow-hidden group hover:border-cyan-400/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm 10 Tuyệt Đối</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300">
            {statsOverview.perfectScoreCount} <span className="text-xs text-slate-400 font-semibold">lượt đạt 10</span>
          </div>
          <p className="text-[11px] text-purple-200/80 mt-1 font-medium">Kỷ lục điểm số cao nhất</p>
        </div>
      </div>

      {/* 3. BỤC VINH DANH TOP 3 XUẤT SẮC (PODIUM NEON) */}
      {top3.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,12,40,0.5)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 m-0">
              <Crown className="w-5 h-5 text-amber-400" /> Bục Vinh Danh Top 3 Học Sinh Dẫn Đầu
            </h2>
            <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              Cập nhật trực tiếp
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Top 2: Á Quân */}
            {top3[1] && (
              <div className="order-2 md:order-1 p-5 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-slate-400/40 shadow-lg text-center relative overflow-hidden flex flex-col items-center justify-between">
                <div className="absolute top-3 right-3 text-2xl font-black text-slate-400/40">#2</div>
                <div className="w-14 h-14 rounded-full bg-slate-400/20 border-2 border-slate-300 flex items-center justify-center font-black text-xl text-slate-200 shadow-[0_0_15px_rgba(148,163,184,0.4)] mb-3">
                  {top3[1].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-400/20 text-slate-200 border border-slate-300/30 mb-1">
                    <Medal className="w-3.5 h-3.5 text-slate-300" /> Á Quân
                  </div>
                  <h3 className="text-base font-bold text-white truncate max-w-[200px] m-0">{top3[1].fullName}</h3>
                  <p className="text-xs text-slate-400 font-medium">Lớp: {top3[1].className} • MSHS: {top3[1].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm TB</span>
                    <span className="font-black text-base text-cyan-300">{top3[1].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-base text-amber-300">{top3[1].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Đã nộp</span>
                    <span className="font-black text-base text-purple-300">{top3[1].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 1: Quán Quân (Nổi bật nhất) */}
            {top3[0] && (
              <div className="order-1 md:order-2 p-6 rounded-2xl bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-900 border-2 border-amber-400/70 shadow-[0_0_35px_rgba(251,191,36,0.3)] text-center relative overflow-hidden flex flex-col items-center justify-between md:-translate-y-2">
                <div className="absolute top-2 right-3 text-3xl font-black text-amber-400/40">#1</div>
                <div className="relative mb-3">
                  <Crown className="w-8 h-8 text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center font-black text-2xl text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                    {top3[0].fullName[0].toUpperCase()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400/25 text-amber-300 border border-amber-400/50 mb-1">
                    <Crown className="w-3.5 h-3.5 text-amber-300" /> Quán Quân Toàn Khóa
                  </div>
                  <h3 className="text-lg font-black text-white truncate max-w-[220px] m-0">{top3[0].fullName}</h3>
                  <p className="text-xs text-amber-200/80 font-medium">Lớp: {top3[0].className} • MSHS: {top3[0].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-500/30 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm TB</span>
                    <span className="font-black text-lg text-amber-300">{top3[0].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-lg text-emerald-400">{top3[0].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Đã nộp</span>
                    <span className="font-black text-lg text-cyan-300">{top3[0].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top 3: Quý Quân */}
            {top3[2] && (
              <div className="order-3 p-5 rounded-2xl bg-gradient-to-b from-amber-900/30 to-slate-900/80 border border-amber-700/50 shadow-lg text-center relative overflow-hidden flex flex-col items-center justify-between">
                <div className="absolute top-3 right-3 text-2xl font-black text-amber-700/40">#3</div>
                <div className="w-14 h-14 rounded-full bg-amber-700/20 border-2 border-amber-600 flex items-center justify-center font-black text-xl text-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.3)] mb-3">
                  {top3[2].fullName[0].toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-700/20 text-amber-400 border border-amber-600/40 mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Quý Quân
                  </div>
                  <h3 className="text-base font-bold text-white truncate max-w-[200px] m-0">{top3[2].fullName}</h3>
                  <p className="text-xs text-slate-400 font-medium">Lớp: {top3[2].className} • MSHS: {top3[2].mshs}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/60 w-full flex justify-around text-xs">
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm TB</span>
                    <span className="font-black text-base text-cyan-300">{top3[2].avgScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Điểm cao nhất</span>
                    <span className="font-black text-base text-amber-300">{top3[2].maxScore}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Đã nộp</span>
                    <span className="font-black text-base text-purple-300">{top3[2].examCount} đề</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. THANH BỘ LỌC ĐÓNG KHUNG KÍNH MỜ */}
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
              <option value="all">Tất cả lớp phụ trách</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo đề thi */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <span className="hidden sm:inline">Đề:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-800/80 border border-cyan-500/30 text-white text-xs font-semibold focus:border-cyan-400 transition-colors max-w-[200px] truncate"
            >
              <option value="all">Tất cả các đề thi</option>
              {exams.map(ex => (
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

      {/* 5. BẢNG XẾP HẠNG CHI TIẾT (FULL TABLE) ĐÓNG KHUNG NEON */}
      <div className="rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,12,40,0.5)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white m-0">
              Danh Sách Xếp Hạng ({studentRankings.length} học sinh)
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
                        ) : (
                          <span className="font-bold text-slate-400 group-hover:text-cyan-300">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Cột Học Sinh */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center font-bold text-cyan-300 shrink-0">
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

      {/* 6. MODAL XEM CHI TIẾT CÁC LẦN NỘP CỦA HỌC SINH */}
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
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
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
                Chi Tiết Các Đợt Thi Đã Nộp:
              </h4>

              <div className="space-y-2.5">
                {viewingStudent.results.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có kết quả nộp bài.</p>
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
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-colors"
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
