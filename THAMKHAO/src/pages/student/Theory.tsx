import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  BookOpen, FileText, ChevronRight, CheckCircle2, PlayCircle, BookA, Target, 
  BrainCircuit, XCircle, Loader2, Flame, Trophy, Menu, X, ArrowRight, Check, Send, 
  Sparkles, User, Lightbulb, ChevronDown, MessageCircle, Layers, Search, Filter,
  Maximize2, Minimize2, ZoomIn, ZoomOut, Bookmark, Share2, HelpCircle, FileCheck,
  Clock, Zap, Award, Sun, Moon, Compass, BarChart2, RefreshCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { useAppStore } from '../../store/useAppStore';
import { courseService } from '../../services/courseService';
import { supabase } from '../../config/supabase';
import { askGroqAI } from '../../services/groqAI';
import { calculateStreakUpdate } from '../../utils/streakUtils';

const suggestedPrompts = [
  { label: '📝 Tóm tắt lý thuyết bài này', prompt: 'Thầy hãy tóm tắt ngắn gọn lý thuyết cốt lõi và các công thức của bài học này giúp em nhé.' },
  { label: '💡 Công thức hay dùng nhất', prompt: 'Những công thức nào là quan trọng nhất và hay dùng nhất trong chuyên đề này hả thầy?' },
  { label: '🔥 Mẹo giải nhanh trắc nghiệm', prompt: 'Bài học này có mẹo tính nhanh hoặc mẹo giải trắc nghiệm bằng máy tính cầm tay Casio không thầy?' },
  { label: '📚 Các dạng bài tập phổ biến', prompt: 'Chuyên đề này thường xuất hiện những dạng bài tập kiểm tra nào ạ?' }
];

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
  Object.keys(parsed).forEach(k => {
    normalized[String(k).toLowerCase().trim()] = parsed[k];
  });
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

const Theory = () => {
  const { currentUser, setUser } = useAppStore();
  const [chapters, setChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States Lựa chọn
  const [selectedChapterId, setSelectedChapterId] = useState<number | string>("all");
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'theory' | 'practice'>('theory');

  // New Design UI States
  const [searchQuery, setSearchQuery] = useState<string>(''); 
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal'); 
  const [readingTheme, setReadingTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // State Bài tập & Reward
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [showRewardModal, setShowRewardModal] = useState(false);

  // --- TRỢ GIẢNG AI (POPUP MODAL) ---
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<{role: string, content: string}[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null); 
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  // --- BÔI ĐEN HỎI AI ---
  const [selectedText, setSelectedText] = useState("");
  const [selectionPos, setSelectionPos] = useState<{ top: number, left: number } | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      setIsLoading(true);
      const data = await courseService.getCurriculum(currentUser.id);
      setChapters(data);
      if (data.length > 0) {
        setSelectedChapterId("all");
        if (data[0].lessons?.length > 0) handleSelectLesson(data[0].lessons[0]);
      }
      setIsLoading(false);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };
    fetchCourse();
  }, [currentUser.id]);

  // Cuộn tin nhắn AI
  useEffect(() => { if (chatEndRef.current && isAiChatOpen) chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [aiChatHistory, isAiTyping, isAiChatOpen]);

  // Bôi đen văn bản hỏi AI
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectedText(selection.toString().trim());
      setSelectionPos({
        top: rect.top - 40,
        left: rect.left + rect.width / 2
      });
    } else {
      setSelectionPos(null);
      setSelectedText("");
    }
  };

  const handleAskSelectedText = () => {
    setIsAiChatOpen(true);
    setAiInput(`Thầy giải thích giúp em đoạn văn bản này với ạ:\n"${selectedText}"\n`);
    setSelectionPos(null);
    setSelectedText("");
    setTimeout(() => aiInputRef.current?.focus(), 100);
  };

  const handleSelectLesson = async (lesson: any) => {
    setActiveLesson(lesson);
    setActiveTab('theory'); 
    setAnswers({});
    setSubmittedQuestions({});
    setCurrentExIndex(0);
    setSelectionPos(null); 
    
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;

    // AI Chào mừng
    setAiChatHistory([]);
    setIsAiTyping(true); 
    try {
      const sysPrompt = `================================================================================
BẠN LÀ FMATH AI TUTOR - GIA SƯ TOÁN LỚP 12 CHUYÊN BIỆT CỦA THPT FPT CẦN THƠ
================================================================================
[THÔNG TIN BỐ CẢNH]
- Học sinh đang tham gia lớp học: ${currentUser.name}
- Bài học vừa mở: "${lesson.title}"

[NHIỆM VỤ CHÀO MỪNG]
1. Viết đúng 1 câu chào ngắn gọn, khích lệ tinh thần học tập của học sinh.
2. Viết đúng 1 câu tóm tắt trọng tâm cốt lõi của bài học "${lesson.title}" một cách trực quan, dễ nhớ nhất.
3. Bọc công thức toán học trong ký tự $...$ hoặc $$...$$.
4. Tổng dung lượng câu trả lời KHÔNG quá 3 câu ngắn.
================================================================================`;
      
      const greeting = await askGroqAI(sysPrompt, `Hãy chào và tóm tắt nhanh bài học "${lesson.title}".`);
      setAiChatHistory([{ role: 'ai', content: greeting }]);
    } catch (e) {
      setAiChatHistory([{ role: 'ai', content: `Chào ${currentUser.name}, thầy là FMath AI. Đọc lý thuyết có chỗ nào không hiểu thì cứ bôi đen rồi hỏi thầy nhé!` }]);
    } finally { setIsAiTyping(false); }
  };

  const handleSendAiMessage = async (customMsg?: string) => {
    const userMsg = customMsg || aiInput;
    if (!userMsg.trim() || isAiTyping) return;
    setAiInput(""); 
    setAiChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); 
    setIsAiTyping(true);

    try {
      const sysPrompt = `================================================================================
BẠN LÀ FMATH AI TUTOR - GIA SƯ TOÁN LỚP 12 CHUYÊN BIỆT CỦA THPT FPT CẦN THƠ
================================================================================
[THÔNG TIN BỐ CẢNH]
- Học sinh đang nhắn tin: ${currentUser.name}
- Chuyên đề bài học hiện tại: "${activeLesson?.title || ''}"

[QUY TẮC SƯ PHẠM GIẢNG GIẢI CHI TIẾT & TRỰC TIẾP]
1. Hãy giảng bài trực tiếp và giải đáp chi tiết, đầy đủ toàn bộ thắc mắc của học sinh ngay lập tức. KHÔNG hỏi từng bước, KHÔNG bắt học sinh trả lời từng câu hỏi nhỏ vì hệ thống chat không lưu giữ ngữ cảnh câu hỏi tốt.
2. Trình bày các bước giải quyết bài toán hoặc bài học một cách rõ ràng, mạch lạc, dễ hiểu. Phân tách các bước bằng tiêu đề in đậm.
3. Khi giải thích công thức hoặc lý thuyết, hãy giải thích cặn kẽ bản chất ý tưởng, cách ghi nhớ, và các lỗi sai thường gặp của học sinh.
4. Đưa ra ví dụ minh họa đi kèm lời giải chi tiết và đáp số cụ thể để học sinh nắm bắt dễ dàng.

[QUY TẮC CHỐNG ẢO GIÁC & GIỚI HẠN PHẠM VI (GUARDRAILS)]
1. PHẠM VI KIẾN THỨC: Chỉ trả lời các câu hỏi liên quan đến chương trình Toán học lớp 12 THPTQG.
2. TỪ CHỐI LỊCH SỰ: Nếu học sinh hỏi về các chủ đề ngoài lề (văn học, lập trình, xã hội, tán gẫu, tiếng Anh, v.v.), bạn bắt buộc phải trả lời: 
   "Thầy là trợ lý chuyên sâu môn Toán 12 của FMath. Thầy chỉ có thể giúp em tháo gỡ các vấn đề liên quan đến môn Toán học thôi nhé. Hãy quay lại chủ đề bài học nào!"
3. TUYỆT ĐỐI KHÔNG bịa định lý, tính chất hoặc công thức toán học không có thật. Nếu không biết hoặc thông tin thiếu, hãy yêu cầu học sinh cung cấp thêm đề bài chính xác.
4. ĐỊNH DẠNG TOÁN HỌC: Mọi biểu thức, biến số, công thức toán học bắt buộc phải được bọc trong $...$ (nếu viết cùng dòng) hoặc $$...$$ (nếu xuống dòng độc lập) để hiển thị LaTeX chuẩn.

[TÔNG GIỌNG & PHONG CÁCH]
- Sử dụng xưng hô: "Thầy" - "Em".
- Ngắn gọn, súc tích, dễ hiểu đối với học sinh trung bình hoặc mất gốc.
- Luôn khích lệ tinh thần tự học, khen ngợi khi học sinh đi đúng hướng.
================================================================================`;

      const aiReply = await askGroqAI(sysPrompt, userMsg);
      setAiChatHistory(prev => [...prev, { role: 'ai', content: aiReply }]);
    } catch (e) {
      setAiChatHistory(prev => [...prev, { role: 'ai', content: "Xin lỗi em, đường truyền mạng đang chậm. Em đợi một chút rồi hỏi lại thầy nhé!" }]);
    } finally { setIsAiTyping(false); }
  };

  const currentExercise = activeLesson?.exercises?.[currentExIndex];
  const qType = getQuestionType(currentExercise);

  const handleAnswerMCQ = (optionId: string) => {
    if (submittedQuestions[currentExercise.id]) return;
    setAnswers(prev => ({ ...prev, [currentExercise.id]: String(optionId).toLowerCase().trim() }));
  };

  const handleAnswerTF = (subId: string, value: boolean) => {
    if (submittedQuestions[currentExercise.id]) return;
    const normSubId = String(subId).toLowerCase().trim();
    setAnswers(prev => ({ ...prev, [currentExercise.id]: { ...(prev[currentExercise.id] || {}), [normSubId]: value } }));
  };

  const handleAnswerSAQ = (value: string) => {
    if (submittedQuestions[currentExercise.id]) return;
    setAnswers(prev => ({ ...prev, [currentExercise.id]: value }));
  };

  const handleCheckAnswer = async () => {
    const qId = currentExercise.id;
    const userAns = answers[qId];
    if (userAns == null || submittedQuestions[qId]) return;

    setSubmittedQuestions(prev => ({ ...prev, [qId]: true }));
    let isCorrect = false;
    
    if (qType === 'tf') {
      let correctCount = 0;
      const parsedCorrect = parseTFAnswer(currentExercise.correct_answer);
      currentExercise.options?.forEach((opt: any, idx: number) => {
        const optId = String(opt.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
        if (userAns[optId] === parsedCorrect[optId]) correctCount++;
      });
      isCorrect = correctCount === (currentExercise.options?.length || 4);
    } 
    else if (qType === 'saq') {
      isCorrect = isSaqCorrect(userAns, currentExercise.correct_answer);
    } 
    else {
      isCorrect = isMcqCorrect(userAns, currentExercise.correct_answer);
    }

    if (isCorrect && !activeLesson.isCompleted && currentUser.id) {
        const newXP = (currentUser.xp || 0) + 10;
        const newLevel = Math.floor(newXP / 100) + 1;
        supabase.from('users').update({ xp: newXP, level: newLevel }).eq('id', currentUser.id).select().single().then(({data}) => { if(data) setUser(data); });
    }
  };

  const handleNextQuestion = () => { if (currentExIndex < activeLesson.exercises.length - 1) setCurrentExIndex(prev => prev + 1); };

  const handleCompleteLesson = async () => {
    if (!currentUser?.id || activeLesson.isCompleted) return;
    courseService.markLessonCompleted(currentUser.id, activeLesson.id);
    
    const newXP = (currentUser.xp || 0) + 50;
    const newLevel = Math.floor(newXP / 100) + 1;
    const streakResult = calculateStreakUpdate(currentUser.streak, currentUser.last_active_date);

    supabase.from('users').update({ 
      xp: newXP, 
      level: newLevel, 
      streak: streakResult.streak,
      last_active_date: streakResult.lastActiveDate 
    }).eq('id', currentUser.id).select().single().then(({data}) => { if(data) setUser(data); });

    setChapters(prevChaps => prevChaps.map(c => ({...c, lessons: c.lessons.map((l: any) => l.id === activeLesson.id ? { ...l, isCompleted: true } : l)})));
    setActiveLesson((prev: any) => ({ ...prev, isCompleted: true }));
    setShowRewardModal(true);
  };

  const MarkdownComponents = {
    img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded-xl border border-[#dee2e6] my-6 mx-auto block shadow-sm" alt={props.alt || "Ảnh minh họa"} loading="lazy" />,
    a: ({ node, ...props }: any) => <a {...props} className="text-primary hover:text-[#0b5ed7] hover:underline font-medium" target="_blank" rel="noopener noreferrer" />
  };

  const renderedTheoryContent = useMemo(() => {
    if (!activeLesson) return null;
    return <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{activeLesson.theory_content || "Nội dung bài giảng đang được cập nhật..."}</ReactMarkdown>;
  }, [activeLesson?.theory_content]);

  const renderedPracticeContent = useMemo(() => {
    if (!currentExercise) return null;
    return <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{currentExercise.content}</ReactMarkdown>;
  }, [currentExercise?.content]);

  // Tính tổng tiến độ hoàn thành khóa học
  const courseStats = useMemo(() => {
    let totalLessons = 0;
    let completedLessons = 0;
    chapters.forEach(c => {
      c.lessons?.forEach((l: any) => {
        totalLessons++;
        if (l.isCompleted) completedLessons++;
      });
    });
    const percent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    return { totalLessons, completedLessons, percent };
  }, [chapters]);

  // Lọc danh sách chương & bài học theo từ khóa tìm kiếm
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) {
      if (selectedChapterId === 'all') return chapters;
      return chapters.filter(c => String(c.id) === String(selectedChapterId));
    }
    const query = searchQuery.toLowerCase().trim();
    return chapters.map(c => {
      const matchLessons = c.lessons?.filter((l: any) => l.title.toLowerCase().includes(query));
      if (c.title.toLowerCase().includes(query) || (matchLessons && matchLessons.length > 0)) {
        return { ...c, lessons: matchLessons && matchLessons.length > 0 ? matchLessons : c.lessons };
      }
      return null;
    }).filter(Boolean);
  }, [chapters, selectedChapterId, searchQuery]);

  // Tìm thông tin Chương của bài học hiện tại (cho Breadcrumb)
  const currentChapterInfo = useMemo(() => {
    if (!activeLesson) return null;
    return chapters.find(c => c.lessons?.some((l: any) => l.id === activeLesson.id));
  }, [chapters, activeLesson]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-[#f8f9fa] text-[#6c757d]">
      <Loader2 size={32} className="animate-spin mb-3 text-primary" />
      <p className="font-medium text-[14px]">Đang khởi tạo FMath Infinity Studio...</p>
    </div>
  );
  
  if (chapters.length === 0 || !activeLesson) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] bg-[#f8f9fa] text-[#6c757d]">
      <BookOpen size={48} className="mb-4 opacity-30" />
      <p className="font-medium text-[14px]">Chưa có khóa học nào được giao.</p>
    </div>
  );

  // Theme & FontSize classes
  const themeContainerClasses = {
    light: 'bg-white text-[#333333] border-[#dee2e6]',
    sepia: 'bg-[#fbf0d9] text-[#433225] border-[#e4d4b9]',
    dark: 'bg-[#1e293b] text-[#e2e8f0] border-[#334155]'
  };

  const fontSizeClasses = {
    normal: 'text-[15px] leading-[2.1]',
    large: 'text-[17px] leading-[2.2]',
    xlarge: 'text-[19px] leading-[2.3]'
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] w-full relative overflow-hidden bg-[#f8f9fa] animate-in fade-in">
      
      {/* ==========================================
          1. HERO DYNAMIC PROGRESS BANNER
          ========================================== */}
      <div className="bg-[#e7f1ff] border-b border-[#b6d4fe] px-4 md:px-8 py-4 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Thông tin lộ trình & Lời khuyên */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2.5 rounded-xl border transition-colors md:hidden shrink-0 ${
                isSidebarOpen ? 'bg-primary text-white border-primary' : 'bg-white text-[#495057] border-[#dee2e6]'
              }`}
            >
              <Menu size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-[#dee2e6] shadow-sm">
                  Toán 12 • FMath Infinity
                </span>
                <span className="text-[12px] font-bold text-[#052c65] flex items-center gap-1">
                  <Compass size={14} className="text-primary" /> Tiến độ: {courseStats.completedLessons}/{courseStats.totalLessons} Bài ({courseStats.percent}%)
                </span>
              </div>

              {/* Thanh progress bar mượt */}
              <div className="w-48 sm:w-64 h-2 bg-white/80 rounded-full overflow-hidden border border-[#b6d4fe]">
                <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${courseStats.percent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Metric Badges (XP & Streak) */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-[#dee2e6] flex items-center gap-2 shadow-sm">
              <Zap size={16} className="text-primary" />
              <div className="text-[12px] font-bold text-[#212529]">
                {(currentUser.xp || 0).toLocaleString()} <span className="text-[10px] text-[#6c757d] uppercase">XP</span>
              </div>
            </div>

            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-[#dee2e6] flex items-center gap-2 shadow-sm">
              <Flame size={16} className="text-[#dc3545]" />
              <div className="text-[12px] font-bold text-[#212529]">
                {currentUser.streak || 0} <span className="text-[10px] text-[#6c757d] uppercase">Ngày</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ==========================================
          2. DUAL-COLUMN WORKSPACE (CỘT TRÁI NAVIGATOR + CỘT PHẢI MAIN STUDY HUB)
          ========================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ==========================================
            CỘT TRÁI: KHUNG ĐIỀU HƯỚNG LỘ TRÌNH & BÀI HỌC (CURRICULUM NAVIGATOR)
            ========================================== */}
        <aside className={`${isSidebarOpen ? 'w-full md:w-80' : 'w-0'} shrink-0 flex flex-col transition-all duration-300 ease-in-out h-full overflow-hidden bg-white border-r border-[#dee2e6] z-30 absolute md:relative`}>
          
          {/* Header Cột Trái & Thanh Tìm kiếm */}
          <div className="p-3.5 border-b border-[#e9ecef] bg-[#f8f9fa] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[#212529] uppercase tracking-wider font-heading">
                <BookA size={16} className="text-primary" /> Lộ trình bài giảng
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-[#adb5bd] hover:text-[#212529] md:hidden">
                <X size={18} />
              </button>
            </div>

            {/* Lọc nhanh theo Chương */}
            <div className="relative">
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full bg-white border border-[#dee2e6] rounded-xl px-3 py-1.5 text-[12px] font-bold text-[#495057] outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Tất cả các Chương ({chapters.length})</option>
                {chapters.map((c, i) => (
                  <option key={c.id} value={c.id}>Chương {i + 1}: {c.title}</option>
                ))}
              </select>
            </div>

            {/* Ô tìm kiếm bài học */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm từ khóa bài học..."
                className="w-full bg-white border border-[#dee2e6] rounded-xl pl-9 pr-3 py-1.5 text-[12px] outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Danh sách các Chương & Thẻ bài học */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {filteredChapters.map((chap: any, cIdx: number) => {
              const totalChLessons = chap.lessons?.length || 0;
              const compChLessons = chap.lessons?.filter((l: any) => l.isCompleted).length || 0;

              return (
                <div key={chap.id} className="border border-[#dee2e6] rounded-2xl overflow-hidden bg-white shadow-sm">
                  
                  {/* Tiêu đề Chương */}
                  <div className="bg-[#f8f9fa] p-3 border-b border-[#e9ecef] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider font-ui">Chương {cIdx + 1}</div>
                      <div className="font-bold text-[13px] text-[#212529] font-heading leading-snug">{chap.title}</div>
                    </div>
                    <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-[#dee2e6] text-[#6c757d]">
                      {compChLessons}/{totalChLessons}
                    </span>
                  </div>

                  {/* Danh sách bài học trong chương */}
                  <div className="p-1 space-y-1">
                    {chap.lessons?.map((lesson: any, lIdx: number) => {
                      const isActive = activeLesson.id === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleSelectLesson(lesson)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] flex items-start gap-3 transition-all ${
                            isActive
                              ? 'bg-[#e7f1ff] border border-[#b6d4fe] text-[#084298] font-bold shadow-sm'
                              : 'border border-transparent hover:bg-[#f8f9fa] text-[#495057] font-medium'
                          }`}
                        >
                          <div className={`mt-0.5 shrink-0 ${isActive ? 'text-primary' : lesson.isCompleted ? 'text-[#198754]' : 'text-[#adb5bd]'}`}>
                            {lesson.isCompleted ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="leading-snug truncate">Bài {lIdx + 1}: {lesson.title}</div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6c757d] font-normal">
                              <span className="flex items-center gap-0.5"><Clock size={11} /> 5 phút</span>
                              {lesson.exercises?.length > 0 && (
                                <span className="flex items-center gap-0.5 text-primary font-semibold">• {lesson.exercises.length} câu tập</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

        </aside>

        {/* ==========================================
            CỘT PHẢI: TRUNG TÂM HỌC TẬP CHÍNH (MAIN STUDY HUB)
            ========================================== */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa] overflow-hidden relative">
          
          {/* NÚT "HỎI AI" NỔI LÊN KHI BÔI ĐEN VĂN BẢN */}
          {selectionPos && (
            <button
              onClick={handleAskSelectedText}
              style={{ top: selectionPos.top, left: selectionPos.left, transform: 'translateX(-50%)' }}
              className="fixed z-50 bg-[#0d6efd] text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 text-xs font-bold font-ui hover:bg-[#0b5ed7] animate-in zoom-in-95"
            >
              <BrainCircuit size={14} /> Hỏi FMath AI
            </button>
          )}

          {/* TOOLBAR ĐỒNG BỘ: TAB SWITCHER + THEME & FONT CONTROL */}
          <div className="bg-white border-b border-[#dee2e6] px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-sm z-10">
            
            {/* TAB CHUYỂN DẠNG LÝ THUYẾT / BÀI TẬP */}
            <div className="flex bg-[#f8f9fa] p-1 rounded-xl border border-[#dee2e6]">
              <button
                onClick={() => setActiveTab('theory')}
                className={`px-4 py-2 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-all ${
                  activeTab === 'theory' ? 'bg-primary text-white shadow-sm' : 'text-[#495057] hover:text-[#212529]'
                }`}
              >
                <BookOpen size={16} /> Lý thuyết chuyên sâu
              </button>
              <button
                onClick={() => setActiveTab('practice')}
                className={`px-4 py-2 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-all ${
                  activeTab === 'practice' ? 'bg-primary text-white shadow-sm' : 'text-[#495057] hover:text-[#212529]'
                }`}
              >
                <Target size={16} /> Bài tập vận dụng ({activeLesson.exercises?.length || 0})
              </button>
            </div>

            {/* CÔNG CỤ ĐỌC BÀI GIẢNG (THEME & FONT CONTROL) */}
            <div className="flex items-center gap-3">
              
              {/* Đổi Theme bài đọc (Sáng / Giấy Cổ / Đêm) */}
              <div className="flex items-center bg-[#f8f9fa] border border-[#dee2e6] rounded-xl p-1 gap-1">
                <button
                  onClick={() => setReadingTheme('light')}
                  className={`p-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1 ${readingTheme === 'light' ? 'bg-white shadow-sm text-primary' : 'text-[#6c757d]'}`}
                  title="Giao diện Trắng sáng"
                >
                  <Sun size={14} /> Sáng
                </button>
                <button
                  onClick={() => setReadingTheme('sepia')}
                  className={`p-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1 ${readingTheme === 'sepia' ? 'bg-[#f5e5c9] text-[#5c4033] shadow-sm' : 'text-[#6c757d]'}`}
                  title="Giao diện Giấy đọc dịu mắt"
                >
                  Giấy
                </button>
                <button
                  onClick={() => setReadingTheme('dark')}
                  className={`p-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1 ${readingTheme === 'dark' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-[#6c757d]'}`}
                  title="Giao diện Đêm"
                >
                  <Moon size={14} /> Đêm
                </button>
              </div>

              {/* Tùy chỉnh cỡ chữ */}
              <div className="flex items-center bg-[#f8f9fa] border border-[#dee2e6] rounded-xl p-1">
                <button
                  onClick={() => setFontSize('normal')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${fontSize === 'normal' ? 'bg-white shadow-sm text-primary' : 'text-[#6c757d]'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-2.5 py-1 rounded-lg text-[13px] font-bold ${fontSize === 'large' ? 'bg-white shadow-sm text-primary' : 'text-[#6c757d]'}`}
                >
                  A+
                </button>
              </div>

            </div>

          </div>

          {/* KHUNG CUỘN BÀI GIẢNG LÝ THUYẾT / BÀI TẬP */}
          <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-32">
            <div className="max-w-4xl mx-auto">
              
              {/* TAB LÝ THUYẾT BÀI GIẢNG */}
              {activeTab === 'theory' && (
                <article 
                  className={`p-6 md:p-14 rounded-2xl shadow-sm border transition-all duration-300 animate-in fade-in ${themeContainerClasses[readingTheme]}`}
                  onMouseUp={handleTextSelection}
                >
                  {/* TIÊU ĐỀ & CHƯƠNG */}
                  <div className="border-b border-current/15 pb-6 mb-8">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full inline-block mb-3">
                      {currentChapterInfo?.title || 'Khóa học Toán 12'}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold font-heading m-0 leading-tight">
                      {activeLesson.title}
                    </h1>
                  </div>

                  {/* NỘI DUNG CHÍNH (MARKDOWN & KATEX) */}
                  <div className={`prose prose-base max-w-none prose-headings:font-heading prose-p:mb-5 prose-li:mb-2 prose-ul:mb-5 [&_.katex-display]:my-6 overflow-x-auto selection:bg-[#cfe2ff] selection:text-primary ${fontSizeClasses[fontSize]}`}>
                    {renderedTheoryContent}
                  </div>
                  
                  {/* BOX HOÀN THÀNH BÀI HỌC & NHẬN THƯỞNG */}
                  <div className="mt-12 pt-6 border-t border-current/15 flex flex-col md:flex-row items-center justify-between gap-4 bg-current/5 p-6 rounded-2xl border border-current/10">
                    <div>
                      <h4 className="text-[16px] font-bold font-heading m-0 mb-1">Bạn đã học xong bài này chưa?</h4>
                      <p className="text-[13px] opacity-80 m-0">
                        {activeLesson.exercises?.length > 0 
                          ? `Tiếp tục làm ${activeLesson.exercises.length} câu hỏi vận dụng để nhận XP thưởng!` 
                          : `Xác nhận hoàn thành bài học để tích lũy 50 XP và duy trì Streak nhé!`}
                      </p>
                    </div>
                    
                    {activeLesson.exercises?.length > 0 ? (
                      <button onClick={() => setActiveTab('practice')} className="btn-primary w-full md:w-auto text-[14px] py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2">
                        Luyện tập ngay <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={handleCompleteLesson} 
                        disabled={activeLesson.isCompleted} 
                        className={`btn-primary w-full md:w-auto text-[14px] py-2.5 px-6 rounded-xl shadow-sm ${activeLesson.isCompleted ? 'bg-[#198754] border-none' : ''}`}
                      >
                        <CheckCircle2 size={16} /> {activeLesson.isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                      </button>
                    )}
                  </div>
                </article>
              )}

              {/* TAB BÀI TẬP VẬN DỤNG */}
              {activeTab === 'practice' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                  {(!activeLesson.exercises || activeLesson.exercises.length === 0) ? (
                    <div className="text-center py-16 text-[#6c757d] bg-white border border-dashed border-[#dee2e6] rounded-2xl p-12">
                      <Target size={44} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-[14px] m-0">Bài học này hiện chưa có bài tập trắc nghiệm đính kèm.</p>
                    </div>
                  ) : (
                    <div className="bg-white p-6 md:p-10 rounded-2xl border border-[#dee2e6] shadow-sm">
                      
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e9ecef]">
                        <span className="text-[12px] bg-[#e9ecef] text-[#495057] px-3 py-1 rounded-full font-bold">
                          Câu hỏi {currentExIndex + 1} / {activeLesson.exercises.length}
                        </span>
                        <span className="text-[12px] flex items-center gap-1 bg-[#fff3cd] text-[#664d03] px-3 py-1 rounded-full font-bold">
                          <Flame size={12}/> +10 XP
                        </span>
                      </div>

                      <div className="mb-6 prose prose-base max-w-none text-[#212529] font-medium leading-[2] overflow-x-auto [&_.katex-display]:my-4">
                        {renderedPracticeContent}
                      </div>

                      <div className="mb-8">
                        {/* MCQ OPTIONS */}
                        {qType === 'mcq' && currentExercise.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {currentExercise.options.map((opt: any, idx: number) => {
                              const rawOptId = opt.id || ['A', 'B', 'C', 'D'][idx] || String(idx);
                              const optId = String(rawOptId).toLowerCase().trim();
                              const displayId = String(rawOptId).toUpperCase().trim();
                              
                              const isSubmitted = submittedQuestions[currentExercise.id];
                              const selectedOpt = String(answers[currentExercise.id] || '').toLowerCase().trim();
                              const isSelected = selectedOpt === optId;
                              const isCorrect = isMcqCorrect(optId, currentExercise.correct_answer);
                              
                              let optionClass = "border-[#dee2e6] hover:border-primary hover:bg-[#e7f1ff] text-[#495057]";
                              if (isSubmitted) {
                                if (isCorrect) optionClass = "border-[#198754] bg-[#d1e7dd] text-[#0f5132]";
                                else if (isSelected && !isCorrect) optionClass = "border-[#dc3545] bg-[#f8d7da] text-[#842029]";
                                else optionClass = "border-[#dee2e6] opacity-50 bg-[#f8f9fa]";
                              } else if (isSelected) {
                                optionClass = "border-primary bg-[#cfe2ff] text-[#084298]";
                              }

                              return (
                                <div key={optId} onClick={() => { if(!isSubmitted) handleAnswerMCQ(optId) }} className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${optionClass}`}>
                                  <div className={`w-7 h-7 mt-0.5 shrink-0 rounded-full flex items-center justify-center font-bold text-[12px] font-ui ${isSubmitted && isCorrect ? 'bg-[#198754] text-white' : isSubmitted && isSelected && !isCorrect ? 'bg-[#dc3545] text-white' : isSelected ? 'bg-primary text-white' : 'bg-[#e9ecef] text-[#6c757d]'}`}>{displayId}</div>
                                  <div className="prose prose-sm flex-1 text-[14px] leading-relaxed overflow-x-auto m-0 pt-1"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown></div>
                                  {isSubmitted && isCorrect && <CheckCircle2 className="text-[#198754] shrink-0 mt-1" size={20}/>}
                                  {isSubmitted && isSelected && !isCorrect && <XCircle className="text-[#dc3545] shrink-0 mt-1" size={20}/>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* TF OPTIONS */}
                        {qType === 'tf' && currentExercise.options && (
                          <div className="flex flex-col gap-3">
                            {currentExercise.options.map((opt: any, idx: number) => {
                              const rawOptId = opt.id || ['a', 'b', 'c', 'd'][idx] || String(idx);
                              const optId = String(rawOptId).toLowerCase().trim();
                              
                              const isSubmitted = submittedQuestions[currentExercise.id];
                              const userVal = answers[currentExercise.id]?.[optId];
                              const parsedCorrect = parseTFAnswer(currentExercise.correct_answer);
                              const isCorrectVal = parsedCorrect[optId];
                              const isUserCorrect = userVal === isCorrectVal;

                              return (
                                <div key={optId} className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${isSubmitted ? (isUserCorrect ? 'border-[#198754] bg-[#d1e7dd]' : 'border-[#dc3545] bg-[#f8d7da]') : 'border-[#dee2e6] bg-white'}`}>
                                  <div className="flex items-start gap-3 flex-1 overflow-x-auto">
                                    <div className="w-6 h-6 mt-0.5 shrink-0 rounded flex items-center justify-center font-bold text-[12px] bg-[#e9ecef] text-[#6c757d] font-ui">{rawOptId}</div>
                                    <div className="prose prose-sm m-0 text-[14px]"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown></div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center bg-[#f8f9fa] p-1 rounded border border-[#e9ecef]">
                                    <button disabled={isSubmitted} onClick={() => handleAnswerTF(optId, true)} className={`px-4 py-1.5 rounded font-semibold text-[13px] transition-colors ${userVal === true ? 'bg-primary text-white' : 'text-[#6c757d] hover:bg-[#e9ecef]'}`}>Đúng</button>
                                    <button disabled={isSubmitted} onClick={() => handleAnswerTF(optId, false)} className={`px-4 py-1.5 rounded font-semibold text-[13px] transition-colors ${userVal === false ? 'bg-[#dc3545] text-white' : 'text-[#6c757d] hover:bg-[#e9ecef]'}`}>Sai</button>
                                  </div>
                                  {isSubmitted && <div className="shrink-0 flex items-center">
                                    {isUserCorrect ? <CheckCircle2 className="text-[#198754]" size={20}/> : <XCircle className="text-[#dc3545]" size={20}/>}
                                  </div>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* SAQ OPTION */}
                        {qType === 'saq' && (
                          <div className="bg-[#f8f9fa] p-5 rounded-xl border border-[#dee2e6]">
                            <label className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-2 block">Nhập đáp án (Dùng "." cho số thập phân)</label>
                            <input 
                              type="text" 
                              value={answers[currentExercise.id] || ""} 
                              onChange={(e) => handleAnswerSAQ(e.target.value)} 
                              disabled={submittedQuestions[currentExercise.id]} 
                              className={`w-full max-w-xs px-4 py-3 rounded-lg font-bold text-[16px] outline-none transition-colors border ${submittedQuestions[currentExercise.id] ? (isSaqCorrect(answers[currentExercise.id], currentExercise.correct_answer) ? 'bg-[#d1e7dd] text-[#0f5132] border-[#198754]' : 'bg-[#f8d7da] text-[#842029] border-[#dc3545]') : 'bg-white border-[#dee2e6] focus:border-primary text-[#212529]'}`} 
                              placeholder="VD: 12.5"
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#e9ecef] flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1 w-full md:w-auto">
                          {submittedQuestions[currentExercise.id] && (
                             <div className="flex items-center gap-2 text-[#198754] font-bold text-[14px]"><CheckCircle2 size={18}/> Đã ghi nhận đáp án!</div> 
                          )}
                        </div>
                        
                        <div className="shrink-0 flex gap-3 w-full md:w-auto">
                          {!submittedQuestions[currentExercise.id] ? (
                            <button disabled={!answers[currentExercise.id]} onClick={handleCheckAnswer} className="btn-primary w-full md:w-auto px-6 py-2.5 rounded-xl shadow-sm">Kiểm tra đáp án</button>
                          ) : (currentExIndex < activeLesson.exercises.length - 1 ? (
                            <button onClick={handleNextQuestion} className="btn-secondary w-full md:w-auto bg-[#212529] text-white hover:bg-[#495057] px-6 py-2.5 rounded-xl border-none shadow-sm flex items-center justify-center gap-2">Câu tiếp theo <ArrowRight size={16}/></button>
                          ) : (
                            <button onClick={handleCompleteLesson} disabled={activeLesson.isCompleted} className="btn-primary w-full md:w-auto bg-[#198754] hover:bg-[#157347] px-6 py-2.5 rounded-xl border-none shadow-sm flex items-center justify-center gap-2"><Check size={16}/> HOÀN THÀNH</button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </main>
      </div>

      {/* ==========================================
          CỤM NÚT NỔI (FAB) ĐỂ GỌI TRỢ GIẢNG AI
          ========================================== */}
      <button 
        onClick={() => setIsAiChatOpen(!isAiChatOpen)}
        className="fixed bottom-6 right-6 z-40 bg-primary text-white p-4 rounded-full shadow-lg hover:bg-[#0b5ed7] hover:scale-105 transition-transform flex items-center justify-center"
      >
        {isAiChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* ==========================================
          CỬA SỔ CHAT AI (POPUP MODAL)
          ========================================== */}
      {isAiChatOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl border border-[#dee2e6] z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between p-3.5 border-b border-[#dee2e6] bg-[#f8f9fa]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#e7f1ff] flex items-center justify-center text-primary"><BrainCircuit size={16} /></div>
              <div>
                <div className="font-bold text-[14px] text-[#212529] font-heading">FMath AI Tutor</div>
                <div className="text-[11px] font-medium text-[#198754] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#198754] animate-pulse"></span> Sẵn sàng giải đáp
                </div>
              </div>
            </div>
            <button onClick={() => setIsAiChatOpen(false)} className="text-[#adb5bd] hover:text-[#dc3545] transition-colors"><X size={18}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 bg-white">
            {aiChatHistory.length === 0 && (
               <div className="text-center text-[#6c757d] text-[12px] mt-4">
                 Bôi đen đoạn văn bản chưa hiểu trong bài học để hỏi thầy nhé!
               </div>
            )}
            {aiChatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in`}>
                {msg.role === 'ai' && <div className="w-6 h-6 rounded bg-[#f8f9fa] flex items-center justify-center text-[#6c757d] shrink-0 mr-2 mt-1 border border-[#dee2e6]"><BrainCircuit size={12} /></div>}
                <div className={`max-w-[85%] rounded-xl p-3 text-[13px] leading-relaxed ${msg.role === 'user' ? 'bg-primary text-white font-medium rounded-br-sm' : 'bg-[#f8f9fa] text-[#212529] border border-[#dee2e6] rounded-bl-sm'}`}>
                  {msg.role === 'user' ? msg.content : <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1"><ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{msg.content}</ReactMarkdown></div>}
                </div>
              </div>
            ))}
            {aiChatHistory.length <= 1 && (
              <div className="space-y-2 pt-2 border-t border-[#e9ecef] mt-4">
                <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-2">Hỏi nhanh FMath AI:</div>
                <div className="flex flex-col gap-2">
                  {suggestedPrompts.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      onClick={() => handleSendAiMessage(p.prompt)}
                      className="px-3 py-2 rounded-xl bg-[#e7f1ff] hover:bg-[#cfe2ff] text-primary border border-[#b6d4fe]/30 transition-colors text-[12px] font-semibold text-left w-full flex items-center justify-between group active:scale-95 shadow-sm"
                    >
                      <span>{p.label}</span>
                      <ArrowRight size={13} className="text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isAiTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded bg-[#f8f9fa] flex items-center justify-center text-[#6c757d] shrink-0 mr-2 mt-1 border border-[#dee2e6]"><BrainCircuit size={12} /></div>
                <div className="bg-[#f8f9fa] border border-[#dee2e6] px-3 py-2.5 rounded-xl rounded-bl-sm flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#adb5bd] rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-[#adb5bd] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span><span className="w-1.5 h-1.5 bg-[#adb5bd] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-[#dee2e6] shrink-0">
            <div className="flex items-end bg-[#f8f9fa] border border-[#dee2e6] rounded-xl focus-within:border-primary transition-colors p-1">
              <textarea ref={aiInputRef} rows={1} value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAiMessage(); } }} placeholder="Nhập câu hỏi..." className="flex-1 max-h-24 bg-transparent outline-none px-2 py-1.5 text-[13px] text-[#212529] resize-none custom-scrollbar" disabled={isAiTyping}/>
              <button onClick={handleSendAiMessage} disabled={isAiTyping || !aiInput.trim()} className="bg-primary text-white p-2 rounded-lg mb-0.5 mr-0.5 disabled:opacity-50 hover:bg-[#0b5ed7]"><Send size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HOÀN THÀNH BÀI HỌC */}
      {showRewardModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in px-4">
          <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-[#dee2e6]">
            <CheckCircle2 size={56} className="mx-auto text-[#198754] mb-4" />
            <h2 className="text-xl font-bold font-heading text-[#212529] mb-2">Hoàn thành bài học!</h2>
            <p className="text-[#6c757d] text-[14px] mb-6">Bạn đã học xong lý thuyết và hoàn thành xuất sắc các bài tập thử thách.</p>
            <button onClick={() => setShowRewardModal(false)} className="btn-primary w-full py-2.5 text-[14px] rounded-xl shadow-sm">
              TIẾP TỤC HỌC TẬP
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Theory;