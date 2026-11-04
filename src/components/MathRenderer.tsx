'use client';

import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { cleanOptionText } from '@/lib/questionUtils';
import { ZoomIn, X, ExternalLink, ImageOff } from 'lucide-react';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Component hiển thị hình ảnh đề thi hỗ trợ:
 * - Tự động tải an toàn (no-referrer, crossOrigin)
 * - Bấm vào ảnh để phóng to toàn màn hình (Modal Lightbox)
 * - Tự động phục hồi hoặc hiển thị nút mở trực tiếp nếu ảnh bị chặn
 */
const ZoomableExamImage = ({ src, alt, ...props }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!src || typeof src !== 'string' || src.trim() === '') {
    return null;
  }

  const cleanSrc = src.trim();

  if (hasError) {
    return (
      <div className="my-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <ImageOff className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Hình minh họa không thể hiển thị trực tiếp.</span>
        </span>
        <a 
          href={cleanSrc} 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shrink-0"
        >
          <span>Mở ảnh</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <>
      <div className="relative group my-3 inline-block max-w-full">
        <img
          src={cleanSrc}
          alt={alt || 'Hình minh họa đề thi'}
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
          onClick={() => setIsOpen(true)}
          className="max-w-full h-auto max-h-[380px] rounded-xl border border-border shadow-xs mx-auto block cursor-zoom-in hover:brightness-95 transition-all object-contain bg-white dark:bg-slate-900"
          {...props}
        />
        <div 
          onClick={() => setIsOpen(true)}
          className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs pointer-events-none"
        >
          <ZoomIn className="h-3 w-3" />
          <span>Phóng to</span>
        </div>
      </div>

      {/* Modal Lightbox Phóng to ảnh */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] bg-card border border-border rounded-2xl p-2 shadow-2xl flex flex-col items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 px-3 border-b border-border text-xs font-bold text-muted-foreground">
              <span>{alt || 'Hình minh họa'}</span>
              <div className="flex items-center gap-2">
                <a 
                  href={cleanSrc} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-1 hover:text-primary transition-colors"
                  title="Mở trong tab mới"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              <img 
                src={cleanSrc} 
                alt={alt || 'Hình minh họa phóng to'}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const markdownComponents = {
  h1: ({ node, ...props }: any) => (
    <h1 className="text-xl font-black text-foreground mt-4 mb-2 border-b border-border pb-1" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-lg font-black text-foreground mt-4 mb-2 border-b border-border/70 pb-1" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-sm font-extrabold text-primary uppercase tracking-wide mt-3 mb-1.5" {...props} />
  ),
  h4: ({ node, ...props }: any) => (
    <h4 className="text-xs font-bold text-foreground mt-2 mb-1" {...props} />
  ),
  p: ({ node, ...props }: any) => (
    <p className="mb-2 leading-relaxed text-xs sm:text-[13px] last:mb-0" {...props} />
  ),
  strong: ({ node, ...props }: any) => (
    <strong className="font-extrabold text-foreground" {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <em className="italic text-foreground/90" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="list-disc list-inside space-y-1 my-2 text-xs sm:text-[13px] pl-2" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="list-decimal list-inside space-y-1 my-2 text-xs sm:text-[13px] pl-2" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="leading-relaxed" {...props} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-primary bg-primary/5 p-3 rounded-r-xl my-3 text-xs text-foreground font-medium italic" {...props} />
  ),
  table: ({ node, ...props }: any) => (
    <div className="w-full overflow-x-auto my-4 rounded-xl border border-border bg-card shadow-xs">
      <table className="w-full text-center border-collapse text-xs" {...props} />
    </div>
  ),
  thead: ({ node, ...props }: any) => (
    <thead className="bg-muted/40 border-b border-border text-foreground font-bold" {...props} />
  ),
  tbody: ({ node, ...props }: any) => (
    <tbody className="divide-y divide-border" {...props} />
  ),
  tr: ({ node, ...props }: any) => (
    <tr className="hover:bg-muted/20 transition-colors" {...props} />
  ),
  th: ({ node, ...props }: any) => (
    <th className="p-2.5 border-r border-border last:border-r-0 font-extrabold whitespace-nowrap align-middle" {...props} />
  ),
  td: ({ node, ...props }: any) => (
    <td className="p-2.5 border-r border-border last:border-r-0 align-middle font-medium" {...props} />
  ),
  img: (props: any) => <ZoomableExamImage {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline) {
      return <code className="bg-muted/60 text-primary px-1.5 py-0.5 rounded text-[11px] font-mono font-bold" {...props}>{children}</code>;
    }
    return (
      <div className="my-3 rounded-xl bg-slate-900 text-slate-100 p-3 overflow-x-auto font-mono text-xs border border-slate-800">
        <code {...props}>{children}</code>
      </div>
    );
  }
};

const remarkPlugins = [remarkMath, remarkGfm];
const rehypePlugins: any[] = [[rehypeKatex, { throwOnError: false, strict: false }]];

function MathRendererComponent({ content, className = '' }: MathRendererProps) {
  if (!content) return null;

  // Lọc sạch mọi tàn dư JSON lồng nhau nếu có
  let sanitized = content;
  if (
    typeof sanitized === 'string' &&
    (sanitized.includes('{"id":') || sanitized.includes('{"text":') || sanitized.includes('{\\"id\\":') || sanitized.trim().startsWith('{'))
  ) {
    sanitized = cleanOptionText(sanitized);
  }

  let text = String(sanitized);

  // 1. Chuyển đổi thẻ HTML <img> sang định dạng chuẩn Markdown ![alt](url)
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '\n\n![$2]($1)\n\n');
  text = text.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '\n\n![Hình minh họa]($1)\n\n');

  // 2. Sửa lỗi khoảng trắng trong cú pháp Markdown: ![alt] (url) -> ![alt](url)
  text = text.replace(/!\[(.*?)\]\s+\((https?:\/\/[^\s\)]+)\)/g, '\n\n![$1]($2)\n\n');

  // 3. Tự động nhận diện đường dẫn ảnh Cloudinary trần đứng độc lập và bọc thành Markdown hình ảnh
  // Tránh bọc nhầm khi URL đã nằm trong (url)
  text = text.replace(/(?<!\()https:\/\/res\.cloudinary\.com\/[^\s\)]+/g, (match) => {
    return `\n\n![Hình minh họa](${match})\n\n`;
  });

  // 4. Xử lý các khối cảnh báo GitHub Alert [!NOTE], [!IMPORTANT], [!WARNING], [!TIP]
  const cleanContent = text
    .replace(/^>\s*\[!NOTE\]/gim, '> **Lưu ý:**')
    .replace(/^>\s*\[!IMPORTANT\]/gim, '> **Quan trọng:**')
    .replace(/^>\s*\[!WARNING\]/gim, '> **Chú ý:**')
    .replace(/^>\s*\[!TIP\]/gim, '> **Mẹo:**');

  return (
    <div className={`markdown-body math-content font-sans leading-relaxed text-foreground break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}

// Tối ưu hóa: React.memo ngăn chặn việc re-parse Markdown & KaTeX khi prop content và className không đổi
export default memo(MathRendererComponent, (prev, next) => {
  return prev.content === next.content && prev.className === next.className;
});
