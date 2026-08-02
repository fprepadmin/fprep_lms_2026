import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Giải mã JWT để kiểm tra quyền Admin
async function isAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('supabase-jwt')?.value;
    if (!token) return false;

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) return false;

    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded?.role === 'admin' || decoded?.role === 'teacher'; // Cho phép cả giáo viên seed dữ liệu kiểm thử
  } catch (error) {
    return false;
  }
}

export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Chưa cấu hình Supabase Admin SDK' }, { status: 500 });
    }

    // 1. Tạo danh sách 11 lớp học Khối 12 niên khóa 2026-2027
    const classesToSeed = [
      { name: '12T1', group_type: 'T', academic_year: '2026-2027' },
      { name: '12T2', group_type: 'T', academic_year: '2026-2027' },
      { name: '12T3', group_type: 'T', academic_year: '2026-2027' },
      { name: '12T4', group_type: 'T', academic_year: '2026-2027' },
      { name: '12T5', group_type: 'T', academic_year: '2026-2027' },
      { name: '12T6', group_type: 'T', academic_year: '2026-2027' },
      { name: '12X1', group_type: 'X', academic_year: '2026-2027' },
      { name: '12X2', group_type: 'X', academic_year: '2026-2027' },
      { name: '12X3', group_type: 'X', academic_year: '2026-2027' },
      { name: '12X4', group_type: 'X', academic_year: '2026-2027' },
      { name: '12K', group_type: 'K', academic_year: '2026-2027' }
    ];

    for (const cls of classesToSeed) {
      await supabaseAdmin.from('classes').upsert(cls, { onConflict: 'name' });
    }

    // 2. Tạo danh sách các môn học
    const subjectsToSeed = [
      // Nhóm Tự nhiên
      { name: 'Toán học', group_type: 'T' },
      { name: 'Vật lý', group_type: 'T' },
      { name: 'Hóa học', group_type: 'T' },
      { name: 'Sinh học', group_type: 'T' },
      { name: 'Tin học', group_type: 'T' },
      // Nhóm Xã hội
      { name: 'Ngữ văn', group_type: 'X' },
      { name: 'Lịch sử', group_type: 'X' },
      { name: 'Địa lý', group_type: 'X' },
      { name: 'Giáo dục Kinh tế & Pháp luật', group_type: 'X' },
      // Nhóm tiếng Anh
      { name: 'Tiếng Anh', group_type: 'ENG' }
    ];

    for (const sub of subjectsToSeed) {
      await supabaseAdmin.from('subjects').upsert(sub, { onConflict: 'name' });
    }

    // Lấy lại danh sách môn học để liên kết Chapters
    const { data: subjects } = await supabaseAdmin.from('subjects').select('*');
    if (!subjects) throw new Error('Không lấy được danh sách môn học');

    // 3. Khởi tạo một số chương học mẫu cho môn Toán và Vật lý
    const math = subjects.find((s: any) => s.name === 'Toán học');
    const physics = subjects.find((s: any) => s.name === 'Vật lý');
    const literature = subjects.find((s: any) => s.name === 'Ngữ văn');
    const english = subjects.find((s: any) => s.name === 'Tiếng Anh');

    if (math) {
      const { data: chap } = await supabaseAdmin.from('chapters').upsert({
        subject_id: math.id,
        title: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
        order_index: 1
      }).select().single();

      if (chap) {
        const lessons = [
          { chapter_id: chap.id, title: 'Bài 1: Tính đơn điệu của hàm số', order_index: 1 },
          { chapter_id: chap.id, title: 'Bài 2: Cực trị của hàm số', order_index: 2 },
          { chapter_id: chap.id, title: 'Bài 3: Giá trị lớn nhất, nhỏ nhất của hàm số', order_index: 3 }
        ];
        
        for (const les of lessons) {
          const { data: insertedLesson } = await supabaseAdmin.from('lessons').upsert(les).select().single();
          if (insertedLesson && les.order_index === 1) {
            // Thêm tài liệu mẫu
            await supabaseAdmin.from('lesson_materials').insert([
              {
                lesson_id: insertedLesson.id,
                title: 'Video Bài giảng: Khái niệm tính đơn điệu',
                material_type: 'video',
                source_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                order_index: 1
              },
              {
                lesson_id: insertedLesson.id,
                title: 'Tài liệu PDF: Tóm tắt công thức Khảo sát Hàm số',
                material_type: 'pdf',
                source_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                order_index: 2
              }
            ]);
          }
        }
      }
    }

    if (physics) {
      const { data: chap } = await supabaseAdmin.from('chapters').upsert({
        subject_id: physics.id,
        title: 'Chương 1: Vật lý nhiệt',
        order_index: 1
      }).select().single();

      if (chap) {
        const lessons = [
          { chapter_id: chap.id, title: 'Bài 1: Thuyết động học phân tử chất khí', order_index: 1 },
          { chapter_id: chap.id, title: 'Bài 2: Định luật chất khí', order_index: 2 }
        ];
        for (const les of lessons) {
          const { data: insertedLesson } = await supabaseAdmin.from('lessons').upsert(les).select().single();
          if (insertedLesson && les.order_index === 1) {
            await supabaseAdmin.from('lesson_materials').insert([
              {
                lesson_id: insertedLesson.id,
                title: 'Video Bài giảng: Thuyết động học phân tử',
                material_type: 'video',
                source_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                order_index: 1
              }
            ]);
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Khởi tạo dữ liệu hệ thống (Lớp, Môn học, Bài mẫu) thành công!' });
  } catch (error: any) {
    console.error('Lỗi khi seed dữ liệu:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
