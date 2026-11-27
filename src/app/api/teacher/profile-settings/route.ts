import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin, getSupabaseServerClient, JWT_SECRET } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TEACHER_PROFILE_SETTINGS_ACTION = 'UPDATE_TEACHER_PROFILE_SETTINGS';

async function getAuthenticatedTeacher(request?: Request) {
  const cookieStore = await cookies();
  let token = cookieStore.get('supabase-jwt')?.value || '';

  if (!token && request) {
    const authHeader = request.headers.get('authorization') || '';
    token = authHeader.replace(/^Bearer\s+/i, '');
  }

  if (!token) return null;

  let decoded: any = null;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    decoded = jwt.decode(token);
  }

  if (!decoded || !decoded.sub) return null;

  const userId = String(decoded.sub);
  const email = String(decoded.email || '').trim().toLowerCase();
  const db = supabaseAdmin || (await getSupabaseServerClient());
  let actualUserId = userId;

  if (email && db) {
    const { data: profile } = await db
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();

    if (profile?.id) {
      actualUserId = profile.id;
    }
  }

  return { userId, actualUserId, email, db };
}

async function readLatestTeacherSettings(db: any, actualUserId: string, userId: string) {
  let avatar_url: string | null = null;

  try {
    const { data: logs } = await db
      .from('audit_logs')
      .select('new_values, created_at')
      .eq('target_table', 'profiles')
      .eq('action', TEACHER_PROFILE_SETTINGS_ACTION)
      .or(`target_id.eq.${actualUserId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    const latest = logs?.[0]?.new_values;
    if (latest && typeof latest === 'object' && typeof latest.avatar_url === 'string' && latest.avatar_url.trim()) {
      avatar_url = latest.avatar_url.trim();
    }
  } catch (err) {
    console.warn('[TeacherProfileSettings] Error reading audit_logs:', err);
  }

  return { avatar_url };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedTeacher(request);
    if (!auth || !auth.db) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const settings = await readLatestTeacherSettings(auth.db, auth.actualUserId, auth.userId);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[TeacherProfileSettings GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedTeacher(request);
    if (!auth || !auth.db) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    let nextAvatarUrl: string | null = null;

    if (body.avatar_url === null || body.avatar_url === '') {
      nextAvatarUrl = null;
    } else if (typeof body.avatar_url === 'string') {
      const trimmed = body.avatar_url.trim();
      if (trimmed.length > 600_000) {
        return NextResponse.json({ error: 'Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn.' }, { status: 400 });
      }
      nextAvatarUrl = trimmed;
    } else {
      return NextResponse.json({ error: 'Dữ liệu ảnh đại diện không hợp lệ.' }, { status: 400 });
    }

    // 1. Thử cập nhật trực tiếp lên bảng profiles nếu cột avatar_url tồn tại
    try {
      await auth.db
        .from('profiles')
        .update({ avatar_url: nextAvatarUrl })
        .eq('id', auth.actualUserId);
    } catch {
      // Cột chưa có -> dùng Dual Persistence qua audit_logs
    }

    // 2. Lưu bền vững vào audit_logs
    const { error: logErr } = await auth.db.from('audit_logs').insert({
      actor_id: auth.actualUserId,
      action: TEACHER_PROFILE_SETTINGS_ACTION,
      target_table: 'profiles',
      target_id: auth.actualUserId,
      new_values: { avatar_url: nextAvatarUrl }
    });

    if (logErr) {
      console.error('[TeacherProfileSettings] Audit log insert error:', logErr);
      return NextResponse.json({ error: 'Không thể lưu ảnh đại diện.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: { avatar_url: nextAvatarUrl }
    });
  } catch (error: any) {
    console.error('[TeacherProfileSettings POST Error]:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
