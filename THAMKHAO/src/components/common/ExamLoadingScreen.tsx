import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Cpu, CheckCircle2, Loader2 } from 'lucide-react';

interface ExamLoadingScreenProps {
  onComplete?: () => void;
  examTitle?: string;
  durationMs?: number;
}

export default function ExamLoadingScreen({ 
  onComplete, 
  examTitle = "Kỳ Thi Trực Tuyến THPTQG & ĐGNL", 
  durationMs = 2800 
}: ExamLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    "Đang thiết lập kết nối mã hóa tới Server Khảo thí...",
    "Đang nạp và giải mã gói câu hỏi đề thi...",
    "Đang kích hoạt hệ thống giám sát an ninh Anti-Cheat...",
    "Hoàn tất! Đang chuyển vào Phòng thi chính thức..."
  ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setProgress(pct);

      if (pct < 30) setActiveStep(0);
      else if (pct < 65) setActiveStep(1);
      else if (pct < 90) setActiveStep(2);
      else setActiveStep(3);

      if (pct >= 100) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#052c65] text-white flex flex-col items-center justify-center p-6 select-none animate-in fade-in">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/15 p-8 rounded-3xl shadow-2xl text-center space-y-6 relative z-10">
        
        {/* LOGO & LOADER ICON */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-white/10 border-t-[#ffc107] animate-spin"></div>
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
            <ShieldCheck size={32} className="text-[#ffc107]" />
          </div>
        </div>

        <div>
          <span className="bg-white/15 text-[#ffc107] font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full border border-white/10 inline-block mb-2">
            Hệ thống Khảo thí Nội bộ FMath
          </span>
          <h2 className="text-xl font-extrabold font-heading text-white m-0 leading-snug line-clamp-1">
            {examTitle}
          </h2>
        </div>

        {/* PROGRESS BAR & COUNTER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] font-mono font-bold text-[#cfe2ff]">
            <span>Đang khởi tạo phòng thi...</span>
            <span className="text-[#ffc107] text-[16px]">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-primary via-[#0d6efd] to-[#ffc107] rounded-full transition-all duration-75 shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* DIAGNOSTIC CHECKLIST */}
        <div className="bg-black/20 rounded-2xl p-4 border border-white/10 text-left space-y-2.5 text-[13px]">
          {steps.map((text, idx) => {
            const isDone = idx < activeStep;
            const isCurrent = idx === activeStep;

            return (
              <div key={idx} className={`flex items-center gap-3 transition-opacity ${isDone ? 'text-white' : isCurrent ? 'text-[#ffc107] font-bold' : 'text-white/30'}`}>
                {isDone ? (
                  <CheckCircle2 size={16} className="text-[#198754] shrink-0" />
                ) : isCurrent ? (
                  <Loader2 size={16} className="animate-spin text-[#ffc107] shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-white/20 shrink-0"></div>
                )}
                <span className="truncate">{text}</span>
              </div>
            );
          })}
        </div>

        <div className="text-[12px] text-white/50 font-medium">
          🔒 Mã hóa 256-bit • Giám sát Anti-Cheat kích hoạt
        </div>

      </div>
    </div>
  );
}
