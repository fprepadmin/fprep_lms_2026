'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
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
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-black text-foreground mt-4 mb-2 border-b border-border pb-1" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-black text-foreground mt-4 mb-2 border-b border-border/70 pb-1" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-sm font-extrabold text-primary uppercase tracking-wide mt-3 mb-1.5" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-bold text-foreground mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2 leading-relaxed text-xs sm:text-[13px] last:mb-0" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-extrabold text-foreground" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-foreground/90" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-xs sm:text-[13px] pl-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-xs sm:text-[13px] pl-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-primary bg-primary/5 p-3 rounded-r-xl my-3 text-xs text-foreground font-medium italic" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="w-full overflow-x-auto my-4 rounded-xl border border-border bg-card shadow-xs">
              <table className="w-full text-center border-collapse text-xs" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted/40 border-b border-border text-foreground font-bold" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-border" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-muted/20 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="p-2.5 border-r border-border last:border-r-0 font-extrabold whitespace-nowrap align-middle" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="p-2.5 border-r border-border last:border-r-0 align-middle font-medium" {...props} />
          ),
          img: ({ node, ...props }) => {
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
              <pre className="bg-muted/40 border border-border rounded-xl p-3 my-2 overflow-x-auto text-[11px] font-mono">
                <code {...props}>{children}</code>
              </pre>
            );
          }
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
