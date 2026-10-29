import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'Thiếu Google Auth idToken' }, { status: 400 });
    }

    let decodedToken: any;
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
        name: verified.name || verified.email?.split('@')[0],
        ...verified
      };
    } catch (tokenError: any) {
      console.error('[AUTH SYNC] Lỗi giải mã và xác thực Google Token:', tokenError);
      return NextResponse.json({ error: 'Xác thực Google Token không hợp lệ: ' + tokenError.message }, { status: 401 });
    }

    const { uid, email, name } = decodedToken;

    if (!email) {
      return NextResponse.json({ error: 'Không tìm thấy Email trong token' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Lỗi cấu hình CSDL Supabase Admin' }, { status: 500 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isDefaultAdmin = cleanEmail === 'fprep.fschool@gmail.com';
    let profile: any = null;

    // 1. Tra cứu bằng Email trước
    const { data: dbProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dbProfile) {
      profile = dbProfile;
      
      // Nếu ID trong Database khác với Firebase UID thật khi đăng nhập lần đầu
      if (profile.id !== uid) {
        console.log(`[AUTH SYNC] Đồng bộ UID: ${cleanEmail} (${profile.id} -> ${uid})`);
        
        const { data: studentDetails } = await supabaseAdmin
          .from('student_details')
          .select('*')
          .eq('student_id', profile.id)
          .maybeSingle();
          
        const { data: teacherClasses } = await supabaseAdmin
          .from('teacher_classes')
          .select('*')
          .eq('teacher_id', profile.id);

        if (studentDetails) {
          await supabaseAdmin.from('student_details').delete().eq('student_id', profile.id);
        }
        if (teacherClasses && teacherClasses.length > 0) {
          await supabaseAdmin.from('teacher_classes').delete().eq('teacher_id', profile.id);
        }
        
        await supabaseAdmin.from('study_progress').delete().eq('student_id', profile.id);
        await supabaseAdmin.from('study_logs').delete().eq('student_id', profile.id);
        await supabaseAdmin.from('support_requests').delete().eq('student_id', profile.id);

        const { error: updateIdErr } = await supabaseAdmin
          .from('profiles')
          .update({ id: uid })
          .eq('id', profile.id);

        if (!updateIdErr) {
          profile.id = uid;
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
        }
      }

      // Đảm bảo fprep.fschool@gmail.com luôn có vai trò admin
      if (isDefaultAdmin && profile.role !== 'admin') {
        const { data: updatedProfile } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', uid)
          .select()
          .single();
        if (updatedProfile) {
          profile = updatedProfile;
        }
      }

    } else {
      // 2. Nếu chưa có profile trong Database, tạo mới trên Supabase thật
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: uid,
          email: cleanEmail,
          role: isDefaultAdmin ? 'admin' : 'student'
        })
        .select()
        .single();

      if (createError) {
        console.error('[AUTH SYNC] Lỗi tạo profile vào Supabase:', createError);
        return NextResponse.json({ error: 'Không thể tạo hồ sơ người dùng trên CSDL: ' + createError.message }, { status: 500 });
      }
      profile = newProfile;

      if (profile.role === 'student') {
        const fullName = name || cleanEmail.split('@')[0];
        const mshs = cleanEmail.split('@')[0].toUpperCase();

        await supabaseAdmin
          .from('student_details')
          .insert({
            student_id: uid,
            mshs,
            full_name: fullName,
            class_id: null
          });
      }
    }

    const jwtSecret: string = process.env.SUPABASE_JWT_SECRET || 'fprep-lms-jwt-secret-secure-2026';

    const payload = {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      sub: uid,
      email: cleanEmail,
      role: profile.role,
      iss: 'supabase'
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
        email: cleanEmail,
        role: profile.role
      }
    });

  } catch (error: any) {
    console.error('[AUTH SYNC] Lỗi đồng bộ xác thực:', error);
    return NextResponse.json({ error: 'Xác thực không hợp lệ: ' + (error?.message || '') }, { status: 401 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('supabase-jwt')?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'fprep-lms-jwt-secret-secure-2026';
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
