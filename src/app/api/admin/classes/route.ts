import { NextResponse } from 'next/server';
import { supabaseAdmin, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import crypto from 'crypto';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Hàm helper để xác thực quyền admin của người dùng hiện tại
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

// 1. POST: Tạo lớp học mới
export async function POST(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập quản trị hệ thống' }, { status: 403 });
    }

    const { name, groupType, academicYear } = await request.json();

    if (!name || !groupType || !academicYear) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    const newClassId = crypto.randomUUID();

    // Thêm vào bảng classes
    const { data: newClass, error: classError } = await supabaseAdmin
      .from('classes')
      .insert({
        id: newClassId,
        name: name.trim().toUpperCase(),
        group_type: groupType,
        academic_year: academicYear.trim()
      })
      .select()
      .single();

    if (classError) {
      console.error('Lỗi insert classes:', classError);
      return NextResponse.json({ error: 'Không thể thêm lớp học. Lỗi cơ sở dữ liệu.' }, { status: 500 });
    }

    // Ghi nhận nhật ký audit logs
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action: 'CREATE_CLASS',
        target_table: 'classes',
        target_id: newClassId,
        new_values: { name, groupType, academicYear }
      });
    } catch (auditErr) {
      console.error('Lỗi ghi audit log:', auditErr);
    }

    return NextResponse.json({ success: true, data: newClass });

  } catch (err: any) {
    console.error('Lỗi API create class:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// 2. PUT: Cập nhật lớp học
export async function PUT(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập quản trị hệ thống' }, { status: 403 });
    }

    const { classId, name, groupType, academicYear } = await request.json();

    if (!classId || !name || !groupType || !academicYear) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    // Lấy thông tin cũ để ghi audit log
    const { data: oldClass } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    // Cập nhật lớp học
    const { error: updateError } = await supabaseAdmin
      .from('classes')
      .update({
        name: name.trim().toUpperCase(),
        group_type: groupType,
        academic_year: academicYear.trim()
      })
      .eq('id', classId);

    if (updateError) {
      console.error('Lỗi cập nhật classes:', updateError);
      return NextResponse.json({ error: 'Không thể cập nhật lớp học. Lỗi cơ sở dữ liệu.' }, { status: 500 });
    }

    // Ghi nhật ký audit logs
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action: 'UPDATE_CLASS',
        target_table: 'classes',
        target_id: classId,
        old_values: oldClass,
        new_values: { name, groupType, academicYear }
      });
    } catch (auditErr) {
      console.error('Lỗi ghi audit log:', auditErr);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Lỗi API update class:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// 3. DELETE: Xóa lớp học
export async function DELETE(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập quản trị hệ thống' }, { status: 403 });
    }

    const { classId } = await request.json();

    if (!classId) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    // Lấy thông tin cũ để ghi audit log
    const { data: targetClass } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    // Xóa lớp học (cascade đặt học sinh thuộc lớp về null)
    const { error: deleteError } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', classId);

    if (deleteError) {
      console.error('Lỗi khi xóa classes:', deleteError);
      return NextResponse.json({ error: 'Không thể xóa lớp học. Lỗi cơ sở dữ liệu.' }, { status: 500 });
    }

    // Ghi nhật ký audit logs
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action: 'DELETE_CLASS',
        target_table: 'classes',
        target_id: classId,
        old_values: targetClass
      });
    } catch (auditErr) {
      console.error('Lỗi ghi audit log:', auditErr);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Lỗi API delete class:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// 4. PATCH: Cập nhật phân công giáo viên bộ môn cho Lớp học
export async function PATCH(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập quản trị hệ thống' }, { status: 403 });
    }

    const { classId, assignments } = await request.json();

    if (!classId || !Array.isArray(assignments)) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc hoặc assignments không hợp lệ' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    // 1. Xóa toàn bộ phân công cũ của lớp này
    const { error: delErr } = await supabaseAdmin
      .from('teacher_classes')
      .delete()
      .eq('class_id', classId);

    if (delErr) {
      console.error('Lỗi xóa teacher_classes cũ của lớp:', delErr);
      return NextResponse.json({ error: 'Không thể xóa phân công cũ' }, { status: 500 });
    }

    // 2. Thêm các phân công mới hợp lệ (teacherId và subjectId có giá trị)
    const validAssignments = assignments
      .filter((a: any) => a.teacherId && a.subjectId)
      .map((a: any) => ({
        class_id: classId,
        teacher_id: a.teacherId,
        subject_id: a.subjectId
      }));

    if (validAssignments.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('teacher_classes')
        .insert(validAssignments);

      if (insErr) {
        console.error('Lỗi thêm phân công mới teacher_classes:', insErr);
        return NextResponse.json({ error: 'Không thể lưu phân công giáo viên mới' }, { status: 500 });
      }
    }

    // 3. Ghi audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action: 'UPDATE_CLASS_TEACHER_ASSIGNMENTS',
        target_table: 'teacher_classes',
        target_id: classId,
        new_values: { classId, validAssignments }
      });
    } catch (auditErr) {
      console.error('Lỗi ghi audit log:', auditErr);
    }

    // 4. Lấy danh sách phân công mới trả về
    const { data: updatedAssignments } = await supabaseAdmin
      .from('teacher_classes')
      .select('*')
      .eq('class_id', classId);

    return NextResponse.json({ success: true, data: updatedAssignments || [] });

  } catch (err: any) {
    console.error('Lỗi API patch class assignments:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

