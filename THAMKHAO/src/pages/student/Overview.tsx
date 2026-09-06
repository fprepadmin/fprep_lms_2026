import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, TrendingUp, BookOpen, Target, 
  Zap, ArrowRight, BrainCircuit, PlayCircle, Loader2, Users,
  Flame, Award, Video, Radio, BarChart3, AlertTriangle, ChevronRight, Compass
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { courseService } from '../../services/courseService';
import { supabase } from '../../config/supabase';
import { askGroqAI } from '../../services/groqAI';

const Dashboard = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  
  const [chapters, setChapters] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [aiTutorMessage, setAiTutorMessage] = useState<string>('');
  const [aiGoals, setAiGoals] = useState<any[]>([]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Thiết lập lời chào
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');
  }, []);

  // Fetch lộ trình học tập và lịch sử thi cử của học sinh để AI phân tích
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.id) return;
      setIsLoading(true);
      try {
        const curriculumData = await courseService.getCurriculum(currentUser.id);
        setChapters(curriculumData || []);

        const attemptsResponse = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('user_id', currentUser.id);

        let finalAttempts: any[] = [];
        if (attemptsResponse?.data && attemptsResponse.data.length > 0) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const examIds = Array.from(new Set(
            attemptsResponse.data
              .map(att => att.exam_id)
              .filter(id => id && uuidRegex.test(id))
          ));
          if (examIds.length > 0) {
            const { data: examsData } = await supabase
              .from('exams')
              .select('id, title, description')
              .in('id', examIds);

            const examsMap = new Map(examsData?.map(e => [e.id, e]) || []);
            finalAttempts = attemptsResponse.data.map(att => ({
              ...att,
              exams: examsMap.get(att.exam_id) || null
            }));
          } else {
            finalAttempts = attemptsResponse.data;
          }
        }
        setAttempts(finalAttempts);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu học sinh:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser.id]);

  const getFallbackTutorMessage = (currentSkills: any[]) => {
    if (!currentSkills || currentSkills.length === 0) return "Chào bạn! Tôi là FMath AI Tutor. Tôi sẽ giúp bạn giải đáp mọi thắc mắc Toán 24/7.";
    const sorted = [...currentSkills].sort((a, b) => a.score - b.score);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    return `AI Tutor đã hoàn tất phân tích ${attempts.length} lượt thi của bạn. Nhận thấy bạn thạo nhất mảng [${strongest.topic}] và cần tập trung bồi dưỡng mảng [${weakest.topic}]. Nhấn vào để chat sâu hơn!`;
  };

  const generateAiPersonalization = async (currentSkills: any[]) => {
    if (!currentSkills || currentSkills.length === 0) return;

    const cacheKey = `fmath_ai_pers_${currentUser.id}`;
    const cachedDataStr = localStorage.getItem(cacheKey);
    const currentXp = currentUser.xp || 0;
    const currentAttemptsCount = attempts.length;

    if (cachedDataStr) {
      try {
        const cached = JSON.parse(cachedDataStr);
        if (cached.xp === currentXp && cached.attemptsCount === currentAttemptsCount && cached.tutorMessage && cached.goals) {
          setAiTutorMessage(cached.tutorMessage);
          setAiGoals(cached.goals);
          return;
        }
      } catch (e) {
        console.warn("Lỗi đọc cache AI:", e);
      }
    }

    if (isAiLoading) return;
    setIsAiLoading(true);
    
    const sorted = [...currentSkills].sort((a, b) => a.score - b.score);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];

    const skillSummary = currentSkills.map(s => `- ${s.name}: ${s.score}% (Mức độ thạo)`).join('\n');
    
    const prompt = `Học sinh lớp 12 có hồ sơ năng lực Toán học sau:
${skillSummary}

Hãy thực hiện 2 nhiệm vụ:
1. Đóng vai FMath AI Tutor để đưa ra 1 lời khích lệ/nhận xét cá nhân hóa cực ngắn gọn (tối đa 3 câu, khoảng 60 từ) chỉ rõ điểm mạnh nhất (${strongest.topic}) và điểm yếu cần cải thiện ngay (${weakest.topic}). Xưng hô "Thầy" - "Em".
2. Đề xuất đúng 2 mục tiêu/nhiệm vụ học tập cụ thể, hành động được để cải thiện điểm yếu (${weakest.topic}).

Trả về kết quả dưới dạng đối tượng JSON duy nhất có cấu trúc sau:
{
  "tutorMessage": "Lời chào mừng và nhận xét từ AI Tutor...",
  "goals": [
    { "title": "Tiêu đề nhiệm vụ 1", "desc": "Mô tả chi tiết nhiệm vụ và lý do", "action": "Nhãn nút bấm (ví dụ: Luyện tập ngay, Ôn lý thuyết)", "path": "Đường dẫn chuyển hướng (chỉ chọn '/quiz' hoặc '/theory')" },
    { "title": "Tiêu đề nhiệm vụ 2", "desc": "Mô tả chi tiết nhiệm vụ và lý do", "action": "Nhãn nút bấm (ví dụ: Luyện tập ngay, Ôn lý thuyết)", "path": "Đường dẫn chuyển hướng (chỉ chọn '/quiz' hoặc '/theory')" }
  ]
}
Không trả lời thêm bất kỳ từ nào ngoài JSON trên.`;

    try {
      const responseText = await askGroqAI(
        "Bạn là trợ lý AI cá nhân hóa lộ trình học tập Toán 12 của THPT FPT Cần Thơ. Bạn chỉ trả về JSON theo đúng cấu trúc yêu cầu.", 
        prompt, 
        true
      );

      if (responseText) {
        const parsed = JSON.parse(responseText);
        if (parsed.tutorMessage && Array.isArray(parsed.goals)) {
          setAiTutorMessage(parsed.tutorMessage);
          setAiGoals(parsed.goals);
          
          localStorage.setItem(cacheKey, JSON.stringify({
            xp: currentXp,
            attemptsCount: currentAttemptsCount,
            tutorMessage: parsed.tutorMessage,
            goals: parsed.goals
          }));
        }
      }
    } catch(err) {
      console.error("Lỗi gọi Groq AI gợi ý lộ trình:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading || chapters.length === 0) return;
    const currentSkills = getAdaptiveSkills();
    generateAiPersonalization(currentSkills);
  }, [attempts, chapters, isLoading]);

  // Bộ 7 chuyên đề Toán 12 bao quát và giải thuật AI phân tích từ kết quả làm bài trước đó
  const getAdaptiveSkills = () => {
    const baseTopics = [
      { id: 'ham_so', name: 'Sự đồng biến, nghịch biến & Cực trị Hàm số', keywords: ['hàm số', 'cực trị', 'tiệm cận', 'đơn điệu', 'đồ thị'], defaultScore: 52, topic: 'Hàm số' },
      { id: 'mu_log', name: 'Hàm số Lũy thừa, Mũ & Lôgarit', keywords: ['mũ', 'logarit', 'lũy thừa', 'log'], defaultScore: 48, topic: 'Mũ & Log' },
      { id: 'tich_phan', name: 'Nguyên hàm, Tích phân & Ứng dụng', keywords: ['nguyên hàm', 'tích phân', 'tích phân', 'hình phẳng'], defaultScore: 42, topic: 'Tích phân' },
      { id: 'hinh_hoc', name: 'Khối đa diện & Thể tích hình khối', keywords: ['hình học', 'thể tích', 'đa diện', 'khối chóp', 'lăng trụ'], defaultScore: 56, topic: 'Hình học' },
      { id: 'oxyz', name: 'Phương pháp tọa độ trong không gian (Oxyz)', keywords: ['oxyz', 'tọa độ', 'mặt phẳng', 'đường thẳng', 'mặt cầu'], defaultScore: 38, topic: 'Toạ độ Oxyz' },
      { id: 'so_phuc', name: 'Số phức & Các phép toán liên quan', keywords: ['số phức', 'phần thực', 'phần ảo'], defaultScore: 35, topic: 'Số phức' },
      { id: 'xac_suat', name: 'Tổ hợp, Xác suất & Thống kê 12', keywords: ['xác suất', 'tổ hợp', 'chỉnh hợp', 'thống kê'], defaultScore: 50, topic: 'Xác suất' }
    ];

    return baseTopics.map(topic => {
      // 1. Lọc các lượt thi liên quan (Dữ liệu thật từ attempts)
      const relatedAttempts = attempts.filter(att => {
        const title = (att.exams?.title || '').toLowerCase();
        const desc = (att.exams?.description || '').toLowerCase();
        return topic.keywords.some(kw => title.includes(kw) || desc.includes(kw));
      });

      let hasAttempts = relatedAttempts.length > 0;
      let attemptsScore = 0;
      if (hasAttempts) {
        const total = relatedAttempts.reduce((acc, curr) => {
          const s = curr.score <= 10 ? curr.score * 10 : curr.score;
          return acc + s;
        }, 0);
        attemptsScore = total / relatedAttempts.length;
      }

      // 2. Lọc bài học liên quan (Dữ liệu thật từ chapters/lessons)
      let totalLessons = 0;
      let completedLessons = 0;
      chapters.forEach(chap => {
        const chapTitle = (chap.title || '').toLowerCase();
        const isTopicChapter = topic.keywords.some(kw => chapTitle.includes(kw));
        
        chap.lessons?.forEach((les: any) => {
          const lesTitle = (les.title || '').toLowerCase();
          if (isTopicChapter || topic.keywords.some(kw => lesTitle.includes(kw))) {
            totalLessons++;
            if (les.isCompleted) {
              completedLessons++;
            }
          }
        });
      });

      let hasProgress = totalLessons > 0;
      let progressPercent = hasProgress ? (completedLessons / totalLessons) * 100 : 0;

      // 3. Tính điểm thực tế dựa trên kết quả và tiến độ học tập thực tế
      let score = 0;
      let isAiAnalyzed = false;

      if (hasAttempts && hasProgress) {
        score = Math.round(attemptsScore * 0.7 + progressPercent * 0.3);
        isAiAnalyzed = true;
      } else if (hasAttempts) {
        score = Math.round(attemptsScore);
        isAiAnalyzed = true;
      } else if (hasProgress) {
        // Tăng nhẹ chỉ số dựa trên số bài học thực tế đã hoàn thành
        score = Math.round(progressPercent);
        isAiAnalyzed = completedLessons > 0;
      } else {
        // Nếu hoàn toàn chưa học, gán trị mặc định cực nhỏ phản ánh mức độ sơ khởi, không dùng cố định cao
        score = 0;
        isAiAnalyzed = false;
      }

      return {
        ...topic,
        score: Math.min(Math.max(score, 0), 100),
        isAiAnalyzed
      };
    });
  };

  const skills = getAdaptiveSkills();

  // Tìm kiếm lỗ hổng kiến thức chính xác dựa trên điểm số thực tế của học sinh
  const getWeakSpots = () => {
    if (aiGoals && aiGoals.length > 0) {
      return aiGoals;
    }

    const spots = [];
    const sortedSkills = [...skills].sort((a, b) => a.score - b.score);
    
    if (sortedSkills[0]) {
      const isReal = sortedSkills[0].isAiAnalyzed;
      spots.push({
        title: `Củng cố: ${sortedSkills[0].name}`,
        desc: isReal 
          ? `AI phân tích: Bạn có trung bình ${sortedSkills[0].score}% ở phần này từ bài thi trước. Hãy rèn luyện thêm.`
          : `Độ thạo ước tính hiện tại: ${sortedSkills[0].score}%. Bạn chưa thực hành chuyên đề này nhiều.`,
        action: 'Luyện tập ngay',
        path: '/quiz'
      });
    }

    if (sortedSkills[1]) {
      const isReal = sortedSkills[1].isAiAnalyzed;
      spots.push({
        title: `Ôn tập: ${sortedSkills[1].name}`,
        desc: isReal 
          ? `Ghi nhận hổng kiến thức ở các đề kiểm tra chuyên đề. Mức độ đạt: ${sortedSkills[1].score}%.`
          : `Hệ thống đề xuất bạn bổ trợ kiến thức lý thuyết phần này (Điểm thạo: ${sortedSkills[1].score}%).`,
        action: 'Ôn Lý thuyết',
        path: '/theory'
      });
    }

    return spots;
  };

  const weakSpots = getWeakSpots();

  return (
    <div className="page-container animate-in fade-in duration-300">
      <div className="page-content">
        <div className="max-w-7xl mx-auto space-y-6">
        
          {/* ==============================
              1. HEADER & LỜI CHÀO
              ============================== */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-bold font-heading text-[#212529] mb-1">
                {greeting}, {currentUser.name ? currentUser.name.split(' ').pop() : 'Bạn'}! 👋
              </h1>
              <p className="text-[#6c757d] text-[14px]">
                Hệ thống học tập thích ứng AI đã tổng hợp phân tích kết quả học tập của bạn.
              </p>
            </div>
            <button 
              onClick={() => navigate('/quiz')}
              className="btn-primary"
            >
              <PlayCircle size={16} /> Vào làm bài ngay
            </button>
          </div>

          {/* ==============================
              2. THẺ CHỈ SỐ (METRIC CARDS CHUẨN BOOTSTRAP)
              ============================== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Kinh nghiệm" 
              value={(currentUser.xp || 0).toLocaleString()} 
              suffix="XP"
              icon={<Zap size={22} />} 
              colorClass="text-primary bg-[#e7f1ff]" 
            />
            <MetricCard 
              title="Cấp độ hiện tại" 
              value={currentUser.level || 1} 
              suffix="Lv"
              icon={<Award size={22} />} 
              colorClass="text-[#198754] bg-[#d1e7dd]" 
            />
            <MetricCard 
              title="Chuỗi học tập" 
              value={currentUser.streak || 0} 
              suffix="Ngày"
              icon={<Flame size={22} />} 
              colorClass="text-[#dc3545] bg-[#f8d7da]" 
            />
            <MetricCard 
              title="Thứ hạng" 
              value="---" 
              suffix=""
              icon={<Trophy size={22} />} 
              colorClass="text-[#ffc107] bg-[#fff3cd]" 
            />
          </div>

          {/* ==============================
              3. NỘI DUNG CHÍNH (TIẾN ĐỘ & AI GỢI Ý)
              ============================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* TIẾN ĐỘ & LỘ TRÌNH THÍCH ỨNG (COL SPAN 2) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* LỘ TRÌNH HỌC TẬP CHUẨN */}
              <div className="flat-card flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-[#e9ecef] pb-3">
                  <h2 className="flex items-center gap-2 m-0 text-[#212529] text-[16px] font-bold">
                    <Target size={18} className="text-primary" /> Lộ trình học tập lớp học
                  </h2>
                  <button onClick={() => navigate('/theory')} className="text-[13px] font-medium text-primary hover:underline">
                    Xem chi tiết
                  </button>
                </div>
                
                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center text-[#6c757d] py-12">
                      <Loader2 className="animate-spin mb-2 text-primary" size={24}/> 
                      <span className="text-[13px]">Đang tải dữ liệu...</span>
                    </div>
                  ) : chapters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-[#adb5bd] py-12 bg-[#f8f9fa] rounded border border-dashed border-[#dee2e6]">
                      <TrendingUp size={32} className="mb-2 opacity-50" />
                      <p className="font-medium text-[13px] m-0">Chưa có dữ liệu chương trình học.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chapters.slice(0, 4).map((chap, idx) => {
                        const totalLessons = chap.lessons?.length || 0;
                        const completedLessons = chap.lessons?.filter((l:any) => l.isCompleted).length || 0;
                        const progress = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
                        
                        const colors = ['bg-[#0d6efd]', 'bg-[#198754]', 'bg-[#0dcaf0]', 'bg-[#6f42c1]'];
                        const barColor = colors[idx % 4];

                        return (
                          <div key={chap.id} className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-[13px] font-medium text-[#495057]">
                              <span className="truncate pr-4">{chap.title}</span>
                              <span className="font-ui font-semibold">{progress}%</span>
                            </div>
                            <div className="h-2 bg-[#e9ecef] rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out`} style={{width: `${progress}%`}}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* HỆ SINH THÁI THÍCH ỨNG BAO QUÁT (ADAPTIVE LEARNING) */}
              <div className="flat-card flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-[#e9ecef] pb-3">
                  <h2 className="flex items-center gap-2 m-0 text-[#212529] text-[16px] font-bold">
                    <Compass size={18} className="text-primary" /> Bản đồ năng lực thích ứng (AI Adaptive Learning)
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-[#e7f1ff] border border-[#b6d4fe] px-2 py-0.5 rounded">Phân tích đa chiều</span>
                </div>
                
                <div className="space-y-4">
                  <p className="text-[13px] text-[#6c757d] m-0 leading-relaxed">
                    Hệ thống tự động quét tất cả bài tập đã làm của bạn trong cơ sở dữ liệu để vẽ biểu đồ thông thạo 7 mảng kiến thức Toán 12 bao quát.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {skills.map((skill, index) => {
                      // Phân loại màu sắc và nhãn theo điểm số thạo
                      let statusText = 'Yếu';
                      let colorClass = 'text-[#dc3545]';
                      let barColor = 'bg-[#dc3545]';
                      
                      if (skill.score >= 80) {
                        statusText = 'Thạo';
                        colorClass = 'text-[#198754]';
                        barColor = 'bg-[#198754]';
                      } else if (skill.score >= 55) {
                        statusText = 'Trung bình';
                        colorClass = 'text-[#fd7e14]';
                        barColor = 'bg-[#fd7e14]';
                      }

                      return (
                        <div key={index} className="p-3 bg-[#f8f9fa] border border-[#dee2e6] rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-[#b6d4fe] hover:bg-white transition-all">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-wide">{skill.topic}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                skill.isAiAnalyzed 
                                  ? 'bg-[#d1e7dd] text-[#0f5132] border border-[#a3cfbb]' 
                                  : 'bg-[#e9ecef] text-[#6c757d] border border-[#dee2e6]'
                              }`} title={skill.isAiAnalyzed ? 'Được phân tích từ bài làm' : 'Ước lượng gián tiếp theo năng lực chung'}>
                                {skill.isAiAnalyzed ? 'AI Phân tích' : 'Ước lượng'}
                              </span>
                            </div>
                            <h4 className="text-[13px] font-bold text-[#212529] m-0 line-clamp-1 leading-tight">{skill.name}</h4>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[11px] text-[#495057] font-semibold">
                              <span className={`font-bold ${colorClass}`}>{statusText}</span>
                              <span>{skill.score}%</span>
                            </div>
                            <div className="h-1.5 bg-[#e9ecef] rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${skill.score}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
            
            {/* AI GỢI Ý & CÁ NHÂN HÓA MỤC TIÊU (COL SPAN 1) */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              
              {/* TRÍ TUỆ NHÂN TẠO (AI TUTOR & GỢI Ý CHUYÊN SÂU) */}
              <div className="flat-card bg-[#e7f1ff] border-[#b6d4fe] flex flex-col h-fit">
                <h2 className="flex items-center gap-2 m-0 mb-3 text-[#084298] text-[16px] font-bold">
                  <BrainCircuit size={18} /> Trí tuệ nhân tạo (AI Tutor)
                </h2>
                
                <div className="text-[13px] text-[#052c65] leading-relaxed mb-4 min-h-[50px] flex items-center">
                  {isAiLoading ? (
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#084298]">
                      <Loader2 className="animate-spin text-primary" size={16}/>
                      <span>AI Tutor đang phân tích kết quả học tập...</span>
                    </div>
                  ) : (
                    aiTutorMessage || getFallbackTutorMessage(skills)
                  )}
                </div>
                
                <button onClick={() => navigate('/theory')} className="btn-primary w-full shadow-sm">
                  Trò chuyện với AI Tutor <ArrowRight size={16} />
                </button>
              </div>

              {/* CÁ NHÂN HÓA MỤC TIÊU - LỖ HỔNG KIẾN THỨC THỰC TẾ */}
              <div className="flat-card bg-white flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-[#e9ecef] pb-3">
                  <h3 className="font-bold text-[#212529] text-[15px] font-heading m-0 flex items-center gap-1.5">
                    <AlertTriangle className="text-[#fd7e14]" size={16} /> Cá nhân hóa Mục tiêu
                  </h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#997404] bg-[#fff3cd] border border-[#ffecb5] px-1.5 py-0.5 rounded">AI Đề xuất</span>
                </div>

                <div className="space-y-3">
                  {weakSpots.length === 0 ? (
                    <p className="text-[13px] text-[#6c757d] m-0 text-center py-4">Tuyệt vời! Hiện chưa phát hiện lỗ hổng kiến thức nghiêm trọng nào.</p>
                  ) : (
                    weakSpots.map((spot, idx) => (
                      <div key={idx} className="p-3 bg-[#fff3cd]/40 border border-[#ffecb5]/70 rounded-xl space-y-2 flex flex-col justify-between hover:border-[#ffc107] transition-all">
                        <div>
                          <h4 className="text-[13px] font-bold text-[#664d03] m-0 line-clamp-1">{spot.title}</h4>
                          <p className="text-[12px] text-[#664d03] m-0 mt-0.5 leading-snug">{spot.desc}</p>
                        </div>
                        <button 
                          onClick={() => navigate(spot.path)}
                          className="text-[12px] font-bold text-primary hover:text-[#0b5ed7] inline-flex items-center gap-1 mt-1 hover:underline text-left"
                        >
                          {spot.action} <ChevronRight size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MỤC TIÊU TUẦN NÀY */}
              <div className="flat-card bg-[#fff3cd] border-[#ffecb5]">
                <div className="flex items-start gap-3">
                  <div className="text-[#997404] mt-0.5"><Trophy size={20}/></div>
                  <div>
                    <h3 className="font-bold text-[#664d03] text-[14px] m-0 mb-1">Mục tiêu tuần này</h3>
                    <p className="text-[12px] text-[#664d03] m-0">Đạt 500 XP để nâng hạng Đồng.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ==============================
              4. MENU TRUY CẬP NHANH
              ============================== */}
          <h3 className="text-[#212529] text-[16px] font-bold mt-6 mb-3">Phân hệ học tập</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <ActionCard icon={<BookOpen />} title="Lý thuyết" desc="Đọc & Ghi nhớ" onClick={() => navigate('/theory')} />
            <ActionCard icon={<Radio />} title="Phòng thi Live" desc="Nhập mã dự thi" badge="Khảo thí" onClick={() => navigate('/join-live')} />
            <ActionCard icon={<Video />} title="Bài giảng & Tài liệu" desc="Video & Tệp PDF" badge="Hot" onClick={() => navigate('/resources')} />
            <ActionCard icon={<Target />} title="Luyện đề" desc="Trắc nghiệm & Tự luận" badge="Mới" onClick={() => navigate('/quiz')} />
            <ActionCard icon={<Users />} title="Lớp học" desc="Không gian thảo luận" onClick={() => navigate('/classroom')} />
            <ActionCard icon={<Trophy />} title="Xếp hạng" desc="Bảng vàng thành tích" onClick={() => navigate('/leaderboard')} />
          </div>

        </div>
      </div>
    </div>
  );
};

// Component Thẻ Chỉ Số (Metric Card)
const MetricCard = ({ title, value, suffix, icon, colorClass }: any) => (
  <div className="flat-card flex items-center gap-4 p-4">
    <div className={`w-12 h-12 rounded flex items-center justify-center shrink-0 ${colorClass}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px] font-semibold text-[#6c757d] uppercase tracking-wider mb-0.5 truncate">{title}</div>
      <div className="text-xl font-bold font-ui text-[#212529]">
        {value} <span className="text-[14px] text-[#adb5bd] font-medium">{suffix}</span>
      </div>
    </div>
  </div>
);

// Component Thẻ Menu
const ActionCard = ({ icon, title, desc, onClick, badge }: any) => (
  <button 
    onClick={onClick} 
    className="flat-card-interactive flex flex-col items-start p-4 text-left relative group border-l-4 border-l-transparent hover:border-l-primary"
  >
    {badge && (
      <span className="absolute top-3 right-3 badge-danger">
        {badge}
      </span>
    )}
    <div className="text-[#6c757d] group-hover:text-primary transition-colors mb-2">
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <span className="font-bold text-[#212529] text-[15px] group-hover:text-primary transition-colors">{title}</span>
    <span className="text-[12px] text-[#6c757d] mt-1">{desc}</span>
  </button>
);

export default Dashboard;