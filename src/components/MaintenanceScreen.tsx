'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  Wrench, Shield, Server, Database, 
  Clock, Mail, AlertTriangle, LogIn, 
  Sparkles, CheckCircle2, Lock, ChevronRight,
  Layers, RefreshCw, X
} from 'lucide-react';
import Footer from './Footer';

interface MaintenanceScreenProps {
  onAdminBypass?: () => void;
}

export default function MaintenanceScreen({ onAdminBypass }: MaintenanceScreenProps) {
  const { user, loginWithGoogle } = useAuth();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
      if (onAdminBypass) onAdminBypass();
    } catch (err) {
      console.error('Lỗi đăng nhập bảo trì:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex flex-col justify-between text-foreground">
      
      {/* ── TOP NAV / HEADER ── */}
      <header className="border-b border-border/60 bg-card/70 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="FPREP Logo" className="h-8 w-8 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-lg tracking-tight text-primary">FPREP</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                  Khối 12
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">THPT FPT Cần Thơ • Tổ Tự Nhiên</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>Cổng Quản Trị</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center text-center">
        
        {/* Animated Icon Badge */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-primary/20 flex items-center justify-center border-2 border-amber-500/40 shadow-xl shadow-amber-500/10">
            <Wrench className="w-12 h-12 sm:w-14 sm:h-14 text-amber-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-xl shadow-md">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-4 animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Hệ Thống Đang Trong Chế Độ Bảo Trì & Nâng Cấp</span>
        </div>

        {/* Main Headings */}
        <h1 className="font-heading font-black text-2xl sm:text-4xl lg:text-5xl text-foreground tracking-tight max-w-2xl mb-4">
          FPREP Đang Được Nâng Cấp Hệ Thống
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed mb-8">
          Hệ thống Quản lý Học tập FPREP đang tiến hành bảo trì định kỳ, cập nhật cấu trúc cơ sở dữ liệu và tối ưu hóa hạ tầng nhằm mang đến trải nghiệm tự học tốt nhất cho học sinh Khối 12.
        </p>

        {/* Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8 text-left">
          
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Cơ Sở Dữ Liệu</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">Tái cấu trúc & bảo mật dữ liệu</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5">
                <CheckCircle2 className="w-3 h-3" /> Đang tối ưu
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Hạ Tầng Máy Chủ</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">Nâng cấp băng thông & CDN</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> Đang cập nhật
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Kho Học Liệu</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">Kiểm định nội dung 10 môn</div>
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1.5">
                <CheckCircle2 className="w-3 h-3" /> Chuẩn bị mở lại
              </div>
            </div>
          </div>

        </div>

        {/* Action / Contact Card */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 max-w-xl w-full text-center space-y-4 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            <span>Thời gian dự kiến hoàn tất: Sớm nhất có thể</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Quý thầy cô và các bạn học sinh có thắc mắc hoặc cần hỗ trợ gấp vui lòng liên hệ Ban Quản trị qua email:
          </p>

          <a 
            href="mailto:fprep.fschool@gmail.com" 
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline bg-primary/10 px-4 py-2 rounded-xl"
          >
            <Mail className="w-4 h-4" />
            <span>fprep.fschool@gmail.com</span>
          </a>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <Footer />

      {/* ── ADMIN BYPASS LOGIN MODAL ── */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative">
            
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-bold p-2"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-xl text-foreground">
                Cổng Quản Trị & Giáo Viên
              </h3>
              <p className="text-xs text-muted-foreground">
                Đăng nhập để vào không gian quản lý hoặc kiểm tra hệ thống trong thời gian bảo trì.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập với Google (Gmail / FPT Mail)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
