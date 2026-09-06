import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, ShieldAlert, Loader2, Send, PlayCircle, Sigma, CheckCircle2 } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';

// ==========================================
// UTILS HỖ TRỢ CHẤM ĐIỂM
// ==========================================
const getQuestionType = (q: any) => {
  if (!q) return 'mcq';
  if (typeof q.correct_answer === 'object' && q.correct_answer !== null) return 'tf';
  if (typeof q.correct_answer === 'string') {
    const cleanCA = q.correct_answer.toLowerCase().trim();
    if (cleanCA.includes('true') || cleanCA.includes('false')) return 'tf';
  }
  const typeStr = String(q.type || '').toLowerCase().trim();
  if (['mcq', 'tf', 'saq'].includes(typeStr)) return typeStr;
  if (!Array.isArray(q.options) || q.options.length === 0) return 'saq';
  return 'mcq';
};

const parseTFAnswer = (ans: any) => {
  let parsed: any = {};
  if (typeof ans === 'string') { try { parsed = JSON.parse(ans); } catch { return {}; } } 
  else if (typeof ans === 'object' && ans !== null) { parsed = ans; }
  let normalized: any = {};
  Object.keys(parsed).forEach(k => { normalized[String(k).toLowerCase().trim()] = parsed[k]; });
  return normalized;
};

const isMcqCorrect = (userAns: any, correctAns: any) => {
  if (userAns == null || correctAns == null) return false;
  return String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
};

const isSaqCorrect = (userAns: any, correctAns: any) => {
  if (userAns == null || correctAns == null) return false;
  return String(userAns).trim().replace(/,/g, '.').toLowerCase() === String(correctAns).trim().replace(/,/g, '.').toLowerCase();
};

// ==========================================
// COMPONENT CHÍNH
// ==========================================
const LiveExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const liveSessionId = searchParams.get('liveSession');
  
  const { currentUser, setUser } = useAppStore();
  
  const [hasStarted, setHasStarted] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeSpentDisplay, setTimeSpentDisplay] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  const [channel, setChannel] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [violationAlert, setViolationAlert] = useState<{show: boolean, message: string, count: number} | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const warningCountRef = useRef(0);

  // 1. FETCH DATA & CHECK NO RETAKE
  useEffect(() => {
    const fetchExamData = async () => {
      if (!id || !currentUser?.id) return;
      setIsLoading(true);
      try {
        const { data: attemptData } = await supabase.from('exam_attempts')
          .select('score, time_spent')
          .eq('exam_id', id)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        const { data: examData } = await supabase.from('exams').select('*').eq('id', id).single();
        const { data: eqData } = await supabase.from('exam_questions').select('sort_order, exercises(*)').eq('exam_id', id).order('sort_order', { ascending: true });
        
        let loadedQuestions: any[] = [];
        if (eqData) {
          loadedQuestions = eqData.map((item: any) => item.exercises).filter(Boolean);
          setQuestions(loadedQuestions);
        }

        if (examData) {
          setExam(examData);
          if (attemptData) {
            setScore(attemptData.score);
            setTimeSpentDisplay(attemptData.time_spent);
            const totalScorePerQ = 10 / (loadedQuestions.length || 1);
            setCorrectCount(Math.round(attemptData.score / totalScorePerQ));
            setIsSubmitted(true);
          } else {
            let restoredTime = examData.time_limit;
            const draftStr = localStorage.getItem(`fmath_draft_${currentUser.id}_${examData.id}`);
            if (draftStr) {
              try {
                const draft = JSON.parse(draftStr);
                if (draft.answers) setAnswers(draft.answers);
                if (draft.timeLeft !== undefined && draft.timeLeft > 0) restoredTime = draft.timeLeft;
              } catch(e) { console.error(e); }
            }
            setTimeLeft(restoredTime);
          }
        }
      } catch (error) { console.error("Lỗi tải đề thi:", error); } 
      finally { setIsLoading(false); }
    };
    fetchExamData();
  }, [id, currentUser?.id]);

  useEffect(() => {
    if (exam?.id && currentUser?.id && !isSubmitted && questions.length > 0 && hasStarted) {
      localStorage.setItem(`fmath_draft_${currentUser.id}_${exam.id}`, JSON.stringify({ answers, timeLeft }));
    }
  }, [answers, timeLeft, exam?.id, currentUser?.id, isSubmitted, questions.length, hasStarted]);

  useEffect(() => {
    if (!liveSessionId || !currentUser?.id) return;
    const ch = supabase.channel(`live_exam_${liveSessionId}`);
    ch.subscribe();
    setChannel(ch);
    return () => { supabase.removeChannel(ch); };
  }, [liveSessionId, currentUser]);

  // ======================================================================
  // HỆ THỐNG CHỐNG GIAN LẬN (TIÊM CSS ẨN AI & QUÉT DOM)
  // ======================================================================
  useEffect(() => {
    if (!liveSessionId || !channel || isSubmitted || !hasStarted) return;

    // TIÊM CSS TÀNG HÌNH DIỆT GIAO DIỆN LẠ (EXTENSIONS)
    const antiCheatStyle = document.createElement('style');
    antiCheatStyle.id = 'fmath-anti-cheat-css';
    antiCheatStyle.innerHTML = `
      body > *:not(#root):not(script):not(style):not(link):not(noscript) {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -999999 !important;
      }
      html > *:not(head):not(body) {
        display: none !important;
      }
      * {
        user-select: none !important;
        -webkit-user-select: none !important;
      }
    `;
    document.head.appendChild(antiCheatStyle);

    const reportViolation = async (type: string) => {
      warningCountRef.current += 1;
      const currentCount = warningCountRef.current;
      const time = new Date().toLocaleTimeString('vi-VN');
      
      channel.send({ type: 'broadcast', event: 'cheat_alert', payload: { userId: currentUser.id, userName: currentUser.name, type, time } });
      await supabase.from('exam_violations').insert({ session_id: liveSessionId, user_id: currentUser.id, violation_type: type });
      
      if (currentCount >= 3) {
        setViolationAlert({
          show: true,
          message: `BẠN ĐÃ VI PHẠM QUY CHẾ LẦN THỨ 3.\nHành vi: "${type}"\nHệ thống đang tự động thu bài...`,
          count: currentCount
        });
        setTimeout(() => { executeSubmit(); setViolationAlert(null); }, 3000);
      } else {
        setViolationAlert({
          show: true,
          message: `Phát hiện hành vi gian lận: "${type}"\nHành động này đã được báo cáo trực tiếp cho Giám thị!`,
          count: currentCount
        });
      }
    };

    const handleVisibilityChange = () => { if (document.hidden) reportViolation('Chuyển Tab / Ẩn trình duyệt'); };
    const handleWindowBlur = () => { reportViolation('Mất tiêu điểm (Nghi vấn bật Snipping Tool hoặc Click AI ngoài)'); };
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); reportViolation('Sao chép nội dung đề thi'); };
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); reportViolation('Mở Menu chuột phải'); };
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmitted && !showSubmitConfirm && !violationAlert?.show) {
        reportViolation('Thoát chế độ Toàn màn hình');
        try { document.documentElement.requestFullscreen(); } catch (err) {}
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || ((e.ctrlKey || e.metaKey) && e.shiftKey && ['s', '3', '4', '5'].includes(e.key.toLowerCase()))) {
        e.preventDefault(); reportViolation('Sử dụng phím tắt chụp màn hình');
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'p', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault(); reportViolation(`Sử dụng phím tắt cấm`);
      }
      if (e.key === 'F12' || e.key === 'Escape') { 
        if (showSubmitConfirm || violationAlert?.show) return;
        e.preventDefault(); 
        reportViolation(e.key === 'Escape' ? 'Cố tình thoát toàn màn hình' : 'Mở công cụ F12'); 
      }
    };

    // MÁY QUÉT DOM - XÓA TIỆN ÍCH AI
    const sweepInterval = setInterval(() => {
      const allowedInBody = ['root', 'vite-legacy-container'];
      const allowedTags = ['script', 'style', 'link', 'noscript'];
      Array.from(document.body.children).forEach(node => {
        const el = node as HTMLElement;
        if (!allowedInBody.includes(el.id) && !allowedTags.includes(el.tagName.toLowerCase())) {
           el.remove(); // Ép xóa thẻ của AI Extension
        }
      });
      // Đảm bảo CSS Anti-cheat luôn nằm cuối để ghi đè mọi thứ
      const styleEl = document.getElementById('fmath-anti-cheat-css');
      if (styleEl) document.head.appendChild(styleEl);
    }, 500);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(sweepInterval);
      const styleEl = document.getElementById('fmath-anti-cheat-css');
      if (styleEl) styleEl.remove();
    };
  }, [liveSessionId, channel, isSubmitted, currentUser, hasStarted, showSubmitConfirm, violationAlert]);

  useEffect(() => {
    if (!liveSessionId || !channel || !currentUser || !hasStarted) return;
    channel.send({ type: 'broadcast', event: 'progress_update', payload: { userId: currentUser.id, userName: currentUser.name, currentQuestion: currentIdx, answered: Object.keys(answers).length } });
  }, [answers, currentIdx, liveSessionId, channel, hasStarted]);

  useEffect(() => {
    if (!hasStarted || isSubmitted || timeLeft <= 0 || isLoading || questions.length === 0) {
      if (hasStarted && timeLeft <= 0 && !isSubmitted && questions.length > 0) executeSubmit();
      return;
    }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitted, isLoading, questions, hasStarted]);

  const maxScore = 10; 

  const handleAnswerMCQ = (questionId: string, optionId: string) => { if(!isSubmitted) setAnswers(prev => ({ ...prev, [questionId]: String(optionId).toLowerCase().trim() })); };
  const handleAnswerTF = (questionId: string, subId: string, value: boolean) => { if(!isSubmitted) { const normSubId = String(subId).toLowerCase().trim(); setAnswers(prev => ({ ...prev, [questionId]: { ...(prev[questionId] || {}), [normSubId]: value } })); } };
  const handleAnswerSAQ = (questionId: string, value: string) => { if(!isSubmitted) setAnswers(prev => ({ ...prev, [questionId]: value })); };

  const isQuestionAnswered = (q: any) => {
    const qType = getQuestionType(q);
    const ans = answers[q.id];
    if (ans == null) return false;
    if (qType === 'tf') return Object.keys(ans).length === (q.options?.length || 4);
    if (qType === 'saq') return String(ans).trim() !== "";
    return true;
  };

  const triggerSubmit = () => {
    if (timeLeft > 0 && warningCountRef.current < 3) {
      setShowSubmitConfirm(true); 
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    setShowSubmitConfirm(false);
    setIsSaving(true);
    
    if (document.fullscreenElement) { document.exitFullscreen().catch(e => console.error(e)); }
    if (currentUser?.id && exam?.id) { localStorage.removeItem(`fmath_draft_${currentUser.id}_${exam.id}`); }

    let totalScore = 0;
    let cCount = 0;
    const pointsPerQuestion = 10 / (questions.length || 1);

    questions.forEach(q => {
      const userAns = answers[q.id];
      if (userAns == null) return;
      const qType = getQuestionType(q);
      
      let isQCorrect = false;

      if (qType === 'tf') {
        let subCorrect = 0;
        const parsedCorrect = parseTFAnswer(q.correct_answer);
        q.options?.forEach((opt: any, idx: number) => { 
          const optId = String(opt.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
          if (userAns[optId] === parsedCorrect[optId]) subCorrect++; 
        });
        if (subCorrect === 4) isQCorrect = true;
        if (subCorrect === 1) totalScore += (pointsPerQuestion * 0.1);
        else if (subCorrect === 2) totalScore += (pointsPerQuestion * 0.25);
        else if (subCorrect === 3) totalScore += (pointsPerQuestion * 0.5);
        else if (subCorrect === 4) totalScore += pointsPerQuestion;
      } 
      else if (qType === 'saq') { 
        if (isSaqCorrect(userAns, q.correct_answer)) { isQCorrect = true; totalScore += pointsPerQuestion; }
      } 
      else { 
        if (isMcqCorrect(userAns, q.correct_answer)) { isQCorrect = true; totalScore += pointsPerQuestion; }
      }

      if (isQCorrect) cCount++;
    });

    totalScore = Math.round(totalScore * 100) / 100;
    const timeSpent = exam.time_limit - timeLeft;
    
    setScore(totalScore);
    setCorrectCount(cCount);
    setTimeSpentDisplay(timeSpent);
    setIsSubmitted(true);

    if (currentUser?.id && exam?.id) {
      await supabase.from('exam_attempts').insert({ exam_id: exam.id, user_id: currentUser.id, score: totalScore, time_spent: timeSpent > 0 ? timeSpent : 0 });
      const earnedXP = Math.round(totalScore * 10); 
      if (earnedXP > 0) {
        const newXP = (currentUser.xp || 0) + earnedXP;
        const newLevel = Math.floor(newXP / 100) + 1;
        const { data: updatedUser } = await supabase.from('users').update({ xp: newXP, level: newLevel }).eq('id', currentUser.id).select('*').single();
        if (updatedUser) setUser(updatedUser);
      }
    }
    setIsSaving(false);
  };

  const handleStartExam = () => {
    try { const elem = document.documentElement; if (elem.requestFullscreen) elem.requestFullscreen(); } catch (e) { console.warn(e); }
    setHasStarted(true);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2,'0');
    const s = (sec % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  };

  // CẤM KÉO THẢ ẢNH VÀO AI
  const MarkdownComponents = { 
    img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded-lg shadow-sm my-4 border border-slate-200 block pointer-events-none select-none" alt="Hình minh họa" loading="lazy" draggable={false} onDragStart={(e) => e.preventDefault()} /> 
  };

  if (isLoading) return <div className="fixed inset-0 z-[9999] bg-[#f0f4f9] flex flex-col items-center justify-center text-[#0052cc] h-screen"><Loader2 size={48} className="animate-spin mb-4" /></div>;

  // ==========================================
  // GIAO DIỆN SAU KHI NỘP BÀI
  // ==========================================
  if (isSubmitted) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#f0f4f9] flex items-center justify-center p-4 font-sans overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[120%] bg-[#e4ecf7] transform -skew-x-12 z-0"></div>
        <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[50%] bg-[#e4ecf7] transform -skew-x-12 z-0"></div>
        
        <div className="bg-white p-8 sm:p-10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 max-w-[500px] w-full z-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-center items-center gap-2 mb-8">
            <div className="bg-[#0052cc] p-1.5 rounded-lg text-white">
              <Sigma size={24} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-black text-[#0052cc] uppercase tracking-widest">
              KHẢO THÍ<span className="text-[#00a3ff] font-medium block text-[10px] -mt-1 tracking-widest text-center">ONLINE</span>
            </h1>
          </div>

          <h2 className="text-xl font-medium text-slate-800 mb-6 border-b border-slate-100 pb-4">Thông tin bài thi</h2>
          
          <div className="space-y-4 text-[13px] text-slate-600">
            <div className="flex justify-between items-center pb-2">
              <span className="opacity-80">Họ tên</span>
              <span className="uppercase font-medium text-slate-800 text-right">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="opacity-80">Kíp thi</span>
              <span className="text-slate-800 uppercase font-medium truncate max-w-[200px] text-right">{exam?.title}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="opacity-80">Thời gian quy định</span>
              <span className="text-slate-800 font-medium text-right">{Math.floor(exam?.time_limit / 60)} phút</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="opacity-80">Thời gian làm bài thực tế</span>
              <span className="text-slate-800 font-medium text-right">{formatTime(timeSpentDisplay)}</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="opacity-80">Số câu trắc nghiệm đúng</span>
              <span className="text-slate-800 font-medium text-right">{correctCount}/{questions.length}</span>
            </div>
            <div className="flex justify-between items-center pt-4">
              <span className="opacity-80 mt-1">Điểm số</span>
              <span className="text-3xl font-medium text-slate-800">{score}/10</span>
            </div>
          </div>

          <div className="mt-8">
            <button onClick={() => navigate('/dashboard')} className="text-[#0052cc] font-medium text-sm hover:underline transition-all border-b border-transparent hover:border-[#0052cc]">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MÀN HÌNH CHỜ BẮT ĐẦU
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#f0f4f9] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-10 rounded-[24px] shadow-xl max-w-lg w-full text-center border border-slate-100">
          <ShieldAlert size={64} className="mx-auto text-[#0052cc] mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase">{exam?.title}</h2>
          <div className="flex items-center justify-center gap-4 text-sm font-bold text-slate-500 mb-6">
            <span className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">{questions.length} Câu hỏi</span>
            <span className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">{Math.floor(exam?.time_limit / 60)} Phút</span>
          </div>
          
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-left text-sm text-red-700 mb-8">
            <strong className="block mb-2 flex items-center gap-2"><AlertTriangle size={16}/> QUY CHẾ THI TRỰC TUYẾN:</strong>
            <ul className="list-disc pl-5 space-y-1 font-medium text-[13px]">
              <li>Hệ thống sẽ <b>bắt buộc</b> hiển thị Toàn màn hình.</li>
              <li>Mọi hành vi chuyển Tab, mở Extension AI sẽ bị hệ thống đánh dấu <b>Nghi vấn gian lận</b> và <b>thu bài</b> nếu vi phạm quá 3 lần.</li>
              <li>Chức năng Copy/Paste & Chuột phải bị vô hiệu hóa.</li>
            </ul>
          </div>
          <button onClick={handleStartExam} className="w-full bg-[#0052cc] hover:bg-[#0042a3] text-white font-medium py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide"><PlayCircle size={20} /> BẮT ĐẦU LÀM BÀI</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const qType = getQuestionType(q);
  let typeLabel = qType === 'tf' ? "Đúng/Sai" : qType === 'saq' ? "Trả lời ngắn" : "Trắc nghiệm";

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f8f9fa] flex flex-col font-sans select-none overflow-hidden h-screen">

      {/* CUSTOM ALERT MODAL - THÔNG BÁO NGHI VẤN GIAN LẬN */}
      {violationAlert?.show && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center border-t-4 border-red-500 shadow-2xl scale-in-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-black text-red-600 mb-2 uppercase tracking-wider">Cảnh cáo vi phạm!</h2>
            <div className="text-xs font-bold text-slate-500 mb-6 uppercase tracking-widest">Cảnh cáo lần {violationAlert.count}/3</div>
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-left text-sm text-red-700 mb-8 whitespace-pre-line leading-relaxed">
              <strong className="block mb-2 font-black">HỆ THỐNG PHÁT HIỆN:</strong>
              {violationAlert.message}
            </div>
            {violationAlert.count < 3 ? (
              <button 
                onClick={() => {
                  setViolationAlert(null);
                  try { document.documentElement.requestFullscreen(); } catch(e) {}
                }} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3.5 rounded-xl shadow-sm transition-all uppercase text-sm tracking-wide"
              >
                TÔI ĐÃ HIỂU VÀ SẼ KHÔNG TÁI PHẠM
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-red-600 font-bold bg-red-100 p-4 rounded-xl"><Loader2 className="animate-spin" size={20} /> Đang tự động thu bài...</div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM SUBMIT MODAL */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-slate-200 scale-in-center">
            <CheckCircle2 size={56} className="mx-auto text-[#0052cc] mb-4" />
            <h2 className="text-2xl font-black text-slate-800 mb-2">Xác nhận nộp bài</h2>
            <p className="text-slate-500 mb-6 font-medium">Bạn đã trả lời {Object.keys(answers).length}/{questions.length} câu hỏi. Bạn không thể làm lại sau khi nộp.</p>
            <div className="flex gap-3">
              <button onClick={() => {setShowSubmitConfirm(false); try{document.documentElement.requestFullscreen();}catch(e){}}} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Làm tiếp</button>
              <button onClick={executeSubmit} className="flex-1 bg-[#0052cc] hover:bg-[#003d99] text-white font-bold py-3.5 rounded-xl shadow-md transition-all">Nộp ngay</button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP BAR */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="bg-[#0052cc] text-white font-black text-sm px-2.5 py-1 rounded shadow-sm">∑</div>
          <h1 className="font-bold text-[#0052cc] text-sm uppercase tracking-wider truncate max-w-[200px] sm:max-w-xs lg:max-w-lg">{exam?.title}</h1>
        </div>
        <div className="flex items-center gap-4 lg:gap-6">
          {liveSessionId && <div className="hidden sm:flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"><ShieldAlert size={12}/> Đang Giám Sát</div>}
          <div className="text-right hidden sm:block">
            <div className="font-bold text-slate-800 text-xs uppercase">{currentUser?.name}</div>
            <div className="text-[10px] text-slate-500 font-medium">Mã HS: {currentUser?.studentId || 'N/A'}</div>
          </div>
          <div className="w-8 h-8 bg-slate-200 rounded-full overflow-hidden border border-slate-300 shrink-0">
             {currentUser?.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">{currentUser?.name?.charAt(0)}</div>}
          </div>
        </div>
      </div>

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative z-10">
        
        {/* LEFT: CÂU HỎI */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-[#f8f9fa]">
          <div className="max-w-4xl mx-auto bg-white p-5 lg:p-10 rounded-[20px] shadow-sm border border-slate-200 pointer-events-none select-none">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 lg:gap-3">
                <span className="px-4 py-1.5 bg-[#e4ecf7] text-[#0052cc] text-xs font-bold uppercase rounded-lg">Câu {currentIdx + 1}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{q.level || 'Nhận biết'}</span>
              </div>
              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">{typeLabel}</span>
            </div>

            <div className="mb-8 markdown-body text-base lg:text-[17px] font-medium text-slate-800 overflow-x-auto select-none pointer-events-none relative z-10">
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{q.content}</ReactMarkdown>
            </div>

            <div className="pointer-events-auto relative z-10">
              {qType === 'mcq' && q.options && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                  {q.options.map((opt:any, idx: number) => {
                    const rawOptId = opt.id || ['A', 'B', 'C', 'D'][idx] || String(idx);
                    const optId = String(rawOptId).toLowerCase().trim();
                    const isSelected = String(answers[q.id] || '').toLowerCase().trim() === optId;
                    
                    return (
                      <div key={optId} onClick={() => handleAnswerMCQ(q.id, optId)} className={`w-full p-4 rounded-xl border flex items-start gap-4 transition-all cursor-pointer ${isSelected ? 'border-[#0052cc] bg-[#f4f7fd] shadow-sm' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                        <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-[#0052cc] text-white' : 'bg-slate-100 text-slate-500'}`}>{String(rawOptId).toUpperCase().trim()}</div>
                        <div className="markdown-body mt-0.5 overflow-x-auto flex-1 select-none pointer-events-none text-[15px]"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown></div>
                      </div>
                    );
                  })}
                </div>
              )}

              {qType === 'tf' && q.options && (
                <div className="flex flex-col gap-3 lg:gap-4">
                  {q.options.map((opt:any, idx: number) => {
                    const rawOptId = opt.id || ['a', 'b', 'c', 'd'][idx] || String(idx);
                    const optId = String(rawOptId).toLowerCase().trim();
                    const userVal = answers[q.id]?.[optId];
                    
                    return (
                      <div key={optId} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 lg:gap-4 transition-all ${userVal !== undefined ? 'border-[#0052cc] bg-[#f4f7fd]' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-start gap-2 lg:gap-3 flex-1 overflow-x-auto pointer-events-none select-none">
                          <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-bold text-xs bg-slate-100 text-slate-500">{rawOptId}</div>
                          <div className="markdown-body mt-0.5 text-[15px]"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown></div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-sm pointer-events-auto">
                          <button onClick={() => handleAnswerTF(q.id, optId, true)} className={`px-5 py-2 rounded-md font-bold text-xs transition-all ${userVal === true ? 'bg-[#0052cc] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Đúng</button>
                          <button onClick={() => handleAnswerTF(q.id, optId, false)} className={`px-5 py-2 rounded-md font-bold text-xs transition-all ${userVal === false ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>Sai</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {qType === 'saq' && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nhập đáp án (Dùng "." cho số thập phân)</label>
                  <input type="text" value={answers[q.id] || ""} onChange={(e) => handleAnswerSAQ(q.id, e.target.value)} className="w-full max-w-sm px-4 py-3 rounded-lg font-bold text-xl outline-none transition-all border border-slate-300 focus:border-[#0052cc] bg-white text-slate-800" placeholder="VD: 12.5" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT (Desktop) / BOTTOM (Mobile): ĐIỀU KHIỂN */}
        <div className="w-full lg:w-[320px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 z-20">
          <div className="p-6 border-b border-slate-100 flex flex-col items-center justify-center shrink-0 bg-slate-50/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={12}/> THỜI GIAN CÒN LẠI</div>
            <div className={`text-4xl font-black font-mono tracking-tight ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-[#172b4d]'}`}>{formatTime(timeLeft)}</div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[200px] lg:max-h-none">
            <div className="font-bold text-[10px] text-slate-400 uppercase mb-3 tracking-wider px-1">Ma trận câu hỏi</div>
            <div className="grid grid-cols-6 lg:grid-cols-5 gap-2">
              {questions.map((fq, i) => {
                const done = isQuestionAnswered(fq);
                const active = currentIdx === i;
                let btn = "bg-[#f4f5f7] text-slate-500 hover:bg-[#ebecf0] border border-transparent";
                if (active) btn = "bg-[#0052cc] text-white shadow-sm scale-105 z-10 font-bold";
                else if (done) btn = "bg-[#e4ecf7] text-[#0052cc] font-medium";
                return <button key={fq.id} onClick={() => setCurrentIdx(i)} className={`relative w-full aspect-square flex items-center justify-center rounded-lg text-xs transition-all outline-none ${btn}`}>{i + 1}</button>;
              })}
            </div>
          </div>

          <div className="p-4 lg:p-6 border-t border-slate-200 shrink-0 bg-white">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-3 px-1">
              <span>Đã làm: {Object.keys(answers).length}/{questions.length}</span>
            </div>
            <button disabled={isSaving} onClick={triggerSubmit} className="w-full bg-[#ff7b00] hover:bg-[#e66f00] text-white font-medium py-3.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16}/>} NỘP BÀI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveExam;