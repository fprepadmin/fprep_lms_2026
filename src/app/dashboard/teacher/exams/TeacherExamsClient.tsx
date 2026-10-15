'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  ClipboardList, Plus, Search, Clock, HelpCircle, 
  Trash2, Edit3, Copy, Award, CheckCircle2, 
  Filter, Layers, BookOpen, AlertCircle, X, Sparkles,
  Send, Users, BarChart2, CheckSquare, ArrowRight,
  Download, Eye, Calendar, FileText, Check, AlertTriangle, Trophy
} from 'lucide-react';
import ExamEditorModal, { QuestionData } from '@/components/exam/ExamEditorModal';
import AssignExamModal, { AssignmentPayload, ClassItem } from '@/components/exam/AssignExamModal';
import StudentSubmissionDetailModal, { SubmissionData } from '@/components/exam/StudentSubmissionDetailModal';
import StudentAttemptsModal, { StudentAttemptItem } from '@/components/exam/StudentAttemptsModal';
import MathRenderer from '@/components/MathRenderer';

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
  exam_type?: 'lesson' | 'test' | 'thptqg' | 'dgnl';
  subjects?: { name: string };
  created_at?: string;
}

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

  // Tabs: 'bank' (Ngân hàng đề thi) vs 'submissions' (Quản lý nộp bài & Sổ điểm)
  const [mainTab, setMainTab] = useState<'bank' | 'submissions'>('bank');

  // Ngân hàng đề thi State
  const [activeCategory, setActiveCategory] = useState<'all' | 'test' | 'thptqg' | 'dgnl'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategory, setNewCategory] = useState<'test' | 'thptqg' | 'dgnl'>('test');
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

  // Helper phân loại đề thi
  const getExamCategory = (exam: Exam): 'lesson' | 'test' | 'thptqg' | 'dgnl' => {
    if (exam.exam_type) return exam.exam_type;
    const title = (exam.title || '').toLowerCase();
    if (title.includes('thpt') || title.includes('tốt nghiệp') || title.includes('quốc gia')) return 'thptqg';
    if (title.includes('đgnl') || title.includes('đánh giá năng lực') || title.includes('tư duy') || title.includes('hsa') || title.includes('tsa')) return 'dgnl';
    if (title.includes('kiểm tra') || title.includes('15') || title.includes('45') || title.includes('giữa kỳ') || title.includes('học kỳ')) return 'test';
    if (exam.lesson_id) return 'lesson';
    return 'test';
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
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchTitle = (exam.title || '').toLowerCase().includes(kw);
      const matchSub = (exam.subjects?.name || '').toLowerCase().includes(kw);
      if (!matchTitle && !matchSub) return false;
    }
    return true;
  });

  // Thống kê nhanh ngân hàng đề
  const stats = {
    total: localExams.length,
    test: localExams.filter(e => getExamCategory(e) === 'test').length,
    thptqg: localExams.filter(e => getExamCategory(e) === 'thptqg').length,
    dgnl: localExams.filter(e => getExamCategory(e) === 'dgnl').length,
    totalAssignments: localExamAssignments.length,
    totalResults: localExamResults.length
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
      // 1. Xóa các phân công cũ của đề thi này trong DB
      await supabase.from('exam_assignments').delete().eq('exam_id', assigningExam.id);

      // 2. Chèn phân công mới
      const newRecords = payloads.map(p => ({
        id: crypto.randomUUID(),
        exam_id: assigningExam.id,
        class_id: p.class_id,
        teacher_id: teacherId,
        due_date: p.due_date,
        start_date: p.start_date,
        note: p.note,
        score_weight: p.score_weight
      }));

      const { data, error } = await supabase
        .from('exam_assignments')
        .insert(newRecords)
        .select('*, classes(*)');

      if (error && !error.message?.includes('schema cache')) {
        console.warn('Exam assignments table insert warning:', error);
      }

      // Cập nhật State cục bộ
      const finalInserted = (data && data.length > 0) ? data : newRecords.map(r => ({
        ...r,
        classes: availableClasses.find(c => c.id === r.class_id)
      }));

      setLocalExamAssignments(prev => [
        ...prev.filter(a => a.exam_id !== assigningExam.id),
        ...finalInserted
      ]);

      alert(`Giao đề thi "${assigningExam.title}" cho ${payloads.length} lớp thành công!`);
    } catch (err: any) {
      console.error(err);
      alert('Không thể lưu giao bài: ' + err.message);
    }
  };

  // ----------------------------------------------------
  // LOGIC CRUD ĐỀ THI (EXAM CRUD)
  // ----------------------------------------------------
  const handleOpenCreateModal = (cat?: 'test' | 'thptqg' | 'dgnl') => {
    const targetCat = cat || (activeCategory === 'all' ? 'test' : activeCategory);
    setNewCategory(targetCat);
    setNewDuration(targetCat === 'test' ? 45 : targetCat === 'thptqg' ? 50 : 60);
    // Luôn khóa newSubjectId vào môn phụ trách hợp lệ của giáo viên
    if (!newSubjectId || !allSubjects.some(s => s.id === newSubjectId)) {
      setNewSubjectId(allSubjects[0]?.id || assignments[0]?.subject_id || '');
    }
    setNewTitle(
      targetCat === 'test' 
        ? 'Đề kiểm tra 1 tiết' 
        : targetCat === 'thptqg' 
        ? 'Đề thi thử Tốt nghiệp THPT 2026' 
        : 'Đề thi Đánh giá năng lực'
    );
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            mainTab === 'bank'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground'
          }`}
        >
          <ClipboardList className="h-4 w-4" /> Ngân Hàng Đề Thi & Soạn Đề ({localExams.length})
        </button>

        <button
          onClick={() => setMainTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            mainTab === 'submissions'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/40 hover:bg-muted text-muted-foreground'
          }`}
        >
          <BarChart2 className="h-4 w-4" /> Quản Lý Nộp Bài & Sổ Điểm LMS ({localExamResults.length} lượt nộp)
        </button>
      </div>

      {/* ==================================================== */}
      {/* TAB 1: NGÂN HÀNG ĐỀ THI & GIAO BÀI CHO LỚP */}
      {/* ==================================================== */}
      {mainTab === 'bank' && (
        <div className="space-y-6">
          
          {/* 4 THẺ DANH MỤC LỚN */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'all', label: 'TẤT CẢ ĐỀ THI', count: stats.total, icon: <Layers className="h-4 w-4" /> },
              { id: 'test', label: 'KIỂM TRA ĐỊNH KỲ', count: stats.test, icon: <CheckCircle2 className="h-4 w-4" /> },
              { id: 'thptqg', label: 'THI THỬ THPTQG', count: stats.thptqg, icon: <Award className="h-4 w-4" /> },
              { id: 'dgnl', label: 'ĐGNL / TSA', count: stats.dgnl, icon: <Sparkles className="h-4 w-4" /> }
            ].map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-2.5 ${
                    isActive
                      ? 'bg-white dark:bg-card border-primary ring-2 ring-primary/20 shadow-sm'
                      : 'bg-white/60 dark:bg-card/60 border-border hover:border-primary/40 hover:bg-white text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`p-2 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {cat.icon}
                    </span>
                    <span className={`text-xl font-black font-heading ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {cat.count}
                    </span>
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold tracking-wider m-0 ${isActive ? 'text-primary' : 'text-foreground'}`}>
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
                const examResultsCount = localExamResults.filter(r => r.exam_id === exam.id).length;

                return (
                  <div 
                    key={exam.id}
                    className="flat-card flex flex-col justify-between gap-4 hover:border-primary/50 transition-all group"
                  >
                    <div className="space-y-3">
                      
                      {/* Tags & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-extrabold px-2 py-0.5 rounded">
                            {exam.subjects?.name || 'Môn học'}
                          </span>
                          <span className="bg-muted text-muted-foreground border border-border text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {exam.duration_minutes} phút
                          </span>
                          <span className="bg-muted text-muted-foreground border border-border text-[10px] font-bold px-2 py-0.5 rounded">
                            {examQs.length} câu
                          </span>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDuplicateExam(exam)}
                            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                            title="Nhân bản đề thi"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-1.5 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-colors"
                            title="Xóa đề thi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tiêu đề đề thi */}
                      <h4 
                        className="font-bold text-[14px] sm:text-[15px] text-foreground line-clamp-2 break-words leading-snug m-0 cursor-pointer hover:text-primary transition-colors"
                        title={exam.title}
                        onClick={() => setEditingExamModal(exam)}
                      >
                        {exam.title}
                      </h4>

                      {/* Trạng thái Giao bài cho lớp */}
                      <div className="pt-1">
                        {assignedClasses.length > 0 ? (
                          <div 
                            onClick={() => {
                              setSelectedExamFilterId(exam.id);
                              setMainTab('submissions');
                            }}
                            className="p-2.5 rounded-xl bg-green-500/5 border border-green-500/20 text-[11px] font-bold text-green-700 dark:text-green-300 flex items-center justify-between gap-2 cursor-pointer hover:bg-green-500/10 transition-colors"
                            title={`Đã giao cho: ${assignedClasses.map(a => a.classes?.name || 'Lớp').join(', ')} (Bấm để xem danh sách nộp bài)`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                              <Send className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                              <span className="shrink-0 text-muted-foreground font-semibold text-[10px]">Đã giao:</span>
                              <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                                {assignedClasses.slice(0, 3).map((a, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-800 dark:text-green-200 text-[10px] font-black truncate shrink-0 max-w-[65px]">
                                    {a.classes?.name || 'Lớp'}
                                  </span>
                                ))}
                                {assignedClasses.length > 3 && (
                                  <span className="px-1.5 py-0.5 rounded bg-green-500/25 text-green-800 dark:text-green-200 text-[10px] font-black shrink-0">
                                    +{assignedClasses.length - 3} lớp
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="shrink-0 text-[10px] font-black bg-green-500/20 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {examResultsCount} bài nộp
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic flex items-center gap-1 py-1">
                            <AlertCircle className="h-3 w-3" /> Chưa giao cho lớp nào
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenAssignModal(exam)}
                        className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 flex-1 justify-center text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <Send className="h-3.5 w-3.5" /> Giao cho lớp
                      </button>

                      <button
                        onClick={() => setEditingExamModal(exam)}
                        className="btn-primary text-[11px] py-1.5 px-3.5 flex items-center gap-1.5"
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
      {/* TAB 2: QUẢN LÝ NỘP BÀI & SỔ ĐIỂM CHUẨN LMS */}
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
                    setNewDuration(cat === 'test' ? 45 : cat === 'thptqg' ? 50 : 60);
                  }}
                  className="w-full p-2.5 rounded-xl border border-border bg-background font-bold focus:outline-none"
                >
                  <option value="test">Kiểm tra định kỳ (15p, 45p, 1 tiết, học kỳ)</option>
                  <option value="thptqg">Luyện thi Tốt nghiệp THPT Quốc Gia</option>
                  <option value="dgnl">Đề thi Đánh giá Năng lực (HSA / TSA / VNU)</option>
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
