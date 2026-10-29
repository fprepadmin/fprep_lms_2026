import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherSupportManager from '../TeacherSupportManager';
import { MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeacherSupportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const teacherId = payload.sub;

  const supabase = await getSupabaseServerClient();

  // TỐI ƯU TRUY VẤN SONG SONG PROMISE.ALL
  const [subjectsRes, supportRequestsRes] = await Promise.all([
    supabase.from('subjects').select('*'),
    supabase.from('support_requests').select('*').order('created_at', { ascending: false })
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* HEADER HỎI ĐÁP HIỆN ĐẠI */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <MessageSquare className="h-3.5 w-3.5" /> Giải đáp thắc mắc học thuật
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground tracking-tight m-0">
            Hỏi Đáp Hỗ Trợ Học Sinh
          </h1>
          <p className="text-xs text-muted-foreground font-medium m-0">
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
