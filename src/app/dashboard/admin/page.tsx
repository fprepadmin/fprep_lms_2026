import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let currentUserId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    currentUserId = payload.sub;
  } catch (err) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  // 1. Lấy danh sách tất cả tài khoản và phân quyền
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // 2. Lấy danh sách Audit Logs (Nhật ký hoạt động bảo mật)
  // Liên kết bảng profiles để lấy Email của người thực hiện thao tác (Actor)
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles(email)')
    .order('created_at', { ascending: false });



  // 4. Lấy các bảng dữ liệu để thống kê truy cập & học tập
  const { data: studyLogs } = await supabase
    .from('study_logs')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: studentDetails } = await supabase
    .from('student_details')
    .select('*');

  const { data: lessons } = await supabase
    .from('lessons')
    .select('*');

  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true });

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true });

  const { data: teacherClasses } = await supabase
    .from('teacher_classes')
    .select('*');

  return (
    <div className="space-y-8 w-full">
      {/* HEADER QUẢN TRỊ HỆ THỐNG */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-500 border border-red-500/20">
            Hệ thống quản trị tối cao
          </div>
          <h1 className="text-3xl font-black text-foreground">Bảng Điều Khiển Hệ Thống</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Giám sát bảo mật, khôi phục dữ liệu mẫu và theo dõi vết hoạt động (audit logs) trên toàn hệ thống FPT LMS.
          </p>
        </div>
      </div>

      <AdminDashboardClient
        initialProfiles={profiles || []}
        auditLogs={auditLogs || []}
        studyLogs={studyLogs || []}
        studentDetails={studentDetails || []}
        lessons={lessons || []}
        initialClasses={classes || []}
        subjects={subjects || []}
        initialTeacherClasses={teacherClasses || []}
        token={token}
        currentUserId={currentUserId}
        viewMode="home"
      />
    </div>
  );
}
