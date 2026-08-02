'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  GraduationCap, LogOut, BookOpen, User, 
  Menu, X, Sun, Moon, Home, ChevronRight,
  Users, ClipboardList, Activity, Library, MessageSquare,
  Bell
} from 'lucide-react';

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
            setProfileInfo({
              fullName: data.full_name,
              mshs: data.mshs,
              className: data.classes?.name || 'Chưa xếp lớp',
              roleName
            });
            return;
          }
        } catch (e) {
          console.error('Error fetching student profile:', e);
        }
        setProfileInfo({
          fullName: 'Học sinh Demo',
          mshs: 'FPT00123',
          className: '12T1',
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
          <p className="text-sm font-bold text-muted-foreground animate-pulse">Đang tải cấu hình bảo mật...</p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập, trả về null (middleware sẽ tự redirect về /)
  if (!user) {
    return null;
  }

  // Định tuyến cấu hình các mục Menu theo vai trò (Role-based Navigation)
  const menuConfigs = {
    student: [
      { name: 'Trang chủ', path: '/dashboard/student', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Môn học tự học', path: '/dashboard/student/subjects', icon: <BookOpen className="h-4.5 w-4.5" /> },
      { name: 'Đề luyện tập', path: '/dashboard/student/exams', icon: <ClipboardList className="h-4.5 w-4.5" /> },
      { name: 'Lớp học của tôi', path: '/dashboard/student/classroom', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Hỏi đáp hỗ trợ', path: '/dashboard/student/support', icon: <MessageSquare className="h-4.5 w-4.5" /> }
    ],
    teacher: [
      { name: 'Trang chủ', path: '/dashboard/teacher', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Quản lý học sinh', path: '/dashboard/teacher/students', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Quản lý học liệu', path: '/dashboard/teacher/materials', icon: <Library className="h-4.5 w-4.5" /> },
      { name: 'Hỏi đáp học sinh', path: '/dashboard/teacher/support', icon: <MessageSquare className="h-4.5 w-4.5" /> }
    ],
    head_of_department: [
      { name: 'Trang chủ', path: '/dashboard/teacher', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Quản lý học sinh', path: '/dashboard/teacher/students', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Phân lớp & Môn học', path: '/dashboard/admin/users', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Quản lý học liệu', path: '/dashboard/teacher/materials', icon: <Library className="h-4.5 w-4.5" /> },
      { name: 'Hỏi đáp học sinh', path: '/dashboard/teacher/support', icon: <MessageSquare className="h-4.5 w-4.5" /> }
    ],
    admin: [
      { name: 'Trang chủ', path: '/dashboard/admin', icon: <Home className="h-4.5 w-4.5" /> },
      { name: 'Tài khoản & Phân quyền', path: '/dashboard/admin/users', icon: <Users className="h-4.5 w-4.5" /> },
      { name: 'Quản lý thông báo', path: '/dashboard/admin/announcements', icon: <Bell className="h-4.5 w-4.5" /> },
      { name: 'Nhật ký bảo mật', path: '/dashboard/admin/logs', icon: <Activity className="h-4.5 w-4.5" /> }
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300 relative overflow-hidden">
      
      {/* FLOATING BACKGROUND DECORATION MESH CIRCLES */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
      
      {/* 1. TOP NAVIGATION BAR DÀNH CHO DESKTOP */}
      <header className="hidden md:flex h-16 fixed top-0 left-0 right-0 z-40 px-4 lg:px-6 items-center justify-between shadow-premium select-none bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 lg:gap-6">
          {/* Logo block */}
          <div className="flex items-center gap-2">
            <img src="/logo_ngang.png" alt="FPREP Logo" className="h-12 w-auto object-contain" />
          </div>
          
          <span className="text-border hidden lg:inline">|</span>

          {/* Horizontal Navigation Menu */}
          <nav className="flex items-center gap-0.5 lg:gap-1.5">
            {currentMenu.map((item, idx) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={idx}
                  onClick={() => router.push(item.path)}
                  className={`whitespace-nowrap flex items-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-2 rounded-lg text-xs font-bold transition-all border border-transparent ${isActive ? 'bg-primary/10 border-primary/20 text-primary font-black shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
                  {item.icon} {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right side tools */}
        <div className="flex items-center gap-2 lg:gap-4">
          
          {/* User profile capsule */}
          {profileInfo && (
            <div className="flex items-center gap-2 lg:gap-3 border border-border bg-muted/20 px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap">
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center font-bold text-xs text-primary border border-primary/20 shrink-0">
                {profileInfo.fullName[0].toUpperCase()}
              </div>
              <div className="flex items-center gap-1 lg:gap-2 font-semibold whitespace-nowrap">
                <span className="font-extrabold text-foreground whitespace-nowrap">{profileInfo.fullName}</span>
                
                {user.role === 'student' ? (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="whitespace-nowrap">Lớp: <span className="font-bold text-primary whitespace-nowrap">{profileInfo.className}</span></span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="whitespace-nowrap">MSHS: <span className="font-bold text-secondary whitespace-nowrap">{profileInfo.mshs}</span></span>
                  </>
                ) : (user.role === 'teacher' || user.role === 'head_of_department') ? (
                  <>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="whitespace-nowrap">Môn: <span className="font-bold text-primary whitespace-nowrap">{(profileInfo as any).subjectName || 'Chưa phân công'}</span></span>
                  </>
                ) : null}

                <span className="text-muted-foreground/40">|</span>
                <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                  {profileInfo.roleName}
                </span>
              </div>
            </div>
          )}

          {/* Theme switcher */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            title="Đổi giao diện"
          >
            {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-primary" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="whitespace-nowrap flex items-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-2 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20 shrink-0"
          >
            <LogOut className="h-4 w-4 shrink-0" /> Đăng xuất
          </button>
        </div>
      </header>

      {/* 2. HEADER DÀNH CHO MOBILE */}
      <header className="flex h-16 items-center justify-between px-4 md:hidden fixed top-0 left-0 right-0 z-40 shadow-sm bg-card/80 backdrop-blur-md border-b border-border">
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
              <button
                key={idx}
                onClick={() => { router.push(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${pathname === item.path ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
              >
                {item.icon} {item.name}
              </button>
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
      <div className="flex-1 flex flex-col min-w-0 pt-16">
        <main ref={mainRef} className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
        
        {/* FOOTER */}
        {/* FOOTER */}
        <footer className="border-t border-border py-8 px-6 sm:px-8 bg-card shrink-0 select-none">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            {/* Left section: Logo & credit */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <img src="/logo_chu_duoi.png" alt="FPREP Logo" className="h-20 w-auto object-contain" />
              <p className="text-xs text-muted-foreground font-semibold">
                Phát triển bởi <span className="font-bold text-primary">Trần Ngọc Minh Thông</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                &copy; {new Date().getFullYear()} THPT FPT Cần Thơ. Tất cả quyền lợi được bảo lưu.
              </p>
            </div>

            {/* Right section: Links */}
            <div className="flex flex-wrap justify-center md:justify-start gap-x-12 gap-y-6 text-xs text-muted-foreground font-semibold">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider text-foreground font-black">Thông tin & Giới thiệu</span>
                <a href="/guide?tab=about" className="hover:text-primary transition-colors">Giới thiệu</a>
                <a href="/guide?tab=usage" className="hover:text-primary transition-colors">Hướng dẫn sử dụng</a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider text-foreground font-black">Pháp lý & Điều khoản</span>
                <a href="/guide?tab=terms" className="hover:text-primary transition-colors">Điều khoản sử dụng</a>
                <a href="/guide?tab=privacy" className="hover:text-primary transition-colors">Điều khoản dữ liệu người dùng</a>
              </div>
            </div>
          </div>
        </footer>
      </div>

    </div>
  );
}
