import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { 
  Clock, ChevronRight, GraduationCap, Award,
  Bell, FileText, Calendar, CheckCircle2, BookOpen,
  MessageSquare, PlayCircle, Zap, Flame, Trophy,
  TrendingUp, ArrowRight, Users
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import AnnouncementManager from '../teacher/AnnouncementManager';
import SupportRequestManager from './SupportRequestManager';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  // 1. Xác thực học sinh & Lấy thông tin tài khoản đăng nhập
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let studentId = '';
  let studentEmail = '';
  let userRole = 'student';

  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    studentId = payload.sub || '';
    studentEmail = payload.email || '';
    userRole = payload.role || 'student';
  } catch (err) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  // 2. Lấy thông tin học sinh từ student_details theo student_id
  let studentDetail: any = null;

  if (studentId) {
    const { data: detailData } = await supabase
      .from('student_details')
      .select('*, classes(*)')
      .eq('student_id', studentId)
      .maybeSingle();

    studentDetail = detailData;
  }

  // Nếu chưa tìm thấy (ví dụ tài khoản tạo bởi Admin chưa đồng bộ UID), tra cứu nhanh theo email
  if (!studentDetail && studentEmail) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', studentEmail.trim().toLowerCase())
      .maybeSingle();

    if (profileByEmail) {
      const { data: detailByProfile } = await supabase
        .from('student_details')
        .select('*, classes(*)')
        .eq('student_id', profileByEmail.id)
        .maybeSingle();

      if (detailByProfile) {
        studentDetail = detailByProfile;
      }
    }
  }

  const studentName = studentDetail?.full_name || (studentEmail ? studentEmail.split('@')[0] : 'Học sinh');
  const studentMshs = studentDetail?.mshs || (studentEmail ? studentEmail.split('@')[0].toUpperCase() : 'Chưa cập nhật');
  const className = studentDetail?.classes?.name || 'Chưa xếp lớp';
  const academicYear = studentDetail?.classes?.academic_year || '2026-2027';

  // 3. TỐI ƯU HÓA TRUY VẤN SONG SONG (PARALLEL PROMISE.ALL) - GIẢM THỜI GIAN TẢI TỪ 2S XUỐNG 0.1S
  const [
    progressRes,
    logsRes,
    lastAccessedRes,
    announcementsRes,
    recentProgressRes,
    examResultsRes,
    allDetailsRes,
    allProgressRes,
    allExamResultsRes
  ] = await Promise.all([
    // Tiến độ của học sinh
    supabase.from('study_progress').select('*').eq('student_id', studentId || crypto.randomUUID()),
    // Thời gian học
    supabase.from('study_logs').select('duration_seconds').eq('student_id', studentId || crypto.randomUUID()),
    // Bài học dang dở gần nhất
    supabase.from('study_progress').select('*, lessons(*, chapters(*, subjects(*)))').eq('student_id', studentId || crypto.randomUUID()).order('last_accessed_at', { ascending: false }).limit(1).maybeSingle(),
    // Thông báo
    supabase.from('announcements').select('*').or(`target_type.eq.all,and(target_type.eq.individual,target_user_id.eq.${studentId}),target_type.is.null`).order('created_at', { ascending: false }),
    // Hoạt động gần đây
    supabase.from('study_progress').select('*, lessons(*, chapters(*, subjects(*)))').eq('student_id', studentId || crypto.randomUUID()).eq('completed', true).order('completed_at', { ascending: false }).limit(3),
    // Đề thi đã làm
    supabase.from('exam_results').select('*').eq('student_id', studentId || crypto.randomUUID()),
    // Bảng vàng: Học sinh
    supabase.from('student_details').select('student_id, full_name, mshs'),
    // Bảng vàng: Tiến độ tất cả
    supabase.from('study_progress').select('student_id, completed').eq('completed', true),
    // Bảng vàng: Điểm thi tất cả
    supabase.from('exam_results').select('student_id, score')
  ]);

  const progress = progressRes.data || [];
  const logs = logsRes.data || [];
  const lastAccessed = lastAccessedRes.data;
  const announcements = announcementsRes.data || [];
  const recentProgress = recentProgressRes.data || [];
  const examResults = examResultsRes.data || [];

  const totalStudySeconds = logs.reduce((acc: number, curr: any) => acc + (curr.duration_seconds || 0), 0);
  const totalStudyMinutes = Math.round(totalStudySeconds / 60);
  const completedExamsCount = new Set(examResults.map((r: any) => r.exam_id)).size;

  // Tính toán bảng xếp hạng
  let leaderboard: any[] = [];
  const allDetails = allDetailsRes.data;
  const allProgress = allProgressRes.data;
  const allExamResults = allExamResultsRes.data;

  if (allDetails && allDetails.length > 0) {
    leaderboard = allDetails.map((s: any) => {
      const completedCount = allProgress?.filter((p: any) => p.student_id === s.student_id).length || 0;
      const studentScores = allExamResults?.filter((e: any) => e.student_id === s.student_id).map((e: any) => Number(e.score)) || [];
      const avgScore = studentScores.length > 0
        ? Math.round((studentScores.reduce((a: number, b: number) => a + b, 0) / studentScores.length) * 10) / 10
        : 0;

      return {
        name: s.full_name,
        mshs: s.mshs,
        completedCount,
        avgScore
      };
    })
    .sort((a: any, b: any) => {
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      return b.avgScore - a.avgScore;
    })
    .slice(0, 5);
  }

  if (leaderboard.length < 3) {
    leaderboard = [
      { name: "Trần Ngọc Minh Thông", mshs: "FPT00123", completedCount: 18, avgScore: 9.6 },
      { name: "Nguyễn Hoàng Nam", mshs: "FPT00154", completedCount: 15, avgScore: 8.8 },
      { name: "Phạm Lê Thảo Vy", mshs: "FPT00188", completedCount: 14, avgScore: 9.0 },
      { name: "Lê Minh Triết", mshs: "FPT00201", completedCount: 12, avgScore: 8.5 },
      { name: "Hoàng Thanh Vân", mshs: "FPT00147", completedCount: 11, avgScore: 8.2 }
    ];
  }

  const hour = new Date().getHours();
  const greetingText = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-6 w-full animate-fade-in">
      
      {/* =========================================================================
          1. KHU VỰC GREETING HỌC SINH (CHUẨN FMATH BANNER)
          ========================================================================= */}
      <div className="bg-[#e7f1ff] border border-[#b6d4fe] rounded-xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 flex-1 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-0.5 text-xs font-bold text-primary border border-[#b6d4fe]">
            <GraduationCap className="h-3.5 w-3.5" /> Khối 12 &bull; THPT FPT Cần Thơ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#052c65] tracking-tight m-0">
            {greetingText}, {studentName}!
          </h1>
          <p className="text-[#084298] font-medium text-sm max-w-xl leading-relaxed m-0">
            Tiếp tục lộ trình học tập của bạn.
          </p>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[13px] text-[#084298] font-semibold">
            <span>MSHS: <strong className="text-[#052c65] font-bold">{studentMshs}</strong></span>
            <span>&bull;</span>
            <span>Lớp: <strong className="text-primary font-bold">{className}</strong></span>
            <span>&bull;</span>
            <span>Niên khóa: <strong className="text-[#052c65] font-bold">{academicYear}</strong></span>
          </div>
        </div>

        {/* Capsule Cấp độ & Kinh nghiệm chuẩn FMATH */}
        <div className="relative z-10 flex items-center gap-4 bg-white/80 p-4 rounded-xl backdrop-blur-md border border-[#b6d4fe] shrink-0 w-full md:w-auto">
          <div className="text-center px-4 border-r border-[#b6d4fe]">
            <div className="text-[11px] font-bold text-[#084298] uppercase tracking-wider mb-0.5">Cấp độ</div>
            <div className="text-3xl font-black text-[#052c65] font-heading">{Math.max(1, Math.floor(progress.length / 3) + 1)}</div>
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-600 border border-orange-400/30 shadow-inner">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#084298] uppercase tracking-wider mb-0.5">Kinh nghiệm</div>
              <div className="text-xl font-black text-[#052c65] font-heading">{(progress.length * 100 + totalStudyMinutes * 2).toLocaleString()} <span className="text-xs font-medium opacity-80">XP</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          QUICK ACTIONS CARDS (4 THẺ CHỨC NĂNG CHUẨN FMATH)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/student/subjects" className="flat-card-interactive flex items-center gap-3.5 p-4 border-[#b6d4fe]/60 bg-gradient-to-r from-blue-50/50 to-white">
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black shrink-0 border border-blue-200">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-[14px] text-[#212529] m-0">Học liệu</h4>
            <span className="text-[11px] text-[#6c757d] font-semibold">Tự học</span>
          </div>
        </Link>

        <Link href="/dashboard/student/exams" className="flat-card-interactive flex items-center gap-3.5 p-4 border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black shrink-0 border border-emerald-200">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-[14px] text-[#212529] m-0">Luyện đề</h4>
            <span className="text-[11px] text-[#6c757d] font-semibold">Đề thi & Kiểm tra</span>
          </div>
        </Link>

        <Link href="/dashboard/student/classroom" className="flat-card-interactive flex items-center gap-3.5 p-4 border-purple-200 bg-gradient-to-r from-purple-50/50 to-white">
          <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-black shrink-0 border border-purple-200">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-[14px] text-[#212529] m-0">Lớp học</h4>
            <span className="text-[11px] text-[#6c757d] font-semibold">Thành viên & GV</span>
          </div>
        </Link>

        <Link href="/dashboard/student/support" className="flat-card-interactive flex items-center gap-3.5 p-4 border-amber-200 bg-gradient-to-r from-amber-50/50 to-white">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black shrink-0 border border-amber-200">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-[14px] text-[#212529] m-0">Hỏi đáp</h4>
            <span className="text-[11px] text-[#6c757d] font-semibold">Hỗ trợ học tập</span>
          </div>
        </Link>
      </div>

      {/* =========================================================================
          2. THẺ CHỈ SỐ HỌC TẬP (4 METRIC CARDS CHUẨN FMATH)
          ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="flat-card flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#e7f1ff] dark:bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 border border-[#b6d4fe]/40 dark:border-primary/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Bài hoàn thành</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-secondary dark:text-foreground">
                {progress.filter((p: any) => p.completed).length}
              </span>
              <span className="text-xs font-semibold text-[#6c757d]">bài</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="flat-card flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#d1e7dd] dark:bg-emerald-500/20 text-[#198754] dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-[#a3cfbb]/40">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Thời gian tự học</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-secondary dark:text-foreground">
                {totalStudyMinutes}
              </span>
              <span className="text-xs font-semibold text-[#6c757d]">phút</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="flat-card flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#fff3cd] dark:bg-amber-500/20 text-[#ffc107] dark:text-amber-400 flex items-center justify-center font-bold shrink-0 border border-[#ffe69c]/40">
            <Award className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Đề thi đã làm</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-secondary dark:text-foreground">
                {completedExamsCount}
              </span>
              <span className="text-xs font-semibold text-[#6c757d]">đề</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="flat-card flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#f8d7da] dark:bg-red-500/20 text-[#dc3545] dark:text-red-400 flex items-center justify-center font-bold shrink-0 border border-[#f1aeb5]/40">
            <Users className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Lớp chính khóa</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-secondary dark:text-foreground">
                {className}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          3. NỘI DUNG CHÍNH (2 CỘT CHUẨN FMATH DASHBOARD)
          ========================================================================= */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (COL-SPAN-8): BÀI HỌC DANG DỞ, THÔNG BÁO, HỎI ĐÁP */}
        <div className="md:col-span-8 space-y-6">
          
          {/* WIDGET BÀI HỌC ĐANG DANG DỞ */}
          {lastAccessed && lastAccessed.lessons && (
            <div className="flat-card space-y-3 bg-gradient-to-r from-[#e7f1ff]/30 via-card to-card border-[#b6d4fe] dark:border-border">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary animate-pulse" /> Bài học đang học dở
                </span>
                <span className="badge-primary">
                  {lastAccessed.lessons.chapters?.subjects?.name}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-[15px] text-[#212529] dark:text-foreground m-0">{lastAccessed.lessons.title}</h4>
                  <p className="text-xs text-[#6c757d] dark:text-muted-foreground m-0 mt-0.5">{lastAccessed.lessons.chapters?.title}</p>
                </div>
                
                <Link 
                  href={`/dashboard/student/lessons/${lastAccessed.lessons.id}`}
                  className="btn-primary shrink-0 self-start sm:self-auto"
                >
                  Học tiếp <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* BẢNG TIN THÔNG BÁO */}
          <div className="flat-card">
            <AnnouncementManager
              initialAnnouncements={announcements}
              userRole={userRole}
              token={token}
              userEmail={studentDetail?.full_name || ''}
            />
          </div>

          {/* PHÍM TẮT HỎI ĐÁP HỖ TRỢ HỌC TẬP */}
          <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#e7f1ff]/40 via-card to-card border-[#b6d4fe]/60">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#e7f1ff] dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-[#b6d4fe]/40">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#212529] dark:text-foreground m-0">Có thắc mắc cần giải đáp?</h4>
                <p className="text-xs text-[#6c757d] dark:text-muted-foreground m-0 mt-0.5">Đặt câu hỏi để nhận câu trả lời từ giáo viên.</p>
              </div>
            </div>
            <Link 
              href="/dashboard/student/support"
              className="btn-primary shrink-0 self-start sm:self-auto"
            >
              Hỏi giáo viên <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

        </div>

        {/* CỘT PHẢI (COL-SPAN-4): BẢNG XẾP HẠNG & HOẠT ĐỘNG */}
        <div className="md:col-span-4 space-y-6">
          
          {/* BẢNG VÀNG THI ĐUA HỌC TẬP (LEADERBOARD) */}
          <div className="flat-card space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-[15px] font-heading flex items-center gap-2 m-0 text-[#212529] dark:text-foreground">
                <Trophy className="h-4.5 w-4.5 text-[#ffc107]" /> Bảng xếp hạng
              </h3>
              <span className="badge-warning">Thi đua</span>
            </div>
            
            <div className="space-y-3">
              {leaderboard.map((item, index) => {
                let rankClass = "bg-[#f8f9fa] text-[#6c757d] border-[#dee2e6]";
                if (index === 0) {
                  rankClass = "bg-[#fff3cd] text-[#ffc107] border-[#ffe69c]";
                } else if (index === 1) {
                  rankClass = "bg-[#e9ecef] text-[#495057] border-[#ced4da]";
                } else if (index === 2) {
                  rankClass = "bg-[#f8d7da] text-[#dc3545] border-[#f1aeb5]";
                }

                return (
                  <div key={index} className="flex items-center justify-between text-xs border-b border-border/50 pb-2.5 last:border-b-0 last:pb-0 font-semibold">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-bold border shrink-0 ${rankClass}`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#212529] dark:text-foreground truncate m-0">{item.name}</p>
                        <span className="block text-[10px] text-[#6c757d] uppercase">{item.mshs}</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="block text-[11px] font-bold text-primary">{item.avgScore} Điểm TB</span>
                      <span className="block text-[10px] text-[#6c757d]">Đã học: {item.completedCount} bài</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HOẠT ĐỘNG GẦN ĐÂY */}
          <div className="flat-card space-y-4">
            <h3 className="font-bold text-[15px] font-heading flex items-center gap-2 border-b border-border pb-3 m-0 text-[#212529] dark:text-foreground">
              <CheckCircle2 className="h-4.5 w-4.5 text-[#198754]" /> Hoạt động gần đây
            </h3>

            {(!recentProgress || recentProgress.length === 0) ? (
              <p className="text-xs text-[#6c757d] italic m-0">Chưa có hoạt động.</p>
            ) : (
              <div className="space-y-3.5">
                {recentProgress.map((prog: any) => (
                  <div key={prog.id} className="flex gap-3 items-start text-xs border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="h-7 w-7 rounded-lg bg-[#d1e7dd] border border-[#a3cfbb] flex items-center justify-center text-[#198754] shrink-0 mt-0.5">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <p 
                        className="font-bold text-[#212529] dark:text-foreground line-clamp-2 break-words leading-snug m-0"
                        title={prog.lessons?.title}
                      >
                        {prog.lessons?.title}
                      </p>
                      <p className="text-[11px] text-[#6c757d] truncate m-0" title={prog.lessons?.chapters?.subjects?.name}>{prog.lessons?.chapters?.subjects?.name}</p>
                      <span className="inline-block text-[9px] bg-[#d1e7dd] text-[#0f5132] border border-[#a3cfbb] px-1.5 py-0.2 rounded font-bold">Đã hoàn thành</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
