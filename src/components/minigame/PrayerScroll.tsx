'use client';

import React, { useState, useEffect } from 'react';
import { zenAudio } from '@/lib/soundEffects';
import { Sparkles, Edit3, Check, Flame, ChevronRight } from 'lucide-react';

interface PrayerScrollProps {
  studentName: string;
  setStudentName: (val: string) => void;
  examGoal: string;
  setExamGoal: (val: string) => void;
  prayerText: string;
  setPrayerText: (val: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export default function PrayerScroll({
  studentName,
  setStudentName,
  examGoal,
  setExamGoal,
  prayerText,
  setPrayerText,
  onSubmit,
  onBack,
}: PrayerScrollProps) {
  // Trạng thái mở cuộn sớ
  const [isOpen, setIsOpen] = useState(false);
  const [isStamped, setIsStamped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAscending, setIsAscending] = useState(false);

  useEffect(() => {
    // Kích hoạt animation mở cuộn sớ sau 100ms
    const timer = setTimeout(() => {
      setIsOpen(true);
      zenAudio.playScrollUnrollSound();
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  // Xử lý khi dâng sớ: Đóng dấu triện đỏ và sớ bay lên thăng hoa
  const handleSealAndSubmit = () => {
    // 1. Đóng dấu ấn triện
    setIsStamped(true);
    zenAudio.playStampSound();

    // 2. Sau 700ms phát chuông đại hồng chung và hiệu ứng bay lên
    setTimeout(() => {
      setIsAscending(true);
      zenAudio.playDeepGong();
    }, 650);

    // 3. Sau 1.8s hoàn tất chuyển bước
    setTimeout(() => {
      onSubmit();
    }, 1800);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-start sm:items-center justify-center px-3 sm:px-6 pt-14 pb-3 bg-black/70 backdrop-blur-sm select-none overflow-y-auto">
      
      {/* Container hiệu ứng sớ */}
      <div 
        className={`relative w-full max-w-3xl my-auto transition-all duration-1000 ease-out transform ${
          isAscending
            ? 'scale-75 -translate-y-48 opacity-0 filter blur-sm'
            : isOpen
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-90 translate-y-8 opacity-0'
        }`}
      >
        {/* Ánh hào quang vàng phía sau sớ */}
        <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 rounded-3xl blur-2xl pointer-events-none" />

        {/* Khung cuộn sớ cổ truyền */}
        <div className="relative flex items-stretch shadow-[0_20px_70px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden border-2 border-amber-600/60">
          
          {/* TRỤC CUỐN GỖ BÊN TRÁI */}
          <div className="w-6 sm:w-8 bg-gradient-to-r from-[#2a1307] via-[#5c2a10] to-[#2a1307] border-r-2 border-amber-500/80 flex flex-col items-center justify-between py-2 shrink-0 shadow-2xl">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 border border-yellow-100 shadow-md" />
            <div className="w-1.5 h-full bg-gradient-to-b from-amber-500/30 via-yellow-200/50 to-amber-500/30 rounded-full my-2" />
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 border border-yellow-100 shadow-md" />
          </div>

          {/* NỘI DUNG CUỘN SỚ HOÀNG KIM (PARCHMENT BODY) */}
          <div 
            className={`flex-1 bg-gradient-to-b from-[#fbf3d5] via-[#f7e6b5] to-[#edd093] text-stone-900 p-4 sm:p-5 relative overflow-hidden transition-all duration-700 origin-center ${
              isOpen ? 'max-w-full' : 'max-w-0 p-0'
            }`}
          >
            {/* Hoa văn chìm cung đình truyền thống */}
            <div className="absolute inset-0 bg-[radial-gradient(#b45309_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
            
            {/* Viền hoa văn triện son bao quanh mép sớ */}
            <div className="absolute inset-2 border-2 border-dashed border-red-800/40 rounded-xl pointer-events-none" />
            <div className="absolute inset-3 border border-red-900/30 rounded-lg pointer-events-none" />

            {/* TIÊU ĐỀ SỚ VĂN */}
            <div className="relative text-center pb-2 mb-3 border-b-2 border-red-900/30">
              <div className="inline-block px-3 py-0.5 rounded-full bg-red-900/10 border border-red-900/30 text-red-900 text-[10.5px] font-bold tracking-widest uppercase mb-1">
                KHOA CỬ &bull; NGUYỆN CẦU TÂM SỚ
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-serif text-red-950 tracking-wider m-0">
                VĂN SỚ CẦU NGUYỆN THI CỬ
              </h2>
              <p className="text-[11px] text-stone-700 italic font-serif mt-0.5">
                Cúi xin Tiên Tổ tiền hiền chứng giám tấc dạ thành tâm
              </p>
            </div>

            {/* FORM ĐIỀN THÔNG TIN TRANG TRỌNG TRÊN SỚ */}
            <div className="relative space-y-3 text-xs sm:text-sm font-serif">
              
              {/* Họ tên sĩ tử */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-red-950/5 p-3 rounded-xl border border-red-900/20">
                <span className="font-bold text-red-950 shrink-0 text-sm">
                  Tín chủ con tên là:
                </span>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nhập họ tên sĩ tử..."
                  className="flex-1 bg-white/70 border border-red-900/30 rounded-lg px-3 py-1.5 font-sans font-bold text-red-950 text-sm focus:outline-none focus:border-red-700 focus:bg-white shadow-inner"
                />
              </div>

              {/* Tâm nguyện hướng tới */}
              <div>
                <span className="block font-bold text-red-950 mb-1.5 text-xs">
                  Thiết tha dâng tâm nguyện:
                </span>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  {[
                    'Đỗ nguyện vọng mơ ước',
                    'Tâm trí bình tĩnh, tự tin',
                    'Làm bài sáng suốt, cẩn thận',
                    'Vượt vũ môn hóa rồng'
                  ].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => {
                        setExamGoal(goal);
                        zenAudio.playWoodenBlock();
                      }}
                      className={`px-3 py-2 rounded-xl text-left text-xs font-bold border transition-all ${
                        examGoal === goal
                          ? 'bg-red-900 text-amber-100 border-red-950 shadow-md'
                          : 'bg-white/60 border-red-900/20 text-stone-800 hover:bg-white/90'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lời khấn sớ gia tiên */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-red-950 text-xs">
                    Văn sớ cẩn cáo tiên tổ:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-[11px] text-red-800 hover:text-red-950 font-sans font-bold flex items-center gap-1 underline"
                  >
                    <Edit3 className="w-3 h-3" />
                    {isEditing ? 'Lưu nội dung' : 'Chỉnh sửa văn sớ'}
                  </button>
                </div>

                {isEditing ? (
                  <textarea
                    value={prayerText}
                    onChange={(e) => setPrayerText(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-white/80 border-2 border-red-900/50 font-serif text-red-950 text-xs sm:text-sm focus:outline-none focus:bg-white resize-none shadow-inner"
                  />
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-red-900/20 text-stone-900 text-xs sm:text-sm leading-relaxed italic shadow-inner">
                    &ldquo;{prayerText}&rdquo;
                  </div>
                )}
              </div>
            </div>

            {/* DẤU ẤN TRIỆN ĐỎ TRUYỀN THỐNG (STAMP SEAL ANIMATION) */}
            <div className="relative mt-3 pt-3 border-t border-red-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Con dấu ấn triện đỏ */}
                <div 
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-4 border-red-700 bg-red-600/15 flex flex-col items-center justify-center text-center p-1 font-serif transition-all duration-300 transform ${
                    isStamped
                      ? 'scale-100 rotate-0 opacity-100 shadow-[0_0_20px_rgba(220,38,38,0.5)]'
                      : 'scale-150 -rotate-12 opacity-20'
                  }`}
                >
                  <span className="text-[9px] font-black tracking-widest text-red-700 uppercase leading-none">
                    CHỨNG GIÁM
                  </span>
                  <div className="w-8 h-0.5 bg-red-700 my-0.5" />
                  <span className="text-[10px] font-black text-red-700 leading-tight">
                    KHOA BẢNG ĐỀ DANH
                  </span>
                </div>

                <div className="text-[11px] text-stone-600 italic font-serif">
                  {isStamped 
                    ? 'Ấn triện đã định • Lòng thành dâng thấu cửu trùng' 
                    : 'Nhấn nút bên dưới để đóng dấu ấn & dâng sớ lên bàn thờ'}
                </div>
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isStamped}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-300/80 hover:bg-stone-400/80 text-stone-800 text-xs font-bold transition-all disabled:opacity-40"
                >
                  Quay lại
                </button>

                <button
                  type="button"
                  onClick={handleSealAndSubmit}
                  disabled={isStamped}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-800 via-red-700 to-amber-700 hover:from-red-700 hover:to-amber-600 text-amber-100 font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-red-900/30 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-75 disabled:pointer-events-none"
                >
                  <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>{isStamped ? 'Đang thăng hoa dâng sớ...' : 'Đóng Dấu & Dâng Sớ'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* TRỤC CUỐN GỖ BÊN PHẢI */}
          <div className="w-6 sm:w-8 bg-gradient-to-r from-[#2a1307] via-[#5c2a10] to-[#2a1307] border-l-2 border-amber-500/80 flex flex-col items-center justify-between py-2 shrink-0 shadow-2xl">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 border border-yellow-100 shadow-md" />
            <div className="w-1.5 h-full bg-gradient-to-b from-amber-500/30 via-yellow-200/50 to-amber-500/30 rounded-full my-2" />
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-300 border border-yellow-100 shadow-md" />
          </div>

        </div>

      </div>
    </div>
  );
}
