'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  GraduationCap, LogOut, BookOpen, User, 
  Menu, X, Sun, Moon, Home, ChevronRight,
  Users, ClipboardList, Activity, Library, MessageSquare,
  Bell, AlertTriangle, Wrench
} from 'lucide-react';
import Footer from '@/components/Footer';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import { getMaintenanceStatus, setMaintenanceStatus } from '@/lib/maintenance';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const checkMaintenance = () => {
      setIsMaintenance(getMaintenanceStatus());
    };
    checkMaintenance();
    window.addEventListener('maintenance_status_changed', checkMaintenance);
    return () => window.removeEventListener('maintenance_status_changed', checkMaintenance);
  }, []);

  const [profileInfo, setProfileInfo] = useState<{
    fullName: string;
    className: string;
    mshs: string;
    roleName: string;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setProfileInfo(null);
      return;
    }

    const loadProfile = async () => {
      let roleName = 'Student';
      if (user.role === 'admin') roleName = 'Admin';
      else if (user.role === 'teacher') roleName = 'Teach';
      else if (user.role === 'head_of_department') roleName = 'HOD';

      if (user.role === 'student') {
        try {
          const supabaseClient = createSupabaseClient();
          const { data } = await supabaseClient
            .from('student_details')
            .select('full_name, mshs, classes(name)')
            .eq('student_id', user.id)
            .single();

          if (data) {
            const cls = data.classes as any;
            const className = (Array.isArray(cls) ? cls[0]?.name : cls?.name) || 'Chưa xếp lớp';
            setProfileInfo({
              fullName: data.full_name,
              mshs: data.mshs,
              className,
              roleName
            });
            return;
          }
        } catch (e) {
          console.error('Error fetching student profile:', e);
        }
        const defaultName = user.email ? user.email.split('@')[0] : 'Học sinh';
        const defaultMshs = user.email ? user.email.split('@')[0].toUpperCase() : 'Chưa cập nhật';
        setProfileInfo({
          fullName: defaultName,
          mshs: defaultMshs,
          className: 'Chưa xếp lớp',
          roleName
        });
      } else if (user.role === 'teacher' || user.role === 'head_of_department') {
        let fullName = user.email.split('@')[0];
        fullName = fullName.charAt(0).toUpperCase() + fullName.slice(1);
        if (user.role === 'head_of_department') fullName = 'Trưởng Bộ Môn';
        if (user.role === 'teacher') fullName = 'Giáo viên';

        let subjectName = 'Chưa phân công';
        try {
          const supabaseClient = createSupabaseClient();
          const { data } = await supabaseClient
            .from('teacher_classes')
            .select('subjects(name)')
            .eq('teacher_id', user.id)
            .limit(1);

          if (data && data.length > 0) {
            subjectName = (data[0] as any).subjects?.name || 'Chưa phân công';
          }
        } catch (e) {
          console.error('Error fetching teacher subject:', e);
        }

        setProfileInfo({
          fullName,
          className: '',
          mshs: '',
          roleName,
          subjectName
        } as any);
      } else {
        let fullName = user.email.split('@')[0];
        fullName = fullName.charAt(0).toUpperCase() + fullName.slice(1);
        if (user.role === 'admin') fullName = 'Quản trị viên';

        setProfileInfo({
          fullName,
          className: '',
          mshs: '',
          roleName
        });
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    // Tự động kiểm tra Dark Mode của hệ thống
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  // Tự động kéo lên đầu trang khi thay đổi tuyến đường (Scroll to top on navigation)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [pathname]);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Trình hiển thị trạng thái đang tải chuyên nghiệp
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập, tự động chuyển hướng về trang đăng nhập thay vì để trắng màn hình
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-bold text-muted-foreground">Đang xác thực...</p>
      </div>
    );
  }

  // Định tuyến cấu hình các mục Menu theo vai trò (Role-based Navigation)
  const menuConfigs = {
    student: [
      { name: 'Trang chủ', path: '/dashboard/student', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Học liệu', path: '/dashboard/student/subjects', icon: <BookOpen className="h-4.5 w-4.5" /> },
      { name: 'Luyện đề', path: '/dashboard/student/exams', icon: <ClipboardList className="h-4.5 w-4.5" /> },
      { name: 'Lớp học', path: '/dashboard/student/classroom', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Hỏi đáp', path: '/dashboard/student/support', icon: <MessageSquare className="h-4.5 w-4.5" /> }
    ],
    teacher: [
      { name: 'Trang chủ', path: '/dashboard/teacher', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Học sinh', path: '/dashboard/teacher/students', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Học liệu', path: '/dashboard/teacher/materials', icon: <Library className="h-4.5 w-4.5" /> },
      { name: 'Đề thi', path: '/dashboard/teacher/exams', icon: <ClipboardList className="h-4.5 w-4.5" /> },
      { name: 'Hỏi đáp', path: '/dashboard/teacher/support', icon: <MessageSquare className="h-4.5 w-4.5" /> }
    ],
    head_of_department: [
      { name: 'Trang chủ', path: '/dashboard/teacher', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Học sinh', path: '/dashboard/teacher/students', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Phân lớp', path: '/dashboard/admin/users', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Học liệu', path: '/dashboard/teacher/materials', icon: <Library className="h-4.5 w-4.5" /> },
      { name: 'Đề thi', path: '/dashboard/teacher/exams', icon: <ClipboardList className="h-4.5 w-4.5" /> },
      { name: 'Hỏi đáp', path: '/dashboard/teacher/support', icon: <MessageSquare className="h-4.5 w-4.5" /> }
    ],
    admin: [
      { name: 'Trang chủ', path: '/dashboard/admin', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Phân quyền', path: '/dashboard/admin/users', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Thông báo', path: '/dashboard/admin/announcements', icon: <Bell className="h-4.5 w-4.5" /> },
      { name: 'Nhật ký', path: '/dashboard/admin/logs', icon: <Activity className="h-4.5 w-4.5" /> }
    ]
  };

  const currentMenu = menuConfigs[user.role] || [];
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Quản trị</span>;
      case 'teacher':
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Giáo viên</span>;
      case 'head_of_department':
        return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Trưởng bộ môn</span>;
      default:
        return <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Học sinh</span>;
    }
  };

  if (isMaintenance && user?.role === 'student') {
    return <MaintenanceScreen />;
  }

  // Khi đang trong phòng thi trực tuyến: Ẩn thanh điều hướng chung và Footer để tránh đè giao diện
  const isExamSession = Boolean(
    pathname && 
    pathname.startsWith('/dashboard/student/exams/') && 
    pathname !== '/dashboard/student/exams'
  );

  if (isExamSession) {
    return (
      <div className="min-h-screen bg-background text-foreground w-full">
        {children}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300 relative w-full overflow-hidden ${isMaintenance ? 'pt-8' : ''}`}>
      
      {/* MAINTENANCE WARNING BANNER CHO GIÁO VIÊN / ADMIN */}
      {isMaintenance && user?.role !== 'student' && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 px-4 py-1.5 text-xs font-semibold flex items-center justify-between fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 truncate">
              <Wrench className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
              <span className="truncate">
                <strong className="uppercase">Chế độ bảo trì đang BẬT:</strong> Học sinh hiện không thể truy cập hệ thống.
              </span>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => setMaintenanceStatus(false)}
                className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-sm transition-colors shrink-0"
              >
                Tắt Bảo Trì
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. TOP NAVIGATION BAR DÀNH CHO DESKTOP CHUẨN FMATH */}
      <header className={`hidden md:flex h-[70px] fixed ${isMaintenance ? 'top-8' : 'top-0'} left-0 right-0 z-40 px-6 lg:px-8 items-center justify-between select-none bg-card border-b border-border shadow-sm`}>
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Logo block */}
          <div className="flex items-center gap-2">
            <img src="/logo_ngang.png" alt="FPREP Logo" className="h-11 w-auto object-contain" />
          </div>
          
          <span className="text-border hidden lg:inline">|</span>

          {/* Horizontal Navigation Menu */}
          <nav className="flex items-center gap-1.5 lg:gap-2">
            {currentMenu.map((item, idx) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={idx}
                  href={item.path}
                  className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] lg:text-[14px] font-bold transition-all ${
                    isActive 
                      ? 'bg-[#e7f1ff] dark:bg-primary/20 text-primary border border-[#b6d4fe] dark:border-primary/40 shadow-sm' 
                      : 'text-[#495057] dark:text-muted-foreground hover:text-[#212529] dark:hover:text-foreground hover:bg-[#f8f9fa] dark:hover:bg-muted'
                  }`}
                >
                  {item.icon} {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side tools */}
        <div className="flex items-center gap-3 lg:gap-5">
          
          {/* User profile capsule tinh gọn theo FMATH */}
          {profileInfo && (
            <div className="flex items-center gap-3 border border-border bg-[#f8f9fa] dark:bg-muted/40 px-3.5 py-1.5 rounded-xl whitespace-nowrap">
              <div className="w-8 h-8 rounded-full bg-[#e7f1ff] dark:bg-primary/20 text-primary flex items-center justify-center font-black text-xs border border-primary/20 shrink-0">
                {profileInfo.fullName[0].toUpperCase()}
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <span className="block font-bold text-[13px] text-card-foreground">
                  {profileInfo.fullName}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {user.role === 'student' ? (profileInfo.className !== 'Chưa xếp lớp' ? `${profileInfo.className} • Học sinh` : 'Học sinh') : profileInfo.roleName}
                </span>
              </div>
            </div>
          )}

          {/* Theme switcher */}
          <button 
            onClick={toggleDarkMode}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f8f9fa] dark:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors shrink-0"
            title="Đổi giao diện"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20 shrink-0"
          >
            <LogOut className="h-4 w-4 shrink-0" /> Đăng xuất
          </button>
        </div>
      </header>

      {/* 2. HEADER DÀNH CHO MOBILE */}
      <header className={`flex h-16 items-center justify-between px-4 md:hidden fixed ${isMaintenance ? 'top-8' : 'top-0'} left-0 right-0 z-40 shadow-sm bg-card/80 backdrop-blur-md border-b border-border`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 border border-border rounded-lg bg-background">
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-1.5">
          <img src="/logo_ngang.png" alt="FPREP Logo" className="h-10 w-auto object-contain" />
        </div>

        <button 
          onClick={toggleDarkMode}
          className="p-2 border border-border rounded-lg bg-background"
        >
          {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-primary" />}
        </button>
      </header>

      {/* 3. SIDEBAR MOBILE DRAWER OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 md:hidden transition-all duration-300 flex flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <img src="/logo_ngang.png" alt="FPREP Logo" className="h-10 w-auto object-contain" />
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 border border-border rounded-lg bg-background">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4 border-b border-border bg-muted/20">
            {profileInfo && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20 shrink-0">
                  {profileInfo.fullName[0].toUpperCase()}
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="block text-sm font-extrabold text-foreground">{profileInfo.fullName}</span>
                  <div className="text-[10px] text-muted-foreground font-semibold space-y-0.5">
                    {user.role === 'student' ? (
                      <>
                        <p>Lớp: <span className="font-bold text-primary">{profileInfo.className}</span></p>
                        <p>MSHS: <span className="font-bold text-secondary">{profileInfo.mshs}</span></p>
                      </>
                    ) : (user.role === 'teacher' || user.role === 'head_of_department') ? (
                      <p>Môn: <span className="font-bold text-primary">{(profileInfo as any).subjectName || 'Chưa phân công'}</span></p>
                    ) : null}
                  </div>
                  <div className="pt-1">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                      {profileInfo.roleName}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {currentMenu.map((item, idx) => (
              <Link
                key={idx}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${pathname === item.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
              >
                {item.icon} {item.name}
              </Link>
            ))}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors mt-8"
            >
              <LogOut className="h-5 w-5" /> Đăng xuất
            </button>
          </nav>
        </div>
      )}

      {/* 4. MAIN CONTENT CONTAINER (Stretched to 1400px widescreen layout) */}
      <div className="flex-1 flex flex-col min-w-0 pt-16 md:pt-[70px] w-full max-w-full">
        <main ref={mainRef} className="w-full max-w-[1400px] mx-auto min-w-0 p-3.5 sm:p-5 lg:p-6 flex-1">
          <div className="w-full max-w-full min-w-0">
            {children}
          </div>
        </main>
        
        {/* FOOTER ĐỒNG BỘ TOÀN HỆ THỐNG */}
        <Footer />
      </div>

    </div>
  );
}
