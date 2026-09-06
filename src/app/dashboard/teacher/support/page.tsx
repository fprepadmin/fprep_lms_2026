import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherSupportManager from '../TeacherSupportManager';
import { MessageSquare } from 'lucide-react';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function TeacherSupportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let teacherId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    teacherId = payload.sub;
  } catch (err) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  // TỐI ƯU TRUY VẤN SONG SONG PROMISE.ALL
  const [subjectsRes, supportRequestsRes] = await Promise.all([
    supabase.from('subjects').select('*'),
    supabase.from('support_requests').select('*').order('created_at', { ascending: false })
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* HEADER HỎI ĐÁP (CHUẨN FMATH BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <MessageSquare className="h-3.5 w-3.5" /> Giải đáp thắc mắc học thuật
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Hỏi Đáp Hỗ Trợ Học Sinh
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Xem và trả lời các thắc mắc chuyên môn do học sinh gửi lên hệ thống LMS.
          </p>
        </div>
      </div>

      <TeacherSupportManager
        initialRequests={supportRequestsRes.data || []}
        teacherId={teacherId || ''}
        token={token}
        subjects={subjectsRes.data || []}
      />
    </div>
  );
}
