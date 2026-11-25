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
    let callerId = '';
    let callerRole = '';
    if (token) {
      const payload = verifySessionToken(token);
      if (payload?.sub) {
        callerId = payload.sub;
        callerRole = payload.role || '';
      }
    }

    const body = await request.json();
    const { exam_id, assignments, teacher_id, action, force, title } = body;

    if (!exam_id) {
      return NextResponse.json({ error: 'Thiếu exam_id' }, { status: 400 });
    }

    const isAdmin = callerRole === 'admin';
    const targetTeacherId = isAdmin ? (teacher_id ?? '') : (callerId || teacher_id || '');

    if (action === 'record_author') {
      const allowForce = isAdmin && Boolean(force);
      if (targetTeacherId || allowForce) {
        await recordExamAuthor(exam_id, targetTeacherId, {
          force: allowForce,
          title: typeof title === 'string' ? title : undefined
        });
      }
      return NextResponse.json({ success: true, exam_id, teacher_id: targetTeacherId || null });
    }

    // Mặc định là lưu phân công đề thi
    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'Danh sách assignments không hợp lệ' }, { status: 400 });
    }

    const saved = await saveExamAssignmentsForExam(exam_id, assignments, targetTeacherId || undefined);

    return NextResponse.json({
      success: true,
      data: saved
    });
  } catch (err: any) {
    console.error('API exam-assignments error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
