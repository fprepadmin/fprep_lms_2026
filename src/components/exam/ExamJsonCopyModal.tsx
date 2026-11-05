'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Copy, Check, FileCode2, Download, FileDown,
  Clock, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { 
  StandardExamJson, 
  transformExamToStandardJson 
} from '@/lib/examTransformUtils';
import ExamPdfModal from './ExamPdfModal';

interface ExamJsonCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  questions: any[];
}

export default function ExamJsonCopyModal({
  isOpen,
  onClose,
  exam,
  questions
}: ExamJsonCopyModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Chuyển đổi toàn bộ đề thi sang JSON chuẩn cấu trúc Dạng 2
  const standardJson: StandardExamJson = transformExamToStandardJson(exam, questions);
  const jsonString = JSON.stringify(standardJson, null, 2);

  // Thống kê 3 phần theo chuẩn Dạng 2
  const mcqCount = standardJson.questions.filter(q => q.type === 'multiple_choice').length;
  const tfCount = standardJson.questions.filter(q => q.type === 'true_false').length;
  const saqCount = standardJson.questions.filter(q => q.type === 'short_answer').length;
  const totalCount = standardJson.questions.length;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownloadJson = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeTitle = (standardJson.title || 'de_thi')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      link.href = url;
      link.download = `${safeTitle || 'de_thi'}_dang_2.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download JSON error:', e);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Sao Chép JSON Đề Thi (Dạng 2)
                </h3>
                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Format Chuẩn Dạng 2
                </span>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  3 Dạng Thức
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Tự động biến đổi đề thi thành JSON 3 phần: Trắc nghiệm 4 lựa chọn, Đúng/Sai và Trả lời ngắn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Đóng (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* THÔNG TIN TÓM TẮT ĐỀ THI */}
        <div className="px-4 sm:px-5 py-3 bg-muted/15 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-foreground truncate max-w-xs sm:max-w-md">
              {standardJson.title}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="h-3.5 w-3.5 text-primary" /> {standardJson.durationMinutes} phút
            </span>
          </div>

          {/* BADGE THỐNG KÊ 3 PHẦN */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
              4 phương án: {mcqCount} câu
            </span>
            <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
              Đúng / Sai: {tfCount} câu
            </span>
            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
              Trả lời ngắn: {saqCount} câu
            </span>
            <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded text-[11px] font-black">
              Tổng: {totalCount} câu
            </span>
          </div>
        </div>

        {/* THANH THAO TÁC COPY HÀNG ĐẦU */}
        <div className="p-4 sm:p-5 border-b border-border bg-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <FileCode2 className="h-4 w-4 text-primary" />
              <span>Cấu trúc JSON đầu ra đã tự động biến đổi chuẩn Dạng 2</span>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyJson}
                className={`btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm transition-all ${
                  isCopied ? 'bg-emerald-600 text-white hover:bg-emerald-600' : ''
                }`}
              >
                {isCopied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Đã sao chép JSON Dạng 2!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Sao chép JSON (Dạng 2)</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadJson}
                className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                title="Tải tệp .json về máy"
              >
                <Download className="h-4 w-4" />
                <span>Tải .json</span>
              </button>

              <button
                onClick={() => setShowPdfModal(true)}
                className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10 font-bold"
                title="Tải đề thi dạng file PDF (Đáp án trang cuối)"
              >
                <FileDown className="h-4 w-4 text-red-500" />
                <span>Tải PDF đề</span>
              </button>
            </div>
          </div>

          {/* GHI CHÚ */}
          <div className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/60 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Mã JSON dưới đây đã được tự động chuẩn hóa từ cơ sở dữ liệu đề thi sang định dạng <strong>Dạng 2 tiêu chuẩn</strong> (gồm 3 dạng thức: Trắc nghiệm 4 lựa chọn có <code>correctAnswer</code> 0..3, Đúng/Sai với mảng <code>statements</code> a, b, c, d, và Trả lời ngắn với <code>shortAnswerCorrect</code> cùng <code>shortAnswerAccepted</code>).
            </div>
          </div>
        </div>

        {/* CODE PREVIEW VIEWER */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-950 text-slate-100 font-mono text-[12px] sm:text-[13px]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/80 text-[11px] text-slate-400">
            <span>exam_format_dang_2.json</span>
            <button
              onClick={handleCopyJson}
              className="hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{isCopied ? 'Đã copy' : 'Copy'}</span>
            </button>
          </div>

          <pre className="flex-1 overflow-auto p-4 leading-relaxed selection:bg-primary/30 selection:text-white whitespace-pre font-mono text-xs max-h-[460px]">
            <code>{jsonString}</code>
          </pre>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-muted-foreground">
            Bảo toàn công thức KaTeX ($...$), hỗ trợ import/export tương thích hoàn toàn.
          </span>
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-4"
          >
            Đóng
          </button>
        </div>
      </div>

      {showPdfModal && (
        <ExamPdfModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          exam={exam}
          questions={questions}
        />
      )}
    </div>,
    document.body
  );
}
