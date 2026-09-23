'use client';

import React, { useState, useRef } from 'react';
import { 
  Bold, Italic, Heading, List, Sigma, Table, 
  Image as ImageIcon, Eye, Save, Sparkles, Check, 
  HelpCircle, SplitSquareHorizontal, FileText, AlertCircle,
  Upload, Loader2
} from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';

interface TheoryEditorProps {
  initialContent?: string;
  lessonTitle: string;
  onSave: (content: string) => Promise<void>;
}

export default function TheoryEditor({
  initialContent = '',
  lessonTitle,
  onSave
}: TheoryEditorProps) {
  const [content, setContent] = useState<string>(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertText = (before: string, after: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultPlaceholder;
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Lỗi khi lưu lý thuyết: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý upload ảnh (Hỗ trợ Cloudinary nếu đã cấu hình, hoặc fallback sang chèn URL)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      // Chưa cấu hình Cloudinary
      const convertToBase64 = confirm(
        'Hệ thống chưa tìm thấy cấu hình Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME trong .env.local).\n\nBạn có muốn chèn bằng đường link ảnh (URL) hoặc dán link ảnh trực tiếp không?'
      );
      if (convertToBase64) {
        const url = prompt('Nhập đường link hình ảnh (URL):', 'https://');
        if (url) insertText(`\n![Hình minh họa](${url})\n`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Lỗi tải ảnh lên Cloudinary');

      insertText(`\n![Hình minh họa](${data.secure_url})\n`);
    } catch (err: any) {
      alert('Không thể tải ảnh: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Mẫu lý thuyết mẫu cho giáo viên
  const handleLoadSample = () => {
    if (content.trim() && !confirm('Nạp mẫu sẽ ghi đè nội dung hiện tại. Bạn có muốn tiếp tục?')) {
      return;
    }

    const sample = `### 1. ĐỊNH NGHĨA VÀ TÍNH CHẤT CỐT LÕI
Cho hàm số $y = f(x)$ xác định và liên tục trên khoảng $(a; b)$.
- Hàm số $f(x)$ gọi là **đồng biến** trên $(a; b)$ nếu:
  $$\\forall x_1, x_2 \\in (a; b): x_1 < x_2 \\implies f(x_1) < f(x_2)$$
- Hàm số $f(x)$ gọi là **nghịch biến** trên $(a; b)$ nếu:
  $$\\forall x_1, x_2 \\in (a; b): x_1 < x_2 \\implies f(x_1) > f(x_2)$$

### 2. ĐỊNH LÝ VỀ DẤU CỦA ĐẠO HÀM
Cho hàm số $y = f(x)$ có đạo hàm trên khoảng $(a; b)$:
- Nếu $f'(x) > 0, \\forall x \\in (a; b)$ thì hàm số $f(x)$ đồng biến trên $(a; b)$.
- Nếu $f'(x) < 0, \\forall x \\in (a; b)$ thì hàm số $f(x)$ nghịch biến trên $(a; b)$.
- Nếu $f'(x) = 0, \\forall x \\in (a; b)$ thì hàm số $f(x)$ không đổi (hàm hằng).

### 3. BẢNG XÉT DẤU MẪU
| $x$ | $-\\infty$ | $1$ | $3$ | $+\\infty$ |
|---|---|---|---|---|
| $f'(x)$ | $+$ | $0$ | $-$ | $0$ | $+$ |
| $f(x)$ | $\\nearrow$ | $4$ | $\\searrow$ | $0$ | $\\nearrow$ |

> [!NOTE]
> Điểm cực trị chỉ xảy ra khi đạo hàm $f'(x)$ đổi dấu qua điểm đó!`;

    setContent(sample);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm space-y-0 animate-fade-in flex flex-col">
      
      {/* Ẩn file input upload ảnh */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* TOOLBAR THANH CÔNG CỤ SOẠN THẢO (CHUẨN FMATH) */}
      <div className="p-3 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => insertText('**', '**', 'chữ in đậm')}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-foreground font-bold"
            title="In đậm (Bold)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*', 'chữ in nghiêng')}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-foreground"
            title="In nghiêng (Italic)"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('\n### ', '\n', 'Tiêu đề mục')}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-foreground font-bold"
            title="Tiêu đề (Heading)"
          >
            <Heading className="h-4 w-4" />
          </button>

          <span className="h-4 w-[1px] bg-border mx-1" />

          <button
            type="button"
            onClick={() => insertText('$', '$', 'f(x) = x^2')}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-primary font-bold flex items-center gap-1"
            title="Công thức Toán inline ($...$)"
          >
            <Sigma className="h-4 w-4" /> <span className="text-[10px]">$..$</span>
          </button>
          <button
            type="button"
            onClick={() => insertText('\n$$\n', '\n$$\n', '\\int_a^b f(x) dx')}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-primary font-bold flex items-center gap-1"
            title="Khối công thức Toán ($$...$$)"
          >
            <Sigma className="h-4 w-4" /> <span className="text-[10px]">$$..$$</span>
          </button>

          <button
            type="button"
            onClick={() => insertText('\n| Cột 1 | Cột 2 |\n|---|---|\n| Giá trị 1 | Giá trị 2 |\n')}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-foreground"
            title="Bảng biểu Markdown (Table)"
          >
            <Table className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => insertText('- ', '\n', 'Mục danh sách')}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-foreground"
            title="Danh sách gạch đầu dòng"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-foreground flex items-center gap-1"
            title="Chèn ảnh (Tải lên hoặc nhập link)"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleLoadSample}
            className="p-1.5 rounded hover:bg-primary/10 text-purple-600 font-bold flex items-center gap-1 text-[11px]"
            title="Nạp cấu trúc bài giảng mẫu chuẩn 2026"
          >
            <Sparkles className="h-3.5 w-3.5" /> Nạp mẫu
          </button>
        </div>

        {/* Chế độ xem & Nút lưu */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${viewMode === 'edit' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'}`}
            >
              Soạn thảo
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden sm:block px-2.5 py-1 rounded text-[11px] font-bold ${viewMode === 'split' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'}`}
            >
              Song song
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${viewMode === 'preview' ? 'bg-background shadow-xs text-primary' : 'text-muted-foreground'}`}
            >
              Xem trước
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-extrabold flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-xs text-xs disabled:opacity-50"
          >
            {savedSuccess ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? 'Đang lưu...' : savedSuccess ? 'Đã lưu!' : 'Lưu lý thuyết'}
          </button>
        </div>
      </div>

      {/* KHUNG SOẠN THẢO VÀ XEM TRƯỚC (SPLIT VIEW) */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[450px] divide-y md:divide-y-0 md:divide-x divide-border">
        
        {/* CỘT SOẠN THẢO */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'md:col-span-6' : 'md:col-span-12'} p-3 flex flex-col`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung lý thuyết bằng Markdown và LaTeX (VD: $y = f(x)$, $$\\frac{1}{2}$$)..."
              className="w-full flex-1 min-h-[420px] bg-transparent font-mono text-xs leading-relaxed focus:outline-none resize-none p-2 border-0"
            />
          </div>
        )}

        {/* CỘT XEM TRƯỚC (LIVE PREVIEW) */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'md:col-span-6' : 'md:col-span-12'} p-4 bg-muted/5 overflow-y-auto max-h-[500px]`}>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-primary" /> Xem trước hiển thị của học sinh
              </span>
              
              {!content.trim() ? (
                <div className="text-center py-16 text-muted-foreground italic text-xs">
                  Chưa có nội dung lý thuyết. Hãy soạn bài ở cột bên trái hoặc nhấn &quot;Nạp mẫu&quot; để bắt đầu.
                </div>
              ) : (
                <div className="p-4 bg-card rounded-xl border border-border shadow-xs">
                  <MathRenderer content={content} />
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
