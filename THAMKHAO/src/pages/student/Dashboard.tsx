import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Trophy, Flame, TrendingUp, BookOpen, Target, Zap, ArrowRight, BrainCircuit, PlayCircle } from 'lucide-react';

const Dashboard = () => {
  const { currentUser } = useAppStore();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng');
    else if (hour < 18) setGreeting('Chào buổi chiều');
    else setGreeting('Chào buổi tối');
  }, []);

  return (
    <div className="page-container relative animate-in fade-in">
      <div className="page-content custom-scrollbar">
        <div className="max-w-6xl mx-auto w-full space-y-6 md:space-y-8">
          
          {/* BANNER CHÀO MỪNG */}
          <div className="bg-[#e7f1ff] border border-[#b6d4fe] rounded-xl p-6 md:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="absolute inset-0 opacity-10 math-pattern"></div>
            
            <div className="relative z-10 flex-1">
              <h1 className="text-3xl md:text-4xl font-black mb-3 drop-shadow-sm flex items-center gap-3 text-[#052c65]">
                {greeting}, {currentUser.name ? currentUser.name.split(' ').pop() : 'Bạn'}! 🚀
              </h1>
              <p className="text-[#084298] font-medium text-sm md:text-base max-w-xl leading-relaxed">
                Hôm nay là một ngày tuyệt vời để học Toán. Hãy hoàn thành 1 bài tập để khởi động chuỗi <strong className="text-orange-600">Streak</strong> ngay nhé! 🔥
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-4 bg-white/50 p-4 rounded-xl backdrop-blur-md border border-[#b6d4fe] shrink-0 w-full md:w-auto">
              <div className="text-center px-4 border-r border-[#b6d4fe]">
                <div className="text-xs font-bold text-[#084298] uppercase tracking-wider mb-1">Cấp độ</div>
                <div className="text-3xl font-black text-[#052c65]">{currentUser.level || 1}</div>
              </div>
              <div className="flex items-center gap-3 px-2">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-300 border border-orange-400/30 shadow-inner">
                  <AwardIcon />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#084298] uppercase tracking-wider mb-0.5">Kinh nghiệm</div>
                  <div className="text-xl font-black text-[#052c65]">{(currentUser.xp || 0).toLocaleString()} <span className="text-sm font-medium opacity-80">XP</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* TIẾN ĐỘ HỌC TẬP */}
            <div className="lg:col-span-2 flat-card shadow-sm p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-[#212529] text-xl flex items-center gap-2">
                  <Target className="text-primary" /> Tiến độ học tập
                </h3>
                <button className="text-sm font-bold text-primary bg-[#e7f1ff] hover:bg-[#b6d4fe] px-4 py-2 rounded-xl transition-colors flex items-center gap-1">
                  Xem lộ trình <ArrowRight size={16} />
                </button>
              </div>
              
              <div className="h-48 border-2 border-dashed border-[#dee2e6] rounded-2xl flex flex-col items-center justify-center bg-[#f8f9fa]">
                <TrendingUp size={48} className="mb-4 opacity-50 text-[#adb5bd]" />
                <p className="font-bold text-[#6c757d]">Chưa có dữ liệu tiến độ.</p>
                <p className="text-sm text-[#6c757d]">Hoàn thành bài tập đầu tiên để hệ thống ghi nhận nhé!</p>
              </div>
            </div>

            {/* AI GỢI Ý */}
            <div className="lg:col-span-1 glass bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-[32px] border border-purple-100 dark:border-purple-800/50 shadow-sm p-6 md:p-8 flex flex-col">
              <h3 className="font-black text-purple-900 dark:text-purple-300 text-xl mb-6 flex items-center gap-2">
                <BrainCircuit className="text-purple-500" /> FMath AI Gợi ý
              </h3>
              
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white">
                <Zap size={40} className="text-yellow-500 mb-2" />
                <p className="text-[#495057] font-medium leading-relaxed">
                  Hãy bắt đầu làm bài tập Chương 1 để tích lũy XP và mở khóa các huy hiệu mới bạn nhé.
                </p>
              </div>
              
              <button className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2">
                Thực hiện ngay <PlayCircle size={20} />
              </button>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <ActionCard icon={<BookOpen />} title="Lý thuyết" color="blue" />
            <ActionCard icon={<Target />} title="Luyện đề" color="green" />
            <ActionCard icon={<BrainCircuit />} title="Thi thử AI" color="purple" />
            <ActionCard icon={<Trophy />} title="Xếp hạng" color="orange" />
          </div>

        </div>
      </div>
    </div>
  );
};

// Component phụ cho nút bấm
const ActionCard = ({ icon, title, color }: any) => {
  const colorClasses: any = {
    blue: "bg-blue-100 text-blue-600 hover:bg-blue-200 border-blue-200",
    green: "bg-green-100 text-green-600 hover:bg-green-200 border-green-200",
    purple: "bg-purple-100 text-purple-600 hover:bg-purple-200 border-purple-200",
    orange: "bg-orange-100 text-orange-600 hover:bg-orange-200 border-orange-200",
  };

  return (
    <button className={`flex flex-col items-center justify-center p-6 rounded-[24px] border-2 transition-all hover:scale-105 active:scale-95 ${colorClasses[color]}`}>
      <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center mb-3 shadow-sm">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <span className="font-bold text-sm md:text-base">{title}</span>
    </button>
  );
};

const AwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>;

export default Dashboard;