'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Check, Sparkles, Copy, 
  FileCode2, CheckCircle2, Clock, 
  BookOpen, HelpCircle, Layers, Eye, Image as ImageIcon,
  Upload, Link as LinkIcon
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import { uploadImageToCloudinary, getImageFromClipboardEvent } from '@/lib/cloudinary';
import { parseAndRepairJson } from '@/lib/jsonRepair';

const AI_PROMPT_FPREP = `Bạn là một chuyên gia giáo dục và kỹ sư dữ liệu khảo thí của hệ thống FPREP. 
Nhiệm vụ: Đọc đề thi dưới đây và chuyển đổi toàn bộ câu hỏi sang mảng JSON chuẩn 2025. 
ĐẶC BIỆT LƯU Ý: Giáo viên đã cung cấp sẵn đáp án đúng trong đề (bằng cách gạch chân, in đậm, bôi đỏ, có dấu * ở phương án đúng, hoặc để bảng đáp án ở cuối file). 
Bạn PHẢI dò tìm và trích xuất chính xác đáp án này làm \`correct_answer\`. TUYỆT ĐỐI KHÔNG tự giải và chọn đáp án khác với ý đồ của giáo viên. 
Sau khi lấy được đáp án của giáo viên, hãy tự động soạn phần \`explanation\` (lời giải chi tiết) sao cho logic và dẫn đến đúng đáp án đó.

QUY ƯỚC QUAN TRỌNG CẦN TUÂN THỦ:
1. BẢNG BIỂU & CÔNG THỨC (LATEX): 
   - ĐƯỢC PHÉP dùng LaTeX để viết công thức toán học hoặc bảng biến thiên.
   - TUYỆT ĐỐI BẮT BUỘC PHẢI DÙNG DẤU $ CHO CÔNG THỨC NGẮN VÀ $$ CHO KHỐI CÔNG THỨC. (Ví dụ ĐÚNG: $y = x^2$, $\\frac{1}{2}$).
2. CẤU TRÚC JSON CHUẨN 2025:
[
  // 1. Trắc nghiệm 4 lựa chọn (type: "mcq")
  { 
    "type": "mcq", 
    "level": "Nhận biết", 
    "content": "Nội dung câu hỏi...", 
    "options": [ {"id": "A", "text": "Đáp án A"}, {"id": "B", "text": "Đáp án B"}, {"id": "C", "text": "Đáp án C"}, {"id": "D", "text": "Đáp án D"} ], 
    "correct_answer": "A", 
    "explanation": "Lời giải chi tiết..." 
  },
  // 2. Trắc nghiệm Đúng/Sai (type: "tf")
  { 
    "type": "tf", 
    "level": "Thông hiểu", 
    "content": "Nội dung phần dẫn chung...", 
    "options": [ {"id": "a", "text": "Ý a..."}, {"id": "b", "text": "Ý b..."}, {"id": "c", "text": "Ý c..."}, {"id": "d", "text": "Ý d..."} ], 
    "correct_answer": { "a": true, "b": false, "c": true, "d": false }, 
    "explanation": "Lời giải chi tiết cho từng ý..." 
  },
  // 3. Trả lời ngắn (type: "saq")
  { 
    "type": "saq", 
    "level": "Vận dụng", 
    "content": "Nội dung câu hỏi...", 
    "options": [], 
    "correct_answer": "12.5", 
    "explanation": "Lời giải chi tiết..." 
  }
]

TRẢ VỀ DUY NHẤT MẢNG JSON BẮT ĐẦU BẰNG [ VÀ KẾT THÚC BẰNG ].
ĐỀ THI:
[DÁN ĐỀ THI VÀO ĐÂY]`;

export interface QuestionData {
  id?: string;
  type: 'mcq' | 'tf' | 'saq';
  level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
  content: string;
  options: { id: string; text: string }[];
  correct_answer: any;
  explanation: string;
}

interface ExamEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  initialQuestions: any[];
  onSave: (examData: any, questionsData: QuestionData[]) => Promise<void>;
  lessonTitle?: string;
  subjectName?: string;
}

export default function ExamEditorModal({
  isOpen,
  onClose,
  exam,
  initialQuestions,
  onSave,
  lessonTitle,
  subjectName
}: ExamEditorModalProps) {
  const [examTitle, setExamTitle] = useState(exam?.title || 'Bài tập luyện tập theo bài');
  const [examDuration, setExamDuration] = useState<number>(exam?.duration_minutes || 15);
  const [examType, setExamType] = useState<string>(exam?.exam_type || 'lesson');
  
  // Danh sách câu hỏi
  const [questions, setQuestions] = useState<QuestionData[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return initialQuestions.map((q, idx) => {
        let qType: 'mcq' | 'tf' | 'saq' = q.question_type || q.type || 'mcq';
        let parsedOptions = Array.isArray(q.options) ? q.options : [];
        if (typeof q.options === 'string') {
          try { parsedOptions = JSON.parse(q.options); } catch (e) {}
        }

        // Tự động suy luận dạng câu hỏi nếu chưa rõ
        const contentLower = (q.content || '').toLowerCase();
        if (
          contentLower.includes('đúng hoặc sai') || 
          contentLower.includes('đúng sai') || 
          contentLower.includes('tính đúng/sai') || 
          contentLower.includes('tính đúng sai') || 
          contentLower.includes('xét tính đúng') ||
          contentLower.includes('mệnh đề sau')
        ) {
          qType = 'tf';
        } else if (typeof q.correct_answer === 'object' && q.correct_answer !== null && !Array.isArray(q.correct_answer)) {
          qType = 'tf';
        } else if (parsedOptions.length === 0 && qType !== 'tf') {
          qType = 'saq';
        }

        const isTf = qType === 'tf';
        const defaultKeys = isTf ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D'];

        if (parsedOptions.length > 0) {
          parsedOptions = parsedOptions.map((opt: any, optIdx: number) => {
            if (typeof opt === 'object' && opt !== null) {
              return {
                id: isTf ? String(opt.id || defaultKeys[optIdx] || String(optIdx + 1)).toLowerCase() : String(opt.id || defaultKeys[optIdx] || String(optIdx + 1)).toUpperCase(),
                text: String(opt.text || opt.content || '')
              };
            }
            return {
              id: defaultKeys[optIdx] || String(optIdx + 1),
              text: String(opt)
            };
          });
        }

        let ca = q.correct_answer;
        if (qType === 'mcq') {
          if (q.correct_option_index !== undefined && q.correct_option_index !== null) {
            ca = ['A', 'B', 'C', 'D'][q.correct_option_index] || 'A';
          }
          if (!ca || typeof ca !== 'string') ca = 'A';
        } else if (qType === 'tf') {
          if (!ca || typeof ca !== 'object' || Array.isArray(ca)) {
            ca = { a: true, b: false, c: true, d: false };
          }
        } else if (qType === 'saq') {
          if (ca === undefined || ca === null) ca = '';
          else ca = String(ca);
        }

        return {
          id: q.id || `temp-${idx}`,
          type: qType,
          level: q.level || (qType === 'saq' ? 'Vận dụng' : qType === 'tf' ? 'Thông hiểu' : 'Nhận biết'),
          content: q.content || '',
          options: qType === 'saq' ? [] : (parsedOptions.length > 0 ? parsedOptions : isTf ? [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' }
          ] : [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' }
          ]),
          correct_answer: ca,
          explanation: q.explanation || ''
        };
      });
    }

    // Mặc định tạo sẵn 1 câu hỏi trống
    return [{
      id: 'temp-0',
      type: 'mcq',
      level: 'Nhận biết',
      content: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' }
      ],
      correct_answer: 'A',
      explanation: ''
    }];
  });

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Hidden File Input Refs
  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const explanationImageInputRef = useRef<HTMLInputElement>(null);
  const optionImageInputRef = useRef<HTMLInputElement>(null);
  const targetOptionIdxRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const currentQ = questions[activeQuestionIdx] || questions[0];

  const handleUpdateCurrentQ = (field: keyof QuestionData, value: any) => {
    setQuestions(prev => {
      const next = [...prev];
      if (next[activeQuestionIdx]) {
        next[activeQuestionIdx] = { ...next[activeQuestionIdx], [field]: value };
      }
      return next;
    });
  };

  const handleAddQuestion = () => {
    const newQ: QuestionData = {
      id: `temp-${Date.now()}`,
      type: 'mcq',
      level: 'Nhận biết',
      content: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' }
      ],
      correct_answer: 'A',
      explanation: ''
    };
    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIdx(questions.length);
  };

  // 1. Tải ảnh cho Câu hỏi
  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const imgUrl = await uploadImageToCloudinary(file, 'fprep_exams');
      const imgMarkdown = `\n\n![Hình minh họa](${imgUrl})\n`;
      handleUpdateCurrentQ('content', (currentQ.content || '').trim() + imgMarkdown);
    } catch (err: any) {
      alert('Không thể tải ảnh lên Cloudinary: ' + err.message);
    } finally {
      setIsUploadingImage(false);
      if (questionImageInputRef.current) questionImageInputRef.current.value = '';
    }
  };

  // 2. Tải ảnh cho Từng phương án
  const handleTriggerOptionImage = (idx: number) => {
    targetOptionIdxRef.current = idx;
    optionImageInputRef.current?.click();
  };

  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetIdx = targetOptionIdxRef.current;
    setIsUploadingImage(true);
    try {
      const imgUrl = await uploadImageToCloudinary(file, 'fprep_exams');
      const optTag = currentQ.options[targetIdx]?.id || ['A', 'B', 'C', 'D'][targetIdx] || 'Đáp án';
      const imgMarkdown = `\n![${optTag}](${imgUrl})`;
      const newOpts = [...currentQ.options];
      const curText = newOpts[targetIdx]?.text || '';
      newOpts[targetIdx] = { 
        id: newOpts[targetIdx]?.id || optTag, 
        text: curText.trim() ? `${curText} ${imgMarkdown}` : imgMarkdown 
      };
      handleUpdateCurrentQ('options', newOpts);
    } catch (err: any) {
      alert('Không thể tải ảnh đáp án lên Cloudinary: ' + err.message);
    } finally {
      setIsUploadingImage(false);
      if (optionImageInputRef.current) optionImageInputRef.current.value = '';
    }
  };

  // 3. Tải ảnh cho Lời giải
  const handleExplanationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const imgUrl = await uploadImageToCloudinary(file, 'fprep_exams');
      const imgMarkdown = `\n\n![Hình lời giải](${imgUrl})\n`;
      handleUpdateCurrentQ('explanation', (currentQ.explanation || '').trim() + imgMarkdown);
    } catch (err: any) {
      alert('Không thể tải ảnh lời giải lên Cloudinary: ' + err.message);
    } finally {
      setIsUploadingImage(false);
      if (explanationImageInputRef.current) explanationImageInputRef.current.value = '';
    }
  };

  // 4. Xử lý dán ảnh từ Clipboard (Ctrl + V) trực tiếp vào textarea / input
  const handlePasteImage = async (field: 'content' | 'explanation', file: File) => {
    setIsUploadingImage(true);
    try {
      const imgUrl = await uploadImageToCloudinary(file, 'fprep_exams');
      const label = field === 'content' ? 'Hình minh họa' : 'Hình lời giải';
      const imgMarkdown = `\n\n![${label}](${imgUrl})\n`;
      handleUpdateCurrentQ(field, (currentQ[field] || '').trim() + imgMarkdown);
    } catch (err: any) {
      alert('Không thể tải ảnh từ Clipboard lên Cloudinary: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePasteImageOption = async (optIdx: number, file: File) => {
    setIsUploadingImage(true);
    try {
      const imgUrl = await uploadImageToCloudinary(file, 'fprep_exams');
      const optTag = currentQ.options[optIdx]?.id || ['A', 'B', 'C', 'D'][optIdx] || 'Đáp án';
      const imgMarkdown = `\n![${optTag}](${imgUrl})`;
      const newOpts = [...currentQ.options];
      const curText = newOpts[optIdx]?.text || '';
      newOpts[optIdx] = { 
        id: newOpts[optIdx]?.id || optTag, 
        text: curText.trim() ? `${curText} ${imgMarkdown}` : imgMarkdown 
      };
      handleUpdateCurrentQ('options', newOpts);
    } catch (err: any) {
      alert('Không thể tải ảnh phương án lên Cloudinary: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    if (activeQuestionIdx >= idx && activeQuestionIdx > 0) {
      setActiveQuestionIdx(activeQuestionIdx - 1);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_FPREP);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleImportJson = () => {
    if (!jsonInput.trim()) {
      alert('Vui lòng dán chuỗi JSON vào ô nhập liệu!');
      return;
    }

    try {
      // Sử dụng công cụ tự động phục hồi và phân tích cú pháp JSON
      const parsed = parseAndRepairJson<any[]>(jsonInput);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Dữ liệu sau khi xử lý phải là một danh sách các câu hỏi!');
      }

      const formattedQuestions: QuestionData[] = parsed.map((item: any, idx: number) => {
        let qType: 'mcq' | 'tf' | 'saq' = item.type || item.question_type || 'mcq';
        let opts = Array.isArray(item.options) ? item.options : [];
        
        // Tự động suy luận dạng câu hỏi
        const contentLower = (item.content || '').toLowerCase();
        if (
          contentLower.includes('đúng hoặc sai') || 
          contentLower.includes('đúng sai') || 
          contentLower.includes('tính đúng/sai') || 
          contentLower.includes('tính đúng sai') || 
          contentLower.includes('xét tính đúng') ||
          contentLower.includes('mệnh đề sau')
        ) {
          qType = 'tf';
        } else if (typeof item.correct_answer === 'object' && item.correct_answer !== null && !Array.isArray(item.correct_answer)) {
          qType = 'tf';
        } else if (opts.length === 0 && qType !== 'tf') {
          qType = 'saq';
        }

        const isTf = qType === 'tf';
        const defaultKeys = isTf ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D'];

        if (opts.length > 0) {
          opts = opts.map((t: any, i: number) => {
            if (typeof t === 'object' && t !== null) {
              return {
                id: isTf ? String(t.id || defaultKeys[i] || String(i + 1)).toLowerCase() : String(t.id || defaultKeys[i] || String(i + 1)).toUpperCase(),
                text: String(t.text || t.content || '')
              };
            }
            return { id: defaultKeys[i] || String(i + 1), text: String(t) };
          });
        }

        let ca = item.correct_answer;
        if (qType === 'mcq') {
          if (!ca || typeof ca !== 'string') ca = 'A';
          else ca = String(ca).toUpperCase();
        } else if (qType === 'tf') {
          if (!ca || typeof ca !== 'object' || Array.isArray(ca)) {
            ca = { a: true, b: false, c: true, d: false };
          }
        } else if (qType === 'saq') {
          if (ca === undefined || ca === null) ca = '';
          else ca = String(ca);
        }

        return {
          id: `imported-${idx}`,
          type: qType,
          level: item.level || (qType === 'saq' ? 'Vận dụng' : qType === 'tf' ? 'Thông hiểu' : 'Nhận biết'),
          content: item.content || '',
          options: qType === 'saq' ? [] : (opts.length > 0 ? opts : isTf ? [
            { id: 'a', text: '' },
            { id: 'b', text: '' },
            { id: 'c', text: '' },
            { id: 'd', text: '' }
          ] : [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' }
          ]),
          correct_answer: ca,
          explanation: item.explanation || ''
        };
      });

      setQuestions(formattedQuestions);
      setActiveQuestionIdx(0);
      setShowAiModal(false);
      setJsonInput('');
      alert(`Đã tự động sửa lỗi và nạp thành công ${formattedQuestions.length} câu hỏi vào đề thi!`);
    } catch (err: any) {
      alert('Không thể tự động phân tích JSON: ' + err.message);
    }
  };

  const handleSaveExam = async () => {
    if (!examTitle.trim()) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          title: examTitle.trim(),
          duration_minutes: Number(examDuration),
          exam_type: examType
        },
        questions
      );
      onClose();
    } catch (err: any) {
      alert('Lỗi lưu đề thi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-card border border-border rounded-2xl w-full max-w-7xl h-[92vh] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        
        {/* =========================================================================
            1. HEADER MODAL (CỐ ĐỊNH TRÊN CÙNG)
            ========================================================================= */}
        <header className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <span className="text-primary font-bold">{lessonTitle ? `Bài học: ${lessonTitle}` : subjectName || 'Soạn Đề Thi'}</span>
                <span>•</span>
                <span>{questions.length} câu hỏi</span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight truncate m-0">
                Biên Soạn & Quản Lý Đề Thi / Luyện Tập
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs hover:opacity-90 transition-opacity shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Nhập AI / JSON</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* =========================================================================
            2. CẤU HÌNH THÔNG TIN CHUNG CỦA ĐỀ THI (1 HÀNG GỌN GÀNG)
            ========================================================================= */}
        <div className="px-5 py-3 border-b border-border bg-card grid gap-4 sm:grid-cols-12 text-xs shrink-0 items-center">
          <div className="sm:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Tiêu đề đề thi / bài tập</label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 font-bold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="VD: Bài tập luyện tập: Tính đơn điệu..."
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Phân loại đề</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 font-semibold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="lesson">Luyện tập theo bài</option>
              <option value="test">Kiểm tra định kỳ (15p/45p)</option>
              <option value="thptqg">Luyện thi THPTQG</option>
              <option value="dgnl">Đánh giá Năng lực (ĐGNL)</option>
              <option value="vsat">Kỳ thi VSAT</option>
            </select>
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Thời lượng làm bài</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={examDuration}
                onChange={(e) => setExamDuration(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-bold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="font-bold text-muted-foreground text-xs shrink-0">phút</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. WORKSPACE SOẠN CÂU HỎI (SPLIT VIEW CHI TIẾT & THÔNG THOÁNG)
            ========================================================================= */}
        <div className="flex-1 overflow-hidden grid md:grid-cols-12 min-h-0">
          
          {/* CỘT TRÁI: DANH SÁCH CÂU HỎI */}
          <aside className="md:col-span-4 lg:col-span-3.5 border-r border-border bg-muted/10 flex flex-col h-full overflow-hidden">
            <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0 bg-card">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" /> Danh sách câu ({questions.length})
              </span>
              <button
                onClick={handleAddQuestion}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm câu
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {questions.map((q, idx) => {
                const isSelected = activeQuestionIdx === idx;
                return (
                  <div
                    key={q.id || idx}
                    onClick={() => setActiveQuestionIdx(idx)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold' 
                        : 'bg-card border-border hover:bg-muted/40 text-foreground'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                        }`}>
                          Câu {idx + 1}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {q.type === 'mcq' ? 'Trắc nghiệm 4 ý' : q.type === 'tf' ? 'Đúng / Sai' : 'Trả lời ngắn'}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 leading-relaxed m-0 ${isSelected ? 'text-white/95' : 'text-muted-foreground'}`}>
                        {q.content || '(Chưa nhập nội dung câu hỏi)'}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(idx);
                      }}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        isSelected 
                          ? 'text-white hover:bg-white/20' 
                          : 'text-muted-foreground hover:text-red-600 hover:bg-red-500/10'
                      }`}
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* CỘT PHẢI: TRÌNH SOẠN THẢO CÂU HỎI ĐANG CHỌN */}
          <main className="md:col-span-8 lg:col-span-8.5 p-5 sm:p-7 space-y-6 overflow-y-auto h-full bg-background">
            {currentQ && (
              <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                
                {/* THANH CẤU HÌNH LOẠI CÂU HỎI & MỨC ĐỘ */}
                <div className="grid gap-4 sm:grid-cols-2 p-4 bg-muted/20 rounded-2xl border border-border">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Dạng câu hỏi</label>
                    <select
                      value={currentQ.type}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        let newOpts = currentQ.options;
                        let newCa = currentQ.correct_answer;
                        if (newType === 'mcq') {
                          newOpts = [
                            { id: 'A', text: currentQ.options[0]?.text || '' },
                            { id: 'B', text: currentQ.options[1]?.text || '' },
                            { id: 'C', text: currentQ.options[2]?.text || '' },
                            { id: 'D', text: currentQ.options[3]?.text || '' }
                          ];
                          newCa = 'A';
                        } else if (newType === 'tf') {
                          newOpts = [
                            { id: 'a', text: currentQ.options[0]?.text || 'Ý a...' },
                            { id: 'b', text: currentQ.options[1]?.text || 'Ý b...' },
                            { id: 'c', text: currentQ.options[2]?.text || 'Ý c...' },
                            { id: 'd', text: currentQ.options[3]?.text || 'Ý d...' }
                          ];
                          newCa = { a: true, b: false, c: false, d: false };
                        } else if (newType === 'saq') {
                          newOpts = [];
                          newCa = '0';
                        }
                        handleUpdateCurrentQ('type', newType);
                        handleUpdateCurrentQ('options', newOpts);
                        handleUpdateCurrentQ('correct_answer', newCa);
                      }}
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2 font-bold text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="mcq">1. Trắc nghiệm 4 lựa chọn (MCQ)</option>
                      <option value="tf">2. Trắc nghiệm Đúng / Sai 4 ý (TF)</option>
                      <option value="saq">3. Trả lời ngắn (SAQ)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Mức độ nhận thức</label>
                    <select
                      value={currentQ.level}
                      onChange={(e) => handleUpdateCurrentQ('level', e.target.value)}
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2 font-semibold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Nhận biết">Nhận biết</option>
                      <option value="Thông hiểu">Thông hiểu</option>
                      <option value="Vận dụng">Vận dụng</option>
                      <option value="Vận dụng cao">Vận dụng cao</option>
                    </select>
                  </div>
                </div>

                {/* NỘI DUNG CÂU HỎI */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-foreground">Nội dung câu hỏi</label>
                      <input 
                        type="file" 
                        ref={questionImageInputRef} 
                        accept="image/*" 
                        onChange={handleQuestionImageUpload} 
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => questionImageInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors"
                        title="Tải ảnh lên Cloudinary hoặc dán ảnh trực tiếp (Ctrl+V) vào ô nhập"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span>{isUploadingImage ? 'Đang tải lên Cloudinary...' : 'Tải ảnh Cloudinary'}</span>
                      </button>
                    </div>

                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                      Hỗ trợ LaTeX: <code className="text-primary font-mono">$...$</code> • Dán ảnh: <code className="text-primary font-mono">Ctrl + V</code>
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={currentQ.content}
                    onChange={(e) => handleUpdateCurrentQ('content', e.target.value)}
                    onPaste={async (e) => {
                      const file = getImageFromClipboardEvent(e);
                      if (file) {
                        e.preventDefault();
                        await handlePasteImage('content', file);
                      }
                    }}
                    placeholder="Nhập nội dung đề bài... (Hỗ trợ $công thức toán$, dán ảnh trực tiếp Ctrl+V hoặc bấm 'Tải ảnh Cloudinary')"
                    className="w-full rounded-xl border border-border bg-card p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 font-sans text-sm leading-relaxed text-foreground"
                  />
                  {currentQ.content && (
                    <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Xem trước câu hỏi:</span>
                      <div className="text-sm font-medium text-foreground">
                        <MathRenderer content={currentQ.content} />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4 PHƯƠNG ÁN LỰA CHỌN (MCQ) */}
                {currentQ.type === 'mcq' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">
                        4 Phương án lựa chọn (Click chọn nút tròn để chỉ định đáp án đúng, click icon 🖼️ để tải ảnh):
                      </label>
                      <input 
                        type="file" 
                        ref={optionImageInputRef} 
                        accept="image/*" 
                        onChange={handleOptionImageUpload} 
                        className="hidden" 
                      />
                    </div>
                    
                    <div className="grid gap-3">
                      {['A', 'B', 'C', 'D'].map((optId, optIdx) => {
                        const optText = currentQ.options[optIdx]?.text || '';
                        const isCorrect = String(currentQ.correct_answer).toUpperCase() === optId;

                        return (
                          <div
                            key={optId}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 ${
                              isCorrect 
                                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30' 
                                : 'bg-card border-border hover:border-border/80'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm shrink-0 select-none">
                                <input
                                  type="radio"
                                  name={`correct-${activeQuestionIdx}`}
                                  checked={isCorrect}
                                  onChange={() => handleUpdateCurrentQ('correct_answer', optId)}
                                  className="h-4.5 w-4.5 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  isCorrect ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {optId}
                                </span>
                              </label>

                              <input
                                type="text"
                                value={optText}
                                onChange={(e) => {
                                  const newOpts = [...currentQ.options];
                                  newOpts[optIdx] = { id: optId, text: e.target.value };
                                  handleUpdateCurrentQ('options', newOpts);
                                }}
                                onPaste={async (e) => {
                                  const file = getImageFromClipboardEvent(e);
                                  if (file) {
                                    e.preventDefault();
                                    await handlePasteImageOption(optIdx, file);
                                  }
                                }}
                                placeholder={`Nhập nội dung phương án ${optId}... (hỗ trợ $công thức$, dán ảnh Ctrl+V hoặc bấm 🖼️)`}
                                className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />

                              <button
                                type="button"
                                onClick={() => handleTriggerOptionImage(optIdx)}
                                className="p-2 rounded-xl border border-border bg-muted/40 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors shrink-0"
                                title={`Tải ảnh Cloudinary cho phương án ${optId}`}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Preview KaTeX hoặc ảnh của từng phương án */}
                            {optText && (optText.includes('$') || optText.includes('![')) && (
                              <div className="pl-12 text-xs text-foreground/90 font-medium">
                                <MathRenderer content={optText} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4 Ý ĐÚNG / SAI (TF) */}
                {currentQ.type === 'tf' && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-foreground">
                      4 Mệnh đề Đúng / Sai (a, b, c, d) - Có thể bấm icon 🖼️ hoặc bấm Ctrl+V để dán ảnh:
                    </label>

                    <div className="grid gap-3">
                      {['a', 'b', 'c', 'd'].map((subId, subIdx) => {
                        const optText = currentQ.options[subIdx]?.text || '';
                        const currentTfAns = typeof currentQ.correct_answer === 'object' ? currentQ.correct_answer : {};
                        const isTrue = currentTfAns[subId] === true;

                        return (
                          <div key={subId} className="p-3.5 rounded-2xl border border-border bg-card flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center uppercase shrink-0">
                                {subId}
                              </span>

                              <input
                                type="text"
                                value={optText}
                                onChange={(e) => {
                                  const newOpts = [...currentQ.options];
                                  newOpts[subIdx] = { id: subId, text: e.target.value };
                                  handleUpdateCurrentQ('options', newOpts);
                                }}
                                onPaste={async (e) => {
                                  const file = getImageFromClipboardEvent(e);
                                  if (file) {
                                    e.preventDefault();
                                    await handlePasteImageOption(subIdx, file);
                                  }
                                }}
                                placeholder={`Nội dung ý ${subId}... (hỗ trợ $công thức$, dán ảnh Ctrl+V hoặc bấm 🖼️)`}
                                className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                              />

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleTriggerOptionImage(subIdx)}
                                  className="p-2 rounded-xl border border-border bg-muted/40 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors shrink-0"
                                  title={`Tải ảnh Cloudinary cho ý ${subId}`}
                                >
                                  <ImageIcon className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateCurrentQ('correct_answer', {
                                      ...currentTfAns,
                                      [subId]: true
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    isTrue ? 'bg-emerald-600 text-white shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                >
                                  Đúng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateCurrentQ('correct_answer', {
                                      ...currentTfAns,
                                      [subId]: false
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    !isTrue ? 'bg-rose-600 text-white shadow-xs' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                >
                                  Sai
                                </button>
                              </div>
                            </div>

                            {optText && (optText.includes('$') || optText.includes('![')) && (
                              <div className="pl-10 text-xs text-foreground/90 font-medium">
                                <MathRenderer content={optText} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TRẢ LỜI NGẮN (SAQ) */}
                {currentQ.type === 'saq' && (
                  <div className="space-y-2 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                    <label className="text-xs font-bold text-primary block">
                      Đáp án chính xác (Số hoặc Chuỗi ký tự ngắn):
                    </label>
                    <input
                      type="text"
                      value={String(currentQ.correct_answer || '')}
                      onChange={(e) => handleUpdateCurrentQ('correct_answer', e.target.value)}
                      placeholder="VD: 12.5 hoặc -3/4..."
                      className="w-full rounded-xl border border-border bg-card px-4 py-2.5 font-bold text-primary text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}

                {/* LỜI GIẢI CHI TIẾT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-foreground block">
                      Lời giải chi tiết (Hướng dẫn phương pháp giải cho học sinh):
                    </label>
                    <input 
                      type="file" 
                      ref={explanationImageInputRef} 
                      accept="image/*" 
                      onChange={handleExplanationImageUpload} 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => explanationImageInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors"
                      title="Tải ảnh lời giải lên Cloudinary hoặc dán ảnh trực tiếp Ctrl+V"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>{isUploadingImage ? 'Đang tải lên...' : 'Tải ảnh lời giải'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={currentQ.explanation}
                    onChange={(e) => handleUpdateCurrentQ('explanation', e.target.value)}
                    onPaste={async (e) => {
                      const file = getImageFromClipboardEvent(e);
                      if (file) {
                        e.preventDefault();
                        await handlePasteImage('explanation', file);
                      }
                    }}
                    placeholder="Giải thích chi tiết các bước... (Hỗ trợ $công thức$, dán ảnh Ctrl+V hoặc bấm 'Tải ảnh lời giải')"
                    className="w-full rounded-xl border border-border bg-card p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 font-sans text-sm leading-relaxed text-foreground"
                  />
                  {currentQ.explanation && (
                    <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Xem trước lời giải:</span>
                      <div className="text-sm font-medium text-foreground">
                        <MathRenderer content={currentQ.explanation} />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </main>

        </div>

        {/* =========================================================================
            4. FOOTER MODAL (CỐ ĐỊNH DƯỚI CÙNG)
            ========================================================================= */}
        <footer className="px-5 py-3.5 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground font-semibold">
            Đang soạn: <strong className="text-foreground">{questions.length} câu hỏi</strong> • Thời lượng: <strong className="text-foreground">{examDuration} phút</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border font-bold text-muted-foreground hover:bg-muted text-xs transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSaveExam}
              disabled={isSaving}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Đề Thi & Bài Tập'}</span>
            </button>
          </div>
        </footer>

      </div>

      {/* MODAL NHẬP JSON / AI PROMPT */}
      {showAiModal && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h4 className="font-bold text-sm sm:text-base text-foreground m-0">Trình Nhập Đề Tự Động Từ AI</h4>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto flex-1">
              <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl space-y-2">
                <p className="font-bold text-purple-700 dark:text-purple-300 m-0">
                  Bước 1: Copy Prompt AI chuẩn hóa và dán vào ChatGPT / Gemini kèm nội dung đề thi của bạn:
                </p>
                <button
                  onClick={handleCopyPrompt}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-xs text-xs"
                >
                  {copiedPrompt ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPrompt ? 'Đã sao chép Prompt!' : 'Sao chép Prompt AI Chuẩn'}</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground block">
                    Bước 2: Dán mảng JSON kết quả từ AI vào ô bên dưới:
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Tự động sửa lỗi LaTeX & Escapes
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='[\n  {\n    "type": "mcq",\n    "level": "Nhận biết",\n    "content": "...",\n    "options": [...],\n    "correct_answer": "A",\n    "explanation": "..."\n  }\n]'
                  className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground italic m-0">
                  💡 Hệ thống FPREP tự động xử lý các lỗi thường gặp từ ChatGPT/Gemini: lỗi gạch chéo LaTeX (<code className="text-primary font-mono">\frac, \alpha, \sqrt</code>), dấu phẩy thừa, xuống dòng thô và markdown.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl border border-border font-bold text-muted-foreground text-xs hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleImportJson}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Phân tích & Tự động Sửa Lỗi Nạp Đề
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
