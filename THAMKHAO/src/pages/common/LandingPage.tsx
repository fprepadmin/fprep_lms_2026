import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Check, ArrowRight, Sun, Moon, LogIn,
  Sigma, Calculator, GraduationCap, TrendingUp, PenTool, BookOpen, BrainCircuit,
  Facebook, Youtube, Github, Flag, Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Khôi phục trạng thái Dark Mode từ localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDark = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-800 dark:text-slate-200 overflow-hidden transition-colors duration-300">
      {/* --- BACKGROUND BLOBS --- */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        {/* Blob Xanh dương chủ đạo */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full blur-[80px] opacity-20 dark:opacity-10 bg-blue-600 animate-blob"></div>
        {/* Blob Xanh lá điểm nhấn */}
        <div className="absolute bottom-[-50px] right-[-50px] w-[400px] h-[400px] rounded-full blur-[80px] opacity-20 dark:opacity-10 bg-green-500 animate-blob [animation-delay:-5s]"></div>
        {/* Blob Xanh dương đậm */}
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-10 dark:opacity-5 bg-blue-900 animate-blob [animation-delay:-2s]"></div>
      </div>

      {/* --- HEADER --- */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl px-6 py-3 rounded-full flex justify-between items-center z-50 glass transition-all duration-300">
        <div className="flex items-center gap-4">
          <button 
            className="lg:hidden text-blue-600 dark:text-blue-400"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-white p-2 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.1)] flex items-center justify-center">
              <span className="text-blue-950 font-black text-xl leading-none">∑</span>
            </div>
            <span className="text-xl md:text-2xl font-black text-blue-950 dark:text-white tracking-tight">FMATH12</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex gap-8">
          <a href="#features" className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tính năng</a>
          <a href="#reviews" className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Đánh giá</a>
          <a href="#roadmap" className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Lộ trình Toán 12</a>
          <a href="#about" className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Về chúng tôi</a>
        </nav>

        <div className="flex items-center gap-4">
          <label className="relative inline-block w-14 h-8 cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={isDark} onChange={toggleDark} />
            <div className="w-full h-full bg-slate-200 dark:bg-slate-800 rounded-full shadow-inner transition-colors duration-300 peer-checked:border-slate-700 border border-transparent"></div>
            <div className={`absolute top-1 left-1 w-6 h-6 bg-white dark:bg-slate-900 rounded-full shadow-md flex items-center justify-center transition-transform duration-300 ${isDark ? 'translate-x-6' : ''}`}>
              {isDark ? <Moon size={14} className="text-yellow-400" /> : <Sun size={14} className="text-orange-500" />}
            </div>
          </label>
          <Link to="/login" className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-2.5 rounded-full font-bold shadow-[0_10px_20px_rgba(37,99,235,0.2)] hover:-translate-y-1 hover:shadow-[0_15px_25px_rgba(37,99,235,0.3)] transition-all border-none">
            <LogIn size={18} /> Học ngay
          </Link>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl z-40 flex flex-col gap-4 border border-slate-100 dark:border-slate-700 animate-in fade-in lg:hidden">
          <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg text-slate-700 dark:text-white hover:text-blue-600">Tính năng</a>
          <a href="#reviews" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg text-slate-700 dark:text-white hover:text-blue-600">Đánh giá</a>
          <a href="#roadmap" onClick={() => setIsMobileMenuOpen(false)} className="font-bold text-lg text-slate-700 dark:text-white hover:text-blue-600">Lộ trình Toán 12</a>
          <Link to="/login" className="bg-blue-600 text-white text-center py-3 rounded-xl font-bold mt-2 hover:bg-blue-700 transition">Đăng nhập / Học ngay</Link>
        </div>
      )}

      {/* --- HERO SECTION --- */}
      <section className="container mx-auto px-6 pt-40 pb-20 min-h-screen flex items-center max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          <div className="space-y-8 text-center lg:text-left z-10">
            <h1 className="text-5xl md:text-6xl font-extrabold text-blue-950 dark:text-white leading-[1.15] tracking-tight">
              Nền tảng luyện thi <br/> 
              Toán 12 <br/>
              <span className="relative inline-block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                Thông minh với AI
                <span className="absolute bottom-1 left-0 w-full h-3 bg-blue-600/10 -skew-x-12 -z-10 rounded"></span>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Hệ thống cá nhân hoá lộ trình, AI giải toán từng bước và Bảng xếp hạng XP dành riêng cho học sinh FPT để tự tin bứt phá điểm 9+.
            </p>
            <div className="flex justify-center lg:justify-start gap-10 pt-4">
              <div>
                <h3 className="text-4xl font-black text-blue-950 dark:text-white">5k+</h3>
                <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">Học sinh FPT</p>
              </div>
              <div>
                <h3 className="text-4xl font-black text-blue-950 dark:text-white">24/7</h3>
                <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">AI Trợ giảng</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <Link to="/login" className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-[0_10px_20px_rgba(37,99,235,0.2)] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(37,99,235,0.3)] transition-all">
                Đăng nhập tài khoản <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* Hero Mockup Card */}
          <div className="relative w-full max-w-lg mx-auto lg:ml-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-8 border-white/50 dark:border-slate-700/50 relative z-10">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="w-12 h-12 bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold text-2xl shadow-sm">∫</div>
                <div>
                  <h4 className="font-bold text-blue-950 dark:text-white">Tính Đạo Hàm Hàm Hợp</h4>
                  <p className="text-xs text-slate-500 font-medium">Mức độ: Vận dụng</p>
                </div>
              </div>
              <div className="space-y-4 mb-6 pt-2 flex-1">
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-full"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-5/6"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full w-4/6"></div>
              </div>
              
              <div className="bg-blue-600/10 dark:bg-blue-600/20 p-4 rounded-2xl border border-blue-600/20 shadow-inner">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-blue-600 flex items-center gap-2 mb-1.5"><BrainCircuit size={16}/> FMath AI:</span>
                  Lời giải của em sai ở bước đặt u. Em hãy xem lại quy tắc tính đạo hàm của hàm hợp {"dy/dx = (dy/du) × (du/dx)"} nhé.
                </p>
              </div>
            </div>

            {/* Floating Badges */}
            <div className="absolute -top-6 -right-6 lg:-right-12 glass px-4 py-3 rounded-full flex items-center gap-3 animate-float z-20 shadow-xl hidden md:flex border border-white dark:border-slate-700">
               <div className="bg-[#e8f5e9] text-green-500 w-10 h-10 rounded-full flex items-center justify-center shadow-sm"><Check size={20} strokeWidth={3} /></div>
               <div>
                 <div className="text-sm font-bold text-slate-800 dark:text-white">Tích hợp AI</div>
                 <div className="text-xs text-slate-500 font-medium">Giải toán từng bước</div>
               </div>
            </div>
            <div className="absolute -bottom-6 -left-6 lg:-left-12 glass px-4 py-3 rounded-full flex items-center gap-3 animate-float [animation-delay:2s] z-20 shadow-xl hidden md:flex border border-white dark:border-slate-700">
               <div className="bg-[#fff5ec] text-orange-500 w-10 h-10 rounded-full flex items-center justify-center shadow-sm"><TrendingUp size={20} strokeWidth={3} /></div>
               <div>
                 <div className="text-sm font-bold text-slate-800 dark:text-white">Lộ trình FPT</div>
                 <div className="text-xs text-slate-500 font-medium">Cá nhân hoá tối đa</div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- BENTO GRID FEATURES --- */}
      <section id="features" className="py-24 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-4xl font-extrabold text-blue-950 dark:text-white mb-4">Hệ sinh thái FMath12</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">Mọi công cụ bạn cần để đạt 9+ Toán, tất cả trong một nền tảng</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2 bg-white/60 dark:bg-slate-800/60 p-10 rounded-[30px] border border-white dark:border-slate-700 shadow-sm hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.15)] hover:-translate-y-2 hover:border-blue-600/50 transition-all duration-300 relative overflow-hidden group">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-md group-hover:scale-110 transition-transform"><PenTool size={32} /></div>
              <h3 className="text-2xl font-bold text-blue-950 dark:text-white mb-4">Phòng luyện đề FPT</h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed relative z-10 max-w-xl font-medium">
                Tạo đề thi tự động từ ngân hàng 50,000+ câu hỏi, chuẩn cấu trúc đề thi mới nhất. Hỗ trợ bấm giờ, chấm điểm tức thì và nhận xét chi tiết bằng AI để phát hiện dạng bài yếu.
              </p>
              <Calculator className="absolute -bottom-10 -right-10 w-64 h-64 text-slate-100 dark:text-slate-800 opacity-50 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            </div>
            
            <div className="bg-white/60 dark:bg-slate-800/60 p-10 rounded-[30px] border border-white dark:border-slate-700 shadow-sm hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.15)] hover:-translate-y-2 hover:border-blue-600/50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-md group-hover:scale-110 transition-transform"><BookOpen size={32} /></div>
              <h3 className="text-xl font-bold text-blue-950 dark:text-white mb-4">Ngân hàng Lý thuyết</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium transition-colors group-hover:text-blue-600">
                Hệ thống tóm tắt công thức siêu tốc, ví dụ minh họa trực quan giúp ghi nhớ nhanh.
              </p>
            </div>

            <div className="bg-white/60 dark:bg-slate-800/60 p-10 rounded-[30px] border border-white dark:border-slate-700 shadow-sm hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.15)] hover:-translate-y-2 hover:border-blue-600/50 transition-all duration-300 group">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-md group-hover:scale-110 transition-transform"><TrendingUp size={32} /></div>
              <h3 className="text-xl font-bold text-blue-950 dark:text-white mb-4">Nhật ký Gamification</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium transition-colors group-hover:text-blue-600">
                Biến việc học thành trò chơi. Nhận XP, tăng Level và duy trì Streak mỗi ngày.
              </p>
            </div>

            <div className="col-span-1 md:col-span-2 bg-white/60 dark:bg-slate-800/60 p-10 rounded-[30px] border border-white dark:border-slate-700 shadow-sm hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.15)] hover:-translate-y-2 hover:border-blue-600/50 transition-all duration-300 relative overflow-hidden group">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-md group-hover:scale-110 transition-transform"><Flag size={32} /></div>
              <h3 className="text-2xl font-bold text-blue-950 dark:text-white mb-4">Bảng xếp hạng FPT</h3>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed relative z-10 max-w-xl font-medium">
                Vinh danh Top các sĩ tử có XP cao nhất, chăm chỉ nhất trên toàn hệ thống FPT. Tạo động lực thi đua, giao lưu và cùng nhau tiến bộ.
                <Check className="inline-block ml-2 text-green-500"/>
              </p>
              <Sigma className="absolute -bottom-4 -right-4 w-56 h-56 text-slate-100 dark:text-slate-800 opacity-50 -rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* --- ROADMAP SECTION --- */}
      <section id="roadmap" className="py-24 relative z-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-4xl font-extrabold text-blue-950 dark:text-white mb-4">Lộ Trình Học Tập F-Math</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">Hệ thống kiến thức phân mảnh chuẩn cấu trúc đề thi, tích hợp AI chấm chữa cặn kẽ từng bước.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {pill: 'HỌC KỲ I', title: 'Khảo Sát Hàm Số & Hình Học Không Gian', topics: ['Hàm số Lũy thừa, Mũ & Logarit', 'Khối đa diện và thể tích', 'Ứng dụng Đạo hàm khảo sát hàm số']},
              {pill: 'HỌC KỲ II', title: 'Tích Phân & Hình Học Oxyz', topics: ['Nguyên hàm & Tích phân', 'Ứng dụng Tích phân tính diện tích, thể tích', 'Phương pháp tọa độ Oxyz']},
              {pill: 'ÔN THI THPT', title: 'Số Phức & Tổng Ôn Kiến Thức Đại Học', topics: ['Số phức và phương trình bậc hai', 'Tổng ôn lý thuyết Casio', 'Thi thử định kỳ chuẩn Bộ GD']}
            ].map((card, idx) => (
              <div key={idx} className="bg-white/60 dark:bg-slate-800/60 rounded-[30px] p-8 border border-white dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-600 transition-all duration-300 flex flex-col hover:-translate-y-2 group">
                <div className="bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 border border-blue-600/20 text-sm font-bold px-4 py-1.5 rounded-lg w-fit mb-6 shadow-inner tracking-wider">{card.pill}</div>
                <h3 className="text-xl font-bold text-blue-950 dark:text-white mb-6 leading-snug group-hover:text-blue-600">{card.title}</h3>
                <ul className="space-y-4 flex-1">
                  {card.topics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-slate-300 font-medium">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner"><Check size={14} strokeWidth={3}/></div>
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-20 px-6 max-w-5xl mx-auto CTA">
        <div className="bg-gradient-to-br from-blue-600 to-green-500 rounded-[40px] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-[0_30px_60px_rgba(37,99,235,0.2)]">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Sẵn sàng chinh phục điểm 9+ Toán?</h2>
            <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto font-medium">Tham gia cùng hàng nghìn học sinh FPT trải nghiệm phương pháp học Toán hiện đại, tối ưu điểm số với FMath12 AI.</p>
            <Link to="/login" className="inline-block bg-white text-blue-950 px-10 py-4 rounded-full font-black text-lg shadow-xl hover:scale-105 transition-transform duration-300 border-none group">
              Đăng ký tài khoản FPT ngay <ArrowRight className="inline-block ml-1 group-hover:translate-x-1 transition-transform" size={20}/>
            </Link>
          </div>
          <div className="absolute w-[300px] h-[300px] bg-white/10 rounded-full top-[-100px] left-[-100px]"></div>
          <div className="absolute w-[200px] h-[200px] bg-white/10 rounded-full bottom-[-50px] right-[-50px]"></div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white dark:bg-slate-950 pt-20 pb-10 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300 mt-10">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center gap-3 mb-6">
                <div className="bg-blue-600/10 dark:bg-blue-600/20 p-2 rounded-xl"><span className="text-blue-950 dark:text-white font-black text-xl">∑</span></div>
                <span className="text-2xl font-black text-blue-950 dark:text-white tracking-tight">FMATH12</span>
              </Link>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-6">Nền tảng luyện thi Toán 12 tích hợp AI tiên phong, cá nhân hoá lộ trình dành riêng cho học sinh FPT.</p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-colors"><Facebook size={18}/></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-colors"><Youtube size={18}/></a>
                <a href="#" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-blue-600 hover:text-white transition-colors"><Github size={18}/></a>
              </div>
            </div>
            
            {['Khám phá', 'Hỗ trợ'].map((colTitle, idx) => (
              <div key={idx}>
                <h4 className="font-extrabold text-blue-950 dark:text-white uppercase tracking-wider mb-6 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-1 after:bg-blue-600 after:rounded-full">{colTitle}</h4>
                <ul className="space-y-4">
                  {[
                    ['Lý thuyết', 'Luyện đề', 'Bảng xếp hạng FPT'],
                    ['Câu hỏi thường gặp', 'Điều khoản FPT', 'Chính sách bảo mật']
                  ][idx].map((link) => (
                    <li key={link}><a href="#" className="text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors font-medium">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="font-extrabold text-blue-950 dark:text-white uppercase tracking-wider mb-6 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-1 after:bg-blue-600 after:rounded-full">Hệ thống</h4>
              <div className="flex flex-col gap-3">
                <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition border border-slate-800 shadow-md">
                  <GraduationCap className="text-blue-400" size={28}/>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wide">Đăng nhập bằng</span>
                    <span className="font-bold text-sm">FPT Email</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm font-medium">© 2026 FMath12 Platform. All Rights Reserved.</p>
            <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái hệ thống</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-mono text-green-500 font-bold tracking-tight">Hoạt động</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;