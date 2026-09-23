'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, CheckCircle2, Circle, PlayCircle, 
  FileText, ExternalLink, Menu, ChevronRight, ChevronLeft,
  BookOpen, Maximize2, Minimize2, PanelLeftClose,
  PanelLeft, Check, ClipboardList, Clock, ArrowUp, Sparkles
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import FMathNotice from '@/components/common/FMathNotice';

interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  theory_markdown?: string;
  theory_content?: string;
  chapters: {
    title: string;
    subjects: {
      id?: string;
      name: string;
    }
  }
}

interface Material {
  id: string;
  title: string;
  material_type: 'video' | 'slide' | 'pdf' | 'attachment';
  source_url: string;
  order_index: number;
}

interface Chapter {
  id: string;
  title: string;
  lessons?: {
    id: string;
    title: string;
    order_index: number;
  }[];
}

interface LessonViewerClientProps {
  lesson: Lesson;
  materials: Material[];
  allChapters: Chapter[];
  initialProgress: any;
  allProgress?: any[];
  exams?: any[];
  examResults?: any[];
  token: string;
  userId: string;
}

/**
 * Tự động chuyển đổi các định dạng link Google Drive / Youtube sang định dạng Embed Preview
 */
function formatEmbedUrl(url: string, type: string): string {
  if (!url) return '';
  const cleanUrl = url.trim();

  // 1. YouTube video embed
  if (type === 'video' || cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
    }
  }

  // 2. Google Drive file (PDF, Docs, Slide, v.v.)
  const driveMatch = cleanUrl.match(/drive\.google\.com\/(?:file\/)?(?:u\/\d+\/)?(?:d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  // 3. Google Docs preview
  const docsMatch = cleanUrl.match(/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch && docsMatch[1]) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/preview`;
  }

  // 4. Google Slides embed
  const slidesMatch = cleanUrl.match(/docs\.google\.com\/presentation\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch && slidesMatch[1]) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/embed?start=false&loop=false&delayms=3000`;
  }

  // 5. Google Sheets preview
  const sheetsMatch = cleanUrl.match(/docs\.google\.com\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch && sheetsMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`;
  }

  return cleanUrl;
}

export default function LessonViewerClient({
  lesson,
  materials,
  allChapters,
  initialProgress,
  allProgress = [],
  exams = [],
  examResults = [],
  token,
  userId
}: LessonViewerClientProps) {
  const router = useRouter();
  const supabase = createSupabaseClient(token);
  const [completed, setCompleted] = useState(initialProgress?.completed || false);
  const [localAllProgress, setLocalAllProgress] = useState<any[]>(allProgress);

  // 1. Trích xuất Lý thuyết từ lesson fields hoặc record '__theory_markdown__'
  const theoryFromMaterial = materials.find(m => m.title === '__theory_markdown__' || m.title === 'Lý thuyết bài học')?.source_url || '';
  const lessonTheory = (lesson.theory_markdown || lesson.theory_content || theoryFromMaterial || '').trim();
  const hasTheory = !!lessonTheory;

  // 2. Lọc danh sách học liệu hiển thị
  const displayMaterials = useMemo(() => {
    return materials.filter(m => m.title !== '__theory_markdown__');
  }, [materials]);

  const [activeMaterial, setActiveMaterial] = useState<Material | null>(
    displayMaterials.length > 0 ? displayMaterials[0] : null
  );
  
  const lessonExams = exams.filter(e => e.lesson_id === lesson.id);

  // Tự động chọn tab khởi tạo thông minh dựa trên nội dung thực tế
  const [mainTab, setMainTab] = useState<'theory' | 'materials' | 'practice'>(
    hasTheory ? 'theory' : (displayMaterials.length > 0 ? 'materials' : 'practice')
  );

  // Reading Toolbar States
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [readingTheme, setReadingTheme] = useState<'light' | 'sepia' | 'dark'>('light');

  // Sidebar & Focus Mode (nếu xem Slide/Video thì thu gọn sidebar mặc định để tối đa diện tích xem)
  const [sidebarOpen, setSidebarOpen] = useState(hasTheory);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const theoryScrollRef = useRef<HTMLDivElement>(null);

  // Phím tắt Esc thoát chế độ tập trung
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // Cập nhật tab khi bài học thay đổi
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    
    if (hasTheory) {
      setMainTab('theory');
      setSidebarOpen(true);
    } else if (displayMaterials.length > 0) {
      setMainTab('materials');
      setSidebarOpen(false); // Ưu tiên full width cho slide / video
    } else {
      setMainTab('practice');
      setSidebarOpen(true);
    }
    setActiveMaterial(displayMaterials.length > 0 ? displayMaterials[0] : null);
  }, [lesson.id, hasTheory, displayMaterials]);

  // Danh sách phẳng tất cả bài học
  const flatLessons = useMemo(() => {
    return allChapters.flatMap(chap => 
      (chap.lessons || []).map(les => ({
        ...les,
        chapterTitle: chap.title
      }))
    );
  }, [allChapters]);

  const currentIndex = flatLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  // Tính tổng tiến độ hoàn thành
  const completedCount = flatLessons.filter(l => 
    localAllProgress.some(p => p.lesson_id === l.id && p.completed) || (l.id === lesson.id && completed)
  ).length;

  // Theo dõi thời gian tự học
  useEffect(() => {
    if (!userId || !lesson.id) return;

    const interval = setInterval(async () => {
      try {
        await supabase.from('study_logs').insert({
          student_id: userId,
          lesson_id: lesson.id,
          action_type: activeMaterial?.material_type === 'video' ? 'watch_video' : 'read_material',
          duration_seconds: 15
        });
      } catch (err) {
        console.error('Lỗi khi ghi study log:', err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [userId, lesson.id, activeMaterial, supabase]);

  // Đánh dấu hoàn thành
  const toggleCompleted = async () => {
    try {
      const nextCompleted = !completed;
      setCompleted(nextCompleted);

      setLocalAllProgress(prev => {
        const filtered = prev.filter(p => p.lesson_id !== lesson.id);
        return [...filtered, { lesson_id: lesson.id, completed: nextCompleted }];
      });

      await supabase.from('study_progress').upsert({
        student_id: userId,
        lesson_id: lesson.id,
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id' });

    } catch (err) {
      console.error('Lỗi khi cập nhật tiến độ:', err);
      setCompleted(!completed);
    }
  };

  return (
    <div className={`animate-fade-in w-full max-w-full flex flex-col ${
      isFocusMode 
        ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-background h-screen overflow-hidden' 
        : 'space-y-3 h-[calc(100vh-120px)] min-h-[560px]'
    }`}>
      
      {/* =========================================================================
          1. THANH ĐIỀU HƯỚNG BÀI HỌC TINH GỌN (UNIFIED TOP NAVIGATION BAR)
          ========================================================================= */}
      <header className="flat-card flex flex-wrap items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-2.5 bg-white dark:bg-card shrink-0 shadow-xs border-border">
        
        {/* Left: Nút quay lại & Tiêu đề bài học */}
        <div className="flex items-center gap-3 min-w-0 max-w-full sm:max-w-md lg:max-w-lg">
          <Link
            href="/dashboard/student/subjects"
            className="w-8 h-8 rounded-lg bg-muted/60 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all shrink-0"
            title="Quay lại danh sách môn học"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground leading-tight" title={`${lesson.chapters.subjects.name} • ${lesson.chapters.title}`}>
              <span className="text-primary shrink-0">{lesson.chapters.subjects.name}</span>
              {lesson.chapters?.subjects?.name?.toLowerCase().includes('toán') && (
                <a
                  href="https://fmath12-fschool.web.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold hover:underline inline-flex items-center gap-0.5"
                >
                  FMATH12 <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              <span>•</span>
              <span className="truncate">{lesson.chapters.title}</span>
            </div>
            <h1 
              className="text-xs sm:text-sm font-bold font-heading text-foreground tracking-tight line-clamp-1 sm:line-clamp-2 break-words m-0 mt-0.5"
              title={lesson.title}
            >
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* Center: Dynamic Content Switcher (Chỉ hiển thị các tab THỰC SỰ CÓ NỘI DUNG) */}
        <div className="flex items-center gap-1 bg-muted/40 dark:bg-muted/20 p-1 rounded-xl border border-border">
          {hasTheory && (
            <button
              onClick={() => setMainTab('theory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mainTab === 'theory'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Lý thuyết</span>
            </button>
          )}

          {displayMaterials.map((mat, idx) => {
            const isMatActive = mainTab === 'materials' && activeMaterial?.id === mat.id;
            return (
              <button
                key={mat.id}
                onClick={() => {
                  setMainTab('materials');
                  setActiveMaterial(mat);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isMatActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
                title={mat.title}
              >
                {mat.material_type === 'video' ? (
                  <PlayCircle className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span>
                  {displayMaterials.length === 1 
                    ? (mat.material_type === 'video' ? 'Video bài giảng' : 'Tài liệu / Slide') 
                    : (mat.title || `Tài liệu ${idx + 1}`)}
                </span>
              </button>
            );
          })}

          {lessonExams.length > 0 && (
            <button
              onClick={() => setMainTab('practice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mainTab === 'practice'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Bài tập ({lessonExams.length})</span>
            </button>
          )}
        </div>

        {/* Right: Công cụ đọc & Thao tác điều hướng */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Công cụ đọc bài (Hiển thị khi đọc Lý thuyết) */}
          {mainTab === 'theory' && hasTheory && (
            <div className="hidden xl:flex items-center gap-2 border-r border-border pr-2 mr-1">
              <div className="flex bg-muted/40 border border-border rounded-lg p-0.5 text-xs">
                <button 
                  onClick={() => setFontSize('normal')} 
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${fontSize === 'normal' ? 'bg-primary text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Cỡ chữ chuẩn"
                >
                  A
                </button>
                <button 
                  onClick={() => setFontSize('large')} 
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${fontSize === 'large' ? 'bg-primary text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Cỡ chữ lớn"
                >
                  A+
                </button>
                <button 
                  onClick={() => setFontSize('xlarge')} 
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${fontSize === 'xlarge' ? 'bg-primary text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Cỡ chữ rất lớn"
                >
                  A++
                </button>
              </div>

              <div className="flex bg-muted/40 border border-border rounded-lg p-0.5 text-xs">
                <button 
                  onClick={() => setReadingTheme('light')} 
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${readingTheme === 'light' ? 'bg-white dark:bg-card text-primary shadow-2xs border border-border' : 'text-muted-foreground'}`}
                >
                  Sáng
                </button>
                <button 
                  onClick={() => setReadingTheme('sepia')} 
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${readingTheme === 'sepia' ? 'bg-[#fbf0d9] text-[#5f4b32] shadow-2xs border border-[#d8c29d]' : 'text-muted-foreground'}`}
                >
                  Dịu mắt
                </button>
                <button 
                  onClick={() => setReadingTheme('dark')} 
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${readingTheme === 'dark' ? 'bg-[#151d30] text-blue-400 shadow-2xs border border-blue-500/50' : 'text-muted-foreground'}`}
                >
                  Tối
                </button>
              </div>
            </div>
          )}

          {/* Mở Tab mới (khi xem tài liệu/slide) */}
          {mainTab === 'materials' && activeMaterial && (
            <a
              href={activeMaterial.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
              title="Mở toàn màn hình trong tab mới trên Google Drive / Youtube"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mở Tab mới</span>
            </a>
          )}

          {/* Nút Chế độ tập trung (Focus Mode) */}
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isFocusMode 
                ? 'bg-primary text-white border-primary shadow-xs' 
                : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            title={isFocusMode ? "Thoát chế độ tập trung (Esc)" : "Chế độ tập trung toàn màn hình"}
          >
            {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden xl:inline">{isFocusMode ? "Thu nhỏ" : "Tập trung"}</span>
          </button>

          {/* Nút ẩn/hiện Sidebar (Desktop) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              sidebarOpen 
                ? 'bg-primary/10 text-primary border-primary/30' 
                : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={sidebarOpen ? "Thu gọn danh mục bài học" : "Mở rộng danh mục bài học"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
            <span className="hidden xl:inline">{sidebarOpen ? "Thu gọn" : "Mục lục"}</span>
          </button>

          {/* Nút mở Sidebar (Mobile) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-semibold text-muted-foreground"
          >
            <Menu className="h-3.5 w-3.5" />
          </button>

          {/* Nút Bài trước */}
          {prevLesson ? (
            <Link
              href={`/dashboard/student/lessons/${prevLesson.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-muted transition-all"
              title={`Bài trước: ${prevLesson.title}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Trước</span>
            </Link>
          ) : (
            <button disabled className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/20 text-xs text-muted-foreground opacity-30 cursor-not-allowed">
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Trước</span>
            </button>
          )}

          {/* Nút Bài sau */}
          {nextLesson ? (
            <Link
              href={`/dashboard/student/lessons/${nextLesson.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-muted transition-all"
              title={`Bài tiếp theo: ${nextLesson.title}`}
            >
              <span className="hidden md:inline">Sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button disabled className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border/50 bg-muted/20 text-xs text-muted-foreground opacity-30 cursor-not-allowed">
              <span className="hidden md:inline">Sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Nút Đánh dấu hoàn thành */}
          <button
            onClick={toggleCompleted}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              completed 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25' 
                : 'btn-primary text-xs py-1.5 px-3'
            }`}
          >
            {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{completed ? 'Đã hoàn thành' : 'Hoàn thành'}</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. KHÔNG GIAN BÀI GIẢNG CHÍNH (MAIN WORKSPACE CANVAS)
          ========================================================================= */}
      <div className="flex gap-3 items-stretch w-full min-w-0 flex-1 overflow-hidden">
        
        {/* SIDEBAR MỤC LỤC BÀI HỌC (DESKTOP) */}
        {sidebarOpen && (
          <aside className="hidden lg:flex w-64 xl:w-72 flex-col flat-card p-3.5 shrink-0 bg-white dark:bg-card h-full overflow-y-auto shadow-xs border-border">
            
            {/* Header sidebar */}
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-2.5 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Mục lục bài học</span>
                <span className="text-xs font-bold text-foreground">
                  Tiến độ: {completedCount}/{flatLessons.length} bài
                </span>
              </div>
              <span className="badge-primary text-[11px] px-2.5 py-0.5 font-bold">
                {Math.round((completedCount / (flatLessons.length || 1)) * 100)}%
              </span>
            </div>

            {/* Danh sách chương & bài học */}
            <div className="space-y-3.5 text-xs flex-1 overflow-y-auto pr-1">
              {allChapters.map((chap, cIdx) => {
                const chapLessonIds = new Set((chap.lessons || []).map(l => l.id));
                const chapExams = (exams || []).filter(e => 
                  (e.lesson_id && chapLessonIds.has(e.lesson_id)) ||
                  (!e.lesson_id && e.subject_id === lesson.chapters.subjects.id && (e.title?.toLowerCase().includes(chap.title.toLowerCase()) || chap.title.toLowerCase().includes('chương 1') || cIdx === 0))
                );

                return (
                  <div key={chap.id} className="space-y-1.5">
                    
                    {/* Tiêu đề chương */}
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/60 text-foreground" title={chap.title}>
                      <span className="w-5 h-5 rounded-md bg-primary text-white text-[10px] flex items-center justify-center font-bold shrink-0 shadow-2xs" style={{ color: '#ffffff' }}>
                        {cIdx + 1}
                      </span>
                      <span className="font-bold text-[12px] line-clamp-2 break-words font-heading leading-snug flex-1">{chap.title}</span>
                    </div>

                    {/* Danh sách bài học */}
                    <div className="space-y-1 pl-1">
                      {(chap.lessons || []).map((les) => {
                        const isCurrent = les.id === lesson.id;
                        const isLesCompleted = localAllProgress.some(p => p.lesson_id === les.id && p.completed) || (isCurrent && completed);

                        return (
                          <Link
                            key={les.id}
                            href={`/dashboard/student/lessons/${les.id}`}
                            className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all min-w-0 ${
                              isCurrent 
                                ? 'bg-primary/10 border-primary/40 text-primary font-bold shadow-2xs' 
                                : 'bg-card border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground'
                            }`}
                            title={les.title}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <BookOpen className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="line-clamp-2 break-words text-[12px] leading-snug flex-1">{les.title}</span>
                            </div>
                            {isLesCompleted ? (
                              <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0" title="Đã hoàn thành">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
                            )}
                          </Link>
                        );
                      })}

                      {chapExams.map(exam => {
                        const results = (examResults || []).filter(r => r.exam_id === exam.id);
                        const bestScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : null;

                        return (
                          <Link
                            key={exam.id}
                            href={`/dashboard/student/exams/${exam.id}`}
                            className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all min-w-0 bg-blue-500/5 dark:bg-blue-950/20 border-blue-500/20 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            title={exam.title}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                              <span className="line-clamp-2 break-words text-[12px] font-bold leading-snug flex-1">{exam.title}</span>
                            </div>
                            {bestScore !== null ? (
                              <span className="badge-success text-[10px] py-0 px-1.5 shrink-0 font-bold">
                                {bestScore}đ
                              </span>
                            ) : (
                              <span className="text-[10px] bg-background px-1.5 py-0.5 rounded text-muted-foreground border border-border shrink-0">
                                {exam.duration_minutes}p
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* MOBILE DRAWER OVERLAY */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex justify-end animate-fade-in" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-[85%] max-w-xs h-full bg-card p-4 space-y-4 overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-bold text-sm text-foreground m-0">Mục lục môn học</h3>
                <button onClick={() => setMobileMenuOpen(false)} className="btn-secondary py-1 px-2.5 text-xs">Đóng</button>
              </div>

              <div className="flex-1 space-y-4 text-xs pt-2">
                {allChapters.map((chap, cIdx) => (
                  <div key={chap.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40 font-bold text-[11px] text-foreground" title={chap.title}>
                      <span className="w-5 h-5 rounded-md bg-primary text-white text-[10px] flex items-center justify-center font-bold shrink-0" style={{ color: '#ffffff' }}>
                        {cIdx + 1}
                      </span>
                      <span className="line-clamp-2 break-words flex-1">{chap.title}</span>
                    </div>

                    <div className="space-y-1 pl-1">
                      {(chap.lessons || []).map(les => {
                        const isCurrent = les.id === lesson.id;
                        const isLesCompleted = localAllProgress.some(p => p.lesson_id === les.id && p.completed) || (isCurrent && completed);

                        return (
                          <button
                            key={les.id}
                            onClick={() => { router.push(`/dashboard/student/lessons/${les.id}`); setMobileMenuOpen(false); }}
                            className={`w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border ${
                              isCurrent 
                              ? 'bg-primary text-white border-primary font-bold shadow-sm' 
                              : 'bg-card border-border text-foreground'
                            }`}
                            title={les.title}
                          >
                            <span className="line-clamp-2 break-words flex items-center gap-2 flex-1">
                              <BookOpen className="h-3.5 w-3.5 shrink-0" /> {les.title}
                            </span>
                            {isLesCompleted && <Check className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            3. CANVAS NỘI DUNG CHÍNH (THEORY MARKDOWN / FULL EMBED / PRACTICE)
            ===================================================================== */}
        <main className="flex-1 flex flex-col min-w-0 w-full max-w-full h-full overflow-hidden bg-card border border-border rounded-2xl shadow-xs">
          
          {/* Thông báo FMATH nếu môn Toán */}
          {lesson.chapters?.subjects?.name?.toLowerCase().includes('toán') && (
            <div className="p-4 pb-0 shrink-0">
              <FMathNotice variant="banner" />
            </div>
          )}

          {/* TAB 1: ĐỌC LÝ THUYẾT MARKDOWN & TOÁN HỌC */}
          {mainTab === 'theory' && (
            <div ref={theoryScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 bg-background/50 relative scroll-smooth">
              {hasTheory ? (
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative pb-16">
                  
                  {/* Khung nội dung Lý thuyết tối giản - bắt đầu trực tiếp vào bài đọc */}
                  <article className={`p-6 sm:p-10 rounded-2xl shadow-xs space-y-6 border transition-all ${
                    readingTheme === 'sepia' 
                      ? 'bg-[#fbf0d9] border-[#d8c29d] text-[#433422]' 
                      : readingTheme === 'dark'
                      ? 'bg-[#151d30] border-[#222f49] text-slate-100'
                      : 'bg-card border-border text-card-foreground'
                  }`}>
                    <div className="border-b border-border/70 pb-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-primary tracking-wider block">Lý thuyết trọng tâm</span>
                        <h2 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight break-words">{lesson.title}</h2>
                      </div>
                      <span className="text-xs font-semibold flex items-center gap-1 text-muted-foreground shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Chuẩn GDPT 2026
                      </span>
                    </div>

                    <div className={`max-w-none font-medium leading-relaxed prose-headings:font-bold prose-headings:tracking-tight ${
                      fontSize === 'large' ? 'text-[16px]' : fontSize === 'xlarge' ? 'text-[18px]' : 'text-[14px]'
                    }`}>
                      <MathRenderer content={lessonTheory} />
                    </div>
                  </article>

                  {/* Nút cuộn nhanh lên đầu bài */}
                  <div className="sticky bottom-6 flex justify-end pointer-events-none pr-2">
                    <button
                      onClick={() => theoryScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all text-xs font-bold border border-white/20"
                      title="Cuộn lên đầu bài học"
                    >
                      <ArrowUp className="h-4 w-4" />
                      <span>Lên đầu bài</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="py-24 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <h4 className="font-bold text-sm text-foreground">Bài học này chưa có lý thuyết văn bản</h4>
                  <p className="text-xs text-muted-foreground">Bạn có thể chuyển sang xem video bài giảng hoặc tài liệu slide để tiếp tục học.</p>
                  {displayMaterials.length > 0 && (
                    <button
                      onClick={() => setMainTab('materials')}
                      className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Xem tài liệu / Slide bài giảng
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: XEM HỌC LIỆU / SLIDE / VIDEO FULL MÀN HÌNH */}
          {mainTab === 'materials' && (
            <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-black/5">
              {displayMaterials.length === 0 ? (
                <div className="py-24 text-center flex-1 flex flex-col items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h4 className="font-bold text-sm text-foreground mb-1">Chưa có tài liệu đính kèm</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">Giáo viên phụ trách chưa tải lên học liệu cho bài học này.</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col w-full h-full overflow-hidden relative">
                  {/* Selector nhiều tài liệu trên mobile nếu có */}
                  {displayMaterials.length > 1 && (
                    <div className="flex sm:hidden items-center gap-1 overflow-x-auto p-1.5 border-b border-border bg-background">
                      {displayMaterials.map(mat => {
                        const isActive = activeMaterial?.id === mat.id;
                        return (
                          <button
                            key={mat.id}
                            onClick={() => setActiveMaterial(mat)}
                            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap border ${
                              isActive ? 'bg-primary text-white border-primary shadow-xs' : 'bg-card text-muted-foreground border-border'
                            }`}
                          >
                            {mat.material_type === 'video' ? <PlayCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            <span>{mat.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeMaterial && (
                    <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
                      {/* Video Player */}
                      {activeMaterial.material_type === 'video' && (
                        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
                          <iframe
                            src={formatEmbedUrl(activeMaterial.source_url, 'video')}
                            title={activeMaterial.title}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {/* PDF / Google Slides Full Screen Embed */}
                      {(activeMaterial.material_type === 'pdf' || activeMaterial.material_type === 'slide') && (
                        <div className="relative w-full h-full bg-card overflow-hidden flex flex-col">
                          <iframe
                            src={formatEmbedUrl(activeMaterial.source_url, activeMaterial.material_type)}
                            title={activeMaterial.title}
                            className="w-full flex-1 border-0 h-full"
                            allow="autoplay"
                          />
                        </div>
                      )}

                      {/* Attachment file */}
                      {activeMaterial.material_type === 'attachment' && (
                        <div className="p-8 bg-card text-center shadow-xs flex flex-col items-center justify-center flex-1">
                          <FileText className="h-16 w-16 text-primary mb-3" />
                          <h4 className="font-bold text-base text-foreground mb-1">{activeMaterial.title}</h4>
                          <p className="text-xs text-muted-foreground max-w-sm mb-5">Tệp tài liệu đính kèm này cần được mở hoặc tải về máy tính để học tập chi tiết.</p>
                          <a
                            href={activeMaterial.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Mở hoặc tải tài liệu
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BÀI TẬP TỰ LUYỆN */}
          {mainTab === 'practice' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-background/50">
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="border-b border-border pb-3">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" /> Bài tập tự luyện ({lessonExams.length})
                  </h3>
                  <p className="text-xs text-muted-foreground m-0 mt-0.5">Làm bài tập trắc nghiệm khách quan để củng cố kiến thức và kiểm tra mức độ hiểu bài.</p>
                </div>

                {lessonExams.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card text-muted-foreground space-y-2">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs font-semibold">Chưa có bài tập trắc nghiệm nào cho bài học này.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {lessonExams.map(exam => {
                      const prevResults = examResults.filter(r => r.exam_id === exam.id);
                      const bestScore = prevResults.length > 0 ? Math.max(...prevResults.map(r => r.score || 0)) : null;

                      return (
                        <div key={exam.id} className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                Luyện tập theo bài
                              </span>
                              <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {exam.duration_minutes} phút
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-foreground leading-snug break-words" title={exam.title}>{exam.title}</h4>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {bestScore !== null && (
                              <div className="text-right">
                                <span className="text-[10px] text-muted-foreground font-bold block uppercase">Điểm cao nhất</span>
                                <span className="text-xs font-black text-primary">{bestScore}/10</span>
                              </div>
                            )}
                            <button
                              onClick={() => router.push(`/dashboard/student/exams/${exam.id}`)}
                              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1"
                            >
                              <PlayCircle className="h-3.5 w-3.5" /> {bestScore !== null ? 'Luyện tập lại' : 'Bắt đầu làm'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
