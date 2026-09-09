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
  if (payload && (payload.role === 'admin' || payload.role === 'head_of_department')) {
    return payload.sub; // Trả về admin hoặc HOD userId
  }
  return null;
}

// 1. POST: Tạo tài khoản mới & phân quyền sẵn (Admin)
export async function POST(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập quản trị hệ thống' }, { status: 403 });
    }

    const { email, role, fullName, fptName, classId, subjectId, classIds, gasUrl } = await request.json();

    if (!email || !role || !fullName || !fptName) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    // Kiểm tra nếu profile đã tồn tại
    let { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    let targetUserId = '';
    let finalProfile = null;
    let isUpdate = false;

    if (existingProfile) {
      targetUserId = existingProfile.id;
      isUpdate = true;

      // Cập nhật vai trò (role) của tài khoản cũ
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: role })
        .eq('id', targetUserId)
        .select()
        .single();

      if (updateError) {
        console.error('Lỗi cập nhật profiles khi upsert:', updateError);
        return NextResponse.json({ error: 'Không thể cập nhật tài khoản đã tồn tại.' }, { status: 500 });
      }
      finalProfile = updatedProfile;

      // Cập nhật thông tin student_details (upsert)
      if (role === 'student') {
        const { error: stdError } = await supabaseAdmin
          .from('student_details')
          .upsert({
            student_id: targetUserId,
            mshs: fptName.trim().toUpperCase(),
            full_name: fullName.trim(),
            class_id: classId || null
          }, { onConflict: 'student_id' });

        if (stdError) {
          console.error('Lỗi upsert student_details:', stdError);
          if (stdError.code === '23505') {
            return NextResponse.json({ error: 'Tên FPT / Mã số học sinh này đã tồn tại trên hệ thống.' }, { status: 400 });
          }
          return NextResponse.json({ error: 'Không thể cập nhật thông tin học sinh. Lỗi cơ sở dữ liệu.' }, { status: 500 });
        }
      } else {
        // Xóa thông tin học sinh nếu vai trò không còn là student
        await supabaseAdmin.from('student_details').delete().eq('student_id', targetUserId);
      }

      // Ghi audit log
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_id: adminId,
          action: 'UPSERT_USER_PROFILE_UPDATE',
          target_table: 'profiles',
          target_id: targetUserId,
          new_values: { email, role, fullName, fptName }
        });
      } catch (auditErr) {
        console.error('Lỗi ghi audit log:', auditErr);
      }

    } else {
      // TẠO TÀI KHOẢN MỚI HOÀN TOÀN
      targetUserId = crypto.randomUUID();

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: targetUserId,
          email: email.trim().toLowerCase(),
          role: role
        })
        .select()
        .single();

      if (profileError) {
        console.error('Lỗi insert profiles:', profileError);
        if (profileError.code === '23505') {
          return NextResponse.json({ error: 'Email này đã được sử dụng trên hệ thống.' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Không thể thêm tài khoản. Lỗi cơ sở dữ liệu.' }, { status: 500 });
      }
      finalProfile = profile;

      if (role === 'student') {
        const { error: stdError } = await supabaseAdmin
          .from('student_details')
          .insert({
            student_id: targetUserId,
            mshs: fptName.trim().toUpperCase(),
            full_name: fullName.trim(),
            class_id: classId || null
          });

        if (stdError) {
          console.error('Lỗi insert student_details:', stdError);
          await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
          if (stdError.code === '23505') {
            return NextResponse.json({ error: 'Tên FPT / Mã số học sinh này đã tồn tại trên hệ thống.' }, { status: 400 });
          }
          return NextResponse.json({ error: 'Không thể khởi tạo thông tin học sinh. Lỗi cơ sở dữ liệu.' }, { status: 500 });
        }
      }

      // Ghi audit log
      try {
        await supabaseAdmin.from('audit_logs').insert({
          actor_id: adminId,
          action: 'CREATE_USER_PROFILE',
          target_table: 'profiles',
          target_id: targetUserId,
          new_values: { email, role, fullName, fptName }
        });
      } catch (auditErr) {
        console.error('Lỗi ghi audit log:', auditErr);
      }
    }

    // Cập nhật phân công giảng dạy cho Giáo viên / HOD
    if (role === 'teacher' || role === 'head_of_department') {
      // A. Xóa phân công cũ
      await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', targetUserId);
      
      // B. Thêm phân công mới
      if (subjectId) {
        if (classIds && Array.isArray(classIds) && classIds.length > 0) {
          const newAssignments = classIds.map(cid => ({
            teacher_id: targetUserId,
            class_id: cid,
            subject_id: subjectId
          }));
          const { error: assignError } = await supabaseAdmin.from('teacher_classes').insert(newAssignments);
          if (assignError) console.error('Lỗi insert teacher_classes:', assignError);
        } else {
          // Lưu phân công môn nhưng chưa xếp lớp (class_id = null)
          const { error: assignError } = await supabaseAdmin.from('teacher_classes').insert({
            teacher_id: targetUserId,
            class_id: null,
            subject_id: subjectId
          });
          if (assignError) console.error('Lỗi insert teacher_classes (no classes):', assignError);
        }
      }
    } else {
      // Xóa phân công giảng dạy nếu không phải là giáo viên/HOD
      await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', targetUserId);
    }
    // Gửi email qua Google Apps Script (Thực hiện phía Server để tránh lỗi CORS và in log)
    if (gasUrl && gasUrl.trim()) {
      try {
        console.log('Server: Sending welcome email via Google Apps Script URL:', gasUrl);
        const gasResponse = await fetch(gasUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            fptName: fptName.trim(),
            role: role
          })
        });
        const gasText = await gasResponse.text();
        console.log('Server: Google Apps Script response status:', gasResponse.status, 'body:', gasText);
      } catch (gasErr) {
        console.error('Server: Lỗi khi gọi Google Apps Script gửi email:', gasErr);
      }
    }
    return NextResponse.json({ success: true, data: finalProfile, isUpdate });

  } catch (err: any) {
    console.error('Lỗi API create user:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// 2. PUT: Cập nhật thông tin chi tiết (Email, Vai trò, Họ tên, Tên FPT) của tài khoản
export async function PUT(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập quản trị hệ thống' }, { status: 403 });
    }

    const { userId, email, role, fullName, fptName, classId, subjectId, classIds, gasUrl } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    if (userId === adminId) {
      return NextResponse.json({ error: 'Bạn không thể tự cập nhật vai trò của chính mình' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    // Lấy thông tin cũ để ghi audit log
    const { data: oldProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    // 1. Cập nhật profile (Email, Role)
    const updatePayload: any = { role };
    if (email) updatePayload.email = email.trim().toLowerCase();

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (updateError) {
      console.error('Lỗi cập nhật profile:', updateError);
      return NextResponse.json({ error: 'Không thể thay đổi thông tin. Lỗi cơ sở dữ liệu.' }, { status: 500 });
    }

    // 2. Cập nhật student_details nếu là student, hoặc xóa nếu chuyển sang role khác
    if (role === 'student') {
      if (fullName && fptName) {
        // Thử upsert student_details
        const { error: stdError } = await supabaseAdmin
          .from('student_details')
          .upsert({
            student_id: userId,
            mshs: fptName.trim().toUpperCase(),
            full_name: fullName.trim(),
            class_id: classId || null
          }, { onConflict: 'student_id' });

        if (stdError) console.error('Lỗi cập nhật student_details:', stdError);
      }
    } else {
      // Xóa student_details nếu chuyển sang vai trò khác học sinh
      await supabaseAdmin
        .from('student_details')
        .delete()
        .eq('student_id', userId);
    }

    // 3. Cập nhật phân công giảng dạy cho Giáo viên / HOD
    if (role === 'teacher' || role === 'head_of_department') {
      // A. Xóa phân công cũ
      await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', userId);
      
      // B. Thêm phân công mới
      if (subjectId) {
        if (classIds && Array.isArray(classIds) && classIds.length > 0) {
          const newAssignments = classIds.map(cid => ({
            teacher_id: userId,
            class_id: cid,
            subject_id: subjectId
          }));
          const { error: assignError } = await supabaseAdmin.from('teacher_classes').insert(newAssignments);
          if (assignError) console.error('Lỗi insert teacher_classes:', assignError);
        } else {
          // Lưu phân công môn nhưng chưa xếp lớp (class_id = null)
          const { error: assignError } = await supabaseAdmin.from('teacher_classes').insert({
            teacher_id: userId,
            class_id: null,
            subject_id: subjectId
          });
          if (assignError) console.error('Lỗi insert teacher_classes (no classes):', assignError);
        }
      }
    } else {
      // Xóa phân công giảng dạy nếu không phải là giáo viên/HOD
      await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', userId);
    }

    // Ghi nhận nhật ký audit logs
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action: 'UPDATE_PROFILE_DETAILS',
        target_table: 'profiles',
        target_id: userId,
        old_values: oldProfile,
        new_values: { email, role, fullName, fptName }
      });
    } catch (auditErr) {
      console.error('Lỗi ghi audit log:', auditErr);
    }

    // Gửi email qua Google Apps Script nếu có gasUrl khi cập nhật vai trò/thông tin
    if (gasUrl && gasUrl.trim()) {
      try {
        console.log('Server (PUT): Sending update email via Google Apps Script URL:', gasUrl);
        const finalEmail = email ? email.trim().toLowerCase() : (oldProfile?.email || '');
        
        let finalFullName = fullName ? fullName.trim() : '';
        let finalFptName = fptName ? fptName.trim() : '';
        
        if (!finalFullName || !finalFptName) {
          const { data: std } = await supabaseAdmin
            .from('student_details')
            .select('full_name, mshs')
            .eq('student_id', userId)
            .maybeSingle();
          if (std) {
            if (!finalFullName) finalFullName = std.full_name;
            if (!finalFptName) finalFptName = std.mshs;
          }
        }

        const gasResponse = await fetch(gasUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: finalEmail,
            fullName: finalFullName || finalEmail.split('@')[0],
            fptName: finalFptName || finalEmail.split('@')[0],
            role: role
          })
        });
        const gasText = await gasResponse.text();
        console.log('Server (PUT): Google Apps Script response status:', gasResponse.status, 'body:', gasText);
      } catch (gasErr) {
        console.error('Server (PUT): Lỗi khi gọi Google Apps Script gửi email:', gasErr);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Lỗi API update user:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// 3. DELETE: Xóa hoàn toàn tài khoản khỏi hệ thống
export async function DELETE(request: Request) {
  try {
    const adminId = await verifyAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập quản trị hệ thống' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    if (userId === adminId) {
      return NextResponse.json({ error: 'Bạn không thể tự xóa tài khoản của chính mình' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database Admin Client chưa được cấu hình' }, { status: 500 });
    }

    // Lấy email trước khi xóa để lưu log
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    // Xóa từ bảng profiles (tự động cascade xóa student_details, logs...)
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Lỗi khi xóa profiles:', deleteError);
      return NextResponse.json({ error: 'Không thể xóa tài khoản. Lỗi cơ sở dữ liệu.' }, { status: 500 });
    }

    // Ghi nhận nhật ký audit logs
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: adminId,
        action: 'DELETE_USER_PROFILE',
        target_table: 'profiles',
        target_id: userId,
        old_values: targetProfile
      });
    } catch (auditErr) {
      console.error('Lỗi ghi audit log:', auditErr);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Lỗi API delete user:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
