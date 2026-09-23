'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Award, Clock, CheckCircle2, AlertTriangle, 
  ChevronLeft, ClipboardList, HelpCircle, Check, X,
  ArrowRight, ArrowLeft, Layers, Sparkles, Maximize2,
  Minimize2, Flag, RotateCcw, BookOpen, AlertCircle,
  Eye, CheckSquare, XCircle, Send, ZoomIn, ZoomOut,
  SlidersHorizontal, ChevronRight, CornerDownRight,
  ListFilter, LayoutGrid, Menu
} from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';
import MathRenderer from '@/components/MathRenderer';
import { parseAndRepairJson } from '@/lib/jsonRepair';

interface Question {
  id: string;
  content: string;
  question_type?: 'mcq' | 'tf' | 'saq';
  options: any;
  correct_option_index?: number;
  correct_answer?: any;
  explanation?: string;
  level?: string;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  subject_id: string;
  exam_type?: string;
  subjects?: { name: string };
}

interface ExamSessionClientProps {
  exam: Exam;
  questions: Question[];
  studentId: string;
}

/**
 * Làm sạch và giải mã đệ quy các tầng JSON stringified lồng nhau.
 * Xử lý dứt điểm lỗi hiển thị chuỗi JSON thô như:
 * {"id":"a","text":"{\"id\":\"a\",\"text\":\"Đạo hàm của hàm số...\"}"}
 */
function cleanOptionText(raw: any): string {
  if (raw === null || raw === undefined) return '';
  let cur: any = raw;

  // 1. Unwrap các object có thuộc tính text / content / label
  let objectDepth = 0;
  while (typeof cur === 'object' && cur !== null && objectDepth < 5) {
    if (cur.text !== undefined) cur = cur.text;
    else if (cur.content !== undefined) cur = cur.content;
    else if (cur.label !== undefined) cur = cur.label;
    else break;
    objectDepth++;
  }

  // 2. Unwrap các chuỗi JSON lồng nhau
  let stringDepth = 0;
  while (typeof cur === 'string' && stringDepth < 5) {
    const trimmed = cur.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          if (Array.isArray(parsed)) {
            cur = parsed.length > 0 ? parsed[0] : '';
          } else {
            cur = parsed.text ?? parsed.content ?? parsed.label ?? parsed;
          }
          stringDepth++;
          continue;
        }
      } catch (e) {
        try {
          const repaired = parseAndRepairJson(trimmed);
          if (typeof repaired === 'object' && repaired !== null) {
            cur = (repaired as any).text ?? (repaired as any).content ?? (repaired as any).label ?? repaired;
            stringDepth++;
            continue;
          }
        } catch (e2) {}
        break;
      }
    }
    break;
  }

  // 3. Nếu sau khi parse vẫn là object
  if (typeof cur === 'object' && cur !== null) {
    cur = (cur as any).text ?? (cur as any).content ?? (cur as any).label ?? '';
  }

  return typeof cur === 'string' ? cur : String(cur ?? '');
}

// Helpers nhận diện loại câu hỏi
const getQuestionType = (q: Question): 'mcq' | 'tf' | 'saq' => {
  const declaredType = q.question_type || (q as any).type;
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

export default function ExamSessionClient({
  exam,
  questions: initialQuestions,
  studentId
}: ExamSessionClientProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  
  // Sắp xếp câu hỏi theo thứ tự chuẩn
  const questions = useMemo(() => {
    return [...initialQuestions].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }, [initialQuestions]);

  // Phân loại câu hỏi theo Cấu trúc Đề thi Chuẩn 2026 của Bộ GD&ĐT
  const part1Questions = useMemo(() => questions.filter(q => getQuestionType(q) === 'mcq'), [questions]);
  const part2Questions = useMemo(() => questions.filter(q => getQuestionType(q) === 'tf'), [questions]);
  const part3Questions = useMemo(() => questions.filter(q => getQuestionType(q) === 'saq'), [questions]);

  // Trạng thái bài làm & chế độ xem
  const [viewMode, setViewMode] = useState<'focus' | 'list'>('focus');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState((exam.duration_minutes || 45) * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [gridFilter, setGridFilter] = useState<'all' | 'done' | 'undone' | 'flagged'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct'>('all');
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  // Kết quả sau khi nộp bài
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    totalCount: number;
    timeSpent: number;
    part1Correct: number;
    part2Correct: number;
    part3Correct: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Bộ đếm thời gian
  useEffect(() => {
    if (isSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSubmitted]);

  // Phím tắt bàn phím tiện ích
  useEffect(() => {
    if (isSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu đang gõ trong input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const activeQ = questions[currentQuestionIndex];
      if (!activeQ) return;

      const activeQType = getQuestionType(activeQ);

      // Chuyển câu bằng mũi tên trái / phải
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
      } else if (e.key.toLowerCase() === 'f') {
        // Cắm cờ / Đánh dấu
        e.preventDefault();
        toggleFlag(activeQ.id);
      } else if (activeQType === 'mcq') {
        // Phím A, B, C, D hoặc 1, 2, 3, 4
        const keyMap: Record<string, string> = {
          '1': 'A', 'a': 'A', 'A': 'A',
          '2': 'B', 'b': 'B', 'B': 'B',
          '3': 'C', 'c': 'C', 'C': 'C',
          '4': 'D', 'd': 'D', 'D': 'D'
        };
        if (keyMap[e.key]) {
          e.preventDefault();
          setAnswers(prev => ({ ...prev, [activeQ.id]: keyMap[e.key] }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, questions, isSubmitted]);

  // Đánh dấu câu hỏi cần xem lại
  const toggleFlag = useCallback((qId: string) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  }, []);

  // Kiểm tra câu hỏi đã hoàn thành chưa
  const isQuestionAnswered = useCallback((q: Question) => {
    const qType = getQuestionType(q);
    const ans = answers[q.id];
    if (ans === undefined || ans === null) return false;
    if (qType === 'mcq') return String(ans).trim() !== '';
    if (qType === 'tf') {
      const opts = parseOptions(q.options, 'tf');
      const expectedKeys = opts.length > 0 ? opts.map(o => o.id.toLowerCase()) : ['a', 'b', 'c', 'd'];
      return expectedKeys.every(k => ans[k] !== undefined);
    }
    if (qType === 'saq') return String(ans).trim() !== '';
    return false;
  }, [answers]);

  // Cuộn tới câu hỏi (chế độ list) hoặc chọn câu (chế độ focus)
  const jumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    if (viewMode === 'list') {
      const targetQ = questions[index];
      if (targetQ) {
        const el = document.getElementById(`question-${targetQ.id}`);
        if (el) {
          const headerOffset = 90;
          const elementPosition = el.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsMobileDrawerOpen(false);
  };

  // Nộp bài tự động khi hết giờ
  const handleAutoSubmit = async () => {
    alert('⏰ Đã hết thời gian làm bài! Hệ thống tự động nộp bài thi của bạn.');
    await submitTest(true);
  };

  // Nộp bài thi
  const submitTest = async (force = false) => {
    if (isSubmitted || submitting) return;

    if (!force && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setSubmitting(true);

    let earnedPoints = 0;
    let correctCount = 0;
    let part1Score = 0;
    let part2Score = 0;
    let part3Score = 0;

    // Chấm điểm chuẩn Bộ GD&ĐT 2026
    questions.forEach(q => {
      const qType = getQuestionType(q);
      const userAns = answers[q.id];
      if (userAns === undefined || userAns === null) return;

      if (qType === 'mcq') {
        const correctOpt = q.correct_answer 
          ? String(q.correct_answer).toUpperCase().trim() 
          : (q.correct_option_index !== undefined ? ['A', 'B', 'C', 'D'][q.correct_option_index] : 'A');
        
        if (String(userAns).toUpperCase().trim() === correctOpt) {
          correctCount++;
          earnedPoints += 1;
          part1Score += 1;
        }
      } else if (qType === 'tf') {
        let correctTarget: Record<string, boolean> = {};
        if (typeof q.correct_answer === 'object' && q.correct_answer !== null) {
          correctTarget = q.correct_answer;
        } else if (typeof q.correct_answer === 'string') {
          try { correctTarget = JSON.parse(q.correct_answer); } catch (e) {}
        }

        let matchingSubs = 0;
        const opts = parseOptions(q.options, 'tf');
        const subKeys = opts.length > 0 ? opts.map(o => o.id.toLowerCase()) : ['a', 'b', 'c', 'd'];

        subKeys.forEach(k => {
          if (userAns[k] === correctTarget[k]) matchingSubs++;
        });

        if (matchingSubs === 4) { earnedPoints += 1.0; correctCount++; part2Score += 1.0; }
        else if (matchingSubs === 3) { earnedPoints += 0.5; part2Score += 0.5; }
        else if (matchingSubs === 2) { earnedPoints += 0.25; part2Score += 0.25; }
        else if (matchingSubs === 1) { earnedPoints += 0.1; part2Score += 0.1; }
      } else if (qType === 'saq') {
        const cleanUser = String(userAns).trim().replace(/,/g, '.').toLowerCase();
        const cleanCorrect = String(q.correct_answer || '').trim().replace(/,/g, '.').toLowerCase();
        if (cleanUser === cleanCorrect) {
          correctCount++;
          earnedPoints += 1;
          part3Score += 1;
        }
      }
    });

    const totalCount = questions.length;
    const score = totalCount > 0 ? Math.round((earnedPoints / totalCount) * 10 * 10) / 10 : 0;
    const timeSpent = (exam.duration_minutes || 45) * 60 - timeLeft;

    try {
      const resultPayload: any = {
        student_id: studentId,
        exam_id: exam.id,
        score,
        correct_answers: correctCount,
        total_questions: totalCount,
        time_spent_seconds: Math.max(0, timeSpent),
        answers: answers
      };

      let { error: insertErr } = await supabase
        .from('exam_results')
        .insert(resultPayload);

      if (insertErr && (insertErr.message?.includes('answers') || insertErr.message?.includes('schema cache'))) {
        const { answers: _unused, ...fallbackPayload } = resultPayload;
        const resFallback = await supabase
          .from('exam_results')
          .insert(fallbackPayload);
        if (resFallback.error) throw resFallback.error;
      } else if (insertErr) {
        throw insertErr;
      }

      setResult({
        score,
        correctCount,
        totalCount,
        timeSpent: Math.max(0, timeSpent),
        part1Correct: part1Score,
        part2Correct: part2Score,
        part3Correct: part3Score
      });
      setIsSubmitted(true);
      setShowConfirmModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Lỗi khi nộp bài:', err);
      alert('Không thể lưu kết quả bài làm. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredQuestionsCount = questions.filter(q => isQuestionAnswered(q)).length;
  const unansweredQuestions = questions.filter(q => !isQuestionAnswered(q));
  const progressPercent = questions.length > 0 ? Math.round((answeredQuestionsCount / questions.length) * 100) : 0;

  // Lớp CSS cỡ chữ động
  const fontSizeClass = fontSize === 'lg' ? 'text-base sm:text-lg' : fontSize === 'sm' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base';

  // =========================================================================
  // GIAO DIỆN 1: MÀN HÌNH BÁO CÁO KẾT QUẢ & XEM LẠI BÀI THI (REVIEW MODE)
  // =========================================================================
  if (isSubmitted && result) {
    // Phân loại câu đúng / sai cho bộ lọc review
    const filteredReviewQuestions = questions.filter(q => {
      const qType = getQuestionType(q);
      const userAns = answers[q.id];

      let isCorrect = false;
      if (qType === 'mcq') {
        const correctOpt = q.correct_answer 
          ? String(q.correct_answer).toUpperCase().trim() 
          : (q.correct_option_index !== undefined ? ['A', 'B', 'C', 'D'][q.correct_option_index] : 'A');
        isCorrect = String(userAns || '').toUpperCase().trim() === correctOpt;
      } else if (qType === 'tf') {
        let correctTarget: Record<string, boolean> = {};
        if (typeof q.correct_answer === 'object' && q.correct_answer !== null) correctTarget = q.correct_answer;
        else if (typeof q.correct_answer === 'string') {
          try { correctTarget = JSON.parse(q.correct_answer); } catch (e) {}
        }
        const opts = parseOptions(q.options, 'tf');
        const subKeys = opts.length > 0 ? opts.map(o => o.id.toLowerCase()) : ['a', 'b', 'c', 'd'];
        isCorrect = subKeys.every(k => userAns && userAns[k] === correctTarget[k]);
      } else if (qType === 'saq') {
        const cleanUser = String(userAns || '').trim().replace(/,/g, '.').toLowerCase();
        const cleanCorrect = String(q.correct_answer || '').trim().replace(/,/g, '.').toLowerCase();
        isCorrect = cleanUser === cleanCorrect;
      }

      if (reviewFilter === 'correct') return isCorrect;
      if (reviewFilter === 'wrong') return !isCorrect;
      return true;
    });

    return (
      <div className="space-y-8 animate-fade-in w-full max-w-5xl mx-auto px-4 py-8 select-none">
        
        {/* BANNER TỔNG KẾT ĐIỂM SỐ */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 text-center space-y-6 relative overflow-hidden shadow-xl bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành bài làm
          </div>

          <div className="space-y-1.5 max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground font-heading tracking-tight m-0">
              Kết Quả: {exam.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold flex items-center justify-center gap-3 m-0">
              <span>Môn: <strong className="text-foreground">{exam.subjects?.name || 'Toán học'}</strong></span>
              <span>&bull;</span>
              <span>Thời gian làm bài: <strong className="text-foreground">{Math.floor(result.timeSpent / 60)} phút {result.timeSpent % 60}s</strong></span>
            </p>
          </div>

          {/* Khối Điểm số & Chỉ số */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-3xl mx-auto">
            <div className="p-4 bg-background/80 dark:bg-muted/30 border border-border rounded-2xl flex flex-col justify-center">
              <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Điểm số</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className={`text-4xl font-black ${
                  result.score >= 8 ? 'text-emerald-600 dark:text-emerald-400' : result.score >= 5 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'
                }`}>
                  {result.score}
                </span>
                <span className="text-xs text-muted-foreground font-bold">/ 10</span>
              </div>
            </div>

            <div className="p-4 bg-background/80 dark:bg-muted/30 border border-border rounded-2xl flex flex-col justify-center">
              <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Số câu đúng</span>
              <div className="text-2xl font-black text-foreground mt-1">
                {result.correctCount} <span className="text-xs font-bold text-muted-foreground">/ {result.totalCount}</span>
              </div>
            </div>

            <div className="p-4 bg-background/80 dark:bg-muted/30 border border-border rounded-2xl flex flex-col justify-center">
              <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tỷ lệ chính xác</span>
              <div className="text-2xl font-black text-primary mt-1">
                {result.totalCount > 0 ? Math.round((result.correctCount / result.totalCount) * 100) : 0}%
              </div>
            </div>

            <div className="p-4 bg-background/80 dark:bg-muted/30 border border-border rounded-2xl flex flex-col justify-center">
              <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Thời gian</span>
              <div className="text-lg font-black text-foreground mt-1">
                {Math.floor(result.timeSpent / 60)}p {result.timeSpent % 60}s
              </div>
            </div>
          </div>

          {/* Nút điều hướng */}
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <button
              onClick={() => router.push('/dashboard/student/exams')}
              className="btn-primary text-xs py-2.5 px-6 shadow-md font-bold"
            >
              Về Danh Sách Đề Thi
            </button>
            <button
              onClick={() => {
                setAnswers({});
                setFlaggedQuestions({});
                setTimeLeft((exam.duration_minutes || 45) * 60);
                setIsSubmitted(false);
                setResult(null);
                setCurrentQuestionIndex(0);
              }}
              className="btn-secondary text-xs py-2.5 px-6 flex items-center gap-1.5 font-bold"
            >
              <RotateCcw className="h-4 w-4" /> Làm Lại Bài Này
            </button>
          </div>
        </div>

        {/* KHU VỰC ĐỐI CHIẾU ĐÁP ÁN & LỜI GIẢI CHI TIẾT */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="font-extrabold text-base uppercase tracking-wider flex items-center gap-2 text-foreground m-0">
                <ClipboardList className="h-5 w-5 text-primary" /> Hướng Dẫn Giải & Đối Chiếu Đáp Án
              </h3>
              <p className="text-xs text-muted-foreground m-0 mt-0.5 font-medium">
                Xem lại từng câu, phân tích lỗi sai và đối chiếu đáp án chuẩn.
              </p>
            </div>

            {/* Bộ lọc xem lại */}
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${reviewFilter === 'all' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Tất cả ({questions.length})
              </button>
              <button
                onClick={() => setReviewFilter('wrong')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${reviewFilter === 'wrong' ? 'bg-rose-500 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Câu Sai
              </button>
              <button
                onClick={() => setReviewFilter('correct')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${reviewFilter === 'correct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Câu Đúng
              </button>
            </div>
          </div>

          {/* Danh sách câu hỏi đối chiếu */}
          <div className="space-y-5">
            {filteredReviewQuestions.map((q, qIndex) => {
              const qType = getQuestionType(q);
              const userAns = answers[q.id];
              const opts = parseOptions(q.options, qType);
              const isExplanationOpen = Boolean(expandedExplanations[q.id]);

              return (
                <div 
                  key={q.id || qIndex}
                  className="rounded-2xl border border-border p-5 sm:p-6 bg-card space-y-4 shadow-xs relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                        Câu {q.order_index || qIndex + 1}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-2 py-0.5 rounded border border-border">
                        {qType === 'mcq' ? 'Phần I: 4 Lựa chọn' : qType === 'tf' ? 'Phần II: Đúng/Sai' : 'Phần III: Trả lời ngắn'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {q.level || 'Thông hiểu'}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-foreground leading-relaxed">
                    <MathRenderer content={q.content} />
                  </div>

                  {/* Hiển thị MCQ */}
                  {qType === 'mcq' && (
                    <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
                      {opts.map((opt, optIdx) => {
                        const optKey = ['A', 'B', 'C', 'D'][optIdx] || opt.id.toUpperCase();
                        const isStudentChoice = String(userAns || '').toUpperCase() === optKey;
                        const correctOptKey = q.correct_answer 
                          ? String(q.correct_answer).toUpperCase().trim() 
                          : (q.correct_option_index !== undefined ? ['A', 'B', 'C', 'D'][q.correct_option_index] : 'A');
                        const isCorrectOption = correctOptKey === optKey;

                        let style = 'bg-background border-border text-muted-foreground';
                        if (isCorrectOption) {
                          style = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold';
                        } else if (isStudentChoice && !isCorrectOption) {
                          style = 'bg-rose-500/10 border-rose-500/50 text-rose-700 dark:text-rose-300 font-bold';
                        }

                        return (
                          <div 
                            key={opt.id || optIdx}
                            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${style}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                isCorrectOption ? 'bg-emerald-600 text-white' : isStudentChoice ? 'bg-rose-500 text-white' : 'bg-muted text-foreground'
                              }`}>
                                {optKey}
                              </span>
                              <div className="min-w-0 break-words">
                                <MathRenderer content={opt.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isStudentChoice && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                                  Bạn chọn
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-0.5">
                                  <Check className="h-3 w-3" /> Đúng
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hiển thị Đúng / Sai (Đã được làm sạch hoàn toàn) */}
                  {qType === 'tf' && (
                    <div className="space-y-2 pt-1">
                      {opts.map((opt, optIdx) => {
                        const subKey = ['a', 'b', 'c', 'd'][optIdx] || opt.id.toLowerCase();
                        let targetCorrect: any = {};
                        if (typeof q.correct_answer === 'object' && q.correct_answer !== null) targetCorrect = q.correct_answer;
                        else if (typeof q.correct_answer === 'string') {
                          try { targetCorrect = JSON.parse(q.correct_answer); } catch (e) {}
                        }
                        const isTrue = targetCorrect[subKey] === true;
                        const userVal = userAns ? userAns[subKey] : undefined;
                        const isMatch = userVal === isTrue;

                        return (
                          <div 
                            key={opt.id || optIdx} 
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                              isMatch ? 'bg-emerald-500/[0.04] border-emerald-500/30' : 'bg-rose-500/[0.04] border-rose-500/30'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="font-extrabold text-primary uppercase shrink-0">{subKey})</span>
                              <div className="min-w-0 break-words">
                                <MathRenderer content={opt.text} />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-[11px] font-bold self-end sm:self-center">
                              <span>Bạn chọn: <strong className={userVal === isTrue ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                {userVal === true ? 'ĐÚNG' : userVal === false ? 'SAI' : 'Chưa làm'}
                              </strong></span>
                              <span>&bull;</span>
                              <span>Đáp án: <strong className="text-emerald-600 dark:text-emerald-400">{isTrue ? 'ĐÚNG' : 'SAI'}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hiển thị SAQ */}
                  {qType === 'saq' && (
                    <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-1.5 text-xs">
                      <p className="text-muted-foreground font-semibold m-0">
                        Câu trả lời của bạn: <strong className={String(userAns || '').trim().toLowerCase() === String(q.correct_answer || '').trim().toLowerCase() ? 'text-emerald-600 text-sm' : 'text-rose-600 text-sm'}>
                          {userAns || '(Bỏ trống)'}
                        </strong>
                      </p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 m-0">
                        Đáp án chuẩn: {String(q.correct_answer || '')}
                      </p>
                    </div>
                  )}

                  {/* Lời giải chi tiết */}
                  {q.explanation && (
                    <div className="pt-3 border-t border-border/50">
                      <button
                        onClick={() => setExpandedExplanations(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                        className="text-xs font-bold text-primary flex items-center gap-1.5 hover:underline"
                      >
                        <BookOpen className="h-4 w-4" />
                        <span>{isExplanationOpen ? 'Thu gọn lời giải chi tiết' : 'Xem hướng dẫn giải chi tiết'}</span>
                      </button>

                      {isExplanationOpen && (
                        <div className="mt-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 text-xs sm:text-sm font-medium leading-relaxed animate-fade-in">
                          <MathRenderer content={q.explanation} />
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  // =========================================================================
  // GIAO DIỆN 2: PHÒNG THI CHUẨN HIỆN ĐẠI (DUAL MODE: FOCUS / LIST)
  // =========================================================================
  const activeQuestion = questions[currentQuestionIndex] || questions[0];
  const activeQuestionType = activeQuestion ? getQuestionType(activeQuestion) : 'mcq';

  // Render một câu hỏi đơn lẻ
  const renderQuestionCard = (q: Question, qIndex: number) => {
    const qType = getQuestionType(q);
    const userAns = answers[q.id];
    const opts = parseOptions(q.options, qType);
    const isFlagged = Boolean(flaggedQuestions[q.id]);

    return (
      <div 
        key={q.id}
        id={`question-${q.id}`}
        className="flat-card p-5 sm:p-7 space-y-5 relative scroll-mt-24 transition-all border border-border shadow-xs hover:border-primary/40 bg-card rounded-2xl"
      >
        {/* Header câu hỏi */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-black text-xs sm:text-sm text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20">
              Câu {q.order_index || qIndex + 1}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase bg-muted/50 px-2.5 py-0.5 rounded-lg border border-border">
              {qType === 'mcq' ? 'Trắc nghiệm 4 ý' : qType === 'tf' ? 'Đúng / Sai' : 'Trả lời ngắn'}
            </span>
            {q.level && (
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                {q.level}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFlag(q.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                isFlagged 
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xs' 
                  : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
              }`}
              title="Đánh dấu câu hỏi cần xem lại (Phím tắt: F)"
            >
              <Flag className={`h-3.5 w-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span className="hidden sm:inline">{isFlagged ? 'Đã gắn cờ' : 'Đánh dấu'}</span>
            </button>

            {userAns !== undefined && (
              <button
                onClick={() => setAnswers(prev => {
                  const copy = { ...prev };
                  delete copy[q.id];
                  return copy;
                })}
                className="text-[11px] font-bold text-muted-foreground hover:text-rose-500 transition-colors pl-1"
                title="Xóa câu trả lời này"
              >
                Xóa chọn
              </button>
            )}
          </div>
        </div>

        {/* Nội dung đề bài */}
        <div className={`font-medium text-foreground leading-relaxed ${fontSizeClass}`}>
          <MathRenderer content={q.content} />
        </div>

        {/* PHẦN I: TRẮC NGHIỆM 4 PHƯƠNG ÁN LỰA CHỌN */}
        {qType === 'mcq' && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {opts.map((opt, optIdx) => {
              const optKey = ['A', 'B', 'C', 'D'][optIdx] || opt.id.toUpperCase();
              const isSelected = String(userAns || '').toUpperCase() === optKey;

              return (
                <div
                  key={opt.id || optIdx}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optKey }))}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                    isSelected 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs ring-2 ring-primary/20' 
                      : 'bg-background border-border hover:border-primary/40 hover:bg-muted/20 text-foreground'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border transition-all ${
                    isSelected 
                      ? 'bg-primary border-primary text-primary-foreground shadow-xs' 
                      : 'border-border bg-muted/50 text-foreground'
                  }`}>
                    {optKey}
                  </span>
                  <div className={`min-w-0 pt-1 break-words font-medium ${fontSizeClass}`}>
                    <MathRenderer content={opt.text} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (THIẾT KẾ MỚI SEGMENTED CONTROL) */}
        {qType === 'tf' && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border inline-block">
              Xét tính đúng hoặc sai của các mệnh đề a), b), c), d) dưới đây:
            </div>

            {opts.map((opt, optIdx) => {
              const subKey = ['a', 'b', 'c', 'd'][optIdx] || opt.id.toLowerCase();
              const currentChoice = userAns ? userAns[subKey] : undefined;

              const handleSelect = (val: boolean) => {
                setAnswers(prev => ({
                  ...prev,
                  [q.id]: {
                    ...(prev[q.id] || {}),
                    [subKey]: val
                  }
                }));
              };

              return (
                <div 
                  key={opt.id || optIdx}
                  className="p-4 rounded-2xl border border-border/80 bg-background/60 hover:bg-background transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0 uppercase border border-primary/20">
                      {subKey})
                    </span>
                    <div className={`min-w-0 pt-0.5 break-words font-medium text-foreground ${fontSizeClass}`}>
                      <MathRenderer content={opt.text} />
                    </div>
                  </div>

                  {/* Nút Toggle ĐÚNG / SAI Hiện Đại */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center bg-muted/40 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => handleSelect(true)}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                        currentChoice === true 
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                      }`}
                    >
                      <Check className={`h-3.5 w-3.5 ${currentChoice === true ? 'stroke-[3]' : ''}`} />
                      <span>ĐÚNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelect(false)}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                        currentChoice === false 
                          ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/40' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                      }`}
                    >
                      <X className={`h-3.5 w-3.5 ${currentChoice === false ? 'stroke-[3]' : ''}`} />
                      <span>SAI</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PHẦN III: TRẢ LỜI NGẮN */}
        {qType === 'saq' && (
          <div className="p-5 rounded-2xl bg-muted/20 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-foreground uppercase tracking-wider block">
                Điền câu trả lời ngắn:
              </label>
              <span className="text-[11px] text-muted-foreground font-semibold">
                Chấp nhận số nguyên hoặc số thập phân (VD: 3.5 hoặc -12)
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                placeholder="Nhập kết quả tính toán..."
                value={userAns || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                className={`flex-1 p-3.5 rounded-xl border border-border bg-background font-mono font-bold text-base text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${fontSizeClass}`}
              />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: (prev[q.id] || '') + '-' }))}
                  className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted font-mono font-bold text-xs"
                  title="Thêm dấu âm (-)"
                >
                  - (Âm)
                </button>
                <button
                  type="button"
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: (prev[q.id] || '') + '.' }))}
                  className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted font-mono font-bold text-xs"
                  title="Thêm dấu thập phân (.)"
                >
                  . (Phẩy)
                </button>
                {userAns && (
                  <button
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: '' }))}
                    className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted font-bold text-xs text-rose-500"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8fafc] dark:bg-background text-foreground select-none">
      
      {/* =====================================================================
          1. HEADER PHÒNG THI HIỆN ĐẠI (STICKY TOP BAR)
          ===================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-card/95 backdrop-blur-md border-b border-border shadow-xs px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Cột trái: Thoát & Tiêu đề đề thi */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn rời khỏi bài làm? Tiến độ làm bài hiện tại sẽ không được lưu.')) {
                router.push('/dashboard/student/exams');
              }
            }}
            className="p-2 rounded-xl border border-border hover:bg-muted bg-background text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Thoát phòng thi"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <h1 className="font-extrabold text-xs sm:text-sm text-foreground truncate leading-snug m-0" title={exam.title}>
              {exam.title}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5 m-0 mt-0.5">
              <span>Môn: {exam.subjects?.name || 'Toán học'}</span>
              <span>&bull;</span>
              <span>{questions.length} câu hỏi</span>
            </p>
          </div>
        </div>

        {/* Cột giữa: Đồng hồ đếm ngược nổi bật */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm shrink-0 transition-all ${
          timeLeft <= 300 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 animate-pulse' 
            : 'bg-primary/10 border-primary/20 text-primary'
        }`}>
          <Clock className="h-4 w-4" />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* Cột phải: Bộ điều khiển chế độ xem & Nút nộp bài */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Cỡ chữ A- / A+ */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border">
            <button
              onClick={() => setFontSize(prev => prev === 'lg' ? 'base' : 'sm')}
              className={`p-1.5 rounded-lg hover:bg-background text-xs font-bold transition-colors ${fontSize === 'sm' ? 'text-primary' : 'text-muted-foreground'}`}
              title="Cỡ chữ nhỏ hơn"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize(prev => prev === 'sm' ? 'base' : 'lg')}
              className={`p-1.5 rounded-lg hover:bg-background text-xs font-bold transition-colors ${fontSize === 'lg' ? 'text-primary' : 'text-muted-foreground'}`}
              title="Cỡ chữ lớn hơn"
            >
              A+
            </button>
          </div>

          {/* Nút chuyển đổi Focus Mode vs List Mode */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('focus')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'focus' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Chế độ làm từng câu (Tập trung)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Từng câu</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Chế độ cuộn toàn bộ đề thi"
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Toàn bộ</span>
            </button>
          </div>

          {/* Nút nộp bài */}
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
            className="btn-primary text-xs py-2 px-3.5 sm:px-4 shadow-md font-black flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Nộp Bài</span>
          </button>
        </div>

      </header>

      {/* =====================================================================
          2. BODY KHU VỰC LÀM BÀI
          ===================================================================== */}
      <main className="flex-1 w-full max-w-[1550px] mx-auto px-3 sm:px-6 py-6 grid gap-6 lg:grid-cols-12 items-start">
        
        {/* CỘT CHÍNH (COL-SPAN-8 / 9): NỘI DUNG BÀI LÀM */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          
          {/* Thanh chỉ báo tiến trình nhanh */}
          <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Đã hoàn thành: <strong className="text-primary">{answeredQuestionsCount}/{questions.length}</strong> câu
                </span>
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {progressPercent}% khối lượng bài thi
                </span>
              </div>
            </div>

            <div className="w-32 sm:w-48 bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>

          {/* CHẾ ĐỘ 1: FOCUS MODE (LÀM TỪNG CÂU HỎI TRỌNG TÂM) */}
          {viewMode === 'focus' && activeQuestion && (
            <div className="space-y-6 animate-fade-in">
              {renderQuestionCard(activeQuestion, currentQuestionIndex)}

              {/* Thanh điều hướng câu trước / câu sau */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => jumpToQuestion(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="btn-secondary text-xs sm:text-sm py-2.5 px-4 sm:px-6 font-bold flex items-center gap-2 disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Câu Trước</span>
                </button>

                <div className="text-xs font-black text-muted-foreground">
                  Câu <span className="text-foreground">{currentQuestionIndex + 1}</span> / {questions.length}
                </div>

                <button
                  type="button"
                  onClick={() => jumpToQuestion(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="btn-primary text-xs sm:text-sm py-2.5 px-4 sm:px-6 font-bold flex items-center gap-2 disabled:opacity-40"
                >
                  <span>Câu Tiếp Theo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* CHẾ ĐỘ 2: LIST MODE (DANH SÁCH CUỘN TOÀN BỘ ĐỀ THEO 3 PHẦN CHUẨN) */}
          {viewMode === 'list' && (
            <div className="space-y-8 animate-fade-in">
              {/* PHẦN I */}
              {part1Questions.length > 0 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
                    <span className="text-[10px] font-black uppercase text-primary tracking-wider block">PHẦN I</span>
                    <h2 className="text-sm sm:text-base font-black text-foreground font-heading m-0">
                      CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
                    </h2>
                    <p className="text-xs text-muted-foreground m-0">Mỗi câu chỉ chọn một phương án duy nhất.</p>
                  </div>
                  <div className="space-y-4">
                    {part1Questions.map((q, idx) => renderQuestionCard(q, idx))}
                  </div>
                </div>
              )}

              {/* PHẦN II */}
              {part2Questions.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">PHẦN II</span>
                    <h2 className="text-sm sm:text-base font-black text-foreground font-heading m-0">
                      CÂU TRẮC NGHIỆM ĐÚNG / SAI
                    </h2>
                    <p className="text-xs text-muted-foreground m-0">Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</p>
                  </div>
                  <div className="space-y-4">
                    {part2Questions.map((q, idx) => renderQuestionCard(q, part1Questions.length + idx))}
                  </div>
                </div>
              )}

              {/* PHẦN III */}
              {part3Questions.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                    <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block">PHẦN III</span>
                    <h2 className="text-sm sm:text-base font-black text-foreground font-heading m-0">
                      CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN
                    </h2>
                    <p className="text-xs text-muted-foreground m-0">Thí sinh điền kết quả vào ô trống tương ứng.</p>
                  </div>
                  <div className="space-y-4">
                    {part3Questions.map((q, idx) => renderQuestionCard(q, part1Questions.length + part2Questions.length + idx))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* CỘT PHẢI (COL-SPAN-4 / 3): PHIẾU TRẢ LỜI TRƯỢT THÔNG MINH (DESKTOP) */}
        <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 sticky top-[72px] self-start max-h-[calc(100vh-5.5rem)] flex-col space-y-3 z-30">
          
          <div className="flat-card p-4 sm:p-5 space-y-3.5 shadow-md bg-card border-border flex flex-col flex-1 overflow-hidden rounded-2xl">
            
            <div className="flex items-center justify-between border-b border-border pb-2.5 shrink-0">
              <h3 className="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 m-0">
                <CheckSquare className="h-4 w-4 text-primary" /> Phiếu Trả Lời
              </h3>
              <span className="text-xs font-bold text-primary font-mono">
                {answeredQuestionsCount} / {questions.length}
              </span>
            </div>

            {/* Bộ lọc trạng thái câu */}
            <div className="grid grid-cols-4 gap-1 text-[11px] font-bold text-center shrink-0">
              <button
                onClick={() => setGridFilter('all')}
                className={`py-1.5 rounded-xl transition-all ${gridFilter === 'all' ? 'bg-primary text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setGridFilter('done')}
                className={`py-1.5 rounded-xl transition-all ${gridFilter === 'done' ? 'bg-blue-600 text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Đã làm
              </button>
              <button
                onClick={() => setGridFilter('undone')}
                className={`py-1.5 rounded-xl transition-all ${gridFilter === 'undone' ? 'bg-rose-500 text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Chưa làm
              </button>
              <button
                onClick={() => setGridFilter('flagged')}
                className={`py-1.5 rounded-xl transition-all ${gridFilter === 'flagged' ? 'bg-amber-500 text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Gắn cờ
              </button>
            </div>

            {/* Lưới các câu hỏi */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
              <div className="grid grid-cols-5 gap-2 p-1">
                {questions.map((q, idx) => {
                  const isDone = isQuestionAnswered(q);
                  const isFlagged = Boolean(flaggedQuestions[q.id]);
                  const isCurrent = viewMode === 'focus' && currentQuestionIndex === idx;

                  if (gridFilter === 'done' && !isDone) return null;
                  if (gridFilter === 'undone' && isDone) return null;
                  if (gridFilter === 'flagged' && !isFlagged) return null;

                  let btnStyle = 'bg-background border border-border text-foreground hover:border-primary/60 hover:bg-muted/40';
                  if (isCurrent && isDone) {
                    btnStyle = 'bg-blue-600 text-white font-black border-2 border-blue-300 dark:border-blue-400 shadow-md scale-105 z-10';
                  } else if (isCurrent && !isDone) {
                    btnStyle = 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-black border-2 border-blue-600 shadow-md scale-105 z-10';
                  } else if (!isCurrent && isDone) {
                    btnStyle = 'bg-blue-600 text-white font-black border border-blue-600 shadow-xs hover:bg-blue-700';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(idx)}
                      className={`h-10 rounded-xl font-bold text-xs relative flex items-center justify-center transition-all ${btnStyle}`}
                    >
                      <span>{q.order_index || idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-card shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chú giải & Nút Nộp Bài */}
            <div className="pt-3 border-t border-border space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-0.5">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" /> Đã làm</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-muted-foreground/40 bg-background shrink-0" /> Chưa làm</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Gắn cờ</span>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>NỘP BÀI THI</span>
              </button>
            </div>

          </div>

        </aside>

      </main>

      {/* =====================================================================
          3. THANH NỔI DƯỚI CÙNG CHO MOBILE (BOTTOM FLOATING BAR)
          ===================================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3 flex items-center justify-between gap-3 shadow-lg">
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 text-xs font-bold text-foreground"
        >
          <Menu className="h-4 w-4" />
          <span>Phiếu câu ({answeredQuestionsCount}/{questions.length})</span>
        </button>

        <button
          onClick={() => setShowConfirmModal(true)}
          className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-1.5 shadow-md"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Nộp bài</span>
        </button>
      </div>

      {/* MOBILE BOTTOM SHEET DRAWER */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fade-in">
          <div className="bg-card border-t border-border rounded-t-3xl p-5 max-h-[80vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2 m-0">
                <CheckSquare className="h-4 w-4 text-primary" /> Phiếu Trả Lời ({answeredQuestionsCount}/{questions.length})
              </h3>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-6 gap-2">
                {questions.map((q, idx) => {
                  const isDone = isQuestionAnswered(q);
                  const isFlagged = Boolean(flaggedQuestions[q.id]);
                  const isCurrent = viewMode === 'focus' && currentQuestionIndex === idx;

                  let btnStyle = 'bg-background border border-border text-foreground';
                  if (isCurrent && isDone) {
                    btnStyle = 'bg-blue-600 text-white font-black border-2 border-blue-300 dark:border-blue-400 shadow-md';
                  } else if (isCurrent && !isDone) {
                    btnStyle = 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-black border-2 border-blue-600 shadow-md';
                  } else if (!isCurrent && isDone) {
                    btnStyle = 'bg-blue-600 text-white font-black border border-blue-600';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(idx)}
                      className={`h-10 rounded-xl font-bold text-xs relative flex items-center justify-center transition-all ${btnStyle}`}
                    >
                      <span>{q.order_index || idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-card shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="w-full py-2.5 rounded-xl bg-muted text-foreground font-bold text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. MODAL XÁC NHẬN NỘP BÀI THÔNG MINH
          ===================================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                unansweredQuestions.length > 0 ? 'bg-amber-500/15 text-amber-600 border border-amber-500/25' : 'bg-primary/15 text-primary border border-primary/25'
              }`}>
                {unansweredQuestions.length > 0 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground font-heading m-0">
                  Xác Nhận Nộp Bài Thi?
                </h3>
                <p className="text-xs text-muted-foreground font-medium m-0">
                  Sau khi nộp bài, hệ thống sẽ chấm điểm và hiển thị kết quả chi tiết ngay lập tức.
                </p>
              </div>
            </div>

            {/* Thống kê tiến độ */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Đã làm</span>
                <span className="text-lg font-black text-primary">{answeredQuestionsCount} câu</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Chưa làm</span>
                <span className={`text-lg font-black ${unansweredQuestions.length > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                  {unansweredQuestions.length} câu
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/30 border border-border">
                <span className="text-[10px] font-bold text-muted-foreground block uppercase">Gắn cờ</span>
                <span className="text-lg font-black text-amber-500">
                  {Object.values(flaggedQuestions).filter(Boolean).length} câu
                </span>
              </div>
            </div>

            {/* Cảnh báo câu chưa làm nếu có */}
            {unansweredQuestions.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                  ⚠️ Bạn còn {unansweredQuestions.length} câu chưa hoàn thành:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {unansweredQuestions.map(q => {
                    const qIdx = questions.findIndex(item => item.id === q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          setShowConfirmModal(false);
                          jumpToQuestion(qIdx);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-card border border-rose-500/30 text-rose-600 text-xs font-black hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        Câu {q.order_index || qIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nút thao tác */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary text-xs px-5 py-2.5 font-bold"
              >
                Làm Tiếp
              </button>
              <button
                type="button"
                onClick={() => submitTest(true)}
                disabled={submitting}
                className="btn-primary text-xs px-6 py-2.5 font-black flex items-center gap-2"
              >
                {submitting ? 'Đang Nộp Bài...' : 'Đồng Ý Nộp Bài'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
