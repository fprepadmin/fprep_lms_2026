'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, ChevronDown, ChevronUp, PlayCircle, 
  FileText, CheckCircle2, Circle, ChevronRight, Award, 
  Clock, ArrowLeft, GraduationCap, Sparkles, Layers,
  Compass, BarChart3, CheckSquare, RotateCcw, ArrowRight,
  ClipboardList, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import FMathNotice from '@/components/common/FMathNotice';

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

interface Progress {
  lesson_id: string;
  completed: boolean;
}

interface Exam {
  id: string;
  subject_id: string;
  lesson_id?: string | null;
  title: string;
  duration_minutes: number;
  exam_type?: string;
}

interface StudentDashboardClientProps {
  subjects: Subject[];
  chapters: Chapter[];
  progress: Progress[];
  exams: Exam[];
  examResults: any[];
}

export default function StudentDashboardClient({
  subjects,
  chapters,
  progress,
  exams,
  examResults = []
}: StudentDashboardClientProps) {
  const [activeGroupTab, setActiveGroupTab] = useState<'all' | 'T' | 'X' | 'ENG'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectViewTab, setSubjectViewTab] = useState<'lessons' | 'exams' | 'guide'>('lessons');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Tự động kéo lên đầu trang khi chọn môn hoặc đổi tab
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [selectedSubjectId, subjectViewTab]);

  // Bộ lọc môn học theo Ban
  const filteredSubjects = subjects.filter(sub => {
    if (activeGroupTab === 'all') return true;
    return sub.group_type === activeGroupTab;
  });

  // Tính toán số liệu học tập của môn học
  const getSubjectStats = (subjectId: string) => {
    const subjectChapters = chapters.filter(chap => chap.subject_id === subjectId);
    const subjectLessonIds = subjectChapters.reduce((acc, chap) => {
      const ids = (chap.lessons || []).map(les => les.id);
      return [...acc, ...ids];
    }, [] as string[]);

    const totalLessons = subjectLessonIds.length;
    const completedLessons = subjectLessonIds.filter(id => 
      progress.some(p => p.lesson_id === id && p.completed)
    ).length;

    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const totalExams = (exams || []).filter(e => e.subject_id === subjectId).length;

    return { totalLessons, completedLessons, percent, totalExams, totalChapters: subjectChapters.length };
  };

  const getGroupBadge = (groupType: string) => {
    switch (groupType) {
      case 'T':
        return <span className="badge-primary">Tự nhiên</span>;
      case 'X':
        return <span className="badge-success">Xã hội</span>;
      default:
        return <span className="badge-info">Ngoại ngữ</span>;
    }
  };

  const toggleChapter = (chapId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapId]: !prev[chapId]
    }));
  };

  // =========================================================================
  // VIEW CHI TIẾT MÔN HỌC (SUBJECT DETAIL WORKSPACE)
  // =========================================================================
  if (selectedSubjectId) {
    const sub = subjects.find(s => s.id === selectedSubjectId);
    if (!sub) return null;

    const stats = getSubjectStats(sub.id);
    const subChapters = chapters.filter(chap => chap.subject_id === sub.id);
    const subExams = (exams || []).filter(e => e.subject_id === sub.id);

    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* THANH ĐIỀU HƯỚNG VÀ HEADER MÔN HỌC */}
        <div className="flat-card space-y-4">
          <button
            onClick={() => setSelectedSubjectId(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
            Quay lại danh sách tất cả môn học
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-border pb-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-bold font-heading text-2xl text-[#212529] dark:text-foreground tracking-tight m-0">
                  Môn {sub.name}
                </h2>
                {getGroupBadge(sub.group_type)}
              </div>
              <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold flex flex-wrap items-center gap-3 m-0">
                <span>{stats.totalChapters} Chương học</span>
                <span>&bull;</span>
                <span>{stats.totalLessons} Bài giảng</span>
                <span>&bull;</span>
                <span>{stats.totalExams} Đề luyện tập</span>
              </p>
            </div>

            {/* Thanh tiến độ hoàn thành */}
            <div className="bg-[#f8f9fa] dark:bg-muted/40 border border-border rounded-xl p-3.5 min-w-[240px] flex items-center justify-between gap-4">
              <div>
                <span className="block text-[10px] font-bold text-[#6c757d] uppercase">Tiến độ</span>
                <span className="text-sm font-bold text-[#212529] dark:text-foreground">
                  {stats.completedLessons}/{stats.totalLessons} bài
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-20 bg-[#e9ecef] dark:bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-700" 
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-primary w-8 text-right font-ui">
                  {stats.percent}%
                </span>
              </div>
            </div>
          </div>

          {/* TAB CHUYỂN ĐỔI CHỨC NĂNG CỦA MÔN HỌC */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            <button
              onClick={() => setSubjectViewTab('lessons')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                subjectViewTab === 'lessons'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef] border border-border'
              }`}
            >
              <BookOpen className="h-4 w-4" /> Nội dung bài giảng ({stats.totalLessons})
            </button>
            <button
              onClick={() => setSubjectViewTab('exams')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                subjectViewTab === 'exams'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef] border border-border'
              }`}
            >
              <Award className="h-4 w-4" /> Đề luyện tập môn này ({stats.totalExams})
            </button>
            <button
              onClick={() => setSubjectViewTab('guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                subjectViewTab === 'guide'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef] border border-border'
              }`}
            >
              <Compass className="h-4 w-4" /> Hướng dẫn tự học
            </button>
          </div>
        </div>

        {/* THÔNG BÁO FMATH KHI CHỌN MÔN TOÁN */}
        {sub.name.toLowerCase().includes('toán') && (
          <FMathNotice className="my-2" />
        )}

        {/* NỘI DUNG THEO TAB ĐÃ CHỌN */}
        
        {/* TAB 1: NỘI DUNG BÀI GIẢNG (CHƯƠNG & BÀI HỌC DẠNG CÂY) */}
        {subjectViewTab === 'lessons' && (
          <div className="space-y-4">
            {subChapters.length === 0 ? (
              <div className="text-center py-16 flat-card border-dashed">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-bold text-muted-foreground text-sm m-0">Chưa có chương học và bài giảng nào cho môn {sub.name}.</p>
              </div>
            ) : (
              subChapters.map((chap, chapIdx) => {
                const isExpanded = expandedChapters[chap.id] !== false;
                const lessons = chap.lessons || [];
                const chapLessonIds = lessons.map(les => les.id);
                const chapExams = (exams || []).filter(e => 
                  (e.lesson_id && chapLessonIds.includes(e.lesson_id)) ||
                  (!e.lesson_id && e.subject_id === sub.id && (e.title?.toLowerCase().includes(chap.title.toLowerCase()) || chapIdx === 0))
                );

                return (
                  <div key={chap.id} className="flat-card p-0 overflow-hidden shadow-sm">
                    {/* Header Chương */}
                    <button
                      onClick={() => toggleChapter(chap.id)}
                      className="w-full p-4 sm:p-4.5 flex items-center justify-between bg-[#f8f9fa] dark:bg-muted/30 hover:bg-[#e9ecef] dark:hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#e7f1ff] dark:bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/20 shrink-0">
                          {chapIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-[15px] text-[#212529] dark:text-foreground m-0">{chap.title}</h4>
                          <span className="text-[11px] text-[#6c757d] dark:text-muted-foreground font-semibold">
                            {lessons.length} Bài giảng &bull; {chapExams.length} Bài tập trắc nghiệm
                          </span>
                        </div>
                      </div>
                      <div className="p-1 text-[#6c757d]">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {/* Nội dung Chương: Bài học & Bài tập */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-5 border-t border-border">
                        
                        {/* 1. BÀI GIẢNG LÝ THUYẾT */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                            <BookOpen className="h-4 w-4" />
                            <span>1. Bài giảng & Học liệu lý thuyết ({lessons.length})</span>
                          </div>

                          <div className="divide-y divide-border bg-[#f8f9fa]/50 dark:bg-muted/10 rounded-xl border border-border px-3 sm:px-4">
                            {lessons.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-3 m-0">Chưa có bài giảng trong chương này.</p>
                            ) : (
                              lessons.map((les, lesIdx) => {
                                const isCompleted = progress.some(p => p.lesson_id === les.id && p.completed);

                                return (
                                  <div 
                                    key={les.id}
                                    className="py-3 first:pt-3 last:pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                                  >
                                    <div className="flex items-start sm:items-center gap-3">
                                      <div className="mt-0.5 sm:mt-0 shrink-0">
                                        {isCompleted ? (
                                          <CheckCircle2 className="h-5 w-5 text-[#198754]" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-[13px] sm:text-[14px] text-[#212529] dark:text-foreground group-hover:text-primary transition-colors leading-snug m-0">
                                          <span className="text-[#6c757d] font-semibold mr-1.5">Bài {lesIdx + 1}:</span>
                                          {les.title}
                                        </h5>
                                        <span className="text-[11px] text-[#6c757d] dark:text-muted-foreground font-semibold">
                                          {isCompleted ? 'Đã hoàn thành bài học' : 'Chưa học'}
                                        </span>
                                      </div>
                                    </div>

                                    <Link
                                      href={`/dashboard/student/lessons/${les.id}`}
                                      className={isCompleted ? "btn-secondary text-xs py-1.5 px-3.5 shrink-0 self-start sm:self-auto" : "btn-primary text-xs py-1.5 px-3.5 shrink-0 self-start sm:self-auto"}
                                    >
                                      {isCompleted ? 'Xem lại bài' : 'Vào học'}
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* 2. BÀI TẬP TRẮC NGHIỆM RÈN LUYỆN */}
                        {chapExams.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#0d6efd] dark:text-blue-400 uppercase tracking-wider">
                              <ClipboardList className="h-4 w-4" />
                              <span>2. Bài tập & Đề trắc nghiệm rèn luyện ({chapExams.length})</span>
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2">
                              {chapExams.map((exam) => {
                                const results = (examResults || []).filter(r => r.exam_id === exam.id);
                                const bestScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : null;

                                return (
                                  <div 
                                    key={exam.id}
                                    className="p-3.5 rounded-xl border border-[#cce3fe] dark:border-blue-900/50 bg-[#f0f7ff] dark:bg-blue-950/20 flex flex-col justify-between gap-3 shadow-xs"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 
                                          className="font-bold text-xs sm:text-[13px] text-[#212529] dark:text-foreground m-0 line-clamp-3 leading-snug break-words"
                                          title={exam.title}
                                        >
                                          {exam.title}
                                        </h5>
                                        {bestScore !== null ? (
                                          <span className="badge-success text-[10px] px-2 py-0.5 shrink-0 font-bold">
                                            {bestScore}đ
                                          </span>
                                        ) : (
                                          <span className="text-[10px] bg-white dark:bg-card px-2 py-0.5 rounded-md font-semibold text-muted-foreground border border-border shrink-0">
                                            Chưa làm
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-[#6c757d] dark:text-muted-foreground font-semibold flex items-center gap-1.5 m-0">
                                        <Clock className="h-3 w-3 text-primary" /> {exam.duration_minutes} phút &bull; Trắc nghiệm củng cố
                                      </p>
                                    </div>

                                    <Link
                                      href={`/dashboard/student/exams/${exam.id}`}
                                      className="btn-primary w-full text-xs py-1.5 justify-center flex items-center gap-1"
                                    >
                                      <ClipboardList className="h-3.5 w-3.5" />
                                      <span>{bestScore !== null ? 'Luyện tập lại' : 'Làm bài tập'}</span>
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ĐỀ LUYỆN TẬP CỦA MÔN HỌC */}
        {subjectViewTab === 'exams' && (
          <div className="space-y-4">
            {subExams.length === 0 ? (
              <div className="text-center py-16 flat-card border-dashed">
                <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-bold text-muted-foreground text-sm m-0">Chưa có đề luyện tập nào cho môn {sub.name}.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subExams.map((exam) => (
                  <div 
                    key={exam.id}
                    className="flat-card flex flex-col justify-between gap-4 hover:border-primary/50 transition-all"
                  >
                    <div className="space-y-1.5">
                      <h4 
                        className="font-bold text-[14px] sm:text-[15px] text-[#212529] dark:text-foreground line-clamp-3 leading-snug break-words m-0"
                        title={exam.title}
                      >
                        {exam.title}
                      </h4>
                      <p className="text-xs text-[#6c757d] font-semibold flex items-center gap-1.5 m-0">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Thời gian: {exam.duration_minutes} phút
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/student/exams/${exam.id}`}
                      className="btn-primary w-full text-xs py-2"
                    >
                      Bắt đầu làm bài <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HƯỚNG DẪN & LƯU Ý TỰ HỌC */}
        {subjectViewTab === 'guide' && (
          <div className="flat-card space-y-4">
            <h3 className="font-bold font-heading text-lg text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
              <Compass className="h-5 w-5 text-primary" /> Lộ trình tự học hiệu quả môn {sub.name}
            </h3>
            
            <div className="space-y-3 text-xs sm:text-sm text-[#495057] dark:text-muted-foreground font-semibold leading-relaxed">
              <div className="p-3.5 bg-[#f8f9fa] dark:bg-muted/30 rounded-xl border border-border space-y-1">
                <h5 className="font-bold text-[#212529] dark:text-foreground m-0">Bước 1: Tiếp thu kiến thức cốt lõi</h5>
                <p className="m-0 text-xs">Mở từng bài giảng theo đúng lộ trình chương học. Đọc kỹ tài liệu PDF tóm tắt lý thuyết và xem video bài giảng của thầy cô.</p>
              </div>

              <div className="p-3.5 bg-[#f8f9fa] dark:bg-muted/30 rounded-xl border border-border space-y-1">
                <h5 className="font-bold text-[#212529] dark:text-foreground m-0">Bước 2: Tự luyện tập trắc nghiệm củng cố</h5>
                <p className="m-0 text-xs">Sau mỗi bài học, hãy làm ngay các đề trắc nghiệm luyện tập đi kèm để ghi nhớ và đánh giá mức độ hiểu bài.</p>
              </div>

              <div className="p-3.5 bg-[#f8f9fa] dark:bg-muted/30 rounded-xl border border-border space-y-1">
                <h5 className="font-bold text-[#212529] dark:text-foreground m-0">Bước 3: Đánh dấu hoàn thành bài học</h5>
                <p className="m-0 text-xs">Nhấp vào nút "Đánh dấu hoàn thành bài học" sau khi hoàn tất để hệ thống ghi nhận tiến độ vào biểu đồ chung của bạn.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW DANH SÁCH TẤT CẢ MÔN HỌC (GRID CARDS VIEW)
  // =========================================================================
  return (
    <div className="space-y-6 animate-fade-in w-full">
      
      {/* HEADER MÔN HỌC (CHUẨN FMATH BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <BookOpen className="h-3.5 w-3.5" /> Chương trình học chính thức Khối 12
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Môn Học Tự Học
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Bấm chọn môn học để xem các chương học, bài giảng và học liệu tương ứng.
          </p>
        </div>
      </div>

      {/* CÁC TAB LỰA CHỌN PHÂN BAN */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveGroupTab('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'all' 
              ? 'bg-primary text-white shadow-sm' 
              : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef]'
          }`}
        >
          Tất cả môn học ({subjects.length})
        </button>
        <button
          onClick={() => setActiveGroupTab('T')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'T' 
              ? 'bg-[#0d6efd] text-white shadow-sm' 
              : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef]'
          }`}
        >
          Tổ Tự Nhiên
        </button>
        <button
          onClick={() => setActiveGroupTab('X')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'X' 
              ? 'bg-[#198754] text-white shadow-sm' 
              : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef]'
          }`}
        >
          Tổ Xã Hội
        </button>
        <button
          onClick={() => setActiveGroupTab('ENG')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'ENG' 
              ? 'bg-[#6f42c1] text-white shadow-sm' 
              : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef]'
          }`}
        >
          Ngoại Ngữ
        </button>
      </div>

      {/* LƯỚI THẺ MÔN HỌC (FLAT CARDS) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((sub) => {
          const stats = getSubjectStats(sub.id);
          const isMath = sub.name.toLowerCase().includes('toán');

          return (
            <div
              key={sub.id}
              onClick={() => {
                setSelectedSubjectId(sub.id);
                setSubjectViewTab('lessons');
              }}
              className={`flat-card-interactive flex flex-col justify-between gap-4 relative overflow-hidden ${
                isMath ? 'ring-2 ring-blue-500/40 bg-gradient-to-br from-blue-50/40 via-card to-card' : ''
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#e7f1ff] dark:bg-primary/20 text-primary flex items-center justify-center font-black text-base border border-primary/20">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isMath && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                        FMATH12
                      </span>
                    )}
                    {getGroupBadge(sub.group_type)}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold font-heading text-lg text-[#212529] dark:text-foreground m-0">
                    {sub.name}
                  </h3>
                  <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold mt-0.5 m-0">
                    {stats.totalChapters} Chương &bull; {stats.totalLessons} Bài học
                  </p>
                </div>

                {isMath && (
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between">
                    <span>Học trên FMATH12</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              {/* Tiến độ hoàn thành */}
              <div className="space-y-1.5 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#6c757d]">Tiến độ</span>
                  <span className="font-bold text-[#212529] dark:text-foreground font-ui">{stats.completedLessons}/{stats.totalLessons} bài ({stats.percent}%)</span>
                </div>
                <div className="w-full bg-[#e9ecef] dark:bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
