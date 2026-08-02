'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, CheckCircle2, Circle, PlayCircle, 
  FileText, ExternalLink, Menu, ChevronRight, BookOpen
} from 'lucide-react';

interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  chapters: {
    title: string;
    subjects: {
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
  token: string;
  userId: string;
}

export default function LessonViewerClient({
  lesson,
  materials,
  allChapters,
  initialProgress,
  token,
  userId
}: LessonViewerClientProps) {
  const router = useRouter();
  const supabase = createSupabaseClient(token);
  const [completed, setCompleted] = useState(initialProgress?.completed || false);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(
    materials.length > 0 ? materials[0] : null
  );
  
  // Trạng thái menu ẩn/hiện trên di động
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theo dõi thời gian tự học thông qua Heartbeat (mỗi 15 giây)
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

  // Xử lý đánh dấu hoàn thành bài học
  const toggleCompleted = async () => {
    try {
      const nextCompleted = !completed;
      setCompleted(nextCompleted);

      await supabase.from('study_progress').upsert({
        student_id: userId,
        lesson_id: lesson.id,
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id' });

    } catch (err) {
      console.error('Lỗi khi cập nhật tiến độ:', err);
      setCompleted(!completed); // Revert nếu lỗi
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <PlayCircle className="h-4 w-4 shrink-0" />;
      default:
        return <FileText className="h-4 w-4 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] gap-6">
      
      {/* 1. SIDEBAR DANH SÁCH BÀI HỌC (Ẩn trên di động, hiện trên desktop) */}
      <aside className="hidden lg:flex w-72 flex-col bg-card border border-border rounded-xl p-4 shrink-0 space-y-4 h-fit">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-extrabold text-sm text-muted-foreground uppercase tracking-wider truncate">
            {lesson.chapters.subjects.name}
          </h3>
        </div>

        <div className="space-y-4">
          {allChapters.map(chap => (
            <div key={chap.id} className="space-y-1.5">
              <h4 className="font-bold text-xs text-foreground/80 tracking-wide">
                {chap.title}
              </h4>
              <div className="grid gap-1 pl-1">
                {(chap.lessons || []).map(les => {
                  const isCurrent = les.id === lesson.id;
                  return (
                    <Link
                      key={les.id}
                      href={`/dashboard/student/lessons/${les.id}`}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all min-w-0 ${isCurrent ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border hover:bg-muted/10 text-muted-foreground hover:text-foreground'}`}
                    >
                      <ChevronRight className={`h-3 w-3 shrink-0 ${isCurrent ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      <span className="truncate">{les.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* NÚT MỞ MENU TRÊN DI ĐỘNG */}
      <div className="lg:hidden flex items-center justify-between bg-card p-3 border border-border rounded-xl">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 text-xs font-bold text-primary"
        >
          <Menu className="h-4 w-4" /> Danh sách bài học môn {lesson.chapters.subjects.name}
        </button>
      </div>

      {/* DI ĐỘNG SIDEBAR OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 lg:hidden overflow-y-auto p-4">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <h3 className="font-extrabold text-sm text-primary uppercase">{lesson.chapters.subjects.name}</h3>
            <button onClick={() => setMobileMenuOpen(false)} className="text-xs font-bold border border-border px-3 py-1.5 rounded-lg">Đóng</button>
          </div>
          <div className="space-y-4">
            {allChapters.map(chap => (
              <div key={chap.id} className="space-y-2">
                <h4 className="font-bold text-xs text-foreground/80">{chap.title}</h4>
                <div className="grid gap-1">
                  {(chap.lessons || []).map(les => (
                    <button
                      key={les.id}
                      onClick={() => { router.push(`/dashboard/student/lessons/${les.id}`); setMobileMenuOpen(false); }}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border min-w-0 ${les.id === lesson.id ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border'}`}
                    >
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{les.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. KHU VỰC HIỂN THỊ NỘI DUNG BÀI HỌC CHÍNH */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Nút quay lại và Tiêu đề bài học */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <Link 
              href="/dashboard/student" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Quay về Trang chủ
            </Link>
            <h1 className="text-2xl font-black text-foreground leading-tight">{lesson.title}</h1>
            <p className="text-xs text-muted-foreground font-semibold">{lesson.chapters.title}</p>
          </div>

          {/* Nút Đánh dấu hoàn thành */}
          <button
            onClick={toggleCompleted}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border transition-colors shrink-0 ${completed ? 'bg-green-500/10 border-green-500 text-green-500 hover:bg-green-500/20' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'}`}
          >
            {completed ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" /> Đánh dấu hoàn thành
              </>
            )}
          </button>
        </div>

        {/* CÁC TÀI LIỆU HỌC TẬP (MATERIALS TAB) */}
        {materials.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-extrabold text-lg mb-1">Chưa có học liệu</h3>
            <p className="text-sm text-muted-foreground">Giáo viên phụ trách chưa đăng tải tài liệu hoặc video bài giảng cho bài học này.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
            {/* Header các Tab học liệu */}
            <div className="flex border-b border-border bg-muted/10 overflow-x-auto">
              {materials.map(mat => (
                <button
                  key={mat.id}
                  onClick={() => setActiveMaterial(mat)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${activeMaterial?.id === mat.id ? 'border-primary text-primary bg-background/50' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  {getMaterialIcon(mat.material_type)}
                  <span>{mat.title}</span>
                </button>
              ))}
            </div>

            {/* Trình xem nội dung (Viewer Container) */}
            <div className="flex-1 p-4 bg-black/5 dark:bg-black/30 flex flex-col">
              {activeMaterial && (
                <div className="flex-1 flex flex-col h-full min-h-[400px]">
                  
                  {activeMaterial.material_type === 'video' && (
                    <div className="flex-1 relative aspect-video w-full bg-black rounded-lg overflow-hidden border border-border">
                      <iframe
                        src={activeMaterial.source_url}
                        title={activeMaterial.title}
                        className="absolute inset-0 h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {activeMaterial.material_type === 'pdf' && (
                    <div className="flex-1 relative w-full bg-card rounded-lg overflow-hidden border border-border flex flex-col h-full min-h-[500px]">
                      <iframe
                        src={activeMaterial.source_url}
                        title={activeMaterial.title}
                        className="w-full flex-1 border-0"
                      />
                      <div className="p-3 border-t border-border bg-card flex justify-between items-center text-xs shrink-0">
                        <span className="text-muted-foreground font-semibold">Tài liệu học tập: {activeMaterial.title}</span>
                        <a 
                          href={activeMaterial.source_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-1 text-primary font-bold hover:underline"
                        >
                          Mở tab mới <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {activeMaterial.material_type === 'slide' && (
                    <div className="flex-1 relative w-full bg-card rounded-lg overflow-hidden border border-border flex flex-col h-full min-h-[500px]">
                      <iframe
                        src={activeMaterial.source_url}
                        title={activeMaterial.title}
                        className="w-full flex-1 border-0"
                      />
                      <div className="p-3 border-t border-border bg-card flex justify-between items-center text-xs shrink-0">
                        <span className="text-muted-foreground font-semibold">Slide bài giảng: {activeMaterial.title}</span>
                        <a 
                          href={activeMaterial.source_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-1 text-primary font-bold hover:underline"
                        >
                          Mở tab mới <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {activeMaterial.material_type === 'attachment' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card rounded-lg border border-border text-center">
                      <FileText className="h-16 w-16 text-primary mb-4" />
                      <h4 className="font-extrabold text-lg mb-2">{activeMaterial.title}</h4>
                      <p className="text-sm text-muted-foreground max-w-md mb-6">Tài liệu đính kèm này cần được mở hoặc tải về máy tính để nghiên cứu chi tiết.</p>
                      <a
                        href={activeMaterial.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-95 shadow-md shadow-primary/10 transition-opacity"
                      >
                        Mở liên kết tài liệu <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
