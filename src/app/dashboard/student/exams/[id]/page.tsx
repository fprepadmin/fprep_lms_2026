import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin, verifySessionToken } from '@/lib/supabase';
import ExamSessionClient from './ExamSessionClient';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ review?: string }>;
}

export default async function ExamPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isReviewRequested = resolvedSearchParams?.review === 'true';
  const rawId = resolvedParams?.id || '';
  
  // Tự động chuẩn hóa ID đề thi: giải mã URI và thay khoảng trắng thành dấu gạch nối (UUID)
  const examId = decodeURIComponent(rawId).trim().replace(/\s+/g, '-');

  // 1. Kiểm tra xác thực của học sinh
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

  if (!supabaseAdmin) {
    redirect('/dashboard/student');
  }

  // 2. Lấy thông tin đề thi
  const { data: exam, error: examError } = await supabaseAdmin
    .from('exams')
    .select('*, subjects(name)')
    .eq('id', examId)
    .maybeSingle();

  if (!exam || examError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Không tìm thấy đề thi</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mã đề thi không tồn tại hoặc đã được gỡ bỏ khỏi hệ thống. Vui lòng quay lại danh sách đề thi để chọn đề khác.
          </p>
          <Link
            href="/dashboard/student/exams"
            className="btn-primary w-full text-xs py-2.5 justify-center flex items-center gap-2 font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại kho đề thi
          </Link>
        </div>
      </div>
    );
  }

  // 3. Lấy kết quả nộp bài gần nhất của học sinh cho đề này (nếu có)
  const { data: latestResult } = await supabaseAdmin
    .from('exam_results')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Lấy danh sách câu hỏi
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true });

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#090d16]">
      <ExamSessionClient 
        exam={exam} 
        questions={questions || []} 
        studentId={studentId} 
        initialResult={latestResult || null}
        initialReviewMode={Boolean(isReviewRequested && latestResult)}
      />
    </div>
  );
}
