import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, PenTool, Users, User,
  Video, Radio, Shield
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  roles: string[];
}

const studentNav: NavItem[] = [
  { icon: <LayoutDashboard size={22} />, label: 'Tổng quan', path: '/dashboard', roles: ['student'] },
  { icon: <BookOpen size={22} />, label: 'Lý thuyết', path: '/theory', roles: ['student'] },
  { icon: <PenTool size={22} />, label: 'Luyện đề', path: '/quiz', roles: ['student'] },
  { icon: <Users size={22} />, label: 'Lớp học', path: '/classroom', roles: ['student'] },
  { icon: <User size={22} />, label: 'Hồ sơ', path: '/profile', roles: ['student'] },
];

const teacherNav: NavItem[] = [
  { icon: <LayoutDashboard size={22} />, label: 'Tổng quan', path: '/dashboard', roles: ['teacher', 'admin'] },
  { icon: <Users size={22} />, label: 'Lớp học', path: '/class-manager', roles: ['teacher', 'admin'] },
  { icon: <Radio size={22} />, label: 'Ca thi', path: '/live-sessions', roles: ['teacher', 'admin'] },
  { icon: <Video size={22} />, label: 'Học liệu', path: '/resources', roles: ['teacher', 'admin'] },
  { icon: <User size={22} />, label: 'Hồ sơ', path: '/profile', roles: ['teacher', 'admin'] },
];

const adminNav: NavItem[] = [
  { icon: <LayoutDashboard size={22} />, label: 'Tổng quan', path: '/dashboard', roles: ['admin'] },
  { icon: <Users size={22} />, label: 'Lớp học', path: '/class-manager', roles: ['admin'] },
  { icon: <Radio size={22} />, label: 'Ca thi', path: '/live-sessions', roles: ['admin'] },
  { icon: <Shield size={22} />, label: 'Tài khoản', path: '/user-management', roles: ['admin'] },
  { icon: <User size={22} />, label: 'Hồ sơ', path: '/profile', roles: ['admin'] },
];

const BottomNav = () => {
  const location = useLocation();
  const { currentUser } = useAppStore();
  const role = currentUser?.role || 'student';

  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#dee2e6] safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative group ${
                isActive ? 'text-primary' : 'text-[#adb5bd] hover:text-[#495057]'
              }`}
            >
              {/* Active indicator top bar */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              {/* Icon wrapper */}
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#e7f1ff]' : 'group-hover:bg-[#f8f9fa]'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold leading-none ${isActive ? 'text-primary' : 'text-[#adb5bd]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area spacer for iOS home indicator */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
};

export default BottomNav;
