import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import LessonViewerClient from './LessonViewerClient';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function LessonViewerPage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawLessonId = resolvedParams?.id || '';
  const lessonId = decodeURIComponent(rawLessonId).trim().replace(/\s+/g, '-');

  const supabase = await getSupabaseServerClient();

  // 1. Lấy thông tin bài học hiện tại kèm Chương và Môn học
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('*, chapters(*, subjects(*))')
    .eq('id', lessonId)
    .maybeSingle();

  if (lessonError || !lesson) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Không tìm thấy bài giảng</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bài học này không tồn tại hoặc đã được chuyển sang chương trình khác.
          </p>
          <Link
            href="/dashboard/student/subjects"
            className="btn-primary w-full text-xs py-2.5 justify-center flex items-center gap-2 font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại kho học liệu
          </Link>
        </div>
      </div>
    );
  }

  // 2. Lấy tất cả học liệu của bài học này
  const { data: materials } = await supabase
    .from('lesson_materials')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true });

  // 3. Lấy tất cả chương và bài học cùng môn học
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('*, lessons(*)')
    .eq('subject_id', lesson.chapters.subject_id)
    .order('order_index', { ascending: true });

  // Lấy Token và userId từ cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  let userId = '';
  if (token) {
    const payload = verifySessionToken(token);
    userId = payload?.sub || '';
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
