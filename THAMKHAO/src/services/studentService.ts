import { supabase } from '../config/supabase';

export const studentService = {
  async getProfileByEmail(email: string) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  },

  async getLearningProgress(userId: string) {
    try {
      const { data, error } = await supabase.from('student_progress').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch (error) {
      return [];
    }
  },

  async getAiSuggestion(xp: number) {
    if (xp > 5000) return "Tuyệt vời! Bạn đang trong Top hệ thống. Hãy thử sức với các đề thi Chuyên đề Vận dụng cao (VDC) nhé!";
    if (xp > 2000) return "Phong độ rất ổn định. FMath AI nhận thấy bạn đang yếu phần Tích phân hàm ẩn. Ôn tập ngay nhé!";
    if (xp > 0) return "Bạn đang làm rất tốt! Hãy tiếp tục duy trì chuỗi học tập để leo lên các thứ hạng cao hơn trên Bảng Vàng.";
    return "Hãy bắt đầu làm bài tập Chương 1 để tích lũy XP và mở khóa các huy hiệu mới bạn nhé.";
  },

  async getLeaderboard(limit: number = 50) {
    try {
      const { data, error } = await supabase.from('users').select('id, full_name, email, school, class_name, xp, level, avatar_url').eq('role', 'student').order('xp', { ascending: false }).limit(limit);
      if (error) return [];
      return data || [];
    } catch (error) {
      return [];
    }
  },

  async uploadAvatar(userId: string, file: File) {
    try {
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; 
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET; 
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('public_id', `avatar_${userId}_${Date.now()}`);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Lỗi từ server Cloudinary');
      return data.secure_url; 
    } catch (error: any) {
      console.error('Lỗi Upload Avatar Cloudinary:', error.message);
      return null;
    }
  },

  // ==================================================
  // ĐỒNG BỘ TRẠNG THÁI LỚP HỌC (ÉP TÊN VÀ MÃ TỪ EXCEL)
  // ==================================================
  async syncClassMembership(email: string, userId: string) {
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Tìm xem học sinh có nằm trong danh sách Excel (ghost) hoặc chờ duyệt (pending) không
      const { data: members } = await supabase
        .from('class_members')
        .select('temp_code, temp_name')
        .ilike('student_email', cleanEmail)
        .in('status', ['ghost', 'pending']);

      if (members && members.length > 0) {
        // Ưu tiên lấy dòng đầu tiên tìm được
        const excelCode = members[0].temp_code;
        const excelName = members[0].temp_name;
        
        let updateData: any = {};
        if (excelCode && excelCode.trim() !== '') updateData.student_code = excelCode;
        if (excelName && excelName.trim() !== '') updateData.full_name = excelName; // Ép tên Google thành tên trong Excel

        // Update thẳng vào Profile người dùng
        if (Object.keys(updateData).length > 0) {
          await supabase.from('users').update(updateData).eq('id', userId);
        }
      }

      // 2. Chuyển tất cả trạng thái ghost/pending thành joined (Chính thức vào lớp)
      const { data, error } = await supabase
        .from('class_members')
        .update({ 
          status: 'joined',
          user_id: userId 
        })
        .ilike('student_email', cleanEmail)
        .in('status', ['ghost', 'pending'])
        .select();

      if (error) console.error("Lỗi đồng bộ trạng thái lớp học:", error.message);
      
    } catch (error) {
      console.error("System Error (syncClassMembership):", error);
    }
  }
};