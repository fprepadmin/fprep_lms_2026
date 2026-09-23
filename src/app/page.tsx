'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { 
  LogIn, BookOpen, Clock, BarChart3, HelpCircle, 
  Mail, MapPin, Sun, Moon, CheckCircle2, 
  ChevronDown, GraduationCap, Laptop, Shield,
  ArrowRight, Sparkles, Flame, Check, X,
  Calculator, Atom, FlaskConical, Dna, Languages,
  History, Globe2, Scale, Binary, ExternalLink,
  ChevronRight, Compass, Target, Award,
  Users, Layers, Menu, Heart, Code2, Send
} from 'lucide-react';
import Footer from '@/components/Footer';
import MaintenanceScreen from '@/components/MaintenanceScreen';
import { getMaintenanceStatus } from '@/lib/maintenance';
import MathRenderer from '@/components/MathRenderer';

export default function LandingPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<'all' | 'natural' | 'social' | 'other'>('all');

  // Interactive Demo Question State in Hero
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean | null>>({
    a: true,
    b: null,
    c: false,
    d: null,
  });

  // Maintenance check
  useEffect(() => {
    const checkMaintenance = () => {
      setIsMaintenance(getMaintenanceStatus());
    };
    checkMaintenance();
    window.addEventListener('maintenance_status_changed', checkMaintenance);
    return () => window.removeEventListener('maintenance_status_changed', checkMaintenance);
  }, []);

  // Dark/Light Mode initial setup
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

  // Redirect if user is logged in
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

  const subjects = [
    {
      id: 'toan',
      name: 'Toán học',
      category: 'natural',
      icon: <Calculator className="h-6 w-6 text-orange-500" />,
      badge: 'Cổng FMATH12',
      isFMath: true,
      desc: 'Hàm số, Hình học Oxyz, Xác suất & Thống kê có điều kiện chuẩn cấu trúc 2026.',
      link: 'https://fmath12-fschool.web.app/'
    },
    {
      id: 'vatli',
      name: 'Vật lí',
      category: 'natural',
      icon: <Atom className="h-6 w-6 text-blue-500" />,
      badge: 'Cấu trúc 2026',
      desc: 'Khí lí tưởng, Nhiệt học, Từ trường, Hạt nhân và Năng lượng nguyên tử.'
    },
    {
      id: 'hoahoc',
      name: 'Hóa học',
      category: 'natural',
      icon: <FlaskConical className="h-6 w-6 text-emerald-500" />,
      badge: 'Bám sát GDPT',
      desc: 'Este - Lipid, Hợp chất Nitrogen, Polime và Pin điện hóa - Điện phân.'
    },
    {
      id: 'sinhhoc',
      name: 'Sinh học',
      category: 'natural',
      icon: <Dna className="h-6 w-6 text-green-500" />,
      badge: '3 Dạng thức',
      desc: 'Di truyền học phân tử, Quy luật Mendel, Tiến hóa và Sinh thái học môi trường.'
    },
    {
      id: 'tienganh',
      name: 'Tiếng Anh',
      category: 'other',
      icon: <Languages className="h-6 w-6 text-purple-500" />,
      badge: 'Format 2026',
      desc: 'Đọc hiểu logic, Điền từ đoạn văn, Sắp xếp mạch lạc và Ngữ pháp nâng cao.'
    },
    {
      id: 'lichsu',
      name: 'Lịch sử',
      category: 'social',
      icon: <History className="h-6 w-6 text-rose-500" />,
      badge: 'Chuyên đề ôn',
      desc: 'Thế giới hiện đại từ 1945, Kháng chiến bảo vệ Tổ quốc và Hội nhập quốc tế.'
    },
    {
      id: 'diali',
      name: 'Địa lí',
      category: 'social',
      icon: <Globe2 className="h-6 w-6 text-cyan-500" />,
      badge: 'Atlas & Số liệu',
      desc: 'Địa lí tự nhiên, dân cư, cơ cấu kinh tế theo vùng trọng điểm lãnh thổ.'
    },
    {
      id: 'gdcd',
      name: 'GDKT & PL',
      category: 'social',
      icon: <Scale className="h-6 w-6 text-indigo-500" />,
      badge: 'Thực tiễn 2026',
      desc: 'Kinh tế thị trường, Pháp luật trong đời sống và Quyền công dân thời đại số.'
    },
    {
      id: 'tinhoc',
      name: 'Tin học',
      category: 'other',
      icon: <Binary className="h-6 w-6 text-teal-500" />,
      badge: 'Khoa học máy tính',
      desc: 'Cơ sở dữ liệu quan hệ, Lập trình ứng dụng và An toàn thông tin số.'
    }
  ];

  const filteredSubjects = subjects.filter(s => {
    if (selectedSubjectTab === 'all') return true;
    return s.category === selectedSubjectTab;
  });

  const faqs = [
    {
      q: "Tài khoản nào có thể đăng nhập vào hệ thống F-PREP?",
      a: "Hệ thống hỗ trợ xác thực qua Google với tài khoản Email FPT (@fpt.edu.vn, @fe.edu.vn) hoặc Email cá nhân (@gmail.com). Hệ thống phân quyền tự động theo vai trò: Học sinh, Giáo viên hoặc Quản trị viên."
    },
    {
      q: "Cấu trúc đề thi mới 2026 trên F-PREP gồm những dạng thức nào?",
      a: "F-PREP bám sát 100% hướng dẫn của Bộ GD&ĐT với 3 dạng thức trắc nghiệm mới: Dạng I (Nhiều lựa chọn - 0.25đ/câu), Dạng II (Trắc nghiệm Đúng/Sai 4 lệnh hỏi - tối đa 1.0đ/câu), và Dạng III (Trả lời ngắn/Điền số)."
    },
    {
      q: "Hệ thống ghi nhận và đồng bộ tiến độ học tập như thế nào?",
      a: "Mọi hoạt động từ xem video, đọc tài liệu, làm bài tập trắc nghiệm và thời gian học đều được lưu trữ đám mây thời gian thực, đồng bộ ngay lập tức giữa thiết bị học sinh và giáo viên phụ trách."
    },
    {
      q: "Học sinh môn Toán học có điểm gì đặc biệt?",
      a: "Môn Toán học lớp 12 được liên kết chuyên sâu với cổng FMATH12 (https://fmath12-fschool.web.app/), nơi cung cấp kho bài giảng tương tác và hệ thống luyện đề chuyên biệt môn Toán dành cho học sinh FSchool."
    },
    {
      q: "Tôi cần hỗ trợ kỹ thuật hoặc góp ý nội dung thì liên hệ ai?",
      a: "Bạn có thể gửi email trực tiếp đến ban phát triển hệ thống qua địa chỉ bythongtran@gmail.com hoặc để lại tin nhắn tại mục Liên hệ ở cuối trang."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 selection:bg-orange-500/20 selection:text-orange-600 font-sans">
      
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/3 w-[550px] h-[550px] bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-3xl transform -translate-x-1/2" />
        <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] bg-blue-600/10 dark:bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* 1. GLASSMORPHIC NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl transition-all">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 group">
              <img 
                src="/logo_ngang.png" 
                alt="FPREP Logo" 
                className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-[1.02]" 
              />
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <a 
              href="#format-2026" 
              className="px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-all flex items-center gap-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              Chuẩn 2026
            </a>
            <a 
              href="#team" 
              className="px-3.5 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-500/10 transition-all flex items-center gap-1.5"
            >
              <Users className="h-4 w-4" />
              Đội ngũ xây dựng
            </a>
            <a 
              href="#curriculum" 
              className="px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-all"
            >
              Môn học
            </a>
            <a 
              href="#guides" 
              className="px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-all"
            >
              Lộ trình
            </a>
            <a 
              href="#faqs" 
              className="px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-all"
            >
              Hỏi đáp
            </a>
            <a 
              href="#contact" 
              className="px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-all"
            >
              Liên hệ
            </a>
          </nav>
          
          {/* Header Action Buttons */}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm cursor-pointer"
              aria-label="Toggle dark mode"
              title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="h-5 w-5 text-blue-600 animate-in spin-in-180 duration-300" />
              )}
            </button>
            
            {loading ? (
              <div className="h-10 w-32 animate-pulse rounded-xl bg-muted border border-border/50" />
            ) : user ? (
              <button 
                onClick={handleAuthAction}
                className="group flex items-center gap-2 rounded-xl bg-primary px-4 sm:px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95"
              >
                <span>Vào Dashboard</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button 
                onClick={handleAuthAction}
                className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-4 sm:px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:opacity-95 transition-all cursor-pointer active:scale-95"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#ffffff" opacity="0.9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#ffffff" opacity="0.8" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z" />
                  <path fill="#ffffff" opacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Đăng nhập</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-lg border border-border text-muted-foreground hover:text-foreground"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200">
            <a 
              href="#format-2026" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-muted"
            >
              Cấu trúc Đề thi 2026
            </a>
            <a 
              href="#team" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold font-bold text-foreground hover:bg-muted"
            >
              Đội ngũ xây dựng & Cố vấn
            </a>
            <a 
              href="#curriculum" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted"
            >
              Môn học Khối 12
            </a>
            <a 
              href="#guides" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted"
            >
              Lộ trình 3 bước
            </a>
            <a 
              href="#faqs" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted"
            >
              Hỏi đáp thường gặp
            </a>
            <a 
              href="#contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold hover:bg-muted"
            >
              Liên hệ hỗ trợ
            </a>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative z-10 pt-10 pb-16 lg:pt-16 lg:pb-28 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2.5 rounded-full border border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/15 px-4 py-1.5 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400 shadow-sm backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <Sparkles className="h-4 w-4" />
                <span>Trường THPT FPT Cần Thơ • Cổng Tự Học Khối 12</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] text-foreground">
                Bứt Phá Điểm Số Kỳ Thi <br />
                <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
                  Tốt Nghiệp THPT 2026
                </span>
              </h1>

              <p className="mx-auto lg:mx-0 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Hệ thống tự học và luyện thi trực tuyến chuyên sâu, chuẩn ma trận 3 dạng thức trắc nghiệm mới của Bộ GD&ĐT. 
                Được phát triển và đồng hành bởi <strong>Tổ Tự Nhiên - THPT FPT Cần Thơ</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                {user ? (
                  <button 
                    onClick={handleAuthAction}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Vào Dashboard Học Tập</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                ) : (
                  <button 
                    onClick={handleAuthAction}
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff" opacity="0.9" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z" fill="#ffffff" opacity="0.8" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff" opacity="0.9" />
                    </svg>
                    <span>{loading ? 'Đang xác thực...' : 'Đăng nhập Email FPT'}</span>
                  </button>
                )}

                <a 
                  href="#team" 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-7 py-4 text-base font-bold text-foreground hover:bg-muted hover:border-foreground/20 transition-all shadow-sm"
                >
                  <Users className="h-4 w-4 text-orange-500" />
                  <span>Đội ngũ xây dựng</span>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Chuẩn 100% Cấu trúc 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Email FPT Cần Thơ</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Công thức KaTeX sắc nét</span>
                </div>
              </div>

            </div>
            
            {/* Right Column: Live Mockup Card */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-lg">
                
                {/* Floating Streak Pill */}
                <div className="absolute -top-4 -left-4 z-20 hidden sm:flex items-center gap-2 rounded-2xl bg-card border border-border/80 px-4 py-2.5 shadow-xl backdrop-blur-md">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                    <Flame className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chuỗi học tập</div>
                    <div className="text-sm font-black text-foreground">7 ngày liên tục 🔥</div>
                  </div>
                </div>

                {/* Floating Score Badge */}
                <div className="absolute -bottom-4 -right-4 z-20 hidden sm:flex items-center gap-2 rounded-2xl bg-card border border-border/80 px-4 py-2.5 shadow-xl backdrop-blur-md">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Điểm TB Luyện Đề</div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">9.2 / 10 Điểm ⭐</div>
                  </div>
                </div>

                {/* Mac-style Window Mockup */}
                <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 shadow-2xl space-y-4 transition-all">
                  
                  {/* Browser Bar */}
                  <div className="flex items-center justify-between border-b border-border/70 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                      <span className="ml-2 font-bold text-xs text-muted-foreground">Phòng Thi Trực Tuyến 2026</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                      <span>Dạng II: Đúng / Sai</span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Câu hỏi 02 / 20</span>
                      <span className="text-orange-500 font-bold">Toán 12 • Khảo sát hàm số</span>
                    </div>

                    <div className="rounded-xl bg-muted/50 p-3 border border-border/60">
                      <MathRenderer 
                        content="Cho hàm số $y = f(x) = x^3 - 3x^2 + 2$. Các mệnh đề sau đây đúng hay sai?" 
                        className="text-xs sm:text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Interactive Sub-questions */}
                  <div className="space-y-2 text-xs">
                    {[
                      { key: 'a', text: 'Hàm số đồng biến trên khoảng $(-\\infty; 0)$ và $(2; +\\infty)$.' },
                      { key: 'b', text: 'Điểm cực đại của đồ thị hàm số là $M(0; 2)$.' },
                      { key: 'c', text: 'Giá trị nhỏ nhất của hàm số trên $[0; 3]$ bằng $0$.' },
                      { key: 'd', text: 'Đồ thị cắt trục hoành tại 3 điểm phân biệt.' },
                    ].map((item) => {
                      const ans = tfAnswers[item.key];
                      return (
                        <div 
                          key={item.key} 
                          className="flex items-center justify-between gap-2.5 p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex-1 text-xs font-medium leading-relaxed">
                            <span className="font-bold text-orange-500 mr-1.5">{item.key})</span>
                            <MathRenderer content={item.text} className="inline" />
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setTfAnswers(prev => ({ ...prev, [item.key]: true }))}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                ans === true 
                                  ? 'bg-emerald-500 text-white shadow-sm' 
                                  : 'bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                              <span>Đúng</span>
                            </button>

                            <button
                              onClick={() => setTfAnswers(prev => ({ ...prev, [item.key]: false }))}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                ans === false 
                                  ? 'bg-rose-500 text-white shadow-sm' 
                                  : 'bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600'
                              }`}
                            >
                              <X className="h-3 w-3" />
                              <span>Sai</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Bar & Footer */}
                  <div className="pt-2 border-t border-border/70 flex items-center justify-between">
                    <div className="w-1/2 space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                        <span>Tiến độ bài làm</span>
                        <span>85%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full w-[85%]" />
                      </div>
                    </div>

                    <button 
                      onClick={handleAuthAction}
                      className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      <span>Vào luyện đề</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. METRICS TICKER SECTION */}
      <section className="relative z-10 border-y border-border/70 bg-card/40 backdrop-blur-md py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">100%</div>
                <div className="text-xs text-muted-foreground font-semibold">Cấu trúc Bộ GD&ĐT 2026</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">3 Dạng Thức</div>
                <div className="text-xs text-muted-foreground font-semibold">Trắc nghiệm Đột phá</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">12 Môn Học</div>
                <div className="text-xs text-muted-foreground font-semibold">Khối 12 Tự Nhiên & Xã Hội</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-foreground">Realtime</div>
                <div className="text-xs text-muted-foreground font-semibold">Tự động đồng bộ tiến độ</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FEATURED: ĐỘI NGŨ XÂY DỰNG & CỐ VẤN CHUYÊN MÔN (HIGH PRIORITY) */}
      <section id="team" className="py-24 border-b border-border/70 relative bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 shadow-sm">
              <Heart className="h-4 w-4 fill-current text-rose-500" />
              <span>Deep Learning with Love • THPT FPT Cần Thơ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Đội Ngũ Xây Dựng & Cố Vấn Chuyên Môn
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Sự kết hợp giữa chuyên môn sư phạm vững vàng và tinh thần đổi mới sáng tạo công nghệ của Thầy & Trò trường THPT FPT Cần Thơ.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            
            {/* 1. Thầy Thạch Thanh Tâm */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-orange-500/50 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-center sm:items-start group">
              <div className="relative shrink-0">
                <div className="w-36 h-44 sm:w-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-orange-500/40 shadow-lg group-hover:scale-[1.03] transition-transform duration-300 bg-muted">
                  <img 
                    src="/team/thay_tam.png" 
                    alt="Thầy Thạch Thanh Tâm" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-orange-500 text-white shadow-md">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-xs font-extrabold text-orange-600 dark:text-orange-400">
                  <span>Trưởng Tổ Tự Nhiên</span>
                </div>
                
                <h3 className="text-2xl font-black text-foreground">
                  Thầy Thạch Thanh Tâm
                </h3>
                
                <div className="text-sm font-bold text-primary">
                  Chỉ Đạo Chuyên Môn & Cố Vấn Học Thuật
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Định hướng cấu trúc chuyên môn, chuẩn hóa ngân hàng câu hỏi bám sát ma trận thi Tốt nghiệp THPT 2026 và giám sát chất lượng học liệu số dành cho học sinh Khối 12.
                </p>

                <div className="pt-2 border-t border-border/60">
                  <div className="text-xs font-semibold italic text-orange-600 dark:text-orange-400 flex items-center justify-center sm:justify-start gap-1.5">
                    <span>&ldquo;Học sâu sắc để yêu thương&rdquo;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Trần Ngọc Minh Thông */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-center sm:items-start group">
              <div className="relative shrink-0">
                <div className="w-36 h-44 sm:w-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-blue-500/40 shadow-lg group-hover:scale-[1.03] transition-transform duration-300 bg-muted">
                  <img 
                    src="/team/minh_thong.png" 
                    alt="Trần Ngọc Minh Thông" 
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-blue-600 text-white shadow-md">
                  <Code2 className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-xs font-extrabold text-blue-600 dark:text-blue-400">
                  <span>Học sinh Lớp 12T3 • Khóa K6</span>
                </div>
                
                <h3 className="text-2xl font-black text-foreground">
                  Trần Ngọc Minh Thông
                </h3>
                
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  Kiến Trúc Sư Hệ Thống & Lead Developer
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Thiết kế toàn bộ kiến trúc nền tảng FPREP, tích hợp công cụ kết xuất toán KaTeX, lập trình hệ thống 3 dạng thức trắc nghiệm và tối ưu hóa trải nghiệm tự học cho FSchoolers.
                </p>

                <div className="pt-2 border-t border-border/60 flex items-center justify-center sm:justify-start gap-2">
                  <Mail className="h-4 w-4 text-orange-500" />
                  <a 
                    href="mailto:bythongtran@gmail.com" 
                    className="text-xs font-bold text-foreground hover:text-orange-500 transition-colors"
                  >
                    bythongtran@gmail.com
                  </a>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. CẤU TRÚC 3 DẠNG THỨC 2026 */}
      <section id="format-2026" className="py-24 border-b border-border/70 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
              Cập Nhật Mới Nhất
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Chuẩn Hóa Ma Trận Đề Thi Tốt Nghiệp THPT 2026
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              F-PREP là nền tảng tiên phong hỗ trợ toàn diện cả 3 dạng thức trắc nghiệm mới của Bộ GD&ĐT, 
              giúp học sinh làm quen tuyệt đối với cấu trúc phân hóa năng lực.
            </p>
          </div>

          {/* 3 Formats Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Format 1 */}
            <div className="rounded-3xl border border-border/80 bg-card p-7 shadow-sm hover:shadow-xl transition-all space-y-4 group">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 w-fit">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">Phần I • Trắc Nghiệm Chuẩn</div>
              <h3 className="text-xl font-black text-foreground">Nhiều Lựa Chọn (MCQ)</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                4 phương án trả lời A, B, C, D quen thuộc. Mỗi câu trả lời đúng được tính <strong>0.25 điểm</strong>. Kiểm tra các câu hỏi nhận biết và thông hiểu cơ bản.
              </p>
              <div className="pt-2 text-xs font-bold text-blue-600 flex items-center gap-1">
                <span>12 - 18 câu hỏi tùy môn</span>
              </div>
            </div>

            {/* Format 2 */}
            <div className="rounded-3xl border-2 border-orange-500/40 bg-card p-7 shadow-lg hover:shadow-2xl transition-all space-y-4 relative group">
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                Trọng Tâm Phân Hóa
              </div>
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600 w-fit">
                <Flame className="h-6 w-6" />
              </div>
              <div className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">Phần II • Phân Hóa Sâu</div>
              <h3 className="text-xl font-black text-foreground">Đúng / Sai 4 Lệnh Hỏi</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Mỗi câu hỏi có 4 ý a), b), c), d). Thí sinh chọn Đúng hoặc Sai cho từng ý. Tính điểm lũy tiến: đúng 1 ý được 0.1đ, 2 ý được 0.25đ, 3 ý được 0.5đ, đúng cả 4 ý được <strong>1.0 điểm</strong>!
              </p>
              <div className="pt-2 text-xs font-bold text-orange-600 flex items-center gap-1">
                <span>Chống đoán mò tuyệt đối</span>
              </div>
            </div>

            {/* Format 3 */}
            <div className="rounded-3xl border border-border/80 bg-card p-7 shadow-sm hover:shadow-xl transition-all space-y-4 group">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 w-fit">
                <Target className="h-6 w-6" />
              </div>
              <div className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Phần III • Đột Phá Điểm 9-10</div>
              <h3 className="text-xl font-black text-foreground">Trả Lời Ngắn / Điền Số</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Không có sẵn đáp án để chọn. Học sinh phải tự tính toán và nhập kết quả số vào ô trả lời. Đòi hỏi kỹ năng thực hành và vận dụng cao chuẩn xác.
              </p>
              <div className="pt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span>0.25 - 0.5 điểm mỗi câu</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. MÔN HỌC KHỐI 12 (CURRICULUM) */}
      <section id="curriculum" className="py-24 border-b border-border/70 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                Chương Trình Đào Tạo
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Hệ Thống Môn Học Khối 12
              </h2>
              <p className="text-muted-foreground text-base">
                Toàn bộ môn học thuộc phân ban Khoa học Tự nhiên, Khoa học Xã hội và Ngoại ngữ được xây dựng đồng bộ theo chuẩn GDPT 2018.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/80 shadow-sm shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'natural', label: 'Tự Nhiên' },
                { id: 'social', label: 'Xã Hội' },
                { id: 'other', label: 'Ngoại Ngữ & Tin' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSubjectTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedSubjectTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map(sub => (
              <div 
                key={sub.id}
                className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-muted/60 border border-border/50 group-hover:scale-105 transition-transform">
                      {sub.icon}
                    </div>
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full border border-border/80 bg-muted/40 text-muted-foreground">
                      {sub.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-foreground group-hover:text-orange-500 transition-colors flex items-center gap-2">
                    {sub.name}
                    {sub.isFMath && (
                      <span className="text-[10px] font-extrabold bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md border border-orange-500/20">
                        FMATH12 Portal
                      </span>
                    )}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {sub.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60">
                  {sub.isFMath ? (
                    <a 
                      href={sub.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between w-full text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      <span>Truy cập hệ thống FMATH12</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <button 
                      onClick={handleAuthAction}
                      className="inline-flex items-center justify-between w-full text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      <span>Vào học chuyên đề</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. LỘ TRÌNH 3 BƯỚC */}
      <section id="guides" className="py-24 border-b border-border/70">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
              Quy Trình Học Tập
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              3 Bước Tự Học Hiệu Quả Cùng F-PREP
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Bắt đầu hành trình bứt phá điểm thi chỉ trong vài thao tác đơn giản.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            
            {/* Step 1 */}
            <div className="relative rounded-3xl border border-border/80 bg-card p-8 shadow-sm hover:shadow-lg transition-all space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-5xl font-black text-orange-500/20">01</span>
                <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600">
                  <Laptop className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-black text-foreground">Đăng Nhập Email FPT</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sử dụng tài khoản Google Workspace do nhà trường cấp (<strong>@fpt.edu.vn</strong>) để đăng nhập một chạm, tự động đồng bộ lớp học và phân quyền.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-3xl border border-border/80 bg-card p-8 shadow-sm hover:shadow-lg transition-all space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-5xl font-black text-blue-500/20">02</span>
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
                  <Compass className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-black text-foreground">Chọn Môn & Ôn Lý Thuyết</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Xem video phân tích chuyên đề, đọc slide tóm tắt kiến thức trọng tâm và làm bài tập trắc nghiệm củng cố ngay sau bài học.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-3xl border border-border/80 bg-card p-8 shadow-sm hover:shadow-lg transition-all space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-5xl font-black text-emerald-500/20">03</span>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Award className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-xl font-black text-foreground">Luyện Đề 2026 & Đột Phá</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Thực chiến với bộ đề 3 dạng thức mới, nhận kết quả tức thì cùng phân tích ma trận điểm để tự tin chinh phục kỳ thi THPT & ĐGNL.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 8. FAQ ACCORDION SECTION */}
      <section id="faqs" className="py-24 border-b border-border/70 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-bold text-purple-600 dark:text-purple-400">
              Giải Đáp Thắc Mắc
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Câu Hỏi Thường Gặp
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Tất cả thông tin bạn cần biết về tài khoản, cách thức học tập và chính sách hệ thống.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index} 
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen 
                      ? 'border-orange-500/50 bg-card shadow-md' 
                      : 'border-border/80 bg-card/60 hover:bg-card hover:border-border'
                  }`}
                >
                  <button 
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 sm:p-6 text-left font-bold text-base sm:text-lg focus:outline-none cursor-pointer"
                  >
                    <span className="flex items-center gap-3 pr-4">
                      <HelpCircle className={`h-5 w-5 shrink-0 ${isOpen ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      <span className={isOpen ? 'text-foreground' : 'text-foreground/90'}>{faq.q}</span>
                    </span>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-0 text-sm sm:text-base text-muted-foreground leading-relaxed border-t border-border/40 animate-in fade-in-50 duration-200">
                      <p className="pt-3">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 9. CONTACT & TECHNICAL SUPPORT (UPDATED WITH EMAIL bythongtran@gmail.com) */}
      <section id="contact" className="py-24 border-b border-border/70">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                Đồng Hành Cùng FSchoolers
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Hỗ Trợ Kỹ Thuật & Đóng Góp Ý Kiến
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                Đội ngũ phát triển và Ban cố vấn chuyên môn THPT FPT Cần Thơ luôn sẵn sàng giải đáp thắc mắc và tiếp thu ý kiến của học sinh.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card">
                  <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold">Email hỗ trợ kỹ thuật trực tiếp</span>
                    <a href="mailto:bythongtran@gmail.com" className="font-bold text-sm text-foreground hover:text-orange-500 transition-colors">
                      bythongtran@gmail.com
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/80 bg-card">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground font-semibold">Trường THPT FPT Cần Thơ</span>
                    <span className="font-bold text-sm text-foreground">Đường Nguyễn Văn Cừ Nối Dài, P. An Bình, Q. Ninh Kiều, TP. Cần Thơ</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Direct Message Card */}
            <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-xl">
              <h3 className="font-extrabold text-xl mb-2 text-foreground">Gửi Tin Nhắn Cho Đội Ngũ</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Nhập thông tin phản hồi, Minh Thông và ban quản trị sẽ phản hồi qua email trong vòng 24 giờ.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn bạn! Yêu cầu hỗ trợ đã được gửi đến ban quản trị F-PREP (bythongtran@gmail.com).'); }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-bold text-muted-foreground">Họ và tên</label>
                    <input 
                      type="text" 
                      id="name" 
                      required 
                      placeholder="Nguyễn Văn A" 
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-bold text-muted-foreground">Email liên hệ</label>
                    <input 
                      type="email" 
                      id="email" 
                      required 
                      placeholder="anv@fpt.edu.vn" 
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="msg" className="text-xs font-bold text-muted-foreground">Nội dung góp ý hoặc cần hỗ trợ</label>
                  <textarea 
                    id="msg" 
                    rows={4} 
                    required 
                    placeholder="Mô tả sự cố đăng nhập hoặc góp ý cho bài học..." 
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Gửi Phản Hồi Trực Tiếp</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* 10. CTA BANNER */}
      <section className="py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-8 sm:p-12 lg:p-16 shadow-2xl text-center text-white overflow-hidden">
            
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white">
                <Sparkles className="h-4 w-4" /> THPT FPT Cần Thơ • Khóa K6 (2026 - 2026)
              </div>

              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Sẵn Sàng Chinh Phục Điểm 9+ Cùng F-PREP?
              </h2>

              <p className="text-white/90 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                Đăng nhập ngay hôm nay với tài khoản email FPT để bắt đầu hành trình tự học và luyện đề chuẩn cấu trúc Bộ GD&ĐT 2026.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handleAuthAction}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl bg-white px-8 py-4 text-base font-extrabold text-orange-600 hover:bg-slate-100 shadow-xl transition-all cursor-pointer active:scale-95"
                >
                  <LogIn className="h-5 w-5" />
                  <span>{user ? 'Vào Dashboard Học Tập' : 'Đăng Nhập Email FPT'}</span>
                </button>

                <a
                  href="#team"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/40 text-white font-extrabold text-base hover:bg-white/10 transition-all text-center"
                >
                  Gặp gỡ đội ngũ xây dựng
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <Footer />

    </div>
  );
}
