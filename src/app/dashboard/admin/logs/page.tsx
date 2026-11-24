import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from '../AdminDashboardClient';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const currentUserId = payload.sub;

  const supabase = await getSupabaseServerClient();

  // TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    profilesRes,
    auditLogsRes,
    classesRes,
    subjectsRes,
    teacherClassesRes
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*, actor:profiles(email)').order('created_at', { ascending: false }),
    supabase.from('classes').select('*').order('name', { ascending: true }),
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('teacher_classes').select('*')
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* ==================================================== */}
      {/* WELCOME BANNER - NHẬT KÝ BẢO MẬT & AUDIT LOGS */}
      {/* ==================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-6 sm:p-7 text-white shadow-xl shadow-blue-500/10 border border-[#00DFFF]/30">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#00DFFF]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-0.5 text-xs font-bold text-[#00DFFF] border border-white/15">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>FPT AI LEARNING &bull; GIÁM SÁT AN NINH & TRUY VẾT HỆ THỐNG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-white m-0 uppercase tracking-tight">
              Nhật Ký Bảo Mật (Audit Logs)
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed m-0 font-medium">
              Bản ghi vết đầy đủ các hành vi tạo, sửa, xóa dữ liệu kèm địa chỉ IP, User-Agent và giá trị sai khác chi tiết.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs shrink-0 self-start sm:self-center">
            <span className="font-extrabold text-white">Tổng: {auditLogsRes.data?.length || 0} bản ghi</span>
          </div>
        </div>
      </div>

      <AdminDashboardClient
        initialProfiles={profilesRes.data || []}
        auditLogs={auditLogsRes.data || []}
        initialClasses={classesRes.data || []}
        subjects={subjectsRes.data || []}
        initialTeacherClasses={teacherClassesRes.data || []}
        token={token}
        currentUserId={currentUserId}
        viewMode="logs"
      />
    </div>
  );
}
