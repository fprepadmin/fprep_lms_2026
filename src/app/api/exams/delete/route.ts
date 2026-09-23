import { NextResponse } from 'next/server';
import { supabaseAdmin, createSupabaseClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function verifyAuthorizedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (
    payload &&
    (payload.role === 'teacher' ||
      payload.role === 'admin' ||
      payload.role === 'head_of_department')
  ) {
    return payload;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuthorizedUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác xóa đề thi.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { examId } = body;

    if (!examId || typeof examId !== 'string') {
      return NextResponse.json(
        { error: 'Mã đề thi (examId) không hợp lệ.' },
        { status: 400 }
      );
    }

    const db = supabaseAdmin || createSupabaseClient();

    // 1. Xóa toàn bộ kết quả thi của học sinh liên quan đến đề thi này
    const { error: resultsErr } = await db
      .from('exam_results')
      .delete()
      .eq('exam_id', examId);
    if (resultsErr) {
      console.warn('[DELETE EXAM] Cảnh báo xóa exam_results:', resultsErr.message);
    }

    // 2. Xóa toàn bộ câu hỏi của đề thi
    const { error: questionsErr } = await db
      .from('questions')
      .delete()
      .eq('exam_id', examId);
    if (questionsErr) {
      console.warn('[DELETE EXAM] Cảnh báo xóa questions:', questionsErr.message);
    }

    // 3. Xóa các phân công giao bài cho lớp
    const { error: assignmentsErr } = await db
      .from('exam_assignments')
      .delete()
      .eq('exam_id', examId);
    if (assignmentsErr) {
      console.warn('[DELETE EXAM] Cảnh báo xóa exam_assignments:', assignmentsErr.message);
    }

    // 4. Xóa chính đề thi
    const { error: examErr } = await db
      .from('exams')
      .delete()
      .eq('id', examId);

    if (examErr) {
      console.error('[DELETE EXAM] Lỗi khi xóa exams:', examErr);
      return NextResponse.json(
        { error: 'Không thể xóa đề thi khỏi cơ sở dữ liệu: ' + examErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa thành công đề thi cùng toàn bộ dữ liệu đi kèm (câu hỏi, giao bài, kết quả thi).',
      examId
    });
  } catch (error: any) {
    console.error('[DELETE EXAM ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi máy chủ nội bộ khi xóa đề thi.' },
      { status: 500 }
    );
  }
}
