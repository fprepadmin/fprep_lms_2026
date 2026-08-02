import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import ExamSessionClient from './ExamSessionClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamPage({ params }: PageProps) {
  const resolvedParams = await params;
  const examId = resolvedParams.id;

  // 1. Kiểm tra xác thực của học sinh
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value;
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let studentId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    studentId = payload.sub;
  } catch (err) {
    console.error('Lỗi verify token tại trang đề thi:', err);
    redirect('/');
  }

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <ExamSessionClient 
        exam={exam} 
        questions={questions || []} 
        studentId={studentId} 
      />
    </div>
  );
}
