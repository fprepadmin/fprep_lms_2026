import { NextResponse } from 'next/server';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { 
  getExamMetadataStore, 
  saveExamAssignmentsForExam, 
  recordExamAuthor 
} from '@/lib/examAssignmentsStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('exam_id');

    const store = await getExamMetadataStore();
    if (examId) {
      const filtered = store.assignments.filter(a => a.exam_id === examId);
      return NextResponse.json({ assignments: filtered, author: store.exam_authors[examId] || null });
    }

    return NextResponse.json(store);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let teacherId = '';
    if (token) {
      const payload = verifySessionToken(token);
      if (payload?.sub) {
        teacherId = payload.sub;
      }
    }

    const body = await request.json();
    const { exam_id, assignments, teacher_id, action } = body;

    if (!exam_id) {
      return NextResponse.json({ error: 'Thiếu exam_id' }, { status: 400 });
    }

    const targetTeacherId = teacher_id || teacherId;

    if (action === 'record_author') {
      if (targetTeacherId) {
        await recordExamAuthor(exam_id, targetTeacherId);
      }
      return NextResponse.json({ success: true });
    }

    // Mặc định là lưu phân công đề thi
    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'Danh sách assignments không hợp lệ' }, { status: 400 });
    }

    const saved = await saveExamAssignmentsForExam(exam_id, assignments, targetTeacherId);

    return NextResponse.json({
      success: true,
      data: saved
    });
  } catch (err: any) {
    console.error('API exam-assignments error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
