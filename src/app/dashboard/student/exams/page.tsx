import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { ClipboardList, Award, Clock, ChevronRight, CheckSquare, BarChart2, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

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

  if (!supabaseAdmin) {
    redirect('/dashboard/student');
  }

  // 2. Lấy thông tin lớp học và ban học sinh
  const { data: studentDetail } = await supabaseAdmin
    .from('student_details')
    .select('*, classes(*)')
    .eq('student_id', studentId)
    .single();

  const groupType = studentDetail?.classes?.group_type || 'T';

  // 3. Lấy tất cả môn học thuộc ban đào tạo của học sinh
  let subjectQuery = supabaseAdmin.from('subjects').select('*');
  if (groupType === 'T') {
    subjectQuery = subjectQuery.in('group_type', ['T', 'ENG']);
  } else if (groupType === 'X') {
    subjectQuery = subjectQuery.in('group_type', ['X', 'ENG']);
  }
  const { data: subjects } = await subjectQuery;
  const subjectIds = subjects?.map((s: any) => s.id) || [];

  // 4. Lấy danh sách đề thi của các môn học này
  const { data: exams } = await supabaseAdmin
    .from('exams')
    .select('*, subjects(*), lessons(*)')
    .in('subject_id', subjectIds.length > 0 ? subjectIds : [crypto.randomUUID()]);

  // 5. Lấy danh sách kết quả thi của học sinh này
  const { data: examResults } = await supabaseAdmin
    .from('exam_results')
    .select('*, exams(title)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  // 6. Tính toán thống kê luyện tập
  const totalExamsCount = exams?.length || 0;
  const completedResults = examResults || [];
  const completedExamsCount = new Set(completedResults.map((r: any) => r.exam_id)).size;
  const averageScore = completedResults.length > 0
    ? Math.round((completedResults.reduce((sum: number, r: any) => sum + Number(r.score), 0) / completedResults.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-8 w-full">
      
      {/* HEADER TRANG ĐỀ LUYỆN TẬP */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary border border-secondary/20">
            <ClipboardList className="h-3.5 w-3.5" /> Luyện tập & Đánh giá năng lực
          </div>
          <h1 className="text-3xl font-black text-foreground">Đề Luyện Tập Tự Học</h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Danh sách đề kiểm tra trắc nghiệm, bài tập tự luyện và thi thử phục vụ Khối 12.
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-primary/10 text-primary p-2.5 rounded-lg border border-primary/20">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Tổng số đề thi</span>
            <h4 className="text-lg font-black">{totalExamsCount} Đề luyện tập</h4>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-green-500/10 text-green-500 p-2.5 rounded-lg border border-green-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Đã hoàn thành</span>
            <h4 className="text-lg font-black">{completedExamsCount} / {totalExamsCount} đề</h4>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-secondary/10 text-secondary p-2.5 rounded-lg border border-secondary/20">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Điểm số trung bình</span>
            <h4 className="text-lg font-black">{averageScore} / 10</h4>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid gap-6 md:grid-cols-12 items-start">
        
        {/* CỘT TRÁI (COL-SPAN-8): DANH SÁCH ĐỀ THI PHÂN THEO MÔN HỌC */}
        <div className="md:col-span-8 space-y-6">
          {subjects?.map((sub: any) => {
            const subExams = exams?.filter((e: any) => e.subject_id === sub.id) || [];
            if (subExams.length === 0) return null;

            return (
              <div key={sub.id} className="space-y-4">
                <h2 className="text-xl font-extrabold text-foreground border-b border-border pb-1">
                  Môn {sub.name}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  {subExams.map((exam: any) => {
                    const results = completedResults.filter((r: any) => r.exam_id === exam.id);
                    const bestResult = results.length > 0
                      ? results.reduce((best: any, current: any) => Number(current.score) > Number(best.score) ? current : best, results[0])
                      : null;

                    return (
                      <div 
                        key={exam.id}
                        className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-extrabold text-sm text-foreground line-clamp-1">{exam.title}</h3>
                            {exam.lessons && (
                              <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded shrink-0 font-bold">
                                Bài tập
                              </span>
                            )}
                          </div>
                          {exam.lessons && (
                            <p className="text-[10px] text-muted-foreground font-semibold">
                              Liên kết: {exam.lessons.title}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> Thời gian làm bài: {exam.duration_minutes} phút
                          </p>
                        </div>

                        {bestResult ? (
                          <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs">
                            <span className="font-bold text-muted-foreground">
                              Điểm cao nhất: 
                              <strong className={`ml-1 text-sm ${bestResult.score >= 5.0 ? 'text-green-500' : 'text-orange-500'}`}>
                                {bestResult.score}/10
                              </strong>
                            </span>
                            <span className="text-[9px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded font-black">
                              Đúng {bestResult.correct_answers}/{bestResult.total_questions} câu
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground italic border-t border-border/50 pt-3">
                            Chưa có kết quả làm bài.
                          </div>
                        )}

                        <Link 
                          href={`/dashboard/student/exams/${exam.id}`}
                          className="w-full text-center flex items-center justify-center gap-1.5 rounded-lg bg-secondary/10 border border-secondary/20 py-2.5 text-xs font-bold text-secondary hover:bg-secondary/20 transition-colors"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          {bestResult ? 'Thi lại' : 'Làm bài ngay'}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {totalExamsCount === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-muted-foreground">Chưa có đề thi/bài tập trắc nghiệm nào được công bố.</p>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (COL-SPAN-4): QUY CHẾ THI & LỊCH SỬ THI */}
        <div className="md:col-span-4 space-y-4">
          
          {/* LỊCH SỬ THI GẦN ĐÂY */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2 border-b border-border pb-3 text-foreground/80">
              <Clock className="h-4.5 w-4.5 text-primary" />
              Lịch sử làm bài gần đây
            </h3>

            {completedResults.length === 0 ? (
              <p className="text-xs text-muted-foreground italic leading-relaxed">Bạn chưa thực hiện đề luyện tập nào.</p>
            ) : (
              <div className="space-y-3.5">
                {completedResults.slice(0, 4).map((res: any) => (
                  <div key={res.id} className="flex justify-between items-start text-xs border-b border-border/50 pb-3 last:border-b-0 last:pb-0 font-semibold">
                    <div className="min-w-0 space-y-1">
                      <p className="font-bold text-foreground truncate max-w-[150px]">{res.exams?.title || 'Đề thi'}</p>
                      <span className="block text-[9px] text-muted-foreground">
                        {new Date(res.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <span className={`font-black text-xs ${res.score >= 5.0 ? 'text-green-500' : 'text-orange-500'}`}>
                      {res.score}/10
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUY CHẾ TỰ LUYỆN */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider">Quy chế tự ôn luyện</h3>
            <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed font-semibold">
              <p> Mỗi đề thi tự ôn luyện có thể thực hiện nhiều lần để cải thiện điểm số tốt nhất.</p>
              <p> Điểm thi đạt từ 5.0 trở lên được ghi nhận là Đạt năng lực tối thiểu cho bài học tương ứng.</p>
              <p> Hệ thống tự động chấm điểm và lưu kết quả cao nhất của học sinh trên học bạ trực tuyến.</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
