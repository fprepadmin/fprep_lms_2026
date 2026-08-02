'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BookOpen, Shield, ShieldCheck, Info, UserCheck, 
  ArrowLeft, Sun, Moon, GraduationCap, CheckCircle2,
  FileText, Activity
} from 'lucide-react';

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
    { id: 'privacy', label: 'Điều khoản dữ liệu người dùng', icon: <ShieldCheck className="h-4 w-4" /> },
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
                Hệ thống LMS được tối ưu hóa cho hoạt động dạy và tự học khối 12 của FSchool Cần Thơ. Mọi dữ liệu cá nhân được bảo vệ nghiêm ngặt theo các chính sách bảo mật nội bộ.
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
                    FPREP (FPT School Prep) là nền tảng quản lý học tập (LMS) nội bộ được xây dựng nhằm hỗ trợ công tác giảng dạy của giáo viên và tăng cường khả năng tự học độc lập của học sinh Khối 12. Hệ thống tập trung cung cấp các học liệu chuẩn hóa bám sát chương trình và cung cấp công cụ tự kiểm tra đánh giá năng lực học tập.
                  </p>
                  
                  <h3 className="text-base font-extrabold text-foreground mt-6">Sứ mệnh và Mục tiêu</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Hệ thống hóa học liệu số bao gồm video bài giảng trực quan, tài liệu tham khảo và đề thi trắc nghiệm.</li>
                    <li>Khuyến khích học sinh rèn luyện tinh thần tự chủ học tập, theo dõi chặt chẽ tiến trình và thời lượng ôn tập của bản thân.</li>
                    <li>Hỗ trợ giáo viên theo dõi, đánh giá trực tiếp kết quả học tập và tiến độ tự học của từng học sinh trong các lớp phụ trách mà không tốn nhiều công sức tổng hợp thủ công.</li>
                  </ul>

                  <h3 className="text-base font-extrabold text-foreground mt-6">Đối tượng sử dụng</h3>
                  <div className="grid gap-4 sm:grid-cols-2 mt-2">
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                      <h4 className="font-extrabold text-foreground mb-1.5">Học sinh Khối 12</h4>
                      <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                        Tham gia tự học theo chương trình, làm các bài thi trắc nghiệm đánh giá năng lực và theo dõi biểu đồ tiến trình cá nhân.
                      </p>
                    </div>
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                      <h4 className="font-extrabold text-foreground mb-1.5">Giáo viên & Trưởng bộ môn</h4>
                      <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                        Thiết lập nội dung học tập, giám sát quá trình tự học và điểm thi của học sinh các lớp giảng dạy để có giải pháp hỗ trợ kịp thời.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TAB HƯỚNG DẪN SỬ DỤNG */}
            {activeTab === 'usage' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl flex items-center gap-2.5">
                    <BookOpen className="h-7 w-7 text-primary" /> Hướng Dẫn Sử Dụng Hệ Thống
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1.5 font-semibold">
                    Quy trình học tập và quản lý chi tiết dành cho các vai trò thành viên.
                  </p>
                </div>

                <div className="space-y-6 text-sm leading-relaxed text-muted-foreground font-semibold">
                  
                  {/* Dành cho học sinh */}
                  <section className="space-y-3">
                    <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 border-b border-border/50 pb-1.5">
                      <CheckCircle2 className="h-5 w-5 text-green-500" /> Dành cho Học sinh (Student)
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <strong className="text-foreground">Đăng nhập:</strong> Truy cập hệ thống bằng nút "Đăng nhập" ở góc phải màn hình, chọn xác thực thông qua tài khoản Google do nhà trường cấp.
                      </li>
                      <li>
                        <strong className="text-foreground">Lựa chọn môn học:</strong> Tại Dashboard Học sinh, chọn môn học bạn cần ôn tập.
                      </li>
                      <li>
                        <strong className="text-foreground">Tiến hành học tập:</strong> Nhấp chọn từng bài học để xem tài liệu chi tiết (video bài giảng hoặc tài liệu đọc PDF/Slide).
                      </li>
                      <li>
                        <strong className="text-foreground">Đánh dấu hoàn thành:</strong> Nhấp nút "Đánh dấu hoàn thành bài học" sau khi hoàn tất để hệ thống ghi nhận tiến độ vào biểu đồ chung.
                      </li>
                      <li>
                        <strong className="text-foreground">Luyện đề:</strong> Vào mục "Đề kiểm tra", làm bài thi trắc nghiệm trực tuyến trực tiếp trên hệ thống và xem kết quả giải thích đáp án ngay sau khi nộp bài.
                      </li>
                    </ol>
                  </section>

                  {/* Dành cho giáo viên */}
                  <section className="space-y-3 pt-4">
                    <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 border-b border-border/50 pb-1.5">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" /> Dành cho Giáo viên (Teacher)
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <strong className="text-foreground">Theo dõi danh sách học sinh:</strong> Xem danh sách học sinh thuộc các lớp được phân công phụ trách giảng dạy.
                      </li>
                      <li>
                        <strong className="text-foreground">Kiểm tra tiến độ:</strong> Nhấn chọn "Xem chi tiết" để xem báo cáo thống kê thời lượng học tập, các chương bài đã tự học xong và danh sách điểm thi của từng học sinh.
                      </li>
                      <li>
                        <strong className="text-foreground">Quản lý học liệu:</strong> Truy cập Tab "Quản lý học liệu" để thêm, sửa đổi nội dung bài giảng số hoặc tải lên tài liệu mới cho môn học phụ trách.
                      </li>
                    </ol>
                  </section>

                  {/* Dành cho Admin/HOD */}
                  <section className="space-y-3 pt-4">
                    <h3 className="text-base font-extrabold text-foreground flex items-center gap-2 border-b border-border/50 pb-1.5">
                      <CheckCircle2 className="h-5 w-5 text-orange-500" /> Dành cho Admin & Trưởng bộ môn (HOD)
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <strong className="text-foreground">Quản lý phân quyền:</strong> Admin và Trưởng bộ môn có thể thêm mới tài khoản giáo viên/học sinh, gán môn giảng dạy và xếp học sinh vào lớp học tương ứng.
                      </li>
                      <li>
                        <strong className="text-foreground">Giám sát hệ thống (Chỉ dành cho Admin):</strong> Truy cập Tab "Nhật ký hoạt động" (Audit Logs) để xem lịch sử chỉnh sửa vai trò, dữ liệu hệ thống phục vụ mục đích bảo mật bảo trì.
                      </li>
                    </ol>
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
                    Chào mừng bạn đến với FPREP. Bằng việc đăng nhập và sử dụng hệ thống này, bạn đồng ý tuân thủ toàn bộ các quy định và điều khoản sử dụng được nêu dưới đây. Nếu bạn không đồng ý với bất kỳ phần nào của điều khoản này, vui lòng ngừng sử dụng hệ thống ngay lập tức.
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
