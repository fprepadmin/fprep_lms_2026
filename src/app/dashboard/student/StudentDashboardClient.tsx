'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, ChevronDown, ChevronUp, PlayCircle, 
  FileText, CheckCircle2, Circle, ChevronRight, Award, 
  Clock, ArrowLeft, GraduationCap, Sparkles, Layers,
  Compass, BarChart3, CheckSquare, RotateCcw, ArrowRight,
  ClipboardList, ArrowUpRight, Check, Search, Maximize2, Minimize2
} from 'lucide-react';
import Link from 'next/link';
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
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [selectedSubjectId, subjectViewTab]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(sub => {
      if (activeGroupTab !== 'all' && sub.group_type !== activeGroupTab) return false;
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchesSubject = sub.name.toLowerCase().includes(kw);
        const subChapters = chapters.filter(c => c.subject_id === sub.id);
        const matchesLesson = subChapters.some(c => 
          (c.lessons || []).some(l => l.title.toLowerCase().includes(kw))
        );
        return matchesSubject || matchesLesson;
      }
      return true;
    });
  }, [subjects, activeGroupTab, searchKeyword, chapters]);

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

    let nextLesson: { id: string; title: string; chapterTitle: string } | null = null;
    for (const chap of subjectChapters) {
      for (const les of chap.lessons || []) {
        const isComp = progress.some(p => p.lesson_id === les.id && p.completed);
        if (!isComp) {
          nextLesson = { id: les.id, title: les.title, chapterTitle: chap.title };
          break;
        }
      }
      if (nextLesson) break;
    }

    return { 
      totalLessons, 
      completedLessons, 
      percent, 
      totalExams, 
      totalChapters: subjectChapters.length,
      nextLesson
    };
  };

  const getGroupBadge = (groupType: string) => {
    switch (groupType) {
      case 'T':
        return <span className="text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Tự nhiên</span>;
      case 'X':
        return <span className="text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Xã hội</span>;
      default:
        return <span className="text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Ngoại ngữ</span>;
    }
  };

  const toggleChapter = (chapId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapId]: !prev[chapId]
    }));
  };

  const expandAllChapters = (chapIds: string[], expand: boolean) => {
    const newState: Record<string, boolean> = {};
    chapIds.forEach(id => {
      newState[id] = expand;
    });
    setExpandedChapters(newState);
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

    return (
      <div className="space-y-6 animate-fade-in pb-12">
        
        {/* THANH ĐIỀU HƯỚNG VÀ HEADER MÔN HỌC */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-7 shadow-2xs space-y-5">
          <button
            onClick={() => {
              setSelectedSubjectId(null);
              setSearchKeyword('');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
            Quay lại tất cả môn học
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center font-bold text-xl shadow-2xs`}>
                  <SubjectIcon name={sub.name} className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-2xl text-foreground tracking-tight m-0">
                      Môn {sub.name}
                    </h2>
                    {getGroupBadge(sub.group_type)}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-2.5 m-0 mt-1">
                    <span>{stats.totalChapters} Chương</span>
                    <span>&bull;</span>
                    <span>{stats.totalLessons} Bài học</span>
                    <span>&bull;</span>
                    <span>{stats.totalExams} Đề luyện tập</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Thanh tiến độ hoàn thành môn học */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 min-w-[220px] flex items-center justify-between gap-4">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tiến độ</span>
                <span className="text-sm font-bold text-foreground">
                  {stats.completedLessons}/{stats.totalLessons} bài
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${theme.progressBar}`} 
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
                <span className={`text-xs font-bold w-7 text-right font-ui ${theme.textColor}`}>
                  {stats.percent}%
                </span>
              </div>
            </div>
          </div>

          {/* GỢI Ý BÀI TIẾP THEO CẦN HỌC */}
          {stats.nextLesson && (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider block">
                    Gợi ý bài tiếp theo &bull; {stats.nextLesson.chapterTitle}
                  </span>
                  <h4 className="font-bold text-sm text-foreground truncate m-0">
                    {stats.nextLesson.title}
                  </h4>
                </div>
              </div>
              <Link
                href={`/dashboard/student/lessons/${stats.nextLesson.id}`}
                className="btn-primary text-xs py-2 px-4 shrink-0 flex items-center justify-center gap-1.5 font-bold"
              >
                Học ngay <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* TAB CHUYỂN ĐỔI CHỨC NĂNG */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setSubjectViewTab('lessons')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  subjectViewTab === 'lessons'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="h-4 w-4" /> Bài giảng ({stats.totalLessons})
              </button>
              <button
                onClick={() => setSubjectViewTab('exams')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  subjectViewTab === 'exams'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Award className="h-4 w-4" /> Đề luyện tập ({stats.totalExams})
              </button>
              <button
                onClick={() => setSubjectViewTab('guide')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  subjectViewTab === 'guide'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Compass className="h-4 w-4" /> Hướng dẫn học
              </button>
            </div>

            {subjectViewTab === 'lessons' && subChapters.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => expandAllChapters(subChapters.map(c => c.id), true)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
                >
                  Mở tất cả
                </button>
                <button
                  onClick={() => expandAllChapters(subChapters.map(c => c.id), false)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-50 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
                >
                  Thu gọn
                </button>
              </div>
            )}
          </div>
        </div>

        {/* NỘI DUNG THEO TAB ĐÃ CHỌN */}
        {subjectViewTab === 'lessons' && (
          <div className="space-y-4">
            {subChapters.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card p-8">
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
                  <div key={chap.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-2xs">
                    <button
                      onClick={() => toggleChapter(chap.id)}
                      className="w-full p-4 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg ${theme.iconBg} ${theme.iconColor} font-bold text-xs flex items-center justify-center border ${theme.iconBorder} shrink-0`}>
                          {chapIdx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-foreground m-0">{chap.title}</h4>
                          <span className="text-[11px] text-muted-foreground">
                            {lessons.length} Bài giảng &bull; {chapExams.length} Bài tập
                          </span>
                        </div>
                      </div>
                      <div className="p-1 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="space-y-1.5">
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 px-3 sm:px-4">
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
                                          <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
                                            <Check className="h-3 w-3" />
                                          </div>
                                        ) : (
                                          <Circle className="h-4.5 w-4.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 transition-colors" />
                                        )}
                                      </div>
                                      <div>
                                        <h5 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-blue-600 transition-colors leading-snug m-0">
                                          <span className="text-muted-foreground mr-1.5">Bài {lesIdx + 1}:</span>
                                          {les.title}
                                        </h5>
                                        <span className="text-[10.5px] text-muted-foreground">
                                          {isCompleted ? 'Đã hoàn thành' : 'Chưa học'}
                                        </span>
                                      </div>
                                    </div>

                                    <Link
                                      href={`/dashboard/student/lessons/${les.id}`}
                                      className={isCompleted ? "btn-secondary text-xs py-1 px-3.5 shrink-0 self-start sm:self-auto font-bold" : "btn-primary text-xs py-1 px-3.5 shrink-0 self-start sm:self-auto font-bold"}
                                    >
                                      {isCompleted ? 'Xem lại' : 'Vào học'}
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {chapExams.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              Bài tập rèn luyện ({chapExams.length})
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2">
                              {chapExams.map((exam) => (
                                <div 
                                  key={exam.id}
                                  className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0 space-y-0.5">
                                    <h5 className="font-bold text-xs text-foreground truncate m-0">
                                      {exam.title}
                                    </h5>
                                    <span className="text-[10.5px] text-muted-foreground">
                                      {exam.duration_minutes} phút
                                    </span>
                                  </div>

                                  <Link
                                    href={`/dashboard/student/exams/${exam.id}`}
                                    className="btn-primary text-[11px] py-1 px-2.5 shrink-0 font-bold"
                                  >
                                    Làm bài
                                  </Link>
                                </div>
                              ))}
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

        {subjectViewTab === 'exams' && (
          <div className="space-y-4">
            {subExams.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-card p-8">
                <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-bold text-muted-foreground text-sm m-0">Chưa có đề luyện tập nào cho môn {sub.name}.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subExams.map((exam) => (
                  <div 
                    key={exam.id}
                    className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-blue-500/50 hover:shadow-sm transition-all"
                  >
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug m-0">
                        {exam.title}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 m-0">
                        <Clock className="h-3.5 w-3.5 text-primary" /> {exam.duration_minutes} phút
                      </p>
                    </div>

                    <Link
                      href={`/dashboard/student/exams/${exam.id}`}
                      className="btn-primary w-full text-xs py-2 justify-center flex items-center gap-2 font-bold"
                    >
                      Bắt đầu làm bài <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {subjectViewTab === 'guide' && (
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 space-y-4 shadow-2xs">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2 m-0">
              <Compass className="h-5 w-5 text-primary" /> Lộ trình tự học hiệu quả môn {sub.name}
            </h3>
            
            <div className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <h5 className="font-bold text-foreground m-0">Bước 1: Tiếp thu kiến thức cốt lõi</h5>
                <p className="m-0 text-xs">Mở từng bài giảng theo đúng lộ trình chương học. Đọc kỹ tài liệu tóm tắt lý thuyết và xem video bài giảng.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <h5 className="font-bold text-foreground m-0">Bước 2: Tự luyện tập trắc nghiệm củng cố</h5>
                <p className="m-0 text-xs">Sau mỗi bài học, hãy làm ngay các đề trắc nghiệm luyện tập đi kèm để ghi nhớ kiến thức.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <h5 className="font-bold text-foreground m-0">Bước 3: Đánh dấu hoàn thành bài học</h5>
                <p className="m-0 text-xs">Bấm &quot;Đánh dấu hoàn thành&quot; sau khi học xong để hệ thống ghi nhận tiến độ vào biểu đồ chung.</p>
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
    <div className="space-y-6 animate-fade-in w-full pb-12">
      
      {/* HEADER MÔN HỌC TINH GỌN */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative shadow-xs">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <BookOpen className="h-3.5 w-3.5" /> Chương trình học chính thức Khối 12
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground m-0 font-heading">
            Học Liệu Số & Môn Học
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground m-0">
            Chọn một môn học bên dưới để vào học trực tiếp lý thuyết và làm bài tập rèn luyện.
          </p>
        </div>

        {/* Thanh tìm kiếm nhanh */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm nhanh môn hoặc bài học..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* CÁC TAB LỰA CHỌN PHÂN BAN */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveGroupTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'all' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
          }`}
        >
          Tất cả môn ({subjects.length})
        </button>
        <button
          onClick={() => setActiveGroupTab('T')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'T' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
          }`}
        >
          Tổ Tự Nhiên
        </button>
        <button
          onClick={() => setActiveGroupTab('X')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'X' 
              ? 'bg-emerald-600 text-white shadow-xs' 
              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
          }`}
        >
          Tổ Xã Hội
        </button>
        <button
          onClick={() => setActiveGroupTab('ENG')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeGroupTab === 'ENG' 
              ? 'bg-purple-600 text-white shadow-xs' 
              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:text-foreground'
          }`}
        >
          Ngoại Ngữ
        </button>
      </div>

      {/* LƯỚI THẺ MÔN HỌC */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSubjects.map((sub) => {
          const stats = getSubjectStats(sub.id);
          const theme = getSubjectColorTheme(sub.name);

          return (
            <div
              key={sub.id}
              onClick={() => {
                setSelectedSubjectId(sub.id);
                setSubjectViewTab('lessons');
              }}
              className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all flex flex-col justify-between gap-4 cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-11 h-11 rounded-xl ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center font-bold text-base shadow-2xs group-hover:scale-105 transition-transform`}>
                    <SubjectIcon name={sub.name} className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                    {theme.shortCode}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors m-0">
                    Môn {sub.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 m-0 flex items-center gap-2">
                    <span>{stats.totalChapters} Chương</span>
                    <span>&bull;</span>
                    <span>{stats.totalLessons} Bài học</span>
                    <span>&bull;</span>
                    <span>{stats.totalExams} Đề thi</span>
                  </p>
                </div>
              </div>

              {/* Tiến độ hoàn thành & nút 1 click */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px] font-medium">Tiến độ</span>
                  <span className={`font-ui ${theme.textColor} font-bold text-[11px]`}>
                    {stats.completedLessons}/{stats.totalLessons} bài ({stats.percent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${theme.progressBar}`} 
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>

                <div className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 group-hover:bg-blue-50 dark:group-hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between transition-all">
                  <span>Mở bài giảng môn {sub.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
