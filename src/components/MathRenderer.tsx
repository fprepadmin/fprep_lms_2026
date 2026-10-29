'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

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
  img: ({ node, ...props }: any) => {
    if (!props.src || typeof props.src !== 'string' || props.src.trim() === '') {
      return null;
    }
    return (
      <img
        {...props}
        className="max-w-full h-auto rounded-xl border border-border my-3 block shadow-xs mx-auto"
        alt={props.alt || 'Hình minh họa'}
        loading="lazy"
      />
    );
  },
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
const rehypePlugins = [rehypeKatex];

function MathRendererComponent({ content, className = '' }: MathRendererProps) {
  if (!content) return null;

  // Xử lý các khối cảnh báo GitHub Alert [!NOTE], [!IMPORTANT], [!WARNING], [!TIP]
  const cleanContent = String(content)
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
