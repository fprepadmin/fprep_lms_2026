import { supabase } from '../config/supabase';

export const resourceService = {
  // Get video lectures (with optional filtering)
  async getVideoLectures(filters?: { chapter?: string; teacher?: string }) {
    try {
      let query = supabase
        .from('video_lectures')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (filters?.chapter) {
        query = query.eq('chapter', filters.chapter);
      }
      if (filters?.teacher) {
        query = query.eq('teacher', filters.teacher);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách video bài giảng:', error);
      return [];
    }
  },
  
  // Create a video lecture
  async createVideoLecture(data: { title: string; chapter?: string; duration?: string; teacher?: string; thumbnail?: string; video_url: string; description?: string }) {
    try {
      const { data: newVideo, error } = await supabase
        .from('video_lectures')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      return newVideo;
    } catch (error) {
      console.error('Lỗi khi tạo video bài giảng:', error);
      return null;
    }
  },
  
  // Update a video lecture
  async updateVideoLecture(id: string, data: Partial<{ title: string; chapter: string; duration: string; teacher: string; thumbnail: string; video_url: string; description: string }>) {
    try {
      const { data: updatedVideo, error } = await supabase
        .from('video_lectures')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return updatedVideo;
    } catch (error) {
      console.error('Lỗi khi cập nhật video bài giảng:', error);
      return null;
    }
  },
  
  // Delete a video lecture
  async deleteVideoLecture(id: string) {
    try {
      const { error } = await supabase
        .from('video_lectures')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa video bài giảng:', error);
      return false;
    }
  },
  
  // Get study documents
  async getStudyDocuments(filters?: { category?: string; chapter?: string }) {
    try {
      let query = supabase
        .from('study_documents')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.chapter) {
        query = query.eq('chapter', filters.chapter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Lỗi khi lấy danh sách tài liệu:', error);
      return [];
    }
  },
  
  // Create a study document
  async createStudyDocument(data: { title: string; chapter?: string; pages?: number; size?: string; category?: string; download_url: string }) {
    try {
      const { data: newDoc, error } = await supabase
        .from('study_documents')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      return newDoc;
    } catch (error) {
      console.error('Lỗi khi tạo tài liệu:', error);
      return null;
    }
  },
  
  // Update a study document
  async updateStudyDocument(id: string, data: Partial<{ title: string; chapter: string; pages: number; size: string; category: string; download_url: string }>) {
    try {
      const { data: updatedDoc, error } = await supabase
        .from('study_documents')
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return updatedDoc;
    } catch (error) {
      console.error('Lỗi khi cập nhật tài liệu:', error);
      return null;
    }
  },
  
  // Delete a study document
  async deleteStudyDocument(id: string) {
    try {
      const { error } = await supabase
        .from('study_documents')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Lỗi khi xóa tài liệu:', error);
      return false;
    }
  }
};
