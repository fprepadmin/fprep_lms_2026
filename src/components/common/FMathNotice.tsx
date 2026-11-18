'use client';

import React from 'react';
import { ExternalLink, Sparkles, BookOpen, ArrowUpRight } from 'lucide-react';

interface FMathNoticeProps {
  className?: string;
  variant?: 'banner' | 'card';
}

export default function FMathNotice({ className = '', variant = 'card' }: FMathNoticeProps) {
  if (variant === 'banner') {
    return (
      <div className={`p-4 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-primary/5 to-card text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${className}`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                Cổng học tập FMATH12
              </span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-foreground m-0">
              Học sinh vui lòng truy cập Hệ thống FMATH12 để học tập
            </p>
          </div>
        </div>

        <a
          href="https://fmath12-fschool.web.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all shrink-0 self-start sm:self-auto"
        >
          <span>Mở FMATH12</span>
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-card p-6 sm:p-8 text-center space-y-4 shadow-sm relative overflow-hidden ${className}`}>
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-4 max-w-xl mx-auto">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/25 shadow-inner">
          <BookOpen className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" /> Hệ thống Chuyên đề & Khảo thí Toán 12
          </div>

          <h3 className="text-lg sm:text-2xl font-black font-heading text-foreground tracking-tight m-0">
            Học sinh vui lòng truy cập Hệ thống FMATH12 để học tập
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground font-semibold leading-relaxed m-0">
            Toàn bộ học liệu số, bài giảng lý thuyết, đề rèn luyện và ngân hàng đề thi chuẩn môn Toán Khối 12 được quản lý và tổ chức học tập trực tiếp trên hệ thống <strong>FMATH12</strong>.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://fmath12-fschool.web.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md hover:scale-[1.02] transition-all"
          >
            <span>Truy cập Hệ thống FMATH12 ngay</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <p className="text-[11px] font-mono text-muted-foreground m-0">
          <a 
            href="https://fmath12-fschool.web.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary underline transition-colors"
          >
            https://fmath12-fschool.web.app/
          </a>
        </p>
      </div>
    </div>
  );
}
