'use client';

import React, { useState } from 'react';
import { 
  ClipboardList, Award, Clock, ChevronRight, CheckCircle2, 
  ChevronDown, ChevronUp, BookOpen, Search, Sparkles,
  FileCheck, Target, Layers, ArrowRight, RotateCcw, Calendar, TrendingUp, Trophy,
  History, Eye, FileText, Check, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import StudentSubmissionDetailModal from '@/components/exam/StudentSubmissionDetailModal';

interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
}

interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  order_index: number;
  lessons?: Lesson[];
}

interface Subject {
  id: string;
  name: string;
  group_type: string;
}

interface Exam {
  id: string;
  subject_id: string;
  lesson_id?: string | null;
  title: string;
  duration_minutes: number;
  exam_type?: string;
  subjects?: { name: string };
  lessons?: { title: string; chapter_id: string };
}

export type StudentExamCategory = 
  | 'topic' 
  | 'regular' 
  | 'mid_term_1' 
  | 'final_term_1' 
  | 'mid_term_2' 
  | 'final_term_2' 
  | 'thptqg' 
  | 'vsat' 
  | 'dgnl'
  | 'history';

interface ExamResult {
  id: string;
  exam_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  created_at: string;
  answers?: any;
  exams?: any;
}

interface StudentExamsClientProps {
  subjects: Subject[];
  chapters: Chapter[];
  exams: Exam[];
  examResults: ExamResult[];
  studentId: string;
}

export default function StudentExamsClient({
  subjects,
  chapters,
  exams,
  examResults,
  studentId
}: StudentExamsClientProps) {
  const [activeCategory, setActiveCategory] = useState<StudentExamCategory>('topic');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [inspectingSubmission, setInspectingSubmission] = useState<any | null>(null);

  // Toggle thu phóng Chương
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Helper lấy kết quả cao nhất của đề thi
  const getBestResult = (examId: string) => {
    const results = examResults.filter(r => r.exam_id === examId);
    if (results.length === 0) return null;
    return results.reduce((prev, curr) => (Number(curr.score) > Number(prev.score) ? curr : prev), results[0]);
  };

  // Phân loại đề thi thông minh chuẩn 9 nhóm chuyên biệt FPREP
  const categorizeExam = (exam: Exam): StudentExamCategory => {
    const rawType = exam.exam_type;
    if (rawType) {
      if (rawType === 'topic' || rawType === 'lesson') return 'topic';
      if (rawType === 'regular') return 'regular';
      if (rawType === 'mid_term_1') return 'mid_term_1';
      if (rawType === 'final_term_1') return 'final_term_1';
      if (rawType === 'mid_term_2') return 'mid_term_2';
      if (rawType === 'final_term_2') return 'final_term_2';
      if (rawType === 'thptqg') return 'thptqg';
      if (rawType === 'vsat') return 'vsat';
      if (rawType === 'dgnl') return 'dgnl';
    }

    const title = (exam.title || '').toLowerCase();
    if (title.includes('vsat') || title.includes('v-sat')) return 'vsat';
    if (title.includes('đgnl') || title.includes('đánh giá năng lực') || title.includes('tsa') || title.includes('hsa') || title.includes('tư duy')) return 'dgnl';
    if (title.includes('thpt') || title.includes('tốt nghiệp') || title.includes('quốc gia') || title.includes('thi thử')) return 'thptqg';
    
    // Giữa kỳ & Cuối kỳ
    if (title.includes('giữa kỳ 1') || title.includes('giữa kì 1') || title.includes('gki 1') || title.includes('gk 1') || title.includes('gk1')) return 'mid_term_1';
    if (title.includes('cuối kỳ 1') || title.includes('cuối kì 1') || title.includes('cki 1') || title.includes('ck 1') || title.includes('ck1') || title.includes('học kỳ 1') || title.includes('học kì 1') || title.includes('hk1') || title.includes('hk 1')) return 'final_term_1';
    if (title.includes('giữa kỳ 2') || title.includes('giữa kì 2') || title.includes('gki 2') || title.includes('gk 2') || title.includes('gk2')) return 'mid_term_2';
    if (title.includes('cuối kỳ 2') || title.includes('cuối kì 2') || title.includes('cki 2') || title.includes('ck 2') || title.includes('ck2') || title.includes('học kỳ 2') || title.includes('học kì 2') || title.includes('hk2') || title.includes('hk 2')) return 'final_term_2';

    // Thường xuyên
    if (title.includes('thường xuyên') || title.includes('15p') || title.includes('15 phút') || title.includes('10p') || title.includes('miệng')) return 'regular';

    // Xử lý các đề gán 'test' cũ trong database
    if (rawType === 'test') {
      if (title.includes('giữa') || title.includes('45') || title.includes('1 tiết')) return 'mid_term_1';
      if (title.includes('cuối') || title.includes('học kỳ')) return 'final_term_1';
      return 'regular';
    }

    if (exam.lesson_id || title.includes('chủ đề') || title.includes('chuyên đề') || title.includes('bài tập') || title.includes('luyện tập')) return 'topic';

    return 'topic';
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
  const subjectChapters = chapters.filter(c => c.subject_id === selectedSubject?.id);

  // Đề thi đã lọc theo danh mục & môn
  const filteredExams = exams.filter(exam => {
    const cat = categorizeExam(exam);
    if (cat !== activeCategory) return false;
    if (activeCategory !== 'topic' && selectedSubjectId && exam.subject_id !== selectedSubjectId) {
      if (selectedSubjectId !== 'all' && exam.subject_id !== selectedSubjectId) return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      return (exam.title || '').toLowerCase().includes(kw);
    }
    return true;
  });

  // Render thẻ đề thi chuẩn Future Blue 2.0
  const renderExamCard = (exam: Exam) => {
    const bestRes = getBestResult(exam.id);
    const hasTaken = Boolean(bestRes);

    return (
      <div 
        key={exam.id}
        className="p-5 rounded-[18px] bg-white dark:bg-[#0B1B55]/70 border border-[#E2E8F0] dark:border-[#1B317A] flex flex-col justify-between gap-4 shadow-[0_4px_20px_-2px_rgba(11,27,85,0.04)] hover:shadow-[0_8px_30px_rgba(23,70,209,0.12)] hover:border-[#1746D1]/40 transition-all group"
      >
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 
              className="font-bold font-heading text-[15px] text-[#14213D] dark:text-white line-clamp-3 break-words m-0 leading-snug group-hover:text-[#1746D1] transition-colors"
              title={exam.title}
            >
              {exam.title}
            </h4>
            {hasTaken ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-black shrink-0 font-body">
                {bestRes?.score}/10đ
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#1746D1] dark:text-blue-300 text-[10px] font-bold shrink-0 font-body">
                Mới
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold font-body">
            <span className="flex items-center gap-1 text-[#64748B] dark:text-slate-300 bg-[#F1F5F9] dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-[#E2E8F0] dark:border-slate-700 text-[11px]">
              <Clock className="h-3 w-3 text-[#1746D1] dark:text-cyan-400" /> {exam.duration_minutes} phút
            </span>
            {exam.subjects?.name && (
              <span className="bg-[#1746D1]/10 text-[#1746D1] dark:text-blue-300 border border-[#1746D1]/20 px-2.5 py-0.5 rounded-md text-[10px] font-bold">
                {exam.subjects.name}
              </span>
            )}
            {hasTaken && (
              <span className="text-[#16A36A] text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16A36A]" /> Đã nộp bài
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2 font-body">
          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold truncate">
            {hasTaken ? `Đúng ${bestRes?.correct_answers}/${bestRes?.total_questions} câu` : 'Chưa làm bài'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasTaken && (
              <button
                type="button"
                onClick={() => {
                  setInspectingSubmission({
                    ...bestRes,
                    exams: exam
                  });
                }}
                className="px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                title="Xem lại bài đã làm"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Xem lại</span>
              </button>
            )}

            <Link
              href={`/dashboard/student/exams/${exam.id}`}
              className={hasTaken 
                ? "px-2.5 py-1.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 dark:bg-slate-800 text-[#14213D] dark:text-white border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer" 
                : "px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#0B1B55] to-[#1746D1] hover:opacity-95 text-white shadow-xs text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"}
            >
              {hasTaken ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5" /> Luyện lại
                </>
              ) : (
                <>
                  Làm bài ngay <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const categories = [
    { id: 'topic', label: 'LUYỆN THEO CHỦ ĐỀ', icon: <BookOpen className="h-4 w-4" />, desc: 'Luyện tập theo từng bài học & chủ đề', count: exams.filter(e => categorizeExam(e) === 'topic').length },
    { id: 'regular', label: 'KT THƯỜNG XUYÊN', icon: <Clock className="h-4 w-4" />, desc: 'Kiểm tra 15 phút, đánh giá thường xuyên', count: exams.filter(e => categorizeExam(e) === 'regular').length },
    { id: 'mid_term_1', label: 'KT GIỮA KỲ 1', icon: <Calendar className="h-4 w-4" />, desc: 'Đề kiểm tra giữa học kỳ 1', count: exams.filter(e => categorizeExam(e) === 'mid_term_1').length },
    { id: 'final_term_1', label: 'KT CUỐI KỲ 1', icon: <CheckCircle2 className="h-4 w-4" />, desc: 'Đề kiểm tra cuối học kỳ 1', count: exams.filter(e => categorizeExam(e) === 'final_term_1').length },
    { id: 'mid_term_2', label: 'KT GIỮA KỲ 2', icon: <Calendar className="h-4 w-4" />, desc: 'Đề kiểm tra giữa học kỳ 2', count: exams.filter(e => categorizeExam(e) === 'mid_term_2').length },
    { id: 'final_term_2', label: 'KT CUỐI KỲ 2', icon: <CheckCircle2 className="h-4 w-4" />, desc: 'Đề kiểm tra cuối học kỳ 2', count: exams.filter(e => categorizeExam(e) === 'final_term_2').length },
    { id: 'thptqg', label: 'THI THỬ TỐT NGHIỆP', icon: <Target className="h-4 w-4" />, desc: 'Bộ đề thi thử Tốt nghiệp THPT Quốc Gia', count: exams.filter(e => categorizeExam(e) === 'thptqg').length },
    { id: 'vsat', label: 'KỲ THI V-SAT', icon: <TrendingUp className="h-4 w-4" />, desc: 'Đề thi đánh giá năng lực đầu vào V-SAT', count: exams.filter(e => categorizeExam(e) === 'vsat').length },
    { id: 'dgnl', label: 'ĐGNL / TSA', icon: <Sparkles className="h-4 w-4" />, desc: 'Bộ đề ôn luyện Đánh giá Năng lực HSA, TSA', count: exams.filter(e => categorizeExam(e) === 'dgnl').length },
    { id: 'history', label: 'LỊCH SỬ LÀM BÀI', icon: <History className="h-4 w-4" />, desc: 'Xem lại bài thi & đáp án đã nộp', count: examResults.length },
  ];

  const getCatTheme = (id: string, isActive: boolean) => {
    if (isActive) {
      return {
        card: 'bg-gradient-to-br from-[#0B1B55] via-[#1746D1] to-[#087CFF] border-[#087CFF] text-white shadow-lg shadow-blue-500/25 ring-2 ring-[#00DFFF]/40',
        icon: 'bg-white/15 text-[#00DFFF] border-white/25',
        badge: 'bg-white text-[#0B1B55] font-black shadow-2xs',
        title: 'text-white',
        desc: 'text-blue-100/90'
      };
    }

    if (id === 'history') {
      return {
        card: 'bg-white dark:bg-[#0B1B55]/90 border-[#E2E8F0] dark:border-[#1B317A] hover:border-cyan-400 hover:shadow-md shadow-sm',
        icon: 'bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200/70 dark:border-cyan-500/30',
        badge: 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/35',
        title: 'text-[#14213D] dark:text-white',
        desc: 'text-[#64748B] dark:text-slate-400'
      };
    }

    if (id === 'topic') {
      return {
        card: 'bg-white dark:bg-[#0B1B55]/90 border-[#E2E8F0] dark:border-[#1B317A] hover:border-emerald-400 hover:shadow-md shadow-sm',
        icon: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-500/30',
        badge: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/35',
        title: 'text-[#14213D] dark:text-white',
        desc: 'text-[#64748B] dark:text-slate-400'
      };
    }
    if (id.includes('term') || id === 'regular') {
      return {
        card: 'bg-white dark:bg-[#0B1B55]/90 border-[#E2E8F0] dark:border-[#1B317A] hover:border-orange-400 hover:shadow-md shadow-sm',
        icon: 'bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200/70 dark:border-orange-500/30',
        badge: 'bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/35',
        title: 'text-[#14213D] dark:text-white',
        desc: 'text-[#64748B] dark:text-slate-400'
      };
    }
    if (id === 'vsat' || id === 'dgnl') {
      return {
        card: 'bg-white dark:bg-[#0B1B55]/90 border-[#E2E8F0] dark:border-[#1B317A] hover:border-purple-400 hover:shadow-md shadow-sm',
        icon: 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200/70 dark:border-purple-500/30',
        badge: 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/35',
        title: 'text-[#14213D] dark:text-white',
        desc: 'text-[#64748B] dark:text-slate-400'
      };
    }
    // thptqg or default
    return {
      card: 'bg-white dark:bg-[#0B1B55]/90 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#087CFF] hover:shadow-md shadow-sm',
      icon: 'bg-blue-50 dark:bg-blue-500/15 text-[#1746D1] dark:text-cyan-400 border-blue-200/70 dark:border-cyan-500/30',
      badge: 'bg-blue-50 dark:bg-blue-500/20 text-[#1746D1] dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/35',
      title: 'text-[#14213D] dark:text-white',
      desc: 'text-[#64748B] dark:text-slate-400'
    };
  };

  const currentCategoryMeta = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* BANNER VINH DANH HỌC SINH KHẢO THÍ - FUTURE BLUE 2.0 */}
      <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1B317A] bg-gradient-to-r from-amber-50/90 via-white to-blue-50/70 dark:from-[#0B1B55] dark:via-[#12266B] dark:to-[#0B1B55] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-xl bg-amber-100/90 dark:bg-amber-400/20 border border-amber-300/80 dark:border-amber-400/40 flex items-center justify-center font-black text-amber-600 dark:text-amber-300 text-lg shrink-0">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-[#14213D] dark:text-white uppercase tracking-wide">
                Bảng Vàng Khảo Thí Theo Tuần & Tháng
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
                Top 3 + Top 7
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-300 font-medium m-0 mt-0.5">
              Làm bài thi để tích lũy điểm số và ghi danh vào Bảng Vàng Vinh Danh của từng môn học!
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/student/leaderboard"
          className="relative z-10 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm shrink-0 self-start sm:self-auto"
        >
          <span>Xem Bảng Vàng</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* THANH TAB 9 PHÂN LOẠI ĐỀ THI CHUẨN FUTURE BLUE 2.0 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const themeStyle = getCatTheme(cat.id, isActive);
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-3 cursor-pointer hover:-translate-y-0.5 ${themeStyle.card}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={`p-2 rounded-xl border ${themeStyle.icon}`}>
                  {cat.icon}
                </div>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${themeStyle.badge}`}>
                  {cat.count} đề
                </span>
              </div>
              <div>
                <span className={`block text-xs sm:text-[13px] font-extrabold tracking-tight ${themeStyle.title}`}>
                  {cat.label}
                </span>
                <span className={`text-[11px] font-medium line-clamp-1 mt-0.5 block ${themeStyle.desc}`}>
                  {cat.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* THANH BỘ LỌC MÔN HỌC & TÌM KIẾM */}
      <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Lựa chọn môn học */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 max-w-full">
          <span className="text-xs font-extrabold text-[#1746D1] dark:text-[#00DFFF] uppercase shrink-0 mr-1 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-[#1746D1] dark:text-[#00DFFF]" /> Môn học:
          </span>
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            const subExamCount = exams.filter(e => e.subject_id === sub.id).length;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[#0B1B55] dark:bg-[#1746D1] text-white border-[#0B1B55] dark:border-[#087CFF] shadow-sm font-extrabold'
                    : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/40 hover:bg-blue-50 dark:hover:bg-[#15276B] hover:text-[#1746D1]'
                }`}
              >
                <span>{sub.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white dark:bg-[#0B1B55] text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-[#1B317A]'
                }`}>
                  {subExamCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ô tìm kiếm đề */}
        <div className="relative w-full md:w-64 shrink-0">
          <input
            type="text"
            placeholder="Tìm kiếm đề thi..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-[#F8FAFC] dark:bg-[#0D2063] border border-[#E2E8F0] dark:border-[#1B317A] rounded-xl px-3 py-2 pl-8 text-xs font-semibold text-[#14213D] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1746D1] focus:ring-2 focus:ring-[#1746D1]/15 transition-colors"
          />
          <Search className="h-3.5 w-3.5 text-[#64748B] dark:text-slate-400 absolute left-2.5 top-2.5" />
        </div>

      </div>

      {/* NỘI DUNG THEO TỪNG TAB */}
      
      {/* 1. NẾU LÀ TAB LUYỆN TẬP THEO BÀI & CHỦ ĐỀ (MÔN > CHƯƠNG > BÀI) */}
      {activeCategory === 'topic' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold font-heading text-[#14213D] dark:text-white flex items-center gap-2 m-0">
                <BookOpen className="h-4.5 w-4.5 text-[#1746D1] dark:text-[#00DFFF]" />
                Luyện tập môn {selectedSubject?.name} theo Chủ đề & Bài học
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium m-0 mt-0.5">
                Chọn chương học và mở từng bài để làm bài tập trắc nghiệm củng cố kiến thức theo chủ đề.
              </p>
            </div>
          </div>

          {subjectChapters.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#0B1B55]/90 border border-dashed border-[#CBD5E1] dark:border-[#1B317A] rounded-2xl">
              <BookOpen className="h-10 w-10 text-[#94A3B8] mx-auto mb-3 opacity-50" />
              <p className="font-bold text-[#64748B] dark:text-slate-400 text-sm m-0">Chưa có dữ liệu bài học cho môn học này.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectChapters.map((chap, chapIdx) => {
                const isExpanded = expandedChapters[chap.id] !== false; // Mặc định mở
                const lessons = chap.lessons || [];

                return (
                  <div key={chap.id} className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl overflow-hidden shadow-sm">
                    {/* Header Chương */}
                    <button
                      onClick={() => toggleChapter(chap.id)}
                      className="w-full p-4 flex items-center justify-between bg-[#F8FAFC] dark:bg-[#0D2063]/80 hover:bg-blue-50/70 dark:hover:bg-[#15276B] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-[#1746D1] dark:text-[#00DFFF] font-black text-xs flex items-center justify-center border border-blue-200 dark:border-blue-500/30 shrink-0">
                          {chapIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-extrabold text-[15px] text-[#14213D] dark:text-white m-0">{chap.title}</h4>
                          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold">{lessons.length} Bài học</span>
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg text-[#64748B] dark:text-slate-400">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-[#1746D1] dark:text-[#00DFFF]" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {/* Danh sách Bài học & Đề thi tương ứng */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-4 border-t border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0B1B55]/60">
                        {lessons.length === 0 ? (
                          <p className="text-xs text-[#64748B] dark:text-slate-400 italic pl-2 m-0">Chưa có bài học trong chương này.</p>
                        ) : (
                          lessons.map((les, lesIdx) => {
                            const lessonExams = exams.filter(e => e.lesson_id === les.id || (categorizeExam(e) === 'topic' && e.title.toLowerCase().includes(`bài ${lesIdx + 1}`)));

                            return (
                              <div key={les.id} className="space-y-2.5 pl-3.5 border-l-2 border-[#1746D1]/35 dark:border-[#00DFFF]/40">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="font-bold text-[13px] sm:text-[14px] text-[#14213D] dark:text-white flex items-center gap-2 m-0">
                                    <span className="text-[#1746D1] dark:text-[#00DFFF] font-extrabold">Bài {lesIdx + 1}:</span> {les.title}
                                  </h5>
                                  <span className="text-[10px] font-bold text-[#1746D1] dark:text-cyan-300 bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                                    {lessonExams.length} Đề luyện tập
                                  </span>
                                </div>

                                {lessonExams.length === 0 ? (
                                  <p className="text-xs text-[#64748B] dark:text-slate-400 italic pl-2 m-0">Chưa có đề luyện tập cho bài học này.</p>
                                ) : (
                                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                                    {lessonExams.map(renderExamCard)}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeCategory === 'history' ? (
        /* 2. LỊCH SỬ LÀM BÀI CỦA HỌC SINH */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3 gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold font-heading text-[#14213D] dark:text-white flex items-center gap-2 m-0">
                <History className="h-5 w-5 text-[#1746D1] dark:text-[#00DFFF]" />
                Lịch Sử Làm Bài & Khảo Thí Của Bạn ({examResults.length} lượt nộp)
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium m-0 mt-0.5">
                Xem lại chi tiết từng lần làm bài: điểm số, câu đúng, câu sai, đáp án bạn đã chọn và lời giải chi tiết.
              </p>
            </div>

            {examResults.length > 0 && (
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-xl shrink-0 self-start sm:self-auto">
                Điểm TB: {(examResults.reduce((sum, r) => sum + Number(r.score || 0), 0) / examResults.length).toFixed(1)}/10đ
              </span>
            )}
          </div>

          {examResults.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#0B1B55]/90 border border-dashed border-[#CBD5E1] dark:border-[#1B317A] rounded-2xl">
              <History className="h-10 w-10 text-[#94A3B8] mx-auto mb-3 opacity-50" />
              <p className="font-bold text-[#64748B] dark:text-slate-400 text-sm m-0">
                Bạn chưa hoàn thành bài thi nào.
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Hãy chọn một đề thi và bắt đầu thử sức ngay để theo dõi tiến độ học tập!
              </p>
              <button
                onClick={() => setActiveCategory('topic')}
                className="btn-primary text-xs py-2 px-5 font-bold shadow-xs inline-flex items-center gap-1.5"
              >
                <BookOpen className="h-3.5 w-3.5" /> Bắt đầu luyện tập
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {examResults
                .filter(res => {
                  if (!searchKeyword.trim()) return true;
                  const kw = searchKeyword.toLowerCase();
                  const title = (res.exams?.title || exams.find(e => e.id === res.exam_id)?.title || '').toLowerCase();
                  return title.includes(kw);
                })
                .map((res, idx) => {
                  const examItem = res.exams || exams.find(e => e.id === res.exam_id);
                  const examTitle = examItem?.title || 'Đề thi trắc nghiệm';
                  const subjectName = examItem?.subjects?.name || subjects.find(s => s.id === examItem?.subject_id)?.name;
                  const dateStr = new Date(res.created_at).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });

                  return (
                    <div
                      key={res.id || idx}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1B55]/80 border border-[#E2E8F0] dark:border-[#1B317A] shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 border font-black ${
                          res.score >= 8
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : res.score >= 5
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                        }`}>
                          <span className="text-base leading-none">{res.score}</span>
                          <span className="text-[9px] opacity-75">điểm</span>
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-foreground m-0 truncate" title={examTitle}>
                              {examTitle}
                            </h4>
                            {subjectName && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                {subjectName}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {dateStr}
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Đúng {res.correct_answers}/{res.total_questions} câu
                            </span>
                            <span>&bull;</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" /> {Math.floor((res.time_spent_seconds || 0) / 60)}p {(res.time_spent_seconds || 0) % 60}s
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setInspectingSubmission({
                              ...res,
                              exams: examItem || { title: examTitle }
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Xem lại bài làm</span>
                        </button>

                        {res.exam_id && (
                          <Link
                            href={`/dashboard/student/exams/${res.exam_id}`}
                            className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Làm lại</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* 3. CÁC PHÂN LOẠI ĐỀ THI KHÁC (THƯỜNG XUYÊN, GIỮA KỲ, CUỐI KỲ, THPTQG, VSAT, ĐGNL) */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold font-heading text-[#14213D] dark:text-white flex items-center gap-2 m-0">
                <span className="text-[#1746D1] dark:text-[#00DFFF]">{currentCategoryMeta.icon}</span>
                {currentCategoryMeta.label} ({selectedSubject?.name})
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium m-0 mt-0.5">
                {currentCategoryMeta.desc}
              </p>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#0B1B55]/90 border border-dashed border-[#CBD5E1] dark:border-[#1B317A] rounded-2xl">
              <span className="inline-block p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-[#1746D1] dark:text-[#00DFFF] mb-3">
                {currentCategoryMeta.icon}
              </span>
              <p className="font-bold text-[#64748B] dark:text-slate-400 text-sm m-0">
                Hiện chưa có đề thi thuộc mục &quot;{currentCategoryMeta.label}&quot; cho môn {selectedSubject?.name}.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map(renderExamCard)}
            </div>
          )}
        </div>
      )}

      {/* MODAL XEM CHI TIẾT BÀI LÀM ĐÃ NỘP CỦA HỌC SINH */}
      <StudentSubmissionDetailModal
        isOpen={Boolean(inspectingSubmission)}
        onClose={() => setInspectingSubmission(null)}
        submission={inspectingSubmission}
      />

    </div>
  );
}
