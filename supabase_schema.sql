-- SCHEMA MIGRATION: FPT School Cần Thơ LMS (Khối 12)
-- Bản quyền phát triển bởi: Trần Ngọc Minh Thông
-- Vui lòng chạy script này trong Supabase SQL Editor.

-- Xóa các bảng cũ nếu đã tồn tại để làm sạch dữ liệu mẫu
DROP TABLE IF EXISTS public.support_requests CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.study_logs CASCADE;
DROP TABLE IF EXISTS public.study_progress CASCADE;
DROP TABLE IF EXISTS public.lesson_materials CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.teacher_classes CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.student_details CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;

-- Kích hoạt extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- I. KHỞI TẠO CẤU TRÚC BẢNG (DDL) - SỬ DỤNG VARCHAR CHO ID ĐỂ TƯƠNG THÍCH FIREBASE
-- =========================================================================

-- 1. Bảng profiles (Thông tin định danh người dùng chung)
CREATE TABLE public.profiles (
    id VARCHAR(255) PRIMARY KEY, -- Khớp với uid từ Firebase Auth (dạng chuỗi)
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin', 'head_of_department')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng classes (Thông tin lớp học Khối 12)
CREATE TABLE public.classes (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    name VARCHAR(20) UNIQUE NOT NULL, -- Ví dụ: 12T1, 12T2, 12X1, 12K...
    group_type VARCHAR(5) NOT NULL CHECK (group_type IN ('T', 'X', 'K')), -- T: Tự nhiên, X: Xã hội, K: Khai phóng
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng student_details (Chi tiết học sinh - Tách biệt thông tin nhạy cảm khỏi profiles để cấm Admin xem)
CREATE TABLE public.student_details (
    student_id VARCHAR(255) PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    mshs VARCHAR(50) UNIQUE NOT NULL, -- Mã số học sinh
    full_name VARCHAR(255) NOT NULL,
    class_id VARCHAR(255) REFERENCES public.classes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng subjects (Thông tin các môn học)
CREATE TABLE public.subjects (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    name VARCHAR(100) UNIQUE NOT NULL, -- Toán, Vật lý, Ngữ văn...
    group_type VARCHAR(10) NOT NULL CHECK (group_type IN ('T', 'X', 'ENG', 'K')), -- Phân loại nhóm môn học
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Bảng teacher_classes (Phân công Giáo viên dạy lớp nào, môn gì)
CREATE TABLE public.teacher_classes (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    teacher_id VARCHAR(255) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id VARCHAR(255) REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(255) NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, class_id, subject_id)
);

-- 6. Bảng chapters (Chương học của môn học)
CREATE TABLE public.chapters (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    subject_id VARCHAR(255) NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Bảng lessons (Bài học chi tiết)
CREATE TABLE public.lessons (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    chapter_id VARCHAR(255) NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Bảng lesson_materials (Tài liệu học tập: Video, Slide, PDF, Tài liệu khác)
CREATE TABLE public.lesson_materials (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    lesson_id VARCHAR(255) NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    material_type VARCHAR(20) NOT NULL CHECK (material_type IN ('video', 'slide', 'pdf', 'attachment')),
    source_url TEXT NOT NULL, -- Đường dẫn nhúng Youtube, Drive preview
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Bảng study_progress (Tiến độ học tập bài học của học sinh)
CREATE TABLE public.study_progress (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    student_id VARCHAR(255) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id VARCHAR(255) NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- 10. Bảng study_logs (Nhật ký học tập chi tiết ghi nhận thời lượng học tập)
CREATE TABLE public.study_logs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    student_id VARCHAR(255) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id VARCHAR(255) NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- 'watch_video', 'read_pdf', 'complete_lesson'
    duration_seconds INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Bảng audit_logs (Nhật ký hoạt động của hệ thống phục vụ Admin)
CREATE TABLE public.audit_logs (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    actor_id VARCHAR(255) REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'UPDATE_ROLE', 'CREATE_CLASS', v.v.
    target_table VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Bảng support_requests (Yêu cầu hỗ trợ chuyên môn học tập)
CREATE TABLE public.support_requests (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    student_id VARCHAR(255) NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    subject_id VARCHAR(255) NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    reply TEXT,
    teacher_id VARCHAR(255) REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Bảng announcements (Thông báo hệ thống)
CREATE TABLE public.announcements (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    date VARCHAR(50) NOT NULL,
    sender VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) DEFAULT 'all' CHECK (target_type IN ('all', 'teachers', 'individual')),
    target_user_id VARCHAR(255) REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- II. TẠO CÁC INDEX TỐI ƯU TRUY VẤN
-- =========================================================================
CREATE INDEX idx_student_details_class ON public.student_details(class_id);
CREATE INDEX idx_teacher_classes_teacher ON public.teacher_classes(teacher_id);
CREATE INDEX idx_chapters_subject ON public.chapters(subject_id);
CREATE INDEX idx_lessons_chapter ON public.lessons(chapter_id);
CREATE INDEX idx_materials_lesson ON public.lesson_materials(lesson_id);
CREATE INDEX idx_progress_student ON public.study_progress(student_id);
CREATE INDEX idx_logs_student ON public.study_logs(student_id);

-- =========================================================================
-- III. THIẾT LẬP CHÍNH SÁCH BẢO MẬT (RLS) - BẢN MỞ KHÓA CHO NHÀ PHÁT TRIỂN
-- =========================================================================

-- Kích hoạt RLS trên tất cả các bảng
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 1. BẢN CẤU HÌNH MỞ KHÓA CHO PHÉP KEY PUBLIC (ANON KEY) ĐỌC/GHI TỰ DO
-- (Khắc phục triệt để lỗi RLS 42501 khi chạy local mà không cần SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY allow_all_profiles ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_student_details ON public.student_details FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_classes ON public.classes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_subjects ON public.subjects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_teacher_classes ON public.teacher_classes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_chapters ON public.chapters FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_lessons ON public.lessons FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_materials ON public.lesson_materials FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_progress ON public.study_progress FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_logs ON public.study_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_audit_logs ON public.audit_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_support_requests ON public.support_requests FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY allow_all_announcements ON public.announcements FOR ALL TO public USING (true) WITH CHECK (true);

-- Hàm helper lấy vai trò trực tiếp từ Custom JWT Claims (vẫn giữ để tham chiếu)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() ->> 'role')::VARCHAR,
    'student'::VARCHAR
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
