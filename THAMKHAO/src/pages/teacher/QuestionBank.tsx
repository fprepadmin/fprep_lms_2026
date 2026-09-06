import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, PlusCircle, ChevronDown, ChevronRight, FileText, 
  Database, FileJson, Plus, Loader2, Save, AlertTriangle, X, 
  LayoutList, Trash2, CheckCircle2, Edit3, Image as ImageIcon, 
  Maximize, Minimize, Copy, Check, BrainCircuit
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm'; 
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';

const QuestionBank = () => {
  const { currentUser } = useAppStore();
  
  // States cho Dữ liệu
  const [chapters, setChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'theory' | 'practice'>('practice'); 
  const [exercises, setExercises] = useState<any[]>([]);
  const [isFetchingEx, setIsFetchingEx] = useState(false);

  // States cho Lý thuyết (Theory)
  const [theoryInput, setTheoryInput] = useState("");
  const [isEditingTheory, setIsEditingTheory] = useState(false);
  const [isSavingTheory, setIsSavingTheory] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // States Upload Ảnh Theory
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const theoryFileInputRef = useRef<HTMLInputElement>(null);

  // States Upload Ảnh Bài tập (Question)
  const [isUploadingQuestionImg, setIsUploadingQuestionImg] = useState(false);
  const questionFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ id: string, field: 'content' | 'explanation' | 'option', optId?: string } | null>(null);

  // States cho Modal Nhập JSON
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Hàm tạo Chương mới
  const handleCreateChapter = async () => {
    const title = window.prompt("Nhập tên Chương học mới (ví dụ: Chương 4: Nguyên hàm và Tích phân):");
    if (!title || !title.trim()) return;

    try {
      const { data, error } = await supabase
        .from('chapters')
        .insert({ title: title.trim() })
        .select('*')
        .single();

      if (error) throw error;

      alert(`Đã tạo thành công Chương: "${data.title}"`);
      fetchCurriculum();
    } catch (err: any) {
      alert("Lỗi tạo Chương mới: " + err.message);
    }
  };

  // Hàm tạo Bài học mới trong Chương đang chọn
  const handleCreateLesson = async (chapterId: string) => {
    const title = window.prompt("Nhập tên Bài học mới (ví dụ: Bài 1: Nguyên hàm cơ bản):");
    if (!title || !title.trim()) return;

    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert({ 
          chapter_id: chapterId,
          title: title.trim(),
          theory_content: "### Nội dung bài giảng đang được soạn thảo...\n\nNhấn 'Sửa bài giảng' để bắt đầu soạn thảo nội dung."
        })
        .select('*')
        .single();

      if (error) throw error;

      alert(`Đã thêm thành công Bài học: "${data.title}"`);
      await fetchCurriculum();
      handleSelectLesson(data);
    } catch (err: any) {
      alert("Lỗi tạo Bài học mới: " + err.message);
    }
  };

  // ==========================================
  // FETCH DATA VÀ SẮP XẾP
  // ==========================================
  const fetchCurriculum = async () => {
    setIsLoading(true);
    const { data: chaptersData } = await supabase
      .from('chapters')
      .select('*, lessons(*)')
      .order('created_at', { ascending: true });
      
    if (chaptersData) {
      const sortedChapters = chaptersData.map(chapter => {
        if (chapter.lessons && chapter.lessons.length > 0) {
          chapter.lessons.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        return chapter;
      });

      setChapters(sortedChapters);
      
      if (sortedChapters.length > 0 && !activeChapterId) {
        setActiveChapterId(sortedChapters[0].id);
        if (sortedChapters[0].lessons?.length > 0 && !activeLesson) {
          handleSelectLesson(sortedChapters[0].lessons[0]);
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchCurriculum(); }, []);

  const fetchExercises = async (lessonId: string) => {
    setIsFetchingEx(true);
    const { data } = await supabase.from('exercises').select('*').eq('lesson_id', lessonId).order('created_at', { ascending: true });
    if (data) setExercises(data);
    setIsFetchingEx(false);
  };

  const handleSelectLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setTheoryInput(lesson.theory_content || "");
    setIsEditingTheory(false);
    setIsFullScreen(false);
    fetchExercises(lesson.id);
  };

  // ==========================================
  // HÀM UPLOAD ẢNH CHUNG CLOUDINARY
  // ==========================================
  const uploadToCloudinary = async (file: File): Promise<string> => {
    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) throw new Error("Chưa cấu hình Cloudinary.");

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Tải ảnh thất bại.");
      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.warn("Lỗi upload Cloudinary, dùng Base64.", err);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
      });
    }
  };

  // ==========================================
  // UPLOAD ẢNH CHO THEORY
  // ==========================================
  const handleTheoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImg(true);
    
    const imageUrl = await uploadToCloudinary(file);
    const imgMarkdown = `\n![Ảnh minh hoạ](${imageUrl})\n`;
    
    if (theoryInput.includes('[CẦN CHÈN ẢNH]')) {
      setTheoryInput(prev => prev.replace('[CẦN CHÈN ẢNH]', imgMarkdown));
    } else {
      setTheoryInput(prev => prev + imgMarkdown);
    }
    
    setIsUploadingImg(false);
    if (e.target) e.target.value = '';
  };

  // ==========================================
  // UPLOAD ẢNH CHO BÀI TẬP (QUESTION)
  // ==========================================
  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    setIsUploadingQuestionImg(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      const imgMarkdown = `\n![Ảnh minh hoạ](${imageUrl})\n`;

      const qIndex = exercises.findIndex(q => q.id === uploadTarget.id);
      if (qIndex === -1) return;
      const qToUpdate = { ...exercises[qIndex] };

      // Thay thế chuỗi
      if (uploadTarget.field === 'content') {
        qToUpdate.content = qToUpdate.content.replace('[CẦN CHÈN ẢNH]', imgMarkdown);
      } else if (uploadTarget.field === 'explanation') {
        qToUpdate.explanation = qToUpdate.explanation.replace('[CẦN CHÈN ẢNH]', imgMarkdown);
      } else if (uploadTarget.field === 'option') {
        const optIndex = qToUpdate.options.findIndex((o: any) => o.id === uploadTarget.optId);
        if (optIndex !== -1) {
          qToUpdate.options[optIndex].text = qToUpdate.options[optIndex].text.replace('[CẦN CHÈN ẢNH]', imgMarkdown);
        }
      }

      // Lưu thẳng vào Database
      const { error } = await supabase.from('exercises').update({
        content: qToUpdate.content,
        explanation: qToUpdate.explanation,
        options: qToUpdate.options
      }).eq('id', qToUpdate.id);

      if (error) throw error;

      // Cập nhật giao diện
      setExercises(prev => {
        const next = [...prev];
        next[qIndex] = qToUpdate;
        return next;
      });

    } catch (err) {
      alert("Lỗi khi chèn ảnh vào câu hỏi.");
    } finally {
      setIsUploadingQuestionImg(false);
      setUploadTarget(null);
      if (e.target) e.target.value = '';
    }
  };

  // ==========================================
  // XỬ LÝ LƯU LÝ THUYẾT & JSON TỪ AI
  // ==========================================
  const handleSaveTheory = async () => {
    if (!activeLesson) return;
    setIsSavingTheory(true);
    const { error } = await supabase.from('lessons').update({ theory_content: theoryInput }).eq('id', activeLesson.id);
    setIsSavingTheory(false);

    if (error) {
      alert("Lỗi lưu bài giảng: " + error.message);
    } else {
      alert("Đã lưu nội dung lý thuyết thành công!");
      setActiveLesson({ ...activeLesson, theory_content: theoryInput });
      setIsEditingTheory(false);
      setIsFullScreen(false);
      setChapters(prev => prev.map(c => ({ ...c, lessons: c.lessons?.map((l: any) => l.id === activeLesson.id ? { ...l, theory_content: theoryInput } : l) })));
    }
  };

  const sanitizeJSONString = (rawStr: string) => {
    let cleanStr = rawStr.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBracket = cleanStr.indexOf('[');
    const lastBracket = cleanStr.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) cleanStr = cleanStr.substring(firstBracket, lastBracket + 1);
    cleanStr = cleanStr.replace(/,\s*([\]}])/g, '$1');
    return cleanStr;
  };

  const handleParseAndSaveJSON = async () => {
    setJsonError("");
    try {
      if (!jsonInput.trim()) throw new Error("Vui lòng dán kết quả từ AI vào ô trống.");
      const safeJsonString = sanitizeJSONString(jsonInput);
      let parsed;
      try { parsed = JSON.parse(safeJsonString); } catch (e) { throw new Error("Dữ liệu sai cấu trúc JSON nghiêm trọng."); }

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Mảng JSON rỗng hoặc không hợp lệ.");

      parsed.forEach((q, index) => {
        if (!q.type || !['mcq', 'tf', 'saq'].includes(q.type)) throw new Error(`Câu ${index + 1}: Trường 'type' không hợp lệ.`);
        if (!q.content || !q.correct_answer) throw new Error(`Câu ${index + 1}: Thiếu nội dung hoặc đáp án.`);
      });

      setIsSaving(true);
      const questionsToInsert = parsed.map(q => ({
        lesson_id: activeLesson.id,
        type: q.type,
        level: q.level || 'Nhận biết',
        content: q.content,
        options: q.options || [],
        correct_answer: typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : q.correct_answer.toString(),
        explanation: q.explanation || ''
      }));

      const { error } = await supabase.from('exercises').insert(questionsToInsert);
      if (error) throw error;

      alert(`Đã thêm thành công ${questionsToInsert.length} bài tập.`);
      setShowJsonModal(false);
      setJsonInput("");
      fetchExercises(activeLesson.id); 
    } catch (error: any) {
      setJsonError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Xóa câu hỏi này?")) return;
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (!error) setExercises(prev => prev.filter(q => q.id !== id));
  };

  const parseTFAnswer = (ans: any) => {
    if (typeof ans === 'string') { try { return JSON.parse(ans); } catch { return {}; } }
    return ans || {};
  };

  const MarkdownComponents = {
    img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded border border-[#dee2e6] my-4 block shadow-sm" alt={props.alt || "Ảnh"} loading="lazy" />,
    table: ({ node, ...props }: any) => <div className="w-full overflow-x-auto my-6 rounded-lg border border-[#dee2e6] shadow-sm bg-white"><table className="w-full text-center border-collapse text-[14px]" {...props} /></div>,
    thead: ({ node, ...props }: any) => <thead className="bg-[#f8f9fa] border-b-2 border-[#dee2e6] text-[#212529]" {...props} />,
    tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-[#dee2e6]" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="transition-colors hover:bg-[#f8f9fa]/50" {...props} />,
    th: ({ node, ...props }: any) => <th className="p-3 border-r border-[#dee2e6] last:border-r-0 font-bold whitespace-nowrap align-middle" {...props} />,
    td: ({ node, ...props }: any) => <td className="p-3 border-r border-[#dee2e6] last:border-r-0 align-middle first:font-bold first:bg-[#f8f9fa] first:border-r-2" {...props} />,
  };

  // ==========================================
  // RENDER GIAO DIỆN
  // ==========================================
  return (
    <div className="page-container relative animate-in fade-in">
      <div className="page-content custom-scrollbar">
        <div className="max-w-screen-2xl mx-auto w-full">
          
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#212529] mb-2 font-heading flex items-center gap-2">
                <LayoutList className="text-primary"/> Trung tâm Soạn giảng
              </h2>
              <p className="text-[#6c757d] font-medium text-[14px]">Quản lý Lý thuyết và Ngân hàng câu hỏi chi tiết theo từng chương/bài.</p>
            </div>
            <button onClick={handleCreateChapter} className="btn-primary py-2.5 px-6 rounded-lg text-[14px] flex items-center justify-center gap-2 shadow-sm">
              <PlusCircle size={18} /> Tạo Chương mới
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
            
            {/* ==========================================
                CỘT TRÁI: DANH SÁCH CHƯƠNG & BÀI HỌC
                ========================================== */}
            <div className="w-full lg:w-[320px] shrink-0 bg-white rounded-xl border border-[#dee2e6] shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#dee2e6] font-bold text-[#495057] uppercase tracking-wider text-[13px] flex items-center justify-between bg-[#f8f9fa]">
                <span className="flex items-center gap-2"><BookOpen size={16}/> Lộ trình học</span>
                <button onClick={handleCreateChapter} className="text-primary hover:underline text-[12px] font-bold flex items-center gap-1">
                  <Plus size={14}/> Chương
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary"/></div>
                ) : chapters.length === 0 ? (
                  <div className="text-center text-[#adb5bd] text-[13px] py-10 font-medium">Chưa có chương nào.</div>
                ) : (
                  chapters.map(chapter => {
                    const isExpanded = activeChapterId === chapter.id;
                    return (
                      <div key={chapter.id} className="mb-2 bg-white border border-[#dee2e6] rounded-lg overflow-hidden">
                        <button 
                          onClick={() => setActiveChapterId(isExpanded ? null : chapter.id)}
                          className="w-full flex items-center justify-between p-3 bg-[#f8f9fa] hover:bg-[#e9ecef] font-bold text-[#212529] text-[14px] transition-colors text-left"
                        >
                          <span className="truncate pr-2">{chapter.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {isExpanded ? <ChevronDown size={16} className="text-[#adb5bd]"/> : <ChevronRight size={16} className="text-[#adb5bd]"/>}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="divide-y divide-[#e9ecef] bg-white">
                            {chapter.lessons?.map((lesson: any) => {
                              const isActive = activeLesson?.id === lesson.id;
                              return (
                                <button 
                                  key={lesson.id} 
                                  onClick={() => handleSelectLesson(lesson)}
                                  className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${isActive ? 'bg-[#e7f1ff] border-l-4 border-l-primary' : 'hover:bg-[#f8f9fa] border-l-4 border-l-transparent'}`}
                                >
                                  <div className={`text-[13px] font-medium line-clamp-2 flex items-start gap-2 ${isActive ? 'text-primary font-bold' : 'text-[#495057]'}`}>
                                    <FileText size={14} className="shrink-0 mt-0.5"/> {lesson.title}
                                  </div>
                                </button>
                              );
                            })}
                            <button
                              onClick={() => handleCreateLesson(chapter.id)}
                              className="w-full text-left px-4 py-2 text-[12px] font-bold text-primary hover:bg-[#e7f1ff] transition-colors flex items-center gap-1.5"
                            >
                              <Plus size={14} /> + Thêm Bài học mới
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ==========================================
                CỘT PHẢI: NỘI DUNG CHI TIẾT BÀI HỌC
                ========================================== */}
            <div className="flex-1 bg-white rounded-xl border border-[#dee2e6] shadow-sm flex flex-col overflow-hidden">
              {activeLesson ? (
                <>
                  <div className="p-6 border-b border-[#dee2e6] bg-[#f8f9fa]">
                    <div className="text-[11px] font-bold uppercase text-[#6c757d] tracking-wider mb-1.5">Đang soạn thảo bài học</div>
                    <h3 className="text-[20px] font-bold font-heading text-[#212529] m-0 line-clamp-2">{activeLesson.title}</h3>
                  </div>

                  <div className="flex px-2 pt-2 border-b border-[#dee2e6] gap-2 shrink-0 bg-[#f8f9fa] overflow-x-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('theory')} className={`px-4 py-2.5 font-bold text-[13px] uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap rounded-t-lg ${activeTab === 'theory' ? 'border-primary text-primary bg-white' : 'border-transparent text-[#6c757d] hover:bg-[#e9ecef]'}`}>
                      <BookOpen size={16}/> Lý thuyết
                    </button>
                    <button onClick={() => setActiveTab('practice')} className={`px-4 py-2.5 font-bold text-[13px] uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap rounded-t-lg ${activeTab === 'practice' ? 'border-primary text-primary bg-white' : 'border-transparent text-[#6c757d] hover:bg-[#e9ecef]'}`}>
                      <Database size={16}/> Bài tập ({exercises.length})
                    </button>
                  </div>

                  <div className={`flex-1 custom-scrollbar ${isFullScreen ? 'fixed inset-0 z-[100] bg-[#f8f9fa] p-4 flex flex-col' : 'overflow-y-auto p-4 md:p-6 relative bg-white'}`}>
                    
                    {/* ========================================== */}
                    {/* TAB: LÝ THUYẾT                             */}
                    {/* ========================================== */}
                    {activeTab === 'theory' ? (
                      <div className="animate-in fade-in h-full flex flex-col min-h-[400px]">
                        
                        <div className="flex flex-wrap justify-between items-center mb-4 shrink-0 gap-4">
                          <div className="flex items-center gap-2 text-[#495057]">
                            <BookOpen size={18}/>
                            <h4 className="font-bold text-[15px] m-0">Bài giảng lý thuyết</h4>
                            {isEditingTheory && theoryInput.includes('[CẦN CHÈN ẢNH]') && (
                              <span className="px-2 py-0.5 bg-[#fff3cd] text-[#664d03] rounded text-[11px] font-bold animate-pulse flex items-center gap-1 border border-[#ffecb5] ml-2">
                                <AlertTriangle size={12}/> Vị trí trống ảnh
                              </span>
                            )}
                          </div>

                          {!isEditingTheory ? (
                            <button onClick={() => setIsEditingTheory(true)} className="btn-secondary py-2 px-4 text-[13px] flex items-center gap-2">
                              <Edit3 size={14}/> Sửa bài giảng
                            </button>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <input type="file" accept="image/*" ref={theoryFileInputRef} className="hidden" onChange={handleTheoryImageUpload} />
                              
                              <button onClick={() => theoryFileInputRef.current?.click()} disabled={isUploadingImg} className="btn-outline px-3 py-2 text-[12px] flex items-center gap-1.5 disabled:opacity-50">
                                {isUploadingImg ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14}/>} 
                                Thay thế [CẦN CHÈN ẢNH]
                              </button>
                              
                              <button onClick={() => setIsFullScreen(!isFullScreen)} className="btn-outline p-2" title={isFullScreen ? "Thu nhỏ" : "Toàn màn hình"}>
                                {isFullScreen ? <Minimize size={16}/> : <Maximize size={16}/>}
                              </button>

                              <div className="w-px h-6 bg-[#dee2e6] mx-1"></div>

                              <button onClick={() => { setIsEditingTheory(false); setIsFullScreen(false); setTheoryInput(activeLesson.theory_content || ""); }} className="btn-outline px-4 py-2 text-[13px]">
                                Hủy
                              </button>
                              <button onClick={handleSaveTheory} disabled={isSavingTheory} className="btn-primary py-2 px-4 text-[13px] flex items-center gap-1.5 disabled:opacity-50">
                                {isSavingTheory ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Lưu
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditingTheory ? (
                          <div className={`flex-1 flex gap-4 ${isFullScreen ? 'flex-row' : 'flex-col'}`}>
                            <div className="flex-1 border border-[#dee2e6] rounded-xl overflow-hidden flex flex-col bg-white">
                              <div className="bg-[#f8f9fa] border-b border-[#dee2e6] px-3 py-1.5 text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">
                                Trình soạn thảo (Markdown + LaTeX)
                              </div>
                              <textarea
                                value={theoryInput}
                                onChange={e => setTheoryInput(e.target.value)}
                                placeholder="Soạn bài giảng Markdown tại đây...&#10;Dùng $...$ cho công thức nội tuyến, $$...$$ cho khối công thức."
                                className="flex-1 w-full p-4 font-mono text-[14px] leading-relaxed outline-none resize-none custom-scrollbar text-[#212529] bg-white"
                                spellCheck="false"
                              />
                            </div>
                            
                            {isFullScreen && (
                              <div className="flex-1 bg-white border border-[#dee2e6] rounded-xl overflow-hidden flex flex-col">
                                <div className="bg-[#f8f9fa] border-b border-[#dee2e6] px-3 py-1.5 text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">
                                  Xem trước giao diện
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                  <div className="prose prose-sm max-w-none text-[#212529] leading-[1.8] [&_.katex-display]:my-4">
                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>
                                      {theoryInput || '*Chưa có nội dung...*'}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 bg-white p-6 rounded-xl border border-[#dee2e6] overflow-y-auto custom-scrollbar shadow-sm">
                            {activeLesson.theory_content ? (
                              <div className="prose prose-sm max-w-none text-[#212529] leading-[1.8] [&_.katex-display]:my-4">
                                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>
                                  {activeLesson.theory_content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-[#adb5bd]">
                                <BookOpen size={48} className="mb-3 opacity-30" />
                                <p className="font-bold text-[14px]">Chưa có nội dung lý thuyết.</p>
                                <p className="text-[12px] mt-1">Bấm "Sửa bài giảng" để bắt đầu soạn giáo án.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (

                    /* ========================================== */
                    /* TAB: BÀI TẬP                               */
                    /* ========================================== */
                      <div className="animate-in fade-in">
                        {/* Input ẩn để upload ảnh bài tập */}
                        <input type="file" accept="image/*" ref={questionFileInputRef} className="hidden" onChange={handleQuestionImageUpload} />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <h4 className="font-bold text-[#212529] text-[15px] m-0 flex items-center gap-2">
                            <Database size={18} className="text-primary"/> Ngân hàng câu hỏi
                          </h4>
                          <div className="flex gap-2">
                            <button onClick={() => setShowJsonModal(true)} className="bg-[#e7f1ff] hover:bg-[#cfe2ff] text-primary px-4 py-2 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-colors border border-[#b6d4fe]">
                              <FileJson size={16}/> Nhập từ AI (JSON)
                            </button>
                            <button className="bg-white border border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057] px-4 py-2 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-colors">
                              <Plus size={16}/> Tạo thủ công
                            </button>
                          </div>
                        </div>

                        {isFetchingEx ? (
                          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={32}/></div>
                        ) : exercises.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-[#adb5bd] border border-dashed border-[#dee2e6] rounded-xl bg-[#f8f9fa]">
                            <Database size={48} className="mb-4 opacity-20" />
                            <p className="font-medium text-sm">Bài học này chưa có câu hỏi nào.</p>
                            <p className="text-xs mt-2">Hãy copy JSON sinh ra từ AI và bấm "Nhập từ AI" nhé.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {exercises.map((q, idx) => {
                              let typeLabel = "Trắc nghiệm 4 đáp án";
                              let badgeColor = "bg-[#cfe2ff] text-[#084298] border-[#9ec5fe]";
                              if (q.type === 'tf') { typeLabel = "Trắc nghiệm Đúng/Sai"; badgeColor = "bg-[#fff3cd] text-[#664d03] border-[#ffecb5]"; }
                              if (q.type === 'saq') { typeLabel = "Trả lời ngắn"; badgeColor = "bg-[#e2e3e5] text-[#41464b] border-[#d3d6d8]"; }

                              return (
                                <div key={q.id} className="bg-white p-5 rounded-xl border border-[#dee2e6] shadow-sm relative group hover:border-[#b6d4fe] transition-colors">
                                  
                                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDeleteQuestion(q.id)} className="p-1.5 bg-white border border-[#dee2e6] text-[#6c757d] hover:text-[#dc3545] hover:bg-[#f8d7da] hover:border-[#f5c2c7] rounded transition-colors" title="Xóa câu hỏi">
                                      <Trash2 size={14}/>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e9ecef] pr-12">
                                    <span className="badge-primary">Câu {idx + 1}</span>
                                    <span className="text-[10px] font-bold text-[#6c757d] uppercase bg-[#f8f9fa] border border-[#dee2e6] px-2 py-0.5 rounded">
                                      {q.level}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                                      {typeLabel}
                                    </span>
                                  </div>
                                  
                                  {/* HIỂN THỊ VÀ CHÈN ẢNH VÀO NỘI DUNG */}
                                  <div className="prose prose-sm max-w-none text-[#212529] mb-4 leading-[1.8] [&_.katex-display]:my-2 overflow-x-auto">
                                    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{q.content}</ReactMarkdown>
                                  </div>

                                  {q.content?.includes('[CẦN CHÈN ẢNH]') && (
                                    <button 
                                      onClick={() => { setUploadTarget({ id: q.id, field: 'content' }); questionFileInputRef.current?.click(); }}
                                      disabled={isUploadingQuestionImg}
                                      className="mb-4 bg-[#f8f9fa] text-[#495057] border border-[#dee2e6] border-dashed hover:border-primary hover:text-primary px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                                    >
                                      {isUploadingQuestionImg && uploadTarget?.id === q.id && uploadTarget.field === 'content' ? <Loader2 size={12} className="animate-spin text-primary"/> : <ImageIcon size={12}/>}
                                      Click tải ảnh thay thế [CẦN CHÈN ẢNH]
                                    </button>
                                  )}

                                  {/* HIỂN THỊ OPTIONS (MCQ) */}
                                  {q.type === 'mcq' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                      {Array.isArray(q.options) && q.options.map((opt: any) => (
                                        <div key={opt.id} className={`p-3 rounded-lg border text-[14px] flex items-start gap-2.5 ${opt.id === q.correct_answer ? 'bg-[#d1e7dd] border-[#198754]' : 'bg-[#f8f9fa] border-[#dee2e6]'}`}>
                                          <strong className={`shrink-0 font-ui text-[13px] ${opt.id === q.correct_answer ? 'text-[#0f5132]' : 'text-[#6c757d]'}`}>{opt.id}.</strong> 
                                          <div className={`prose prose-sm max-w-none flex-1 overflow-x-auto leading-relaxed m-0 ${opt.id === q.correct_answer ? 'text-[#0f5132]' : 'text-[#212529]'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown>
                                          </div>
                                          {opt.text?.includes('[CẦN CHÈN ẢNH]') && (
                                            <button 
                                              onClick={() => { setUploadTarget({ id: q.id, field: 'option', optId: opt.id }); questionFileInputRef.current?.click(); }}
                                              disabled={isUploadingQuestionImg}
                                              className="bg-white border border-[#dee2e6] text-[#6c757d] px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-[#e9ecef] transition-colors shrink-0"
                                            >
                                              <ImageIcon size={12}/> Chèn ảnh
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* HIỂN THỊ OPTIONS (TF) */}
                                  {q.type === 'tf' && (
                                    <div className="space-y-2 mb-4">
                                      {Array.isArray(q.options) && q.options.map((opt: any, idx: number) => {
                                        const rawOptId = opt.id || ['a', 'b', 'c', 'd'][idx] || String(idx);
                                        const optId = String(rawOptId).toLowerCase().trim();
                                        const tfAns = parseTFAnswer(q.correct_answer);
                                        const isTrue = tfAns[optId] === true;
                                        
                                        return (
                                          <div key={opt.id} className={`p-3 rounded-lg border text-[14px] flex items-start gap-2.5 ${isTrue ? 'bg-[#d1e7dd] border-[#198754]' : 'bg-[#f8f9fa] border-[#dee2e6]'}`}>
                                            <strong className={`shrink-0 font-ui text-[13px] ${isTrue ? 'text-[#0f5132]' : 'text-[#6c757d]'}`}>{optId})</strong> 
                                            <div className={`prose prose-sm max-w-none flex-1 overflow-x-auto leading-relaxed m-0 ${isTrue ? 'text-[#0f5132]' : 'text-[#212529]'}`}>
                                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{opt.text}</ReactMarkdown>
                                            </div>
                                            <div className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${isTrue ? 'bg-white text-[#198754] border-[#a3cfbb]' : 'bg-white text-[#6c757d] border-[#dee2e6]'}`}>
                                              {isTrue ? 'ĐÚNG' : 'SAI'}
                                            </div>
                                            {opt.text?.includes('[CẦN CHÈN ẢNH]') && (
                                              <button 
                                                onClick={() => { setUploadTarget({ id: q.id, field: 'option', optId: opt.id }); questionFileInputRef.current?.click(); }}
                                                disabled={isUploadingQuestionImg}
                                                className="bg-white border border-[#dee2e6] text-[#6c757d] px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-[#e9ecef] transition-colors shrink-0"
                                              >
                                                <ImageIcon size={12}/> Chèn ảnh
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}

                                  {/* HIỂN THỊ SAQ */}
                                  {q.type === 'saq' && (
                                    <div className="mb-4 flex items-center gap-3 bg-white p-3 rounded-lg border border-[#dee2e6]">
                                      <span className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider">Đáp án điền khuyết: </span>
                                      <span className="font-bold text-[16px] text-[#198754]">{q.correct_answer}</span>
                                    </div>
                                  )}

                                  {/* LỜI GIẢI VÀ CHÈN ẢNH VÀO LỜI GIẢI */}
                                  {q.explanation && (
                                    <div className="bg-[#fff3cd] p-4 rounded-lg border border-[#ffecb5]">
                                      <span className="text-[11px] font-bold text-[#997404] uppercase tracking-wider mb-2 flex items-center gap-1.5"><BrainCircuit size={14}/> Lời giải hệ thống</span>
                                      <div className="prose prose-sm max-w-none text-[#664d03] leading-[1.8] [&_.katex-display]:my-2">
                                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>{q.explanation}</ReactMarkdown>
                                      </div>
                                      {q.explanation.includes('[CẦN CHÈN ẢNH]') && (
                                        <button 
                                          onClick={() => { setUploadTarget({ id: q.id, field: 'explanation' }); questionFileInputRef.current?.click(); }}
                                          disabled={isUploadingQuestionImg}
                                          className="mt-3 bg-white border border-[#ffecb5] text-[#997404] hover:bg-[#fff3cd] px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors animate-pulse w-fit"
                                        >
                                          {isUploadingQuestionImg && uploadTarget?.id === q.id && uploadTarget.field === 'explanation' ? <Loader2 size={12} className="animate-spin"/> : <ImageIcon size={12}/>}
                                          Click tải ảnh thay thế [CẦN CHÈN ẢNH]
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#adb5bd] p-10 bg-white">
                  <BookOpen size={64} className="mb-4 opacity-30"/>
                  <p className="font-bold text-[16px] text-[#495057] mb-2 font-heading">Chưa chọn bài học</p>
                  <p className="text-[13px] text-center">Bấm vào một bài học ở danh sách bên trái để bắt đầu soạn giảng.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL NHẬP JSON TỪ AI                      */}
      {/* ========================================== */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-bs-hover border border-[#dee2e6] relative flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-[#dee2e6] flex justify-between items-center bg-[#f8f9fa] shrink-0 rounded-t-xl">
              <div>
                <h3 className="text-[20px] font-bold font-heading text-[#212529] m-0 flex items-center gap-2">
                  <FileJson className="text-primary"/> Nhập JSON (AI)
                </h3>
                <p className="text-[12px] font-bold text-[#198754] m-0 mt-1 uppercase tracking-wider">
                  Gắn vào: {activeLesson?.title}
                </p>
              </div>
              <button onClick={() => setShowJsonModal(false)} className="p-1.5 bg-white border border-[#dee2e6] hover:bg-[#e9ecef] rounded-lg text-[#6c757d] transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col min-h-0">
              {jsonError && (
                <div className="mb-4 p-3 bg-[#f8d7da] border border-[#f5c2c7] text-[#dc3545] rounded-lg text-[13px] font-bold flex items-start gap-2 shadow-sm">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5"/> <span>{jsonError}</span>
                </div>
              )}

              <div className="flex-1 min-h-[300px] flex flex-col">
                 <textarea 
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  placeholder="Dán mã JSON của AI vào đây...&#10;Hệ thống sẽ tự động bóc tách và sửa lỗi định dạng Markdown nếu có."
                  className="flex-1 w-full bg-[#212529] text-[#a3cfbb] font-mono text-[13px] p-5 rounded-lg border border-[#495057] outline-none focus:border-[#6ea8fe] resize-none custom-scrollbar shadow-inner"
                  spellCheck="false"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#dee2e6] bg-[#f8f9fa] flex justify-end gap-3 shrink-0 rounded-b-xl">
              <button onClick={() => setShowJsonModal(false)} className="px-5 py-2.5 bg-white border border-[#dee2e6] hover:bg-[#e9ecef] text-[#495057] font-bold rounded-lg transition-colors text-[13px]">Hủy</button>
              <button onClick={handleParseAndSaveJSON} disabled={isSaving} className="btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2 disabled:opacity-50 text-[13px]">
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} LƯU DỮ LIỆU JSON
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuestionBank;