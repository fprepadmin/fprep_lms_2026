import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, BookOpen, PenTool, Trophy, 
  User, Users, LogOut, ShieldCheck, Sigma, Database, Library, Shield, Activity, Radio, Video, FolderOpen, X
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const role = currentUser.role || 'student';
  const isMobileDrawer = onClose !== undefined;

  const menuGroups = [
    {
      title: 'CHUNG',
      roles: ['student', 'teacher', 'admin'],
      items: [
        { icon: <LayoutDashboard size={18} />, label: 'Tổng quan', path: '/dashboard', roles: ['student', 'teacher', 'admin'] }
      ]
    },
    {
      title: 'HỌC TẬP & THI CỬ',
      roles: ['student'],
      items: [
        { icon: <BookOpen size={18} />, label: 'Lý thuyết', path: '/theory', roles: ['student'] },
        { icon: <Video size={18} />, label: 'Bài giảng & Tài liệu', path: '/resources', roles: ['student'] },
        { icon: <PenTool size={18} />, label: 'Luyện đề', path: '/quiz', roles: ['student'] },
        { icon: <Activity size={18} />, label: 'Phòng thi Live', path: '/join-live', roles: ['student'] },
        { icon: <Users size={18} />, label: 'Lớp học', path: '/classroom', roles: ['student'] },
        { icon: <Trophy size={18} />, label: 'Xếp hạng', path: '/leaderboard', roles: ['student'] },
      ]
    },
    {
      title: 'TỔ CHỨC KHẢO THÍ',
      roles: ['teacher', 'admin'],
      items: [
        { icon: <Radio size={18} />, label: 'Quản lý Ca thi', path: '/live-sessions', roles: ['teacher', 'admin'] },
      ]
    },
    {
      title: 'QUẢN LÝ DỮ LIỆU',
      roles: ['teacher', 'admin'],
      items: [
        { icon: <ShieldCheck size={18} />, label: 'Quản lý Lớp học', path: '/class-manager', roles: ['teacher', 'admin'] },
        { icon: <Database size={18} />, label: 'NH Câu hỏi', path: '/question-bank', roles: ['teacher', 'admin'] },
        { icon: <Library size={18} />, label: 'NH Đề thi', path: '/exam-bank', roles: ['teacher', 'admin'] },
        { icon: <FolderOpen size={18} />, label: 'Học liệu & Tài liệu', path: '/resources', roles: ['teacher', 'admin'] },
      ]
    },
    {
      title: 'HỆ THỐNG',
      roles: ['admin'],
      items: [
        { icon: <Shield size={18} />, label: 'Quản lý Tài khoản', path: '/user-management', roles: ['admin'] },
      ]
    },
    {
      title: 'CÁ NHÂN',
      roles: ['student', 'teacher', 'admin'],
      items: [
        { icon: <User size={18} />, label: 'Hồ sơ', path: '/profile', roles: ['student', 'teacher', 'admin'] },
      ]
    }
  ];

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Signout error:", err);
      }
      localStorage.removeItem('demo_mode');
      navigate('/login');
    }
  };

  const handleNavClick = () => {
    if (isMobileDrawer && onClose) onClose();
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-[72px] flex items-center px-5 border-b border-[#e9ecef] shrink-0">
        <Link to="/dashboard" onClick={handleNavClick} className="flex items-center gap-3 group flex-1">
          <div className="bg-primary p-2 rounded text-white group-hover:bg-[#0b5ed7] transition-colors shadow-sm">
            <Sigma size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-[18px] font-bold font-heading text-secondary tracking-widest mb-0 mt-0.5">
            FMATH12
          </h1>
        </Link>
        {/* Close button (chỉ hiện khi drawer mobile) */}
        {isMobileDrawer && (
          <button onClick={onClose} className="p-2 text-[#6c757d] hover:text-[#dc3545] hover:bg-[#f8d7da] rounded-lg transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 flex flex-col gap-1">
        {menuGroups.map((group, groupIdx) => {
          if (!group.roles.includes(role)) return null;
          const visibleItems = group.items.filter(item => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx} className={groupIdx !== 0 ? 'mt-3' : ''}>
              <div className="px-3 mb-2 text-[11px] font-bold text-[#adb5bd] uppercase tracking-wider">
                {group.title}
              </div>
              <div className="flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <Link key={item.label} to={item.path} onClick={handleNavClick}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded transition-colors group text-[14px] ${
                        isActive
                          ? 'bg-[#e7f1ff] text-primary font-medium border border-[#b6d4fe]'
                          : 'text-[#495057] hover:bg-[#f8f9fa] hover:text-[#212529] font-normal border border-transparent'
                      }`}>
                      <div className={`${isActive ? 'text-primary' : 'text-[#adb5bd] group-hover:text-[#6c757d]'} transition-colors`}>
                        {item.icon}
                      </div>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-[#e9ecef] shrink-0">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[14px] font-medium text-[#6c757d] hover:text-[#dc3545] hover:bg-[#f8d7da] transition-colors group">
          <div className="text-[#adb5bd] group-hover:text-[#dc3545] transition-colors">
            <LogOut size={18} />
          </div>
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-[250px] h-screen bg-white border-r border-[#dee2e6] flex-col shrink-0 relative z-40 hidden md:flex font-ui">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {isMobileDrawer && (
        <>
          {/* Backdrop */}
          <div
            className={`md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
          />
          {/* Drawer */}
          <aside
            className={`md:hidden fixed top-0 left-0 h-full w-[280px] bg-white z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-out font-ui ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;