'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  Sun, Moon, ShieldCheck, Sparkles, GraduationCap, 
  Users, Shield, ArrowRight, CheckCircle2, Lock, 
  HelpCircle, Laptop, ArrowUpRight
} from 'lucide-react';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import { getMaintenanceStatus } from '@/lib/maintenance';

export default function LandingPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Kiểm tra trạng thái bảo trì
  useEffect(() => {
    const checkMaintenance = () => {
      setIsMaintenance(getMaintenanceStatus());
    };
    checkMaintenance();
    window.addEventListener('maintenance_status_changed', checkMaintenance);
    return () => window.removeEventListener('maintenance_status_changed', checkMaintenance);
  }, []);

  // Thiết lập Dark/Light mode
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Tự động chuyển hướng vào Dashboard nếu người dùng đã đăng nhập
  useEffect(() => {
    if (user && !loading) {
      if (isMaintenance && user.role === 'student') {
        return;
      }
      const targetRole = user.role === 'head_of_department' ? 'teacher' : user.role;
      router.push(`/dashboard/${targetRole}`);
    }
  }, [user, loading, router, isMaintenance]);

  if (isMaintenance && (!user || user.role === 'student')) {
    return <MaintenanceScreen />;
  }

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

  const handleLogin = async () => {
    if (user) {
      const targetRole = user.role === 'head_of_department' ? 'teacher' : user.role;
      router.push(`/dashboard/${targetRole}`);
      return;
    }
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
    } catch (err) {
      console.error('Đăng nhập thất bại:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary font-sans relative overflow-x-hidden">
      
      {/* Hiệu ứng nền Ambient Gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 dark:bg-primary/8 rounded-full blur-3xl opacity-70" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-32 w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* 1. Header tinh gọn */}
      <header className="relative z-10 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img 
              src="/logo_ngang.png" 
              alt="FPREP Logo" 
              className="h-9 sm:h-10 w-auto object-contain" 
            />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" /> Cấu trúc 2026
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50"
              title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Nội dung đăng nhập chính trong 1 trang */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Cột trái: Tóm tắt giới thiệu ngắn gọn */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Nền tảng Khảo thí & Ôn luyện Trực tuyến
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
              Khảo Thí Chuẩn Định Dạng <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-primary">Mới 2026</span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
              Đăng nhập một chạm để tham gia thi thử, luyện tập ngân hàng câu hỏi phân hóa và theo dõi tiến độ học tập theo đúng 3 dạng thức trắc nghiệm mới của Bộ GD&ĐT.
            </p>

            {/* 3 tính năng cô đọng */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4" /> 3 Dạng Thức
                </div>
                <p className="text-[11px] text-muted-foreground">Nhiều lựa chọn, Đúng/Sai & Trả lời ngắn chuẩn 2026.</p>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4" /> Chấm Tức Thời
                </div>
                <p className="text-[11px] text-muted-foreground">Phân tích điểm số chi tiết kèm lời giải từng câu.</p>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4" /> Phân Quyền
                </div>
                <p className="text-[11px] text-muted-foreground">Tự động nhận diện Học sinh, Giáo viên & Quản trị viên.</p>
              </div>
            </div>
          </div>

          {/* Cột phải: Card Đăng nhập ngắn gọn */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-8 rounded-3xl bg-card/90 backdrop-blur-xl border border-border shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-1.5 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  Đăng Nhập FPREP
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Sử dụng tài khoản Google để truy cập nhanh chóng và bảo mật.
                </p>
              </div>

              {/* Nút đăng nhập Google */}
              <div className="space-y-3">
                <button
                  onClick={handleLogin}
                  disabled={loading || isLoggingIn}
                  className="w-full h-12 px-4 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                >
                  {/* Google SVG Icon */}
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {isLoggingIn || loading ? 'Đang xác thực...' : 'Đăng nhập bằng tài khoản Google'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
                </button>

                <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
                  <Lock className="w-3 h-3 text-emerald-500" /> Hỗ trợ Email FPT (@fpt.edu.vn, @fe.edu.vn) & Gmail
                </p>
              </div>

              {/* Phân quyền tự động khi đăng nhập */}
              <div className="pt-2 border-t border-border/80 space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Tự động chuyển hướng theo vai trò:
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-foreground/90">
                    <GraduationCap className="w-4 h-4 text-blue-500 shrink-0" />
                    <span><strong>Học sinh:</strong> Thi thử, làm bài luyện tập & xem kết quả</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/90">
                    <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Giáo viên:</strong> Quản lý lớp, tạo đề thi & chấm điểm</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground/90">
                    <Shield className="w-4 h-4 text-purple-500 shrink-0" />
                    <span><strong>Quản trị viên:</strong> Giám sát hệ thống & quản trị khảo thí</span>
                  </div>
                </div>
              </div>

              {/* Hỗ trợ nhanh */}
              <div className="p-3 rounded-xl bg-muted/60 border border-border/60 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Chưa có tài khoản hoặc gặp lỗi đăng nhập? Vui lòng liên hệ Giáo viên phụ trách hoặc Ban quản trị để được cấp quyền.
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* 3. Footer 1 dòng ngắn gọn ở chân trang */}
      <footer className="relative z-10 w-full border-t border-border/70 py-4 px-4 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 FPREP LMS • Hệ thống Khảo thí & Ôn luyện Chuẩn GDPT 2026</span>
          <span className="text-[11px]">Bảo mật SSL 256-bit • Đăng nhập an toàn qua Google OAuth</span>
        </div>
      </footer>

    </div>
  );
}
