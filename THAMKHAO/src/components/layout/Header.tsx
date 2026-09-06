import React, { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, Info, BookOpen, AlertTriangle, Trophy, CheckCheck, Menu } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Link } from 'react-router-dom';
import { supabase } from '../../config/supabase';

const Header = ({ title, onMenuClick }: { title: string; onMenuClick?: () => void }) => {
  const { isDark, toggleDark, isFptStudent, currentUser } = useAppStore();
  
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Lấy dữ liệu thông báo
  const fetchNotifs = async () => {
    if (!currentUser?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
      
    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifs();
    // Refresh thông báo mỗi 30s
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Các icon với màu sắc pastel phẳng, dịu mắt
  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'system': return <div className="bg-blue-50 text-blue-600 p-2 rounded-full border border-blue-100"><Info size={16} /></div>;
      case 'class': return <div className="bg-purple-50 text-purple-600 p-2 rounded-full border border-purple-100"><BookOpen size={16} /></div>;
      case 'warning': return <div className="bg-red-50 text-red-600 p-2 rounded-full border border-red-100"><AlertTriangle size={16} /></div>;
      case 'achievement': return <div className="bg-yellow-50 text-yellow-600 p-2 rounded-full border border-yellow-100"><Trophy size={16} /></div>;
      default: return <div className="bg-[#f8f9fa] text-[#495057] p-2 rounded-full border border-[#dee2e6]"><Bell size={16} /></div>;
    }
  };

  return (
    <header className="h-[72px] bg-white border-b border-[#dee2e6] flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
      
      {/* --- MOBILE HAMBURGER + TITLE --- */}
      <div className="flex items-center gap-3">
        {/* Hamburger chỉ hiện trên mobile */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-[#495057] hover:text-primary hover:bg-[#e7f1ff] rounded-lg transition-colors"
          aria-label="Mở menu"
        >
          <Menu size={22} />
        </button>
        <h2 className="text-[17px] md:text-xl font-bold text-secondary tracking-tight hidden sm:block">{title}</h2>
        {/* Logo nhỏ trên mobile thay cho title */}
        <span className="sm:hidden font-black text-[18px] text-primary font-heading tracking-widest">FMATH12</span>
      </div>

      {/* --- ACTIONS & PROFILE --- */}
      <div className="flex items-center gap-4 md:gap-6 relative">
        <div className="flex items-center gap-2">
          
          {/* Nút Thông Báo */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
                isNotifOpen 
                  ? 'bg-primary-light/50 text-primary border-primary/20' 
                  : 'bg-[#f8f9fa] text-[#6c757d] border-[#dee2e6] hover:bg-[#e9ecef] hover:text-primary'
              }`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Thông báo */}
            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-lg border border-[#dee2e6] overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">
                
                <div className="px-5 py-4 border-b border-[#e9ecef] flex items-center justify-between bg-[#f8f9fa]/50">
                  <h3 className="font-bold text-[#495057]">Thông báo</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-xs font-semibold text-primary hover:text-[#e05f13] flex items-center gap-1 transition-colors">
                      <CheckCheck size={14}/> Đánh dấu đã đọc
                    </button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell size={32} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Bạn chưa có thông báo nào.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#e9ecef]">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 transition-colors hover:bg-[#f8f9fa] group ${!notif.is_read ? 'bg-primary-light/10' : ''}`}>
                          <div onClick={() => handleMarkAsRead(notif.id)} className="flex items-start gap-3 cursor-pointer">
                            <div className="shrink-0 mt-0.5">{getNotifIcon(notif.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className={`text-sm font-bold truncate ${!notif.is_read ? 'text-[#212529]' : 'text-[#495057]'}`}>
                                  {notif.title}
                                </div>
                                <div className="text-[10px] font-medium text-slate-400 whitespace-nowrap shrink-0">
                                  {formatTime(notif.created_at)}
                                </div>
                              </div>
                              <p className={`text-xs leading-relaxed line-clamp-2 ${!notif.is_read ? 'text-[#495057]' : 'text-[#6c757d]'}`}>
                                {notif.message}
                              </p>
                            </div>
                            {!notif.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 border-t border-[#e9ecef] bg-[#f8f9fa]/50 text-center">
                  <button onClick={() => setIsNotifOpen(false)} className="text-xs font-bold text-[#6c757d] hover:text-[#495057] transition-colors">
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>



          {/* Nút Toggle Theme (Vẫn giữ lại cho logic cũ, nhưng làm phẳng) */}
          <button 
            onClick={toggleDark} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f9fa] text-[#6c757d] border border-[#dee2e6] hover:bg-[#e9ecef] hover:text-[#495057] transition-colors"
          >
            {isDark ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
          </button>
        </div>

        {/* Vạch chia cách */}
        <div className="h-8 w-px bg-slate-200"></div>

        {/* --- THÔNG TIN NGƯỜI DÙNG --- */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="font-bold text-sm text-[#495057]">{currentUser.name}</div>
            <div className="text-xs font-medium text-[#6c757d]">
              {currentUser.role === 'admin' 
                ? 'Quản trị viên' 
                : currentUser.role === 'teacher' 
                  ? 'Giáo viên' 
                  : (currentUser.student_code || currentUser.studentId) ? `${currentUser.student_code || currentUser.studentId} • Học sinh` : 'Học sinh'}
            </div>
          </div>
          
          {/* Avatar phẳng, bỏ viền Gradient */}
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-[#dee2e6] flex items-center justify-center font-bold text-secondary overflow-hidden shadow-sm">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Avatar"/>
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;