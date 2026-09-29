'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Award, Clock, Calendar, Eye, 
  CheckCircle2, User, Trophy, Sparkles, AlertCircle
} from 'lucide-react';
import { SubmissionData } from './StudentSubmissionDetailModal';

export interface StudentAttemptItem {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  created_at: string;
  answers?: any;
  student?: {
    full_name: string;
    mshs: string;
    classes?: { name: string };
    class_id?: string;
  };
  exams?: {
    title: string;
    duration_minutes?: number;
    subjects?: { name: string };
  };
}

interface StudentAttemptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  studentMshs?: string;
  className?: string;
  examTitle?: string;
  attempts: StudentAttemptItem[];
  onSelectAttemptToInspect: (attempt: StudentAttemptItem) => void;
}

export default function StudentAttemptsModal({
  isOpen,
  onClose,
  studentName,
  studentMshs,
  className,
  examTitle,
  attempts,
  onSelectAttemptToInspect
}: StudentAttemptsModalProps) {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Sắp xếp các lần làm từ cũ đến mới (Lần 1, Lần 2...) hoặc mới nhất lên đầu
  const sortedAttempts = [...attempts].sort((a, b) => 
    new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
  );

  // Tìm điểm cao nhất
  const highestScore = sortedAttempts.length > 0
    ? Math.max(...sortedAttempts.map(a => Number(a.score) || 0))
    : 0;

  const displayName = studentName || sortedAttempts[0]?.student?.full_name || 'Học sinh';
  const displayMshs = studentMshs || sortedAttempts[0]?.student?.mshs || '';
  const displayClass = className || sortedAttempts[0]?.student?.classes?.name || '';
  const displayExamTitle = examTitle || sortedAttempts[0]?.exams?.title || 'Đề thi';

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border max-w-2xl w-full rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-border pb-3 shrink-0 gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Trophy className="h-3 w-3 text-amber-500" /> Lịch sử {sortedAttempts.length} lần nộp bài
              </span>
              {displayClass && (
                <span className="bg-muted text-muted-foreground border border-border text-[10px] font-bold px-2 py-0.5 rounded">
                  Lớp {displayClass}
                </span>
              )}
            </div>
            <h3 className="font-black text-base sm:text-lg text-foreground truncate">
              {displayName} {displayMshs ? `(${displayMshs})` : ''}
            </h3>
            <p className="text-xs text-muted-foreground font-semibold truncate">
              Đề thi: <span className="text-foreground font-bold">{displayExamTitle}</span>
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Đóng"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Banner Điểm Cao Nhất */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-transparent border border-amber-500/25 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                Điểm cao nhất ghi nhận
              </span>
              <span className="text-lg font-black text-foreground">
                {highestScore} <span className="text-xs text-muted-foreground font-normal">/ 10 điểm</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-muted-foreground block">
              Tổng số lần làm: <strong className="text-primary">{sortedAttempts.length} lần</strong>
            </span>
          </div>
        </div>

        {/* Danh sách các lần làm bài */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
          {sortedAttempts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic border border-dashed border-border rounded-xl">
              Chưa có dữ liệu bài nộp nào cho học sinh này.
            </div>
          ) : (
            sortedAttempts.map((item, index) => {
              const attemptNum = index + 1;
              const isBest = Number(item.score) === highestScore;
              const minutes = Math.floor((item.time_spent_seconds || 0) / 60);
              const seconds = (item.time_spent_seconds || 0) % 60;
              const timeString = `${minutes} phút ${seconds}s`;
              const formattedDate = item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'Không rõ thời gian';

              return (
                <div 
                  key={item.id || index}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isBest 
                      ? 'bg-amber-500/[0.04] dark:bg-amber-500/10 border-amber-500/40 shadow-xs' 
                      : 'bg-card border-border hover:border-primary/30'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-foreground">
                        Lần nộp #{attemptNum}
                      </span>
                      {isBest && (
                        <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Trophy className="h-2.5 w-2.5" /> Điểm cao nhất
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {item.correct_answers} / {item.total_questions || '—'} câu đúng
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" /> {timeString}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className={`text-base font-black px-2.5 py-1 rounded-lg ${
                        Number(item.score) >= 8.0 
                          ? 'text-green-700 bg-green-500/15 dark:text-green-300' 
                          : Number(item.score) >= 5.0 
                          ? 'text-blue-700 bg-blue-500/15 dark:text-blue-300' 
                          : 'text-red-700 bg-red-500/15 dark:text-red-300'
                      }`}>
                        {item.score} / 10
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectAttemptToInspect(item)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold text-primary border-primary/30 hover:bg-primary/10 shadow-xs"
                      title="Xem chi tiết bài làm lần này"
                    >
                      <Eye className="h-3.5 w-3.5" /> Xem bài làm
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold hover:bg-muted transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
