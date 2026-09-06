import { supabase } from '../config/supabase';

export const liveSessionService = {
  // Create a new live session
  async createSession(data: { exam_id: string; teacher_id: string; access_code: string; class_id?: string; status?: string; settings?: any }) {
    try {
      const { data: newSession, error } = await supabase
        .from('live_sessions')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      return newSession;
    } catch (error) {
      console.error('Lỗi khi tạo phiên thi trực tiếp:', error);
      return null;
    }
  },
  
  // Get all sessions (optionally by teacher)
  async getSessions(teacherId?: string) {
    try {
      let query = supabase
        .from('live_sessions')
        .select(`
          *,
          exams (id, title)
        `)
        .order('created_at', { ascending: false });
        
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách phiên thi:', error);
      return [];
    }
  },
  
  // Get single session by ID
  async getSessionById(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          exams (id, title)
        `)
        .eq('id', sessionId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin phiên thi:', error);
      return null;
    }
  },
  
  // Update session (status, settings, etc.)
  async updateSession(sessionId: string, data: Partial<{ status: string; settings: any; ended_at: string }>) {
    try {
      const { data: updatedSession, error } = await supabase
        .from('live_sessions')
        .update(data)
        .eq('id', sessionId)
        .select()
        .single();
        
      if (error) throw error;
      return updatedSession;
    } catch (error) {
      console.error('Lỗi khi cập nhật phiên thi:', error);
      return null;
    }
  },
  
  // Delete a session
  async deleteSession(sessionId: string) {
    try {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', sessionId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa phiên thi:', error);
      return false;
    }
  },
  
  // Get room members for a session
  async getRoomMembers(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('room_members')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách thành viên phòng thi:', error);
      return [];
    }
  },
  
  // Add member to room
  async addRoomMember(data: { session_id: string; student_id: string; student_name?: string; status?: string }) {
    try {
      const { data: newMember, error } = await supabase
        .from('room_members')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      return newMember;
    } catch (error) {
      console.error('Lỗi khi thêm thành viên vào phòng:', error);
      return null;
    }
  },
  
  // Update room member status
  async updateRoomMember(memberId: string, data: Partial<{ status: string; score: number }>) {
    try {
      const { data: updatedMember, error } = await supabase
        .from('room_members')
        .update(data)
        .eq('id', memberId)
        .select()
        .single();
        
      if (error) throw error;
      return updatedMember;
    } catch (error) {
      console.error('Lỗi khi cập nhật thành viên:', error);
      return null;
    }
  },
  
  // Remove member from room
  async removeRoomMember(memberId: string) {
    try {
      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('id', memberId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa thành viên khỏi phòng:', error);
      return false;
    }
  },
  
  // Kick all members from a session
  async kickAllMembers(sessionId: string) {
    try {
      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('session_id', sessionId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi mời tất cả thành viên ra khỏi phòng:', error);
      return false;
    }
  },
  
  // Get exam logs for a session
  async getExamLogs(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('exam_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy nhật ký bài thi:', error);
      return [];
    }
  },
  
  // Create an exam log entry
  async createExamLog(data: { session_id: string; student_id: string; action: string; description?: string }) {
    try {
      const { data: newLog, error } = await supabase
        .from('exam_logs')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      return newLog;
    } catch (error) {
      console.error('Lỗi khi tạo nhật ký:', error);
      return null;
    }
  }
};
