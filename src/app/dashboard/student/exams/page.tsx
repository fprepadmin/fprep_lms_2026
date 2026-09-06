import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { ClipboardList, Award, BarChart2 } from 'lucide-react';
import StudentExamsClient from './StudentExamsClient';

export const dynamic = 'force-dynamic';

export default async function StudentExamsPage() {
  // 1. Xác thực học sinh
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
    redirect('/');
  }

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

  // 3. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
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

  // 4. Tính toán thống kê luyện tập
  const totalExamsCount = exams.length;
  const completedResults = examResults;
  const completedExamsCount = new Set(completedResults.map((r: any) => r.exam_id)).size;
  const averageScore = completedResults.length > 0
    ? Math.round((completedResults.reduce((sum: number, r: any) => sum + Number(r.score), 0) / completedResults.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-6 w-full animate-fade-in">
      
      {/* HEADER TRANG ĐỀ LUYỆN TẬP (CHUẨN FMATH BANNER) */}
      <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden bg-white dark:bg-card">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f1ff] dark:bg-primary/20 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe] dark:border-primary/30">
            <ClipboardList className="h-3.5 w-3.5" /> Luyện tập & Đánh giá năng lực Khối 12
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-secondary dark:text-foreground tracking-tight m-0">
            Kho Đề Luyện Tập & Kiểm Tra
          </h1>
          <p className="text-xs text-[#6c757d] dark:text-muted-foreground font-semibold m-0">
            Hệ thống đề thi trắc nghiệm được phân loại theo bài học, kiểm tra định kỳ, đề thi THPT Quốc Gia và Đánh giá năng lực.
          </p>
        </div>

        {/* 3 THẺ CHỈ SỐ NHANH */}
        <div className="flex gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-6 shrink-0">
          <div className="text-center">
            <span className="block text-2xl font-bold font-heading text-primary">{totalExamsCount}</span>
            <span className="text-[10px] font-bold text-[#6c757d] uppercase">Tổng số đề</span>
          </div>
          <div className="text-center border-l border-border pl-4 sm:pl-6">
            <span className="block text-2xl font-bold font-heading text-[#198754]">{completedExamsCount}</span>
            <span className="text-[10px] font-bold text-[#6c757d] uppercase">Đã làm</span>
          </div>
          <div className="text-center border-l border-border pl-4 sm:pl-6">
            <span className="block text-2xl font-bold font-heading text-secondary dark:text-foreground">{averageScore}</span>
            <span className="text-[10px] font-bold text-[#6c757d] uppercase">Điểm TB</span>
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
