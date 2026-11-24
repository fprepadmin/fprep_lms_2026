'use client';

import React, { useState } from 'react';
import { 
  ClipboardList, Award, Clock, ChevronRight, CheckCircle2, 
  ChevronDown, ChevronUp, BookOpen, Search, Sparkles,
  FileCheck, Target, Layers, ArrowRight, RotateCcw, Calendar, TrendingUp, Trophy
} from 'lucide-react';
import Link from 'next/link';

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
  | 'dgnl';

interface ExamResult {
  id: string;
  exam_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  created_at: string;
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

        <div className="pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-3 font-body">
          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold">
            {hasTaken ? `Đúng ${bestRes?.correct_answers}/${bestRes?.total_questions} câu` : 'Chưa làm bài'}
          </span>

          <Link
            href={`/dashboard/student/exams/${exam.id}`}
            className={hasTaken 
              ? "px-3.5 py-1.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 dark:bg-slate-800 text-[#14213D] dark:text-white border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer" 
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
  ];

  const getCatTheme = (id: string, isActive: boolean) => {
    if (id === 'topic') {
      return {
        card: isActive 
          ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400/50' 
          : 'bg-[#081a3a]/80 border-emerald-500/25 hover:border-emerald-400/50 hover:bg-[#0c2752]/90',
        icon: isActive ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        badge: isActive ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
      };
    }
    if (id.includes('term') || id === 'regular') {
      return {
        card: isActive 
          ? 'bg-orange-500/20 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.35)] ring-1 ring-orange-400/50' 
          : 'bg-[#081a3a]/80 border-orange-500/25 hover:border-orange-400/50 hover:bg-[#0c2752]/90',
        icon: isActive ? 'bg-orange-500/30 text-orange-300 border-orange-400/50' : 'bg-orange-500/15 text-orange-400 border-orange-500/25',
        badge: isActive ? 'bg-orange-400 text-slate-950 font-black' : 'bg-orange-500/20 text-orange-300 border border-orange-500/35'
      };
    }
    if (id === 'vsat' || id === 'dgnl') {
      return {
        card: isActive 
          ? 'bg-pink-500/20 border-pink-400 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-1 ring-pink-400/50' 
          : 'bg-[#081a3a]/80 border-pink-500/25 hover:border-pink-400/50 hover:bg-[#0c2752]/90',
        icon: isActive ? 'bg-pink-500/30 text-pink-300 border-pink-400/50' : 'bg-pink-500/15 text-pink-400 border-pink-500/25',
        badge: isActive ? 'bg-pink-400 text-slate-950 font-black' : 'bg-pink-500/20 text-pink-300 border border-pink-500/35'
      };
    }
    // thptqg or default
    return {
      card: isActive 
        ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.35)] ring-1 ring-cyan-400/50' 
        : 'bg-[#081a3a]/80 border-cyan-500/25 hover:border-cyan-400/50 hover:bg-[#0c2752]/90',
      icon: isActive ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/50' : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
      badge: isActive ? 'bg-cyan-400 text-slate-950 font-black' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/35'
    };
  };

  const currentCategoryMeta = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* BANNER VINH DANH HỌC SINH KHẢO THÍ */}
      <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-blue-900/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center font-black text-amber-300 text-lg shrink-0">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Bảng Vàng Khảo Thí Theo Tuần & Tháng
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Top 3 + Top 7
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium m-0">
              Làm bài thi để tích lũy điểm số và ghi danh vào Bảng Vàng Vinh Danh của từng môn học!
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/student/leaderboard"
          className="relative z-10 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(251,191,36,0.35)] shrink-0 self-start sm:self-auto"
        >
          <span>Xem Bảng Vàng</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* THANH TAB 9 PHÂN LOẠI ĐỀ THI CHUẨN FPREP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const themeStyle = getCatTheme(cat.id, isActive);
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-2.5 cursor-pointer backdrop-blur-md ${themeStyle.card}`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl border ${themeStyle.icon}`}>
                  {cat.icon}
                </div>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${themeStyle.badge}`}>
                  {cat.count} đề
                </span>
              </div>
              <div>
                <span className={`block text-xs sm:text-[13px] font-black tracking-wide ${isActive ? 'text-white' : 'text-slate-200'}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-slate-300 font-semibold line-clamp-1 mt-0.5">
                  {cat.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* THANH BỘ LỌC MÔN HỌC & TÌM KIẾM */}
      <div className="flat-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Lựa chọn môn học */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-black text-cyan-300 uppercase shrink-0 mr-1 flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-cyan-400" /> Môn học:
          </span>
          {subjects.map((sub) => {
            const isSelected = selectedSubjectId === sub.id;
            const subExamCount = exams.filter(e => e.subject_id === sub.id).length;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(13,110,253,0.45)] font-black'
                    : 'bg-slate-800/60 text-slate-300 border-cyan-500/20 hover:border-cyan-400/40 hover:bg-slate-800/90'
                }`}
              >
                <span>{sub.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-slate-700/60 text-slate-400'
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
            className="w-full bg-slate-900/60 border border-cyan-500/30 rounded-xl px-3 py-1.5 pl-8 text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-colors"
          />
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

      </div>

      {/* NỘI DUNG THEO TỪNG TAB */}
      
      {/* 1. NẾU LÀ TAB LUYỆN TẬP THEO BÀI & CHỦ ĐỀ (MÔN > CHƯƠNG > BÀI) */}
      {activeCategory === 'topic' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2 m-0">
                <BookOpen className="h-4.5 w-4.5 text-cyan-400" />
                Luyện tập môn {selectedSubject?.name} theo Chủ đề & Bài học
              </h3>
              <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                Chọn chương học và mở từng bài để làm bài tập trắc nghiệm củng cố kiến thức theo chủ đề.
              </p>
            </div>
          </div>

          {subjectChapters.length === 0 ? (
            <div className="text-center py-16 flat-card border-dashed">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-bold text-muted-foreground text-sm m-0">Chưa có dữ liệu bài học cho môn học này.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectChapters.map((chap, chapIdx) => {
                const isExpanded = expandedChapters[chap.id] !== false; // Mặc định mở
                const lessons = chap.lessons || [];

                return (
                  <div key={chap.id} className="flat-card p-0 overflow-hidden shadow-sm">
                    {/* Header Chương */}
                    <button
                      onClick={() => toggleChapter(chap.id)}
                      className="w-full p-4 flex items-center justify-between bg-slate-900/50 hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 font-black text-xs flex items-center justify-center border border-cyan-400/30 shrink-0">
                          {chapIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-[15px] text-white m-0">{chap.title}</h4>
                          <span className="text-[11px] text-slate-400 font-semibold">{lessons.length} Bài học</span>
                        </div>
                      </div>
                      <div className="p-1 text-slate-400">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-cyan-400" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {/* Danh sách Bài học & Đề thi tương ứng */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-4 border-t border-cyan-500/20 bg-slate-950/20">
                        {lessons.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-2 m-0">Chưa có bài học trong chương này.</p>
                        ) : (
                          lessons.map((les, lesIdx) => {
                            const lessonExams = exams.filter(e => e.lesson_id === les.id || (categorizeExam(e) === 'topic' && e.title.toLowerCase().includes(`bài ${lesIdx + 1}`)));

                            return (
                              <div key={les.id} className="space-y-2.5 pl-3 border-l-2 border-cyan-400/50">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-bold text-[13px] sm:text-[14px] text-white flex items-center gap-2 m-0">
                                    <span className="text-cyan-400 font-bold">Bài {lesIdx + 1}:</span> {les.title}
                                  </h5>
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded">
                                    {lessonExams.length} Đề luyện tập
                                  </span>
                                </div>

                                {lessonExams.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic pl-2 m-0">Chưa có đề luyện tập cho bài học này.</p>
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
      ) : (
        /* 2. CÁC PHÂN LOẠI ĐỀ THI KHÁC (THƯỜNG XUYÊN, GIỮA KỲ, CUỐI KỲ, THPTQG, VSAT, ĐGNL) */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2 m-0">
                <span className="text-cyan-400">{currentCategoryMeta.icon}</span>
                {currentCategoryMeta.label} ({selectedSubject?.name})
              </h3>
              <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                {currentCategoryMeta.desc}
              </p>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="text-center py-16 flat-card border-dashed">
              <span className="inline-block p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-3">
                {currentCategoryMeta.icon}
              </span>
              <p className="font-bold text-muted-foreground text-sm m-0">
                Hiện chưa có đề thi thuộc mục "{currentCategoryMeta.label}" cho môn {selectedSubject?.name}.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map(renderExamCard)}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
