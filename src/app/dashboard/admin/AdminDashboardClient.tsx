'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Shield, Users, Activity, Settings, Database, 
  CheckCircle, AlertCircle, RefreshCw, Terminal, Check,
  ChevronRight, Calendar, Info, Building2, GraduationCap, BookOpen, Plus, Trash2, Edit3,
  FileSpreadsheet, AlertTriangle, CheckSquare, Square, X, Filter, UserX, FolderX
} from 'lucide-react';
import ExcelImportModal from '@/components/student/ExcelImportModal';

interface Profile {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'head_of_department';
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_table: string;
  target_id: string;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: {
    email: string;
  };
}

interface AdminDashboardClientProps {
  initialProfiles: Profile[];
  auditLogs: AuditLog[];
  studyLogs?: any[];
  studentDetails?: any[];
  lessons?: any[];
  initialClasses?: any[];
  subjects?: any[];
  initialTeacherClasses?: any[];
  token: string;
  currentUserId: string;
  viewMode: 'home' | 'users' | 'logs';
}

export default function AdminDashboardClient({
  initialProfiles,
  auditLogs,
  studyLogs = [],
  studentDetails = [],
  lessons = [],
  initialClasses = [],
  subjects = [],
  initialTeacherClasses = [],
  token,
  currentUserId,
  viewMode
}: AdminDashboardClientProps) {
  const supabase = createSupabaseClient(token);
  const activeTab = viewMode;
  
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [localStudentDetails, setLocalStudentDetails] = useState<any[]>(studentDetails);
  const [showExcelModal, setShowExcelModal] = useState(false);

  const handleExcelImportSuccess = (importedCount: number) => {
    alert(`Đã thêm thành công ${importedCount} học sinh vào hệ thống!`);
    setShowExcelModal(false);
    window.location.reload();
  };

  const safeTimeFormat = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const safeDateTimeFormat = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('vi-VN');
  };

  // 1. Tính toán lượt truy cập hằng ngày
  const getDailyVisits = () => {
    const todayStr = new Date().toDateString();
    const todayLogs = studyLogs.filter((log: any) => log && log.created_at && new Date(log.created_at).toDateString() === todayStr);
    const uniqueStudentsToday = new Set(todayLogs.map((log: any) => log.student_id));
    return {
      totalAccessesToday: todayLogs.length,
      activeStudentsToday: uniqueStudentsToday.size
    };
  };

  // 2. Tính toán thành viên đang hoạt động (học bài trong 10 phút gần nhất)
  const getActiveUsersNow = () => {
    const now = new Date().getTime();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const activeLogs = studyLogs.filter((log: any) => log && log.created_at && new Date(log.created_at).getTime() >= tenMinutesAgo);
    
    const latestLogsByStudent: { [studentId: string]: any } = {};
    activeLogs.forEach((log: any) => {
      if (!latestLogsByStudent[log.student_id]) {
        latestLogsByStudent[log.student_id] = log;
      }
    });

    return Object.values(latestLogsByStudent).map((log: any) => {
      const student = localStudentDetails.find((s: any) => s.student_id === log.student_id);
      const lesson = lessons.find((l: any) => l.id === log.lesson_id);
      return {
        studentId: log.student_id,
        studentName: student?.full_name || 'Học sinh ẩn danh',
        mshs: student?.mshs || 'N/A',
        lessonTitle: lesson?.title || 'Bài học tự học',
        lastActivityTime: safeTimeFormat(log.created_at),
        actionType: log.action_type === 'watch_video' ? 'Đang xem video' : 'Đang đọc tài liệu'
      };
    });
  };

  const visits = getDailyVisits();
  const activeUsers = getActiveUsersNow();


  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState<'T' | 'X' | 'K'>('T');
  const [newClassYear, setNewClassYear] = useState('2026-2027');
  const [creatingClass, setCreatingClass] = useState(false);
  const [createClassMessage, setCreateClassMessage] = useState<string | null>(null);

  // Xử lý thay đổi vai trò tài khoản (Role Update)
  const handleRoleChange = async (userId: string, newRole: 'student' | 'teacher' | 'admin' | 'head_of_department') => {
    if (userId === currentUserId) {
      alert('Bạn không được tự cập nhật vai trò của chính mình để tránh mất quyền quản trị.');
      return;
    }

    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole, gasUrl: gasUrl.trim() })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi phân quyền hệ thống');

      setProfiles(profiles.map(p => {
        if (p.id === userId) {
          return { ...p, role: newRole };
        }
        return p;
      }));

    } catch (err: any) {
      console.error('Lỗi phân quyền:', err);
      alert('Không thể thay đổi quyền truy cập: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // ----------------------------------------------------
  // LOGIC THÊM TÀI KHOẢN MỚI & PHÂN QUYỀN SẴN (ADMIN)
  // ----------------------------------------------------
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'student' | 'teacher' | 'head_of_department' | 'admin'>('student');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserFptName, setNewUserFptName] = useState('');
  const [gasUrl, setGasUrl] = useState(() => {
    const defaultUrl = 'https://script.google.com/macros/s/AKfycbxcX76M0TLzCpdgz5RFtdo3a5A7Wkx7zRWuILtX8SYJ9fGj-BF129RpVb37GrJxcX6Hkw/exec';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fprep-gas-url');
      if (stored && (stored.includes('AKfycbwg') || stored.includes('AKfycbwh') || stored.includes('AKfycbzu'))) {
        localStorage.setItem('fprep-gas-url', defaultUrl);
        return defaultUrl;
      }
      return stored || defaultUrl;
    }
    return defaultUrl;
  });

  // --- CRUD CHO LỚP HỌC (CLASSES) ---
  const [classes, setClasses] = useState<any[]>(initialClasses);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [editingClassGroup, setEditingClassGroup] = useState<'T' | 'X' | 'K'>('T');
  const [editingClassYear, setEditingClassYear] = useState('2026-2027');

  // --- CRUD CHO TÀI KHOẢN (PROFILES) ---
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [editingUserFullName, setEditingUserFullName] = useState('');
  const [editingUserFptName, setEditingUserFptName] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<'student' | 'teacher' | 'head_of_department' | 'admin'>('student');

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userClassFilter, setUserClassFilter] = useState<string>('all');
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState<string>('all');
  const [adminSubTab, setAdminSubTab] = useState<'classes' | 'teachers' | 'students'>('classes');

  // --- TRẠNG THÁI CHỌN NHIỀU ĐỂ XOÁ HÀNG LOẠT (BATCH SELECTION) ---
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // --- MODAL XÁC NHẬN XOÁ DỮ LIỆU KHỎI DB ---
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchModalConfig, setBatchModalConfig] = useState<{
    title: string;
    description: string;
    count: number;
    actionType: string;
    payload: any;
    requiresTextConfirm?: boolean;
    confirmKeyword?: string;
  } | null>(null);
  const [batchConfirmInput, setBatchConfirmInput] = useState('');
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const handleOpenBatchModal = (config: {
    title: string;
    description: string;
    count: number;
    actionType: string;
    payload: any;
    requiresTextConfirm?: boolean;
    confirmKeyword?: string;
  }) => {
    setBatchModalConfig(config);
    setBatchConfirmInput('');
    setBatchModalOpen(true);
  };

  const handleExecuteBatchDelete = async () => {
    if (!batchModalConfig) return;
    if (batchModalConfig.requiresTextConfirm && batchConfirmInput.trim().toUpperCase() !== (batchModalConfig.confirmKeyword || 'XOA')) {
      alert(`Vui lòng nhập chính xác chữ "${batchModalConfig.confirmKeyword || 'XOA'}" để xác nhận xóa.`);
      return;
    }

    setIsDeletingBatch(true);
    try {
      const res = await fetch('/api/admin/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: batchModalConfig.actionType,
          ...batchModalConfig.payload
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi xóa dữ liệu');

      // Cập nhật state cục bộ tương ứng
      if (batchModalConfig.actionType === 'delete_selected_users') {
        const deletedIds = new Set(batchModalConfig.payload.userIds || []);
        setProfiles(prev => prev.filter(p => !deletedIds.has(p.id)));
        setLocalStudentDetails(prev => prev.filter(s => !deletedIds.has(s.student_id)));
        setLocalTeacherClasses(prev => prev.filter(tc => !deletedIds.has(tc.teacher_id)));
        setSelectedStudentIds(prev => prev.filter(id => !deletedIds.has(id)));
        setSelectedTeacherIds(prev => prev.filter(id => !deletedIds.has(id)));
      } else if (batchModalConfig.actionType === 'delete_selected_classes') {
        const deletedClassIds = new Set(batchModalConfig.payload.classIds || []);
        setClasses(prev => prev.filter(c => !deletedClassIds.has(c.id)));
        setLocalStudentDetails(prev => prev.map(s => deletedClassIds.has(s.class_id) ? { ...s, class_id: null } : s));
        setLocalTeacherClasses(prev => prev.filter(tc => !deletedClassIds.has(tc.class_id)));
        setSelectedClassIds([]);
      } else if (batchModalConfig.actionType === 'delete_students_by_filter') {
        const classFilter = batchModalConfig.payload.filter?.classId;
        if (!classFilter || classFilter === 'all') {
          setProfiles(prev => prev.filter(p => p.role !== 'student'));
          setLocalStudentDetails([]);
          setSelectedStudentIds([]);
        } else if (classFilter === 'unassigned') {
          const unassignedIds = new Set(localStudentDetails.filter(s => !s.class_id).map(s => s.student_id));
          setProfiles(prev => prev.filter(p => !unassignedIds.has(p.id)));
          setLocalStudentDetails(prev => prev.filter(s => Boolean(s.class_id)));
          setSelectedStudentIds(prev => prev.filter(id => !unassignedIds.has(id)));
        } else {
          const targetIds = new Set(localStudentDetails.filter(s => s.class_id === classFilter).map(s => s.student_id));
          setProfiles(prev => prev.filter(p => !targetIds.has(p.id)));
          setLocalStudentDetails(prev => prev.filter(s => s.class_id !== classFilter));
          setSelectedStudentIds(prev => prev.filter(id => !targetIds.has(id)));
        }
      } else if (batchModalConfig.actionType === 'delete_teachers_by_filter') {
        const subjectFilter = batchModalConfig.payload.filter?.subjectId;
        if (!subjectFilter || subjectFilter === 'all') {
          setProfiles(prev => prev.filter(p => p.role !== 'teacher' && p.role !== 'head_of_department'));
          setLocalTeacherClasses([]);
          setSelectedTeacherIds([]);
        } else {
          const teacherIdsWithSubject = new Set(localTeacherClasses.filter(tc => tc.subject_id === subjectFilter).map(tc => tc.teacher_id));
          setProfiles(prev => prev.filter(p => !teacherIdsWithSubject.has(p.id)));
          setLocalTeacherClasses(prev => prev.filter(tc => tc.subject_id !== subjectFilter));
          setSelectedTeacherIds(prev => prev.filter(id => !teacherIdsWithSubject.has(id)));
        }
      }

      setBatchModalOpen(false);
      setBatchModalConfig(null);
      alert(`Đã xóa vĩnh viễn ${resData.count || 0} bản ghi khỏi cơ sở dữ liệu Supabase thành công!`);
    } catch (err: any) {
      console.error('Lỗi khi xóa batch:', err);
      alert('Không thể thực hiện xóa: ' + err.message);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const [localTeacherClasses, setLocalTeacherClasses] = useState<any[]>(initialTeacherClasses);
  const [editingUserClassId, setEditingUserClassId] = useState<string>('');
  const [editingUserSubjectId, setEditingUserSubjectId] = useState<string>('');
  const [editingUserClassIds, setEditingUserClassIds] = useState<string[]>([]);

  const [newUserClassId, setNewUserClassId] = useState<string>('');
  const [newUserSubjectId, setNewUserSubjectId] = useState<string>('');
  const [newUserClassIds, setNewUserClassIds] = useState<string[]>([]);

  const currentUserRole = profiles.find(p => p.id === currentUserId)?.role || 'admin';

  React.useEffect(() => {
    if (currentUserRole === 'head_of_department') {
      setNewUserRole('teacher');
      setEditingUserRole('teacher');
    }
  }, [currentUserRole]);

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lớp học này? Tất cả học sinh thuộc lớp này sẽ tạm thời bị hủy xếp lớp.')) return;
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi xóa lớp');

      setClasses(prev => prev.filter(c => c.id !== classId));
      alert('Xóa lớp học thành công!');
    } catch (err: any) {
      console.error('Lỗi khi xóa lớp học:', err);
      alert('Không thể xóa lớp học: ' + err.message);
    }
  };

  const startEditClass = (cls: any) => {
    setEditingClassId(cls.id);
    setEditingClassName(cls.name);
    setEditingClassGroup(cls.group_type);
    setEditingClassYear(cls.academic_year);
  };

  const handleUpdateClass = async () => {
    if (!editingClassName.trim()) {
      alert('Tên lớp học không được bỏ trống.');
      return;
    }
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: editingClassId,
          name: editingClassName.trim(),
          groupType: editingClassGroup,
          academicYear: editingClassYear.trim()
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi cập nhật lớp');

      setClasses(prev => prev.map(c => {
        if (c.id === editingClassId) {
          return {
            ...c,
            name: editingClassName.trim().toUpperCase(),
            group_type: editingClassGroup,
            academic_year: editingClassYear.trim()
          };
        }
        return c;
      }));
      setEditingClassId(null);
      alert('Cập nhật thông tin lớp học thành công!');
    } catch (err: any) {
      console.error('Lỗi khi cập nhật lớp học:', err);
      alert('Không thể cập nhật lớp học: ' + err.message);
    }
  };

  const startEditUser = (profile: Profile) => {
    const details = localStudentDetails.find((s: any) => s.student_id === profile.id);
    setEditingUserId(profile.id);
    setEditingUserEmail(profile.email);
    setEditingUserFullName(details?.full_name || '');
    setEditingUserFptName(details?.mshs || '');
    setEditingUserRole(profile.role);
    setEditingUserClassId(details?.class_id || '');

    const assignments = localTeacherClasses.filter(tc => tc.teacher_id === profile.id);
    setEditingUserSubjectId(assignments[0]?.subject_id || '');
    setEditingUserClassIds(assignments.map(tc => tc.class_id).filter(Boolean));
  };

  const handleUpdateUser = async () => {
    if (!editingUserEmail.trim() || !editingUserEmail.includes('@')) {
      alert('Email không hợp lệ.');
      return;
    }
    if (editingUserRole === 'student') {
      if (!editingUserFullName.trim() || !editingUserFptName.trim()) {
        alert('Học sinh bắt buộc phải có Họ tên và Tên FPT.');
        return;
      }
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUserId,
          email: editingUserEmail.trim(),
          role: editingUserRole,
          fullName: editingUserFullName.trim(),
          fptName: editingUserFptName.trim(),
          classId: editingUserRole === 'student' ? editingUserClassId : null,
          subjectId: (editingUserRole === 'teacher' || editingUserRole === 'head_of_department') ? editingUserSubjectId : null,
          classIds: (editingUserRole === 'teacher' || editingUserRole === 'head_of_department') ? editingUserClassIds : [],
          gasUrl: gasUrl.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi cập nhật tài khoản');

      setProfiles(prev => prev.map(p => {
        if (p.id === editingUserId) {
          return { ...p, email: editingUserEmail.trim(), role: editingUserRole };
        }
        return p;
      }));

      if (editingUserRole === 'student') {
        setLocalStudentDetails(prev => {
          const exists = prev.some(s => s.student_id === editingUserId);
          if (exists) {
            return prev.map(s => s.student_id === editingUserId ? {
              ...s,
              full_name: editingUserFullName.trim(),
              mshs: editingUserFptName.trim().toUpperCase(),
              class_id: editingUserClassId || null
            } : s);
          } else {
            return [
              ...prev,
              {
                student_id: editingUserId,
                full_name: editingUserFullName.trim(),
                mshs: editingUserFptName.trim().toUpperCase(),
                class_id: editingUserClassId || null
              }
            ];
          }
        });
      } else {
        setLocalStudentDetails(prev => prev.filter(s => s.student_id !== editingUserId));
      }

      if (editingUserRole === 'teacher' || editingUserRole === 'head_of_department') {
        const otherAssignments = localTeacherClasses.filter(tc => tc.teacher_id !== editingUserId);
        let newAssignments = [];
        if (editingUserClassIds && editingUserClassIds.length > 0) {
          newAssignments = editingUserClassIds.map(cid => ({
            id: 'tc-' + Math.random(),
            teacher_id: editingUserId,
            class_id: cid,
            subject_id: editingUserSubjectId
          }));
        } else {
          newAssignments = [{
            id: 'tc-' + Math.random(),
            teacher_id: editingUserId,
            class_id: null,
            subject_id: editingUserSubjectId
          }];
        }
        setLocalTeacherClasses([...otherAssignments, ...newAssignments]);
      } else {
        setLocalTeacherClasses(prev => prev.filter(tc => tc.teacher_id !== editingUserId));
      }

      setEditingUserId(null);
      alert('Cập nhật tài khoản thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Không thể cập nhật tài khoản: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUserId) {
      alert('Bạn không thể tự xóa tài khoản của chính mình.');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống?')) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi xóa tài khoản');

      setProfiles(prev => prev.filter(p => p.id !== userId));
      alert('Xóa tài khoản thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Không thể xóa tài khoản: ' + err.message);
    }
  };


  const handleCreateUser = async () => {
    if (!newUserFullName.trim()) {
      alert('Vui lòng nhập họ và tên.');
      return;
    }
    if (!newUserFptName.trim()) {
      alert('Vui lòng nhập tên FPT / Mã số (VD: TamTT48).');
      return;
    }
    if (!newUserEmail.trim()) {
      alert('Vui lòng nhập email tài khoản.');
      return;
    }
    if (!newUserEmail.includes('@')) {
      alert('Email không hợp lệ.');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail.trim().toLowerCase(),
          role: newUserRole,
          fullName: newUserFullName.trim(),
          fptName: newUserFptName.trim(),
          classId: newUserRole === 'student' ? newUserClassId : null,
          subjectId: (newUserRole === 'teacher' || newUserRole === 'head_of_department') ? newUserSubjectId : null,
          classIds: (newUserRole === 'teacher' || newUserRole === 'head_of_department') ? newUserClassIds : [],
          gasUrl: gasUrl.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi tạo tài khoản');

      const data = resData.data;
      const isUpdate = resData.isUpdate;

      if (isUpdate) {
        setProfiles(prev => prev.map(p => p.id === data.id ? data : p));
        
        if (newUserRole === 'student') {
          setLocalStudentDetails(prev => {
            const exists = prev.some(s => s.student_id === data.id);
            if (exists) {
              return prev.map(s => s.student_id === data.id ? {
                ...s,
                full_name: newUserFullName.trim(),
                mshs: newUserFptName.trim().toUpperCase(),
                class_id: newUserClassId || null
              } : s);
            } else {
              return [
                ...prev,
                {
                  student_id: data.id,
                  mshs: newUserFptName.trim().toUpperCase(),
                  full_name: newUserFullName.trim(),
                  class_id: newUserClassId || null
                }
              ];
            }
          });
        } else {
          setLocalStudentDetails(prev => prev.filter(s => s.student_id !== data.id));
        }
      } else {
        setProfiles([data, ...profiles]);

        if (newUserRole === 'student') {
          setLocalStudentDetails(prev => [
            ...prev,
            {
              student_id: data.id,
              mshs: newUserFptName.trim().toUpperCase(),
              full_name: newUserFullName.trim(),
              class_id: newUserClassId || null
            }
          ]);
        }
      }

      if (newUserRole === 'teacher' || newUserRole === 'head_of_department') {
        const otherAssignments = localTeacherClasses.filter(tc => tc.teacher_id !== data.id);
        let newAssignments = [];
        if (newUserClassIds && newUserClassIds.length > 0) {
          newAssignments = newUserClassIds.map(cid => ({
            id: 'tc-' + Math.random(),
            teacher_id: data.id,
            class_id: cid,
            subject_id: newUserSubjectId
          }));
        } else {
          newAssignments = [{
            id: 'tc-' + Math.random(),
            teacher_id: data.id,
            class_id: null,
            subject_id: newUserSubjectId
          }];
        }
        setLocalTeacherClasses([...otherAssignments, ...newAssignments]);
      } else {
        setLocalTeacherClasses(prev => prev.filter(tc => tc.teacher_id !== data.id));
      }

      setNewUserEmail('');
      setNewUserFullName('');
      setNewUserFptName('');
      setNewUserRole('student');
      setNewUserClassId('');
      setNewUserSubjectId('');
      setNewUserClassIds([]);
      
      if (isUpdate) {
        alert('Tài khoản đã tồn tại. Hệ thống đã tự động cập nhật vai trò/thông tin cá nhân và gửi lại email thông báo qua Server thành công!');
      } else {
        alert('Thêm tài khoản mới và phân quyền thành công! Email thông báo đã được gửi đi qua Server.');
      }
    } catch (err: any) {
      console.error('Lỗi khi tạo tài khoản:', err);
      alert('Không thể thêm tài khoản: ' + err.message);
    }
  };


  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      alert('Vui lòng điền tên lớp học.');
      return;
    }
    setCreatingClass(true);
    setCreateClassMessage(null);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          groupType: newClassGroup,
          academicYear: newClassYear.trim()
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi tạo lớp');

      const data = resData.data;
      setClasses(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCreateClassMessage(`Tạo thành công lớp ${data.name}!`);
      setNewClassName('');
    } catch (err: any) {
      console.error(err);
      setCreateClassMessage(`Lỗi khi tạo lớp: ${err.message}`);
    } finally {
      setCreatingClass(false);
    }
  };

  const getRoleOptionLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên (Admin)';
      case 'teacher': return 'Giáo viên (Teacher)';
      case 'head_of_department': return 'Trưởng bộ môn (HOD)';
      default: return 'Học sinh (Student)';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Quản trị</span>;
      case 'teacher':
        return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Giáo viên</span>;
      case 'head_of_department':
        return <span className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Trưởng bộ môn</span>;
      default:
        return <span className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Học sinh</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ==================================================== */}
      {/* 1. CHẾ ĐỘ TRANG CHỦ ADMIN (HOME VIEW) */}
      {/* ==================================================== */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Widget chỉ số phẳng đồng bộ FMATH */}
          <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="flat-card flex items-center gap-3 p-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#e7f1ff] dark:bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 border border-[#b6d4fe]/40">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Tài khoản</span>
                <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{profiles.length}</h4>
              </div>
            </div>

            <div className="flat-card flex items-center gap-3 p-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#f8d7da] dark:bg-red-500/20 text-[#dc3545] flex items-center justify-center font-bold shrink-0 border border-[#f1aeb5]/40">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Quản trị viên</span>
                <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{profiles.filter(p => p.role === 'admin').length}</h4>
              </div>
            </div>

            <div className="flat-card flex items-center gap-3 p-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#fff3cd] dark:bg-amber-500/20 text-[#ffc107] flex items-center justify-center font-bold shrink-0 border border-[#ffe69c]/40">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Nhật ký</span>
                <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{auditLogs.length}</h4>
              </div>
            </div>

            <div className="flat-card flex items-center gap-3 p-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#d1e7dd] dark:bg-emerald-500/20 text-[#198754] flex items-center justify-center font-bold shrink-0 border border-[#a3cfbb]/40">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Lượt học hôm nay</span>
                <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{visits.totalAccessesToday}</h4>
              </div>
            </div>

            <div className="flat-card flex items-center gap-3 p-3.5 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-[#cff4fc] dark:bg-cyan-500/20 text-[#0dcaf0] flex items-center justify-center font-bold shrink-0 border border-[#9eeaf9]/40">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-[#6c757d] dark:text-muted-foreground uppercase tracking-wider">Đang trực tuyến</span>
                <h4 className="text-base sm:text-lg font-bold font-heading text-[#212529] dark:text-foreground m-0">{activeUsers.length}</h4>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-12 items-start">
            {/* Cột Trái: Bảo trì hệ thống & Khởi tạo lớp */}
            <div className="md:col-span-6 space-y-4">

              {/* KHỞI TẠO LỚP HỌC MỚI (Admin) */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm border-b border-border pb-2 flex items-center gap-1.5 text-foreground/80">
                  <Users className="h-4.5 w-4.5 text-primary" /> Khởi tạo lớp học mới
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên lớp học</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 12T8, 12X5, 12K2..."
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-bold text-foreground"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Ban đào tạo</label>
                      <select
                        value={newClassGroup}
                        onChange={(e) => setNewClassGroup(e.target.value as any)}
                        className="w-full rounded border border-border bg-background px-2.5 py-2 focus:outline-none font-bold text-primary"
                      >
                        <option value="T">Ban Tự nhiên (T)</option>
                        <option value="X">Ban Xã hội (X)</option>
                        <option value="K">Ban Khai phóng (K)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Niên khóa</label>
                      <input
                        type="text"
                        placeholder="2026-2027"
                        value={newClassYear}
                        onChange={(e) => setNewClassYear(e.target.value)}
                        className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none text-foreground font-semibold"
                      />
                    </div>
                  </div>

                  {createClassMessage && (
                    <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-[10px] font-bold text-primary">
                      <Info className="h-3.5 w-3.5" />
                      <span>{createClassMessage}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCreateClass}
                    disabled={creatingClass}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:opacity-95 shadow-md shadow-primary/20 transition-all text-center uppercase tracking-wider disabled:opacity-50"
                  >
                    {creatingClass ? 'Đang khởi tạo...' : 'Khởi tạo lớp học'}
                  </button>
                </div>
              </div>

              {/* DANH SÁCH LỚP HỌC & CRUD */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm border-b border-border pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-foreground/80">
                    <Users className="h-4.5 w-4.5 text-primary" /> Quản lý danh sách lớp học ({classes.length})
                  </span>
                </h3>

                {editingClassId ? (
                  /* Form sửa lớp */
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 text-xs">
                    <p className="font-bold text-primary">Đang chỉnh sửa lớp học</p>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase">Tên lớp</label>
                      <input
                        type="text"
                        value={editingClassName}
                        onChange={(e) => setEditingClassName(e.target.value)}
                        className="w-full rounded border border-border bg-background px-3 py-1.5 text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Ban</label>
                        <select
                          value={editingClassGroup}
                          onChange={(e) => setEditingClassGroup(e.target.value as any)}
                          className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs font-bold focus:outline-none"
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
                          value={editingClassYear}
                          onChange={(e) => setEditingClassYear(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingClassId(null)}
                        className="px-3 py-1.5 rounded-lg border border-border font-bold text-muted-foreground hover:bg-background"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateClass}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {loadingClasses ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Đang tải danh sách lớp...</p>
                  ) : classes.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/10 text-xs">
                      <div>
                        <p className="font-extrabold text-foreground">{cls.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Ban: <span className="font-bold text-primary">{cls.group_type === 'T' ? 'Tự nhiên' : cls.group_type === 'X' ? 'Xã hội' : 'Khai phóng'}</span>
                          {' | '} Niên khóa: <span className="font-semibold">{cls.academic_year}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => startEditClass(cls)}
                          className="px-2 py-1 rounded border border-border bg-background hover:bg-muted font-bold text-primary transition-all text-[10px]"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className="px-2 py-1 rounded border border-destructive/20 bg-background hover:bg-destructive/5 font-bold text-destructive transition-all text-[10px]"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                  {classes.length === 0 && !loadingClasses && (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Chưa có lớp học nào được khởi tạo.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cột Phải: Học viên đang học & Hoạt động bảo mật */}
            <div className="md:col-span-6 space-y-6">
              
              {/* THÀNH VIÊN ĐANG TỰ HỌC */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm border-b border-border pb-2 flex items-center gap-1.5 text-emerald-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" /> Thành viên đang tự học ({activeUsers.length})
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {activeUsers.map((user) => (
                    <div key={user.studentId} className="flex gap-3 items-start border-b border-border/50 pb-3 last:border-b-0 last:pb-0 text-xs">
                      <div className="h-7 w-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shrink-0 mt-0.5">
                        <Activity className="h-3.5 w-3.5 animate-pulse" />
                      </div>
                      <div className="min-w-0 space-y-1 font-semibold">
                        <p className="text-foreground">{user.studentName} <span className="text-[10px] text-muted-foreground">({user.mshs})</span></p>
                        <p className="text-[10px] text-muted-foreground">
                          {user.actionType}: <strong className="text-primary">{user.lessonTitle}</strong>
                        </p>
                        <span className="block text-[8px] text-muted-foreground">
                          Lúc: {user.lastActivityTime}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activeUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-6">Hiện không có học sinh nào đang hoạt động tự học.</p>
                  )}
                </div>
              </div>

              {/* Lịch sử thao tác bảo mật gần đây */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm border-b border-border pb-2 flex items-center gap-1.5">
                  <Activity className="h-4.5 w-4.5 text-secondary" /> Lịch sử thao tác bảo mật gần đây
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex gap-3 items-start border-b border-border/50 pb-3 last:border-b-0 last:pb-0 text-xs">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5 font-bold">
                        A
                      </div>
                      <div className="min-w-0 space-y-1 font-semibold">
                        <p className="text-foreground truncate">{log.actor?.email || 'Hệ thống'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Hành động: <strong className="text-primary font-mono">{log.action}</strong> trên bảng <strong className="font-mono">{log.target_table}</strong>
                        </p>
                        <span className="text-[9px] text-muted-foreground">
                          {safeDateTimeFormat(log.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-6">Chưa có nhật ký hoạt động bảo mật.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. CHẾ ĐỘ QUẢN LÝ PHÂN QUYỀN (USERS VIEW) */}
      {/* ==================================================== */}
      {/* 2. CHẾ ĐỘ QUẢN LÝ PHÂN QUYỀN (USERS VIEW) */}
      {/* ==================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* THANH ĐIỀU HƯỚNG 3 MỤC QUẢN LÝ DÀNH RIÊNG CHO ADMIN */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            <button
              onClick={() => { setAdminSubTab('classes'); setEditingUserId(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                adminSubTab === 'classes' 
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs' 
                  : 'bg-background border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Building2 className="h-4 w-4" /> 1. Quản lý Lớp học & Phân công môn
            </button>
            <button
              onClick={() => { setAdminSubTab('teachers'); setEditingUserId(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                adminSubTab === 'teachers' 
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs' 
                  : 'bg-background border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Users className="h-4 w-4" /> 2. Quản lý Giáo viên & HOD
            </button>
            <button
              onClick={() => { setAdminSubTab('students'); setEditingUserId(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                adminSubTab === 'students' 
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs' 
                  : 'bg-background border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <GraduationCap className="h-4 w-4" /> 3. Quản lý Học sinh & Xếp lớp
            </button>
          </div>

          {/* ==================================================== */}
          {/* SUBTAB 1: QUẢN LÝ LỚP HỌC & PHÂN CÔNG MÔN */}
          {/* ==================================================== */}
          {adminSubTab === 'classes' && (
            <div className="grid gap-6 md:grid-cols-12 items-start">
              
              {/* BẢNG DANH SÁCH LỚP HỌC */}
              <div className="md:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> Danh sách Lớp học Khối 12 ({classes.length} lớp)
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Quản lý các lớp học và môn học được phân công</p>
                  </div>

                  {/* THANH THAO TÁC HÀNG LOẠT LỚP HỌC */}
                  {selectedClassIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-xl">
                      <span className="text-xs font-bold text-destructive">Đã chọn: {selectedClassIds.length} lớp</span>
                      <button
                        onClick={() => handleOpenBatchModal({
                          title: `Xóa ${selectedClassIds.length} Lớp học đã chọn`,
                          description: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedClassIds.length} lớp học này khỏi cơ sở dữ liệu? Tất cả học sinh thuộc các lớp này sẽ tự động chuyển về trạng thái chưa xếp lớp.`,
                          count: selectedClassIds.length,
                          actionType: 'delete_selected_classes',
                          payload: { classIds: selectedClassIds },
                          requiresTextConfirm: false
                        })}
                        className="inline-flex items-center gap-1 bg-destructive hover:bg-destructive/90 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Xóa lớp đã chọn
                      </button>
                      <button
                        onClick={() => setSelectedClassIds([])}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground px-1.5 py-0.5"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>

                {editingClassId && (
                  <div className="p-4 border-b border-border bg-primary/5 space-y-3">
                    <h4 className="font-bold text-xs text-primary">Chỉnh sửa Lớp học</h4>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Tên lớp</label>
                        <input
                          type="text"
                          value={editingClassName}
                          onChange={(e) => setEditingClassName(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 font-bold focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Ban</label>
                        <select
                          value={editingClassGroup}
                          onChange={(e) => setEditingClassGroup(e.target.value as any)}
                          className="w-full rounded border border-border bg-background px-2.5 py-1.5 font-bold text-primary focus:outline-none"
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
                          value={editingClassYear}
                          onChange={(e) => setEditingClassYear(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-1.5 font-semibold focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingClassId(null)}
                        className="px-3 py-1.5 rounded-lg border border-border font-bold text-muted-foreground hover:bg-background text-xs"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateClass}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={classes.length > 0 && selectedClassIds.length === classes.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassIds(classes.map(c => c.id));
                              } else {
                                setSelectedClassIds([]);
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </th>
                        <th className="p-4">Tên Lớp học</th>
                        <th className="p-4">Ban đào tạo</th>
                        <th className="p-4">Niên khóa</th>
                        <th className="p-4">Sĩ số</th>
                        <th className="p-4">Phân công Giáo viên bộ môn</th>
                        <th className="p-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map(cls => {
                        const classStudentsCount = localStudentDetails.filter(s => s.class_id === cls.id).length;
                        const classAssignments = localTeacherClasses.filter(tc => tc.class_id === cls.id);
                        const isSelected = selectedClassIds.includes(cls.id);

                        return (
                          <tr key={cls.id} className={`border-b border-border hover:bg-muted/5 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                            <td className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedClassIds(prev => [...prev, cls.id]);
                                  } else {
                                    setSelectedClassIds(prev => prev.filter(id => id !== cls.id));
                                  }
                                }}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                            </td>
                            <td className="p-4 font-black text-sm text-foreground">{cls.name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                cls.group_type === 'T' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                cls.group_type === 'X' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                              }`}>
                                {cls.group_type === 'T' ? 'Tự nhiên' : cls.group_type === 'X' ? 'Xã hội' : 'Khai phóng'}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-muted-foreground">{cls.academic_year}</td>
                            <td className="p-4 font-bold text-foreground">{classStudentsCount} học sinh</td>
                            <td className="p-4 space-y-1">
                              {classAssignments.length === 0 ? (
                                <span className="text-[10px] text-muted-foreground italic">Chưa phân công giáo viên</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {classAssignments.map((ca: any, caIdx: number) => {
                                    const sub = subjects.find(s => s.id === ca.subject_id);
                                    const prof = profiles.find(p => p.id === ca.teacher_id);
                                    return (
                                      <div key={caIdx} className="text-[11px] font-semibold">
                                        <span className="text-primary font-bold">{sub?.name || 'Môn'}:</span> {prof?.email ? prof.email.split('@')[0].toUpperCase() : 'GV'}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => startEditClass(cls)}
                                  className="px-2 py-1 rounded border border-border bg-background hover:bg-muted font-bold text-primary transition-all text-[10px]"
                                >
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDeleteClass(cls.id)}
                                  className="px-2 py-1 rounded border border-destructive/20 bg-background hover:bg-destructive/5 font-bold text-destructive transition-all text-[10px]"
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TẠO LỚP HỌC MỚI */}
              <div className="md:col-span-4 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm border-b border-border pb-2.5 flex items-center gap-1.5 text-foreground/80">
                  <Plus className="h-4.5 w-4.5 text-primary" /> Khởi tạo Lớp học mới
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên lớp học</label>
                    <input
                      type="text"
                      placeholder="VD: 12T7, 12X5, 12K2..."
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-bold text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Ban đào tạo</label>
                    <select
                      value={newClassGroup}
                      onChange={(e) => setNewClassGroup(e.target.value as any)}
                      className="w-full rounded border border-border bg-background px-2.5 py-2 focus:outline-none font-bold text-primary"
                    >
                      <option value="T">Ban Tự nhiên (T)</option>
                      <option value="X">Ban Xã hội (X)</option>
                      <option value="K">Ban Khai phóng (K)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Niên khóa</label>
                    <input
                      type="text"
                      placeholder="2026-2027"
                      value={newClassYear}
                      onChange={(e) => setNewClassYear(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none text-foreground font-semibold"
                    />
                  </div>

                  {createClassMessage && (
                    <p className="text-[11px] font-bold text-green-600 bg-green-500/10 p-2 rounded border border-green-500/20">{createClassMessage}</p>
                  )}

                  <button
                    onClick={handleCreateClass}
                    disabled={creatingClass}
                    className="w-full text-center flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> {creatingClass ? 'Đang tạo...' : 'Tạo lớp học mới'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* SUBTAB 2: QUẢN LÝ GIÁO VIÊN & TRƯỞNG BỘ MÔN (HOD) */}
          {/* ==================================================== */}
          {adminSubTab === 'teachers' && (
            <div className="grid gap-6 md:grid-cols-12 items-start">
              
              {/* BẢNG DANH SÁCH GIÁO VIÊN & HOD */}
              <div className="md:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> Danh sách Giáo viên & Trưởng bộ môn ({profiles.filter(p => p.role === 'teacher' || p.role === 'head_of_department').length})
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Phân công môn học và các lớp giảng dạy phụ trách</p>
                    </div>

                    {/* NÚT XOÁ TOÀN BỘ GIÁO VIÊN KHỎI DB */}
                    <button
                      onClick={() => handleOpenBatchModal({
                        title: 'Xóa TOÀN BỘ Giáo viên & Trưởng bộ môn',
                        description: `CẢNH BÁO NGUY HIỂM: Hành động này sẽ XÓA VĨNH VIỄN toàn bộ ${profiles.filter(p => (p.role === 'teacher' || p.role === 'head_of_department') && p.id !== currentUserId && p.email !== 'fprep.fschool@gmail.com').length} tài khoản Giáo viên & HOD khỏi cơ sở dữ liệu Supabase. Vui lòng nhập "XOA" để xác nhận.`,
                        count: profiles.filter(p => (p.role === 'teacher' || p.role === 'head_of_department') && p.id !== currentUserId && p.email !== 'fprep.fschool@gmail.com').length,
                        actionType: 'delete_teachers_by_filter',
                        payload: { filter: { subjectId: 'all' } },
                        requiresTextConfirm: true,
                        confirmKeyword: 'XOA'
                      })}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto"
                    >
                      <UserX className="h-3.5 w-3.5" /> Xóa TOÀN BỘ Giáo viên (DB)
                    </button>
                  </div>

                  {/* BỘ LỌC MÔN HỌC & THANH XOÁ BATCH */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <select
                        value={teacherSubjectFilter}
                        onChange={(e) => setTeacherSubjectFilter(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                      >
                        <option value="all">Tất cả bộ môn ({profiles.filter(p => p.role === 'teacher' || p.role === 'head_of_department').length})</option>
                        {subjects.map(s => {
                          const count = localTeacherClasses.filter(tc => tc.subject_id === s.id).length;
                          return <option key={s.id} value={s.id}>{s.name} ({count} GV)</option>;
                        })}
                      </select>
                    </div>

                    {/* CÁC THAO TÁC XOÁ BATCH THEO LỰA CHỌN HOẶC BỘ LỌC */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedTeacherIds.length > 0 && (
                        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-xl">
                          <span className="text-xs font-bold text-destructive">Đã chọn: {selectedTeacherIds.length}</span>
                          <button
                            onClick={() => handleOpenBatchModal({
                              title: `Xóa ${selectedTeacherIds.length} Giáo viên đã chọn`,
                              description: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedTeacherIds.length} tài khoản giáo viên này khỏi cơ sở dữ liệu Supabase?`,
                              count: selectedTeacherIds.length,
                              actionType: 'delete_selected_users',
                              payload: { userIds: selectedTeacherIds },
                              requiresTextConfirm: false
                            })}
                            className="inline-flex items-center gap-1 bg-destructive hover:bg-destructive/90 text-white font-bold text-xs px-2 py-0.5 rounded-lg transition-colors shadow-xs"
                          >
                            <Trash2 className="h-3 w-3" /> Xóa đã chọn
                          </button>
                          <button
                            onClick={() => setSelectedTeacherIds([])}
                            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-1"
                          >
                            Bỏ
                          </button>
                        </div>
                      )}

                      {teacherSubjectFilter !== 'all' && (
                        <button
                          onClick={() => {
                            const subName = subjects.find(s => s.id === teacherSubjectFilter)?.name || 'môn này';
                            const matchCount = localTeacherClasses.filter(tc => tc.subject_id === teacherSubjectFilter).length;
                            handleOpenBatchModal({
                              title: `Xóa toàn bộ Giáo viên bộ môn ${subName}`,
                              description: `Bạn có chắc chắn muốn xóa vĩnh viễn tất cả giáo viên phụ trách môn ${subName} khỏi cơ sở dữ liệu Supabase?`,
                              count: matchCount,
                              actionType: 'delete_teachers_by_filter',
                              payload: { filter: { subjectId: teacherSubjectFilter } },
                              requiresTextConfirm: true,
                              confirmKeyword: 'XOA'
                            });
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa GV theo môn đang lọc
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {editingUserId && (
                  <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                    <h4 className="font-extrabold text-sm text-primary">Chỉnh sửa thông tin Giáo viên / Trưởng bộ môn</h4>
                    <div className="grid gap-4 sm:grid-cols-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Email tài khoản</label>
                        <input
                          type="email"
                          value={editingUserEmail}
                          onChange={(e) => setEditingUserEmail(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Vai trò chuyên môn</label>
                        <select
                          value={editingUserRole}
                          onChange={(e) => setEditingUserRole(e.target.value as any)}
                          className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-semibold text-primary"
                        >
                          <option value="teacher">Giáo viên bộ môn (Teacher)</option>
                          <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                          <option value="admin">Quản trị viên (Admin)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Môn học giảng dạy</label>
                        <select
                          value={editingUserSubjectId}
                          onChange={(e) => setEditingUserSubjectId(e.target.value)}
                          className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none text-primary font-bold"
                        >
                          <option value="">-- Chưa phân công môn --</option>
                          {subjects.map((sub: any) => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Lớp dạy học (Chọn nhiều)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 border border-border rounded-xl p-3 bg-background max-h-[120px] overflow-y-auto">
                          {classes.map((cls: any) => {
                            const isChecked = editingUserClassIds.includes(cls.id);
                            return (
                              <label key={cls.id} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditingUserClassIds([...editingUserClassIds, cls.id]);
                                    } else {
                                      setEditingUserClassIds(editingUserClassIds.filter(id => id !== cls.id));
                                    }
                                  }}
                                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                {cls.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 text-xs pt-1">
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="px-4 py-2 rounded-lg border border-border font-bold text-muted-foreground hover:bg-background transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateUser}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-extrabold hover:opacity-90 transition-opacity"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                )}

                {(() => {
                  const filteredTeachers = profiles
                    .filter(p => p.role === 'teacher' || p.role === 'head_of_department')
                    .filter(p => {
                      if (teacherSubjectFilter === 'all') return true;
                      const assignments = localTeacherClasses.filter(tc => tc.teacher_id === p.id);
                      return assignments.some(tc => tc.subject_id === teacherSubjectFilter);
                    });

                  const selectableTeacherIds = filteredTeachers.filter(p => p.id !== currentUserId && p.email !== 'fprep.fschool@gmail.com').map(p => p.id);
                  const isAllSelected = selectableTeacherIds.length > 0 && selectableTeacherIds.every(id => selectedTeacherIds.includes(id));

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="p-4 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTeacherIds(Array.from(new Set([...selectedTeacherIds, ...selectableTeacherIds])));
                                  } else {
                                    setSelectedTeacherIds(selectedTeacherIds.filter(id => !selectableTeacherIds.includes(id)));
                                  }
                                }}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                            </th>
                            <th className="p-4">Email Giáo viên</th>
                            <th className="p-4">Vai trò chuyên môn</th>
                            <th className="p-4">Môn học phụ trách</th>
                            <th className="p-4">Lớp giảng dạy</th>
                            <th className="p-4 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTeachers.map(p => {
                            const assignments = localTeacherClasses.filter(tc => tc.teacher_id === p.id);
                            const teacherSubject = assignments[0]?.subject_id ? subjects.find(s => s.id === assignments[0].subject_id)?.name : '';
                            const teacherClassesNames = assignments.map(tc => classes.find(c => c.id === tc.class_id)?.name).filter(Boolean).join(', ');
                            const isSelected = selectedTeacherIds.includes(p.id);
                            const isProtected = p.id === currentUserId || p.email === 'fprep.fschool@gmail.com';

                            return (
                              <tr key={p.id} className={`border-b border-border hover:bg-muted/5 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                                <td className="p-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isProtected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTeacherIds(prev => [...prev, p.id]);
                                      } else {
                                        setSelectedTeacherIds(prev => prev.filter(id => id !== p.id));
                                      }
                                    }}
                                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-30"
                                  />
                                </td>
                                <td className="p-4 font-bold text-foreground">
                                  {p.email}
                                  <span className="block text-[10px] text-muted-foreground font-semibold">Tên FPT: {p.email.split('@')[0].toUpperCase()}</span>
                                </td>
                                <td className="p-4">{getRoleBadge(p.role)}</td>
                                <td className="p-4 font-bold text-primary">{teacherSubject || <span className="text-muted-foreground italic font-normal">Chưa gán môn</span>}</td>
                                <td className="p-4 font-semibold text-xs text-foreground">{teacherClassesNames || <span className="text-muted-foreground italic font-normal">Chưa phân lớp</span>}</td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => startEditUser(p)}
                                      className="px-2 py-1 rounded border border-border bg-background hover:bg-muted font-bold text-primary transition-all text-[10px]"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(p.id)}
                                      disabled={isProtected}
                                      className="px-2 py-1 rounded border border-destructive/20 bg-background hover:bg-destructive/5 font-bold text-destructive transition-all text-[10px] disabled:opacity-50"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* THÊM TÀI KHOẢN GIÁO VIÊN / HOD MỚI */}
              <div className="md:col-span-4 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm border-b border-border pb-2.5 flex items-center gap-1.5 text-foreground/80">
                  <Users className="h-4.5 w-4.5 text-primary" /> Thêm Giáo viên / Trưởng bộ môn
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Email tài khoản</label>
                    <input
                      type="email"
                      placeholder="VD: giaovien.vatly@fpt.edu.vn..."
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block">Vai trò khởi tạo</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full rounded border border-border bg-background px-2.5 py-2 focus:outline-none font-semibold text-primary"
                    >
                      <option value="teacher">Giáo viên bộ môn (Teacher)</option>
                      <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Môn học giảng dạy</label>
                    <select
                      value={newUserSubjectId}
                      onChange={(e) => setNewUserSubjectId(e.target.value)}
                      className="w-full rounded border border-border bg-background px-2.5 py-2 focus:outline-none text-primary font-bold"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {subjects.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Lớp dạy học (Chọn nhiều)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border rounded-xl p-2.5 bg-background max-h-[110px] overflow-y-auto">
                      {classes.map((cls: any) => {
                        const isChecked = newUserClassIds.includes(cls.id);
                        return (
                          <label key={cls.id} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewUserClassIds([...newUserClassIds, cls.id]);
                                } else {
                                  setNewUserClassIds(newUserClassIds.filter(id => id !== cls.id));
                                }
                              }}
                              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            {cls.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateUser}
                    className="w-full text-center flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Users className="h-3.5 w-3.5" /> Tạo tài khoản Giáo viên
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* SUBTAB 3: QUẢN LÝ HỌC SINH & XẾP LỚP */}
          {/* ==================================================== */}
          {adminSubTab === 'students' && (
            <div className="grid gap-6 md:grid-cols-12 items-start">
              
              {/* BẢNG DANH SÁCH HỌC SINH */}
              <div className="md:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-extrabold text-sm flex items-center gap-2 m-0">
                      <GraduationCap className="h-4 w-4 text-primary" /> Danh sách Học sinh ({profiles.filter(p => p.role === 'student').length})
                    </h3>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setShowExcelModal(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Nhập Excel (.xlsx)
                      </button>

                      {/* NÚT XOÁ TOÀN BỘ HỌC SINH KHỎI DATABASE */}
                      <button
                        onClick={() => handleOpenBatchModal({
                          title: 'Xóa TOÀN BỘ Học sinh trong Cơ sở dữ liệu',
                          description: `CẢNH BÁO NGUY HIỂM TỘI CAO: Hành động này sẽ XÓA VĨNH VIỄN toàn bộ ${profiles.filter(p => p.role === 'student').length} học sinh và toàn bộ lịch sử học tập, điểm thi, tiến độ của họ khỏi cơ sở dữ liệu Supabase. Vui lòng nhập "XOA" để xác nhận.`,
                          count: profiles.filter(p => p.role === 'student').length,
                          actionType: 'delete_students_by_filter',
                          payload: { filter: { classId: 'all' } },
                          requiresTextConfirm: true,
                          confirmKeyword: 'XOA'
                        })}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto"
                      >
                        <UserX className="h-3.5 w-3.5" /> Xóa TOÀN BỘ Học sinh (DB)
                      </button>
                    </div>
                  </div>

                  {/* BỘ LỌC TÌM KIẾM & BỘ LỌC LỚP HỌC */}
                  <div className="grid gap-3 sm:grid-cols-12 items-center text-xs">
                    <div className="sm:col-span-7 relative">
                      <input
                        type="text"
                        placeholder="Tìm kiếm họ tên, email, tên FPT/MSHS..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 focus:outline-none font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <select
                        value={userClassFilter}
                        onChange={(e) => setUserClassFilter(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none font-semibold"
                      >
                        <option value="all">Tất cả lớp ({profiles.filter(p => p.role === 'student').length})</option>
                        <option value="unassigned">Chưa xếp lớp ({localStudentDetails.filter(s => !s.class_id).length})</option>
                        {classes.map(cls => {
                          const count = localStudentDetails.filter(s => s.class_id === cls.id).length;
                          return <option key={cls.id} value={cls.id}>{cls.name} ({count} HS)</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  {/* THANH THAO TÁC XOÁ BATCH HỌC SINH */}
                  {(() => {
                    const filteredStudents = profiles
                      .filter(p => p.role === 'student')
                      .filter(p => {
                        if (userClassFilter !== 'all') {
                          const details = localStudentDetails.find(s => s.student_id === p.id);
                          if (userClassFilter === 'unassigned') {
                            if (details?.class_id) return false;
                          } else {
                            if (!details || details.class_id !== userClassFilter) return false;
                          }
                        }
                        if (userSearchTerm.trim() !== '') {
                          const query = userSearchTerm.toLowerCase().trim();
                          const details = localStudentDetails.find(s => s.student_id === p.id);
                          const matchEmail = p.email?.toLowerCase().includes(query);
                          const matchName = details?.full_name?.toLowerCase().includes(query);
                          const matchMshs = details?.mshs?.toLowerCase().includes(query);
                          if (!matchEmail && !matchName && !matchMshs) return false;
                        }
                        return true;
                      });

                    const isFiltered = userClassFilter !== 'all' || userSearchTerm.trim() !== '';

                    return (
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                        {selectedStudentIds.length > 0 && (
                          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-xl">
                            <span className="text-xs font-bold text-destructive">Đã chọn: {selectedStudentIds.length} HS</span>
                            <button
                              onClick={() => handleOpenBatchModal({
                                title: `Xóa ${selectedStudentIds.length} Học sinh đã chọn`,
                                description: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedStudentIds.length} tài khoản học sinh này khỏi cơ sở dữ liệu Supabase? Toàn bộ tiến độ và kết quả thi của họ cũng sẽ bị xóa.`,
                                count: selectedStudentIds.length,
                                actionType: 'delete_selected_users',
                                payload: { userIds: selectedStudentIds },
                                requiresTextConfirm: false
                              })}
                              className="inline-flex items-center gap-1 bg-destructive hover:bg-destructive/90 text-white font-bold text-xs px-2 py-0.5 rounded-lg transition-colors shadow-xs"
                            >
                              <Trash2 className="h-3 w-3" /> Xóa đã chọn
                            </button>
                            <button
                              onClick={() => setSelectedStudentIds([])}
                              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-1"
                            >
                              Bỏ
                            </button>
                          </div>
                        )}

                        {isFiltered && filteredStudents.length > 0 && (
                          <button
                            onClick={() => {
                              const filterLabel = userClassFilter !== 'all' 
                                ? (userClassFilter === 'unassigned' ? 'chưa xếp lớp' : `lớp ${classes.find(c => c.id === userClassFilter)?.name || ''}`)
                                : `theo từ khóa "${userSearchTerm}"`;
                              
                              handleOpenBatchModal({
                                title: `Xóa ${filteredStudents.length} Học sinh theo bộ lọc (${filterLabel})`,
                                description: `Bạn có chắc chắn muốn xóa vĩnh viễn toàn bộ ${filteredStudents.length} học sinh đang lọc (${filterLabel}) khỏi cơ sở dữ liệu Supabase?`,
                                count: filteredStudents.length,
                                actionType: 'delete_selected_users',
                                payload: { userIds: filteredStudents.map(s => s.id) },
                                requiresTextConfirm: true,
                                confirmKeyword: 'XOA'
                              });
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-xl transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Xóa {filteredStudents.length} HS theo bộ lọc hiện tại
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {editingUserId && (
                  <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                    <h4 className="font-extrabold text-sm text-primary">Chỉnh sửa thông tin Học sinh</h4>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Họ và Tên</label>
                        <input
                          type="text"
                          value={editingUserFullName}
                          onChange={(e) => setEditingUserFullName(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên FPT / MSHS</label>
                        <input
                          type="text"
                          value={editingUserFptName}
                          onChange={(e) => setEditingUserFptName(e.target.value)}
                          className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Xếp lớp học</label>
                        <select
                          value={editingUserClassId}
                          onChange={(e) => setEditingUserClassId(e.target.value)}
                          className="w-full rounded border border-border bg-background px-2.5 py-2 focus:outline-none font-bold text-primary"
                        >
                          <option value="">-- Chưa xếp lớp --</option>
                          {classes.map((cls: any) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 text-xs pt-1">
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="px-4 py-2 rounded-lg border border-border font-bold text-muted-foreground hover:bg-background transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateUser}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-extrabold hover:opacity-90 transition-opacity"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                )}

                {(() => {
                  const filteredStudents = profiles
                    .filter(p => p.role === 'student')
                    .filter(p => {
                      if (userClassFilter !== 'all') {
                        const details = localStudentDetails.find(s => s.student_id === p.id);
                        if (userClassFilter === 'unassigned') {
                          if (details?.class_id) return false;
                        } else {
                          if (!details || details.class_id !== userClassFilter) return false;
                        }
                      }
                      if (userSearchTerm.trim() !== '') {
                        const query = userSearchTerm.toLowerCase().trim();
                        const details = localStudentDetails.find(s => s.student_id === p.id);
                        const matchEmail = p.email?.toLowerCase().includes(query);
                        const matchName = details?.full_name?.toLowerCase().includes(query);
                        const matchMshs = details?.mshs?.toLowerCase().includes(query);
                        if (!matchEmail && !matchName && !matchMshs) return false;
                      }
                      return true;
                    });

                  const isAllFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id));

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <th className="p-4 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={isAllFilteredSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const allFilteredIds = filteredStudents.map(s => s.id);
                                    setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...allFilteredIds])));
                                  } else {
                                    const filteredIdSet = new Set(filteredStudents.map(s => s.id));
                                    setSelectedStudentIds(selectedStudentIds.filter(id => !filteredIdSet.has(id)));
                                  }
                                }}
                                className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                              />
                            </th>
                            <th className="p-4">Họ và Tên</th>
                            <th className="p-4">Tên FPT / MSHS</th>
                            <th className="p-4">Tài khoản Email</th>
                            <th className="p-4">Lớp học</th>
                            <th className="p-4 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-muted-foreground italic font-semibold">
                                Không tìm thấy học sinh nào phù hợp bộ lọc.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map(p => {
                              const details = localStudentDetails.find((s: any) => s.student_id === p.id);
                              const cls = classes.find(c => c.id === details?.class_id);
                              const isSelected = selectedStudentIds.includes(p.id);

                              return (
                                <tr key={p.id} className={`border-b border-border hover:bg-muted/5 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedStudentIds(prev => [...prev, p.id]);
                                        } else {
                                          setSelectedStudentIds(prev => prev.filter(id => id !== p.id));
                                        }
                                      }}
                                      className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-4 font-black text-foreground">{details?.full_name || 'Chưa cập nhật'}</td>
                                  <td className="p-4 font-bold text-primary">{details?.mshs || 'N/A'}</td>
                                  <td className="p-4 font-semibold text-muted-foreground">{p.email}</td>
                                  <td className="p-4">
                                    {cls ? (
                                      <span className="font-bold text-foreground bg-muted/30 px-2 py-0.5 rounded border border-border/50">{cls.name}</span>
                                    ) : (
                                      <span className="text-muted-foreground italic text-[11px]">Chưa xếp lớp</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => startEditUser(p)}
                                        className="px-2 py-1 rounded border border-border bg-background hover:bg-muted font-bold text-primary transition-all text-[10px]"
                                      >
                                        Sửa
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(p.id)}
                                        className="px-2 py-1 rounded border border-destructive/20 bg-background hover:bg-destructive/5 font-bold text-destructive transition-all text-[10px]"
                                      >
                                        Xóa
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* THÊM HỌC SINH MỚI */}
              <div className="md:col-span-4 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm border-b border-border pb-2.5 flex items-center gap-1.5 text-foreground/80">
                  <GraduationCap className="h-4.5 w-4.5 text-primary" /> Thêm tài khoản Học sinh
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Họ và Tên</label>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Văn A..."
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên FPT / MSHS</label>
                    <input
                      type="text"
                      placeholder="VD: NamNP12..."
                      value={newUserFptName}
                      onChange={(e) => setNewUserFptName(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Email tài khoản</label>
                    <input
                      type="email"
                      placeholder="VD: hocsinh@fpt.edu.vn..."
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full rounded border border-border bg-background px-3 py-2 focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Xếp lớp học</label>
                    <select
                      value={newUserClassId}
                      onChange={(e) => setNewUserClassId(e.target.value)}
                      className="w-full rounded border border-border bg-background px-2.5 py-2 focus:outline-none font-bold text-primary"
                    >
                      <option value="">-- Chưa xếp lớp --</option>
                      {classes.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setNewUserRole('student');
                      handleCreateUser();
                    }}
                    className="w-full text-center flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <GraduationCap className="h-3.5 w-3.5" /> Tạo tài khoản Học sinh
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* 3. CHẾ ĐỘ NHẬT KÝ BẢO MẬT (LOGS VIEW) */}
      {/* ==================================================== */}
      {activeTab === 'logs' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
          <div className="p-4 border-b border-border bg-muted/10">
            <h3 className="font-extrabold text-sm">Nhật ký hoạt động bảo mật (Audit Logs)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Người thực hiện (Actor)</th>
                  <th className="p-4">Hành động</th>
                  <th className="p-4">Bảng tác động</th>
                  <th className="p-4">Chi tiết thay đổi (Cũ vs Mới)</th>
                  <th className="p-4">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground font-semibold">Chưa có nhật ký bảo mật nào được ghi nhận.</td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/5 transition-colors text-xs">
                      <td className="p-4 font-bold text-foreground">{log.actor?.email || 'Hệ thống tự động'}</td>
                      <td className="p-4">
                        <span className="bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">{log.target_table}</td>
                      <td className="p-4 space-y-1">
                        <div className="bg-muted/30 p-2 rounded border border-border font-mono max-w-sm overflow-x-auto text-[10px]">
                          <div><strong className="text-red-500">Cũ:</strong> {JSON.stringify(log.old_values)}</div>
                          <div className="mt-1"><strong className="text-green-500">Mới:</strong> {JSON.stringify(log.new_values)}</div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-muted-foreground font-semibold">
                        {safeDateTimeFormat(log.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL XÁC NHẬN XOÁ HÀNG LOẠT DỮ LIỆU KHỎI DB */}
      {/* ==================================================== */}
      {batchModalOpen && batchModalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-destructive/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-foreground">{batchModalConfig.title}</h3>
                <span className="inline-block mt-1 text-[11px] font-bold bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded-full">
                  Ảnh hưởng: {batchModalConfig.count} bản ghi trong DB
                </span>
              </div>
              <button
                onClick={() => { setBatchModalOpen(false); setBatchModalConfig(null); }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {batchModalConfig.description}
            </p>

            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-xs text-destructive font-semibold space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" /> Thao tác này sẽ xoá vĩnh viễn:
              </p>
              <ul className="list-disc list-inside text-[11px] text-destructive/90 space-y-0.5">
                <li>Tài khoản người dùng (profiles)</li>
                <li>Hồ sơ chi tiết (student_details / teacher_classes)</li>
                <li>Lịch sử học tập, nhật ký và điểm số thi thử</li>
              </ul>
            </div>

            {batchModalConfig.requiresTextConfirm && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-foreground block">
                  Nhập chính xác chữ <span className="font-mono text-destructive font-extrabold bg-destructive/10 px-1.5 py-0.5 rounded">{batchModalConfig.confirmKeyword || 'XOA'}</span> để xác nhận:
                </label>
                <input
                  type="text"
                  placeholder="Gõ XOA vào đây..."
                  value={batchConfirmInput}
                  onChange={(e) => setBatchConfirmInput(e.target.value)}
                  className="w-full rounded-xl border border-destructive/30 bg-background px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-destructive text-destructive"
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => { setBatchModalOpen(false); setBatchModalConfig(null); }}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingBatch || (batchModalConfig.requiresTextConfirm && batchConfirmInput.trim().toUpperCase() !== (batchModalConfig.confirmKeyword || 'XOA'))}
                onClick={handleExecuteBatchDelete}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeletingBatch ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang xóa khỏi DB...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Xác nhận Xóa Vĩnh Viễn
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NHẬP HỌC SINH TỪ EXCEL */}
      <ExcelImportModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        classes={classes}
        token={token}
        onSuccess={handleExcelImportSuccess}
      />

    </div>
  );
}
