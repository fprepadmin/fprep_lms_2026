'use client';

import React from 'react';
import MathRenderer from '@/components/MathRenderer';
import { CheckCircle2, XCircle, Lightbulb, HelpCircle, ArrowRight } from 'lucide-react';

interface StructuredExplanationProps {
  content: string;
  className?: string;
}

interface ParsedItem {
  id: string;
  label: string | null;
  status: 'CORRECT' | 'INCORRECT' | null;
  text: string;
}

export function parseExplanationContent(rawContent: any): ParsedItem[] {
  if (!rawContent) return [];

  // 1. Xử lý nếu rawContent là Object hoặc Array trực tiếp (từ JSON nạp vào)
  if (typeof rawContent === 'object' && rawContent !== null) {
    if (Array.isArray(rawContent)) {
      return rawContent.map((item, idx) => {
        const id = item.id || item.label || String.fromCharCode(97 + idx);
        const rawText = item.text || item.content || item.explanation || String(item);
        const cleanLetter = String(id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        let body = String(rawText).trim();
        let status: 'CORRECT' | 'INCORRECT' | null = null;

        if (/^(Đúng|Chính xác)\b/i.test(body)) {
          status = 'CORRECT';
          body = body.replace(/^(Đúng|Chính xác)[\,\.\:\-]?\s*/i, '');
        } else if (/^(Sai|Không đúng|Không chính xác)\b/i.test(body)) {
          status = 'INCORRECT';
          body = body.replace(/^(Sai|Không đúng|Không chính xác)[\,\.\:\-]?\s*/i, '');
        }

        return {
          id: `item-${idx}`,
          label: cleanLetter ? `Ý ${cleanLetter}` : null,
          status,
          text: body
        };
      });
    }

    // Object dạng { a: "...", b: "..." }
    return Object.entries(rawContent).map(([key, val], idx) => {
      const cleanLetter = String(key).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      let body = String(val).trim();
      let status: 'CORRECT' | 'INCORRECT' | null = null;

      if (/^(Đúng|Chính xác)\b/i.test(body)) {
        status = 'CORRECT';
        body = body.replace(/^(Đúng|Chính xác)[\,\.\:\-]?\s*/i, '');
      } else if (/^(Sai|Không đúng|Không chính xác)\b/i.test(body)) {
        status = 'INCORRECT';
        body = body.replace(/^(Sai|Không đúng|Không chính xác)[\,\.\:\-]?\s*/i, '');
      }

      return {
        id: `item-${idx}`,
        label: cleanLetter ? `Ý ${cleanLetter}` : `Ý ${idx + 1}`,
        status,
        text: body
      };
    });
  }

  let text = String(rawContent).trim();
  if (!text) return [];

  // 2. Nếu là chuỗi JSON: giải mã JSON an toàn
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        return parseExplanationContent(parsed);
      }
    } catch (e) {
      // Tiếp tục xử lý như text thường nếu không parse được
    }
  }

  // 3. Chuẩn hóa các ký tự xuống dòng escaped
  text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  // 4. Kiểm tra xem có cấu trúc phân chia các ý a., b., c., d. / a), b), c), d. / Ý a:, Ý b: / a đúng, b sai...
  const pattern = /(?:^|\r?\n|\s{2,}|(?<=[.!?])\s+|(?<=;)\s*)(?=(?:(?:\b[a-dA-D]\b|Ý\s*[a-dA-D])[\.\:\)]|(?<!(?:đáp án|phương án|chọn|mệnh đề)\s+)(?:\b[a-dA-D]\s+(?:đúng|sai|chính xác|không đúng)\b)))/gi;

  const parts = text.split(pattern).map(p => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    return parts.map((part, index) => {
      // Regex trích xuất tiền tố như: "a.", "B)", "Ý c:", hoặc "a đúng", "b sai"
      let match = part.match(/^((?:[a-dA-D]|Ý\s*[a-dA-D])[\.\:\)])\s*([\s\S]*)/i);
      let rawLabel = '';
      let body = '';
      let status: 'CORRECT' | 'INCORRECT' | null = null;

      if (match) {
        rawLabel = match[1].replace(/[\.\:\)]/g, '').trim();
        body = match[2].trim();
      } else {
        // Kiểm tra dạng "a đúng...", "b sai..."
        const matchAlt = part.match(/^([a-dA-D])\s+(đúng|sai|chính xác|không đúng)\b[\,\.\:\-]?\s*([\s\S]*)/i);
        if (matchAlt) {
          rawLabel = matchAlt[1].trim();
          const stStr = matchAlt[2].toLowerCase();
          status = (stStr === 'đúng' || stStr === 'chính xác') ? 'CORRECT' : 'INCORRECT';
          body = matchAlt[3].trim();
        } else {
          body = part;
        }
      }

      if (rawLabel) {
        if (!status) {
          if (/^(Đúng|Chính xác)\b/i.test(body)) {
            status = 'CORRECT';
            body = body.replace(/^(Đúng|Chính xác)[\,\.\:\-]?\s*/i, '');
          } else if (/^(Sai|Không đúng|Không chính xác)\b/i.test(body)) {
            status = 'INCORRECT';
            body = body.replace(/^(Sai|Không đúng|Không chính xác)[\,\.\:\-]?\s*/i, '');
          }
        }

        const cleanLetter = rawLabel.replace(/^Ý\s*/i, '').toUpperCase();
        return {
          id: `item-${index}`,
          label: `Ý ${cleanLetter}`,
          status,
          text: body
        };
      }

      return {
        id: `item-${index}`,
        label: null,
        status: null,
        text: part
      };
    });
  }

  // 5. Nếu không có ký tự a, b, c, d nhưng có ngắt dòng (newline)
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.map((line, index) => {
      // Kiểm tra gạch đầu dòng hoặc số
      const bulletMatch = line.match(/^([•\-\*]|\d+[\.\)])\s*([\s\S]*)/);
      if (bulletMatch) {
        return {
          id: `line-${index}`,
          label: bulletMatch[1].includes('.') ? `Mục ${bulletMatch[1]}` : null,
          status: null,
          text: bulletMatch[2].trim()
        };
      }
      return {
        id: `line-${index}`,
        label: null,
        status: null,
        text: line
      };
    });
  }

  // 6. Đoạn văn đơn lẻ thông thường
  return [
    {
      id: 'single',
      label: null,
      status: null,
      text
    }
  ];
}

export default function StructuredExplanation({ content, className = '' }: StructuredExplanationProps) {
  if (!content) return null;

  const items = parseExplanationContent(content);
  const isMultiItem = items.length > 1;

  return (
    <div className={`rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-4 sm:p-5 space-y-3.5 shadow-xs ${className}`}>
      
      {/* Tiêu đề mục lời giải */}
      <div className="flex items-center gap-2 text-primary font-black text-xs sm:text-sm border-b border-blue-200/50 dark:border-blue-900/40 pb-2.5">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Lightbulb className="w-3.5 h-3.5 text-primary" />
        </div>
        <span>Hướng dẫn giải chi tiết & Phân tích đáp án</span>
      </div>

      {/* Hiển thị các ý tách biệt xuống dòng rõ ràng */}
      <div className="space-y-2.5">
        {items.map((item) => {
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                item.label
                  ? 'bg-background/90 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-primary/40'
                  : 'bg-transparent border-transparent p-0'
              }`}
            >
              {item.label && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {/* Nhãn Ý (Ý A, Ý B, Ý C, Ý D) */}
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 font-black text-xs border border-blue-600/20 shrink-0">
                    {item.label}
                  </span>

                  {/* Nhãn Đúng / Sai trực quan */}
                  {item.status === 'CORRECT' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ĐÚNG
                    </span>
                  )}

                  {item.status === 'INCORRECT' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 font-extrabold text-[11px] border border-rose-500/30 shrink-0">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      SAI
                    </span>
                  )}
                </div>
              )}

              {/* Nội dung giải thích chi tiết có hỗ trợ KaTeX Math */}
              <div className="text-xs sm:text-[13px] text-foreground leading-relaxed font-medium pl-0.5">
                <MathRenderer content={item.text} />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
