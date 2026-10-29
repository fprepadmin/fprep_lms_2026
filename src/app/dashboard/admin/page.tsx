import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';
import { Shield, Users, GraduationCap, School, Activity, ShieldCheck, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
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
    studyLogsRes,
    studentDetailsRes,
    lessonsRes,
    classesRes,
    subjectsRes,
    teacherClassesRes
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*, actor:profiles(email)').order('created_at', { ascending: false }),
    supabase.from('study_logs').select('*').order('created_at', { ascending: false }),
    supabase.from('student_details').select('*'),
    supabase.from('lessons').select('*'),
    supabase.from('classes').select('*').order('name', { ascending: true }),
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('teacher_classes').select('*')
  ]);

  const profiles = profilesRes.data || [];
  const classes = classesRes.data || [];
  const auditLogs = auditLogsRes.data || [];

  const adminCount = profiles.filter((p: any) => p.role === 'admin').length;
  const teacherCount = profiles.filter((p: any) => p.role === 'teacher' || p.role === 'head_of_department').length;
  const studentCount = profiles.filter((p: any) => p.role === 'student').length;

  return (
    <div className="space-y-4 sm:space-y-5 w-full animate-fade-in pb-10">
      
      {/* 1. HERO BANNER QUẢN TRỊ HỆ THỐNG CAO CẤP (LUXURY ADMIN COMMAND CENTER) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0f28] via-[#1e1338] to-[#0f172a] text-white p-5 sm:p-6 lg:p-7 shadow-lg border border-purple-900/30">
        
        {/* Họa tiết ánh sáng trang trí nền */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-0.5 text-xs font-semibold backdrop-blur-md border border-rose-400/25 text-rose-200">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-400" /> Hệ Thống Quản Trị Trung Tâm
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold backdrop-blur-md border border-white/15 text-purple-200">
                <School className="h-3.5 w-3.5 text-purple-300" /> THPT FPT Cần Thơ
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight m-0 text-white font-heading drop-shadow-sm">
              Bảng Điều Khiển &bull;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-purple-200">
                Quản Trị Hệ Thống
              </span>
            </h1>

            <p className="text-slate-300 text-xs leading-relaxed m-0 font-normal">
              Giám sát hoạt động, phân quyền tài khoản, điều phối lớp học và theo dõi nhật ký bảo mật trên toàn nền tảng FPREP.
            </p>
          </div>

          {/* 4 THẺ CHỈ SỐ QUẢN TRỊ NHANH */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-rose-300 font-heading">
                {profiles.length}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Tổng người dùng</span>
            </div>

            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-amber-300 font-heading">
                {teacherCount}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Giáo viên</span>
            </div>

            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-sky-300 font-heading">
                {studentCount}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Học sinh</span>
            </div>

            <div className="bg-white/10 dark:bg-slate-900/50 backdrop-blur-xl border border-white/15 p-3 rounded-2xl text-center min-w-[85px]">
              <span className="block text-xl sm:text-2xl font-black text-emerald-300 font-heading">
                {classes.length}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Lớp học</span>
            </div>
          </div>

        </div>
      </div>

      <AdminDashboardClient
        initialProfiles={profilesRes.data || []}
        auditLogs={auditLogsRes.data || []}
        studyLogs={studyLogsRes.data || []}
        studentDetails={studentDetailsRes.data || []}
        lessons={lessonsRes.data || []}
        initialClasses={classesRes.data || []}
        subjects={subjectsRes.data || []}
        initialTeacherClasses={teacherClassesRes.data || []}
        token={token}
        currentUserId={currentUserId}
        viewMode="home"
      />
    </div>
  );
}
