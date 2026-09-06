import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SupportRequestManager from '../SupportRequestManager';
import { MessageSquare } from 'lucide-react';

import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function StudentSupportPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let studentId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    studentId = payload.sub;
  } catch (err) {
    redirect('/');
  }

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
      {/* HEADER HỎI ĐÁP */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            <MessageSquare className="h-3.5 w-3.5" /> Kênh tương tác học thuật chuyên môn
          </div>
          <h1 className="text-3xl font-black text-foreground">Hỏi Đáp Hỗ Trợ Học Tập</h1>
          <p className="text-xs text-muted-foreground font-semibold">
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
