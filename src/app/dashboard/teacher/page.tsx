import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { 
  GraduationCap, Bell, Calendar, BookOpen, Users, 
  Clock, CheckCircle, ChevronRight, Award, MessageSquare,
  FileText, ShieldCheck, ClipboardList, Plus, BarChart3,
  TrendingUp, CheckCircle2, AlertCircle, Sparkles, Send,
  HelpCircle, Layers, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import AnnouncementManager from './AnnouncementManager';
import { getExamMetadataStore } from '@/lib/examAssignmentsStore';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const payload = verifySessionToken(token);
  if (!payload || !payload.sub) {
    redirect('/');
  }

  const teacherId = payload.sub;
  const teacherEmail = payload.email || '';

  const supabase = await getSupabaseServerClient();

  // 1. TỐI ƯU TRUY VẤN SONG SONG BẰNG PROMISE.ALL
  const [
    profileRes,
    assignmentsRes,
    supportRequestsRes,
    announcementsRes
  ] = await Promise.all([
    supabase.from('profiles').select('role, full_name, email').eq('id', teacherId).single(),
    supabase.from('teacher_classes').select('*, classes(*), subjects(*)').eq('teacher_id', teacherId),
    supabase.from('support_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('announcements').select('*').or(`target_type.eq.all,target_type.eq.teachers,and(target_type.eq.individual,target_user_id.eq.${teacherId}),target_type.is.null`).order('created_at', { ascending: false })
  ]);

  const userRole = profileRes.data?.role || 'teacher';
  const teacherFullName = profileRes.data?.full_name || (teacherEmail ? teacherEmail.split('@')[0].toUpperCase() : 'Thầy/Cô');
  const assignments = assignmentsRes.data || [];
  const announcements = announcementsRes.data || [];

  const classIds = assignments.map((a: any) => a.class_id).filter(Boolean);
  const subjectIds = assignments.map((a: any) => a.subject_id).filter(Boolean);
  const assignedSubjects = Array.from(new Set(assignments.map((a: any) => a.subjects?.name).filter(Boolean)));
  const assignedClasses = Array.from(new Set(assignments.map((a: any) => a.classes?.name).filter(Boolean)));

  // 2. Truy vấn học sinh & học liệu thuộc các lớp phụ trách
  const [studentsRes, chaptersRes, examsRes, examAssignmentsRes, metadataStore] = await Promise.all([
    supabase.from('student_details').select('*, classes(*)').in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]),
    supabase.from('chapters').select('*, lessons(*, lesson_materials(*))').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('exams').select('id, title, duration_minutes, created_at, subject_id').in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]),
    supabase.from('exam_assignments').select('*, classes(*)').in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]),
    getExamMetadataStore()
  ]);

  const students = studentsRes.data || [];
  const studentIds = students.map((s: any) => s.student_id);
  const chapters = chaptersRes.data || [];
  const exams = examsRes.data || [];

  // 3. Phân công giao bài & Kết quả học sinh
  const dbAssignments = examAssignmentsRes.data || [];
  const storedAssignments = (metadataStore.assignments || []).filter((a: any) => 
    classIds.includes(a.class_id) || a.teacher_id === teacherId
  );
  
  const assignmentMap = new Map<string, any>();
  dbAssignments.forEach((a: any) => assignmentMap.set(`${a.exam_id}_${a.class_id}`, a));
  storedAssignments.forEach((a: any) => assignmentMap.set(`${a.exam_id}_${a.class_id}`, a));
  const allAssignments = Array.from(assignmentMap.values());

  let examResults: any[] = [];
  let recentProgressWithNames: any[] = [];

  if (studentIds.length > 0) {
    const [resultsRes, progressRes] = await Promise.all([
      supabase.from('exam_results').select('*, exams(*)').in('student_id', studentIds),
      supabase.from('study_progress').select('*, lessons(*, chapters(*, subjects(*)))').in('student_id', studentIds).eq('completed', true).order('last_accessed_at', { ascending: false }).limit(5)
    ]);

    examResults = resultsRes.data || [];

    recentProgressWithNames = (progressRes.data || []).map((prog: any) => {
      const student = students.find((s: any) => s.student_id === prog.student_id);
      return {
        ...prog,
        student_name: student?.full_name || 'Học sinh',
        class_name: student?.classes?.name || ''
      };
    });
  }

  // 4. TÍNH TOÁN DỮ LIỆU THỰC TẾ TEACHING OVERVIEW & ANALYTICS
  const totalClassesCount = assignments.length;
  const totalStudentsCount = students.length;
  const totalExamsCreated = exams.length;
  const totalAssignedCount = allAssignments.length;
  const completedSubmissionsCount = examResults.length;
  const totalExpectedSubmissions = totalAssignedCount * (totalStudentsCount || 1);
  const pendingSubmissionsCount = Math.max(0, totalExpectedSubmissions - completedSubmissionsCount);

  // Điểm số & Phổ điểm
  const scores = examResults.map((r: any) => Number(r.score || 0));
  const averageScore = scores.length > 0 
    ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) 
    : '0.0';

  const completionRate = totalExpectedSubmissions > 0 
    ? Math.min(100, Math.round((completedSubmissionsCount / totalExpectedSubmissions) * 100)) 
    : (completedSubmissionsCount > 0 ? 100 : 0);

  const distribution = {
    excellent: scores.filter((s: number) => s >= 9.0).length,
    good: scores.filter((s: number) => s >= 8.0 && s < 9.0).length,
    fair: scores.filter((s: number) => s >= 6.5 && s < 8.0).length,
    average: scores.filter((s: number) => s >= 5.0 && s < 6.5).length,
    weak: scores.filter((s: number) => s < 5.0).length
  };

  const totalScoresCount = scores.length || 1;
  const distPercent = {
    excellent: Math.round((distribution.excellent / totalScoresCount) * 100),
    good: Math.round((distribution.good / totalScoresCount) * 100),
    fair: Math.round((distribution.fair / totalScoresCount) * 100),
    average: Math.round((distribution.average / totalScoresCount) * 100),
    weak: Math.round((distribution.weak / totalScoresCount) * 100)
  };

  return (
    <div className="space-y-6 w-full animate-fade-in font-body">
      
      {/* ==================================================== */}
      {/* 1. WELCOME BANNER CHUẨN FPT AI LEARNING - FUTURE BLUE 2.0 */}
      {/* ==================================================== */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0B1B55] via-[#1746D1] to-[#087CFF] text-white p-6 sm:p-8 shadow-xl shadow-blue-900/10 border border-white/10">
        {/* Ambient subtle light glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#00DFFF]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#0B1B55]/60 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-cyan-200 border border-white/20">
              <GraduationCap className="h-4 w-4 text-[#00DFFF]" /> 
              <span>Giáo viên &bull; THPT FPT Cần Thơ</span>
              <span className="text-white/40">&bull;</span>
              <span className="text-cyan-300">Năm học 2025 - 2026</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight m-0">
              Kính chào Thầy/Cô {teacherFullName}!
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed m-0">
              Không gian quản lý chuyên môn FPREP: Soạn đề thi trắc nghiệm chuẩn Bộ GD&ĐT 2026, ngân hàng câu hỏi phân hóa, phân công bài tập và theo dõi tiến độ khảo thí trực tiếp.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-semibold text-blue-200">
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-lg border border-white/10">
                Môn phụ trách: <strong className="text-white font-bold">{assignedSubjects.join(', ') || 'Chưa phân công'}</strong>
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-lg border border-white/10">
                Lớp giảng dạy: <strong className="text-white font-bold">{assignedClasses.join(', ') || 'Chưa phân lớp'}</strong>
              </span>
            </div>
          </div>

          {/* ACADEMIC STATUS CAPSULE */}
          <div className="flex flex-col sm:flex-row items-center gap-3 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-8 shrink-0">
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3.5 border border-white/15 w-full sm:w-auto">
              <span className="block text-2xl sm:text-3xl font-extrabold font-heading text-[#00DFFF]">
                {totalClassesCount}
              </span>
              <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider">Lớp phụ trách</span>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3.5 border border-white/15 w-full sm:w-auto">
              <span className="block text-2xl sm:text-3xl font-extrabold font-heading text-white">
                {totalStudentsCount}
              </span>
              <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider">Tổng học sinh</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. TEACHING OVERVIEW: 6 THẺ THỐNG KÊ SỐ LIỆU THỰC TẾ */}
      {/* ==================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base sm:text-lg font-bold font-heading text-[#14213D] dark:text-white flex items-center gap-2 m-0">
            <BarChart3 className="h-5 w-5 text-[#1746D1] dark:text-cyan-400" /> Tổng quan dữ liệu giảng dạy & khảo thí
          </h2>
          <span className="text-xs text-[#64748B] dark:text-slate-400 font-semibold">Cập nhật thời gian thực</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Số lớp */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm hover:border-[#1746D1] transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Lớp phụ trách</span>
              <div className="p-2 rounded-xl bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-400 border border-[#1746D1]/15">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-heading text-[#14213D] dark:text-white group-hover:text-[#1746D1] transition-colors">
              {totalClassesCount} <span className="text-xs font-semibold text-[#64748B]">lớp</span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 truncate m-0">
              {assignedClasses.slice(0, 2).join(', ')}{assignedClasses.length > 2 ? '...' : ''}
            </p>
          </div>

          {/* Card 2: Học sinh */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm hover:border-[#087CFF] transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Tổng học sinh</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border border-cyan-500/20">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-heading text-[#14213D] dark:text-white group-hover:text-[#087CFF] transition-colors">
              {totalStudentsCount} <span className="text-xs font-semibold text-[#64748B]">HS</span>
            </div>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold m-0">Toàn bộ danh sách</p>
          </div>

          {/* Card 3: Đề đã tạo */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm hover:border-[#16A36A] transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Đề thi biên soạn</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-heading text-[#14213D] dark:text-white group-hover:text-emerald-600 transition-colors">
              {totalExamsCreated} <span className="text-xs font-semibold text-[#64748B]">đề</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold m-0">Ngân hàng đề thi</p>
          </div>

          {/* Card 4: Bài đã giao */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm hover:border-blue-500 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Lượt giao bài</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-heading text-[#14213D] dark:text-white group-hover:text-blue-600 transition-colors">
              {totalAssignedCount} <span className="text-xs font-semibold text-[#64748B]">lượt</span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 m-0">Đã giao cho các lớp</p>
          </div>

          {/* Card 5: Đã hoàn thành */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm hover:border-[#16A36A] transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Bài nộp hoàn thành</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400">
              {completedSubmissionsCount} <span className="text-xs font-semibold text-[#64748B]">bài</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold m-0">{completionRate}% tỷ lệ nộp</p>
          </div>

          {/* Card 6: Đang chờ thực hiện */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] shadow-sm hover:border-amber-400 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Đang chờ nộp</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-heading text-amber-600 dark:text-amber-400">
              {pendingSubmissionsCount} <span className="text-xs font-semibold text-[#64748B]">lượt</span>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold m-0">Học sinh chưa nộp</p>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3. QUICK ACTIONS: CÁC NÚT THAO TÁC NHANH CHO GIÁO VIÊN */}
      {/* ==================================================== */}
      <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
          <h2 className="text-base font-bold font-heading flex items-center gap-2 m-0 text-[#14213D] dark:text-white">
            <Sparkles className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Thao tác nghiệp vụ nhanh (Quick Actions)
          </h2>
          <span className="text-xs text-[#64748B] dark:text-slate-400">Quy trình làm việc tối ưu</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Tạo đề thi mới */}
          <Link 
            href="/dashboard/teacher/exams?action=create" 
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B] hover:border-[#1746D1] flex flex-col items-center text-center gap-2.5 transition-all group shadow-2xs"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1746D1] to-[#087CFF] text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#14213D] dark:text-white group-hover:text-[#1746D1] transition-colors m-0">Tạo đề thi mới</h4>
              <p className="text-[10px] text-[#64748B] dark:text-slate-400 m-0 mt-0.5">Quy trình 4 bước</p>
            </div>
          </Link>

          {/* Action 2: Soạn câu hỏi */}
          <Link 
            href="/dashboard/teacher/exams?action=create_question" 
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B] hover:border-cyan-500 flex flex-col items-center text-center gap-2.5 transition-all group shadow-2xs"
          >
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition-transform">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#14213D] dark:text-white group-hover:text-cyan-600 transition-colors m-0">Soạn câu hỏi</h4>
              <p className="text-[10px] text-[#64748B] dark:text-slate-400 m-0 mt-0.5">3 dạng chuẩn 2026</p>
            </div>
          </Link>

          {/* Action 3: Quản lý ngân hàng câu hỏi */}
          <Link 
            href="/dashboard/teacher/exams?tab=questions" 
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B] hover:border-purple-500 flex flex-col items-center text-center gap-2.5 transition-all group shadow-2xs"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 flex items-center justify-center border border-purple-500/30 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#14213D] dark:text-white group-hover:text-purple-600 transition-colors m-0">Ngân hàng câu hỏi</h4>
              <p className="text-[10px] text-[#64748B] dark:text-slate-400 m-0 mt-0.5">Lọc mức độ & chủ đề</p>
            </div>
          </Link>

          {/* Action 4: Giao bài tập */}
          <Link 
            href="/dashboard/teacher/exams?tab=bank" 
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B] hover:border-emerald-500 flex flex-col items-center text-center gap-2.5 transition-all group shadow-2xs"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition-transform">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#14213D] dark:text-white group-hover:text-emerald-600 transition-colors m-0">Giao bài cho lớp</h4>
              <p className="text-[10px] text-[#64748B] dark:text-slate-400 m-0 mt-0.5">Đặt hạn & trọng số</p>
            </div>
          </Link>

          {/* Action 5: Quản lý lớp học */}
          <Link 
            href="/dashboard/teacher/students" 
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B] hover:border-[#087CFF] flex flex-col items-center text-center gap-2.5 transition-all group shadow-2xs"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center border border-blue-500/30 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#14213D] dark:text-white group-hover:text-blue-600 transition-colors m-0">Quản lý lớp học</h4>
              <p className="text-[10px] text-[#64748B] dark:text-slate-400 m-0 mt-0.5">Danh sách & sổ điểm</p>
            </div>
          </Link>

          {/* Action 6: Bảng vàng & Thống kê */}
          <Link 
            href="/dashboard/teacher/leaderboard" 
            className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B] hover:border-amber-500 flex flex-col items-center text-center gap-2.5 transition-all group shadow-2xs"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#14213D] dark:text-white group-hover:text-amber-600 transition-colors m-0">Bảng vàng vinh danh</h4>
              <p className="text-[10px] text-[#64748B] dark:text-slate-400 m-0 mt-0.5">Top 3 & Top 7 khối</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 4. TEACHING ANALYTICS & PHÂN BỐ KẾT QUẢ KHẢO THÍ */}
      {/* ==================================================== */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (8 CỘT): BIỂU ĐỒ PHÂN BỐ & THỐNG KÊ LỚP */}
        <div className="md:col-span-8 space-y-6">
          
          <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
              <div>
                <h3 className="font-bold font-heading text-base text-[#14213D] dark:text-white flex items-center gap-2 m-0">
                  <TrendingUp className="h-5 w-5 text-[#1746D1] dark:text-cyan-400" /> Phân tích chất lượng khảo thí & Phổ điểm
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 m-0 mt-0.5">Dựa trên {scores.length} bài thi học sinh đã nộp trong hệ thống</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold block">Điểm trung bình</span>
                  <span className="text-xl font-black font-heading text-[#1746D1] dark:text-cyan-400">{averageScore} / 10.0</span>
                </div>
              </div>
            </div>

            {/* THANH PHỔ ĐIỂM TRỰC QUAN (SCORE DISTRIBUTION) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#14213D] dark:text-white">
                <span>Phân bố mức điểm học sinh</span>
                <span className="text-[#64748B] font-semibold">Tỷ lệ đạt chuẩn: {100 - distPercent.weak}%</span>
              </div>

              {/* Progress bar đa tầng */}
              <div className="h-4 w-full rounded-full bg-[#E2E8F0] dark:bg-slate-800 flex overflow-hidden p-0.5 shadow-inner">
                {distPercent.excellent > 0 && (
                  <div style={{ width: `${distPercent.excellent}%` }} className="bg-purple-500 h-full first:rounded-l-full last:rounded-r-full" title={`Xuất sắc (>=9.0): ${distPercent.excellent}%`} />
                )}
                {distPercent.good > 0 && (
                  <div style={{ width: `${distPercent.good}%` }} className="bg-emerald-500 h-full first:rounded-l-full last:rounded-r-full" title={`Giỏi (8.0-8.9): ${distPercent.good}%`} />
                )}
                {distPercent.fair > 0 && (
                  <div style={{ width: `${distPercent.fair}%` }} className="bg-blue-500 h-full first:rounded-l-full last:rounded-r-full" title={`Khá (6.5-7.9): ${distPercent.fair}%`} />
                )}
                {distPercent.average > 0 && (
                  <div style={{ width: `${distPercent.average}%` }} className="bg-amber-400 h-full first:rounded-l-full last:rounded-r-full" title={`Trung bình (5.0-6.4): ${distPercent.average}%`} />
                )}
                {distPercent.weak > 0 && (
                  <div style={{ width: `${distPercent.weak}%` }} className="bg-rose-500 h-full first:rounded-l-full last:rounded-r-full" title={`Cần cố gắng (<5.0): ${distPercent.weak}%`} />
                )}
              </div>

              {/* Chú thích phổ điểm */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-purple-700 dark:text-purple-300 font-bold">Xuất sắc (≥9)</span>
                    <strong className="text-xs text-[#14213D] dark:text-white">{distribution.excellent} HS ({distPercent.excellent}%)</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Giỏi (8-8.9)</span>
                    <strong className="text-xs text-[#14213D] dark:text-white">{distribution.good} HS ({distPercent.good}%)</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-blue-700 dark:text-blue-300 font-bold">Khá (6.5-7.9)</span>
                    <strong className="text-xs text-[#14213D] dark:text-white">{distribution.fair} HS ({distPercent.fair}%)</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-bold">TB (5-6.4)</span>
                    <strong className="text-xs text-[#14213D] dark:text-white">{distribution.average} HS ({distPercent.average}%)</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <div>
                    <span className="block text-[10px] text-rose-700 dark:text-rose-300 font-bold">Yếu (&lt;5)</span>
                    <strong className="text-xs text-[#14213D] dark:text-white">{distribution.weak} HS ({distPercent.weak}%)</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* DANH SÁCH LỚP HỌC PHỤ TRÁCH & ĐIỂM TB TỪNG LỚP */}
            <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1B317A]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#14213D] dark:text-white uppercase tracking-wider">
                  Tiến độ & Điểm số theo lớp giảng dạy
                </span>
                <Link href="/dashboard/teacher/students" className="text-xs font-bold text-[#1746D1] dark:text-cyan-400 hover:underline flex items-center gap-0.5">
                  Xem chi tiết sổ điểm &rarr;
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {assignments.map((asg: any) => {
                  const cls = asg.classes;
                  if (!cls) return null;
                  const clsStudents = students.filter((s: any) => s.class_id === cls.id);
                  const clsStudentIds = new Set(clsStudents.map((s: any) => s.student_id));
                  const clsResults = examResults.filter((r: any) => clsStudentIds.has(r.student_id));
                  const clsScores = clsResults.map((r: any) => Number(r.score || 0));
                  const clsAvg = clsScores.length > 0 
                    ? (clsScores.reduce((a: number, b: number) => a + b, 0) / clsScores.length).toFixed(1) 
                    : 'Chưa có';

                  return (
                    <div key={asg.id} className="p-3.5 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/30 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[#14213D] dark:text-white">{cls.name}</span>
                          <span className="text-[10px] bg-[#E7F1FF] text-[#1746D1] font-bold px-2 py-0.5 rounded-full border border-[#B6D4FE]">
                            {asg.subjects?.name || 'Môn học'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400 m-0">
                          Sĩ số: <strong className="text-[#14213D] dark:text-white">{clsStudents.length}</strong> học sinh &bull; {clsResults.length} bài đã nộp
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#64748B] uppercase font-bold block">Điểm TB</span>
                        <span className="text-base font-black font-heading text-[#1746D1] dark:text-cyan-400">{clsAvg}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* BẢNG TIN THÔNG BÁO NỘI BỘ */}
          <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm">
            <AnnouncementManager
              initialAnnouncements={announcements}
              userRole={userRole}
              token={token}
              userEmail={teacherEmail}
            />
          </div>

        </div>

        {/* CỘT PHẢI (4 CỘT): HOẠT ĐỘNG GẦN ĐÂY CỦA HỌC SINH */}
        <div className="md:col-span-4 space-y-6">
          
          <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
              <h2 className="text-base font-bold font-heading flex items-center gap-2 m-0 text-[#14213D] dark:text-white">
                <Clock className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Hoạt động gần đây
              </h2>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Trực tiếp</span>
            </div>

            {recentProgressWithNames.length === 0 ? (
              <p className="text-xs text-[#64748B] italic m-0 py-4 text-center">Chưa có hoạt động học tập mới.</p>
            ) : (
              <div className="space-y-3">
                {recentProgressWithNames.map((prog: any) => (
                  <div key={prog.id} className="p-3.5 bg-[#F8FAFC] dark:bg-[#0D226B]/50 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B] rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#087CFF] flex items-start gap-3 transition-all">
                    <div className="h-8 w-8 rounded-full bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      {prog.student_name?.[0]?.toUpperCase() || 'H'}
                    </div>
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[#14213D] dark:text-white">{prog.student_name}</span>
                        {prog.class_name && (
                          <span className="text-[10px] bg-[#E7F1FF] text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-[#B6D4FE] dark:border-cyan-400/30">{prog.class_name}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#475569] dark:text-slate-300 truncate m-0">{prog.lessons?.title}</p>
                      <span className="inline-block text-[10px] text-[#16A36A] dark:text-emerald-400 font-bold">Hoàn thành bài giảng</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HỖ TRỢ & HƯỚNG DẪN GIÁO VIÊN */}
          <div className="bg-gradient-to-br from-[#1746D1]/10 via-[#087CFF]/5 to-transparent border border-[#087CFF]/20 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-[#1746D1] dark:text-cyan-300">
              <ShieldCheck className="h-5 w-5" />
              <h4 className="font-bold text-xs uppercase tracking-wider m-0">Chuẩn Khảo Thí 2026</h4>
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed m-0 font-medium">
              Đề thi tạo bởi Thầy/Cô tự động áp dụng ma trận 3 dạng thức mới của Bộ GD&ĐT: Trắc nghiệm 4 lựa chọn (0.25đ), Trắc nghiệm Đúng/Sai (1.0đ) và Trả lời ngắn (0.5đ).
            </p>
            <div className="pt-1">
              <Link href="/guide" className="text-xs font-bold text-[#1746D1] dark:text-cyan-400 hover:underline flex items-center gap-1">
                Xem hướng dẫn khảo thí FPREP <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
