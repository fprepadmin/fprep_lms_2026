'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Users, Plus, Trash2, Edit3, Check, X, 
  ArrowLeft, GraduationCap, Calendar, BarChart2,
  ChevronRight, BookOpen, Clock, Award, CheckSquare,
  AlertTriangle, Mail, HelpCircle, FileSpreadsheet,
  ClipboardList, Download, Eye, Trophy, Sparkles, Layers,
  Search, CheckCircle2, Zap
} from 'lucide-react';
import ExcelImportModal from '@/components/student/ExcelImportModal';
import StudentSubmissionDetailModal, { SubmissionData } from '@/components/exam/StudentSubmissionDetailModal';
import StudentAttemptsModal, { StudentAttemptItem } from '@/components/exam/StudentAttemptsModal';

interface Assignment {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  classes: {
    id: string;
    name: string;
    group_type: string;
    academic_year?: string;
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
  class_id: string | null;
}

interface Profile {
  id: string;
  email: string;
  role: string;
}

interface Class {
  id: string;
  name: string;
  group_type: string;
  academic_year: string;
}

interface TeacherStudentsClientProps {
  assignments: Assignment[];
  students: Student[];
  studentProfiles: Profile[];
  allClasses: Class[];
  progress: any[];
  logs: any[];
  examResults: any[];
  chapters: any[];
  token: string;
  teacherId: string;
  userRole?: string;
  allTeachers?: any[];
  allExams?: any[];
  examAssignments?: any[];
}

export default function TeacherStudentsClient({
  assignments,
  students,
  studentProfiles,
  allClasses,
  progress,
  logs,
  examResults,
  chapters,
  token,
  teacherId,
  userRole = 'teacher',
  allTeachers = [],
  allExams = [],
  examAssignments = []
}: TeacherStudentsClientProps) {
  const isHOD = userRole === 'head_of_department';
  const supabase = createSupabaseClient(token);

  // ----------------------------------------------------
  // TRẠNG THÁI LOCAL CSDL GIẢ LẬP
  // ----------------------------------------------------
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(assignments);
  const [localStudents, setLocalStudents] = useState<Student[]>(students);
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(studentProfiles);
  const [localAllClasses, setLocalAllClasses] = useState<Class[]>(allClasses);
  const [localExams, setLocalExams] = useState<any[]>(allExams);
  const [localExamAssignments, setLocalExamAssignments] = useState<any[]>(examAssignments);

  // Tab điều hướng chính: 'classes' (Quản lý lớp học & tự học) | 'submissions' (Xem nộp bài nhanh)
  const [mainTab, setMainTab] = useState<'classes' | 'submissions'>('classes');
  
  // Sub-tab bên trong chi tiết lớp: 'roster' (Học sinh & Lý thuyết) vs 'submissions' (Xem nộp bài nhanh của lớp)
  const [classSubTab, setClassSubTab] = useState<'roster' | 'submissions'>('roster');

  // Lớp đang chọn để quản lý (null: hiện lưới danh sách lớp)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  // Học sinh đang chọn xem chi tiết thống kê học tập (sidebar)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);

  // State bộ lọc Xem nộp bài nhanh
  const [quickClassFilterId, setQuickClassFilterId] = useState<string>('all');
  const [quickExamFilterId, setQuickExamFilterId] = useState<string>('all');
  const [quickStatusFilter, setQuickStatusFilter] = useState<'all' | 'submitted' | 'unsubmitted'>('all');
  const [quickScoreMode, setQuickScoreMode] = useState<'best' | 'all'>('best');
  const [quickSearchKeyword, setQuickSearchKeyword] = useState<string>('');

  // Modals xem chi tiết bài làm & xem tất cả các lần nộp
  const [inspectingSubmission, setInspectingSubmission] = useState<SubmissionData | null>(null);
  const [viewingAttemptsData, setViewingAttemptsData] = useState<{
    studentName: string;
    studentMshs: string;
    className: string;
    examTitle: string;
    attempts: StudentAttemptItem[];
  } | null>(null);

  // Form Thêm/Sửa Lớp học
  const [addingClass, setAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState<'T' | 'X' | 'K'>('T');
  const [newClassYear, setNewClassYear] = useState('2026-2027');

  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassGroup, setEditClassGroup] = useState<'T' | 'X' | 'K'>('T');
  const [editClassYear, setEditClassYear] = useState('2026-2027');

  // Form Thêm học sinh
  const [addingStudent, setAddingStudent] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newMshs, setNewMshs] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [importingExcel, setImportingExcel] = useState(false);
  const [hodActiveSubTab, setHodActiveSubTab] = useState<'classes' | 'teachers'>('classes');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState<'teacher' | 'head_of_department'>('teacher');

  // State Quản lý Modal Import Excel học sinh
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelTargetClassId, setExcelTargetClassId] = useState<string | null>(null);

  const handleExcelImportSuccess = (importedCount: number, classId: string) => {
    alert(`Đã thêm thành công ${importedCount} học sinh vào lớp học!`);
    setShowExcelModal(false);
    window.location.reload();
  };

  // State Chỉnh sửa học sinh (Inline editing)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editMshs, setEditMshs] = useState('');
  const [editStudentClassId, setEditStudentClassId] = useState('');

  // ----------------------------------------------------
  // LOGIC CRUD LỚP HỌC (CLASS CRUD LOGIC)
  // ----------------------------------------------------
  const handleAddClass = async () => {
    if (!newClassName.trim()) {
      alert('Vui lòng điền tên lớp học.');
      return;
    }
    try {
      const newClassId = crypto.randomUUID();

      const { data: newClass, error: classErr } = await supabase
        .from('classes')
        .insert({
          id: newClassId,
          name: newClassName.trim().toUpperCase(),
          group_type: newClassGroup,
          academic_year: newClassYear.trim()
        })
        .select()
        .single();

      if (classErr) throw classErr;

      const defaultSubjectId = assignments.length > 0 ? assignments[0].subject_id : '';

      const { data: newAss, error: assErr } = await supabase
        .from('teacher_classes')
        .insert({
          teacher_id: teacherId,
          class_id: newClassId,
          subject_id: defaultSubjectId
        })
        .select('*, classes(*), subjects(*)')
        .single();

      if (assErr) throw assErr;

      setLocalAllClasses([...localAllClasses, newClass]);
      setLocalAssignments([...localAssignments, newAss]);
      setNewClassName('');
      setAddingClass(false);
    } catch (err) {
      console.error(err);
      alert('Không thể tạo lớp học.');
    }
  };

  const handleSaveEditClass = async (classId: string) => {
    if (!editClassName.trim()) return;
    try {
      const { data: updatedClass, error: classErr } = await supabase
        .from('classes')
        .update({
          name: editClassName.trim().toUpperCase(),
          group_type: editClassGroup,
          academic_year: editClassYear.trim()
        })
        .eq('id', classId)
        .select()
        .single();

      if (classErr) throw classErr;

      setLocalAllClasses(localAllClasses.map(c => c.id === classId ? updatedClass : c));
      setLocalAssignments(localAssignments.map(ass => {
        if (ass.class_id === classId) {
          return {
            ...ass,
            classes: {
              ...ass.classes,
              name: updatedClass.name,
              group_type: updatedClass.group_type,
              academic_year: updatedClass.academic_year
            }
          };
        }
        return ass;
      }));
      setEditingClassId(null);
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật lớp học.');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lớp học này?')) return;
    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;

      setLocalAllClasses(localAllClasses.filter(c => c.id !== classId));
      setLocalAssignments(localAssignments.filter(ass => ass.class_id !== classId));
      setLocalStudents(localStudents.map(s => s.class_id === classId ? { ...s, class_id: null } : s));

      if (selectedClassId === classId) {
        setSelectedClassId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xóa lớp học.');
    }
  };

  // ----------------------------------------------------
  // LOGIC CRUD HỌC SINH (STUDENTS CRUD LOGIC)
  // ----------------------------------------------------
  const handleAddStudent = async () => {
    if (!newFullName.trim() || !newMshs.trim() || !newEmail.trim() || !selectedClassId) {
      alert('Vui lòng điền đầy đủ thông tin học sinh.');
      return;
    }
    try {
      const cleanEmail = newEmail.trim().toLowerCase();

      // 1. Kiểm tra xem học sinh đã có Profile trước đó chưa (ví dụ đã đăng nhập Google trước)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      let studentId = existingProfile?.id;
      let finalProfile = existingProfile;

      if (!studentId) {
        studentId = crypto.randomUUID();
        const { data: newProfile, error: profileErr } = await supabase
          .from('profiles')
          .insert({
            id: studentId,
            email: cleanEmail,
            role: 'student'
          })
          .select()
          .single();

        if (profileErr) throw profileErr;
        finalProfile = newProfile;
      }

      // 2. Thêm hoặc cập nhật thông tin chi tiết vào lớp học được chọn
      const { data: existingDetail } = await supabase
        .from('student_details')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();

      let finalStudent: any = null;
      if (existingDetail) {
        const { data: updatedStudent, error: updateErr } = await supabase
          .from('student_details')
          .update({
            mshs: newMshs.trim().toUpperCase(),
            full_name: newFullName.trim(),
            class_id: selectedClassId
          })
          .eq('student_id', studentId)
          .select()
          .single();

        if (updateErr) throw updateErr;
        finalStudent = updatedStudent;
      } else {
        const { data: newStudent, error: studentErr } = await supabase
          .from('student_details')
          .insert({
            student_id: studentId,
            mshs: newMshs.trim().toUpperCase(),
            full_name: newFullName.trim(),
            class_id: selectedClassId
          })
          .select()
          .single();

        if (studentErr) throw studentErr;
        finalStudent = newStudent;
      }

      // Cập nhật state cục bộ
      if (finalProfile) {
        setLocalProfiles(prev => {
          const exists = prev.some(p => p.id === finalProfile.id);
          return exists ? prev.map(p => p.id === finalProfile.id ? finalProfile : p) : [...prev, finalProfile];
        });
      }

      if (finalStudent) {
        setLocalStudents(prev => {
          const exists = prev.some(s => s.student_id === finalStudent.student_id);
          return exists ? prev.map(s => s.student_id === finalStudent.student_id ? finalStudent : s) : [...prev, finalStudent];
        });
      }

      setNewFullName('');
      setNewMshs('');
      setNewEmail('');
      setAddingStudent(false);
    } catch (err: any) {
      console.error(err);
      alert('Không thể thêm học sinh: ' + (err?.message || 'Lỗi không xác định'));
    }
  };

  const handleSaveEditStudent = async (studentId: string) => {
    if (!editFullName.trim() || !editMshs.trim()) return;
    try {
      const { data, error } = await supabase
        .from('student_details')
        .update({
          full_name: editFullName.trim(),
          mshs: editMshs.trim().toUpperCase(),
          class_id: editStudentClassId || null
        })
        .eq('student_id', studentId)
        .select()
        .single();

      if (error) throw error;

      setLocalStudents(localStudents.map(s => s.student_id === studentId ? data : s));
      setEditingStudentId(null);
    } catch (err) {
      console.error(err);
      alert('Không thể lưu chỉnh sửa học sinh.');
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi lớp học hiện tại?')) return;
    try {
      const { data, error } = await supabase
        .from('student_details')
        .update({ class_id: null })
        .eq('student_id', studentId)
        .select()
        .single();

      if (error) throw error;
      setLocalStudents(localStudents.map(s => s.student_id === studentId ? data : s));
    } catch (err) {
      console.error(err);
      alert('Không thể xóa học sinh khỏi lớp.');
    }
  };

  // ----------------------------------------------------
  // LOGIC PHÂN CÔNG GIÁO VIÊN BỘ MÔN (HOD ONLY)
  // ----------------------------------------------------
  const handleAssignTeacher = async (classId: string, subjectId: string, teacherIdToAssign: string) => {
    try {
      const existing = localAssignments.find(ass => ass.class_id === classId && ass.subject_id === subjectId);
      
      if (existing) {
        const { data, error } = await supabase
          .from('teacher_classes')
          .update({ teacher_id: teacherIdToAssign })
          .eq('id', existing.id)
          .select('*, classes(*), subjects(*)')
          .single();

        if (error) throw error;
        
        setLocalAssignments(localAssignments.map(ass => ass.id === existing.id ? data : ass));
        alert('Cập nhật phân công giáo viên thành công!');
      } else {
        const newAssignmentId = crypto.randomUUID();
        const { data, error } = await supabase
          .from('teacher_classes')
          .insert({
            id: newAssignmentId,
            class_id: classId,
            subject_id: subjectId,
            teacher_id: teacherIdToAssign
          })
          .select('*, classes(*), subjects(*)')
          .single();

        if (error) throw error;
        
        setLocalAssignments([...localAssignments, data]);
        alert('Phân công giáo viên thành công!');
      }
    } catch (err) {
      console.error('Lỗi khi phân công giáo viên:', err);
      alert('Không thể thực hiện phân công.');
    }
  };

  // ----------------------------------------------------
  // LOGIC NHẬP HỌC SINH TỪ FILE EXCEL MẪU
  // ----------------------------------------------------
  const handleDownloadTemplate = () => {
    const headers = "Họ và Tên,MSHS,Email\n";
    const sample1 = "Nguyễn Văn B,FPT00234,bnguyen@fpt.edu.vn\n";
    const sample2 = "Trần Thị C,FPT00567,ctran@fpt.edu.vn\n";
    const content = headers + sample1 + sample2;
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mau_danh_sach_hoc_sinh.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert('File Excel rỗng hoặc không đúng định dạng.');
        return;
      }

      const importedStudents = [];
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.trim());
        if (columns.length >= 3) {
          const [fullName, mshs, email] = columns;
          if (fullName && mshs && email) {
            importedStudents.push({ fullName, mshs, email });
          }
        }
      }

      if (importedStudents.length === 0) {
        alert('Không tìm thấy học sinh hợp lệ trong file.');
        return;
      }

      let successCount = 0;
      for (const item of importedStudents) {
        try {
          const newUserId = crypto.randomUUID();
          
          // 1. Tạo profile tài khoản học sinh
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: newUserId,
              email: item.email,
              role: 'student'
            })
            .select()
            .single();

          if (profileError) throw profileError;

          // 2. Thêm chi tiết học sinh và xếp vào lớp hiện tại
          const { error: detailError } = await supabase
            .from('student_details')
            .insert({
              student_id: newUserId,
              mshs: item.mshs,
              full_name: item.fullName,
              class_id: selectedClassId
            });

          if (detailError) throw detailError;

          successCount++;
        } catch (err) {
          console.error('Lỗi khi import học sinh:', err);
        }
      }

      if (successCount > 0) {
        alert(`Đã nhập thành công ${successCount} học sinh vào lớp!`);
        window.location.reload();
      } else {
        alert('Không thể nhập học sinh. Vui lòng kiểm tra lại định dạng file hoặc email trùng lặp.');
      }
    };
    reader.readAsText(file);
  };

  // ----------------------------------------------------
  // LOGIC TRƯỞNG BỘ MÔN THÊM GIÁO VIÊN & PHÂN QUYỀN
  // ----------------------------------------------------
  const handleHODCreateTeacher = async () => {
    if (!newTeacherEmail.trim()) {
      alert('Vui lòng nhập Email.');
      return;
    }
    if (!newTeacherEmail.includes('@')) {
      alert('Email không hợp lệ.');
      return;
    }
    try {
      const newTeacherId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: newTeacherId,
          email: newTeacherEmail.trim().toLowerCase(),
          role: newTeacherRole
        })
        .select()
        .single();

      if (error) throw error;

      alert('Thêm tài khoản giáo viên và gán quyền thành công!');
      setNewTeacherEmail('');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Không thể tạo tài khoản giáo viên.');
    }
  };

  const handleHODChangeTeacherRole = async (teacherId: string, newRole: 'teacher' | 'head_of_department') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', teacherId);

      if (error) throw error;
      alert('Cập nhật vai trò giáo viên thành công!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Không thể cập nhật vai trò giáo viên.');
    }
  };

  // ----------------------------------------------------
  // LOGIC TÍNH TOÁN PHÂN TÍCH TIẾN ĐỘ & BIỂU ĐỒ TRỰC QUAN
  // ----------------------------------------------------
  const getClassStats = (classId: string) => {
    // 1. Phân công môn học của lớp này
    const classAss = localAssignments.find(ass => ass.class_id === classId);
    const subjectId = classAss?.subject_id || '';

    // 2. Tổng số bài học của môn học này
    const classLessons = chapters
      .filter(c => c.subject_id === subjectId)
      .reduce((acc, c) => [...acc, ...(c.lessons || [])], [] as any[]);
    const classLessonIds = classLessons.map((l: any) => l.id);

    // 3. Học sinh thuộc lớp
    const classStudents = localStudents.filter(s => s.class_id === classId);

    if (classStudents.length === 0) {
      return { avgPercent: 0, avgMinutes: 0, goodCount: 0, fairCount: 0, weakCount: 0, studentsCount: 0 };
    }

    let totalPercentSum = 0;
    let totalMinutesSum = 0;
    let goodCount = 0; // >= 70%
    let fairCount = 0; // 40% - 69%
    let weakCount = 0; // < 40%

    classStudents.forEach(st => {
      // Tính phần trăm hoàn thành của từng em
      const stProgress = progress.filter(p => 
        p.student_id === st.student_id && 
        classLessonIds.includes(p.lesson_id) && 
        p.completed
      );
      const stPercent = classLessonIds.length > 0 
        ? Math.round((stProgress.length / classLessonIds.length) * 100) 
        : 0;

      // Tính tổng phút
      const stLogs = logs.filter(l => 
        l.student_id === st.student_id && 
        classLessonIds.includes(l.lesson_id)
      );
      const stMinutes = Math.round(stLogs.reduce((acc: number, l: any) => acc + l.duration_seconds, 0) / 60);

      totalPercentSum += stPercent;
      totalMinutesSum += stMinutes;

      if (stPercent >= 70) {
        goodCount++;
      } else if (stPercent >= 40) {
        fairCount++;
      } else {
        weakCount++;
      }
    });

    const avgPercent = Math.round(totalPercentSum / classStudents.length);
    const avgMinutes = Math.round(totalMinutesSum / classStudents.length);

    return {
      avgPercent,
      avgMinutes,
      goodCount,
      fairCount,
      weakCount,
      studentsCount: classStudents.length
    };
  };

  const getGroupBadge = (groupType: string) => {
    switch (groupType) {
      case 'T':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">Tự nhiên</span>;
      case 'X':
        return <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Xã hội</span>;
      default:
        return <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">Khai phóng</span>;
    }
  };

  const managedClasses = localAssignments.reduce((acc: Class[], ass: Assignment) => {
    if (!acc.some((c: Class) => c.id === ass.classes.id)) {
      const dbClass = localAllClasses.find((c: Class) => c.id === ass.classes.id);
      acc.push(dbClass || {
        id: ass.classes.id,
        name: ass.classes.name,
        group_type: ass.classes.group_type,
        academic_year: ass.classes.academic_year || '2026-2027'
      });
    }
    return acc;
  }, [] as Class[]);

  // ----------------------------------------------------
  // LOGIC & GIAO DIỆN XEM NỘP BÀI NHANH (QUICK SUBMISSIONS ENGINE)
  // ----------------------------------------------------
  const renderQuickSubmissions = (lockedClassId?: string | null) => {
    const isLocked = Boolean(lockedClassId && lockedClassId !== 'all');
    const effectiveClassId = lockedClassId !== undefined ? (lockedClassId || 'all') : quickClassFilterId;
    
    // 1. Học sinh mục tiêu
    const managedClassIds = new Set(localAssignments.map(a => a.class_id));
    const targetStudents = localStudents.filter(s => {
      if (effectiveClassId === 'all') {
        return s.class_id && managedClassIds.has(s.class_id);
      }
      return s.class_id === effectiveClassId;
    });

    const targetStudentIds = new Set(targetStudents.map(s => s.student_id));
    const targetStudentMap = new Map(targetStudents.map(s => [s.student_id, s]));

    // 2. Danh sách đề thi
    const availableExamsList = localExams.length > 0
      ? localExams
      : Array.from(new Map(examResults.map((r: any) => [r.exam_id, r.exams])).values()).filter(Boolean);

    // 3. Đề thi lọc
    const targetExam = quickExamFilterId !== 'all'
      ? (availableExamsList.find((e: any) => e.id === quickExamFilterId) || null)
      : null;

    // 4. Kết quả bài nộp của nhóm học sinh này
    const relevantResults = examResults.filter((r: any) => targetStudentIds.has(r.student_id));

    // 5. Tạo các hàng dữ liệu
    let rows: any[] = [];

    if (quickScoreMode === 'best') {
      if (targetExam) {
        rows = targetStudents.map(student => {
          const studentAttempts = relevantResults
            .filter((r: any) => r.student_id === student.student_id && r.exam_id === targetExam.id)
            .sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

          const bestAttempt = studentAttempts.length > 0
            ? studentAttempts.reduce((prev: any, curr: any) => (Number(curr.score) > Number(prev.score) ? curr : prev), studentAttempts[0])
            : null;

          return {
            student,
            exam: targetExam,
            result: bestAttempt,
            allAttempts: studentAttempts,
            attemptsCount: studentAttempts.length,
            isSubmitted: Boolean(bestAttempt)
          };
        });
      } else {
        const studentExamMap = new Map<string, any[]>();
        relevantResults.forEach((r: any) => {
          const key = `${r.student_id}_${r.exam_id}`;
          if (!studentExamMap.has(key)) studentExamMap.set(key, []);
          studentExamMap.get(key)!.push(r);
        });

        studentExamMap.forEach((attempts, key) => {
          const [studentId, examId] = key.split('_');
          const student = targetStudentMap.get(studentId);
          if (!student) return;

          const exam = availableExamsList.find((e: any) => e.id === examId) || attempts[0]?.exams || { id: examId, title: 'Đề thi', duration_minutes: 45 };
          const bestAttempt = attempts.reduce((prev: any, curr: any) => (Number(curr.score) > Number(prev.score) ? curr : prev), attempts[0]);

          rows.push({
            student,
            exam,
            result: bestAttempt,
            allAttempts: attempts,
            attemptsCount: attempts.length,
            isSubmitted: true
          });
        });

        // Thêm học sinh chưa làm bài nào
        const submittedStudentIds = new Set(relevantResults.map((r: any) => r.student_id));
        const unsubmittedStudents = targetStudents
          .filter(s => !submittedStudentIds.has(s.student_id))
          .map(student => ({
            student,
            exam: null,
            result: null,
            allAttempts: [],
            attemptsCount: 0,
            isSubmitted: false
          }));

        rows.push(...unsubmittedStudents);
      }
    } else {
      // Tất cả lần làm
      if (targetExam) {
        targetStudents.forEach(student => {
          const studentAttempts = relevantResults
            .filter((r: any) => r.student_id === student.student_id && r.exam_id === targetExam.id)
            .sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

          if (studentAttempts.length > 0) {
            studentAttempts.forEach((res: any, idx: number) => {
              rows.push({
                student,
                exam: targetExam,
                result: res,
                allAttempts: studentAttempts,
                attemptsCount: studentAttempts.length,
                attemptIndex: studentAttempts.length - idx,
                isSubmitted: true
              });
            });
          } else {
            rows.push({
              student,
              exam: targetExam,
              result: null,
              allAttempts: [],
              attemptsCount: 0,
              isSubmitted: false
            });
          }
        });
      } else {
        const sortedResults = [...relevantResults].sort((a: any, b: any) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );

        sortedResults.forEach((r: any) => {
          const student = targetStudentMap.get(r.student_id);
          if (!student) return;
          const exam = availableExamsList.find((e: any) => e.id === r.exam_id) || r.exams || { id: r.exam_id, title: 'Đề thi', duration_minutes: 45 };
          const studentExamAttempts = relevantResults.filter((res: any) => res.student_id === r.student_id && res.exam_id === r.exam_id);

          rows.push({
            student,
            exam,
            result: r,
            allAttempts: studentExamAttempts,
            attemptsCount: studentExamAttempts.length,
            isSubmitted: true
          });
        });

        const submittedStudentIds = new Set(relevantResults.map((r: any) => r.student_id));
        const unsubmittedStudents = targetStudents
          .filter(s => !submittedStudentIds.has(s.student_id))
          .map(student => ({
            student,
            exam: null,
            result: null,
            allAttempts: [],
            attemptsCount: 0,
            isSubmitted: false
          }));

        rows.push(...unsubmittedStudents);
      }
    }

    // Lọc theo trạng thái & từ khóa
    const filteredRows = rows.filter(item => {
      if (quickStatusFilter === 'submitted' && !item.isSubmitted) return false;
      if (quickStatusFilter === 'unsubmitted' && item.isSubmitted) return false;
      if (quickSearchKeyword.trim()) {
        const kw = quickSearchKeyword.toLowerCase();
        const matchName = (item.student.full_name || '').toLowerCase().includes(kw);
        const matchMshs = (item.student.mshs || '').toLowerCase().includes(kw);
        if (!matchName && !matchMshs) return false;
      }
      return true;
    });

    const totalStudentsCount = targetStudents.length;
    const submittedCount = rows.filter(s => s.isSubmitted).length;
    const unsubmittedCount = rows.filter(s => !s.isSubmitted).length;
    const rate = totalStudentsCount > 0
      ? Math.round((new Set(rows.filter(s => s.isSubmitted).map(s => s.student.student_id)).size / totalStudentsCount) * 100)
      : 0;

    const validScores = rows.filter(s => s.result).map(s => Number(s.result.score));
    const avg = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '0.0';
    const max = validScores.length > 0 ? Math.max(...validScores) : 0;
    const min = validScores.length > 0 ? Math.min(...validScores) : 0;

    const handleExportCSV = () => {
      let csvContent = `STT,MSHS,Họ và tên,Lớp,Đề thi,Điểm số,Số câu đúng,Thời gian làm bài,Thời điểm nộp bài,Số lần làm,Trạng thái\n`;
      filteredRows.forEach((item, idx) => {
        const stt = idx + 1;
        const mshs = item.student.mshs || '';
        const name = `"${item.student.full_name || ''}"`;
        const clsName = localAllClasses.find(c => c.id === item.student.class_id)?.name || '12';
        const examTitle = `"${item.exam?.title || 'Đề thi'}"`;
        const score = item.result ? item.result.score : '';
        const correct = item.result ? `${item.result.correct_answers}/${item.result.total_questions || 0}` : '';
        const timeSpent = item.result ? `${Math.floor((item.result.time_spent_seconds || 0) / 60)} phút ${(item.result.time_spent_seconds || 0) % 60}s` : '';
        const date = item.result?.created_at ? new Date(item.result.created_at).toLocaleString('vi-VN') : '';
        const attempts = item.attemptsCount || (item.isSubmitted ? 1 : 0);
        const status = item.isSubmitted ? 'Đã nộp' : 'Chưa làm';

        csvContent += `${stt},${mshs},${name},${clsName},${examTitle},${score},${correct},${timeSpent},${date},${attempts},${status}\n`;
      });

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SoDiem_Nhanh_${effectiveClassId !== 'all' ? `Lop_${localAllClasses.find(c => c.id === effectiveClassId)?.name || ''}` : 'TatCaLop'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-5 animate-fade-in">
        {/* Thẻ thống kê tổng quan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="flat-card p-4 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sĩ số theo dõi</span>
            <div className="text-xl sm:text-2xl font-black text-foreground">{totalStudentsCount} học sinh</div>
          </div>

          <div className="flat-card p-4 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tỷ lệ nộp bài</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-primary">{submittedCount}/{totalStudentsCount}</span>
              <span className="text-xs font-bold text-muted-foreground">({rate}%)</span>
            </div>
          </div>

          <div className="flat-card p-4 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Điểm trung bình</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-green-600">{avg}</span>
              <span className="text-xs font-bold text-muted-foreground">/ 10</span>
            </div>
          </div>

          <div className="flat-card p-4 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cao nhất / Thấp nhất</span>
            <div className="text-lg sm:text-xl font-black text-foreground">
              <span className="text-green-600">{max}</span> / <span className="text-orange-500">{min}</span>
            </div>
          </div>
        </div>

        {/* Thanh công cụ và bộ lọc nhanh */}
        <div className="flat-card flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Lọc Lớp nếu không bị khóa */}
            {!isLocked && (
              <select
                value={quickClassFilterId}
                onChange={(e) => setQuickClassFilterId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
              >
                <option value="all">Tất cả các lớp phụ trách</option>
                {managedClasses.map(c => (
                  <option key={c.id} value={c.id}>Lớp {c.name}</option>
                ))}
              </select>
            )}

            {/* Lọc Đề thi */}
            <select
              value={quickExamFilterId}
              onChange={(e) => setQuickExamFilterId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-bold text-foreground focus:outline-none max-w-xs truncate"
            >
              <option value="all">Tất cả đề thi ({availableExamsList.length})</option>
              {availableExamsList.map((ex: any) => (
                <option key={ex.id} value={ex.id}>{ex.title}</option>
              ))}
            </select>

            {/* Trạng thái */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setQuickStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  quickStatusFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                }`}
              >
                Tất cả ({totalStudentsCount})
              </button>
              <button
                onClick={() => setQuickStatusFilter('submitted')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  quickStatusFilter === 'submitted'
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                }`}
              >
                Đã nộp ({submittedCount})
              </button>
              <button
                onClick={() => setQuickStatusFilter('unsubmitted')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  quickStatusFilter === 'unsubmitted'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                }`}
              >
                Chưa làm ({unsubmittedCount})
              </button>
            </div>

            {/* Chế độ xem điểm */}
            <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-xl border border-border">
              <button
                onClick={() => setQuickScoreMode('best')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  quickScoreMode === 'best'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Học sinh làm nhiều lần thì hiện điểm cao nhất và nhấn xem để xem các lần nộp"
              >
                <Trophy className="h-3 w-3" /> Điểm cao nhất
              </button>
              <button
                onClick={() => setQuickScoreMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  quickScoreMode === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Hiển thị tất cả các lượt nộp bài rời rạc"
              >
                <Layers className="h-3 w-3" /> Tất cả lượt nộp
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm tên hoặc MSHS..."
                value={quickSearchKeyword}
                onChange={(e) => setQuickSearchKeyword(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none w-full sm:w-48"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
              title="Xuất bảng điểm ra file CSV"
            >
              <Download className="h-3.5 w-3.5" /> Xuất CSV
            </button>
          </div>
        </div>

        {/* Bảng Danh Sách Nộp Bài Nhanh */}
        <div className="flat-card overflow-hidden p-0 border border-border">
          <div className="p-3.5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Sổ Theo Dõi Nộp Bài Nhanh
            </h4>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-muted-foreground">
                Hiển thị {filteredRows.length} kết quả
              </span>
              {quickScoreMode === 'best' && (
                <span className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full text-[10px] font-black">
                  Điểm Cao Nhất
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
                  <th className="p-3.5">Họ và tên</th>
                  <th className="p-3.5">Lớp</th>
                  <th className="p-3.5">Đề thi</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Điểm số</th>
                  <th className="p-3.5">Số câu đúng</th>
                  <th className="p-3.5">Thời gian làm</th>
                  <th className="p-3.5">Thời điểm nộp</th>
                  <th className="p-3.5 text-right">Chi tiết bài làm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground italic">
                      Không có kết quả nộp bài nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((item, idx) => {
                    const hasSubmitted = item.isSubmitted;
                    const score = item.result ? Number(item.result.score) : null;
                    const studentClass = localAllClasses.find(c => c.id === item.student.class_id)?.name || '12';
                    const examTitle = item.exam?.title || targetExam?.title || 'Đề thi';
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
                        <td className="p-3.5 font-semibold text-foreground max-w-[180px] truncate" title={examTitle}>
                          {examTitle}
                        </td>
                        <td className="p-3.5">
                          {hasSubmitted ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                <CheckCircle2 className="h-3 w-3" /> Đã nộp bài
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
                                {quickScoreMode === 'best' && attemptsCount > 1 && (
                                  <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap" title="Điểm cao nhất">
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
                                onClick={() => {
                                  const examId = item.result.exam_id || item.exam?.id;
                                  const examObj = item.exam || availableExamsList.find((e: any) => e.id === examId) || item.result?.exams;
                                  setInspectingSubmission({
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
                                  });
                                }}
                                className="btn-secondary text-[11px] py-1 px-2.5 font-bold inline-flex items-center gap-1 text-primary border-primary/20 hover:bg-primary/5"
                                title={quickScoreMode === 'best' && attemptsCount > 1 ? "Xem bài làm điểm cao nhất" : "Xem bài làm chi tiết"}
                              >
                                <Eye className="h-3.5 w-3.5" /> Xem bài làm
                              </button>

                              {attemptsCount > 1 && (
                                <button
                                  onClick={() => {
                                    const examId = item.result?.exam_id || item.exam?.id;
                                    const examObj = item.exam || availableExamsList.find((e: any) => e.id === examId) || item.result?.exams;
                                    setViewingAttemptsData({
                                      studentName: item.student.full_name,
                                      studentMshs: item.student.mshs,
                                      className: studentClass,
                                      examTitle: examObj?.title || 'Đề thi',
                                      attempts: item.allAttempts || []
                                    });
                                  }}
                                  className="btn-secondary text-[11px] py-1 px-2.5 font-bold inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                                  title="Xem tất cả các lần nộp của học sinh này"
                                >
                                  <Trophy className="h-3.5 w-3.5" /> Các lần nộp ({attemptsCount})
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
    );
  };

  // ----------------------------------------------------
  // GIAO DIỆN 1: QUẢN LÝ HỌC SINH CỦA MỘT LỚP CỤ THỂ
  // ----------------------------------------------------
  if (selectedClassId) {
    const activeClass = localAllClasses.find(c => c.id === selectedClassId);
    const classAss = localAssignments.find(ass => ass.class_id === selectedClassId);
    const classSubjectName = classAss?.subjects?.name || 'Môn học';

    const classLessons = chapters
      .filter(chap => chap.subject_id === classAss?.subject_id)
      .reduce((acc, c) => [...acc, ...(c.lessons || [])], [] as any[]);
    const classLessonIds = classLessons.map((l: any) => l.id);

    const filteredStudents = localStudents.filter(s => s.class_id === selectedClassId);
    const analytics = getClassStats(selectedClassId);

    // Chuẩn bị dữ liệu hiển thị bảng
    const studentTableData = filteredStudents.map(student => {
      const profile = localProfiles.find(p => p.id === student.student_id);
      
      const stProgress = progress.filter(p => 
        p.student_id === student.student_id && 
        classLessonIds.includes(p.lesson_id) && 
        p.completed
      );
      const stPercent = classLessonIds.length > 0 
        ? Math.round((stProgress.length / classLessonIds.length) * 100) 
        : 0;

      const stLogs = logs.filter(l => 
        l.student_id === student.student_id && 
        classLessonIds.includes(l.lesson_id)
      );
      const stMinutes = Math.round(stLogs.reduce((acc: number, l: any) => acc + l.duration_seconds, 0) / 60);

      const stAllProgress = progress.filter(p => 
        p.student_id === student.student_id && 
        classLessonIds.includes(p.lesson_id)
      );
      const lastAccess = stAllProgress.length > 0 
        ? new Date(Math.max(...stAllProgress.map(p => new Date(p.last_accessed_at).getTime()))).toLocaleDateString('vi-VN')
        : 'Chưa học';

      return {
        ...student,
        email: profile?.email || 'N/A',
        percent: stPercent,
        minutes: stMinutes,
        lastAccess
      };
    });

    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* NÚT QUAY LẠI VÀ TIÊU ĐỀ LỚP HỌC */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <button
            onClick={() => { setSelectedClassId(null); setAddingStudent(false); setEditingStudentId(null); setSelectedStudentDetail(null); setClassSubTab('roster'); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách lớp học
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-2xl text-foreground">Lớp học {activeClass?.name}</h3>
                {activeClass && getGroupBadge(activeClass.group_type)}
              </div>
              <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                <span>Niên khóa: {activeClass?.academic_year}</span>
                <span>&bull;</span>
                <span>Theo dõi bộ môn: {classSubjectName}</span>
              </p>
            </div>

            {/* Sub-tab switcher: Roster vs Quick Submissions */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
              <button
                onClick={() => setClassSubTab('roster')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  classSubTab === 'roster'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="h-3.5 w-3.5" /> Học Sinh & Lý Thuyết
              </button>

              <button
                onClick={() => setClassSubTab('submissions')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  classSubTab === 'submissions'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Xem Nộp Bài Nhanh
              </button>
            </div>
          </div>
        </div>

        {/* NỘI DUNG SUB-TAB */}
        {classSubTab === 'submissions' && renderQuickSubmissions(selectedClassId)}

        {classSubTab !== 'submissions' && (
          <>
            {/* 1. DASHBOARD PHÂN TÍCH TRỰC QUAN (CLASS CHARTS & METRICS) */}
            <div className="grid gap-6 md:grid-cols-12">
              {/* Hộp Chỉ số nhanh */}
              <div className="md:col-span-4 grid gap-3.5">
                <div className="flat-card flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#e7f1ff] dark:bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 border border-[#b6d4fe]/40">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Sĩ số lớp</span>
                    <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{analytics.studentsCount} học sinh</h4>
                  </div>
                </div>

                <div className="flat-card flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#d1e7dd] dark:bg-emerald-500/20 text-[#198754] flex items-center justify-center font-bold shrink-0 border border-[#a3cfbb]/40">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Tiến độ trung bình</span>
                    <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{analytics.avgPercent}% hoàn thành</h4>
                  </div>
                </div>

                <div className="flat-card flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#cff4fc] dark:bg-cyan-500/20 text-[#0dcaf0] flex items-center justify-center font-bold shrink-0 border border-[#9eeaf9]/40">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Tổng thời gian học</span>
                    <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{analytics.avgMinutes} phút tự học</h4>
                  </div>
                </div>
              </div>

              {/* Biểu đồ phân loại học tập (CSS-based Progress Bars) */}
              <div className="md:col-span-8 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-primary" /> Phân loại học tập học sinh
                </h4>

                {analytics.studentsCount === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Chưa có học sinh để phân loại.</p>
                ) : (
                  <div className="space-y-4.5 pt-2">
                    {/* Tốt */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-green-500 flex items-center gap-1">Tốt (Hoàn thành ≥ 70%)</span>
                        <strong className="text-foreground">{analytics.goodCount} học sinh ({Math.round((analytics.goodCount / analytics.studentsCount) * 100)}%)</strong>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(analytics.goodCount / analytics.studentsCount) * 100}%` }} />
                      </div>
                    </div>

                    {/* Khá */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-orange-500 flex items-center gap-1">Khá (Hoàn thành 40% - 69%)</span>
                        <strong className="text-foreground">{analytics.fairCount} học sinh ({Math.round((analytics.fairCount / analytics.studentsCount) * 100)}%)</strong>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(analytics.fairCount / analytics.studentsCount) * 100}%` }} />
                      </div>
                    </div>

                    {/* Cần cố gắng */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-red-500 flex items-center gap-1">Cần cố gắng (Hoàn thành &lt; 40%)</span>
                        <strong className="text-foreground">{analytics.weakCount} học sinh ({Math.round((analytics.weakCount / analytics.studentsCount) * 100)}%)</strong>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(analytics.weakCount / analytics.studentsCount) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. BẢNG DANH SÁCH & QUẢN TRỊ CHI TIẾT */}
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              
              {/* BẢNG THÀNH VIÊN */}
              <div className="lg:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/10 flex justify-between items-center gap-4">
                  <h4 className="font-extrabold text-sm flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-primary" />
                    Danh sách chi tiết học sinh ({analytics.studentsCount} thành viên)
                  </h4>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setExcelTargetClassId(selectedClassId);
                        setShowExcelModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Nhập từ Excel (.xlsx)
                    </button>

                    {!addingStudent && (
                      <button
                        onClick={() => setAddingStudent(true)}
                        className="flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm thủ công
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="p-4">MSHS</th>
                        <th className="p-4">Họ và tên</th>
                        <th className="p-4">Tiến độ</th>
                        <th className="p-4">Thời lượng học</th>
                        <th className="p-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentTableData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground font-semibold">
                            Chưa có học sinh nào trong lớp.
                          </td>
                        </tr>
                      ) : (
                        studentTableData.map(student => {
                          const isEditing = editingStudentId === student.student_id;

                          if (isEditing) {
                            return (
                              <tr key={student.student_id} className="border-b border-border bg-primary/5">
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={editMshs}
                                    onChange={(e) => setEditMshs(e.target.value)}
                                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none font-bold"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={editFullName}
                                    onChange={(e) => setEditFullName(e.target.value)}
                                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none font-bold"
                                  />
                                </td>
                                <td className="p-3">
                                  <select
                                    value={editStudentClassId}
                                    onChange={(e) => setEditStudentClassId(e.target.value)}
                                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs focus:outline-none font-semibold"
                                  >
                                    <option value="">Không có lớp</option>
                                    {localAllClasses.map(c => (
                                      <option key={c.id} value={c.id}>Lớp {c.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-3 text-center" colSpan={2}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleSaveEditStudent(student.student_id)}
                                      className="p-1.5 bg-green-500 text-white rounded hover:opacity-90"
                                      title="Lưu thay đổi"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingStudentId(null)}
                                      className="p-1.5 bg-red-500 text-white rounded hover:opacity-90"
                                      title="Hủy bỏ"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={student.student_id} className="border-b border-border hover:bg-muted/5 transition-colors">
                              <td className="p-4 font-bold text-foreground">{student.mshs}</td>
                              <td className="p-4 font-semibold text-foreground">{student.full_name}</td>
                              <td className="p-4">
                                <span className="font-bold text-foreground">{student.percent}% hoàn thành</span>
                              </td>
                              <td className="p-4 font-bold text-primary">{student.minutes} phút</td>
                              <td className="p-4 text-center flex justify-center gap-2">
                                <button
                                  onClick={() => setSelectedStudentDetail(student as any)}
                                  className="text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/25 px-2.5 py-1 rounded hover:bg-secondary/25"
                                >
                                  Xem chi tiết
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingStudentId(student.student_id);
                                    setEditFullName(student.full_name);
                                    setEditMshs(student.mshs);
                                    setEditStudentClassId(student.class_id || '');
                                  }}
                                  className="p-1 text-primary hover:bg-primary/10 rounded"
                                  title="Chỉnh sửa thông tin"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveStudent(student.student_id)}
                                  className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                                  title="Xóa khỏi lớp"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CỘT PHẢI (COL-SPAN-4): THAO TÁC NHANH & THÊM HỌC SINH */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* THÊM HỌC SINH CARD */}
                {addingStudent ? (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-2.5">
                      <h5 className="font-extrabold text-sm flex items-center gap-1.5"><Plus className="h-4.5 w-4.5 text-primary" /> Thêm học sinh</h5>
                      <button onClick={() => setAddingStudent(false)} className="p-1 hover:bg-muted rounded border border-border bg-background">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Họ và tên</label>
                        <input
                          type="text"
                          placeholder="Ví dụ: Nguyễn Văn B..."
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">MSHS</label>
                        <input
                          type="text"
                          placeholder="FPT00456..."
                          value={newMshs}
                          onChange={(e) => setNewMshs(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Email học sinh</label>
                        <input
                          type="email"
                          placeholder="bhocsinh@fpt.edu.vn..."
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      
                      <button
                        onClick={handleAddStudent}
                        className="w-full text-center flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        <Plus className="h-3.5 w-3.5" /> Tạo tài khoản & xếp lớp
                      </button>
                    </div>
                  </div>
                ) : importingExcel ? (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-border pb-2.5">
                      <h5 className="font-extrabold text-sm flex items-center gap-1.5 text-indigo-600">
                         Nhập từ Excel / CSV
                      </h5>
                      <button onClick={() => setImportingExcel(false)} className="p-1 hover:bg-muted rounded border border-border bg-background">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                        Tải tệp mẫu về máy, điền thông tin học sinh (Họ và Tên, MSHS, Email) rồi tải tệp lên để nhập học sinh hàng loạt.
                      </p>

                      <button
                        onClick={handleDownloadTemplate}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-border hover:bg-muted/50 rounded-lg text-xs font-bold text-foreground transition-all"
                      >
                         Tải File Excel Mẫu (.csv)
                      </button>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block">Chọn tệp danh sách</label>
                        <input
                          type="file"
                          accept=".csv, .txt, .xlsx"
                          onChange={handleImportExcel}
                          className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary file:hover:bg-primary/20 file:cursor-pointer border border-border rounded-lg p-2 bg-background font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <h5 className="font-extrabold text-sm border-b border-border pb-2.5">Thao tác & Hướng dẫn</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                       Nhấp vào nút **"Xem chi tiết"** trên bất kỳ học sinh nào trong danh sách bên trái để mở popup theo dõi tiến triển học tập lý thuyết, thời gian tự học và bảng kết quả đề trắc nghiệm của học sinh đó.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={() => { setAddingStudent(true); setImportingExcel(false); }}
                        className="w-full py-2.5 text-center flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
                      >
                        <Plus className="h-4 w-4" /> Thêm học sinh thủ công
                      </button>
                      <button
                        onClick={() => {
                          setExcelTargetClassId(selectedClassId);
                          setShowExcelModal(true);
                        }}
                        className="w-full py-2.5 text-center flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                      >
                        <FileSpreadsheet className="h-4 w-4" /> Nhập danh sách từ Excel (.xlsx)
                      </button>
                    </div>
                  </div>
                )}

                {/* BÁO CÁO NHANH LỚP HỌC */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <h5 className="font-extrabold text-xs text-muted-foreground uppercase tracking-wider">Thông tin lớp học</h5>
                  <div className="space-y-2 text-xs text-muted-foreground font-semibold">
                    <p> Lớp học được phân chia theo tổ chuyên môn giảng dạy của giáo viên phụ trách.</p>
                    <p> Cần thay đổi lớp học cho học sinh? Nhấp chọn nút **"Sửa"** (icon bút) để thay đổi nhanh lớp học của học sinh sang bất kỳ lớp học khác.</p>
                  </div>
                </div>

                {/* PHÂN CÔNG GIÁO VIÊN BỘ MÔN (HOD ONLY) */}
                {isHOD && (
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <h5 className="font-extrabold text-sm border-b border-border pb-2.5 flex items-center gap-1.5 text-foreground/80">
                      <GraduationCap className="h-4.5 w-4.5 text-indigo-600 animate-pulse" /> Phân công Giáo viên
                    </h5>
                    <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                      Chỉ định giáo viên bộ môn phụ trách giảng dạy **{classSubjectName}** cho lớp **{activeClass?.name}**.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Giáo viên giảng dạy</label>
                        <select
                          value={localAssignments.find(ass => ass.class_id === selectedClassId && ass.subject_id === classAss?.subject_id)?.teacher_id || ''}
                          onChange={(e) => handleAssignTeacher(selectedClassId, classAss?.subject_id || '', e.target.value)}
                          className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-bold text-foreground"
                        >
                          <option value="">-- Chưa phân công --</option>
                          {allTeachers?.map(t => (
                            <option key={t.id} value={t.id}>{t.email}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </>
        )}
          
        {/* POPUP MODAL XEM CHI TIẾT HỌC SINH */}
        {selectedStudentDetail && (
          <div 
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            onClick={() => setSelectedStudentDetail(null)}
          >
            <div 
              className="bg-card border border-border max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card flex flex-col max-h-[85vh] my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header Modal */}
              <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
                <div>
                  <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" /> {selectedStudentDetail.full_name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">Mã số: {selectedStudentDetail.mshs} &bull; Email: {localProfiles.find(p => p.id === selectedStudentDetail.student_id)?.email || 'N/A'}</p>
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
                    <BookOpen className="h-4 w-4 text-primary" /> Tiến độ bài giảng ({classSubjectName})
                  </h4>
                  <div className="grid gap-2">
                    {chapters
                      .filter((chap: any) => chap.subject_id === classAss?.subject_id)
                      .map((chap: any) => (
                        <div key={chap.id} className="p-3 bg-muted/20 border border-border/50 rounded-xl space-y-2">
                          <p className="font-extrabold text-foreground">{chap.title}</p>
                          <div className="grid gap-1.5 pl-2">
                            {(chap.lessons || []).map((les: any) => {
                              const isCompleted = progress.some(p => p.student_id === selectedStudentDetail.student_id && p.lesson_id === les.id && p.completed);
                              return (
                                <div key={les.id} className="flex items-center justify-between p-2 rounded bg-background border border-border/50 font-semibold">
                                  <span className="text-muted-foreground">{les.title}</span>
                                  {isCompleted ? (
                                    <span className="text-[9px] font-black text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded flex items-center gap-0.5">
                                      <Check className="h-3 w-3" /> Đã xong
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black text-muted-foreground bg-muted border border-border/50 px-2 py-0.5 rounded">
                                      Chưa hoàn thành
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Kết quả làm bài tập / thi thử */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/50 pb-1 text-foreground/80">
                    <Award className="h-4 w-4 text-secondary" /> Kết quả đề tự luyện & khảo thí
                  </h4>
                  {(() => {
                    const studentResults = examResults.filter(r => r.student_id === selectedStudentDetail.student_id);
                    if (studentResults.length === 0) {
                      return <p className="text-xs text-muted-foreground italic leading-relaxed pl-2">Học sinh này chưa thực hiện đề luyện tập nào.</p>;
                    }

                    // Nhóm theo đề thi
                    const examMap = new Map<string, any[]>();
                    studentResults.forEach(r => {
                      const key = r.exam_id || 'unknown';
                      if (!examMap.has(key)) examMap.set(key, []);
                      examMap.get(key)!.push(r);
                    });

                    return (
                      <div className="grid gap-2.5">
                        {Array.from(examMap.entries()).map(([examId, attempts]) => {
                          const bestAttempt = attempts.reduce((prev, curr) => (Number(curr.score) > Number(prev.score) ? curr : prev), attempts[0]);
                          const examTitle = bestAttempt.exams?.title || 'Đề thi';
                          const highestScore = Number(bestAttempt.score);
                          const attemptsCount = attempts.length;

                          return (
                            <div key={examId} className="p-3.5 rounded-xl bg-muted/20 border border-border/50 font-semibold space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <span className="text-foreground font-bold text-xs">{examTitle}</span>
                                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground font-medium">
                                    <span>Nộp gần nhất: {new Date(bestAttempt.created_at).toLocaleString('vi-VN')}</span>
                                    {attemptsCount > 1 && (
                                      <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-black">
                                        Đã làm {attemptsCount} lần
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-sm font-black px-2 py-0.5 rounded ${
                                    highestScore >= 8.0 
                                      ? 'text-green-700 bg-green-500/10 dark:text-green-300' 
                                      : highestScore >= 5.0 
                                      ? 'text-blue-700 bg-blue-500/10 dark:text-blue-300' 
                                      : 'text-orange-500 bg-orange-500/10'
                                  }`}>
                                    {highestScore}/10
                                  </span>
                                  {attemptsCount > 1 && (
                                    <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Điểm cao nhất">
                                      <Trophy className="h-2.5 w-2.5" /> Cao nhất
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                                <button
                                  onClick={() => {
                                    const studentClass = activeClass?.name || localAllClasses.find(c => c.id === selectedStudentDetail.class_id)?.name || '12';
                                    setInspectingSubmission({
                                      id: bestAttempt.id,
                                      student_id: selectedStudentDetail.student_id,
                                      exam_id: examId,
                                      score: Number(bestAttempt.score),
                                      correct_answers: Number(bestAttempt.correct_answers),
                                      total_questions: Number(bestAttempt.total_questions || 0),
                                      time_spent_seconds: Number(bestAttempt.time_spent_seconds || 0),
                                      created_at: bestAttempt.created_at,
                                      answers: bestAttempt.answers,
                                      student: {
                                        full_name: selectedStudentDetail.full_name,
                                        mshs: selectedStudentDetail.mshs,
                                        classes: { name: studentClass }
                                      },
                                      exams: {
                                        title: examTitle,
                                        duration_minutes: 45
                                      }
                                    });
                                  }}
                                  className="text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg hover:bg-primary/20 flex items-center gap-1 transition-colors"
                                >
                                  <Eye className="h-3.5 w-3.5" /> {attemptsCount > 1 ? 'Xem bài điểm cao nhất' : 'Xem bài làm'}
                                </button>

                                {attemptsCount > 1 && (
                                  <button
                                    onClick={() => {
                                      const studentClass = activeClass?.name || localAllClasses.find(c => c.id === selectedStudentDetail.class_id)?.name || '12';
                                      setViewingAttemptsData({
                                        studentName: selectedStudentDetail.full_name,
                                        studentMshs: selectedStudentDetail.mshs,
                                        className: studentClass,
                                        examTitle: examTitle,
                                        attempts
                                      });
                                    }}
                                    className="text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg hover:bg-amber-500/25 flex items-center gap-1 transition-colors"
                                  >
                                    <Trophy className="h-3.5 w-3.5" /> Xem các lần nộp ({attemptsCount})
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Footer Modal */}
              <div className="border-t border-border pt-3 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-4 py-2 bg-background border border-border rounded-lg text-xs font-bold hover:bg-muted transition-colors"
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        )}

        {/* MODALS CHI TIẾT BÀI LÀM & CÁC LẦN NỘP */}
        <StudentSubmissionDetailModal
          submission={inspectingSubmission}
          isOpen={!!inspectingSubmission}
          onClose={() => setInspectingSubmission(null)}
        />

        <StudentAttemptsModal
          isOpen={!!viewingAttemptsData}
          onClose={() => setViewingAttemptsData(null)}
          studentName={viewingAttemptsData?.studentName || ''}
          studentMshs={viewingAttemptsData?.studentMshs}
          className={viewingAttemptsData?.className}
          examTitle={viewingAttemptsData?.examTitle || ''}
          attempts={viewingAttemptsData?.attempts || []}
          onSelectAttemptToInspect={(attempt: StudentAttemptItem) => {
            if (!viewingAttemptsData) return;
            const examObj = localExams.find((e: any) => e.id === attempt.exam_id) || attempt.exams;
            setInspectingSubmission({
              id: attempt.id,
              student_id: attempt.student_id,
              exam_id: attempt.exam_id,
              score: Number(attempt.score),
              correct_answers: Number(attempt.correct_answers),
              total_questions: Number(attempt.total_questions || 0),
              time_spent_seconds: Number(attempt.time_spent_seconds || 0),
              created_at: attempt.created_at,
              answers: attempt.answers,
              student: {
                full_name: viewingAttemptsData.studentName,
                mshs: viewingAttemptsData.studentMshs || '',
                classes: { name: viewingAttemptsData.className }
              },
              exams: {
                title: viewingAttemptsData.examTitle,
                duration_minutes: examObj?.duration_minutes || 45,
                subjects: examObj?.subjects
              }
            });
          }}
        />
      </div>
    );
  }

  // ----------------------------------------------------
  // GIAO DIỆN 2: LƯỚI DANH SÁCH LỚP HỌC (GRID VIEW)
  // ----------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER VÀ THANH CHUYỂN TAB CHÍNH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" /> Quản Lý Học Sinh & Lớp Học
          </h2>
          <p className="text-xs text-muted-foreground font-semibold">
            Theo dõi tiến độ học tập, nộp bài đề thi và quản lý danh sách học sinh theo từng lớp học
          </p>
        </div>

        {/* Tab switch: Danh sách lớp học vs Xem nộp bài nhanh */}
        <div className="flex items-center gap-1.5 bg-muted/70 p-1.5 rounded-xl border border-border self-start sm:self-auto shrink-0">
          <button
            onClick={() => setMainTab('classes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mainTab === 'classes'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" /> Danh Sách Lớp Học
          </button>

          <button
            onClick={() => setMainTab('submissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mainTab === 'submissions'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4 text-amber-500" /> Xem Nộp Bài Nhanh
          </button>
        </div>
      </div>

      {mainTab === 'submissions' ? (
        renderQuickSubmissions('all')
      ) : (
        /* HELPER RENDER CARD LỚP HỌC */
        (() => {
          const renderClassCard = (c: Class, isSecondary: boolean = false) => {
            const analytics = getClassStats(c.id);
            const isEditingClass = editingClassId === c.id;

            if (isEditingClass) {
              return (
                <div key={c.id} className="rounded-2xl border border-primary/50 bg-primary/5 p-5 shadow-sm space-y-4">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Tên lớp</label>
                      <input
                        type="text"
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs focus:outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Ban</label>
                      <select
                        value={editClassGroup}
                        onChange={(e) => setEditClassGroup(e.target.value as any)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="T">Tự nhiên (T)</option>
                        <option value="X">Xã hội (X)</option>
                        <option value="K">Khai phóng (K)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Niên khóa</label>
                      <input
                        type="text"
                        value={editClassYear}
                        onChange={(e) => setEditClassYear(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleSaveEditClass(c.id)}
                      className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Lưu
                    </button>
                    <button
                      onClick={() => setEditingClassId(null)}
                      className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-bold flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Hủy
                    </button>
                  </div>
                </div>
              );
            }

            const isT = c.group_type === 'T';
            const isX = c.group_type === 'X';

            // Tìm giáo viên bộ môn phụ trách lớp này
            const classAss = localAssignments.find(ass => ass.class_id === c.id);
            const assignedSub = classAss?.subjects?.name || 'Môn học';
            const assignedTeacherEmail = allTeachers?.find(t => t.id === classAss?.teacher_id)?.email;

            return (
              <div 
                key={c.id}
                className={`group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between space-y-6 relative overflow-hidden bg-gradient-to-br from-muted/20 via-card to-card ${isSecondary ? 'opacity-80' : ''}`}
              >
                <div className={`absolute -top-4 -right-4 w-28 h-28 rounded-full blur-2xl pointer-events-none -z-10 group-hover:scale-125 transition-transform duration-500 ${isT ? 'bg-blue-500/10' : isX ? 'bg-emerald-500/10' : 'bg-purple-500/10'}`} />
                <div className={`absolute -bottom-10 -left-10 w-24 h-24 rounded-full blur-2xl pointer-events-none -z-10 ${isT ? 'bg-blue-500/5' : isX ? 'bg-emerald-500/5' : 'bg-purple-500/5'}`} />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform duration-300 ${
                      isT 
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' 
                        : isX 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-purple-500/10 border-purple-500/20 text-purple-500'
                    }`}>
                      <Users className="h-5 w-5" />
                    </div>
                    
                    {/* Chỉ cho sửa/xóa nếu không phải phụ, hoặc nếu là HOD thì cho sửa tất cả */}
                    {(!isSecondary || isHOD) && (
                      <div className="flex items-center gap-1 z-10">
                        <button
                          onClick={() => {
                            setEditingClassId(c.id);
                            setEditClassName(c.name);
                            setEditClassGroup(c.group_type as any);
                            setEditClassYear(c.academic_year);
                          }}
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-primary rounded"
                          title="Sửa lớp"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(c.id)}
                          className="p-1 hover:bg-muted text-muted-foreground hover:text-red-500 rounded"
                          title="Xóa lớp"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-black text-xl text-foreground flex items-center gap-2">
                      Lớp {c.name}
                      {getGroupBadge(c.group_type)}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                      Niên khóa: {c.academic_year} &bull; Sĩ số: {analytics.studentsCount} học sinh
                    </p>
                    <span className="block text-[9px] text-muted-foreground font-bold mt-1.5">
                      Môn học: {assignedSub} &bull; GV: {assignedTeacherEmail || 'Chưa phân công'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex flex-wrap gap-2 justify-between items-center text-xs z-10">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{analytics.avgPercent}% tiến độ học</p>
                    <div className="w-20 bg-muted rounded-full h-1">
                      <div className="bg-primary h-1 rounded-full" style={{ width: `${analytics.avgPercent}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setQuickClassFilterId(c.id);
                        setMainTab('submissions');
                      }}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 flex items-center gap-1 transition-colors"
                      title="Xem nhanh kết quả nộp bài của lớp này"
                    >
                      <Zap className="h-3 w-3" /> Nộp bài nhanh
                    </button>

                    <button
                      onClick={() => setSelectedClassId(c.id)}
                      className="text-[11px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-0.5 hover:underline"
                    >
                      Chi tiết <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          };

          const primaryClasses = localAllClasses.filter(c => {
            return localAssignments.some(ass => ass.class_id === c.id);
          });

          return (
            <div className="space-y-6">
              {/* DANH SÁCH LỚP HỌC PHỤ TRÁCH */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
                  <h4 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5 m-0 text-foreground/80">
                    <Users className="h-4 w-4 text-primary" /> Danh sách Lớp học phụ trách môn ({assignments[0]?.subjects?.name || 'Bộ môn'})
                  </h4>

                  <button
                    onClick={() => {
                      setExcelTargetClassId(null);
                      setShowExcelModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Nhập học sinh bằng Excel (.xlsx)
                  </button>
                </div>
                
                {primaryClasses.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="font-bold text-muted-foreground text-xs">Chưa có lớp học nào được phân công cho bộ môn này.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {primaryClasses.map(c => renderClassCard(c, false))}
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* MODAL NHẬP HỌC SINH TỪ EXCEL */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        classes={localAllClasses}
        defaultClassId={excelTargetClassId || selectedClassId || localAllClasses[0]?.id}
        token={token}
        onSuccess={handleExcelImportSuccess}
      />

      {/* MODALS CHI TIẾT BÀI LÀM & CÁC LẦN NỘP */}
      <StudentSubmissionDetailModal
        submission={inspectingSubmission}
        isOpen={!!inspectingSubmission}
        onClose={() => setInspectingSubmission(null)}
      />

      <StudentAttemptsModal
        isOpen={!!viewingAttemptsData}
        onClose={() => setViewingAttemptsData(null)}
        studentName={viewingAttemptsData?.studentName || ''}
        studentMshs={viewingAttemptsData?.studentMshs}
        className={viewingAttemptsData?.className}
        examTitle={viewingAttemptsData?.examTitle || ''}
        attempts={viewingAttemptsData?.attempts || []}
        onSelectAttemptToInspect={(attempt: StudentAttemptItem) => {
          if (!viewingAttemptsData) return;
          const examObj = localExams.find((e: any) => e.id === attempt.exam_id) || attempt.exams;
          setInspectingSubmission({
            id: attempt.id,
            student_id: attempt.student_id,
            exam_id: attempt.exam_id,
            score: Number(attempt.score),
            correct_answers: Number(attempt.correct_answers),
            total_questions: Number(attempt.total_questions || 0),
            time_spent_seconds: Number(attempt.time_spent_seconds || 0),
            created_at: attempt.created_at,
            answers: attempt.answers,
            student: {
              full_name: viewingAttemptsData.studentName,
              mshs: viewingAttemptsData.studentMshs || '',
              classes: { name: viewingAttemptsData.className }
            },
            exams: {
              title: viewingAttemptsData.examTitle,
              duration_minutes: examObj?.duration_minutes || 45,
              subjects: examObj?.subjects
            }
          });
        }}
      />
    </div>
  );
}
