'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setVisible(true);
    setProgress(20);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 65) return prev + Math.random() * 15 + 8;
        if (prev < 85) return prev + Math.random() * 6 + 2;
        if (prev < 95) return prev + 0.8;
        return prev;
      });
    }, 150);

    // Timeout an toàn nếu trang tải quá lâu hoặc không đổi pathname
    safetyTimeoutRef.current = setTimeout(() => {
      completeProgress();
    }, 8000);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    setProgress(100);

    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 320);
  };

  // Hoàn tất tiến trình khi pathname hoặc searchParams thay đổi
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // Bỏ qua các liên kết ngoài, mở tab mới, neo trang (#) hoặc mailto/tel
      if (
        !href ||
        targetAttr === '_blank' ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return;
      }

      // Kiểm tra xem có phải cùng origin không
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin === window.location.origin) {
          if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
            startProgress();
          }
        }
      } catch (err) {
        if (href.startsWith('/') && href !== window.location.pathname) {
          startProgress();
        }
      }
    };

    // Monkey-patching history.pushState & replaceState để bắt các lệnh router.push()
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      const url = args[2];
      if (url && typeof url === 'string') {
        try {
          const parsed = new URL(url, window.location.origin);
          if (parsed.pathname !== window.location.pathname || parsed.search !== window.location.search) {
            startProgress();
          }
        } catch (e) {
          if (url.startsWith('/') && url !== window.location.pathname) {
            startProgress();
          }
        }
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      return originalReplaceState.apply(this, args);
    };

    // Đăng ký API toàn cục
    (window as any).__startPageTransition = startProgress;
    (window as any).__finishPageTransition = completeProgress;

    window.addEventListener('click', handleDocumentClick, { capture: true });
    window.addEventListener('popstate', startProgress);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('click', handleDocumentClick, { capture: true });
      window.removeEventListener('popstate', startProgress);
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <>
      {/* 1. Thanh tiến trình chạy trên đỉnh trang (Top Progress Bar) */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 z-[9999999] pointer-events-none h-[3.5px] bg-transparent overflow-hidden"
      >
        <div
          className="h-full bg-gradient-to-r from-[#f26f21] via-[#ff9248] to-[#0d6efd] shadow-[0_0_14px_rgba(242,111,33,0.9)] transition-all duration-200 ease-out relative"
          style={{
            width: `${progress}%`,
            opacity: visible ? 1 : 0,
            transitionProperty: 'width, opacity',
          }}
        >
          {/* Điểm sáng dẫn đường phát quang */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-3.5 bg-white/90 rounded-full blur-[3px]" />
        </div>
      </div>

      {/* 2. Huy hiệu Loading nhỏ góc trên màn hình khi đang chuyển trang */}
      {visible && progress < 100 && (
        <div 
          aria-hidden="true"
          className="fixed top-4 right-4 z-[9999998] pointer-events-none animate-fade-in flex items-center gap-2 bg-card/90 dark:bg-background/90 backdrop-blur-md border border-border shadow-lg rounded-full px-3.5 py-1.5 text-xs font-bold text-foreground"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
          <span className="text-[11px] font-extrabold tracking-wide">Đang tải trang...</span>
        </div>
      )}
    </>
  );
}
