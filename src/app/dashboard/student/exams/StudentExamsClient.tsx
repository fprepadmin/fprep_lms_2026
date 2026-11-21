'use client';

import React, { useState } from 'react';
import { 
  ClipboardList, Award, Clock, ChevronRight, CheckCircle2, 
  ChevronDown, ChevronUp, BookOpen, Search, Sparkles,
  FileCheck, Target, Layers, ArrowRight, RotateCcw
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

export default function StudentExamsClient({
  subjects,
  chapters,
  exams,
  examResults,
  studentId
}: StudentExamsClientProps) {
  const [activeCategory, setActiveCategory] = useState<'lesson' | 'test' | 'thptqg' | 'dgnl'>('lesson');
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

  // Phân loại đề thi thông minh (nếu chưa có exam_type thì phân theo tiêu đề/lesson_id)
  const categorizeExam = (exam: Exam): 'lesson' | 'test' | 'thptqg' | 'dgnl' => {
    if (exam.exam_type) return exam.exam_type;
    const title = (exam.title || '').toLowerCase();
    if (title.includes('thpt') || title.includes('tốt nghiệp') || title.includes('quốc gia')) return 'thptqg';
    if (title.includes('đgnl') || title.includes('đánh giá năng lực') || title.includes('tư duy') || title.includes('hsa') || title.includes('aptitude')) return 'dgnl';
    if (title.includes('kiểm tra') || title.includes('15') || title.includes('45') || title.includes('giữa kỳ') || title.includes('học kỳ')) return 'test';
    if (exam.lesson_id) return 'lesson';
    return 'lesson';
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
  const subjectChapters = chapters.filter(c => c.subject_id === selectedSubject?.id);

  // Đề thi đã lọc theo danh mục & môn
  const filteredExams = exams.filter(exam => {
    const cat = categorizeExam(exam);
    if (cat !== activeCategory) return false;
    if (activeCategory !== 'lesson' && selectedSubjectId && exam.subject_id !== selectedSubjectId) {
      if (selectedSubjectId !== 'all' && exam.subject_id !== selectedSubjectId) return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      return (exam.title || '').toLowerCase().includes(kw);
    }
    return true;
  });

  // Render thẻ đề thi chuẩn FPREP
  const renderExamCard = (exam: Exam) => {
    const bestRes = getBestResult(exam.id);
    const hasTaken = Boolean(bestRes);

    return (
      <div 
        key={exam.id}
        className="flat-card flex flex-col justify-between gap-4 hover:border-cyan-400/60 transition-all hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)] group"
      >
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 
              className="font-bold text-[14px] sm:text-[15px] text-white line-clamp-3 break-words m-0 leading-snug group-hover:text-cyan-300 transition-colors"
              title={exam.title}
            >
              {exam.title}
            </h4>
            {hasTaken ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black shrink-0">
                {bestRes?.score}/10
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold shrink-0">
                Mới
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1 text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-[11px]">
              <Clock className="h-3 w-3 text-cyan-400" /> {exam.duration_minutes} phút
            </span>
            {exam.subjects?.name && (
              <span className="bg-primary/20 text-blue-300 border border-primary/30 px-2 py-0.5 rounded text-[10px] font-bold">
                {exam.subjects.name}
              </span>
            )}
            {hasTaken && (
              <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Đã hoàn thành
              </span>
            )}
          </div>
        </div>

        <div className="pt-2.5 border-t border-cyan-500/20 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-semibold">
            {hasTaken ? `Đúng ${bestRes?.correct_answers}/${bestRes?.total_questions} câu` : 'Chưa làm bài'}
          </span>

          <Link
            href={`/dashboard/student/exams/${exam.id}`}
            className={hasTaken 
              ? "btn-secondary text-xs py-1.5 px-3.5 flex items-center gap-1.5 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10 font-bold" 
              : "btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold shadow-md shadow-primary/30"}
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
    { id: 'lesson', label: 'LUYỆN TẬP THEO BÀI', icon: <BookOpen className="h-4 w-4" />, desc: 'Củng cố kiến thức theo từng bài học', count: exams.filter(e => categorizeExam(e) === 'lesson').length },
    { id: 'test', label: 'KIỂM TRA', icon: <FileCheck className="h-4 w-4" />, desc: 'Đề kiểm tra 15p, 45p, định kỳ', count: exams.filter(e => categorizeExam(e) === 'test').length },
    { id: 'thptqg', label: 'THI THỬ THPTQG', icon: <Target className="h-4 w-4" />, desc: 'Bộ đề thi thử Tốt nghiệp THPT', count: exams.filter(e => categorizeExam(e) === 'thptqg').length },
    { id: 'dgnl', label: 'ĐGNL / TSA', icon: <Sparkles className="h-4 w-4" />, desc: 'Đề luyện Đánh giá Năng lực', count: exams.filter(e => categorizeExam(e) === 'dgnl').length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* THANH TAB 4 DANH MỤC LỚN CHUẨN FPREP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-3 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-transparent border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                  : 'bg-slate-900/50 border-cyan-500/20 hover:border-cyan-400/40 hover:bg-slate-900/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl border ${isActive ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-xs' : 'bg-slate-800/80 text-slate-400 border-slate-700/60'}`}>
                  {cat.icon}
                </div>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-cyan-400 text-slate-950 shadow-xs' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  {cat.count} đề
                </span>
              </div>
              <div>
                <span className={`block text-xs sm:text-[13px] font-black tracking-wide ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold line-clamp-1 mt-0.5">
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
      
      {/* 1. TAB LUYỆN TẬP THEO BÀI (MÔN > CHƯƠNG > BÀI) */}
      {activeCategory === 'lesson' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2 m-0">
                <BookOpen className="h-4.5 w-4.5 text-cyan-400" />
                Luyện tập môn {selectedSubject?.name} theo Chương & Bài
              </h3>
              <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                Chọn chương học và mở từng bài để làm bài tập trắc nghiệm củng cố kiến thức.
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
                            const lessonExams = exams.filter(e => e.lesson_id === les.id || (categorizeExam(e) === 'lesson' && e.title.toLowerCase().includes(`bài ${lesIdx + 1}`)));

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
      )}

      {/* 2. TAB KIỂM TRA ĐỊNH KỲ */}
      {activeCategory === 'test' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2 m-0">
                <FileCheck className="h-4.5 w-4.5 text-cyan-400" />
                Đề Kiểm Tra Định Kỳ ({selectedSubject?.name})
              </h3>
              <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                Bài kiểm tra 15 phút, 1 tiết, đánh giá giữa kỳ và cuối học kỳ.
              </p>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="text-center py-16 flat-card border-dashed">
              <FileCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-bold text-muted-foreground text-sm m-0">Hiện chưa có đề kiểm tra định kỳ cho môn này.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map(renderExamCard)}
            </div>
          )}
        </div>
      )}

      {/* 3. TAB THPTQG */}
      {activeCategory === 'thptqg' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2 m-0">
                <Target className="h-4.5 w-4.5 text-cyan-400" />
                Bộ Đề Luyện Thi Tốt Nghiệp THPT Quốc Gia ({selectedSubject?.name})
              </h3>
              <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                Tổng hợp đề thi thử chuẩn cấu trúc và ma trận đề thi chính thức của Bộ Giáo dục & Đào tạo.
              </p>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="text-center py-16 flat-card border-dashed">
              <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-bold text-muted-foreground text-sm m-0">Hiện chưa có đề luyện thi THPTQG cho môn này.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map(renderExamCard)}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB ĐGNL */}
      {activeCategory === 'dgnl' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-white flex items-center gap-2 m-0">
                <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
                Bộ Đề Ôn Luyện Đánh Giá Năng Lực (ĐGNL)
              </h3>
              <p className="text-xs text-slate-400 font-semibold m-0 mt-0.5">
                Rèn luyện tư duy logic, định lượng, đọc hiểu và giải quyết vấn đề cho các kỳ thi ĐGNL ĐHQG & ĐHBK.
              </p>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="text-center py-16 flat-card border-dashed">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-bold text-muted-foreground text-sm m-0">Hiện chưa có đề thi ĐGNL được tải lên.</p>
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
