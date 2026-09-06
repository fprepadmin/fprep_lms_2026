import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame, Loader2, User, ArrowUp, Star } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../config/supabase';

const Leaderboard = () => {
  const { currentUser } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        // Truy vấn danh sách học sinh, sắp xếp theo XP giảm dần
        // Giới hạn 50 người dẫn đầu
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, avatar_url, xp, level, streak')
          .order('xp', { ascending: false })
          .limit(50);

        if (!error && data) {
          setUsers(data);
        }
      } catch (err) {
        console.error("Lỗi tải bảng xếp hạng:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-72px)] bg-[#f8f9fa] text-[#6c757d]">
        <Loader2 size={40} className="animate-spin mb-4 text-primary" />
        <p className="font-medium text-[15px]">Đang tải bảng vàng thành tích...</p>
      </div>
    );
  }

  const top3 = users.slice(0, 3);
  const others = users.slice(3);

  // Tìm thứ hạng của user hiện tại
  const myRankIndex = users.findIndex(u => u.id === currentUser?.id);
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : '100+';

  return (
    <div className="page-container animate-in fade-in">
      
      {/* HEADER */}
      <div className="bg-white border-b border-[#dee2e6] px-4 md:px-8 py-6 md:py-8 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-[#212529] mb-2 flex items-center gap-2">
              <Trophy size={28} className="text-[#ffc107]" /> Bảng Xếp Hạng
            </h1>
            <p className="text-[#6c757d] text-[14px] m-0 font-medium">Đua top kinh nghiệm (XP) toàn trường. Nỗ lực để nhận huy hiệu nhé!</p>
          </div>
          
          <div className="flex items-center gap-1 bg-[#f8f9fa] p-1 rounded-lg border border-[#dee2e6] w-max">
            <button 
              onClick={() => setTimeFilter('week')}
              className={`px-4 py-2 text-[13px] font-bold rounded transition-colors ${timeFilter === 'week' ? 'bg-white text-primary shadow-sm border border-[#dee2e6]' : 'text-[#6c757d] hover:bg-[#e9ecef]'}`}
            >
              Tuần
            </button>
            <button 
              onClick={() => setTimeFilter('month')}
              className={`px-4 py-2 text-[13px] font-bold rounded transition-colors ${timeFilter === 'month' ? 'bg-white text-primary shadow-sm border border-[#dee2e6]' : 'text-[#6c757d] hover:bg-[#e9ecef]'}`}
            >
              Tháng
            </button>
            <button 
              onClick={() => setTimeFilter('all')}
              className={`px-4 py-2 text-[13px] font-bold rounded transition-colors ${timeFilter === 'all' ? 'bg-white text-primary shadow-sm border border-[#dee2e6]' : 'text-[#6c757d] hover:bg-[#e9ecef]'}`}
            >
              Toàn thời gian
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="max-w-4xl mx-auto">
        
        {/* ==========================================
            KHU VỰC TOP 3 (PODIUM)
            ========================================== */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:items-end">
            
            {/* TOP 2 (BẠC) */}
            {top3[1] && (
              <div className="order-2 md:order-1 bg-white border border-[#dee2e6] rounded-2xl p-6 text-center shadow-sm relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#adb5bd]"></div>
                <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#dee2e6] text-[#6c757d] font-bold font-ui flex items-center justify-center mb-4 text-[14px]">
                  #2
                </div>
                <div className="w-20 h-20 rounded-full bg-[#f8f9fa] border-4 border-[#dee2e6] mb-3 overflow-hidden flex items-center justify-center text-[#adb5bd]">
                  {top3[1].avatar_url ? <img src={top3[1].avatar_url} className="w-full h-full object-cover" alt="Ava"/> : <User size={32}/>}
                </div>
                <h3 className="font-bold text-[#212529] text-[16px] mb-1 line-clamp-1">{top3[1].full_name}</h3>
                <div className="text-[12px] font-bold text-[#6c757d] bg-[#f8f9fa] px-2 py-0.5 rounded uppercase mb-4">Level {top3[1].level || 1}</div>
                <div className="font-black text-[24px] text-[#212529] font-ui leading-none flex items-center justify-center gap-1.5">
                   <Flame size={20} className="text-[#adb5bd]" /> {top3[1].xp || 0}
                </div>
              </div>
            )}

            {/* TOP 1 (VÀNG) */}
            {top3[0] && (
              <div className="order-1 md:order-2 bg-white border border-[#ffecb5] rounded-2xl p-8 text-center shadow-md relative overflow-hidden flex flex-col items-center scale-105 z-10 md:-translate-y-4">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#ffc107]"></div>
                <div className="w-12 h-12 rounded-full bg-[#fff3cd] border border-[#ffecb5] text-[#997404] font-black font-ui flex items-center justify-center mb-4 text-[16px]">
                  <Trophy size={20} className="text-[#ffc107]" />
                </div>
                <div className="w-24 h-24 rounded-full bg-[#fff3cd] border-4 border-[#ffecb5] mb-3 overflow-hidden flex items-center justify-center text-[#ffc107] relative">
                  {top3[0].avatar_url ? <img src={top3[0].avatar_url} className="w-full h-full object-cover" alt="Ava"/> : <User size={40}/>}
                </div>
                <h3 className="font-black text-[#212529] text-[18px] mb-1 line-clamp-1">{top3[0].full_name}</h3>
                <div className="text-[12px] font-bold text-[#997404] bg-[#fff3cd] px-2 py-0.5 rounded uppercase mb-4">Level {top3[0].level || 1}</div>
                <div className="font-black text-[28px] text-[#212529] font-ui leading-none flex items-center justify-center gap-1.5">
                   <Flame size={24} className="text-[#ffc107]" /> {top3[0].xp || 0}
                </div>
              </div>
            )}

            {/* TOP 3 (ĐỒNG) */}
            {top3[2] && (
              <div className="order-3 md:order-3 bg-white border border-[#dee2e6] rounded-2xl p-6 text-center shadow-sm relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#fd7e14]"></div>
                <div className="w-10 h-10 rounded-full bg-[#fff3cd] border border-[#ffecb5] text-[#997404] font-bold font-ui flex items-center justify-center mb-4 text-[14px]">
                  #3
                </div>
                <div className="w-20 h-20 rounded-full bg-[#f8f9fa] border-4 border-[#dee2e6] mb-3 overflow-hidden flex items-center justify-center text-[#fd7e14]">
                  {top3[2].avatar_url ? <img src={top3[2].avatar_url} className="w-full h-full object-cover" alt="Ava"/> : <User size={32}/>}
                </div>
                <h3 className="font-bold text-[#212529] text-[16px] mb-1 line-clamp-1">{top3[2].full_name}</h3>
                <div className="text-[12px] font-bold text-[#6c757d] bg-[#f8f9fa] px-2 py-0.5 rounded uppercase mb-4">Level {top3[2].level || 1}</div>
                <div className="font-black text-[24px] text-[#212529] font-ui leading-none flex items-center justify-center gap-1.5">
                   <Flame size={20} className="text-[#fd7e14]" /> {top3[2].xp || 0}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            THẺ THỨ HẠNG CỦA BẠN (CỐ ĐỊNH HOẶC NỔI BẬT)
            ========================================== */}
        {currentUser && (
          <div className="bg-[#e7f1ff] border border-[#b6d4fe] rounded-xl p-4 md:p-5 mb-8 flex items-center gap-4 shadow-sm border-l-4 border-l-[#0d6efd]">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#b6d4fe] flex items-center justify-center font-black text-[#084298] text-[15px] font-ui shrink-0">
              #{myRank}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white border border-[#dee2e6] overflow-hidden flex items-center justify-center text-[#adb5bd] shrink-0">
                {currentUser.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Me"/> : <User size={20}/>}
              </div>
              <div>
                <div className="font-bold text-[#212529] text-[15px] mb-0.5 flex items-center gap-2">
                  {currentUser.name || currentUser.full_name} <span className="bg-[#0d6efd] text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">Bạn</span>
                </div>
                <div className="text-[12px] text-[#6c757d] font-medium flex items-center gap-1.5">
                  <Star size={12}/> Level {currentUser.level || 1}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-black text-[20px] text-[#0d6efd] font-ui leading-none mb-1">{currentUser.xp || 0}</div>
              <div className="text-[11px] font-bold text-[#052c65] uppercase tracking-wider">XP</div>
            </div>
          </div>
        )}

        {/* ==========================================
            DANH SÁCH CÁC THỨ HẠNG CÒN LẠI (TỪ TOP 4)
            ========================================== */}
        {others.length > 0 && (
          <div className="bg-white border border-[#dee2e6] rounded-xl shadow-sm overflow-hidden divide-y divide-[#e9ecef]">
            {others.map((user, index) => {
              const actualRank = index + 4;
              const isMe = user.id === currentUser?.id;

              return (
                <div key={user.id} className={`flex items-center gap-4 p-4 transition-colors ${isMe ? 'bg-[#f8f9fa]' : 'hover:bg-[#f8f9fa]'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[14px] font-ui shrink-0 ${isMe ? 'bg-primary text-white' : 'bg-[#e9ecef] text-[#6c757d]'}`}>
                    {actualRank}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#dee2e6] overflow-hidden flex items-center justify-center text-[#adb5bd] shrink-0">
                    {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="Ava"/> : <User size={18}/>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-[15px] truncate mb-0.5 ${isMe ? 'text-primary' : 'text-[#212529]'}`}>
                      {user.full_name}
                    </div>
                    <div className="text-[12px] text-[#6c757d] font-medium">
                      Level {user.level || 1}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="font-black text-[16px] text-[#495057] font-ui">{user.xp || 0}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {users.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-white border border-[#dee2e6] rounded-xl shadow-sm">
             <Trophy size={48} className="mx-auto mb-4 text-[#adb5bd] opacity-50" />
             <p className="text-[#6c757d] font-medium text-[15px]">Chưa có dữ liệu bảng xếp hạng.</p>
          </div>
        )}

        </div>
      </div>
    </div>
  );
};

export default Leaderboard;