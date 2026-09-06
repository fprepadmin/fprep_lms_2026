import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Trophy, Flame, Calendar, 
  Settings, History, Edit3, Save, CheckCircle2,
  Clock, BookOpen, ChevronRight, Loader2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../config/supabase';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { currentUser, setUser } = useAppStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'history' | 'settings'>('history');
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // States cho Cài đặt
  const [editName, setEditName] = useState(currentUser?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('exam_attempts')
          .select('id, score, time_spent, created_at, exams(id, title, type)')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data) {
          setAttempts(data);
        }
      } catch (err) {
        console.error("Lỗi lấy lịch sử thi:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser?.id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id || !editName.trim()) return;
    
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ full_name: editName.trim() })
        .eq('id', currentUser.id)
        .select('*')
        .single();

      if (!error && data) {
        setUser(data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-72px)] bg-[#f8f9fa] text-[#6c757d]">
        <Loader2 size={40} className="animate-spin mb-4 text-primary" />
        <p className="font-medium text-[15px]">Đang tải hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-in fade-in pb-12">
      <div className="page-content">
      
      {/* ==========================================
          PHẦN HEADER & THÔNG TIN CHUNG
          ========================================== */}
      <div className="bg-white border-b border-[#dee2e6]">
        {/* Banner Cover (Màu phẳng) */}
        <div className="h-32 md:h-48 w-full bg-[#e7f1ff] border-b border-[#b6d4fe]"></div>
        
        <div className="max-w-5xl mx-auto px-4 md:px-8 relative pb-8">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end -mt-16 md:-mt-20 mb-6">
            {/* Avatar */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white p-1.5 border border-[#dee2e6] shadow-sm shrink-0">
              <div className="w-full h-full rounded-full bg-[#f8f9fa] border border-[#e9ecef] flex items-center justify-center overflow-hidden font-black text-4xl text-[#adb5bd]">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
                ) : (
                  currentUser.full_name?.charAt(0) || <User size={48}/>
                )}
              </div>
            </div>
            
            {/* Tên & Role */}
            <div className="text-center md:text-left flex-1">
              <div className="inline-block bg-[#212529] text-white text-[11px] font-bold px-3 py-1 rounded mb-2 uppercase tracking-wider">
                {currentUser.role === 'student' ? 'Học sinh' : currentUser.role}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-[#212529] mb-1">
                {currentUser.full_name}
              </h1>
              <div className="text-[#6c757d] text-[14px] font-medium flex items-center justify-center md:justify-start gap-1.5">
                <Mail size={14}/> {currentUser.email}
              </div>
            </div>
          </div>

          {/* Các chỉ số Thống kê */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#dee2e6] rounded-xl p-5 flex items-center gap-4 shadow-sm hover:border-[#b6d4fe] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[#fff3cd] text-[#ffc107] flex items-center justify-center shrink-0 border border-[#ffecb5]">
                <Trophy size={24} />
              </div>
              <div>
                <div className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Cấp độ hiện tại</div>
                <div className="text-2xl font-black text-[#212529] font-ui leading-none">Level {currentUser.level || 1}</div>
              </div>
            </div>

            <div className="bg-white border border-[#dee2e6] rounded-xl p-5 flex items-center gap-4 shadow-sm hover:border-[#b6d4fe] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[#e7f1ff] text-primary flex items-center justify-center shrink-0 border border-[#b6d4fe]">
                <Flame size={24} />
              </div>
              <div>
                <div className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Điểm kinh nghiệm</div>
                <div className="text-2xl font-black text-[#212529] font-ui leading-none">{currentUser.xp || 0} <span className="text-[14px] font-bold text-[#adb5bd]">XP</span></div>
              </div>
            </div>

            <div className="bg-white border border-[#dee2e6] rounded-xl p-5 flex items-center gap-4 shadow-sm hover:border-[#b6d4fe] transition-colors">
              <div className="w-12 h-12 rounded-lg bg-[#d1e7dd] text-[#198754] flex items-center justify-center shrink-0 border border-[#a3cfbb]">
                <Calendar size={24} />
              </div>
              <div>
                <div className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Chuỗi học tập</div>
                <div className="text-2xl font-black text-[#212529] font-ui leading-none">{currentUser.streak || 0} <span className="text-[14px] font-bold text-[#adb5bd]">Ngày</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          PHẦN NỘI DUNG DƯỚI (TABS)
          ========================================== */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-6">
        
        {/* Thanh Tabs */}
        <div className="flex items-center gap-2 border-b border-[#dee2e6] mb-6 overflow-x-auto custom-scrollbar">
          <button 
            onClick={() => setActiveTab('history')} 
            className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}
          >
            <History size={16} /> Lịch sử làm bài
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}
          >
            <Settings size={16} /> Cài đặt tài khoản
          </button>
        </div>

        {/* Nội dung Tab */}
        <div className="bg-white border border-[#dee2e6] rounded-xl shadow-sm overflow-hidden min-h-[400px]">
          
          {/* TAB: LỊCH SỬ LÀM BÀI */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in">
              <div className="px-6 py-5 border-b border-[#dee2e6] bg-[#f8f9fa] flex items-center justify-between">
                <h3 className="font-bold text-[#212529] text-[15px] uppercase tracking-wider flex items-center gap-2 font-heading">
                  <BookOpen size={18}/> Lịch sử thi & luyện tập
                </h3>
              </div>
              
              {isLoading ? (
                <div className="p-10 text-center text-[#adb5bd]">
                  <Loader2 size={32} className="mx-auto animate-spin mb-2" />
                  <p className="text-[14px]">Đang tải dữ liệu...</p>
                </div>
              ) : attempts.length === 0 ? (
                <div className="p-16 text-center text-[#6c757d]">
                  <History size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-medium text-[15px]">Bạn chưa làm bài thi nào. Hãy bắt đầu luyện tập ngay nhé!</p>
                  <button onClick={() => navigate('/quiz')} className="btn-primary mt-4 px-6 py-2.5">Tới phòng thi</button>
                </div>
              ) : (
                <div className="divide-y divide-[#e9ecef]">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f8f9fa] transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded bg-[#e7f1ff] border border-[#b6d4fe] flex items-center justify-center shrink-0 text-primary">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#212529] text-[15px] mb-1 line-clamp-1">{attempt.exams?.title || 'Bài thi không xác định'}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-[#6c757d]">
                            <span className="bg-[#f8f9fa] border border-[#dee2e6] px-2 py-0.5 rounded uppercase tracking-wider">{attempt.exams?.type || 'Luyện tập'}</span>
                            <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(attempt.created_at).toLocaleString('vi-VN')}</span>
                            <span className="flex items-center gap-1"><Clock size={12}/> Làm bài: {Math.floor(attempt.time_spent / 60)}p {attempt.time_spent % 60}s</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-[#e9ecef] pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <div className="text-[11px] font-bold uppercase text-[#adb5bd] tracking-wider mb-0.5">Điểm số</div>
                          <div className="font-black text-[20px] text-primary font-ui leading-none">{attempt.score}</div>
                        </div>
                        <button 
                          onClick={() => navigate(`/quiz/${attempt.exams?.id}`)}
                          className="w-8 h-8 rounded border border-[#dee2e6] bg-white flex items-center justify-center text-[#6c757d] hover:text-primary hover:border-primary hover:bg-[#e7f1ff] transition-colors"
                          title="Xem lại / Làm lại"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CÀI ĐẶT */}
          {activeTab === 'settings' && (
            <div className="p-6 md:p-8 animate-in fade-in max-w-2xl">
              <h3 className="font-bold text-[#212529] text-[16px] mb-6 uppercase tracking-wider font-heading flex items-center gap-2">
                <Edit3 size={18}/> Thông tin cá nhân
              </h3>
              
              {saveSuccess && (
                <div className="mb-6 p-3 bg-[#d1e7dd] border border-[#a3cfbb] text-[#0f5132] rounded-lg text-[13px] font-bold flex items-center gap-2">
                  <CheckCircle2 size={16}/> Cập nhật thông tin thành công!
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-[#495057] mb-2 uppercase tracking-wider">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-white text-[#212529] font-medium text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] transition-colors"
                    placeholder="Nhập họ tên của bạn..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-[#495057] mb-2 uppercase tracking-wider">
                    Địa chỉ Email (Không thể đổi)
                  </label>
                  <input
                    type="email"
                    value={currentUser.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-[#e9ecef] text-[#6c757d] font-medium text-[15px] cursor-not-allowed"
                  />
                </div>

                <div className="pt-4 border-t border-[#e9ecef]">
                  <button
                    type="submit"
                    disabled={isSaving || !editName.trim() || editName === currentUser.full_name}
                    className="btn-primary py-2.5 px-6 rounded-lg text-[14px] flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    LƯU THAY ĐỔI
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  </div>
  );
};

export default Profile;