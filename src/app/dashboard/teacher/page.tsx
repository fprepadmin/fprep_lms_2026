import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { 
  GraduationCap, Bell, Calendar, BookOpen, Users, 
  Clock, CheckCircle, ChevronRight, Award, MessageSquare 
} from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import AnnouncementManager from './AnnouncementManager';

import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function TeacherDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let teacherId = '';
  let teacherEmail = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    teacherId = payload.sub;
    teacherEmail = payload.email || '';
  } catch (err) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherId)
    .single();
  const userRole = profile?.role || 'teacher';



  // Lấy các môn học
  const { data: dbSubjects } = await supabase
    .from('subjects')
    .select('*');

  // Lấy danh sách yêu cầu hỗ trợ chuyên môn của học sinh
  const { data: dbSupportRequests } = await supabase
    .from('support_requests')
    .select('*')
    .order('created_at', { ascending: false });

  // 1. Lấy thông tin lớp và môn học được phân công cho giáo viên này
  const { data: assignments } = await supabase
    .from('teacher_classes')
    .select('*, classes(*), subjects(*)')
    .eq('teacher_id', teacherId);

  const classIds = assignments?.map((a: any) => a.class_id).filter(Boolean) || [];
  const subjectIds = assignments?.map((a: any) => a.subject_id).filter(Boolean) || [];

  // 2. Lấy danh sách học sinh thuộc các lớp giáo viên phụ trách
  const { data: students } = await supabase
    .from('student_details')
    .select('*, classes(*)')
    .in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]);

  const studentIds = students?.map((s: any) => s.student_id) || [];

  // 3. Lấy tổng số học liệu biên soạn
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*, lessons(*, lesson_materials(*))')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]);

  let totalLessonsCount = 0;
  let totalMaterialsCount = 0;
  chapters?.forEach((chap: any) => {
    totalLessonsCount += chap.lessons?.length || 0;
    chap.lessons?.forEach((les: any) => {
      totalMaterialsCount += les.lesson_materials?.length || 0;
    });
  });

  // 4. Lấy các hoạt động học tập gần đây của các học sinh thuộc lớp phụ trách
  const { data: recentProgress } = await supabase
    .from('study_progress')
    .select('*, lessons(*, chapters(*, subjects(*)))')
    .in('student_id', studentIds.length > 0 ? studentIds : [crypto.randomUUID()])
    .eq('completed', true)
    .order('last_accessed_at', { ascending: false })
    .limit(4);

  // Lấy họ tên học sinh tương ứng với recentProgress
  const recentProgressWithNames = recentProgress?.map((prog: any) => {
    const student = students?.find((s: any) => s.student_id === prog.student_id);
    return {
      ...prog,
      student_name: student?.full_name || 'Học sinh',
      class_name: student?.classes?.name || ''
    };
  }) || [];

  // 5. Lấy danh sách thông báo động từ Mock DB/Supabase (Lọc theo đối tượng nhận tin)
  const { data: dbAnnouncements } = await supabase
    .from('announcements')
    .select('*')
    .or(`target_type.eq.all,target_type.eq.teachers,and(target_type.eq.individual,target_user_id.eq.${teacherId}),target_type.is.null`)
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

  return (
    <div className="space-y-8 w-full">
      {/* 1. WELCOME BANNER */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            <GraduationCap className="h-3.5 w-3.5" /> Tài khoản Giáo viên FPT School
          </div>
          <h1 className="text-3xl font-black text-foreground">
            Xin chào Thầy/Cô,
          </h1>
          <p className="text-muted-foreground text-xs font-semibold max-w-xl">
            Hệ thống LMS đồng hành cùng giáo viên trong việc quản lý bài giảng, theo dõi trực quan tiến trình tự học và kiểm tra năng lực học sinh Khối 12.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs font-bold text-muted-foreground">
            <span>Môn dạy: <strong className="text-foreground">{assignments?.[0]?.subjects?.name || 'Chưa phân công'}</strong></span>
            <span>Lớp dạy: <strong className="text-foreground">{assignments?.map((a: any) => a.classes?.name).join(', ') || 'Chưa phân lớp'}</strong></span>
          </div>
        </div>

        {/* STATS SUMMARY WIDGETS */}
        <div className="flex gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
          <div className="text-center">
            <span className="block text-2xl sm:text-3xl font-black text-primary">
              {assignments?.length || 0}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Lớp phụ trách</span>
          </div>
          <div className="text-center border-l border-border pl-4 sm:pl-6">
            <span className="block text-2xl sm:text-3xl font-black text-secondary">
              {students?.length || 0}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng học sinh</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* CỘT TRÁI: THÔNG BÁO VÀ TIỆN ÍCH */}
        <div className="md:col-span-8 space-y-6">
          
          <AnnouncementManager
            initialAnnouncements={announcements}
            userRole={userRole}
            token={token}
            userEmail={teacherEmail}
          />

          {/* CÔNG CỤ THAO TÁC NHANH CHO GIÁO VIÊN */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 mt-6">
            <h2 className="text-base font-extrabold flex items-center gap-2 border-b border-border pb-2.5">
              <BookOpen className="h-4.5 w-4.5 text-primary" /> Phím tắt Thao tác nhanh chuyên môn
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link href="/dashboard/teacher/students" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform"><Users className="h-4.5 w-4.5" /></div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-foreground">Quản lý lớp học</span>
                  <span className="block text-[10px] text-muted-foreground font-semibold">Theo dõi tiến độ, CRUD học sinh</span>
                </div>
              </Link>
              <Link href="/dashboard/teacher/materials" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-105 transition-transform"><BookOpen className="h-4.5 w-4.5" /></div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-foreground">Soạn thảo học liệu</span>
                  <span className="block text-[10px] text-muted-foreground font-semibold">Đăng tài liệu & Đề trắc nghiệm</span>
                </div>
              </Link>
              <Link href="/dashboard/teacher/support" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform"><MessageSquare className="h-4.5 w-4.5" /></div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-foreground">Hỏi đáp học sinh</span>
                  <span className="block text-[10px] text-muted-foreground font-semibold">Giải đáp thắc mắc chuyên môn</span>
                </div>
              </Link>
            </div>
          </div>

        </div>

        {/* CỘT PHẢI: HOẠT ĐỘNG HỌC SINH GẦN ĐÂY */}
        <div className="md:col-span-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 sticky top-24">
            <h3 className="font-extrabold text-sm flex items-center gap-2 border-b border-border pb-2.5">
              <CheckCircle className="h-4.5 w-4.5 text-green-500" /> Hoạt động của học sinh
            </h3>

            {recentProgressWithNames.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Chưa ghi nhận hoạt động học tập nào của học sinh.</p>
            ) : (
              <div className="space-y-4">
                {recentProgressWithNames.map((prog: any) => (
                  <div key={prog.id} className="flex gap-3 items-start text-xs border-b border-border/50 pb-3 last:border-b-0 last:pb-0 font-semibold">
                    <div className="h-7 w-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shrink-0 mt-0.5">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-foreground">
                        {prog.student_name} <span className="text-[9px] text-muted-foreground">({prog.class_name})</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">Đã học xong: {prog.lessons?.title}</p>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(prog.completed_at).toLocaleDateString('vi-VN')} {new Date(prog.completed_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NHẮC NHỞ GIÁO ÁN HẰNG NGÀY */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 mt-6">
            <h3 className="font-extrabold text-sm flex items-center gap-2 border-b border-border pb-2.5">
              <Award className="h-4.5 w-4.5 text-primary" /> Nhiệm vụ & Nhắc nhở
            </h3>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed font-semibold">
              <div className="flex gap-2 items-start">
                <span className="text-primary font-bold"></span>
                <p>Kiểm tra thời lượng học tuần này của học sinh để kịp thời đôn đốc các em học lực yếu trước buổi sinh hoạt lớp.</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-primary font-bold"></span>
                <p>Cập nhật lại link Youtube các video hướng dẫn tự giải đề tốt nghiệp THPT Quốc gia môn học phụ trách.</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-primary font-bold"></span>
                <p>Biên soạn ngân hàng câu hỏi đề tự luyện cho bài học mới xuất bản.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
