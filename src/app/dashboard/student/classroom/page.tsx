import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import jwt from 'jsonwebtoken';
import { Users, GraduationCap, Calendar, Mail, BookOpen } from 'lucide-react';

export default async function ClassroomPage() {
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

  // 2. Lấy thông tin lớp học của học sinh
  const { data: studentDetail } = await supabaseAdmin
    .from('student_details')
    .select('*, classes(*)')
    .eq('student_id', studentId)
    .single();

  if (!studentDetail || !studentDetail.class_id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center space-y-4">
        <Users className="h-12 w-12 text-muted-foreground animate-bounce" />
        <h2 className="text-xl font-extrabold text-foreground">Bạn chưa được phân vào lớp nào</h2>
        <p className="text-xs text-muted-foreground">Vui lòng liên hệ Giáo viên chủ nhiệm hoặc Quản trị viên để được xếp lớp.</p>
      </div>
    );
  }

  const classInfo = studentDetail.classes;

  // 3. Lấy danh sách bạn học cùng lớp
  const { data: classmates } = await supabaseAdmin
    .from('student_details')
    .select('*')
    .eq('class_id', studentDetail.class_id)
    .order('full_name');

  // 4. Lấy danh sách giáo viên phụ trách lớp học này
  const { data: teacherAssignments } = await supabaseAdmin
    .from('teacher_classes')
    .select('*, subjects(*)')
    .eq('class_id', studentDetail.class_id);

  // Lấy email giáo viên tương ứng
  const teacherIds = teacherAssignments?.map((t: any) => t.teacher_id) || [];
  const { data: teacherProfiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('id', teacherIds.length > 0 ? teacherIds : [crypto.randomUUID()]);

  return (
    <div className="space-y-8 w-full">
      
      {/* HEADER LỚP HỌC */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
            <GraduationCap className="h-3.5 w-3.5" /> Lớp học chính khóa
          </div>
          <h1 className="text-3xl font-black text-foreground">Lớp học {classInfo.name}</h1>
          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-4">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Niên khóa: {classInfo.academic_year || '2026-2027'}</span>
            <span>&bull;</span>
            <span>Ban đào tạo: {classInfo.group_type === 'T' ? 'Khoa học Tự nhiên' : classInfo.group_type === 'X' ? 'Khoa học Xã hội' : 'Khai phóng'}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        
        {/* BẢNG BẠN CÙNG LỚP */}
        <div className="md:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/10">
            <h2 className="font-extrabold text-sm flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-primary" />
              Thành viên lớp học ({classmates?.length || 0} học sinh)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">STT</th>
                  <th className="p-4">MSHS</th>
                  <th className="p-4">Họ và tên</th>
                </tr>
              </thead>
              <tbody>
                {classmates?.map((mate: any, index: number) => (
                  <tr 
                    key={mate.student_id} 
                    className={`border-b border-border hover:bg-muted/5 transition-colors ${mate.student_id === studentId ? 'bg-primary/5 font-bold' : ''}`}
                  >
                    <td className="p-4 font-semibold text-muted-foreground">{index + 1}</td>
                    <td className="p-4 font-bold text-foreground">{mate.mshs}</td>
                    <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                      {mate.full_name}
                      {mate.student_id === studentId && (
                        <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">Bạn</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GIÁO VIÊN BỘ MÔN PHỤ TRÁCH */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2 border-b border-border pb-3">
              <BookOpen className="h-4.5 w-4.5 text-secondary" />
              Giáo viên phụ trách
            </h3>
            
            {teacherAssignments?.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Chưa phân công giáo viên phụ trách lớp này.</p>
            ) : (
              <div className="space-y-4">
                {teacherAssignments?.map((ass: any) => {
                  const teacherProf = teacherProfiles?.find((tp: any) => tp.id === ass.teacher_id);
                  return (
                    <div key={ass.id} className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">Giáo viên môn {ass.subjects?.name}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <Mail className="h-3 w-3" /> {teacherProf?.email || 'Chưa cập nhật email'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
