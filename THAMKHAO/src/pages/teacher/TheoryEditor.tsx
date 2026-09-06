import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Image as ImageIcon, Bold, Italic, 
  Heading, List, Sigma, Loader2, LayoutTemplate, SplitSquareHorizontal 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm'; 
import 'katex/dist/katex.min.css';
import { supabase } from '../../config/supabase';

const TheoryEditor = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState<any>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, theory_content, chapters(title)')
        .eq('id', lessonId)
        .single();

      if (data) {
        setLesson(data);
        setContent(data.theory_content || "");
      } else {
        alert("Không tìm thấy bài học!");
        navigate('/question-bank');
      }
      setIsLoading(false);
    };
    fetchLesson();
  }, [lessonId, navigate]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('lessons')
      .update({ theory_content: content })
      .eq('id', lessonId);

    setIsSaving(false);
    if (error) {
      alert("Lỗi lưu bài: " + error.message);
    } else {
      alert("Lưu lý thuyết thành công!");
      navigate('/question-bank');
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; 
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error?.message);
      
      const imageUrl = data.secure_url;
      insertText(`\n![Hình ảnh](${imageUrl})\n`, '');
      
    } catch (error: any) {
      alert('Lỗi Upload ảnh: ' + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Tùy chỉnh hiển thị Bảng, Ảnh cho thẻ Markdown
  const MarkdownComponents = {
    img: ({ node, ...props }: any) => <img {...props} className="max-w-full h-auto rounded border border-[#dee2e6] my-4 block shadow-sm" alt={props.alt || "Ảnh"} loading="lazy" />,
    table: ({ node, ...props }: any) => <div className="w-full overflow-x-auto my-6 rounded-lg border border-[#dee2e6] shadow-sm bg-white"><table className="w-full text-center border-collapse text-[14px]" {...props} /></div>,
    thead: ({ node, ...props }: any) => <thead className="bg-[#f8f9fa] border-b-2 border-[#dee2e6] text-[#212529]" {...props} />,
    tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-[#dee2e6]" {...props} />,
    tr: ({ node, ...props }: any) => <tr className="transition-colors hover:bg-[#f8f9fa]/50" {...props} />,
    th: ({ node, ...props }: any) => <th className="p-3 border-r border-[#dee2e6] last:border-r-0 font-bold whitespace-nowrap align-middle" {...props} />,
    td: ({ node, ...props }: any) => <td className="p-3 border-r border-[#dee2e6] last:border-r-0 align-middle first:font-bold first:bg-[#f8f9fa] first:border-r-2" {...props} />,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-72px)] text-primary bg-[#f8f9fa]">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="font-medium text-[15px]">Đang tải trình soạn thảo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] w-full bg-[#f8f9fa] overflow-hidden">
      
      {/* HEADER BAR (FLAT UI) */}
      <div className="h-16 bg-white border-b border-[#dee2e6] flex justify-between items-center px-6 shrink-0 relative z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/question-bank" className="p-2 text-[#6c757d] hover:bg-[#e9ecef] rounded-lg transition-colors border border-transparent hover:border-[#dee2e6]">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-[11px] font-bold uppercase text-primary tracking-wider mb-0.5 font-ui">Chỉnh sửa Lý thuyết</div>
            <h2 className="font-bold text-[#212529] truncate max-w-md text-[15px] font-heading m-0">{lesson?.title}</h2>
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="btn-primary py-2 px-6 rounded-lg text-[14px] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
          Lưu nội dung
        </button>
      </div>

      {/* THANH CÔNG CỤ SOẠN THẢO */}
      <div className="bg-[#f8f9fa] border-b border-[#dee2e6] p-2 flex flex-wrap gap-2 px-6 shrink-0 items-center justify-between">
        
        <div className="flex items-center gap-1.5">
          <button onClick={() => insertText('**', '**')} className="p-2 hover:bg-[#e9ecef] text-[#495057] rounded border border-transparent hover:border-[#dee2e6] transition-colors" title="In đậm"><Bold size={16}/></button>
          <button onClick={() => insertText('*', '*')} className="p-2 hover:bg-[#e9ecef] text-[#495057] rounded border border-transparent hover:border-[#dee2e6] transition-colors" title="In nghiêng"><Italic size={16}/></button>
          <button onClick={() => insertText('### ', '')} className="p-2 hover:bg-[#e9ecef] text-[#495057] rounded border border-transparent hover:border-[#dee2e6] transition-colors" title="Tiêu đề 3"><Heading size={16}/></button>
          
          <div className="w-px h-5 bg-[#dee2e6] mx-1"></div>
          
          <button onClick={() => insertText('- ', '')} className="p-2 hover:bg-[#e9ecef] text-[#495057] rounded border border-transparent hover:border-[#dee2e6] transition-colors" title="Danh sách"><List size={16}/></button>
          <button onClick={() => insertText('$$ ', ' $$')} className="p-2 hover:bg-[#e9ecef] text-[#495057] rounded border border-transparent hover:border-[#dee2e6] transition-colors" title="Công thức Toán (Khối)"><Sigma size={16}/></button>
          
          <div className="w-px h-5 bg-[#dee2e6] mx-1"></div>
          
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d1e7dd] border border-[#a3cfbb] text-[#0f5132] hover:bg-[#a3cfbb] rounded font-bold text-[12px] transition-colors disabled:opacity-50 ml-1"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14}/>}
            Chèn ảnh
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold text-[#6c757d] bg-white border border-[#dee2e6] px-3 py-1.5 rounded uppercase tracking-wider">
          <SplitSquareHorizontal size={14} className="text-[#adb5bd]"/> Chia đôi màn hình
        </div>

      </div>

      {/* KHÔNG GIAN LÀM VIỆC CHÍNH (CHIA 2 CỘT) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Cột trái: Trình soạn thảo */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-[#dee2e6] flex flex-col min-h-[300px] bg-[#212529]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Bắt đầu soạn thảo lý thuyết bằng Markdown và LaTeX..."
            className="flex-1 w-full p-6 bg-transparent text-[#a3cfbb] font-mono text-[14px] leading-relaxed outline-none resize-none custom-scrollbar"
            spellCheck={false}
          />
        </div>

        {/* Cột phải: Xem trước (Preview) */}
        <div className="flex-1 bg-white overflow-y-auto custom-scrollbar p-6 md:p-10 relative">
          {content.trim() ? (
            <div className="prose prose-base max-w-3xl mx-auto text-[#212529] leading-[2.2] overflow-x-auto [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-2">
              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} components={MarkdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#adb5bd] opacity-60">
              <LayoutTemplate size={48} className="mb-4" />
              <p className="font-bold text-[15px] m-0">Bản xem trước sẽ hiển thị tại đây</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};

export default TheoryEditor;