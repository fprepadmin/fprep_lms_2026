'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer({ className = '' }: { className?: string }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`border-t border-border py-3 px-4 sm:px-6 lg:px-8 bg-card text-muted-foreground select-none shrink-0 w-full ${className}`}>
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2 text-[11px]">
        
        {/* Left: Brand & School */}
        <div className="flex items-center gap-2">
          <Link href="/" className="inline-flex items-center gap-1.5 hover:opacity-85 transition-opacity font-bold text-foreground">
            <img src="/icon.png" alt="FPREP" className="h-4 w-4 object-contain" />
            <span className="font-heading font-black tracking-tight text-primary">FPREP</span>
          </Link>
          <span className="text-border">&bull;</span>
          <span className="text-foreground/80 font-medium">THPT FPT Cần Thơ</span>
          <span className="text-border hidden sm:inline">&bull;</span>
          <span className="text-muted-foreground hidden sm:inline">Tổ Tự Nhiên &copy; {currentYear}</span>
        </div>

        {/* Right: Quick links */}
        <div className="flex items-center gap-x-3 font-medium text-muted-foreground">
          <Link href="/guide?tab=about" className="hover:text-primary transition-colors">Giới thiệu</Link>
          <span className="text-border/60">&bull;</span>
          <Link href="/guide?tab=usage" className="hover:text-primary transition-colors">Hướng dẫn</Link>
          <span className="text-border/60">&bull;</span>
          <Link href="/guide?tab=terms" className="hover:text-primary transition-colors">Điều khoản</Link>
          <span className="text-border/60">&bull;</span>
          <Link href="/guide?tab=privacy" className="hover:text-primary transition-colors">Bảo mật</Link>
        </div>

      </div>
    </footer>
  );
}
