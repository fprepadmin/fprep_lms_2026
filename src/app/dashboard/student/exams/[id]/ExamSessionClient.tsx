'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Award, Clock, CheckCircle2, AlertTriangle, 
  ChevronLeft, ClipboardList, HelpCircle, Check, X,
  ArrowRight, ArrowLeft, Layers, Sparkles, Maximize2,
  Minimize2, Flag, RotateCcw, BookOpen, AlertCircle,
  Eye, CheckSquare, XCircle, Send
} from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';
import MathRenderer from '@/components/MathRenderer';

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

// Helpers
const getQuestionType = (q: Question): 'mcq' | 'tf' | 'saq' => {
  // 1. Khai báo rõ ràng
  const declaredType = q.question_type || (q as any).type;
  if (declaredType === 'tf' || declaredType === 'saq') return declaredType;
  if (declaredType === 'mcq') {
    const opts = parseOptions(q.options, 'mcq');
    if (opts.length === 0) return 'saq';
    // Kiểm tra nếu nội dung chứa dấu hiệu Đúng/Sai
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

  // 2. Nhận diện từ nội dung
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

  // 3. Nhận diện từ cấu trúc đáp án đúng
  if (typeof q.correct_answer === 'object' && q.correct_answer !== null && !Array.isArray(q.correct_answer)) {
    return 'tf';
  }
  if (typeof q.correct_answer === 'string') {
    try {
      const parsedCa = JSON.parse(q.correct_answer);
      if (typeof parsedCa === 'object' && parsedCa !== null && !Array.isArray(parsedCa)) return 'tf';
    } catch (e) {}
  }

  // 4. Nhận diện theo số lượng lựa chọn
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
      const parsed = JSON.parse(rawOptions);
      if (Array.isArray(parsed)) list = parsed;
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
        text: String(opt.text || opt.content || '')
      };
    }
    return {
      id: defaultKeys[idx] || String(idx + 1),
      text: String(opt)
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
  const questions = [...initialQuestions].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  // Phân loại câu hỏi theo Cấu trúc Đề thi Chuẩn 2025 của Bộ GD&ĐT
  const part1Questions = questions.filter(q => getQuestionType(q) === 'mcq');
  const part2Questions = questions.filter(q => getQuestionType(q) === 'tf');
  const part3Questions = questions.filter(q => getQuestionType(q) === 'saq');

  // Trạng thái bài làm
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState((exam.duration_minutes || 45) * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'part1' | 'part2' | 'part3'>('all');
  const [gridFilter, setGridFilter] = useState<'all' | 'done' | 'undone' | 'flagged'>('all');

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

  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
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

  // Toggle Toàn Màn Hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Đánh dấu câu hỏi cần xem lại
  const toggleFlag = (qId: string) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  // Kiểm tra câu hỏi đã hoàn thành chưa
  const isQuestionAnswered = (q: Question) => {
    const qType = getQuestionType(q);
    const ans = answers[q.id];
    if (ans === undefined || ans === null) return false;
    if (qType === 'mcq') return String(ans).trim() !== '';
    if (qType === 'tf') {
      const opts = parseOptions(q.options);
      const expectedKeys = opts.length > 0 ? opts.map(o => o.id.toLowerCase()) : ['a', 'b', 'c', 'd'];
      return expectedKeys.every(k => ans[k] !== undefined);
    }
    if (qType === 'saq') return String(ans).trim() !== '';
    return false;
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

    // Chấm điểm chuẩn Bộ GD&ĐT 2025
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
        const opts = parseOptions(q.options);
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

  const scrollToQuestion = (questionId: string) => {
    const el = document.getElementById(`question-${questionId}`);
    if (el) {
      const headerOffset = 90;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Toggle xem lời giải
  const toggleExplanation = (qId: string) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  // ====================================================
  // 1. GIAO DIỆN KẾT QUẢ SAU KHI NỘP BÀI (RESULT REPORT)
  // ====================================================
  if (isSubmitted && result) {
    return (
      <div className="space-y-8 animate-fade-in w-full max-w-5xl mx-auto px-4 py-8 select-none">
        
        {/* BANNER TỔNG KẾT ĐIỂM */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 text-center space-y-6 relative overflow-hidden shadow-2xl bg-gradient-to-br from-primary/10 via-card to-card">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3.5 py-1 text-xs font-bold text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Đã Nộp Bài Thi Thành Công
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground font-heading">
              Kết Quả Khảo Thí: {exam.title}
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">
              Môn học: <strong className="text-foreground">{exam.subjects?.name || 'Toán học'}</strong> &bull; Thời gian làm: {Math.floor(result.timeSpent / 60)} phút {result.timeSpent % 60}s
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-2xl mx-auto">
            <div className="p-3.5 bg-muted/20 border border-border rounded-2xl">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase">Điểm số</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className={`text-3xl font-black ${
                  result.score >= 8 ? 'text-green-600' : result.score >= 5 ? 'text-blue-600' : 'text-orange-500'
                }`}>
                  {result.score}
                </span>
                <span className="text-xs text-muted-foreground font-bold">/ 10</span>
              </div>
            </div>

            <div className="p-3.5 bg-muted/20 border border-border rounded-2xl">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase">Số câu đúng</span>
              <div className="text-2xl font-black text-foreground mt-1">
                {result.correctCount} <span className="text-xs font-bold text-muted-foreground">/ {result.totalCount} câu</span>
              </div>
            </div>

            <div className="p-3.5 bg-muted/20 border border-border rounded-2xl">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase">Tỷ lệ chính xác</span>
              <div className="text-2xl font-black text-primary mt-1">
                {result.totalCount > 0 ? Math.round((result.correctCount / result.totalCount) * 100) : 0}%
              </div>
            </div>

            <div className="p-3.5 bg-muted/20 border border-border rounded-2xl">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase">Thời gian làm bài</span>
              <div className="text-lg font-black text-foreground mt-1">
                {Math.floor(result.timeSpent / 60)}p {result.timeSpent % 60}s
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <button
              onClick={() => router.push('/dashboard/student/exams')}
              className="btn-primary text-xs py-2.5 px-6 shadow-md"
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
              }}
              className="btn-secondary text-xs py-2.5 px-6 flex items-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" /> Làm Lại Bài Này
            </button>
          </div>
        </div>

        {/* CHI TIẾT ĐÁP ÁN & LỜI GIẢI TỪNG CÂU */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 text-foreground">
              <ClipboardList className="h-5 w-5 text-primary" /> Đối Chiếu Đáp Án & Hướng Dẫn Giải Chi Tiết
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">
              Tổng {questions.length} câu hỏi
            </span>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const qType = getQuestionType(q);
              const userAns = answers[q.id];
              const opts = parseOptions(q.options);
              const isExplanationOpen = Boolean(expandedExplanations[q.id]);

              return (
                <div 
                  key={q.id || qIndex}
                  className="rounded-2xl border border-border p-5 bg-card space-y-4 shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                        Câu {q.order_index || qIndex + 1}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-2 py-0.5 rounded border border-border">
                        {qType === 'mcq' ? 'Phần I: 4 Lựa chọn' : qType === 'tf' ? 'Phần II: Đúng/Sai' : 'Phần III: Trả lời ngắn'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {q.level || 'Nhận biết'}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-foreground leading-relaxed">
                    <MathRenderer content={q.content} />
                  </div>

                  {/* Hiển thị MCQ */}
                  {qType === 'mcq' && (
                    <div className="grid gap-2 sm:grid-cols-2 pt-1">
                      {opts.map((opt, optIdx) => {
                        const optKey = ['A', 'B', 'C', 'D'][optIdx] || opt.id.toUpperCase();
                        const isStudentChoice = String(userAns).toUpperCase() === optKey;
                        const correctOptKey = q.correct_answer 
                          ? String(q.correct_answer).toUpperCase().trim() 
                          : (q.correct_option_index !== undefined ? ['A', 'B', 'C', 'D'][q.correct_option_index] : 'A');
                        const isCorrectOption = correctOptKey === optKey;

                        let style = 'bg-background border-border text-muted-foreground';
                        if (isCorrectOption) {
                          style = 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-300 font-bold';
                        } else if (isStudentChoice && !isCorrectOption) {
                          style = 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300 font-bold';
                        }

                        return (
                          <div 
                            key={opt.id || optIdx}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${style}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                isCorrectOption ? 'bg-green-500 text-white' : isStudentChoice ? 'bg-red-500 text-white' : 'bg-muted text-foreground'
                              }`}>
                                {optKey}
                              </span>
                              <MathRenderer content={opt.text} />
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isStudentChoice && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                                  Bạn chọn
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-green-500 text-white flex items-center gap-0.5">
                                  <Check className="h-3 w-3" /> Đúng
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hiển thị TF */}
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
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                              isMatch ? 'bg-green-500/[0.04] border-green-500/30' : 'bg-red-500/[0.04] border-red-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-primary uppercase">{subKey})</span>
                              <MathRenderer content={opt.text} />
                            </div>

                            <div className="flex items-center gap-2 shrink-0 text-[11px] font-bold">
                              <span>Bạn chọn: <strong className={userVal === isTrue ? 'text-green-600' : 'text-red-600'}>{userVal === true ? 'ĐÚNG' : userVal === false ? 'SAI' : 'Chưa làm'}</strong></span>
                              <span>&bull;</span>
                              <span>Đáp án: <strong className="text-green-600">{isTrue ? 'ĐÚNG' : 'SAI'}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Hiển thị SAQ */}
                  {qType === 'saq' && (
                    <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-1 text-xs">
                      <p className="text-muted-foreground font-semibold">
                        Câu trả lời của bạn: <strong className={String(userAns).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase() ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{userAns || '(Bỏ trống)'}</strong>
                      </p>
                      <p className="font-bold text-green-600">
                        Đáp án chuẩn: {String(q.correct_answer || '')}
                      </p>
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
                      </button>

                      {isExplanationOpen && (
                        <div className="mt-2 p-3 bg-muted/30 border border-border rounded-xl text-foreground text-xs leading-relaxed animate-fade-in">
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

  // ====================================================
  // 2. GIAO DIỆN PHÒNG THI TOÀN MÀN HÌNH CHUẨN LMS 2025
  // ====================================================
  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8fafc] dark:bg-background text-foreground select-none">
      
      {/* 1. THANH HEADER PHÒNG THI (STICKY TOP BAR - FULL WIDTH) */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur-md border-b border-border shadow-xs px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Left: Exit & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn rời khỏi phòng thi? Tiến độ làm bài hiện tại sẽ không được lưu.')) {
                router.push('/dashboard/student/exams');
              }
            }}
            className="p-2 rounded-xl border border-border hover:bg-muted bg-background text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Thoát phòng thi"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base text-foreground truncate leading-snug" title={exam.title}>
              {exam.title}
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 m-0">
              <span>Môn {exam.subjects?.name || 'Toán học'}</span>
              <span>&bull;</span>
              <span>Tổng {questions.length} câu hỏi</span>
            </p>
          </div>
        </div>

        {/* Center: Live Countdown Timer */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm shrink-0 transition-all ${
          timeLeft <= 300 
            ? 'bg-red-500/10 border-red-500/30 text-red-600 animate-pulse' 
            : 'bg-primary/10 border-primary/20 text-primary'
        }`}>
          <Clock className="h-4 w-4" />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* Right: Progress, Fullscreen & Submit Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span>Đã làm: <strong className="text-primary">{answeredQuestionsCount}/{questions.length}</strong></span>
            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-border hover:bg-muted bg-background text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center justify-center"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
            className="btn-primary text-xs py-2 px-4 shadow-md font-extrabold flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Nộp Bài</span>
          </button>
        </div>

      </header>

      {/* 2. BODY KHU VỰC LÀM BÀI (FULL WIDTH TWO-COLUMN LAYOUT) */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 py-6 grid gap-6 lg:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (COL-SPAN-8 / 9): DANH SÁCH CÂU HỎI THEO 3 PHẦN CHUẨN BỘ GD&ĐT 2025 */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-8">

          {/* ========================================================= */}
          {/* PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN */}
          {/* ========================================================= */}
          {part1Questions.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    PHẦN I
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-foreground font-heading m-0">
                    CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground font-medium m-0">
                  Thí sinh trả lời từ câu {part1Questions[0]?.order_index || 1} đến câu {part1Questions[part1Questions.length - 1]?.order_index || part1Questions.length}. Mỗi câu hỏi chỉ chọn một phương án.
                </p>
              </div>

              <div className="space-y-4">
                {part1Questions.map((q, idx) => {
                  const userAns = answers[q.id];
                  const opts = parseOptions(q.options);
                  const isFlagged = Boolean(flaggedQuestions[q.id]);

                  return (
                    <div 
                      key={q.id}
                      id={`question-${q.id}`}
                      className="flat-card p-5 sm:p-6 space-y-4 relative scroll-mt-24 transition-all hover:border-primary/40"
                    >
                      {/* Tiêu đề câu hỏi */}
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                            Câu {q.order_index || idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-2 py-0.5 rounded">
                            {q.level || 'Nhận biết'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleFlag(q.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors border ${
                              isFlagged 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' 
                                : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                            }`}
                            title="Đánh dấu câu hỏi cần xem lại"
                          >
                            <Flag className="h-3 w-3" />
                            <span>{isFlagged ? 'Đã gắn cờ' : 'Đánh dấu'}</span>
                          </button>

                          {userAns && (
                            <button
                              onClick={() => setAnswers(prev => {
                                const copy = { ...prev };
                                delete copy[q.id];
                                return copy;
                              })}
                              className="text-[10px] font-bold text-muted-foreground hover:text-red-500 underline pl-1"
                            >
                              Xóa chọn
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nội dung câu hỏi */}
                      <div className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                        <MathRenderer content={q.content} />
                      </div>

                      {/* 4 Phương án lựa chọn A, B, C, D */}
                      <div className="grid gap-3 sm:grid-cols-2 pt-1">
                        {opts.map((opt, optIdx) => {
                          const optKey = ['A', 'B', 'C', 'D'][optIdx] || opt.id.toUpperCase();
                          const isSelected = String(userAns).toUpperCase() === optKey;

                          return (
                            <div
                              key={opt.id || optIdx}
                              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optKey }))}
                              className={`p-3.5 rounded-xl border-2 text-sm font-semibold cursor-pointer transition-all flex items-start gap-3 select-none ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs' 
                                  : 'bg-background border-border hover:border-primary/40 hover:bg-muted/20 text-foreground'
                              }`}
                            >
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border transition-colors ${
                                isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-muted/40 text-foreground'
                              }`}>
                                {optKey}
                              </span>
                              <div className="min-w-0 pt-0.5 break-words">
                                <MathRenderer content={opt.text} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHẦN II: CÂU TRẮC NGHIỆM ĐÚNG / SAI (4 Ý a, b, c, d) */}
          {/* ========================================================= */}
          {part2Questions.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    PHẦN II
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-foreground font-heading m-0">
                    CÂU TRẮC NGHIỆM ĐÚNG / SAI
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground font-medium m-0">
                  Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai. Điểm tối đa mỗi câu là 1.0 điểm.
                </p>
              </div>

              <div className="space-y-4">
                {part2Questions.map((q, idx) => {
                  const userAns = answers[q.id] || {};
                  const opts = parseOptions(q.options);
                  const isFlagged = Boolean(flaggedQuestions[q.id]);

                  return (
                    <div 
                      key={q.id}
                      id={`question-${q.id}`}
                      className="flat-card p-5 sm:p-6 space-y-4 relative scroll-mt-24 transition-all hover:border-emerald-500/40"
                    >
                      {/* Tiêu đề câu hỏi */}
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                            Câu {q.order_index || (part1Questions.length + idx + 1)}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-2 py-0.5 rounded">
                            {q.level || 'Thông hiểu'}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleFlag(q.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors border ${
                            isFlagged 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' 
                              : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <Flag className="h-3 w-3" />
                          <span>{isFlagged ? 'Đã gắn cờ' : 'Đánh dấu'}</span>
                        </button>
                      </div>

                      {/* Nội dung đề bài */}
                      <div className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                        <MathRenderer content={q.content} />
                      </div>

                      {/* Danh sách 4 ý a, b, c, d với 2 nút Đúng / Sai */}
                      <div className="space-y-2.5 pt-1">
                        {opts.map((opt, optIdx) => {
                          const subKey = ['a', 'b', 'c', 'd'][optIdx] || opt.id.toLowerCase();
                          const currentChoice = userAns[subKey];

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
                              className="p-3.5 rounded-xl border border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="font-black text-primary shrink-0 uppercase">{subKey})</span>
                                <div className="min-w-0 break-words">
                                  <MathRenderer content={opt.text} />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelect(true)}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all border ${
                                    currentChoice === true 
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  ĐÚNG
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSelect(false)}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all border ${
                                    currentChoice === false 
                                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  SAI
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHẦN III: CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN */}
          {/* ========================================================= */}
          {part3Questions.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    PHẦN III
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-foreground font-heading m-0">
                    CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground font-medium m-0">
                  Thí sinh điền kết quả vào ô trống tương ứng với từng câu hỏi.
                </p>
              </div>

              <div className="space-y-4">
                {part3Questions.map((q, idx) => {
                  const userAns = answers[q.id] || '';
                  const isFlagged = Boolean(flaggedQuestions[q.id]);

                  return (
                    <div 
                      key={q.id}
                      id={`question-${q.id}`}
                      className="flat-card p-5 sm:p-6 space-y-4 relative scroll-mt-24 transition-all hover:border-purple-500/40"
                    >
                      {/* Tiêu đề câu hỏi */}
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-purple-600 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                            Câu {q.order_index || (part1Questions.length + part2Questions.length + idx + 1)}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-2 py-0.5 rounded">
                            {q.level || 'Vận dụng'}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleFlag(q.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors border ${
                            isFlagged 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' 
                              : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <Flag className="h-3 w-3" />
                          <span>{isFlagged ? 'Đã gắn cờ' : 'Đánh dấu'}</span>
                        </button>
                      </div>

                      {/* Nội dung đề bài */}
                      <div className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                        <MathRenderer content={q.content} />
                      </div>

                      {/* Ô nhập câu trả lời ngắn */}
                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <label className="text-xs font-bold text-muted-foreground block">
                          Điền câu trả lời của bạn:
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            placeholder="Nhập số thập phân hoặc phân số (VD: 12.5 hoặc -3)..."
                            value={userAns}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="flex-1 p-3 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* CỘT PHẢI (COL-SPAN-4 / 3): PHIẾU TRẢ LỜI TRẮC NGHIỆM LƯỚT THEO MÀN HÌNH (SMART FLOATING ANSWER SHEET) */}
        <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 sticky top-[72px] self-start max-h-[calc(100vh-5.5rem)] flex-col space-y-3 z-30">
          
          {/* 1. KHỐI ĐỒNG HỒ ĐẾM NGƯỢC NỔI BẬT & RÕ RÀNG */}
          <div className={`p-4 rounded-2xl border transition-all shadow-md flex flex-col gap-2.5 ${
            timeLeft <= 300 
              ? 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400 ring-2 ring-red-500/20 animate-pulse' 
              : timeLeft <= 600
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
              : 'bg-white dark:bg-card border-border text-foreground'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  timeLeft <= 300 ? 'bg-red-500 text-white shadow-xs' : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Thời Gian Còn Lại
                  </span>
                  <span className={`text-2xl font-black font-mono tracking-tight leading-none ${
                    timeLeft <= 300 ? 'text-red-600' : 'text-primary'
                  }`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-[10px] font-bold text-muted-foreground block">Đã hoàn thành</span>
                <span className="text-xs font-black text-foreground bg-muted/50 px-2 py-0.5 rounded-lg border border-border">
                  {answeredQuestionsCount}/{questions.length} câu
                </span>
              </div>
            </div>

            {/* Thanh tiến độ thời gian */}
            <div className="space-y-1">
              <div className="w-full bg-muted/60 dark:bg-muted/30 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    timeLeft <= 300 ? 'bg-red-500' : timeLeft <= 600 ? 'bg-amber-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / ((exam.duration_minutes || 45) * 60)) * 100))}%` }}
                />
              </div>
              {timeLeft <= 300 && (
                <p className="text-[10px] font-bold text-red-600 text-center m-0 animate-bounce">
                  ⚠️ Sắp hết giờ làm bài! Vui lòng kiểm tra và nộp bài.
                </p>
              )}
            </div>
          </div>

          {/* 2. CARD PHIẾU TRẢ LỜI TỰ ĐỘNG CUỘN & LƯỚT THEO */}
          <div className="flat-card p-4 sm:p-5 space-y-3.5 shadow-md bg-white dark:bg-card border-border flex flex-col flex-1 overflow-hidden max-h-[calc(100vh-14rem)]">
            
            <div className="flex items-center justify-between border-b border-border pb-2.5 shrink-0">
              <h3 className="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 m-0">
                <CheckSquare className="h-4 w-4 text-primary" /> Phiếu Trả Lời
              </h3>
              <span className="text-xs font-bold text-primary">
                {answeredQuestionsCount} / {questions.length} câu
              </span>
            </div>

            {/* Bộ lọc câu hỏi */}
            <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center shrink-0">
              <button
                onClick={() => setGridFilter('all')}
                className={`py-1 rounded-lg transition-colors ${gridFilter === 'all' ? 'bg-primary text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setGridFilter('done')}
                className={`py-1 rounded-lg transition-colors ${gridFilter === 'done' ? 'bg-blue-600 text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Đã làm
              </button>
              <button
                onClick={() => setGridFilter('undone')}
                className={`py-1 rounded-lg transition-colors ${gridFilter === 'undone' ? 'bg-rose-500 text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Chưa làm
              </button>
              <button
                onClick={() => setGridFilter('flagged')}
                className={`py-1 rounded-lg transition-colors ${gridFilter === 'flagged' ? 'bg-amber-500 text-white shadow-xs' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
              >
                Gắn cờ
              </button>
            </div>

            {/* Lưới các câu hỏi (Cuộn mượt nội bộ nếu nhiều câu) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
              
              {/* PHẦN I GRID */}
              {part1Questions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block">
                    Phần I (Trắc nghiệm 4 ý)
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {part1Questions.map((q, idx) => {
                      const isDone = isQuestionAnswered(q);
                      const isFlagged = Boolean(flaggedQuestions[q.id]);
                      if (gridFilter === 'done' && !isDone) return null;
                      if (gridFilter === 'undone' && isDone) return null;
                      if (gridFilter === 'flagged' && !isFlagged) return null;

                      return (
                        <button
                          key={q.id}
                          onClick={() => scrollToQuestion(q.id)}
                          className={`h-9 rounded-xl font-black text-xs relative flex items-center justify-center transition-all border ${
                            isDone 
                              ? 'bg-primary text-white border-primary shadow-xs' 
                              : 'bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/30'
                          }`}
                        >
                          <span>{q.order_index || idx + 1}</span>
                          {isFlagged && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-card" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PHẦN II GRID */}
              {part2Questions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Phần II (Đúng / Sai)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {part2Questions.map((q, idx) => {
                      const isDone = isQuestionAnswered(q);
                      const isFlagged = Boolean(flaggedQuestions[q.id]);
                      if (gridFilter === 'done' && !isDone) return null;
                      if (gridFilter === 'undone' && isDone) return null;
                      if (gridFilter === 'flagged' && !isFlagged) return null;

                      return (
                        <button
                          key={q.id}
                          onClick={() => scrollToQuestion(q.id)}
                          className={`h-9 rounded-xl font-black text-xs relative flex items-center justify-center transition-all border ${
                            isDone 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                              : 'bg-background border-border text-foreground hover:border-emerald-500/40 hover:bg-muted/30'
                          }`}
                        >
                          <span>{q.order_index || (part1Questions.length + idx + 1)}</span>
                          {isFlagged && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-card" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PHẦN III GRID */}
              {part3Questions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                    Phần III (Trả lời ngắn)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {part3Questions.map((q, idx) => {
                      const isDone = isQuestionAnswered(q);
                      const isFlagged = Boolean(flaggedQuestions[q.id]);
                      if (gridFilter === 'done' && !isDone) return null;
                      if (gridFilter === 'undone' && isDone) return null;
                      if (gridFilter === 'flagged' && !isFlagged) return null;

                      return (
                        <button
                          key={q.id}
                          onClick={() => scrollToQuestion(q.id)}
                          className={`h-9 rounded-xl font-black text-xs relative flex items-center justify-center transition-all border ${
                            isDone 
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                              : 'bg-background border-border text-foreground hover:border-purple-500/40 hover:bg-muted/30'
                          }`}
                        >
                          <span>{q.order_index || (part1Questions.length + part2Questions.length + idx + 1)}</span>
                          {isFlagged && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-card" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Chú thích & Nút Nộp Bài Cuối Bảng */}
            <div className="pt-3 border-t border-border space-y-3 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Đã chọn</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-border bg-background" /> Chưa làm</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Gắn cờ</span>
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={submitting}
                className="w-full py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>NỘP BÀI THI</span>
              </button>
            </div>

          </div>

        </aside>

        {/* ========================================================= */}
        {/* PHIẾU TRẢ LỜI DÀNH CHO MOBILE / TABLET DƯỚI ĐÁY MÀN HÌNH */}
        {/* ========================================================= */}
        <div className="lg:hidden col-span-12 flat-card p-4 space-y-4 shadow-md bg-white dark:bg-card border-border">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 m-0">
              <CheckSquare className="h-4 w-4 text-primary" /> Phiếu Trả Lời
            </h3>
            <span className="text-xs font-bold text-primary">
              {answeredQuestionsCount} / {questions.length} câu
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {questions.map((q, idx) => {
              const isDone = isQuestionAnswered(q);
              const isFlagged = Boolean(flaggedQuestions[q.id]);
              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(q.id)}
                  className={`h-10 rounded-xl font-black text-xs relative flex items-center justify-center transition-all border ${
                    isDone 
                      ? 'bg-primary text-white border-primary shadow-xs' 
                      : 'bg-background border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{q.order_index || idx + 1}</span>
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
            className="w-full py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>NỘP BÀI THI</span>
          </button>
        </div>

      </main>

      {/* THANH ĐỒNG HỒ FLOATING STICKY DƯỚI ĐÁY CHO MOBILE */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 dark:bg-card/95 backdrop-blur-md p-3 rounded-2xl border border-border shadow-xl flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl font-bold flex items-center justify-center ${
            timeLeft <= 300 ? 'bg-red-500 text-white animate-pulse' : 'bg-primary/10 text-primary'
          }`}>
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold block leading-tight">Thời gian</span>
            <span className={`text-base font-black font-mono leading-none ${timeLeft <= 300 ? 'text-red-600' : 'text-primary'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
            {answeredQuestionsCount}/{questions.length} câu
          </span>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting}
            className="btn-primary text-xs py-2 px-4 shadow-md font-extrabold flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Nộp bài</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL XÁC NHẬN NỘP BÀI CHI TIẾT */}
      {/* ========================================================= */}
      {showConfirmModal && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowConfirmModal(false)}
        >
          <div 
            className="bg-card border border-border max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-lg text-foreground">
                Xác Nhận Nộp Bài Thi
              </h3>
              <p className="text-xs text-muted-foreground font-semibold">
                Thời gian còn lại: <strong className="text-primary">{formatTime(timeLeft)}</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2.5 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-muted-foreground">Tổng số câu:</span>
                <span className="text-foreground">{questions.length} câu</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-green-600">Đã hoàn thành:</span>
                <span className="text-green-600">{answeredQuestionsCount} câu</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-orange-500">Chưa trả lời:</span>
                <span className="text-orange-500">{unansweredQuestions.length} câu</span>
              </div>

              {unansweredQuestions.length > 0 && (
                <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                  <span>Các câu chưa làm: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {unansweredQuestions.map(q => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setShowConfirmModal(false);
                          scrollToQuestion(q.id);
                        }}
                        className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-bold border border-border text-[10px]"
                      >
                        Câu {q.order_index}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary text-xs py-2.5 px-4 font-bold"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitTest(true)}
                className="btn-primary text-xs py-2.5 px-5 font-bold shadow-md"
              >
                {submitting ? 'Đang nộp...' : 'Đồng ý nộp bài'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
