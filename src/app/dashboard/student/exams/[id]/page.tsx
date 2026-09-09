import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, verifySessionToken } from '@/lib/supabase';
import ExamSessionClient from './ExamSessionClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamPage({ params }: PageProps) {
  const resolvedParams = await params;
  const examId = resolvedParams.id;

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

  // 2. Lấy thông tin đề thi và các câu hỏi đi kèm
  const { data: exam } = await supabaseAdmin
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single();

  if (!exam) {
    redirect('/dashboard/student');
  }

  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true });

  return (
    <div className="w-full min-h-screen">
      <ExamSessionClient 
        exam={exam} 
        questions={questions || []} 
        studentId={studentId} 
      />
    </div>
  );
}
