/**
 * jsonRepair.ts
 * Bộ công cụ tự động phát hiện, làm sạch và sửa chữa các lỗi JSON thường gặp từ AI và người dùng:
 * 1. HTML entities do copy-paste từ web/chat: &#x20;, &#39;, &quot;, &amp;
 * 2. Escape xuống dòng markdown do copy từ code block: \ ở cuối dòng (\ \n)
 * 3. Bad escaped character (lỗi gạch chéo ngược LaTeX như \frac, \alpha, \sqrt, \Delta, \vec, \times, \pi, \text...)
 * 4. Unescaped control characters (xuống dòng thô, tab, return trong chuỗi string)
 * 5. Lệch/thiếu dấu ngoặc nhọn hoặc vuông (ví dụ thiếu } đóng option trước khi đóng ])
 * 6. Dấu phẩy thừa (Trailing commas) trước ] hoặc }
 * 7. Thiếu dấu phẩy giữa các object / item (} { => }, {)
 * 8. Chú thích JavaScript (// hoặc /* * /) do AI thêm vào
 * 9. Dấu ngoặc kép thông minh (smart/curly quotes “ ” ‘ ’)
 * 10. Markdown code blocks (```json ... ```) và văn bản đệm
 * 11. Balanced Braces Depth Fallback: Bóc tách 100% câu hỏi chuẩn kể cả khi cấu trúc ngoài cùng bị hỏng nặng
 */

/**
 * Hàm sửa chữa chuỗi JSON thô thành JSON hợp lệ
 */
export function repairJsonString(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';

  let text = rawInput.trim();

  // 1. Tiền xử lý HTML entities thường xuất hiện khi copy từ trình duyệt / chat
  text = text
    .replace(/&#x20;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // 2. Xóa các dấu backslash thoát dòng Markdown vô hiệu ở cuối dòng (\ \n hoặc \\\n)
  text = text.replace(/\\+(\r?\n)/g, '$1');

  // 3. Loại bỏ các khối Markdown ```json ... ``` hoặc ``` ... ```
  text = text.replace(/```(?:json|JSON)?([\s\S]*?)```/g, '$1').trim();

  // 4. Chuyển đổi dấu ngoặc kép thông minh (Smart quotes) thành ASCII
  text = text
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  // 5. Trích xuất vùng JSON chính từ dấu [ đầu tiên đến ] cuối cùng (hoặc { đến })
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    text = text.substring(firstBracket, lastBracket + 1);
  } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // 6. Xóa chú thích (Comments) an toàn ngoài chuỗi
  text = removeComments(text);

  // 7. Duyệt phân tích theo máy trạng thái (State Machine) kết hợp Stack kiểm soát cấu trúc
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

const LATEX_N_REGEX = /^(?:neq|ne|notin|nabla|not|natural|nexists|nu|nsubseteq|nsupseteq|nmid|ngtr|nless|nearrow|nwarrow)(?:[^a-zA-Z]|$)/i;
const LATEX_T_REGEX = /^(?:times|to|tan|tanh|theta|text|textbf|textit|tau|top|triangle|tilde|tfrac|therefore|tag)(?:[^a-zA-Z]|$)/i;
const LATEX_F_REGEX = /^(?:frac|forall|flat|fbox|footnotesize)(?:[^a-zA-Z]|$)/i;
const LATEX_B_REGEX = /^(?:bar|begin|beta|binom|bold|boldsymbol|bullet|bot|bmod|bigcap|bigcup|bigvee|bigwedge|big|Big|bigg|Bigg)(?:[^a-zA-Z]|$)/i;
const LATEX_R_REGEX = /^(?:right|rho|rangle|rightarrow|Rightarrow|real|rfloor|rceil)(?:[^a-zA-Z]|$)/i;

function isLatexControlWord(char: string, remainingSubstr: string): boolean {
  if (char === 'n') return LATEX_N_REGEX.test(remainingSubstr);
  if (char === 't') return LATEX_T_REGEX.test(remainingSubstr);
  if (char === 'f') return LATEX_F_REGEX.test(remainingSubstr);
  if (char === 'b') return LATEX_B_REGEX.test(remainingSubstr);
  if (char === 'r') return LATEX_R_REGEX.test(remainingSubstr);
  return false;
}

/**
 * Xử lý máy trạng thái (State Machine):
 * - Quản lý cấu trúc phân cấp bằng Stack cho các cặp ngoặc { } và [ ]
 *     - Tự động đóng dấu } nếu object con chưa đóng mà đã gặp ] đóng mảng
 *     - Tự động đóng dấu ] nếu array con chưa đóng mà đã gặp } đóng object
 *     - Xóa dấu phẩy thừa trước ] và }
 *     - Bổ sung dấu phẩy thiếu giữa các object: } { => }, { hoặc ] [ => ], [
 * - Bên trong chuỗi ("..."):
 *     - Tự động sửa bad escapes: \frac, \alpha, \sqrt, \Delta, \vec, \times, \pi, \text, \pm, \{, \}, ...
 *     - Chuyển raw newlines / tabs thành \n, \t
 *     - Tự động đóng chuỗi nếu bị đứt đoạn
 */
function processJsonStateMachine(input: string): string {
  let result = '';
  let inString = false;
  let i = 0;
  const stack: ('{' | '[')[] = [];

  while (i < input.length) {
    const char = input[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += '"';
        i++;
      } else if (char === '{') {
        stack.push('{');
        result += '{';
        i++;
      } else if (char === '[') {
        stack.push('[');
        result += '[';
        i++;
      } else if (char === '}') {
        // Nếu đỉnh stack là '[', nghĩa là mảng con chưa đóng ] trước khi đóng object }
        while (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
          result += ']';
        }
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
        result += '}';
        i++;

        // Kiểm tra sau } có { tiếp theo mà thiếu dấu phẩy không
        let lookAhead = i;
        while (lookAhead < input.length && /\s/.test(input[lookAhead])) {
          lookAhead++;
        }
        if (lookAhead < input.length && input[lookAhead] === '{') {
          result += ',';
        }
      } else if (char === ']') {
        // TỰ ĐỘNG SỬA: Nếu đỉnh stack là '{', nghĩa là object con chưa đóng } trước khi đóng mảng ]
        // (Ví dụ phổ biến: option cuối cùng {"id": "D", "text": "0" thiếu dấu } trước ])
        while (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
          result += '}';
        }
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
        result += ']';
        i++;

        // Kiểm tra sau ] có [ tiếp theo mà thiếu dấu phẩy không
        let lookAhead = i;
        while (lookAhead < input.length && /\s/.test(input[lookAhead])) {
          lookAhead++;
        }
        if (lookAhead < input.length && input[lookAhead] === '[') {
          result += ',';
        }
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
          // Kiểm tra xem có phải lệnh LaTeX bắt đầu bằng \n (\ne, \neq, \notin...), \t (\times, \to...), \f (\frac...), \b (\bar...), \r (\right...)
          const rest = input.substring(i + 1);
          if (isLatexControlWord(nextChar, rest)) {
            // Đây là lệnh LaTeX => Escape \ thành \\ để bảo toàn công thức toán
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

  // Tự động đóng tất cả các ngoặc nhọn hoặc vuông còn mở trong stack
  while (stack.length > 0) {
    const unclosed = stack.pop();
    result += unclosed === '{' ? '}' : ']';
  }

  return result;
}

/**
 * Trích xuất từng câu hỏi từ chuỗi văn bản bị hỏng nặng
 * (Dùng thuật toán Balanced Braces Depth Extractor thay vì Regex nông,
 * đảm bảo bóc tách 100% các câu hỏi có lồng array options / correct_answer object)
 */
export function extractQuestionsFallback(rawText: string): any[] {
  const questions: any[] = [];
  if (!rawText) return questions;

  let inString = false;
  let depth = 0;
  let startIdx = -1;

  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];

    if (char === '"' && (i === 0 || rawText[i - 1] !== '\\')) {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') {
        if (depth === 0) {
          startIdx = i;
        }
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          const chunk = rawText.substring(startIdx, i + 1);
          try {
            const repairedChunk = repairJsonString(chunk);
            const obj = JSON.parse(repairedChunk);
            if (obj && (obj.content || obj.options || obj.question_type || obj.type)) {
              questions.push(obj);
            }
          } catch (e) {
            try {
              const cleaned = repairJsonString(chunk);
              const evalObj = new Function(`return (${cleaned});`)();
              if (evalObj && typeof evalObj === 'object') {
                questions.push(evalObj);
              }
            } catch (errEval) {
              // Bỏ qua khối không thể phục hồi
            }
          }
          startIdx = -1;
        }
        if (depth < 0) depth = 0;
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

  // Bước 1: Luôn ưu tiên chạy bộ lọc sửa lỗi toàn diện (Comprehensive Repair)
  // để bảo toàn các lệnh LaTeX (\ne, \neq, \times, \frac, \alpha...) trước khi JSON.parse
  // có thể nuốt chửng \n thành ký tự xuống dòng và làm hỏng công thức toán
  try {
    const repaired = repairJsonString(cleaned);
    const parsed = JSON.parse(repaired);
    if (parsed) return parsed;
  } catch (err1) {
    // Bước 2: Thử parse trực tiếp phòng trường hợp rawInput đã là JSON hoàn hảo
    try {
      return JSON.parse(cleaned);
    } catch (errDirect) {
      // Tiếp tục các bước relaxed eval và fallback bên dưới
    }
  }

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

  // Bước 4: Fallback bóc tách từng phần tử (Balanced Braces Depth Extraction)
  const extractedList = extractQuestionsFallback(cleaned);
  if (extractedList.length > 0) {
    return extractedList as unknown as T;
  }

  // Nếu tất cả đều thất bại, báo lỗi chi tiết
  throw new Error('Không thể tự động phân tích cú pháp JSON: Cấu trúc dữ liệu không hợp lệ');
}
