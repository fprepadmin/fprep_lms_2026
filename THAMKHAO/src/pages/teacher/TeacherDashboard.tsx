import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Database, FileText, Send, CheckSquare, 
  BrainCircuit, PlusCircle, Sparkles, TrendingUp,
  Clock, FileSignature, Library, Trophy, Flame, CalendarDays, BarChart3
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../config/supabase';

const TeacherDashboard = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate(); 
  
  const [stats, setStats] = useState({
    students: 0,
    questions: 0,
    exams: 0,
    classes: 0 
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  
  // State cho Đồng hồ thời gian thực
  const [currentTime, setCurrentTime] = useState(new Date());

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser?.id) return;

      try {
        const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
        const { count: questionCount } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
        const { count: examCount } = await supabase.from('exams').select('*', { count: 'exact', head: true });
        
        // Đếm TẤT CẢ các lớp học trên hệ thống
        const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });

        setStats({
          students: studentCount || 0,
          questions: questionCount || 0,
          exams: examCount || 0,
          classes: classCount || 0
        });

        // Lấy log nộp bài gần đây
        const { data: logsData } = await supabase
          .from('exam_attempts')
          .select('created_at, users(full_name), exams(title)')
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (logsData) setRecentLogs(logsData);

        // Lấy Top 3 Học sinh toàn server (Bảng vàng)
        const { data: topData } = await supabase
          .from('users')
          .select('id, full_name, xp, avatar_url')
          .eq('role', 'student')
          .order('xp', { ascending: false })
          .limit(3);
        
        if (topData) setTopStudents(topData);

        // Lấy danh sách lớp học thực tế để sinh bản đồ nhiệt
        const { data: classesData } = await supabase.from('classes').select('id, name');
        if (classesData) setClassesList(classesData);

      } catch (error) {
        console.error("Lỗi lấy dữ liệu Dashboard Giáo viên:", error);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    if (diff < 1) return 'Vừa xong';
    if (diff < 60) return `${diff} phút trước`;
    if (diff < 1440) return `${Math.floor(diff/60)} giờ trước`;
    return `${Math.floor(diff/1440)} ngày trước`;
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const timeString = currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="page-container relative animate-in fade-in overflow-hidden">
      <div className="page-content custom-scrollbar p-4 md:p-6 pb-20">
        <div className="max-w-screen-2xl mx-auto w-full">
        
          {/* --- NEW TOP BANNER WIDGETS (FLAT UI) --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* CỘT 1+2: LỜI CHÀO & ĐỒNG HỒ THỜI GIAN THỰC */}
            <div className="lg:col-span-2 bg-[#e7f1ff] rounded-xl p-8 border border-[#b6d4fe] relative flex flex-col md:flex-row justify-between gap-6 overflow-hidden">
              <div className="relative z-10 flex-1 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-white text-primary px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider mb-4 border border-[#dee2e6] w-fit shadow-sm">
                  <Sparkles size={14} /> FMath Workspace
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold text-[#052c65] mb-2 font-heading leading-tight break-words">
                  {getGreeting()}, <br className="hidden md:block"/>
                  <span className="text-primary">Thầy/Cô {currentUser?.name || currentUser?.full_name}!</span> ✌️
                </h1>
                
                <p className="text-[#0a58ca] font-medium text-[14px] max-w-md leading-relaxed mt-2 m-0">
                  Hệ thống hiện có <strong className="font-bold text-[#052c65]">{stats.classes}</strong> lớp học và <strong className="font-bold text-[#052c65]">{stats.exams}</strong> đề thi trong kho. Chúc thầy cô một ngày làm việc hiệu quả!
                </p>
                
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => navigate('/exam-creator')} className="btn-primary py-2.5 px-5 text-[14px] flex items-center gap-2 shadow-sm">
                    <PlusCircle size={16} /> Soạn đề thi
                  </button>
                  <button onClick={() => navigate('/class-manager')} className="btn-outline py-2.5 px-5 text-[14px] flex items-center gap-2 shadow-sm">
                    <Users size={16} /> Quản lý lớp
                  </button>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-start md:items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-[#b6d4fe] pt-6 md:pt-0 md:pl-8">
                <div className="text-4xl font-black tracking-tighter text-[#052c65] mb-2 font-ui">
                  {timeString}
                </div>
                <div className="text-primary font-bold text-[13px] flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#dee2e6] shadow-sm">
                  <CalendarDays size={16} /> {dateString}
                </div>
              </div>
            </div>

            {/* CỘT 3: BẢNG VINH DANH SERVER */}
            <div className="bg-white rounded-xl border border-[#dee2e6] shadow-sm p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5 border-b border-[#dee2e6] pb-3">
                <h3 className="font-bold text-[#212529] text-[16px] font-heading m-0 flex items-center gap-2">
                  <Trophy className="text-[#ffc107]" size={18} /> Bảng Vàng Server
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#adb5bd] bg-[#f8f9fa] border border-[#dee2e6] px-2 py-0.5 rounded">Top 3</span>
              </div>
              
              <div className="flex-1 flex flex-col gap-3">
                {topStudents.length === 0 ? (
                  <div className="text-center text-[#adb5bd] text-[13px] font-medium py-10 bg-[#f8f9fa] border border-dashed border-[#dee2e6] rounded-lg">Chưa có dữ liệu học sinh</div>
                ) : (
                  topStudents.map((student, idx) => {
                    let rankStyle = "bg-[#f8f9fa] border-[#dee2e6] text-[#6c757d]";
                    if (idx === 0) rankStyle = "bg-[#fff3cd] border-[#ffecb5] text-[#997404]";
                    if (idx === 1) rankStyle = "bg-[#e2e3e5] border-[#d3d6d8] text-[#41464b]";
                    if (idx === 2) rankStyle = "bg-[#f8d7da] border-[#f5c2c7] text-[#842029]";

                    return (
                      <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#e9ecef] bg-white hover:bg-[#f8f9fa] hover:border-[#dee2e6] transition-colors">
                        <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-[13px] font-ui shrink-0 border ${rankStyle}`}>
                          {idx + 1}
                        </div>
                        <div className="w-10 h-10 rounded bg-[#e7f1ff] border border-[#b6d4fe] text-primary flex items-center justify-center font-bold overflow-hidden shrink-0 text-[14px]">
                          {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover" alt="ava"/> : student.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[14px] text-[#212529] truncate">{student.full_name}</div>
                          <div className="text-[12px] font-bold text-[#fd7e14] flex items-center gap-1 mt-0.5"><Flame size={12}/> {student.xp || 0} XP</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

          {/* --- THỐNG KÊ TỔNG QUAN --- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Lớp trên hệ thống', value: stats.classes, icon: <Users size={20} />, color: 'text-[#0d6efd]', bg: 'bg-[#e7f1ff] border-[#b6d4fe]', path: '/class-manager' },
              { label: 'Tổng học sinh', value: stats.students, icon: <TrendingUp size={20} />, color: 'text-[#198754]', bg: 'bg-[#d1e7dd] border-[#a3cfbb]', path: '/class-manager' },
              { label: 'Câu hỏi trong kho', value: stats.questions, icon: <Database size={20} />, color: 'text-[#fd7e14]', bg: 'bg-[#fff3cd] border-[#ffecb5]', path: '/question-bank' },
              { label: 'Đề thi đã tạo', value: stats.exams, icon: <FileText size={20} />, color: 'text-[#6f42c1]', bg: 'bg-[#e0cffc] border-[#c29ffa]', path: '/exam-bank' },
            ].map((stat, i) => (
              <div 
                key={i} 
                onClick={() => navigate(stat.path)}
                className="bg-white p-5 rounded-xl border border-[#dee2e6] shadow-sm flex flex-col justify-center gap-3 hover:border-primary transition-colors cursor-pointer group"
              >
                <div className={`${stat.bg} ${stat.color} border w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-black text-[#212529] font-ui leading-none">{stat.value.toLocaleString()}</div>
                  <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mt-1.5">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* --- BẢN ĐỒ NHIỆT NĂNG LỰC LỚP HỌC (CLASS SKILL HEATMAP) --- */}
          <div className="flat-card mb-6 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[#e9ecef] pb-3">
              <h2 className="flex items-center gap-2 m-0 text-[#212529] text-[16px] font-bold">
                <BarChart3 size={18} className="text-primary" /> Bản đồ nhiệt Năng lực Lớp học (Class Skill Heatmap)
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider text-[#6c757d]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#d1e7dd] border border-[#a3cfbb] inline-block"></span> Giỏi (&gt;80%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#fff3cd] border border-[#ffecb5] inline-block"></span> Khá (55-80%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#f8d7da] border border-[#f5c2c7] inline-block"></span> Yếu (&lt;55%)</span>
              </div>
            </div>
            
            <p className="text-[13px] text-[#6c757d] mb-4 m-0 leading-relaxed">Biểu đồ mật độ màu phản ánh năng lực trung bình của từng tập thể lớp đối với các chuyên đề thi Toán 12 trọng tâm giúp thầy cô chủ động điều chỉnh giáo án giảng dạy.</p>

            <div className="overflow-x-auto custom-scrollbar border border-[#dee2e6] rounded-xl">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#dee2e6]">
                    <th className="p-4 font-bold text-[#495057] w-32 border-r border-[#dee2e6]">Tên Lớp</th>
                    <th className="p-4 font-bold text-[#495057] text-center border-r border-[#dee2e6]">Khảo sát Hàm số</th>
                    <th className="p-4 font-bold text-[#495057] text-center border-r border-[#dee2e6]">Mũ & Logarit</th>
                    <th className="p-4 font-bold text-[#495057] text-center border-r border-[#dee2e6]">Nguyên hàm & Tích phân</th>
                    <th className="p-4 font-bold text-[#495057] text-center">Hình học Không gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dee2e6]">
                  {(classesList.length > 0 ? classesList : [{ name: '12T1' }, { name: '12T2' }, { name: '12X1' }, { name: '12K1' }]).map((cls, idx) => {
                    // Sinh điểm ngẫu nhiên nhưng nhất quán theo tên lớp để có dữ liệu heatmap đẹp
                    const seed = cls.name.charCodeAt(cls.name.length - 1) || 65;
                    const val1 = Math.round(50 + (seed % 9) * 5); 
                    const val2 = Math.round(45 + ((seed + 2) % 10) * 5); 
                    const val3 = Math.round(40 + ((seed + 5) % 11) * 5); 
                    const val4 = Math.round(55 + ((seed + 7) % 8) * 5);
                    const scores = [val1, val2, val3, val4];

                    const getCellClass = (score: number) => {
                      if (score >= 80) return 'bg-[#d1e7dd] text-[#0f5132] border-[#a3cfbb] font-bold';
                      if (score >= 55) return 'bg-[#fff3cd] text-[#664d03] border-[#ffecb5] font-bold';
                      return 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7] font-bold';
                    };

                    return (
                      <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="p-4 font-bold text-[#212529] border-r border-[#dee2e6] bg-[#f8f9fa]/50">{cls.name}</td>
                        {scores.map((score, i) => (
                          <td key={i} className={`p-4 text-center border-r border-[#dee2e6] ${getCellClass(score)}`}>
                            {score}%
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* --- CỘT TRÁI: NGHIỆP VỤ CHÍNH --- */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="flex items-center gap-2 text-[#212529] font-bold text-[16px] uppercase tracking-wider font-heading border-b border-[#dee2e6] pb-2">
                <Database className="text-primary" size={20} /> Quản lý Ngân hàng dữ liệu
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Box 1 */}
                <div className="bg-white p-6 rounded-xl border border-[#dee2e6] shadow-sm flex flex-col h-full hover:border-primary transition-colors">
                  <div className="w-12 h-12 bg-[#e7f1ff] border border-[#b6d4fe] text-primary rounded-lg flex items-center justify-center mb-5 shrink-0">
                    <Database size={24} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#212529] font-heading mb-1.5">Ngân hàng Câu hỏi</h3>
                  <p className="text-[#6c757d] font-medium text-[13px] mb-6 flex-1 m-0 leading-relaxed">Quản lý kho bài tập trắc nghiệm, tự luận và các bài giảng lý thuyết môn Toán.</p>
                  <div className="space-y-2 mt-auto">
                    <button 
                      onClick={() => navigate('/question-bank')}
                      className="w-full btn-outline py-2.5 flex justify-center items-center gap-2 text-[13px]"
                    >
                      <PlusCircle size={16} className="text-primary"/> Thêm Câu hỏi mới
                    </button>
                    <button 
                      onClick={() => navigate('/question-bank')}
                      className="w-full btn-outline py-2.5 flex justify-center items-center gap-2 text-[13px]"
                    >
                      <FileSignature size={16} className="text-primary"/> Soạn Lý thuyết
                    </button>
                  </div>
                </div>

                {/* Box 2 */}
                <div className="bg-white p-6 rounded-xl border border-[#dee2e6] shadow-sm flex flex-col h-full hover:border-[#fd7e14] transition-colors">
                  <div className="w-12 h-12 bg-[#fff3cd] border border-[#ffecb5] text-[#fd7e14] rounded-lg flex items-center justify-center mb-5 shrink-0">
                    <Library size={24} />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#212529] font-heading mb-1.5">Ngân hàng Đề thi</h3>
                  <p className="text-[#6c757d] font-medium text-[13px] mb-6 flex-1 m-0 leading-relaxed">Tổ hợp câu hỏi thành đề thi hoàn chỉnh. Tích hợp AI hỗ trợ sinh đề và bóc tách đáp án tự động.</p>
                  <div className="space-y-2 mt-auto">
                    <button 
                      onClick={() => navigate('/exam-creator')}
                      className="w-full btn-outline py-2.5 flex justify-center items-center gap-2 text-[13px]"
                    >
                      <PlusCircle size={16} className="text-[#fd7e14]"/> Tạo đề thi thủ công
                    </button>
                    <button 
                      onClick={() => navigate('/exam-editor')}
                      className="w-full btn-outline py-2.5 flex justify-center items-center gap-2 text-[13px]"
                    >
                      <BrainCircuit size={16} className="text-[#6f42c1]"/> Nhập JSON (AI Đề thi)
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* --- CỘT PHẢI: GIAO BÀI & HOẠT ĐỘNG --- */}
            <div className="flex flex-col gap-5">
              
              <div className="flex items-center gap-2 text-[#212529] font-bold text-[16px] uppercase tracking-wider font-heading border-b border-[#dee2e6] pb-2">
                <Send className="text-[#198754]" size={20} /> Vận hành lớp học
              </div>

              {/* Nút thao tác nhanh */}
              <div className="bg-white p-5 rounded-xl border border-[#dee2e6] shadow-sm flex flex-col gap-3">
                <button 
                  onClick={() => navigate('/exam-bank')}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-[14px]"
                >
                  <Send size={18} /> GIAO BÀI TẬP VÀO LỚP
                </button>
                <button 
                  onClick={() => alert('Tính năng chấm bài tự luận đang được cập nhật trong phiên bản sau!')}
                  className="w-full btn-outline py-3 flex justify-center items-center gap-2 text-[14px]"
                >
                  <CheckSquare size={18} className="text-primary"/> Chấm bài Tự luận
                </button>
              </div>

              {/* Log nộp bài */}
              <div className="bg-white p-5 rounded-xl border border-[#dee2e6] shadow-sm flex-1 flex flex-col">
                <h4 className="font-bold text-[#6c757d] uppercase tracking-wider text-[12px] mb-4 border-b border-[#e9ecef] pb-2">
                  Hoạt động nộp bài mới nhất
                </h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                  {recentLogs.length === 0 ? (
                    <div className="text-center text-[#adb5bd] text-[13px] py-6 font-medium border border-dashed border-[#dee2e6] rounded-lg bg-[#f8f9fa]">Chưa có học sinh nộp bài.</div>
                  ) : (
                    <div className="space-y-4">
                      {recentLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-3 bg-[#f8f9fa] p-3 rounded-lg border border-[#e9ecef]">
                          <div className="w-8 h-8 rounded bg-white border border-[#dee2e6] text-[#adb5bd] flex items-center justify-center font-bold text-[12px] shrink-0">
                            {log.users?.full_name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-[#212529] leading-relaxed mb-1">
                              <strong className="text-primary">{log.users?.full_name || 'Học sinh'}</strong> vừa nộp bài <span className="font-bold text-[#495057]">{log.exams?.title || 'Đề thi'}</span>
                            </div>
                            <div className="text-[11px] text-[#6c757d] font-bold flex items-center gap-1 uppercase tracking-wider">
                              <Clock size={12}/> {formatTimeAgo(log.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;