import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LessonViewerClient from './LessonViewerClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function LessonViewerPage({ params }: PageProps) {
  const { id: lessonId } = await params;
  const supabase = await getSupabaseServerClient();

  // 1. Lấy thông tin bài học hiện tại kèm Chương và Môn học
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*, chapters(*, subjects(*))')
    .eq('id', lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    redirect('/dashboard/student');
  }

  // 2. Lấy tất cả học liệu của bài học này
  const { data: materials } = await supabase
    .from('lesson_materials')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  // 3. Lấy tất cả chương và bài học cùng môn học để hiển thị danh sách bài học bên trái (Sidebar)
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('*, lessons(*)')
    .eq('subject_id', lesson.chapters.subject_id)
    .order('order_index', { ascending: true });

  // Lấy Token và userId từ cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let userId = '';
  if (token) {
    try {
      const jwtModule = await import('jsonwebtoken');
      const payload = jwtModule.default.verify(token, jwtSecret) as any;
      userId = payload.sub || '';
    } catch (e) {
      // ignore
    }
  }

  // 4. Lấy trạng thái tiến độ bài học, danh sách đề trắc nghiệm và kết quả làm bài
  const [progressRes, allProgressRes, examsRes, examResultsRes] = await Promise.all([
    supabase.from('study_progress').select('*').eq('lesson_id', lessonId).eq('student_id', userId || '').maybeSingle(),
    supabase.from('study_progress').select('*').eq('student_id', userId || ''),
    supabase.from('exams').select('*').eq('subject_id', lesson.chapters.subject_id),
    supabase.from('exam_results').select('*').eq('student_id', userId || '')
  ]);

  const progress = progressRes.data;
  const allProgress = allProgressRes.data || [];
  const exams = examsRes.data || [];
  const examResults = examResultsRes.data || [];

  // Cập nhật trạng thái "truy cập gần nhất" ở server-side để phục vụ tính năng "Bài học đang dang dở"
  if (userId) {
    await supabase
      .from('study_progress')
      .upsert({
        student_id: userId,
        lesson_id: lessonId,
        last_accessed_at: new Date().toISOString()
      }, { onConflict: 'student_id,lesson_id' });
  }

  return (
    <LessonViewerClient 
      lesson={lesson}
      materials={materials || []}
      allChapters={allChapters || []}
      initialProgress={progress}
      allProgress={allProgress}
      exams={exams}
      examResults={examResults}
      token={token}
      userId={userId || ''}
    />
  );
}
