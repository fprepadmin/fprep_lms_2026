'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  LogIn, BookOpen, Clock, BarChart3, HelpCircle, 
  Mail, MapPin, Sun, Moon, CheckCircle2, 
  ChevronDown, GraduationCap, Laptop, Shield
} from 'lucide-react';
import Footer from '@/components/Footer';

export default function LandingPage() {
  const { user, loading, loginWithGoogle, loginAsDemo, isDemo } = useAuth();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Khởi tạo trạng thái Dark/Light Mode từ tùy chọn hệ thống hoặc lưu trữ
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

  // Redirect if logged in
  useEffect(() => {
    if (user && !loading) {
      const targetRole = user.role === 'head_of_department' ? 'teacher' : user.role;
      router.push(`/dashboard/${targetRole}`);
    }
  }, [user, loading, router]);

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

  const handleAuthAction = async () => {
    if (user) {
      const targetRole = user.role === 'head_of_department' ? 'teacher' : user.role;
      router.push(`/dashboard/${targetRole}`);
    } else {
      try {
        await loginWithGoogle();
      } catch (err) {
        console.error('Đăng nhập thất bại:', err);
      }
    }
  };

  const features = [
    {
      icon: <BookOpen className="h-6 w-6 text-primary" />,
      title: "Lộ trình tự học rõ ràng",
      desc: "Nội dung chia theo Chương và Bài học, bám sát chương trình Khối 12."
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      title: "Theo dõi thời lượng học",
      desc: "Hệ thống tự động ghi nhận thời gian học và tiến độ từng bài."
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      title: "Báo cáo tiến độ trực quan",
      desc: "Học sinh và giáo viên xem biểu đồ tiến độ theo thời gian thực."
    }
  ];

  const guides = [
    {
      step: "01",
      title: "Đăng nhập Google",
      desc: "Dùng tài khoản Email FPT do nhà trường cấp để đăng nhập qua Google."
    },
    {
      step: "02",
      title: "Chọn môn học",
      desc: "Xem danh sách môn theo phân ban Tự nhiên, Xã hội hoặc Tiếng Anh."
    },
    {
      step: "03",
      title: "Tự học",
      desc: "Xem video, đọc tài liệu và đánh dấu hoàn thành để lưu tiến trình."
    }
  ];

  const faqs = [
    {
      q: "Tài khoản nào có thể đăng nhập?",
      a: "Chỉ tài khoản Email @fpt.edu.vn hoặc @fe.edu.vn do FPT School Cần Thơ cấp. Hệ thống tự nhận diện vai trò học sinh/giáo viên."
    },
    {
      q: "Hệ thống ghi nhận lịch sử học tập như thế nào?",
      a: "Thời gian xem video, đọc tài liệu được tự động ghi lại. Sau mỗi bài học, bấm 'Đánh dấu hoàn thành' để cập nhật tiến độ."
    },
    {
      q: "Giáo viên theo dõi học sinh như thế nào?",
      a: "Giáo viên xem được tiến độ, thời lượng học tập và điểm thi của học sinh trong các lớp được phân công."
    },
    {
      q: "Admin có xem được dữ liệu học tập không?",
      a: "Không. Admin chỉ quản lý hệ thống, phân quyền và nhật ký bảo mật — không truy cập dữ liệu học tập của học sinh."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* 1. HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo_ngang.png" alt="FPREP Logo" className="h-13 w-auto object-contain" />
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="rounded-full p-2 hover:bg-muted transition-colors border border-border"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-primary" />}
            </button>
            
            {loading ? (
              <div className="h-8 w-28 animate-pulse rounded-lg bg-muted" />
            ) : user ? (
              <button 
                onClick={handleAuthAction}
                className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:opacity-90 transition-opacity"
              >
                Vào Dashboard
              </button>
            ) : (
              <button 
                onClick={handleAuthAction}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <LogIn className="h-4 w-4" /> Đăng nhập
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden py-20 lg:py-32 border-b border-border bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Nội dung bên trái */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Laptop className="h-4 w-4" /> Nền tảng học tập nội bộ
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                HỆ THỐNG TỰ HỌC <br />
                <span className="text-primary">LMS KHỐI 12</span>
              </h1>
              <p className="mx-auto lg:mx-0 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Hệ thống tự học nội bộ dành cho học sinh Khối 12 – THPT FPT Cần Thơ.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {user ? (
                  <button 
                    onClick={handleAuthAction}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/25 transition-all"
                  >
                    Vào học ngay
                  </button>
                ) : isDemo ? (
                  <a 
                    href="#login-card"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/25 transition-all"
                  >
                    Đăng nhập Demo
                  </a>
                ) : (
                  <button 
                    onClick={handleAuthAction}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/25 transition-all"
                  >
                    {loading ? 'Đang kiểm tra...' : 'Đăng nhập bằng Google'}
                  </button>
                )}
                <a 
                  href="#features" 
                  className="w-full sm:w-auto text-center rounded-lg border border-border px-8 py-3.5 text-base font-bold hover:bg-muted transition-colors"
                >
                  Tìm hiểu thêm
                </a>
              </div>
            </div>
            
            {/* Ảnh / Card minh họa bên phải */}
            <div className="lg:col-span-5 flex justify-center">
              <div id="login-card" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl relative scroll-mt-20">
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-500 border border-green-500/20">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Trực tuyến
                </div>
                
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b border-border pb-3">
                  <Shield className="h-5 w-5 text-secondary" /> Cổng Đăng Nhập F-LMS
                </h3>
                
                <div className="space-y-4 pt-2">
                  <button 
                    onClick={handleAuthAction}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-primary py-3 font-bold text-sm text-primary-foreground hover:opacity-95 shadow-md shadow-primary/20 transition-opacity"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff" opacity="0.9" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z" fill="#ffffff" opacity="0.8" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff" opacity="0.9" />
                    </svg>
                    Đăng nhập bằng Google FPT
                  </button>

                  <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                    Chỉ dành cho tài khoản Email <strong>@fpt.edu.vn</strong> do nhà trường cấp.
                  </p>

                  {isDemo && (
                    <div className="pt-3 border-t border-border/50 space-y-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block text-center">Hoặc sử dụng tài khoản Demo</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => loginAsDemo('student')}
                          disabled={loading}
                          className="flex items-center justify-center rounded-lg border border-border bg-muted/40 py-2 text-[10px] font-bold hover:bg-muted transition-colors text-foreground"
                        >
                          Học sinh
                        </button>
                        <button
                          onClick={() => loginAsDemo('teacher')}
                          disabled={loading}
                          className="flex items-center justify-center rounded-lg border border-border bg-muted/40 py-2 text-[10px] font-bold hover:bg-muted transition-colors text-foreground"
                        >
                          Giáo viên
                        </button>
                        <button
                          onClick={() => loginAsDemo('admin')}
                          disabled={loading}
                          className="flex items-center justify-center rounded-lg border border-border bg-muted/40 py-2 text-[10px] font-bold hover:bg-muted transition-colors text-foreground"
                        >
                          Admin
                        </button>
                        <button
                          onClick={() => loginAsDemo('head_of_department')}
                          disabled={loading}
                          className="flex items-center justify-center rounded-lg border border-border bg-muted/40 py-2 text-[10px] font-bold hover:bg-muted transition-colors text-foreground"
                        >
                          Trưởng bộ môn
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="py-20 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Tính Năng Nổi Bật</h2>
            <p className="text-muted-foreground text-lg">
              Được thiết kế và tối ưu riêng cho nhu cầu tự học của học sinh và hoạt động giảng dạy của giáo viên Khối 12.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feat, index) => (
              <div 
                key={index} 
                className="rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="inline-block rounded-lg bg-primary/10 p-3">
                  {feat.icon}
                </div>
                <h3 className="font-extrabold text-xl">{feat.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. USER GUIDE SECTION */}
      <section className="py-20 border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Hướng Dẫn Học Tập</h2>
            <p className="text-muted-foreground text-lg">
              Bắt đầu hành trình tự học trên LMS chỉ với 3 bước đơn giản.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 relative">
            {guides.map((guide, index) => (
              <div key={index} className="bg-card rounded-xl border border-border p-6 shadow-sm relative">
                <span className="text-5xl font-black text-primary/10 absolute top-4 right-4">{guide.step}</span>
                <h3 className="font-bold text-lg mb-2">{guide.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{guide.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Hỏi Đáp Thường Gặp</h2>
            <p className="text-muted-foreground text-lg">
              Giải đáp các thắc mắc phổ biến về việc đăng nhập, bảo mật và sử dụng hệ thống.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index} 
                  className="rounded-lg border border-border bg-card overflow-hidden transition-colors"
                >
                  <button 
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-base sm:text-lg focus:outline-none"
                  >
                    <span className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary shrink-0" /> {faq.q}</span>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 border-t border-border/50 text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. CONTACT SECTION */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Liên hệ hỗ trợ</h2>
              <p className="text-muted-foreground leading-relaxed">
                Gặp lỗi đăng nhập hoặc sự cố nội dung? Liên hệ bộ phận kỹ thuật:
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold">Email hỗ trợ</span>
                    <span className="font-semibold text-sm">thongtnm12@fpt.edu.vn</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold">Địa chỉ trường</span>
                    <span className="font-semibold text-sm">Nguyễn Văn Cừ Nối Dài, Q. Ninh Kiều, TP. Cần Thơ</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-extrabold text-xl mb-4">Gửi Yêu Cầu Hỗ Trợ</h3>
              <form onSubmit={(e) => { e.preventDefault(); alert('Chức năng liên hệ đang được cập nhật.'); }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-xs font-bold text-muted-foreground">Họ tên</label>
                    <input type="text" id="name" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-xs font-bold text-muted-foreground">Email FPT</label>
                    <input type="email" id="email" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="msg" className="text-xs font-bold text-muted-foreground">Nội dung cần hỗ trợ</label>
                  <textarea id="msg" rows={4} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"></textarea>
                </div>
                <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                  Gửi yêu cầu
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER ĐỒNG BỘ */}
      <Footer />

    </div>
  );
}
