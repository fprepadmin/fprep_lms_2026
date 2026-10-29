import React from 'react';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SupportRequestManager from '../SupportRequestManager';
import { MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentSupportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const studentId = payload.sub;

  const supabase = await getSupabaseServerClient();

  // 1. Lấy thông tin học sinh từ student_details
  const { data: studentDetail } = await supabase
    .from('student_details')
    .select('*, classes(name)')
    .eq('student_id', studentId)
    .maybeSingle();

  // Lấy các môn học để chọn
  const { data: dbSubjects } = await supabase
    .from('subjects')
    .select('*');

  // Lấy tất cả tài khoản hệ thống để đối chiếu người trả lời
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('*');

  // Lấy lịch sử yêu cầu hỗ trợ chuyên môn của học sinh này
  const { data: dbSupportRequests } = await supabase
    .from('support_requests')
    .select('*')
    .eq('student_id', studentId || crypto.randomUUID())
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      {/* HEADER HỎI ĐÁP */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <MessageSquare className="h-3.5 w-3.5" /> Kênh tương tác học thuật chuyên môn
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground m-0 font-heading">
            Hỏi Đáp & Hỗ Trợ Học Tập
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground m-0">
            Gửi câu hỏi thắc mắc chuyên môn đến thầy cô tổ bộ môn để nhận giải đáp trực tiếp nhanh chóng.
          </p>
        </div>
      </div>

      <SupportRequestManager
        initialRequests={dbSupportRequests || []}
        studentId={studentId || ''}
        studentName={studentDetail?.full_name || 'Học sinh'}
        className={studentDetail?.classes?.name || '12T1'}
        token={token}
        subjects={dbSubjects || []}
        profiles={allProfiles || []}
      />
    </div>
  );
}
