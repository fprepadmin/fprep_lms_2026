import { NextResponse } from 'next/server';
import { supabaseAdmin, isDemoMode } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, isDemo, email: demoEmail, role: demoRole, uid: demoUid } = body;

    // ==========================================
    // XỬ LÝ CHẾ ĐỘ CHẠY DEMO (KHÔNG CÓ API KEYS)
    // ==========================================
    if (isDemo || isDemoMode) {
      const email = demoEmail || 'hocsinh@fpt.edu.vn';
      const role = demoRole || 'student';
      const uid = demoUid || (role === 'student' ? 'demo-student-id' : role === 'teacher' ? 'demo-teacher-id' : 'demo-admin-id');
      
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Lỗi cấu hình CSDL giả lập' }, { status: 500 });
      }

      // Tra cứu hoặc tạo profile giả lập trong mock_db.json
      let { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: uid,
            email: email,
            role: role
          })
          .select()
          .single();

        if (createError) throw createError;
        profile = newProfile;

        if (role === 'student') {
          await supabaseAdmin
            .from('student_details')
            .insert({
              student_id: uid,
              mshs: 'FPT' + Math.floor(10000 + Math.random() * 90000),
              full_name: 'Học sinh Demo',
              class_id: 'class-12t1'
            });
        }
      }

      // Tạo Custom JWT của Supabase sử dụng secret hoặc fallback demo secret
      const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
      const payload = {
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        sub: uid,
        email: email,
        role: profile?.role || role,
        iss: 'supabase'
      };

      const supabaseToken = jwt.sign(payload, jwtSecret);

      // Thiết lập Cookie phiên làm việc
      const cookieStore = await cookies();
      cookieStore.set('supabase-jwt', supabaseToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7
      });

      return NextResponse.json({
        success: true,
        user: {
          id: uid,
          email: email,
          role: profile?.role || role
        }
      });
    }

    // ==========================================
    // XỬ LÝ CHẾ ĐỘ CHẠY PRODUCTION (THỰC TẾ)
    // ==========================================
    if (!idToken) {
      return NextResponse.json({ error: 'Thiếu idToken' }, { status: 400 });
    }

    let decodedToken;
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'fprep-fschool';
      
      const jwtDecoded = jwt.decode(idToken, { complete: true }) as any;
      if (!jwtDecoded || !jwtDecoded.header || !jwtDecoded.header.kid) {
        throw new Error('Token không hợp lệ hoặc thiếu kid');
      }

      const kid = jwtDecoded.header.kid;
      const certRes = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
      if (!certRes.ok) {
        throw new Error('Không thể tải chứng chỉ công khai của Google');
      }
      const certs = await certRes.json();
      const cert = certs[kid];
      if (!cert) {
        throw new Error('Không tìm thấy chứng chỉ tương thích với kid của token');
      }

      const verified = jwt.verify(idToken, cert, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`
      }) as any;

      decodedToken = {
        uid: verified.sub,
        email: verified.email,
        name: verified.name || verified.email.split('@')[0],
        ...verified
      };
    } catch (tokenError: any) {
      console.error('Lỗi giải mã và xác thực Google Token:', tokenError);
      return NextResponse.json({ error: 'Xác thực Google Token không hợp lệ: ' + tokenError.message }, { status: 401 });
    }

    const { uid, email, name } = decodedToken;

    if (!email) {
      return NextResponse.json({ error: 'Không tìm thấy Email trong token' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Lỗi cấu hình Database Admin' }, { status: 500 });
    }

    const isDefaultAdmin = email.trim().toLowerCase() === 'fprep.fschool@gmail.com';
    let profile = null;

    // 1. Tra cứu bằng Email trước (vì Admin thêm tài khoản qua Email, dùng ID random UUID ban đầu)
    const { data: dbProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (dbProfile) {
      profile = dbProfile;
      
      // Nếu ID trong Database (random UUID của Admin) khác với Firebase UID thật khi đăng nhập lần đầu
      if (profile.id !== uid) {
        console.log(`[AUTH SYNC] Tiến hành đồng bộ UID từ Admin pre-created account cho: ${email} (${profile.id} -> ${uid})`);
        
        // A. Sao lưu các bảng liên quan đến ID cũ
        const { data: studentDetails } = await supabaseAdmin
          .from('student_details')
          .select('*')
          .eq('student_id', profile.id)
          .maybeSingle();
          
        const { data: teacherClasses } = await supabaseAdmin
          .from('teacher_classes')
          .select('*')
          .eq('teacher_id', profile.id);

        // B. Xóa dữ liệu cũ tạm thời để tránh lỗi khóa ngoại (Foreign Key Constraints)
        if (studentDetails) {
          await supabaseAdmin.from('student_details').delete().eq('student_id', profile.id);
        }
        if (teacherClasses && teacherClasses.length > 0) {
          await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', profile.id);
        }
        
        // Dọn dẹp các log/progress rác liên quan nếu có
        await supabaseAdmin.from('study_progress').delete().eq('student_id', profile.id);
        await supabaseAdmin.from('study_logs').delete().eq('student_id', profile.id);
        await supabaseAdmin.from('support_requests').delete().eq('student_id', profile.id);

        // C. Cập nhật ID của profile sang Firebase UID mới
        const { error: updateIdErr } = await supabaseAdmin
          .from('profiles')
          .update({ id: uid })
          .eq('id', profile.id);

        if (updateIdErr) {
          console.error('[AUTH SYNC] Lỗi khi cập nhật profile ID sang Firebase UID:', updateIdErr);
        } else {
          profile.id = uid; // Cập nhật tham chiếu bộ nhớ
          
          // D. Khôi phục lại dữ liệu chi tiết với Firebase UID mới
          if (studentDetails) {
            await supabaseAdmin.from('student_details').insert({
              student_id: uid,
              mshs: studentDetails.mshs,
              full_name: studentDetails.full_name,
              class_id: studentDetails.class_id
            });
          }
          if (teacherClasses && teacherClasses.length > 0) {
            const restoredClasses = teacherClasses.map((tc: any) => ({
              teacher_id: uid,
              class_id: tc.class_id,
              subject_id: tc.subject_id
            }));
            await supabaseAdmin.from('teacher_classes').insert(restoredClasses);
          }
          console.log(`[AUTH SYNC] Hoàn thành đồng bộ profile ID thành công cho: ${email}`);
        }
      }

      // Đảm bảo fprep.fschool@gmail.com luôn có vai trò admin kể cả khi đã có sẵn profile
      if (isDefaultAdmin && profile.role !== 'admin') {
        try {
          const { data: updatedProfile } = await supabaseAdmin
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', uid)
            .select()
            .single();
          if (updatedProfile) {
            profile = updatedProfile;
          }
        } catch (updateErr) {
          console.warn('[AUTH SYNC] Không thể cập nhật quyền admin mặc định:', updateErr);
        }
      }

    } else {
      // 2. Nếu chưa có profile trong Database, tự động tạo mới hoàn toàn (Đăng nhập lần đầu)
      try {
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: uid,
            email: email.trim().toLowerCase(),
            role: isDefaultAdmin ? 'admin' : 'student'
          })
          .select()
          .single();

        if (createError) {
          console.warn('[AUTH SYNC] Không thể tự động tạo profile vào DB (sử dụng fallback):', createError);
          profile = { id: uid, email: email.trim().toLowerCase(), role: isDefaultAdmin ? 'admin' : 'student' };
        } else {
          profile = newProfile;
        }

        if (profile.role === 'student') {
          const fullName = name || email.split('@')[0];
          const mshs = email.split('@')[0].toUpperCase();

          await supabaseAdmin
            .from('student_details')
            .insert({
              student_id: uid,
              mshs,
              full_name: fullName,
              class_id: null
            });
        }
      } catch (insertErr) {
        console.warn('[AUTH SYNC] Không thể khởi tạo student_details (sử dụng fallback):', insertErr);
        profile = { id: uid, email: email, role: isDefaultAdmin ? 'admin' : 'student' };
      }
    }

    // Kiểm tra nếu tài khoản là học sinh thì bắt buộc phải được xếp lớp mới cho đăng nhập
    if (profile && profile.role === 'student') {
      const { data: details } = await supabaseAdmin
        .from('student_details')
        .select('class_id')
        .eq('student_id', uid)
        .single();

      if (!details || !details.class_id) {
        return NextResponse.json({ 
          error: 'Tài khoản học sinh của bạn chưa được xếp lớp. Vui lòng liên hệ Giáo viên hoặc Quản trị viên để được phân lớp trước khi đăng nhập.' 
        }, { status: 403 });
      }
    }

    let jwtSecret: string = process.env.SUPABASE_JWT_SECRET || '';
    const isFallbackSecret = !jwtSecret || jwtSecret.startsWith('THAY_THE_BANG');
    if (isFallbackSecret) {
      jwtSecret = 'demo-jwt-secret-key-12345';
    }

    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      sub: uid,
      email: email,
      role: profile.role,
      iss: 'supabase',
      is_fallback: isFallbackSecret
    };

    const supabaseToken = jwt.sign(payload, jwtSecret);

    const cookieStore = await cookies();
    cookieStore.set('supabase-jwt', supabaseToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return NextResponse.json({
      success: true,
      user: {
        id: uid,
        email: email,
        role: profile.role
      }
    });

  } catch (error) {
    console.error('Lỗi đồng bộ xác thực (Auth Sync API):', error);
    return NextResponse.json({ error: 'Xác thực không hợp lệ hoặc đã hết hạn' }, { status: 401 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('supabase-jwt')?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
    let decoded: any = null;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      decoded = jwt.decode(token);
    }

    if (!decoded || !decoded.sub) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: decoded.sub,
        email: decoded.email || '',
        role: decoded.role || 'student'
      }
    });
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
