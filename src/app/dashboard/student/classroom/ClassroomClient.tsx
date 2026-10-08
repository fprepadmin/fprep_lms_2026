'use client';

import React, { useState } from 'react';
import { 
  Users, GraduationCap, Calendar, Mail, BookOpen, 
  FileText, CheckCircle2, Award, Clock,
  ArrowRight, Search, Bell, RotateCcw, AlertCircle, Send,
  UserCheck, ShieldCheck, Sparkles, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { getSubjectColorTheme } from '@/lib/schoolUtils';
import FMathNotice from '@/components/common/FMathNotice';

interface Classmate {
  student_id: string;
  mshs: string;
  full_name: string;
}

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  subjects?: { id: string; name: string };
  teacherProfile?: { id: string; email: string; role?: string };
  teacherFullName?: string;
  teacherFptName?: string;
  teacherEmail?: string;
}

interface Exam {
  id: string;
  subject_id: string;
  title: string;
  duration_minutes: number;
  exam_type?: string;
  subjects?: { id: string; name: string };
}

interface ClassroomClientProps {
  classInfo: {
    id: string;
    name: string;
    group_type: string;
    academic_year: string;
  };
  classmates: Classmate[];
  teacherAssignments: TeacherAssignment[];
  announcements: any[];
  exams: Exam[];
  examAssignments?: any[];
  examResults: any[];
  studentId: string;
  subjects?: { id: string; name: string }[];
}

export default function ClassroomClient({
  classInfo,
  classmates,
  teacherAssignments,
  announcements,
  exams,
  examAssignments = [],
  examResults,
  studentId,
  subjects = []
}: ClassroomClientProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'assignments' | 'members'>('feed');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchMember, setSearchMember] = useState<string>('');
  const [searchExam, setSearchExam] = useState<string>('');

  // Ban đào tạo hiển thị
  const groupLabel = classInfo.group_type === 'T' 
    ? 'Khoa học Tự nhiên (Ban T)' 
    : classInfo.group_type === 'X' 
      ? 'Khoa học Xã hội (Ban X)' 
      : 'Khai phóng (Ban K)';

  // Lọc bài tập theo môn & từ khóa tìm kiếm
  const filteredExams = exams.filter(exam => {
    if (selectedSubjectFilter !== 'all' && exam.subject_id !== selectedSubjectFilter) {
      return false;
    }
    if (searchExam.trim()) {
      return (exam.title || '').toLowerCase().includes(searchExam.toLowerCase());
    }
    return true;
  });

  // Lọc thành viên theo từ khóa tìm kiếm
  const filteredClassmates = classmates.filter(c => {
    if (!searchMember.trim()) return true;
    const kw = searchMember.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(kw) || (c.mshs || '').toLowerCase().includes(kw);
  });

  // Lấy kết quả cao nhất của học sinh cho bài tập
  const getBestResult = (examId: string) => {
    const results = examResults.filter(r => r.exam_id === examId);
    if (results.length === 0) return null;
    return results.reduce((prev, curr) => (Number(curr.score) > Number(prev.score) ? curr : prev), results[0]);
  };

  // Danh sách môn học duy nhất có bài tập
  const uniqueSubjects = Array.from(
    new Map(exams.map(e => [e.subject_id, e.subjects])).values()
  ).filter(Boolean);

  const completedCount = new Set(
    examResults.filter(r => exams.some(e => e.id === r.exam_id)).map(r => r.exam_id)
  ).size;

  const progressPercent = exams.length > 0 ? Math.round((completedCount / exams.length) * 100) : 0;

  // Gom nhóm giáo viên phụ trách theo môn học thuộc ban
  const relevantSubjects = subjects.length > 0 ? subjects : Array.from(
    new Map(teacherAssignments.map(a => [a.subject_id, a.subjects])).values()
  ).filter(Boolean);

  const assignmentsBySubject = relevantSubjects.map((sub: any) => {
    const teachers = teacherAssignments.filter(t => t.subject_id === sub.id);
    return {
      subject: sub,
      teachers
    };
  });

  // Tìm học sinh hiện tại
  const currentStudent = classmates.find(c => c.student_id === studentId);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ========================================================================= */}
      {/* 1. HEADER BANNER LỚP HỌC (CHUẨN HIỆN ĐẠI & RÕ RÀNG) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/25">
                <GraduationCap className="h-3.5 w-3.5" /> Lớp học chính khóa FPT School
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                classInfo.group_type === 'T'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25'
                  : classInfo.group_type === 'X'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25'
              }`}>
                {groupLabel}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-foreground tracking-tight m-0">
              Không gian Lớp {classInfo.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" /> Niên khóa: <strong className="text-foreground">{classInfo.academic_year || '2024-2027'}</strong>
              </span>
              <span>&bull;</span>
              <span>
                MSHS của bạn: <strong className="text-primary font-mono">{currentStudent?.mshs || 'N/A'}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Học sinh: <strong className="text-foreground">{currentStudent?.full_name || 'Học sinh'}</strong>
              </span>
            </div>
          </div>

          {/* CHỈ SỐ NHANH (METRICS BADGES) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6 shrink-0">
            <div className="p-3 sm:p-4 rounded-xl bg-background/60 border border-border/80 text-center min-w-[90px]">
              <span className="block text-2xl sm:text-3xl font-black font-heading text-primary">
                {classmates.length}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Học sinh
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-background/60 border border-border/80 text-center min-w-[90px]">
              <span className="block text-2xl sm:text-3xl font-black font-heading text-foreground">
                {teacherAssignments.length}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Giáo viên
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-background/60 border border-border/80 text-center min-w-[90px]">
              <span className="block text-2xl sm:text-3xl font-black font-heading text-green-600 dark:text-green-400">
                {completedCount}/{exams.length}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Hoàn thành
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB ĐIỀU HƯỚNG CHÍNH */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'feed'
              ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Bell className="h-4 w-4" /> Bảng tin & Giáo viên
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'assignments'
              ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <FileText className="h-4 w-4" /> Đề thi & Bài tập ({exams.length})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Users className="h-4 w-4" /> Danh sách Sĩ số ({classmates.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: BẢNG TIN & GIÁO VIÊN PHỤ TRÁCH */}
      {/* ========================================================================= */}
      {activeTab === 'feed' && (
        <div className="grid gap-6 md:grid-cols-12 items-start">
          
          {/* CỘT TRÁI (COL-SPAN-8): THÔNG BÁO VÀ TIẾN ĐỘ */}
          <div className="md:col-span-8 space-y-6">
            
            {/* THẺ TIẾN ĐỘ HỌC TẬP CỦA HỌC SINH */}
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/5 via-card to-card p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground m-0">Tiến độ bài tập lớp {classInfo.name}</h4>
                    <p className="text-[11px] text-muted-foreground font-semibold m-0">Hoàn thành các đề ôn luyện định kỳ và khảo thí</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {completedCount} / {exams.length} bài ({progressPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground pt-1">
                <span>Bạn còn <strong>{Math.max(0, exams.length - completedCount)}</strong> bài tập chưa hoàn thành</span>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                >
                  Xem danh sách bài tập <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* THÔNG BÁO LỚP HỌC */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <h3 className="font-extrabold text-sm flex items-center gap-2 border-b border-border pb-3 m-0 text-foreground">
                <Bell className="h-4 w-4 text-primary" /> Thông báo chung dành cho lớp {classInfo.name}
              </h3>

              {announcements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="font-bold text-xs text-muted-foreground m-0">Chưa có thông báo mới nào cho lớp học.</p>
                  <p className="text-[11px] text-muted-foreground/70 m-0">Khi giáo viên bộ môn hoặc nhà trường gửi thông báo, thông tin sẽ hiển thị tại đây.</p>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-border">
                  {announcements.map((ann: any) => (
                    <div key={ann.id} className="pt-3.5 first:pt-0 space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm text-foreground m-0">{ann.title}</h4>
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" /> {ann.date || 'Gần đây'} &bull; {ann.sender || 'Ban Giám Hiệu'}
                        </span>
                      </div>
                      <div 
                        className="text-xs text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: ann.content }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* CỘT PHẢI (COL-SPAN-4): DANH SÁCH GIÁO VIÊN BỘ MÔN */}
          <div className="md:col-span-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground m-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Đội ngũ Giáo viên lớp {classInfo.name}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {teacherAssignments.length} GV
                </span>
              </div>

              {assignmentsBySubject.length === 0 ? (
                <p className="text-xs text-muted-foreground italic m-0">Chưa có phân công giáo viên cho lớp.</p>
              ) : (
                <div className="space-y-3">
                  {assignmentsBySubject.map(({ subject, teachers }: any) => {
                    const theme = getSubjectColorTheme(subject.name);
                    const hasTeachers = teachers.length > 0;

                    return (
                      <div 
                        key={subject.id} 
                        className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 transition-all hover:border-border/80"
                      >
                        {/* Header môn học */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${theme.dotColor}`} />
                            {subject.name}
                          </span>

                          {hasTeachers ? (
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {teachers.length} GV
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground/60 italic">
                              Đang phân công
                            </span>
                          )}
                        </div>

                        {/* Danh sách giáo viên của môn này */}
                        {hasTeachers ? (
                          <div className="space-y-2 pt-1">
                            {teachers.map((t: TeacherAssignment) => {
                              const initial = (t.teacherFullName || t.teacherEmail || 'G')
                                .split(' ')
                                .slice(-1)[0]
                                .charAt(0)
                                .toUpperCase();

                              return (
                                <div key={t.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/30 border border-border/50">
                                  {/* Avatar Icon / Initial */}
                                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0 border border-primary/20">
                                    {initial}
                                  </div>

                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-xs text-foreground truncate">
                                        {t.teacherFullName || 'Giáo viên bộ môn'}
                                      </span>
                                      {t.teacherFptName && (
                                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted border border-border text-muted-foreground">
                                          {t.teacherFptName}
                                        </span>
                                      )}
                                    </div>

                                    {t.teacherEmail && (
                                      <a
                                        href={`mailto:${t.teacherEmail}`}
                                        className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 truncate"
                                        title={`Gửi email cho ${t.teacherFullName || t.teacherEmail}`}
                                      >
                                        <Mail className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{t.teacherEmail}</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic m-0 pt-0.5">
                            Chưa có thông tin giáo viên phụ trách cho môn học này.
                          </p>
                        )}
                        {subject.name.toLowerCase().includes('toán') && (
                          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground font-semibold">Chuyên đề & Bài tập:</span>
                            <a
                              href="https://fmath12-fschool.web.app/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span>Truy cập FMATH12</span>
                              <ArrowRight className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 2: ĐỀ THI & BÀI TẬP */}
      {/* ========================================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          
          {/* THANH LỌC VÀ TÌM KIẾM BÀI TẬP */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold text-muted-foreground uppercase shrink-0 mr-1">Môn:</span>
              <button
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                Tất cả ({exams.length})
              </button>
              {uniqueSubjects.map((sub: any) => {
                const count = exams.filter(e => e.subject_id === sub.id).length;
                const isMathSub = sub.name.toLowerCase().includes('toán');
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubjectFilter(sub.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      selectedSubjectFilter === sub.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <span>{sub.name} ({count})</span>
                    {isMathSub && (
                      <span className="text-[9px] px-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-black">
                        FMATH
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64 shrink-0">
              <input
                type="text"
                placeholder="Tìm bài tập theo tên..."
                value={searchExam}
                onChange={(e) => setSearchExam(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-1.5 pl-8 text-xs font-semibold focus:outline-none focus:border-primary transition-colors text-foreground"
              />
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* THÔNG BÁO FMATH NẾU CHỌN MÔN TOÁN */}
          {(() => {
            const activeSub = uniqueSubjects.find((s: any) => s.id === selectedSubjectFilter);
            const isMath = activeSub?.name?.toLowerCase().includes('toán');
            if (!isMath) return null;
            return <FMathNotice variant="banner" className="my-2" />;
          })()}

          {/* DANH SÁCH THẺ BÀI TẬP */}
          {filteredExams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card text-center py-16 space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="font-bold text-foreground text-sm m-0">Không tìm thấy bài tập nào phù hợp.</p>
              <p className="text-xs text-muted-foreground m-0">Hãy thử đổi bộ lọc môn học hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam) => {
                const bestRes = getBestResult(exam.id);
                const hasTaken = Boolean(bestRes);
                const theme = getSubjectColorTheme(exam.subjects?.name || '');

                return (
                  <div
                    key={exam.id}
                    className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-4 transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="space-y-3">
                      
                      {/* Huy hiệu Môn học & Thời gian */}
                      <div className="flex items-center justify-between gap-2">
                        {exam.subjects?.name ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${theme.dotColor}`} />
                            {exam.subjects.name}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Môn học</span>
                        )}

                        <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" /> {exam.duration_minutes} phút
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 
                          className="font-extrabold text-sm text-foreground line-clamp-2 m-0 leading-snug"
                          title={exam.title}
                        >
                          {exam.title}
                        </h4>
                      </div>

                      {/* Trạng thái làm bài & Điểm cao nhất */}
                      {hasTaken ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs">
                          <span className="text-green-600 dark:text-green-400 font-extrabold flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành
                          </span>
                          <span className="font-black text-green-600 dark:text-green-400 font-mono text-sm">
                            {bestRes?.score}/10
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-xs flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> Chưa làm bài
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground">Sẵn sàng</span>
                        </div>
                      )}

                    </div>

                    {/* Nút hành động */}
                    <div className="pt-2 border-t border-border flex items-center justify-end">
                      <Link
                        href={`/dashboard/student/exams/${exam.id}`}
                        className={`inline-flex items-center gap-1.5 text-xs font-extrabold py-2 px-4 rounded-xl transition-all ${
                          hasTaken 
                            ? 'bg-muted text-foreground hover:bg-muted/80' 
                            : 'bg-primary text-primary-foreground hover:opacity-90 shadow-xs'
                        }`}
                      >
                        {hasTaken ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" /> Làm lại
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
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 3: DANH SÁCH SĨ SỐ THÀNH VIÊN LỚP HỌC */}
      {/* ========================================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2 m-0">
                <Users className="h-4 w-4 text-primary" />
                Sĩ số Lớp {classInfo.name}: {classmates.length} Học sinh
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold m-0 mt-0.5">
                Danh sách học sinh chính thức được phân bổ vào lớp niên khóa {classInfo.academic_year || '2024-2027'}
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm bạn cùng lớp theo tên / MSHS..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-1.5 pl-8 text-xs font-semibold focus:outline-none focus:border-primary transition-colors text-foreground"
              />
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-3.5 pl-4 w-12 text-center">STT</th>
                    <th className="p-3.5">Mã số học sinh (MSHS)</th>
                    <th className="p-3.5">Họ và tên Học sinh</th>
                    <th className="p-3.5 text-center">Tình trạng</th>
                    <th className="p-3.5 pr-4 text-right">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClassmates.map((mate, index) => {
                    const isCurrentUser = mate.student_id === studentId;
                    const initial = (mate.full_name || 'H')
                      .split(' ')
                      .slice(-1)[0]
                      .charAt(0)
                      .toUpperCase();

                    return (
                      <tr 
                        key={mate.student_id} 
                        className={`transition-colors ${
                          isCurrentUser 
                            ? 'bg-primary/10 font-bold' 
                            : 'hover:bg-muted/10'
                        }`}
                      >
                        <td className="p-3.5 pl-4 text-center font-mono text-muted-foreground font-semibold">
                          {index + 1}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted/60 border border-border text-foreground">
                            {mate.mshs}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCurrentUser 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}>
                              {initial}
                            </div>
                            <span>{mate.full_name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-xs">
                                Bạn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Đang học
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted/40 border border-border px-2 py-0.5 rounded-md">
                            Học sinh
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
