'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Users, Plus, Trash2, Edit3, Check, X, 
  Video, FileText, ChevronRight, Play, BookOpen,
  ChevronDown, ChevronUp, BarChart2, Clock, Award, HelpCircle,
  ClipboardList, CheckSquare, Library, ArrowLeft, ExternalLink, Sparkles,
  Search, Presentation, Paperclip, File, AlertCircle, RefreshCw, FolderOpen,
  Eye, CheckCircle2, MoreVertical, Link as LinkIcon
} from 'lucide-react';
import ExamEditorModal, { QuestionData } from '@/components/exam/ExamEditorModal';
import MathRenderer from '@/components/MathRenderer';
import TheoryEditor from '@/components/theory/TheoryEditor';

interface Assignment {
  id: string;
  class_id: string;
  subject_id: string;
  classes: {
    id: string;
    name: string;
    group_type: string;
  };
  subjects: {
    id: string;
    name: string;
  };
}

interface Student {
  student_id: string;
  mshs: string;
  full_name: string;
  class_id: string;
  profiles?: {
    email: string;
  };
}

interface Material {
  id: string;
  title: string;
  material_type: 'video' | 'slide' | 'pdf' | 'attachment';
  source_url: string;
  order_index: number;
}

interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  order_index: number;
  theory_markdown?: string;
  theory_content?: string;
  lesson_materials?: Material[];
}

interface Chapter {
  id: string;
  subject_id: string;
  title: string;
  order_index: number;
  lessons?: Lesson[];
}

interface Progress {
  id?: string;
  student_id: string;
  lesson_id: string;
  completed?: boolean;
  is_completed?: boolean;
  completed_at?: string;
  last_accessed_at?: string;
  score?: number | null;
  updated_at?: string;
  lessons?: Lesson;
}

interface StudyLog {
  id?: string;
  student_id: string;
  lesson_id: string;
  action?: string;
  duration_seconds?: number;
  time_spent_seconds?: number;
  created_at?: string;
  lessons?: Lesson;
}

interface TeacherDashboardClientProps {
  assignments: Assignment[];
  students: Student[];
  chapters: Chapter[];
  progress: Progress[];
  logs: StudyLog[];
  examResults: any[];
  exams: any[];
  questions: any[];
  allSubjects?: any[];
  token: string;
  teacherId: string;
  viewMode: 'stats' | 'materials';
}

export default function TeacherDashboardClient({
  assignments,
  students,
  chapters,
  progress,
  logs,
  examResults,
  exams,
  questions,
  allSubjects,
  token,
  teacherId,
  viewMode
}: TeacherDashboardClientProps) {
  const supabase = createSupabaseClient(token);
  const activeTab = viewMode;

  // ----------------------------------------------------
  // TRẠNG THÁI LOCAL CSDL GIẢ LẬP & LỌC
  // ----------------------------------------------------
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(
    assignments.length > 0 ? assignments[0] : null
  );
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);

  // Môn học đang soạn thảo
  const fallbackSubjectId = assignments[0]?.subject_id || allSubjects?.[0]?.id || chapters[0]?.subject_id || '';
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(fallbackSubjectId);

  // Cấu trúc cây bài học
  const [localChapters, setLocalChapters] = useState<Chapter[]>(chapters);
  const [localExams, setLocalExams] = useState<any[]>(exams);
  const [localQuestions, setLocalQuestions] = useState<any[]>(questions);

  // Trạng thái chọn trong Master-Detail Workspace
  // selectedLessonId = 'general' có nghĩa là chọn phần luyện tập chung môn học
  const [selectedLessonId, setSelectedLessonId] = useState<string | 'general' | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Tìm kiếm & Lọc trong cấu trúc bài giảng
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  // Modals chỉnh sửa trực quan (thay thế prompt() trình duyệt)
  const [editingChapterModal, setEditingChapterModal] = useState<{ id: string; title: string } | null>(null);
  const [editingLessonModal, setEditingLessonModal] = useState<{ chapterId: string; id: string; title: string } | null>(null);
  const [materialModal, setMaterialModal] = useState<{
    mode: 'create' | 'edit';
    chapterId: string;
    lessonId: string;
    materialId?: string;
    title: string;
    material_type: 'video' | 'slide' | 'pdf' | 'attachment';
    source_url: string;
  } | null>(null);

  // Modal Soạn đề thi chuẩn FMATH 2026
  const [editingExamModal, setEditingExamModal] = useState<any | null>(null);

  // Right Panel: Sub tabs ('materials' vs 'theory' vs 'exams')
  const [rightPanelTab, setRightPanelTab] = useState<'materials' | 'theory' | 'exams'>('theory');

  // Trạng thái các Form thêm mới inline
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  const [addingLessonToChapterId, setAddingLessonToChapterId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const [addingMaterial, setAddingMaterial] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialType, setNewMaterialType] = useState<'video' | 'pdf' | 'slide' | 'attachment'>('video');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');

  const [addingExam, setAddingExam] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamDuration, setNewExamDuration] = useState(15);
  const [newExamType, setNewExamType] = useState<'lesson' | 'test' | 'thptqg' | 'dgnl'>('lesson');

  const [activeEditingExamId, setActiveEditingExamId] = useState<string | null>(null);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [newQuestionOptA, setNewQuestionOptA] = useState('');
  const [newQuestionOptB, setNewQuestionOptB] = useState('');
  const [newQuestionOptC, setNewQuestionOptC] = useState('');
  const [newQuestionOptD, setNewQuestionOptD] = useState('');
  const [newQuestionCorrectIndex, setNewQuestionCorrectIndex] = useState(0);

  // ----------------------------------------------------
  // LOGIC CHỨC NĂNG (ACTIONS)
  // ----------------------------------------------------
  
  // 1. Thêm Chương
  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    try {
      const subjectChapters = localChapters.filter(c => c.subject_id === selectedSubjectId);
      const orderIndex = subjectChapters.length + 1;
      const { data, error } = await supabase.from('chapters').insert({
        subject_id: selectedSubjectId,
        title: newChapterTitle.trim(),
        order_index: orderIndex
      }).select().single();

      if (error) throw error;
      setLocalChapters([...localChapters, { ...data, lessons: [] }]);
      setNewChapterTitle('');
      setAddingChapter(false);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo chương học mới.');
    }
  };

  // 2. Xóa Chương
  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Bạn có chắc muốn xóa chương này? Toàn bộ bài giảng bên trong sẽ bị xóa liên đới.')) return;
    try {
      const { error } = await supabase.from('chapters').delete().eq('id', chapterId);
      if (error) throw error;
      setLocalChapters(localChapters.filter(c => c.id !== chapterId));
      if (selectedChapterId === chapterId) {
        setSelectedLessonId(null);
        setSelectedChapterId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xóa chương học.');
    }
  };

  // 3. Thêm Bài học
  const handleAddLesson = async (chapterId: string) => {
    if (!newLessonTitle.trim()) return;
    try {
      const chapter = localChapters.find(c => c.id === chapterId);
      const orderIndex = (chapter?.lessons?.length || 0) + 1;

      const { data, error } = await supabase.from('lessons').insert({
        chapter_id: chapterId,
        title: newLessonTitle.trim(),
        order_index: orderIndex
      }).select().single();

      if (error) throw error;

      setLocalChapters(localChapters.map(c => {
        if (c.id === chapterId) {
          return { ...c, lessons: [...(c.lessons || []), { ...data, lesson_materials: [] }] };
        }
        return c;
      }));

      setNewLessonTitle('');
      setAddingLessonToChapterId(null);
      // Tự động chọn bài học vừa tạo
      setSelectedLessonId(data.id);
      setSelectedChapterId(chapterId);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo bài học mới.');
    }
  };

  // 4. Xóa Bài học
  const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài học này?')) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;

      setLocalChapters(localChapters.map(c => {
        if (c.id === chapterId) {
          return { ...c, lessons: (c.lessons || []).filter(l => l.id !== lessonId) };
        }
        return c;
      }));
      if (selectedLessonId === lessonId) {
        setSelectedLessonId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xóa bài học.');
    }
  };

  // 5. Thêm Học liệu
  const handleAddMaterial = async (chapterId: string, lessonId: string) => {
    if (!newMaterialTitle.trim() || !newMaterialUrl.trim()) return;
    try {
      const chapter = localChapters.find(c => c.id === chapterId);
      const lesson = chapter?.lessons?.find(l => l.id === lessonId);
      const orderIndex = (lesson?.lesson_materials?.length || 0) + 1;

      let finalUrl = newMaterialUrl.trim();
      if (newMaterialType === 'video' && newMaterialUrl.includes('youtube.com/watch')) {
        const urlObj = new URL(newMaterialUrl);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) finalUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (newMaterialType === 'video' && newMaterialUrl.includes('youtu.be/')) {
        const videoId = newMaterialUrl.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }

      const { data, error } = await supabase.from('lesson_materials').insert({
        lesson_id: lessonId,
        title: newMaterialTitle.trim(),
        material_type: newMaterialType,
        source_url: finalUrl,
        order_index: orderIndex
      }).select().single();

      if (error) throw error;

      setLocalChapters(localChapters.map(c => {
        if (c.id === chapterId) {
          return {
            ...c,
            lessons: (c.lessons || []).map(l => {
              if (l.id === lessonId) {
                return { ...l, lesson_materials: [...(l.lesson_materials || []), data] };
              }
              return l;
            })
          };
        }
        return c;
      }));

      setNewMaterialTitle('');
      setNewMaterialUrl('');
      setAddingMaterial(false);
    } catch (err) {
      console.error(err);
      alert('Không thể đăng tải học liệu.');
    }
  };

  // 6. Xóa Học liệu
  const handleDeleteMaterial = async (chapterId: string, lessonId: string, materialId: string) => {
    if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    try {
      const { error } = await supabase.from('lesson_materials').delete().eq('id', materialId);
      if (error) throw error;

      setLocalChapters(localChapters.map(c => {
        if (c.id === chapterId) {
          return {
            ...c,
            lessons: (c.lessons || []).map(l => {
              if (l.id === lessonId) {
                return { ...l, lesson_materials: (l.lesson_materials || []).filter(m => m.id !== materialId) };
              }
              return l;
            })
          };
        }
        return c;
      }));
    } catch (err) {
      console.error(err);
      alert('Không thể xóa tài liệu.');
    }
  };

  // 6.5. Lưu Lý thuyết Markdown của Bài học (Chuẩn FMATH - Dual Persistence)
  const handleSaveTheory = async (chapterId: string, lessonId: string, theoryContent: string) => {
    try {
      // 1. Thử cập nhật trực tiếp vào bảng lessons
      let savedDirectly = false;
      try {
        const { error: lessonErr } = await supabase
          .from('lessons')
          .update({
            theory_content: theoryContent,
            theory_markdown: theoryContent
          })
          .eq('id', lessonId);
        
        if (!lessonErr) {
          savedDirectly = true;
        }
      } catch (e) {
        savedDirectly = false;
      }

      // 2. Đồng thời lưu an toàn vào lesson_materials để đảm bảo không bị mất dữ liệu ngay cả khi CSDL chưa có cột theory_content
      const activeChap = localChapters.find(c => c.id === chapterId);
      const activeLes = activeChap?.lessons?.find(l => l.id === lessonId);
      const existingMat = activeLes?.lesson_materials?.find(m => m.title === '__theory_markdown__');

      let savedMaterialRecord: any = null;

      if (existingMat) {
        const { data, error: matErr } = await supabase
          .from('lesson_materials')
          .update({ source_url: theoryContent })
          .eq('id', existingMat.id)
          .select()
          .single();
        if (!matErr && data) savedMaterialRecord = data;
      } else {
        const { data, error: matErr } = await supabase
          .from('lesson_materials')
          .insert({
            lesson_id: lessonId,
            title: '__theory_markdown__',
            material_type: 'attachment',
            source_url: theoryContent,
            order_index: 0
          })
          .select()
          .single();
        if (!matErr && data) savedMaterialRecord = data;
      }

      // Cập nhật State cục bộ
      setLocalChapters(prev => prev.map(c => {
        if (c.id === chapterId) {
          return {
            ...c,
            lessons: (c.lessons || []).map(l => {
              if (l.id === lessonId) {
                let mats = l.lesson_materials || [];
                if (savedMaterialRecord) {
                  if (mats.some(m => m.id === savedMaterialRecord.id || m.title === '__theory_markdown__')) {
                    mats = mats.map(m => (m.id === savedMaterialRecord.id || m.title === '__theory_markdown__') ? savedMaterialRecord : m);
                  } else {
                    mats = [...mats, savedMaterialRecord];
                  }
                }
                return {
                  ...l,
                  theory_markdown: theoryContent,
                  theory_content: theoryContent,
                  lesson_materials: mats
                };
              }
              return l;
            })
          };
        }
        return c;
      }));
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // 7. Lưu Đề thi và Bộ câu hỏi từ ExamEditorModal (Chuẩn FMATH 2026)
  const handleSaveExamModal = async (examMeta: any, questionsData: QuestionData[]) => {
    try {
      const activeChapter = localChapters.find(c => c.id === selectedChapterId);
      const isGeneral = selectedLessonId === 'general';
      const finalSubjectId = activeChapter?.subject_id || selectedSubjectId || fallbackSubjectId;
      const finalLessonId = isGeneral ? null : selectedLessonId;

      let savedExamId = editingExamModal?.id;

      if (savedExamId && !savedExamId.startsWith('new-')) {
        // Cập nhật đề thi đã có
        let updatedExam: any = null;
        const examUpdatePayload = {
          title: examMeta.title,
          duration_minutes: Number(examMeta.duration_minutes),
          exam_type: examMeta.exam_type
        };

        const res1 = await supabase
          .from('exams')
          .update(examUpdatePayload)
          .eq('id', savedExamId)
          .select()
          .single();

        if (res1.error && (res1.error.message?.includes('exam_type') || res1.error.message?.includes('schema cache'))) {
          const { exam_type, ...fallbackPayload } = examUpdatePayload;
          const fallbackRes = await supabase
            .from('exams')
            .update(fallbackPayload)
            .eq('id', savedExamId)
            .select()
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          updatedExam = fallbackRes.data;
        } else if (res1.error) {
          throw res1.error;
        } else {
          updatedExam = res1.data;
        }

        // Xóa câu hỏi cũ và ghi lại câu hỏi mới
        await supabase.from('questions').delete().eq('exam_id', savedExamId);

        const newQuestions = questionsData.map((q, idx) => ({
          exam_id: savedExamId,
          content: q.content,
          question_type: q.type,
          options: q.type === 'mcq' ? q.options.map(o => o.text) : q.options,
          correct_option_index: q.type === 'mcq' ? (['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) !== -1 ? ['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) : 0) : 0,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          level: q.level,
          order_index: idx + 1
        }));

        let qRes = await supabase
          .from('questions')
          .insert(newQuestions)
          .select();

        if (qRes.error && (qRes.error.message?.includes('column') || qRes.error.message?.includes('schema cache'))) {
          const fallbackQs = questionsData.map((q, idx) => ({
            exam_id: savedExamId,
            content: q.content,
            options: q.type === 'mcq' ? q.options.map(o => o.text) : q.options.map((o: any) => o.text || o),
            correct_option_index: ['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) !== -1 ? ['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) : 0,
            order_index: idx + 1
          }));
          qRes = await supabase
            .from('questions')
            .insert(fallbackQs)
            .select();
        }

        if (qRes.error) throw qRes.error;

        setLocalExams(prev => prev.map(e => e.id === savedExamId ? updatedExam : e));
        setLocalQuestions(prev => [...prev.filter(q => q.exam_id !== savedExamId), ...(qRes.data || [])]);
      } else {
        // Tạo mới đề thi
        let newExam: any = null;
        const examInsertPayload = {
          subject_id: finalSubjectId,
          lesson_id: finalLessonId,
          title: examMeta.title,
          exam_type: examMeta.exam_type || (finalLessonId ? 'lesson' : 'test'),
          duration_minutes: Number(examMeta.duration_minutes) || 15
        };

        const res1 = await supabase
          .from('exams')
          .insert(examInsertPayload)
          .select()
          .single();

        if (res1.error && (res1.error.message?.includes('exam_type') || res1.error.message?.includes('schema cache'))) {
          const { exam_type, ...fallbackPayload } = examInsertPayload;
          const fallbackRes = await supabase
            .from('exams')
            .insert(fallbackPayload)
            .select()
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          newExam = fallbackRes.data;
        } else if (res1.error) {
          throw res1.error;
        } else {
          newExam = res1.data;
        }

        savedExamId = newExam.id;

        const newQuestions = questionsData.map((q, idx) => ({
          exam_id: savedExamId,
          content: q.content,
          question_type: q.type,
          options: q.type === 'mcq' ? q.options.map(o => o.text) : q.options,
          correct_option_index: q.type === 'mcq' ? (['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) !== -1 ? ['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) : 0) : 0,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          level: q.level,
          order_index: idx + 1
        }));

        let qRes = await supabase
          .from('questions')
          .insert(newQuestions)
          .select();

        if (qRes.error && (qRes.error.message?.includes('column') || qRes.error.message?.includes('schema cache'))) {
          const fallbackQs = questionsData.map((q, idx) => ({
            exam_id: savedExamId,
            content: q.content,
            options: q.type === 'mcq' ? q.options.map(o => o.text) : q.options.map((o: any) => o.text || o),
            correct_option_index: ['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) !== -1 ? ['A', 'B', 'C', 'D'].indexOf(String(q.correct_answer).toUpperCase()) : 0,
            order_index: idx + 1
          }));
          qRes = await supabase
            .from('questions')
            .insert(fallbackQs)
            .select();
        }

        if (qRes.error) throw qRes.error;

        setLocalExams(prev => [...prev, newExam]);
        setLocalQuestions(prev => [...prev, ...(qRes.data || [])]);
      }

      alert('Lưu Đề thi & Bộ câu hỏi thành công!');
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // 8. Xóa Đề thi
  const handleDeleteExam = async (examId: string) => {
    const examToDelete = localExams.find(e => e.id === examId);
    const examName = examToDelete?.title ? `"${examToDelete.title}"` : 'đề thi này';

    if (!confirm(`Bạn có chắc chắn muốn xóa ${examName}?\n\nLƯU Ý: Toàn bộ câu hỏi, phân công giao bài và kết quả làm bài của học sinh liên quan đến đề thi này sẽ bị xóa vĩnh viễn!`)) {
      return;
    }

    try {
      const res = await fetch('/api/exams/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        await supabase.from('exam_results').delete().eq('exam_id', examId);
        await supabase.from('questions').delete().eq('exam_id', examId);
        await supabase.from('exam_assignments').delete().eq('exam_id', examId);
        const { error: directErr } = await supabase.from('exams').delete().eq('id', examId);
        if (directErr) {
          throw new Error(errorData.error || directErr.message);
        }
      }

      setLocalExams(prev => prev.filter(e => e.id !== examId));
      setLocalQuestions(prev => prev.filter(q => q.exam_id !== examId));
      if (activeEditingExamId === examId) setActiveEditingExamId(null);
      if (editingExamModal?.id === examId) setEditingExamModal(null);
      alert('Đã xóa đề thi cùng toàn bộ dữ liệu đi kèm thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Không thể xóa đề thi: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  // 9. Thêm Câu hỏi
  const handleAddQuestion = async (examId: string) => {
    if (!newQuestionContent.trim() || !newQuestionOptA.trim() || !newQuestionOptB.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi và ít nhất 2 phương án đáp án.');
      return;
    }
    try {
      const examQuestions = localQuestions.filter(q => q.exam_id === examId);
      const orderIndex = examQuestions.length + 1;

      const { data, error } = await supabase.from('questions').insert({
        exam_id: examId,
        content: newQuestionContent.trim(),
        options: [newQuestionOptA.trim(), newQuestionOptB.trim(), newQuestionOptC.trim(), newQuestionOptD.trim()].filter(Boolean),
        correct_option_index: Number(newQuestionCorrectIndex),
        order_index: orderIndex
      }).select().single();

      if (error) throw error;
      setLocalQuestions([...localQuestions, data]);
      setNewQuestionContent('');
      setNewQuestionOptA('');
      setNewQuestionOptB('');
      setNewQuestionOptC('');
      setNewQuestionOptD('');
      setNewQuestionCorrectIndex(0);
    } catch (err) {
      console.error(err);
      alert('Không thể thêm câu hỏi trắc nghiệm.');
    }
  };

  // 10. Xóa Câu hỏi
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', questionId);
      if (error) throw error;
      setLocalQuestions(localQuestions.filter(q => q.id !== questionId));
    } catch (err) {
      console.error(err);
      alert('Không thể xóa câu hỏi.');
    }
  };

  // ----------------------------------------------------
  // LOGIC CẬP NHẬT CHUYÊN MÔN (UPDATE CRUD ENGINE)
  // ----------------------------------------------------
  const handleUpdateChapter = async (chapterId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const { data, error } = await supabase
        .from('chapters')
        .update({ title: newTitle.trim() })
        .eq('id', chapterId)
        .select()
        .single();
      if (error) throw error;
      setLocalChapters(localChapters.map(c => c.id === chapterId ? { ...c, title: data.title } : c));
      alert('Đã cập nhật chương học!');
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật chương học.');
    }
  };

  const handleUpdateLesson = async (chapterId: string, lessonId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const { data, error } = await supabase
        .from('lessons')
        .update({ title: newTitle.trim() })
        .eq('id', lessonId)
        .select()
        .single();
      if (error) throw error;
      setLocalChapters(localChapters.map(c => {
        if (c.id === chapterId) {
          return {
            ...c,
            lessons: (c.lessons || []).map(l => l.id === lessonId ? { ...l, title: data.title } : l)
          };
        }
        return c;
      }));
      alert('Đã cập nhật bài học!');
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật bài học.');
    }
  };

  const handleUpdateMaterial = async (chapterId: string, lessonId: string, materialId: string, updatedFields: Partial<Material>) => {
    try {
      const { data, error } = await supabase
        .from('lesson_materials')
        .update(updatedFields)
        .eq('id', materialId)
        .select()
        .single();
      if (error) throw error;
      setLocalChapters(localChapters.map(c => {
        if (c.id === chapterId) {
          return {
            ...c,
            lessons: (c.lessons || []).map(l => {
              if (l.id === lessonId) {
                return {
                  ...l,
                  lesson_materials: (l.lesson_materials || []).map(m => m.id === materialId ? { ...m, ...data } : m)
                };
              }
              return l;
            })
          };
        }
        return c;
      }));
      alert('Đã cập nhật tài liệu!');
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật tài liệu.');
    }
  };

  const handleUpdateExam = async (examId: string, updatedFields: { title: string; duration_minutes: number }) => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update({
          title: updatedFields.title.trim(),
          duration_minutes: Number(updatedFields.duration_minutes)
        })
        .eq('id', examId)
        .select()
        .single();
      if (error) throw error;
      setLocalExams(localExams.map(e => e.id === examId ? data : e));
      alert('Đã cập nhật đề thi!');
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật đề thi.');
    }
  };

  const handleUpdateQuestion = async (questionId: string, updatedFields: { content: string; options: string[]; correct_option_index: number }) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .update({
          content: updatedFields.content.trim(),
          options: updatedFields.options.map(o => o.trim()).filter(Boolean),
          correct_option_index: updatedFields.correct_option_index
        })
        .eq('id', questionId)
        .select()
        .single();
      if (error) throw error;
      setLocalQuestions(localQuestions.map(q => q.id === questionId ? data : q));
      alert('Đã cập nhật câu hỏi!');
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật câu hỏi.');
    }
  };

  // ----------------------------------------------------
  // GIAO DIỆN PHỤ TRÁCH THỐNG KÊ (STATS VIEW)
  // ----------------------------------------------------
  const filteredStudents = students.filter(s => s.class_id === selectedAssignment?.class_id);
  const activeSubjectLessons = localChapters
    .filter(c => c.subject_id === selectedAssignment?.subject_id)
    .reduce((acc, c) => [...acc, ...(c.lessons || [])], [] as Lesson[]);
  const activeSubjectLessonIds = activeSubjectLessons.map(l => l.id);

  const getStudentStats = (studentId: string) => {
    const studentProgress = progress.filter(p => 
      p.student_id === studentId && 
      activeSubjectLessonIds.includes(p.lesson_id) && 
      (p.completed || p.is_completed)
    );
    const studentLogs = logs.filter(l => 
      l.student_id === studentId && 
      activeSubjectLessonIds.includes(l.lesson_id)
    );
    const completedCount = studentProgress.length;
    const totalCount = activeSubjectLessonIds.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const totalMinutes = Math.round(studentLogs.reduce((acc, log) => acc + (log.duration_seconds || log.time_spent_seconds || 0), 0) / 60);

    const studentAllProgress = progress.filter(p => p.student_id === studentId && activeSubjectLessonIds.includes(p.lesson_id));
    const lastAccessTimes = studentAllProgress
      .map(p => p.last_accessed_at || p.updated_at || p.completed_at)
      .filter(Boolean)
      .map(t => new Date(t!).getTime());

    const lastAccess = lastAccessTimes.length > 0 
      ? new Date(Math.max(...lastAccessTimes)).toLocaleDateString('vi-VN')
      : 'Chưa học';

    return { percent, totalMinutes, lastAccess, completedCount, totalCount };
  };

  const getClassAverage = () => {
    if (filteredStudents.length === 0) return 0;
    const totalPercent = filteredStudents.reduce((acc, s) => acc + getStudentStats(s.student_id).percent, 0);
    return Math.round(totalPercent / filteredStudents.length);
  };

  // ----------------------------------------------------
  // XỬ LÝ CHỌN LỰA BÀI HỌC Ở WORKSPACE
  // ----------------------------------------------------
  const teacherSubjects = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const a of assignments) {
      if (a.subject_id && a.subjects && !seen.has(a.subject_id)) {
        seen.add(a.subject_id);
        list.push({ id: a.subject_id, name: a.subjects.name });
      }
    }
    if (list.length === 0 && allSubjects && allSubjects.length > 0) {
      for (const s of allSubjects) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          list.push({ id: s.id, name: s.name });
        }
      }
    }
    return list;
  }, [assignments, allSubjects]);

  // Đảm bảo môn học đang chọn luôn luôn thuộc danh sách môn phụ trách hợp lệ của giáo viên
  useEffect(() => {
    if (teacherSubjects.length > 0) {
      if (!selectedSubjectId || !teacherSubjects.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId(teacherSubjects[0].id);
      }
    }
  }, [teacherSubjects, selectedSubjectId]);

  const filteredChapters = useMemo(() => {
    return localChapters.filter(c => c.subject_id === selectedSubjectId);
  }, [localChapters, selectedSubjectId]);

  // Tự động chọn bài học đầu tiên khi vào tab học liệu nếu chưa chọn bài nào
  useEffect(() => {
    if (activeTab === 'materials' && !selectedLessonId && filteredChapters.length > 0) {
      for (const chap of filteredChapters) {
        if (chap.lessons && chap.lessons.length > 0) {
          setSelectedChapterId(chap.id);
          setSelectedLessonId(chap.lessons[0].id);
          break;
        }
      }
    }
  }, [activeTab, filteredChapters, selectedLessonId]);

  // Bộ lọc tìm kiếm bài học & chương
  const searchedChapters = useMemo(() => {
    if (!searchQuery.trim()) return filteredChapters;
    const q = searchQuery.toLowerCase().trim();
    return filteredChapters
      .map(chap => {
        const matchesChap = chap.title.toLowerCase().includes(q);
        const matchingLessons = (chap.lessons || []).filter(les => les.title.toLowerCase().includes(q));
        if (matchesChap) return chap;
        if (matchingLessons.length > 0) {
          return { ...chap, lessons: matchingLessons };
        }
        return null;
      })
      .filter(Boolean) as Chapter[];
  }, [filteredChapters, searchQuery]);

  const toggleChapterCollapse = (chapId: string) => {
    setCollapsedChapters(prev => ({
      ...prev,
      [chapId]: !prev[chapId]
    }));
  };

  const toggleCollapseAll = () => {
    const allCollapsed = filteredChapters.every(c => collapsedChapters[c.id]);
    const newState: Record<string, boolean> = {};
    filteredChapters.forEach(c => {
      newState[c.id] = !allCollapsed;
    });
    setCollapsedChapters(newState);
  };

  // Xác định thông tin của bài học đang chọn an toàn
  const activeLesson = useMemo(() => {
    if (!selectedLessonId || selectedLessonId === 'general') return null;
    for (const chap of localChapters) {
      const les = (chap.lessons || []).find(l => l.id === selectedLessonId);
      if (les) return les;
    }
    return null;
  }, [localChapters, selectedLessonId]);

  const activeChapter = useMemo(() => {
    if (!activeLesson) return localChapters.find(c => c.id === selectedChapterId) || null;
    return localChapters.find(c => c.id === activeLesson.chapter_id) || null;
  }, [localChapters, activeLesson, selectedChapterId]);

  // Lọc đề thi theo Bài học đang chọn (hoặc đề chung môn học)
  const activeExams = localExams.filter(exam => {
    if (selectedLessonId === 'general') {
      return exam.subject_id === selectedSubjectId && !exam.lesson_id;
    }
    return exam.lesson_id === selectedLessonId;
  });

  // Modal Handlers
  const handleSaveChapterModal = async () => {
    if (!editingChapterModal || !editingChapterModal.title.trim()) return;
    await handleUpdateChapter(editingChapterModal.id, editingChapterModal.title.trim());
    setEditingChapterModal(null);
  };

  const handleSaveLessonModal = async () => {
    if (!editingLessonModal || !editingLessonModal.title.trim()) return;
    await handleUpdateLesson(editingLessonModal.chapterId, editingLessonModal.id, editingLessonModal.title.trim());
    setEditingLessonModal(null);
  };

  const handleSaveMaterialModal = async () => {
    if (!materialModal || !materialModal.title.trim() || !materialModal.source_url.trim()) return;
    const { mode, chapterId, lessonId, materialId, title, material_type, source_url } = materialModal;

    let finalUrl = source_url.trim();
    if (material_type === 'video') {
      if (finalUrl.includes('youtube.com/watch')) {
        const videoId = new URL(finalUrl).searchParams.get('v');
        if (videoId) finalUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (finalUrl.includes('youtu.be/')) {
        const videoId = finalUrl.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    if (mode === 'create') {
      try {
        const chapter = localChapters.find(c => c.id === chapterId);
        const lesson = chapter?.lessons?.find(l => l.id === lessonId);
        const orderIndex = (lesson?.lesson_materials?.length || 0) + 1;

        const { data, error } = await supabase.from('lesson_materials').insert({
          lesson_id: lessonId,
          title: title.trim(),
          material_type: material_type,
          source_url: finalUrl,
          order_index: orderIndex
        }).select().single();

        if (error) throw error;

        setLocalChapters(prev => prev.map(c => {
          if (c.id === chapterId) {
            return {
              ...c,
              lessons: (c.lessons || []).map(l => {
                if (l.id === lessonId) {
                  return { ...l, lesson_materials: [...(l.lesson_materials || []), data] };
                }
                return l;
              })
            };
          }
          return c;
        }));

        setMaterialModal(null);
      } catch (err) {
        console.error(err);
        alert('Không thể đăng tải học liệu.');
      }
    } else if (mode === 'edit' && materialId) {
      try {
        const { data, error } = await supabase
          .from('lesson_materials')
          .update({
            title: title.trim(),
            material_type: material_type,
            source_url: finalUrl
          })
          .eq('id', materialId)
          .select()
          .single();

        if (error) throw error;

        setLocalChapters(prev => prev.map(c => {
          if (c.id === chapterId) {
            return {
              ...c,
              lessons: (c.lessons || []).map(l => {
                if (l.id === lessonId) {
                  return {
                    ...l,
                    lesson_materials: (l.lesson_materials || []).map(m => m.id === materialId ? { ...m, ...data } : m)
                  };
                }
                return l;
              })
            };
          }
          return c;
        }));

        setMaterialModal(null);
      } catch (err) {
        console.error(err);
        alert('Không thể cập nhật học liệu.');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ==================================================== */}
      {/* 1. CHẾ ĐỘ THỐNG KÊ (STATS VIEW) */}
      {/* ==================================================== */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Lựa chọn phân công lớp/môn */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border">
            <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">Chọn Lớp phụ trách:</span>
            <div className="flex flex-wrap gap-2">
              {assignments.map(ass => (
                <button
                  key={ass.id}
                  onClick={() => { setSelectedAssignment(ass); setSelectedStudentDetail(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedAssignment?.id === ass.id ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border hover:bg-muted'}`}
                >
                  {ass.classes.name} - Môn {ass.subjects.name}
                </button>
              ))}
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-muted-foreground">Bạn chưa được phân công quản lý lớp học nào.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Thống kê học sinh */}
              <div className="lg:col-span-12 space-y-4">
                <div className="grid gap-3.5 sm:grid-cols-3">
                  <div className="flat-card flex items-center gap-3 p-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#e7f1ff] dark:bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 border border-[#b6d4fe]/40">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Học sinh lớp</span>
                      <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{filteredStudents.length} học sinh</h4>
                    </div>
                  </div>

                  <div className="flat-card flex items-center gap-3 p-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#d1e7dd] dark:bg-emerald-500/20 text-[#198754] flex items-center justify-center font-bold shrink-0 border border-[#a3cfbb]/40">
                      <BarChart2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Tiến độ trung bình</span>
                      <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{getClassAverage()}% hoàn thành</h4>
                    </div>
                  </div>

                  <div className="flat-card flex items-center gap-3 p-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#cff4fc] dark:bg-cyan-500/20 text-[#0dcaf0] flex items-center justify-center font-bold shrink-0 border border-[#9eeaf9]/40">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Tổng số bài học</span>
                      <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{activeSubjectLessonIds.length} bài giảng</h4>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-border bg-muted/10">
                    <h3 className="font-extrabold text-sm">Danh sách học viên theo dõi ({selectedAssignment?.classes.name})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <th className="p-4">MSHS</th>
                          <th className="p-4">Họ tên</th>
                          <th className="p-4">Tiến độ (%)</th>
                          <th className="p-4">Thời lượng học</th>
                          <th className="p-4">Lần cuối học</th>
                          <th className="p-4">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => {
                          const stats = getStudentStats(student.student_id);
                          return (
                            <tr key={student.student_id} className="border-b border-border hover:bg-muted/5 transition-colors">
                              <td className="p-4 font-bold text-foreground">{student.mshs}</td>
                              <td className="p-4 font-semibold text-foreground">{student.full_name}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-muted rounded-full h-1">
                                    <div className="bg-primary h-1 rounded-full" style={{ width: `${stats.percent}%` }} />
                                  </div>
                                  <span className="font-bold">{stats.percent}%</span>
                                </div>
                              </td>
                              <td className="p-4 font-bold text-primary">{stats.totalMinutes} phút</td>
                              <td className="p-4 text-muted-foreground font-semibold">{stats.lastAccess}</td>
                              <td className="p-4">
                                <button
                                  onClick={() => setSelectedStudentDetail(student)}
                                  className="text-[10px] font-bold bg-secondary px-3 py-1 rounded text-secondary-foreground hover:opacity-90"
                                >
                                  Xem chi tiết
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* POPUP MODAL XEM CHI TIẾT HỌC SINH */}
              {selectedStudentDetail && (
                <div 
                  className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
                  onClick={() => setSelectedStudentDetail(null)}
                >
                  <div 
                    className="bg-card border border-border max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card flex flex-col max-h-[85vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    
                    {/* Header Modal */}
                    <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
                      <div>
                        <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" /> {selectedStudentDetail.full_name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-semibold">Mã số: {selectedStudentDetail.mshs} &bull; Lớp: {selectedAssignment?.classes?.name}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedStudentDetail(null)}
                        className="p-1.5 hover:bg-muted border border-border bg-background rounded-lg transition-colors"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    {/* Body Modal (Scrollable) */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
                      {/* Tiến trình học tập lý thuyết */}
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1 text-foreground/80">
                          Tiến độ bài học
                        </h4>
                        <div className="grid gap-2">
                          {localChapters
                            .filter(c => c.subject_id === selectedAssignment?.subject_id)
                            .map(chap => (
                              <div key={chap.id} className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-2">
                                <p className="font-extrabold text-foreground">{chap.title}</p>
                                <div className="grid gap-1.5 pl-2">
                                  {(chap.lessons || []).map(les => {
                                    const isCompleted = progress.some(p => p.student_id === selectedStudentDetail.student_id && p.lesson_id === les.id && p.completed);
                                    return (
                                      <div key={les.id} className="flex items-center justify-between p-2 rounded bg-background border border-border/50 font-semibold">
                                        <span className="text-muted-foreground">{les.title}</span>
                                        {isCompleted ? (
                                          <span className="text-[9px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded flex items-center gap-0.5">Xong</span>
                                        ) : (
                                          <span className="text-[9px] font-black text-muted-foreground bg-muted border border-border/50 px-2 py-0.5 rounded">Chưa</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Kết quả kiểm tra */}
                      <div className="space-y-2 pt-3 border-t border-border">
                        <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1 text-foreground/80">
                          <Award className="h-4 w-4 text-secondary" /> Kết quả kiểm tra
                        </h4>
                        {(() => {
                          const studentResults = examResults.filter(r => r.student_id === selectedStudentDetail.student_id);
                          if (studentResults.length === 0) {
                            return <p className="text-[11px] text-muted-foreground italic">Chưa làm đề luyện tập nào.</p>;
                          }
                          return (
                            <div className="grid gap-2">
                              {studentResults.map((res: any) => (
                                <div key={res.id} className="flex items-center justify-between p-2.5 rounded bg-muted/20 border border-border/50 font-semibold">
                                  <span className="text-muted-foreground">{res.exams?.title || 'Đề thi'}</span>
                                  <span className={`font-black ${res.score >= 5.0 ? 'text-green-500' : 'text-orange-500'}`}>{res.score}/10</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. CHẾ ĐỘ BIÊN SOẠN BÀI GIẢNG (MATERIALS SPLIT-SCREEN WORKSPACE) */}
      {/* ==================================================== */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          
          {/* THANH HIỂN THỊ MÔN HỌC ĐƯỢC PHÂN CÔNG SOẠN THẢO */}
          <div className="bg-card border border-border p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Không gian bài giảng</span>
                <span className="text-sm font-extrabold text-foreground">
                  Môn học phụ trách: <strong className="text-primary">{teacherSubjects.find(s => s.id === selectedSubjectId)?.name || 'Chưa phân công'}</strong>
                </span>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                  Thầy/Cô chỉ có quyền biên soạn bài giảng và quản lý học liệu thuộc môn học được phân công.
                </p>
              </div>
            </div>

            {teacherSubjects.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-semibold text-muted-foreground shrink-0">Chuyển môn phụ trách:</span>
                {teacherSubjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setSelectedLessonId(null);
                      setSelectedChapterId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedSubjectId === sub.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-foreground border border-border'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TWO-COLUMN (SPLIT-SCREEN) WORKSPACE LAYOUT */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            
            {/* ==================================================== */}
            {/* CỘT TRÁI: CÂY CẤU TRÚC CHƯƠNG & BÀI HỌC (SIDEBAR) */}
            {/* ==================================================== */}
            <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm max-h-[85vh] flex flex-col">
              
              {/* Header Sidebar & Thêm Chương */}
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3 shrink-0">
                <div>
                  <h3 className="font-black text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Library className="h-4 w-4 text-primary" /> Cấu trúc bài giảng
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                    {filteredChapters.length} chương &bull; {filteredChapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)} bài học
                  </p>
                </div>
                
                <button
                  onClick={() => setAddingChapter(!addingChapter)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 px-3 py-1.5 rounded-xl transition-all shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{addingChapter ? 'Đóng' : 'Thêm Chương'}</span>
                </button>
              </div>

              {/* Form Thêm Chương mới (Mở rộng thoải mái, không chật chội) */}
              {addingChapter && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2.5 shrink-0 animate-fade-in">
                  <span className="text-[11px] font-bold text-primary block">Tạo chương học mới</span>
                  <input
                    type="text"
                    placeholder="Nhập tên chương (VD: Chương 1: Hàm số...)"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddChapter(); }}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setAddingChapter(false)}
                      className="px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleAddChapter}
                      className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-xs hover:opacity-90 flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Lưu chương
                    </button>
                  </div>
                </div>
              )}

              {/* Thanh tìm kiếm bài học & Nút thu gọn */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm chương, bài học..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/20 pl-8 pr-8 py-2 text-xs focus:outline-none focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>{searchQuery ? `Tìm thấy ${searchedChapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)} bài học` : 'Danh sách chương mục'}</span>
                  <button
                    onClick={toggleCollapseAll}
                    className="hover:text-primary font-semibold flex items-center gap-1"
                  >
                    {filteredChapters.every(c => collapsedChapters[c.id]) ? (
                      <><span>Mở rộng tất cả</span> <ChevronDown className="h-3 w-3" /></>
                    ) : (
                      <><span>Thu gọn tất cả</span> <ChevronUp className="h-3 w-3" /></>
                    )}
                  </button>
                </div>
              </div>

              {/* Mục Luyện tập chung môn học */}
              <button
                onClick={() => {
                  setSelectedLessonId('general');
                  setSelectedChapterId(null);
                  setRightPanelTab('exams');
                }}
                className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                  selectedLessonId === 'general'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/10 hover:bg-muted/30 border-border/80 text-foreground'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ClipboardList className={`h-4 w-4 shrink-0 ${selectedLessonId === 'general' ? 'text-primary-foreground' : 'text-primary'}`} />
                  <span>Đề luyện tập chung môn học</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  selectedLessonId === 'general' ? 'bg-white/20 text-white' : 'bg-muted border border-border text-muted-foreground'
                }`}>
                  {localExams.filter(e => e.subject_id === selectedSubjectId && !e.lesson_id).length} đề
                </span>
              </button>

              {/* Danh sách các Chương & Bài học (Scrollable Container) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {searchedChapters.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-border rounded-xl bg-muted/5 text-muted-foreground space-y-2">
                    <Library className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-xs font-semibold">
                      {searchQuery ? 'Không tìm thấy bài học nào phù hợp.' : 'Chưa có chương học nào được tạo.'}
                    </p>
                  </div>
                ) : (
                  searchedChapters.map((chap, chapIdx) => {
                    const isCollapsed = !!collapsedChapters[chap.id];
                    const lessonList = chap.lessons || [];

                    return (
                      <div
                        key={chap.id}
                        className="border border-border/80 bg-card rounded-xl overflow-hidden shadow-2xs hover:border-primary/30 transition-colors"
                      >
                        {/* Header Chương */}
                        <div className="bg-muted/20 p-2.5 sm:p-3 flex items-center justify-between gap-2 border-b border-border/50">
                          <button
                            onClick={() => toggleChapterCollapse(chap.id)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0 group"
                          >
                            <span className="text-muted-foreground group-hover:text-primary transition-colors">
                              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                  Chương {chapIdx + 1}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  {lessonList.length} bài
                                </span>
                              </div>
                              <h4 className="font-bold text-xs text-foreground mt-1 break-words line-clamp-2" title={chap.title}>
                                {chap.title}
                              </h4>
                            </div>
                          </button>

                          {/* Quick Actions cho Chương */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setAddingLessonToChapterId(addingLessonToChapterId === chap.id ? null : chap.id)}
                              className="p-1 rounded-lg text-primary hover:bg-primary/10 border border-primary/20"
                              title="Thêm bài học vào chương này"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingChapterModal({ id: chap.id, title: chap.title })}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                              title="Đổi tên chương"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteChapter(chap.id)}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 border border-border"
                              title="Xóa chương học"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Danh sách Bài học bên trong Chương (Khi không thu gọn) */}
                        {!isCollapsed && (
                          <div className="p-2 space-y-1.5 bg-background/50">
                            {/* Inline Form Thêm bài học mới */}
                            {addingLessonToChapterId === chap.id && (
                              <div className="p-2 bg-muted/20 border border-border rounded-lg space-y-2 mb-2 animate-fade-in">
                                <span className="text-[10px] font-bold text-primary block">Tên bài học mới:</span>
                                <input
                                  type="text"
                                  placeholder="Nhập tên bài học (VD: Bài 1. Tính đơn điệu...)"
                                  value={newLessonTitle}
                                  onChange={(e) => setNewLessonTitle(e.target.value)}
                                  className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddLesson(chap.id); }}
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => setAddingLessonToChapterId(null)}
                                    className="px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted rounded"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    onClick={() => handleAddLesson(chap.id)}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-primary text-primary-foreground rounded shadow-xs"
                                  >
                                    Tạo bài học
                                  </button>
                                </div>
                              </div>
                            )}

                            {lessonList.length === 0 ? (
                              <div className="py-4 text-center text-muted-foreground text-[11px] italic">
                                Chương này chưa có bài học nào.
                                <button
                                  onClick={() => setAddingLessonToChapterId(chap.id)}
                                  className="block mx-auto text-primary font-bold hover:underline mt-1"
                                >
                                  + Thêm bài học ngay
                                </button>
                              </div>
                            ) : (
                              lessonList.map((les, lesIdx) => {
                                const isSelected = selectedLessonId === les.id;
                                const hasTheory = !!(les.theory_markdown || les.theory_content || les.lesson_materials?.some(m => m.title === '__theory_markdown__'));
                                const matCount = (les.lesson_materials || []).filter(m => m.title !== '__theory_markdown__').length;
                                const examCount = localExams.filter(e => e.lesson_id === les.id).length;

                                return (
                                  <div
                                    key={les.id}
                                    onClick={() => {
                                      setSelectedLessonId(les.id);
                                      setSelectedChapterId(chap.id);
                                    }}
                                    className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/20'
                                        : 'bg-card border-border/70 hover:border-border hover:bg-muted/30 text-foreground'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 pr-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSelected ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                                        <span className="font-semibold break-words line-clamp-2" title={les.title}>
                                          {les.title}
                                        </span>
                                      </div>

                                      {/* Trạng thái học liệu của bài học */}
                                      <div className="flex items-center gap-2 mt-1.5 pl-3">
                                        {hasTheory && (
                                          <span className="text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.2 rounded border border-green-500/20">
                                            📝 Lý thuyết
                                          </span>
                                        )}
                                        {matCount > 0 && (
                                          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                                            📁 {matCount} tài liệu
                                          </span>
                                        )}
                                        {examCount > 0 && (
                                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                            🎯 {examCount} bài tập
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingLessonModal({ chapterId: chap.id, id: les.id, title: les.title });
                                        }}
                                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        title="Đổi tên bài học"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteLesson(chap.id, les.id);
                                        }}
                                        className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Xóa bài học"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* ==================================================== */}
            {/* CỘT PHẢI: KHÔNG GIAN BIÊN SOẠN BÀI HỌC (DETAIL WORKSPACE) */}
            {/* ==================================================== */}
            <div className="lg:col-span-8 space-y-4">
              {!selectedLessonId ? (
                /* CHƯA CHỌN BÀI HỌC (Trạng thái rỗng khi chưa có bài nào) */
                <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground shadow-sm flex flex-col items-center justify-center space-y-4 min-h-[450px]">
                  <div className="p-4 rounded-full bg-primary/10 text-primary">
                    <Library className="h-10 w-10" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="font-black text-base text-foreground">Không gian soạn thảo bài giảng chuyên nghiệp</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Hãy chọn một bài học ở cột bên trái hoặc tạo chương và bài học mới để bắt đầu soạn thảo lý thuyết Markdown, gắn video bài giảng và bộ câu hỏi trắc nghiệm tương ứng.
                    </p>
                  </div>
                </div>
              ) : (
                /* ĐÃ CHỌN BÀI HỌC CỤ THỂ HOẶC PHẦN LUYỆN TẬP CHUNG */
                <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 min-h-[550px]">
                  
                  {/* THANH HEADER TIÊU ĐỀ BÀI HỌC & BREADCRUMBS */}
                  <div className="border-b border-border pb-4 space-y-3">
                    {selectedLessonId !== 'general' && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold flex-wrap">
                        <span className="text-primary">{assignments.find(a => a.subject_id === selectedSubjectId)?.subjects?.name || 'Môn học'}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span>{activeChapter?.title || 'Chương học'}</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground font-bold">Bài học</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg sm:text-xl text-foreground">
                          {selectedLessonId === 'general' ? 'Đề luyện tập chung toàn môn học' : activeLesson?.title}
                        </h3>
                        {selectedLessonId !== 'general' && activeLesson && activeChapter && (
                          <button
                            onClick={() => setEditingLessonModal({ chapterId: activeChapter.id, id: activeLesson.id, title: activeLesson.title })}
                            className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                            title="Đổi tên bài học"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* SUB TABS SEGMENTED CONTROL */}
                      {selectedLessonId !== 'general' && (
                        <div className="flex bg-muted/40 border border-border p-1 rounded-xl shrink-0 self-start sm:self-auto gap-1">
                          <button
                            onClick={() => setRightPanelTab('theory')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              rightPanelTab === 'theory'
                                ? 'bg-background text-primary shadow-xs font-black'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Lý thuyết</span>
                          </button>
                          
                          <button
                            onClick={() => setRightPanelTab('materials')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              rightPanelTab === 'materials'
                                ? 'bg-background text-primary shadow-xs font-black'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Học liệu & Video ({((activeLesson?.lesson_materials || []).filter(m => m.title !== '__theory_markdown__')).length})</span>
                          </button>

                          <button
                            onClick={() => setRightPanelTab('exams')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              rightPanelTab === 'exams'
                                ? 'bg-background text-primary shadow-xs font-black'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span>Đề thi & Luyện tập ({activeExams.length})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* SUB TAB 1: LÝ THUYẾT MARKDOWN & KATEX (THEORY) */}
                  {/* ---------------------------------------------------- */}
                  {selectedLessonId !== 'general' && rightPanelTab === 'theory' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <h5 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" /> Soạn thảo Lý thuyết Bài học (Markdown & Công thức Toán KaTeX)
                          </h5>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            Trình soạn thảo trực quan hỗ trợ công thức Toán học chuẩn $LaTeX$, bảng biểu, định lý và ghi chú cho học sinh.
                          </p>
                        </div>
                      </div>

                      <TheoryEditor
                        key={selectedLessonId}
                        lessonTitle={activeLesson?.title || ''}
                        initialContent={
                          activeLesson?.theory_markdown || 
                          activeLesson?.theory_content || 
                          activeLesson?.lesson_materials?.find(m => m.title === '__theory_markdown__')?.source_url || 
                          ''
                        }
                        onSave={(content) => handleSaveTheory(selectedChapterId!, selectedLessonId!, content)}
                      />
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SUB TAB 2: HỌC LIỆU & VIDEO BÀI GIẢNG (MATERIALS) */}
                  {/* ---------------------------------------------------- */}
                  {selectedLessonId !== 'general' && rightPanelTab === 'materials' && (() => {
                    const visibleMaterials = (activeLesson?.lesson_materials || []).filter(m => m.title !== '__theory_markdown__');

                    return (
                      <div className="space-y-5 animate-fade-in">
                        {/* Header Học liệu */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                          <div>
                            <h5 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" /> Danh sách Học liệu & Video bài giảng ({visibleMaterials.length})
                            </h5>
                            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                              Liên kết các video bài giảng YouTube, Slide Google Presentation hoặc tệp tài liệu PDF Drive cho bài học này.
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setMaterialModal({
                                mode: 'create',
                                chapterId: selectedChapterId!,
                                lessonId: selectedLessonId!,
                                title: '',
                                material_type: 'video',
                                source_url: ''
                              });
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-xs shrink-0 self-start sm:self-auto"
                          >
                            <Plus className="h-3.5 w-3.5" /> Thêm học liệu mới
                          </button>
                        </div>

                        {/* Danh sách học liệu */}
                        {visibleMaterials.length === 0 ? (
                          <div className="text-center py-12 px-4 border border-dashed border-border rounded-2xl bg-muted/5 text-muted-foreground space-y-3">
                            <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-foreground">Bài học này chưa có học liệu hoặc video nào</p>
                              <p className="text-[11px] text-muted-foreground">Thêm video bài giảng hoặc tài liệu để học sinh có thể ôn tập hiệu quả.</p>
                            </div>
                            <button
                              onClick={() => {
                                setMaterialModal({
                                  mode: 'create',
                                  chapterId: selectedChapterId!,
                                  lessonId: selectedLessonId!,
                                  title: '',
                                  material_type: 'video',
                                  source_url: ''
                                });
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 rounded-xl transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" /> Thêm học liệu đầu tiên
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {visibleMaterials.map(mat => {
                              const isYoutube = mat.material_type === 'video' && (mat.source_url.includes('youtube.com') || mat.source_url.includes('youtu.be'));
                              const isEmbedVideo = isYoutube && mat.source_url.includes('embed');

                              return (
                                <div
                                  key={mat.id}
                                  className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:shadow-sm hover:border-primary/40 transition-all group"
                                >
                                  <div className="space-y-2">
                                    {/* Type badge and actions */}
                                    <div className="flex items-center justify-between">
                                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                        mat.material_type === 'video' ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                                        mat.material_type === 'slide' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                        mat.material_type === 'pdf' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                                        'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                      }`}>
                                        {mat.material_type === 'video' && <Video className="h-3 w-3" />}
                                        {mat.material_type === 'slide' && <Presentation className="h-3 w-3" />}
                                        {mat.material_type === 'pdf' && <FileText className="h-3 w-3" />}
                                        {mat.material_type === 'attachment' && <Paperclip className="h-3 w-3" />}
                                        <span>
                                          {mat.material_type === 'video' ? 'Video Bài Giảng' :
                                           mat.material_type === 'slide' ? 'Slide Trình Chiếu' :
                                           mat.material_type === 'pdf' ? 'Tài Liệu PDF' : 'Tài Liệu Khác'}
                                        </span>
                                      </span>

                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setMaterialModal({
                                              mode: 'edit',
                                              chapterId: selectedChapterId!,
                                              lessonId: selectedLessonId!,
                                              materialId: mat.id,
                                              title: mat.title,
                                              material_type: mat.material_type,
                                              source_url: mat.source_url
                                            });
                                          }}
                                          className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted border border-border"
                                          title="Chỉnh sửa học liệu"
                                        >
                                          <Edit3 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMaterial(selectedChapterId!, selectedLessonId!, mat.id)}
                                          className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-border"
                                          title="Xóa học liệu"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Tiêu đề tài liệu */}
                                    <h6 className="font-black text-sm text-foreground line-clamp-2 leading-snug">
                                      {mat.title}
                                    </h6>

                                    {/* Video Player Preview nếu là link YouTube Embed */}
                                    {isEmbedVideo && (
                                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/5 border border-border mt-2">
                                        <iframe
                                          src={mat.source_url}
                                          title={mat.title}
                                          className="w-full h-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Link và Button mở xem */}
                                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                                    <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={mat.source_url}>
                                      {mat.source_url}
                                    </span>
                                    <a
                                      href={mat.source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline shrink-0 text-[11px]"
                                    >
                                      <span>Mở xem</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ---------------------------------------------------- */}
                  {/* SUB TAB 3: ĐỀ THI & BÀI TẬP TỰ LUYỆN (EXAMS) */}
                  {/* ---------------------------------------------------- */}
                  {(selectedLessonId === 'general' || rightPanelTab === 'exams') && (
                    <div className="space-y-6 animate-fade-in">
                      
                      {/* Header Đề thi */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                        <div>
                          <h5 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-primary" />
                            {selectedLessonId === 'general' 
                              ? `Đề luyện thi chung toàn môn học (${activeExams.length})` 
                              : `Bài tập tự luyện theo bài (${activeExams.length})`}
                          </h5>
                          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            {selectedLessonId === 'general' 
                              ? 'Danh sách đề luyện thi chung, kiểm tra tổng hợp môn học' 
                              : `Bộ câu hỏi trắc nghiệm tự luyện gắn liền với bài học: ${activeLesson?.title || ''}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          <button
                            onClick={() => {
                              const isGeneral = selectedLessonId === 'general';
                              setEditingExamModal({
                                id: `new-${Date.now()}`,
                                title: isGeneral ? 'Đề luyện thi thử' : `Bài tập tự luyện: ${activeLesson?.title || 'Bài học'}`,
                                duration_minutes: 15,
                                exam_type: isGeneral ? 'test' : 'lesson',
                                lesson_id: isGeneral ? null : selectedLessonId
                              });
                            }}
                            className="flex items-center gap-1.5 text-xs font-extrabold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" /> Tạo bài tập trắc nghiệm mới
                          </button>
                        </div>
                      </div>

                      {/* Banner gợi ý chuyển sang Ngân hàng Đề thi THPTQG */}
                      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-muted-foreground font-medium">
                            Cần quản lý <strong>Đề kiểm tra 15p, 45p, Đề thi THPTQG</strong> hoặc <strong>Đánh giá năng lực</strong> tập trung?
                          </span>
                        </div>
                        <a
                          href="/dashboard/teacher/exams"
                          className="inline-flex items-center gap-1 font-bold text-primary hover:underline shrink-0"
                        >
                          <span>Mở Ngân Hàng Đề Thi</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      {/* Danh sách đề thi */}
                      <div className="space-y-3">
                        {activeExams.length === 0 ? (
                          <div className="text-center py-12 px-4 border border-dashed border-border rounded-2xl bg-card text-muted-foreground space-y-3">
                            <ClipboardList className="h-10 w-10 text-primary/30 mx-auto" />
                            <p className="text-xs font-bold text-foreground">Chưa có bài tập trắc nghiệm nào cho mục này.</p>
                            <button
                              onClick={() => {
                                const isGeneral = selectedLessonId === 'general';
                                setEditingExamModal({
                                  id: `new-${Date.now()}`,
                                  title: isGeneral ? 'Đề luyện thi thử' : `Bài tập tự luyện: ${activeLesson?.title || 'Bài học'}`,
                                  duration_minutes: 15,
                                  exam_type: isGeneral ? 'test' : 'lesson',
                                  lesson_id: isGeneral ? null : selectedLessonId
                                });
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 rounded-xl transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" /> Bắt đầu tạo bài tập đầu tiên
                            </button>
                          </div>
                        ) : (
                          activeExams.map(exam => {
                            const examQuestions = localQuestions.filter(q => q.exam_id === exam.id);

                            return (
                              <div key={exam.id} className="border border-border bg-card rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs hover:border-primary/40 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        exam.exam_type === 'lesson' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                                        exam.exam_type === 'test' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                        'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                      }`}>
                                        {exam.exam_type === 'lesson' ? 'Luyện tập theo bài' : exam.exam_type === 'test' ? 'Kiểm tra 15p/45p' : 'Luyện thi THPTQG'}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" /> {exam.duration_minutes} phút
                                      </span>
                                      <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1">
                                        <HelpCircle className="h-3.5 w-3.5" /> {examQuestions.length} câu hỏi
                                      </span>
                                    </div>
                                    <h6 className="font-extrabold text-sm sm:text-base text-foreground">
                                      {exam.title}
                                    </h6>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => setEditingExamModal(exam)}
                                      className="text-xs font-bold bg-primary text-primary-foreground px-3.5 py-1.5 rounded-xl hover:opacity-90 flex items-center gap-1.5 shadow-xs"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" /> Soạn câu hỏi & Sửa đề
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExam(exam.id)}
                                      className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-xl border border-border"
                                      title="Xóa đề thi"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Preview 2 câu hỏi đầu tiên của đề thi */}
                                {examQuestions.length > 0 && (
                                  <div className="pt-2 border-t border-border/60 grid gap-2 sm:grid-cols-2 text-xs">
                                    {examQuestions.slice(0, 2).map((q, qIdx) => (
                                      <div key={q.id || qIdx} className="bg-muted/20 border border-border/80 rounded-xl p-2.5 space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                                          <span>Câu {qIdx + 1} ({q.question_type || 'MCQ'})</span>
                                          <span className="text-primary">{q.level || 'Nhận biết'}</span>
                                        </div>
                                        <div className="line-clamp-2 text-foreground font-semibold">
                                          <MathRenderer content={q.content} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 3. CÁC POPUP MODALS QUẢN TRỊ TRỰC QUAN (KHÔNG DÙNG PROMPT) */}
      {/* ==================================================== */}

      {/* MODAL SỬA TÊN CHƯƠNG */}
      {editingChapterModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingChapterModal(null)}
        >
          <div 
            className="bg-card border border-border max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-primary" /> Đổi tên Chương học
              </h3>
              <button onClick={() => setEditingChapterModal(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Tên chương mới</label>
              <input
                type="text"
                value={editingChapterModal.title}
                onChange={(e) => setEditingChapterModal({ ...editingChapterModal, title: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nhập tên chương..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveChapterModal(); }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setEditingChapterModal(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveChapterModal}
                className="px-5 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-xs hover:opacity-90"
              >
                Lưu cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA TÊN BÀI HỌC */}
      {editingLessonModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingLessonModal(null)}
        >
          <div 
            className="bg-card border border-border max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-primary" /> Đổi tên Bài học
              </h3>
              <button onClick={() => setEditingLessonModal(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Tên bài học mới</label>
              <input
                type="text"
                value={editingLessonModal.title}
                onChange={(e) => setEditingLessonModal({ ...editingLessonModal, title: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Nhập tên bài học..."
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLessonModal(); }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setEditingLessonModal(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveLessonModal}
                className="px-5 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-xs hover:opacity-90"
              >
                Lưu cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA HỌC LIỆU & VIDEO */}
      {materialModal && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setMaterialModal(null)}
        >
          <div 
            className="bg-card border border-border max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-primary" />
                {materialModal.mode === 'create' ? 'Đăng tải học liệu mới' : 'Chỉnh sửa thông tin học liệu'}
              </h3>
              <button onClick={() => setMaterialModal(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Tên tài liệu / Video</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Video bài giảng phần 1 - Ứng dụng đạo hàm..."
                  value={materialModal.title}
                  onChange={(e) => setMaterialModal({ ...materialModal, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Loại học liệu</label>
                <select
                  value={materialModal.material_type}
                  onChange={(e) => setMaterialModal({ ...materialModal, material_type: e.target.value as any })}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-primary"
                >
                  <option value="video">🎥 Video bài giảng (YouTube - Hỗ trợ xem trực tiếp)</option>
                  <option value="slide">📊 Slide trình chiếu (Google Slides / Canva)</option>
                  <option value="pdf">📄 Tài liệu đọc (Google Drive / PDF Online)</option>
                  <option value="attachment">📎 File đính kèm / Khác</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Đường dẫn tài liệu (Source URL)</label>
                <input
                  type="text"
                  placeholder="Dán đường link YouTube, Google Drive, Slide tại đây..."
                  value={materialModal.source_url}
                  onChange={(e) => setMaterialModal({ ...materialModal, source_url: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[10px] text-muted-foreground font-medium">
                  {materialModal.material_type === 'video' 
                    ? '💡 Hỗ trợ mọi link YouTube (hệ thống sẽ tự động chuyển thành video phát ngay trong ứng dụng).'
                    : '💡 Hãy đảm bảo đường dẫn Google Drive/Slide đã được cài đặt quyền "Bất kỳ ai có đường liên kết đều có thể xem".'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setMaterialModal(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveMaterialModal}
                disabled={!materialModal.title.trim() || !materialModal.source_url.trim()}
                className="px-5 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {materialModal.mode === 'create' ? 'Đăng tải học liệu' : 'Lưu cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SOẠN ĐỀ THI & CÂU HỎI CHUẨN FMATH 2026 */}
      {editingExamModal && (
        <ExamEditorModal
          isOpen={!!editingExamModal}
          onClose={() => setEditingExamModal(null)}
          exam={editingExamModal}
          initialQuestions={localQuestions.filter(q => q.exam_id === editingExamModal.id)}
          onSave={handleSaveExamModal}
          lessonTitle={activeLesson?.title}
          subjectName={assignments.find(a => a.subject_id === selectedSubjectId)?.subjects?.name}
        />
      )}

    </div>
  );
}
