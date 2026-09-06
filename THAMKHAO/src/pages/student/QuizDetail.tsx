import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, ArrowLeft, Clock, ListChecks, Target, 
  PlayCircle, History, AlertCircle, FileText, Trophy, Medal, User
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { examService } from '../../services/examService';

const QuizDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [exam, setExam] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!id || !currentUser?.id) {
        if (isMounted) {
          setError("Không tìm thấy mã đề thi hoặc bạn chưa đăng nhập.");
          setIsLoading(false);
        }
        return;
      }
      
      try {
        if (isMounted) {
          setIsLoading(true);
          setError(null);
        }
        
        // Dùng chuẩn xác logic lấy Data tối ưu của bạn bằng Promise.all
        const [examData, historyData, leaderboardData] = await Promise.all([
          examService.getExamById(id),
          examService.getExamHistory(id, currentUser.id),
          examService.getExamLeaderboard(id)
        ]);

        if (!examData) {
          throw new Error("Đề thi này không tồn tại hoặc đã bị ẩn.");
        }
        
        if (isMounted) {
          setExam(examData);
          setHistory(historyData || []);
          setLeaderboard(leaderboardData || []);
        }

      } catch (err: any) {
        console.error("Lỗi khi tải chi tiết đề thi:", err);
        if (isMounted) setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false; // Chống tràn bộ nhớ khi chuyển trang nhanh
    };
  }, [id, currentUser?.id]);

  const handleStartQuiz = () => {
    if (!exam) return;
    navigate(`/quiz/${exam.id}/take`);
  };

  // Hàm format giây thành Phút:Giây
  const formatTime = (seconds: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Parse tags an toàn
  const tags = exam ? (Array.isArray(exam.tags) ? exam.tags : (typeof exam.tags === 'string' ? JSON.parse(exam.tags) : [])) : [];

  // ==============================================
  // 1. TRẠNG THÁI LOADING
  // ==============================================
  if (isLoading) {
    return (
      <div className="page-container items-center justify-center">
        <Loader2 size={40} className="animate-spin text-primary mb-4" />
        <p className="font-medium text-[15px] text-[#6c757d]">Đang chuẩn bị phòng thi...</p>
      </div>
    );
  }

  // ==============================================
  // 2. TRẠNG THÁI LỖI (KHÔNG TÌM THẤY ĐỀ)
  // ==============================================
  if (error || !exam) {
    return (
      <div className="page-container p-4 md:p-8">
        <button onClick={() => navigate('/quiz')} className="flex items-center gap-2 text-[#6c757d] hover:text-primary transition-colors mb-6 text-[14px] font-medium">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <div className="bg-white border border-[#dee2e6] rounded-xl p-8 max-w-lg mx-auto text-center shadow-sm">
          <div className="w-16 h-16 bg-[#f8d7da] text-[#dc3545] rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-[#212529] mb-2">Không thể tải đề thi</h2>
          <p className="text-[#6c757d] text-[14px] mb-6 leading-relaxed">{error || "Đề thi không tồn tại hoặc đã bị xóa."}</p>
          <button onClick={() => navigate('/quiz')} className="btn-secondary mx-auto">
            Về trang Luyện đề
          </button>
        </div>
      </div>
    );
  }

  // ==============================================
  // 3. GIAO DIỆN CHI TIẾT (CHUẨN BOOTSTRAP)
  // ==============================================
  return (
    <div className="page-container animate-in fade-in duration-300">
      <div className="page-content max-w-5xl mx-auto md:p-8 pb-24">
        
        <button onClick={() => navigate('/quiz')} className="flex items-center gap-2 text-[#6c757d] hover:text-[#212529] transition-colors mb-6 text-[14px] font-medium font-ui">
          <ArrowLeft size={16} /> Quay lại
        </button>

        <div className="bg-white border border-[#dee2e6] rounded-2xl shadow-sm overflow-hidden">
          
          {/* HEADER ĐỀ THI */}
          <div className="bg-white border-b border-[#dee2e6] p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-[#e7f1ff] text-[#0d6efd] text-[11px] font-bold px-2.5 py-1 rounded-md font-ui uppercase tracking-wider">
                {exam.type || 'Đề kiểm tra'}
              </span>
              {tags.map((tag: string, i: number) => (
                <span key={i} className="bg-[#f8f9fa] text-[#495057] border border-[#dee2e6] text-[11px] font-bold px-2.5 py-1 rounded-md font-ui uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-[#212529] m-0 leading-snug max-w-3xl mb-2">
              {exam.title}
            </h1>
            <p className="text-[#6c757d] text-[14px] m-0">Đề thi được biên soạn chuẩn cấu trúc. Hãy chuẩn bị giấy nháp trước khi bắt đầu.</p>
          </div>

          <div className="p-0 flex flex-col md:flex-row">
            
            {/* CỘT TRÁI: THÔNG TIN CHI TIẾT & BẢNG VÀNG */}
            <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-[#dee2e6]">
              <h3 className="text-[14px] font-bold text-[#212529] uppercase tracking-wider mb-5 flex items-center gap-2 font-heading">
                <Target size={18} className="text-primary" /> Yêu cầu đề thi
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e9ecef]">
                  <div className="flex items-center gap-2 text-[#6c757d] text-[13px] font-medium mb-1">
                    <ListChecks size={16}/> Tổng số câu
                  </div>
                  <div className="font-bold text-[#212529] text-xl font-ui">{exam.questionsCount || 50} <span className="text-[14px] text-[#adb5bd] font-medium">câu</span></div>
                </div>
                
                <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e9ecef]">
                  <div className="flex items-center gap-2 text-[#6c757d] text-[13px] font-medium mb-1">
                    <Clock size={16}/> Thời gian
                  </div>
                  <div className="font-bold text-[#212529] text-xl font-ui">{Math.floor((exam.time_limit || 2400)/60)} <span className="text-[14px] text-[#adb5bd] font-medium">phút</span></div>
                </div>
              </div>

              {/* KHU VỰC BẢNG VÀNG TOP 5 */}
              <div className="mt-8 border-t border-[#dee2e6] pt-8">
                <h3 className="text-[14px] font-bold text-[#212529] uppercase tracking-wider mb-5 flex items-center gap-2 font-heading">
                  <Trophy size={18} className="text-[#ffc107]" /> Vinh danh (Top 5)
                </h3>

                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 bg-[#f8f9fa] border border-[#e9ecef] rounded-xl text-[#6c757d]">
                    <Trophy size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-[13px] m-0">Chưa có bảng xếp hạng. Hãy là người đầu tiên chinh phục đề thi này!</p>
                  </div>
                ) : (
                  <div className="bg-white border border-[#dee2e6] rounded-xl overflow-hidden shadow-sm">
                    {leaderboard.map((rank, index) => {
                      const isTop1 = index === 0;
                      const isTop2 = index === 1;
                      const isTop3 = index === 2;
                      
                      let rankStyle = "bg-[#f8f9fa] text-[#6c757d] border-[#dee2e6]";
                      if (isTop1) rankStyle = "bg-[#fff3cd] text-[#ffc107] border-[#ffecb5]";
                      else if (isTop2) rankStyle = "bg-[#e2e3e5] text-[#6c757d] border-[#d3d6d8]";
                      else if (isTop3) rankStyle = "bg-[#f8d7da] text-[#dc3545] border-[#f5c2c7]";

                      return (
                        <div key={index} className={`flex items-center gap-4 p-3 ${index !== leaderboard.length - 1 ? 'border-b border-[#e9ecef]' : ''} hover:bg-[#f8f9fa] transition-colors`}>
                          
                          {/* Hạng */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 border ${rankStyle}`}>
                            {isTop1 || isTop2 || isTop3 ? <Medal size={16} /> : index + 1}
                          </div>

                          {/* Avatar & Tên */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 bg-[#e9ecef] rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[#adb5bd] border border-[#dee2e6]">
                              {rank.users?.avatar_url ? (
                                <img src={rank.users.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <User size={18} />
                              )}
                            </div>
                            <div className="truncate">
                              <div className={`text-[14px] font-bold truncate ${isTop1 ? 'text-[#b38a0b]' : 'text-[#212529]'}`}>
                                {rank.users?.full_name || 'Học sinh ẩn danh'}
                              </div>
                            </div>
                          </div>

                          {/* Điểm số & Thời gian */}
                          <div className="text-right shrink-0">
                            <div className="text-[16px] font-black text-[#198754] font-ui leading-none mb-1">
                              {rank.score} <span className="text-[11px] font-bold text-[#adb5bd] uppercase">Điểm</span>
                            </div>
                            <div className="text-[11px] font-medium text-[#6c757d] flex items-center justify-end gap-1">
                              <Clock size={10}/> {Math.floor(rank.time_spent / 60)}p {rank.time_spent % 60}s
                            </div>
                          </div>
                          
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: LỊCH SỬ LÀM BÀI */}
            <div className="w-full md:w-[320px] shrink-0 p-6 md:p-8 bg-[#f8f9fa]">
              <h3 className="text-[14px] font-bold text-[#212529] uppercase tracking-wider mb-5 flex items-center gap-2 font-heading">
                <History size={18} className="text-primary" /> Lịch sử của bạn
              </h3>

              {history.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-[#dee2e6] rounded-xl bg-white">
                  <FileText size={32} className="mx-auto mb-3 text-[#adb5bd]" />
                  <p className="text-[13px] text-[#6c757d] m-0 font-medium">Bạn chưa làm đề này lần nào.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {history.map((hist, index) => {
                    const timeMins = Math.floor(hist.time_spent / 60);
                    const timeSecs = hist.time_spent % 60;
                    
                    return (
                      <div key={hist.id} className="flex items-center justify-between p-3 border border-[#dee2e6] rounded-xl bg-white shadow-sm hover:border-[#b6d4fe] transition-colors cursor-default">
                        <div>
                          <div className="text-[11px] font-bold text-[#6c757d] mb-0.5 uppercase tracking-wide">Lần {history.length - index}</div>
                          <div className="text-[13px] font-medium text-[#212529]">
                            {new Date(hist.created_at).toLocaleDateString('vi-VN')}
                          </div>
                          <div className="text-[11px] text-[#adb5bd] mt-0.5">
                            {timeMins}p {timeSecs}s
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[18px] font-black text-[#198754] font-ui">{hist.score}</div>
                          <div className="text-[11px] font-medium text-[#adb5bd]">điểm</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* FOOTER ACTION */}
          <div className="p-6 border-t border-[#dee2e6] bg-white flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="text-center text-[12px] text-[#dc3545] mb-3 font-medium flex items-center justify-center gap-1.5 bg-[#f8d7da] py-2 rounded border border-[#f5c2c7]">
                <AlertCircle size={14} /> Thời gian sẽ bắt đầu đếm ngược ngay khi bấm nút.
              </div>
              <button 
                onClick={handleStartQuiz} 
                className="btn-primary w-full py-3.5 text-[15px] rounded-xl shadow-md"
              >
                <PlayCircle size={20} /> BẮT ĐẦU LÀM BÀI
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default QuizDetail;