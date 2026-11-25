import { getSupabaseServerClient } from './supabase';

export interface StoredAssignment {
  id: string;
  exam_id: string;
  class_id: string;
  teacher_id?: string;
  due_date?: string | null;
  start_date?: string | null;
  note?: string | null;
  score_weight?: string | null;
  created_at?: string;
}

export interface ExamMetadataPayload {
  assignments: StoredAssignment[];
  exam_authors: Record<string, string>; // exam_id -> teacher_id
  updated_at?: string;
}

const META_STORE_TITLE = '__FPREP_EXAM_METADATA_STORE__';

/**
 * Đọc toàn bộ phân công đề thi và tác giả đề thi từ Supabase Store bền vững
 */
export async function getExamMetadataStore(): Promise<ExamMetadataPayload> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('id, content, created_at')
      .eq('title', META_STORE_TITLE)
      .limit(1)
      .maybeSingle();

    if (error || !data || !data.content) {
      return { assignments: [], exam_authors: {} };
    }

    const parsed: ExamMetadataPayload = JSON.parse(data.content);
    return {
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
      exam_authors: (parsed.exam_authors && typeof parsed.exam_authors === 'object') ? parsed.exam_authors : {},
      updated_at: parsed.updated_at || data.created_at
    };
  } catch (err) {
    console.warn('[ExamMetadataStore] Error reading store:', err);
    return { assignments: [], exam_authors: {} };
  }
}

/**
 * Lưu hoặc cập nhật phân công đề thi cho một đề thi cụ thể
 */
export async function saveExamAssignmentsForExam(
  examId: string,
  newAssignments: Omit<StoredAssignment, 'id' | 'exam_id'>[],
  teacherId?: string
): Promise<StoredAssignment[]> {
  try {
    const supabase = await getSupabaseServerClient();
    const currentStore = await getExamMetadataStore();

    // Lọc bỏ các phân công cũ của đề thi này
    const remainingAssignments = currentStore.assignments.filter(a => a.exam_id !== examId);

    const nowIso = new Date().toISOString();
    const formattedNew: StoredAssignment[] = newAssignments.map(item => ({
      id: crypto.randomUUID(),
      exam_id: examId,
      class_id: item.class_id,
      teacher_id: item.teacher_id || teacherId,
      due_date: item.due_date || null,
      start_date: item.start_date || nowIso,
      note: item.note || null,
      score_weight: item.score_weight || null,
      created_at: nowIso
    }));

    const updatedAssignments = [...remainingAssignments, ...formattedNew];
    // Không tự ghi đè tác giả upload đề thi khi giáo viên khác chỉ thao tác giao bài cho lớp
    const updatedAuthors = { ...currentStore.exam_authors };

    const payload: ExamMetadataPayload = {
      assignments: updatedAssignments,
      exam_authors: updatedAuthors,
      updated_at: nowIso
    };

    // Kiểm tra xem record đã tồn tại chưa
    const { data: existing } = await supabase
      .from('announcements')
      .select('id')
      .eq('title', META_STORE_TITLE)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('announcements')
        .update({
          content: JSON.stringify(payload),
          date: new Date().toLocaleDateString('vi-VN'),
          sender: 'SYSTEM'
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('announcements')
        .insert([{
          id: crypto.randomUUID(),
          title: META_STORE_TITLE,
          content: JSON.stringify(payload),
          sender: 'SYSTEM',
          target_type: 'teachers',
          date: new Date().toLocaleDateString('vi-VN')
        }]);
    }

    return formattedNew;
  } catch (err) {
    console.error('[ExamMetadataStore] Error saving assignments:', err);
    throw err;
  }
}

/**
 * Ghi nhận tác giả (giáo viên trực tiếp upload/tạo) đề thi.
 * Mặc định không ghi đè nếu đề thi đã có tác giả (trừ khi force = true do Quản trị viên chỉ định).
 */
export async function recordExamAuthor(
  examId: string,
  teacherId: string,
  options?: { force?: boolean; title?: string }
): Promise<boolean> {
  try {
    const supabase = await getSupabaseServerClient();
    const currentStore = await getExamMetadataStore();

    const existingAuthor = currentStore.exam_authors[examId];
    if (existingAuthor && !options?.force) {
      return false;
    }

    if (!teacherId && options?.force) {
      delete currentStore.exam_authors[examId];
    } else if (teacherId) {
      currentStore.exam_authors[examId] = teacherId;
    } else {
      return false;
    }

    const nowIso = new Date().toISOString();
    currentStore.updated_at = nowIso;

    const { data: existing } = await supabase
      .from('announcements')
      .select('id')
      .eq('title', META_STORE_TITLE)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('announcements')
        .update({
          content: JSON.stringify(currentStore),
          date: new Date().toLocaleDateString('vi-VN')
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('announcements')
        .insert([{
          id: crypto.randomUUID(),
          title: META_STORE_TITLE,
          content: JSON.stringify(currentStore),
          sender: 'SYSTEM',
          target_type: 'teachers',
          date: new Date().toLocaleDateString('vi-VN')
        }]);
    }

    // Lưu dự phòng vào audit_logs để không bao giờ thất lạc thông tin người upload đề
    if (teacherId) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: teacherId,
          action: 'RECORD_EXAM_AUTHOR',
          target_table: 'exams',
          target_id: examId,
          old_values: existingAuthor ? { teacher_id: existingAuthor } : null,
          new_values: {
            exam_id: examId,
            teacher_id: teacherId,
            title: options?.title || null
          }
        });
      } catch (auditErr) {
        console.warn('[ExamMetadataStore] Audit log backup skipped:', auditErr);
      }
    }

    return true;
  } catch (err) {
    console.warn('[ExamMetadataStore] Error recording author:', err);
    return false;
  }
}
