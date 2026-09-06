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

  // Render thẻ đề thi chuẩn FMATH
  const renderExamCard = (exam: Exam) => {
    const bestRes = getBestResult(exam.id);
    const hasTaken = Boolean(bestRes);

    return (
      <div 
        key={exam.id}
        className="flat-card flex flex-col justify-between gap-4 hover:border-primary/50 transition-all"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 
              className="font-bold text-[14px] sm:text-[15px] text-[#212529] dark:text-foreground line-clamp-3 break-words m-0 leading-snug"
              title={exam.title}
            >
              {exam.title}
            </h4>
            {hasTaken && (
              <span className="badge-success shrink-0">
                {bestRes?.score}/10
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#6c757d] dark:text-muted-foreground font-semibold">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" /> {exam.duration_minutes} phút
            </span>
            {exam.subjects?.name && (
              <span className="bg-[#f8f9fa] dark:bg-muted px-2 py-0.5 rounded text-[10px] font-bold text-[#495057] dark:text-foreground border border-border">
                {exam.subjects.name}
              </span>
            )}
          </div>
        </div>

        <div className="pt-2.5 border-t border-border flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#6c757d] font-semibold">
            {hasTaken ? 'Đã hoàn thành' : 'Chưa làm bài'}
          </span>

          <Link
            href={`/dashboard/student/exams/${exam.id}`}
            className={hasTaken ? "btn-secondary text-xs py-1.5 px-3.5" : "btn-primary text-xs py-1.5 px-3.5"}
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
    { id: 'lesson', label: 'LUYỆN TẬP THEO BÀI', icon: <BookOpen className="h-4 w-4" />, desc: 'Củng cố kiến thức theo từng bài học' },
    { id: 'test', label: 'KIỂM TRA', icon: <FileCheck className="h-4 w-4" />, desc: 'Đề kiểm tra 15p, 45p, định kỳ' },
    { id: 'thptqg', label: 'THPTQG', icon: <Target className="h-4 w-4" />, desc: 'Bộ đề thi thử Tốt nghiệp THPT' },
    { id: 'dgnl', label: 'ĐGNL', icon: <Sparkles className="h-4 w-4" />, desc: 'Đề luyện Đánh giá Năng lực' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* THANH TAB 4 DANH MỤC LỚN CHUẨN FMATH */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-2.5 ${
                isActive
                  ? 'bg-white dark:bg-card border-primary ring-2 ring-primary/20 shadow-sm'
                  : 'bg-white/60 dark:bg-card/60 border-border hover:border-primary/40 hover:bg-white text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg border ${isActive ? 'bg-[#e7f1ff] dark:bg-primary/20 text-primary border-[#b6d4fe]' : 'bg-[#f8f9fa] dark:bg-muted text-[#6c757d] border-border'}`}>
                  {cat.icon}
                </div>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <span className={`block text-xs sm:text-[13px] font-bold tracking-wide ${isActive ? 'text-[#212529] dark:text-foreground' : 'text-[#6c757d]'}`}>
                  {cat.label}
                </span>
                <span className="text-[11px] text-[#6c757d] font-semibold line-clamp-1">
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
          <span className="text-xs font-bold text-[#6c757d] uppercase shrink-0 mr-1">Môn học:</span>
          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                selectedSubjectId === sub.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground border-border hover:bg-[#e9ecef]'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {/* Ô tìm kiếm đề */}
        <div className="relative w-full md:w-64 shrink-0">
          <input
            type="text"
            placeholder="Tìm kiếm đề thi..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full bg-[#f8f9fa] dark:bg-muted/40 border border-border rounded-lg px-3 py-1.5 pl-8 text-xs font-semibold focus:outline-none focus:border-primary transition-colors"
          />
          <Search className="h-3.5 w-3.5 text-[#6c757d] absolute left-2.5 top-2.5" />
        </div>

      </div>

      {/* NỘI DUNG THEO TỪNG TAB */}
      
      {/* 1. TAB LUYỆN TẬP THEO BÀI (MÔN > CHƯƠNG > BÀI) */}
      {activeCategory === 'lesson' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
                <BookOpen className="h-4.5 w-4.5 text-primary" />
                Luyện tập môn {selectedSubject?.name} theo Chương & Bài
              </h3>
              <p className="text-xs text-[#6c757d] font-semibold m-0 mt-0.5">
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
                      className="w-full p-4 flex items-center justify-between bg-[#f8f9fa] dark:bg-muted/30 hover:bg-[#e9ecef] dark:hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#e7f1ff] dark:bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                          {chapIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-[15px] text-[#212529] dark:text-foreground m-0">{chap.title}</h4>
                          <span className="text-[11px] text-[#6c757d] dark:text-muted-foreground font-semibold">{lessons.length} Bài học</span>
                        </div>
                      </div>
                      <div className="p-1 text-[#6c757d]">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {/* Danh sách Bài học & Đề thi tương ứng */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-4 border-t border-border">
                        {lessons.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-2 m-0">Chưa có bài học trong chương này.</p>
                        ) : (
                          lessons.map((les, lesIdx) => {
                            const lessonExams = exams.filter(e => e.lesson_id === les.id || (categorizeExam(e) === 'lesson' && e.title.toLowerCase().includes(`bài ${lesIdx + 1}`)));

                            return (
                              <div key={les.id} className="space-y-2.5 pl-3 border-l-2 border-primary/40">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-bold text-[13px] sm:text-[14px] text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
                                    <span className="text-primary font-bold">Bài {lesIdx + 1}:</span> {les.title}
                                  </h5>
                                  <span className="text-[10px] font-bold text-[#6c757d] bg-[#f8f9fa] dark:bg-muted border border-border px-2 py-0.5 rounded">
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
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
                <FileCheck className="h-4.5 w-4.5 text-primary" />
                Đề Kiểm Tra Định Kỳ ({selectedSubject?.name})
              </h3>
              <p className="text-xs text-[#6c757d] font-semibold m-0 mt-0.5">
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
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
                <Target className="h-4.5 w-4.5 text-primary" />
                Bộ Đề Luyện Thi Tốt Nghiệp THPT Quốc Gia ({selectedSubject?.name})
              </h3>
              <p className="text-xs text-[#6c757d] font-semibold m-0 mt-0.5">
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
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <div>
              <h3 className="text-base font-bold font-heading text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
                Bộ Đề Ôn Luyện Đánh Giá Năng Lực (ĐGNL)
              </h3>
              <p className="text-xs text-[#6c757d] font-semibold m-0 mt-0.5">
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
