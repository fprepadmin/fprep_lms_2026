'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, Shield, ShieldCheck, Info, UserCheck, 
  ArrowLeft, Sun, Moon, GraduationCap, CheckCircle2,
  FileText, Activity
} from 'lucide-react';
import Footer from '@/components/Footer';

function GuideContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  // Khởi tạo theme
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

  // Đọc tab từ URL search params (?tab=...)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['about', 'usage', 'terms', 'privacy'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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

  const tabs = [
    { id: 'about', label: 'Giới thiệu hệ thống', icon: <Info className="h-4 w-4" /> },
    { id: 'usage', label: 'Hướng dẫn sử dụng', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'terms', label: 'Điều khoản sử dụng', icon: <Shield className="h-4 w-4" /> },
    { id: 'privacy', label: 'Bảo mật dữ liệu', icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại trang chủ
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="rounded-full p-2 hover:bg-muted transition-colors border border-border"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-primary" />}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="sticky top-24 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h2 className="font-extrabold text-lg border-b border-border pb-3 mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> FPREP Help Center
                </h2>
                <nav className="flex flex-col gap-1.5">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          router.replace(`/guide?tab=${tab.id}`);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all ${
                          isActive 
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-border rounded-2xl p-5 text-xs text-muted-foreground leading-relaxed font-semibold">
                Hệ thống LMS nội bộ dành cho học sinh và giáo viên Khối 12 – THPT FPT Cần Thơ. Mọi dữ liệu cá nhân được bảo vệ theo chính sách bảo mật nội bộ.
              </div>
            </div>
          </aside>

          {/* TAB CONTENT PANEL */}
          <article className="lg:col-span-8 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm min-h-[500px]">
            
            {/* 1. TAB GIỚI THIỆU */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl flex items-center gap-2.5">
                    <Info className="h-7 w-7 text-primary" /> Giới Thiệu Hệ Thống LMS FPREP
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1.5 font-semibold">
                    Hệ thống Hỗ trợ Học tập & Luyện thi trực tuyến Khối 12 Trường THPT FPT Cần Thơ.
                  </p>
                </div>

                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground font-semibold">
                  <p>
                    FPREP là nền tảng LMS nội bộ hỗ trợ giáo viên quản lý học liệu và giúp học sinh Khối 12 tự học theo chương trình, đánh giá năng lực qua đề thi trắc nghiệm.
                  </p>
                  
                  <h3 className="text-base font-extrabold text-foreground mt-6">Sứ mệnh và Mục tiêu</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Hệ thống hóa học liệu số: video bài giảng, tài liệu và đề thi trắc nghiệm.</li>
                    <li>Giúp học sinh theo dõi tiến trình tự học và thời lượng ôn tập cá nhân.</li>
                    <li>Hỗ trợ giáo viên theo dõi, đánh giá tiến độ học sinh theo lớp phụ trách.</li>
                  </ul>

                  <h3 className="text-base font-extrabold text-foreground mt-6">Đối tượng sử dụng</h3>
                  <div className="grid gap-4 sm:grid-cols-2 mt-2">
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                      <h4 className="font-extrabold text-foreground mb-1.5">Học sinh Khối 12</h4>
                      <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                        Tự học theo chương trình, luyện đề trắc nghiệm và theo dõi tiến trình cá nhân.
                      </p>
                    </div>
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                      <h4 className="font-extrabold text-foreground mb-1.5">Giáo viên & Trưởng bộ môn</h4>
                      <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                        Quản lý học liệu, giám sát tiến độ và hỗ trợ học sinh các lớp phụ trách.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TAB HƯỚNG DẪN SỬ DỤNG */}
            {activeTab === 'usage' && (
              <div className="space-y-8 animate-fade-in">
                <div className="border-b border-border pb-4">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl flex items-center gap-2.5 text-foreground">
                    <BookOpen className="h-7 w-7 text-primary" /> Hướng Dẫn Sử Dụng Toàn Diện LMS FPREP
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1.5 font-semibold">
                    Cẩm nang vận hành chi tiết dành cho Học sinh (Student), Giáo viên bộ môn (Teacher) và Trưởng bộ môn (HOD).
                  </p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed text-muted-foreground font-semibold">
                  
                  {/* 1. DÀNH CHO HỌC SINH */}
                  <section className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
                    <div className="flex items-center gap-2.5 border-b border-border pb-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-foreground m-0">
                          1. Hướng Dẫn Dành Cho Học Sinh (STUDENT)
                        </h3>
                        <span className="text-xs text-muted-foreground">Tự học lý thuyết, làm bài thi khảo thí 2026 & theo dõi tiến độ cá nhân</span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2">
                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> A. Tự học Bài giảng & Lý thuyết
                        </h4>
                        <ul className="list-disc pl-4 text-xs space-y-1.5 leading-relaxed text-muted-foreground">
                          <li>Vào menu <strong>"Học liệu & Bài giảng"</strong> $\rightarrow$ Chọn môn học $\rightarrow$ Chọn Chương/Bài học.</li>
                          <li>Xem video bài giảng hoặc tài liệu tóm tắt kiến thức trọng tâm.</li>
                          <li>Hệ thống tự động tích lũy thời gian tự học và cập nhật thanh tiến độ % hoàn thành.</li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" /> B. Quy trình Thi & Luyện đề chuẩn 2026
                        </h4>
                        <ul className="list-disc pl-4 text-xs space-y-1.5 leading-relaxed text-muted-foreground">
                          <li><strong>Phần I (MCQ):</strong> 4 lựa chọn A, B, C, D (0.25đ/câu).</li>
                          <li><strong>Phần II (TF):</strong> Đúng / Sai 4 ý (a, b, c, d) - Tính điểm lũy tiến tối đa 1.0đ/câu.</li>
                          <li><strong>Phần III (SAQ):</strong> Trả lời ngắn, tự điền số hoặc phân số (0.5đ/câu).</li>
                          <li><strong>Phiếu trả lời lướt theo:</strong> Tự động trượt dọc màn hình, bấm vào câu hỏi để nhảy nhanh.</li>
                          <li><strong>Nộp bài & Xem giải:</strong> Bấm Nộp bài $\rightarrow$ Xem điểm số tức thì và lời giải chi tiết từng bước.</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* 2. DÀNH CHO GIÁO VIÊN BỘ MÔN */}
                  <section className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
                    <div className="flex items-center gap-2.5 border-b border-border pb-3">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-foreground m-0">
                          2. Hướng Dẫn Dành Cho Giáo Viên Bộ Môn (TEACHER)
                        </h3>
                        <span className="text-xs text-muted-foreground">Quản lý lớp học, biên soạn đề thi chuẩn 2026 & giao bài tập</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" /> A. Quản lý Lớp học & Nhập học sinh bằng Excel
                        </h4>
                        <p className="text-xs leading-relaxed">
                          - Truy cập <strong>"Lớp học & Học sinh"</strong>: Xem danh sách các lớp phụ trách, theo dõi tiến độ và phổ điểm học sinh.<br/>
                          - <strong>Nhập học sinh bằng file Excel (.xlsx):</strong> Bấm nút <em>"Nhập từ Excel (.xlsx)"</em> $\rightarrow$ Tải file mẫu 4 cột chuẩn (<code className="text-primary font-mono font-bold">STT - Họ và Tên - MSHS - Email</code>) $\rightarrow$ Tải file lên và xác nhận nhập học sinh vào lớp.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" /> B. Biên soạn Đề thi, Upload ảnh Cloudinary & Dán ảnh (Ctrl + V)
                        </h4>
                        <p className="text-xs leading-relaxed">
                          - Vào <strong>"Đề thi & Kiểm tra"</strong> $\rightarrow$ Bấm <em>"Tạo đề thi mới"</em>.<br/>
                          - Thiết lập 3 dạng câu hỏi chuẩn Bộ GD&ĐT 2026: Trắc nghiệm 4 ý (MCQ), Đúng/Sai 4 ý (TF), Trả lời ngắn (SAQ).<br/>
                          - Hỗ trợ công thức LaTeX: <code className="text-primary font-mono">$y = x^2$</code> hoặc <code className="text-primary font-mono">$$\int_0^1 f(x)dx$$</code>.<br/>
                          - <strong>Tải ảnh / Dán ảnh siêu tốc:</strong> Bấm <em>"Tải ảnh Cloudinary"</em> hoặc chụp màn hình rồi bấm <strong className="text-foreground">Ctrl + V</strong> trực tiếp vào ô nhập đề/phương án/lời giải để tự động upload lên Cloudinary CDN.<br/>
                          - <strong>Trợ lý AI:</strong> Bấm nút <em>"Trợ lý AI"</em> để sao chép Prompt chuyển đổi đề thi từ Word/PDF sang JSON tự động.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" /> C. Giao bài cho Lớp & Quản lý Nộp bài
                        </h4>
                        <p className="text-xs leading-relaxed">
                          - Bấm nút <strong>"Giao bài"</strong> $\rightarrow$ Chọn danh sách các lớp học cần giao $\rightarrow$ Thiết lập hạn nộp (Deadline).<br/>
                          - Bấm nút <strong>"Xem nộp bài"</strong> để theo dõi danh sách học sinh đã nộp/chưa nộp, xem phổ điểm và chi tiết bài làm từng em.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 3. DÀNH CHO TRƯỞNG BỘ MÔN (HOD) */}
                  <section className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
                    <div className="flex items-center gap-2.5 border-b border-border pb-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-foreground m-0">
                          3. Hướng Dẫn Dành Cho Trưởng Bộ Môn (HEAD OF DEPARTMENT - HOD)
                        </h3>
                        <span className="text-xs text-muted-foreground">Toàn quyền Giáo viên, quản lý phân công giảng dạy & ngân hàng đề tổ chuyên môn</span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2">
                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-purple-500" /> A. Phân công Giáo viên Giảng dạy
                        </h4>
                        <p className="text-xs leading-relaxed">
                          - Vào <strong>"Lớp học & Học sinh"</strong> $\rightarrow$ Chuyển tab <em>"Giáo viên & Phân công"</em>.<br/>
                          - Chọn từng lớp học và gán giáo viên bộ môn phụ trách giảng dạy trực tiếp.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-purple-500" /> B. Quản trị Nhân sự & Đề thi Tổ
                        </h4>
                        <p className="text-xs leading-relaxed">
                          - Thêm tài khoản Giáo viên mới vào tổ bộ môn.<br/>
                          - Duyệt và quản lý ngân hàng đề thi chung của toàn bộ môn khối 12.
                        </p>
                      </div>
                    </div>
                  </section>

                </div>
              </div>
            )}

            {/* 3. TAB ĐIỀU KHOẢN SỬ DỤNG */}
            {activeTab === 'terms' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl flex items-center gap-2.5">
                    <Shield className="h-7 w-7 text-primary" /> Điều Khoản Sử Dụng Hệ Thống
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1.5 font-semibold">
                    Quy định ràng buộc pháp lý đối với tất cả thành viên truy cập hệ thống FPREP.
                  </p>
                </div>

                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground font-semibold">
                  <p>
                    Bằng việc đăng nhập và sử dụng hệ thống, bạn đồng ý tuân thủ các quy định dưới đây.
                  </p>

                  <h3 className="text-base font-extrabold text-foreground mt-6">1. Quyền sở hữu tài khoản và Xác thực</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Hệ thống này chỉ phục vụ mục đích học tập và giảng dạy nội bộ của Trường THPT FPT Cần Thơ.</li>
                    <li>Người dùng có trách nhiệm tự bảo quản phiên đăng nhập của mình, không chia sẻ thiết bị đăng nhập hoặc chuyển nhượng tài khoản Google nội bộ cho bất kỳ cá nhân nào khác ngoài trường học.</li>
                  </ul>

                  <h3 className="text-base font-extrabold text-foreground mt-6">2. Quy định hành vi của người dùng</h3>
                  <p>Người dùng cam kết tuyệt đối KHÔNG thực hiện các hành vi sau:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Tấn công phá hoại, khai thác lỗ hổng bảo mật hoặc cố gắng truy cập trái phép vào tài nguyên hệ thống nằm ngoài quyền hạn được phân chia.</li>
                    <li>Sử dụng các công cụ tải dữ liệu tự động (scrapers/crawlers) để sao chép hàng loạt tài liệu học tập, câu hỏi thi trắc nghiệm của hệ thống để phân phối thương mại ra bên ngoài.</li>
                    <li>Sử dụng ngôn ngữ thiếu tôn trọng, vi phạm thuần phong mỹ tục trong các yêu cầu hỗ trợ hoặc các khu vực tương tác chung (nếu có).</li>
                  </ul>

                  <h3 className="text-base font-extrabold text-foreground mt-6">3. Bản quyền nội dung học liệu</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Toàn bộ bài giảng, tài liệu PDF, cấu trúc đề thi trắc nghiệm và ngân hàng câu hỏi trên hệ thống thuộc sở hữu sở trí tuệ của Trường THPT FPT Cần Thơ và đội ngũ giáo viên biên soạn.</li>
                    <li>Mọi hành vi trích lục, đăng tải lại nội dung học liệu của hệ thống lên các nền tảng công cộng bên ngoài khi chưa được sự đồng ý bằng văn bản của nhà trường đều cấu thành hành vi vi phạm bản quyền.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* 4. TAB CHÍNH SÁCH DỮ LIỆU NGƯỜI DÙNG */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl flex items-center gap-2.5">
                    <ShieldCheck className="h-7 w-7 text-primary" /> Điều Khoản Dữ Liệu Người Dùng
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1.5 font-semibold">
                    Chính sách bảo vệ thông tin và quyền riêng tư dữ liệu của học sinh, giáo viên.
                  </p>
                </div>

                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground font-semibold">
                  <p>
                    Nhà trường cam kết tôn trọng và bảo vệ quyền riêng tư dữ liệu của mọi thành viên. Chính sách dữ liệu dưới đây giải thích cách thức chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân của bạn trên LMS FPREP.
                  </p>

                  <h3 className="text-base font-extrabold text-foreground mt-6 flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-primary" /> 1. Dữ liệu chúng tôi thu thập
                  </h3>
                  <p>Hệ thống tự động ghi nhận các thông tin sau sau khi bạn đăng nhập Google Auth thành công:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-foreground">Thông tin định danh cơ bản:</strong> Địa chỉ Email FPT, Họ tên đầy đủ, Tên hiển thị (MSHS/Mã giáo viên) và ảnh đại diện Google.</li>
                    <li><strong className="text-foreground">Tiến trình học tập:</strong> Trạng thái hoàn thành bài học, thời lượng đọc tài liệu, xem video của học sinh.</li>
                    <li><strong className="text-foreground">Kết quả kiểm tra:</strong> Điểm số trắc nghiệm, thời gian nộp bài và lịch sử các câu trả lời trắc nghiệm của học sinh.</li>
                    <li><strong className="text-foreground">Nhật ký hệ thống:</strong> Địa chỉ IP, thiết bị truy cập và lịch sử tương tác dữ liệu để ghi nhận lịch sử thay đổi quyền (Audit Logs) nhằm phòng chống gian lận.</li>
                  </ul>

                  <h3 className="text-base font-extrabold text-foreground mt-6 flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-primary" /> 2. Cách thức sử dụng dữ liệu
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Cập nhật tiến trình tự học cá nhân của học sinh lên Dashboard trực quan.</li>
                    <li>Cung cấp bảng phân tích dữ liệu học tập cho Giáo viên giảng dạy lớp tương ứng để quản lý chuyên môn.</li>
                    <li>Đảm bảo tính trung thực, phát hiện sớm các hiện tượng bất thường hoặc truy cập trái phép.</li>
                  </ul>

                  <h3 className="text-base font-extrabold text-foreground mt-6 flex items-center gap-2">
                    <UserCheck className="h-4.5 w-4.5 text-primary" /> 3. Cam kết bảo mật và Chia sẻ dữ liệu
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Dữ liệu được lưu trữ trên hạ tầng máy chủ cơ sở dữ liệu Supabase được bảo vệ bởi các chính sách bảo mật Row Level Security (RLS) ở mức cao nhất.</li>
                    <li>Hệ thống cam kết tuyệt đối KHÔNG chia sẻ, buôn bán hoặc phân phối bất kỳ dữ liệu cá nhân hay điểm số học tập nào của học sinh cho bên thứ ba. Dữ liệu học tập chỉ hiển thị cục bộ cho học sinh đó và giáo viên được phân quyền trực tiếp giảng dạy lớp học đó.</li>
                  </ul>
                </div>
              </div>
            )}

          </article>
        </div>
      </main>

      {/* FOOTER ĐỒNG BỘ TOÀN HỆ THỐNG */}
      <Footer />

    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">Đang tải tài liệu hướng dẫn...</p>
        </div>
      </div>
    }>
      <GuideContent />
    </Suspense>
  );
}
