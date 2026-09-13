/**
 * jsonRepair.ts
 * Bộ công cụ tự động phát hiện, làm sạch và sửa chữa các lỗi JSON thường gặp từ AI:
 * 1. Bad escaped character (lỗi gạch chéo ngược LaTeX như \frac, \alpha, \sqrt, \Delta, \vec, \times, \pi, \text...)
 * 2. Unescaped control characters (xuống dòng thô, tab, return trong chuỗi string)
 * 3. Dấu phẩy thừa (Trailing commas) trước ] hoặc }
 * 4. Chú thích JavaScript (// hoặc /* * /) do AI thêm vào
 * 5. Dấu ngoặc kép thông minh (smart/curly quotes “ ” ‘ ’)
 * 6. Markdown code blocks (```json ... ```) và văn bản đệm
 * 7. Thiếu dấu phẩy giữa các object / item
 * 8. Heuristic Fallback: Tự động bóc tách từng câu hỏi nếu toàn bộ chuỗi bị lỗi cú pháp nặng
 */

/**
 * Hàm sửa chữa chuỗi JSON thô thành JSON hợp lệ
 */
export function repairJsonString(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';

  let text = rawInput.trim();

  // 1. Loại bỏ các khối Markdown ```json ... ``` hoặc ``` ... ```
  text = text.replace(/```(?:json|JSON)?([\s\S]*?)```/g, '$1').trim();

  // 2. Chuyển đổi dấu ngoặc kép thông minh (Smart quotes) thành ASCII
  text = text
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  // 3. Trích xuất vùng JSON chính từ dấu [ đầu tiên đến ] cuối cùng (hoặc { đến })
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    text = text.substring(firstBracket, lastBracket + 1);
  } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // 4. Xóa chú thích (Comments) an toàn ngoài chuỗi
  text = removeComments(text);

  // 5. Duyệt phân tích theo máy trạng thái (State Machine): Sửa Escape LaTeX trong chuỗi & Sửa cấu trúc ngoài chuỗi
  text = processJsonStateMachine(text);

  return text;
}

/**
 * Loại bỏ comment // và /* * / nhưng giữ nguyên nội dung bên trong dấu ngoặc kép
 */
function removeComments(input: string): string {
  let inString = false;
  let quoteChar = '"';
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (inString) {
      result += char;
      if (char === '\\' && !isEscaped) {
        isEscaped = true;
      } else {
        if (char === quoteChar && !isEscaped) {
          inString = false;
        }
        isEscaped = false;
      }
    } else {
      if (char === '"' || char === "'") {
        inString = true;
        quoteChar = char;
        result += char;
      } else if (char === '/' && nextChar === '/') {
        // Bỏ qua comment dòng đơn
        const newlineIdx = input.indexOf('\n', i);
        if (newlineIdx === -1) break;
        i = newlineIdx;
        result += '\n';
      } else if (char === '/' && nextChar === '*') {
        // Bỏ qua comment nhiều dòng
        const closeIdx = input.indexOf('*/', i + 2);
        if (closeIdx === -1) break;
        i = closeIdx + 1;
      } else {
        result += char;
      }
    }
  }

  return result;
}

/**
 * Xử lý máy trạng thái (State Machine):
 * - Bên trong chuỗi ("..."):
 *     - Tự động sửa bad escapes: \frac, \alpha, \sqrt, \Delta, \vec, \times, \pi, \text, \pm, \{, \}, ...
 *     - Chuyển raw newlines / tabs thành \n, \t
 * - Bên ngoài chuỗi:
 *     - Xóa dấu phẩy thừa trước ] và }
 *     - Bổ sung dấu phẩy thiếu giữa các object: } { => }, {
 */
function processJsonStateMachine(input: string): string {
  let result = '';
  let inString = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += '"';
        i++;
      } else if (char === ',') {
        // Kiểm tra xem dấu phẩy này có phải trailing comma trước } hoặc ] không
        let lookAhead = i + 1;
        while (lookAhead < input.length && /\s/.test(input[lookAhead])) {
          lookAhead++;
        }
        if (lookAhead < input.length && (input[lookAhead] === '}' || input[lookAhead] === ']')) {
          // Bỏ qua dấu phẩy thừa này!
          i++;
        } else {
          result += ',';
          i++;
        }
      } else if (char === '}') {
        result += '}';
        i++;
        // Kiểm tra xem sau dấu } có dấu { tiếp theo mà thiếu dấu phẩy không
        let lookAhead = i;
        while (lookAhead < input.length && /\s/.test(input[lookAhead])) {
          lookAhead++;
        }
        if (lookAhead < input.length && input[lookAhead] === '{') {
          result += ',';
        }
      } else if (char === ']') {
        result += ']';
        i++;
        let lookAhead = i;
        while (lookAhead < input.length && /\s/.test(input[lookAhead])) {
          lookAhead++;
        }
        if (lookAhead < input.length && input[lookAhead] === '[') {
          result += ',';
        }
      } else {
        result += char;
        i++;
      }
    } else {
      // Đang ở TRONG chuỗi string kép "..."
      if (char === '"') {
        // Kiểm tra dấu gạch chéo ngược đứng trước để biết quote có bị escape không
        let backslashCount = 0;
        let k = result.length - 1;
        while (k >= 0 && result[k] === '\\') {
          backslashCount++;
          k--;
        }

        if (backslashCount % 2 === 0) {
          // Dấu quote đóng chuỗi
          inString = false;
          result += '"';
        } else {
          // Dấu quote này đã được escape hợp lệ (\" )
          result += '"';
        }
        i++;
      } else if (char === '\\') {
        const nextChar = input[i + 1];

        if (nextChar === undefined) {
          result += '\\\\';
          i++;
        } else if (nextChar === '"' || nextChar === '\\' || nextChar === '/') {
          // Escape hợp lệ chuẩn JSON: \" \\ \/
          result += '\\' + nextChar;
          i += 2;
        } else if (nextChar === 'u') {
          // Kiểm tra xem có đúng 4 ký tự hex \uXXXX không
          const hex = input.substring(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            result += '\\u' + hex;
            i += 6;
          } else {
            // Ví dụ \underline trong LaTeX => Escape \ thành \\
            result += '\\\\u';
            i += 2;
          }
        } else if (['b', 'f', 'n', 'r', 't'].includes(nextChar)) {
          // Trong LaTeX, các lệnh \frac, \forall, \bar, \begin, \beta, \text, \theta, \times, \tan, \to, \right, \rho, \neq, \nu...
          // thường bắt đầu bằng \f, \b, \t, \r, \n theo sau là chữ cái
          const charAfterNext = input[i + 2];
          if (charAfterNext && /[a-zA-Z]/.test(charAfterNext)) {
            // Đây là lệnh LaTeX => Escape \ để bảo toàn công thức toán
            result += '\\\\' + nextChar;
            i += 2;
          } else {
            // Escape điều khiển hợp lệ (\n, \t, \r...)
            result += '\\' + nextChar;
            i += 2;
          }
        } else {
          // BẤT KỲ ký tự nào khác: \alpha, \sqrt, \Delta, \vec, \circ, \approx, \le, \ge, \pm, \in, \cdot, \pi, \{, \}, \, ...
          // Đây là nguyên nhân gây ra lỗi: "Bad escaped character in JSON at position..."
          // Sửa bằng cách escape \ thành \\
          result += '\\\\' + nextChar;
          i += 2;
        }
      } else if (char === '\n') {
        // Xuống dòng thô trong chuỗi JSON => chuyển thành \n
        result += '\\n';
        i++;
      } else if (char === '\r') {
        // Carriage return thô => bỏ qua
        i++;
      } else if (char === '\t') {
        // Tab thô => chuyển thành \t
        result += '\\t';
        i++;
      } else {
        result += char;
        i++;
      }
    }
  }

  // Đóng ngoặc kép nếu chuỗi bị đứt quãng
  if (inString) {
    result += '"';
  }

  return result;
}

/**
 * Trích xuất từng câu hỏi từ chuỗi văn bản bị hỏng nặng
 * (Dùng làm Fallback cuối cùng nếu JSON.parse vẫn không thành công)
 */
export function extractQuestionsFallback(rawText: string): any[] {
  const questions: any[] = [];
  if (!rawText) return questions;

  // Tìm tất cả các khối dạng { ... } có chứa trường content hoặc type
  const regex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    const chunk = match[0];
    try {
      const repairedChunk = repairJsonString(chunk);
      const obj = JSON.parse(repairedChunk);
      if (obj && (obj.content || obj.options || obj.question_type || obj.type)) {
        questions.push(obj);
      }
    } catch (e) {
      try {
        const cleanChunk = chunk
          .replace(/```(?:json)?/g, '')
          .replace(/```/g, '')
          .trim();
        const evalObj = new Function(`return (${cleanChunk});`)();
        if (evalObj && typeof evalObj === 'object') {
          questions.push(evalObj);
        }
      } catch (errEval) {
        // Bỏ qua khối không thể phục hồi
      }
    }
  }

  return questions;
}

/**
 * Hàm phân tích JSON tự động sửa lỗi (Auto-repair & Safe Parse)
 * Nhận chuỗi JSON thô từ AI hoặc người dùng, tự động sửa lỗi và trả về mảng / object hợp lệ
 */
export function parseAndRepairJson<T = any>(rawInput: string): T {
  if (!rawInput || !rawInput.trim()) {
    throw new Error('Dữ liệu JSON rỗng!');
  }

  const cleaned = rawInput.trim();

  // Bước 1: Thử parse trực tiếp (Fast Path)
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    // Tiếp tục xử lý sửa lỗi tự động
  }

  // Bước 2: Chạy bộ lọc sửa lỗi toàn diện (Comprehensive Repair)
  try {
    const repaired = repairJsonString(cleaned);
    return JSON.parse(repaired);
  } catch (err2: any) {
    // Bước 3: Thử chạy eval Function an toàn cho relaxed JSON
    try {
      const repaired = repairJsonString(cleaned);
      const relaxedResult = new Function(`return (${repaired});`)();
      if (relaxedResult && (Array.isArray(relaxedResult) || typeof relaxedResult === 'object')) {
        return relaxedResult as T;
      }
    } catch (err3) {
      // Tiếp tục fallback
    }

    // Bước 4: Fallback bóc tách từng phần tử (Heuristic Extraction)
    const extractedList = extractQuestionsFallback(cleaned);
    if (extractedList.length > 0) {
      return extractedList as unknown as T;
    }

    // Nếu tất cả đều thất bại, báo lỗi chi tiết
    throw new Error(
      `Không thể tự động phân tích cú pháp JSON: ${err2.message || 'Cấu trúc dữ liệu không hợp lệ'}`
    );
  }
}
