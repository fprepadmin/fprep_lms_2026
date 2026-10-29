import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin, JWT_SECRET } from '@/lib/supabase';
import { calculateGamification } from '@/lib/gamification';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('supabase-jwt')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    let decoded: any = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      decoded = jwt.decode(token);
    }

    if (!decoded || !decoded.sub) {
      return NextResponse.json({ error: 'Phiên đăng nhập không hợp lệ' }, { status: 401 });
    }

    const studentId = decoded.sub;
    const studentEmail = (decoded.email || '').trim().toLowerCase();

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Lỗi máy chủ cơ sở dữ liệu' }, { status: 500 });
    }

    // 1. Xác định ID học sinh chính xác trong CSDL
    let actualStudentId = studentId;

    if (studentEmail) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', studentEmail)
        .maybeSingle();

      if (profile && profile.id) {
        actualStudentId = profile.id;
      }
    }

    // 2. Truy vấn song song bằng quyền supabaseAdmin để luôn lấy dữ liệu đầy đủ
    const [detailRes, progressRes, logsRes, examsRes] = await Promise.all([
      supabaseAdmin
        .from('student_details')
        .select('full_name, mshs, class_id, classes(id, name)')
        .or(`student_id.eq.${actualStudentId},student_id.eq.${studentId}`)
        .maybeSingle(),
      supabaseAdmin
        .from('study_progress')
        .select('*')
        .or(`student_id.eq.${actualStudentId},student_id.eq.${studentId}`),
      supabaseAdmin
        .from('study_logs')
        .select('duration_seconds, created_at')
        .or(`student_id.eq.${actualStudentId},student_id.eq.${studentId}`),
      supabaseAdmin
        .from('exam_results')
        .select('exam_id, score, created_at')
        .or(`student_id.eq.${actualStudentId},student_id.eq.${studentId}`)
    ]);

    const progress = progressRes.data || [];
    const logs = logsRes.data || [];
    const exams = examsRes.data || [];

    const stats = calculateGamification(progress, logs, exams);

    const studentDetail = detailRes.data;
    const cls = studentDetail?.classes as any;
    const classObj = Array.isArray(cls) ? cls[0] : cls;
    const className = classObj?.name || 'Chưa xếp lớp';
    const classId = studentDetail?.class_id || classObj?.id;
    let classBackgroundUrl = classObj?.background_url || '';

    if (!classBackgroundUrl && classId) {
      try {
        const { data: bgLog } = await supabaseAdmin
          .from('audit_logs')
          .select('new_values')
          .eq('target_table', 'classes')
          .eq('target_id', classId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bgLog?.new_values?.background_url) {
          classBackgroundUrl = bgLog.new_values.background_url;
        }
      } catch (err) {
        console.error('Error fetching class background log:', err);
      }
    }

    const fullName = studentDetail?.full_name || (studentEmail ? studentEmail.split('@')[0] : 'Học sinh');
    const mshs = studentDetail?.mshs || (studentEmail ? studentEmail.split('@')[0].toUpperCase() : 'Chưa cập nhật');

    return NextResponse.json({
      success: true,
      stats,
      profile: {
        fullName,
        className,
        mshs,
        classBackgroundUrl: classBackgroundUrl || null
      }
    });

  } catch (error: any) {
    console.error('[GAMIFICATION API ERROR]:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi xử lý' }, { status: 500 });
  }
}
