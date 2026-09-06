import { supabase } from '../config/supabase';

export const courseService = {
  /**
   * Lấy toàn bộ lộ trình học tập, kèm theo tiến độ của học sinh
   */
  async getCurriculum(userId?: string) {
    try {
      // 1. Kéo toàn bộ Cấu trúc (Chương -> Bài học -> Bài tập)
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select(`
          id,
          title,
          sort_order,
          lessons (
            id,
            title,
            theory_content,
            sort_order,
            exercises (
              id,
              content,
              options,
              correct_answer,
              explanation,
              sort_order
            )
          )
        `)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error("Lỗi lấy curriculum:", error.message);
        return [];
      }

      // 2. Format và sắp xếp thứ tự
      const formattedChapters = chapters?.map(chapter => ({
        ...chapter,
        lessons: chapter.lessons
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((lesson: any) => ({
            ...lesson,
            exercises: lesson.exercises.sort((a: any, b: any) => a.sort_order - b.sort_order),
            isCompleted: false // Trạng thái mặc định
          }))
      }));

      // 3. Nếu có ID Học sinh, query tiến độ để đánh dấu tick xanh (Đã học)
      if (userId && formattedChapters) {
        const { data: progress } = await supabase
          .from('student_lesson_progress')
          .select('lesson_id, is_completed')
          .eq('user_id', userId);

        if (progress && progress.length > 0) {
          const progressMap = progress.reduce((acc, curr) => {
            acc[curr.lesson_id] = curr.is_completed;
            return acc;
          }, {} as Record<number, boolean>);

          formattedChapters.forEach(chap => {
            chap.lessons.forEach(les => {
              les.isCompleted = progressMap[les.id] || false;
            });
          });
        }
      }

      return formattedChapters || [];
    } catch (error) {
      console.error("System Error:", error);
      return [];
    }
  },

  /**
   * Lưu trạng thái hoàn thành bài học
   */
  async markLessonCompleted(userId: string, lessonId: number) {
    if (!userId) return;
    const { error } = await supabase
      .from('student_lesson_progress')
      .upsert({ user_id: userId, lesson_id: lessonId, is_completed: true });
    
    if (error) console.error("Lỗi cập nhật tiến độ bài học:", error.message);
  },

  // ===== CRUD CHƯƠNG HỌC (CHAPTERS) =====
  async createChapter(data: { title: string; sort_order?: number }) {
    try {
      const { data: result, error } = await supabase.from('chapters').insert(data).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi createChapter:", error);
      return null;
    }
  },
  async updateChapter(id: number, data: Partial<{ title: string; sort_order: number }>) {
    try {
      const { data: result, error } = await supabase.from('chapters').update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi updateChapter:", error);
      return null;
    }
  },
  async deleteChapter(id: number) {
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Lỗi deleteChapter:", error);
      return false;
    }
  },

  // ===== CRUD BÀI HỌC (LESSONS) =====
  async createLesson(data: { title: string; chapter_id: number; theory_content?: string; sort_order?: number }) {
    try {
      const { data: result, error } = await supabase.from('lessons').insert(data).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi createLesson:", error);
      return null;
    }
  },
  async updateLesson(id: number, data: Partial<{ title: string; theory_content: string; sort_order: number }>) {
    try {
      const { data: result, error } = await supabase.from('lessons').update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi updateLesson:", error);
      return null;
    }
  },
  async deleteLesson(id: number) {
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Lỗi deleteLesson:", error);
      return false;
    }
  },

  // ===== CRUD BÀI TẬP (EXERCISES) =====
  async createExercise(data: { lesson_id?: number; content: string; options?: any; correct_answer: string; explanation?: string; sort_order?: number; image_url?: string }) {
    try {
      const { data: result, error } = await supabase.from('exercises').insert(data).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi createExercise:", error);
      return null;
    }
  },
  async updateExercise(id: number, data: Partial<{ content: string; options: any; correct_answer: string; explanation: string; sort_order: number; image_url: string }>) {
    try {
      const { data: result, error } = await supabase.from('exercises').update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi updateExercise:", error);
      return null;
    }
  },
  async deleteExercise(id: number) {
    try {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Lỗi deleteExercise:", error);
      return false;
    }
  }
};