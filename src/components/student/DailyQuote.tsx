'use client';

import React, { useState, useEffect } from 'react';
import { Quote, RefreshCw, Sparkles } from 'lucide-react';

const MOTIVATIONAL_QUOTES = [
  "Kỷ luật là chiếc cầu nối vững chắc nhất giữa mục tiêu và thành công.",
  "Mỗi bài học hoàn thành hôm nay là một bước tiến gần hơn đến cánh cửa Đại học mơ ước.",
  "Đừng dừng lại khi mệt mỏi, hãy dừng lại khi bạn đã chạm đến vạch đích.",
  "Học không phải để vượt qua người khác, mà là để trở thành phiên bản xuất sắc hơn của chính mình.",
  "Sự tập trung và kiên trì rèn luyện hôm nay sẽ tạo nên bước nhảy vọt điểm số ngày mai.",
  "Khởi đầu sớm, tự giác học, nắm chắc kiến thức 3 dạng thức mới để làm chủ kỳ thi.",
  "FSchoolers tự tin chinh phục kỳ thi Tốt nghiệp THPT và Đánh giá Năng lực.",
  "Thành công là tổng hòa của những nỗ lực nhỏ bé được lặp đi lặp lại mỗi ngày.",
  "Biết cách tự học là sở hữu chìa khóa vạn năng mở ra mọi chân trời tri thức.",
  "Học tập là hạt giống của kiến thức, và kiến thức là nền tảng của tương lai."
];

export default function DailyQuote({ className = '' }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Chọn ngẫu nhiên câu đầu tiên khi tải trang
    const initialIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setIndex(initialIndex);

    // Tự động đổi câu quote sau mỗi 8 giây
    const interval = setInterval(() => {
      handleNextQuote();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleNextQuote = () => {
    setIsFading(true);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
      setIsFading(false);
    }, 250);
  };

  return (
    <div className={`flex items-center justify-between gap-3 bg-white/95 dark:bg-[#081a3b]/95 border-2 border-[#b6d4fe] dark:border-blue-700/50 rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#084298] dark:text-blue-200 shadow-2xs backdrop-blur-md transition-all ${className}`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0d6efd] dark:text-blue-400 border border-blue-400/30 shrink-0">
          <Sparkles className="h-3 w-3" /> Động lực
        </span>
        <div className="w-5 h-5 rounded-lg bg-blue-500/15 text-[#0d6efd] dark:text-blue-400 flex sm:hidden items-center justify-center shrink-0">
          <Quote className="h-3 w-3" />
        </div>
        <p 
          className={`italic truncate m-0 transition-opacity duration-300 text-[11px] sm:text-xs text-[#052c65] dark:text-blue-100 font-medium ${
            isFading ? 'opacity-0' : 'opacity-100'
          }`}
          title={MOTIVATIONAL_QUOTES[index]}
        >
          &ldquo;{MOTIVATIONAL_QUOTES[index]}&rdquo;
        </p>
      </div>

      <button
        type="button"
        onClick={handleNextQuote}
        className="p-1.5 rounded-xl text-[#084298] dark:text-blue-300 hover:bg-blue-500/15 hover:text-primary transition-all shrink-0"
        title="Đổi câu danh ngôn khác"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
