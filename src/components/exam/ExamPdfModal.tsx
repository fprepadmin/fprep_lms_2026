'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, FileDown, Check, Eye, Settings, 
  AlertCircle, CheckCircle2, Clock, BookOpen, Layers,
  ChevronDown, ChevronUp, RefreshCw, Sparkles, Image as ImageIcon,
  Edit3, Sliders, Type, FileText
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import { cleanOptionText, parseOptions } from '@/lib/questionUtils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface ExamPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  questions: any[];
}

export default function ExamPdfModal({
  isOpen,
  onClose,
  exam,
  questions
}: ExamPdfModalProps) {
  const [mounted, setMounted] = useState(false);

  // CÁC THÔNG TIN HEADER ĐỀ THI - NGƯỜI DÙNG CÓ THỂ THAY ĐỔI 100%
  const [agencyName, setAgencyName] = useState('SỞ GIÁO DỤC VÀ ĐÀO TẠO');
  const [schoolName, setSchoolName] = useState('TRƯỜNG THPT CHUYÊN & CLC');
  const [officialDocTitle, setOfficialDocTitle] = useState('ĐỀ THI CHÍNH THỨC');
  const [examSessionName, setExamSessionName] = useState('KỲ THI THỬ THPT QUỐC GIA NĂM 2026');
  const [subjectName, setSubjectName] = useState(
    exam?.subjects?.name ? String(exam.subjects.name).toUpperCase() : 'TOÁN HỌC'
  );
  const [durationMinutes, setDurationMinutes] = useState(
    String(exam?.duration_minutes || exam?.durationMinutes || 90)
  );
  const [examCode, setExamCode] = useState('101');
  const [showCandidateInfo, setShowCandidateInfo] = useState(true);

  // TÙY CHỌN BỔ SUNG
  const [includeExplanations, setIncludeExplanations] = useState(true);
  const [fontSize, setFontSize] = useState<'normal' | 'compact'>('normal');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // TIẾN TRÌNH XUẤT FILE PDF
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [previewZoom, setPreviewZoom] = useState(0.8);

  const pagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Tự động đồng bộ tên môn và thời lượng từ props exam nếu có
    if (exam?.subjects?.name) {
      setSubjectName(String(exam.subjects.name).toUpperCase());
    } else if (exam?.subjectName) {
      setSubjectName(String(exam.subjectName).toUpperCase());
    }
    if (exam?.duration_minutes) {
      setDurationMinutes(String(exam.duration_minutes));
    }
  }, [exam]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isGenerating]);

  // Sắp xếp câu hỏi theo thứ tự chuẩn
  const sortedQuestions = useMemo(() => {
    return [...(questions || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [questions]);

  // Phân loại câu hỏi thành 3 phần chuẩn Bộ GD&ĐT 2026
  const { part1Questions, part2Questions, part3Questions } = useMemo(() => {
    const p1: any[] = [];
    const p2: any[] = [];
    const p3: any[] = [];

    sortedQuestions.forEach((q) => {
      const type = String(q.type || q.question_type || '').toLowerCase();
      if (type === 'tf' || type === 'true_false' || type === 'dung_sai') {
        p2.push(q);
      } else if (type === 'saq' || type === 'short_answer' || type === 'dien_khuyet') {
        p3.push(q);
      } else {
        p1.push(q);
      }
    });

    return { part1Questions: p1, part2Questions: p2, part3Questions: p3 };
  }, [sortedQuestions]);

  // THUẬT TOÁN PHÂN TRANG CHUẨN XÁC CHỐNG TRÀN VÀ CHỐNG TRẮNG TRANG
  // Chiều cao A4 chuẩn tại 96 DPI: 1123px.
  // Padding trên/dưới: 36px + 30px = 66px. Footer trang: 30px.
  // Chiều cao khả dụng tối đa cho nội dung: 1123 - 66 - 30 = 1027px.
  // Đặt ngưỡng an toàn:
  // - Trang 1 (có header lớn ~170px): 820px (cỡ chuẩn) / 860px (compact)
  // - Các trang sau: 980px (cỡ chuẩn) / 1020px (compact)
  const examPages = useMemo(() => {
    const pages: Array<{
      pageIndex: number;
      items: Array<{
        type: 'header' | 'section_title' | 'question' | 'footer_text';
        data?: any;
        partNumber?: number;
        questionNumber?: number;
      }>;
    }> = [];

    const PAGE_1_CAPACITY = fontSize === 'compact' ? 860 : 810;
    const PAGE_N_CAPACITY = fontSize === 'compact' ? 1010 : 970;

    let currentPageItems: any[] = [];
    let currentCapacity = 0;
    let isFirstPage = true;

    const pushPage = () => {
      if (currentPageItems.length > 0) {
        pages.push({
          pageIndex: pages.length + 1,
          items: currentPageItems
        });
        currentPageItems = [];
        currentCapacity = 0;
        isFirstPage = false;
      }
    };

    // Trang 1 luôn bắt đầu với Header
    currentPageItems.push({ type: 'header' });

    let globalQNum = 1;

    // Helper tính toán chiều cao thực tế chính xác hơn cho từng câu hỏi
    const estimateQuestionHeight = (q: any, qType: 'mcq' | 'tf' | 'saq') => {
      // 1. Chiều cao dòng dẫn câu hỏi:
      const textLen = (q.content || '').length;
      let h = 26; // Câu X: ...
      h += Math.ceil(textLen / 75) * (fontSize === 'compact' ? 18 : 20);

      // 2. Nếu câu có công thức Toán KaTeX nhiều hoặc phân số lớn:
      const mathFormulas = (q.content || '').match(/\$[^$]+\$/g) || [];
      if (mathFormulas.length > 2 || (q.content || '').includes('\\frac') || (q.content || '').includes('\\dfrac')) {
        h += 16;
      }

      // 3. Nếu câu có hình ảnh minh họa (giới hạn hiển thị 180px trong CSS):
      const hasImg = (q.content && (q.content.includes('![') || q.content.includes('<img'))) || q.image || q.image_url || q.imageUrl;
      if (hasImg) {
        h += 190;
      }

      // 4. Chiều cao phần phương án / mệnh đề:
      if (qType === 'mcq') {
        const opts = parseOptions(q.options, 'mcq');
        const maxOptLen = Math.max(...opts.map(o => (o.text || '').length), 0);
        const hasComplexMath = opts.some(o => (o.text || '').includes('\\frac') || (o.text || '').includes('\\dfrac'));
        
        if (maxOptLen > 40 || hasComplexMath) {
          h += fontSize === 'compact' ? 76 : 88; // 4 dòng dọc
        } else if (maxOptLen > 18) {
          h += fontSize === 'compact' ? 42 : 48; // 2 dòng x 2 cột
        } else {
          h += fontSize === 'compact' ? 22 : 26; // 1 dòng x 4 cột
        }
      } else if (qType === 'tf') {
        let stmts: any[] = [];
        if (Array.isArray(q.statements) && q.statements.length > 0) {
          stmts = q.statements;
        } else {
          stmts = parseOptions(q.options, 'tf');
        }
        // Mỗi mệnh đề a, b, c, d:
        const stmtsHeight = stmts.slice(0, 4).reduce((acc, s) => {
          const sLen = (s.statement || s.text || '').length;
          return acc + Math.max(22, Math.ceil(sLen / 70) * (fontSize === 'compact' ? 18 : 20));
        }, 0);
        h += Math.max(88, stmtsHeight);
      } else if (qType === 'saq') {
        h += 24; // Dòng kẻ chấm trả lời
      }

      // Khoảng cách đệm giữa các câu:
      h += 12;
      return h;
    };

    // PHẦN I
    if (part1Questions.length > 0) {
      currentPageItems.push({
        type: 'section_title',
        partNumber: 1,
        data: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu ' + part1Questions.length + '. Mỗi câu hỏi thí sinh chỉ chọn một phương án.'
      });
      currentCapacity += 36;

      part1Questions.forEach((q) => {
        const h = estimateQuestionHeight(q, 'mcq');
        const maxCap = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;

        if (currentCapacity + h > maxCap && currentPageItems.length > 1) {
          pushPage();
        }

        currentPageItems.push({
          type: 'question',
          data: q,
          questionNumber: globalQNum++,
          partNumber: 1
        });
        currentCapacity += h;
      });
    }

    // PHẦN II
    if (part2Questions.length > 0) {
      const p2TitleHeight = 42;
      const maxCap = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;
      if (currentCapacity + p2TitleHeight > maxCap && currentPageItems.length > 1) {
        pushPage();
      }

      const p2Start = globalQNum;
      const p2End = globalQNum + part2Questions.length - 1;
      currentPageItems.push({
        type: 'section_title',
        partNumber: 2,
        data: `PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu ${p2Start} đến câu ${p2End}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`
      });
      currentCapacity += p2TitleHeight;

      part2Questions.forEach((q) => {
        const h = estimateQuestionHeight(q, 'tf');
        const cap = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;

        if (currentCapacity + h > cap && currentPageItems.length > 1) {
          pushPage();
        }

        currentPageItems.push({
          type: 'question',
          data: q,
          questionNumber: globalQNum++,
          partNumber: 2
        });
        currentCapacity += h;
      });
    }

    // PHẦN III
    if (part3Questions.length > 0) {
      const p3TitleHeight = 36;
      const maxCap = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;
      if (currentCapacity + p3TitleHeight > maxCap && currentPageItems.length > 1) {
        pushPage();
      }

      const p3Start = globalQNum;
      const p3End = globalQNum + part3Questions.length - 1;
      currentPageItems.push({
        type: 'section_title',
        partNumber: 3,
        data: `PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu ${p3Start} đến câu ${p3End}.`
      });
      currentCapacity += p3TitleHeight;

      part3Questions.forEach((q) => {
        const h = estimateQuestionHeight(q, 'saq');
        const cap = isFirstPage ? PAGE_1_CAPACITY : PAGE_N_CAPACITY;

        if (currentCapacity + h > cap && currentPageItems.length > 1) {
          pushPage();
        }

        currentPageItems.push({
          type: 'question',
          data: q,
          questionNumber: globalQNum++,
          partNumber: 3
        });
        currentCapacity += h;
      });
    }

    // Dấu kết thúc đề thi
    currentPageItems.push({ type: 'footer_text' });
    pushPage();

    return pages;
  }, [part1Questions, part2Questions, part3Questions, fontSize]);

  // PHÂN TRANG CHO PHẦN ĐÁP ÁN & LỜI GIẢI CHI TIẾT
  // Để tránh tràn trang hoặc cắt chữ khi lời giải dài, phân bổ trang đáp án riêng biệt
  const totalExamPagesCount = examPages.length;

  // Xử lý tạo và tải file PDF trực tiếp (Khắc phục triệt để lỗi scale html2canvas)
  const handleDownloadPdf = async () => {
    if (!pagesContainerRef.current) return;
    setIsGenerating(true);
    setGenerationProgress('Đang chuẩn bị hình ảnh và công thức KaTeX...');

    // Lưu lại zoom preview hiện tại và đặt về scale 1 để html2canvas chụp đúng 100% tọa độ
    const originalTransform = pagesContainerRef.current.style.transform;
    pagesContainerRef.current.style.transform = 'none';

    try {
      // 1. Chờ tất cả hình ảnh trong container tải xong hoàn toàn
      const images = Array.from(pagesContainerRef.current.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      // Chờ thêm 400ms để layout KaTeX và fonts hiển thị ổn định
      await new Promise((r) => setTimeout(r, 400));

      // 2. Khởi tạo jsPDF (kích thước A4 chuẩn: 210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Lấy danh sách các trang A4 (.pdf-a4-page)
      const pageElements = Array.from(
        pagesContainerRef.current.querySelectorAll<HTMLElement>('.pdf-a4-page')
      );

      if (pageElements.length === 0) {
        throw new Error('Không tìm thấy nội dung trang để xuất PDF!');
      }

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        setGenerationProgress(`Đang xử lý xuất trang ${i + 1} / ${pageElements.length}...`);

        const canvas = await html2canvas(pageEl, {
          scale: 2, // Đảm bảo 300 DPI sắc nét tuyệt đối
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 1200
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.96);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      setGenerationProgress('Đang đóng gói và lưu tệp PDF...');

      const safeTitle = (exam?.title || 'de_thi')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      pdf.save(`${safeTitle || 'de_thi'}_ma_${examCode}.pdf`);
      setGenerationProgress('Hoàn tất!');
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress('');
      }, 800);
    } catch (err: any) {
      console.error('Lỗi xuất PDF:', err);
      alert('Không thể tạo file PDF: ' + (err.message || 'Lỗi không xác định'));
      setIsGenerating(false);
      setGenerationProgress('');
    } finally {
      // Khôi phục lại preview zoom cho người dùng
      if (pagesContainerRef.current) {
        pagesContainerRef.current.style.transform = originalTransform;
      }
    }
  };

  // Helper lấy đáp án chính xác cho phần trắc nghiệm
  const getMcqAnswerLetter = (q: any): string => {
    const rawCa = q.correct_answer ?? q.correctAnswer ?? q.correct_option_index;
    if (typeof rawCa === 'number' && rawCa >= 0 && rawCa < 4) {
      return ['A', 'B', 'C', 'D'][rawCa];
    }
    if (typeof rawCa === 'string') {
      const u = rawCa.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(u)) return u;
      if (['0', '1', '2', '3'].includes(u)) return ['A', 'B', 'C', 'D'][Number(u)];
    }
    return 'A';
  };

  // Helper lấy đáp án Đúng / Sai từng ý
  const getTfAnswers = (q: any): { a: string; b: string; c: string; d: string } => {
    const rawCa = q.correct_answer ?? q.correctAnswer;
    const toDS = (val: any) => {
      if (typeof val === 'boolean') return val ? 'Đ' : 'S';
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        return (s === 'true' || s === 'đ' || s === 'd' || s === '1' || s === 'đúng') ? 'Đ' : 'S';
      }
      return 'S';
    };

    if (Array.isArray(q.statements) && q.statements.length > 0) {
      return {
        a: toDS(q.statements[0]?.isCorrect),
        b: toDS(q.statements[1]?.isCorrect),
        c: toDS(q.statements[2]?.isCorrect),
        d: toDS(q.statements[3]?.isCorrect)
      };
    }

    if (typeof rawCa === 'object' && rawCa !== null) {
      return {
        a: toDS(rawCa.a),
        b: toDS(rawCa.b),
        c: toDS(rawCa.c),
        d: toDS(rawCa.d)
      };
    }

    return { a: 'Đ', b: 'S', c: 'Đ', d: 'S' };
  };

  // Helper lấy đáp án phần điền câu trả lời ngắn
  const getSaqAnswer = (q: any): string => {
    const val = q.shortAnswerCorrect ?? q.short_answer_correct ?? q.correct_answer ?? q.correctAnswer;
    if (val !== undefined && val !== null) {
      return String(val);
    }
    return '...';
  };

  if (!isOpen || !mounted) return null;

  // Tính tổng số trang (Đề thi + 1 trang đáp án tóm tắt & lời giải)
  const totalAllPages = totalExamPagesCount + 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      {/* CSS RIÊNG BIỆT ĐẢM BẢO FILE IN VÀ PDF ĐẠT CHUẨN A4 KHÔNG BỊ TRÀN HAY CẮT CÂU */}
      <style>{`
        .pdf-a4-page {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          background-color: #ffffff !important;
          color: #000000 !important;
          flex-shrink: 0 !important;
          min-height: 1123px !important;
          height: 1123px !important;
          box-sizing: border-box !important;
        }
        .pdf-a4-page * {
          box-sizing: border-box;
        }
        .pdf-a4-page img {
          max-height: 185px !important;
          width: auto !important;
          max-width: 100% !important;
          object-fit: contain !important;
          display: block !important;
          margin: 6px auto !important;
        }
        .pdf-a4-page .katex {
          font-size: 1.05em;
        }
      `}</style>

      <div className="bg-card border border-border rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col h-[95vh] overflow-hidden animate-scale-up">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-3 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Xuất File PDF Đề Thi Chuẩn Bộ GD&ĐT
                </h3>
                <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  File .PDF Chuẩn A4
                </span>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Đáp Án Dồn Trang Cuối
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Tự động chia trang thông minh, chống trắng trang, hỗ trợ công thức Toán KaTeX và ảnh minh họa sắc nét.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold ${showSettingsDrawer ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
              title="Chỉnh sửa toàn bộ thông tin Header và cấu hình đề"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Chỉnh sửa Header ({showSettingsDrawer ? 'Đóng' : 'Mở'})</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  <span>Tải File PDF (.pdf)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isGenerating}
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Đóng (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* THANH THIẾT LẬP NHANH */}
        <div className="px-5 py-2.5 border-b border-border bg-muted/40 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Mã đề:</span>
              <input
                type="text"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value.slice(0, 6))}
                className="w-16 px-2 py-0.5 rounded-md border border-border bg-background text-center font-bold text-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Môn:</span>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value.toUpperCase())}
                className="w-32 px-2 py-0.5 rounded-md border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                placeholder="TOÁN HỌC"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-semibold">Thời gian:</span>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-16 px-2 py-0.5 rounded-md border border-border bg-background text-center font-bold text-foreground focus:outline-none"
              />
              <span className="text-muted-foreground font-semibold">phút</span>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeExplanations}
                onChange={(e) => setIncludeExplanations(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0"
              />
              <span className="font-semibold text-foreground">Kèm hướng dẫn giải</span>
            </label>

            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border border-border text-[11px]">
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded font-bold ${fontSize === 'normal' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'}`}
              >
                Cỡ chuẩn
              </button>
              <button
                type="button"
                onClick={() => setFontSize('compact')}
                className={`px-2 py-0.5 rounded font-bold ${fontSize === 'compact' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'}`}
              >
                Tiết kiệm trang
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground font-semibold text-[11px]">
            <span>Tổng số: <strong>{totalAllPages} trang</strong> (Đề thi: {totalExamPagesCount} trang, Đáp án: Trang {totalAllPages})</span>
          </div>
        </div>

        {/* BẢNG ĐIỀU KHIỂN CHỈNH SỬA TOÀN DIỆN THÔNG TIN HEADER (CƠ QUAN, TRƯỜNG, KỲ THI, LOẠI ĐỀ) */}
        {showSettingsDrawer && (
          <div className="p-4 border-b border-border bg-card/95 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs shrink-0 animate-fade-in shadow-inner">
            <div className="space-y-1">
              <label className="font-bold text-muted-foreground flex items-center gap-1">
                <span>1. Cơ quan chủ quản (Dòng 1 trái)</span>
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="SỞ GIÁO DỤC VÀ ĐÀO TẠO"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-muted-foreground flex items-center gap-1">
                <span>2. Đơn vị / Trường (Dòng 2 trái)</span>
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="TRƯỜNG THPT CHUYÊN & CLC"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-muted-foreground flex items-center gap-1">
                <span>3. Loại đề (Dòng 3 trái)</span>
              </label>
              <input
                type="text"
                value={officialDocTitle}
                onChange={(e) => setOfficialDocTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ĐỀ THI CHÍNH THỨC"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-muted-foreground flex items-center gap-1">
                <span>4. Kỳ thi (Dòng 1 phải)</span>
              </label>
              <input
                type="text"
                value={examSessionName}
                onChange={(e) => setExamSessionName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="KỲ THI THỬ THPT QUỐC GIA NĂM 2026"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-4 flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCandidateInfo}
                    onChange={(e) => setShowCandidateInfo(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0"
                  />
                  <span>Hiện dòng điền "Họ và tên thí sinh ... Số báo danh ..."</span>
                </label>
              </div>

              <span className="italic text-primary/80">
                * Bạn có thể bấm trực tiếp vào chữ trên trang xem trước để sửa nhanh
              </span>
            </div>
          </div>
        )}

        {/* THÔNG BÁO TIẾN TRÌNH GENERATION */}
        {isGenerating && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-2.5 flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>{generationProgress}</span>
            </div>
            <span>Vui lòng không đóng cửa sổ này trong khi tạo file...</span>
          </div>
        )}

        {/* KHUNG PREVIEW & VÙNG RENDER TẠO PDF */}
        <div className="flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-900/60 p-4 sm:p-6 flex justify-center">
          {/* CONTAINER CHỨA TOÀN BỘ CÁC TRANG A4 */}
          <div 
            ref={pagesContainerRef}
            className="flex flex-col gap-8 items-center pb-20 shrink-0"
            style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center' }}
          >
            {/* RENDER CÁC TRANG ĐỀ THI */}
            {examPages.map((page) => (
              <div
                key={`exam-page-${page.pageIndex}`}
                className="pdf-a4-page shrink-0 bg-white relative"
                style={{
                  width: '794px',
                  height: '1123px', // Chuẩn tỷ lệ A4: 210mm x 297mm
                  minHeight: '1123px',
                  maxHeight: '1123px',
                  flexShrink: 0,
                  overflow: 'hidden', // Khống chế chặt chẽ trong trang A4
                  padding: '34px 44px 26px 44px',
                  boxSizing: 'border-box',
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: fontSize === 'compact' ? '13px' : '14px',
                  lineHeight: '1.45',
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }}
              >
                {/* ITEMS TRÊN TRANG */}
                <div className="flex flex-col justify-between h-full">
                  <div className="space-y-2.5">
                    {page.items.map((item, itemIdx) => {
                      // 1. Header Trang 1
                      if (item.type === 'header') {
                        return (
                          <div key={itemIdx} className="border-b-2 border-black pb-2.5 mb-2.5">
                            <div className="grid grid-cols-12 gap-2 text-center items-start">
                              <div className="col-span-5 text-center leading-tight">
                                <div 
                                  className="text-[12px] uppercase tracking-wide cursor-text hover:bg-yellow-100/50 rounded transition-colors"
                                  title="Bấm để sửa nhanh"
                                >
                                  {agencyName}
                                </div>
                                <div 
                                  className="text-[13px] font-bold uppercase mt-0.5 cursor-text hover:bg-yellow-100/50 rounded transition-colors"
                                  title="Bấm để sửa nhanh"
                                >
                                  {schoolName}
                                </div>
                                <div className="font-bold text-[12px] mt-1 border-t border-black/40 pt-0.5 inline-block px-3">
                                  {officialDocTitle}
                                </div>
                                <div className="text-[11px] italic mt-0.5">
                                  (Đề thi gồm có {totalExamPagesCount} trang)
                                </div>
                              </div>

                              <div className="col-span-7 text-center leading-tight">
                                <div className="text-[13px] font-bold uppercase cursor-text hover:bg-yellow-100/50 rounded transition-colors">
                                  {examSessionName}
                                </div>
                                <div className="text-[14px] font-extrabold uppercase mt-0.5 text-black">
                                  BÀI THI MÔN: {subjectName}
                                </div>
                                <div className="text-[12px] mt-0.5 font-semibold">
                                  Thời gian làm bài: {durationMinutes} phút (không kể thời gian phát đề)
                                </div>
                                <div className="text-right mt-1 pr-1">
                                  <span className="inline-block border-2 border-black font-bold text-xs px-2.5 py-0.5">
                                    MÃ ĐỀ THI: {examCode}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Dòng điền thông tin thí sinh */}
                            {showCandidateInfo && (
                              <div className="mt-2.5 pt-1.5 border-t border-dashed border-black/50 text-[12px] grid grid-cols-12 gap-2">
                                <div className="col-span-8">
                                  Họ và tên thí sinh: ....................................................................................
                                </div>
                                <div className="col-span-4 text-right">
                                  Số báo danh: .............................
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 2. Tiêu đề từng phần
                      if (item.type === 'section_title') {
                        return (
                          <div key={itemIdx} className="font-bold text-[13.5px] mt-2 mb-1 pt-1 border-t border-black/20">
                            {item.data}
                          </div>
                        );
                      }

                      // 3. Nội dung câu hỏi
                      if (item.type === 'question') {
                        const q = item.data;
                        const qNum = item.questionNumber;
                        const part = item.partNumber;

                        return (
                          <div key={itemIdx} className="mb-2 break-inside-avoid">
                            {/* Dẫn câu hỏi */}
                            <div className="font-semibold text-black flex items-start gap-1.5">
                              <span className="font-bold shrink-0">Câu {qNum}:</span>
                              <div className="flex-1 prose-sm">
                                <MathRenderer content={q.content || ''} />
                              </div>
                            </div>

                            {/* Render phương án PHẦN I (MCQ) */}
                            {part === 1 && (
                              <div className="mt-1 pl-4">
                                {(() => {
                                  const opts = parseOptions(q.options, 'mcq');
                                  const maxLen = Math.max(...opts.map(o => (o.text || '').length), 0);
                                  const hasComplex = opts.some(o => (o.text || '').includes('\\frac') || (o.text || '').includes('\\dfrac'));
                                  const gridCols = (maxLen > 40 || hasComplex) ? 'grid-cols-1' : maxLen > 18 ? 'grid-cols-2' : 'grid-cols-4';

                                  return (
                                    <div className={`grid ${gridCols} gap-x-4 gap-y-1 text-[13px]`}>
                                      {opts.slice(0, 4).map((opt, oIdx) => {
                                        const label = ['A', 'B', 'C', 'D'][oIdx];
                                        return (
                                          <div key={oIdx} className="flex items-start gap-1">
                                            <span className="font-bold">{label}.</span>
                                            <div className="flex-1">
                                              <MathRenderer content={opt.text} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Render mệnh đề PHẦN II (TF) - HIỂN THỊ ĐỦ 100% CẢ 4 Ý a, b, c, d */}
                            {part === 2 && (
                              <div className="mt-1 pl-4 space-y-0.5 text-[13px]">
                                {(() => {
                                  let stmts: Array<{ label: string; text: string }> = [];
                                  if (Array.isArray(q.statements) && q.statements.length > 0) {
                                    stmts = q.statements.map((s: any, idx: number) => ({
                                      label: s.label || ['a', 'b', 'c', 'd'][idx],
                                      text: cleanOptionText(s.statement || s.text || s.content || '')
                                    }));
                                  } else {
                                    const opts = parseOptions(q.options, 'tf');
                                    stmts = opts.map((o, idx) => ({
                                      label: o.id || ['a', 'b', 'c', 'd'][idx],
                                      text: o.text || ''
                                    }));
                                  }

                                  return stmts.slice(0, 4).map((stmt, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-1.5">
                                      <span className="font-bold">{stmt.label})</span>
                                      <div className="flex-1">
                                        <MathRenderer content={stmt.text} />
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            )}

                            {/* Render PHẦN III (SAQ) */}
                            {part === 3 && (
                              <div className="mt-0.5 pl-4 text-[12px] italic text-black/70">
                                <span>Trả lời: ..........................................................................................................................</span>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 4. Dấu kết thúc đề thi
                      if (item.type === 'footer_text') {
                        return (
                          <div key={itemIdx} className="text-center my-3 font-bold text-[13px]">
                            <div className="border-t border-black my-1.5"></div>
                            <div>------------------------- HẾT -------------------------</div>
                            <div className="text-[11px] font-normal italic mt-0.5">
                              Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>

                  {/* FOOTER CỦA TỪNG TRANG ĐỀ THI */}
                  <div className="border-t border-black/40 pt-1 flex items-center justify-between text-[11px] font-bold text-black shrink-0">
                    <span>Mã đề thi: {examCode}</span>
                    <span>Trang {page.pageIndex} / {totalAllPages}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* =========================================================================
                TRANG CUỐI CÙNG: ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI CHI TIẾT
                BẮT BUỘC NGẮT TRANG SANG TRANG CUỐI RIÊNG BIỆT
                ========================================================================= */}
            <div
              className="pdf-a4-page shrink-0 bg-white relative"
              style={{
                width: '794px',
                height: '1123px',
                minHeight: '1123px',
                maxHeight: '1123px',
                flexShrink: 0,
                overflow: 'hidden',
                padding: '34px 44px 26px 44px',
                boxSizing: 'border-box',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: fontSize === 'compact' ? '12.5px' : '13px',
                lineHeight: '1.4',
                backgroundColor: '#ffffff',
                color: '#000000'
              }}
            >
              <div className="flex flex-col justify-between h-full">
                <div className="space-y-3">
                  {/* TIÊU ĐỀ TRANG ĐÁP ÁN */}
                  <div className="text-center border-b-2 border-black pb-2 mb-2">
                    <div className="text-[12px] font-semibold uppercase">{agencyName} - {schoolName}</div>
                    <h2 className="text-[15px] font-extrabold uppercase mt-0.5 tracking-tight">
                      ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT
                    </h2>
                    <div className="text-[12px] font-bold mt-0.5">
                      BÀI THI MÔN: {subjectName} • MÃ ĐỀ THI: {examCode}
                    </div>
                  </div>

                  {/* 1. BẢNG ĐÁP ÁN TỔNG HỢP PHẦN I */}
                  {part1Questions.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-bold text-[12.5px] uppercase">
                        I. BẢNG ĐÁP ÁN PHẦN I (TRẮC NGHIỆM 4 PHƯƠNG ÁN)
                      </div>
                      <div className="border border-black overflow-hidden rounded-xs">
                        <table className="w-full text-center border-collapse text-[11.5px]">
                          <tbody>
                            {Array.from({ length: Math.ceil(part1Questions.length / 12) }).map((_, rIdx) => {
                              const slice = part1Questions.slice(rIdx * 12, (rIdx + 1) * 12);
                              return (
                                <React.Fragment key={rIdx}>
                                  <tr className="bg-black/5 border-b border-black font-bold">
                                    <td className="border-r border-black px-1 py-0.5 text-left w-10 font-bold">Câu</td>
                                    {slice.map((_, i) => (
                                      <td key={i} className="border-r border-black px-1 py-0.5 font-bold">
                                        {rIdx * 12 + i + 1}
                                      </td>
                                    ))}
                                    {Array.from({ length: 12 - slice.length }).map((_, i) => (
                                      <td key={`empty-${i}`} className="border-r border-black px-1 py-0.5"></td>
                                    ))}
                                  </tr>
                                  <tr className="border-b border-black">
                                    <td className="border-r border-black px-1 py-0.5 text-left w-10 font-bold">Đ/A</td>
                                    {slice.map((q, i) => (
                                      <td key={i} className="border-r border-black px-1 py-0.5 font-black text-primary">
                                        {getMcqAnswerLetter(q)}
                                      </td>
                                    ))}
                                    {Array.from({ length: 12 - slice.length }).map((_, i) => (
                                      <td key={`empty-ans-${i}`} className="border-r border-black px-1 py-0.5"></td>
                                    ))}
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2. BẢNG ĐÁP ÁN TỔNG HỢP PHẦN II (ĐÚNG / SAI) */}
                  {part2Questions.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="font-bold text-[12.5px] uppercase">
                        II. BẢNG ĐÁP ÁN PHẦN II (TRẮC NGHIỆM ĐÚNG / SAI)
                      </div>
                      <div className="border border-black overflow-hidden rounded-xs">
                        <table className="w-full text-center border-collapse text-[11.5px]">
                          <thead>
                            <tr className="bg-black/5 border-b border-black font-bold">
                              <th className="border-r border-black px-2 py-0.5 text-left w-16">Câu</th>
                              <th className="border-r border-black px-2 py-0.5">Ý a</th>
                              <th className="border-r border-black px-2 py-0.5">Ý b</th>
                              <th className="border-r border-black px-2 py-0.5">Ý c</th>
                              <th className="px-2 py-0.5">Ý d</th>
                            </tr>
                          </thead>
                          <tbody>
                            {part2Questions.map((q, idx) => {
                              const qNum = part1Questions.length + idx + 1;
                              const ans = getTfAnswers(q);
                              return (
                                <tr key={idx} className="border-b border-black/40">
                                  <td className="border-r border-black px-2 py-0.5 font-bold text-left">Câu {qNum}</td>
                                  <td className="border-r border-black px-2 py-0.5 font-black">{ans.a}</td>
                                  <td className="border-r border-black px-2 py-0.5 font-black">{ans.b}</td>
                                  <td className="border-r border-black px-2 py-0.5 font-black">{ans.c}</td>
                                  <td className="px-2 py-0.5 font-black">{ans.d}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3. BẢNG ĐÁP ÁN TỔNG HỢP PHẦN III (TRẢ LỜI NGẮN) */}
                  {part3Questions.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="font-bold text-[12.5px] uppercase">
                        III. BẢNG ĐÁP ÁN PHẦN III (TRẢ LỜI NGẮN)
                      </div>
                      <div className="border border-black overflow-hidden rounded-xs">
                        <table className="w-full text-center border-collapse text-[11.5px]">
                          <tbody>
                            <tr className="bg-black/5 border-b border-black font-bold">
                              <td className="border-r border-black px-1.5 py-0.5 text-left w-10 font-bold">Câu</td>
                              {part3Questions.map((_, i) => (
                                <td key={i} className="border-r border-black px-2 py-0.5 font-bold">
                                  {part1Questions.length + part2Questions.length + i + 1}
                                </td>
                              ))}
                            </tr>
                            <tr className="border-b border-black">
                              <td className="border-r border-black px-1.5 py-0.5 text-left w-10 font-bold">Đ/A</td>
                              {part3Questions.map((q, i) => (
                                <td key={i} className="border-r border-black px-2 py-0.5 font-black text-emerald-800">
                                  {getSaqAnswer(q)}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 4. LỜI GIẢI CHI TIẾT TỪNG CÂU (NẾU BẬT TÙY CHỌN) */}
                  {includeExplanations && (
                    <div className="pt-2 border-t border-black/40 space-y-1.5">
                      <div className="font-bold text-[12.5px] uppercase flex items-center justify-between">
                        <span>IV. HƯỚNG DẪN GIẢI CHI TIẾT</span>
                        <span className="text-[10px] font-normal italic text-black/70">
                          (Dành cho học sinh đối chiếu sau khi thi)
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11.5px] leading-relaxed max-h-[380px] overflow-hidden">
                        {sortedQuestions.slice(0, 10).map((q, idx) => {
                          const qNum = idx + 1;
                          if (!q.explanation && !q.content) return null;

                          return (
                            <div key={idx} className="p-1.5 rounded bg-black/3 border border-black/15">
                              <div className="font-bold text-black text-[12px] mb-0.5">
                                Câu {qNum}: {q.type === 'tf' ? '(Đúng / Sai)' : q.type === 'saq' ? `(Đáp án: ${getSaqAnswer(q)})` : `(Đáp án: ${getMcqAnswerLetter(q)})`}
                              </div>
                              <div className="pl-2 border-l-2 border-black/30 line-clamp-3">
                                <MathRenderer content={q.explanation || 'Chưa có lời giải chi tiết cho câu hỏi này.'} />
                              </div>
                            </div>
                          );
                        })}
                        {sortedQuestions.length > 10 && (
                          <div className="text-center italic text-[11px] text-black/60 pt-1">
                            ... Xem tiếp lời giải chi tiết trên hệ thống trực tuyến FPREP ...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* FOOTER TRANG ĐÁP ÁN (TRANG CUỐI CÙNG) */}
                <div className="border-t border-black/40 pt-1 flex items-center justify-between text-[11px] font-bold text-black shrink-0">
                  <span>Mã đề thi: {examCode} • BẢNG ĐÁP ÁN & HƯỚNG DẪN GIẢI</span>
                  <span>Trang {totalAllPages} / {totalAllPages} (Trang Cuối)</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-card flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>
              Phân trang chuẩn A4, đáp án đưa xuống trang cuối, giữ nguyên công thức KaTeX và hình ảnh minh họa.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
              className="px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:bg-muted"
              title="Thu nhỏ xem trước"
            >
              -
            </button>
            <span className="text-[11px] font-mono font-bold text-muted-foreground">{Math.round(previewZoom * 100)}%</span>
            <button
              onClick={() => setPreviewZoom(z => Math.min(1.2, Number((z + 0.1).toFixed(1))))}
              className="px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:bg-muted"
              title="Phóng to xem trước"
            >
              +
            </button>

            <button
              onClick={onClose}
              className="btn-secondary text-xs py-1.5 px-3.5 ml-2"
            >
              Đóng
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="btn-primary text-xs py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
            >
              <FileDown className="h-4 w-4" />
              <span>Tải File PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
