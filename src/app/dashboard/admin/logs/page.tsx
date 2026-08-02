import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from '../AdminDashboardClient';

import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
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

  // 2. Lấy danh sách Audit Logs
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles(email)')
    .order('created_at', { ascending: false });



  // 3. Lấy danh sách lớp học
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true });

  // 4. Lấy danh sách môn học
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true });

  // 5. Lấy danh sách phân công giảng dạy
  const { data: teacherClasses } = await supabase
    .from('teacher_classes')
    .select('*');

  return (
    <div className="space-y-8 w-full">
      {/* HEADER AUDIT LOGS */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary border border-secondary/20">
            Giám sát bảo mật
          </div>
          <h1 className="text-3xl font-black text-foreground">Nhật Ký Bảo Mật (Audit Logs)</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Bản ghi vết đầy đủ các hành động tạo, sửa, xóa dữ liệu trên hệ thống kèm theo địa chỉ IP và giá trị thay đổi chi tiết.
          </p>
        </div>
      </div>

      <AdminDashboardClient
        initialProfiles={profiles || []}
        auditLogs={auditLogs || []}
        initialClasses={classes || []}
        subjects={subjects || []}
        initialTeacherClasses={teacherClasses || []}
        token={token}
        currentUserId={currentUserId}
        viewMode="logs"
      />
    </div>
  );
}
