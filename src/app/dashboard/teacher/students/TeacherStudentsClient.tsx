'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Users, Plus, Trash2, Edit3, Check, X, 
  ArrowLeft, GraduationCap, Calendar, BarChart2,
  ChevronRight, BookOpen, Clock, Award, CheckSquare,
  AlertTriangle, Mail, HelpCircle, FileSpreadsheet
} from 'lucide-react';
import ExcelImportModal from '@/components/student/ExcelImportModal';

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
  allTeachers = []
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

  // Lớp đang chọn để quản lý (null: hiện lưới danh sách lớp)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  // Học sinh đang chọn xem chi tiết thống kê học tập (sidebar)
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);

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
            onClick={() => { setSelectedClassId(null); setAddingStudent(false); setEditingStudentId(null); setSelectedStudentDetail(null); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại danh sách lớp học
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          </div>
        </div>

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
                    <Award className="h-4 w-4 text-secondary" /> Kết quả đề tự luyện
                  </h4>
                  {(() => {
                    const studentResults = examResults.filter(r => r.student_id === selectedStudentDetail.student_id);
                    if (studentResults.length === 0) {
                      return <p className="text-xs text-muted-foreground italic leading-relaxed pl-2">Học sinh này chưa thực hiện đề luyện tập nào.</p>;
                    }
                    return (
                      <div className="grid gap-2">
                        {studentResults.map((res: any) => (
                          <div key={res.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50 font-semibold">
                            <div className="space-y-0.5">
                              <span className="text-foreground font-bold">{res.exams?.title || 'Đề thi'}</span>
                              <span className="block text-[9px] text-muted-foreground">Thời gian: {new Date(res.created_at).toLocaleString('vi-VN')}</span>
                            </div>
                            <span className={`text-sm font-black ${res.score >= 5.0 ? 'text-green-500' : 'text-orange-500'}`}>
                              {res.score}/10
                            </span>
                          </div>
                        ))}
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
      </div>
    );
  }

  // ----------------------------------------------------
  // GIAO DIỆN 2: LƯỚI DANH SÁCH LỚP HỌC (GRID VIEW)
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      


      {/* HELPER RENDER CARD LỚP HỌC */}
      {(() => {
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

              <div className="pt-4 border-t border-border/50 flex justify-between items-center text-xs z-10">
                <div className="space-y-1">
                  <p className="font-bold text-foreground">{analytics.avgPercent}% tiến độ học</p>
                  <div className="w-20 bg-muted rounded-full h-1">
                    <div className="bg-primary h-1 rounded-full" style={{ width: `${analytics.avgPercent}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClassId(c.id)}
                  className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  Báo cáo chi tiết <ChevronRight className="h-3.5 w-3.5" />
                </button>
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
      })()}

      {/* MODAL NHẬP HỌC SINH TỪ EXCEL */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        classes={localAllClasses}
        defaultClassId={excelTargetClassId || selectedClassId || localAllClasses[0]?.id}
        token={token}
        onSuccess={handleExcelImportSuccess}
      />

    </div>
  );
}
