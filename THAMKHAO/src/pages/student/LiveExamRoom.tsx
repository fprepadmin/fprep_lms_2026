import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { examService } from '../../services/examService';
import { studentService } from '../../services/studentService';
import { auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Loader2, Clock, CheckCircle2, AlertCircle, ArrowLeft, Flag, 
  ChevronLeft, ChevronRight, Save, Send, Trophy, Flame, Zap, RefreshCcw, ShieldAlert, Award, Lock, Radio
} from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function LiveExamRoom() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('sessionId');

  const { currentUser, setUser } = useAppStore();

  // Data States
  const [examData, setExamData] = useState<any>(null);
  const [rawQuestions, setRawQuestions] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [isPreparing, setIsPreparing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exam Process Workflow States (PENDING | ONGOING | COMPLETED)
  const [sessionStatus, setSessionStatus] = useState<'PENDING' | 'ONGOING' | 'COMPLETED'>('ONGOING');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentGlobalIndex, setCurrentGlobalIndex] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  // Navigator Filter State
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'done' | 'todo' | 'flag'>('all');

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const monitorChannelRef = useRef<any>(null);

  // ==========================================
  // 1. AUTH HYDRATION
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email && !currentUser?.id) {
        try {
          let profile = await studentService.getProfileByEmail(user.email);
          if (profile) {
            setTimeout(() => setUser(profile), 0);
          } else {
            const fallbackStudentCode = `TS_${Math.floor(Date.now() / 1000)}`; 
            const { data } = await supabase.from('users').insert({
              email: user.email, 
              full_name: user.displayName || "Thí sinh", 
              role: 'student', 
              student_code: fallbackStudentCode 
            }).select().single();
            if (data) setTimeout(() => setUser(data), 0);
          }
        } catch(e) {}
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id, setUser]);

  // ==========================================
  // 2. TẢI DỮ LIỆU ĐỀ THI & KIỂM TRA TRẠNG THÁI CA THI
  // ==========================================
  useEffect(() => {
    const fetchExamData = async () => {
      if (!id) return;
      setIsPreparing(true);
      setError(null);

      try {
        // 1. Lấy thông tin đề thi
        const fetchedExam = await examService.getExamById(id);
        if (!fetchedExam) throw new Error("Không tìm thấy thông tin đề thi.");
        setExamData(fetchedExam);

        // 2. Lấy danh sách câu hỏi
        const { questions, parts: loadedParts } = await examService.getExamFullQuestions(id);
        if (questions.length === 0) throw new Error("Đề thi này hiện chưa có nội dung câu hỏi.");

        setRawQuestions(questions);
        setParts(loadedParts);

        // 3. Nếu thi theo Ca Live (sessionId) -> Kiểm tra trạng thái PENDING / ONGOING / COMPLETED
        if (sessionId) {
          const { data: sessionData } = await supabase
            .from('live_sessions')
            .select('status')
            .eq('id', sessionId)
            .single();

          if (sessionData) {
            setSessionStatus(sessionData.status as any);
          }
        } else {
          setSessionStatus('ONGOING'); // Đề thi tự do
        }

        // 4. Khôi phục bài đang làm dở (nếu có)
        const storageKey = `live_draft_${currentUser?.id || 'guest'}_${id}`;
        const draftStr = localStorage.getItem(storageKey);
        if (draftStr) {
          try {
            const draft = JSON.parse(draftStr);
            if (draft.answers) setUserAnswers(draft.answers);
            if (draft.marked) setMarkedForReview(draft.marked);
            if (draft.timeLeft) setTimeLeft(draft.timeLeft);
            else setTimeLeft(fetchedExam.time_limit || 5400);
          } catch(e) {
            setTimeLeft(fetchedExam.time_limit || 5400);
          }
        } else {
          setTimeLeft(fetchedExam.time_limit || 5400);
        }

      } catch (err: any) {
        setError(err.message || "Lỗi tải đề thi.");
      } finally {
        setIsPreparing(false);
      }
    };

    fetchExamData();
  }, [id, sessionId, currentUser?.id]);

  // ==========================================
  // 3. REALTIME HEARTBEAT & LẮNG NGHE LỆNH BẮT ĐẦU THI TỪ GIÁM THỊ
  // ==========================================
  useEffect(() => {
    if (!sessionId || !currentUser?.id || isLocked) return;

    // Đăng ký trạng thái thí sinh vào room_members
    supabase.from('room_members').upsert({ 
      session_id: sessionId, 
      student_id: currentUser.id, 
      status: 'ONLINE', 
      last_ping: new Date().toISOString() 
    }, { onConflict: 'session_id, student_id' }).then();

    // Lắng nghe kênh phòng thi chuẩn hóa đồng bộ với Giám thị
    const channelName = `monitor_room_${sessionId}`;
    const oldChannel = supabase.channel(channelName);
    if (oldChannel) supabase.removeChannel(oldChannel);

    const channel = supabase.channel(channelName)
      .on('broadcast', { event: 'start_session' }, () => {
        setSessionStatus('ONGOING');
        toast.success("Giám thị đã phát lệnh BẮT ĐẦU CA THI!", { duration: 6000, icon: '🚀' });
      })
      .on('broadcast', { event: 'add_time' }, (payload: any) => {
        if (payload.payload?.student_id === currentUser.id) {
          const addedMinutes = payload.payload.minutes || 5;
          setTimeLeft(prev => prev + (addedMinutes * 60));
          toast.success(`Giám thị đã cộng thêm ${addedMinutes} phút làm bài!`, { duration: 5000, icon: '⏱️' });
        }
      })
      .on('broadcast', { event: 'unlock_student' }, (payload: any) => {
        if (payload.payload?.student_id === currentUser.id || payload.payload?.student_id === 'ALL') {
          setIsLocked(false);
          toast.success("Giám thị đã MỞ KHÓA BÀI THI cho bạn! Bạn có thể tiếp tục làm bài.", { duration: 6000, icon: '🔓' });
        }
      })
      .on('broadcast', { event: 'force_lock' }, (payload: any) => {
        if (payload.payload?.student_id === currentUser.id || payload.payload?.student_id === 'ALL') {
          setIsLocked(true);
          toast.error("Giám thị đã khóa bài thi trực tiếp!", { duration: 5000 });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}` }, (payload: any) => {
        if (payload.new?.status === 'ONGOING') {
          setSessionStatus('ONGOING');
          toast.success("Giám thị đã phát lệnh BẮT ĐẦU CA THI!", { duration: 6000, icon: '🚀' });
        } else if (payload.new?.status === 'COMPLETED') {
          setSessionStatus('COMPLETED');
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_members', filter: `session_id=eq.${sessionId}` }, (payload: any) => {
        if (payload.new?.student_id === currentUser.id) {
          if (payload.new?.status === 'ONLINE' && isLocked) {
            setIsLocked(false);
            toast.success("Giám thị đã gỡ khóa bài thi thành công!", { duration: 6000, icon: '🔓' });
          } else if (payload.new?.status === 'LOCKED' && !isLocked) {
            setIsLocked(true);
            toast.error("Bài thi đã bị tạm khóa!", { duration: 5000 });
          }
        }
      })
      .subscribe();

    monitorChannelRef.current = channel;

    const pingInterval = setInterval(() => {
      if (isOnline && !isLocked && channel && channel.state === 'joined') {
        channel.send({ type: 'broadcast', event: 'heartbeat', payload: { student_id: currentUser.id } });
      }
    }, 5000);

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(pingInterval); 
    };
  }, [sessionId, currentUser?.id, isLocked, isOnline]);

  // Anti-Cheat Monitor Hook
  const { isBlackout } = useAntiCheat({
    maxViolations: 3,
    isActive: isConfirmed && sessionStatus === 'ONGOING' && !isLocked && !!sessionId,
    onWarn: async (reason, count) => {
      toast.error(`CẢNH BÁO VI PHẠM (${count}/3): ${reason}\n\nVi phạm 3 lần bài thi sẽ bị tạm khóa chờ Giám thị!`, { duration: 6000 });
      if (sessionId && currentUser?.id) {
        await supabase.from('room_members').update({ violation_count: count, status: 'WARNING' }).eq('session_id', sessionId).eq('student_id', currentUser.id);
        await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: currentUser.id, action: 'WARNING', description: reason });
      }
    },
    onLockExam: async () => {
      setIsLocked(true);
      toast.error("BÀI THI ĐÃ BỊ TẠM KHÓA DO VI PHẠM 3/3 LẦN! Vui lòng giữ nguyên màn hình và báo Giám thị.", { duration: 8000 });
      if (sessionId && currentUser?.id) {
        await supabase.from('room_members').update({ status: 'LOCKED' }).eq('session_id', sessionId).eq('student_id', currentUser.id);
        await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: currentUser.id, action: 'FORCE_LOCK', description: 'Tạm khóa do vi phạm nội quy 3/3 lần.' });
      }
    }
  });

  // Đồng hồ đếm ngược (chỉ chạy khi ca thi ONGOING)
  useEffect(() => {
    if (!isConfirmed || sessionStatus !== 'ONGOING' || isLocked || isSubmitting || resultData) return;

    if (timeLeft <= 0) {
      toast.error("Đã hết thời gian làm bài! Hệ thống đang tự động nộp bài.");
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isConfirmed, sessionStatus, isLocked, isSubmitting, resultData]);

  // Lưu nháp local tự động
  useEffect(() => {
    if (id && currentUser?.id && isConfirmed && sessionStatus === 'ONGOING') {
      const storageKey = `live_draft_${currentUser.id}_${id}`;
      localStorage.setItem(storageKey, JSON.stringify({
        answers: userAnswers,
        marked: markedForReview,
        timeLeft: timeLeft
      }));
    }
  }, [userAnswers, markedForReview, timeLeft, id, currentUser?.id, isConfirmed, sessionStatus]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success('Đã khôi phục kết nối mạng'); };
    const handleOffline = () => { setIsOnline(false); toast.error('Mất kết nối mạng! Bài làm vẫn đang được lưu cục bộ.'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ==========================================
  // 4. XỬ LÝ TRẢ LỜI CÂU HỎI
  // ==========================================
  const handleAnswerMCQ = (questionId: string, optionLetter: string) => {
    if (sessionStatus !== 'ONGOING') return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionLetter }));
  };

  const handleAnswerTF = (questionId: string, subLabel: string, value: boolean) => {
    if (sessionStatus !== 'ONGOING') return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [subLabel.toLowerCase().trim()]: value
      }
    }));
  };

  const handleAnswerSAQ = (questionId: string, val: string) => {
    if (sessionStatus !== 'ONGOING') return;
    setUserAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const toggleFlag = (questionId: string) => {
    setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const isQuestionAnswered = (q: any) => {
    const val = userAnswers[q.id];
    if (val == null) return false;
    if (q.qType === 'tf') {
      const keys = Object.keys(val);
      return keys.length >= (q.sub_questions?.length || 4);
    }
    return String(val).trim().length > 0;
  };

  // ==========================================
  // 5. TÍNH ĐIỂM VÀ NỘP BÀI THI
  // ==========================================
  const calculateFinalScore = () => {
    if (rawQuestions.length === 0) return { score: 0, correctCount: 0 };

    const gradingType = examData?.tags?.find((t: string) => t.startsWith('grading_type:'))?.split(':')[1] || 'standard';

    if (gradingType === 'custom') {
      let correctCount = 0;
      rawQuestions.forEach(q => {
        const userAns = userAnswers[q.id];
        if (!userAns) return;

        const qType = q.qType || 'mcq';
        if (qType === 'mcq') {
          if (String(userAns).trim().toLowerCase() === String(q.correct_answer || '').trim().toLowerCase()) {
            correctCount += 1;
          }
        } 
        else if (qType === 'saq') {
          const cleanUser = String(userAns).trim().replace(/,/g, '.').toLowerCase();
          const cleanCorrect = String(q.correct_answer || '').trim().replace(/,/g, '.').toLowerCase();
          if (cleanUser === cleanCorrect) {
            correctCount += 1;
          }
        } 
        else if (qType === 'tf') {
          let correctSubs = 0;
          let parsedCorrect: any = {};
          try {
            parsedCorrect = typeof q.correct_answer === 'object' ? q.correct_answer : JSON.parse(q.correct_answer);
          } catch(e) {}

          q.sub_questions?.forEach((sub: any) => {
            const subKey = sub.label.toLowerCase().trim();
            if (userAns[subKey] === parsedCorrect[subKey]) correctSubs += 1;
          });

          if (correctSubs === (q.sub_questions?.length || 4)) correctCount += 1;
          else if (correctSubs === 3) correctCount += 0.5;
          else if (correctSubs === 2) correctCount += 0.25;
          else if (correctSubs === 1) correctCount += 0.1;
        }
      });
      const score = Number(((correctCount / rawQuestions.length) * 10).toFixed(2));
      return { score, correctCount };
    } else {
      const p1 = rawQuestions.filter(q => (q.qType || 'mcq') === 'mcq');
      const p2 = rawQuestions.filter(q => (q.qType || 'mcq') === 'tf');
      const p3 = rawQuestions.filter(q => (q.qType || 'mcq') === 'saq');

      let w1 = p1.length > 0 ? 3.0 : 0;
      let w2 = p2.length > 0 ? 4.0 : 0;
      let w3 = p3.length > 0 ? 3.0 : 0;
      const totalWeight = w1 + w2 + w3;

      const a1 = totalWeight > 0 ? 10.0 * (w1 / totalWeight) : 0;
      const a2 = totalWeight > 0 ? 10.0 * (w2 / totalWeight) : 0;
      const a3 = totalWeight > 0 ? 10.0 * (w3 / totalWeight) : 0;

      const mcqWeight = p1.length > 0 ? a1 / p1.length : 0;
      const tfMaxWeight = p2.length > 0 ? a2 / p2.length : 0;
      const saqWeight = p3.length > 0 ? a3 / p3.length : 0;

      let finalScore = 0;
      let correctCount = 0;

      rawQuestions.forEach(q => {
        const userAns = userAnswers[q.id];
        if (!userAns) return;

        const qType = q.qType || 'mcq';
        if (qType === 'mcq') {
          if (String(userAns).trim().toLowerCase() === String(q.correct_answer || '').trim().toLowerCase()) {
            finalScore += mcqWeight;
            correctCount += 1;
          }
        } 
        else if (qType === 'saq') {
          const cleanUser = String(userAns).trim().replace(/,/g, '.').toLowerCase();
          const cleanCorrect = String(q.correct_answer || '').trim().replace(/,/g, '.').toLowerCase();
          if (cleanUser === cleanCorrect) {
            finalScore += saqWeight;
            correctCount += 1;
          }
        } 
        else if (qType === 'tf') {
          let correctSubs = 0;
          let parsedCorrect: any = {};
          try {
            parsedCorrect = typeof q.correct_answer === 'object' ? q.correct_answer : JSON.parse(q.correct_answer);
          } catch(e) {}

          q.sub_questions?.forEach((sub: any) => {
            const subKey = sub.label.toLowerCase().trim();
            if (userAns[subKey] === parsedCorrect[subKey]) correctSubs += 1;
          });

          if (correctSubs === 4) {
            finalScore += tfMaxWeight;
            correctCount += 1;
          } else if (correctSubs === 3) {
            finalScore += tfMaxWeight * 0.5;
            correctCount += 0.5;
          } else if (correctSubs === 2) {
            finalScore += tfMaxWeight * 0.25;
            correctCount += 0.25;
          } else if (correctSubs === 1) {
            finalScore += tfMaxWeight * 0.1;
            correctCount += 0.1;
          }
        }
      });

      return { score: Number(finalScore.toFixed(2)), correctCount };
    }
  };

  const handleAutoSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const { score, correctCount } = calculateFinalScore();
    const timeSpent = Math.max(0, (examData?.time_limit || 5400) - timeLeft);

    const studentId = currentUser?.id;
    if (studentId) {
      const attempt = await examService.submitExam(id!, studentId, score, timeSpent, sessionId, currentUser);
      
      if (attempt && typeof attempt === 'object') {
        const attemptObj = attempt as any;
        await supabase.from('exam_logs').insert({
          session_id: sessionId || null,
          student_id: studentId,
          action: 'SUBMIT_ANSWERS',
          description: JSON.stringify({
            exam_id: id,
            attempt_id: attemptObj.id,
            answers: userAnswers
          })
        });
      }
      
      // Gửi broadcast siêu tốc báo cho Giám thị
      if (monitorChannelRef.current) {
        monitorChannelRef.current.send({
          type: 'broadcast',
          event: 'submit_exam',
          payload: { student_id: studentId, score: score }
        });
      }
    } else {
      console.warn("Chưa tải xong thông tin sinh viên, bỏ qua đồng bộ CSDL.");
    }
    
    setResultData({ score, correctCount, total: rawQuestions.length, timeSpent });
    setIsSubmitting(false);
  };

  const handleSyncLiveStatus = async () => {
    if (!sessionId) {
      toast.success("Đã đồng bộ bài thi tự do thành công!");
      return;
    }
    setIsSyncing(true);
    try {
      // 1. Tải lại trạng thái ca thi trực tiếp từ database
      const { data: sessionData } = await supabase
        .from('live_sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        setSessionStatus(sessionData.status as any);
      }

      // 2. Gửi tín hiệu ping ngay lập tức cho Giám thị
      if (currentUser?.id && monitorChannelRef.current && monitorChannelRef.current.state === 'joined') {
        monitorChannelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { student_id: currentUser.id }
        });
      }

      // 3. Upsert trạng thái hiện tại lên room_members
      if (currentUser?.id) {
        await supabase.from('room_members').upsert({ 
          session_id: sessionId, 
          student_id: currentUser.id, 
          status: 'ONLINE', 
          last_ping: new Date().toISOString() 
        }, { onConflict: 'session_id, student_id' });
      }

      toast.success("Đã đồng bộ trạng thái phòng thi thành công!", { icon: '🔄' });
    } catch (err) {
      toast.error("Không thể kết nối máy chủ để đồng bộ.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSubmit = () => {
    if (sessionStatus !== 'ONGOING') return;
    const answeredTotal = rawQuestions.filter(q => isQuestionAnswered(q)).length;
    const unAnsweredTotal = rawQuestions.length - answeredTotal;

    let confirmMsg = `Bạn đã hoàn thành ${answeredTotal}/${rawQuestions.length} câu hỏi. Bạn có chắc chắn muốn nộp bài thi?`;
    if (unAnsweredTotal > 0) {
      confirmMsg = `CẢNH BÁO: Còn ${unAnsweredTotal} câu hỏi chưa trả lời! Bạn có chắc chắn muốn nộp bài ngay?`;
    }

    if (window.confirm(confirmMsg)) {
      handleAutoSubmit();
    }
  };

  const scrollToQuestion = (globalIdx: number) => {
    setCurrentGlobalIndex(globalIdx);
    const targetPartIdx = parts.findIndex(p => p.data.some((q: any) => q.globalIndex === globalIdx));
    if (targetPartIdx !== -1) {
      setCurrentPartIndex(targetPartIdx);
    }
  };

  const formatTimeStr = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const MarkdownComponents = {
    img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded border border-[#dee2e6] my-3 block shadow-sm" alt={props.alt || "Ảnh bài thi"} loading="lazy" />
  };

  // Render trạng thái chuẩn bị / lỗi
  if (isPreparing) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa] text-primary">
      <Loader2 size={44} className="animate-spin mb-3" />
      <p className="font-bold text-[15px] text-[#212529]">Đang nạp dữ liệu kỳ thi trực tuyến...</p>
    </div>
  );

  if (error || parts.length === 0) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f8f9fa] text-[#6c757d] p-6 text-center">
      <AlertCircle size={48} className="text-[#dc3545] mb-4 opacity-80" />
      <h2 className="text-xl font-bold font-heading text-[#212529] mb-2">Không thể tải đề thi</h2>
      <p className="text-[14px] text-[#6c757d] mb-6 max-w-md">{error || "Đề thi không tồn tại hoặc chưa bổ sung câu hỏi."}</p>
      <button onClick={() => navigate(-1)} className="btn-primary px-6 py-2.5 rounded-xl font-bold text-[14px]">
        Quay lại
      </button>
    </div>
  );

  // ==========================================
  // RÀNG BUỘC 1: SẢNH CHỜ KHI GIÁM THỊ CHƯA BẮT ĐẦU (sessionStatus === 'PENDING')
  // ==========================================
  if (sessionStatus === 'PENDING') return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white max-w-xl w-full rounded-2xl border border-[#dee2e6] shadow-md overflow-hidden text-center animate-in fade-in">
        
        {/* Banner Header */}
        <div className="bg-[#fff3cd] border-b border-[#ffecb5] p-6 text-[#664d03]">
          <div className="w-14 h-14 rounded-full bg-[#ffc107] text-[#212529] flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Lock size={28} />
          </div>
          <span className="bg-white text-[#664d03] font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full border border-[#ffecb5] inline-block mb-2">
            Phòng thi trực tuyến đang ở trạng thái chờ
          </span>
          <h2 className="text-xl font-bold font-heading m-0 text-[#212529]">{examData?.title}</h2>
        </div>

        {/* Nội dung sảnh chờ */}
        <div className="p-8 space-y-6">
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#e7f1ff] border-t-primary rounded-full animate-spin"></div>
              <Radio size={24} className="text-primary absolute inset-0 m-auto" />
            </div>
            <p className="font-bold text-[15px] text-[#052c65] animate-pulse m-0">
              Vui lòng đợi Giám thị / Admin nhấn "BẮT ĐẦU CA THI"...
            </p>
            <p className="text-[13px] text-[#6c757d] max-w-sm m-0 leading-relaxed">
              Nội dung đề thi và đồng hồ làm bài hiện đang khóa tạm thời để đảm bảo tính công bằng cho tất cả thí sinh.
            </p>
          </div>

          {/* Thông tin Thí sinh */}
          <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#dee2e6] text-left flex items-center justify-between text-[13px]">
            <div>
              <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Thí sinh dự thi</div>
              <div className="font-bold text-[#212529] text-[14px]">{currentUser?.name || "Thí sinh"}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Mã số SBD</div>
              <div className="font-bold text-primary text-[14px]">{currentUser?.studentId || "N/A"}</div>
            </div>
          </div>

          <button onClick={() => navigate(-1)} className="btn-secondary w-full py-2.5 text-[13px]">
            Rời khỏi sảnh chờ
          </button>
        </div>

      </div>
    </div>
  );

  // ==========================================
  // RÀNG BUỘC 2: CA THI ĐÃ KẾT THÚC (sessionStatus === 'COMPLETED')
  // ==========================================
  if (sessionStatus === 'COMPLETED' && !resultData) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl border border-[#dee2e6] shadow-md p-8 text-center animate-in fade-in">
        <AlertCircle size={48} className="text-[#6c757d] mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold font-heading text-[#212529] mb-2">Ca thi đã kết thúc</h2>
        <p className="text-[13px] text-[#6c757d] mb-6">Giám thị đã đóng ca thi trực tuyến này. Bạn không thể tiếp tục gửi bài làm.</p>
        <button onClick={() => navigate('/overview')} className="btn-primary w-full py-2.5 text-[14px]">
          Về Trang tổng quan
        </button>
      </div>
    </div>
  );

  // ==========================================
  // RÀNG BUỘC 3: MÀN HÌNH TẠM KHÓA DO VI PHẠM (isLocked === true)
  // ==========================================
  if (isLocked && !resultData) return (
    <div className="min-h-screen bg-[#f8d7da] flex items-center justify-center p-4 select-none">
      <div className="bg-white max-w-lg w-full rounded-2xl border border-[#f5c2c7] shadow-2xl p-8 text-center animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-[#f8d7da] text-[#dc3545] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#f5c2c7] shadow-sm">
          <ShieldAlert size={36} />
        </div>
        <span className="bg-[#dc3545] text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3">
          Vi phạm quy chế phòng thi 3/3 lần
        </span>
        <h2 className="text-2xl font-bold font-heading text-[#842029] mb-2">Bài Thi Của Bạn Đã Bị Tạm Khóa!</h2>
        <p className="text-[14px] text-[#495057] leading-relaxed mb-6">
          Bài làm và thời gian làm bài của bạn đang được giữ nguyên trên hệ thống. Vui lòng báo trực tiếp với <strong>Giám thị / Giáo viên</strong> để được hỗ trợ kiểm tra và gỡ khóa tiếp tục thi.
        </p>

        <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#dee2e6] text-left text-[13px] text-[#6c757d] space-y-2 mb-6">
          <div className="font-bold text-[#212529] flex items-center gap-2">
            <Radio size={16} className="text-primary animate-pulse" /> Trạng thái kết nối phòng thi:
          </div>
          <div className="flex items-center gap-2 text-[#198754] font-medium pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#198754] animate-ping"></span>
            Đang chờ lệnh "MỞ KHÓA BÀI THI" từ Giám thị...
          </div>
        </div>

        <button onClick={() => navigate('/overview')} className="btn-secondary w-full py-2.5 text-[14px]">
          Tạm thời về Trang tổng quan
        </button>
      </div>
    </div>
  );

  // MÀN HÌNH HƯỚNG DẪN TRƯỚC KHI VÀO ĐỀ
  if (!isConfirmed) return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white max-w-2xl w-full rounded-2xl border border-[#dee2e6] shadow-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-[#0d6efd] p-8 text-center text-white">
          <span className="bg-white/20 text-white font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-2">
            Phòng thi trực tuyến FMath
          </span>
          <h1 className="text-2xl font-bold font-heading m-0 leading-snug">{examData?.title}</h1>
          <p className="text-[#cfe2ff] text-[13px] mt-2 font-medium m-0">
            Thời gian làm bài: <strong>{Math.floor((examData?.time_limit || 5400) / 60)} phút</strong> • Tổng số câu: <strong>{rawQuestions.length} câu</strong>
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#dee2e6] space-y-2">
            <div className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider">Thông tin thí sinh</div>
            <div className="flex items-center justify-between text-[14px] font-bold text-[#212529]">
              <span>{currentUser?.name || "Thí sinh"}</span>
              <span className="text-primary">MSSV: {currentUser?.studentId || "N/A"}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-[15px] text-[#212529] font-heading mb-3">Quy chế & Lưu ý phòng thi:</h3>
            <ul className="space-y-2.5 text-[13px] text-[#495057] font-medium m-0 pl-0 list-none">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#198754] shrink-0 mt-0.5" />
                <span>Đồng hồ sẽ tự động đếm ngược ngay khi bạn bấm nút Bắt đầu.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#198754] shrink-0 mt-0.5" />
                <span>Bài làm tự động lưu từng câu hỏi trực tiếp lên đám mây.</span>
              </li>
              <li className="flex items-start gap-2 text-[#dc3545]">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span><strong>Giám sát Anti-Cheat:</strong> Tuyệt đối không chuyển tab hoặc thu nhỏ trình duyệt (Cảnh báo 3 lần sẽ tự động thu bài).</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => navigate(-1)} className="btn-secondary flex-1 py-3 text-[14px] rounded-xl">
              Hủy bỏ
            </button>
            <button onClick={() => setIsConfirmed(true)} className="btn-primary flex-[2] py-3 text-[14px] rounded-xl shadow-sm font-bold flex justify-center items-center gap-2">
              <Send size={16} /> VÀO LÀM BÀI THI
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // MODAL HIỂN THỊ KẾT QUẢ THI
  if (resultData) return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white max-w-md w-full rounded-2xl border border-[#dee2e6] shadow-2xl p-8 text-center animate-in zoom-in-95">
        <div className="w-16 h-16 bg-[#d1e7dd] text-[#198754] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#a3cfbb]">
          <Trophy size={32} />
        </div>
        <h2 className="text-2xl font-bold font-heading text-[#212529] mb-1">Nộp Bài Thành Công!</h2>
        <p className="text-[13px] text-[#6c757d] mb-6">Kết quả làm bài thi trực tuyến của bạn đã được ghi nhận.</p>

        <div className="bg-[#f8f9fa] p-5 rounded-2xl border border-[#dee2e6] mb-6 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-1">Điểm số đạt được</div>
            <div className="text-4xl font-black text-primary font-heading">{resultData.score} <span className="text-lg text-[#6c757d]">/ 10</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e9ecef] text-[13px]">
            <div>
              <div className="text-[#6c757d] font-medium">Số câu đúng</div>
              <div className="font-bold text-[#198754] text-[15px]">{resultData.correctCount} / {resultData.total} câu</div>
            </div>
            <div>
              <div className="text-[#6c757d] font-medium">Thời gian làm</div>
              <div className="font-bold text-[#212529] text-[15px]">{formatTimeStr(resultData.timeSpent)}</div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/overview')} className="btn-primary w-full py-3 rounded-xl font-bold text-[14px] shadow-sm">
          VỀ TRANG TỔNG QUAN
        </button>
      </div>
    </div>
  );

  // ==========================================
  // GIAO DIỆN PHÒNG THI CHÍNH (WHEN ONGOING & CONFIRMED)
  // ==========================================
  return (
    <div className="h-screen w-full max-w-full flex flex-col bg-[#f8f9fa] overflow-hidden text-[#212529] font-ui select-none print:hidden">
      <Toaster position="top-center" />

      {/* LỚP PHỦ MÀN HÌNH ĐEN BẢO VỆ CHỐNG CHỤP MÀN HÌNH / CHUYỂN TAB */}
      {isBlackout && (
        <div className="fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center text-white p-6 text-center select-none pointer-events-auto animate-in fade-in">
          <ShieldAlert size={64} className="text-[#dc3545] mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold font-heading mb-2 text-white">BẢO VỆ NỘI DUNG ĐỀ THI (AN NINH)</h1>
          <p className="text-slate-300 text-sm max-w-md m-0 leading-relaxed">
            Màn hình đã bị che đen hoàn toàn để chống chụp ảnh / chuyển ứng dụng bên ngoài. Vui lòng quay lại cửa sổ bài thi.
          </p>
        </div>
      )}

      {/* HEADER TỐI GIẢN 1 TẦNG (56PX) */}
      <header className="h-14 bg-white border-b border-[#dee2e6] px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => { if(window.confirm("Thoát phòng thi sẽ hủy phiên làm bài. Chắc chắn thoát?")) navigate(-1); }}
            className="p-2 text-[#6c757d] hover:bg-[#e9ecef] rounded-lg transition-colors border border-[#dee2e6]"
            title="Thoát bài thi"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-[14px] text-[#212529] font-heading truncate max-w-sm md:max-w-md m-0">
              {examData?.title}
            </h1>
            <div className="text-[11px] text-[#6c757d] font-medium truncate">
              Thí sinh: <strong className="text-[#212529]">{currentUser?.name || "Học sinh"}</strong> • SBD: {currentUser?.studentId || "N/A"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSyncLiveStatus}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#dee2e6] bg-white hover:bg-[#f8f9fa] text-[#495057] hover:text-primary transition-all text-[12px] font-bold active:scale-95 disabled:opacity-50 shadow-sm shrink-0"
            title="Đồng bộ thủ công với Giám thị"
          >
            <RefreshCcw size={14} className={isSyncing ? 'animate-spin text-primary' : ''} />
            <span>{isSyncing ? 'Đang tải...' : 'ĐỒNG BỘ'}</span>
          </button>

          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${isOnline ? 'bg-[#d1e7dd] text-[#0f5132] border-[#a3cfbb]' : 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#198754] animate-pulse' : 'bg-[#dc3545]'}`}></span>
            {isOnline ? 'Mạng ổn định' : 'Mất mạng'}
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-[14px] ${timeLeft <= 300 ? 'bg-[#f8d7da] text-[#dc3545] border-[#f5c2c7] animate-pulse' : 'bg-[#f8f9fa] text-[#212529] border-[#dee2e6]'}`}>
            <Clock size={16} className={timeLeft <= 300 ? 'text-[#dc3545]' : 'text-primary'} />
            <span>{formatTimeStr(timeLeft)}</span>
          </div>

          <button 
            onClick={handleManualSubmit}
            disabled={isSubmitting}
            className="btn-primary py-1.5 px-5 rounded-xl font-bold text-[13px] shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            NỘP BÀI
          </button>
        </div>

      </header>

      {/* WORKSPACE 2 CỘT */}
      <div className="flex-1 flex overflow-hidden">
        
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            
            <div className="bg-white p-4 rounded-xl border border-[#dee2e6] shadow-sm flex items-center justify-between">
              <h2 className="font-bold text-[15px] text-primary font-heading m-0">
                {parts[currentPartIndex]?.title}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPartIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentPartIndex === 0}
                  className="p-1.5 rounded-lg border border-[#dee2e6] text-[#495057] disabled:opacity-40 hover:bg-[#f8f9fa]"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[12px] font-bold text-[#6c757d]">
                  {currentPartIndex + 1} / {parts.length}
                </span>
                <button
                  onClick={() => setCurrentPartIndex(prev => Math.min(parts.length - 1, prev + 1))}
                  disabled={currentPartIndex === parts.length - 1}
                  className="p-1.5 rounded-lg border border-[#dee2e6] text-[#495057] disabled:opacity-40 hover:bg-[#f8f9fa]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {(() => {
              const q = rawQuestions[currentGlobalIndex];
              if (!q) return null;
              const isFlagged = markedForReview[q.id];
              const isDone = isQuestionAnswered(q);

              return (
                <div 
                  key={q.id}
                  className="bg-white p-6 rounded-2xl border border-[#dee2e6] shadow-sm transition-all relative space-y-5"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-[#f8f9fa] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#052c65] text-white text-[13px] font-extrabold px-3.5 py-1 rounded-xl shadow-sm">
                        Câu {q.globalIndex + 1} / {rawQuestions.length}
                      </span>
                      {isDone && (
                        <span className="text-[#198754] bg-[#d1e7dd] text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-[#a3cfbb] flex items-center gap-1">
                          <CheckCircle2 size={13} /> Đã trả lời
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleFlag(q.id)}
                      className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-[12px] font-bold ${
                        isFlagged 
                          ? 'bg-[#fff3cd] text-[#856404] border-[#ffebaa]' 
                          : 'bg-white text-[#6c757d] border-[#dee2e6] hover:bg-[#f8f9fa]'
                      }`}
                      title="Đánh dấu xem lại"
                    >
                      <Flag size={14} className={isFlagged ? 'fill-current text-[#ffc107]' : ''} />
                      {isFlagged ? 'Đã xem lại' : 'Đánh dấu'}
                    </button>
                  </div>

                  <div className="prose prose-sm max-w-none text-[#212529] font-medium text-[13px] leading-normal overflow-x-auto [&_.katex-display]:my-2">
                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>
                      {q.content}
                    </ReactMarkdown>
                  </div>

                  {q.qType === 'mcq' && q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt: any, idx: number) => {
                        const optLetter = LETTERS[idx] || String(idx);
                        const isSelected = userAnswers[q.id] === optLetter;

                        return (
                          <div
                            key={idx}
                            onClick={() => handleAnswerMCQ(q.id, optLetter)}
                            className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                              isSelected 
                                ? 'bg-[#cfe2ff] border-primary text-[#084298] font-bold shadow-sm ring-1 ring-primary' 
                                : 'bg-white border-[#dee2e6] hover:border-[#b6d4fe] text-[#495057]'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${
                              isSelected ? 'bg-primary text-white shadow-sm' : 'bg-[#e9ecef] text-[#6c757d]'
                            }`}>
                              {optLetter}
                            </div>
                            <div className="prose prose-sm flex-1 text-[13px] leading-normal overflow-x-auto pt-0.5 m-0">
                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>
                                {opt.text || String(opt)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.qType === 'tf' && q.sub_questions && (
                    <div className="pt-1 overflow-x-auto">
                      <table className="w-full border-collapse border border-[#dee2e6] text-[12px] rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-[#f8f9fa] text-[#495057]">
                            <th className="p-2.5 text-left border-b border-[#dee2e6] font-bold">Mệnh đề phát biểu</th>
                            <th className="p-2.5 text-center w-16 border-b border-[#dee2e6] font-bold text-[#198754]">Đúng</th>
                            <th className="p-2.5 text-center w-16 border-b border-[#dee2e6] font-bold text-[#dc3545]">Sai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dee2e6] bg-white">
                          {q.sub_questions.map((sub: any, sIdx: number) => {
                            const subKey = sub.label.toLowerCase().trim();
                            const val = userAnswers[q.id]?.[subKey];

                            return (
                              <tr key={sIdx} className="hover:bg-[#f8f9fa]">
                                <td className="p-2.5 text-[#212529] font-medium">
                                  <span className="font-bold text-primary mr-1">{sub.label.toLowerCase()})</span>
                                  {sub.text}
                                </td>
                                <td className="p-1.5 text-center bg-[#f8f9fa]">
                                  <button
                                    onClick={() => handleAnswerTF(q.id, sub.label, true)}
                                    className={`w-full py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                      val === true ? 'bg-[#198754] text-white' : 'bg-white border border-[#dee2e6] text-[#6c757d] hover:bg-[#e9ecef]'
                                    }`}
                                  >
                                    Đúng
                                  </button>
                                </td>
                                <td className="p-1.5 text-center bg-[#f8f9fa]">
                                  <button
                                    onClick={() => handleAnswerTF(q.id, sub.label, false)}
                                    className={`w-full py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                      val === false ? 'bg-[#dc3545] text-white' : 'bg-white border border-[#dee2e6] text-[#6c757d] hover:bg-[#e9ecef]'
                                    }`}
                                  >
                                    Sai
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {q.qType === 'saq' && (
                    <div className="bg-[#f8f9fa] p-3 rounded-xl border border-[#dee2e6] space-y-1.5">
                      <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider block">
                        Nhập kết quả số (Dùng dấu "." nếu có số thập phân):
                      </label>
                      <input
                        type="text"
                        value={userAnswers[q.id] || ""}
                        onChange={(e) => handleAnswerSAQ(q.id, e.target.value)}
                        placeholder="Ví dụ: -3.5"
                        className="w-full max-w-xs px-3 py-2 rounded-xl border border-[#dee2e6] focus:border-primary outline-none font-bold text-[14px] text-[#212529] bg-white transition-colors"
                      />
                    </div>
                  )}

                  {/* THANH ĐIỀU HƯỚNG CÂU TRƯỚC / CÂU TIẾP THEO CHUẨN THPTQG */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#dee2e6]">
                    <button
                      onClick={() => setCurrentGlobalIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentGlobalIndex === 0}
                      className="px-3.5 py-1.5 rounded-xl border border-[#dee2e6] bg-white hover:bg-[#f8f9fa] font-bold text-[11px] text-[#212529] disabled:opacity-40 flex items-center gap-1 shadow-sm"
                    >
                      <ChevronLeft size={14} /> CÂU TRƯỚC
                    </button>

                    <span className="text-[11px] font-bold text-[#6c757d]">
                      {currentGlobalIndex + 1} / {rawQuestions.length}
                    </span>

                    <button
                      onClick={() => setCurrentGlobalIndex(prev => Math.min(rawQuestions.length - 1, prev + 1))}
                      disabled={currentGlobalIndex === rawQuestions.length - 1}
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-[11px] disabled:opacity-40 flex items-center gap-1 shadow-sm"
                    >
                      CÂU TIẾP THEO <ChevronRight size={14} />
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        </main>

        <aside className="w-80 shrink-0 bg-white border-l border-[#dee2e6] flex flex-col h-full overflow-hidden hidden lg:flex">
          
          <div className="p-4 border-b border-[#dee2e6] bg-[#f8f9fa] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#212529] uppercase tracking-wider font-heading">
                Ma trận Câu hỏi
              </span>
              <span className="text-[12px] font-bold text-primary bg-[#e7f1ff] px-2.5 py-0.5 rounded border border-[#b6d4fe]">
                {rawQuestions.filter(q => isQuestionAnswered(q)).length} / {rawQuestions.length} câu
              </span>
            </div>

            <div className="w-full h-2 bg-[#e9ecef] rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(rawQuestions.filter(q => isQuestionAnswered(q)).length / (rawQuestions.length || 1)) * 100}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-1">
              <button
                onClick={() => setMatrixFilter('all')}
                className={`py-1 text-[11px] font-bold rounded-lg ${matrixFilter === 'all' ? 'bg-primary text-white' : 'bg-white border border-[#dee2e6] text-[#6c757d]'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setMatrixFilter('done')}
                className={`py-1 text-[11px] font-bold rounded-lg ${matrixFilter === 'done' ? 'bg-[#198754] text-white' : 'bg-white border border-[#dee2e6] text-[#6c757d]'}`}
              >
                Đã làm
              </button>
              <button
                onClick={() => setMatrixFilter('todo')}
                className={`py-1 text-[11px] font-bold rounded-lg ${matrixFilter === 'todo' ? 'bg-[#6c757d] text-white' : 'bg-white border border-[#dee2e6] text-[#6c757d]'}`}
              >
                Chưa làm
              </button>
              <button
                onClick={() => setMatrixFilter('flag')}
                className={`py-1 text-[11px] font-bold rounded-lg ${matrixFilter === 'flag' ? 'bg-[#ffc107] text-[#212529]' : 'bg-white border border-[#dee2e6] text-[#6c757d]'}`}
              >
                Xem lại
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="grid grid-cols-5 gap-2.5">
              {rawQuestions.map((q, idx) => {
                const isDone = isQuestionAnswered(q);
                const isFlagged = markedForReview[q.id];

                if (matrixFilter === 'done' && !isDone) return null;
                if (matrixFilter === 'todo' && isDone) return null;
                if (matrixFilter === 'flag' && !isFlagged) return null;

                let btnStyle = "bg-white border-[#dee2e6] text-[#495057] hover:border-primary";
                if (isDone) btnStyle = "bg-[#198754] border-[#198754] text-white font-bold";
                if (isFlagged) btnStyle += " ring-2 ring-[#ffc107]";
                if (idx === currentGlobalIndex) btnStyle += " ring-2 ring-primary border-primary font-black scale-105 shadow-md bg-[#e7f1ff] text-primary";

                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(idx)}
                    className={`h-7 rounded-lg border text-[11px] font-bold flex items-center justify-center transition-all relative ${btnStyle}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="w-2 h-2 rounded-full bg-[#ffc107] absolute -top-0.5 -right-0.5 border border-white"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 border-t border-[#dee2e6] bg-[#f8f9fa] text-[11px] font-semibold text-[#6c757d] flex items-center justify-around">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#198754]"></span> Đã làm</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-white border border-[#dee2e6]"></span> Chưa làm</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#ffc107]"></span> Xem lại</span>
          </div>

        </aside>

      </div>

    </div>
  );
}