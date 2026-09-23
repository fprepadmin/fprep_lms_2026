'use client';

import React, { useEffect, useState, useRef, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setVisible(true);
    setProgress(15);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 60) return prev + Math.random() * 18 + 5;
        if (prev < 85) return prev + Math.random() * 8 + 2;
        if (prev < 95) return prev + 1;
        return prev;
      });
    }, 180);
  };

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    finishTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 280);
  };

  // Hoàn tất tiến trình khi pathname hoặc searchParams thay đổi
  useEffect(() => {
    completeProgress();
  }, [pathname, searchParams]);

  // Bắt các sự kiện click trên toàn bộ liên kết nội bộ
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
          // Nếu URL khác với trang hiện tại, kích hoạt loading
          if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
            startProgress();
          }
        }
      } catch (err) {
        // Hợp lệ cho relative URL
        if (href.startsWith('/') && href !== window.location.pathname) {
          startProgress();
        }
      }
    };

    // Đăng ký API toàn cục để code có thể gọi trực tiếp
    (window as any).__startPageTransition = startProgress;
    (window as any).__finishPageTransition = completeProgress;

    window.addEventListener('click', handleDocumentClick, { capture: true });
    window.addEventListener('popstate', startProgress);

    return () => {
      window.removeEventListener('click', handleDocumentClick, { capture: true });
      window.removeEventListener('popstate', startProgress);
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999999] pointer-events-none h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-[#f26f21] via-[#ff9248] to-[#0d6efd] shadow-[0_0_12px_rgba(242,111,33,0.8)] transition-all duration-200 ease-out relative"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          transitionProperty: 'width, opacity',
        }}
      >
        {/* Điểm sáng dẫn đường (Glow Leading Edge) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-3 bg-white/80 rounded-full blur-[3px]" />
      </div>
    </div>
  );
}
