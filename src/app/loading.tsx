import React from 'react';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="relative flex flex-col items-center gap-4">
        {/* Vòng quay hiệu ứng phát sáng */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-30" />
          <div className="w-14 h-14 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <img
            src="/favicon.png"
            alt="FPREP"
            className="w-8 h-8 object-contain absolute animate-pulse"
          />
        </div>

        {/* Chữ hiển thị thương hiệu */}
        <div className="flex flex-col items-center text-center space-y-1">
          <span className="text-xs font-black tracking-widest uppercase text-foreground/80 font-heading">
            FPREP LMS
          </span>
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Đang tải dữ liệu học tập...
          </span>
        </div>
      </div>
    </div>
  );
}
