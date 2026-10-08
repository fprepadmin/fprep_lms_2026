'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, ChevronDown, ChevronUp, PlayCircle, 
  FileText, CheckCircle2, Circle, ChevronRight, Award, 
  Clock, ArrowLeft, GraduationCap, Sparkles, Layers,
  Compass, BarChart3, CheckSquare, RotateCcw, ArrowRight,
  ClipboardList, ArrowUpRight, Check
} from 'lucide-react';
import Link from 'next/link';
import FMathNotice from '@/components/common/FMathNotice';
import SubjectIcon from '@/components/student/SubjectIcon';
import { getSubjectColorTheme } from '@/lib/schoolUtils';

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
        return <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">Tự nhiên</span>;
      case 'X':
        return <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Xã hội</span>;
      default:
        return <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Ngoại ngữ</span>;
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
    const theme = getSubjectColorTheme(sub.name);
    const isMath = sub.name.toLowerCase().includes('toán');

    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* THANH ĐIỀU HƯỚNG VÀ HEADER MÔN HỌC */}
        <div className={`rounded-3xl border ${theme.cardBorder} ${theme.cardBg} p-5 sm:p-7 shadow-xs space-y-5 relative overflow-hidden`}>
          {/* Dải accent trái */}
          <div className={`absolute left-0 top-0 bottom-0 w-2 ${theme.borderAccent}`} />

          <button
            onClick={() => setSelectedSubjectId(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
            Quay lại danh sách tất cả môn học
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-border/80 pb-5">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center font-black text-xl shadow-2xs`}>
                  <SubjectIcon name={sub.name} className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black font-heading text-2xl sm:text-3xl text-foreground tracking-tight m-0">
                      Môn {sub.name}
                    </h2>
                    {isMath && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                        FMATH12
                      </span>
                    )}
                    {getGroupBadge(sub.group_type)}
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold flex flex-wrap items-center gap-3 m-0 mt-1">
                    <span>{stats.totalChapters} Chương học</span>
                    <span>&bull;</span>
                    <span>{stats.totalLessons} Bài giảng & Video</span>
                    <span>&bull;</span>
                    <span>{stats.totalExams} Đề luyện tập</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Thanh tiến độ hoàn thành môn học */}
            <div className="bg-card/90 border border-border rounded-2xl p-4 min-w-[240px] flex items-center justify-between gap-4 shadow-2xs backdrop-blur-md">
              <div>
                <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Tiến độ môn</span>
                <span className="text-sm font-black text-foreground">
                  {stats.completedLessons}/{stats.totalLessons} bài
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${theme.progressBar}`} 
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
                <span className={`text-xs font-black w-8 text-right font-ui ${theme.textColor}`}>
                  {stats.percent}%
                </span>
              </div>
            </div>
          </div>

          {/* TAB CHUYỂN ĐỔI CHỨC NĂNG CỦA MÔN HỌC */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1">
            <button
              onClick={() => setSubjectViewTab('lessons')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                subjectViewTab === 'lessons'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
              }`}
            >
              <BookOpen className="h-4 w-4" /> Nội dung bài giảng ({stats.totalLessons})
            </button>
            <button
              onClick={() => setSubjectViewTab('exams')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                subjectViewTab === 'exams'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
              }`}
            >
              <Award className="h-4 w-4" /> Đề luyện tập môn này ({stats.totalExams})
            </button>
            <button
              onClick={() => setSubjectViewTab('guide')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                subjectViewTab === 'guide'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
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
              <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card p-8">
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
                  <div key={chap.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
                    {/* Header Chương */}
                    <button
                      onClick={() => toggleChapter(chap.id)}
                      className="w-full p-4 sm:p-4.5 flex items-center justify-between bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-xl ${theme.iconBg} ${theme.iconColor} font-black text-xs flex items-center justify-center border ${theme.iconBorder} shrink-0`}>
                          {chapIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-black text-sm sm:text-base text-foreground m-0">{chap.title}</h4>
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            {lessons.length} Bài giảng &bull; {chapExams.length} Bài tập trắc nghiệm
                          </span>
                        </div>
                      </div>
                      <div className="p-1 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {/* Nội dung Chương: Bài học & Bài tập */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-5 border-t border-border">
                        
                        {/* 1. BÀI GIẢNG LÝ THUYẾT */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                            <BookOpen className="h-4 w-4" />
                            <span>1. Bài giảng & Học liệu lý thuyết ({lessons.length})</span>
                          </div>

                          <div className="divide-y divide-border bg-muted/20 rounded-xl border border-border px-3 sm:px-4">
                            {lessons.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-3 m-0">Chưa có bài giảng trong chương này.</p>
                            ) : (
                              lessons.map((les, lesIdx) => {
                                const isCompleted = progress.some(p => p.lesson_id === les.id && p.completed);

                                return (
                                  <div 
                                    key={les.id}
                                    className="py-3.5 first:pt-3.5 last:pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                                  >
                                    <div className="flex items-start sm:items-center gap-3">
                                      <div className="mt-0.5 sm:mt-0 shrink-0">
                                        {isCompleted ? (
                                          <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
                                            <Check className="h-3.5 w-3.5" />
                                          </div>
                                        ) : (
                                          <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug m-0">
                                          <span className="text-muted-foreground font-semibold mr-1.5">Bài {lesIdx + 1}:</span>
                                          {les.title}
                                        </h5>
                                        <span className="text-[11px] text-muted-foreground font-semibold">
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
                            <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
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
                                    className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between gap-3 shadow-2xs"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 
                                          className="font-bold text-xs sm:text-[13px] text-foreground m-0 line-clamp-3 leading-snug break-words"
                                          title={exam.title}
                                        >
                                          {exam.title}
                                        </h5>
                                        {bestScore !== null ? (
                                          <span className="badge-success text-[10px] px-2 py-0.5 shrink-0 font-bold">
                                            {bestScore}đ
                                          </span>
                                        ) : (
                                          <span className="text-[10px] bg-background px-2 py-0.5 rounded-md font-semibold text-muted-foreground border border-border shrink-0">
                                            Chưa làm
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 m-0">
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
              <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card p-8">
                <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-bold text-muted-foreground text-sm m-0">Chưa có đề luyện tập nào cho môn {sub.name}.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subExams.map((exam) => (
                  <div 
                    key={exam.id}
                    className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-4 hover:border-primary/50 transition-all shadow-2xs"
                  >
                    <div className="space-y-1.5">
                      <h4 
                        className="font-bold text-sm sm:text-base text-foreground line-clamp-3 leading-snug break-words m-0"
                        title={exam.title}
                      >
                        {exam.title}
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 m-0">
                        <Clock className="h-3.5 w-3.5 text-primary" /> Thời gian: {exam.duration_minutes} phút
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/student/exams/${exam.id}`}
                      className="btn-primary w-full text-xs py-2 justify-center flex items-center gap-2"
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
          <div className="rounded-3xl border border-border bg-card p-6 space-y-4 shadow-2xs">
            <h3 className="font-black font-heading text-lg text-foreground flex items-center gap-2 m-0">
              <Compass className="h-5 w-5 text-primary" /> Lộ trình tự học hiệu quả môn {sub.name}
            </h3>
            
            <div className="space-y-3 text-xs sm:text-sm text-muted-foreground font-semibold leading-relaxed">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-1">
                <h5 className="font-bold text-foreground m-0">Bước 1: Tiếp thu kiến thức cốt lõi</h5>
                <p className="m-0 text-xs">Mở từng bài giảng theo đúng lộ trình chương học. Đọc kỹ tài liệu PDF tóm tắt lý thuyết và xem video bài giảng của thầy cô.</p>
              </div>

              <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-1">
                <h5 className="font-bold text-foreground m-0">Bước 2: Tự luyện tập trắc nghiệm củng cố</h5>
                <p className="m-0 text-xs">Sau mỗi bài học, hãy làm ngay các đề trắc nghiệm luyện tập đi kèm để ghi nhớ và đánh giá mức độ hiểu bài.</p>
              </div>

              <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-1">
                <h5 className="font-bold text-foreground m-0">Bước 3: Đánh dấu hoàn thành bài học</h5>
                <p className="m-0 text-xs">Nhấp vào nút &quot;Đánh dấu hoàn thành bài học&quot; sau khi hoàn tất để hệ thống ghi nhận tiến độ vào biểu đồ chung của bạn.</p>
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
    <div className="space-y-6 animate-fade-in w-full pb-10">
      
      {/* HEADER MÔN HỌC (NỀN XANH CHUẨN FMATH & FPT) */}
      <div className="rounded-3xl border-2 border-[#b6d4fe] dark:border-blue-900/60 bg-gradient-to-br from-[#d9ebff] via-[#e7f1ff] to-[#f0f7ff] dark:from-[#0c224a] dark:via-[#081836] dark:to-[#040e21] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden shadow-sm">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-[#071735]/90 px-3.5 py-1 text-xs font-black text-[#0d6efd] dark:text-blue-400 border border-[#b6d4fe] dark:border-blue-700/50 shadow-2xs backdrop-blur-md">
            <BookOpen className="h-3.5 w-3.5" /> Chương trình học chính thức Khối 12
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#052c65] dark:text-white tracking-tight m-0">
            Học Liệu & Môn Học
          </h1>
          <p className="text-xs sm:text-sm text-[#084298] dark:text-blue-100 font-semibold m-0">
            Bấm chọn môn học để xem chi tiết các chương bài giảng, sơ đồ lý thuyết và bài tập rèn luyện.
          </p>
        </div>
      </div>

      {/* CÁC TAB LỰA CHỌN PHÂN BAN */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveGroupTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeGroupTab === 'all' 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Tất cả môn học ({subjects.length})
        </button>
        <button
          onClick={() => setActiveGroupTab('T')}
          className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeGroupTab === 'T' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Tổ Tự Nhiên
        </button>
        <button
          onClick={() => setActiveGroupTab('X')}
          className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeGroupTab === 'X' 
              ? 'bg-emerald-600 text-white shadow-sm' 
              : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Tổ Xã Hội
        </button>
        <button
          onClick={() => setActiveGroupTab('ENG')}
          className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
            activeGroupTab === 'ENG' 
              ? 'bg-purple-600 text-white shadow-sm' 
              : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Ngoại Ngữ
        </button>
      </div>

      {/* LƯỚI THẺ MÔN HỌC VỚI MÀU SẮC RIÊNG BIỆT */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((sub) => {
          const stats = getSubjectStats(sub.id);
          const isMath = sub.name.toLowerCase().includes('toán');
          const theme = getSubjectColorTheme(sub.name);

          return (
            <div
              key={sub.id}
              onClick={() => {
                setSelectedSubjectId(sub.id);
                setSubjectViewTab('lessons');
              }}
              className={`group relative overflow-hidden rounded-2xl border ${theme.cardBorder} ${theme.cardBorderHover} ${theme.cardBg} p-5 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-4 cursor-pointer`}
            >
              {/* Dải accent trái */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.borderAccent}`} />

              <div className="space-y-3 pl-1">
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-12 h-12 rounded-xl ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center font-black text-lg shadow-2xs group-hover:scale-110 transition-transform`}>
                    <SubjectIcon name={sub.name} className="h-6 w-6" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isMath && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                        FMATH12
                      </span>
                    )}
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                      {theme.shortCode}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-black font-heading text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors m-0">
                    Môn {sub.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-1 m-0 flex items-center gap-2">
                    <span>{stats.totalChapters} Chương</span>
                    <span>&bull;</span>
                    <span>{stats.totalLessons} Bài học</span>
                    <span>&bull;</span>
                    <span>{stats.totalExams} Đề thi</span>
                  </p>
                </div>

                {isMath && (
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 font-bold flex items-center justify-between">
                    <span>Học trên FMATH12</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              {/* Tiến độ hoàn thành */}
              <div className="space-y-2 pt-3 border-t border-border/60 pl-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground text-[11px]">Tiến độ học</span>
                  <span className={`font-ui ${theme.textColor}`}>
                    {stats.completedLessons}/{stats.totalLessons} bài ({stats.percent}%)
                  </span>
                </div>
                <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${theme.progressBar}`}
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
