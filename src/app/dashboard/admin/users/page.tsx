import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from '../AdminDashboardClient';
import jwt from 'jsonwebtoken';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
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

  // TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    profilesRes,
    auditLogsRes,
    studentDetailsRes,
    classesRes,
    subjectsRes,
    teacherClassesRes
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*, actor:profiles(email)').order('created_at', { ascending: false }),
    supabase.from('student_details').select('*'),
    supabase.from('classes').select('*').order('name', { ascending: true }),
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('teacher_classes').select('*')
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* HEADER QUẢN TRỊ NGƯỜI DÙNG (CHUẨN FMATH BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-0.5 text-xs font-bold text-red-500 border border-red-500/20">
            <Users className="h-3.5 w-3.5" /> Quản trị Tài khoản & Phân quyền
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Quản Lý Tài Khoản & Phân Quyền
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Thêm tài khoản mới, phân quyền (Học sinh / Giáo viên / Trưởng bộ môn / Admin) và xếp lớp học.
          </p>
        </div>
      </div>

      <AdminDashboardClient
        initialProfiles={profilesRes.data || []}
        auditLogs={auditLogsRes.data || []}
        studyLogs={[]}
        studentDetails={studentDetailsRes.data || []}
        lessons={[]}
        initialClasses={classesRes.data || []}
        subjects={subjectsRes.data || []}
        initialTeacherClasses={teacherClassesRes.data || []}
        token={token}
        currentUserId={currentUserId}
        viewMode="users"
      />
    </div>
  );
}
