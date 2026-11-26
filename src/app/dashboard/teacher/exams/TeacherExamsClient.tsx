'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  ClipboardList, Plus, Search, Clock, HelpCircle, 
  Trash2, Edit3, Copy, Award, CheckCircle2, 
  Filter, Layers, BookOpen, AlertCircle, X, Sparkles,
  Send, Users, BarChart2, CheckSquare, ArrowRight,
  Download, Eye, Calendar, FileText, Check, AlertTriangle, Trophy, TrendingUp
} from 'lucide-react';
import ExamEditorModal, { QuestionData } from '@/components/exam/ExamEditorModal';
import AssignExamModal, { AssignmentPayload, ClassItem } from '@/components/exam/AssignExamModal';
import StudentSubmissionDetailModal, { SubmissionData } from '@/components/exam/StudentSubmissionDetailModal';
import StudentAttemptsModal, { StudentAttemptItem } from '@/components/exam/StudentAttemptsModal';
import MathRenderer, { cleanMathContent } from '@/components/MathRenderer';

interface Subject {
  id: string;
  name: string;
  group_type: string;
}

interface Exam {
  id: string;
  subject_id: string;
  lesson_id?: string | null;
  title: string;
  duration_minutes: number;
  exam_type?: string;
  subjects?: { name: string };
  created_at?: string;
}

export type ExamCategory = 
  | 'all' 
  | 'topic' 
  | 'regular' 
  | 'mid_term_1' 
  | 'final_term_1' 
  | 'mid_term_2' 
  | 'final_term_2' 
  | 'thptqg' 
  | 'vsat' 
  | 'dgnl';

interface Question {
  id: string;
  exam_id: string;
  content: string;
  question_type?: 'mcq' | 'tf' | 'saq';
  type?: 'mcq' | 'tf' | 'saq';
  options: any;
  correct_answer?: any;
  correct_option_index?: number;
  explanation?: string;
  level?: string;
  points?: number;
  order_index?: number;
}

interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_spent_seconds: number;
  created_at: string;
  answers?: any;
  student?: {
    full_name: string;
    mshs: string;
    class_id?: string;
  };
}

interface ExamAssignment {
  id?: string;
  exam_id: string;
  class_id: string;
  teacher_id?: string;
  due_date?: string | null;
  start_date?: string | null;
  note?: string | null;
  score_weight?: string | null;
  created_at?: string;
  classes?: { id: string; name: string; group_type?: string };
}

interface TeacherExamsClientProps {
  exams: Exam[];
  questions: Question[];
  examResults: ExamResult[];
  examAssignments?: ExamAssignment[];
  assignments: any[];
  allSubjects: Subject[];
  allClasses?: any[];
  students?: any[];
  chapters: any[];
  token: string;
  teacherId: string;
}

export default function TeacherExamsClient({
  exams: initialExams,
  questions: initialQuestions,
  examResults: initialExamResults,
  examAssignments: initialExamAssignments = [],
  assignments,
  allSubjects,
  allClasses = [],
  students = [],
  chapters,
  token,
  teacherId
}: TeacherExamsClientProps) {
  const supabase = createSupabaseClient(token);

  // ----------------------------------------------------
  // LOCAL STATE
  // ----------------------------------------------------
  const [localExams, setLocalExams] = useState<Exam[]>(initialExams);
  const [localQuestions, setLocalQuestions] = useState<Question[]>(initialQuestions);
  const [localExamResults, setLocalExamResults] = useState<ExamResult[]>(initialExamResults);
  const [localExamAssignments, setLocalExamAssignments] = useState<ExamAssignment[]>(initialExamAssignments);

  // Đồng bộ và bảo tồn vĩnh viễn phân công đề thi qua LocalStorage cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem('fprep_exam_assignments_cache');
      if (cached) {
        const parsed: ExamAssignment[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalExamAssignments(prev => {
            const map = new Map<string, ExamAssignment>();
            prev.forEach(item => map.set(`${item.exam_id}_${item.class_id}`, item));
            parsed.forEach(item => {
              const key = `${item.exam_id}_${item.class_id}`;
              if (!map.has(key)) {
                map.set(key, item);
              }
            });
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      console.warn('Sync assignments cache error:', e);
    }
  }, []);

  // Tabs: 'bank' (Ngân hàng đề thi) vs 'questions' (Ngân hàng câu hỏi) vs 'submissions' (Quản lý nộp bài & Sổ điểm)
  const [mainTab, setMainTab] = useState<'bank' | 'questions' | 'submissions'>('bank');

  // Ngân hàng câu hỏi State
  const [qbSearchKeyword, setQbSearchKeyword] = useState<string>('');
  const [qbSubjectFilter, setQbSubjectFilter] = useState<string>('all');
  const [qbLevelFilter, setQbLevelFilter] = useState<string>('all');
  const [qbTypeFilter, setQbTypeFilter] = useState<string>('all');
  const [expandedExplanationIds, setExpandedExplanationIds] = useState<Set<string>>(new Set());
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);

  const toggleExplanation = (qid: string) => {
    setExpandedExplanationIds(prev => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  };

  const handleCopyQuestionJson = (q: Question) => {
    const formatted = {
      type: q.question_type || q.type || 'mcq',
      level: q.level || 'Nhận biết',
      points: q.points || (q.question_type === 'tf' ? 1.0 : q.question_type === 'saq' ? 0.5 : 0.25),
      content: q.content,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    };
    navigator.clipboard.writeText(JSON.stringify(formatted, null, 2));
    setCopiedQuestionId(q.id);
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  // Ngân hàng đề thi State
  const [activeCategory, setActiveCategory] = useState<ExamCategory>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategory, setNewCategory] = useState<Exclude<ExamCategory, 'all'>>('topic');
  const [newSubjectId, setNewSubjectId] = useState<string>(
    assignments[0]?.subject_id || allSubjects[0]?.id || ''
  );
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState<number>(45);

  const [editingExamModal, setEditingExamModal] = useState<any | null>(null);
  
  // Giao bài cho lớp Modal
  const [assigningExam, setAssigningExam] = useState<Exam | null>(null);

  // Quản lý nộp bài State
  const [selectedGradeView, setSelectedGradeView] = useState<'block' | 'class'>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    allClasses[0]?.id || assignments[0]?.class_id || 'all'
  );
  const [selectedExamFilterId, setSelectedExamFilterId] = useState<string>('all');
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'all' | 'submitted' | 'unsubmitted'>('all');
  const [studentSearchKeyword, setStudentSearchKeyword] = useState<string>('');
  const [scoreMode, setScoreMode] = useState<'best' | 'all'>('best');
  
  // Xem chi tiết bài thi học sinh
  const [inspectingSubmission, setInspectingSubmission] = useState<SubmissionData | null>(null);

  // Modal xem lịch sử tất cả các lần nộp của học sinh
  const [viewingAttemptsData, setViewingAttemptsData] = useState<{
    studentName: string;
    studentMshs: string;
    className: string;
    examTitle: string;
    attempts: StudentAttemptItem[];
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper lấy danh sách các lớp khả dụng
  const availableClasses: ClassItem[] = allClasses.length > 0
    ? allClasses
    : assignments.map(a => a.classes).filter(Boolean);

  // Helper phân loại đề thi theo 9 nhóm chuyên biệt chuẩn FPREP
  const getExamCategory = (exam: Exam): Exclude<ExamCategory, 'all'> => {
    const rawType = exam.exam_type;
    if (rawType) {
      if (rawType === 'topic' || rawType === 'lesson') return 'topic';
      if (rawType === 'regular') return 'regular';
      if (rawType === 'mid_term_1') return 'mid_term_1';
      if (rawType === 'final_term_1') return 'final_term_1';
      if (rawType === 'mid_term_2') return 'mid_term_2';
      if (rawType === 'final_term_2') return 'final_term_2';
      if (rawType === 'thptqg') return 'thptqg';
      if (rawType === 'vsat') return 'vsat';
      if (rawType === 'dgnl') return 'dgnl';
    }

    const title = (exam.title || '').toLowerCase();
    if (title.includes('vsat') || title.includes('v-sat')) return 'vsat';
    if (title.includes('đgnl') || title.includes('đánh giá năng lực') || title.includes('tsa') || title.includes('hsa') || title.includes('tư duy')) return 'dgnl';
    if (title.includes('thpt') || title.includes('tốt nghiệp') || title.includes('quốc gia') || title.includes('thi thử')) return 'thptqg';
    
    // Giữa kỳ & Cuối kỳ
    if (title.includes('giữa kỳ 1') || title.includes('giữa kì 1') || title.includes('gki 1') || title.includes('gk 1') || title.includes('gk1')) return 'mid_term_1';
    if (title.includes('cuối kỳ 1') || title.includes('cuối kì 1') || title.includes('cki 1') || title.includes('ck 1') || title.includes('ck1') || title.includes('học kỳ 1') || title.includes('học kì 1') || title.includes('hk1') || title.includes('hk 1')) return 'final_term_1';
    if (title.includes('giữa kỳ 2') || title.includes('giữa kì 2') || title.includes('gki 2') || title.includes('gk 2') || title.includes('gk2')) return 'mid_term_2';
    if (title.includes('cuối kỳ 2') || title.includes('cuối kì 2') || title.includes('cki 2') || title.includes('ck 2') || title.includes('ck2') || title.includes('học kỳ 2') || title.includes('học kì 2') || title.includes('hk2') || title.includes('hk 2')) return 'final_term_2';

    // Thường xuyên
    if (title.includes('thường xuyên') || title.includes('15p') || title.includes('15 phút') || title.includes('10p') || title.includes('miệng')) return 'regular';

    // Xử lý các đề gán 'test' cũ trong database
    if (rawType === 'test') {
      if (title.includes('giữa') || title.includes('45') || title.includes('1 tiết')) return 'mid_term_1';
      if (title.includes('cuối') || title.includes('học kỳ')) return 'final_term_1';
      return 'regular';
    }

    if (exam.lesson_id || title.includes('chủ đề') || title.includes('chuyên đề') || title.includes('bài tập') || title.includes('luyện tập')) return 'topic';

    return 'topic';
  };

  // Lọc danh sách đề thi
  const filteredExams = localExams.filter(exam => {
    const cat = getExamCategory(exam);
    if (activeCategory !== 'all' && cat !== activeCategory) {
      return false;
    }
    if (selectedSubjectId !== 'all' && exam.subject_id !== selectedSubjectId) {
      return false;
    }
    if (assignmentFilter === 'assigned') {
      const isAssigned = localExamAssignments.some(a => a.exam_id === exam.id);
      if (!isAssigned) return false;
    } else if (assignmentFilter === 'unassigned') {
      const isAssigned = localExamAssignments.some(a => a.exam_id === exam.id);
      if (isAssigned) return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchTitle = (exam.title || '').toLowerCase().includes(kw);
      const matchSub = (exam.subjects?.name || '').toLowerCase().includes(kw);
      if (!matchTitle && !matchSub) return false;
    }
    return true;
  });

  // Thống kê nhanh ngân hàng đề theo từng phân loại
  const stats = {
    total: localExams.length,
    assignedCount: localExams.filter(e => localExamAssignments.some(a => a.exam_id === e.id)).length,
    topic: localExams.filter(e => getExamCategory(e) === 'topic').length,
    regular: localExams.filter(e => getExamCategory(e) === 'regular').length,
    mid_term_1: localExams.filter(e => getExamCategory(e) === 'mid_term_1').length,
    final_term_1: localExams.filter(e => getExamCategory(e) === 'final_term_1').length,
    mid_term_2: localExams.filter(e => getExamCategory(e) === 'mid_term_2').length,
    final_term_2: localExams.filter(e => getExamCategory(e) === 'final_term_2').length,
    thptqg: localExams.filter(e => getExamCategory(e) === 'thptqg').length,
    vsat: localExams.filter(e => getExamCategory(e) === 'vsat').length,
    dgnl: localExams.filter(e => getExamCategory(e) === 'dgnl').length,
    totalAssignments: localExamAssignments.length,
    totalResults: localExamResults.length
  };

  // Lọc câu hỏi trong ngân hàng câu hỏi
  const filteredQuestions = localQuestions.filter(q => {
    const qType = q.question_type || q.type || 'mcq';
    if (qbTypeFilter !== 'all' && qType !== qbTypeFilter) return false;
    if (qbLevelFilter !== 'all' && (q.level || 'Nhận biết') !== qbLevelFilter) return false;
    if (qbSubjectFilter !== 'all') {
      const parentExam = localExams.find(e => e.id === q.exam_id);
      if (parentExam && parentExam.subject_id !== qbSubjectFilter) return false;
    }
    if (qbSearchKeyword.trim()) {
      const kw = qbSearchKeyword.toLowerCase();
      const matchContent = (q.content || '').toLowerCase().includes(kw);
      const matchExplanation = (q.explanation || '').toLowerCase().includes(kw);
      if (!matchContent && !matchExplanation) return false;
    }
    return true;
  });

  // Thống kê ngân hàng câu hỏi
  const qbStats = {
    total: localQuestions.length,
    mcq: localQuestions.filter(q => (q.question_type || q.type || 'mcq') === 'mcq').length,
    tf: localQuestions.filter(q => (q.question_type || q.type) === 'tf').length,
    saq: localQuestions.filter(q => (q.question_type || q.type) === 'saq').length,
    byLevel: {
      nb: localQuestions.filter(q => (q.level || 'Nhận biết') === 'Nhận biết').length,
      th: localQuestions.filter(q => q.level === 'Thông hiểu').length,
      vd: localQuestions.filter(q => q.level === 'Vận dụng').length,
      vdc: localQuestions.filter(q => q.level === 'Vận dụng cao').length,
    }
  };

  const handleExportQuestionsJson = () => {
    const exportData = filteredQuestions.map(q => ({
      type: q.question_type || q.type || 'mcq',
      level: q.level || 'Nhận biết',
      points: q.points || (q.question_type === 'tf' ? 1.0 : q.question_type === 'saq' ? 0.5 : 0.25),
      content: q.content,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fprep_question_bank_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------
  // LOGIC GIAO BÀI CHO LỚP (ASSIGN EXAM ENGINE)
  // ----------------------------------------------------
  const handleOpenAssignModal = (exam: Exam) => {
    setAssigningExam(exam);
  };

  const handleSaveAssignments = async (payloads: AssignmentPayload[]) => {
    if (!assigningExam) return;

    try {
      // 1. Lưu phân công vào Cloud Store bền vững qua API chuyên trách
      const apiRes = await fetch('/api/teacher/exam-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exam_id: assigningExam.id,
          assignments: payloads,
          teacher_id: teacherId
        })
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        console.warn('API save assignments warning:', errJson);
      }

      // 2. Thử cập nhật song song bảng exam_assignments nếu DB có sẵn
      try {
        await supabase.from('exam_assignments').delete().eq('exam_id', assigningExam.id);
        const nowIso = new Date().toISOString();
        const dbRecords = payloads.map(p => ({
          id: crypto.randomUUID(),
          exam_id: assigningExam.id,
          class_id: p.class_id,
          teacher_id: teacherId,
          due_date: p.due_date,
          start_date: p.start_date || nowIso,
          note: p.note,
          score_weight: p.score_weight,
          created_at: nowIso
        }));
        await supabase.from('exam_assignments').insert(dbRecords);
      } catch (dbErr) {
        // Bỏ qua nếu bảng chưa tồn tại
      }

      // 3. Cập nhật State cục bộ chuẩn xác kèm thông tin lớp
      const nowIso = new Date().toISOString();
      const finalInserted = payloads.map(p => ({
        id: crypto.randomUUID(),
        exam_id: assigningExam.id,
        class_id: p.class_id,
        teacher_id: teacherId,
        due_date: p.due_date || null,
        start_date: p.start_date || nowIso,
        note: p.note || null,
        score_weight: p.score_weight || null,
        created_at: nowIso,
        classes: availableClasses.find(c => c.id === p.class_id) || { id: p.class_id, name: 'Lớp học' }
      }));

      setLocalExamAssignments(prev => {
        const updated = [
          ...prev.filter(a => a.exam_id !== assigningExam.id),
          ...finalInserted
        ];
        try {
          localStorage.setItem('fprep_exam_assignments_cache', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      alert(`Giao đề thi "${assigningExam.title}" cho ${payloads.length} lớp thành công! Trạng thái đã giao và số lượng hoàn thành sẽ được lưu giữ vĩnh viễn.`);
    } catch (err: any) {
      console.error(err);
      alert('Không thể lưu giao bài: ' + err.message);
    }
  };

  // ----------------------------------------------------
  // LOGIC CRUD ĐỀ THI (EXAM CRUD)
  // ----------------------------------------------------
  const handleOpenCreateModal = (cat?: Exclude<ExamCategory, 'all'>) => {
    const targetCat = cat || (activeCategory === 'all' ? 'topic' : activeCategory);
    setNewCategory(targetCat);
    
    // Gợi ý thời lượng phù hợp theo từng loại đề thi
    const durationMap: Record<Exclude<ExamCategory, 'all'>, number> = {
      topic: 30,
      regular: 15,
      mid_term_1: 45,
      final_term_1: 90,
      mid_term_2: 45,
      final_term_2: 90,
      thptqg: 50,
      vsat: 60,
      dgnl: 60
    };
    setNewDuration(durationMap[targetCat] || 45);

    // Luôn khóa newSubjectId vào môn phụ trách hợp lệ của giáo viên
    if (!newSubjectId || !allSubjects.some(s => s.id === newSubjectId)) {
      setNewSubjectId(allSubjects[0]?.id || assignments[0]?.subject_id || '');
    }

    const titleMap: Record<Exclude<ExamCategory, 'all'>, string> = {
      topic: 'Đề luyện tập theo chủ đề: ',
      regular: 'Đề kiểm tra thường xuyên 15 phút: ',
      mid_term_1: 'Đề kiểm tra giữa học kỳ 1: ',
      final_term_1: 'Đề kiểm tra cuối học kỳ 1: ',
      mid_term_2: 'Đề kiểm tra giữa học kỳ 2: ',
      final_term_2: 'Đề kiểm tra cuối học kỳ 2: ',
      thptqg: 'Đề thi thử Tốt nghiệp THPT Quốc Gia 2026',
      vsat: 'Đề thi thử đánh giá năng lực đầu vào V-SAT',
      dgnl: 'Đề thi Đánh giá Năng lực (ĐGNL / TSA)'
    };
    setNewTitle(titleMap[targetCat] || 'Đề thi mới');
    setShowCreateModal(true);
  };

  const handleCreateNewExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Vui lòng nhập tên đề thi!');
      return;
    }

    const tempExam = {
      id: `new-${Date.now()}`,
      title: newTitle.trim(),
      subject_id: newSubjectId,
      exam_type: newCategory,
      duration_minutes: Number(newDuration),
      lesson_id: null
    };

    setShowCreateModal(false);
    setEditingExamModal(tempExam);
  };

  const handleDeleteExam = async (examId: string) => {
    const examToDelete = localExams.find(e => e.id === examId);
    const examName = examToDelete?.title ? `"${examToDelete.title}"` : 'đề thi này';

    if (!confirm(`Bạn có chắc chắn muốn xóa ${examName}?\n\nLƯU Ý: Toàn bộ câu hỏi, phân công giao bài cho lớp và kết quả làm bài của học sinh đối với đề thi này sẽ bị xóa vĩnh viễn!`)) {
      return;
    }

    try {
      // 1. Thử gọi API Server route trước (sử dụng quyền Admin bypass RLS)
      const res = await fetch('/api/exams/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Nếu API thất bại, fallback xóa trực tiếp qua client theo thứ tự cascade
        await supabase.from('exam_results').delete().eq('exam_id', examId);
        await supabase.from('questions').delete().eq('exam_id', examId);
        await supabase.from('exam_assignments').delete().eq('exam_id', examId);
        const { error: directErr } = await supabase.from('exams').delete().eq('id', examId);
        if (directErr) {
          throw new Error(errorData.error || directErr.message);
        }
      }

      // 2. Dọn sạch toàn bộ state cục bộ liên quan đến đề thi
      setLocalExams(prev => prev.filter(e => e.id !== examId));
      setLocalQuestions(prev => prev.filter(q => q.exam_id !== examId));
      setLocalExamAssignments(prev => prev.filter(a => a.exam_id !== examId));
      setLocalExamResults(prev => prev.filter(r => r.exam_id !== examId));

      // Reset các modal / filter đang trỏ tới đề thi này
      if (selectedExamFilterId === examId) {
        setSelectedExamFilterId('all');
      }
      if (inspectingSubmission?.exam_id === examId) {
        setInspectingSubmission(null);
      }
      if (editingExamModal?.id === examId) {
        setEditingExamModal(null);
      }
      if (assigningExam?.id === examId) {
        setAssigningExam(null);
      }

      alert('Đã xóa đề thi cùng toàn bộ dữ liệu câu hỏi, giao bài và điểm thi liên quan thành công!');
    } catch (err: any) {
      console.error('Lỗi khi xóa đề thi:', err);
      alert('Không thể xóa đề thi: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleDuplicateExam = async (exam: Exam) => {
    const questionsToClone = localQuestions.filter(q => q.exam_id === exam.id);
    const newExamTitle = `${exam.title} (Bản sao)`;
    
    try {
      const { data: clonedExam, error: examErr } = await supabase
        .from('exams')
        .insert({
          subject_id: exam.subject_id,
          lesson_id: null,
          title: newExamTitle,
          exam_type: exam.exam_type || getExamCategory(exam),
          duration_minutes: exam.duration_minutes || 45
        })
        .select('*, subjects(*)')
        .single();

      if (examErr) throw examErr;

      if (questionsToClone.length > 0) {
        const clonedQuestions = questionsToClone.map((q, idx) => ({
          exam_id: clonedExam.id,
          content: q.content,
          question_type: q.question_type || q.type || 'mcq',
          options: q.options,
          correct_option_index: q.correct_option_index,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          level: q.level || 'Nhận biết',
          points: (q as any).points !== undefined ? Number((q as any).points) : ((q.question_type || q.type) === 'tf' ? 1.0 : (q.question_type || q.type) === 'saq' ? 0.5 : 0.25),
          order_index: idx + 1
        }));

        let insertedQs: any[] | null = null;
        const { data: resData, error: qsErr } = await supabase
          .from('questions')
          .insert(clonedQuestions)
          .select();

        if (qsErr && (qsErr.message?.includes('column') || qsErr.message?.includes('schema cache'))) {
          const fallbackCloned = clonedQuestions.map(({ points, ...rest }) => rest);
          const fallbackRes = await supabase.from('questions').insert(fallbackCloned).select();
          if (fallbackRes.error) throw fallbackRes.error;
          insertedQs = fallbackRes.data;
        } else if (qsErr) {
          throw qsErr;
        } else {
          insertedQs = resData;
        }

        setLocalQuestions(prev => [...prev, ...(insertedQs || [])]);
      }

      setLocalExams(prev => [clonedExam, ...prev]);

      // Ghi nhận giáo viên nhân bản/tạo đề thi mới
      try {
        await fetch('/api/teacher/exam-assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            exam_id: clonedExam.id,
            action: 'record_author',
            teacher_id: teacherId,
            title: newExamTitle
          })
        });
      } catch (e) {
        console.warn('Record author warning:', e);
      }

      alert(`Đã nhân bản đề thi thành công: "${newExamTitle}"!`);
    } catch (err: any) {
      alert('Không thể nhân bản đề thi: ' + err.message);
    }
  };

  const handleSaveExamModal = async (examMeta: any, questionsData: QuestionData[]) => {
    const isNew = String(editingExamModal.id).startsWith('new-');
    let savedExamId = editingExamModal.id;

    try {
      if (!isNew) {
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
          .select('*, subjects(*)')
          .single();

        if (res1.error && (res1.error.message?.includes('exam_type') || res1.error.message?.includes('schema cache'))) {
          const { exam_type, ...fallbackPayload } = examUpdatePayload;
          const fallbackRes = await supabase
            .from('exams')
            .update(fallbackPayload)
            .eq('id', savedExamId)
            .select('*, subjects(*)')
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          updatedExam = fallbackRes.data;
        } else if (res1.error) {
          throw res1.error;
        } else {
          updatedExam = res1.data;
        }

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
          points: q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : (q.type === 'tf' ? 1.0 : q.type === 'saq' ? 0.5 : 0.25),
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
        let newExam: any = null;
        const examInsertPayload = {
          subject_id: examMeta.subject_id || newSubjectId,
          lesson_id: null,
          title: examMeta.title,
          exam_type: examMeta.exam_type || newCategory,
          duration_minutes: Number(examMeta.duration_minutes) || 45
        };

        const res1 = await supabase
          .from('exams')
          .insert(examInsertPayload)
          .select('*, subjects(*)')
          .single();

        if (res1.error && (res1.error.message?.includes('exam_type') || res1.error.message?.includes('schema cache'))) {
          const { exam_type, ...fallbackPayload } = examInsertPayload;
          const fallbackRes = await supabase
            .from('exams')
            .insert(fallbackPayload)
            .select('*, subjects(*)')
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
          points: q.points !== undefined && !isNaN(Number(q.points)) ? Number(q.points) : (q.type === 'tf' ? 1.0 : q.type === 'saq' ? 0.5 : 0.25),
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

        setLocalExams(prev => [newExam, ...prev]);
        setLocalQuestions(prev => [...prev, ...(qRes.data || [])]);
      }

      // Chỉ ghi nhận tác giả khi giáo viên tạo/upload đề thi mới (không ghi đè khi sửa đề của giáo viên khác)
      if (isNew) {
        try {
          await fetch('/api/teacher/exam-assignments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              exam_id: savedExamId,
              action: 'record_author',
              teacher_id: teacherId,
              title: examMeta.title
            })
          });
        } catch (e) {
          console.warn('Record author warning:', e);
        }
      }

      alert('Đã lưu đề thi và câu hỏi thành công!');
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // ----------------------------------------------------
  // LOGIC QUẢN LÝ NỘP BÀI & SỔ ĐIỂM (GRADEBOOK ENGINE)
  // ----------------------------------------------------

  // Lấy lớp phụ trách đang chọn (nếu chọn cụ thể)
  const targetClass = availableClasses.find(c => c.id === selectedClassId);

  // Danh sách học sinh thuộc lớp đang chọn (hoặc tất cả các lớp nếu 'all')
  const classStudents = students.filter(s => {
    if (selectedClassId === 'all') return true;
    return s.class_id === selectedClassId;
  });

  // Danh sách các đề thi được giao cho lớp này (hoặc tất cả đề thi nếu 'all')
  const assignedExamsForClass = localExams.filter(exam => {
    if (selectedClassId === 'all') return true;
    return localExamAssignments.some(a => a.exam_id === exam.id && a.class_id === selectedClassId);
  });

  // Đề thi đang chọn để xem báo cáo (nếu 'all' thì là null để hiển thị toàn bộ)
  const activeExamReport = selectedExamFilterId !== 'all' 
    ? (localExams.find(e => e.id === selectedExamFilterId) || null)
    : null;

  // Xây dựng danh sách kết quả nộp bài
  const examSubmissions = (() => {
    const studentIds = new Set(classStudents.map(s => s.student_id));
    const studentMap = new Map(classStudents.map(s => [s.student_id, s]));

    if (activeExamReport) {
      // Chế độ 1: Xem cụ thể 1 đề thi
      if (scoreMode === 'best') {
        return classStudents.map(student => {
          const studentResults = localExamResults
            .filter(r => r.student_id === student.student_id && r.exam_id === activeExamReport.id)
            .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

          const bestResult = studentResults.length > 0
            ? studentResults.reduce((prev, curr) => (Number(curr.score) > Number(prev.score) ? curr : prev), studentResults[0])
            : null;

          const assignmentInfo = localExamAssignments.find(
            a => a.exam_id === activeExamReport.id && a.class_id === student.class_id
          );

          return {
            student,
            exam: activeExamReport,
            result: bestResult,
            allAttempts: studentResults,
            attemptsCount: studentResults.length,
            isSubmitted: Boolean(bestResult),
            assignment: assignmentInfo
          };
        });
      } else {
        // Hiện tất cả các lần nộp của từng học sinh
        const items: any[] = [];
        classStudents.forEach(student => {
          const studentResults = localExamResults
            .filter(r => r.student_id === student.student_id && r.exam_id === activeExamReport.id)
            .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

          const assignmentInfo = localExamAssignments.find(
            a => a.exam_id === activeExamReport.id && a.class_id === student.class_id
          );

          if (studentResults.length > 0) {
            studentResults.forEach((res, idx) => {
              items.push({
                student,
                exam: activeExamReport,
                result: res,
                allAttempts: studentResults,
                attemptsCount: studentResults.length,
                attemptIndex: studentResults.length - idx,
                isSubmitted: true,
                assignment: assignmentInfo
              });
            });
          } else {
            items.push({
              student,
              exam: activeExamReport,
              result: null,
              allAttempts: [],
              attemptsCount: 0,
              isSubmitted: false,
              assignment: assignmentInfo
            });
          }
        });
        return items;
      }
    }

    // Chế độ 2: Xem tất cả đề thi (selectedExamFilterId === 'all')
    if (scoreMode === 'best') {
      const resultsForClass = localExamResults.filter(r => studentIds.has(r.student_id));
      const studentExamMap = new Map<string, any[]>();

      resultsForClass.forEach(r => {
        const key = `${r.student_id}_${r.exam_id}`;
        if (!studentExamMap.has(key)) {
          studentExamMap.set(key, []);
        }
        studentExamMap.get(key)!.push(r);
      });

      const submittedItems: any[] = [];
      studentExamMap.forEach((attempts, key) => {
        const [studentId, examId] = key.split('_');
        const student = studentMap.get(studentId);
        if (!student) return;

        const exam = localExams.find(e => e.id === examId) || {
          id: examId,
          title: 'Đề kiểm tra',
          duration_minutes: 45,
          subjects: undefined
        };

        const bestResult = attempts.reduce((prev, curr) => (Number(curr.score) > Number(prev.score) ? curr : prev), attempts[0]);
        const assignmentInfo = localExamAssignments.find(
          a => a.exam_id === examId && a.class_id === student.class_id
        );

        submittedItems.push({
          student,
          exam,
          result: bestResult,
          allAttempts: attempts,
          attemptsCount: attempts.length,
          isSubmitted: true,
          assignment: assignmentInfo
        });
      });

      // Sắp xếp bài nộp mới nhất lên đầu
      submittedItems.sort((a, b) => new Date(b.result?.created_at || '').getTime() - new Date(a.result?.created_at || '').getTime());

      // Thêm các học sinh chưa làm bài nào
      const submittedStudentIds = new Set(resultsForClass.map(r => r.student_id));
      const unsubmittedStudents = classStudents
        .filter(s => !submittedStudentIds.has(s.student_id))
        .map(student => ({
          student,
          exam: null as any,
          result: null as any,
          allAttempts: [],
          attemptsCount: 0,
          isSubmitted: false,
          assignment: undefined
        }));

      return [...submittedItems, ...unsubmittedStudents];
    } else {
      // Hiện toàn bộ bài nộp rời rạc
      const resultsForClass = localExamResults
        .filter(r => studentIds.has(r.student_id))
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

      const submittedItems = resultsForClass.map(r => {
        const student = studentMap.get(r.student_id)!;
        const exam = localExams.find(e => e.id === r.exam_id) || {
          id: r.exam_id,
          title: 'Đề kiểm tra',
          duration_minutes: 45,
          subjects: undefined
        };
        const assignmentInfo = localExamAssignments.find(
          a => a.exam_id === r.exam_id && a.class_id === student.class_id
        );

        const studentExamResults = localExamResults.filter(res => res.student_id === r.student_id && res.exam_id === r.exam_id);

        return {
          student,
          exam,
          result: r,
          allAttempts: studentExamResults,
          attemptsCount: studentExamResults.length,
          isSubmitted: true,
          assignment: assignmentInfo
        };
      });

      const submittedStudentIds = new Set(resultsForClass.map(r => r.student_id));
      const unsubmittedStudents = classStudents
        .filter(s => !submittedStudentIds.has(s.student_id))
        .map(student => ({
          student,
          exam: null as any,
          result: null as any,
          allAttempts: [],
          attemptsCount: 0,
          isSubmitted: false,
          assignment: undefined
        }));

      return [...submittedItems, ...unsubmittedStudents];
    }
  })();

  // Lọc học sinh theo trạng thái & từ khóa
  const filteredSubmissions = examSubmissions.filter(item => {
    if (submissionStatusFilter === 'submitted' && !item.isSubmitted) return false;
    if (submissionStatusFilter === 'unsubmitted' && item.isSubmitted) return false;
    if (studentSearchKeyword.trim()) {
      const kw = studentSearchKeyword.toLowerCase();
      const matchName = (item.student.full_name || '').toLowerCase().includes(kw);
      const matchMshs = (item.student.mshs || '').toLowerCase().includes(kw);
      if (!matchName && !matchMshs) return false;
    }
    return true;
  });

  // Thống kê chi tiết
  const totalClassStudents = classStudents.length;
  const submittedCount = examSubmissions.filter(s => s.isSubmitted).length;
  const unsubmittedCount = examSubmissions.filter(s => !s.isSubmitted).length;
  const submissionRate = totalClassStudents > 0 
    ? Math.round((new Set(examSubmissions.filter(s => s.isSubmitted).map(s => s.student.student_id)).size / totalClassStudents) * 100) 
    : 0;

  const validScores = examSubmissions.filter(s => s.result).map(s => Number(s.result!.score));
  const avgScore = validScores.length > 0 
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
    : '0.0';
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : 0;
  const minScore = validScores.length > 0 ? Math.min(...validScores) : 0;

  // Phổ điểm (Giỏi >=8, Khá 6.5-7.9, TB 5.0-6.4, Yếu <5.0)
  const scoreDistribution = {
    excellent: validScores.filter(s => s >= 8.0).length,
    good: validScores.filter(s => s >= 6.5 && s < 8.0).length,
    average: validScores.filter(s => s >= 5.0 && s < 6.5).length,
    weak: validScores.filter(s => s < 5.0).length
  };

  // Thống kê toàn khối 12
  const blockStats = availableClasses.map(cls => {
    const clsStudents = students.filter(s => s.class_id === cls.id);
    const clsStudentIds = clsStudents.map(s => s.student_id);
    const clsResults = localExamResults.filter(r => clsStudentIds.includes(r.student_id));
    
    const clsScores = clsResults.map(r => Number(r.score));
    const clsAvg = clsScores.length > 0 ? (clsScores.reduce((a, b) => a + b, 0) / clsScores.length).toFixed(1) : '0.0';
    
    const assignedCount = localExamAssignments.filter(a => a.class_id === cls.id).length;
    const submittedStudentCount = new Set(clsResults.map(r => r.student_id)).size;
    const clsRate = clsStudents.length > 0 ? Math.round((submittedStudentCount / clsStudents.length) * 100) : 0;

    return {
      class: cls,
      totalStudents: clsStudents.length,
      assignedCount,
      submittedStudentCount,
      completionRate: clsRate,
      avgScore: clsAvg,
      excellentCount: clsScores.filter(s => s >= 8.0).length,
      goodCount: clsScores.filter(s => s >= 6.5 && s < 8.0).length,
      averageCount: clsScores.filter(s => s >= 5.0 && s < 6.5).length,
      weakCount: clsScores.filter(s => s < 5.0).length
    };
  });

  // Xuất bảng điểm CSV
  const handleExportCSV = () => {
    let csvContent = `STT,MSHS,Họ và tên,Lớp,Đề thi,Điểm số,Số câu đúng,Thời gian làm bài,Thời điểm nộp bài,Trạng thái\n`;

    filteredSubmissions.forEach((item, idx) => {
      const stt = idx + 1;
      const mshs = item.student.mshs || '';
      const name = `"${item.student.full_name || ''}"`;
      const clsName = item.student.classes?.name || availableClasses.find(c => c.id === item.student.class_id)?.name || targetClass?.name || '12';
      const examTitle = `"${item.exam?.title || activeExamReport?.title || 'Đề thi'}"`;
      const score = item.result ? item.result.score : '';
      const correct = item.result ? `${item.result.correct_answers}/${item.result.total_questions || 0}` : '';
      const timeSpent = item.result ? `${Math.floor((item.result.time_spent_seconds || 0) / 60)} phút ${(item.result.time_spent_seconds || 0) % 60}s` : '';
      const date = item.result?.created_at ? new Date(item.result.created_at).toLocaleString('vi-VN') : '';
      const status = item.isSubmitted ? 'Đã nộp' : 'Chưa làm';

      csvContent += `${stt},${mshs},${name},${clsName},${examTitle},${score},${correct},${timeSpent},${date},${status}\n`;
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const downloadFileName = `BangDiem_${targetClass?.name || 'TatCaLop'}_${activeExamReport ? activeExamReport.title.replace(/\s+/g, '_') : 'TatCaDeThi'}.csv`;
    link.setAttribute('download', downloadFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mở modal xem bài thi học sinh
  const handleInspectStudentTest = (item: any) => {
    if (!item.result) return;

    const examId = item.result.exam_id || item.exam?.id || activeExamReport?.id;
    const examObj = item.exam || localExams.find(e => e.id === examId) || activeExamReport;
    const studentClass = item.student.classes?.name || availableClasses.find(c => c.id === item.student.class_id)?.name || targetClass?.name || '12';

    const submissionPayload: SubmissionData = {
      id: item.result.id,
      student_id: item.student.student_id,
      exam_id: examId,
      score: Number(item.result.score),
      correct_answers: Number(item.result.correct_answers),
      total_questions: Number(item.result.total_questions || 0),
      time_spent_seconds: Number(item.result.time_spent_seconds || 0),
      created_at: item.result.created_at,
      answers: item.result.answers,
      student: {
        full_name: item.student.full_name,
        mshs: item.student.mshs,
        classes: { name: studentClass }
      },
      exams: {
        title: examObj?.title || 'Đề thi',
        duration_minutes: examObj?.duration_minutes || 45,
        subjects: examObj?.subjects
      }
    };

    setInspectingSubmission(submissionPayload);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ==================================================== */}
      {/* THANH CHUYỂN TAB CHÍNH CHUẨN LMS */}
      {/* ==================================================== */}
      <div className="flex items-center gap-3 border-b border-border pb-3 overflow-x-auto">
        <button
          onClick={() => setMainTab('bank')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            mainTab === 'bank'
              ? 'bg-[#1746D1] text-white shadow-md'
              : 'bg-white dark:bg-[#0B1B55]/80 border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-slate-300 hover:bg-[#F8FAFC]'
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Ngân Hàng Đề Thi ({localExams.length})
        </button>

        <button
          onClick={() => setMainTab('questions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            mainTab === 'questions'
              ? 'bg-[#1746D1] text-white shadow-md'
              : 'bg-white dark:bg-[#0B1B55]/80 border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-slate-300 hover:bg-[#F8FAFC]'
          }`}
        >
          <HelpCircle className="h-4 w-4" /> Ngân Hàng Câu Hỏi ({localQuestions.length})
        </button>

        <button
          onClick={() => setMainTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
            mainTab === 'submissions'
              ? 'bg-[#1746D1] text-white shadow-md'
              : 'bg-white dark:bg-[#0B1B55]/80 border border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-slate-300 hover:bg-[#F8FAFC]'
          }`}
        >
          <BarChart2 className="h-4 w-4" /> Quản Lý Nộp Bài & Sổ Điểm LMS ({localExamResults.length} lượt nộp)
        </button>

        <a
          href="/dashboard/teacher/leaderboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all shadow-md sm:ml-auto"
        >
          <Trophy className="h-4 w-4 text-amber-400" /> Bảng Xếp Hạng Học Sinh
        </a>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: NGÂN HÀNG ĐỀ THI & GIAO BÀI CHO LỚP */}
      {/* ==================================================== */}
      {mainTab === 'bank' && (
        <div className="space-y-6">
          
          {/* 10 THẺ PHÂN LOẠI NGÂN HÀNG ĐỀ THI CHUYÊN BIỆT */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
            {[
              { id: 'all', label: 'TẤT CẢ ĐỀ THI', count: stats.total, icon: <Layers className="h-4 w-4" /> },
              { id: 'topic', label: 'ĐỀ LUYỆN THEO CHỦ ĐỀ', count: stats.topic, icon: <BookOpen className="h-4 w-4" /> },
              { id: 'regular', label: 'KT THƯỜNG XUYÊN', count: stats.regular, icon: <Clock className="h-4 w-4" /> },
              { id: 'mid_term_1', label: 'KT GIỮA KỲ 1', count: stats.mid_term_1, icon: <Calendar className="h-4 w-4" /> },
              { id: 'final_term_1', label: 'KT CUỐI KỲ 1', count: stats.final_term_1, icon: <CheckCircle2 className="h-4 w-4" /> },
              { id: 'mid_term_2', label: 'KT GIỮA KỲ 2', count: stats.mid_term_2, icon: <Calendar className="h-4 w-4" /> },
              { id: 'final_term_2', label: 'KT CUỐI KỲ 2', count: stats.final_term_2, icon: <CheckCircle2 className="h-4 w-4" /> },
              { id: 'thptqg', label: 'THI THỬ TỐT NGHIỆP', count: stats.thptqg, icon: <Award className="h-4 w-4" /> },
              { id: 'vsat', label: 'KỲ THI V-SAT', count: stats.vsat, icon: <TrendingUp className="h-4 w-4" /> },
              { id: 'dgnl', label: 'ĐGNL / TSA', count: stats.dgnl, icon: <Sparkles className="h-4 w-4" /> }
            ].map((cat) => {
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-2.5 cursor-pointer shadow-2xs group ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white border-transparent shadow-md shadow-blue-500/20' 
                      : 'bg-white dark:bg-[#0B1B55]/80 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#087CFF] hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B] text-[#14213D] dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${
                      isActive 
                        ? 'bg-white/20 text-white border-white/30' 
                        : 'bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-400 border-[#1746D1]/20'
                    }`}>
                      {cat.icon}
                    </span>
                    <span className={`text-lg sm:text-xl font-black font-heading ${
                      isActive ? 'text-white' : 'text-[#1746D1] dark:text-cyan-400'
                    }`}>
                      {cat.count}
                    </span>
                  </div>
                  <div>
                    <h4 className={`text-[11px] sm:text-xs font-black tracking-wider m-0 uppercase line-clamp-1 ${
                      isActive ? 'text-white' : 'text-[#14213D] dark:text-slate-200 group-hover:text-[#1746D1] dark:group-hover:text-cyan-300'
                    }`}>
                      {cat.label}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>

          {/* THANH CÔNG CỤ & TẠO ĐỀ NHANH */}
          <div className="flat-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Lọc theo môn phụ trách */}
              {allSubjects.length > 1 ? (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="all">Tất cả môn phụ trách ({allSubjects.length})</option>
                  {allSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              ) : allSubjects.length === 1 ? (
                <div className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-xs font-extrabold text-primary flex items-center gap-1.5">
                  <span className="text-muted-foreground font-semibold">Môn phụ trách:</span>
                  <span>{allSubjects[0].name}</span>
                </div>
              ) : null}

              {/* Lọc theo trạng thái giao bài */}
              <select
                value={assignmentFilter}
                onChange={(e) => setAssignmentFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
              >
                <option value="all">Tất cả đề ({localExams.length})</option>
                <option value="assigned">Đã giao cho lớp ({stats.assignedCount})</option>
                <option value="unassigned">Chưa giao ({localExams.length - stats.assignedCount})</option>
              </select>

              {/* Tìm kiếm */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm đề thi..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none w-48 sm:w-64"
                />
              </div>
            </div>

            {/* Nút Tạo đề thi mới */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreateModal()}
                className="btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Soạn Đề Thi Mới
              </button>
            </div>
          </div>

          {/* DANH SÁCH ĐỀ THI */}
          {filteredExams.length === 0 ? (
            <div className="text-center py-16 flat-card border-dashed space-y-3">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="font-bold text-muted-foreground text-sm">Không tìm thấy đề thi nào phù hợp.</p>
              <button
                onClick={() => handleOpenCreateModal()}
                className="btn-secondary text-xs py-1.5 px-3.5 mx-auto"
              >
                <Plus className="h-3.5 w-3.5" /> Tạo đề thi đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredExams.map((exam) => {
                const examQs = localQuestions.filter(q => q.exam_id === exam.id);
                const assignedClasses = localExamAssignments.filter(a => a.exam_id === exam.id);
                const isAssigned = assignedClasses.length > 0;

                // 1. Ngày giao & Hạn nộp
                const assignmentDates = assignedClasses
                  .map(a => a.created_at || a.start_date)
                  .filter(Boolean) as string[];
                const assignedDateRaw = assignmentDates.length > 0 
                  ? [...assignmentDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] 
                  : exam.created_at;
                const assignedDateFormatted = assignedDateRaw 
                  ? new Date(assignedDateRaw).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'Đã giao';

                const dueDates = assignedClasses
                  .map(a => a.due_date)
                  .filter(Boolean) as string[];
                const nearestDueDate = dueDates.length > 0
                  ? [...dueDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
                  : null;
                const dueDateFormatted = nearestDueDate
                  ? new Date(nearestDueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : null;

                // 2. Sĩ số & Số lượng học sinh hoàn thành
                const assignedClassIds = new Set(assignedClasses.map(a => a.class_id));
                const assignedStudentsList = students.filter(s => s.class_id && assignedClassIds.has(s.class_id));
                const totalAssignedStudents = assignedStudentsList.length;

                const examResultsList = localExamResults.filter(r => r.exam_id === exam.id);
                const submittedStudentIdSet = new Set(examResultsList.map(r => r.student_id));

                const completedStudentsCount = totalAssignedStudents > 0
                  ? assignedStudentsList.filter(s => submittedStudentIdSet.has(s.student_id)).length
                  : submittedStudentIdSet.size;

                const effectiveTotalStudents = totalAssignedStudents > 0 
                  ? totalAssignedStudents 
                  : Math.max(completedStudentsCount, examResultsList.length);

                const completionPercentage = effectiveTotalStudents > 0 
                  ? Math.min(100, Math.round((completedStudentsCount / effectiveTotalStudents) * 100))
                  : 0;

                return (
                  <div 
                    key={exam.id}
                    className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-5.5 shadow-sm hover:shadow-md hover:border-[#087CFF] flex flex-col justify-between gap-4 transition-all group"
                  >
                    <div className="space-y-3">
                      
                      {/* Tags & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            {exam.subjects?.name || 'Môn học'}
                          </span>
                          <span className="bg-[#F1F5F9] dark:bg-[#0D226B] text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-[#1B317A] text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {exam.duration_minutes} phút
                          </span>
                          <span className="bg-[#F1F5F9] dark:bg-[#0D226B] text-[#64748B] dark:text-slate-300 border border-[#E2E8F0] dark:border-[#1B317A] text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {examQs.length} câu
                          </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDuplicateExam(exam)}
                            className="p-1.5 hover:bg-[#F1F5F9] dark:hover:bg-[#0D226B] rounded-lg text-[#64748B] hover:text-[#1746D1] transition-colors"
                            title="Nhân bản đề thi"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg text-[#64748B] hover:text-red-500 transition-colors"
                            title="Xóa đề thi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tiêu đề đề thi */}
                      <h4 
                        className="font-bold font-heading text-[15px] sm:text-[16px] text-[#14213D] dark:text-white line-clamp-2 break-words leading-snug m-0 cursor-pointer hover:text-[#1746D1] dark:hover:text-cyan-300 transition-colors"
                        title={exam.title}
                        onClick={() => setEditingExamModal(exam)}
                      >
                        {exam.title}
                      </h4>

                      {/* Trạng thái Giao bài cho lớp */}
                      <div className="pt-1">
                        {isAssigned ? (
                          <div 
                            onClick={() => {
                              setSelectedExamFilterId(exam.id);
                              setMainTab('submissions');
                            }}
                            className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 text-xs cursor-pointer hover:border-emerald-500/60 hover:shadow-sm transition-all space-y-2.5 group/card"
                            title="Bấm để xem danh sách nộp bài & bảng điểm chi tiết"
                          >
                            {/* Dòng 1: Badge ĐÃ GIAO + Các lớp nhận bài */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" /> ĐÃ GIAO
                                </span>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {assignedClasses.slice(0, 3).map((a, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20 text-[10px] font-bold">
                                      {a.classes?.name || 'Lớp'}
                                    </span>
                                  ))}
                                  {assignedClasses.length > 3 && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#1746D1]/15 text-[#1746D1] dark:text-cyan-200 text-[10px] font-bold">
                                      +{assignedClasses.length - 3} lớp
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5 shrink-0 group-hover/card:underline">
                                Sổ điểm &rarr;
                              </span>
                            </div>

                            {/* Dòng 2: Ngày giao & Hạn nộp */}
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] font-semibold text-[#64748B] dark:text-slate-300">
                              <span className="flex items-center gap-1 text-[#1746D1] dark:text-sky-300 font-bold">
                                <Calendar className="h-3.5 w-3.5 text-[#1746D1] dark:text-sky-400 shrink-0" />
                                <span>Ngày giao: <strong className="text-[#14213D] dark:text-white">{assignedDateFormatted}</strong></span>
                              </span>
                              {dueDateFormatted && (
                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                                  <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                                  Hạn: {dueDateFormatted}
                                </span>
                              )}
                            </div>

                            {/* Dòng 3: Số lượng hoàn thành của học sinh */}
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-[#64748B] dark:text-slate-300 flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  Số lượng hoàn thành:
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                  {completedStudentsCount}/{effectiveTotalStudents} HS ({completionPercentage}%)
                                </span>
                              </div>
                              {/* Thanh tiến độ trực quan */}
                              <div className="w-full h-2 rounded-full bg-[#E2E8F0] dark:bg-slate-800 overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" 
                                  style={{ width: `${completionPercentage}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0D226B]/40 border border-[#E2E8F0] dark:border-[#1B317A] text-[11px] text-[#64748B] dark:text-slate-400 flex items-center justify-between gap-2">
                            <span className="italic flex items-center gap-1.5">
                              <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Chưa giao cho lớp nào
                            </span>
                            <button
                              onClick={() => handleOpenAssignModal(exam)}
                              className="text-[#087CFF] hover:underline font-bold text-xs"
                            >
                              Giao ngay
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1B317A] flex items-center justify-between gap-2.5">
                      <button
                        onClick={() => handleOpenAssignModal(exam)}
                        className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 flex-1 justify-center transition-all ${
                          isAssigned 
                            ? 'text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20' 
                            : 'text-[#14213D] dark:text-white border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/50 hover:bg-[#EEF4FF] hover:border-[#087CFF]'
                        }`}
                      >
                        <Send className="h-3.5 w-3.5" /> {isAssigned ? 'Chỉnh sửa giao lớp' : 'Giao cho lớp'}
                      </button>

                      <button
                        onClick={() => setEditingExamModal(exam)}
                        className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#1746D1] to-[#087CFF] hover:shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Soạn đề
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: NGÂN HÀNG CÂU HỎI & PREVIEW LATEX CHUYÊN NGHIỆP */}
      {/* ==================================================== */}
      {mainTab === 'questions' && (
        <div className="space-y-6">

          {/* 4 THẺ THỐNG KÊ NGÂN HÀNG CÂU HỎI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Tổng số câu hỏi</span>
                <span className="text-2xl sm:text-3xl font-black font-heading text-[#1746D1] dark:text-cyan-400 mt-1 block">
                  {qbStats.total}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Khảo thí chuẩn 2026</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 flex items-center justify-center">
                <HelpCircle className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Trắc nghiệm 4 Lựa Chọn</span>
                <span className="text-2xl sm:text-3xl font-black font-heading text-[#087CFF] dark:text-blue-400 mt-1 block">
                  {qbStats.mcq}
                </span>
                <span className="text-[10px] text-[#64748B] font-semibold mt-0.5 block">0.25 điểm / câu</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#087CFF]/10 text-[#087CFF] flex items-center justify-center">
                <CheckSquare className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Trắc nghiệm Đúng/Sai</span>
                <span className="text-2xl sm:text-3xl font-black font-heading text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {qbStats.tf}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">1.0 điểm / câu (4 ý a,b,c,d)</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block">Trả lời ngắn (SAQ)</span>
                <span className="text-2xl sm:text-3xl font-black font-heading text-amber-600 dark:text-amber-400 mt-1 block">
                  {qbStats.saq}
                </span>
                <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">0.5 điểm / câu số thực</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* DẢI PHÂN BỐ MỨC ĐỘ NHẬN THỨC */}
          <div className="bg-white dark:bg-[#0B1B55]/80 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#14213D] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[#1746D1] dark:text-cyan-400" /> Phân bố theo mức độ nhận thức:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button 
                onClick={() => setQbLevelFilter(qbLevelFilter === 'Nhận biết' ? 'all' : 'Nhận biết')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  qbLevelFilter === 'Nhận biết' 
                    ? 'bg-[#087CFF] text-white border-[#087CFF] shadow-xs' 
                    : 'bg-blue-50 dark:bg-blue-950/30 text-[#087CFF] border-blue-200 dark:border-blue-800'
                }`}
              >
                Nhận biết: <strong>{qbStats.byLevel.nb}</strong> câu
              </button>

              <button 
                onClick={() => setQbLevelFilter(qbLevelFilter === 'Thông hiểu' ? 'all' : 'Thông hiểu')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  qbLevelFilter === 'Thông hiểu' 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                Thông hiểu: <strong>{qbStats.byLevel.th}</strong> câu
              </button>

              <button 
                onClick={() => setQbLevelFilter(qbLevelFilter === 'Vận dụng' ? 'all' : 'Vận dụng')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  qbLevelFilter === 'Vận dụng' 
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200 dark:border-amber-800'
                }`}
              >
                Vận dụng: <strong>{qbStats.byLevel.vd}</strong> câu
              </button>

              <button 
                onClick={() => setQbLevelFilter(qbLevelFilter === 'Vận dụng cao' ? 'all' : 'Vận dụng cao')}
                className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  qbLevelFilter === 'Vận dụng cao' 
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                    : 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 border-purple-200 dark:border-purple-800'
                }`}
              >
                Vận dụng cao: <strong>{qbStats.byLevel.vdc}</strong> câu
              </button>

              {qbLevelFilter !== 'all' && (
                <button
                  onClick={() => setQbLevelFilter('all')}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#64748B] hover:text-[#1746D1] underline cursor-pointer"
                >
                  Xóa lọc mức độ
                </button>
              )}
            </div>
          </div>

          {/* BỘ LỌC TÌM KIẾM & CÔNG CỤ NGÂN HÀNG CÂU HỎI */}
          <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              
              {/* Tìm kiếm */}
              <div className="relative flex-1 min-w-[200px] sm:min-w-[280px]">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nội dung câu hỏi, công thức LaTeX, lời giải..."
                  value={qbSearchKeyword}
                  onChange={(e) => setQbSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] text-xs font-semibold text-[#14213D] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#087CFF]"
                />
              </div>

              {/* Lọc Môn học */}
              <select
                value={qbSubjectFilter}
                onChange={(e) => setQbSubjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] text-xs font-bold text-[#14213D] dark:text-white focus:outline-none"
              >
                <option value="all">Tất cả môn học</option>
                {allSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>

              {/* Lọc Dạng thức */}
              <select
                value={qbTypeFilter}
                onChange={(e) => setQbTypeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] text-xs font-bold text-[#14213D] dark:text-white focus:outline-none"
              >
                <option value="all">Tất cả dạng thức câu hỏi</option>
                <option value="mcq">Trắc nghiệm 4 lựa chọn (0.25đ)</option>
                <option value="tf">Trắc nghiệm Đúng/Sai (1.0đ)</option>
                <option value="saq">Trả lời ngắn (0.5đ)</option>
              </select>

            </div>

            {/* Nút hành động ngân hàng */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportQuestionsJson}
                className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] text-xs font-bold text-[#14213D] dark:text-white hover:border-[#087CFF] hover:bg-[#EEF4FF] flex items-center gap-1.5 transition-all cursor-pointer"
                title="Tải toàn bộ câu hỏi đã lọc dưới dạng file JSON"
              >
                <Download className="h-3.5 w-3.5 text-[#1746D1] dark:text-cyan-400" /> Xuất Ngân Hàng (JSON)
              </button>

              <button
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white text-xs font-extrabold hover:shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Soạn Đề / Thêm Câu Mới
              </button>
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI TRONG NGÂN HÀNG */}
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#0B1B55]/90 border border-dashed border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl space-y-3">
              <HelpCircle className="h-12 w-12 text-[#64748B] mx-auto opacity-40" />
              <p className="font-bold text-[#64748B] text-sm">Không tìm thấy câu hỏi nào phù hợp với bộ lọc.</p>
              <button
                onClick={() => {
                  setQbSearchKeyword('');
                  setQbSubjectFilter('all');
                  setQbLevelFilter('all');
                  setQbTypeFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-[#1746D1] text-white text-xs font-bold hover:bg-[#087CFF] transition-colors"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#64748B] dark:text-slate-400 px-1 font-semibold">
                <span>Hiển thị <strong>{filteredQuestions.length}</strong> / {localQuestions.length} câu hỏi</span>
                <span>Chuẩn công thức KaTeX & LaTeX FPREP 2026</span>
              </div>

              {filteredQuestions.map((q, idx) => {
                const parentExam = localExams.find(e => e.id === q.exam_id);
                const qType = q.question_type || q.type || 'mcq';
                const level = q.level || 'Nhận biết';
                const isExplanationOpen = expandedExplanationIds.has(q.id);
                const isCopied = copiedQuestionId === q.id;

                // Chuẩn hóa options
                let parsedOptions: any[] = [];
                if (Array.isArray(q.options)) {
                  parsedOptions = q.options;
                } else if (typeof q.options === 'string') {
                  try { parsedOptions = JSON.parse(q.options); } catch (e) { parsedOptions = []; }
                }

                return (
                  <div 
                    key={q.id || idx}
                    className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#087CFF] transition-all space-y-4"
                  >
                    {/* Header câu hỏi */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-[#1746D1] text-white text-[11px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                          Câu {idx + 1}
                        </span>

                        {parentExam?.subjects?.name && (
                          <span className="bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {parentExam.subjects.name}
                          </span>
                        )}

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          level === 'Nhận biết'
                            ? 'bg-blue-50 dark:bg-blue-950/30 text-[#087CFF] border-blue-200 dark:border-blue-800'
                            : level === 'Thông hiểu'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                            : level === 'Vận dụng'
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200 dark:border-amber-800'
                            : 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 border-purple-200 dark:border-purple-800'
                        }`}>
                          {level}
                        </span>

                        <span className="bg-[#F1F5F9] dark:bg-[#0D226B] text-[#475569] dark:text-slate-300 border border-[#E2E8F0] dark:border-[#1B317A] text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {qType === 'tf' ? 'Đúng/Sai (1.0đ)' : qType === 'saq' ? 'Trả lời ngắn (0.5đ)' : '4 Lựa chọn (0.25đ)'}
                        </span>

                        {parentExam && (
                          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold truncate max-w-xs" title={parentExam.title}>
                            Đề: <strong>{parentExam.title}</strong>
                          </span>
                        )}
                      </div>

                      {/* Công cụ thao tác nhanh câu hỏi */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyQuestionJson(q)}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] text-[11px] font-bold text-[#64748B] hover:text-[#1746D1] hover:border-[#087CFF] flex items-center gap-1 transition-all cursor-pointer"
                          title="Sao chép định dạng JSON của câu hỏi này"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{isCopied ? 'Đã sao chép!' : 'Chép JSON'}</span>
                        </button>

                        {parentExam && (
                          <button
                            onClick={() => setEditingExamModal(parentExam)}
                            className="px-2.5 py-1 rounded-lg bg-[#1746D1]/10 text-[#1746D1] hover:bg-[#1746D1] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Mở đề thi chứa câu hỏi này để chỉnh sửa toàn diện"
                          >
                            <Edit3 className="h-3 w-3" /> Sửa trong đề
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nội dung câu hỏi (Render LaTeX Math) */}
                    <div className="text-sm font-semibold text-[#14213D] dark:text-slate-100 leading-relaxed font-sans">
                      <MathRenderer content={cleanMathContent(q.content)} />
                    </div>

                    {/* Các phương án lựa chọn */}
                    {qType === 'mcq' && parsedOptions.length > 0 && (
                      <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
                        {parsedOptions.map((opt: any, optIdx: number) => {
                          const optKey = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);
                          const optText = typeof opt === 'object' && opt !== null ? (opt.text || opt.content || '') : String(opt);
                          const isCorrect = String(q.correct_answer || '').toUpperCase() === optKey || q.correct_option_index === optIdx;

                          return (
                            <div 
                              key={optIdx}
                              className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2.5 transition-all ${
                                isCorrect 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-[#14213D] dark:text-emerald-200 shadow-2xs ring-1 ring-emerald-500/30' 
                                  : 'bg-[#F8FAFC] dark:bg-[#0D226B]/40 border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-slate-200'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                isCorrect 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-white dark:bg-[#0B1B55] text-[#1746D1] dark:text-cyan-400 border border-[#E2E8F0] dark:border-[#1B317A]'
                              }`}>
                                {optKey}
                              </span>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <MathRenderer content={cleanMathContent(optText)} />
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full shrink-0">
                                  Đáp án đúng
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dạng Đúng / Sai (TF) */}
                    {qType === 'tf' && parsedOptions.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {parsedOptions.map((opt: any, optIdx: number) => {
                          const optKey = ['a', 'b', 'c', 'd'][optIdx] || String(optIdx + 1);
                          const optText = typeof opt === 'object' && opt !== null ? (opt.text || opt.content || '') : String(opt);
                          
                          let isStatementTrue = false;
                          if (typeof q.correct_answer === 'object' && q.correct_answer !== null) {
                            isStatementTrue = Boolean(q.correct_answer[optKey] || q.correct_answer[optKey.toUpperCase()]);
                          }

                          return (
                            <div 
                              key={optIdx}
                              className="p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span className="font-black text-[#1746D1] dark:text-cyan-400 uppercase shrink-0 pt-0.5">
                                  {optKey})
                                </span>
                                <div className="text-[#14213D] dark:text-slate-100 font-semibold min-w-0 flex-1">
                                  <MathRenderer content={cleanMathContent(optText)} />
                                </div>
                              </div>

                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                                isStatementTrue 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-rose-500 text-white'
                              }`}>
                                {isStatementTrue ? 'Mệnh đề ĐÚNG' : 'Mệnh đề SAI'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dạng Trả lời ngắn (SAQ) */}
                    {qType === 'saq' && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-amber-800 dark:text-amber-300">
                          Giá trị cần điền vào ô đáp án:
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#0B1B55] border border-amber-500/40 text-amber-700 dark:text-amber-300 font-black font-mono text-sm">
                          {String(q.correct_answer ?? '').replace(/^([+-]?\d+)\.(\d+)$/, '$1,$2') || 'Chưa thiết lập'}
                        </span>
                      </div>
                    )}

                    {/* Lời giải chi tiết sư phạm (Expandable) */}
                    {q.explanation && (
                      <div className="pt-1">
                        <button
                          onClick={() => toggleExplanation(q.id)}
                          className="text-xs font-bold text-[#1746D1] dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {isExplanationOpen ? '▲ Thu gọn lời giải' : '▼ Xem hướng dẫn giải chi tiết & Phương pháp giải'}
                        </button>

                        {isExplanationOpen && (
                          <div className="mt-2.5 p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0D226B]/50 border border-[#E2E8F0] dark:border-[#1B317A] text-xs text-[#14213D] dark:text-slate-200 leading-relaxed space-y-2">
                            <span className="text-[11px] font-black uppercase text-[#1746D1] dark:text-cyan-300 tracking-wider block">
                              Phương pháp giải & Lập luận sư phạm:
                            </span>
                            <div className="pt-1">
                              <MathRenderer content={cleanMathContent(q.explanation)} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: QUẢN LÝ NỘP BÀI & SỔ ĐIỂM CHUẨN LMS */}
      {/* ==================================================== */}
      {mainTab === 'submissions' && (
        <div className="space-y-6">

          {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ: TOÀN KHỐI 12 vs THEO TỪNG LỚP */}
          <div className="flat-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedGradeView('class')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGradeView === 'class' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                }`}
              >
                <Users className="h-3.5 w-3.5 inline mr-1" /> Theo Từng Lớp
              </button>

              <button
                onClick={() => setSelectedGradeView('block')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedGradeView === 'block' 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5 inline mr-1" /> Tổng Hợp Toàn Khối 12
              </button>
            </div>

            {selectedGradeView === 'class' && (
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Chọn Lớp */}
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="all">Tất cả các lớp</option>
                  {availableClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>Lớp {cls.name}</option>
                  ))}
                </select>

                {/* Chọn Đề thi */}
                <select
                  value={selectedExamFilterId}
                  onChange={(e) => setSelectedExamFilterId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none max-w-xs truncate"
                >
                  <option value="all">Tất cả đề thi đã giao</option>
                  {localExams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.title}</option>
                  ))}
                </select>

                {/* Nút Xuất Excel/CSV */}
                <button
                  onClick={handleExportCSV}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Xuất bảng điểm ra file CSV"
                >
                  <Download className="h-3.5 w-3.5" /> Xuất Sổ Điểm (CSV)
                </button>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* CHẾ ĐỘ XEM: TOÀN KHỐI 12 */}
          {/* ==================================================== */}
          {selectedGradeView === 'block' && (
            <div className="space-y-6">
              
              {/* Tổng quan toàn khối */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tổng học sinh khối 12</span>
                  <div className="text-2xl font-black text-foreground">{students.length} học sinh</div>
                </div>
                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tổng lượt nộp bài</span>
                  <div className="text-2xl font-black text-primary">{localExamResults.length} bài</div>
                </div>
                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tổng đề thi đã giao</span>
                  <div className="text-2xl font-black text-green-600">{localExamAssignments.length} lượt giao</div>
                </div>
                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Điểm TB toàn khối</span>
                  <div className="text-2xl font-black text-secondary dark:text-foreground">
                    {localExamResults.length > 0 
                      ? (localExamResults.reduce((a, b) => a + Number(b.score), 0) / localExamResults.length).toFixed(1)
                      : '0.0'}/10
                  </div>
                </div>
              </div>

              {/* Bảng so sánh giữa các lớp trong khối */}
              <div className="flat-card overflow-hidden p-0 border border-border">
                <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" /> Bảng Tiến Độ & Điểm Số Theo Lớp Khối 12
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="p-3.5">Lớp</th>
                        <th className="p-3.5">Ban</th>
                        <th className="p-3.5">Sĩ số</th>
                        <th className="p-3.5">Đã nộp bài</th>
                        <th className="p-3.5">Tỷ lệ hoàn thành</th>
                        <th className="p-3.5">Điểm TB</th>
                        <th className="p-3.5">Phổ điểm (Giỏi / Khá / TB / Yếu)</th>
                        <th className="p-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {blockStats.map((item) => (
                        <tr key={item.class.id} className="hover:bg-muted/10 transition-colors font-medium">
                          <td className="p-3.5 font-bold text-foreground text-sm">Lớp {item.class.name}</td>
                          <td className="p-3.5 text-muted-foreground">
                            {item.class.group_type === 'T' ? 'Tự nhiên' : item.class.group_type === 'X' ? 'Xã hội' : 'Khai phóng'}
                          </td>
                          <td className="p-3.5 font-bold">{item.totalStudents} HS</td>
                          <td className="p-3.5 font-bold text-primary">{item.submittedStudentCount} HS</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-full rounded-full" style={{ width: `${item.completionRate}%` }} />
                              </div>
                              <span className="font-bold text-foreground">{item.completionRate}%</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`font-black text-sm ${Number(item.avgScore) >= 8 ? 'text-green-600' : Number(item.avgScore) >= 5 ? 'text-blue-600' : 'text-orange-500'}`}>
                              {item.avgScore}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <span className="text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded" title="Giỏi (>=8.0)">{item.excellentCount} G</span>
                              <span className="text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded" title="Khá (6.5 - 7.9)">{item.goodCount} K</span>
                              <span className="text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded" title="Trung bình (5.0 - 6.4)">{item.averageCount} TB</span>
                              <span className="text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded" title="Yếu (<5.0)">{item.weakCount} Y</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedClassId(item.class.id);
                                setSelectedGradeView('class');
                              }}
                              className="btn-secondary text-[11px] py-1 px-2.5 font-bold"
                            >
                              Xem sổ điểm &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* CHẾ ĐỘ XEM: THEO TỪNG LỚP & BÀI TẬP */}
          {/* ==================================================== */}
          {selectedGradeView === 'class' && (
            <div className="space-y-6">

              {/* Thẻ thống kê tổng quan của lớp đang chọn */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sĩ số lớp</span>
                  <div className="text-2xl font-black text-foreground">{totalClassStudents} học sinh</div>
                </div>

                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tỷ lệ nộp bài</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-primary">{submittedCount}/{totalClassStudents}</span>
                    <span className="text-xs font-bold text-muted-foreground">({submissionRate}%)</span>
                  </div>
                </div>

                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Điểm TB của lớp</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-green-600">{avgScore}</span>
                    <span className="text-xs font-bold text-muted-foreground">/ 10</span>
                  </div>
                </div>

                <div className="flat-card p-4 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Điểm Cao nhất / Thấp nhất</span>
                  <div className="text-xl font-black text-foreground">
                    <span className="text-green-600">{maxScore}</span> / <span className="text-orange-500">{minScore}</span>
                  </div>
                </div>
              </div>

              {/* Bộ lọc bảng điểm */}
              <div className="flat-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Trạng thái:</span>
                    <button
                      onClick={() => setSubmissionStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        submissionStatusFilter === 'all'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Tất cả ({totalClassStudents})
                    </button>
                    <button
                      onClick={() => setSubmissionStatusFilter('submitted')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        submissionStatusFilter === 'submitted'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                      }`}
                    >
                      Đã nộp bài ({submittedCount})
                    </button>
                    <button
                      onClick={() => setSubmissionStatusFilter('unsubmitted')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        submissionStatusFilter === 'unsubmitted'
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                      }`}
                    >
                      Chưa làm ({unsubmittedCount})
                    </button>
                  </div>

                  {/* Chế độ hiển thị điểm: Điểm cao nhất vs Tất cả lượt nộp */}
                  <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-xl border border-border">
                    <button
                      onClick={() => setScoreMode('best')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        scoreMode === 'best'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Học sinh làm nhiều lần thì hiện điểm cao nhất và cho phép xem các lần nộp"
                    >
                      <Trophy className="h-3 w-3" /> Điểm cao nhất
                    </button>
                    <button
                      onClick={() => setScoreMode('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        scoreMode === 'all'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Hiển thị tất cả các lượt nộp bài rời rạc"
                    >
                      <Layers className="h-3 w-3" /> Tất cả lượt nộp
                    </button>
                  </div>
                </div>

                {/* Tìm kiếm học sinh */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc MSHS..."
                    value={studentSearchKeyword}
                    onChange={(e) => setStudentSearchKeyword(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none w-full sm:w-56"
                  />
                </div>
              </div>

              {/* BẢNG DANH SÁCH NỘP BÀI VÀ ĐIỂM SỐ */}
              <div className="flat-card overflow-hidden p-0 border border-border">
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" /> 
                    Sổ Điểm Khảo Thí: <span className="text-primary">{activeExamReport ? activeExamReport.title : 'Tất cả đề thi đã giao'}</span> &bull; <span>{targetClass ? `Lớp ${targetClass.name}` : (selectedClassId === 'all' ? 'Tất cả các lớp' : 'Lớp đã chọn')}</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-muted-foreground">
                      Đang hiển thị {filteredSubmissions.length} mục
                    </span>
                    {scoreMode === 'best' && (
                      <span className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full text-[10px] font-black">
                        Chế độ Điểm Cao Nhất
                      </span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/10 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="p-3.5">STT</th>
                        <th className="p-3.5">MSHS</th>
                        <th className="p-3.5">Họ và tên học sinh</th>
                        <th className="p-3.5">Lớp</th>
                        <th className="p-3.5">Đề thi</th>
                        <th className="p-3.5">Trạng thái</th>
                        <th className="p-3.5">Điểm số</th>
                        <th className="p-3.5">Số câu đúng</th>
                        <th className="p-3.5">Thời gian làm</th>
                        <th className="p-3.5">Ngày nộp</th>
                        <th className="p-3.5 text-right">Chi tiết bài làm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-muted-foreground italic">
                            Không có dữ liệu học sinh phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map((item, idx) => {
                          const hasSubmitted = item.isSubmitted;
                          const score = item.result ? Number(item.result.score) : null;
                          const studentClass = item.student.classes?.name || availableClasses.find(c => c.id === item.student.class_id)?.name || targetClass?.name || '12';
                          const examTitle = item.exam?.title || activeExamReport?.title || 'Đề thi';
                          const attemptsCount = item.attemptsCount || (item.allAttempts?.length || (item.result ? 1 : 0));

                          return (
                            <tr key={item.result ? item.result.id : `${item.student.student_id}_${idx}`} className="hover:bg-muted/10 transition-colors font-medium">
                              <td className="p-3.5 text-muted-foreground font-semibold">{idx + 1}</td>
                              <td className="p-3.5 font-bold text-foreground">{item.student.mshs}</td>
                              <td className="p-3.5 font-bold text-foreground">{item.student.full_name}</td>
                              <td className="p-3.5">
                                <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-bold text-muted-foreground border border-border">
                                  Lớp {studentClass}
                                </span>
                              </td>
                              <td className="p-3.5 font-semibold text-foreground max-w-[200px] truncate" title={examTitle}>
                                {examTitle}
                              </td>
                              <td className="p-3.5">
                                {hasSubmitted ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                      <CheckCircle2 className="h-3 w-3" /> Đã hoàn thành
                                    </span>
                                    {attemptsCount > 1 && (
                                      <span className="block text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                                        Đã làm {attemptsCount} lần
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                    <Clock className="h-3 w-3" /> Chưa làm bài
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {hasSubmitted && score !== null ? (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-sm font-black px-2 py-0.5 rounded whitespace-nowrap ${
                                        score >= 8.0 
                                          ? 'text-green-700 bg-green-500/10 dark:text-green-300' 
                                          : score >= 5.0 
                                          ? 'text-blue-700 bg-blue-500/10 dark:text-blue-300' 
                                          : 'text-red-700 bg-red-500/10 dark:text-red-300'
                                      }`}>
                                        {score} / 10
                                      </span>
                                      {scoreMode === 'best' && attemptsCount > 1 && (
                                        <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap" title="Điểm cao nhất trong các lần nộp">
                                          <Trophy className="h-2.5 w-2.5" /> Cao nhất
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">—</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {hasSubmitted && item.result ? (
                                  <span className="font-bold text-foreground whitespace-nowrap">
                                    {item.result.correct_answers} / {item.result.total_questions || '—'} câu
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {hasSubmitted && item.result ? (
                                  <span className="font-semibold text-muted-foreground whitespace-nowrap">
                                    {Math.floor((item.result.time_spent_seconds || 0) / 60)} phút {(item.result.time_spent_seconds || 0) % 60}s
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {hasSubmitted && item.result?.created_at ? (
                                  <span className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">
                                    {new Date(item.result.created_at).toLocaleString('vi-VN')}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-3.5 text-right whitespace-nowrap">
                                {hasSubmitted ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleInspectStudentTest(item)}
                                      className="btn-secondary text-[11px] py-1 px-2.5 font-bold inline-flex items-center gap-1 text-primary border-primary/20 hover:bg-primary/5"
                                      title={scoreMode === 'best' && attemptsCount > 1 ? "Xem bài làm có điểm cao nhất" : "Xem bài làm chi tiết"}
                                    >
                                      <Eye className="h-3.5 w-3.5" /> Xem bài làm
                                    </button>

                                    {attemptsCount > 1 && (
                                      <button
                                        onClick={() => {
                                          const examId = item.result?.exam_id || item.exam?.id || activeExamReport?.id;
                                          const examObj = item.exam || localExams.find(e => e.id === examId) || activeExamReport;
                                          const currentStudentClass = item.student.classes?.name || availableClasses.find(c => c.id === item.student.class_id)?.name || targetClass?.name || '12';
                                          
                                          setViewingAttemptsData({
                                            studentName: item.student.full_name,
                                            studentMshs: item.student.mshs,
                                            className: currentStudentClass,
                                            examTitle: examObj?.title || 'Đề thi',
                                            attempts: item.allAttempts || []
                                          });
                                        }}
                                        className="btn-secondary text-[11px] py-1 px-2.5 font-bold inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 shadow-2xs"
                                        title="Xem tất cả các lần nộp của học sinh này"
                                      >
                                        <Trophy className="h-3.5 w-3.5" /> Xem các lần nộp ({attemptsCount})
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">Chưa có bài</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: TẠO NHANH ĐỀ THI */}
      {/* ==================================================== */}
      {mounted && showCreateModal && createPortal(
        <div 
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="bg-card border border-border max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Plus className="h-4.5 w-4.5 text-primary" /> Khởi Tạo Đề Thi Mới
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-muted border border-border bg-background rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewExamSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-extrabold text-foreground">Phân loại đề thi:</label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setNewCategory(cat);
                    const durationMap: Record<string, number> = {
                      topic: 30,
                      regular: 15,
                      mid_term_1: 45,
                      final_term_1: 90,
                      mid_term_2: 45,
                      final_term_2: 90,
                      thptqg: 50,
                      vsat: 60,
                      dgnl: 60
                    };
                    setNewDuration(durationMap[cat] || 45);
                  }}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-bold focus:outline-none"
                >
                  <option value="topic">Đề luyện theo chủ đề</option>
                  <option value="regular">Kiểm tra thường xuyên (15 phút)</option>
                  <option value="mid_term_1">Kiểm tra giữa kỳ 1 (45 phút)</option>
                  <option value="final_term_1">Kiểm tra cuối kỳ 1 (90 phút)</option>
                  <option value="mid_term_2">Kiểm tra giữa kỳ 2 (45 phút)</option>
                  <option value="final_term_2">Kiểm tra cuối kỳ 2 (90 phút)</option>
                  <option value="thptqg">Đề thi thử tốt nghiệp THPT</option>
                  <option value="vsat">Kỳ thi VSAT</option>
                  <option value="dgnl">Đề thi Đánh giá Năng lực (ĐGNL / TSA)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-foreground">Môn học phụ trách:</label>
                {allSubjects.length === 1 ? (
                  <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 font-extrabold text-primary text-xs flex items-center justify-between">
                    <span>{allSubjects[0].name}</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">
                      Môn được phân công
                    </span>
                  </div>
                ) : allSubjects.length > 1 ? (
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border bg-background font-bold focus:outline-none"
                  >
                    {allSubjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 font-bold text-amber-700 dark:text-amber-300 text-xs">
                    Chưa được phân công môn học nào.
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground font-medium">
                  Thầy/Cô chỉ có thể khởi tạo đề thi cho môn học được phân công giảng dạy.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-foreground">Tên đề thi:</label>
                <input
                  type="text"
                  placeholder="VD: Đề kiểm tra 1 tiết Đại số & Giải tích Chương 1..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-foreground">Thời lượng làm bài (phút):</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-semibold focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5"
                >
                  Bắt đầu soạn câu hỏi &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================================================== */}
      {/* MODAL 2: GIAO BÀI CHO LỚP */}
      {/* ==================================================== */}
      {mounted && assigningExam && (
        <AssignExamModal
          isOpen={Boolean(assigningExam)}
          onClose={() => setAssigningExam(null)}
          exam={assigningExam}
          classes={availableClasses}
          existingAssignments={localExamAssignments.filter(a => a.exam_id === assigningExam.id)}
          onAssign={handleSaveAssignments}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL 3: SOẠN ĐỀ THI CHUẨN FPREP 2026 */}
      {/* ==================================================== */}
      {mounted && editingExamModal && (
        <ExamEditorModal
          isOpen={Boolean(editingExamModal)}
          onClose={() => setEditingExamModal(null)}
          exam={{
            id: editingExamModal.id,
            title: editingExamModal.title,
            duration_minutes: editingExamModal.duration_minutes || 45,
            exam_type: editingExamModal.exam_type || 'test',
            subject_id: editingExamModal.subject_id
          }}
          initialQuestions={localQuestions.filter(q => q.exam_id === editingExamModal.id).map(q => ({
            id: q.id,
            content: q.content,
            type: (q.question_type || q.type || 'mcq') as any,
            options: Array.isArray(q.options) 
              ? q.options.map((opt: any, idx: number) => ({
                  id: opt.id || ['A', 'B', 'C', 'D'][idx] || String(idx),
                  text: typeof opt === 'object' && opt !== null ? opt.text : String(opt)
                }))
              : [],
            correct_answer: q.correct_answer !== undefined 
              ? q.correct_answer 
              : (q.correct_option_index !== undefined ? ['A', 'B', 'C', 'D'][q.correct_option_index] : 'A'),
            explanation: q.explanation || '',
            level: (q.level || 'Nhận biết') as any,
            points: (q as any).points !== undefined && (q as any).points !== null ? Number((q as any).points) : ((q.question_type || q.type) === 'tf' ? 1.0 : (q.question_type || q.type) === 'saq' ? 0.5 : 0.25)
          }))}
          onSave={handleSaveExamModal}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL 4: XEM BÀI LÀM CHI TIẾT CỦA HỌC SINH */}
      {/* ==================================================== */}
      {mounted && inspectingSubmission && (
        <StudentSubmissionDetailModal
          isOpen={Boolean(inspectingSubmission)}
          onClose={() => setInspectingSubmission(null)}
          submission={inspectingSubmission}
          questions={localQuestions.filter(q => q.exam_id === inspectingSubmission.exam_id)}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL 5: XEM LỊCH SỬ TẤT CẢ CÁC LẦN NỘP BÀI CỦA HỌC SINH */}
      {/* ==================================================== */}
      {mounted && viewingAttemptsData && (
        <StudentAttemptsModal
          isOpen={Boolean(viewingAttemptsData)}
          onClose={() => setViewingAttemptsData(null)}
          studentName={viewingAttemptsData.studentName}
          studentMshs={viewingAttemptsData.studentMshs}
          className={viewingAttemptsData.className}
          examTitle={viewingAttemptsData.examTitle}
          attempts={viewingAttemptsData.attempts}
          onSelectAttemptToInspect={(attempt) => {
            const examId = attempt.exam_id;
            const examObj = localExams.find(e => e.id === examId) || {
              id: examId,
              title: viewingAttemptsData.examTitle,
              duration_minutes: 45
            };

            const payload: SubmissionData = {
              id: attempt.id,
              student_id: attempt.student_id,
              exam_id: examId,
              score: Number(attempt.score),
              correct_answers: Number(attempt.correct_answers),
              total_questions: Number(attempt.total_questions || 0),
              time_spent_seconds: Number(attempt.time_spent_seconds || 0),
              created_at: attempt.created_at,
              answers: attempt.answers,
              student: {
                full_name: viewingAttemptsData.studentName,
                mshs: viewingAttemptsData.studentMshs,
                classes: { name: viewingAttemptsData.className }
              },
              exams: {
                title: examObj.title,
                duration_minutes: examObj.duration_minutes || 45,
                subjects: (examObj as any)?.subjects
              }
            };
            setInspectingSubmission(payload);
          }}
        />
      )}

    </div>
  );
}
