import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Image as ImageIcon, Loader2, 
  SplitSquareHorizontal, FileQuestion, Clock, 
  Copy, Check, CheckCircle2, AlertCircle,
  BrainCircuit, Edit3, Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';

const AI_PROMPT = `Bạn là một chuyên gia Toán học và kỹ sư dữ liệu. 
Nhiệm vụ: Đọc đề thi dưới đây. ĐẶC BIỆT LƯU Ý: Giáo viên đã cung cấp sẵn đáp án đúng trong đề (bằng cách gạch chân, in đậm, bôi đỏ, có dấu * ở phương án đúng, hoặc để bảng đáp án ở cuối file). 
Bạn PHẢI dò tìm và trích xuất chính xác đáp án này làm \`correct_answer\`. TUYỆT ĐỐI KHÔNG tự giải và chọn đáp án khác với ý đồ của giáo viên. 
Sau khi lấy được đáp án của giáo viên, hãy tự động soạn phần \`explanation\` (lời giải chi tiết) sao cho logic và dẫn đến đúng đáp án đó. 
Cuối cùng chuyển 100% nội dung sang mảng JSON. 

QUY ƯỚC QUAN TRỌNG CẦN TUÂN THỦ:
1. BẢNG BIỂU & CÔNG THỨC (LATEX): 
   - ĐƯỢC PHÉP dùng LaTeX để vẽ Bảng biến thiên, Bảng xét dấu. 
   - LƯU Ý TỐI QUAN TRỌNG: Bạn PHẢI escape dấu gạch chéo ngược (VD: viết \\\\sqrt thay vì \\sqrt, \\\\begin thay vì \\begin).
   - TUYỆT ĐỐI KHÔNG SỬ DỤNG \\( VÀ \\) ĐỂ BỌC CÔNG THỨC TOÁN. BẮT BUỘC PHẢI DÙNG DẤU $ CHO CÔNG THỨC NGẮN VÀ $$ CHO KHỐI CÔNG THỨC. (Ví dụ ĐÚNG: $y = x^2$, $\\frac{1}{2}$. Ví dụ SAI: \\( y = x^2 \\))
   - NẾU CÓ BẢNG BIỂU: Phải dùng định dạng Markdown Table chuẩn và BẮT BUỘC dùng \\n để xuống dòng giữa các hàng. (VD: | Cột 1 | Cột 2 |\\n|---|---|\\n| A | B |). Tuyệt đối không viết liền bảng trên 1 dòng.
2. CHÈN ẢNH: Nếu câu hỏi có hình minh họa/đồ thị, BẮT BUỘC chèn đúng cụm từ "CẦN CHÈN ẢNH" vào vị trí đó.

HỆ THỐNG HỖ TRỢ 3 LOẠI CÂU HỎI (CẤU TRÚC JSON CHUẨN):
[
  // 1. Trắc nghiệm 4 phương án (type: "mcq")
  { 
    "type": "mcq", 
    "level": "Nhận biết", 
    "content": "Nội dung câu hỏi...\\n\\nCẦN CHÈN ẢNH\\n\\nTiếp tục...", 
    "options": [ {"id": "A", "text": "..."}, {"id": "B", "text": "..."}, {"id": "C", "text": "..."}, {"id": "D", "text": "..."} ], 
    "correct_answer": "A", 
    "explanation": "Lời giải..." 
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
    "content": "Nội dung câu hỏi trả lời ngắn...", 
    "options": [], 
    "correct_answer": "12.5", 
    "explanation": "Lời giải..." 
  }
]

TRẢ VỀ DUY NHẤT MẢNG JSON BẮT ĐẦU BẰNG [ VÀ KẾT THÚC BẰNG ].`;

const InlineUploadButton = ({ onUploadSuccess }: { onUploadSuccess: (url: string) => void }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message);
      
      onUploadSuccess(data.secure_url);
    } catch (error: any) {
      alert('Lỗi Upload ảnh: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="my-6 p-6 border-2 border-dashed border-[#dee2e6] bg-[#f8f9fa] rounded-xl flex flex-col items-center justify-center text-center transition-colors hover:border-primary hover:bg-[#e7f1ff]">
      <ImageIcon className="text-[#adb5bd] mb-2" size={32} />
      <p className="text-[13px] font-bold text-[#495057] mb-3 uppercase tracking-wider">AI phát hiện vị trí cần chèn ảnh</p>
      <input type="file" ref={fileRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <button 
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
        className="btn-primary py-2 px-5 rounded-lg text-[13px] flex items-center justify-center gap-2"
      >
        {isUploading ? <Loader2 size={16} className="animate-spin"/> : <ImageIcon size={16}/>}
        {isUploading ? 'Đang tải ảnh...' : 'Tải ảnh lên vị trí này'}
      </button>
    </div>
  );
};

const parseTFAnswerForEdit = (ans: any) => {
  if (typeof ans === 'string') {
    try { return JSON.parse(ans); } catch { return {}; }
  }
  return ans || {};
};

// --- MARKDOWN COMPONENTS ---
const MarkdownComponents = {
  img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded border border-[#dee2e6] my-4 block shadow-sm" alt={props.alt || "Ảnh"} loading="lazy" />,
  table: ({ node, ...props }: any) => <div className="w-full overflow-x-auto my-6 rounded-lg border border-[#dee2e6] shadow-sm bg-white"><table className="w-full text-center border-collapse text-[14px]" {...props} /></div>,
  thead: ({ node, ...props }: any) => <thead className="bg-[#f8f9fa] border-b-2 border-[#dee2e6] text-[#212529]" {...props} />,
  tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-[#dee2e6]" {...props} />,
  tr: ({ node, ...props }: any) => <tr className="transition-colors hover:bg-[#f8f9fa]/50" {...props} />,
  th: ({ node, ...props }: any) => <th className="p-3 border-r border-[#dee2e6] last:border-r-0 font-bold whitespace-nowrap align-middle" {...props} />,
  td: ({ node, ...props }: any) => <td className="p-3 border-r border-[#dee2e6] last:border-r-0 align-middle first:font-bold first:bg-[#f8f9fa] first:border-r-2" {...props} />,
};

const ExamEditor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editExamId = location.state?.examId; 

  const { currentUser } = useAppStore();
  
  const [content, setContent] = useState("");
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [jsonError, setJsonError] = useState(false);

  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState<number>(45);
  const [gradingType, setGradingType] = useState('standard');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  
  const [isLoadingExam, setIsLoadingExam] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isJsonCopied, setIsJsonCopied] = useState(false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // States dành cho upload ảnh trực tiếp khi chỉnh sửa
  const fileInputEditRef = useRef<HTMLInputElement>(null);
  const [uploadTargetEdit, setUploadTargetEdit] = useState<{field: string, optId?: string} | null>(null);
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);

  // LOAD EXISTING EXAM
  useEffect(() => {
    const loadExistingExam = async () => {
      if (!editExamId) return;
      setIsLoadingExam(true);
      
      const { data: examData } = await supabase.from('exams').select('*').eq('id', editExamId).single();
      if (examData) {
        setTitle(examData.title);
        setTimeLimit(Math.floor(examData.time_limit / 60));
        setExistingTags(examData.tags || []);
        const gType = examData.tags?.find((t: string) => t.startsWith('grading_type:'))?.split(':')[1] || 'standard';
        setGradingType(gType);
      }

      const { data: eqData } = await supabase
        .from('exam_questions')
        .select('sort_order, exercises(*)')
        .eq('exam_id', editExamId)
        .order('sort_order', { ascending: true });

      if (eqData) {
        const loadedQuestions = eqData.map((eq: any) => eq.exercises).filter(Boolean);
        setParsedData(loadedQuestions);
      }
      setIsLoadingExam(false);
    };
    loadExistingExam();
  }, [editExamId]);

  // PARSE JSON
  useEffect(() => {
    if (editExamId) return; 

    const timerId = setTimeout(() => {
      if (!content.trim()) {
        setParsedData(null);
        setJsonError(false);
        return;
      }
      try {
        const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          let rawJson = jsonMatch[0];
          try {
            const data = JSON.parse(rawJson);
            setParsedData(data);
            setJsonError(false);
          } catch (err1) {
            let fixedJson = rawJson.replace(/\\\\/g, '@@DOUBLE_BACKSLASH@@');
            fixedJson = fixedJson.replace(/\\(?!["/bfnrtu])/g, '\\\\');
            fixedJson = fixedJson.replace(/@@DOUBLE_BACKSLASH@@/g, '\\\\');

            const data = JSON.parse(fixedJson);
            setParsedData(data);
            setJsonError(false);
          }
        } else setJsonError(true);
      } catch (e) { setJsonError(true); }
    }, 500); 

    return () => clearTimeout(timerId);
  }, [content, editExamId]);

  const handleInlineUploadSuccess = (url: string, qIndex: number, field: string, localIndex: number) => {
    if (!parsedData) return;
    const newData = [...parsedData];
    let currentFieldText = newData[qIndex][field] || "";
    let matchCount = 0;
    newData[qIndex][field] = currentFieldText.replace(/CẦN CHÈN ẢNH/g, (match: string) => {
      if (matchCount === localIndex) { matchCount++; return `![Hình minh họa](${url})`; }
      matchCount++; return match;
    });
    setParsedData(newData);
    if (!editExamId) setContent(JSON.stringify(newData, null, 2));
  };

  // Upload trực tiếp khi đang ở Form sửa câu hỏi
  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetEdit) return;
    setIsUploadingEdit(true);
    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      
      const imageUrl = data.secure_url;
      const imgMarkdown = `\n![Hình minh họa](${imageUrl})\n`;
      
      setEditForm((prev: any) => {
        const newData = { ...prev };
        if (uploadTargetEdit.field === 'content') {
          newData.content = (newData.content || '') + imgMarkdown;
        } else if (uploadTargetEdit.field === 'explanation') {
          newData.explanation = (newData.explanation || '') + imgMarkdown;
        } else if (uploadTargetEdit.field === 'option' && uploadTargetEdit.optId) {
          const optIdx = newData.options.findIndex((o:any) => o.id === uploadTargetEdit.optId);
          if (optIdx !== -1) {
              const newOptions = [...newData.options];
              newOptions[optIdx] = { ...newOptions[optIdx], text: (newOptions[optIdx].text || '') + imgMarkdown };
              newData.options = newOptions;
          }
        }
        return newData;
      });
    } catch(err: any) {
      alert("Lỗi tải ảnh: " + err.message);
    } finally {
      setIsUploadingEdit(false);
      setUploadTargetEdit(null);
      if (fileInputEditRef.current) fileInputEditRef.current.value = '';
    }
  };

  const handleCopyPrompt = () => { navigator.clipboard.writeText(AI_PROMPT); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };

  const handleCopyJSON = () => {
    if (!parsedData || parsedData.length === 0) {
      alert("Không có dữ liệu câu hỏi để copy!");
      return;
    }
    const jsonString = JSON.stringify(parsedData, null, 2);
    navigator.clipboard.writeText(jsonString);
    setIsJsonCopied(true);
    setTimeout(() => setIsJsonCopied(false), 2000);
  };

  const handleSaveInlineEdit = async () => {
    if (editingIndex === null || !parsedData) return;
    setIsSavingEdit(true);

    const newData = [...parsedData];
    const updatedQuestion = { ...editForm };

    if (editExamId && updatedQuestion.id) {
      const { error } = await supabase.from('exercises').update({
        content: updatedQuestion.content,
        options: updatedQuestion.options,
        correct_answer: updatedQuestion.type === 'tf' && typeof updatedQuestion.correct_answer === 'object' ? JSON.stringify(updatedQuestion.correct_answer) : updatedQuestion.correct_answer,
        explanation: updatedQuestion.explanation
      }).eq('id', updatedQuestion.id);

      if (error) {
        alert("Lỗi khi lưu câu hỏi lên hệ thống: " + error.message);
        setIsSavingEdit(false);
        return;
      }
    }

    newData[editingIndex] = updatedQuestion;
    setParsedData(newData);
    if (!editExamId) setContent(JSON.stringify(newData, null, 2));
    setEditingIndex(null);
    setIsSavingEdit(false);
  };

  const recalculateScore = (userAnswers: any, gradingType: string) => {
    if (!parsedData || parsedData.length === 0) return 0;

    const getQuestionType = (q: any) => {
      let qType = q.type || 'mcq';
      if (typeof q.correct_answer === 'object' && q.correct_answer !== null) qType = 'tf';
      else if (typeof q.correct_answer === 'string') {
        const cleanCA = q.correct_answer.toLowerCase().trim();
        if (cleanCA.includes('true') || cleanCA.includes('false')) qType = 'tf';
      }
      if (!['mcq', 'tf', 'saq'].includes(qType)) {
        qType = Array.isArray(q.options) && q.options.length > 0 ? 'mcq' : 'saq';
      }
      return qType;
    };

    const isSaqCorrect = (userAns: any, correctAns: any) => {
      const u = String(userAns || '').trim().replace(/,/g, '.').toLowerCase();
      const c = String(correctAns || '').trim().replace(/,/g, '.').toLowerCase();
      return u === c;
    };

    const isMcqCorrect = (userAns: any, correctAns: any) => {
      return String(userAns || '').trim().toLowerCase() === String(correctAns || '').trim().toLowerCase();
    };

    if (gradingType === 'custom') {
      let correctCount = 0;
      parsedData.forEach(q => {
        const userAns = userAnswers[q.id];
        if (userAns == null) return;
        const qType = getQuestionType(q);

        if (qType === 'tf') {
          let correctSubs = 0;
          let correctAns: any = {};
          try {
            correctAns = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer || '{}') : q.correct_answer || {};
          } catch(e) {}
          const options = q.options || [];
          options.forEach((opt: any, idx: number) => {
            const optId = String(opt.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
            if (userAns[optId] === correctAns[optId]) correctSubs++;
          });
          if (correctSubs === 4) correctCount += 1.0;
          else if (correctSubs === 3) correctCount += 0.5;
          else if (correctSubs === 2) correctCount += 0.25;
          else if (correctSubs === 1) correctCount += 0.1;
        } 
        else if (qType === 'saq') {
          if (isSaqCorrect(userAns, q.correct_answer)) correctCount += 1;
        } 
        else {
          if (isMcqCorrect(userAns, q.correct_answer)) correctCount += 1;
        }
      });
      return Number(((correctCount / parsedData.length) * 10).toFixed(2));
    } else {
      const p1 = parsedData.filter(q => getQuestionType(q) === 'mcq');
      const p2 = parsedData.filter(q => getQuestionType(q) === 'tf');
      const p3 = parsedData.filter(q => getQuestionType(q) === 'saq');

      let w1 = p1.length > 0 ? 3.0 : 0;
      let w2 = p2.length > 0 ? 4.0 : 0;
      let w3 = p3.length > 0 ? 3.0 : 0;
      const totalWeight = w1 + w2 + w3;

      const a1 = totalWeight > 0 ? 10.0 * (w1 / totalWeight) : 0;
      const a2 = totalWeight > 0 ? 10.0 * (w2 / totalWeight) : 0;
      const a3 = totalWeight > 0 ? 10.0 * (w3 / totalWeight) : 0;

      const mcqWeight = p1.length > 0 ? a1 / p1.length : 0;
      const tfMaxWeight = p2.length > 0 ? a2 / p2.length : 0;
      const saqWeight = p3.length > 0 ? a3 / p3.length : 0;

      let finalScore = 0;

      parsedData.forEach(q => {
        const userAns = userAnswers[q.id];
        if (userAns == null) return;
        const qType = getQuestionType(q);

        if (qType === 'mcq') {
          if (isMcqCorrect(userAns, q.correct_answer)) finalScore += mcqWeight;
        } 
        else if (qType === 'saq') {
          if (isSaqCorrect(userAns, q.correct_answer)) finalScore += saqWeight;
        } 
        else if (qType === 'tf') {
          let correctSubs = 0;
          let correctAns: any = {};
          try {
            correctAns = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer || '{}') : q.correct_answer || {};
          } catch(e) {}
          const options = q.options || [];
          options.forEach((opt: any, idx: number) => {
            const optId = String(opt.id || ['a', 'b', 'c', 'd'][idx] || idx).toLowerCase().trim();
            if (userAns[optId] === correctAns[optId]) correctSubs++;
          });
          if (correctSubs === 4) finalScore += tfMaxWeight;
          else if (correctSubs === 3) finalScore += tfMaxWeight * 0.5;
          else if (correctSubs === 2) finalScore += tfMaxWeight * 0.25;
          else if (correctSubs === 1) finalScore += tfMaxWeight * 0.1;
        }
      });

      return Number(finalScore.toFixed(2));
    }
  };

  const recalculateAllAttempts = async (examId: string, newGradingType: string) => {
    try {
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId);
      
      if (!attempts || attempts.length === 0) return;

      const { data: logs } = await supabase
        .from('exam_logs')
        .select('*')
        .eq('action', 'SUBMIT_ANSWERS')
        .order('created_at', { ascending: false });

      if (!logs || logs.length === 0) return;

      const updates = attempts.map(async (attempt) => {
        const matchingLog = logs.find(l => {
          try {
            const parsed = JSON.parse(l.description);
            return String(parsed.attempt_id) === String(attempt.id);
          } catch(e) {
            return false;
          }
        });

        if (!matchingLog) return;

        let userAnswers: any = {};
        try {
          userAnswers = JSON.parse(matchingLog.description).answers;
        } catch(e) {
          return;
        }

        const newScore = recalculateScore(userAnswers, newGradingType);

        await supabase
          .from('exam_attempts')
          .update({ score: newScore })
          .eq('id', attempt.id);

        if (matchingLog.session_id) {
          await supabase
            .from('room_members')
            .update({ score: newScore })
            .eq('session_id', matchingLog.session_id)
            .eq('student_id', attempt.user_id);
        }
      });

      await Promise.all(updates);
    } catch(err) {
      console.error("Lỗi khi tính toán lại điểm:", err);
    }
  };

  const handlePublishExam = async () => {
    if (editExamId) {
      setIsSaving(true);
      try {
        const cleanTags = existingTags.filter(t => !t.startsWith('grading_type:'));
        const newTags = [...cleanTags, `grading_type:${gradingType}`];

        const { error: updateError } = await supabase
          .from('exams')
          .update({ tags: newTags })
          .eq('id', editExamId);

        if (updateError) throw updateError;

        await recalculateAllAttempts(editExamId, gradingType);

        alert("Đã cập nhật cách chia điểm và tính toán lại toàn bộ kết quả bài làm của học sinh thành công!");
        navigate('/exam-bank');
      } catch (error: any) {
        alert("Lỗi khi cập nhật cách chia điểm: " + error.message);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!title.trim()) return alert("Vui lòng nhập Tên đề thi!");
    if (!parsedData || parsedData.length === 0) return alert("Dữ liệu đề thi đang trống hoặc JSON không hợp lệ!");
    if (content.includes("CẦN CHÈN ẢNH")) return alert("Vui lòng tải ảnh lên tại tất cả các vị trí 'CẦN CHÈN ẢNH' trước khi lưu!");
    if (editingIndex !== null) return alert("Vui lòng Lưu câu hỏi đang chỉnh sửa trước khi xuất bản!");

    setIsSaving(true);
    try {
      const { data: newExam, error: examError } = await supabase.from('exams').insert({
        teacher_id: currentUser?.id, title: title, type: 'Đề luyện thi',
        time_limit: timeLimit * 60, status: 'active', tags: ['Đề luyện thi', `${parsedData.length} câu`, "Chuẩn 2025", `grading_type:${gradingType}`]
      }).select().single();
      if (examError) throw examError;

      let chapId;
      const { data: existingChap } = await supabase.from('chapters').select('id').eq('title', 'Kho Đề Thi (AI)').maybeSingle();
      if (existingChap) chapId = existingChap.id;
      else { const { data: newChap } = await supabase.from('chapters').insert({ title: 'Kho Đề Thi (AI)', sort_order: 999 }).select().single(); chapId = newChap?.id; }

      const { data: newLesson } = await supabase.from('lessons').insert({ chapter_id: chapId, title: `[Đề thi] ${title}`, sort_order: Date.now() }).select().single();

      const insertPayload = parsedData.map((q: any, index: number) => ({
        lesson_id: newLesson?.id, content: q.content, type: q.type || 'mcq', level: q.level || 'Nhận biết',
        options: q.options || [], correct_answer: q.type === 'tf' && typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : q.correct_answer || 'A', explanation: q.explanation || '', sort_order: index + 1
      }));

      const { data: insertedExs, error: exError } = await supabase.from('exercises').insert(insertPayload).select();
      if (exError) throw exError;

      const eqPayload = insertedExs.map((ex, i) => ({ exam_id: newExam.id, exercise_id: ex.id, sort_order: i + 1 }));
      await supabase.from('exam_questions').insert(eqPayload);

      alert(`Xuất bản thành công Đề thi với ${insertedExs.length} câu hỏi!`);
      navigate('/exam-bank', { state: { activeTab: 'Đề luyện thi' } });

    } catch (error: any) { alert("Lỗi xuất bản: " + error.message); } 
    finally { setIsSaving(false); }
  };

  const renderContentWithUploads = (textContent: string, qIndex: number, fieldName: string) => {
    if (!textContent) return null;
    const parts = textContent.split('CẦN CHÈN ẢNH');
    
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part.trim() && (
          <div className="prose prose-base max-w-none text-[#212529] mb-4 leading-[2.2] overflow-x-auto [&_.katex-display]:my-4">
            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>
              {part}
            </ReactMarkdown>
          </div>
        )}
        {index < parts.length - 1 && <InlineUploadButton onUploadSuccess={(url) => handleInlineUploadSuccess(url, qIndex, fieldName, index)} />}
      </React.Fragment>
    ));
  };

  if (isLoadingExam) {
    return <div className="flex min-h-[calc(100vh-72px)] items-center justify-center text-primary bg-[#f8f9fa]"><Loader2 size={40} className="animate-spin"/></div>
  }

  return (
    <div className="page-container">
      
      {/* Input file ẩn dùng chung cho các nút Upload trong lúc chỉnh sửa */}
      <input type="file" ref={fileInputEditRef} onChange={handleEditImageUpload} accept="image/*" className="hidden" />

      {/* HEADER BAR */}
      <div className="bg-white border-b border-[#dee2e6] px-6 py-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <Link to="/exam-bank" className="p-2 text-[#6c757d] hover:bg-[#e9ecef] rounded-lg transition-colors border border-transparent hover:border-[#dee2e6]">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#f8f9fa] px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-md border border-[#dee2e6] focus-within:border-primary focus-within:ring-2 focus-within:ring-[#e7f1ff] transition-all">
              <FileQuestion size={16} className="text-primary shrink-0"/>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                disabled={!!editExamId} 
                placeholder="Nhập tên Đề thi..." 
                className="bg-transparent border-none outline-none font-bold text-[14px] text-[#212529] w-full disabled:opacity-60"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#f8f9fa] px-3 py-2 rounded-lg border border-[#dee2e6] w-32 shrink-0 focus-within:border-primary transition-all">
              <Clock size={16} className="text-[#fd7e14] shrink-0"/>
              <input 
                type="number" 
                value={timeLimit} 
                onChange={e => setTimeLimit(Number(e.target.value))} 
                disabled={!!editExamId} 
                placeholder="Phút" 
                className="bg-transparent border-none outline-none font-bold text-[14px] text-[#212529] w-full disabled:opacity-60"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#f8f9fa] px-3 py-2 rounded-lg border border-[#dee2e6] w-44 shrink-0 focus-within:border-primary transition-all">
              <span className="text-[11px] text-[#6c757d] font-bold whitespace-nowrap">Chia điểm:</span>
              <select 
                value={gradingType} 
                onChange={e => setGradingType(e.target.value)} 
                className="bg-transparent border-none outline-none font-bold text-[13px] text-[#212529] w-full cursor-pointer"
              >
                <option value="standard">Chuẩn Bộ GD</option>
                <option value="custom">Chia đều câu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleCopyJSON}
            disabled={!parsedData || parsedData.length === 0}
            className={`py-2.5 px-4 text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 ${
              isJsonCopied 
                ? 'bg-[#198754] text-white border-[#198754] font-bold rounded-lg border' 
                : 'btn-outline'
            }`}
          >
            {isJsonCopied ? <Check size={16} /> : <Copy size={16} />}
            {isJsonCopied ? 'Đã Copy JSON' : 'Copy JSON'}
          </button>

          <button 
            onClick={handlePublishExam} 
            disabled={isSaving || (jsonError && !editExamId) || !parsedData} 
            className="btn-primary py-2.5 px-6 rounded-lg text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
            {editExamId ? 'Hoàn tất chỉnh sửa' : 'Xuất bản Đề thi'}
          </button>
        </div>
      </div>

      {/* THANH CÔNG CỤ NHANH (CHỈ HIỆN KHI LÀ ĐỀ MỚI) */}
      {!editExamId && (
        <div className="bg-[#f8f9fa] border-b border-[#dee2e6] px-6 py-3 flex flex-wrap gap-3 items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCopyPrompt} 
              className={`flex items-center gap-2 px-4 py-1.5 text-[12px] uppercase tracking-wider ${
                isCopied 
                  ? 'bg-[#198754] text-white border-[#198754] font-bold rounded border' 
                  : 'btn-outline'
              }`}
            >
              {isCopied ? <><Check size={14}/> Đã Copy Prompt</> : <><Copy size={14}/> Copy Prompt (Hỗ trợ dò đáp án của GV)</>}
            </button>

            {jsonError && content.trim() && (
               <span className="text-[12px] font-bold text-[#dc3545] flex items-center gap-1.5 bg-[#f8d7da] px-3 py-1.5 rounded border border-[#f5c2c7]">
                 <AlertCircle size={14}/> Lỗi cú pháp JSON. Vui lòng kiểm tra lại mã nguồn.
               </span>
            )}
            {!jsonError && parsedData && (
               <span className="text-[12px] font-bold text-[#198754] flex items-center gap-1.5 bg-[#d1e7dd] px-3 py-1.5 rounded border border-[#a3cfbb]">
                 <CheckCircle2 size={14}/> Nhận diện thành công {parsedData.length} câu hỏi.
               </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#6c757d] bg-white border border-[#dee2e6] px-3 py-1.5 rounded">
            <SplitSquareHorizontal size={14} className="text-[#adb5bd]"/> Trái: Code JSON / Phải: Sửa trực tiếp
          </div>
        </div>
      )}

      {/* KHU VỰC LÀM VIỆC CHÍNH */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* CỘT TRÁI: DÁN CODE JSON (ẨN KHI SỬA ĐỀ CŨ) */}
        {!editExamId && (
          <div className="flex-1 border-r border-[#dee2e6] flex flex-col min-h-0 bg-[#212529]">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dán toàn bộ kết quả JSON từ AI vào đây..."
              className="flex-1 w-full p-6 pb-20 bg-transparent text-[#a3cfbb] font-mono text-[13px] leading-relaxed outline-none resize-none custom-scrollbar"
              spellCheck={false}
            />
          </div>
        )}

        {/* CỘT PHẢI: XEM TRƯỚC VÀ CHỈNH SỬA TRỰC QUAN */}
        <div className={`flex-1 bg-[#f8f9fa] overflow-y-auto custom-scrollbar p-4 md:p-8 relative ${editExamId ? 'w-full max-w-5xl mx-auto' : ''}`}>
          {parsedData && parsedData.length > 0 ? (
            <div className="space-y-6">
              {parsedData.map((q: any, i: number) => {
                
                // --- TRẠNG THÁI EDITING (FORM SỬA TRỰC TIẾP) ---
                if (editingIndex === i) {
                  return (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-primary relative animate-in fade-in">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#dee2e6]">
                        <Edit3 size={18} className="text-primary"/>
                        <span className="font-bold text-[14px] text-[#212529] uppercase tracking-wider">Đang sửa Câu {i + 1}</span>
                      </div>

                      <div className="space-y-5">
                        
                        {/* Sửa Nội dung câu hỏi */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider">Nội dung câu hỏi (Markdown + LaTeX)</label>
                            <button 
                              type="button" 
                              onClick={() => { setUploadTargetEdit({field: 'content'}); fileInputEditRef.current?.click(); }} 
                              disabled={isUploadingEdit} 
                              className="btn-outline px-2.5 py-1 text-[11px] flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isUploadingEdit && uploadTargetEdit?.field === 'content' ? <Loader2 size={12} className="animate-spin text-primary"/> : <ImageIcon size={12}/>} Tải ảnh
                            </button>
                          </div>
                          <textarea 
                            value={editForm.content} 
                            onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                            className="w-full p-3 rounded-lg border border-[#dee2e6] bg-[#f8f9fa] outline-none focus:border-primary focus:bg-white min-h-[120px] text-[13px] font-mono leading-relaxed"
                          />
                        </div>

                        {/* Sửa Đáp án MCQ */}
                        {editForm.type === 'mcq' && editForm.options && (
                          <div>
                            <label className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-2 block">Phương án trắc nghiệm (Chọn câu đúng)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {editForm.options.map((opt: any, optIdx: number) => (
                                <div key={opt.id} className={`rounded-lg border overflow-hidden ${editForm.correct_answer === opt.id ? 'border-[#198754] ring-1 ring-[#198754]' : 'border-[#dee2e6]'}`}>
                                  <div className={`text-[12px] font-bold flex justify-between items-center px-3 py-2 border-b ${editForm.correct_answer === opt.id ? 'bg-[#d1e7dd] text-[#0f5132] border-[#a3cfbb]' : 'bg-[#f8f9fa] text-[#495057] border-[#dee2e6]'}`}>
                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                      <input 
                                        type="radio" 
                                        name={`correct_${i}`} 
                                        checked={editForm.correct_answer === opt.id} 
                                        onChange={() => setEditForm({...editForm, correct_answer: opt.id})} 
                                        className="cursor-pointer"
                                      /> 
                                      Đáp án {opt.id}
                                    </label>
                                    <button 
                                      type="button" 
                                      onClick={() => { setUploadTargetEdit({field: 'option', optId: opt.id}); fileInputEditRef.current?.click(); }} 
                                      disabled={isUploadingEdit} 
                                      className="text-[10px] bg-white border border-[#dee2e6] px-2 py-1 rounded flex items-center gap-1 hover:bg-[#e9ecef] transition-colors disabled:opacity-50 shrink-0"
                                    >
                                      <ImageIcon size={12}/> Ảnh
                                    </button>
                                  </div>
                                  <textarea 
                                    value={opt.text}
                                    onChange={(e) => {
                                      const newOpts = [...editForm.options];
                                      newOpts[optIdx].text = e.target.value;
                                      setEditForm({...editForm, options: newOpts});
                                    }}
                                    className="w-full p-3 bg-white outline-none text-[13px] font-mono leading-relaxed"
                                    rows={2}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sửa Đáp án TF */}
                        {editForm.type === 'tf' && editForm.options && (
                          <div className="flex flex-col gap-3">
                            <label className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider block">Chỉnh sửa phương án Đúng/Sai</label>
                            {editForm.options.map((opt: any, optIdx: number) => {
                              const optId = String(opt.id).toLowerCase();
                              const parsedAns = parseTFAnswerForEdit(editForm.correct_answer);
                              const currentVal = parsedAns?.[optId];
                              
                              return (
                                <div key={opt.id} className="border border-[#dee2e6] rounded-lg overflow-hidden bg-white">
                                  <div className="flex items-center justify-between p-2 bg-[#f8f9fa] border-b border-[#dee2e6]">
                                    <span className="font-bold text-[13px] ml-1">Ý {opt.id}:</span>
                                    <div className="flex gap-2 items-center">
                                      <button 
                                        type="button" 
                                        onClick={() => { setUploadTargetEdit({field: 'option', optId: opt.id}); fileInputEditRef.current?.click(); }} 
                                        disabled={isUploadingEdit} 
                                        className="btn-outline px-2 py-1 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50 mr-2"
                                      >
                                        <ImageIcon size={12}/> Ảnh
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const newAns = { ...parsedAns, [optId]: true };
                                          setEditForm({ ...editForm, correct_answer: newAns });
                                        }}
                                        className={`px-4 py-1 rounded text-[12px] font-bold transition-colors border ${currentVal === true ? 'bg-primary text-white border-primary' : 'bg-white text-[#6c757d] border-[#dee2e6] hover:bg-[#f8f9fa]'}`}
                                      >
                                        Đúng
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const newAns = { ...parsedAns, [optId]: false };
                                          setEditForm({ ...editForm, correct_answer: newAns });
                                        }}
                                        className={`px-4 py-1 rounded text-[12px] font-bold transition-colors border ${currentVal === false ? 'bg-[#dc3545] text-white border-[#dc3545]' : 'bg-white text-[#6c757d] border-[#dee2e6] hover:bg-[#f8f9fa]'}`}
                                      >
                                        Sai
                                      </button>
                                    </div>
                                  </div>
                                  <textarea 
                                    value={opt.text}
                                    onChange={(e) => {
                                      const newOpts = [...editForm.options];
                                      newOpts[optIdx].text = e.target.value;
                                      setEditForm({...editForm, options: newOpts});
                                    }}
                                    className="w-full p-3 bg-white outline-none text-[13px] font-mono leading-relaxed"
                                    rows={2}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Sửa Đáp án SAQ */}
                        {editForm.type === 'saq' && (
                          <div>
                            <label className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider block mb-1.5">Đáp án đúng (Điền khuyết)</label>
                            <input 
                              type="text" 
                              value={editForm.correct_answer} 
                              onChange={(e) => setEditForm({...editForm, correct_answer: e.target.value})}
                              className="w-full p-3 rounded-lg border border-[#198754] bg-[#d1e7dd] text-[#0f5132] outline-none font-bold text-[15px]"
                            />
                          </div>
                        )}

                        {/* Sửa Giải chi tiết */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider">Lời giải chi tiết</label>
                            <button 
                              type="button" 
                              onClick={() => { setUploadTargetEdit({field: 'explanation'}); fileInputEditRef.current?.click(); }} 
                              disabled={isUploadingEdit} 
                              className="text-[11px] bg-white border border-[#dee2e6] text-[#495057] px-2.5 py-1 rounded flex items-center gap-1.5 hover:bg-[#f8f9fa] transition-colors disabled:opacity-50"
                            >
                              {isUploadingEdit && uploadTargetEdit?.field === 'explanation' ? <Loader2 size={12} className="animate-spin text-primary"/> : <ImageIcon size={12}/>} Tải ảnh
                            </button>
                          </div>
                          <textarea 
                            value={editForm.explanation} 
                            onChange={(e) => setEditForm({...editForm, explanation: e.target.value})}
                            className="w-full p-3 rounded-lg border border-[#dee2e6] bg-[#f8f9fa] outline-none focus:border-primary focus:bg-white min-h-[100px] text-[13px] font-mono leading-relaxed"
                          />
                        </div>

                        {/* Button Action */}
                        <div className="flex gap-3 pt-4 border-t border-[#e9ecef]">
                          <button 
                            onClick={() => setEditingIndex(null)} 
                            className="flex-1 bg-white border border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057] font-bold py-2.5 rounded-lg transition-colors text-[13px]"
                          >
                            Hủy bỏ
                          </button>
                          <button 
                            onClick={handleSaveInlineEdit} 
                            disabled={isSavingEdit} 
                            className="flex-1 btn-primary py-2.5 rounded-lg flex items-center justify-center gap-2 text-[13px] disabled:opacity-50"
                          >
                            {isSavingEdit ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Lưu thay đổi
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // --- TRẠNG THÁI HIỂN THỊ (VIEW MODE) ---
                let typeLabel = "Trắc nghiệm 4 đáp án";
                let badgeColor = "bg-[#cfe2ff] text-[#084298] border-[#9ec5fe]";
                if (q.type === 'tf') { typeLabel = "Trắc nghiệm Đúng/Sai"; badgeColor = "bg-[#fff3cd] text-[#664d03] border-[#ffecb5]"; }
                if (q.type === 'saq') { typeLabel = "Trả lời ngắn"; badgeColor = "bg-[#e2e3e5] text-[#41464b] border-[#d3d6d8]"; }

                return (
                  <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-[#dee2e6] hover:border-[#b6d4fe] transition-colors group relative">
                    
                    <button 
                      onClick={() => { setEditingIndex(i); setEditForm(JSON.parse(JSON.stringify(q))); }} 
                      className="absolute top-5 right-5 bg-white border border-[#dee2e6] text-[#6c757d] hover:bg-[#e7f1ff] hover:text-primary hover:border-[#b6d4fe] px-3 py-1.5 rounded text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Edit3 size={14}/> Sửa câu
                    </button>

                    <div className="flex flex-wrap items-center gap-2 mb-5 pb-4 border-b border-[#e9ecef] pr-28">
                      <span className="badge-primary">Câu {i + 1}</span>
                      <span className="text-[11px] font-bold text-[#6c757d] uppercase bg-[#f8f9fa] border border-[#dee2e6] px-2 py-1 rounded">
                        {q.level}
                      </span>
                      <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded border ${badgeColor}`}>
                        {typeLabel}
                      </span>
                    </div>

                    {renderContentWithUploads(q.content, i, 'content')}

                    {/* HIỂN THỊ ĐÁP ÁN MCQ */}
                    {q.type === 'mcq' && q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {q.options.map((opt: any) => (
                          <div key={opt.id} className={`p-4 rounded-xl border flex items-start gap-3 ${opt.id === q.correct_answer ? 'border-[#198754] bg-[#d1e7dd]' : 'border-[#dee2e6] bg-[#f8f9fa]'}`}>
                            <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center text-[12px] font-bold font-ui ${opt.id === q.correct_answer ? 'bg-[#198754] text-white' : 'bg-[#e9ecef] text-[#6c757d]'}`}>{opt.id}</div>
                            <div className={`prose prose-sm max-w-none flex-1 overflow-x-auto leading-[1.8] m-0 ${opt.id === q.correct_answer ? 'text-[#0f5132]' : 'text-[#212529]'}`}>
                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* HIỂN THỊ ĐÁP ÁN TF */}
                    {q.type === 'tf' && q.options && (
                      <div className="flex flex-col gap-3 mb-6">
                        {q.options.map((opt: any, idx: number) => {
                          const rawOptId = opt.id || ['a', 'b', 'c', 'd'][idx] || String(idx);
                          const optId = String(rawOptId).toLowerCase().trim();
                          const parsedCorrect = parseTFAnswerForEdit(q.correct_answer);
                          const isTrue = parsedCorrect[optId] === true;

                          return (
                            <div key={opt.id} className={`p-4 rounded-xl border flex items-start gap-3 ${isTrue ? 'border-[#198754] bg-[#d1e7dd]' : 'border-[#dee2e6] bg-[#f8f9fa]'}`}>
                              <div className={`w-6 h-6 shrink-0 rounded flex items-center justify-center text-[12px] font-bold font-ui ${isTrue ? 'bg-[#198754] text-white' : 'bg-[#e9ecef] text-[#6c757d]'}`}>{optId}</div>
                              <div className={`prose prose-sm max-w-none flex-1 overflow-x-auto leading-[1.8] m-0 ${isTrue ? 'text-[#0f5132]' : 'text-[#212529]'}`}>
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown>
                              </div>
                              <div className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${isTrue ? 'bg-white text-[#198754] border-[#a3cfbb]' : 'bg-white text-[#6c757d] border-[#dee2e6]'}`}>
                                {isTrue ? 'Đúng' : 'Sai'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* HIỂN THỊ ĐÁP ÁN SAQ */}
                    {q.type === 'saq' && (
                      <div className="mb-6 p-4 bg-white border border-[#dee2e6] rounded-xl flex items-center gap-3">
                        <div className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider">Đáp án đúng:</div>
                        <div className="font-bold text-[#198754] text-[18px]">
                          {q.correct_answer}
                        </div>
                      </div>
                    )}

                    {/* LỜI GIẢI CHI TIẾT */}
                    {q.explanation && (
                      <div className="p-5 bg-[#fff3cd] rounded-xl border border-[#ffecb5]">
                        <div className="flex items-center gap-2 mb-3 text-[#997404] font-bold text-[13px] uppercase tracking-wider font-heading">
                          <BrainCircuit size={16} /> Lời giải chi tiết
                        </div>
                        <div className="prose prose-sm max-w-none text-[#664d03] leading-[2] overflow-x-auto">
                           {renderContentWithUploads(q.explanation, i, 'explanation')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#adb5bd]">
              <Database size={64} className="mb-4 opacity-50" />
              <p className="font-bold text-[16px] text-[#495057] mb-2 font-heading">Không có dữ liệu câu hỏi</p>
              <p className="text-[13px] max-w-md text-center leading-relaxed">
                Nếu đang tạo đề mới, hãy dán mã JSON từ AI vào cột bên trái.<br/>
                Nếu đang sửa đề cũ, có vẻ đề này chưa có nội dung.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamEditor;