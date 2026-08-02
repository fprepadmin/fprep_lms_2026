import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { 
  Clock, ChevronRight, GraduationCap, Award,
  Bell, FileText, Calendar, CheckCircle2, BookOpen,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import AnnouncementManager from '../teacher/AnnouncementManager';
import SupportRequestManager from './SupportRequestManager';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const supabase = await getSupabaseServerClient();

  // 1. Lấy thông tin học sinh từ student_details
  const { data: studentDetail } = await supabase
    .from('student_details')
    .select('*, classes(name, group_type)')
    .maybeSingle();

  const studentId = studentDetail?.student_id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', studentId || '')
    .maybeSingle();
  const userRole = profile?.role || 'student';

  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';

  // Lấy các môn học để chọn
  const { data: dbSubjects } = await supabase
    .from('subjects')
    .select('*');

  // Lấy lịch sử yêu cầu hỗ trợ chuyên môn của học sinh này
  const { data: dbSupportRequests } = await supabase
    .from('support_requests')
    .select('*')
    .eq('student_id', studentId || crypto.randomUUID())
    .order('created_at', { ascending: false });

  // 2. Lấy tiến độ học tập (các bài đã hoàn thành)
  const { data: progress } = await supabase
    .from('study_progress')
    .select('*')
    .eq('student_id', studentId || crypto.randomUUID());

  // 3. Tìm bài học truy cập gần nhất (Bài học đang dang dở)
  const { data: lastAccessed } = await supabase
    .from('study_progress')
    .select('*, lessons(*, chapters(*, subjects(*)))')
    .eq('student_id', studentId || crypto.randomUUID())
    .order('last_accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Lấy thời lượng học từ study_logs
  const { data: logs } = await supabase
    .from('study_logs')
    .select('duration_seconds')
    .eq('student_id', studentId || crypto.randomUUID());
    
  const totalStudyMinutes = logs 
    ? Math.round(logs.reduce((acc: number, log: any) => acc + log.duration_seconds, 0) / 60)
    : 0;

  // 5. Lấy danh sách thông báo động từ Mock DB/Supabase (Lọc theo đối tượng nhận tin)
  const { data: dbAnnouncements } = await supabase
    .from('announcements')
    .select('*')
    .or(`target_type.eq.all,and(target_type.eq.individual,target_user_id.eq.${studentId}),target_type.is.null`)
    .order('created_at', { ascending: false });

  const announcements = dbAnnouncements && dbAnnouncements.length > 0 
    ? dbAnnouncements.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        image_url: a.image_url || undefined,
        date: a.date,
        sender: a.sender
      }))
    : [];

  // 6. Hoạt động gần đây (Recent Activities)
  const { data: recentProgress } = await supabase
    .from('study_progress')
    .select('*, lessons(*, chapters(*, subjects(*)))')
    .eq('student_id', studentId || crypto.randomUUID())
    .eq('completed', true)
    .order('last_accessed_at', { ascending: false })
    .limit(3);

  // 7. Tính toán bảng vàng thi đua học tập (Leaderboard)
  let leaderboard: any[] = [];
  try {
    const { data: dbStudents } = await supabase.from('student_details').select('student_id, full_name, mshs');
    const { data: dbResults } = await supabase.from('exam_results').select('student_id, score');
    const { data: dbProgress } = await supabase.from('study_progress').select('student_id, completed');

    if (dbStudents && dbStudents.length > 0) {
      leaderboard = dbStudents.map((st: any) => {
        const studentResults = dbResults?.filter((r: any) => r.student_id === st.student_id) || [];
        const studentProg = dbProgress?.filter((p: any) => p.student_id === st.student_id && p.completed) || [];

        const avgScore = studentResults.length > 0
          ? Math.round((studentResults.reduce((sum: number, r: any) => sum + Number(r.score), 0) / studentResults.length) * 10) / 10
          : 0;

        return {
          name: st.full_name,
          mshs: st.mshs,
          completedCount: studentProg.length,
          avgScore,
          rankScore: avgScore * 10 + studentProg.length
        };
      });

      // Sắp xếp giảm dần theo điểm thi và số bài học
      leaderboard.sort((a, b) => b.rankScore - a.rankScore);
      leaderboard = leaderboard.slice(0, 5);
    }
  } catch (err) {
    console.error("Lỗi khi tải bảng xếp hạng:", err);
  }

  // Fallback nếu dữ liệu mẫu hoặc ít học sinh
  if (leaderboard.length < 3) {
    leaderboard = [
      { name: "Trần Ngọc Minh Thông", mshs: "FPT00123", completedCount: 18, avgScore: 9.6 },
      { name: "Nguyễn Hoàng Nam", mshs: "FPT00154", completedCount: 15, avgScore: 8.8 },
      { name: "Phạm Lê Thảo Vy", mshs: "FPT00188", completedCount: 14, avgScore: 9.0 },
      { name: "Lê Minh Triết", mshs: "FPT00201", completedCount: 12, avgScore: 8.5 },
      { name: "Hoàng Thanh Vân", mshs: "FPT00147", completedCount: 11, avgScore: 8.2 }
    ];
  }

  return (
    <div className="space-y-8 w-full animate-fade-in">
      {/* 1. KHU VỰC GREETING HỌC SINH */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            <GraduationCap className="h-3.5 w-3.5" /> Học sinh FPT School Cần Thơ
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Chào {studentDetail?.full_name || 'Học sinh'},
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Hãy tiếp tục lộ trình tự học của mình ngày hôm nay để củng cố kiến thức tốt nhất cho các kỳ thi sắp tới.
          </p>
          
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs font-semibold text-muted-foreground">
            <span>MSHS: <strong className="text-foreground">{studentDetail?.mshs || 'Chưa cập nhật'}</strong></span>
            <span>Lớp: <strong className="text-foreground">{studentDetail?.classes?.name || 'Chưa xếp lớp'}</strong></span>
            <span>Niên khóa: <strong className="text-foreground">2026-2027</strong></span>
          </div>
        </div>

        {/* WIDGET TỔNG QUAN */}
        <div className="flex gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
          <div className="text-center">
            <span className="block text-2xl sm:text-3xl font-black text-primary">
              {progress?.filter((p: any) => p.completed).length || 0}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Bài hoàn thành</span>
          </div>
          <div className="text-center border-l border-border pl-4 sm:pl-6">
            <span className="block text-2xl sm:text-3xl font-black text-secondary">
              {totalStudyMinutes}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Phút tự học</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* CỘT TRÁI (COL-SPAN-8): THÔNG BÁO VÀ HỌC DỞ */}
        <div className="md:col-span-8 space-y-6">
          
          {/* WIDGET BÀI HỌC ĐANG DANG DỞ */}
          {lastAccessed && lastAccessed.lessons && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary animate-pulse" /> Bài học đang học dở
                </span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 px-2 py-0.5 rounded text-primary font-bold">
                  {lastAccessed.lessons.chapters?.subjects?.name}
                </span>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-foreground">{lastAccessed.lessons.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{lastAccessed.lessons.chapters?.title}</p>
                </div>
                
                <Link 
                  href={`/dashboard/student/lessons/${lastAccessed.lessons.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
                >
                  Học tiếp <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          <AnnouncementManager
            initialAnnouncements={announcements}
            userRole={userRole}
            token={token}
            userEmail={studentDetail?.full_name || ''}
          />

          {/* PHÍM TẮT HỎI ĐÁP HỖ TRỢ HỌC TẬP */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 mt-6 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-foreground">Bạn có thắc mắc chuyên môn cần giải đáp?</h4>
                  <p className="text-[10px] text-muted-foreground font-semibold">Gửi câu hỏi và nhận câu trả lời trực tiếp từ thầy cô phụ trách tổ bộ môn.</p>
                </div>
              </div>
              <Link 
                href="/dashboard/student/support"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity shrink-0 justify-center"
              >
                Hỏi giáo viên <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* CỘT PHẢI (COL-SPAN-4): BẢNG XẾP HẠNG & HOẠT ĐỘNG */}
        <div className="md:col-span-4 space-y-6">
          
          {/* BẢNG VÀNG THI ĐUA HỌC TẬP (LEADERBOARD) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2 border-b border-border pb-2.5">
              <Award className="h-4.5 w-4.5 text-yellow-500 animate-pulse" /> Bảng Vàng Học Tập Khối 12
            </h3>
            
            <div className="space-y-3">
              {leaderboard.map((item, index) => {
                let rankIcon = "";
                let rankClass = "bg-muted text-muted-foreground";
                if (index === 0) {
                  rankIcon = "";
                  rankClass = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20";
                } else if (index === 1) {
                  rankIcon = "";
                  rankClass = "bg-slate-300/10 text-slate-600 dark:text-slate-400 border border-slate-300/20";
                } else if (index === 2) {
                  rankIcon = "";
                  rankClass = "bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-600/20";
                }

                return (
                  <div key={index} className="flex items-center justify-between text-xs border-b border-border/50 pb-2.5 last:border-b-0 last:pb-0 font-semibold">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${rankClass}`}>
                        {rankIcon || index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">{item.name}</p>
                        <span className="block text-[8px] text-muted-foreground uppercase">{item.mshs}</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] font-bold text-primary">{item.avgScore} Điểm TB</span>
                      <span className="block text-[8px] text-muted-foreground font-medium">Đã học: {item.completedCount} bài</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HOẠT ĐỘNG GẦN ĐÂY */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2 border-b border-border pb-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 text-green-500" /> Hoạt động gần đây
            </h3>

            {(!recentProgress || recentProgress.length === 0) ? (
              <p className="text-xs text-muted-foreground italic">Chưa ghi nhận hoạt động tự học nào.</p>
            ) : (
              <div className="space-y-4">
                {recentProgress.map((prog: any) => (
                  <div key={prog.id} className="flex gap-3 items-start text-xs border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="h-7 w-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shrink-0 mt-0.5">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-foreground truncate">{prog.lessons?.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{prog.lessons?.chapters?.subjects?.name}</p>
                      <span className="inline-block text-[9px] bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded font-bold">Đã hoàn thành</span>
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
