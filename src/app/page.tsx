'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  LogIn, BookOpen, Clock, BarChart3, HelpCircle, 
  Mail, MapPin, Sun, Moon, CheckCircle2, 
  ChevronDown, GraduationCap, Laptop, Shield
} from 'lucide-react';

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
      desc: "Nội dung học tập được chia chi tiết theo Chương và Bài học tương ứng với khung chương trình Khối 12 mới."
    },
    {
      icon: <Clock className="h-6 w-6 text-primary" />,
      title: "Theo dõi thời lượng học",
      desc: "Hệ thống tự động ghi nhận thời gian đọc tài liệu, xem video của từng học sinh để tối ưu hóa lộ trình."
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      title: "Báo cáo tiến độ trực quan",
      desc: "Giáo viên và học sinh đều có thể xem biểu đồ tiến độ hoàn thành các bài học chi tiết theo thời gian thực."
    }
  ];

  const guides = [
    {
      step: "01",
      title: "Đăng nhập Google",
      desc: "Sử dụng tài khoản Email FPT do nhà trường cung cấp để đăng nhập nhanh qua Google Sign-In."
    },
    {
      step: "02",
      title: "Lựa chọn môn học",
      desc: "Xem danh sách môn học theo phân ban Tự nhiên (Toán, Lý, Hóa, Sinh, Tin) hoặc Xã hội (Văn, Sử, Địa, GD KTPL) và Tiếng Anh."
    },
    {
      step: "03",
      title: "Học tập tự chủ",
      desc: "Xem video bài giảng trực tiếp, đọc tài liệu PDF, Slide và đánh dấu hoàn thành bài học để lưu tiến trình."
    }
  ];

  const faqs = [
    {
      q: "Tài khoản nào có thể đăng nhập vào hệ thống?",
      a: "Hệ thống tích hợp Google Sign-In, người dùng đăng nhập bằng Email do FPT School Cần Thơ cấp (định dạng @fpt.edu.vn hoặc @fe.edu.vn) để được tự động nhận diện vai trò tương ứng."
    },
    {
      q: "Hệ thống lưu trữ lịch sử học tập như thế nào?",
      a: "Khi bạn mở một bài giảng, hệ thống sẽ bắt đầu ghi nhận thời gian bạn xem video bài giảng (Youtube embed) hoặc đọc PDF (Google Drive preview). Khi kết thúc bài, bạn bấm nút 'Đánh dấu hoàn thành' để cập nhật tiến độ."
    },
    {
      q: "Giáo viên quản lý thông tin học sinh như thế nào?",
      a: "Giáo viên được phân quyền sẽ thấy danh sách các lớp mình giảng dạy (12T1-T6, 12X1-X4, 12K), xem thông tin tiến độ, MSHS, họ tên, email và chi tiết thời lượng học tập của từng học sinh thuộc lớp phụ trách."
    },
    {
      q: "Tài khoản Admin có xem được điểm hay thông tin học sinh không?",
      a: "Không. Để bảo mật và tôn trọng quyền riêng tư học tập của học sinh, tài khoản Admin chỉ được phân quyền theo dõi log hệ thống, lỗi, giám sát bảo mật và phân quyền mà không được phép truy cập bất kỳ dữ liệu học tập nào."
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
                Nền tảng hỗ trợ học sinh Khối 12 Trường THPT FPT Cần Thơ tự học, nâng cao kiến thức theo lộ trình bài bản, đa dạng học liệu và theo dõi tiến trình thông minh.
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

                  <p className="text-[10px] text-muted-foreground text-center font-semibold leading-relaxed">
                    Hệ thống tự động nhận diện Email FPT và phân quyền học sinh/giáo viên ngay sau khi xác thực thành công.
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
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Liên Hệ Ban Quản Trị</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nếu bạn gặp khó khăn trong quá trình đăng nhập hoặc lỗi nội dung học tập, vui lòng liên hệ với bộ phận kỹ thuật để được hỗ trợ nhanh nhất.
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
                    <span className="font-semibold text-sm">Đại học FPT Cần Thơ, Nguyễn Văn Cừ Nối Dài, Q. Ninh Kiều, TP. Cần Thơ</span>
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

      {/* 7. FOOTER */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            {/* Left Column: Logo & Copyright */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <img src="/logo_chu_duoi.png" alt="FPREP Logo" className="h-24 w-auto object-contain" />
              <p className="text-xs text-muted-foreground font-semibold">
                Phát triển bởi <span className="font-bold text-primary">Trần Ngọc Minh Thông</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                &copy; {new Date().getFullYear()} THPT FPT Cần Thơ. Tất cả quyền lợi được bảo lưu.
              </p>
            </div>

            {/* Right Column: Links */}
            <div className="flex flex-wrap justify-center md:justify-start gap-x-12 gap-y-6 text-sm text-muted-foreground font-semibold">
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">Giới thiệu & Hướng dẫn</span>
                <a href="/guide?tab=about" className="hover:text-primary transition-colors">Giới thiệu</a>
                <a href="/guide?tab=usage" className="hover:text-primary transition-colors">Hướng dẫn sử dụng</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">Pháp lý & Điều khoản</span>
                <a href="/guide?tab=terms" className="hover:text-primary transition-colors">Điều khoản sử dụng</a>
                <a href="/guide?tab=privacy" className="hover:text-primary transition-colors">Điều khoản dữ liệu người dùng</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
