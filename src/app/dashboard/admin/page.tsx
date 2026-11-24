import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';
import { Shield, Sparkles, Activity, CheckCircle2, Calendar } from 'lucide-react';
import { getExamMetadataStore } from '@/lib/examAssignmentsStore';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }
  const currentUserId = payload.sub;
  const adminEmail = payload.email || 'Admin';

  const supabase = await getSupabaseServerClient();

  // TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    profilesRes,
    auditLogsRes,
    studyLogsRes,
    studentDetailsRes,
    lessonsRes,
    classesRes,
    subjectsRes,
    teacherClassesRes,
    examsRes,
    questionsRes,
    examResultsRes,
    metadataStore
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*, actor:profiles(email)').order('created_at', { ascending: false }),
    supabase.from('study_logs').select('*').order('created_at', { ascending: false }),
    supabase.from('student_details').select('*'),
    supabase.from('lessons').select('*'),
    supabase.from('classes').select('*').order('name', { ascending: true }),
    supabase.from('subjects').select('*').order('name', { ascending: true }),
    supabase.from('teacher_classes').select('*'),
    supabase.from('exams').select('id, subject_id, lesson_id, title, exam_type, created_at'),
    supabase.from('questions').select('id, exam_id, question_type, level'),
    supabase.from('exam_results').select('id, exam_id, student_id, score, correct_answers, total_questions, created_at').order('created_at', { ascending: false }),
    getExamMetadataStore()
  ]);

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* ==================================================== */}
      {/* WELCOME BANNER ADMIN - FUTURE BLUE 2.0 */}
      {/* ==================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 border border-[#00DFFF]/30">
        {/* Họa tiết công nghệ AI phát sáng nền */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#00DFFF]/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-[#087CFF]/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#00DFFF] border border-white/15">
              <Sparkles className="h-3.5 w-3.5 text-[#00DFFF] animate-pulse" />
              <span>FPT AI LEARNING &bull; FUTURE BLUE 2.0 &bull; ADMIN CONSOLE</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading tracking-tight text-white m-0 uppercase">
              Bảng Điều Khiển Quản Trị Hệ Thống
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed m-0 font-medium max-w-2xl">
              Trung tâm giám sát vận hành toàn diện FPREP: Theo dõi thời gian thực lượt học tập, phân quyền người dùng, quản lý học thuật và kiểm soát dữ liệu khảo thí.
            </p>
          </div>

          {/* Cụm thông tin Meta Capsules */}
          <div className="flex flex-wrap sm:flex-col gap-2.5 shrink-0 self-start lg:self-center">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs">
              <Shield className="h-4 w-4 text-[#00DFFF]" />
              <div>
                <span className="text-[10px] text-blue-200 block uppercase font-bold">Tài khoản quản trị</span>
                <span className="font-extrabold text-white truncate max-w-[200px] block">{adminEmail}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs">
              <Calendar className="h-4 w-4 text-emerald-300" />
              <div>
                <span className="text-[10px] text-blue-200 block uppercase font-bold">Năm học vận hành</span>
                <span className="font-extrabold text-white">Niên khóa 2025 – 2026</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-xs text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Trạng thái: Máy chủ hoạt động 100%</span>
            </div>
          </div>
        </div>
      </div>

      <AdminDashboardClient
        initialProfiles={profilesRes.data || []}
        auditLogs={auditLogsRes.data || []}
        studyLogs={studyLogsRes.data || []}
        studentDetails={studentDetailsRes.data || []}
        lessons={lessonsRes.data || []}
        initialClasses={classesRes.data || []}
        subjects={subjectsRes.data || []}
        initialTeacherClasses={teacherClassesRes.data || []}
        exams={examsRes.data || []}
        questions={questionsRes.data || []}
        examResults={examResultsRes.data || []}
        examMetadataStore={metadataStore}
        token={token}
        currentUserId={currentUserId}
        viewMode="home"
      />
    </div>
  );
}
