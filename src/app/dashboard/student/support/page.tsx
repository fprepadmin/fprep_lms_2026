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
    <div className="space-y-8 w-full">
      {/* HEADER HỎI ĐÁP - FUTURE BLUE 2.0 ĐỒNG BỘ QUẢN TRỊ VIÊN */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 border border-[#00DFFF]/30">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#00DFFF]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#00DFFF] border border-white/15">
            <MessageSquare className="h-3.5 w-3.5 text-[#00DFFF]" />
            <span>Kênh tương tác học thuật chuyên môn</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-white uppercase tracking-tight m-0">
            Hỏi Đáp Hỗ Trợ Học Tập
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 font-medium leading-relaxed m-0">
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
