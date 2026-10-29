'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { 
  Calendar, Clock, AlertCircle, Sparkles, 
  BookOpen, FileText, X, ArrowRight, HeartHandshake
} from 'lucide-react';

interface ExamItem {
  id: string;
  date: string;
  dayOfWeek: string;
  session: 'Sáng' | 'Chiều';
  subject: string;
  duration: string;
  gatherTime: string;
  startTime: string;
  endTime: string;
  format: string;
  type: 'general' | 'THTN' | 'THXH' | 'study';
  note?: string;
  subjectSlug?: string;
}

const EXAM_SCHEDULE: ExamItem[] = [
  {
    id: '1',
    date: '02/11/2026',
    dayOfWeek: 'Thứ Hai',
    session: 'Sáng',
    subject: 'Học sinh học theo lịch trên hệ thống FSP',
    duration: '--',
    gatherTime: '--',
    startTime: '--',
    endTime: '--',
    format: 'Học chính khóa',
    type: 'study',
  },
  {
    id: '2',
    date: '03/11/2026',
    dayOfWeek: 'Thứ Ba',
    session: 'Sáng',
    subject: 'Học sinh học theo lịch trên hệ thống FSP',
    duration: '--',
    gatherTime: '--',
    startTime: '--',
    endTime: '--',
    format: 'Học chính khóa',
    type: 'study',
  },
  {
    id: '3',
    date: '04/11/2026',
    dayOfWeek: 'Thứ Tư',
    session: 'Chiều',
    subject: 'Tiếng Anh',
    duration: '60 phút',
    gatherTime: '13h40',
    startTime: '14h00',
    endTime: '15h00',
    format: '100% TN',
    type: 'general',
    subjectSlug: 'Tiếng Anh'
  },
  {
    id: '4',
    date: '04/11/2026',
    dayOfWeek: 'Thứ Tư',
    session: 'Chiều',
    subject: 'Lịch sử',
    duration: '45 phút',
    gatherTime: '13h40',
    startTime: '15h15',
    endTime: '16h00',
    format: '100% TN',
    type: 'general',
    subjectSlug: 'Lịch sử'
  },
  {
    id: '5',
    date: '05/11/2026',
    dayOfWeek: 'Thứ Năm',
    session: 'Sáng',
    subject: 'Ngữ văn',
    duration: '90 phút',
    gatherTime: '07h40',
    startTime: '08h00',
    endTime: '09h30',
    format: '100% TL',
    type: 'general',
    subjectSlug: 'Ngữ văn'
  },
  {
    id: '6',
    date: '05/11/2026',
    dayOfWeek: 'Thứ Năm',
    session: 'Chiều',
    subject: 'Tin học',
    duration: '45 phút',
    gatherTime: '13h40',
    startTime: '14h00',
    endTime: '14h45',
    format: '100% TN',
    type: 'general',
    subjectSlug: 'Tin học'
  },
  {
    id: '7',
    date: '05/11/2026',
    dayOfWeek: 'Thứ Năm',
    session: 'Chiều',
    subject: 'Vật lí',
    duration: '45 phút',
    gatherTime: '13h40',
    startTime: '15h00',
    endTime: '15h45',
    format: '100% TN',
    type: 'general',
    subjectSlug: 'Vật lí'
  },
  {
    id: '8',
    date: '06/11/2026',
    dayOfWeek: 'Thứ Sáu',
    session: 'Sáng',
    subject: 'Toán',
    duration: '90 phút',
    gatherTime: '07h40',
    startTime: '08h00',
    endTime: '09h30',
    format: '100% TN',
    type: 'general',
    subjectSlug: 'Toán học'
  },
  {
    id: '9',
    date: '06/11/2026',
    dayOfWeek: 'Thứ Sáu',
    session: 'Chiều',
    subject: 'GDKT&PL',
    duration: '45 phút',
    gatherTime: '13h40',
    startTime: '14h00',
    endTime: '14h45',
    format: '70% TN + 30% dự án',
    type: 'THXH',
    note: 'Tổ hợp THXH / NT'
  },
  {
    id: '10',
    date: '06/11/2026',
    dayOfWeek: 'Thứ Sáu',
    session: 'Chiều',
    subject: 'Địa lí',
    duration: '45 phút',
    gatherTime: '13h40',
    startTime: '15h00',
    endTime: '15h45',
    format: '100% TN',
    type: 'THXH',
    note: 'Tổ hợp THXH / NT'
  },
  {
    id: '11',
    date: '06/11/2026',
    dayOfWeek: 'Thứ Sáu',
    session: 'Chiều',
    subject: 'Sinh học',
    duration: '45 phút',
    gatherTime: '13h40',
    startTime: '14h00',
    endTime: '14h45',
    format: '100% TN',
    type: 'THTN',
    note: 'Tổ hợp THTN (Ban T)',
    subjectSlug: 'Sinh học'
  },
  {
    id: '12',
    date: '06/11/2026',
    dayOfWeek: 'Thứ Sáu',
    session: 'Chiều',
    subject: 'Hoá học',
    duration: '45 phút',
    gatherTime: '13h40',
    startTime: '15h00',
    endTime: '15h45',
    format: '100% TN',
    type: 'THTN',
    note: 'Tổ hợp THTN (Ban T)',
    subjectSlug: 'Hóa học'
  }
];

export default function ExamScheduleGK1Widget({ defaultGroupType = 'T' }: { defaultGroupType?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'THTN' | 'THXH'>(defaultGroupType === 'X' ? 'THXH' : 'THTN');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Xử lý khóa cuộn trang và phím ESC khi mở Modal lịch thi
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsModalOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isModalOpen]);

  const filteredExams = EXAM_SCHEDULE.filter(item => {
    if (item.type === 'study' || item.type === 'general') return true;
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  return (
    <>
      {/* =========================================================================
          WIDGET NHỎ GỌN TRÊN DASHBOARD: TIẾP SỨC MÙA THI GK1 (SÁNG TRẮNG XANH)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 p-4 sm:p-4.5 text-slate-800 dark:text-slate-100 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between gap-3">
        
        <div className="flex items-start gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <HeartHandshake className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                Tiếp sức mùa thi GK1
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 02/11 &ndash; 06/11/2026
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 m-0 font-heading">
              Lịch Kiểm Tra Giữa Học Kỳ 1 &bull; Khối 12
            </h3>
            <p className="text-[11.5px] text-slate-600 dark:text-slate-400 m-0 mt-0.5 leading-relaxed font-normal">
              Nắm chắc thời gian tập trung, giờ phát đề và hình thức thi để tự tin đạt điểm cao!
            </p>
          </div>
        </div>

        {/* Nút xem chi tiết lịch thi */}
        <div className="flex items-center justify-between pt-2 relative z-10 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            FPT School Cần Thơ &bull; Niên khóa 2026&ndash;2027
          </span>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Xem Bảng Lịch Thi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* =========================================================================
          MODAL BẢNG LỊCH THI CHI TIẾT (CHUẨN SÁNG TRẮNG XANH FPT EDTECH - SỬ DỤNG PORTAL)
          ========================================================================= */}
      {mounted && isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-xs select-none overflow-y-auto animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border-2 border-blue-400/60 dark:border-blue-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-900 dark:text-slate-100"
          >
            
            {/* Header Modal Xanh Dương Sáng Sang Trọng */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-4 sm:p-6 text-white relative shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
                title="Đóng bảng lịch thi"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <div className="text-[11px] font-black uppercase tracking-widest text-blue-200">
                  FPT SCHOOLS CẦN THƠ
                </div>
                <h2 className="text-base sm:text-xl md:text-2xl font-black uppercase text-white tracking-wide m-0">
                  LỊCH KIỂM TRA GIỮA HỌC KỲ 1 KHỐI 12, NĂM HỌC 2026 - 2027
                </h2>
                <p className="text-xs text-blue-100 font-medium m-0">
                  Thời gian áp dụng: Thứ Hai 02/11/2026 đến Thứ Sáu 06/11/2026
                </p>
              </div>

              {/* Bộ lọc tổ hợp môn */}
              <div className="flex items-center justify-center gap-2 mt-4 pt-2 border-t border-white/20">
                <span className="text-xs text-blue-100 font-medium hidden sm:inline">
                  Xem theo ban:
                </span>
                {[
                  { id: 'THTN', label: 'Ban Tự nhiên (THTN)' },
                  { id: 'THXH', label: 'Ban Xã hội (THXH)' },
                  { id: 'ALL', label: 'Tất cả các môn' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id as any)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      filterType === tab.id
                        ? 'bg-white text-blue-700 shadow-md scale-105'
                        : 'bg-white/20 text-blue-100 hover:bg-white/30'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nội dung Bảng Lịch Thi Sáng Trắng Xanh Rõ Nét */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-600 text-white font-bold border-b border-blue-700">
                      <th className="p-2.5 sm:p-3 text-center whitespace-nowrap">Ngày</th>
                      <th className="p-2.5 sm:p-3 text-center whitespace-nowrap">Buổi</th>
                      <th className="p-2.5 sm:p-3 whitespace-nowrap min-w-[130px]">Môn</th>
                      <th className="p-2.5 sm:p-3 text-center whitespace-nowrap">Thời lượng</th>
                      <th className="p-2.5 sm:p-3 text-center whitespace-nowrap">Tập trung</th>
                      <th className="p-2.5 sm:p-3 text-center whitespace-nowrap">Bắt đầu</th>
                      <th className="p-2.5 sm:p-3 text-center whitespace-nowrap">Kết thúc</th>
                      <th className="p-2.5 sm:p-3 text-center whitespace-nowrap min-w-[120px]">Hình thức</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {filteredExams.map((item) => {
                      const isStudy = item.type === 'study';
                      return (
                        <tr 
                          key={item.id}
                          className={`hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition-colors ${
                            isStudy ? 'bg-slate-50 dark:bg-slate-900/50' : ''
                          }`}
                        >
                          {/* Cột Ngày */}
                          <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                            <span className="font-bold text-blue-700 dark:text-blue-400 block">{item.dayOfWeek}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.date}</span>
                          </td>

                          {/* Cột Buổi */}
                          <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              item.session === 'Sáng' 
                                ? 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800' 
                                : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            }`}>
                              {item.session}
                            </span>
                          </td>

                          {/* Cột Môn */}
                          <td className="p-2.5 sm:p-3">
                            {isStudy ? (
                              <span className="text-slate-600 dark:text-slate-300 font-bold block py-1">
                                📚 {item.subject}
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white text-sm block">
                                  {item.subject}
                                </span>
                                {item.note && (
                                  <span className="text-[10.5px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold inline-block mt-0.5">
                                    {item.note}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Cột Thời lượng */}
                          <td className="p-2.5 sm:p-3 text-center whitespace-nowrap text-slate-700 dark:text-slate-300 font-semibold">
                            {item.duration}
                          </td>

                          {/* Cột Tập trung */}
                          <td className="p-2.5 sm:p-3 text-center whitespace-nowrap text-amber-700 dark:text-amber-400 font-bold">
                            {item.gatherTime}
                          </td>

                          {/* Cột Bắt đầu */}
                          <td className="p-2.5 sm:p-3 text-center whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-bold">
                            {item.startTime}
                          </td>

                          {/* Cột Kết thúc */}
                          <td className="p-2.5 sm:p-3 text-center whitespace-nowrap text-slate-700 dark:text-slate-300 font-bold">
                            {item.endTime}
                          </td>

                          {/* Cột Hình thức */}
                          <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                              item.format.includes('TL') 
                                ? 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300' 
                                : item.format.includes('dự án')
                                ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                                : isStudy
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                              {item.format}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phần Ghi chú / Lưu ý */}
              <div className="mt-4 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-1.5 text-xs text-blue-950 dark:text-blue-200 leading-relaxed">
                <div className="font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  *LƯU Ý DÀNH CHO HỌC SINH:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700 dark:text-slate-300">
                  <li>
                    <strong className="text-blue-900 dark:text-blue-200">Các môn còn lại:</strong> Kiểm tra tại lớp / thực hiện dự án theo hướng dẫn của giáo viên bộ môn.
                  </li>
                  <li>
                    <strong className="text-blue-900 dark:text-blue-200">Sau khi hoàn thành môn thi cuối:</strong> Học sinh được về nhà và checkin từ <strong className="text-blue-700 dark:text-blue-400">16h30 Chủ nhật, ngày 08/11/2026</strong>.
                  </li>
                  <li>
                    Có mặt tại phòng thi đúng giờ tập trung (Sáng: 07h40, Chiều: 13h40) mang đầy đủ dụng cụ học tập và thẻ học sinh.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                💡 Bạn có thể vào mục <strong>Luyện Đề 2026</strong> để làm bài thi thử các môn ngay hôm nay!
              </span>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/student/exams"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Luyện đề GK1 ngay
                </Link>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
