'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string | any;
  className?: string;
}

// Bộ nhớ đệm cache kết quả làm sạch công thức toán học giúp tăng tốc độ render x10 trên iPad/Mobile
const mathCleanCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1500;

/**
 * Hàm làm sạch, chuẩn hóa công thức toán và định dạng lời giải:
 * 1. Tách các ý a, b, c, d trong câu đúng/sai xuống từng dòng riêng biệt (\n\n**a)** ...)
 * 2. Khôi phục các công thức LaTeX bị lỗi control characters (\ne, \neq, \times...)
 * 3. Chuẩn hóa ký hiệu "khác" (≠, \ne, \neq, !=) cả trong và ngoài công thức toán
 * 4. Bảo toàn xuống dòng chuẩn Markdown
 */
export function cleanMathContent(content: any): string {
  if (content === undefined || content === null) return '';

  if (typeof content === 'string') {
    const cached = mathCleanCache.get(content);
    if (cached !== undefined) return cached;
  }

  // 1. Nếu content là object { a: ..., b: ... }
  if (typeof content === 'object') {
    try {
      const keys = ['a', 'b', 'c', 'd'];
      const hasSubKeys = keys.some(k => k in content || k.toUpperCase() in content);
      if (hasSubKeys) {
        return keys
          .filter(k => content[k] || content[k.toUpperCase()])
          .map(k => `**${k})** ${cleanMathContent(content[k] || content[k.toUpperCase()])}`)
          .join('\n\n');
      }
      return JSON.stringify(content, null, 2);
    } catch (e) {
      return String(content);
    }
  }

  let text = String(content).trim();

  // 2. Nếu là chuỗi JSON của một object { "a": ..., "b": ... }
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        const keys = ['a', 'b', 'c', 'd'];
        if (keys.some(k => k in parsed || k.toUpperCase() in parsed)) {
          return keys
            .filter(k => parsed[k] || parsed[k.toUpperCase()])
            .map(k => `**${k})** ${cleanMathContent(parsed[k] || parsed[k.toUpperCase()])}`)
            .join('\n\n');
        }
      }
    } catch (e) {
      // Bỏ qua nếu không phải JSON
    }
  }

  // 3. Xử lý các khối cảnh báo GitHub Alert [!NOTE], [!IMPORTANT], [!WARNING], [!TIP]
  text = text
    .replace(/^>\s*\[!NOTE\]/gim, '> **Lưu ý:**')
    .replace(/^>\s*\[!IMPORTANT\]/gim, '> **Quan trọng:**')
    .replace(/^>\s*\[!WARNING\]/gim, '> **Chú ý:**')
    .replace(/^>\s*\[!TIP\]/gim, '> **Mẹo:**');

  // 3.1. Chuyển đổi cú pháp LaTeX chuẩn \( ... \) -> $ ... $ và \[ ... \] -> $$ ... $$
  text = text
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // 4. Khôi phục các công thức LaTeX và chuẩn hóa ký hiệu toán học trong $$ ... $$ hoặc $ ... $
  text = text.replace(/(\$\$[^\$]+\$\$|\$[^\$]+\$)/g, (match) => {
    const isDouble = match.startsWith('$$');
    const formula = isDouble ? match.slice(2, -2) : match.slice(1, -1);

    let healed = formula
      // Khôi phục control characters do JSON escape
      .replace(/\n\s*eq\b/g, ' \\neq ')
      .replace(/\n\s*e\b/g, ' \\ne ')
      .replace(/\n\s*notin\b/g, ' \\notin ')
      .replace(/\n\s*nabla\b/g, ' \\nabla ')
      .replace(/\t\s*imes\b/g, ' \\times ')
      .replace(/\t\s*o\b/g, ' \\to ')
      .replace(/\t\s*an\b/g, ' \\tan ')
      .replace(/\t\s*heta\b/g, ' \\theta ')
      .replace(/\f\s*rac\b/g, ' \\dfrac ')
      .replace(/\f\s*orall\b/g, ' \\forall ')
      .replace(/[\b]\s*ar\b/g, ' \\bar ')
      .replace(/[\b]\s*egin\b/g, ' \\begin ')
      .replace(/[\b]\s*eta\b/g, ' \\beta ')
      // Chuẩn hóa phân số
      .replace(/\\frac\b/g, '\\dfrac')
      // Chuẩn hóa vector
      .replace(/\\+vec\{([^}]+)\}/g, '\\overrightarrow{$1}')
      .replace(/\\+vec\s*([a-zA-Z0-9])/g, '\\overrightarrow{$1}')
      // CHUẨN HÓA DẤU KHÁC (\neq):
      // Xử lý các dạng gõ sai phổ biến: /=, / =, \not=, !=, <>, ≠, \ne -> tất cả thành \neq
      .replace(/\s*\/\s*=\s*/g, ' \\neq ')
      .replace(/\\not\s*=/g, ' \\neq ')
      .replace(/\s*!=\s*/g, ' \\neq ')
      .replace(/\s*<>\s*/g, ' \\neq ')
      .replace(/≠/g, ' \\neq ')
      .replace(/\\ne\b/g, '\\neq')
      .replace(/\\neq/g, ' \\neq ')
      .replace(/\s{2,}/g, ' ');

    return isDouble ? `$$${healed.trim()}$$` : `$${healed.trim()}$`;
  });

  // 5. Chuẩn hóa ngoài công thức toán ($...$)
  const parts = text.split(/(\$\$[^\$]+\$\$|\$[^\$]+\$)/g);
  text = parts.map((part, index) => {
    if (index % 2 === 1) return part;
    return part
      .replace(/\\+vec\{([^}]+)\}/g, '$\\overrightarrow{$1}$')
      .replace(/\\+vec\s*([a-zA-Z0-9])/g, '$\\overrightarrow{$1}$')
      .replace(/\\(?:ne|neq)\b/g, '≠')
      .replace(/\\not\s*=/g, '≠')
      .replace(/\s*\/\s*=\s*/g, ' ≠ ')
      .replace(/\s*!=\s*/g, ' ≠ ')
      .replace(/\s*<>\s*/g, ' ≠ ');
  }).join('');

  // 6. Định dạng lời giải câu Đúng/Sai: Tách các ý a, b, c, d xuống dòng riêng biệt
  // 6.1. Mẫu có từ khóa rõ ràng: Ý a, Mệnh đề a, Câu a kèm dấu :, ), ., -
  text = text.replace(/(?<![\p{L}\p{N}])(?:[-•*]\s*)?(Ý|Mệnh đề|Câu)\s*([a-dA-D])\s*[:.)-]\s+/giu, (match, prefixWord, key, offset) => {
    const p = offset === 0 ? '' : '\n\n';
    return `${p}**${prefixWord.trim()} ${key.toLowerCase()}:** `;
  });

  // 6.2. Mẫu dạng ngoặc độc lập: a), b), c), d) hoặc [a], [b], [c], [d] hoặc (a), (b), (c), (d)
  // BẮT BUỘC: Không có chữ cái/số dính liền phía trước (?<![\p{L}\p{N}]) để tránh bắt nhầm các từ như (nước), (khác), lúc)...
  text = text.replace(/(?<![\p{L}\p{N}])(?:[-•*]\s*)?(?:\[([a-dA-D])\]|\(([a-dA-D])\)|([a-dA-D])\))\s*[:.-]?\s+/gu, (match, p1, p2, p3, offset) => {
    const key = (p1 || p2 || p3).toLowerCase();
    const p = offset === 0 ? '' : '\n\n';
    return `${p}**${key})** `;
  });

  // 6.3. Mẫu dạng chấm: a., b., c., d.
  // CHỈ chấp nhận khi ở ĐẦU DÒNG (^|\n) hoặc sau bullet (-•*) HOẶC theo sau trực tiếp bởi chữ Đúng/Sai
  // TUYỆT ĐỐI không bắt nhầm các từ tiếng Việt kết thúc bằng "c." như "lúc.", "nước.", "khác.", "được.", "thuộc.", "góc."...
  text = text.replace(/(?:^|\n)\s*(?:[-•*]\s*)?([a-dA-D])\.\s+/gu, (match, p1, offset) => {
    const key = p1.toLowerCase();
    const p = offset === 0 ? '' : '\n\n';
    return `${p}**${key})** `;
  });

  text = text.replace(/(?<![\p{L}\p{N}])([a-dA-D])\.\s+(?=(?:Đúng|Sai|đúng|sai)\b)/gu, (match, p1, offset) => {
    const key = p1.toLowerCase();
    const p = offset === 0 ? '' : '\n\n';
    return `${p}**${key})** `;
  });

  // Dọn dẹp dòng trống thừa
  text = text.replace(/\n{3,}/g, '\n\n');

  // 7. Bảo toàn xuống dòng thông thường trong văn bản (dòng đơn \n biến thành 2 space + \n để markdown ngắt dòng)
  text = text
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('|') || line.trim().startsWith('```') || line.endsWith('  ')) {
        return line;
      }
      return line + '  ';
    })
    .join('\n');

  const result = text.trim();
  if (typeof content === 'string') {
    if (mathCleanCache.size >= MAX_CACHE_SIZE) {
      mathCleanCache.clear();
    }
    mathCleanCache.set(content, result);
  }

  return result;
}

function MathRendererInner({ content, className = '' }: MathRendererProps) {
  if (!content) return null;

  const cleanContent = cleanMathContent(content);

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
              <figure className="my-3.5 flex flex-col items-center justify-center">
                <img
                  {...props}
                  className="max-w-full md:max-w-[85%] lg:max-w-[75%] h-auto rounded-xl border border-border/80 bg-white shadow-xs block mx-auto transition-transform hover:scale-[1.01]"
                  alt={props.alt || 'Hình minh họa'}
                  loading="lazy"
                />
                {props.alt && props.alt !== 'Hình minh họa' && (
                  <figcaption className="text-[11px] font-semibold text-muted-foreground mt-1.5 text-center italic">
                    {props.alt}
                  </figcaption>
                )}
              </figure>
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

const MathRenderer = React.memo(MathRendererInner);
export default MathRenderer;
