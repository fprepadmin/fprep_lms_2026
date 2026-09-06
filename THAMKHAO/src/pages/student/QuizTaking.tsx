import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Loader2, ArrowLeft, ArrowRight, BrainCircuit, 
  Send, Trophy, Flame, Calendar, CheckCircle2, XCircle, 
  MessageSquare, LayoutGrid, ChevronLeft, CheckSquare, RefreshCcw, BookOpen, AlertTriangle, WifiOff
} from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { supabase } from '../../config/supabase';
import { useAppStore, useExamStore } from '../../store/useAppStore';
import { askGroqAI } from '../../services/groqAI';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { calculateStreakUpdate } from '../../utils/streakUtils';

// --- HÀM TIỆN ÍCH ---
const getQuestionType = (q: any) => {
  if (!q) return 'mcq';
  if (typeof q.correct_answer === 'object' && q.correct_answer !== null) return 'tf';
  if (typeof q.correct_answer === 'string') {
    const cleanCA = q.correct_answer.toLowerCase().trim();
    if (cleanCA.includes('true') || cleanCA.includes('false')) return 'tf';
  }
  const typeStr = String(q.type || '').toLowerCase().trim();
  if (['mcq', 'tf', 'saq'].includes(typeStr)) return typeStr;
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  if (!hasOptions) return 'saq';
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

// --- COMPONENT CHÍNH ---
const QuizTaking = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Lấy sessionId nếu học sinh đi từ Sảnh chờ (Khảo thí Online)
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('sessionId');
  
  const { currentUser, setUser, isOnline, setOnlineStatus, setOfflineAnswer, syncAnswersToDB, clearOfflineAnswers } = useAppStore();
  const { clearCache } = useExamStore();

  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isPreparing, setIsPreparing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null); 
  const [aiReview, setAiReview] = useState("");
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [chatHistory, setChatHistory] = useState<Record<string, {role: string, content: string}[]>>({});
  const [isAiReplying, setIsAiReplying] = useState<Record<string, boolean>>({});
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  const questionBodyRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // 1. TẢI DỮ LIỆU ĐỀ THI
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const prepareQuiz = async () => {
      if (!id) return;
      if (!currentUser?.id) {
        const timer = setTimeout(() => { if (isMounted) setIsPreparing(false); }, 3000); 
        return () => clearTimeout(timer);
      }

      setIsPreparing(true);
      try {
        const { data: fetchedExam, error: examError } = await supabase.from('exams').select('*').eq('id', id).single();
        if (examError || !fetchedExam) throw new Error("Không thể tải dữ liệu đề thi.");

        const { data: eqData, error: qError } = await supabase
          .from('exam_questions')
          .select('sort_order, exercises(*)')
          .eq('exam_id', id)
          .order('sort_order', { ascending: true });

        if (qError) throw new Error("Lỗi tải danh sách câu hỏi.");

        if (isMounted) {
          setExamData(fetchedExam);
          const extractedQuestions = eqData?.map((item: any) => item.exercises).filter(Boolean) || [];
          setQuestions(extractedQuestions);

          let restoredTime = fetchedExam.time_limit || 2400;
          if (currentUser?.id) {
            const draftStr = localStorage.getItem(`fmath_draft_${currentUser.id}_${fetchedExam.id}`);
            if (draftStr) {
              try {
                const draft = JSON.parse(draftStr);
                if (draft.answers) {
                  setAnswers(draft.answers);
                  Object.keys(draft.answers).forEach(k => setOfflineAnswer(k, draft.answers[k]));
                }
                if (draft.timeLeft !== undefined && draft.timeLeft > 0) restoredTime = draft.timeLeft;
              } catch(e) {}
            }
          }
          setTimeLeft(restoredTime);
          setTimeout(() => { if (isMounted) setIsPreparing(false); }, 500);
        }
      } catch (err: any) {
        if (isMounted) { setError(err.message || "Có lỗi xảy ra khi tải dữ liệu."); setIsPreparing(false); }
      }
    };
    prepareQuiz();
    return () => { isMounted = false; };
  }, [id, currentUser?.id]);

  // ==========================================
  // 2. ĐỒNG BỘ REALTIME VỚI GIÁM THỊ (LIVE MONITOR)
  // ==========================================
  useEffect(() => {
    if (!sessionId || !currentUser?.id || isPreparing || result) return;

    // 2.1. Đăng ký vào phòng thi trên DB
    const joinRoom = async () => {
      await supabase.from('room_members').upsert({
        session_id: sessionId,
        student_id: currentUser.id,
        status: 'ONLINE',
        last_ping: new Date().toISOString()
      }, { onConflict: 'session_id, student_id' });
    };
    joinRoom();

    // 2.2. Lắng nghe lệnh từ Giám thị
    const channel = supabase.channel(`monitor_room_${sessionId}`)
      .on('broadcast', { event: 'add_time' }, (payload: any) => {
        if (payload.payload.student_id === currentUser.id) {
          setTimeLeft(prev => prev + (payload.payload.minutes * 60));
          alert(`Giám thị vừa cộng thêm cho bạn ${payload.payload.minutes} phút!`);
        }
      })
      .on('broadcast', { event: 'force_lock' }, (payload: any) => {
        if (payload.payload.student_id === currentUser.id) {
          setIsLocked(true);
          alert("Giám thị đã ép thu bài của bạn!");
          handleSubmit(true); 
        }
      })
      .subscribe();

    // 2.3. BẮN NHỊP TIM (HEARTBEAT) SIÊU TỐC QUA WEBSOCKET
    let heartbeatTimer: NodeJS.Timeout;
    
    // Kiểm tra xem đây có phải kì thi lớn không
    const isHighStakes = examData?.type === 'Thi Thử' || examData?.type === 'Kiểm tra';

    const sendFastHeartbeat = () => {
      if (isOnline && !isLocked && !result) {
        // Chỉ gửi Broadcast (cực nhẹ và siêu tốc, không lưu DB)
        channel.send({ type: 'broadcast', event: 'heartbeat', payload: { student_id: currentUser.id } });
        
        // Tính toán độ trễ tiếp theo theo yêu cầu
        let nextDelay = 0;
        if (isHighStakes) {
          // Kỳ thi lớn: Max 2s, Min 0.5s (500ms -> 2000ms)
          nextDelay = Math.random() * (2000 - 500) + 500;
        } else {
          // Bình thường: Max 2s, Min 0.1s (100ms -> 2000ms)
          nextDelay = Math.random() * (2000 - 100) + 100;
        }
        
        heartbeatTimer = setTimeout(sendFastHeartbeat, nextDelay);
      }
    };

    // Bắt đầu vòng lặp bắn nhịp tim
    sendFastHeartbeat();

    // 2.4. ĐỒNG BỘ DB CHẬM (Lưu vết DB 15s/lần để chống sập Server)
    const dbBackupInterval = setInterval(async () => {
      if (isOnline && !isLocked && !result) {
        await supabase.from('room_members')
          .update({ last_ping: new Date().toISOString(), status: 'ONLINE' })
          .eq('session_id', sessionId).eq('student_id', currentUser.id);
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(heartbeatTimer);
      clearInterval(dbBackupInterval);
    };
  }, [sessionId, currentUser?.id, isPreparing, isOnline, isLocked, result, examData]);

  // ==========================================
  // 3. LƯU NHÁP & MẠNG (ONLINE/OFFLINE)
  // ==========================================
  useEffect(() => {
    if (examData?.id && currentUser?.id && !result && questions.length > 0 && timeLeft > 0) {
      localStorage.setItem(`fmath_draft_${currentUser.id}_${examData.id}`, JSON.stringify({ answers, timeLeft }));
    }
  }, [answers, timeLeft, examData?.id, currentUser?.id, result, questions.length]);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      if (examData?.id && currentUser?.id) syncAnswersToDB(examData.id, currentUser.id);
    };
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [examData, currentUser]);

  // ==========================================
  // 4. ĐẾM NGƯỢC
  // ==========================================
  useEffect(() => {
    if (isPreparing || result || isSubmitting || isLocked || timeLeft <= 0 || questions.length === 0) {
      if (timeLeft <= 0 && !result && questions.length > 0 && !isPreparing && !isLocked) handleSubmit(true);
      return;
    }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isPreparing, result, isSubmitting, isLocked, questions.length]);

  // ==========================================
  // 5. ANTI-CHEAT (CHỐNG GIAN LẬN)
  // ==========================================
  const isHighStakes = !!sessionId || examData?.type === 'Thi Thử' || examData?.type === 'Kiểm tra';
  
  const { violationCount } = useAntiCheat({
    maxViolations: 3,
    isActive: !result && !isPreparing && !isLocked && isHighStakes,
    onWarn: async (reason, count) => {
      alert(`⚠️ CẢNH BÁO GIAN LẬN (${count}/3)\n\nLý do: ${reason}\n\nNếu vi phạm đủ 3 lần, bài thi sẽ bị khóa và tự động nộp!`);
      // Báo cáo vi phạm lên Giám thị qua Realtime DB
      if (sessionId && currentUser?.id) {
        await supabase.from('room_members').update({ violation_count: count, status: 'WARNING' }).eq('session_id', sessionId).eq('student_id', currentUser.id);
        await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: currentUser.id, action: 'WARNING', description: reason });
      }
    },
    onLockExam: async () => {
      setIsLocked(true);
      alert("❌ BẠN ĐÃ VI PHẠM QUY CHẾ 3 LẦN.\nBài thi đã bị khóa và hệ thống sẽ tự động thu bài!");
      if (sessionId && currentUser?.id) {
        await supabase.from('room_members').update({ status: 'LOCKED' }).eq('session_id', sessionId).eq('student_id', currentUser.id);
        await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: currentUser.id, action: 'FORCE_LOCK', description: 'Vi phạm quá 3 lần, tự động khóa bài' });
      }
      handleSubmit(true);
    }
  });

  // ==========================================
  // 6. XỬ LÝ CHỌN ĐÁP ÁN
  // ==========================================
  const handleAnswerMCQ = (questionId: string, optionId: string) => { 
    if(result || isLocked) return;
    const val = String(optionId).toLowerCase().trim();
    setAnswers(prev => ({ ...prev, [questionId]: val })); 
    setOfflineAnswer(questionId, val);
  };
  const handleAnswerTF = (questionId: string, subId: string, value: boolean) => { 
    if(result || isLocked) return;
    const normSubId = String(subId).toLowerCase().trim();
    setAnswers(prev => {
      const newVal = { ...(prev[questionId] || {}), [normSubId]: value };
      setOfflineAnswer(questionId, newVal);
      return { ...prev, [questionId]: newVal };
    }); 
  };
  const handleAnswerSAQ = (questionId: string, value: string) => { 
    if(result || isLocked) return;
    setAnswers(prev => ({ ...prev, [questionId]: value })); 
    setOfflineAnswer(questionId, value);
  };

  const isQuestionAnswered = (q: any) => {
    const qType = getQuestionType(q);
    const ans = answers[q.id];
    if (ans == null) return false;
    if (qType === 'tf') return Object.keys(ans).length === (q.options?.length || 4);
    if (qType === 'saq') return String(ans).trim() !== "";
    return true;
  };

  // ==========================================
  // 7. NỘP BÀI VÀ CHẤM ĐIỂM
  // ==========================================
  const gradingType = examData?.tags?.find((t: string) => t.startsWith('grading_type:'))?.split(':')[1] || 'standard';

  const maxScore = gradingType === 'custom' ? 10 : questions.reduce((acc, q) => {
    const qType = getQuestionType(q);
    if (qType === 'tf') return acc + 1.0;
    if (qType === 'saq') return acc + 0.5;
    return acc + 0.25;
  }, 0);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!isAutoSubmit && !isLocked) {
      const unanswered = questions.filter(q => !isQuestionAnswered(q)).length;
      if (unanswered > 0) {
        if (!window.confirm(`Bạn còn ${unanswered} câu chưa làm. Xác nhận nộp bài sớm?`)) return;
      } else {
        if (!window.confirm("Xác nhận hoàn thành và nộp bài?")) return;
      }
    }

    setIsSubmitting(true);
    
    if (currentUser?.id && examData?.id) {
      localStorage.removeItem(`fmath_draft_${currentUser.id}_${examData.id}`);
      clearOfflineAnswers();
    }

    let totalScore = 0;
    let correctCountMCQ = 0;

    if (gradingType === 'custom') {
      let correctQuestionsCount = 0;
      questions.forEach(q => {
        const userAns = answers[q.id];
        if (userAns == null) return;
        const qType = getQuestionType(q);

        if (qType === 'tf') {
          let correctSubs = 0;
          const parsedCorrect = parseTFAnswer(q.correct_answer);
          q.options?.forEach((opt: any, idx: number) => { 
            const optId = String(opt.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
            if (userAns[optId] === parsedCorrect[optId]) correctSubs++; 
          });
          if (correctSubs === 4) { correctQuestionsCount += 1.0; correctCountMCQ++; }
          else if (correctSubs === 3) correctQuestionsCount += 0.5;
          else if (correctSubs === 2) correctQuestionsCount += 0.25;
          else if (correctSubs === 1) correctQuestionsCount += 0.1;
        } 
        else if (qType === 'saq') {
          if (isSaqCorrect(userAns, q.correct_answer)) { correctQuestionsCount += 1; correctCountMCQ++; }
        } 
        else {
          if (isMcqCorrect(userAns, q.correct_answer)) { correctQuestionsCount += 1; correctCountMCQ++; }
        }
      });
      totalScore = (correctQuestionsCount / questions.length) * 10;
    } else {
      questions.forEach(q => {
        const userAns = answers[q.id];
        if (userAns == null) return;
        const qType = getQuestionType(q);

        if (qType === 'tf') {
          let correctCount = 0;
          const parsedCorrect = parseTFAnswer(q.correct_answer);
          q.options?.forEach((opt: any, idx: number) => { 
            const optId = String(opt.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
            if (userAns[optId] === parsedCorrect[optId]) correctCount++; 
          });
          if (correctCount === 1) totalScore += 0.1;
          else if (correctCount === 2) totalScore += 0.25;
          else if (correctCount === 3) totalScore += 0.5;
          else if (correctCount === 4) { totalScore += 1.0; correctCountMCQ++; }
        } 
        else if (qType === 'saq') {
          if (isSaqCorrect(userAns, q.correct_answer)) { totalScore += 0.5; correctCountMCQ++; }
        } 
        else {
          if (isMcqCorrect(userAns, q.correct_answer)) { totalScore += 0.25; correctCountMCQ++; }
        }
      });
    }

    totalScore = Math.round(totalScore * 100) / 100;
    const timeSpent = (examData?.time_limit || 2400) - timeLeft;

    try {
      const prompt = `Học sinh lớp 12 nộp bài. Đề: "${examData?.title}". Điểm: ${totalScore}/${maxScore}. Nhận xét 2 câu cực ngắn gọn, khích lệ.`;
      const aiResponse = await askGroqAI("Bạn là giáo viên Toán tâm lý.", prompt);
      setAiReview(aiResponse);
    } catch (e) {
      setAiReview("Hệ thống AI đang bận. Kết quả của bạn đã được ghi nhận thành công!");
    }

    if (currentUser?.id && id) {
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .insert({ 
          exam_id: examData.id, 
          user_id: currentUser.id, 
          score: totalScore, 
          time_spent: timeSpent > 0 ? timeSpent : 0 
        })
        .select()
        .single();
      
      if (attempt) {
        await supabase.from('exam_logs').insert({
          session_id: sessionId || null,
          student_id: currentUser.id,
          action: 'SUBMIT_ANSWERS',
          description: JSON.stringify({
            exam_id: examData.id,
            attempt_id: attempt.id,
            answers: answers
          })
        });
      }
      
      // Báo nộp bài cho Giám thị
      if (sessionId) {
        await supabase.from('room_members').update({ status: 'SUBMITTED', score: totalScore }).eq('session_id', sessionId).eq('student_id', currentUser.id);
        await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: currentUser.id, action: 'SUBMIT', description: `Đã nộp bài, đạt ${totalScore} điểm.` });
      }

      const earnedXP = Math.round(totalScore * 10); 
      if (earnedXP > 0 || currentUser.id) {
        const newXP = (currentUser.xp || 0) + (earnedXP > 0 ? earnedXP : 0);
        const newLevel = Math.floor(newXP / 100) + 1;
        const streakResult = calculateStreakUpdate(currentUser.streak, currentUser.last_active_date);
        
        const { data: updatedUser } = await supabase.from('users').update({ 
          xp: newXP, 
          level: newLevel, 
          streak: streakResult.streak,
          last_active_date: streakResult.lastActiveDate
        }).eq('id', currentUser.id).select('*').single();

        if (updatedUser) setUser(updatedUser);
      }
    }

    setResult({ score: totalScore, correctCount: correctCountMCQ, total: questions.length, timeSpent });
    setIsSubmitting(false);
    setIsLocked(false); 
    setShowRewardModal(true);
    setCurrentIdx(0); 
    clearCache(); 
  };

  const handleAskQuestionAI = async (q: any) => {
    const input = chatInputs[q.id];
    if (!input?.trim() || isAiReplying[q.id]) return;
    const newHistory = [...(chatHistory[q.id] || []), { role: 'user', content: input }];
    setChatHistory(prev => ({ ...prev, [q.id]: newHistory }));
    setChatInputs(prev => ({ ...prev, [q.id]: "" }));
    setIsAiReplying(prev => ({ ...prev, [q.id]: true }));
    try {
      const sysPrompt = `================================================================================
BẠN LÀ FMATH AI TUTOR - GIA SƯ TOÁN LỚP 12 CHUYÊN BIỆT CỦA THPT FPT CẦN THƠ
================================================================================
[THÔNG TIN CÂU HỎI LUYỆN TẬP]
- Đề bài câu hỏi: "${q.content}"
- Đáp án đúng của hệ thống: "${q.correct_answer}"
- Lời giải tham khảo: "${q.explanation || ''}"

[QUY TẮC SƯ PHẠM ĐẠO NGƯỢC & STEP-BY-STEP RÕ RÀNG (REVERSE PEDAGOGY)]
1. TUYỆT ĐỐI KHÔNG giải hộ hay đưa ra kết quả cuối cùng (ví dụ: A, B, C, D) cho học sinh một cách thụ động ngay từ câu trả lời đầu tiên.
2. Trình bày các bước tư duy (Step-by-step) siêu cấu trúc, cực kỳ tường minh. Phân tách rõ ràng từng bước bằng tiêu đề in đậm viết hoa \`### BƯỚC 1: [TÊN BƯỚC]\`, \`### BƯỚC 2: [TÊN BƯỚC]\`...
3. Tại mỗi bước tư duy, trình bày theo khuôn mẫu:
   - **Bản chất ý tưởng**: Giải thích ngắn gọn mục đích thực hiện của bước này.
   - **Công thức áp dụng**: Trình bày rõ ràng công thức toán học dưới dạng LaTeX \`$...$\` hoặc \`$$...$$\`.
   - **Câu hỏi gợi mở trung gian**: Đặt 1 câu hỏi ngắn để yêu cầu học sinh tự tính toán bước phụ trước khi tiết lộ tiếp (Ví dụ: "Đạo hàm f'(x) bằng bao nhiêu nhỉ?", "Hệ số a ở đây âm hay dương?").
4. Chia nhỏ quá trình giải bài thành từng bước nhỏ để học sinh tự hoàn thành. Bạn có thể xem lịch sử tin nhắn để nhớ xem cuộc trò chuyện đang ở bước nào và học sinh đã trả lời gì. Không viết nguyên khối văn bản dài. Dùng danh sách và xuống dòng hợp lý.

[QUY TẮC CHỐNG ẢO GIÁC & GIỚI HẠN PHẠM VI (GUARDRAILS)]
1. PHẠM VI KIẾN THỨC: Chỉ tập trung thảo luận về câu hỏi Toán học đang làm.
2. TỪ CHỐI LỊCH SỰ: Nếu học sinh hỏi các câu hỏi ngoài lề (văn học, xã hội, lập trình, tán gẫu, v.v.), bạn bắt buộc phải trả lời: 
   "Thầy là trợ lý chuyên sâu môn Toán 12 của FMath. Thầy chỉ có thể giúp em tháo gỡ các vấn đề liên quan đến môn Toán học thôi nhé. Hãy quay lại chủ đề bài học nào!"
3. TUYỆT ĐỐI KHÔNG được bịa công thức hay các định lý giả tưởng.
4. ĐỊNH DẠNG TOÁN HỌC: Mọi công thức Toán học bắt buộc bọc trong $...$ hoặc $$...$$.

[TÔNG GIỌNG & PHONG CÁCH]
- Sử dụng xưng hô: "Thầy" - "Em".
- Ngắn gọn, đi thẳng vào vấn đề cốt lõi của câu hỏi.
================================================================================`;

      const aiReply = await askGroqAI(sysPrompt, input, false, newHistory);
      setChatHistory(prev => ({ ...prev, [q.id]: [...(prev[q.id] || []), { role: 'ai', content: aiReply }] }));
    } catch (error) {
      setChatHistory(prev => ({ ...prev, [q.id]: [...(prev[q.id] || []), { role: 'ai', content: "Xin lỗi em, đường truyền mạng đang chậm. Hỏi lại sau nhé!" }] }));
    } finally {
      setIsAiReplying(prev => ({ ...prev, [q.id]: false }));
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2,'0');
    const s = (sec % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  };

  const MarkdownComponents = {
    img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded border border-[#dee2e6] my-4 mx-auto block shadow-sm" alt={props.alt || "Ảnh"} loading="lazy" />,
    table: ({ node, ...props }: any) => <div className="w-full overflow-x-auto my-6 rounded-lg border border-[#dee2e6] shadow-sm bg-white"><table className="w-full text-center border-collapse text-[14px]" {...props} /></div>,
    thead: ({ node, ...props }: any) => <thead className="bg-[#f8f9fa] border-b-2 border-[#dee2e6] text-[#212529]" {...props} />,
    tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-[#dee2e6]" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="transition-colors hover:bg-[#f8f9fa]/50" {...props} />,
    th: ({ node, ...props }: any) => <th className="p-3 border-r border-[#dee2e6] last:border-r-0 font-bold whitespace-nowrap align-middle" {...props} />,
    td: ({ node, ...props }: any) => <td className="p-3 border-r border-[#dee2e6] last:border-r-0 align-middle first:font-bold first:bg-[#f8f9fa] first:border-r-2" {...props} />,
  };

  const partMCQ = questions.map((q, i) => ({ q, i })).filter(item => getQuestionType(item.q) === 'mcq');
  const partTF = questions.map((q, i) => ({ q, i })).filter(item => getQuestionType(item.q) === 'tf');
  const partSAQ = questions.map((q, i) => ({ q, i })).filter(item => getQuestionType(item.q) === 'saq');

  const renderNavButton = (fq: any, globalIndex: number) => {
    const done = isQuestionAnswered(fq);
    const active = currentIdx === globalIndex;
    let btnClass = "bg-[#f8f9fa] text-[#495057] border-[#dee2e6] hover:bg-[#e9ecef]";
    
    if (result) {
      let isFullyCorrect = false;
      const fqType = getQuestionType(fq);
      const userAns = answers[fq.id];
      if (fqType === 'tf') {
        let cCount = 0;
        const parsedCorrect = parseTFAnswer(fq.correct_answer);
        fq.options?.forEach((o:any, idx: number) => { 
          const optId = String(o.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
          if(userAns?.[optId] === parsedCorrect[optId]) cCount++; 
        });
        isFullyCorrect = cCount === (fq.options?.length || 4); 
      } else if (fqType === 'saq') {
        isFullyCorrect = isSaqCorrect(userAns, fq.correct_answer);
      } else {
        isFullyCorrect = isMcqCorrect(userAns, fq.correct_answer);
      }
      if (isFullyCorrect) btnClass = "bg-[#198754] text-white border-[#198754]";
      else if (done) btnClass = "bg-[#dc3545] text-white border-[#dc3545]";
      else btnClass = "bg-white text-[#adb5bd] border-[#dee2e6] opacity-60";
      if (active) btnClass += " ring-2 ring-primary ring-offset-2";
    } else if (active) {
      btnClass = "bg-primary text-white border-primary shadow-sm";
    } else if (done) {
      btnClass = "bg-[#e7f1ff] text-primary border-[#b6d4fe]";
    }

    return (
      <button 
        key={fq.id} 
        onClick={() => setCurrentIdx(globalIndex)} 
        className={`relative w-full h-10 flex items-center justify-center rounded-lg border font-bold text-[13px] font-ui transition-all outline-none ${btnClass}`}
      >
        {globalIndex + 1}
      </button>
    );
  };

  // ==========================================
  // RENDER UI 
  // ==========================================
  if (isPreparing) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fa] text-[#6c757d]">
      <Loader2 size={40} className="animate-spin mb-4 text-primary" />
      <p className="font-medium text-[15px]">Đang thiết lập phòng thi bảo mật...</p>
    </div>
  );
  
  if (error || !examData || questions.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fa] text-[#6c757d] p-8">
      <div className="bg-white p-8 rounded-2xl border border-[#dee2e6] text-center max-w-md w-full shadow-sm">
        <h3 className="text-xl font-bold text-[#212529] mb-2">Lỗi tải đề thi</h3>
        <p className="text-[14px] mb-6">{error || "Đề thi trống hoặc bạn chưa đăng nhập."}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full">Về trang chủ</button>
      </div>
    </div>
  );

  if (isLocked && !result) return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#f8d7da] text-[#842029] p-4 text-center">
      <AlertTriangle size={80} className="mb-6 text-[#dc3545] animate-pulse" />
      <h1 className="text-4xl font-black mb-4 uppercase">Bài thi đã bị khóa</h1>
      <p className="text-lg font-medium max-w-lg mb-8">
        Bạn đã vi phạm quy chế hoặc bị Giám thị ép thu bài. Bài làm của bạn đã được hệ thống tự động nộp.
      </p>
      {isSubmitting ? <Loader2 size={32} className="animate-spin text-[#dc3545]" /> : <button onClick={() => navigate('/dashboard')} className="btn-primary bg-[#dc3545] border-[#dc3545] hover:bg-[#b02a37] px-8 py-3">Trở về trang chủ</button>}
    </div>
  );

  const q = questions[currentIdx];
  const qType = getQuestionType(q);
  let typeLabel = qType === 'tf' ? "Đúng/Sai" : qType === 'saq' ? "Trả lời ngắn" : "Trắc nghiệm";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col lg:flex-row gap-0 lg:gap-6 w-full p-0 lg:p-6 bg-[#f8f9fa] overflow-hidden animate-in fade-in">
      <div className="flex-1 flex flex-col bg-white border border-[#dee2e6] lg:rounded-2xl shadow-sm h-full overflow-hidden relative">
        {!isOnline && !result && (
          <div className="absolute top-0 left-0 right-0 bg-[#dc3545] text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold z-10 animate-in slide-in-from-top-4">
            <WifiOff size={16} /> MẤT KẾT NỐI MẠNG! (Đáp án vẫn được lưu tạm, vui lòng không tắt tab)
          </div>
        )}

        <div className={`flex items-center justify-between px-5 md:px-8 py-4 border-b border-[#dee2e6] bg-[#f8f9fa] shrink-0 ${!isOnline && !result ? 'pt-12' : ''}`}>
          <div className="min-w-0 pr-4">
            <div className="text-primary font-bold text-[11px] uppercase tracking-wider mb-1 font-ui">
              {examData.type || 'Luyện tập'} {isHighStakes && " • (Kỳ thi được giám sát)"}
            </div>
            <h2 className="text-[16px] font-bold text-[#212529] truncate font-heading m-0">{examData.title}</h2>
          </div>
          <div className="flex gap-2 shrink-0">
            <button disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i-1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#dee2e6] bg-white hover:bg-[#e9ecef] text-[#495057] disabled:opacity-50 transition-colors shadow-sm"><ArrowLeft size={18}/></button>
            <button disabled={currentIdx === questions.length-1} onClick={() => setCurrentIdx(i => i+1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#dee2e6] bg-white hover:bg-[#e9ecef] text-[#495057] disabled:opacity-50 transition-colors shadow-sm"><ArrowRight size={18}/></button>
          </div>
        </div>

        <div ref={questionBodyRef} className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 bg-white">
          <div className="max-w-4xl mx-auto">
            {result && currentIdx === 0 && (
              <div className="mb-8 bg-white border border-[#dee2e6] rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-top-4">
                <div className="bg-[#e7f1ff] p-5 border-b border-[#b6d4fe] flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-primary"><BrainCircuit size={24} /></div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#084298] mb-1 font-heading">FMath AI Đánh giá</h3>
                    <div className="prose prose-sm max-w-none text-[#052c65] font-medium leading-relaxed m-0"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{aiReview || "Đang phân tích bài làm..."}</ReactMarkdown></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#dee2e6] bg-[#f8f9fa] text-center">
                  <div className="p-4"><div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-1">Điểm số</div><div className="text-2xl font-black text-primary font-ui">{result.score}/{maxScore}</div></div>
                  <div className="p-4"><div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-1">Thời gian</div><div className="text-2xl font-black text-[#212529] font-ui">{Math.floor(result.timeSpent / 60)}p {result.timeSpent % 60}s</div></div>
                  <div className="p-4"><div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-1">Câu đúng</div><div className="text-2xl font-black text-[#198754] font-ui">{result.correctCount}/{result.total}</div></div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-[#e9ecef]">
              <span className="bg-primary text-white text-[13px] font-bold px-3 py-1.5 rounded-md font-ui shadow-sm">Câu {currentIdx + 1}</span>
              <span className="bg-[#f8f9fa] border border-[#dee2e6] text-[#6c757d] text-[12px] font-bold px-3 py-1.5 rounded-md font-ui uppercase">{q.level || 'Nhận biết'}</span>
              <span className="bg-[#fff3cd] text-[#664d03] text-[12px] font-bold px-3 py-1.5 rounded-md font-ui ml-auto">{typeLabel}</span>
            </div>

            <div className="prose prose-base max-w-none text-[#212529] mb-8 font-medium leading-[2.2] overflow-x-auto [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-2">
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{q.content || ''}</ReactMarkdown>
            </div>

            <div className="mb-8">
              {qType === 'mcq' && q.options && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt:any, idx: number) => {
                    const optId = String(opt.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
                    const displayId = String(opt.id || ['A', 'B', 'C', 'D'][idx] || idx).toUpperCase().trim();
                    const isSelected = String(answers[q.id] || '').toLowerCase().trim() === optId;
                    const isCorrect = isMcqCorrect(optId, q.correct_answer);
                    
                    let boxClass = "border-[#dee2e6] bg-white hover:border-primary cursor-pointer shadow-sm";
                    let letterClass = "bg-[#f8f9fa] border-r border-[#dee2e6] text-[#6c757d]";
                    let textClass = "text-[#495057]";

                    if (result) {
                      if (isCorrect) { boxClass = "border-[#198754] bg-[#d1e7dd] ring-1 ring-[#198754]"; letterClass = "bg-[#198754] text-white border-r-0"; textClass = "text-[#0f5132] font-semibold"; } 
                      else if (isSelected && !isCorrect) { boxClass = "border-[#dc3545] bg-[#f8d7da] ring-1 ring-[#dc3545]"; letterClass = "bg-[#dc3545] text-white border-r-0"; textClass = "text-[#842029] font-semibold"; } 
                      else { boxClass = "opacity-60 border-[#dee2e6] bg-white cursor-default shadow-none"; }
                    } else if (isSelected) {
                      boxClass = "border-primary bg-[#e7f1ff] ring-1 ring-primary shadow-sm"; letterClass = "bg-primary text-white border-r-0"; textClass = "text-[#084298] font-semibold";
                    }

                    return (
                      <div key={optId} onClick={() => handleAnswerMCQ(q.id, optId)} className={`w-full flex items-stretch rounded-xl border overflow-hidden transition-all ${boxClass}`}>
                        <div className={`w-12 shrink-0 flex items-center justify-center font-bold text-[15px] font-ui transition-colors ${letterClass}`}>{displayId}</div>
                        <div className={`flex-1 p-3.5 prose prose-sm max-w-none overflow-x-auto leading-relaxed m-0 flex items-center ${textClass}`}><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown></div>
                      </div>
                    );
                  })}
                </div>
              )}

              {qType === 'tf' && q.options && (
                <div className="flex flex-col gap-4">
                  {q.options.map((opt:any, idx: number) => {
                    const rawOptId = opt.id || ['a', 'b', 'c', 'd'][idx] || String(idx);
                    const optId = String(rawOptId).toLowerCase().trim();
                    const userVal = answers[q.id]?.[optId];
                    const isCorrectVal = parseTFAnswer(q.correct_answer)[optId];
                    const isUserCorrect = userVal === isCorrectVal;
                    
                    return (
                      <div key={optId} className={`rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 transition-colors ${result ? (isUserCorrect ? 'border-[#198754] bg-[#d1e7dd]' : 'border-[#dc3545] bg-[#f8d7da]') : 'border-[#dee2e6] bg-white hover:border-primary'}`}>
                        <div className="flex items-start gap-4 flex-1 overflow-x-auto">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-[#f8f9fa] border border-[#dee2e6] flex items-center justify-center font-bold text-[14px] font-ui text-[#6c757d]">{rawOptId}</div>
                          <div className="prose prose-sm max-w-none m-0 pt-1 leading-[1.8] text-[#212529]"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown></div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center bg-[#f8f9fa] p-1.5 rounded-lg border border-[#e9ecef]">
                          <button disabled={result} onClick={() => handleAnswerTF(q.id, optId, true)} className={`px-5 py-2 rounded font-semibold text-[13px] transition-colors ${userVal === true ? 'bg-primary text-white shadow-sm' : 'text-[#6c757d] hover:bg-[#e9ecef]'}`}>Đúng</button>
                          <button disabled={result} onClick={() => handleAnswerTF(q.id, optId, false)} className={`px-5 py-2 rounded font-semibold text-[13px] transition-colors ${userVal === false ? 'bg-[#dc3545] text-white shadow-sm' : 'text-[#6c757d] hover:bg-[#e9ecef]'}`}>Sai</button>
                        </div>
                        {result && <div className="shrink-0 flex items-center">{isUserCorrect ? <CheckCircle2 className="text-[#198754]" size={24}/> : <XCircle className="text-[#dc3545]" size={24}/>}{!isUserCorrect && <div className="text-[12px] font-bold text-[#dc3545] bg-white border border-[#f5c2c7] px-2 py-1 rounded ml-2 shadow-sm">Đ.án: {isCorrectVal ? 'Đúng' : 'Sai'}</div>}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {qType === 'saq' && (
                <div className="bg-[#f8f9fa] p-6 rounded-2xl border border-[#dee2e6] shadow-sm">
                  <label className="text-[13px] font-bold text-[#6c757d] mb-3 block uppercase tracking-wider">Nhập đáp án của bạn:</label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <input 
                      type="text" value={answers[q.id] || ""} onChange={(e) => handleAnswerSAQ(q.id, e.target.value)} disabled={result} 
                      className={`w-full max-w-sm px-5 py-3.5 rounded-xl border font-bold text-[18px] outline-none transition-colors shadow-inner ${result ? (isSaqCorrect(answers[q.id], q.correct_answer) ? 'bg-[#d1e7dd] text-[#0f5132] border-[#198754]' : 'bg-[#f8d7da] text-[#842029] border-[#dc3545]') : 'bg-white border-[#dee2e6] focus:border-primary text-[#212529]'}`} 
                      placeholder="Nhập số thập phân dùng dấu chấm (.)"
                    />
                    {result && !isSaqCorrect(answers[q.id], q.correct_answer) && (
                      <div className="px-4 py-3 bg-white border border-[#dee2e6] rounded-xl flex flex-col justify-center shadow-sm shrink-0 min-w-[120px]">
                        <span className="text-[11px] font-bold text-[#6c757d] mb-1 uppercase tracking-wider">Đáp án đúng:</span><span className="font-black text-[18px] text-[#198754] leading-none">{q.correct_answer}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {result && (q.explanation || true) && (
              <div className="mt-10 bg-white border border-[#dee2e6] rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-4">
                <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-4 bg-[#f8f9fa] border-b border-[#dee2e6]">
                  <div className="flex items-center gap-2 text-[#212529] font-bold text-[15px] uppercase font-heading tracking-wider"><BookOpen size={18} className="text-primary" /> Lời Giải Chi Tiết</div>
                  <button onClick={() => setOpenChatId(openChatId === q.id ? null : q.id)} className={`px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 transition-colors border shadow-sm ${openChatId === q.id ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-[#dee2e6] hover:bg-[#e7f1ff] hover:border-[#b6d4fe]'}`}><MessageSquare size={14} /> {openChatId === q.id ? 'Đóng AI Chat' : 'Hỏi AI câu này'}</button>
                </div>
                
                <div className="p-6 prose prose-sm max-w-none text-[#495057] leading-[2] overflow-x-auto [&_.katex-display]:my-4">
                  {q.explanation ? <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{q.explanation}</ReactMarkdown> : <div className="text-center text-[#adb5bd] italic py-4">Câu hỏi này chưa có lời giải chi tiết. Hãy dùng tính năng "Hỏi AI" bên trên nhé!</div>}
                </div>

                {openChatId === q.id && (
                  <div className="border-t border-[#dee2e6] bg-[#f8f9fa] p-5 animate-in slide-in-from-top-2">
                    <div className="space-y-4 mb-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                      {(!chatHistory[q.id] || chatHistory[q.id].length === 0) ? (
                        <div className="text-center py-8"><BrainCircuit size={40} className="mx-auto text-[#adb5bd] mb-3" /><div className="text-[#6c757d] text-[14px] font-medium">Bạn chưa hiểu bước nào? Hãy hỏi FMath AI nhé!</div></div>
                      ) : (
                        chatHistory[q.id].map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'ai' && <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-[#dee2e6] flex items-center justify-center text-primary mr-2 shadow-sm"><BrainCircuit size={16} /></div>}
                            <div className={`max-w-[85%] rounded-2xl p-4 text-[14px] leading-[1.8] shadow-sm ${msg.role === 'user' ? 'bg-primary text-white font-medium rounded-tr-sm' : 'bg-white text-[#212529] border border-[#dee2e6] rounded-tl-sm'}`}>
                              {msg.role === 'user' ? msg.content : <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 [&_.katex-display]:my-2"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{msg.content}</ReactMarkdown></div>}
                            </div>
                          </div>
                        ))
                      )}
                      {isAiReplying[q.id] && (
                        <div className="flex justify-start items-center mt-2">
                          <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-[#dee2e6] flex items-center justify-center text-[#adb5bd] mr-2 shadow-sm"><BrainCircuit size={16} /></div>
                          <div className="bg-white border border-[#dee2e6] p-3.5 rounded-2xl rounded-tl-sm text-[#adb5bd] flex items-center shadow-sm"><Loader2 size={18} className="animate-spin" /></div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-end gap-2 bg-white border border-[#dee2e6] rounded-xl p-1.5 shadow-sm focus-within:border-primary transition-colors">
                      <textarea rows={1} value={chatInputs[q.id] || ""} onChange={(e) => setChatInputs(prev => ({...prev, [q.id]: e.target.value}))} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskQuestionAI(q); } }} placeholder="Nhập thắc mắc của bạn tại đây..." className="flex-1 bg-transparent px-3 py-2.5 outline-none text-[14px] text-[#212529] resize-none max-h-24 custom-scrollbar" disabled={isAiReplying[q.id]} />
                      <button onClick={() => handleAskQuestionAI(q)} disabled={isAiReplying[q.id] || !chatInputs[q.id]?.trim()} className="bg-primary hover:bg-[#0b5ed7] text-white p-3 rounded-lg transition-colors disabled:opacity-50 shrink-0 mb-0.5 mr-0.5"><Send size={18} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[340px] flex flex-col gap-0 lg:gap-6 shrink-0 h-auto lg:h-full bg-white lg:bg-transparent border-t lg:border-t-0 border-[#dee2e6]">
        <div className={`lg:bg-white lg:border p-4 lg:p-6 lg:rounded-2xl flex flex-row lg:flex-col items-center justify-between lg:justify-center shadow-none lg:shadow-sm shrink-0 border-b lg:border-b-0 ${result ? 'lg:border-[#b6d4fe] lg:bg-[#e7f1ff]' : 'border-[#dee2e6]'}`}>
          {result ? (
            <>
              <div className="text-[12px] font-bold text-[#052c65] uppercase tracking-wider mb-0 lg:mb-2 font-ui">Điểm của bạn</div>
              <div className="text-[36px] lg:text-[48px] font-black text-primary font-ui leading-none">{result.score} <span className="text-[16px] lg:text-[20px] text-[#6ea8fe]">/{maxScore}</span></div>
            </>
          ) : (
            <>
              <div className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider flex items-center gap-2 font-ui mb-0 lg:mb-2"><Clock size={16}/> Thời gian còn lại</div>
              <div className={`text-[36px] lg:text-[48px] font-black font-ui tabular-nums leading-none tracking-tight ${timeLeft < 60 ? 'text-[#dc3545] animate-pulse' : 'text-[#212529]'}`}>{formatTime(timeLeft)}</div>
            </>
          )}
        </div>

        <div className="lg:bg-white lg:border lg:border-[#dee2e6] p-4 lg:p-6 lg:rounded-2xl lg:shadow-sm flex-1 flex flex-col min-h-[30vh] lg:min-h-0 overflow-hidden">
          <div className="font-bold text-[#212529] uppercase text-[14px] mb-4 lg:mb-5 tracking-wider flex items-center gap-2 font-heading"><LayoutGrid size={18}/> Bảng điều khiển</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 space-y-6">
            {partMCQ.length > 0 && <div><div className="text-[12px] font-bold text-[#6c757d] mb-3 uppercase tracking-wide">Phần I: Trắc nghiệm</div><div className="grid grid-cols-5 gap-2 md:gap-2.5">{partMCQ.map(item => renderNavButton(item.q, item.i))}</div></div>}
            {partTF.length > 0 && <div><div className="text-[12px] font-bold text-[#6c757d] mb-3 uppercase tracking-wide">Phần II: Đúng/Sai</div><div className="grid grid-cols-5 gap-2 md:gap-2.5">{partTF.map(item => renderNavButton(item.q, item.i))}</div></div>}
            {partSAQ.length > 0 && <div><div className="text-[12px] font-bold text-[#6c757d] mb-3 uppercase tracking-wide">Phần III: Trả lời ngắn</div><div className="grid grid-cols-5 gap-2 md:gap-2.5">{partSAQ.map(item => renderNavButton(item.q, item.i))}</div></div>}
          </div>

          <div className="pt-4 lg:pt-5 border-t border-[#e9ecef] mt-2 shrink-0">
            {!result ? (
              <button disabled={isSubmitting} onClick={() => handleSubmit(false)} className="btn-primary w-full py-3.5 text-[15px]">
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <CheckSquare size={20}/>} NỘP BÀI THI
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-3 bg-[#212529] hover:bg-[#495057] border-none text-[14px]"><ChevronLeft size={18}/> Về trang chủ</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRewardModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in px-4">
          <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-bs-hover border border-[#dee2e6] scale-in-center">
            <Trophy size={64} className="mx-auto text-[#ffc107] mb-4" />
            <h2 className="text-2xl font-bold font-heading text-[#212529] mb-2">Nộp bài thành công!</h2>
            <p className="text-[#6c757d] mb-6 font-medium text-[15px]">Kết quả của bạn là <strong className="text-primary text-[18px]">{result?.score}/{maxScore}</strong>.</p>
            {result?.score > 0 ? (
              <div className="flex justify-center gap-4 mb-8">
                <div className="flex-1 bg-[#fff3cd] p-4 rounded-xl border border-[#ffecb5]"><Flame size={28} className="mx-auto text-[#ffc107] mb-2" /><div className="text-[20px] font-black text-[#664d03] font-ui">+{Math.round(result.score * 10)}</div><div className="text-[11px] font-bold text-[#997404] uppercase mt-1">XP</div></div>
                <div className="flex-1 bg-[#e7f1ff] p-4 rounded-xl border border-[#b6d4fe]"><Calendar size={28} className="mx-auto text-primary mb-2" /><div className="text-[20px] font-black text-[#052c65] font-ui">+1</div><div className="text-[11px] font-bold text-[#084298] uppercase mt-1">Chuỗi</div></div>
              </div>
            ) : (
              <div className="mb-8 p-4 bg-[#f8d7da] border border-[#f5c2c7] rounded-xl text-[#842029] text-[14px] font-medium">Hãy xem lại giải thích chi tiết nhé!</div>
            )}
            <button onClick={() => setShowRewardModal(false)} className="btn-primary w-full py-3 text-[15px]">XEM ĐÁP ÁN CHI TIẾT</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTaking;