import { supabase } from '../config/supabase';
import { calculateStreakUpdate } from '../utils/streakUtils';

export const examService = {
  async getActiveExams(userId?: string) {
    try {
      const { data: exams, error } = await supabase
        .from('exams')
        .select('*, exam_attempts(id), exam_questions(count)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
        
      if (error) throw error;

      let userAttempts: any[] = [];
      if (userId) {
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('exam_id, score')
          .eq('user_id', userId);
        if (attempts) userAttempts = attempts;
      }

      return exams?.map(exam => {
        const myAttempts = userAttempts.filter(a => a.exam_id === exam.id);
        return { 
          ...exam, 
          participants: exam.exam_attempts?.length || 0, 
          questionsCount: exam.exam_questions?.[0]?.count || exam.exam_questions?.length || 0,
          myAttemptCount: myAttempts.length,
          myHighestScore: myAttempts.length > 0 ? Math.max(...myAttempts.map(a => a.score)) : null,
          myAttempts: myAttempts
        };
      }) || [];
    } catch (error) { 
      console.error("Lỗi lấy danh sách đề thi:", error);
      return []; 
    }
  },

  async getExamById(id: string) {
    try {
      const { data, error } = await supabase.from('exams').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    } catch (error) { return null; }
  },

  // ==================================================
  // BỘ TẢI ĐỀ THI ĐA TẦNG (MULTI-FALLBACK EXAM LOADER)
  // ==================================================
  async getExamFullQuestions(examId: string) {
    try {
      // Tầng 1: Lấy từ exam_questions (kèm exercises)
      const { data: eqData, error: eqErr } = await supabase
        .from('exam_questions')
        .select('sort_order, exercises(*)')
        .eq('exam_id', examId)
        .order('sort_order', { ascending: true });

      let questions: any[] = [];
      if (!eqErr && eqData && eqData.length > 0) {
        questions = eqData.map((item: any) => item.exercises).filter(Boolean);
      }

      // Tầng 2: Nếu Tầng 1 rỗng, thử lấy từ bảng exercises trực tiếp theo exam_id hoặc lesson_id
      if (questions.length === 0) {
        const { data: exData } = await supabase
          .from('exercises')
          .select('*')
          .eq('exam_id', examId)
          .order('created_at', { ascending: true });

        if (exData && exData.length > 0) {
          questions = exData;
        }
      }

      // Tầng 3: Nếu Tầng 2 rỗng, thử parse dữ liệu json_data của bảng exams
      if (questions.length === 0) {
        const { data: examData } = await supabase
          .from('exams')
          .select('json_data')
          .eq('id', examId)
          .single();

        if (examData?.json_data) {
          try {
            const parsed = typeof examData.json_data === 'string' ? JSON.parse(examData.json_data) : examData.json_data;
            if (Array.isArray(parsed)) questions = parsed;
          } catch(e) {}
        }
      }

      // Phân loại câu hỏi thành 3 phần chuẩn Bộ GD&ĐT
      const LETTERS = ['A', 'B', 'C', 'D'];
      const p1: any[] = [], p2: any[] = [], p3: any[] = [];

      const mappedQuestions = questions.map((q, idx) => {
        let qType = 'mcq';
        if (typeof q.correct_answer === 'object' && q.correct_answer !== null) qType = 'tf';
        else if (typeof q.correct_answer === 'string') {
          const cleanCA = q.correct_answer.toLowerCase().trim();
          if (cleanCA.includes('true') || cleanCA.includes('false')) qType = 'tf';
        }
        if (!['mcq', 'tf', 'saq'].includes(qType)) {
          qType = Array.isArray(q.options) && q.options.length > 0 ? 'mcq' : 'saq';
        }

        const mappedQ = {
          ...q,
          globalIndex: idx,
          qType: qType,
          sub_questions: qType === 'tf' ? (q.options || []).map((opt: any, i: number) => ({
            label: opt.id || LETTERS[i] || String(i),
            text: opt.text || String(opt)
          })) : undefined
        };

        if (qType === 'tf') p2.push(mappedQ);
        else if (qType === 'saq') p3.push(mappedQ);
        else p1.push(mappedQ);

        return mappedQ;
      });

      const parts: any[] = [];
      if (p1.length > 0) parts.push({ id: 'p1', title: 'PHẦN I. Câu hỏi trắc nghiệm (Nhiều phương án)', data: p1 });
      if (p2.length > 0) parts.push({ id: 'p2', title: 'PHẦN II. Câu hỏi trắc nghiệm (Đúng / Sai)', data: p2 });
      if (p3.length > 0) parts.push({ id: 'p3', title: 'PHẦN III. Câu hỏi trắc nghiệm (Trả lời ngắn)', data: p3 });

      return { questions: mappedQuestions, parts };

    } catch (error) {
      console.error("Lỗi getExamFullQuestions:", error);
      return { questions: [], parts: [] };
    }
  },

  async getExamHistory(examId: string, userId: string) {
    try {
      const { data, error } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) { return []; }
  },

  async getExamLeaderboard(examId: string) {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`score, time_spent, created_at, user_id, users ( full_name, avatar_url )`)
        .eq('exam_id', examId);
        
      if (error) throw error;
      if (!data) return [];

      const userBestAttempts: { [userId: string]: any } = {};

      data.forEach((item: any) => {
        const userId = item.user_id;
        const userObj = Array.isArray(item.users) ? item.users[0] : item.users;
        if (!userId || !userObj) return;

        const currentBest = userBestAttempts[userId];
        if (!currentBest) {
          userBestAttempts[userId] = { ...item, users: userObj };
        } else {
          if (item.score > currentBest.score) {
            userBestAttempts[userId] = { ...item, users: userObj };
          } else if (item.score === currentBest.score) {
            if (item.time_spent < currentBest.time_spent) {
              userBestAttempts[userId] = { ...item, users: userObj };
            }
          }
        }
      });

      const sortedLeaderboard = Object.values(userBestAttempts)
        .sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.time_spent - b.time_spent;
        })
        .slice(0, 5);

      return sortedLeaderboard;
    } catch (error) { 
      console.error("Lỗi getExamLeaderboard:", error);
      return []; 
    }
  },

  // ==================================================
  // NỘP BÀI THI & CẬP NHẬT KẾT QUẢ + STREAK (BACKEND ENGINE)
  // ==================================================
  async submitExam(
    examId: string, 
    userId: string, 
    score: number, 
    timeSpent: number,
    sessionId?: string | null,
    currentUserObj?: any
  ) {
    try {
      // 1. Lưu bản ghi lượt làm bài
      const { data: attempt, error: attemptErr } = await supabase
        .from('exam_attempts')
        .insert({ 
          exam_id: examId, 
          user_id: userId, 
          score: score, 
          time_spent: timeSpent 
        })
        .select()
        .single();

      if (attemptErr) console.warn("Lỗi lưu exam_attempts:", attemptErr.message);

      // 2. Nếu có phiên thi Live -> Cập nhật trạng thái thành SUBMITTED
      if (sessionId) {
        await supabase
          .from('room_members')
          .update({ status: 'SUBMITTED', score: score })
          .eq('session_id', sessionId)
          .eq('student_id', userId);

        await supabase
          .from('exam_logs')
          .insert({ 
            session_id: sessionId, 
            student_id: userId, 
            action: 'SUBMIT', 
            description: `Đã nộp bài thi thành công. Điểm số: ${score}` 
          });
      }

      // 3. Tính điểm thưởng XP và cập nhật Streak chuẩn theo ngày
      if (currentUserObj) {
        const earnedXP = Math.round(score * 10);
        const newXP = (currentUserObj.xp || 0) + (earnedXP > 0 ? earnedXP : 0);
        const newLevel = Math.floor(newXP / 100) + 1;
        const streakResult = calculateStreakUpdate(currentUserObj.streak, currentUserObj.last_active_date);

        await supabase
          .from('users')
          .update({
            xp: newXP,
            level: newLevel,
            streak: streakResult.streak,
            last_active_date: streakResult.lastActiveDate
          })
          .eq('id', userId);
      }

      return attempt || true;
    } catch (error) { 
      console.error("Lỗi submitExam:", error);
      return false; 
    }
  },

  async getTeacherClasses(teacherId?: string) {
    try {
      const { data, error } = await supabase.from('classes').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) { return []; }
  },

  async assignExamToClass(classId: string, examId: string, dueDate: string) {
    try {
      const { error } = await supabase.from('class_assignments').upsert({
        class_id: classId,
        exam_id: examId,
        due_date: dueDate
      }, { onConflict: 'class_id,exam_id' }); 
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Lỗi giao bài:", error);
      return false;
    }
  },

  // ===== CRUD ĐỀ THI (EXAMS) =====
  async createExam(data: { title: string; description?: string; time_limit?: number; status?: string; teacher_id?: string; json_data?: any }) {
    try {
      const { data: result, error } = await supabase.from('exams').insert(data).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi createExam:", error);
      return null;
    }
  },
  async updateExam(id: string, data: Partial<{ title: string; description: string; time_limit: number; status: string; json_data: any }>) {
    try {
      const { data: result, error } = await supabase.from('exams').update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi updateExam:", error);
      return null;
    }
  },
  async deleteExam(id: string) {
    try {
      // Delete from exam_questions first
      const { error: eqErr } = await supabase.from('exam_questions').delete().eq('exam_id', id);
      if (eqErr) throw eqErr;
      
      // Then delete exam
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Lỗi deleteExam:", error);
      return false;
    }
  },

  // ===== CRUD CÂU HỎI ĐỀ THI (EXAM_QUESTIONS) =====
  async createExamQuestion(data: { exam_id: string; exercise_id: number; sort_order?: number }) {
    try {
      const { data: result, error } = await supabase.from('exam_questions').insert(data).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi createExamQuestion:", error);
      return null;
    }
  },
  async createExamQuestions(questions: Array<{ exam_id: string; exercise_id: number; sort_order?: number }>) {
    try {
      const { data: result, error } = await supabase.from('exam_questions').insert(questions).select();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi createExamQuestions:", error);
      return null;
    }
  },
  async updateExamQuestion(id: string, data: Partial<{ sort_order: number }>) {
    try {
      const { data: result, error } = await supabase.from('exam_questions').update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Lỗi updateExamQuestion:", error);
      return null;
    }
  },
  async deleteExamQuestion(id: string) {
    try {
      const { error } = await supabase.from('exam_questions').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Lỗi deleteExamQuestion:", error);
      return false;
    }
  },
  async deleteAllExamQuestions(examId: string) {
    try {
      const { error } = await supabase.from('exam_questions').delete().eq('exam_id', examId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Lỗi deleteAllExamQuestions:", error);
      return false;
    }
  },

  // ===== QUẢN LÝ LƯỢT THI (EXAM_ATTEMPTS) =====
  async deleteExamAttempt(id: string) {
    try {
      const { error } = await supabase.from('exam_attempts').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Lỗi deleteExamAttempt:", error);
      return false;
    }
  },
  async getExamAttemptsByExam(examId: string) {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, users(full_name, avatar_url)')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Lỗi getExamAttemptsByExam:", error);
      return [];
    }
  }
};