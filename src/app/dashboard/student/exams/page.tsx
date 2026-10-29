import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { ClipboardList, Award, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import StudentExamsClient from './StudentExamsClient';

export const dynamic = 'force-dynamic';

export default async function StudentExamsPage() {
  // 1. Xác thực học sinh
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

  const supabase = (await getSupabaseServerClient()) || supabaseAdmin;
  if (!supabase) {
    redirect('/dashboard/student');
  }

  // 2. Lấy thông tin lớp học và ban học sinh
  const { data: studentDetail } = await supabase
    .from('student_details')
    .select('*, classes(*)')
    .eq('student_id', studentId)
    .maybeSingle();

  const groupType = studentDetail?.classes?.group_type || 'T';

  // 3. Truy vấn song song
  const [
    subjectsRes,
    chaptersRes,
    examsRes,
    examResultsRes
  ] = await Promise.all([
    supabase.from('subjects').select('*').in('group_type', groupType === 'X' ? ['X', 'ENG'] : ['T', 'ENG']).order('name'),
    supabase.from('chapters').select('*, lessons(*)').order('order_index', { ascending: true }),
    supabase.from('exams').select('*, subjects(*), lessons(*)'),
    supabase.from('exam_results').select('*, exams(title)').eq('student_id', studentId).order('created_at', { ascending: false })
  ]);

  const subjects = subjectsRes.data || [];
  const subjectIds = new Set(subjects.map((s: any) => s.id));
  const chapters = (chaptersRes.data || []).filter((c: any) => subjectIds.has(c.subject_id));
  const exams = (examsRes.data || []).filter((e: any) => subjectIds.has(e.subject_id));
  const examResults = examResultsRes.data || [];

  // 4. Thống kê
  const totalExamsCount = exams.length;
  const completedResults = examResults;
  const completedExamsCount = new Set(completedResults.map((r: any) => r.exam_id)).size;
  const averageScore = completedResults.length > 0
    ? Math.round((completedResults.reduce((sum: number, r: any) => sum + Number(r.score), 0) / completedResults.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6 w-full animate-fade-in pb-12">
      
      {/* HEADER BENTO BANNER ĐỀ THI */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <ClipboardList className="h-3.5 w-3.5" /> Luyện thi & Đánh giá năng lực Khối 12
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground m-0 font-heading">
            Kho Đề Luyện Tập & Thi Thử
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground m-0">
            Rèn luyện kỹ năng giải trắc nghiệm theo 3 dạng thức mới: Trắc nghiệm 4 lựa chọn, Đúng/Sai và Trả lời ngắn.
          </p>
        </div>

        {/* 3 THẺ CHỈ SỐ NHANH */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl px-4 py-3 min-w-[110px]">
            <span className="block text-[10.5px] font-bold text-muted-foreground uppercase">Tổng số đề</span>
            <span className="text-xl font-bold text-foreground font-heading">{totalExamsCount}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl px-4 py-3 min-w-[110px]">
            <span className="block text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Đã làm</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-heading">{completedExamsCount}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl px-4 py-3 min-w-[110px]">
            <span className="block text-[10.5px] font-bold text-blue-600 dark:text-blue-400 uppercase">Điểm TB</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-heading">{averageScore}đ</span>
          </div>
        </div>
      </div>

      <StudentExamsClient
        subjects={subjects}
        chapters={chapters}
        exams={exams}
        examResults={examResults}
        studentId={studentId}
      />
    </div>
  );
}
