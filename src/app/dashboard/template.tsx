'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // 1. Kéo mượt/ngay lập tức lên đỉnh trang trên window và body
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 2. Tìm và cuộn tất cả các container có scrollable trong main layout
    const scrollContainers = document.querySelectorAll('main, .overflow-y-auto, [data-scroll-container]');
    scrollContainers.forEach((el) => {
      el.scrollTop = 0;
    });
  }, [pathname]);

  return (
    <div className="animate-page-enter w-full">
      {children}
    </div>
  );
}
