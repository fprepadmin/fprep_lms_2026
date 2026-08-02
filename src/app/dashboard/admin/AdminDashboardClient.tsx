'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Shield, Users, Activity, Settings, Database, 
  CheckCircle, AlertCircle, RefreshCw, Terminal, Check,
  ChevronRight, Calendar, Info
} from 'lucide-react';

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
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

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
    setEditingUserClassIds(assignments.map(tc => tc.class_id));
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
        const newAssignments = editingUserClassIds.map(cid => ({
          id: 'tc-' + Math.random(),
          teacher_id: editingUserId,
          class_id: cid,
          subject_id: editingUserSubjectId
        }));
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
        const newAssignments = newUserClassIds.map(cid => ({
          id: 'tc-' + Math.random(),
          teacher_id: data.id,
          class_id: cid,
          subject_id: newUserSubjectId
        }));
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

  // Kích hoạt nạp dữ liệu kiểm thử (Seeding)
  const handleSeedData = async () => {
    if (!confirm('Bạn có muốn khởi tạo dữ liệu mẫu cho hệ thống (bao gồm 11 lớp học, các môn tự học và bài học mẫu)?')) return;
    setSeeding(true);
    setSeedMessage(null);
    try {
      const res = await fetch('/api/system/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(data.message || 'Seed dữ liệu thành công!');
      } else {
        setSeedMessage(`Lỗi: ${data.error}`);
      }
    } catch (err: any) {
      setSeedMessage(`Lỗi kết nối máy chủ: ${err.message}`);
    } finally {
      setSeeding(false);
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
        <div className="space-y-8">
          {/* Widget chỉ số */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="bg-primary/10 text-primary p-2.5 rounded-lg border border-primary/20"><Users className="h-5 w-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Tài khoản</span>
                <h4 className="text-sm font-black">{profiles.length} tài khoản</h4>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="bg-red-500/10 text-red-500 p-2.5 rounded-lg border border-red-500/20"><Shield className="h-5 w-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Số quản trị</span>
                <h4 className="text-sm font-black">{profiles.filter(p => p.role === 'admin').length} tài khoản</h4>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="bg-secondary/10 text-secondary p-2.5 rounded-lg border border-secondary/20"><Activity className="h-5 w-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Nhật ký bảo mật</span>
                <h4 className="text-sm font-black">{auditLogs.length} sự kiện</h4>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="bg-green-500/10 text-green-600 p-2.5 rounded-lg border border-green-500/20"><Activity className="h-5 w-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Lượt học hôm nay</span>
                <h4 className="text-sm font-black">{visits.totalAccessesToday} lượt ({visits.activeStudentsToday} HS)</h4>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="bg-emerald-500/10 text-emerald-600 p-2.5 rounded-lg border border-emerald-500/20"><CheckCircle className="h-5 w-5" /></div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Học viên hoạt động</span>
                <h4 className="text-sm font-black">{activeUsers.length} đang online</h4>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-12 items-start">
            {/* Cột Trái: Bảo trì hệ thống & Khởi tạo lớp */}
            <div className="md:col-span-6 space-y-4">
              {/* Tiện ích Seed dữ liệu */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm border-b border-border pb-2 flex items-center gap-1.5">
                  <Database className="h-4.5 w-4.5 text-primary" /> Tiện ích Bảo trì & Seed dữ liệu mẫu
                </h3>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ở phiên bản Demo, bạn có thể khởi tạo nhanh 11 lớp học Khối 12 (12T1-T6, 12X1-X4, 12K), các chương trình học tự học mẫu và các đề kiểm tra mẫu để xem thử chức năng tức thì.
                </p>

                {seedMessage && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs font-bold text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{seedMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleSeedData}
                  disabled={seeding}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Database className="h-4 w-4" />
                  {seeding ? 'Đang nạp dữ liệu mẫu...' : 'Khởi tạo dữ liệu mẫu hệ thống'}
                </button>
              </div>

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
        <div className="grid gap-6 md:grid-cols-12 items-start">
          
          {/* CỘT TRÁI (COL-SPAN-8): BẢNG TÀI KHOẢN VÀ PHÂN QUYỀN */}
          <div className="md:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
            <div className="p-4 border-b border-border bg-muted/10 space-y-3">
              <h3 className="font-extrabold text-sm">Danh sách tài khoản & Phân quyền truy cập</h3>
              
              {/* Thanh bộ lọc và tìm kiếm dành cho Admin */}
              <div className="grid gap-3 sm:grid-cols-12 items-center text-xs">
                <div className="sm:col-span-6 relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm họ tên, email, tên FPT..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 focus:outline-none font-semibold"
                  />
                </div>
                
                <div className="sm:col-span-3">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => {
                      setUserRoleFilter(e.target.value);
                      if (e.target.value !== 'all' && e.target.value !== 'student') {
                        setUserClassFilter('all');
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none font-bold text-primary"
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="student">Học sinh (Student)</option>
                    <option value="teacher">Giáo viên (Teacher)</option>
                    <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={userClassFilter}
                    onChange={(e) => setUserClassFilter(e.target.value)}
                    disabled={userRoleFilter !== 'all' && userRoleFilter !== 'student'}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none font-semibold disabled:opacity-50"
                  >
                    <option value="all">Tất cả lớp</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {editingUserId ? (
              /* PANEL EDIT USER CHUYÊN NGHIỆP */
              <div className="p-5 border-b border-border bg-primary/5 space-y-4">
                <h4 className="font-extrabold text-sm text-primary">Chỉnh sửa thông tin tài khoản</h4>
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
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Vai trò</label>
                    <select
                      value={editingUserRole}
                      onChange={(e) => setEditingUserRole(e.target.value as any)}
                      className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-semibold text-primary"
                    >
                      {currentUserRole !== 'head_of_department' && (
                        <option value="student">Học sinh (Student)</option>
                      )}
                      <option value="teacher">Giáo viên (Teacher)</option>
                      <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                      {currentUserRole !== 'head_of_department' && (
                        <option value="admin">Quản trị viên (Admin)</option>
                      )}
                    </select>
                  </div>
                </div>

                {editingUserRole === 'student' && (
                  <div className="grid gap-4 sm:grid-cols-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Họ và Tên</label>
                      <input
                        type="text"
                        value={editingUserFullName}
                        onChange={(e) => setEditingUserFullName(e.target.value)}
                        className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên FPT / MSHS</label>
                      <input
                        type="text"
                        value={editingUserFptName}
                        onChange={(e) => setEditingUserFptName(e.target.value)}
                        className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Xếp lớp học</label>
                      <select
                        value={editingUserClassId}
                        onChange={(e) => setEditingUserClassId(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-semibold"
                      >
                        <option value="">-- Chưa xếp lớp --</option>
                        {classes.map((cls: any) => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {(editingUserRole === 'teacher' || editingUserRole === 'head_of_department') && (
                  <div className="grid gap-4 sm:grid-cols-1 text-xs">
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
                      <div className="grid grid-cols-4 gap-2 border border-border rounded-xl p-3 bg-background max-h-[120px] overflow-y-auto">
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
                )}

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
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">Họ tên & Tên FPT</th>
                    <th className="p-4">Tài khoản Email</th>
                    <th className="p-4">Phân lớp & Môn dạy</th>
                    <th className="p-4">Vai trò hiện tại</th>
                    <th className="p-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles
                    .filter(profile => {
                      // 1. Giới hạn vai trò cho HOD
                      if (currentUserRole === 'head_of_department') {
                        if (profile.role !== 'teacher' && profile.role !== 'head_of_department') {
                          return false;
                        }
                      }
                      
                      // 2. Bộ lọc theo vai trò (Role Filter)
                      if (userRoleFilter !== 'all') {
                        if (profile.role !== userRoleFilter) return false;
                      }

                      // 3. Bộ lọc theo lớp (Class Filter)
                      if (userClassFilter !== 'all') {
                        const details = localStudentDetails.find(s => s.student_id === profile.id);
                        if (!details || details.class_id !== userClassFilter) return false;
                      }

                      // 4. Tìm kiếm từ khóa (Search Term)
                      if (userSearchTerm.trim() !== '') {
                        const query = userSearchTerm.toLowerCase().trim();
                        const details = localStudentDetails.find(s => s.student_id === profile.id);
                        const matchEmail = profile.email?.toLowerCase().includes(query);
                        const matchName = details?.full_name?.toLowerCase().includes(query);
                        const matchMshs = details?.mshs?.toLowerCase().includes(query);
                        
                        if (!matchEmail && !matchName && !matchMshs) return false;
                      }

                      return true;
                    })
                    .map(profile => {
                      const details = localStudentDetails.find((s: any) => s.student_id === profile.id);
                    
                    // Lấy phân lớp môn học của giáo viên
                    const assignments = localTeacherClasses.filter(tc => tc.teacher_id === profile.id);
                    const teacherSubject = assignments[0]?.subject_id ? subjects.find(s => s.id === assignments[0].subject_id)?.name : '';
                    const teacherClassesNames = assignments.map(tc => classes.find(c => c.id === tc.class_id)?.name).filter(Boolean).join(', ');

                    return (
                      <tr key={profile.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="p-4">
                          {profile.role === 'student' ? (
                            <div>
                              <p className="font-extrabold text-foreground">{details?.full_name || 'N/A'}</p>
                              <p className="text-[10px] text-muted-foreground font-semibold">Tên FPT: {details?.mshs || 'N/A'}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-extrabold text-foreground">{profile.email.split('@')[0].toUpperCase()}</p>
                              <p className="text-[10px] text-muted-foreground font-semibold">Tên FPT: {profile.email.split('@')[0].toUpperCase()}</p>
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-bold text-foreground">{profile.email}</td>
                        <td className="p-4 font-semibold text-xs">
                          {profile.role === 'student' ? (
                            <span className="text-primary font-bold">
                              {details?.class_id ? classes.find(c => c.id === details.class_id)?.name : 'Chưa xếp lớp'}
                            </span>
                          ) : (profile.role === 'teacher' || profile.role === 'head_of_department') ? (
                            teacherSubject ? (
                              <div>
                                <p className="text-foreground font-bold">Dạy: {teacherSubject}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold">Lớp: {teacherClassesNames || 'Chưa phân lớp'}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-[10px]">Chưa phân công</span>
                            )
                          ) : (
                            <span className="text-muted-foreground italic text-[10px]">Toàn quyền hệ thống</span>
                          )}
                        </td>
                        <td className="p-4">
                          {getRoleBadge(profile.role)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => startEditUser(profile)}
                              className="px-2 py-1 rounded border border-border bg-background hover:bg-muted font-bold text-primary transition-all text-[10px]"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteUser(profile.id)}
                              disabled={profile.id === currentUserId}
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
          </div>

          {/* CỘT PHẢI (COL-SPAN-4): THỐNG KÊ PHÂN BỔ VÀ CẢNH BÁO BẢO MẬT */}
          <div className="md:col-span-4 space-y-4">
            
            {/* THÊM TÀI KHOẢN MỚI */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="font-extrabold text-sm border-b border-border pb-2.5 flex items-center gap-1.5 text-foreground/80">
                <Users className="h-4.5 w-4.5 text-primary" /> Thêm tài khoản & phân quyền sẵn
              </h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Họ và Tên</label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A..."
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Tên FPT / Mã số (VD: TamTT48)</label>
                  <input
                    type="text"
                    placeholder="VD: NamNP12, TamTT48..."
                    value={newUserFptName}
                    onChange={(e) => setNewUserFptName(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Email tài khoản</label>
                  <input
                    type="email"
                    placeholder="VD: hocsinh@fpt.edu.vn..."
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">Vai trò gán sẵn</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-semibold text-primary"
                  >
                    {currentUserRole !== 'head_of_department' && (
                      <option value="student">Học sinh (Student)</option>
                    )}
                    <option value="teacher">Giáo viên (Teacher)</option>
                    <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                    {currentUserRole !== 'head_of_department' && (
                      <option value="admin">Quản trị viên (Admin)</option>
                    )}
                  </select>
                </div>

                {newUserRole === 'student' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Xếp lớp học</label>
                    <select
                      value={newUserClassId}
                      onChange={(e) => setNewUserClassId(e.target.value)}
                      className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-semibold"
                    >
                      <option value="">-- Chưa xếp lớp --</option>
                      {classes.map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(newUserRole === 'teacher' || newUserRole === 'head_of_department') && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Môn học giảng dạy</label>
                      <select
                        value={newUserSubjectId}
                        onChange={(e) => setNewUserSubjectId(e.target.value)}
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
                      <div className="grid grid-cols-3 gap-2 border border-border rounded-xl p-2.5 bg-background max-h-[100px] overflow-y-auto">
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
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Google Apps Script URL</label>
                  <input
                    type="text"
                    placeholder="Dán link Web App để gửi email..."
                    value={gasUrl}
                    onChange={(e) => {
                      setGasUrl(e.target.value);
                      localStorage.setItem('fprep-gas-url', e.target.value);
                    }}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-[10px] font-mono focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleCreateUser}
                  className="w-full text-center flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Users className="h-3.5 w-3.5" /> Tạo tài khoản & Gán vai trò
                </button>
              </div>
            </div>

            {/* THỐNG KÊ VAI TRÒ */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="font-extrabold text-sm border-b border-border pb-2.5 flex items-center gap-1.5 text-foreground/80">
                <Users className="h-4.5 w-4.5 text-primary" /> Phân bổ tài khoản
              </h4>
              
              <div className="space-y-3 font-semibold text-xs text-muted-foreground">
                <div className="flex justify-between items-center p-2 rounded-xl bg-muted/20 border border-border/50">
                  <span>Học sinh:</span>
                  <strong className="text-foreground">{profiles.filter(p => p.role === 'student').length} tài khoản</strong>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-muted/20 border border-border/50">
                  <span>Giáo viên:</span>
                  <strong className="text-foreground">{profiles.filter(p => p.role === 'teacher').length} tài khoản</strong>
                </div>
                <div className="flex justify-between items-center p-2 rounded-xl bg-muted/20 border border-border/50">
                  <span>Quản trị viên:</span>
                  <strong className="text-foreground">{profiles.filter(p => p.role === 'admin').length} tài khoản</strong>
                </div>
              </div>
            </div>

            {/* CHÍNH SÁCH BẢO MẬT */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="font-extrabold text-xs text-red-500 uppercase tracking-wider flex items-center gap-1">
                <Shield className="h-4 w-4" /> Lưu ý quản trị
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Việc thay đổi vai trò sẽ lập tức ảnh hưởng đến quyền hạn truy cập của tài khoản tương ứng trên hệ thống thông qua chính sách bảo mật Row Level Security (RLS) của Database.
              </p>
            </div>

          </div>

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

    </div>
  );
}
