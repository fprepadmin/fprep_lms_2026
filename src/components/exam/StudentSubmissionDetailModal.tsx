'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, AlertCircle, Award, Clock, Calendar, 
  User, CheckCircle2, XCircle, HelpCircle, BookOpen,
  ChevronDown, ChevronUp, Printer, ArrowRight, Loader2
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import StructuredExplanation from '@/components/StructuredExplanation';
import { parseAndRepairJson } from '@/lib/jsonRepair';
import { createSupabaseClient } from '@/lib/supabase';

export interface QuestionDetail {
  id: string;
  exam_id?: string;
  content: string;
  question_type?: 'mcq' | 'tf' | 'saq';
  type?: 'mcq' | 'tf' | 'saq';
  options: any;
  correct_answer?: any;
  correct_option_index?: number;
  explanation?: string;
  level?: string;
  points?: number;
  order_index?: number;
}

export interface SubmissionData {
  id: string;
  student_id: string;
  exam_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  created_at: string;
  answers?: any; // Record<string, any>
  student?: {
    full_name: string;
    mshs: string;
    class_id?: string;
    classes?: { name: string };
  };
  exams?: {
    title: string;
    duration_minutes: number;
    subjects?: { name: string };
  };
}

interface StudentSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SubmissionData | null;
  questions?: QuestionDetail[];
}

export function cleanOptionText(raw: any): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'object') {
    if (raw.text !== undefined) return cleanOptionText(raw.text);
    if (raw.content !== undefined) return cleanOptionText(raw.content);
    return JSON.stringify(raw);
  }
  let str = String(raw).trim();
  if (
    (str.startsWith('{') && str.endsWith('}')) ||
    (str.startsWith('[') && str.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(str);
      if (parsed && typeof parsed === 'object') {
        if (parsed.text !== undefined) return cleanOptionText(parsed.text);
        if (parsed.content !== undefined) return cleanOptionText(parsed.content);
      }
    } catch (e) {}
  }
  return str;
}

// Helpers
const getQuestionType = (q: QuestionDetail): 'mcq' | 'tf' | 'saq' => {
  const declaredType = q.question_type || q.type;
  if (declaredType === 'tf' || declaredType === 'saq') return declaredType;
  if (declaredType === 'mcq') {
    const opts = parseOptions(q.options, 'mcq');
    if (opts.length === 0) return 'saq';
    const contentLower = (q.content || '').toLowerCase();
    if (
      contentLower.includes('đúng hoặc sai') || 
      contentLower.includes('đúng sai') || 
      contentLower.includes('tính đúng/sai') || 
      contentLower.includes('tính đúng sai') || 
      contentLower.includes('xét tính đúng') ||
      contentLower.includes('mệnh đề sau')
    ) {
      return 'tf';
    }
    return 'mcq';
  }

  const contentLower = (q.content || '').toLowerCase();
  if (
    contentLower.includes('đúng hoặc sai') || 
    contentLower.includes('đúng sai') || 
    contentLower.includes('tính đúng/sai') || 
    contentLower.includes('tính đúng sai') || 
    contentLower.includes('xét tính đúng') ||
    contentLower.includes('mệnh đề sau')
  ) {
    return 'tf';
  }

  if (typeof q.correct_answer === 'object' && q.correct_answer !== null && !Array.isArray(q.correct_answer)) {
    return 'tf';
  }
  if (typeof q.correct_answer === 'string') {
    try {
      const parsedCa = parseAndRepairJson(q.correct_answer);
      if (typeof parsedCa === 'object' && parsedCa !== null && !Array.isArray(parsedCa)) return 'tf';
    } catch (e) {}
  }

  const opts = parseOptions(q.options, 'mcq');
  if (opts.length === 0) return 'saq';

  return 'mcq';
};

const parseOptions = (rawOptions: any, type?: 'mcq' | 'tf' | 'saq'): { id: string; text: string }[] => {
  if (!rawOptions) return [];
  let list: any[] = [];
  if (Array.isArray(rawOptions)) {
    list = rawOptions;
  } else if (typeof rawOptions === 'string') {
    try {
      const parsed = parseAndRepairJson(rawOptions);
      if (Array.isArray(parsed)) list = parsed;
      else if (typeof parsed === 'object' && parsed !== null) {
        list = Object.entries(parsed).map(([key, val]) => ({ id: key, text: val }));
      }
    } catch (e) {}
  }

  if (list.length === 0) return [];

  const isTf = type === 'tf';
  const defaultKeys = isTf ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D'];

  return list.map((opt, idx) => {
    if (typeof opt === 'object' && opt !== null) {
      const rawId = opt.id || defaultKeys[idx] || String(idx + 1);
      return {
        id: isTf ? String(rawId).toLowerCase() : String(rawId).toUpperCase(),
        text: cleanOptionText(opt.text ?? opt.content ?? opt)
      };
    }
    return {
      id: defaultKeys[idx] || String(idx + 1),
      text: cleanOptionText(opt)
    };
  });
};

export default function StudentSubmissionDetailModal({
  isOpen,
  onClose,
  submission,
  questions = []
}: StudentSubmissionDetailModalProps) {
  const [filterType, setFilterType] = useState<'all' | 'correct' | 'wrong'>('all');
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  const [internalQuestions, setInternalQuestions] = useState<QuestionDetail[]>(questions);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);

  useEffect(() => {
    if (questions && questions.length > 0) {
      setInternalQuestions(questions);
      return;
    }

    const targetExamId = submission?.exam_id;
    if (!targetExamId) return;

    let isMounted = true;
    const fetchQuestions = async () => {
      setLoadingQuestions(true);
      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', targetExamId)
          .order('order_index', { ascending: true });

        if (isMounted && data && data.length > 0) {
          setInternalQuestions(data);
        }
      } catch (err) {
        console.error('Lỗi tải câu hỏi bài nộp:', err);
      } finally {
        if (isMounted) setLoadingQuestions(false);
      }
    };

    fetchQuestions();

    return () => {
      isMounted = false;
    };
  }, [submission?.exam_id, questions]);

  if (!isOpen || !submission) return null;
  if (typeof document === 'undefined') return null;

  const sortedQuestions = [...internalQuestions].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const userAnswers: Record<string, any> = typeof submission.answers === 'object' && submission.answers !== null
    ? submission.answers
    : (typeof submission.answers === 'string' ? (() => { try { return JSON.parse(submission.answers); } catch(e) { return {}; } })() : {});

  // Kiểm tra tính đúng sai của từng câu
  const checkQuestionStatus = (q: QuestionDetail): 'correct' | 'partial' | 'wrong' | 'unanswered' => {
    const qType = getQuestionType(q);
    const userAns = userAnswers[q.id];

    if (userAns === undefined || userAns === null || userAns === '') {
      return 'unanswered';
    }

    if (qType === 'mcq') {
      const correctOpt = q.correct_answer 
        ? String(q.correct_answer).toUpperCase().trim() 
        : (q.correct_option_index !== undefined ? ['A', 'B', 'C', 'D'][q.correct_option_index] : 'A');
      return String(userAns).toUpperCase().trim() === correctOpt ? 'correct' : 'wrong';
    }

    if (qType === 'tf') {
      let correctTarget: Record<string, boolean> = {};
      if (typeof q.correct_answer === 'object' && q.correct_answer !== null && !Array.isArray(q.correct_answer)) {
        correctTarget = q.correct_answer;
      } else if (typeof q.correct_answer === 'string') {
        try {
          const parsed = JSON.parse(q.correct_answer);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            correctTarget = parsed;
          }
        } catch (e) {}
      }

      const userAnsObj: Record<string, any> = (typeof userAns === 'object' && userAns !== null) 
        ? userAns 
        : {};

      let matchingSubs = 0;
      const opts = parseOptions(q.options, 'tf');
      const subKeys = opts.length > 0 ? opts.map(o => o.id.toLowerCase()) : ['a', 'b', 'c', 'd'];

      subKeys.forEach(k => {
        if (userAnsObj[k] !== undefined && Boolean(userAnsObj[k]) === Boolean(correctTarget[k])) {
          matchingSubs++;
        }
      });

      if (matchingSubs === subKeys.length && subKeys.length > 0) return 'correct';
      if (matchingSubs > 0) return 'partial';
      return 'wrong';
    }

    if (qType === 'saq') {
      const cleanUser = String(userAns).trim().replace(/,/g, '.').toLowerCase();
      const cleanCorrect = String(q.correct_answer || '').trim().replace(/,/g, '.').toLowerCase();
      return cleanUser === cleanCorrect ? 'correct' : 'wrong';
    }

    return 'wrong';
  };

  const filteredQuestions = sortedQuestions.filter(q => {
    if (filterType === 'all') return true;
    const status = checkQuestionStatus(q);
    if (filterType === 'correct') return status === 'correct';
    if (filterType === 'wrong') return status === 'wrong' || status === 'unanswered' || status === 'partial';
    return true;
  });

  const toggleExplanation = (qId: string) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} phút ${secs} giây`;
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border max-w-4xl w-full rounded-2xl shadow-2xl space-y-5 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card flex flex-col max-h-[92vh] p-5 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex justify-between items-start border-b border-border pb-4 shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
              <Award className="h-3.5 w-3.5" /> Chi Tiết Bài Làm Khảo Thí LMS
            </div>
            <h3 className="font-extrabold text-lg sm:text-xl text-foreground">
              {submission.student?.full_name || 'Học sinh'} &bull; {submission.student?.mshs || ''}
            </h3>
            <p className="text-xs text-muted-foreground font-semibold">
              Đề thi: <strong className="text-foreground">{submission.exams?.title || 'Đề thi'}</strong> &bull; Lớp: {submission.student?.classes?.name || '12'} &bull; Môn: {submission.exams?.subjects?.name || 'Toán'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 hover:bg-muted border border-border bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1 text-xs font-bold px-2.5"
              title="In bài làm"
            >
              <Printer className="h-3.5 w-3.5" /> In
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-muted border border-border bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Thống kê kết quả nhanh */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 bg-muted/20 border border-border rounded-xl">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase">Điểm số đạt được</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-2xl font-black ${
                submission.score >= 8 ? 'text-green-500' : submission.score >= 5 ? 'text-blue-500' : 'text-orange-500'
              }`}>
                {submission.score}
              </span>
              <span className="text-xs text-muted-foreground font-bold">/ 10</span>
            </div>
          </div>

          <div className="p-3 bg-muted/20 border border-border rounded-xl">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase">Số câu chính xác</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-foreground">
                {submission.correct_answers}
              </span>
              <span className="text-xs text-muted-foreground font-bold">/ {submission.total_questions || internalQuestions.length} câu</span>
            </div>
          </div>

          <div className="p-3 bg-muted/20 border border-border rounded-xl">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase">Thời gian làm bài</span>
            <div className="text-sm font-black text-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-primary" /> {formatTime(submission.time_spent_seconds || 0)}
            </div>
          </div>

          <div className="p-3 bg-muted/20 border border-border rounded-xl">
            <span className="block text-[10px] font-bold text-muted-foreground uppercase">Thời điểm nộp bài</span>
            <div className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-primary" /> 
              {submission.created_at ? new Date(submission.created_at).toLocaleString('vi-VN') : 'Mới nộp'}
            </div>
          </div>
        </div>

        {/* Thanh lọc câu hỏi */}
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'all' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground'
              }`}
            >
              Tất cả ({internalQuestions.length})
            </button>
            <button
              onClick={() => setFilterType('correct')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'correct' 
                  ? 'bg-green-500 text-white shadow-sm' 
                  : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
              }`}
            >
              Đúng ({internalQuestions.filter(q => checkQuestionStatus(q) === 'correct').length})
            </button>
            <button
              onClick={() => setFilterType('wrong')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'wrong' 
                  ? 'bg-red-500 text-white shadow-sm' 
                  : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
              }`}
            >
              Sai / Chưa làm ({internalQuestions.filter(q => checkQuestionStatus(q) !== 'correct').length})
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-2">
            {loadingQuestions && (
              <span className="inline-flex items-center gap-1 text-primary animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải câu hỏi...
              </span>
            )}
            Hiển thị {filteredQuestions.length} câu hỏi
          </span>
        </div>

        {/* Danh sách câu hỏi chi tiết */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-semibold">
              Không có câu hỏi nào thuộc bộ lọc này.
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              const status = checkQuestionStatus(q);
              const qType = getQuestionType(q);
              const userAns = userAnswers[q.id];
              const opts = parseOptions(q.options);
              const isExplanationOpen = Boolean(expandedExplanations[q.id]);
              const qPt = q.points !== undefined && q.points !== null && !isNaN(Number(q.points)) && Number(q.points) > 0
                ? Number(q.points)
                : (qType === 'tf' ? 1.0 : qType === 'saq' ? 0.5 : 0.25);

              let earnedScore = 0;
              if (status === 'correct') {
                earnedScore = qPt;
              } else if (status === 'partial' && qType === 'tf') {
                let match = 0;
                let correctTarget: any = {};
                if (typeof q.correct_answer === 'object' && q.correct_answer !== null) correctTarget = q.correct_answer;
                else if (typeof q.correct_answer === 'string') {
                  try { correctTarget = JSON.parse(q.correct_answer); } catch(e) {}
                }
                const subKeys = opts.length > 0 ? opts.map(o => o.id.toLowerCase()) : ['a', 'b', 'c', 'd'];
                const userAnsObj = typeof userAns === 'object' && userAns !== null ? userAns : {};
                subKeys.forEach(k => {
                  if (userAnsObj[k] !== undefined && Boolean(userAnsObj[k]) === Boolean(correctTarget[k])) match++;
                });
                if (match === 4) earnedScore = qPt * 1.0;
                else if (match === 3) earnedScore = qPt * 0.5;
                else if (match === 2) earnedScore = qPt * 0.25;
                else if (match === 1) earnedScore = qPt * 0.1;
                earnedScore = Math.round(earnedScore * 100) / 100;
              }

              return (
                <div 
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    status === 'correct' 
                      ? 'bg-green-500/[0.03] border-green-500/30' 
                      : status === 'partial'
                      ? 'bg-yellow-500/[0.03] border-yellow-500/30'
                      : 'bg-red-500/[0.03] border-red-500/30'
                  }`}
                >
                  {/* Tiêu đề câu hỏi */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground bg-background px-2.5 py-0.5 rounded-md border border-border">
                        Câu {q.order_index || idx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-2 py-0.5 rounded border border-border">
                        {qType === 'mcq' ? 'Trắc nghiệm 4 lựa chọn' : qType === 'tf' ? 'Đúng / Sai 4 ý' : 'Trả lời ngắn'}
                      </span>
                      {q.level && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          {q.level}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0">
                      {status === 'correct' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-500/10 border border-green-500/30 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Đúng (+{qPt} đ)
                        </span>
                      ) : status === 'partial' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-0.5 rounded-full">
                          <AlertCircle className="h-3.5 w-3.5" /> Đúng một phần (+{earnedScore} / {qPt} đ)
                        </span>
                      ) : status === 'unanswered' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full">
                          <XCircle className="h-3.5 w-3.5" /> Chưa trả lời (0 / {qPt} đ)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                          <XCircle className="h-3.5 w-3.5" /> Sai (0 / {qPt} đ)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div className="text-foreground text-xs leading-relaxed font-medium">
                    <MathRenderer content={q.content} />
                  </div>

                  {/* Phần hiển thị đáp án theo loại câu hỏi */}
                  {qType === 'mcq' && (
                    <div className="grid gap-2 pt-1">
                      {opts.map((opt, optIdx) => {
                        const optKey = ['A', 'B', 'C', 'D'][optIdx] || opt.id.toUpperCase();
                        const isStudentChosen = String(userAns).toUpperCase().trim() === optKey;
                        const correctOptKey = q.correct_answer 
                          ? String(q.correct_answer).toUpperCase().trim() 
                          : (q.correct_option_index !== undefined ? ['A', 'B', 'C', 'D'][q.correct_option_index] : 'A');
                        const isCorrectOption = correctOptKey === optKey;

                        let cardStyle = 'bg-background border-border text-muted-foreground';
                        if (isCorrectOption) {
                          cardStyle = 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-300 font-bold';
                        } else if (isStudentChosen && !isCorrectOption) {
                          cardStyle = 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300 font-bold';
                        }

                        return (
                          <div 
                            key={opt.id || optIdx}
                            className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${cardStyle}`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                                isCorrectOption 
                                  ? 'bg-green-500 text-white' 
                                  : isStudentChosen 
                                  ? 'bg-red-500 text-white' 
                                  : 'bg-muted text-foreground'
                              }`}>
                                {optKey}
                              </span>
                              <div className="min-w-0 break-words pt-0.5">
                                <MathRenderer content={opt.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isStudentChosen && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                                  Học sinh chọn
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-green-500 text-white flex items-center gap-0.5">
                                  <Check className="h-3 w-3" /> Đáp án đúng
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {qType === 'tf' && (
                    <div className="space-y-2 pt-1">
                      {opts.map((opt, optIdx) => {
                        const subKey = ['a', 'b', 'c', 'd'][optIdx] || opt.id.toLowerCase();
                        let correctTarget: Record<string, boolean> = {};
                        if (typeof q.correct_answer === 'object' && q.correct_answer !== null && !Array.isArray(q.correct_answer)) {
                          correctTarget = q.correct_answer;
                        } else if (typeof q.correct_answer === 'string') {
                          try {
                            const parsed = JSON.parse(q.correct_answer);
                            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                              correctTarget = parsed;
                            }
                          } catch (e) {}
                        }

                        const userAnsObj: Record<string, any> = (typeof userAns === 'object' && userAns !== null) ? userAns : {};
                        const studentSubAns = userAnsObj[subKey];
                        const correctSubVal = correctTarget[subKey];
                        const isSubMatch = studentSubAns !== undefined && Boolean(studentSubAns) === Boolean(correctSubVal);

                        return (
                          <div 
                            key={opt.id || optIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              isSubMatch 
                                ? 'bg-green-500/[0.04] border-green-500/30' 
                                : 'bg-red-500/[0.04] border-red-500/30'
                            }`}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="font-extrabold text-primary shrink-0 uppercase">{subKey})</span>
                              <div className="min-w-0 break-words">
                                <MathRenderer content={opt.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-[11px] font-bold">
                              <span>
                                HS: <strong className={studentSubAns === true ? 'text-blue-500' : studentSubAns === false ? 'text-orange-500' : 'text-muted-foreground'}>
                                  {studentSubAns === true ? 'ĐÚNG' : studentSubAns === false ? 'SAI' : 'Chưa chọn'}
                                </strong>
                              </span>
                              <span>&bull;</span>
                              <span>
                                Chuẩn: <strong className="text-green-600">{correctSubVal === true ? 'ĐÚNG' : 'SAI'}</strong>
                              </span>
                              {isSubMatch ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {qType === 'saq' && (
                    <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Câu trả lời của học sinh: <strong className="text-foreground text-sm">{userAns !== undefined && userAns !== '' ? String(userAns) : '(Bỏ trống)'}</strong></span>
                        <span>Đáp án chuẩn: <strong className="text-green-600 text-sm">{String(q.correct_answer || '')}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Lời giải chi tiết */}
                  {q.explanation && (
                    <div className="pt-2 border-t border-border/50">
                      <button
                        onClick={() => toggleExplanation(q.id)}
                        className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {isExplanationOpen ? 'Ẩn lời giải chi tiết' : 'Xem lời giải chi tiết'}
                        {isExplanationOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {isExplanationOpen && (
                        <div className="mt-2 animate-fade-in">
                          <StructuredExplanation content={q.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
