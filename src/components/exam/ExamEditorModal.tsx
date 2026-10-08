'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Check, Sparkles, Copy, 
  FileCode2, CheckCircle2, Clock, 
  BookOpen, HelpCircle, Layers, Eye, Image as ImageIcon,
  Upload, Link as LinkIcon, SlidersHorizontal, Calculator,
  Scale, Percent, Hash, ArrowRight, Edit3, AlertCircle,
  RefreshCw, CheckSquare, TrendingUp
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';
import { uploadImageToCloudinary, getImageFromClipboardEvent } from '@/lib/cloudinary';
import { parseAndRepairJson } from '@/lib/jsonRepair';

const AI_PROMPT_FPREP = `Bạn là một chuyên gia giáo dục và kỹ sư dữ liệu khảo thí của hệ thống FPREP. 
Nhiệm vụ: Đọc đề thi dưới đây và chuyển đổi toàn bộ câu hỏi sang mảng JSON chuẩn 2026. 
ĐẶC BIỆT LƯU Ý: Giáo viên đã cung cấp sẵn đáp án đúng trong đề (bằng cách gạch chân, in đậm, bôi đỏ, có dấu * ở phương án đúng, hoặc để bảng đáp án ở cuối file). 
Bạn PHẢI dò tìm và trích xuất chính xác đáp án này làm \`correct_answer\`. TUYỆT ĐỐI KHÔNG tự giải và chọn đáp án khác với ý đồ của giáo viên. 
Sau khi lấy được đáp án của giáo viên, hãy tự động soạn phần \`explanation\` (lời giải chi tiết) sao cho logic và dẫn đến đúng đáp án đó.

QUY ƯỚC QUAN TRỌNG CẦN TUÂN THỦ:
1. BẢNG BIỂU & CÔNG THỨC (LATEX): 
   - ĐƯỢC PHÉP dùng LaTeX để viết công thức toán học hoặc bảng biến thiên.
   - TUYỆT ĐỐI BẮT BUỘC PHẢI DÙNG DẤU $ CHO CÔNG THỨC NGẮN VÀ $$ CHO KHỐI CÔNG THỨC. (Ví dụ ĐÚNG: $y = x^2$, $\\frac{1}{2}$).
2. CẤU TRÚC JSON CHUẨN 2026:
[
  // 1. Trắc nghiệm 4 lựa chọn (type: "mcq") - Mặc định 0.25 điểm
  { 
    "type": "mcq", 
    "level": "Nhận biết", 
    "points": 0.25,
    "content": "Nội dung câu hỏi...", 
    "options": [ {"id": "A", "text": "Đáp án A"}, {"id": "B", "text": "Đáp án B"}, {"id": "C", "text": "Đáp án C"}, {"id": "D", "text": "Đáp án D"} ], 
    "correct_answer": "A", 
    "explanation": "Lời giải chi tiết..." 
  },
  // 2. Trắc nghiệm Đúng/Sai (type: "tf") - Mặc định 1.0 điểm
  { 
    "type": "tf", 
    "level": "Thông hiểu", 
    "points": 1.0,
    "content": "Nội dung phần dẫn chung...", 
    "options": [ {"id": "a", "text": "Ý a..."}, {"id": "b", "text": "Ý b..."}, {"id": "c", "text": "Ý c..."}, {"id": "d", "text": "Ý d..."} ], 
    "correct_answer": { "a": true, "b": false, "c": true, "d": false }, 
    "explanation": "Lời giải chi tiết cho từng ý..." 
  },
  // 3. Trả lời ngắn (type: "saq") - Mặc định 0.5 điểm
  { 
    "type": "saq", 
    "level": "Vận dụng", 
    "points": 0.5,
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
  points?: number;
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

export const getDefaultQuestionPoints = (type: 'mcq' | 'tf' | 'saq'): number => {
  if (type === 'tf') return 1.0;
  if (type === 'saq') return 0.5;
  return 0.25;
};

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

        const rawPt = q.points !== undefined && q.points !== null && !isNaN(Number(q.points))
          ? Number(q.points)
          : (q.point !== undefined ? Number(q.point) : (q.score !== undefined ? Number(q.score) : getDefaultQuestionPoints(qType)));

        return {
          id: q.id || `temp-${idx}`,
          type: qType,
          level: q.level || (qType === 'saq' ? 'Vận dụng' : qType === 'tf' ? 'Thông hiểu' : 'Nhận biết'),
          content: q.content || '',
          points: rawPt,
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
      points: 0.25,
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

  // Modal Phân Bổ & Chia Điểm
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointModalTab, setPointModalTab] = useState<'auto' | 'manual'>('auto');
  const [autoModeType, setAutoModeType] = useState<'bgd' | 'equal' | 'type' | 'level'>('bgd');
  const [targetTotalScore, setTargetTotalScore] = useState<number>(10);
  const [customTypePoints, setCustomTypePoints] = useState({
    mcq: 0.25,
    tf: 1.0,
    saq: 0.5
  });
  const [customLevelPoints, setCustomLevelPoints] = useState({
    'Nhận biết': 0.25,
    'Thông hiểu': 0.5,
    'Vận dụng': 0.75,
    'Vận dụng cao': 1.0
  });
  const [batchPointInput, setBatchPointInput] = useState<number>(0.25);

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

  // Tính toán thống kê điểm số
  const totalExamPoints = Math.round(
    questions.reduce((sum, q) => sum + (q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : getDefaultQuestionPoints(q.type)), 0) * 100
  ) / 100;

  const mcqCount = questions.filter(q => q.type === 'mcq').length;
  const tfCount = questions.filter(q => q.type === 'tf').length;
  const saqCount = questions.filter(q => q.type === 'saq').length;

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
      points: 0.25,
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

  // =========================================================================
  // CÁC HÀM XỬ LÝ CHIA ĐIỂM TỰ ĐỘNG & THỦ CÔNG
  // =========================================================================

  // 1. Chia đều theo thang điểm tổng
  const handleAutoDistributeEqual = (targetTotal: number = targetTotalScore) => {
    if (questions.length === 0) return;
    const ptPerQ = Math.round((targetTotal / questions.length) * 100) / 100;
    setQuestions(prev => prev.map(q => ({ ...q, points: ptPerQ })));
  };

  // 2. Cấu trúc chuẩn Bộ GD&ĐT 2026
  const handleApplyBgdPreset = () => {
    setQuestions(prev => prev.map(q => ({
      ...q,
      points: q.type === 'tf' ? 1.0 : q.type === 'saq' ? 0.5 : 0.25
    })));
  };

  // 3. Tùy chỉnh theo từng dạng câu hỏi (MCQ / TF / SAQ)
  const handleApplyCustomTypePoints = () => {
    setQuestions(prev => prev.map(q => ({
      ...q,
      points: customTypePoints[q.type] !== undefined ? Number(customTypePoints[q.type]) : getDefaultQuestionPoints(q.type)
    })));
  };

  // 4. Tùy chỉnh theo Mức độ nhận thức (Bloom Levels)
  const handleApplyCustomLevelPoints = () => {
    setQuestions(prev => prev.map(q => ({
      ...q,
      points: customLevelPoints[q.level] !== undefined ? Number(customLevelPoints[q.level]) : 0.25
    })));
  };

  // 5. Cân đối làm tròn về đúng 10.0 điểm
  const handleBalancePoints = (target: number = 10) => {
    if (questions.length === 0) return;
    const currentTotal = questions.reduce((s, q) => s + (Number(q.points) || getDefaultQuestionPoints(q.type)), 0);
    const diff = Math.round((target - currentTotal) * 100) / 100;
    if (Math.abs(diff) < 0.001) {
      alert('Tổng điểm của đề thi đã chính xác bằng ' + target + ' điểm!');
      return;
    }
    setQuestions(prev => {
      const next = [...prev];
      const lastIdx = next.length - 1;
      const curLastPt = Number(next[lastIdx].points) || getDefaultQuestionPoints(next[lastIdx].type);
      const newLastPt = Math.max(0.05, Math.round((curLastPt + diff) * 100) / 100);
      next[lastIdx] = { ...next[lastIdx], points: newLastPt };
      return next;
    });
  };

  // 6. Gán điểm nhanh cho toàn bộ câu thuộc một dạng câu hỏi
  const handleSetPointsByType = (targetType: 'mcq' | 'tf' | 'saq', pt: number) => {
    setQuestions(prev => prev.map(q => q.type === targetType ? { ...q, points: pt } : q));
  };

  // 7. Gán điểm hàng loạt cho tất cả câu
  const handleSetAllPoints = (pt: number) => {
    setQuestions(prev => prev.map(q => ({ ...q, points: pt })));
  };

  // 8. Cập nhật điểm cho câu hỏi cụ thể
  const handleUpdateQuestionPoint = (idx: number, pt: number) => {
    setQuestions(prev => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], points: Math.max(0, pt) };
      }
      return next;
    });
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

        const parsedPt = item.points !== undefined && item.points !== null && !isNaN(Number(item.points))
          ? Number(item.points)
          : (item.point !== undefined ? Number(item.point) : (item.score !== undefined ? Number(item.score) : getDefaultQuestionPoints(qType)));

        return {
          id: `imported-${idx}`,
          type: qType,
          level: item.level || (qType === 'saq' ? 'Vận dụng' : qType === 'tf' ? 'Thông hiểu' : 'Nhận biết'),
          content: item.content || '',
          points: parsedPt,
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
        questions.map(q => ({
          ...q,
          points: q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : getDefaultQuestionPoints(q.type)
        }))
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
                <span>•</span>
                <span className={`font-bold ${Math.abs(totalExamPoints - 10) < 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  Tổng: {totalExamPoints} đ
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight truncate m-0">
                Biên Soạn & Quản Lý Đề Thi / Luyện Tập
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Nút Mở Bộ Phân Bổ & Chia Điểm */}
            <button
              onClick={() => setShowPointModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
              title="Phân bổ và chia điểm tự động hoặc thủ công"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Chia Điểm ({totalExamPoints}đ)</span>
            </button>

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
            2. CẤU HÌNH THÔNG TIN CHUNG CỦA ĐỀ THI & THANH ĐIỂM
            ========================================================================= */}
        <div className="px-5 py-3 border-b border-border bg-card grid gap-4 sm:grid-cols-12 text-xs shrink-0 items-center">
          <div className="sm:col-span-5 space-y-1">
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

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Thời lượng</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={examDuration}
                onChange={(e) => setExamDuration(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-bold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="font-bold text-muted-foreground text-xs shrink-0">phút</span>
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Tổng điểm đề</label>
            <button
              onClick={() => setShowPointModal(true)}
              className={`w-full py-2 px-3 rounded-xl border font-black text-sm flex items-center justify-between transition-all ${
                Math.abs(totalExamPoints - 10) < 0.01 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Click để mở cấu hình chia điểm"
            >
              <span className="flex items-center gap-1">
                <Calculator className="h-4 w-4" /> {totalExamPoints} đ
              </span>
              <span className="text-[10px] font-bold underline opacity-80">Chia lại</span>
            </button>
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
                const qPoint = q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : getDefaultQuestionPoints(q.type);

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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                        }`}>
                          Câu {idx + 1}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {q.type === 'mcq' ? 'Trắc nghiệm' : q.type === 'tf' ? 'Đúng/Sai' : 'Điền số'}
                        </span>
                        {/* Point Badge */}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                          isSelected ? 'bg-emerald-400/30 text-emerald-100' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {qPoint} đ
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
                
                {/* THANH CẤU HÌNH LOẠI CÂU HỎI, MỨC ĐỘ & ĐIỂM SỐ */}
                <div className="grid gap-4 sm:grid-cols-12 p-4 bg-muted/20 rounded-2xl border border-border">
                  {/* 1. Dạng câu hỏi */}
                  <div className="sm:col-span-5 space-y-1.5">
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
                        if (currentQ.points === undefined || currentQ.points === getDefaultQuestionPoints(currentQ.type)) {
                          handleUpdateCurrentQ('points', getDefaultQuestionPoints(newType));
                        }
                      }}
                      className="w-full rounded-xl border border-border bg-card px-3.5 py-2 font-bold text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="mcq">1. Trắc nghiệm 4 lựa chọn (MCQ)</option>
                      <option value="tf">2. Trắc nghiệm Đúng / Sai 4 ý (TF)</option>
                      <option value="saq">3. Trả lời ngắn (SAQ)</option>
                    </select>
                  </div>

                  {/* 2. Mức độ nhận thức */}
                  <div className="sm:col-span-3 space-y-1.5">
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

                  {/* 3. Điểm số của câu hỏi này (Thủ công / Tùy chỉnh) */}
                  <div className="sm:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Điểm câu này</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">Thang điểm 10</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="10"
                        value={currentQ.points !== undefined && !isNaN(Number(currentQ.points)) ? Number(currentQ.points) : getDefaultQuestionPoints(currentQ.type)}
                        onChange={(e) => handleUpdateCurrentQ('points', Math.max(0, Number(e.target.value)))}
                        className="w-24 rounded-xl border border-border bg-card px-3 py-2 font-black text-sm text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      {/* Nút chọn nhanh điểm */}
                      <div className="flex items-center gap-1">
                        {[0.25, 0.5, 1.0, 2.0].map(pt => (
                          <button
                            key={pt}
                            type="button"
                            onClick={() => handleUpdateCurrentQ('points', pt)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                              (currentQ.points ?? getDefaultQuestionPoints(currentQ.type)) === pt
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-card border-border hover:bg-muted text-muted-foreground'
                            }`}
                          >
                            {pt}đ
                          </button>
                        ))}
                      </div>
                    </div>
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
                        4 Phương án lựa chọn (Click chọn nút tròn để chỉ định đáp án đúng, click icon Ảnh để tải ảnh):
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
                                placeholder={`Nhập nội dung phương án ${optId}... (hỗ trợ $công thức$, dán ảnh Ctrl+V hoặc bấm icon ảnh)`}
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
                      4 Mệnh đề Đúng / Sai (a, b, c, d) - Có thể bấm icon Ảnh hoặc bấm Ctrl+V để dán ảnh:
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
                                placeholder={`Nội dung ý ${subId}... (hỗ trợ $công thức$, dán ảnh Ctrl+V hoặc bấm icon ảnh)`}
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
          <div className="text-xs text-muted-foreground font-semibold flex items-center gap-3">
            <span>Đang soạn: <strong className="text-foreground">{questions.length} câu hỏi</strong></span>
            <span>•</span>
            <span>Tổng điểm: <strong className={Math.abs(totalExamPoints - 10) < 0.01 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-amber-600 font-bold'}>{totalExamPoints} đ</strong></span>
            <span>•</span>
            <span>Thời lượng: <strong className="text-foreground">{examDuration} phút</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowPointModal(true)}
              className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Phân Bổ Điểm</span>
            </button>
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

      {/* =========================================================================
          5. MODAL CẤU HÌNH PHÂN BỔ ĐIỂM TỰ ĐỘNG / THỦ CÔNG (SCORE ALLOCATION MODAL)
          ========================================================================= */}
      {showPointModal && (
        <div className="fixed inset-0 z-[100000] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <header className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-foreground m-0">
                    Phân Bổ & Chia Điểm Đề Thi
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold m-0 mt-0.5 flex items-center gap-2">
                    <span>Tổng số: <strong className="text-foreground">{questions.length} câu</strong></span>
                    <span>•</span>
                    <span>MCQ: <strong>{mcqCount}</strong>, Đúng/Sai: <strong>{tfCount}</strong>, Điền số: <strong>{saqCount}</strong></span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPointModal(false)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Tab Selector: Tự động vs Thủ công */}
            <div className="px-6 pt-3 border-b border-border bg-card flex gap-2 shrink-0">
              <button
                onClick={() => setPointModalTab('auto')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  pointModalTab === 'auto'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>1. Chia Điểm Tự Động</span>
              </button>
              <button
                onClick={() => setPointModalTab('manual')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                  pointModalTab === 'manual'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-extrabold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>2. Chia Điểm Thủ Công ({questions.length} câu)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              
              {/* TAB 1: CHIA ĐIỂM TỰ ĐỘNG */}
              {pointModalTab === 'auto' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Preset 1: Cấu trúc Chuẩn Bộ GD&ĐT 2026 */}
                  <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full mb-1">
                          <CheckCircle2 className="h-3 w-3" /> Chuẩn Bộ GD&ĐT 2026
                        </span>
                        <h4 className="font-bold text-sm text-foreground m-0">Cấu Trúc Khảo Thí Quốc Gia 2026</h4>
                        <p className="text-muted-foreground text-[11px] m-0 mt-0.5">
                          Tự động gán: Phần I (Trắc nghiệm 4 ý) = <strong>0.25đ</strong>/câu, Phần II (Đúng/Sai) = <strong>1.0đ</strong>/câu, Phần III (Trả lời ngắn) = <strong>0.5đ</strong>/câu.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleApplyBgdPreset();
                          alert('Đã áp dụng cấu trúc điểm Chuẩn Bộ GD&ĐT 2026 thành công!');
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" /> Áp Dụng Ngay
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-center font-semibold">
                      <div className="p-2 rounded-xl bg-background/80 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Phần I (MCQ)</span>
                        <span className="font-bold text-foreground">{mcqCount} câu × 0.25 = {Math.round(mcqCount * 0.25 * 100) / 100}đ</span>
                      </div>
                      <div className="p-2 rounded-xl bg-background/80 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Phần II (Đúng/Sai)</span>
                        <span className="font-bold text-foreground">{tfCount} câu × 1.0 = {Math.round(tfCount * 1.0 * 100) / 100}đ</span>
                      </div>
                      <div className="p-2 rounded-xl bg-background/80 border border-border">
                        <span className="text-[10px] text-muted-foreground block">Phần III (Điền số)</span>
                        <span className="font-bold text-foreground">{saqCount} câu × 0.5 = {Math.round(saqCount * 0.5 * 100) / 100}đ</span>
                      </div>
                    </div>
                  </div>

                  {/* Preset 2: Chia đều theo Thang điểm tổng */}
                  <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-foreground m-0">Chia Đều Cho Tất Cả Câu Hỏi</h4>
                        <p className="text-muted-foreground text-[11px] m-0 mt-0.5">
                          Tự động tính: Mỗi câu = [Thang điểm mong muốn] / [Tổng số {questions.length} câu].
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleAutoDistributeEqual(targetTotalScore);
                          alert(`Đã tự động chia đều ${targetTotalScore} điểm cho ${questions.length} câu! (${(targetTotalScore / questions.length).toFixed(2)}đ/câu)`);
                        }}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <Scale className="h-3.5 w-3.5" /> Áp Dụng Chia Đều
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Thang điểm đích:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="100"
                          value={targetTotalScore}
                          onChange={(e) => setTargetTotalScore(Math.max(1, Number(e.target.value)))}
                          className="w-20 rounded-xl border border-border bg-background px-3 py-1.5 font-bold text-foreground text-center"
                        />
                        <span className="font-bold text-muted-foreground">điểm</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {[10, 20, 40, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTargetTotalScore(val)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                              targetTotalScore === val
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border hover:bg-muted text-muted-foreground'
                            }`}
                          >
                            Thang {val}đ
                          </button>
                        ))}
                      </div>

                      {questions.length > 0 && (
                        <div className="ml-auto text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl">
                          ≈ {(targetTotalScore / questions.length).toFixed(2)} đ / câu
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preset 3: Tùy chỉnh điểm theo dạng câu hỏi */}
                  <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-foreground m-0">Tùy Chỉnh Điểm Theo Dạng Câu Hỏi</h4>
                        <p className="text-muted-foreground text-[11px] m-0 mt-0.5">
                          Tự động gán điểm riêng biệt cho từng dạng câu hỏi (MCQ, Đúng/Sai, Điền số).
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleApplyCustomTypePoints();
                          alert('Đã áp dụng phân bổ điểm theo từng dạng câu hỏi!');
                        }}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <Layers className="h-3.5 w-3.5" /> Áp Dụng Dạng Câu
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1 p-2.5 rounded-xl bg-background border border-border">
                        <label className="text-[11px] font-bold text-foreground block">1. Trắc nghiệm MCQ ({mcqCount} câu)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={customTypePoints.mcq}
                            onChange={(e) => setCustomTypePoints(prev => ({ ...prev, mcq: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-border bg-card px-2.5 py-1 font-bold text-xs"
                          />
                          <span className="text-muted-foreground font-bold">đ/câu</span>
                        </div>
                      </div>

                      <div className="space-y-1 p-2.5 rounded-xl bg-background border border-border">
                        <label className="text-[11px] font-bold text-foreground block">2. Đúng / Sai TF ({tfCount} câu)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={customTypePoints.tf}
                            onChange={(e) => setCustomTypePoints(prev => ({ ...prev, tf: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-border bg-card px-2.5 py-1 font-bold text-xs"
                          />
                          <span className="text-muted-foreground font-bold">đ/câu</span>
                        </div>
                      </div>

                      <div className="space-y-1 p-2.5 rounded-xl bg-background border border-border">
                        <label className="text-[11px] font-bold text-foreground block">3. Điền số SAQ ({saqCount} câu)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={customTypePoints.saq}
                            onChange={(e) => setCustomTypePoints(prev => ({ ...prev, saq: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-border bg-card px-2.5 py-1 font-bold text-xs"
                          />
                          <span className="text-muted-foreground font-bold">đ/câu</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preset 4: Tùy chỉnh theo mức độ nhận thức */}
                  <div className="p-4 rounded-2xl border border-border bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-foreground m-0">Tùy Chỉnh Điểm Theo Mức Độ Nhận Thức</h4>
                        <p className="text-muted-foreground text-[11px] m-0 mt-0.5">
                          Gán điểm cao hơn cho các câu hỏi Vận dụng và Vận dụng cao.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleApplyCustomLevelPoints();
                          alert('Đã áp dụng phân bổ điểm theo mức độ nhận thức!');
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs flex items-center gap-1.5"
                      >
                        <TrendingUp className="h-3.5 w-3.5" /> Áp Dụng Mức Độ
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {Object.keys(customLevelPoints).map(lvl => (
                        <div key={lvl} className="p-2 rounded-xl bg-background border border-border space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block truncate">{lvl}</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={(customLevelPoints as any)[lvl]}
                            onChange={(e) => setCustomLevelPoints(prev => ({ ...prev, [lvl]: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-border bg-card px-2 py-1 font-bold text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: CHIA ĐIỂM THỦ CÔNG */}
              {pointModalTab === 'manual' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Thanh công cụ gán nhanh */}
                  <div className="p-3.5 rounded-2xl bg-muted/20 border border-border flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">Gán nhanh:</span>
                      <button
                        onClick={() => handleSetPointsByType('mcq', 0.25)}
                        className="px-2.5 py-1 rounded-lg bg-card border border-border hover:bg-muted font-bold text-[11px]"
                      >
                        Tất cả MCQ = 0.25đ
                      </button>
                      <button
                        onClick={() => handleSetPointsByType('tf', 1.0)}
                        className="px-2.5 py-1 rounded-lg bg-card border border-border hover:bg-muted font-bold text-[11px]"
                      >
                        Tất cả Đúng/Sai = 1.0đ
                      </button>
                      <button
                        onClick={() => handleSetPointsByType('saq', 0.5)}
                        className="px-2.5 py-1 rounded-lg bg-card border border-border hover:bg-muted font-bold text-[11px]"
                      >
                        Tất cả Điền số = 0.5đ
                      </button>
                    </div>

                    <button
                      onClick={() => handleBalancePoints(10)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-black text-xs hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                      title="Tự động bù trừ để tổng điểm chính xác 10.0"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Cân đối về tròn 10đ
                    </button>
                  </div>

                  {/* Bảng danh sách chi tiết các câu */}
                  <div className="border border-border rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase sticky top-0 z-10 border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 w-16">Câu</th>
                          <th className="py-2.5 px-3 w-28">Dạng & Mức độ</th>
                          <th className="py-2.5 px-3">Trích đoạn nội dung câu hỏi</th>
                          <th className="py-2.5 px-3 w-36 text-right">Điểm số câu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {questions.map((q, idx) => {
                          const qPt = q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : getDefaultQuestionPoints(q.type);

                          return (
                            <tr key={q.id || idx} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2 px-3 font-black text-primary">
                                #{idx + 1}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-[10px] uppercase text-foreground">
                                    {q.type === 'mcq' ? 'MCQ (4 ý)' : q.type === 'tf' ? 'Đúng / Sai' : 'Điền số'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    {q.level}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground line-clamp-1 max-w-xs truncate font-medium">
                                {q.content || '(Chưa nhập nội dung)'}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    value={qPt}
                                    onChange={(e) => handleUpdateQuestionPoint(idx, Number(e.target.value))}
                                    className="w-18 rounded-lg border border-border bg-card px-2 py-1 font-black text-emerald-600 dark:text-emerald-400 text-center text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <span className="font-bold text-muted-foreground text-[11px]">đ</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <footer className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Tổng điểm hiện tại:</span>
                <span className={`text-base font-black px-3 py-0.5 rounded-xl border ${
                  Math.abs(totalExamPoints - 10) < 0.01
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}>
                  {totalExamPoints} / 10.0 đ
                </span>
                {Math.abs(totalExamPoints - 10) > 0.01 && (
                  <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                    (Chênh lệch {Math.abs(Math.round((10 - totalExamPoints) * 100) / 100)}đ)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBalancePoints(10)}
                  className="px-3.5 py-2 rounded-xl border border-border bg-background hover:bg-muted font-bold text-xs text-foreground transition-colors"
                >
                  Cân Đối 10đ
                </button>
                <button
                  onClick={() => setShowPointModal(false)}
                  className="btn-primary text-xs py-2 px-5 font-bold shadow-xs"
                >
                  Hoàn Tất & Áp Dụng
                </button>
              </div>
            </footer>

          </div>
        </div>
      )}

      {/* MODAL NHẬP JSON / AI PROMPT */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
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
                  placeholder='[\n  {\n    "type": "mcq",\n    "level": "Nhận biết",\n    "points": 0.25,\n    "content": "...",\n    "options": [...],\n    "correct_answer": "A",\n    "explanation": "..."\n  }\n]'
                  className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs focus:outline-none"
                />
                <p className="text-[11px] text-muted-foreground italic m-0">
                  Hệ thống FPREP tự động xử lý các lỗi thường gặp từ ChatGPT/Gemini: lỗi gạch chéo LaTeX (<code className="text-primary font-mono">\frac, \alpha, \sqrt</code>), dấu phẩy thừa, xuống dòng thô và markdown.
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
