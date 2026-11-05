/**
 * examTransformUtils.ts
 * Module chuyên trách chuyển đổi đề thi sang định dạng chuẩn 3 phần của Bộ GD&ĐT 2025/2026 (Dạng 2).
 * Hỗ trợ tạo Prompt AI số hóa đề thi chuyên nghiệp cho các môn Khoa học Tự nhiên THPT Quốc Gia 2026.
 */

import { cleanOptionText, parseOptions } from './questionUtils';

export interface StandardQuestionMcq {
  type: 'multiple_choice';
  content: string;
  options: string[];
  correctAnswer: number; // 0=A, 1=B, 2=C, 3=D
  explanation: string;
}

export interface StandardStatement {
  label: 'a' | 'b' | 'c' | 'd';
  statement: string;
  isCorrect: boolean;
}

export interface StandardQuestionTf {
  type: 'true_false';
  content: string;
  statements: StandardStatement[];
  explanation: string;
}

export interface StandardQuestionSaq {
  type: 'short_answer';
  content: string;
  shortAnswerCorrect: string;
  shortAnswerAccepted: string[];
  explanation: string;
}

export type StandardQuestion = StandardQuestionMcq | StandardQuestionTf | StandardQuestionSaq;

export interface StandardExamJson {
  title: string;
  description: string;
  subjectId?: string;
  mode: 'exam';
  durationMinutes: number;
  passPercentage: number;
  questions: StandardQuestion[];
}

/**
 * Loại bỏ tiền tố A., B., C., D. hoặc 1., 2. ở đầu nội dung phương án
 */
export function cleanOptionPrefix(text: string): string {
  if (!text) return '';
  return text.replace(/^[\(\[]?([A-Da-d1-4])[\.\)\:\-\]]\s*/i, '').trim();
}

/**
 * Tạo danh sách các dạng đáp án chấp nhận được cho câu hỏi trả lời ngắn (SAQ)
 * Ví dụ: "21" -> ["21", "21.0", "21,0"]
 *        "21.5" -> ["21.5", "21,5"]
 */
export function generateAcceptedAnswers(correctAnswer: string): string[] {
  const clean = String(correctAnswer ?? '').trim();
  if (!clean) return [];

  const results = new Set<string>();
  results.add(clean);

  // Nếu là số thực hoặc số nguyên
  const normalizedNumStr = clean.replace(',', '.');
  const num = Number(normalizedNumStr);

  if (!isNaN(num) && clean.match(/^[+-]?\d+([.,]\d+)?$/)) {
    // Nếu là số nguyên (ví dụ 21)
    if (Number.isInteger(num)) {
      results.add(String(num));
      results.add(`${num}.0`);
      results.add(`${num},0`);
    } else {
      // Số thập phân
      results.add(normalizedNumStr);
      results.add(normalizedNumStr.replace('.', ','));
    }
  }

  return Array.from(results);
}

/**
 * Biến đổi một câu hỏi trong CSDL / Editor sang định dạng chuẩn Bộ GD&ĐT 2026
 */
export function transformQuestionToStandard(q: any, index?: number): StandardQuestion {
  // 1. Xác định dạng câu hỏi
  const rawType = String(q.type || q.question_type || '').toLowerCase();
  const isTf = rawType === 'tf' || rawType === 'true_false' || rawType === 'dung_sai';
  const isSaq = rawType === 'saq' || rawType === 'short_answer' || rawType === 'dien_khuyet';

  const content = (q.content || '').trim();
  const explanation = (q.explanation || '').trim();

  // DẠNG 1: Trắc nghiệm 4 lựa chọn (multiple_choice)
  if (!isTf && !isSaq) {
    const rawOpts = parseOptions(q.options, 'mcq');
    let optsStrings: string[] = [];

    if (rawOpts.length > 0) {
      optsStrings = rawOpts.slice(0, 4).map((o: any) => cleanOptionPrefix(cleanOptionText(o.text)));
    } else if (Array.isArray(q.options)) {
      optsStrings = q.options.slice(0, 4).map((o: any) => cleanOptionPrefix(cleanOptionText(o)));
    }

    // Đảm bảo đủ 4 phương án
    while (optsStrings.length < 4) {
      optsStrings.push('');
    }

    // Xác định correctAnswer (0, 1, 2, 3)
    let caIdx = 0;
    const rawCa = q.correct_answer !== undefined ? q.correct_answer 
      : (q.correctAnswer !== undefined ? q.correctAnswer : q.correct_option_index);

    if (typeof rawCa === 'number' && rawCa >= 0 && rawCa < 4) {
      caIdx = rawCa;
    } else if (typeof rawCa === 'string') {
      const up = rawCa.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(up)) {
        caIdx = ['A', 'B', 'C', 'D'].indexOf(up);
      } else if (['0', '1', '2', '3'].includes(up)) {
        caIdx = Number(up);
      }
    } else if (q.correct_option_index !== undefined && q.correct_option_index !== null) {
      const idx = Number(q.correct_option_index);
      if (!isNaN(idx) && idx >= 0 && idx < 4) caIdx = idx;
    }

    return {
      type: 'multiple_choice',
      content,
      options: optsStrings,
      correctAnswer: caIdx,
      explanation
    };
  }

  // DẠNG 2: Trắc nghiệm Đúng/Sai đa mệnh đề (true_false)
  if (isTf) {
    const rawOpts = parseOptions(q.options, 'tf');
    const labels: ('a' | 'b' | 'c' | 'd')[] = ['a', 'b', 'c', 'd'];

    // Lấy đáp án đúng/sai
    let tfMap: Record<string, boolean> = { a: false, b: false, c: false, d: false };
    const rawCa = q.correct_answer ?? q.correctAnswer;

    if (typeof rawCa === 'object' && rawCa !== null && !Array.isArray(rawCa)) {
      labels.forEach(l => {
        tfMap[l] = Boolean(rawCa[l] ?? rawCa[l.toUpperCase()] ?? false);
      });
    } else if (Array.isArray(rawCa)) {
      labels.forEach((l, idx) => {
        tfMap[l] = Boolean(rawCa[idx]);
      });
    } else if (typeof rawCa === 'string') {
      // Phân tích chuỗi "Đ-S-Đ-S" hoặc "True, False..."
      const tokens = rawCa.split(/[\s,\-\/\|;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      labels.forEach((l, idx) => {
        const val = tokens[idx];
        tfMap[l] = val === 'true' || val === 'đúng' || val === 'dung' || val === 'đ' || val === 'd' || val === '1';
      });
    }

    // Nếu q có mảng statements sẵn (từ import)
    if (Array.isArray(q.statements) && q.statements.length > 0) {
      const statements: StandardStatement[] = labels.map((l, idx) => {
        const stmtObj = q.statements.find((s: any) => String(s.label || '').toLowerCase() === l) || q.statements[idx];
        return {
          label: l,
          statement: cleanOptionPrefix(cleanOptionText(stmtObj?.statement ?? stmtObj?.text ?? '')),
          isCorrect: Boolean(stmtObj?.isCorrect ?? tfMap[l])
        };
      });

      return {
        type: 'true_false',
        content,
        statements,
        explanation
      };
    }

    const statements: StandardStatement[] = labels.map((l, idx) => {
      const opt = rawOpts.find(o => o.id.toLowerCase() === l) || rawOpts[idx];
      const stmtText = opt ? cleanOptionPrefix(cleanOptionText(opt.text)) : '';
      return {
        label: l,
        statement: stmtText,
        isCorrect: Boolean(tfMap[l])
      };
    });

    return {
      type: 'true_false',
      content,
      statements,
      explanation
    };
  }

  // DẠNG 3: Trắc nghiệm trả lời ngắn (short_answer)
  const caStr = String(q.correct_answer ?? q.correctAnswer ?? q.shortAnswerCorrect ?? '').trim();
  let acceptedList: string[] = [];

  if (Array.isArray(q.shortAnswerAccepted) && q.shortAnswerAccepted.length > 0) {
    acceptedList = q.shortAnswerAccepted.map((s: any) => String(s).trim());
  } else {
    acceptedList = generateAcceptedAnswers(caStr);
  }

  return {
    type: 'short_answer',
    content,
    shortAnswerCorrect: caStr,
    shortAnswerAccepted: acceptedList,
    explanation
  };
}

/**
 * Biến đổi toàn bộ Đề thi và Câu hỏi sang cấu trúc JSON chuẩn Bộ GD&ĐT 2026 (Dạng 2)
 */
export function transformExamToStandardJson(
  exam: any,
  questions: any[]
): StandardExamJson {
  // Sắp xếp câu hỏi theo thứ tự (order_index) nếu có
  const sorted = [...(questions || [])].sort((a, b) => {
    const oa = a.order_index ?? 0;
    const ob = b.order_index ?? 0;
    return oa - ob;
  });

  const transformedQuestions = sorted.map((q, idx) => transformQuestionToStandard(q, idx));

  return {
    title: (exam?.title || 'Đề thi chuẩn cấu trúc 3 phần').trim(),
    description: (exam?.description || 'Bao gồm: Trắc nghiệm 4 lựa chọn, Đúng/Sai, và Trả lời ngắn').trim(),
    subjectId: exam?.subject_id || exam?.subjectId || undefined,
    mode: 'exam',
    durationMinutes: Number(exam?.duration_minutes ?? exam?.durationMinutes ?? 50),
    passPercentage: Number(exam?.pass_percentage ?? exam?.passPercentage ?? 50),
    questions: transformedQuestions
  };
}

/**
 * Tạo Prompt AI chuyên nghiệp tích hợp JSON đề thi chuẩn 2026
 */
export function formatStandardJsonWithPrompt(standardJson: StandardExamJson): string {
  const jsonString = JSON.stringify(standardJson, null, 2);

  return `Bạn là một Trợ lý số hóa đề thi chuyên nghiệp cho các môn Khoa học Tự nhiên (Toán, Vật lý, Hóa học, Sinh học, Tin học) THPT Quốc gia 2026.
Nhiệm vụ của bạn: Đọc toàn bộ tài liệu đề thi (từ file PDF, hình ảnh chụp hoặc văn bản) và chuyển đổi 100% chính xác thành một tệp JSON theo CẤU TRÚC 3 PHẦN CHUẨN CỦA BỘ GD&ĐT 2025/2026.

================ CẤU TRÚC JSON TIÊU CHUẨN (FORMAT MỚI 2025/2026) ================
${jsonString}

================ QUY TẮC CHUYỂN ĐỔI NGHIÊM NGẶT ================
1. CÔNG THỨC TOÁN / LÝ / HÓA: BẮT BUỘC viết bằng cú pháp KaTeX chuẩn và đặt trong cặp dấu $...$ (Ví dụ: $f'(x) = 0$, $\\int_0^2 x dx$, $\\lim_{x \\to 0}$, $\\sqrt{x^2+1}$, $\\vec{a} \\cdot \\vec{b}$, $H_2SO_4$, $Al^{3+}$).
2. TRÍCH XUẤT ĐẦY ĐỦ 100%: Không được tóm tắt, không được bỏ bớt câu nào trong đề.
3. ĐÁP ÁN:
   - Dạng 4 lựa chọn: "correctAnswer" là số nguyên từ 0 đến 3 (0=A, 1=B, 2=C, 3=D).
   - Dạng Đúng/Sai: Mảng "statements" đủ 4 ý a, b, c, d với "isCorrect" chuẩn xác.
   - Dạng Trả lời ngắn: "shortAnswerCorrect" chứa kết quả số nguyên hoặc số thập phân.
4. LỜI GIẢI ("explanation"): Ghi rõ ràng từng bước giải thích để học sinh đối chiếu sau khi thi.
5. ĐỊNH DẠNG ĐẦU RA: CHỈ XUẤT DUY NHẤT MÃ JSON trong khối \`\`\`json ... \`\`\`.

Bây giờ, hãy đọc tài liệu đề thi tôi gửi và tạo ra mã JSON hoàn hảo!`;
}

/**
 * Mẫu Prompt chuẩn Bộ GD&ĐT 2026 với ví dụ mẫu (khi chưa có đề thi cụ thể)
 */
export const AI_PROMPT_BGD_2026 = `Bạn là một Trợ lý số hóa đề thi chuyên nghiệp cho các môn Khoa học Tự nhiên (Toán, Vật lý, Hóa học, Sinh học, Tin học) THPT Quốc gia 2026.
Nhiệm vụ của bạn: Đọc toàn bộ tài liệu đề thi (từ file PDF, hình ảnh chụp hoặc văn bản) và chuyển đổi 100% chính xác thành một tệp JSON theo CẤU TRÚC 3 PHẦN CHUẨN CỦA BỘ GD&ĐT 2025/2026.

================ CẤU TRÚC JSON TIÊU CHUẨN (FORMAT MỚI 2025/2026) ================
{
  "title": "Đề thi thử THPT Quốc gia 2026",
  "description": "Đề thi chuẩn cấu trúc 3 phần: Trắc nghiệm 4 phương án, Đúng/Sai đa mệnh đề và Trả lời ngắn",
  "subjectId": "sub_1791685000873",
  "mode": "exam",
  "durationMinutes": 50,
  "passPercentage": 50,
  "questions": [
    // ── PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN (0.25 điểm / câu) ──
    {
      "type": "multiple_choice",
      "content": "Cho hàm số $y = f(x)$ có bảng biến thiên như sau... Giá trị cực đại của hàm số đã cho bằng:",
      "options": [
        "$-1$",
        "$3$",
        "$2$",
        "$0$"
      ],
      "correctAnswer": 1, // 0=A, 1=B, 2=C, 3=D
      "explanation": "Dựa vào bảng biến thiên, tại điểm $x = 1$, hàm số đạt cực đại với giá trị cực đại $y_{CĐ} = 3$."
    },

    // ── PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (4 Ý a, b, c, d - TÍNH ĐIỂM BẬC THANG 0.1 - 0.25 - 0.5 - 1.0 điểm) ──
    {
      "type": "true_false",
      "content": "Cho hàm số $y = f(x) = ax^3 + bx^2 + cx + d$ có đồ thị $(C)$. Xét tính đúng / sai của các mệnh đề sau:",
      "statements": [
        {
          "label": "a",
          "statement": "Hàm số đồng biến trên khoảng $(-\\infty; -1)$ và $(1; +\\infty)$.",
          "isCorrect": true // true nếu Đúng, false nếu Sai
        },
        {
          "label": "b",
          "statement": "Đồ thị hàm số có điểm cực tiểu là $(1; -2)$.",
          "isCorrect": true
        },
        {
          "label": "c",
          "statement": "Phương trình tiếp tuyến của $(C)$ tại điểm có hoành độ $x = 0$ có hệ số góc bằng $3$.",
          "isCorrect": false
        },
        {
          "label": "d",
          "statement": "Tổng giá trị $a + b + c + d = 4$.",
          "isCorrect": false
        }
      ],
      "explanation": "Lời giải chi tiết:\na) Đạo hàm $f'(x) > 0$ trên các khoảng đồng biến (Đúng).\nb) Điểm cực tiểu có tọa độ $(1; -2)$ (Đúng).\nc) Hệ số góc $k = f'(0) = -3$ (Sai).\nd) Ta tìm được $a=1, b=0, c=-3, d=0 \\Rightarrow a+b+c+d = -2$ (Sai)."
    },

    // ── PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN / ĐIỀN KẾT QUẢ (0.25 - 0.5 điểm / câu) ──
    {
      "type": "short_answer",
      "content": "Một chất điểm chuyển động với phương trình $s(t) = -t^3 + 6t^2 + 9t$ ($t$ tính bằng giây). Vận tốc tức thời lớn nhất của chất điểm trong 5 giây đầu tiên bằng bao nhiêu $m/s$?",
      "shortAnswerCorrect": "21",
      "shortAnswerAccepted": ["21", "21.0", "21,0"],
      "explanation": "Vận tốc $v(t) = s'(t) = -3t^2 + 12t + 9 = -3(t - 2)^2 + 21 \\le 21$. Giá trị lớn nhất bằng $21\\text{ m/s}$ tại $t = 2\\text{s}$."
    }
  ]
}

================ QUY TẮC CHUYỂN ĐỔI NGHIÊM NGẶT ================
1. CÔNG THỨC TOÁN / LÝ / HÓA: BẮT BUỘC viết bằng cú pháp KaTeX chuẩn và đặt trong cặp dấu $...$ (Ví dụ: $f'(x) = 0$, $\\int_0^2 x dx$, $\\lim_{x \\to 0}$, $\\sqrt{x^2+1}$, $\\vec{a} \\cdot \\vec{b}$, $H_2SO_4$, $Al^{3+}$).
2. TRÍCH XUẤT ĐẦY ĐỦ 100%: Không được tóm tắt, không được bỏ bớt câu nào trong đề.
3. ĐÁP ÁN:
   - Dạng 4 lựa chọn: "correctAnswer" là số nguyên từ 0 đến 3 (0=A, 1=B, 2=C, 3=D).
   - Dạng Đúng/Sai: Mảng "statements" đủ 4 ý a, b, c, d với "isCorrect" chuẩn xác.
   - Dạng Trả lời ngắn: "shortAnswerCorrect" chứa kết quả số nguyên hoặc số thập phân.
4. LỜI GIẢI ("explanation"): Ghi rõ ràng từng bước giải thích để học sinh đối chiếu sau khi thi.
5. ĐỊNH DẠNG ĐẦU RA: CHỈ XUẤT DUY NHẤT MÃ JSON trong khối \`\`\`json ... \`\`\`.

Bây giờ, hãy đọc tài liệu đề thi tôi gửi và tạo ra mã JSON hoàn hảo!`;
