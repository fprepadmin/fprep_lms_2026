import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin, getSupabaseServerClient, JWT_SECRET } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROFILE_SETTINGS_ACTION = 'UPDATE_STUDENT_PROFILE_SETTINGS';

async function getAuthenticatedStudent(request?: Request) {
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

  const studentId = String(decoded.sub);
  const studentEmail = String(decoded.email || '').trim().toLowerCase();

  const db = supabaseAdmin || (await getSupabaseServerClient());
  let actualStudentId = studentId;

  if (studentEmail && db) {
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('email', studentEmail)
      .maybeSingle();

    if (profile?.id) {
      actualStudentId = profile.id;
    }
  }

  return { studentId, actualStudentId, studentEmail, db };
}

async function readLatestSettings(db: any, actualStudentId: string, studentId: string) {
  let avatar_url: string | null = null;
  let elective_subject_ids: string[] = [];

  try {
    const { data: logs } = await db
      .from('audit_logs')
      .select('new_values, created_at')
      .eq('target_table', 'student_details')
      .eq('action', PROFILE_SETTINGS_ACTION)
      .or(`target_id.eq.${actualStudentId},target_id.eq.${studentId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    const latest = logs?.[0]?.new_values;
    if (latest && typeof latest === 'object') {
      if (typeof latest.avatar_url === 'string' && latest.avatar_url.trim()) {
        avatar_url = latest.avatar_url.trim();
      }
      if (Array.isArray(latest.elective_subject_ids)) {
        elective_subject_ids = latest.elective_subject_ids
          .filter((x: any) => typeof x === 'string' && x.trim() !== '')
          .slice(0, 2);
      }
    }
  } catch (err) {
    console.warn('[StudentProfileSettings] Error reading audit_logs:', err);
  }

  return { avatar_url, elective_subject_ids };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedStudent(request);
    if (!auth || !auth.db) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const settings = await readLatestSettings(auth.db, auth.actualStudentId, auth.studentId);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('[StudentProfileSettings GET Error]:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedStudent(request);
    if (!auth || !auth.db) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const current = await readLatestSettings(auth.db, auth.actualStudentId, auth.studentId);

    let nextAvatarUrl = current.avatar_url;
    if ('avatar_url' in body) {
      if (body.avatar_url === null || body.avatar_url === '') {
        nextAvatarUrl = null;
      } else if (typeof body.avatar_url === 'string') {
        const trimmed = body.avatar_url.trim();
        if (trimmed.length > 600_000) {
          return NextResponse.json({ error: 'Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn.' }, { status: 400 });
        }
        nextAvatarUrl = trimmed;
      }
    }

    let nextElectives = current.elective_subject_ids;
    if ('elective_subject_ids' in body) {
      if (!Array.isArray(body.elective_subject_ids)) {
        return NextResponse.json({ error: 'Danh sách môn tự chọn không hợp lệ' }, { status: 400 });
      }
      const cleanIds: string[] = body.elective_subject_ids
        .filter((x: unknown): x is string => typeof x === 'string' && x.trim() !== '')
        .map((x: string) => x.trim());
      nextElectives = Array.from(new Set<string>(cleanIds)).slice(0, 2);
    }

    const merged = {
      avatar_url: nextAvatarUrl,
      elective_subject_ids: nextElectives
    };

    // 1. Thử cập nhật trực tiếp lên student_details nếu cột đã tồn tại
    try {
      await auth.db
        .from('student_details')
        .update({
          avatar_url: nextAvatarUrl,
          graduation_subjects: nextElectives
        })
        .eq('student_id', auth.actualStudentId);
    } catch {
      // Cột chưa có trong schema -> bỏ qua, dùng Dual Persistence ở audit_logs bên dưới
    }

    // 2. Lưu bền vững vào audit_logs (Dual Persistence)
    const { error: logErr } = await auth.db.from('audit_logs').insert({
      actor_id: auth.actualStudentId,
      action: PROFILE_SETTINGS_ACTION,
      target_table: 'student_details',
      target_id: auth.actualStudentId,
      new_values: merged
    });

    if (logErr) {
      console.error('[StudentProfileSettings] Audit log insert error:', logErr);
      return NextResponse.json({ error: 'Không thể lưu thiết lập hồ sơ học sinh' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settings: merged
    });
  } catch (error: any) {
    console.error('[StudentProfileSettings POST Error]:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
