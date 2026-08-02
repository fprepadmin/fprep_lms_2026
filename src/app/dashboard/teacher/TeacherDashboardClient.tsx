'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Users, Plus, Trash2, Edit3, Check, X, 
  Video, FileText, ChevronRight, Play,
  ChevronDown, BarChart2, Clock, Award, HelpCircle,
  ClipboardList, CheckSquare, Library, ArrowLeft, ExternalLink
} from 'lucide-react';

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
  student_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string;
  last_accessed_at: string;
}

interface StudyLog {
  student_id: string;
  lesson_id: string;
  duration_seconds: number;
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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    assignments.length > 0 ? assignments[0].subject_id : ''
  );

  // Cấu trúc cây bài học
  const [localChapters, setLocalChapters] = useState<Chapter[]>(chapters);
  const [localExams, setLocalExams] = useState<any[]>(exams);
  const [localQuestions, setLocalQuestions] = useState<any[]>(questions);

  // Trạng thái chọn trong Master-Detail Workspace
  // selectedLessonId = 'general' có nghĩa là chọn phần luyện tập chung môn học
  const [selectedLessonId, setSelectedLessonId] = useState<string | 'general' | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Right Panel: Sub tabs ('materials' vs 'exams')
  const [rightPanelTab, setRightPanelTab] = useState<'materials' | 'exams'>('materials');

  // Trạng thái các Form thêm mới
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

  // 7. Thêm Đề thi
  const handleAddExam = async () => {
    if (!newExamTitle.trim()) return;
    try {
      const isGeneral = selectedLessonId === 'general';
      const { data, error } = await supabase.from('exams').insert({
        subject_id: selectedSubjectId,
        lesson_id: isGeneral ? null : selectedLessonId,
        title: newExamTitle.trim(),
        duration_minutes: Number(newExamDuration)
      }).select().single();

      if (error) throw error;
      setLocalExams([...localExams, data]);
      setNewExamTitle('');
      setNewExamDuration(15);
      setAddingExam(false);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo đề thi.');
    }
  };

  // 8. Xóa Đề thi
  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đề thi này?')) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
      setLocalExams(localExams.filter(e => e.id !== examId));
      if (activeEditingExamId === examId) setActiveEditingExamId(null);
    } catch (err) {
      console.error(err);
      alert('Không thể xóa đề thi.');
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
      p.completed
    );
    const studentLogs = logs.filter(l => 
      l.student_id === studentId && 
      activeSubjectLessonIds.includes(l.lesson_id)
    );
    const completedCount = studentProgress.length;
    const totalCount = activeSubjectLessonIds.length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const totalMinutes = Math.round(studentLogs.reduce((acc, log) => acc + log.duration_seconds, 0) / 60);

    const studentAllProgress = progress.filter(p => p.student_id === studentId && activeSubjectLessonIds.includes(p.lesson_id));
    const lastAccess = studentAllProgress.length > 0 
      ? new Date(Math.max(...studentAllProgress.map(p => new Date(p.last_accessed_at).getTime()))).toLocaleDateString('vi-VN')
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
  const filteredChapters = localChapters.filter(c => c.subject_id === selectedSubjectId);
  
  // Xác định thông tin của bài học đang chọn
  const activeChapter = localChapters.find(c => c.id === selectedChapterId);
  const activeLesson = activeChapter?.lessons?.find(l => l.id === selectedLessonId);

  // Lọc đề thi theo Bài học đang chọn (hoặc đề chung môn học)
  const activeExams = localExams.filter(exam => {
    if (selectedLessonId === 'general') {
      return exam.subject_id === selectedSubjectId && !exam.lesson_id;
    }
    return exam.lesson_id === selectedLessonId;
  });

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
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="bg-blue-500/10 text-blue-500 p-2.5 rounded-lg border border-blue-500/20"><Users className="h-5 w-5" /></div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Học sinh lớp</span>
                      <h4 className="text-xl font-black">{filteredStudents.length} học sinh</h4>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="bg-emerald-500/10 text-emerald-500 p-2.5 rounded-lg border border-emerald-500/20"><BarChart2 className="h-5 w-5" /></div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Tiến độ trung bình</span>
                      <h4 className="text-xl font-black">{getClassAverage()}% hoàn thành</h4>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg border border-primary/20"><Clock className="h-5 w-5" /></div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Tổng số bài học</span>
                      <h4 className="text-xl font-black">{activeSubjectLessonIds.length} bài giảng</h4>
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
                  className="fixed inset-0 z-50 bg-slate-500/10 backdrop-blur-md flex items-center justify-center p-4"
                  onClick={() => setSelectedStudentDetail(null)}
                >
                  <div 
                    className="bg-card border border-border max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card flex flex-col max-h-[85vh]"
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
          
          {/* Tiêu đề môn học đang soạn thảo */}
          {assignments.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-lg flex items-center justify-between text-xs font-bold text-primary">
              <span>Đang soạn thảo học liệu cho môn học của Thầy/Cô: <strong className="text-foreground">{assignments.find(a => a.subject_id === selectedSubjectId)?.subjects?.name}</strong></span>
            </div>
          )}

          {/* TWO-COLUMN (SPLIT-SCREEN) WORKSPACE LAYOUT */}
          <div className="grid gap-6 md:grid-cols-12 items-start">
            
            {/* COLUMN 1: LEFT SIDEBAR - TREE OF CHAPTERS & LESSONS */}
            <div className="md:col-span-4 bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm max-h-[75vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Library className="h-4.5 w-4.5 text-primary" /> Cấu trúc bài giảng
                </h3>
                
                {addingChapter ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Chương mới..."
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      className="rounded border border-border bg-background px-2 py-1 text-[11px] focus:outline-none w-28"
                    />
                    <button onClick={handleAddChapter} className="p-1 rounded bg-green-500 text-white hover:opacity-90"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setAddingChapter(false)} className="p-1 rounded bg-red-500 text-white hover:opacity-90"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingChapter(true)}
                    className="flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded"
                  >
                    <Plus className="h-3 w-3" /> Thêm Chương
                  </button>
                )}
              </div>

              {/* Luyện tập chung môn học */}
              <button
                onClick={() => { setSelectedLessonId('general'); setSelectedChapterId(null); setRightPanelTab('exams'); }}
                className={`w-full text-left flex items-center justify-between p-2.5 rounded-lg text-xs font-bold border transition-colors ${selectedLessonId === 'general' ? 'bg-primary/5 border-primary text-primary' : 'bg-background hover:bg-muted/10 border-border'}`}
              >
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  Đề luyện tập chung môn học
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <div className="space-y-3.5 divide-y divide-border/50">
                {filteredChapters.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Môn học này chưa có chương học nào.</p>
                ) : (
                  filteredChapters.map((chap, chapIdx) => (
                    <div key={chap.id} className="pt-3 first:pt-0 space-y-2">
                      {/* Tiêu đề Chương */}
                      <div className="flex justify-between items-center group">
                        <span className="font-extrabold text-[11px] text-muted-foreground truncate" title={chap.title}>
                          Chương {chapIdx + 1}: {chap.title}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              const newTitle = prompt('Nhập tên chương học mới:', chap.title);
                              if (newTitle) handleUpdateChapter(chap.id, newTitle);
                            }}
                            className="text-primary hover:bg-primary/10 p-0.5 rounded"
                            title="Sửa chương"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(chap.id)}
                            className="text-red-500 hover:bg-red-500/10 p-0.5 rounded"
                            title="Xóa chương"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Các bài học trong chương */}
                      <div className="grid gap-1 pl-1.5 border-l border-border/70">
                        {(chap.lessons || []).map(les => {
                          const isSelected = selectedLessonId === les.id;
                          return (
                            <div 
                              key={les.id}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer group ${isSelected ? 'bg-primary border-primary text-primary-foreground font-extrabold' : 'bg-background border-border hover:bg-muted/20 text-foreground'}`}
                              onClick={() => { setSelectedLessonId(les.id); setSelectedChapterId(chap.id); }}
                            >
                              <span className="truncate">{les.title}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newTitle = prompt('Nhập tên bài học mới:', les.title);
                                    if (newTitle) handleUpdateLesson(chap.id, les.id, newTitle);
                                  }}
                                  className={`p-0.5 rounded hover:bg-muted/50 ${isSelected ? 'text-primary-foreground hover:bg-white/10' : 'text-primary'}`}
                                  title="Sửa bài học"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteLesson(chap.id, les.id); }}
                                  className={`p-0.5 rounded hover:bg-red-500/20 text-red-500 ${isSelected ? 'text-primary-foreground hover:bg-white/10' : ''}`}
                                  title="Xóa bài học"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Thêm bài học mới */}
                        {addingLessonToChapterId === chap.id ? (
                          <div className="flex items-center gap-1 mt-1 bg-muted/20 p-1.5 rounded-lg border border-border">
                            <input
                              type="text"
                              placeholder="Bài học mới..."
                              value={newLessonTitle}
                              onChange={(e) => setNewLessonTitle(e.target.value)}
                              className="rounded border border-border bg-background px-2 py-1 text-[11px] focus:outline-none flex-1"
                            />
                            <button onClick={() => handleAddLesson(chap.id)} className="p-1 rounded bg-green-500 text-white hover:opacity-90"><Check className="h-3 w-3" /></button>
                            <button onClick={() => setAddingLessonToChapterId(null)} className="p-1 rounded bg-red-500 text-white hover:opacity-90"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingLessonToChapterId(chap.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:underline pt-1 pl-1"
                          >
                            <Plus className="h-3 w-3" /> Thêm Bài học
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: RIGHT DETAIL PANEL (ACTIVE LESSON / EXAM WORKSPACE) */}
            <div className="md:col-span-8 space-y-4">
              {!selectedLessonId ? (
                /* CHƯA CHỌN BÀI HỌC */
                <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[350px]">
                  <Library className="h-12 w-12 text-primary/40 animate-pulse" />
                  <h4 className="font-extrabold text-sm text-foreground">Không gian soạn thảo bài giảng</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Chọn một bài học cụ thể bên cột bên trái để bắt đầu đăng tải học liệu, liên kết video bài giảng hoặc biên soạn bộ đề kiểm tra tương ứng.
                  </p>
                </div>
              ) : (
                /* ĐÃ CHỌN BÀI HỌC CỤ THỂ HOẶC PHẦN LUYỆN TẬP CHUNG */
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5 min-h-[450px]">
                  
                  {/* TIÊU ĐỀ BÀI HỌC ĐANG CHỌN */}
                  <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-black text-lg text-foreground flex items-center gap-2">
                        {selectedLessonId === 'general' ? 'Đề luyện tập chung môn học' : `Bài học: ${activeLesson?.title}`}
                      </h4>
                      {selectedLessonId !== 'general' && (
                        <p className="text-[10px] text-muted-foreground font-semibold">Thuộc chương: {activeChapter?.title}</p>
                      )}
                    </div>

                    {/* LỰA CHỌN SUB TAB CHO RIGHT PANEL */}
                    {selectedLessonId !== 'general' && (
                      <div className="flex bg-muted/30 border border-border/80 rounded-lg p-1 shrink-0 self-start sm:self-center">
                        <button
                          onClick={() => setRightPanelTab('materials')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all ${rightPanelTab === 'materials' ? 'bg-background border border-border shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          Tài liệu & Học liệu
                        </button>
                        <button
                          onClick={() => setRightPanelTab('exams')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all ${rightPanelTab === 'exams' ? 'bg-background border border-border shadow-sm text-primary' : 'text-muted-foreground'}`}
                        >
                          Đề thi & Luyện tập
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* SUB TAB: HỌC LIỆU / TÀI LIỆU (MATERIALS) */}
                  {/* ---------------------------------------------------- */}
                  {selectedLessonId !== 'general' && rightPanelTab === 'materials' && (
                    <div className="space-y-4">
                      {/* Header phần Học liệu */}
                      <div className="flex justify-between items-center">
                        <h5 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-primary" /> Học liệu được liên kết ({activeLesson?.lesson_materials?.length || 0})
                        </h5>

                        {!addingMaterial && (
                          <button
                            onClick={() => setAddingMaterial(true)}
                            className="flex items-center gap-1 text-[11px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90"
                          >
                            <Plus className="h-3.5 w-3.5" /> Thêm học liệu mới
                          </button>
                        )}
                      </div>

                      {/* Form Thêm học liệu mới */}
                      {addingMaterial && (
                        <div className="bg-muted/10 border border-border p-4 rounded-xl space-y-4 animate-fade-in">
                          <div className="flex justify-between items-center border-b border-border pb-2">
                            <h6 className="font-bold text-xs">Liên kết học liệu tự học mới</h6>
                            <button onClick={() => setAddingMaterial(false)} className="text-muted-foreground hover:bg-muted p-1 rounded">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên tài liệu / Video</label>
                              <input
                                type="text"
                                placeholder="Ví dụ: Slide bài giảng, Video hướng dẫn..."
                                value={newMaterialTitle}
                                onChange={(e) => setNewMaterialTitle(e.target.value)}
                                className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Loại học liệu</label>
                              <select
                                value={newMaterialType}
                                onChange={(e) => setNewMaterialType(e.target.value as any)}
                                className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-semibold text-primary"
                              >
                                <option value="video">Video giảng dạy (Youtube)</option>
                                <option value="pdf">Tài liệu PDF (Google Drive)</option>
                                <option value="slide">Slide (Google Slide)</option>
                                <option value="attachment">Học liệu khác</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Đường dẫn tài liệu (Source URL)</label>
                            <input
                              type="text"
                              placeholder="Dán link Youtube/Drive/Slide của bạn tại đây..."
                              value={newMaterialUrl}
                              onChange={(e) => setNewMaterialUrl(e.target.value)}
                              className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleAddMaterial(selectedChapterId!, selectedLessonId!)}
                              className="flex items-center gap-1 rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                            >
                              Đăng tải
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Danh sách các tài liệu hiện tại */}
                      <div className="space-y-3">
                        {(!activeLesson?.lesson_materials || activeLesson.lesson_materials.length === 0) ? (
                          <div className="text-center py-10 border border-dashed border-border rounded-xl bg-card text-muted-foreground">
                            <p className="text-xs italic">Bài giảng này hiện tại chưa được liên kết bất cứ học liệu nào.</p>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {activeLesson.lesson_materials.map(mat => (
                              <div key={mat.id} className="bg-muted/10 border border-border rounded-xl p-4 flex flex-col justify-between space-y-4 hover:shadow-sm transition-shadow">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block mb-1">
                                    {mat.material_type}
                                  </span>
                                  <h6 className="font-extrabold text-xs text-foreground line-clamp-1">{mat.title}</h6>
                                  <p className="text-[10px] text-muted-foreground truncate">{mat.source_url}</p>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                  <a
                                    href={mat.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-bold text-secondary flex items-center gap-1 hover:underline"
                                  >
                                    Xem link <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        const newTitle = prompt('Nhập tên tài liệu mới:', mat.title);
                                        if (newTitle) {
                                          const newUrl = prompt('Nhập đường dẫn tài liệu mới:', mat.source_url);
                                          if (newUrl) {
                                            handleUpdateMaterial(selectedChapterId!, selectedLessonId!, mat.id, { title: newTitle, source_url: newUrl });
                                          }
                                        }
                                      }}
                                      className="text-primary hover:bg-primary/10 p-1.5 rounded"
                                      title="Sửa tài liệu"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMaterial(selectedChapterId!, selectedLessonId!, mat.id)}
                                      className="text-red-500 hover:bg-red-500/10 p-1.5 rounded"
                                      title="Xóa tài liệu"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SUB TAB: ĐỀ THI & CÂU HỎI (EXAMS) */}
                  {/* ---------------------------------------------------- */}
                  {(selectedLessonId === 'general' || rightPanelTab === 'exams') && (
                    <div className="space-y-6">
                      
                      {/* Header Đề thi */}
                      <div className="flex justify-between items-center">
                        <h5 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare className="h-4 w-4 text-primary" /> Đề luyện tập & Thi thử ({activeExams.length})
                        </h5>

                        {!addingExam && (
                          <button
                            onClick={() => setAddingExam(true)}
                            className="flex items-center gap-1 text-[11px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90"
                          >
                            <Plus className="h-3.5 w-3.5" /> Tạo đề thi mới
                          </button>
                        )}
                      </div>

                      {/* Form tạo đề thi */}
                      {addingExam && (
                        <div className="bg-muted/10 border border-border p-4 rounded-xl space-y-4 animate-fade-in">
                          <div className="flex justify-between items-center border-b border-border pb-2">
                            <h6 className="font-bold text-xs">Khởi tạo đề thi mới</h6>
                            <button onClick={() => setAddingExam(false)} className="text-muted-foreground hover:bg-muted p-1 rounded">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Tiêu đề đề luyện tập</label>
                              <input
                                type="text"
                                placeholder="Ví dụ: Bài tập trắc nghiệm bài 1..."
                                value={newExamTitle}
                                onChange={(e) => setNewExamTitle(e.target.value)}
                                className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Thời lượng làm bài (Phút)</label>
                              <input
                                type="number"
                                placeholder="15"
                                value={newExamDuration}
                                onChange={(e) => setNewExamDuration(Number(e.target.value))}
                                className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              onClick={handleAddExam}
                              className="flex items-center gap-1 rounded-lg bg-green-500 px-4 py-2 text-xs font-bold text-white hover:opacity-90"
                            >
                              Tạo đề thi
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Danh sách đề thi */}
                      <div className="space-y-4">
                        {activeExams.length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-border rounded-xl bg-card text-muted-foreground">
                            <p className="text-xs italic">Không tìm thấy đề thi/bài tập trắc nghiệm nào cho khu vực này.</p>
                          </div>
                        ) : (
                          activeExams.map(exam => {
                            const examQuestions = localQuestions.filter(q => q.exam_id === exam.id);
                            const isEditing = activeEditingExamId === exam.id;

                            return (
                              <div key={exam.id} className="border border-border bg-muted/10 rounded-xl p-4 space-y-4">
                                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                  <div>
                                    <h6 className="font-extrabold text-xs text-foreground flex items-center gap-1">
                                      <ClipboardList className="h-4 w-4 text-secondary" /> {exam.title}
                                    </h6>
                                    <p className="text-[9px] text-muted-foreground mt-0.5">
                                      Thời gian: {exam.duration_minutes} phút &bull; Số câu hỏi: {examQuestions.length} câu
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setActiveEditingExamId(isEditing ? null : exam.id)}
                                      className="text-[10px] font-bold bg-secondary px-3 py-1.5 rounded-lg text-secondary-foreground hover:opacity-90"
                                    >
                                      {isEditing ? 'Đóng câu hỏi' : 'Soạn câu hỏi'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const newTitle = prompt('Nhập tên đề thi mới:', exam.title);
                                        if (newTitle) {
                                          const newDur = prompt('Nhập thời lượng thi mới (phút):', String(exam.duration_minutes));
                                          if (newDur) {
                                            handleUpdateExam(exam.id, { title: newTitle, duration_minutes: Number(newDur) });
                                          }
                                        }
                                      }}
                                      className="text-primary hover:bg-primary/10 p-1.5 rounded-lg border border-border bg-background"
                                      title="Sửa đề thi"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExam(exam.id)}
                                      className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"
                                      title="Xóa đề thi"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* BẢNG SOẠN THẢO CÂU HỎI TRỰC QUAN (QUIZ EDITOR) */}
                                {isEditing && (
                                  <div className="space-y-6 pl-4 border-l-2 border-primary/20 animate-fade-in">
                                    
                                    {/* 1. Danh sách câu hỏi */}
                                    <div className="space-y-3">
                                      <h6 className="font-extrabold text-[10px] text-muted-foreground uppercase">Danh sách câu hỏi ({examQuestions.length})</h6>
                                      {examQuestions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">Chưa biên soạn câu hỏi nào cho đề này.</p>
                                      ) : (
                                        examQuestions.map((q, qIdx) => (
                                          <div key={q.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                                            <div className="flex justify-between items-start gap-4">
                                              <p className="font-bold text-xs text-foreground">
                                                <span className="text-primary mr-1">Câu {qIdx + 1}:</span> {q.content}
                                              </p>
                                              <div className="flex items-center gap-1">
                                                <button
                                                  onClick={() => {
                                                    const newContent = prompt('Nội dung câu hỏi:', q.content);
                                                    if (!newContent) return;
                                                    const newA = prompt('Đáp án A:', q.options[0]);
                                                    const newB = prompt('Đáp án B:', q.options[1]);
                                                    const newC = prompt('Đáp án C:', q.options[2] || '');
                                                    const newD = prompt('Đáp án D:', q.options[3] || '');
                                                    const correctIdxStr = prompt('Chỉ số đáp án đúng (0 cho A, 1 cho B, 2 cho C, 3 cho D):', String(q.correct_option_index));
                                                    if (newA && newB && correctIdxStr) {
                                                      handleUpdateQuestion(q.id, {
                                                        content: newContent,
                                                        options: [newA, newB, newC, newD].filter((o): o is string => !!o),
                                                        correct_option_index: Number(correctIdxStr)
                                                      });
                                                    }
                                                  }}
                                                  className="text-primary hover:bg-primary/10 p-0.5 rounded"
                                                  title="Sửa câu hỏi"
                                                >
                                                  <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:bg-red-500/10 p-0.5 rounded" title="Xóa câu hỏi">
                                                  <X className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            <div className="grid gap-1.5 sm:grid-cols-2 pl-3">
                                              {(q.options || []).map((opt: string, optIdx: number) => (
                                                <div 
                                                  key={optIdx} 
                                                  className={`p-1.5 rounded text-[10px] border ${
                                                    q.correct_option_index === optIdx 
                                                      ? 'bg-green-500/10 border-green-500/20 text-green-700 font-bold' 
                                                      : 'bg-background border-border text-muted-foreground'
                                                  }`}
                                                >
                                                  {opt}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>

                                    {/* 2. Form biên soạn câu hỏi mới */}
                                    <div className="bg-card border border-border p-4 rounded-xl space-y-4">
                                      <h6 className="font-extrabold text-xs text-primary uppercase flex items-center gap-1">
                                        <HelpCircle className="h-4 w-4" /> Biên soạn câu hỏi mới
                                      </h6>

                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Nội dung câu hỏi trắc nghiệm</label>
                                        <textarea
                                          placeholder="Nhập đề bài câu hỏi..."
                                          value={newQuestionContent}
                                          onChange={(e) => setNewQuestionContent(e.target.value)}
                                          rows={2}
                                          className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                                        />
                                      </div>

                                      <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Phương án A</label>
                                          <input
                                            type="text"
                                            placeholder="Đáp án A..."
                                            value={newQuestionOptA}
                                            onChange={(e) => setNewQuestionOptA(e.target.value)}
                                            className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Phương án B</label>
                                          <input
                                            type="text"
                                            placeholder="Đáp án B..."
                                            value={newQuestionOptB}
                                            onChange={(e) => setNewQuestionOptB(e.target.value)}
                                            className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Phương án C</label>
                                          <input
                                            type="text"
                                            placeholder="Đáp án C..."
                                            value={newQuestionOptC}
                                            onChange={(e) => setNewQuestionOptC(e.target.value)}
                                            className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Phương án D</label>
                                          <input
                                            type="text"
                                            placeholder="Đáp án D..."
                                            value={newQuestionOptD}
                                            onChange={(e) => setNewQuestionOptD(e.target.value)}
                                            className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-border/50 pt-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Đáp án đúng:</span>
                                          <select
                                            value={newQuestionCorrectIndex}
                                            onChange={(e) => setNewQuestionCorrectIndex(Number(e.target.value))}
                                            className="rounded border border-border bg-background px-2.5 py-1 text-xs focus:outline-none font-bold text-green-500"
                                          >
                                            <option value={0}>Đáp án A</option>
                                            <option value={1}>Đáp án B</option>
                                            <option value={2}>Đáp án C</option>
                                            <option value={3}>Đáp án D</option>
                                          </select>
                                        </div>

                                        <button
                                          onClick={() => handleAddQuestion(exam.id)}
                                          className="flex items-center gap-1 text-xs font-bold bg-green-500 text-white px-4 py-2 rounded-lg hover:opacity-90"
                                        >
                                          <Plus className="h-3.5 w-3.5" /> Thêm câu hỏi
                                        </button>
                                      </div>
                                    </div>

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

    </div>
  );
}
