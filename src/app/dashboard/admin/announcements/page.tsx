import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import AnnouncementManager from '../../teacher/AnnouncementManager';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';

  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }

  const adminId = payload.sub;
  const adminEmail = payload.email || '';
  const userRole = payload.role || 'admin';

  if (userRole !== 'admin') {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  // TỐI ƯU TRUY VẤN SONG SONG PROMISE.ALL
  const [announcementsRes, profilesRes] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, email, role').order('email', { ascending: true })
  ]);

  const dbAnnouncements = announcementsRes.data || [];
  const announcements = dbAnnouncements.map((a: any) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    image_url: a.image_url || undefined,
    date: a.date,
    sender: a.sender,
    target_type: a.target_type || 'all',
    target_user_id: a.target_user_id || undefined,
  }));

  const allProfiles = profilesRes.data || [];

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* ==================================================== */}
      {/* WELCOME BANNER - TRUYỀN THÔNG & THÔNG BÁO NỘI BỘ */}
      {/* ==================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-6 sm:p-7 text-white shadow-xl shadow-blue-500/10 border border-[#00DFFF]/30">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#00DFFF]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-0.5 text-xs font-bold text-[#00DFFF] border border-white/15">
              <Bell className="h-3.5 w-3.5" />
              <span>FPT AI LEARNING &bull; TRUYỀN THÔNG & BÁO CÁO NỘI BỘ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-white m-0 uppercase tracking-tight">
              Quản Lý Thông Báo
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed m-0 font-medium">
              Đăng tải bản tin, thông báo và điều hướng truyền thông quan trọng đến toàn bộ hệ thống, riêng giáo viên hoặc cá nhân học sinh.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs shrink-0 self-start sm:self-center">
            <span className="font-extrabold text-white">Tổng: {announcements.length} thông báo</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm">
        <AnnouncementManager
          initialAnnouncements={announcements}
          userRole={userRole}
          token={token}
          userEmail={adminEmail}
          allProfiles={allProfiles}
        />
      </div>
    </div>
  );
}
