import { supabase } from '../config/supabase';

export const classService = {
  // Read all classes, optionally filtered by teacher
  async getClasses(teacherId?: string) {
    try {
      let query = supabase
        .from('classes')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
        
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lớp học:', error);
      return [];
    }
  },
  
  // Create a new class
  async createClass(data: { name: string; description?: string; teacher_id?: string; sort_order?: number }) {
    try {
      const { data: newClass, error } = await supabase
        .from('classes')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      return newClass;
    } catch (error) {
      console.error('Lỗi khi tạo lớp học mới:', error);
      return null;
    }
  },
  
  // Update class info
  async updateClass(classId: string, data: Partial<{ name: string; description: string; sort_order: number }>) {
    try {
      const { data: updatedClass, error } = await supabase
        .from('classes')
        .update(data)
        .eq('id', classId)
        .select()
        .single();
        
      if (error) throw error;
      return updatedClass;
    } catch (error) {
      console.error('Lỗi khi cập nhật lớp học:', error);
      return null;
    }
  },
  
  // Delete a class
  async deleteClass(classId: string) {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa lớp học:', error);
      return false;
    }
  },
  
  // Get members of a class (join with users table for full_name, email, avatar_url)
  async getClassMembers(classId: string) {
    try {
      const { data, error } = await supabase
        .from('class_members')
        .select(`
          id, 
          student_id, 
          student_name, 
          student_email, 
          student_code, 
          joined_at,
          users:student_id (avatar_url, full_name)
        `)
        .eq('class_id', classId);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách học sinh:', error);
      return [];
    }
  },
  
  // Add a student to a class
  async addClassMember(classId: string, studentData: { student_id?: string; student_name: string; student_email: string; student_code?: string }) {
    try {
      const { data, error } = await supabase
        .from('class_members')
        .insert([{
          class_id: classId,
          ...studentData
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Lỗi khi thêm học sinh:', error);
      return null;
    }
  },
  
  // Remove a student from a class
  async removeClassMember(memberId: string) {
    try {
      const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa học sinh:', error);
      return false;
    }
  },
  
  // Bulk import members (array of student data)
  async bulkImportMembers(classId: string, members: Array<{ student_name: string; student_email: string; student_code?: string }>) {
    try {
      const importData = members.map(member => ({
        class_id: classId,
        ...member
      }));
      
      const { data, error } = await supabase
        .from('class_members')
        .upsert(importData, { onConflict: 'class_id,student_email' })
        .select();
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi nhập danh sách học sinh:', error);
      return null;
    }
  },
  
  // Get class announcements
  async getClassAnnouncements(classId: string) {
    try {
      const { data, error } = await supabase
        .from('class_announcements')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy thông báo:', error);
      return [];
    }
  },
  
  // Create announcement
  async createAnnouncement(classId: string, data: { content: string; author_id: string; author_name?: string }) {
    try {
      const { data: announcement, error } = await supabase
        .from('class_announcements')
        .insert([{
          class_id: classId,
          ...data
        }])
        .select()
        .single();
        
      if (error) throw error;
      return announcement;
    } catch (error) {
      console.error('Lỗi khi tạo thông báo:', error);
      return null;
    }
  },
  
  // Delete announcement
  async deleteAnnouncement(announcementId: string) {
    try {
      const { error } = await supabase
        .from('class_announcements')
        .delete()
        .eq('id', announcementId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa thông báo:', error);
      return false;
    }
  },
  
  // Get exams assigned to a class
  async getClassExams(classId: string) {
    try {
      const { data, error } = await supabase
        .from('class_exams')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy bài thi:', error);
      return [];
    }
  },
  
  // Assign exam to class
  async assignExamToClass(classId: string, examId: string, dueDate?: string) {
    try {
      const { data, error } = await supabase
        .from('class_exams')
        .insert([{
          class_id: classId,
          exam_id: examId,
          due_date: dueDate
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Lỗi khi giao bài thi:', error);
      return null;
    }
  },
  
  // Remove exam from class
  async removeExamFromClass(assignmentId: string) {
    try {
      const { error } = await supabase
        .from('class_exams')
        .delete()
        .eq('id', assignmentId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa bài thi:', error);
      return false;
    }
  }
};
