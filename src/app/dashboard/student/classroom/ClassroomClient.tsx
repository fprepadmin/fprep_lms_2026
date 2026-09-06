'use client';

import React, { useState } from 'react';
import { 
  Users, GraduationCap, Calendar, Mail, BookOpen, 
  MessageSquare, FileText, CheckCircle2, Award, Clock,
  ArrowRight, Search, Bell, RotateCcw, AlertCircle, Send
} from 'lucide-react';
import Link from 'next/link';

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
  teacherProfile?: { id: string; email: string };
}

interface Exam {
  id: string;
  subject_id: string;
  title: string;
  duration_minutes: number;
  exam_type?: string;
  subjects?: { id: string; name: string };
}

interface ExamAssignment {
  id: string;
  exam_id: string;
  class_id: string;
  teacher_id?: string;
  due_date?: string | null;
  start_date?: string | null;
  note?: string | null;
  score_weight?: string | null;
  exams?: Exam;
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
  examAssignments?: ExamAssignment[];
  examResults: any[];
  studentId: string;
}

export default function ClassroomClient({
  classInfo,
  classmates,
  teacherAssignments,
  announcements,
  exams,
  examAssignments = [],
  examResults,
  studentId
}: ClassroomClientProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'assignments' | 'members'>('feed');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchMember, setSearchMember] = useState<string>('');

  // Lọc bài tập theo môn
  const filteredExams = exams.filter(exam => {
    if (selectedSubjectFilter === 'all') return true;
    return exam.subject_id === selectedSubjectFilter;
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

  // Danh sách các môn có bài tập
  const uniqueSubjects = Array.from(
    new Map(exams.map(e => [e.subject_id, e.subjects])).values()
  ).filter(Boolean);

  const completedAssignmentsCount = new Set(
    examResults.filter(r => exams.some(e => e.id === r.exam_id)).map(r => r.exam_id)
  ).size;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HEADER LỚP HỌC (CHUẨN FMATH BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <GraduationCap className="h-3.5 w-3.5" /> Lớp học chính khóa Khối 12
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Lớp {classInfo.name}
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold flex flex-wrap items-center gap-3 m-0">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Niên khóa: <strong className="text-[#212529] dark:text-foreground">{classInfo.academic_year || '2026-2027'}</strong>
            </span>
            <span>&bull;</span>
            <span>Ban: <strong className="text-primary">{classInfo.group_type === 'T' ? 'Khoa học Tự nhiên' : classInfo.group_type === 'X' ? 'Khoa học Xã hội' : 'Khai phóng'}</strong></span>
          </p>
        </div>

        {/* WIDGET TỔNG QUAN LỚP */}
        <div className="flex gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-6 shrink-0">
          <div className="text-center">
            <span className="block text-2xl font-bold font-heading text-primary">{classmates.length}</span>
            <span className="text-[10px] font-bold text-[#6c757d] uppercase">Học sinh</span>
          </div>
          <div className="text-center border-l border-border pl-4 sm:pl-6">
            <span className="block text-2xl font-bold font-heading text-secondary dark:text-foreground">{exams.length}</span>
            <span className="text-[10px] font-bold text-[#6c757d] uppercase">Bài tập</span>
          </div>
        </div>
      </div>

      {/* 3 TABS CHÍNH CỦA LỚP HỌC (CHUẨN FMATH) */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
            activeTab === 'feed'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef]'
          }`}
        >
          <Bell className="h-4 w-4" /> Bảng tin lớp học
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
            activeTab === 'assignments'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef]'
          }`}
        >
          <FileText className="h-4 w-4" /> Bài tập ({exams.length})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground hover:bg-[#e9ecef]'
          }`}
        >
          <Users className="h-4 w-4" /> Thành viên ({classmates.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. TAB BẢNG TIN (FEED) */}
      {/* ========================================================================= */}
      {activeTab === 'feed' && (
        <div className="grid gap-6 md:grid-cols-12 items-start">
          
          {/* CỘT TRÁI (COL-SPAN-8): THÔNG BÁO VÀ HOẠT ĐỘNG CỦA LỚP */}
          <div className="md:col-span-8 space-y-6">
            
            <div className="flat-card space-y-4">
              <h3 className="font-bold font-heading text-[15px] flex items-center gap-2 border-b border-border pb-3 m-0 text-[#212529] dark:text-foreground">
                <Bell className="h-4 w-4 text-primary" /> Thông báo dành cho lớp {classInfo.name}
              </h3>

              {announcements.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#6c757d] italic">
                  Chưa có thông báo mới nào cho lớp học.
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-border">
                  {announcements.map((ann: any) => (
                    <div key={ann.id} className="pt-3.5 first:pt-0 space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-[14px] text-[#212529] dark:text-foreground m-0">{ann.title}</h4>
                        <span className="text-[10px] text-[#6c757d] font-semibold flex items-center gap-1 shrink-0">
                          <Calendar className="h-3 w-3" /> {ann.date} &bull; {ann.sender}
                        </span>
                      </div>
                      <div 
                        className="text-xs text-[#495057] dark:text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: ann.content }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NHẮC NHỞ BÀI TẬP CỦA LỚP */}
            <div className="flat-card space-y-2.5 bg-gradient-to-r from-[#e7f1ff]/30 via-card to-card border-[#b6d4fe]">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
                  <Award className="h-4.5 w-4.5 text-primary" /> Tiến độ bài tập của bạn trong lớp
                </h4>
                <span className="badge-primary">
                  {completedAssignmentsCount} / {exams.length} bài hoàn thành
                </span>
              </div>
              <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
                Hãy thường xuyên kiểm tra tab <strong>"Bài tập"</strong> để hoàn thành đầy đủ các đề luyện tập được thầy cô giao theo tuần.
              </p>
            </div>

          </div>

          {/* CỘT PHẢI (COL-SPAN-4): GIÁO VIÊN BỘ MÔN PHỤ TRÁCH LỚP */}
          <div className="md:col-span-4 space-y-4">
            <div className="flat-card space-y-3.5">
              <h3 className="font-bold font-heading text-[15px] flex items-center gap-2 border-b border-border pb-3 m-0 text-[#212529] dark:text-foreground">
                <BookOpen className="h-4.5 w-4.5 text-primary" />
                Giáo viên phụ trách lớp
              </h3>
              
              {teacherAssignments.length === 0 ? (
                <p className="text-xs text-[#6c757d] italic m-0">Chưa có thông tin phân công giáo viên cho lớp.</p>
              ) : (
                <div className="space-y-2.5">
                  {teacherAssignments.map((ass) => (
                    <div key={ass.id} className="p-3 bg-[#f8f9fa] dark:bg-muted/40 border border-border rounded-xl space-y-1">
                      <span className="block text-xs font-bold text-[#212529] dark:text-foreground">
                        Môn {ass.subjects?.name || 'Môn học'}
                      </span>
                      <p className="text-[11px] text-[#6c757d] flex items-center gap-1.5 font-semibold m-0">
                        <Mail className="h-3 w-3 text-primary" /> 
                        {ass.teacherProfile?.email || 'Chưa cập nhật email'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TAB BÀI TẬP (ASSIGNMENTS & EXAMS BY SUBJECT) */}
      {/* ========================================================================= */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          
          {/* THANH LỌC BÀI TẬP THEO MÔN */}
          <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <span className="text-xs font-bold text-[#6c757d] uppercase shrink-0 mr-1">Phân loại môn:</span>
              <button
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground border-border hover:bg-[#e9ecef]'
                }`}
              >
                Tất cả ({exams.length})
              </button>
              {uniqueSubjects.map((sub: any) => {
                const count = exams.filter(e => e.subject_id === sub.id).length;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubjectFilter(sub.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                      selectedSubjectFilter === sub.id
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-[#f8f9fa] dark:bg-muted/40 text-[#495057] dark:text-muted-foreground border-border hover:bg-[#e9ecef]'
                    }`}
                  >
                    {sub.name} ({count})
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-semibold text-[#6c757d] shrink-0 font-ui">
              Đã nộp: <strong className="text-[#212529] dark:text-foreground">{completedAssignmentsCount}/{exams.length} bài</strong>
            </span>
          </div>

          {/* DANH SÁCH BÀI TẬP */}
          {filteredExams.length === 0 ? (
            <div className="text-center py-16 flat-card border-dashed">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-bold text-muted-foreground text-sm m-0">Chưa có bài tập nào được giao cho môn học này.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam) => {
                const bestRes = getBestResult(exam.id);
                const hasTaken = Boolean(bestRes);
                const classAss = examAssignments.find(a => a.exam_id === exam.id);

                return (
                  <div
                    key={exam.id}
                    className={`flat-card flex flex-col justify-between gap-4 transition-all ${
                      classAss ? 'border-primary/40 bg-gradient-to-br from-primary/[0.03] via-card to-card ring-1 ring-primary/10' : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="space-y-2.5">
                      
                      {/* Huy hiệu Giao bài cho lớp & Loại điểm */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {classAss && (
                          <span className="bg-primary/10 text-primary border border-primary/30 text-[10px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                            <Send className="h-3 w-3" /> Bài tập lớp {classInfo.name}
                          </span>
                        )}
                        {classAss?.score_weight && (
                          <span className="bg-muted text-foreground border border-border text-[10px] font-bold px-2 py-0.5 rounded">
                            {classAss.score_weight === '15p' ? 'Điểm 15p' : classAss.score_weight === '45p' ? 'Điểm 1 tiết' : classAss.score_weight === 'thpt' ? 'Thi thử THPT' : 'Luyện tập'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <h4 
                          className="font-bold text-[14px] sm:text-[15px] text-[#212529] dark:text-foreground line-clamp-2 break-words m-0 leading-snug"
                          title={exam.title}
                        >
                          {exam.title}
                        </h4>
                        {hasTaken && (
                          <span className="badge-success shrink-0 font-black">
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

                      {/* Hạn chót nộp bài */}
                      {classAss?.due_date && (
                        <div className="p-2 rounded-lg bg-muted/30 border border-border text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Hạn chót: <strong className="text-foreground">{new Date(classAss.due_date).toLocaleString('vi-VN')}</strong></span>
                        </div>
                      )}

                      {/* Lời dặn của Giáo viên */}
                      {classAss?.note && (
                        <p className="text-[11px] text-[#495057] dark:text-muted-foreground italic bg-primary/5 p-2 rounded-lg border border-primary/10 m-0">
                          &ldquo;{classAss.note}&rdquo;
                        </p>
                      )}

                    </div>

                    <div className="pt-2.5 border-t border-border flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold">
                        {hasTaken ? (
                          <span className="text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Đã nộp bài
                          </span>
                        ) : (
                          <span className="text-orange-500 font-bold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Chưa làm bài
                          </span>
                        )}
                      </span>

                      <Link
                        href={`/dashboard/student/exams/${exam.id}`}
                        className={hasTaken ? "btn-secondary text-xs py-1.5 px-3.5" : "btn-primary text-xs py-1.5 px-3.5 shadow-sm"}
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
      {/* 3. TAB THÀNH VIÊN (MEMBERS & SĨ SỐ) */}
      {/* ========================================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          
          <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold font-heading text-[15px] text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
              <Users className="h-4.5 w-4.5 text-primary" />
              Sĩ số: {classmates.length} Học sinh
            </h3>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Tìm bạn cùng lớp theo tên / MSHS..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full bg-[#f8f9fa] dark:bg-muted/40 border border-border rounded-lg px-3 py-1.5 pl-8 text-xs font-semibold focus:outline-none focus:border-primary transition-colors"
              />
              <Search className="h-3.5 w-3.5 text-[#6c757d] absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="flat-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-[#f8f9fa] dark:bg-muted/40 text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">
                    <th className="p-3.5 pl-4">STT</th>
                    <th className="p-3.5">Mã số học sinh (MSHS)</th>
                    <th className="p-3.5">Họ và tên</th>
                    <th className="p-3.5 pr-4 text-right">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClassmates.map((mate, index) => {
                    const isCurrentUser = mate.student_id === studentId;

                    return (
                      <tr 
                        key={mate.student_id} 
                        className={`hover:bg-[#f8f9fa] dark:hover:bg-muted/30 transition-colors ${isCurrentUser ? 'bg-[#e7f1ff]/50 dark:bg-primary/10 font-bold' : ''}`}
                      >
                        <td className="p-3.5 pl-4 font-semibold text-[#6c757d]">{index + 1}</td>
                        <td className="p-3.5 font-bold text-[#212529] dark:text-foreground font-ui">{mate.mshs}</td>
                        <td className="p-3.5 font-semibold text-[#212529] dark:text-foreground flex items-center gap-2">
                          {mate.full_name}
                          {isCurrentUser && (
                            <span className="badge-primary text-[9px] py-0.5">
                              Bạn
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <span className="text-[10px] font-semibold text-[#6c757d] bg-[#f8f9fa] dark:bg-muted border border-border px-2 py-0.5 rounded">
                            Thành viên
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
