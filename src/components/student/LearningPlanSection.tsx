'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, Clock, Circle, PlayCircle, 
  Target, ArrowRight, BookOpen, AlertCircle, Sparkles, Filter
} from 'lucide-react';
import Link from 'next/link';

interface LearningPlanItem {
  id: string;
  title: string;
  subjectName: string;
  type: 'lesson' | 'exam';
  status: 'pending' | 'in_progress' | 'completed';
  href: string;
  progressPercent?: number;
  score?: number;
}

interface LearningPlanSectionProps {
  lastAccessedLesson?: any;
  subjects: any[];
  chapters: any[];
  progress: any[];
  exams: any[];
  examResults: any[];
}

export default function LearningPlanSection({
  lastAccessedLesson,
  subjects,
  chapters,
  progress,
  exams,
  examResults
}: LearningPlanSectionProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'pending' | 'completed'>('all');

  // Xây dựng danh sách nhiệm vụ từ dữ liệu thực tế
  const tasks: LearningPlanItem[] = useMemo(() => {
    const list: LearningPlanItem[] = [];

    // 1. Nhiệm vụ Đang thực hiện: Bài học dang dở gần nhất
    if (lastAccessedLesson && lastAccessedLesson.lessons) {
      list.push({
        id: `progress-${lastAccessedLesson.lesson_id}`,
        title: lastAccessedLesson.lessons.title,
        subjectName: lastAccessedLesson.lessons.chapters?.subjects?.name || 'Môn học',
        type: 'lesson',
        status: 'in_progress',
        href: `/dashboard/student/lessons/${lastAccessedLesson.lesson_id}`,
        progressPercent: 50
      });
    }

    // 2. Nhiệm vụ Chưa thực hiện: Đề thi mới nhất chưa làm (tối đa 4 đề)
    const takenExamIds = new Set(examResults.map((r: any) => r.exam_id));
    const pendingExams = exams.filter((e: any) => !takenExamIds.has(e.id)).slice(0, 3);
    pendingExams.forEach((exam: any) => {
      const sub = subjects.find((s: any) => s.id === exam.subject_id);
      list.push({
        id: `exam-${exam.id}`,
        title: exam.title,
        subjectName: sub?.name || 'Luyện đề',
        type: 'exam',
        status: 'pending',
        href: `/dashboard/student/exams/${exam.id}`,
        progressPercent: 0
      });
    });

    // 3. Nhiệm vụ Đã hoàn thành: Các bài thi hoặc bài giảng đã hoàn tất gần đây
    examResults.slice(0, 3).forEach((res: any) => {
      const exam = exams.find((e: any) => e.id === res.exam_id);
      const sub = exam ? subjects.find((s: any) => s.id === exam.subject_id) : null;
      list.push({
        id: `result-${res.id}`,
        title: exam?.title || `Đề thi khảo thí`,
        subjectName: sub?.name || 'Đã nộp bài',
        type: 'exam',
        status: 'completed',
        href: `/dashboard/student/exams`,
        score: res.score,
        progressPercent: 100
      });
    });

    return list;
  }, [lastAccessedLesson, exams, examResults, subjects]);

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks;
    return tasks.filter(t => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="p-5 sm:p-6 rounded-[18px] bg-white dark:bg-[#0B1B55]/70 border border-[#E2E8F0] dark:border-[#1B317A] shadow-[0_4px_20px_-2px_rgba(11,27,85,0.04)] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#1746D1]/10 text-[#1746D1] dark:bg-blue-500/20 dark:text-blue-300">
              <Target className="w-4 h-4" />
            </span>
            <h3 className="text-lg sm:text-xl font-black font-heading text-[#14213D] dark:text-white m-0">
              Kế Hoạch & Nhiệm Vụ Học Tập
            </h3>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium font-body m-0">
            Theo dõi chuyên đề trọng tâm, bài học cần tiếp tục và bài tập cần hoàn thành.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#F1F5F9] dark:bg-slate-900 p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-800 self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-[#0B1B55] text-[#14213D] dark:text-white shadow-xs font-black'
                : 'text-[#64748B] hover:text-[#14213D]'
            }`}
          >
            Tất cả ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'in_progress'
                ? 'bg-[#087CFF] text-white shadow-xs font-black'
                : 'text-[#64748B] hover:text-[#087CFF]'
            }`}
          >
            <Clock className="w-3 h-3 text-[#087CFF] dark:text-cyan-300" />
            Đang thực hiện ({inProgressCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'pending'
                ? 'bg-[#E9A23B] text-white shadow-xs font-black'
                : 'text-[#64748B] hover:text-[#d97706]'
            }`}
          >
            <Circle className="w-3 h-3 text-[#E9A23B]" />
            Chưa thực hiện ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              statusFilter === 'completed'
                ? 'bg-[#16A36A] text-white shadow-xs font-black'
                : 'text-[#64748B] hover:text-[#16A36A]'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-[#16A36A]" />
            Đã hoàn thành ({completedCount})
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center text-[#64748B] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#16A36A] mx-auto opacity-70" />
            <p className="text-xs font-bold">Không có nhiệm vụ nào trong mục này.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';
            const isInProgress = task.status === 'in_progress';

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isInProgress
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                    : isCompleted
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-200/80 dark:border-emerald-900/40'
                    : 'bg-[#F8FAFC] dark:bg-slate-900/40 border-[#E2E8F0] dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 p-2 rounded-xl border shrink-0 ${
                    isInProgress
                      ? 'bg-[#087CFF]/15 text-[#087CFF] border-[#087CFF]/30'
                      : isCompleted
                      ? 'bg-[#16A36A]/15 text-[#16A36A] border-[#16A36A]/30'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                  }`}>
                    {isInProgress ? (
                      <Clock className="w-4 h-4 animate-spin-slow" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#1746D1]/8 text-[#1746D1] dark:bg-blue-500/20 dark:text-blue-300 border border-[#1746D1]/15">
                        {task.subjectName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isInProgress
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300'
                          : isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300'
                      }`}>
                        {isInProgress ? 'Đang thực hiện' : isCompleted ? 'Đã hoàn thành' : 'Chưa thực hiện'}
                      </span>
                      {task.score !== undefined && (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                          {task.score} điểm
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-[#14213D] dark:text-white truncate m-0 font-heading">
                      {task.title}
                    </h4>
                  </div>
                </div>

                <Link
                  href={task.href}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 self-start sm:self-auto cursor-pointer ${
                    isInProgress
                      ? 'bg-[#1746D1] text-white hover:bg-[#087CFF] shadow-xs'
                      : isCompleted
                      ? 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[#14213D] dark:text-white hover:bg-slate-100'
                      : 'bg-gradient-to-r from-[#0B1B55] to-[#1746D1] text-white hover:opacity-95 shadow-xs'
                  }`}
                >
                  {isInProgress ? (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Học tiếp ngay</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <span>Xem lại</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Bắt đầu ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
