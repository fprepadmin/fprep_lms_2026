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
  Users, Layers, Menu, Heart, Code2, Send,
  Zap, Star, Trophy, ArrowUpRight, CheckSquare,
  Sparkle, ShieldCheck, Activity
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
  const [demoActiveFormat, setDemoActiveFormat] = useState<'mcq' | 'tf' | 'short'>('tf');

  // Interactive Demo Question State in Hero
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean | null>>({
    a: true,
    b: null,
    c: false,
    d: null,
  });
  const [mcqAnswer, setMcqAnswer] = useState<string | null>('b');
  const [shortAnswer, setShortAnswer] = useState<string>('24');

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
      icon: <Calculator className="h-6 w-6 text-blue-500" />,
      badge: 'Cấu trúc 2026',
      desc: 'Hàm số, Hình học không gian Oxyz, Tích phân & Xác suất có điều kiện chuẩn cấu trúc 2026.',
      accent: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60'
    },
    {
      id: 'vatli',
      name: 'Vật lí',
      category: 'natural',
      icon: <Atom className="h-6 w-6 text-amber-500" />,
      badge: 'Cấu trúc 2026',
      desc: 'Vật lí nhiệt, Khí lí tưởng, Từ trường, Vật lí hạt nhân và Năng lượng mới.',
      accent: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
    },
    {
      id: 'hoahoc',
      name: 'Hóa học',
      category: 'natural',
      icon: <FlaskConical className="h-6 w-6 text-rose-500" />,
      badge: 'Bám sát GDPT',
      desc: 'Este - Lipid, Carbohydrate, Hợp chất chứa Nitrogen, Polime và Hóa học phức chất.',
      accent: 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
    },
    {
      id: 'sinhhoc',
      name: 'Sinh học',
      category: 'natural',
      icon: <Dna className="h-6 w-6 text-emerald-500" />,
      badge: '3 Dạng thức',
      desc: 'Di truyền học phân tử, Quy luật di truyền, Tiến hóa quần thể và Sinh thái học ứng dụng.',
      accent: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
    },
    {
      id: 'tienganh',
      name: 'Tiếng Anh',
      category: 'other',
      icon: <Languages className="h-6 w-6 text-indigo-500" />,
      badge: 'Format 2026',
      desc: 'Đọc hiểu suy luận, Điền từ đoạn văn, Sắp xếp câu mạch lạc và Từ vựng học thuật.',
      accent: 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60'
    },
    {
      id: 'tinhoc',
      name: 'Tin học',
      category: 'other',
      icon: <Binary className="h-6 w-6 text-cyan-500" />,
      badge: 'Khoa học máy tính',
      desc: 'Cơ sở dữ liệu quan hệ SQL, Lập trình ứng dụng, Mạng máy tính và An toàn thông tin số.',
      accent: 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60'
    },
    {
      id: 'lichsu',
      name: 'Lịch sử',
      category: 'social',
      icon: <History className="h-6 w-6 text-orange-500" />,
      badge: 'Chuyên đề 12',
      desc: 'Thế giới hiện đại từ sau 1945, Lịch sử Việt Nam hiện đại và Hội nhập kinh tế quốc tế.',
      accent: 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/60'
    },
    {
      id: 'diali',
      name: 'Địa lí',
      category: 'social',
      icon: <Globe2 className="h-6 w-6 text-teal-500" />,
      badge: 'Khai thác Atlas',
      desc: 'Địa lí tự nhiên, dân cư, chuyển dịch cơ cấu kinh tế theo các vùng trọng điểm lãnh thổ.',
      accent: 'border-teal-500/30 bg-teal-500/5 hover:border-teal-500/60'
    },
    {
      id: 'gdcd',
      name: 'GDKT & PL',
      category: 'social',
      icon: <Scale className="h-6 w-6 text-purple-500" />,
      badge: 'Thực tiễn số',
      desc: 'Kinh tế vĩ mô, Pháp luật và Đời sống, Quyền công dân và Trách nhiệm xã hội.',
      accent: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60'
    }
  ];

  const filteredSubjects = subjects.filter(s => {
    if (selectedSubjectTab === 'all') return true;
    return s.category === selectedSubjectTab;
  });

  const faqs = [
    {
      q: "Tài khoản nào có thể đăng nhập vào nền tảng FPREP?",
      a: "Học sinh và Cán bộ Giáo viên chỉ cần bấm nút Đăng nhập qua Google và chọn tài khoản Email FPT (@fpt.edu.vn, @fe.edu.vn) hoặc Email cá nhân. Hệ thống tự động xác thực danh tính, nhận diện lớp học và phân quyền tương ứng."
    },
    {
      q: "Cấu trúc đề thi mới 2026 trên FPREP gồm những dạng thức nào?",
      a: "FPREP bám sát 100% hướng dẫn của Bộ GD&ĐT với 3 dạng thức trắc nghiệm mới: Dạng I (Nhiều lựa chọn - 0.25đ/câu), Dạng II (Trắc nghiệm Đúng/Sai 4 lệnh hỏi - tối đa 1.0đ/câu), và Dạng III (Trả lời ngắn / Điền số kết quả)."
    },
    {
      q: "Hệ thống ghi nhận và đồng bộ tiến độ học tập như thế nào?",
      a: "Mọi hoạt động từ xem video lý thuyết, đọc tài liệu số, làm bài kiểm tra và thời gian tự học đều được lưu trữ đám mây thời gian thực, đồng bộ ngay lập tức giữa tài khoản học sinh và Giáo viên bộ môn phụ trách."
    },
    {
      q: "Hệ thống FPREP hỗ trợ học sinh ôn thi tốt nghiệp THPT như thế nào?",
      a: "FPREP cung cấp lộ trình ôn luyện toàn diện từ hệ thống bài giảng lý thuyết, bài tập tương tác, đến các đề thi thử bám sát định dạng cấu trúc mới 2026 của Bộ GD&ĐT."
    },
    {
      q: "Tôi cần hỗ trợ kỹ thuật hoặc đóng góp ý kiến thì liên hệ ai?",
      a: "Bạn có thể gửi tin nhắn tại biểu mẫu hỗ trợ ở cuối trang hoặc liên hệ với Ban Quản trị qua cổng hỗ trợ học tập để được giải đáp trong vòng 24 giờ."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 selection:bg-primary/20 selection:text-primary font-sans relative overflow-x-hidden">
      
      {/* 1. AMBIENT GLOW BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/10 dark:bg-primary/8 rounded-full blur-3xl opacity-70" />
        <div className="absolute top-[35%] -right-40 w-[550px] h-[550px] bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute top-[65%] -left-40 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* 2. MODERN GLASSMORPHIC HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl transition-all shadow-xs">
        <div className="max-w-[1400px] mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 group">
              <img 
                src="/logo_ngang.png" 
                alt="FPREP Logo" 
                className="h-11 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]" 
              />
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 font-bold text-[13px]">
            <a 
              href="#format-2026" 
              className="px-3.5 py-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/70 transition-all flex items-center gap-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span>Chuẩn 2026</span>
            </a>
            <a 
              href="#curriculum" 
              className="px-3.5 py-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/70 transition-all"
            >
              12 Môn Học
            </a>
            <a 
              href="#features" 
              className="px-3.5 py-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/70 transition-all"
            >
              Tính Năng
            </a>
            <a 
              href="#team" 
              className="px-3.5 py-2 text-primary dark:text-primary rounded-xl hover:bg-primary/10 transition-all flex items-center gap-1.5"
            >
              <Users className="h-4 w-4" />
              <span>Đội Ngũ Xây Dựng</span>
            </a>
            <a 
              href="#faqs" 
              className="px-3.5 py-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/70 transition-all"
            >
              Hỏi Đáp
            </a>
            <a 
              href="#contact" 
              className="px-3.5 py-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/70 transition-all"
            >
              Liên Hệ
            </a>
          </nav>
          
          {/* Action Area: Theme Toggle & Login Button */}
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-xl border border-border bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs flex items-center justify-center cursor-pointer"
              aria-label="Toggle dark mode"
              title={darkMode ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
            >
              {darkMode ? (
                <Sun className="h-4.5 w-4.5 text-amber-400" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-primary" />
              )}
            </button>
            
            {loading ? (
              <div className="h-10 w-36 animate-pulse rounded-xl bg-muted border border-border/50" />
            ) : user ? (
              <button 
                onClick={handleAuthAction}
                className="group flex items-center gap-2 rounded-xl bg-primary px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-extrabold text-primary-foreground hover:opacity-95 shadow-md shadow-primary/25 transition-all cursor-pointer active:scale-95"
              >
                <span>Vào Không Gian Học Tập</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button 
                onClick={handleAuthAction}
                className="group flex items-center gap-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-extrabold shadow-md shadow-primary/25 transition-all cursor-pointer active:scale-95 border border-primary/20"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#ffffff" opacity="0.9" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#ffffff" opacity="0.8" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.19-.63z" />
                  <path fill="#ffffff" opacity="0.9" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Đăng Nhập FPT</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 lg:hidden rounded-xl border border-border text-muted-foreground hover:text-foreground bg-card"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-border bg-card/98 backdrop-blur-2xl px-5 py-4 space-y-2.5 animate-in slide-in-from-top duration-200">
            <a 
              href="#format-2026" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-primary bg-primary/10"
            >
              Cấu trúc Đề thi Mới 2026
            </a>
            <a 
              href="#curriculum" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted"
            >
              12 Môn Học Khối 12
            </a>
            <a 
              href="#team" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted"
            >
              Đội Ngũ Xây Dựng & Cố Vấn
            </a>
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted"
            >
              Tính Năng Nền Tảng
            </a>
            <a 
              href="#faqs" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted"
            >
              Câu Hỏi Thường Gặp
            </a>
            <a 
              href="#contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted"
            >
              Liên Hệ & Đóng Góp Ý Kiến
            </a>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION (HIGH IMPACT & BENTO FEEL) */}
      <section className="relative z-10 pt-8 pb-16 lg:pt-14 lg:pb-24">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column (Hero Content) */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-extrabold text-primary shadow-xs backdrop-blur-md">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>THPT FPT Cần Thơ &bull; Nền Tảng Tự Học Khối 12</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-black tracking-tight leading-[1.15] text-foreground font-heading m-0">
                Bứt Phá Điểm Số Kỳ Thi <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Tốt Nghiệp THPT 2026
                </span>
              </h1>

              <p className="mx-auto lg:mx-0 max-w-xl text-sm sm:text-base text-muted-foreground font-medium leading-relaxed m-0">
                Hệ thống tự học và phòng thi trắc nghiệm trực tuyến chuyên biệt, chuẩn hóa 100% theo <strong>3 dạng thức mới của Bộ GD&ĐT</strong>. 
                Đồng hành và cố vấn chuyên môn bởi <strong>Tổ Tự Nhiên - Trường THPT FPT Cần Thơ</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button 
                  onClick={handleAuthAction}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl bg-primary px-7 py-3.5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-95 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <LogIn className="h-4.5 w-4.5" />
                  <span>{user ? 'Vào Không Gian Học Tập' : 'Đăng Nhập Email FPT'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <a 
                  href="#format-2026" 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-extrabold text-foreground hover:bg-muted hover:border-border/80 transition-all shadow-xs"
                >
                  <span>Khám Phá Cấu Trúc 2026</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>

              {/* Quick Quality Badges */}
              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs font-bold text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Chuẩn Ma trận 2026</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Email @fpt.edu.vn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Công thức KaTeX sắc nét</span>
                </div>
              </div>

            </div>
            
            {/* Right Column: Interactive Live Exam Mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-xl">
                
                {/* Floating Achievement Capsule */}
                <div className="absolute -top-4 -left-4 z-20 hidden sm:flex items-center gap-2.5 rounded-2xl bg-card border border-border px-4 py-2.5 shadow-xl backdrop-blur-md">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                    <Flame className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Chuỗi học tập</div>
                    <div className="text-xs font-black text-foreground">7 ngày liên tục</div>
                  </div>
                </div>

                {/* Floating Score Badge */}
                <div className="absolute -bottom-4 -right-4 z-20 hidden sm:flex items-center gap-2.5 rounded-2xl bg-card border border-border px-4 py-2.5 shadow-xl backdrop-blur-md">
                  <div className="p-2 rounded-xl bg-green-500/10 text-green-600">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Điểm TB Luyện Đề</div>
                    <div className="text-xs font-black text-green-600 dark:text-green-400">9.4 / 10 Điểm</div>
                  </div>
                </div>

                {/* Modern Window Mockup Card */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4 transition-all">
                  
                  {/* Top Bar with Format Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-green-500/80 inline-block" />
                      <span className="ml-2 font-black text-xs text-foreground">Trải Nghiệm Đề Thi 2026</span>
                    </div>

                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
                      <button 
                        onClick={() => setDemoActiveFormat('mcq')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                          demoActiveFormat === 'mcq' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Dạng I
                      </button>
                      <button 
                        onClick={() => setDemoActiveFormat('tf')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                          demoActiveFormat === 'tf' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Dạng II (Đúng/Sai)
                      </button>
                      <button 
                        onClick={() => setDemoActiveFormat('short')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                          demoActiveFormat === 'short' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Dạng III (Điền số)
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Question Viewer */}
                  {demoActiveFormat === 'tf' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>Câu hỏi 02 / 20 &bull; Dạng II</span>
                        <span className="text-primary font-bold">Toán 12 &bull; Khảo sát hàm số</span>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-3.5 border border-border text-xs leading-relaxed font-semibold">
                        <MathRenderer 
                          content="Cho hàm số $y = f(x) = x^3 - 3x^2 + 2$. Xét tính đúng/sai của các mệnh đề sau:" 
                          className="font-semibold text-foreground"
                        />
                      </div>

                      <div className="space-y-2 text-xs">
                        {[
                          { key: 'a', text: 'Hàm số đồng biến trên các khoảng $(-\\infty; 0)$ và $(2; +\\infty)$.' },
                          { key: 'b', text: 'Điểm cực đại của đồ thị hàm số là tọa độ $M(0; 2)$.' },
                          { key: 'c', text: 'Giá trị nhỏ nhất của hàm số trên đoạn $[0; 3]$ bằng $0$.' },
                          { key: 'd', text: 'Đồ thị hàm số cắt trục hoành tại 3 điểm phân biệt.' },
                        ].map((item) => {
                          const ans = tfAnswers[item.key];
                          return (
                            <div 
                              key={item.key} 
                              className="flex items-center justify-between gap-2.5 p-2 rounded-xl border border-border bg-background hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex-1 text-xs font-semibold leading-relaxed">
                                <span className="font-extrabold text-primary mr-1.5">{item.key})</span>
                                <MathRenderer content={item.text} className="inline font-medium" />
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => setTfAnswers(prev => ({ ...prev, [item.key]: true }))}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                                    ans === true 
                                      ? 'bg-green-600 text-white shadow-xs' 
                                      : 'bg-muted text-muted-foreground hover:bg-green-500/10 hover:text-green-600'
                                  }`}
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Đúng</span>
                                </button>

                                <button
                                  onClick={() => setTfAnswers(prev => ({ ...prev, [item.key]: false }))}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                                    ans === false 
                                      ? 'bg-rose-600 text-white shadow-xs' 
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
                    </div>
                  )}

                  {demoActiveFormat === 'mcq' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>Câu hỏi 01 / 18 &bull; Dạng I</span>
                        <span className="text-primary font-bold">Vật lí 12 &bull; Khí lí tưởng</span>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-3.5 border border-border text-xs leading-relaxed font-semibold">
                        <MathRenderer 
                          content="Một khối khí lí tưởng thực hiện quá trình đẳng nhiệt ở nhiệt độ $T = 300\\text{ K}$. Khi thể tích tăng từ $V_1 = 2\\text{ lít}$ lên $V_2 = 4\\text{ lít}$ thì áp suất biến thiên như thế nào?" 
                          className="font-semibold text-foreground"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'a', text: 'Tăng lên 2 lần' },
                          { key: 'b', text: 'Giảm đi 2 lần' },
                          { key: 'c', text: 'Không thay đổi' },
                          { key: 'd', text: 'Tăng lên 4 lần' },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => setMcqAnswer(opt.key)}
                            className={`p-2.5 rounded-xl border text-left font-bold transition-all cursor-pointer flex items-center gap-2 ${
                              mcqAnswer === opt.key 
                                ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20' 
                                : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center text-[10px] uppercase font-black">
                              {opt.key}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {demoActiveFormat === 'short' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>Câu hỏi 04 / 06 &bull; Dạng III</span>
                        <span className="text-primary font-bold">Toán 12 &bull; Hình học Oxyz</span>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-3.5 border border-border text-xs leading-relaxed font-semibold">
                        <MathRenderer 
                          content="Trong không gian $Oxyz$, cho điểm $A(1; 2; 3)$ và mặt phẳng $(P): 2x + 2y - z + 6 = 0$. Khoảng cách từ $A$ đến mặt phẳng $(P)$ bằng bao nhiêu?" 
                          className="font-semibold text-foreground"
                        />
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Đáp án số:</span>
                        <input
                          type="text"
                          value={shortAnswer}
                          onChange={(e) => setShortAnswer(e.target.value)}
                          placeholder="Nhập kết quả..."
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                        />
                        <span className="text-xs font-extrabold text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                          Chính xác (3)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mockup Progress Footer */}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="w-1/2 space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Tiến độ hoàn thành</span>
                        <span className="text-primary font-bold">85%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full w-[85%]" />
                      </div>
                    </div>

                    <button 
                      onClick={handleAuthAction}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-primary hover:underline cursor-pointer"
                    >
                      <span>Vào luyện đề ngay</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. METRICS STRIP */}
      <section className="relative z-10 border-y border-border bg-card/60 backdrop-blur-md py-7">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-heading text-foreground">100%</div>
                <div className="text-xs text-muted-foreground font-semibold">Cấu trúc Bộ GD&ĐT 2026</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-heading text-foreground">3 Dạng Thức</div>
                <div className="text-xs text-muted-foreground font-semibold">Trắc nghiệm Đột phá</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-heading text-foreground">12 Môn Học</div>
                <div className="text-xs text-muted-foreground font-semibold">Ban Tự Nhiên & Xã Hội</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black font-heading text-foreground">Realtime</div>
                <div className="text-xs text-muted-foreground font-semibold">Tự động đồng bộ tiến độ</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. CẤU TRÚC MA TRẬN 3 DẠNG THỨC 2026 (VISUAL BREAKDOWN) */}
      <section id="format-2026" className="py-20 border-b border-border relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-extrabold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Chuẩn Đề Thi Mới
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading text-foreground m-0">
              Chuẩn Hóa Ma Trận Đề Thi Tốt Nghiệp THPT 2026
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold max-w-2xl mx-auto m-0">
              FPREP là nền tảng tiên phong hỗ trợ toàn diện cả 3 dạng thức trắc nghiệm mới của Bộ GD&ĐT, 
              giúp học sinh làm quen tuyệt đối với cấu trúc phân hóa năng lực thực tế.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Format 1 */}
            <div className="rounded-3xl border border-border bg-card p-7 shadow-xs hover:border-primary/50 hover:shadow-md transition-all space-y-4 group">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 w-fit">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider">Phần I &bull; Trắc Nghiệm Chuẩn</div>
              <h3 className="text-xl font-extrabold font-heading text-foreground m-0">Nhiều Lựa Chọn (MCQ)</h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed m-0">
                4 phương án trả lời A, B, C, D quen thuộc. Mỗi câu trả lời đúng được tính <strong>0.25 điểm</strong>. Đánh giá kiến thức nền tảng nhận biết và thông hiểu cơ bản.
              </p>
              <div className="pt-2 text-xs font-bold text-blue-600 flex items-center gap-1">
                <span>12 - 18 câu hỏi tùy môn thi</span>
              </div>
            </div>

            {/* Format 2 */}
            <div className="rounded-3xl border-2 border-primary/40 bg-card p-7 shadow-sm hover:shadow-lg transition-all space-y-4 relative group">
              <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider">
                Trọng Tâm Phân Hóa
              </div>
              <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit">
                <Flame className="h-6 w-6" />
              </div>
              <div className="text-[11px] font-extrabold text-primary uppercase tracking-wider">Phần II &bull; Phân Hóa Sâu</div>
              <h3 className="text-xl font-extrabold font-heading text-foreground m-0">Đúng / Sai 4 Lệnh Hỏi</h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed m-0">
                Mỗi câu hỏi có 4 ý a, b, c, d. Thí sinh chọn Đúng hoặc Sai cho từng ý. Tính điểm lũy tiến: đúng 1 ý được 0.1đ, 2 ý được 0.25đ, 3 ý được 0.5đ, đúng cả 4 ý được <strong>1.0 điểm</strong>!
              </p>
              <div className="pt-2 text-xs font-bold text-primary flex items-center gap-1">
                <span>Chống đoán mò tuyệt đối</span>
              </div>
            </div>

            {/* Format 3 */}
            <div className="rounded-3xl border border-border bg-card p-7 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all space-y-4 group">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 w-fit">
                <Target className="h-6 w-6" />
              </div>
              <div className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Phần III &bull; Đột Phá Điểm 9-10</div>
              <h3 className="text-xl font-extrabold font-heading text-foreground m-0">Trả Lời Ngắn / Điền Số</h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed m-0">
                Không có sẵn đáp án để chọn. Học sinh phải tự tính toán và nhập kết quả số vào ô trả lời. Đòi hỏi kỹ năng thực hành và vận dụng cao chuẩn xác.
              </p>
              <div className="pt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span>0.25 - 0.5 điểm mỗi câu hỏi</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. HỆ THỐNG MÔN HỌC */}
      <section id="curriculum" className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-xs font-extrabold text-primary">
                Chương Trình Đào Tạo
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground m-0">
                Hệ Thống Môn Học Khối 12
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm font-semibold m-0">
                Toàn bộ môn học thuộc phân ban Khoa học Tự nhiên, Khoa học Xã hội và Ngoại ngữ được xây dựng đồng bộ theo chuẩn GDPT 2018.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border shadow-xs shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'natural', label: 'Tổ Tự Nhiên' },
                { id: 'social', label: 'Tổ Xã Hội' },
                { id: 'other', label: 'Ngoại Ngữ & Tin' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSubjectTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedSubjectTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Cards Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubjects.map(sub => (
              <div 
                key={sub.id}
                className={`rounded-3xl border ${sub.accent || 'border-border bg-card'} p-6 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 group`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-background border border-border/80 group-hover:scale-105 transition-transform">
                      {sub.icon}
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-border bg-background text-muted-foreground">
                      {sub.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black font-heading text-foreground group-hover:text-primary transition-colors flex items-center gap-2 m-0">
                    {sub.name}
                  </h3>

                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed m-0">
                    {sub.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60">
                  <button 
                    onClick={handleAuthAction}
                    className="inline-flex items-center justify-between w-full text-xs font-extrabold text-primary hover:underline cursor-pointer"
                  >
                    <span>Vào học chuyên đề</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. ĐỘI NGŨ XÂY DỰNG & CỐ VẤN CHUYÊN MÔN */}
      <section id="team" className="py-20 border-b border-border relative bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-extrabold text-primary">
              <Heart className="h-3.5 w-3.5 fill-current text-rose-500" />
              <span>Đồng Hành Sư Phạm &bull; THPT FPT Cần Thơ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground m-0">
              Đội Ngũ Xây Dựng & Cố Vấn Chuyên Môn
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold max-w-2xl mx-auto m-0">
              Sự kết hợp giữa chuyên môn sư phạm vững vàng và tinh thần đổi mới sáng tạo công nghệ của Thầy & Trò trường THPT FPT Cần Thơ.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
            
            {/* 1. Thầy Thạch Thanh Tâm */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-center sm:items-start group">
              <div className="relative shrink-0">
                <div className="w-36 h-44 sm:w-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md group-hover:scale-[1.02] transition-transform duration-300 bg-muted">
                  <img 
                    src="/team/thay_tam.png" 
                    alt="Thầy Thạch Thanh Tâm" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <GraduationCap className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 space-y-2.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-extrabold text-primary">
                  <span>Trưởng Tổ Tự Nhiên</span>
                </div>
                
                <h3 className="text-2xl font-black font-heading text-foreground m-0">
                  Thầy Thạch Thanh Tâm
                </h3>
                
                <div className="text-xs font-bold text-primary">
                  Chỉ Đạo Chuyên Môn & Cố Vấn Học Thuật
                </div>

                <p className="text-xs text-muted-foreground font-semibold leading-relaxed m-0">
                  Định hướng cấu trúc chuyên môn, chuẩn hóa ngân hàng câu hỏi bám sát ma trận thi Tốt nghiệp THPT 2026 và giám sát chất lượng học liệu số dành cho học sinh Khối 12.
                </p>

                <div className="pt-2 border-t border-border/60">
                  <div className="text-xs font-bold italic text-primary flex items-center justify-center sm:justify-start gap-1.5">
                    <span>&ldquo;Học sâu sắc để yêu thương&rdquo;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Trần Ngọc Minh Thông */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-center sm:items-start group">
              <div className="relative shrink-0">
                <div className="w-36 h-44 sm:w-40 sm:h-48 rounded-2xl overflow-hidden border-2 border-blue-500/30 shadow-md group-hover:scale-[1.02] transition-transform duration-300 bg-muted">
                  <img 
                    src="/team/minh_thong.png" 
                    alt="Trần Ngọc Minh Thông" 
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                  <Code2 className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 space-y-2.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                  <span>Học sinh Lớp 12T3 &bull; Khóa K6</span>
                </div>
                
                <h3 className="text-2xl font-black font-heading text-foreground m-0">
                  Trần Ngọc Minh Thông
                </h3>
                
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Kiến Trúc Sư Hệ Thống & Lead Developer
                </div>

                <p className="text-xs text-muted-foreground font-semibold leading-relaxed m-0">
                  Thiết kế toàn bộ kiến trúc nền tảng FPREP, tích hợp công cụ kết xuất toán KaTeX, lập trình hệ thống 3 dạng thức trắc nghiệm và tối ưu hóa trải nghiệm tự học cho FSchoolers.
                </p>

                <div className="pt-2 border-t border-border/60 flex items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" /> THPT FPT Cần Thơ
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 8. LỘ TRÌNH TỰ HỌC 3 BƯỚC */}
      <section id="features" className="py-20 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-extrabold text-primary">
              Quy Trình Học Tập
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground m-0">
              3 Bước Tự Học Hiệu Quả Cùng FPREP
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold max-w-2xl mx-auto m-0">
              Bắt đầu hành trình bứt phá điểm thi chỉ trong vài thao tác đơn giản.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Step 1 */}
            <div className="rounded-3xl border border-border bg-card p-7 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl font-black font-heading text-primary/20">01</span>
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <Laptop className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-extrabold font-heading text-foreground m-0">Đăng Nhập Email FPT</h3>
              <p className="text-muted-foreground text-xs font-semibold leading-relaxed m-0">
                Sử dụng tài khoản Google Workspace do nhà trường cấp (<strong>@fpt.edu.vn</strong>) để đăng nhập một chạm, tự động đồng bộ lớp học và phân quyền.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-3xl border border-border bg-card p-7 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl font-black font-heading text-blue-500/20">02</span>
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
                  <Compass className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-extrabold font-heading text-foreground m-0">Học Lý Thuyết & Video</h3>
              <p className="text-muted-foreground text-xs font-semibold leading-relaxed m-0">
                Xem video phân tích chuyên đề, đọc slide tóm tắt kiến thức trọng tâm và làm bài tập trắc nghiệm củng cố ngay sau bài học.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-3xl border border-border bg-card p-7 shadow-xs hover:shadow-md transition-all space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl font-black font-heading text-emerald-500/20">03</span>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Award className="h-6 w-6" />
                </div>
              </div>
              <h3 className="text-lg font-extrabold font-heading text-foreground m-0">Luyện Đề 2026 & Đột Phá</h3>
              <p className="text-muted-foreground text-xs font-semibold leading-relaxed m-0">
                Thực chiến với bộ đề 3 dạng thức mới, nhận kết quả tức thì cùng phân tích ma trận điểm để tự tin chinh phục kỳ thi THPT & ĐGNL.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 9. FAQ ACCORDION SECTION */}
      <section id="faqs" className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-extrabold text-primary">
              Giải Đáp Thắc Mắc
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground m-0">
              Câu Hỏi Thường Gặp
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm font-semibold max-w-2xl mx-auto m-0">
              Tất cả thông tin bạn cần biết về tài khoản, cách thức học tập và chính sách hệ thống.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3.5">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index} 
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen 
                      ? 'border-primary/40 bg-card shadow-sm' 
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <button 
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-extrabold text-sm sm:text-base focus:outline-none cursor-pointer"
                  >
                    <span className="flex items-center gap-3 pr-4">
                      <HelpCircle className={`h-4.5 w-4.5 shrink-0 ${isOpen ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={isOpen ? 'text-primary' : 'text-foreground'}>{faq.q}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed border-t border-border/40 animate-in fade-in-50 duration-200">
                      <p className="pt-3 m-0">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 10. LIÊN HỆ & GỬI PHẢN HỒI */}
      <section id="contact" className="py-20 border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 items-center">
            
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-extrabold text-primary">
                Đồng Hành Cùng FSchoolers
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground m-0">
                Hỗ Trợ Kỹ Thuật & Đóng Góp Ý Kiến
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm font-semibold leading-relaxed m-0">
                Đội ngũ phát triển và Ban cố vấn chuyên môn THPT FPT Cần Thơ luôn sẵn sàng giải đáp thắc mắc và tiếp thu ý kiến của học sinh.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Kênh hỗ trợ trực tuyến</span>
                    <span className="font-extrabold text-sm text-foreground">
                      Cổng hỗ trợ học tập FPREP
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Trường THPT FPT Cần Thơ</span>
                    <span className="font-extrabold text-xs sm:text-sm text-foreground">Đường Nguyễn Văn Cừ Nối Dài, P. An Bình, Q. Ninh Kiều, TP. Cần Thơ</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Direct Message Card */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="font-extrabold font-heading text-lg text-foreground m-0">Gửi Tin Nhắn Trực Tiếp</h3>
              <p className="text-xs text-muted-foreground font-semibold m-0">
                Ban quản trị FPREP sẽ tiếp nhận và phản hồi thắc mắc qua tài khoản học tập của bạn.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn bạn! Yêu cầu hỗ trợ đã được gửi thành công đến ban quản trị FPREP.'); }} className="space-y-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-[11px] font-extrabold text-muted-foreground uppercase">Họ và tên</label>
                    <input 
                      type="text" 
                      id="name" 
                      required 
                      placeholder="Nguyễn Văn A" 
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-[11px] font-extrabold text-muted-foreground uppercase">Email liên hệ</label>
                    <input 
                      type="email" 
                      id="email" 
                      required 
                      placeholder="anv@fpt.edu.vn" 
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="msg" className="text-[11px] font-extrabold text-muted-foreground uppercase">Nội dung thắc mắc / Cần hỗ trợ</label>
                  <textarea 
                    id="msg" 
                    rows={4} 
                    required 
                    placeholder="Mô tả sự cố đăng nhập hoặc góp ý cho bài học..." 
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full rounded-xl bg-primary py-3 text-xs font-extrabold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Gửi Phản Hồi Trực Tiếp</span>
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* 11. CTA BANNER */}
      <section className="py-16 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-8 sm:p-12 lg:p-16 shadow-2xl text-center text-white overflow-hidden">
            
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-black/15 blur-2xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white">
                <Sparkles className="h-4 w-4" /> THPT FPT Cần Thơ &bull; Khóa K6 (2026)
              </div>

              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight m-0">
                Sẵn Sàng Chinh Phục Điểm 9+ Cùng FPREP?
              </h2>

              <p className="text-white/90 text-xs sm:text-base max-w-xl mx-auto font-semibold leading-relaxed m-0">
                Đăng nhập ngay hôm nay với tài khoản Google FPT để bắt đầu lộ trình tự học và luyện đề chuẩn cấu trúc Bộ GD&ĐT 2026.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button 
                  onClick={handleAuthAction}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-xs sm:text-sm font-extrabold text-primary hover:bg-slate-50 shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{user ? 'Vào Không Gian Học Tập' : 'Đăng Nhập Email FPT'}</span>
                </button>

                <a
                  href="#team"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/40 text-white font-extrabold text-xs sm:text-sm hover:bg-white/10 transition-all text-center"
                >
                  Gặp gỡ đội ngũ xây dựng
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <Footer />

    </div>
  );
}
