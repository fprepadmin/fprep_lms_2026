import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Database, Target, CheckSquare, Trash2, Loader2, 
  ChevronRight, PlusCircle, Sparkles, RefreshCcw, FileCode2, X, Copy, 
  Check, LayoutTemplate, Settings 
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
   - ĐƯỢC PHÉP dùng LaTeX để vẽ Bảng biến thiên, Bảng xét dấu. LƯU Ý TỐI QUAN TRỌNG: Bạn PHẢI escape dấu gạch chéo ngược (VD: viết \\\\sqrt thay vì \\sqrt, \\\\begin thay vì \\begin).
   - TUYỆT ĐỐI KHÔNG SỬ DỤNG \\( VÀ \\) ĐỂ BỌC CÔNG THỨC TOÁN. BẮT BUỘC PHẢI DÙNG DẤU $ CHO CÔNG THỨC NGẮN VÀ $$ CHO KHỐI CÔNG THỨC. (Ví dụ ĐÚNG: $y = x^2$, $\\frac{1}{2}$. Ví dụ SAI: \\( y = x^2 \\))
   - NẾU CÓ BẢNG BIỂU: Phải dùng định dạng Markdown Table chuẩn và BẮT BUỘC dùng \\n để xuống dòng giữa các hàng. (VD: | Cột 1 | Cột 2 |\\n|---|---|\\n| A | B |). Tuyệt đối không viết liền bảng trên 1 dòng.
2. CHÈN ẢNH: Nếu câu hỏi có hình minh họa/đồ thị, BẮT BUỘC chèn đúng cụm từ "CẦN CHÈN ẢNH" vào vị trí đó.

CẤU TRÚC JSON CHUẨN 2025:
1. Trắc nghiệm 4 đáp án (type: "mcq")
{ "type": "mcq", "level": "Nhận biết", "content": "Nội dung...", "image_url": null, "options": [ {"id": "A", "text": "..."} ], "correct_answer": "A", "explanation": "..." }

2. Trắc nghiệm Đúng/Sai (type: "tf")
{ "type": "tf", "level": "Thông hiểu", "content": "Nội dung...", "image_url": null, "options": [ {"id": "a", "text": "..."} ], "correct_answer": { "a": true, "b": false, "c": true, "d": false }, "explanation": "..." }

3. Trả lời ngắn (type: "saq")
{ "type": "saq", "level": "Vận dụng", "content": "Nội dung...", "image_url": null, "options": [], "correct_answer": "12.5", "explanation": "..." }

TRẢ VỀ DUY NHẤT MẢNG JSON BẮT ĐẦU BẰNG [ VÀ KẾT THÚC BẰNG ].
ĐỀ THI:
[DÁN ĐỀ THI VÀO ĐÂY]`;

const TABS = ['Đề theo bài', 'Chuyên đề', 'Đề luyện thi', 'ĐGNL', 'VSAT'];

const ExamCreator = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [chapters, setChapters] = useState<any[]>([]);
  const [expandedChapterId, setExpandedChapterId] = useState<string>("");
  const [expandedLessonId, setExpandedLessonId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // States Đề thi đang tạo
  const [examConfig, setExamConfig] = useState({
    title: '',
    type: 'Đề theo bài', 
    timeLimit: 15,
    groupName: '',
    gradingType: 'standard'
  });
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // States Modal JSON
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const fetchBank = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('chapters').select(`id, title, sort_order, lessons (id, title, sort_order, exercises (id, content, options, correct_answer, level, type))`).order('sort_order', { ascending: true });
      if (data) setChapters(data);
      setIsLoading(false);
    };
    fetchBank();
  }, []);

  const toggleQuestion = (question: any) => {
    const isExists = selectedQuestions.find(q => q.id === question.id);
    if (isExists) setSelectedQuestions(prev => prev.filter(q => q.id !== question.id));
    else setSelectedQuestions(prev => [...prev, question]);
  };
  const removeQuestion = (questionId: string) => setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));

  const handleAutoGenerate = () => {
    const numStr = window.prompt("Nhập số lượng câu hỏi bạn muốn tạo (VD: 40, 50):", "50");
    if (!numStr) return;
    const num = parseInt(numStr);
    if (isNaN(num) || num <= 0) return alert("Số lượng không hợp lệ!");

    let allQuestions: any[] = [];
    chapters.forEach(chap => chap.lessons?.forEach((les: any) => { if (les.exercises && les.exercises.length > 0) allQuestions = [...allQuestions, ...les.exercises]; }));
    
    if (allQuestions.length < num) return alert(`Kho dữ liệu của bạn hiện chỉ có ${allQuestions.length} câu. Không đủ sinh ${num} câu!`);

    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    setSelectedQuestions(shuffled.slice(0, num));
    setExamConfig(prev => ({ ...prev, type: 'Đề luyện thi', timeLimit: num >= 40 ? 90 : 45 }));
    alert(`Tự động sinh thành công ${num} câu hỏi! Hệ thống đã chuyển cấu hình sang Đề luyện thi.`);
  };

  const handleSaveExam = async () => {
    if (!examConfig.title.trim()) return alert("Vui lòng nhập Tên đề thi!");
    if (selectedQuestions.length === 0) return alert("Vui lòng chọn ít nhất 1 câu hỏi vào đề!");
    
    setIsSaving(true);
    try {
      const { data: newExam, error: examError } = await supabase.from('exams').insert({
        teacher_id: currentUser?.id, 
        title: examConfig.title, 
        type: examConfig.type,
        time_limit: examConfig.timeLimit * 60, 
        status: 'active', 
        group_name: examConfig.groupName,
        tags: [examConfig.type, `${selectedQuestions.length} câu`, `grading_type:${examConfig.gradingType}`]
      }).select().single();
      if (examError) throw examError;

      const examQuestionsData = selectedQuestions.map((q, index) => ({ exam_id: newExam.id, exercise_id: q.id, sort_order: index + 1 }));
      const { error: eqError } = await supabase.from('exam_questions').insert(examQuestionsData);
      if (eqError) throw eqError;

      alert("Lưu Đề thi thành công!");
      navigate('/exam-bank', { state: { activeTab: examConfig.type } }); 
    } catch (error: any) { alert("Lỗi khi lưu đề: " + error.message); } finally { setIsSaving(false); }
  };

  const handleCopyPrompt = () => { navigator.clipboard.writeText(AI_PROMPT); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); };
  
  const handleImportExamJson = async () => {
    if (!examConfig.title.trim()) return alert("Vui lòng đặt Tên đề thi trước khi Xuất bản!");
    if (!jsonInput.trim()) return alert("Vui lòng dán kết quả JSON từ AI vào!");
    setIsSaving(true);

    try {
      const jsonMatch = jsonInput.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) throw new Error("JSON không hợp lệ.");
      const parsedQuestions = JSON.parse(jsonMatch[0]);

      const { data: newExam, error: examError } = await supabase.from('exams').insert({
        teacher_id: currentUser?.id, 
        title: examConfig.title, 
        type: examConfig.type,
        time_limit: examConfig.timeLimit * 60, 
        status: 'active', 
        group_name: examConfig.groupName, 
        tags: [examConfig.type, `${parsedQuestions.length} câu`, "Chuẩn 2025", `grading_type:${examConfig.gradingType}`]
      }).select().single();
      if (examError) throw examError;

      let chapId;
      const { data: existingChap } = await supabase.from('chapters').select('id').eq('title', 'Kho Đề Thi (AI)').maybeSingle();
      if (existingChap) chapId = existingChap.id;
      else { const { data: newChap } = await supabase.from('chapters').insert({ title: 'Kho Đề Thi (AI)', sort_order: 999 }).select().single(); chapId = newChap?.id; }

      const { data: newLesson } = await supabase.from('lessons').insert({ chapter_id: chapId, title: `[Câu hỏi] ${examConfig.title}`, sort_order: Date.now() }).select().single();

      const insertPayload = parsedQuestions.map((q: any, index: number) => ({
        lesson_id: newLesson?.id, content: q.content, type: q.type || 'mcq', level: q.level || 'Nhận biết',
        options: q.options || [], correct_answer: q.correct_answer, explanation: q.explanation || '', 
        image_url: q.image_url || null, sort_order: index + 1
      }));

      const { data: insertedExs, error: exError } = await supabase.from('exercises').insert(insertPayload).select();
      if (exError) throw exError;

      const eqPayload = insertedExs.map((ex, i) => ({ exam_id: newExam.id, exercise_id: ex.id, sort_order: i + 1 }));
      await supabase.from('exam_questions').insert(eqPayload);

      alert(`Tuyệt vời! Đã xuất bản thành công Đề thi với ${insertedExs.length} câu.`);
      setShowJsonModal(false); 
      navigate('/exam-bank', { state: { activeTab: examConfig.type } });
    } catch (error: any) { alert("Lỗi: " + error.message); } finally { setIsSaving(false); }
  };

  const MarkdownComponents = {
    img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded border border-[#dee2e6] my-4 block shadow-sm" alt={props.alt || "Ảnh"} loading="lazy" />,
    table: ({ node, ...props }: any) => <div className="w-full overflow-x-auto my-6 rounded-lg border border-[#dee2e6] shadow-sm bg-white"><table className="w-full text-center border-collapse text-[14px]" {...props} /></div>,
    thead: ({ node, ...props }: any) => <thead className="bg-[#f8f9fa] border-b-2 border-[#dee2e6] text-[#212529]" {...props} />,
    tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-[#dee2e6]" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="transition-colors hover:bg-[#f8f9fa]/50" {...props} />,
    th: ({ node, ...props }: any) => <th className="p-2 border-r border-[#dee2e6] last:border-r-0 font-bold whitespace-nowrap align-middle" {...props} />,
    td: ({ node, ...props }: any) => <td className="p-2 border-r border-[#dee2e6] last:border-r-0 align-middle first:font-bold first:bg-[#f8f9fa] first:border-r-2" {...props} />,
  };

  return (
    <div className="page-container relative animate-in fade-in">
      <div className="page-content custom-scrollbar">
        <div className="max-w-screen-2xl mx-auto w-full">
          
          {/* HEADER TRANG */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Link to="/exam-bank" className="inline-flex items-center gap-2 text-[#6c757d] hover:text-[#212529] font-medium transition-colors text-[14px]">
              <ArrowLeft size={16} /> Về Ngân hàng Đề
            </Link>
            <button 
              onClick={() => setShowJsonModal(true)} 
              className="btn-primary px-5 py-2.5 flex items-center justify-center gap-2 text-[13px]"
            >
              <FileCode2 size={16} /> Nhập đề AI (JSON)
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[70vh]">
            
            {/* ==========================================
                CỘT TRÁI: KHO CÂU HỎI TỪ CƠ SỞ DỮ LIỆU
                ========================================== */}
            <div className="w-full lg:w-1/2 shrink-0 flex flex-col">
              <div className="bg-white rounded-xl border border-[#dee2e6] shadow-sm p-5 h-full flex flex-col max-h-[80vh]">
                
                <div className="flex items-center justify-between mb-4 border-b border-[#dee2e6] pb-4">
                  <div className="flex items-center gap-2 text-[#212529]">
                    <Database className="text-primary" size={20} />
                    <h3 className="font-bold text-[16px] font-heading m-0 uppercase tracking-wider">Kho Câu hỏi</h3>
                  </div>
                  <button 
                    onClick={handleAutoGenerate} 
                    className="btn-outline px-3 py-1.5 text-[12px] flex items-center gap-1.5"
                  >
                    <Sparkles size={14} /> Trộn tự động
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {isLoading ? ( 
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={24}/></div>
                  ) : chapters.length === 0 ? ( 
                    <div className="text-center p-8 text-[13px] font-medium text-[#adb5bd] border border-dashed border-[#dee2e6] rounded-xl bg-[#f8f9fa]">
                      Kho dữ liệu trống. Hãy tạo câu hỏi trong Lý Thuyết trước.
                    </div>
                  ) : chapters.map(chapter => (
                    <div key={chapter.id} className="border border-[#dee2e6] rounded-lg overflow-hidden bg-white">
                      
                      {/* Tiêu đề Chương */}
                      <button 
                        onClick={() => setExpandedChapterId(expandedChapterId === chapter.id ? "" : chapter.id)} 
                        className="w-full flex items-center justify-between p-3 bg-[#f8f9fa] hover:bg-[#e9ecef] transition-colors border-b border-[#dee2e6]"
                      >
                        <span className="font-bold text-[14px] text-[#212529] text-left truncate">{chapter.title}</span>
                        <ChevronRight size={16} className={`transform transition-transform text-[#adb5bd] shrink-0 ${expandedChapterId === chapter.id ? 'rotate-90' : ''}`} />
                      </button>
                      
                      {/* Nội dung Chương (Danh sách Bài học) */}
                      {expandedChapterId === chapter.id && (
                        <div className="divide-y divide-[#e9ecef] bg-white">
                          {chapter.lessons.map((lesson: any) => (
                            <div key={lesson.id}>
                              
                              {/* Tiêu đề Bài học */}
                              <button 
                                onClick={() => setExpandedLessonId(expandedLessonId === lesson.id ? "" : lesson.id)} 
                                className="w-full flex items-center justify-between p-3 pl-6 hover:bg-[#f8f9fa] transition-colors"
                              >
                                <span className="font-medium text-[13px] text-[#495057] text-left truncate">{lesson.title}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-bold bg-[#e7f1ff] text-primary px-1.5 py-0.5 rounded border border-[#b6d4fe]">{lesson.exercises?.length || 0} câu</span>
                                  <ChevronRight size={14} className={`text-[#adb5bd] transition-transform ${expandedLessonId === lesson.id ? 'rotate-90' : ''}`} />
                                </div>
                              </button>
                              
                              {/* Nội dung Bài học (Danh sách Câu hỏi) */}
                              {expandedLessonId === lesson.id && (
                                <div className="bg-[#f8f9fa] p-2 space-y-2 border-t border-[#e9ecef]">
                                  {lesson.exercises?.map((q: any) => {
                                    const isSelected = selectedQuestions.some(sq => sq.id === q.id);
                                    return (
                                      <div 
                                        key={q.id} 
                                        onClick={() => toggleQuestion(q)} 
                                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-[#198754] bg-[#d1e7dd]' : 'border-[#dee2e6] bg-white hover:border-primary'}`}
                                      >
                                        <div className="flex gap-3">
                                          <div className="mt-0.5 shrink-0">
                                            {isSelected ? <CheckSquare size={16} className="text-[#198754]"/> : <div className="w-4 h-4 rounded-[3px] border border-[#adb5bd] bg-white"></div>}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex gap-2 mb-1">
                                              <span className="text-[10px] bg-[#e9ecef] text-[#495057] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{q.level}</span>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-[#212529] text-[13px] line-clamp-2 m-0 leading-relaxed [&_.katex-display]:my-1">
                                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{q.content}</ReactMarkdown>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ==========================================
                CỘT PHẢI: CẤU HÌNH ĐỀ & GIỎ HÀNG
                ========================================== */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6 h-full">
              
              {/* Box 1: Cấu hình */}
              <div className="bg-white rounded-xl border border-[#dee2e6] shadow-sm p-6 shrink-0">
                <h3 className="text-[16px] font-bold text-[#212529] font-heading mb-4 flex items-center gap-2 border-b border-[#dee2e6] pb-3 uppercase tracking-wider">
                  <Target size={18} className="text-[#fd7e14]"/> Thiết lập Đề thi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Tên đề thi</label>
                    <input 
                      type="text" 
                      value={examConfig.title} 
                      onChange={e => setExamConfig({...examConfig, title: e.target.value})} 
                      className="w-full px-3 py-2 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529]" 
                      placeholder="VD: Đề thi thử Toán THPT QG 2025"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Bộ đề / Nhóm đề (Tùy chọn)</label>
                    <input 
                      type="text" 
                      value={examConfig.groupName} 
                      onChange={e => setExamConfig({...examConfig, groupName: e.target.value})} 
                      className="w-full px-3 py-2 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529]" 
                      placeholder="VD: Bộ đề thi thử Sở Hà Nội"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Phân loại</label>
                    <select 
                      value={examConfig.type} 
                      onChange={e => setExamConfig({...examConfig, type: e.target.value})} 
                      className="w-full px-3 py-2 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529] bg-white"
                    >
                      {TABS.map(tab => (
                        <option key={tab} value={tab}>{tab}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Thời gian làm bài (Phút)</label>
                    <input 
                      type="number" 
                      value={examConfig.timeLimit} 
                      onChange={e => setExamConfig({...examConfig, timeLimit: Number(e.target.value)})} 
                      className="w-full px-3 py-2 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Cách chia điểm</label>
                    <select 
                      value={examConfig.gradingType} 
                      onChange={e => setExamConfig({...examConfig, gradingType: e.target.value})} 
                      className="w-full px-3 py-2 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529] bg-white"
                    >
                      <option value="standard">Đề thi chuẩn (Định mức câu hỏi theo cấu trúc Bộ)</option>
                      <option value="custom">Đề thi tuỳ chỉnh (Chia điểm đều cho tất cả câu)</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleSaveExam} 
                  disabled={isSaving} 
                  className="btn-primary w-full py-2.5 text-[14px] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
                  {isSaving ? 'Đang khởi tạo...' : 'LƯU ĐỀ THI TỪ GIỎ HÀNG'}
                </button>
              </div>

              {/* Box 2: Giỏ hàng */}
              <div className="bg-white rounded-xl border border-[#dee2e6] shadow-sm p-6 flex flex-col flex-1 min-h-[300px] overflow-hidden max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 border-b border-[#dee2e6] pb-3 shrink-0">
                  <h3 className="font-bold text-[#212529] text-[14px] uppercase tracking-wider font-heading m-0">Giỏ hàng câu hỏi</h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedQuestions([])} 
                      className="text-[12px] font-bold text-[#adb5bd] hover:text-[#dc3545] transition-colors flex items-center gap-1"
                    >
                      <RefreshCcw size={12}/> Làm trống
                    </button>
                    <div className="font-bold text-[14px] text-primary bg-[#e7f1ff] border border-[#b6d4fe] px-2 py-0.5 rounded font-ui">
                      {selectedQuestions.length} câu
                    </div>
                  </div>
                </div>

                {selectedQuestions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-[#adb5bd] border-2 border-dashed border-[#dee2e6] rounded-xl p-6 bg-[#f8f9fa]">
                    <PlusCircle size={32} className="mb-2 opacity-50"/>
                    <p className="font-medium text-center text-[13px] m-0">Hãy tick chọn câu hỏi ở kho bên trái,<br/>hoặc dùng chức năng Nhập đề AI.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                    {selectedQuestions.map((q, i) => (
                      <div key={q.id} className="p-3 rounded-lg border border-[#dee2e6] bg-white flex gap-3 group hover:border-[#b6d4fe] transition-colors">
                        <div className="w-6 h-6 rounded bg-[#f8f9fa] border border-[#dee2e6] text-[#6c757d] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                           <div className="prose prose-sm max-w-none text-[13px] text-[#212529] mb-0 leading-relaxed [&_.katex-display]:my-1">
                             <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{q.content}</ReactMarkdown>
                           </div>
                        </div>
                        <button 
                          onClick={() => removeQuestion(q.id)} 
                          className="text-[#adb5bd] hover:text-[#dc3545] opacity-0 group-hover:opacity-100 transition-opacity p-1 h-fit shrink-0"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL NHẬP JSON AI (FULL MÀN HÌNH MỚI)
          ========================================== */}
      {showJsonModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 lg:p-8 animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[95vh] lg:h-[90vh] flex flex-col rounded-xl overflow-hidden shadow-bs-hover border border-[#dee2e6]">
            
            <div className="px-6 py-4 border-b border-[#dee2e6] flex justify-between items-center bg-[#f8f9fa] shrink-0">
              <div>
                <h3 className="text-[20px] font-bold font-heading text-[#212529] m-0">Công cụ nạp đề thi tự động (AI JSON)</h3>
                <p className="text-[13px] font-medium text-[#6c757d] m-0 mt-1">Cấu hình thông tin Đề thi và dán mã JSON vào bên dưới.</p>
              </div>
              <button onClick={() => setShowJsonModal(false)} className="p-1.5 bg-white border border-[#dee2e6] hover:bg-[#e9ecef] rounded-lg text-[#6c757d] transition-colors"><X size={18}/></button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
              
              {/* CỘT TRÁI: CẤU HÌNH & PROMPT */}
              <div className="w-full lg:w-[45%] p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-[#dee2e6] bg-white overflow-y-auto custom-scrollbar">
                
                <label className="text-[13px] font-bold uppercase tracking-wider text-[#fd7e14] flex items-center gap-2 mb-4 border-b border-[#e9ecef] pb-2">
                  <Settings size={16}/> Bước 1: Thông tin Đề thi
                </label>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="col-span-2">
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Tên đề thi</label>
                    <input 
                      type="text" 
                      value={examConfig.title} 
                      onChange={e => setExamConfig({...examConfig, title: e.target.value})} 
                      className="w-full px-3 py-2.5 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529]" 
                      placeholder="VD: Đề thi thử khảo thí nội bộ 2026"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Bộ đề / Nhóm đề (Tùy chọn)</label>
                    <input 
                      type="text" 
                      value={examConfig.groupName} 
                      onChange={e => setExamConfig({...examConfig, groupName: e.target.value})} 
                      className="w-full px-3 py-2.5 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529]" 
                      placeholder="VD: Đề thi thử các Sở 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Loại đề</label>
                    <select 
                      value={examConfig.type} 
                      onChange={e => setExamConfig({...examConfig, type: e.target.value})} 
                      className="w-full px-3 py-2.5 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529] bg-white"
                    >
                      {TABS.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Thời gian (Phút)</label>
                    <input 
                      type="number" 
                      value={examConfig.timeLimit} 
                      onChange={e => setExamConfig({...examConfig, timeLimit: Number(e.target.value)})} 
                      className="w-full px-3 py-2.5 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Cách chia điểm</label>
                    <select 
                      value={examConfig.gradingType} 
                      onChange={e => setExamConfig({...examConfig, gradingType: e.target.value})} 
                      className="w-full px-3 py-2.5 rounded border border-[#dee2e6] focus:outline-none focus:border-primary text-[14px] font-bold text-[#212529] bg-white"
                    >
                      <option value="standard">Đề thi chuẩn (Định mức câu hỏi theo cấu trúc Bộ)</option>
                      <option value="custom">Đề thi tuỳ chỉnh (Chia điểm đều cho tất cả câu)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-3 border-b border-[#e9ecef] pb-2">
                  <label className="text-[13px] font-bold uppercase tracking-wider text-[#6f42c1] flex items-center gap-2">
                    <LayoutTemplate size={16}/> Bước 2: Prompt tạo JSON
                  </label>
                  <button 
                    onClick={handleCopyPrompt} 
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      isCopied 
                        ? 'bg-[#198754] text-white border-[#198754]' 
                        : 'bg-[#f8f9fa] text-[#495057] border-[#dee2e6] hover:bg-[#e9ecef]'
                    }`}
                  >
                    {isCopied ? <><Check size={14}/> Đã Copy</> : <><Copy size={14}/> Copy Prompt</>}
                  </button>
                </div>
                
                <div className="flex-1 bg-[#f8f9fa] p-4 rounded border border-[#dee2e6] font-mono text-[12px] leading-[1.6] text-[#495057] select-all overflow-y-auto custom-scrollbar min-h-[150px]">
                  {AI_PROMPT.split('\n').map((line, i) => <div key={i}>{line || <br/>}</div>)}
                </div>
              </div>

              {/* CỘT PHẢI: KẾT QUẢ JSON */}
              <div className="w-full lg:w-[55%] p-6 flex flex-col bg-[#212529]">
                <label className="text-[13px] font-bold uppercase tracking-wider text-[#6ea8fe] flex items-center gap-2 mb-3">
                  <Database size={16}/> Bước 3: Dán kết quả JSON vào đây
                </label>
                <textarea 
                  value={jsonInput} 
                  onChange={e => setJsonInput(e.target.value)} 
                  className="flex-1 w-full p-4 rounded border border-[#495057] bg-[#343a40] text-[#a3cfbb] font-mono text-[13px] leading-relaxed outline-none focus:border-[#6ea8fe] resize-none custom-scrollbar" 
                  placeholder="[{...}, {...}]"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-4 border-t border-[#dee2e6] bg-[#f8f9fa] flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowJsonModal(false)} 
                className="px-6 py-2 bg-white border border-[#dee2e6] hover:bg-[#e9ecef] text-[#495057] font-bold rounded transition-colors text-[14px]"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleImportExamJson} 
                disabled={isSaving} 
                className="btn-primary px-8 py-2 rounded text-[14px] flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} XUẤT BẢN ĐỀ THI TỪ JSON
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ExamCreator;