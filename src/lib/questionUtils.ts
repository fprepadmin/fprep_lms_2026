/**
 * questionUtils.ts
 * Module chuyên trách chuẩn hóa, làm sạch và parse phương án câu hỏi (MCQ, TF, SAQ).
 * Xử lý dứt điểm các lỗi:
 * - Chuỗi JSON stringified lồng nhau nhiều tầng từ AI / Import / Lưu trữ: {"id":"a","text":"{\"id\":\"a\",...}"}
 * - Options chứa ký tự escape LaTeX (\dfrac, \frac, \alpha,...) khiến JSON.parse bị lỗi cú pháp
 * - Options là mảng chuỗi JSON thô
 * - Options là object lồng object (text/content/label/value)
 * - Escaped backslashes \" hoặc \\
 * - Đồng bộ định dạng key cho MCQ ('A', 'B', 'C', 'D') và TF ('a', 'b', 'c', 'd')
 */

export interface ParsedOption {
  id: string;
  text: string;
}

/**
 * Chuẩn hóa chuỗi JSON chứa các ký tự LaTeX có dấu gạch chéo ngược (\dfrac, \vec, \alpha,...)
 * để JSON.parse không bị văng lỗi "Bad escaped character in JSON".
 */
export function sanitizeJsonString(str: string): string {
  if (!str) return '';
  // Ký tự escape hợp lệ trong JSON sau dấu \ gồm: " \ / b f n r t u(4 hex)
  return str.replace(/\\([^"\\\/bfnrtu]|u(?![\da-fA-F]{4}))/g, '\\\\$1');
}

/**
 * Fallback regex trích xuất nội dung thuộc tính text/content/label
 * khi chuỗi JSON bị hỏng nặng hoặc escape quá nhiều tầng.
 */
function extractTextFieldByRegex(str: string): string | null {
  if (!str || typeof str !== 'string') return null;

  // Khớp "text": "...", 'text': '...', "content": "...", "label": "..."
  const match = str.match(/["'](?:text|content|label|value)["']\s*:\s*"([\s\S]*)/);
  if (!match) return null;

  let val = match[1];
  // Cắt bỏ phần đóng ngoặc JSON thừa ở đuôi: }" hoặc }"}...
  val = val.replace(/(?:\\")*["']?\s*\}*\s*$/, '').trim();
  // Unescape dấu ngoặc kép và gạch chéo
  val = val.replace(/\\"/g, '"');
  return val;
}

/**
 * Làm sạch và giải mã đệ quy triệt để mọi tầng JSON / Object lồng nhau.
 * Luôn trả về chuỗi text thuần túy (hỗ trợ công thức LaTeX $, $$).
 */
export function cleanOptionText(raw: any): string {
  if (raw === null || raw === undefined) return '';
  let cur: any = raw;
  let depth = 0;
  const maxDepth = 100;

  while (cur !== null && cur !== undefined && depth < maxDepth) {
    depth++;

    // 1. Nếu là object hoặc array
    if (typeof cur === 'object') {
      if (Array.isArray(cur)) {
        if (cur.length === 0) return '';
        cur = cur[0];
        continue;
      }
      if (cur.text !== undefined) {
        let t = cur.text;
        const extraImg = cur.image || cur.imageUrl || cur.img;
        if (extraImg && typeof t === 'string' && !t.includes(extraImg)) {
          t = t.trim() + ` ![Hình minh họa](${extraImg})`;
        }
        cur = t;
        continue;
      }
      if (cur.content !== undefined) {
        cur = cur.content;
        continue;
      }
      if (cur.image !== undefined || cur.imageUrl !== undefined || cur.img !== undefined) {
        cur = `![Hình minh họa](${cur.image || cur.imageUrl || cur.img})`;
        continue;
      }
      if (cur.label !== undefined) {
        cur = cur.label;
        continue;
      }
      if (cur.value !== undefined) {
        cur = cur.value;
        continue;
      }
      break;
    }

    // 2. Nếu là chuỗi
    if (typeof cur === 'string') {
      let str = cur.trim();

      // A. Nếu chuỗi bắt đầu và kết thúc bằng { hoặc [ (JSON hợp lệ)
      if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
        try {
          const parsed = JSON.parse(str);
          cur = parsed;
          continue;
        } catch (e) {
          // Thử sanitize LaTeX escape
          try {
            const sanitized = sanitizeJsonString(str);
            const parsed = JSON.parse(sanitized);
            cur = parsed;
            continue;
          } catch (e2) {}

          try {
            if (str.includes('\\"') || str.includes('\\\\')) {
              const unescaped = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
              const sanitized2 = sanitizeJsonString(unescaped);
              const parsed2 = JSON.parse(sanitized2);
              cur = parsed2;
              continue;
            }
          } catch (e3) {}
        }
      }

      // B. Nếu chuỗi bị bọc trong dấu ngoặc kép thừa (ví dụ '"nội dung"')
      if (
        (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
        (str.startsWith("'") && str.endsWith("'") && str.length >= 2)
      ) {
        try {
          const parsed = JSON.parse(str);
          cur = parsed;
          continue;
        } catch (e) {
          str = str.slice(1, -1).trim();
          cur = str;
          continue;
        }
      }

      // C. BÓC TÁCH TRIỆT ĐỂ: Nếu chuỗi chứa dấu hiệu JSON lồng nhau ("id": hoặc "text": hoặc \"text\":)
      if (
        str.includes('"id"') || 
        str.includes('\"id\"') || 
        str.includes('\\"id\\"') ||
        str.includes('"text"') ||
        str.includes('\"text\"') ||
        str.includes('\\"text\\"')
      ) {
        // Tìm chữ "text" cuối cùng trong chuỗi
        const lastTextMatch = [...str.matchAll(/\\*["']?text\\*["']?\s*:\s*/g)].pop();
        if (lastTextMatch && lastTextMatch.index !== undefined) {
          const startIdx = lastTextMatch.index + lastTextMatch[0].length;
          let core = str.slice(startIdx).trim();

          // Cắt bỏ các dấu ngoặc kép hoặc gạch chéo mở đầu: " \" \\" v.v.
          core = core.replace(/^(\\+["']|["'])+/, '');

          // Cắt bỏ phần JSON đóng ở đuôi: \"}\"}\"} hoặc "}} hoặc \"
          // Cân bằng dấu } để KHÔNG cắt nhầm dấu } của công thức LaTeX!
          while (core.length > 0) {
            const lastChar = core[core.length - 1];
            if (lastChar === ' ' || lastChar === '\n' || lastChar === '\r' || lastChar === '\t' || lastChar === '\\') {
              core = core.slice(0, -1);
              continue;
            }
            if (lastChar === '"' || lastChar === "'") {
              core = core.slice(0, -1);
              continue;
            }
            if (lastChar === '}') {
              const openBraces = (core.match(/\{/g) || []).length;
              const closeBraces = (core.match(/\}/g) || []).length;
              if (closeBraces > openBraces) {
                core = core.slice(0, -1);
                continue;
              }
            }
            break;
          }

          // Unescape backslash cho LaTeX
          core = core.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

          if (core && core !== str) {
            cur = core;
            continue;
          }
        }

        // Fallback trích xuất bằng regex
        const extracted = extractTextFieldByRegex(str);
        if (extracted && extracted !== str) {
          cur = extracted;
          continue;
        }
      }

      // Chuẩn hóa một số ký tự LaTeX bị nuốt dấu gạch chéo ngược
      if (/^(dfrac|frac|vec|overrightarrow|int|lim|sum|sqrt)\b/.test(str)) {
        str = '\\' + str;
      }

      return str;
    }

    // Kiểu dữ liệu nguyên thủy khác
    return String(cur);
  }

  // Fallback an toàn
  if (typeof cur === 'string') return cur;
  if (typeof cur === 'object' && cur !== null) {
    return String(cur.text ?? cur.content ?? cur.label ?? cur.value ?? '');
  }
  return String(cur ?? '');
}

/**
 * Parse an toàn options từ bất kỳ nguồn dữ liệu nào (database, import, json)
 */
export function parseOptions(rawOptions: any, type?: 'mcq' | 'tf' | 'saq'): ParsedOption[] {
  if (!rawOptions) return [];
  let list: any[] = [];

  if (Array.isArray(rawOptions)) {
    list = rawOptions;
  } else if (typeof rawOptions === 'string') {
    const trimmed = rawOptions.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const sanitized = sanitizeJsonString(trimmed);
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) list = parsed;
        else if (typeof parsed === 'object' && parsed !== null) {
          list = Object.entries(parsed).map(([key, val]) => ({ id: key, text: val }));
        }
      } catch (e) {
        try {
          const unescaped = trimmed.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          const sanitized2 = sanitizeJsonString(unescaped);
          const parsed = JSON.parse(sanitized2);
          if (Array.isArray(parsed)) list = parsed;
          else if (typeof parsed === 'object' && parsed !== null) {
            list = Object.entries(parsed).map(([key, val]) => ({ id: key, text: val }));
          }
        } catch (e2) {}
      }
    }
  }

  if (list.length === 0) return [];

  const isTf = type === 'tf';
  const defaultKeys = isTf ? ['a', 'b', 'c', 'd'] : ['A', 'B', 'C', 'D'];

  return list.map((opt, idx) => {
    const defaultKey = defaultKeys[idx] || String(idx + 1);
    if (typeof opt === 'object' && opt !== null) {
      const rawId = opt.id || defaultKey;
      return {
        id: isTf ? String(rawId).toLowerCase() : String(rawId).toUpperCase(),
        text: cleanOptionText(opt.text ?? opt.content ?? opt.label ?? opt.value ?? opt)
      };
    }

    let extractedId = defaultKey;
    if (typeof opt === 'string') {
      const idMatch = opt.match(/\\*["']?id\\*["']?\s*:\s*\\*["']?([a-dA-D1-4])\\*["']?/);
      if (idMatch && idMatch[1]) {
        extractedId = idMatch[1];
      }
    }

    return {
      id: isTf ? extractedId.toLowerCase() : extractedId.toUpperCase(),
      text: cleanOptionText(opt)
    };
  });
}

/**
 * Định dạng chuẩn options để lưu vào database Supabase (JSONB)
 * - MCQ: mảng string [ "text1", "text2", ... ]
 * - TF: mảng object [ { id: 'a', text: '...' }, { id: 'b', text: '...' }, ... ]
 * - SAQ: []
 */
export function formatQuestionOptionsForDb(
  options: any,
  type?: 'mcq' | 'tf' | 'saq'
): any[] {
  if (type === 'saq') return [];
  const parsed = parseOptions(options, type);
  if (type === 'mcq') {
    return parsed.map(o => cleanOptionText(o.text));
  }
  if (type === 'tf') {
    const defaultKeys = ['a', 'b', 'c', 'd'];
    return parsed.map((o, idx) => ({
      id: String(o.id || defaultKeys[idx] || idx + 1).toLowerCase(),
      text: cleanOptionText(o.text)
    }));
  }
  return parsed.map(o => cleanOptionText(o.text));
}

/**
 * Tự động cắt xuống dòng cho phần giải thích (Explanation), đặc biệt là khi nạp từ JSON
 * hoặc khi các ý a), b), c), d) dồn trên cùng 1 hàng.
 * Đảm bảo các mệnh đề được phân tách bằng \n\n để dễ quan sát và hiển thị trực quan.
 */
export function formatExplanationWithLineBreaks(raw: any, questionType?: string): string {
  if (!raw) return '';

  // 1. Nếu là Object / Array (từ JSON import)
  if (typeof raw === 'object' && raw !== null) {
    if (Array.isArray(raw)) {
      return raw.map((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          const label = item.id || item.label || item.key || String.fromCharCode(97 + idx);
          const content = item.text || item.content || item.explanation || JSON.stringify(item);
          return `${label}) ${String(content).trim()}`;
        }
        return `${String.fromCharCode(97 + idx)}) ${String(item).trim()}`;
      }).join('\n\n');
    }

    // Object dạng { a: "...", b: "..." }
    return Object.entries(raw)
      .map(([key, val]) => `${key}) ${String(val).trim()}`)
      .join('\n\n');
  }

  let text = String(raw).trim();
  if (!text) return '';

  // 2. Nếu là chuỗi JSON: parse JSON
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        return formatExplanationWithLineBreaks(parsed, questionType);
      }
    } catch (e) {}
  }

  // 3. Chuẩn hóa ký tự xuống dòng escaped
  text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  // 4. Nếu chuỗi đã có ngắt dòng nhiều dòng và đã tách các ý, giữ nguyên
  if (text.includes('\n\n') || (text.includes('\n') && /^[a-dA-D][\.\)]/m.test(text))) {
    return text;
  }

  // 5. Tự động nhận diện ranh giới các ý a), b), c), d) / a., b., c., d. / Ý a, Ý b / a đúng, b sai...
  // Tránh ngắt nhầm các cụm như "đáp án C đúng", "chọn A."
  const pattern = /(?:^|\r?\n|\s{2,}|(?<=[.!?])\s+|(?<=;)\s*)(?=(?:(?:\b[a-dA-D]\b|Ý\s*[a-dA-D])[\.\:\)]|(?<!(?:đáp án|phương án|chọn|mệnh đề)\s+)(?:\b[a-dA-D]\s+(?:đúng|sai|chính xác|không đúng)\b)))/gi;

  const parts = text.split(pattern).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.join('\n\n');
  }

  return text;
}

/**
 * Chuẩn hóa kiểu câu hỏi (qType) và đáp án chính xác (correct_answer).
 * Đảm bảo 100% giữ nguyên đáp án người dùng nhập từ JSON hoặc CSDL:
 * - Không tự ý đổi MCQ thành TF chỉ vì có chữ "mệnh đề sau"
 * - Hỗ trợ index dạng số (0, 1, 2, 3), ký tự ('A', 'B', 'C', 'D' / 'a', 'b', 'c', 'd'), boolean mảng/object cho TF
 */
export function normalizeQuestionTypeAndAnswer(
  rawItem: any,
  parsedOptions?: ParsedOption[]
): {
  type: 'mcq' | 'tf' | 'saq';
  correct_answer: any;
  correct_option_index: number;
} {
  // 1. Xác định dạng câu hỏi
  const explicitType = rawItem.type || rawItem.question_type;
  let qType: 'mcq' | 'tf' | 'saq' = 'mcq';

  if (explicitType) {
    const t = String(explicitType).toLowerCase().trim();
    if (t === 'tf' || t === 'true_false' || t === 'dung_sai' || t === 'dung/sai') {
      qType = 'tf';
    } else if (t === 'saq' || t === 'short_answer' || t === 'dien_khuyet' || t === 'tu_luan') {
      qType = 'saq';
    } else {
      qType = 'mcq';
    }
  } else {
    // Nếu JSON không có trường type: suy luận an toàn
    const opts = parsedOptions || parseOptions(rawItem.options);
    if (opts.length === 0 && (rawItem.correct_answer !== undefined || rawItem.correctAnswer !== undefined)) {
      qType = 'saq';
    } else if (
      (typeof rawItem.correct_answer === 'object' && rawItem.correct_answer !== null && !Array.isArray(rawItem.correct_answer)) ||
      (Array.isArray(rawItem.correct_answer) && rawItem.correct_answer.length === 4 && typeof rawItem.correct_answer[0] === 'boolean')
    ) {
      qType = 'tf';
    } else {
      const contentLower = (rawItem.content || '').toLowerCase();
      if (
        contentLower.includes('đúng hoặc sai') || 
        contentLower.includes('tính đúng/sai') || 
        contentLower.includes('tính đúng sai') || 
        contentLower.includes('xét tính đúng sai')
      ) {
        qType = 'tf';
      } else {
        qType = 'mcq';
      }
    }
  }

  // 2. Chuẩn hóa đáp án đúng (correct_answer) và index
  // Ưu tiên các trường tường minh mà giáo viên nhập
  const rawCa = rawItem.correct_answer !== undefined ? rawItem.correct_answer 
    : (rawItem.correctAnswer !== undefined ? rawItem.correctAnswer 
    : (rawItem.answer !== undefined ? rawItem.answer 
    : (rawItem.correct !== undefined ? rawItem.correct : rawItem.key)));

  let ca: any = rawCa;
  let correctOptIdx = 0;

  if (qType === 'mcq') {
    // ƯU TIÊN 1: Nếu có correct_answer dạng chữ ('A', 'B', 'C', 'D') hoặc số hợp lệ
    let parsedFromCa: string | null = null;
    if (typeof rawCa === 'string') {
      const trimmed = rawCa.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(trimmed)) {
        parsedFromCa = trimmed;
      } else if (['0', '1', '2', '3'].includes(trimmed)) {
        parsedFromCa = ['A', 'B', 'C', 'D'][Number(trimmed)];
      } else {
        const match = trimmed.match(/\b([A-D])\b/);
        if (match) {
          parsedFromCa = match[1];
        }
      }
    } else if (typeof rawCa === 'number' && rawCa >= 0 && rawCa < 4) {
      parsedFromCa = ['A', 'B', 'C', 'D'][rawCa];
    }

    if (parsedFromCa) {
      ca = parsedFromCa;
      correctOptIdx = ['A', 'B', 'C', 'D'].indexOf(parsedFromCa);
    } else if (rawItem.correct_option_index !== undefined && rawItem.correct_option_index !== null) {
      // ƯU TIÊN 2: Dùng correct_option_index nếu không có correct_answer tường minh
      const idx = Number(rawItem.correct_option_index);
      if (!isNaN(idx) && idx >= 0 && idx < 4) {
        correctOptIdx = idx;
        ca = ['A', 'B', 'C', 'D'][idx];
      } else {
        ca = 'A';
        correctOptIdx = 0;
      }
    } else if (Array.isArray(rawItem.options)) {
      // ƯU TIÊN 3: Dò trong options xem có is_correct: true không
      const foundIdx = rawItem.options.findIndex((opt: any) => opt && (opt.is_correct === true || opt.correct === true));
      if (foundIdx !== -1 && foundIdx < 4) {
        correctOptIdx = foundIdx;
        ca = ['A', 'B', 'C', 'D'][foundIdx];
      } else {
        ca = 'A';
        correctOptIdx = 0;
      }
    } else {
      ca = 'A';
      correctOptIdx = 0;
    }
  } else if (qType === 'tf') {
    const toBool = (val: any): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val === 1;
      if (typeof val === 'string') {
        const s = val.trim().toLowerCase();
        return s === 'true' || s === 'đúng' || s === 'dung' || s === 'đ' || s === 'd' || s === 't' || s === '1' || s === 'yes' || s === 'y';
      }
      return false;
    };

    let tfObj: { a: boolean; b: boolean; c: boolean; d: boolean } = { a: true, b: false, c: true, d: false };

    if (typeof rawCa === 'object' && rawCa !== null && !Array.isArray(rawCa)) {
      tfObj = {
        a: toBool(rawCa.a ?? rawCa.A ?? rawCa['1'] ?? rawCa[0]),
        b: toBool(rawCa.b ?? rawCa.B ?? rawCa['2'] ?? rawCa[1]),
        c: toBool(rawCa.c ?? rawCa.C ?? rawCa['3'] ?? rawCa[2]),
        d: toBool(rawCa.d ?? rawCa.D ?? rawCa['4'] ?? rawCa[3])
      };
    } else if (Array.isArray(rawCa) && rawCa.length > 0) {
      tfObj = {
        a: toBool(rawCa[0]),
        b: toBool(rawCa[1]),
        c: toBool(rawCa[2]),
        d: toBool(rawCa[3])
      };
    } else if (typeof rawCa === 'string') {
      const s = rawCa.trim();
      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try {
          const parsed = JSON.parse(s);
          if (typeof parsed === 'object' && parsed !== null) {
            return normalizeQuestionTypeAndAnswer({ ...rawItem, correct_answer: parsed }, parsedOptions);
          }
        } catch (e) {}
      }

      // Xử lý các dạng chuỗi Đúng / Sai phổ biến của giáo viên:
      // VD: "Đ-S-S-Đ", "D, S, S, D", "T-F-F-T", "True, False, False, True", "1, 0, 0, 1"
      const tokens = s.split(/[\s,\-\/\|;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tokens.length >= 4) {
        tfObj = {
          a: toBool(tokens[0]),
          b: toBool(tokens[1]),
          c: toBool(tokens[2]),
          d: toBool(tokens[3])
        };
      } else {
        // Phân tích dạng: "a đúng, b sai, c đúng, d sai" hoặc "a: true, b: false"
        const lowerStr = s.toLowerCase();
        const hasA = lowerStr.match(/\ba[\s\:\-\)]*(đúng|dung|true|t|1)/);
        const hasB = lowerStr.match(/\bb[\s\:\-\)]*(đúng|dung|true|t|1)/);
        const hasC = lowerStr.match(/\bc[\s\:\-\)]*(đúng|dung|true|t|1)/);
        const hasD = lowerStr.match(/\bd[\s\:\-\)]*(đúng|dung|true|t|1)/);

        if (hasA || hasB || hasC || hasD || lowerStr.includes('đúng') || lowerStr.includes('sai')) {
          tfObj = {
            a: Boolean(hasA),
            b: Boolean(hasB),
            c: Boolean(hasC),
            d: Boolean(hasD)
          };
        }
      }
    } else if (Array.isArray(rawItem.options) && rawItem.options.length >= 2) {
      const hasIsCorrect = rawItem.options.some((o: any) => o && (o.is_correct !== undefined || o.correct !== undefined));
      if (hasIsCorrect) {
        tfObj = {
          a: toBool(rawItem.options[0]?.is_correct ?? rawItem.options[0]?.correct),
          b: toBool(rawItem.options[1]?.is_correct ?? rawItem.options[1]?.correct),
          c: toBool(rawItem.options[2]?.is_correct ?? rawItem.options[2]?.correct),
          d: toBool(rawItem.options[3]?.is_correct ?? rawItem.options[3]?.correct)
        };
      }
    }

    ca = tfObj;
    correctOptIdx = 0;
  } else if (qType === 'saq') {
    ca = rawCa !== undefined && rawCa !== null ? String(rawCa).trim() : '';
    correctOptIdx = 0;
  }

  return {
    type: qType,
    correct_answer: ca,
    correct_option_index: correctOptIdx
  };
}
