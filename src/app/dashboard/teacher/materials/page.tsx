import React from 'react';
import { getSupabaseServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TeacherDashboardClient from '../TeacherDashboardClient';

import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export default async function TeacherMaterialsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  if (!token) {
    redirect('/');
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'demo-jwt-secret-key-12345';
  let teacherId = '';
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    teacherId = payload.sub;
  } catch (err) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();

  // 1. Lấy danh sách lớp và môn học được phân công cho giáo viên này
  const { data: assignments } = await supabase
    .from('teacher_classes')
    .select('*, classes(*), subjects(*)')
    .eq('teacher_id', teacherId);

  // 2. Lấy danh sách học sinh thuộc các lớp giáo viên phụ trách
  const classIds = assignments?.map((a: any) => a.class_id) || [];
  const { data: students } = await supabase
    .from('student_details')
    .select('*, classes(*)')
    .in('class_id', classIds.length > 0 ? classIds : [crypto.randomUUID()]);

  // 3. Lấy tất cả chương học và bài giảng để vẽ cây quản lý học liệu và tính tiến độ
  const subjectIds = assignments?.map((a: any) => a.subject_id) || [];
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*, lessons(*, lesson_materials(*))')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()])
    .order('order_index', { ascending: true });

  // 4. Lấy toàn bộ tiến độ của học sinh thuộc các lớp phụ trách
  const studentIds = students?.map((s: any) => s.student_id) || [];
  const { data: progress } = await supabase
    .from('study_progress')
    .select('*, lessons(*)')
    .in('student_id', studentIds.length > 0 ? studentIds : [crypto.randomUUID()]);

  // 5. Lấy toàn bộ log học tập của các học sinh này để tính thời lượng tự học
  const { data: logs } = await supabase
    .from('study_logs')
    .select('*, lessons(*)')
    .in('student_id', studentIds.length > 0 ? studentIds : [crypto.randomUUID()]);

  // 5.5. Lấy toàn bộ kết quả bài tập/thi thử của các học sinh thuộc lớp phụ trách
  const { data: examResults } = await supabase
    .from('exam_results')
    .select('*')
    .in('student_id', studentIds.length > 0 ? studentIds : [crypto.randomUUID()]);

  // 5.6. Lấy toàn bộ danh sách đề thi của các môn học giáo viên phụ trách
  const { data: exams } = await supabase
    .from('exams')
    .select('*')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]);

  // 5.7. Lấy danh sách câu hỏi của các đề thi này
  const examIds = exams?.map((e: any) => e.id) || [];
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('exam_id', examIds.length > 0 ? examIds : [crypto.randomUUID()]);



  return (
    <div className="space-y-8 w-full">
      {/* HEADER BIÊN SOẠN HỌC LIỆU */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            Biên soạn nội dung tự học
          </div>
          <h1 className="text-3xl font-black text-foreground">Biên Soạn Bài Giảng & Đề Thi</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Tạo chương, bài học học liệu, biên soạn bộ câu hỏi trắc nghiệm tự luyện cho học sinh khối 12.
          </p>
        </div>
      </div>

      <TeacherDashboardClient
        assignments={assignments || []}
        students={students || []}
        chapters={chapters || []}
        progress={progress || []}
        logs={logs || []}
        examResults={examResults || []}
        exams={exams || []}
        questions={questions || []}
        token={token}
        teacherId={teacherId}
        viewMode="materials"
      />
    </div>
  );
}
