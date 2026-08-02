'use client';

import React, { useState } from 'react';
import { 
  BookOpen, ChevronDown, ChevronUp, PlayCircle, 
  FileText, CheckCircle2, Circle, ChevronRight, Award, 
  Clock, ArrowLeft, GraduationCap
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

interface Progress {
  lesson_id: string;
  completed: boolean;
}

interface StudentDashboardClientProps {
  subjects: Subject[];
  chapters: Chapter[];
  progress: Progress[];
  exams: any[];
  examResults: any[];
}

export default function StudentDashboardClient({
  subjects,
  chapters,
  progress,
  exams,
  examResults
}: StudentDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'T' | 'X' | 'ENG'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Bộ lọc môn học theo Tab
  const filteredSubjects = subjects.filter(sub => {
    if (activeTab === 'all') return true;
    return sub.group_type === activeTab;
  });

  // Tính toán số liệu học tập của một môn học
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

    return { totalLessons, completedLessons, percent };
  };

  const getGroupLabel = (groupType: string) => {
    switch (groupType) {
      case 'T':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">Tự nhiên</span>;
      case 'X':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Xã hội</span>;
      default:
        return <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">Tiếng Anh</span>;
    }
  };

  // Trình xem chi tiết bài học của một môn học đã chọn
  if (selectedSubjectId) {
    const sub = subjects.find(s => s.id === selectedSubjectId);
    if (!sub) return null;

    const stats = getSubjectStats(sub.id);
    const subChapters = chapters.filter(chap => chap.subject_id === sub.id);

    // Lọc đề luyện tập của riêng môn học này để hiển thị nhanh bên sidebar phải
    const subjectExams = (exams || []).filter(exam => exam.subject_id === sub.id);

    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* NÚT QUAY LẠI VÀ THÔNG TIN MÔN HỌC */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <button
            onClick={() => setSelectedSubjectId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách môn học
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-2xl text-foreground">{sub.name}</h3>
                {getGroupLabel(sub.group_type)}
              </div>
              <p className="text-xs text-muted-foreground font-semibold">
                {subChapters.length} Chương &bull; {stats.totalLessons} Bài học &bull; Đã hoàn thành {stats.completedLessons} bài
              </p>
            </div>

            {/* Thanh tiến độ */}
            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              <div className="w-full sm:w-40 bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-foreground w-8 text-right">
                {stats.percent}%
              </span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKSPACE TO FILL EMPTY SPACE */}
        <div className="grid gap-6 md:grid-cols-12 items-start">
          
          {/* CỘT TRÁI (COL-SPAN-8): DANH SÁCH CHƯƠNG HỌC & BÀI GIẢNG */}
          <div className="md:col-span-8 space-y-4">
            <h4 className="font-extrabold text-sm border-b border-border pb-1">Nội dung bài giảng tự học</h4>
            
            {subChapters.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-bold text-muted-foreground">Môn học này chưa có nội dung bài học nào.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subChapters.map(chap => (
                  <div key={chap.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                    <h5 className="font-extrabold text-sm text-foreground/80 tracking-wide">
                      {chap.title}
                    </h5>
                    
                    <div className="grid gap-2 pl-2">
                      {(chap.lessons || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic pl-2">Chưa có bài học trong chương.</p>
                      ) : (
                        (chap.lessons || []).map(les => {
                          const isCompleted = progress.some(p => p.lesson_id === les.id && p.completed);
                          return (
                            <Link 
                              key={les.id}
                              href={`/dashboard/student/lessons/${les.id}`}
                              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                                )}
                                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {les.title}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CỘT PHẢI (COL-SPAN-4): ĐỀ THI LUYỆN TẬP MÔN HỌC */}
          <div className="md:col-span-4 space-y-4">
            
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-extrabold text-sm border-b border-border pb-2.5 flex items-center gap-1.5 text-foreground/80">
                <Award className="h-4.5 w-4.5 text-primary animate-pulse" /> Đề luyện tập môn này
              </h4>
              
              {subjectExams.length === 0 ? (
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  Hiện tại chưa có đề thi tự luyện chuyên biệt cho môn này. Vui lòng kiểm tra lại sau!
                </p>
              ) : (
                <div className="space-y-3">
                  {subjectExams.map((exam: any) => (
                    <div key={exam.id} className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-3 hover:border-primary/30 transition-colors">
                      <div className="space-y-1">
                        <span className="block text-xs font-bold text-foreground line-clamp-1">{exam.title}</span>
                        <span className="block text-[10px] text-muted-foreground font-semibold">Thời gian: {exam.duration_minutes} phút</span>
                      </div>
                      
                      <Link
                        href={`/dashboard/student/exams/${exam.id}`}
                        className="w-full py-2 text-center rounded-lg bg-primary text-primary-foreground font-bold text-[10px] uppercase block hover:opacity-90 transition-opacity"
                      >
                        Làm bài ngay
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Lưu ý ôn luyện</h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Sau khi xem xong tài liệu hoặc video bài giảng tự học ở cột bên trái, hãy nhấp làm ngay đề luyện tập tương ứng bên để khắc sâu kiến thức tốt nhất.
              </p>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // Trình xem lưới môn học (Dạng các ô)
  return (
    <div className="space-y-6">
      
      {/* CÁC TAB LỰA CHỌN PHÂN BAN */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Tất cả môn học
        </button>
        <button
          onClick={() => setActiveTab('T')}
          className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'T' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Khoa học Tự nhiên
        </button>
        <button
          onClick={() => setActiveTab('X')}
          className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'X' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Khoa học Xã hội
        </button>
        <button
          onClick={() => setActiveTab('ENG')}
          className={`px-4 py-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'ENG' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Tiếng Anh
        </button>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-muted-foreground">Chưa có môn học nào thuộc nhóm này.</p>
        </div>
      ) : (
        /* DẠNG CÁC Ô LƯỚI (GRID CARDS) */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map(sub => {
            const stats = getSubjectStats(sub.id);
            const subChapters = chapters.filter(chap => chap.subject_id === sub.id);
            const isNatural = sub.group_type === 'T';
            const isSocial = sub.group_type === 'X';

            return (
              <div 
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden bg-gradient-to-br from-muted/20 via-card to-card"
              >
                {/* Vòng tròn màu mờ ảo làm nền lót bên dưới thẻ */}
                <div className={`absolute -top-4 -right-4 w-28 h-28 rounded-full blur-2xl pointer-events-none -z-10 group-hover:scale-125 transition-transform duration-500 ${isNatural ? 'bg-blue-500/10' : isSocial ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`} />
                <div className={`absolute -bottom-10 -left-10 w-24 h-24 rounded-full blur-2xl pointer-events-none -z-10 ${isNatural ? 'bg-blue-500/5' : isSocial ? 'bg-emerald-500/5' : 'bg-indigo-500/5'}`} />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ${
                      isNatural 
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' 
                        : isSocial 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                    }`}>
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {getGroupLabel(sub.group_type)}
                  </div>
                  
                  <div>
                    <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors">{sub.name}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                      {subChapters.length} Chương &bull; {stats.totalLessons} Bài học
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground">Tiến độ</span>
                    <strong className="text-foreground">{stats.percent}%</strong>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Vào học <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
