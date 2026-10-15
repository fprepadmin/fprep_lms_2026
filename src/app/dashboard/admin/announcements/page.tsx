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
      {/* HEADER QUẢN LÝ THÔNG BÁO (CHUẨN FPREP BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <Bell className="h-3.5 w-3.5" /> Truyền thông & Báo cáo Nội bộ
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Quản Lý Thông Báo
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Đăng thông tin, thông báo và tin tức quan trọng đến toàn bộ website, chỉ giáo viên hoặc gửi riêng cho từng cá nhân.
          </p>
        </div>
      </div>

      <div className="flat-card">
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
