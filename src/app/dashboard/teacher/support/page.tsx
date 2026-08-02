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

  // Lấy các môn học
  const { data: dbSubjects } = await supabase
    .from('subjects')
    .select('*');

  // Lấy danh sách yêu cầu hỗ trợ chuyên môn của học sinh
  const { data: dbSupportRequests } = await supabase
    .from('support_requests')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8 w-full">
      {/* HEADER HỎI ĐÁP */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            <MessageSquare className="h-3.5 w-3.5" /> Giải đáp thắc mắc học thuật
          </div>
          <h1 className="text-3xl font-black text-foreground">Hỏi Đáp Hỗ Trợ Học Sinh</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Xem và trả lời các thắc mắc chuyên môn do học sinh gửi lên hệ thống LMS.
          </p>
        </div>
      </div>

      <TeacherSupportManager
        initialRequests={dbSupportRequests || []}
        teacherId={teacherId || ''}
        token={token}
        subjects={dbSubjects || []}
      />
    </div>
  );
}
