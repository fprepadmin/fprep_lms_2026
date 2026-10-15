import { NextResponse } from 'next/server';
import { supabaseAdmin, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Xác thực quyền Admin
async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (payload && payload.role === 'admin') {
    return payload.sub;
  }
  return null;
}

/**
 * POST /api/admin/classes/background
 * Body: { classId: string, backgroundUrl: string | null }
 */
export async function POST(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 });
    }

    const { classId, backgroundUrl } = await request.json();
    if (!classId) {
      return NextResponse.json({ error: 'Thiếu mã lớp học (classId)' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    const cleanUrl = backgroundUrl && typeof backgroundUrl === 'string' ? backgroundUrl.trim() : null;

    // 1. Thử cập nhật trực tiếp vào bảng classes (nếu cột background_url đã tồn tại)
    let directUpdateSucceeded = false;
    try {
      const { error: directErr } = await supabaseAdmin
        .from('classes')
        .update({ background_url: cleanUrl })
        .eq('id', classId);

      if (!directErr) {
        directUpdateSucceeded = true;
      }
    } catch (e) {
      // Column might not exist yet in schema cache
      console.warn('[Classes Background] Direct column update caught:', e);
    }

    // 2. Lưu trữ vết vào audit_logs (Dual Persistence) để luôn hoạt động bền vững
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action: 'SET_CLASS_BACKGROUND',
        target_table: 'classes',
        target_id: classId,
        new_values: { background_url: cleanUrl }
      });
    } catch (auditErr) {
      console.error('[Classes Background] Error recording audit log:', auditErr);
    }

    return NextResponse.json({
      success: true,
      classId,
      backgroundUrl: cleanUrl,
      directUpdateSucceeded
    });
  } catch (err: any) {
    console.error('[Classes Background API Error]:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
