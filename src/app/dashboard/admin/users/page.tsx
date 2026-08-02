import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from '../AdminDashboardClient';

import jwt from 'jsonwebtoken';

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

  // Tự động khởi tạo lớp học và môn học cơ bản nếu CSDL trống
  try {
    const { data: currentSubjects } = await supabase.from('subjects').select('id').limit(1);
    if (!currentSubjects || currentSubjects.length === 0) {
      console.log('[AUTO-SEED] Đang khởi tạo các môn học cơ bản...');
      const subjectsToSeed = [
        { name: 'Toán học', group_type: 'T' },
        { name: 'Vật lý', group_type: 'T' },
        { name: 'Hóa học', group_type: 'T' },
        { name: 'Sinh học', group_type: 'T' },
        { name: 'Tin học', group_type: 'T' },
        { name: 'Ngữ văn', group_type: 'X' },
        { name: 'Lịch sử', group_type: 'X' },
        { name: 'Địa lý', group_type: 'X' },
        { name: 'Giáo dục Kinh tế & Pháp luật', group_type: 'X' },
        { name: 'Tiếng Anh', group_type: 'ENG' }
      ];
      await supabase.from('subjects').insert(subjectsToSeed);
    }

    const { data: currentClasses } = await supabase.from('classes').select('id').limit(1);
    if (!currentClasses || currentClasses.length === 0) {
      console.log('[AUTO-SEED] Đang khởi tạo các lớp học cơ bản...');
      const classesToSeed = [
        { name: '12T1', group_type: 'T', academic_year: '2026-2027' },
        { name: '12T2', group_type: 'T', academic_year: '2026-2027' },
        { name: '12T3', group_type: 'T', academic_year: '2026-2027' },
        { name: '12T4', group_type: 'T', academic_year: '2026-2027' },
        { name: '12T5', group_type: 'T', academic_year: '2026-2027' },
        { name: '12T6', group_type: 'T', academic_year: '2026-2027' },
        { name: '12X1', group_type: 'X', academic_year: '2026-2027' },
        { name: '12X2', group_type: 'X', academic_year: '2026-2027' },
        { name: '12X3', group_type: 'X', academic_year: '2026-2027' },
        { name: '12X4', group_type: 'X', academic_year: '2026-2027' },
        { name: '12K', group_type: 'K', academic_year: '2026-2027' }
      ];
      await supabase.from('classes').insert(classesToSeed);
    }
  } catch (e) {
    console.error('[AUTO-SEED] Lỗi nạp dữ liệu cơ bản:', e);
  }

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

  // 3. Lấy danh sách thông tin chi tiết học sinh
  const { data: studentDetails } = await supabase
    .from('student_details')
    .select('*');

  // 4. Lấy danh sách lớp học
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true });

  // 5. Lấy danh sách môn học
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true });

  // 6. Lấy danh sách phân công giảng dạy hiện tại
  const { data: teacherClasses } = await supabase
    .from('teacher_classes')
    .select('*');

  return (
    <div className="space-y-8 w-full">
      {/* HEADER PHÂN QUYỀN */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500 border border-blue-500/20">
            An ninh hệ thống
          </div>
          <h1 className="text-3xl font-black text-foreground">Tài Khoản & Phân Quyền</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Thay đổi trực tiếp phân quyền của người dùng sang Học sinh, Giáo viên hoặc Quản trị viên.
          </p>
        </div>
      </div>

      <AdminDashboardClient
        initialProfiles={profiles || []}
        auditLogs={auditLogs || []}
        studentDetails={studentDetails || []}
        initialClasses={classes || []}
        subjects={subjects || []}
        initialTeacherClasses={teacherClasses || []}
        token={token}
        currentUserId={currentUserId}
        viewMode="users"
      />
    </div>
  );
}
