import { NextResponse } from 'next/server';
import { supabaseAdmin, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

export async function POST(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền quản trị hệ thống' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    const body = await request.json();
    const { actionType, userIds, classIds, filter } = body;

    let deletedCount = 0;

    // ----------------------------------------------------
    // 1. XOÁ DANH SÁCH USER ĐƯỢC CHỌN (SELECTED USERS)
    // ----------------------------------------------------
    if (actionType === 'delete_selected_users' && Array.isArray(userIds) && userIds.length > 0) {
      // Bảo vệ tài khoản admin hiện tại và default admin
      const validUserIds = userIds.filter(id => id !== adminId);

      // Lấy danh sách profiles để kiểm tra và bảo vệ default admin
      const { data: profilesToDelete } = await supabaseAdmin
        .from('profiles')
        .select('id, email, role')
        .in('id', validUserIds);

      const safeIds = (profilesToDelete || [])
        .filter(p => p.email !== 'fprep.fschool@gmail.com')
        .map(p => p.id);

      if (safeIds.length === 0) {
        return NextResponse.json({ error: 'Không có tài khoản hợp lệ để xóa (đã loại trừ Admin).' }, { status: 400 });
      }

      // Xóa liên hoàn dữ liệu liên quan
      await supabaseAdmin.from('student_details').delete().in('student_id', safeIds);
      await supabaseAdmin.from('study_progress').delete().in('student_id', safeIds);
      await supabaseAdmin.from('study_logs').delete().in('student_id', safeIds);
      await supabaseAdmin.from('exam_results').delete().in('student_id', safeIds);
      await supabaseAdmin.from('support_requests').delete().in('student_id', safeIds);
      await supabaseAdmin.from('teacher_classes').delete().in('teacher_id', safeIds);

      // Xóa profile
      const { error: delErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .in('id', safeIds);

      if (delErr) {
        console.error('Lỗi batch delete users:', delErr);
        return NextResponse.json({ error: 'Lỗi khi xóa từ CSDL: ' + delErr.message }, { status: 500 });
      }

      deletedCount = safeIds.length;

      // Ghi audit log
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_id: adminId,
          action: 'BATCH_DELETE_USERS',
          target_table: 'profiles',
          target_id: safeIds.join(','),
          new_values: { count: deletedCount, ids: safeIds }
        });
      } catch (logErr) {
        console.error('Lỗi ghi audit log:', logErr);
      }

      return NextResponse.json({ success: true, count: deletedCount });
    }

    // ----------------------------------------------------
    // 2. XOÁ DANH SÁCH LỚP HỌC ĐƯỢC CHỌN (SELECTED CLASSES)
    // ----------------------------------------------------
    if (actionType === 'delete_selected_classes' && Array.isArray(classIds) && classIds.length > 0) {
      // 1. Cập nhật học sinh trong lớp về trạng thái chưa xếp lớp
      await supabaseAdmin
        .from('student_details')
        .update({ class_id: null })
        .in('class_id', classIds);

      // 2. Xóa phân công giáo viên của các lớp này
      await supabaseAdmin
        .from('teacher_classes')
        .delete()
        .in('class_id', classIds);

      // 3. Xóa lớp học
      const { error: delClassErr } = await supabaseAdmin
        .from('classes')
        .delete()
        .in('id', classIds);

      if (delClassErr) {
        console.error('Lỗi batch delete classes:', delClassErr);
        return NextResponse.json({ error: 'Lỗi khi xóa lớp học: ' + delClassErr.message }, { status: 500 });
      }

      deletedCount = classIds.length;

      // Ghi audit log
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_id: adminId,
          action: 'BATCH_DELETE_CLASSES',
          target_table: 'classes',
          target_id: classIds.join(','),
          new_values: { count: deletedCount, classIds }
        });
      } catch (logErr) {
        console.error('Lỗi ghi audit log:', logErr);
      }

      return NextResponse.json({ success: true, count: deletedCount });
    }

    // ----------------------------------------------------
    // 3. XOÁ TOÀN BỘ HỌC SINH (HOẶC THEO BỘ LỌC LỚP)
    // ----------------------------------------------------
    if (actionType === 'delete_students_by_filter') {
      let query = supabaseAdmin
        .from('student_details')
        .select('student_id, class_id');

      if (filter?.classId && filter.classId !== 'all') {
        if (filter.classId === 'unassigned') {
          query = query.is('class_id', null);
        } else {
          query = query.eq('class_id', filter.classId);
        }
      }

      const { data: students } = await query;
      const targetIds = (students || []).map(s => s.student_id).filter(Boolean);

      if (targetIds.length === 0) {
        // Kiểm tra xem có profiles role=student nào chưa có trong student_details không
        const { data: orphanStudents } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('role', 'student');
        
        const orphanIds = (orphanStudents || []).map(p => p.id);
        if (orphanIds.length > 0 && (!filter?.classId || filter.classId === 'all' || filter.classId === 'unassigned')) {
          targetIds.push(...orphanIds);
        }
      }

      if (targetIds.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'Không có học sinh nào phù hợp bộ lọc để xóa.' });
      }

      // Xóa liên hoàn
      await supabaseAdmin.from('student_details').delete().in('student_id', targetIds);
      await supabaseAdmin.from('study_progress').delete().in('student_id', targetIds);
      await supabaseAdmin.from('study_logs').delete().in('student_id', targetIds);
      await supabaseAdmin.from('exam_results').delete().in('student_id', targetIds);
      await supabaseAdmin.from('support_requests').delete().in('student_id', targetIds);

      // Xóa profiles
      const { error: delProfileErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .in('id', targetIds);

      if (delProfileErr) {
        console.error('Lỗi khi xóa profiles học sinh:', delProfileErr);
        return NextResponse.json({ error: 'Lỗi khi xóa học sinh: ' + delProfileErr.message }, { status: 500 });
      }

      deletedCount = targetIds.length;

      // Ghi audit log
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_id: adminId,
          action: 'BATCH_DELETE_STUDENTS_FILTER',
          target_table: 'profiles',
          target_id: 'batch_filter',
          new_values: { count: deletedCount, filter }
        });
      } catch (logErr) {
        console.error('Lỗi ghi audit log:', logErr);
      }

      return NextResponse.json({ success: true, count: deletedCount });
    }

    // ----------------------------------------------------
    // 4. XOÁ TOÀN BỘ GIÁO VIÊN THEO BỘ LỌC
    // ----------------------------------------------------
    if (actionType === 'delete_teachers_by_filter') {
      let teacherProfilesQuery = supabaseAdmin
        .from('profiles')
        .select('id, email, role')
        .in('role', ['teacher', 'head_of_department'])
        .neq('id', adminId)
        .neq('email', 'fprep.fschool@gmail.com');

      const { data: teachers } = await teacherProfilesQuery;
      let targetTeacherIds = (teachers || []).map(t => t.id);

      // Nếu có filter theo subjectId
      if (filter?.subjectId && filter.subjectId !== 'all') {
        const { data: teacherClassRows } = await supabaseAdmin
          .from('teacher_classes')
          .select('teacher_id')
          .eq('subject_id', filter.subjectId);

        const matchedIds = new Set((teacherClassRows || []).map(r => r.teacher_id));
        targetTeacherIds = targetTeacherIds.filter(id => matchedIds.has(id));
      }

      if (targetTeacherIds.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'Không tìm thấy giáo viên nào phù hợp bộ lọc để xóa.' });
      }

      // Xóa teacher_classes
      await supabaseAdmin.from('teacher_classes').delete().in('teacher_id', targetTeacherIds);

      // Xóa profiles
      const { error: delTeacherErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .in('id', targetTeacherIds);

      if (delTeacherErr) {
        console.error('Lỗi khi xóa giáo viên:', delTeacherErr);
        return NextResponse.json({ error: 'Lỗi khi xóa giáo viên: ' + delTeacherErr.message }, { status: 500 });
      }

      deletedCount = targetTeacherIds.length;

      // Ghi audit log
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_id: adminId,
          action: 'BATCH_DELETE_TEACHERS_FILTER',
          target_table: 'profiles',
          target_id: 'batch_filter',
          new_values: { count: deletedCount, filter }
        });
      } catch (logErr) {
        console.error('Lỗi ghi audit log:', logErr);
      }

      return NextResponse.json({ success: true, count: deletedCount });
    }

    return NextResponse.json({ error: 'Hành động xóa không hợp lệ' }, { status: 400 });

  } catch (err: any) {
    console.error('Lỗi trong batch-delete route:', err);
    return NextResponse.json({ error: 'Lỗi máy chủ: ' + err.message }, { status: 500 });
  }
}
