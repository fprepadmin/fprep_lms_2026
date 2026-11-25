import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin, getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { ClipboardList, Award, BarChart2 } from 'lucide-react';
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

  // 3. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  // Học sinh lớp tự nhiên (Ban T) được cập nhật thêm môn Tiếng Anh và Lịch Sử
  const subjectsQuery = groupType === 'X'
    ? supabase.from('subjects').select('*').in('group_type', ['X', 'ENG']).order('name')
    : supabase.from('subjects').select('*').or('group_type.eq.T,group_type.eq.ENG,name.ilike.%sử%').order('name');

  const [
    subjectsRes,
    chaptersRes,
    examsRes,
    examResultsRes
  ] = await Promise.all([
    subjectsQuery,
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
      
      {/* HEADER TRANG ĐỀ LUYỆN TẬP (FUTURE BLUE 2.0 - ĐỒNG BỘ QUẢN TRỊ VIÊN) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 border border-[#00DFFF]/30">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#00DFFF]/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-[#087CFF]/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#00DFFF] border border-white/15">
              <ClipboardList className="h-3.5 w-3.5 text-[#00DFFF]" />
              <span>Luyện tập & Đánh giá năng lực Khối 12</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading text-white tracking-tight m-0 uppercase">
              Kho Đề Luyện Tập & Kiểm Tra
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium m-0">
              Hệ thống đề thi trắc nghiệm được phân loại theo bài học, kiểm tra định kỳ, đề thi THPT Quốc Gia và Đánh giá năng lực.
            </p>
          </div>

          {/* 3 THẺ CHỈ SỐ NHANH */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0 self-start lg:self-center w-full sm:w-auto">
            <div className="text-center px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 min-w-[92px]">
              <span className="block text-2xl font-black font-heading text-white">{totalExamsCount}</span>
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Tổng số đề</span>
            </div>
            <div className="text-center px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 min-w-[92px]">
              <span className="block text-2xl font-black font-heading text-emerald-300">{completedExamsCount}</span>
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Đã làm</span>
            </div>
            <div className="text-center px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 min-w-[92px]">
              <span className="block text-2xl font-black font-heading text-[#00DFFF]">{averageScore}</span>
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Điểm TB</span>
            </div>
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
