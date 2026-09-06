import React, { useEffect, useState, Suspense } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useAppStore } from '../../store/useAppStore';
import { auth } from '../../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { studentService } from '../../services/studentService';
import { Loader2, BellRing, CheckCircle2, Sparkles, Heart, Award } from 'lucide-react';
import { supabase } from '../../config/supabase'; 
import ReactMarkdown from 'react-markdown';

const PageContentLoading = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[500px] w-full animate-in fade-in">
    <div className="w-8 h-8 border-4 border-[#dee2e6] border-t-primary rounded-full animate-spin mb-3"></div>
    <p className="text-[14px] font-medium text-[#6c757d]">Đang tải nội dung...</p>
  </div>
);

const DashboardLayout = () => {
  const { currentUser, setUser } = useAppStore();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [popupNotifs, setPopupNotifs] = useState<any[]>([]);
  const [showBgkWelcome, setShowBgkWelcome] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const location = useLocation();
  const hideMenu = location.pathname.includes('/live-exam') || 
                   location.pathname.includes('/live-monitor') ||
                   location.search.includes('embed=true');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        setIsAuthenticated(true);
        try {
          let profile = await studentService.getProfileByEmail(firebaseUser.email);
          let currentUserId = ''; 
          const userEmail = firebaseUser.email.toLowerCase();
          
          let targetRole = 'student';
          if (userEmail === '5phutcungpy@gmail.com') targetRole = 'admin';
          else if (userEmail === 'aiquizfct@gmail.com' || userEmail === 'giaoviendemo.bgk@gmail.com' || userEmail.endsWith('@fpt.edu.vn')) targetRole = 'teacher'; 
          else if (userEmail.includes('fct') || userEmail === 'hocsinhdemo.bgk@gmail.com') targetRole = 'student'; 

          // Kiểm tra và hiển thị popup chào mừng BGK
          if (userEmail === 'hocsinhdemo.bgk@gmail.com' || userEmail === 'giaoviendemo.bgk@gmail.com') {
            const hasSeen = sessionStorage.getItem('has_seen_bgk_welcome');
            if (!hasSeen) {
              setShowBgkWelcome(true);
            }
          }

          if (profile) {
            // Giữ nguyên role đã được phân quyền trong Database
            if (userEmail === '5phutcungpy@gmail.com' && profile.role !== 'admin') {
              await supabase.from('users').update({ role: 'admin' }).eq('id', profile.id);
              profile.role = 'admin';
            }
            if (userEmail === 'giaoviendemo.bgk@gmail.com' && profile.role !== 'teacher') {
              await supabase.from('users').update({ role: 'teacher', full_name: 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN' }).eq('id', profile.id);
              profile.role = 'teacher';
              profile.full_name = 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN';
            }
            if (userEmail === 'hocsinhdemo.bgk@gmail.com' && profile.full_name !== 'BGK CUỘC THI STTTNNĐ - HỌC SINH') {
              await supabase.from('users').update({ full_name: 'BGK CUỘC THI STTTNNĐ - HỌC SINH' }).eq('id', profile.id);
              profile.full_name = 'BGK CUỘC THI STTTNNĐ - HỌC SINH';
            }
            setUser(profile);
            currentUserId = profile.id; 
          } else {
            // Sinh tài khoản BGK hoặc TS tự do
            let fallbackName = firebaseUser.displayName || firebaseUser.email.split('@')[0] || "Bạn mới";
            if (userEmail === 'hocsinhdemo.bgk@gmail.com') fallbackName = 'BGK CUỘC THI STTTNNĐ - HỌC SINH';
            else if (userEmail === 'giaoviendemo.bgk@gmail.com') fallbackName = 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN';
            
            const fallbackStudentCode = userEmail.includes('bgk') ? 'BGK_2026' : `TS_${Math.floor(Date.now() / 1000)}`; 

            const { data, error } = await supabase.from('users').insert({
              email: firebaseUser.email, 
              full_name: fallbackName, 
              role: targetRole, 
              avatar_url: firebaseUser.photoURL || null,
              student_code: fallbackStudentCode 
            }).select().single();

            if (error) console.error("Lỗi tạo TS tự do:", error);

            if (data) { setUser(data); currentUserId = data.id; } 
            else { currentUserId = firebaseUser.uid; }
          }

          if (currentUserId) {
            await studentService.syncClassMembership(firebaseUser.email, currentUserId);

            const { data: unreadNotifs } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', currentUserId)
              .eq('is_read', false)
              .order('created_at', { ascending: true }); 
            
            if (unreadNotifs && unreadNotifs.length > 0) {
              setPopupNotifs(unreadNotifs);
            }
          }
        } catch (error) { console.error("Lỗi đồng bộ dữ liệu Layout:", error); }
      } else {
        setIsAuthenticated(false);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, [setUser]);

  const handleAcknowledgePopup = async (notifId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setPopupNotifs(prev => prev.filter(n => n.id !== notifId));
  };

  const isDemo = localStorage.getItem('demo_mode') === 'true';

  if (isAuthChecking && !isDemo) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8f9fa] text-[#6c757d]">
        <Loader2 size={32} className="animate-spin mb-4 text-primary" />
        <p className="font-medium text-[14px]">Đang đồng bộ dữ liệu...</p>
      </div>
    );
  }

  // FIX LỖI: Nếu chưa đăng nhập thì ép văng ra trang Login
  if (!isAuthenticated && !isDemo) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen w-full flex bg-[#f8f9fa] text-[#495057] overflow-hidden">
      {!hideMenu && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative h-screen">
        {!hideMenu && (
          <Header
            title="FMath12 Platform"
            onMenuClick={() => setSidebarOpen(true)}
          />
        )}
        <main className="flex-1 relative overflow-y-auto custom-scrollbar pb-20 md:pb-0">
          <Suspense fallback={<PageContentLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {/* Bottom Navigation cho mobile */}
      {!hideMenu && <BottomNav />}

      {popupNotifs.length > 0 && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-md p-6 shadow-bs-hover border border-[#dee2e6] relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 border-b border-[#dee2e6] pb-4">
              <div className="w-10 h-10 bg-[#e7f1ff] text-primary flex items-center justify-center rounded shrink-0 border border-[#b6d4fe]">
                <BellRing size={20}/>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#212529] leading-tight font-heading">{popupNotifs[0].title}</h3>
                <div className="text-[11px] font-semibold text-[#6c757d] mt-1 uppercase tracking-wider">THÔNG BÁO TỪ HỆ THỐNG</div>
              </div>
            </div>
            <div className="bg-[#f8f9fa] p-4 rounded border border-[#e9ecef] mb-5 max-h-[40vh] overflow-y-auto custom-scrollbar">
              <div className="prose prose-sm prose-slate max-w-none text-[#495057] leading-relaxed">
                <ReactMarkdown>{popupNotifs[0].message}</ReactMarkdown>
              </div>
            </div>
            <button onClick={() => handleAcknowledgePopup(popupNotifs[0].id)} className="btn-primary w-full py-2.5">
              <CheckCircle2 size={18} /> TÔI ĐÃ HIỂU
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL CHÀO MỪNG BAN GIÁM KHẢO (STTTNNĐ)    */}
      {/* ========================================== */}
      {showBgkWelcome && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 md:p-8 shadow-2xl border-2 border-primary/30 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-tr from-primary to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/30 animate-bounce">
                <Sparkles size={32} />
              </div>
              <span className="bg-[#e7f1ff] text-primary text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-[#b6d4fe]">
                Cuộc thi Sáng tạo Thanh thiếu niên Nhi đồng
              </span>
              <h2 className="text-xl md:text-2xl font-black text-[#212529] font-heading mt-3 mb-1">
                KÍNH CHÀO QUÝ BAN GIÁM KHẢO!
              </h2>
              <p className="text-[13px] font-bold text-primary">
                {currentUser?.name || (currentUser?.role === 'teacher' ? 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN' : 'BGK CUỘC THI STTTNNĐ - HỌC SINH')}
              </p>
            </div>

            {/* Nội dung thư cảm ơn & chúc sức khỏe */}
            <div className="bg-[#f8f9fa] p-5 rounded-xl border border-[#dee2e6] mb-6 text-[#495057] text-[14px] leading-relaxed space-y-3">
              <p>
                Lời đầu tiên, nhóm tác giả dự án <strong>FMATH12 (Hệ sinh thái Học tập Thích ứng & Khảo thí Toán học 12)</strong> xin được gửi lời chào trân trọng nhất và lời cảm ơn chân thành, sâu sắc đến <strong>Quý Ban Giám Khảo</strong> đã dành thời gian quý báu để thẩm định và đánh giá sản phẩm.
              </p>
              <p className="font-semibold text-[#0f5132] bg-[#d1e7dd] p-3 rounded-lg border border-[#a3cfbb] flex items-center gap-2">
                💐 Kính chúc Quý Ban Giám Khảo luôn dồi dào sức khỏe, hạnh phúc và có những trải nghiệm đánh giá thật hài lòng cùng nền tảng FMath12!
              </p>
            </div>

            {/* Nút bấm trải nghiệm */}
            <button 
              onClick={() => {
                setShowBgkWelcome(false);
                sessionStorage.setItem('has_seen_bgk_welcome', 'true');
              }}
              className="btn-primary w-full py-3.5 text-[15px] font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
              <CheckCircle2 size={18} /> BẮT ĐẦU TRẢI NGHIỆM HỆ THỐNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;