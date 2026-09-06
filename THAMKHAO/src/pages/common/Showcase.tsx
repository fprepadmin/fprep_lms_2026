import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, Play, User, Users, GraduationCap, 
  BrainCircuit, ShieldCheck, Trophy, Cpu, Compass, Sparkles, MonitorPlay,
  Wifi, RefreshCw, Lock, AlertOctagon, Code, ShieldAlert, Laptop,
  BarChart3, AlertTriangle, Send, X, Terminal, CheckCircle2, ChevronRight, Zap,
  BookOpen, Award, CloudLightning, FileText, CheckCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { askGroqAI } from '../../services/groqAI';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const Showcase = () => {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activePopup, setActivePopup] = useState<string | null>(null);

  // States for Sandbox Interactive Modals
  const [visitorCount, setVisitorCount] = useState(1504);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [aiQuestionReply, setAiQuestionReply] = useState<string>('');
  const [aiQuestionLoading, setAiQuestionLoading] = useState(false);
  const [studentMathInput, setStudentMathInput] = useState('\\lim_{x \\to 1} \\frac{x^2 - 1}{x - 1}');

  // AI Chat states
  const [aiTutorPrompt, setAiTutorPrompt] = useState('Hướng dẫn giải ngắn gọn từng bước tính đạo hàm y = x * ln(x)');
  const [aiTutorChat, setAiTutorChat] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([
    { role: 'ai', content: 'Xin chào! Thầy là FMath AI Tutor. Em cần hướng dẫn giải bài toán hay lý thuyết nào hôm nay?' }
  ]);
  const [aiTutorLoading, setAiTutorLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Offline and LaTeX states
  const [latexCode, setLatexCode] = useState('\\int_{0}^{\\pi} \\sin(x) \\, dx = 2');
  const [isOffline, setIsOffline] = useState(false);
  const [offlineAnswer, setOfflineAnswer] = useState('');
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState('');

  // Monitoring and Heatmap states
  const [violationLogs, setViolationLogs] = useState<Array<string>>([
    "10:10:00 - Ca thi thử Live THPTQG Toán 12 bắt đầu.",
    "10:11:05 - Thí sinh Phan Võ Gia Thịnh đã nộp bài."
  ]);
  const [heatmapData, setHeatmapData] = useState([
    { name: '12T1', scores: [85, 78, 48, 88] },
    { name: '12T2', scores: [72, 60, 52, 65] },
    { name: '12X1', scores: [58, 45, 68, 50] },
    { name: '12K1', scores: [90, 85, 76, 82] }
  ]);

  // RLS states
  const [rlsLog, setRlsLog] = useState<string>('Đang chờ gửi truy vấn xác thực RLS...');
  const [rlsStatus, setRlsStatus] = useState<'success' | 'error' | null>(null);

  // GPA Efficacy state
  const [efficacyMode, setEfficacyMode] = useState<'before' | 'after'>('after');

  const renderLatex = (latex: string) => {
    try {
      const html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (e) {
      return <span>{latex}</span>;
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiTutorChat, aiTutorLoading]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlide(prev => Math.min(prev + 1, 8 - 1));
        setActivePopup(null);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlide(prev => Math.max(prev - 0, 0));
        setActivePopup(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerStatsUpdate = () => {
    setUpdatingStats(true);
    setTimeout(() => {
      setVisitorCount(prev => prev + 1);
      setUpdatingStats(false);
    }, 600);
  };

  const handleSendAiTutor = async () => {
    if (!aiTutorPrompt.trim() || aiTutorLoading) return;
    const userMsg = aiTutorPrompt;
    setAiTutorChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiTutorPrompt('');
    setAiTutorLoading(true);

    try {
      const systemPrompt = "Bạn là FMath AI Tutor, một gia sư Toán lớp 12 chuyên nghiệp của trường THPT FPT Cần Thơ. Hãy giảng bài trực tiếp và giải thích chi tiết, đầy đủ toàn bộ thắc mắc của học sinh ngay lập tức. Không hỏi từng bước và không bắt học sinh tự giải. Trả lời bằng tiếng Việt, sử dụng công thức LaTeX bọc trong $ hoặc $$.";
      const reply = await askGroqAI(systemPrompt, userMsg);
      setAiTutorChat(prev => [...prev, { role: 'ai', content: reply }]);
    } catch (error) {
      setAiTutorChat(prev => [...prev, { role: 'ai', content: 'Lỗi: Không thể kết nối máy chủ AI. Thử lại sau ít giây.' }]);
    } finally {
      setAiTutorLoading(false);
    }
  };

  const handleSendAiExplain = async () => {
    if (aiQuestionLoading) return;
    setAiQuestionLoading(true);
    try {
      const systemPrompt = "Bạn là trợ lý học tập môn Toán. Giải thích ngắn gọn trong 2 câu tại sao hàm số y = x^3 - 3x có 2 điểm cực trị.";
      const reply = await askGroqAI(systemPrompt, "Hãy giải thích tại sao hàm số này có 2 cực trị");
      setAiQuestionReply(reply);
    } catch (err) {
      setAiQuestionReply("Vì đạo hàm y' = 3x^2 - 3 = 0 có hai nghiệm phân biệt x = 1 và x = -1, đồ thị đổi dấu qua hai nghiệm này.");
    } finally {
      setAiQuestionLoading(false);
    }
  };

  const handleOfflineType = (val: string) => {
    setOfflineAnswer(val);
    setOfflineSaved(true);
    setTimeout(() => setOfflineSaved(false), 800);
  };

  const toggleOfflineMode = (val: boolean) => {
    setIsOffline(val);
    if (!val) {
      setOfflineSyncMessage('Đang đồng bộ dữ liệu ngoại tuyến lên Supabase...');
      setTimeout(() => {
        setOfflineSyncMessage('Đồng bộ thành công! Kết quả làm bài đã được cập nhật an toàn. ✓');
        setTimeout(() => setOfflineSyncMessage(''), 3000);
      }, 1500);
    } else {
      setOfflineSyncMessage('');
    }
  };

  const simulateTabSwitch = () => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setViolationLogs(prev => [
      `${time} - [CẢNH BÁO GIAN LẬN] Học sinh Nguyễn Văn A chuyển tab khỏi màn hình thi!`,
      ...prev
    ]);
  };

  const updateHeatmapCell = (classIdx: number, scoreIdx: number) => {
    setHeatmapData(prev => {
      const updated = [...prev];
      const curScore = updated[classIdx].scores[scoreIdx];
      let nextScore = 45;
      if (curScore === 45) nextScore = 70;
      else if (curScore === 70) nextScore = 85;
      updated[classIdx].scores[scoreIdx] = nextScore;
      return updated;
    });
  };

  const testRLS = (roleType: 'self' | 'other') => {
    setRlsLog('Đang gửi truy vấn SELECT * FROM exam_attempts WHERE user_id = ...');
    setRlsStatus(null);
    setTimeout(() => {
      if (roleType === 'self') {
        setRlsLog('SELECT SUCCESS: Trả về 2 bản ghi bài làm của chính Nguyễn Văn A. (Bảo mật: auth.uid() = user_id) ✓');
        setRlsStatus('success');
      } else {
        setRlsLog('SELECT ERROR (403): RLS Policy Blocked. Bạn không có quyền truy cập dữ liệu của học sinh khác! ❌');
        setRlsStatus('error');
      }
    }, 800);
  };

  const handleStartDemo = (role: 'student' | 'teacher') => {
    localStorage.setItem('demo_mode', 'true');
    if (role === 'student') {
      setUser({
        id: 'demo-student-uuid-9999',
        full_name: 'Học sinh Khảo thí (Demo)',
        name: 'Học sinh Khảo thí (Demo)',
        email: 'hocsinh.demo@fmath12.edu.vn',
        role: 'student',
        xp: 1580,
        level: 16,
        streak: 4,
        student_code: 'HS_DEMO_01',
        class_name: '12T1'
      });
    } else {
      setUser({
        id: 'demo-teacher-uuid-9999',
        full_name: 'Thầy Cô Khảo thí (Demo)',
        name: 'Thầy Cô Khảo thí (Demo)',
        email: 'giaovien.demo@fmath12.edu.vn',
        role: 'teacher',
        xp: 4200,
        level: 42,
        streak: 12,
        student_code: 'GV_DEMO_01',
        class_name: 'Tổ Toán-Tự nhiên'
      });
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans relative overflow-hidden select-none">
      
      {/* GRID OVERLAY NỀN SÁNG CHUẨN MỰC (Light Theme Grid) */}
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>

      {/* BLUR BLOBS BACKGROUND */}
      <div className="fixed top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed top-[20%] right-[10%] w-[400px] h-[400px] bg-cyan-300/10 rounded-full blur-[80px] pointer-events-none"></div>

      {/* TOP HEADER */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 relative z-10 backdrop-blur-md bg-white/70">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Quay lại Trang chủ"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[13px] font-black text-slate-800 tracking-widest font-heading m-0 flex items-center gap-2">
              <span className="bg-primary text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">PRESENTATION</span>
              HỘI ĐỒNG BÁO CÁO KHOA HỌC FMATH12
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[12px] font-bold text-slate-500">
          <span>SLIDE {currentSlide + 1} / 8</span>
          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((currentSlide + 1) / 8) * 100}%` }}></div>
          </div>
        </div>
      </header>

      {/* PHẦN THÂN TRÌNH CHIẾU SLIDE ĐẸP */}
      <div className="flex-1 flex flex-col justify-between p-6 md:p-12 relative z-10 max-w-6xl mx-auto w-full">
        
        <div className="w-full my-auto space-y-6">

          {/* SLIDE 1: TRANG BÌA GIỚI THIỆU */}
          {currentSlide === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-6 animate-in fade-in duration-300">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-sm font-semibold tracking-wide uppercase mb-6 shadow-sm">
                <Sparkles size={14} /> Phần mềm tin học & Chuyển đổi số
              </div>
              
              <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 mb-4 tracking-tight drop-shadow-sm font-heading">
                FMATH12
              </h1>
              
              <p className="text-2xl md:text-3xl text-slate-700 font-light leading-relaxed max-w-4xl mb-10">
                Giải pháp phát triển năng lực tự học môn Toán lớp 12 <br />
                <span className="font-semibold text-blue-800 bg-blue-50 px-4 py-1.5 rounded-lg mt-3 inline-block border border-blue-100 shadow-sm text-lg md:text-xl">
                  Ứng dụng Trí tuệ nhân tạo (AI)
                </span>
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 text-lg shrink-0">
                    <User size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">Đồng Tác giả</p>
                    <p className="text-base font-bold text-slate-800">Trần Ngọc Minh Thông</p>
                    <p className="text-[12px] text-slate-500">Lớp 11T3 - THPT FPT Cần Thơ</p>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-purple-600 text-lg shrink-0">
                    <User size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">Đồng Tác giả</p>
                    <p className="text-base font-bold text-slate-800">Phan Võ Gia Thịnh</p>
                    <p className="text-[12px] text-slate-500">Lớp 11T1 - THPT FPT Cần Thơ</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: THỰC TRẠNG & SỰ KHÁC BIỆT */}
          {currentSlide === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold text-slate-800 font-heading">Thực trạng & Sự khác biệt</h2>
                <p className="text-sm text-slate-500 mt-1">Giải quyết triệt để nút thắt khi tự học ở nhà</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Nền tảng cũ */}
                <div className="bg-white border border-slate-200 border-t-4 border-t-red-500 rounded-2xl p-6 flex flex-col justify-between shadow-sm bg-red-50/10">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xl shrink-0"><X size={18} /></div>
                      <h3 className="text-lg font-bold text-slate-800">Nền tảng Cũ / Đề photo</h3>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex gap-3 items-start text-sm">
                        <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                        <div>
                          <h4 className="font-bold text-slate-800">Chỉ là "Kho lưu trữ tĩnh"</h4>
                          <p className="text-slate-600 mt-0.5 text-[12.5px]">Chỉ cung cấp đáp án cuối cùng đóng khung (A/B/C/D).</p>
                        </div>
                      </li>
                      <li className="flex gap-3 items-start text-sm">
                        <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                        <div>
                          <h4 className="font-bold text-slate-800">Thiếu hướng dẫn tương tác</h4>
                          <p className="text-slate-600 mt-0.5 text-[12.5px]">Khi sai bài khó, không có người giải thích lỗi sai tư duy, gây chán nản.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <button onClick={() => setActivePopup('survey_detail')} className="w-full btn-outline py-2 text-[12px] mt-4 flex items-center justify-center gap-1">
                    <AlertTriangle size={14} className="text-red-500" /> Hiện Khảo sát Chi tiết
                  </button>
                </div>

                {/* FMATH12 */}
                <div className="bg-white border border-slate-200 border-t-4 border-t-blue-600 rounded-2xl p-6 flex flex-col justify-between shadow-md transform scale-105">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0"><CheckCircle size={18} /></div>
                      <h3 className="text-lg font-bold text-slate-800">Hệ sinh thái FMATH12</h3>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex gap-3 items-start text-sm">
                        <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                        <div>
                          <h4 className="font-bold text-slate-800">Học tập Thích ứng (Adaptive)</h4>
                          <p className="text-slate-600 mt-0.5 text-[12.5px]">Cá nhân hóa lộ trình dựa trên dữ liệu lỗi sai của từng cá nhân.</p>
                        </div>
                      </li>
                      <li className="flex gap-3 items-start text-sm">
                        <span className="text-blue-600 font-bold shrink-0 mt-0.5">•</span>
                        <div>
                          <h4 className="font-bold text-slate-800">Trợ lý FMATH AI 24/7</h4>
                          <p className="text-slate-600 mt-0.5 text-[12.5px]">Phân tích logic tư duy, giải thích step-by-step tháo gỡ rào cản khó.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <button onClick={() => setActivePopup('ai_explain_compare')} className="w-full btn-primary py-2 text-[12px] mt-4 flex items-center justify-center gap-1">
                    <BrainCircuit size={14} /> Khắc phục lỗi sai bằng AI Động
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl w-full max-w-5xl mx-auto p-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 animate-pulse"><Zap size={16} /></div>
                <p className="text-slate-700 text-xs font-semibold m-0">
                  <b>Minh chứng từ Hệ thống:</b> Khi có AI gợi ý, tỷ lệ học sinh tự giải quyết thành công bài toán khó ở lần làm lại đạt <span className="text-blue-700 text-base font-bold">82%</span>, minh chứng cho việc tháo gỡ đúng điểm nghẽn tư duy.
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 3: TÍNH MỚI & CHẤT LƯỢNG NỘI DUNG */}
          {currentSlide === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold text-slate-800 font-heading">Tính Mới & Chất lượng Nội dung</h2>
                <p className="text-sm text-blue-600 font-bold">Công nghệ thông minh kết hợp nguồn học liệu chuẩn mực</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Sư phạm đảo ngược */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0"><Cpu size={20} /></div>
                  <h3 className="text-base font-bold text-slate-800">Sư phạm Đảo ngược</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Từ chối cung cấp đáp án dập khuôn. <b>FMATH AI</b> chủ động phân tích bài làm và hướng dẫn học sinh tháo gỡ từng bước (step-by-step).
                  </p>
                </div>

                {/* Học liệu kiểm duyệt */}
                <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-3 shadow-md transform scale-105 border-t-4 border-t-emerald-500">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0"><CheckCircle size={20} /></div>
                  <h3 className="text-base font-bold text-slate-800">Học liệu Kiểm duyệt</h3>
                  <p className="text-slate-600 text-xs leading-relaxed mb-4">
                    Vượt trội so với AI trôi nổi trên mạng. Đảm bảo tính chính xác tuyệt đối.
                  </p>
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-start gap-2 mt-auto">
                    <span className="text-emerald-600 font-bold text-xs">✓</span>
                    <span className="text-[11px] font-bold text-emerald-800 leading-snug">100% Nội dung duyệt bởi Tổ Tự nhiên - THPT FPT Cần Thơ</span>
                  </div>
                </div>

                {/* Chống ảo giác */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0"><ShieldCheck size={20} /></div>
                  <h3 className="text-base font-bold text-slate-800">Chống Ảo giác (Guardrails)</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Áp dụng bộ lọc kỹ thuật. AI bị giới hạn nghiêm ngặt, <b>không tự ý bịa kiến thức toán học</b>, cam kết bám sát phương pháp sư phạm.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: CÁCH VẬN HÀNH HIỆU QUẢ - HỌC SINH */}
          {currentSlide === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 font-heading">Cách vận hành hiệu quả</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Trải nghiệm Dành cho Học sinh</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs tracking-wide flex items-center gap-1">
                  <Laptop size={14} /> Student Workspace
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex gap-4 items-start shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-xl shrink-0"><Code size={18} /></div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">Định dạng Sắc nét (KaTeX)</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">Tích hợp engine KaTeX hiển thị công thức phức tạp, ma trận, đồ thị sắc nét chuẩn định dạng Sách giáo khoa.</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex gap-4 items-start shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0"><Wifi size={18} /></div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">Cơ chế Offline Tolerance</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">Bảo vệ học sinh. Tự động <b className="text-purple-700">lưu bài làm cục bộ</b> ngay lập tức khi thiết bị mất kết nối mạng đột ngột.</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-transparent border border-blue-100 rounded-2xl p-6 flex gap-4 items-start col-span-1 md:col-span-2 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0"><Trophy size={18} /></div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">Gamification (Trò chơi hóa)</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">Kích thích tự học thông qua Điểm kinh nghiệm (XP) và Bảng xếp hạng thi đua thời gian thực, biến việc học khô khan thành hành trình thú vị.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 5: GIÁO VIÊN & QUẢN LÝ */}
          {currentSlide === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 font-heading">Cách vận hành & Quản lý</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Dành cho Giáo viên & Nhà trường</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs tracking-wide flex items-center gap-1">
                  <Users size={14} /> Teacher Workspace
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl shrink-0 mr-4 border border-blue-200 shadow-sm">
                    <MonitorPlay size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-800 mb-0.5">Phòng thi Live Exam</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">Tổ chức thi thử thời gian thực cho hàng trăm học sinh. Tích hợp thuật toán <b>Anti-Cheat</b> cảnh báo hành vi gian lận (chuyển tab, thu nhỏ cửa sổ).</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl shrink-0 mr-4 border border-rose-200 shadow-sm">
                    <BarChart3 size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-800 mb-0.5">Dashboard Bản đồ nhiệt (Heatmap)</h3>
                    <p className="text-slate-600 text-xs leading-relaxed">Thay vì chỉ xem điểm số, giáo viên nhận được Bản đồ nhiệt. Chỉ ra chính xác <b>điểm hổng kiến thức</b> của lớp để điều chỉnh giáo án bám sát thực tế.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 6: KỸ THUẬT & BẢO MẬT */}
          {currentSlide === 5 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold text-slate-800 font-heading">Chất lượng Kỹ thuật & Bảo mật</h2>
                <p className="text-sm text-slate-500">Kiến trúc hiện đại, an toàn dữ liệu tuyệt đối</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                <div className="bg-white border border-slate-200 border-t-2 border-t-blue-500 rounded-2xl p-6 space-y-4 shadow-sm bg-white/60">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="text-blue-600 font-bold">⚙</span>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Công nghệ lõi (Tech Stack)</h3>
                  </div>
                  
                  <ul className="space-y-3 text-xs">
                    <li className="flex items-start gap-2 text-slate-600">
                      <span className="text-cyan-500 font-bold">•</span>
                      <div>
                        <strong>Web-based (ReactJS):</strong> Giao diện mượt mà, hoạt động đa nền tảng.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 text-slate-600">
                      <span className="text-purple-500 font-bold">•</span>
                      <div>
                        <strong>Lõi xử lý FMATH AI (Llama-3):</strong> Tương tác tự nhiên, phản hồi tức thời.
                      </div>
                    </li>
                    <li className="flex items-start gap-2 text-slate-600">
                      <span className="text-emerald-500 font-bold">•</span>
                      <div>
                        <strong>Supabase & Firebase:</strong> Chịu tải thời gian thực lớn (Auto-scaling).
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 border-t-2 border-t-emerald-500 rounded-2xl p-6 space-y-3 shadow-sm bg-white/60">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="text-emerald-600 font-bold">🛡</span>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Security by Design</h3>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-emerald-600 mb-0.5 flex items-center gap-1"><Lock size={13} /> Row Level Security (RLS)</h4>
                      <p className="text-slate-600 text-[11px]">Bảo mật khóa chặt từng hàng dữ liệu tại Database. Học sinh không thể xem điểm số của người khác.</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-amber-500 mb-0.5 flex items-center gap-1"><Zap size={13} /> JWT Authentication</h4>
                      <p className="text-slate-600 text-[11px]">Phiên đăng nhập mã hóa qua Token, chống các cuộc tấn công đánh cắp phiên.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 7: HIỆU QUẢ THỰC CHỨNG */}
          {currentSlide === 6 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-3xl font-bold text-slate-800 font-heading text-center mb-4">Hiệu quả Thực chứng (Hơn 400 Học sinh)</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
                <div className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <h3 className="text-xs font-bold text-center text-slate-500 uppercase tracking-widest mb-4">Tác động Điểm số (THPTQG 2025 vs 2026)</h3>
                  
                  {/* Custom HTML Bar Chart styled with Tailwind */}
                  <div className="flex-1 flex items-end justify-around h-44 border-b border-slate-200 pb-2 px-6">
                    <div className="flex flex-col items-center gap-2 w-1/3">
                      <span className="text-xs font-bold text-slate-600">4.90 đ</span>
                      <div className="w-16 bg-slate-300 rounded-t-lg transition-all duration-1000 border border-slate-400" style={{ height: '110px' }}></div>
                      <span className="text-[11px] font-bold text-slate-500 text-center">THPTQG 2025</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-1/3">
                      <span className="text-xs font-bold text-primary">5.081 đ</span>
                      <div className="w-16 bg-primary rounded-t-lg transition-all duration-1000 border border-blue-600 shadow-md animate-pulse" style={{ height: '130px' }}></div>
                      <span className="text-[11px] font-bold text-slate-700 text-center">THPTQG 2026</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 mt-4 text-[12px] font-bold">
                    <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full border">ĐTB 2025: 4.900</div>
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full border">ĐTB 2026: 5.081</div>
                  </div>
                </div>

                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-around shadow-sm text-center">
                    <div>
                      <p className="text-xl font-bold text-blue-600 font-heading">517</p>
                      <p className="text-slate-500 text-[9px] uppercase font-extrabold mt-0.5">Tài khoản</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-purple-600 font-heading">1,504</p>
                      <p className="text-slate-500 text-[9px] uppercase font-extrabold mt-0.5">Lượt nộp bài</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-b from-amber-50 to-white border border-amber-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-2xl text-white shadow-md mb-3 border-2 border-white animate-bounce">
                      <Award size={24} />
                    </div>
                    
                    <h3 className="text-base font-bold text-amber-600 mb-1 font-heading">Thành tích Bứt phá</h3>
                    <p className="text-slate-700 text-xs leading-relaxed font-medium">
                      Đồng hành và góp phần giúp THPT FPT trở thành <br />
                      <b className="text-amber-800 text-[13px] bg-amber-100 px-2 py-0.5 rounded my-1.5 inline-block border border-amber-200 shadow-sm">Trường tư thục DUY NHẤT</b><br />
                      tại Cần Thơ có học sinh đạt<br />
                      <span className="text-red-600 font-extrabold text-2xl mt-1 block">ĐIỂM 10 TOÁN</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-2 font-semibold uppercase tracking-wider">(1 trong 32 điểm 10 toàn thành phố)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 8: TẦM NHÌN & DEMO */}
          {currentSlide === 7 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-bold text-slate-800 font-heading">Tầm nhìn & Trình diễn thực tế</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="bg-white border border-slate-200 border-t-4 border-t-blue-500 rounded-2xl p-8 flex flex-col justify-center shadow-sm">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4 border border-blue-200 shadow-sm">
                    <CloudLightning size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Sẵn sàng Nhân rộng</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    Kiến trúc Cloud linh hoạt, chi phí bảo trì cực thấp (Free-tier). Sẵn sàng chuyển giao công nghệ cho mọi trường THPT trên toàn quốc.<br /><br />
                    Tích hợp AI Thị giác máy tính (OCR) để chấm điểm tự luận viết tay trong tương lai.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-white border border-slate-200 border-t-4 border-t-purple-500 rounded-2xl p-8 flex flex-col justify-center items-center text-center shadow-sm">
                  <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600 mb-4 font-heading">
                    FMATH12
                  </h3>
                  <p className="text-sm text-slate-600 font-medium mb-6 italic">
                    "Người bạn đồng hành 24/7 trên hành trình chinh phục kỳ thi."
                  </p>
                  <button onClick={() => setActivePopup('bypass_role')} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full text-white font-bold text-sm transition-all shadow-[0_8px_15px_rgba(37,99,235,0.2)] hover:-translate-y-0.5 flex items-center gap-2 border border-blue-400">
                    <Play size={14} fill="white" /> Bắt đầu Trình diễn Sản phẩm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DÃY NÚT TÁC VỤ NHANH TRỰC TIẾP TRÊN SLIDE (LÀM NỔI POPUP THÔNG MINH) */}
          {slides[currentSlide].actions && (
            <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-200 max-w-5xl mx-auto w-full">
              <span className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                <Zap size={14} className="fill-primary" /> Tác vụ demo tại chỗ:
              </span>
              {slides[currentSlide].actions.map((act, i) => (
                <button
                  key={i}
                  onClick={act.action ? act.action : () => setActivePopup(act.popup || null)}
                  className="px-3.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 text-[11.5px] font-extrabold rounded-lg shadow-sm flex items-center gap-1.5 transition active:scale-95"
                >
                  <Play size={10} className="fill-blue-700 text-blue-700" /> {act.label}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* FOOTER ĐIỀU HƯỚNG SLIDE ĐẸP */}
        <div className="w-full flex justify-between items-center border-t border-slate-200 pt-6 shrink-0 relative z-10 max-w-6xl mx-auto">
          <button 
            onClick={() => {
              setCurrentSlide(prev => Math.max(prev - 1, 0));
              setActivePopup(null);
            }}
            disabled={currentSlide === 0}
            className="btn-secondary bg-white hover:bg-slate-100 border-slate-200 text-slate-600 px-4 py-2 disabled:opacity-40 text-[13px] shadow-sm flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Slide trước
          </button>

          {/* Dãy số slide */}
          <div className="flex gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentSlide(idx);
                  setActivePopup(null);
                }}
                className={`w-8 h-8 rounded-lg font-bold text-[12px] border transition-all ${
                  currentSlide === idx 
                    ? 'bg-primary text-white border-primary shadow-sm scale-110' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              setCurrentSlide(prev => Math.min(prev + 1, 8 - 1));
              setActivePopup(null);
            }}
            disabled={currentSlide === 8 - 1}
            className="btn-primary px-4 py-2 text-[13px] shadow-md flex items-center gap-1"
          >
            Slide sau <ArrowRight size={16} />
          </button>
        </div>

      </div>

      {/* ==========================================
          BỘ CÁC POPUP NỔI TRỰC TIẾP (FLOATING INTERACTIVE MODALS - SÁNG ĐẸP)
          ========================================== */}
      
      {/* 1. Popup Số liệu Slide 1 (Stats) */}
      {activePopup === 'stats' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2 border-b pb-2">
              <Sparkles className="text-primary" size={18} /> Số liệu thực chứng FMath12
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide block">Lượt nộp bài</span>
                <span className="block text-3xl font-black text-slate-850 mt-1">{visitorCount}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                <span className="text-[11px] font-bold text-emerald-700 block">Số tài khoản sinh viên</span>
                <span className="block text-3xl font-black text-slate-850 mt-1">517</span>
              </div>
            </div>
            <button onClick={triggerStatsUpdate} disabled={updatingStats} className="w-full btn-primary py-2.5 text-[13px] flex items-center justify-center gap-2">
              <RefreshCw size={15} className={updatingStats ? 'animate-spin' : ''} />
              Simulate có thêm 1 lượt nộp bài
            </button>
          </div>
        </div>
      )}

      {/* 2. Popup Khảo sát chi tiết Slide 2 (Survey Details) */}
      {activePopup === 'survey_detail' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2 border-b pb-2">
              <AlertTriangle className="text-red-500" size={18} /> Kết quả Khảo sát THPT Cần Thơ (304 HS)
            </h3>
            <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed">
              <p>Khảo sát rào cản tự học Toán 12 ghi nhận số liệu cụ thể:</p>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                <div className="flex justify-between text-slate-700 font-bold"><span>1. GPA Toán trung bình lớp 12:</span> <span className="text-red-600">5.11 / 10.0</span></div>
                <div className="flex justify-between text-slate-700 font-bold"><span>2. Tỉ lệ dưới 7.0 điểm:</span> <span className="text-[#fd7e14]">85.86%</span></div>
                <div className="flex justify-between text-slate-700 font-bold"><span>3. Không có hướng dẫn kịp thời:</span> <span className="text-[#fd7e14]">91.2% học sinh</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Popup So sánh Tĩnh vs Động Slide 2 */}
      {activePopup === 'ai_explain_compare' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2 border-b pb-2">
              <BrainCircuit className="text-primary" size={18} /> Tháo gỡ nút thắt lỗi sai bằng AI Động
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-red-200 space-y-2">
                <span className="text-[10px] font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded border border-red-200 uppercase">Học liệu Tĩnh (Cũ)</span>
                <p className="text-slate-700">Cho hàm số {renderLatex('y=x^3-3x')}. Đồ thị có bao nhiêu cực trị?</p>
                <button onClick={() => setSelectedAnswer('B')} className="w-full text-left p-2 border border-slate-200 rounded bg-white hover:bg-slate-50 font-bold">Đáp án: 2 cực trị</button>
                {selectedAnswer && <div className="text-red-700 bg-red-50 p-2 rounded border border-red-100 mt-2 font-medium">Lỗi: Hệ thống chỉ báo đúng/sai (Không giải thích logic step-by-step).</div>}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-green-200 space-y-2">
                <span className="text-[10px] font-bold text-green-600 bg-green-100/50 px-2 py-0.5 rounded border border-green-200 uppercase">Gia sư AI Động (FMATH12)</span>
                <button onClick={handleSendAiExplain} disabled={aiQuestionLoading} className="w-full btn-primary py-2 text-[11px] flex items-center justify-center gap-1">
                  <BrainCircuit size={14} /> Hỏi AI Tutor giải thích tại chỗ
                </button>
                {aiQuestionReply && <div className="text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-100 leading-relaxed font-semibold">{aiQuestionReply}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Student Sandbox Slide 3 */}
      {activePopup === 'student_sandbox' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2 border-b pb-2">
              <GraduationCap className="text-primary" size={18} /> Hộp cát thử nghiệm Học sinh (Student Workspace)
            </h3>
            
            <div className="space-y-4">
              {/* LaTeX live render */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase">1. Soạn thảo công thức Toán (KaTeX Render):</label>
                <input 
                  type="text" 
                  value={studentMathInput} 
                  onChange={(e) => setStudentMathInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-mono text-[12px] outline-none focus:border-primary"
                />
                <div className="p-3 bg-slate-100 rounded-xl text-center text-lg flex items-center justify-center text-slate-800 border border-slate-200">
                  {renderLatex(studentMathInput)}
                </div>
              </div>

              {/* Offline Tolerance */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-[12px]">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">2. Mô phỏng rớt mạng: {isOffline ? '🔴 OFFLINE' : '🟢 ONLINE'}</span>
                  <label className="relative inline-block w-10 h-5 cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isOffline} onChange={(e) => toggleOfflineMode(e.target.checked)} />
                    <div className="w-full h-full bg-slate-300 peer-checked:bg-[#dc3545] rounded-full"></div>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isOffline ? 'translate-x-5' : ''}`}></div>
                  </label>
                </div>
                <input 
                  type="text" 
                  value={offlineAnswer} 
                  onChange={(e) => handleOfflineType(e.target.value)}
                  placeholder="Gõ thử câu trả lời thi..." 
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-800 outline-none"
                />
                {offlineSyncMessage && <div className="text-emerald-700 text-center font-bold text-[11px] mt-1">{offlineSyncMessage}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Groq AI Tutor Slide 4 */}
      {activePopup === 'ai_tutor' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full h-[500px] flex flex-col justify-between shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] border-b pb-2 shrink-0 flex items-center gap-2">
              <BrainCircuit className="text-primary animate-pulse" size={18} /> HỘI THOẠI TRỰC TIẾP VỚI GIA SƯ AI
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-3 text-[12px] pr-1">
              {aiTutorChat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.role === 'user' ? 'bg-primary text-white font-semibold' : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {aiTutorLoading && (
                <div className="text-slate-400 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2 border-t border-slate-200 pt-3 shrink-0">
              <input 
                type="text" 
                value={aiTutorPrompt} 
                onChange={(e) => setAiTutorPrompt(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiTutor()}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none"
                disabled={aiTutorLoading}
              />
              <button onClick={handleSendAiTutor} disabled={aiTutorLoading} className="btn-primary px-4 py-2"><Send size={15} /></button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Class Heatmap Slide 5 */}
      {activePopup === 'heatmap' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 border-b pb-2 flex items-center gap-2">
              <MonitorPlay className="text-[#fd7e14]" size={18} /> Bản đồ nhiệt Năng lực các lớp học
            </h3>
            
            <div className="overflow-x-auto text-[12px] bg-slate-50 p-4 rounded-xl border border-slate-200">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b text-slate-500 pb-2">
                    <th className="p-2 text-left">Lớp</th>
                    <th className="p-2">Hàm số</th>
                    <th className="p-2">Mũ & Log</th>
                    <th className="p-2">Tích phân</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-800">
                  {heatmapData.map((cls, idx) => (
                    <tr key={cls.name}>
                      <td className="p-2 text-left font-bold">{cls.name}</td>
                      {cls.scores.slice(0, 3).map((score, sIdx) => {
                        let cellClass = 'bg-red-100 text-red-700 border-red-200';
                        if (score >= 80) cellClass = 'bg-green-100 text-green-700 border-green-200';
                        else if (score >= 55) cellClass = 'bg-amber-100 text-amber-700 border-amber-200';

                        return (
                          <td 
                            key={sIdx} 
                            onClick={() => updateHeatmapCell(idx, sIdx)}
                            className={`p-2 border cursor-pointer hover:opacity-85 transition font-bold rounded ${cellClass}`}
                          >
                            {score}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Anti-cheat Live Monitoring Slide 5 */}
      {activePopup === 'monitoring' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2 border-b pb-2">
              <ShieldAlert className="text-red-500" size={18} /> Hệ thống giám sát thi cử Anti-Cheat
            </h3>
            
            <div className="space-y-3">
              <button onClick={simulateTabSwitch} className="w-full btn-danger py-2 text-[13px] flex items-center justify-center gap-1.5">
                <ShieldAlert size={15} /> Giả lập học sinh chuyển tab hoặc rời ứng dụng
              </button>
              <div className="bg-slate-950 p-4 rounded-2xl font-mono text-[11px] text-green-400 h-40 overflow-y-auto custom-scrollbar space-y-2 border border-white/5">
                {violationLogs.map((log, i) => (
                  <div key={i} className={log.includes('CẢNH BÁO') ? 'text-red-400 font-bold animate-pulse' : ''}>{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. RLS Security test Slide 6 */}
      {activePopup === 'rls' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 flex items-center gap-2 border-b pb-2">
              <ShieldCheck className="text-primary" size={18} /> Kiểm thử bảo mật cơ sở dữ liệu Supabase RLS
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <button onClick={() => testRLS('self')} className="p-3 border border-slate-200 bg-slate-50 rounded-2xl text-left hover:border-primary transition">
                <span className="text-[12px] font-bold text-primary block">User A đăng nhập</span>
                <span className="text-[10px] text-slate-500 mt-1 block">SELECT * FROM exam_attempts WHERE user_id = A</span>
              </button>
              <button onClick={() => testRLS('other')} className="p-3 border border-slate-200 bg-slate-50 rounded-2xl text-left hover:border-red-500 transition">
                <span className="text-[12px] font-bold text-red-500 block">User B đăng nhập</span>
                <span className="text-[10px] text-slate-500 mt-1 block">SELECT * FROM exam_attempts WHERE user_id = A</span>
              </button>
            </div>

            <div className="bg-slate-950 font-mono text-[11.5px] p-4 rounded-xl border border-white/5 text-center min-h-[80px] flex items-center justify-center text-green-400">
              <span className={rlsStatus === 'error' ? 'text-red-400 font-bold' : rlsStatus === 'success' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {rlsLog}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 9. GPA Efficacy chart Slide 7 */}
      {activePopup === 'gpa_chart' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-[15px] m-0 flex items-center gap-2">
                <Trophy className="text-[#ffc107]" size={18} /> Biểu đồ thực chứng hiệu quả GPA
              </h3>
              <div className="inline-flex rounded bg-slate-100 p-0.5 border border-slate-200">
                <button onClick={() => setEfficacyMode('before')} className={`px-2.5 py-1 text-[10px] font-bold rounded transition ${efficacyMode === 'before' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500'}`}>Trước</button>
                <button onClick={() => setEfficacyMode('after')} className={`px-2.5 py-1 text-[10px] font-bold rounded transition ${efficacyMode === 'after' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500'}`}>Sau</button>
              </div>
            </div>

            <div className="space-y-4">
              {efficacyMode === 'before' ? (
                <div className="space-y-3 py-2 animate-in fade-in">
                  <div>
                    <div className="flex justify-between text-[11.5px] font-bold text-slate-500 mb-1">
                      <span>GPA Trung bình khối 12</span>
                      <span>4.90 / 10.0</span>
                    </div>
                    <div className="h-3.5 bg-slate-100 border rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 w-[49%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11.5px] font-bold text-slate-500 mb-1"><span>Tỷ lệ dưới 7.0 điểm</span> <span>85.86%</span></div>
                    <div className="h-3.5 bg-slate-100 border rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 w-[85.86%]"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-2 animate-in zoom-in-95">
                  <div>
                    <div className="flex justify-between text-[11.5px] font-bold text-primary mb-1">
                      <span>GPA Trung bình - Tăng mạnh (+0.18 đ)</span>
                      <span>5.081 / 10.0</span>
                    </div>
                    <div className="h-3.5 bg-slate-100 border rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[50.81%]"></div>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[11px] font-bold text-center animate-bounce">
                    🏆 THPT FPT có học sinh đạt điểm 10 môn Toán tốt nghiệp duy nhất TP. Cần Thơ!
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. Bypass Role slide 8 */}
      {activePopup === 'bypass_role' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95">
            <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><X size={20} /></button>
            <h3 className="font-bold text-slate-800 text-[15px] mb-4 border-b pb-2 flex items-center gap-2">
              <Play className="text-primary fill-primary" size={16} /> BẮT ĐẦU TRẢI NGHIỆM CHI TIẾT
            </h3>
            
            <div className="flex flex-col gap-2.5">
              <button 
                onClick={() => handleStartDemo('student')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-left transition flex items-start gap-3 group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <User size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-[13.5px] text-slate-800 m-0 group-hover:text-primary transition-colors flex items-center gap-1">Học sinh <ChevronRight size={12} /></h5>
                  <span className="text-[10.5px] text-slate-500 block mt-0.5 leading-snug">Vào xem Lộ trình thích ứng, Làm đề & Hỏi gia sư AI Tutor</span>
                </div>
              </button>

              <button 
                onClick={() => handleStartDemo('teacher')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3.5 text-left transition flex items-start gap-3 group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Users size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-[13.5px] text-slate-800 m-0 group-hover:text-amber-500 transition-colors flex items-center gap-1">Giáo viên <ChevronRight size={12} /></h5>
                  <span className="text-[10.5px] text-slate-500 block mt-0.5 leading-snug">Vào xem Bản đồ nhiệt lớp học, Tổ chức thi Live & Giám sát tab</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Showcase;
