import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getSupabaseServerClient } from '@/lib/supabase';
import AnnouncementManager from '../../teacher/AnnouncementManager';
import { Bell } from 'lucide-react';

export default async function AdminAnnouncementsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';

  if (!token) {
    redirect('/');
  }

  let adminId = '';
  let adminEmail = '';
  let userRole = '';

  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    adminId = payload.sub;
    adminEmail = payload.email || '';
    userRole = payload.role;
  } catch (err) {
    redirect('/');
  }

  if (userRole !== 'admin') {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  // 1. Lấy danh sách tất cả thông báo hệ thống
  const { data: dbAnnouncements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  const announcements = dbAnnouncements && dbAnnouncements.length > 0 
    ? dbAnnouncements.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        image_url: a.image_url || undefined,
        date: a.date,
        sender: a.sender,
        target_type: a.target_type || 'all',
        target_user_id: a.target_user_id || undefined,
      }))
    : [];

  // 2. Lấy danh sách tài khoản để hỗ trợ tính năng chọn người nhận cụ thể
  const { data: dbProfiles } = await supabase
    .from('profiles')
    .select('id, email, role')
    .order('email', { ascending: true });

  const allProfiles = dbProfiles || [];

  return (
    <div className="space-y-8 w-full">
      {/* HEADER */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            Truyền thông & Báo cáo
          </div>
          <h1 className="text-3xl font-black text-foreground">Quản Lý Thông Báo</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Đăng thông tin, thông báo và tin tức quan trọng đến toàn bộ website, chỉ giáo viên hoặc gửi riêng cho từng cá nhân.
          </p>
        </div>
      </div>

      {/* ANNOUNCEMENT MANAGER */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
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
