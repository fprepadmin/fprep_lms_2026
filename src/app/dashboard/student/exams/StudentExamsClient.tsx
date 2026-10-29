'use client';

import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Award, Clock, ChevronRight, CheckCircle2, 
  BookOpen, Search, Sparkles, FileCheck, Target, Layers, 
  ArrowRight, RotateCcw, Filter, Eye, Check, X, SlidersHorizontal,
  GraduationCap, HelpCircle, Trophy, BarChart3, AlertCircle
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
  exam_type?: 'lesson' | 'test' | 'thptqg' | 'dgnl';
  subjects?: { name: string };
  lessons?: { title: string; chapter_id: string };
}

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

// Bảng màu nhận diện thương hiệu chuẩn từng môn học
const getSubjectTheme = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('toán')) {
    return {
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      dot: 'bg-blue-500',
      borderHover: 'hover:border-blue-500/60',
      tag: 'Toán học'
    };
  }
  if (n.includes('lý') || n.includes('vật')) {
    return {
      badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      dot: 'bg-amber-500',
      borderHover: 'hover:border-amber-500/60',
      tag: 'Vật lý'
    };
  }
  if (n.includes('hóa')) {
    return {
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
      borderHover: 'hover:border-emerald-500/60',
      tag: 'Hóa học'
    };
  }
  if (n.includes('sinh')) {
    return {
      badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      dot: 'bg-teal-500',
      borderHover: 'hover:border-teal-500/60',
      tag: 'Sinh học'
    };
  }
  if (n.includes('tin')) {
    return {
      badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      dot: 'bg-purple-500',
      borderHover: 'hover:border-purple-500/60',
      tag: 'Tin học'
    };
  }
  if (n.includes('anh') || n.includes('tiếng')) {
    return {
      badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      dot: 'bg-indigo-500',
      borderHover: 'hover:border-indigo-500/60',
      tag: 'Tiếng Anh'
    };
  }
  return {
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dot: 'bg-slate-500',
    borderHover: 'hover:border-primary/60',
    tag: name || 'Bộ môn'
  };
};

export default function StudentExamsClient({
  subjects,
  chapters,
  exams,
  examResults,
  studentId
}: StudentExamsClientProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'lesson' | 'test' | 'thptqg' | 'dgnl'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncompleted' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'score' | 'duration'>('latest');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Helper lấy kết quả nộp bài tốt nhất của đề thi
  const getBestResult = (examId: string) => {
    const results = examResults.filter(r => r.exam_id === examId);
    if (results.length === 0) return null;
    return results.reduce((prev, curr) => (Number(curr.score) > Number(prev.score) ? curr : prev), results[0]);
  };

  // Phân loại đề thi thông minh
  const categorizeExam = (exam: Exam): 'lesson' | 'test' | 'thptqg' | 'dgnl' => {
    if (exam.exam_type) return exam.exam_type;
    const title = (exam.title || '').toLowerCase();
    if (title.includes('thpt') || title.includes('tốt nghiệp') || title.includes('quốc gia')) return 'thptqg';
    if (title.includes('đgnl') || title.includes('đánh giá năng lực') || title.includes('tư duy') || title.includes('hsa') || title.includes('aptitude')) return 'dgnl';
    if (title.includes('kiểm tra') || title.includes('15') || title.includes('45') || title.includes('giữa kỳ') || title.includes('học kỳ') || title.includes('chương')) return 'test';
    return 'lesson';
  };

  // Tính số lượng đề thi theo từng môn học
  const examCountBySubject = useMemo(() => {
    const counts: Record<string, number> = {};
    exams.forEach(e => {
      counts[e.subject_id] = (counts[e.subject_id] || 0) + 1;
    });
    return counts;
  }, [exams]);

  // Bộ lọc tổng hợp (Category + Môn học + Trạng thái đã/chưa làm + Tìm kiếm + Sắp xếp)
  const filteredExams = useMemo(() => {
    return exams
      .filter(exam => {
        // 1. Phân loại danh mục
        if (activeCategory !== 'all') {
          const cat = categorizeExam(exam);
          if (cat !== activeCategory) return false;
        }
        
        // 2. Môn học
        if (selectedSubjectId !== 'all' && exam.subject_id !== selectedSubjectId) {
          return false;
        }

        // 3. Trạng thái nộp bài
        const bestRes = getBestResult(exam.id);
        if (statusFilter === 'completed' && !bestRes) return false;
        if (statusFilter === 'uncompleted' && Boolean(bestRes)) return false;

        // 4. Từ khóa tìm kiếm
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase();
          const matchTitle = (exam.title || '').toLowerCase().includes(kw);
          const matchSubject = (exam.subjects?.name || '').toLowerCase().includes(kw);
          return matchTitle || matchSubject;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          const resA = getBestResult(a.id)?.score ?? -1;
          const resB = getBestResult(b.id)?.score ?? -1;
          return Number(resB) - Number(resA);
        }
        if (sortBy === 'duration') {
          return (b.duration_minutes || 0) - (a.duration_minutes || 0);
        }
        // Mặc định: theo thứ tự đề thi
        return a.title.localeCompare(b.title, 'vi');
      });
  }, [exams, activeCategory, selectedSubjectId, statusFilter, sortBy, searchKeyword]);

  // 5 Tab danh mục khảo thí lớn
  const categories = [
    { id: 'all', label: 'TẤT CẢ ĐỀ THI', icon: <Layers className="h-4 w-4" />, desc: 'Kho đề toàn diện mọi thể loại' },
    { id: 'test', label: 'KIỂM TRA ĐỊNH KỲ', icon: <FileCheck className="h-4 w-4" />, desc: '15p, 45p, giữa kỳ & cuối kỳ' },
    { id: 'thptqg', label: 'THI THỬ THPTQG', icon: <Target className="h-4 w-4" />, desc: 'Ma trận chuẩn Bộ GD&ĐT 2026' },
    { id: 'dgnl', label: 'LUYỆN THI ĐGNL', icon: <Sparkles className="h-4 w-4" />, desc: 'ĐGNL ĐHQG & Tư duy ĐHBK' },
    { id: 'lesson', label: 'THEO BÀI HỌC', icon: <BookOpen className="h-4 w-4" />, desc: 'Củng cố kiến thức từng bài' },
  ];

  // Render thẻ đề thi sang trọng, hiện đại, chuẩn FPREP
  const renderExamCard = (exam: Exam) => {
    const bestRes = getBestResult(exam.id);
    const hasTaken = Boolean(bestRes);
    const subjectName = exam.subjects?.name || subjects.find(s => s.id === exam.subject_id)?.name || 'Bộ môn';
    const theme = getSubjectTheme(subjectName);
    const category = categorizeExam(exam);

    const categoryLabel = 
      category === 'thptqg' ? 'THPTQG 2026' :
      category === 'dgnl' ? 'Khảo thí ĐGNL' :
      category === 'test' ? 'Khảo thí định kỳ' : 'Bài học';

    return (
      <div 
        key={exam.id}
        className={`group relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-5 sm:p-6 flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-2xs ${theme.borderHover}`}
      >
        {/* Header thẻ: Tên môn, Thể loại & Điểm số */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Badge môn học */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border ${theme.badge}`}>
                <span className={`h-2 w-2 rounded-full ${theme.dot} animate-pulse`} />
                {subjectName}
              </span>

              {/* Tag loại đề */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border">
                {categoryLabel}
              </span>
            </div>

            {/* Điểm số nếu đã làm bài */}
            {hasTaken ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs border border-emerald-500/30 shadow-xs">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                {bestRes?.score}đ
              </span>
            ) : (
              <span className="text-[10.5px] font-bold text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-full border border-border/80">
                Chưa làm
              </span>
            )}
          </div>

          {/* Tiêu đề đề thi */}
          <h4 
            className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug m-0 pt-0.5"
            title={exam.title}
          >
            {exam.title}
          </h4>

          {/* Thông tin phụ: Thời lượng, cấu trúc 3 phần */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground font-semibold pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60">
              <Clock className="h-3.5 w-3.5 text-primary" /> {exam.duration_minutes} phút
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> 3 dạng thức mới
            </span>
          </div>
        </div>

        {/* Footer hành động: Nút Làm bài / Xem lại bài */}
        <div className="pt-3.5 border-t border-border/70 flex items-center justify-between gap-2">
          {hasTaken ? (
            <div className="grid grid-cols-2 gap-2 w-full">
              <Link
                href={`/dashboard/student/exams/${exam.id}?review=true`}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all shadow-xs"
              >
                <Eye className="h-3.5 w-3.5" /> Xem lại bài
              </Link>
              <Link
                href={`/dashboard/student/exams/${exam.id}`}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all shadow-xs"
                title="Làm lại đề thi này để nâng cao điểm số"
              >
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" /> Luyện lại
              </Link>
            </div>
          ) : (
            <Link
              href={`/dashboard/student/exams/${exam.id}`}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-600/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Bắt đầu làm bài</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. THANH 5 TAB DANH MỤC LỚN */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-3 ${
                isActive
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                  : 'bg-card border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/60 dark:border-slate-700/60'}`}>
                  {cat.icon}
                </div>
                {isActive && (
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-xs" />
                )}
              </div>
              <div>
                <span className={`block text-xs font-black tracking-tight ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-muted-foreground line-clamp-1 font-medium mt-0.5">
                  {cat.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. THANH CÔNG CỤ BỘ LỌC TOÀN DIỆN (MÔN HỌC, TRẠNG THÁI, TÌM KIẾM, SẮP XẾP) */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-4 sm:p-5 space-y-4 shadow-sm">
        
        {/* Hàng 1: Bộ lọc Môn học dạng Pills trực quan */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-bold text-muted-foreground uppercase shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-primary" /> Môn:
          </span>
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedSubjectId === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            Tất cả ({exams.length})
          </button>
          {subjects.map((sub) => {
            const count = examCountBySubject[sub.id] || 0;
            const theme = getSubjectTheme(sub.name);
            const isSelected = selectedSubjectId === sub.id;

            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : theme.dot}`} />
                <span>{sub.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Trạng thái nộp bài, Sắp xếp và Ô tìm kiếm */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1 border-t border-border/60">
          
          {/* Lọc trạng thái làm bài */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border self-start sm:self-auto text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-primary text-white shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Tất cả đề
            </button>
            <button
              onClick={() => setStatusFilter('uncompleted')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'uncompleted' ? 'bg-primary text-white shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Chưa làm
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'completed' ? 'bg-primary text-white shadow-xs font-black' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Đã nộp bài
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-1 justify-end flex-wrap sm:flex-nowrap">
            {/* Sắp xếp */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-muted/50 border border-border text-foreground rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">Mặc định</option>
                <option value="score">Điểm cao nhất</option>
                <option value="duration">Thời lượng</option>
              </select>
            </div>

            {/* Ô tìm kiếm đề */}
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên đề thi..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-1.5 pl-8.5 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 3. DANH SÁCH ĐỀ THI HIỂN THỊ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-black font-heading text-foreground flex items-center gap-2 m-0">
              <ClipboardList className="h-5 w-5 text-primary" />
              Danh Sách Đề Thi Luyện Tập ({filteredExams.length} đề thi)
            </h3>
            <p className="text-xs text-muted-foreground font-medium m-0 mt-0.5">
              Chọn đề thi và bấm &quot;Bắt đầu làm bài&quot; để bấm giờ khảo thí trực tuyến theo chuẩn đề thi 2026.
            </p>
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card p-8 space-y-3">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
            <p className="font-bold text-foreground text-sm m-0">Không tìm thấy đề thi phù hợp với bộ lọc hiện tại.</p>
            <p className="text-xs text-muted-foreground m-0">Hãy thử đổi môn học hoặc xóa từ khóa tìm kiếm để khám phá thêm đề thi.</p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSelectedSubjectId('all');
                setStatusFilter('all');
                setSearchKeyword('');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Xóa bộ lọc xem tất cả
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExams.map(renderExamCard)}
          </div>
        )}
      </div>

    </div>
  );
}
