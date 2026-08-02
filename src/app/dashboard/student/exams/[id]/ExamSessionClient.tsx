'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Award, Clock, CheckCircle2, AlertTriangle, 
  ChevronLeft, ClipboardList, HelpCircle, Check, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  content: string;
  options: string[];
  correct_option_index: number;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
  subject_id: string;
}

interface ExamSessionClientProps {
  exam: Exam;
  questions: Question[];
  studentId: string;
}

export default function ExamSessionClient({
  exam,
  questions,
  studentId
}: ExamSessionClientProps) {
  const router = useRouter();
  
  // Trạng thái bài làm
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Kết quả sau khi nộp
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    totalCount: number;
    timeSpent: number;
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

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  // Nộp bài tự động khi hết giờ
  const handleAutoSubmit = async () => {
    alert('Đã hết thời gian làm bài! Hệ thống tự động nộp bài.');
    await submitTest(true);
  };

  const submitTest = async (force = false) => {
    if (isSubmitted || submitting) return;
    setSubmitting(true);

    // Tính toán kết quả
    let correctCount = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_option_index) {
        correctCount++;
      }
    });

    const totalCount = questions.length;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 10 * 10) / 10 : 0;
    const timeSpent = exam.duration_minutes * 60 - timeLeft;

    try {
      // Lưu kết quả vào CSDL
      const { error } = await supabase
        .from('exam_results')
        .insert({
          student_id: studentId,
          exam_id: exam.id,
          score,
          correct_answers: correctCount,
          total_questions: totalCount,
          time_spent_seconds: timeSpent
        });

      if (error) throw error;

      setResult({
        score,
        correctCount,
        totalCount,
        timeSpent
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Lỗi khi nộp bài:', err);
      alert('Không thể lưu kết quả bài làm. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // Hòm cuộn tới câu hỏi
  const scrollToQuestion = (questionId: string) => {
    const el = document.getElementById(`question-${questionId}`);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Trang hiển thị kết quả thi
  if (isSubmitted && result) {
    return (
      <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        {/* TIÊU ĐỀ KẾT QUẢ DẠNG CHỨNG CHỈ CAO CẤP */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-premium text-center max-w-2xl mx-auto space-y-6 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
          <div className="absolute top-[-10%] right-[-10%] w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
            <Award className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-foreground">Kết Quả Bài Làm</h2>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              {exam.title}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-6 bg-muted/20 rounded-xl border border-border/50 max-w-md mx-auto shadow-sm">
            <div className="text-center">
              <span className="block text-3xl font-black text-primary">{result.score}</span>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Điểm số</span>
            </div>
            <div className="text-center border-l border-border/50">
              <span className="block text-3xl font-black text-green-500">{result.correctCount}/{result.totalCount}</span>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Câu đúng</span>
            </div>
            <div className="text-center border-l border-border/50">
              <span className="block text-3xl font-black text-secondary">{Math.floor(result.timeSpent / 60)}p {result.timeSpent % 60}s</span>
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Thời gian</span>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/dashboard/student/exams')}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 shadow-md transition-opacity"
            >
              Về Danh Sách Đề
            </button>
            <button
              onClick={() => {
                setSelectedAnswers({});
                setTimeLeft(exam.duration_minutes * 60);
                setIsSubmitted(false);
                setResult(null);
              }}
              className="px-6 py-3 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-colors shadow-sm"
            >
              Làm lại bài thi
            </button>
          </div>
        </div>

        {/* XEM LẠI ĐÁP ÁN CHI TIẾT */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2 text-foreground/80">
            <ClipboardList className="h-5 w-5 text-secondary" /> Chi tiết đáp án từng câu hỏi
          </h3>

          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const selectedOpt = selectedAnswers[q.id];
              const isCorrect = selectedOpt === q.correct_option_index;

              return (
                <div 
                  key={q.id}
                  className={`rounded-2xl border p-5 bg-card space-y-4 shadow-premium relative overflow-hidden bg-gradient-to-br ${
                    isCorrect ? 'border-green-500/20 from-green-500/5 via-card to-card' : 'border-red-500/20 from-red-500/5 via-card to-card'
                  }`}
                >
                  <h4 className="font-bold text-sm text-foreground flex gap-2">
                    <span className="text-primary font-black">Câu {qIndex + 1}:</span>
                    {q.content}
                  </h4>

                  <div className="grid gap-2 pl-4">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = selectedOpt === optIndex;
                      const isCorrectAnswer = q.correct_option_index === optIndex;
                      
                      let bgClass = 'bg-muted/10 border-border';
                      let textClass = 'text-foreground';

                      if (isCorrectAnswer) {
                        bgClass = 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 font-bold';
                      } else if (isSelected && !isCorrect) {
                        bgClass = 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 font-bold';
                      }

                      return (
                        <div 
                          key={optIndex}
                          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${bgClass} ${textClass}`}
                        >
                          <span>{opt}</span>
                          {isCorrectAnswer && (
                            <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase">Đáp án đúng</span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase">Bạn chọn sai</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Trang đang làm đề thi
  return (
    <div className="grid gap-6 lg:grid-cols-12 max-w-6xl mx-auto items-start select-none">
      
      {/* CỘT TRÁI: DANH SÁCH CÂU HỎI */}
      <div className="lg:col-span-9 space-y-6">
        
        {/* HEADER BÀI LÀM */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-premium flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (confirm('Bạn có chắc muốn thoát ra ngoài? Kết quả bài làm hiện tại sẽ bị mất.')) {
                  router.push('/dashboard/student/exams');
                }
              }}
              className="p-2 hover:bg-muted rounded-xl transition-colors border border-border bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-foreground max-w-md line-clamp-1">{exam.title}</h1>
              <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <HelpCircle className="h-3 w-3 animate-pulse" /> {questions.length} câu trắc nghiệm khách quan
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-bold text-sm shrink-0 shadow-sm ${
            timeLeft < 180 ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' : 'bg-secondary/10 border-secondary/20 text-secondary'
          }`}>
            <Clock className="h-4 w-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* DANH SÁCH CÂU HỎI */}
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-muted-foreground">Đề thi này hiện chưa được biên soạn câu hỏi.</p>
            </div>
          ) : (
            questions.map((q, qIndex) => {
              const selectedOpt = selectedAnswers[q.id];

              return (
                <div 
                  key={q.id}
                  id={`question-${q.id}`}
                  className="rounded-2xl border border-border bg-card p-5 shadow-premium space-y-4 scroll-mt-24 bg-gradient-to-br from-muted/10 via-card to-card"
                >
                  <h3 className="font-extrabold text-sm text-foreground flex gap-2">
                    <span className="text-primary font-black">Câu {qIndex + 1}:</span>
                    {q.content}
                  </h3>

                  <div className="grid gap-2 pl-2">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = selectedOpt === optIndex;
                      return (
                        <div 
                          key={optIndex}
                          onClick={() => handleSelectOption(q.id, optIndex)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer select-none transition-all flex items-center gap-3 ${
                            isSelected 
                              ? 'bg-primary/5 border-primary text-primary font-bold shadow-sm' 
                              : 'bg-muted/10 border-border hover:bg-muted/20 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-background'
                          }`}>
                            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* CỘT PHẢI: NAVIGATOR CÂU HỎI & NỘP BÀI (STICKY PANEL) */}
      <div className="lg:col-span-3 sticky top-24 space-y-4">
        
        <div className="bg-card border border-border rounded-2xl p-5 shadow-premium space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Tiến độ bài làm</span>
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Đã chọn:</span>
              <span>{answeredCount}/{questions.length} câu ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Bảng ô câu hỏi chuyển nhanh */}
          <div className="space-y-2 border-t border-border/50 pt-3">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block mb-2">Navigator câu hỏi</span>
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-1.5">
              {questions.map((q, qIndex) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(q.id)}
                    className={`h-8 rounded-lg text-xs font-extrabold transition-all border ${
                      isAnswered 
                        ? 'bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10' 
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {qIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nút nộp bài trực tiếp */}
          {questions.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:opacity-95 shadow-md shadow-primary/20 transition-all text-center uppercase tracking-wider border border-transparent"
            >
              Nộp bài thi
            </button>
          )}
        </div>

      </div>

      {/* POPUP XÁC NHẬN NỘP BÀI (GLASSMORPHIC MODAL) */}
      {showConfirm && (
        <div 
          className="fixed inset-0 z-50 bg-slate-500/10 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div 
            className="bg-card border border-border max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-primary">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-extrabold text-lg">Nộp bài kiểm tra?</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
              Bạn đang hoàn thành bài thi với **{answeredCount}/{questions.length}** câu đã làm. Sau khi nộp, hệ thống sẽ chấm điểm tự động và bạn không thể sửa đổi đáp án.
            </p>
            <div className="flex gap-3 justify-end border-t border-border/50 pt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-xs font-bold border border-border bg-background rounded-lg hover:bg-muted transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => submitTest()}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                {submitting ? 'Đang nộp...' : 'Đồng ý nộp'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
