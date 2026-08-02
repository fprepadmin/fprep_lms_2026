import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Hàm helper để xác thực quyền admin của người dùng hiện tại
async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value;
  if (!token) return null;

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    if (payload.role === 'admin') {
      return payload.sub; // Trả về admin userId
    }
  } catch (e) {
    console.error('Lỗi xác thực token admin:', e);
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

    const mockClassId = crypto.randomUUID();

    // Thêm vào bảng classes
    const { data: newClass, error: classError } = await supabaseAdmin
      .from('classes')
      .insert({
        id: mockClassId,
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
        target_id: mockClassId,
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
