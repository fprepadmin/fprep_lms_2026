'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { 
  Shield, ShieldCheck, Users, Activity, Settings, Database, 
  CheckCircle, AlertCircle, RefreshCw, Terminal, Check,
  ChevronRight, Calendar, Info, Building2, GraduationCap, BookOpen, Plus, Trash2, Edit3, Loader2,
  FileSpreadsheet, AlertTriangle, CheckSquare, Square, X, Filter, UserX, FolderX,
  Image as ImageIcon, UploadCloud, Sparkles, ClipboardList, HelpCircle, TrendingUp, Award, BarChart3, Clock, Trophy, Search, Download
} from 'lucide-react';
import ExcelImportModal from '@/components/student/ExcelImportModal';
import AdminElectiveStatsSection from '@/components/admin/AdminElectiveStatsSection';
import { sortClassesNaturally, getTeacherDisplayName, getSubjectColorTheme, CLASS_BACKGROUND_PRESETS, getClassBackgroundUrl } from '@/lib/schoolUtils';

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
  studyProgress?: any[];
  studentDetails?: any[];
  lessons?: any[];
  initialClasses?: any[];
  subjects?: any[];
  initialTeacherClasses?: any[];
  exams?: any[];
  questions?: any[];
  examResults?: any[];
  examMetadataStore?: {
    assignments: any[];
    exam_authors: Record<string, string>;
  };
  token: string;
  currentUserId: string;
  viewMode: 'home' | 'users' | 'logs';
}

export default function AdminDashboardClient({
  initialProfiles,
  auditLogs,
  studyLogs = [],
  studyProgress = [],
  studentDetails = [],
  lessons = [],
  initialClasses = [],
  subjects = [],
  initialTeacherClasses = [],
  exams = [],
  questions = [],
  examResults = [],
  examMetadataStore = { assignments: [], exam_authors: {} },
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

  // -------------------------------------------------------------
  // PHÂN HỆ THỐNG KÊ KHẢO THÍ CHUYÊN SÂU THEO MÔN & THỜI GIAN
  // -------------------------------------------------------------
  const [examStatsTimeRange, setExamStatsTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [examStatsSubjectFilter, setExamStatsSubjectFilter] = useState<string>('all');

  // Lọc exam_results theo mốc thời gian
  const filteredExamResults = React.useMemo(() => {
    if (!examResults || examResults.length === 0) return [];
    if (examStatsTimeRange === 'all') return examResults;

    const now = new Date().getTime();
    let threshold = 0;
    if (examStatsTimeRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      threshold = today.getTime();
    } else if (examStatsTimeRange === 'week') {
      threshold = now - 7 * 24 * 60 * 60 * 1000;
    } else if (examStatsTimeRange === 'month') {
      threshold = now - 30 * 24 * 60 * 60 * 1000;
    }

    return examResults.filter((r: any) => {
      if (!r || !r.created_at) return false;
      return new Date(r.created_at).getTime() >= threshold;
    });
  }, [examResults, examStatsTimeRange]);

  // Tạo map tra cứu nhanh đề thi theo exam_id
  const examMap = React.useMemo(() => {
    const map = new Map<string, any>();
    exams.forEach((e: any) => {
      if (e && e.id) map.set(e.id, e);
    });
    return map;
  }, [exams]);

  // Thống kê chi tiết theo từng môn học
  const subjectExamStats = React.useMemo(() => {
    return subjects.map((subj: any) => {
      // 1. Số lượng đề của môn
      const subjExams = exams.filter((e: any) => e.subject_id === subj.id);
      const subjExamIds = new Set(subjExams.map((e: any) => e.id));

      // 2. Số lượng câu hỏi của môn & phân bổ loại câu hỏi
      const subjQuestions = questions.filter((q: any) => subjExamIds.has(q.exam_id));
      const mcqCount = subjQuestions.filter((q: any) => !q.question_type || q.question_type === 'mcq').length;
      const tfCount = subjQuestions.filter((q: any) => q.question_type === 'tf').length;
      const saqCount = subjQuestions.filter((q: any) => q.question_type === 'saq').length;

      // 3. Số lượt làm của học sinh (toàn thời gian vs trong kỳ lọc)
      const allSubjAttempts = examResults.filter((r: any) => subjExamIds.has(r.exam_id));
      const periodSubjAttempts = filteredExamResults.filter((r: any) => subjExamIds.has(r.exam_id));

      // Điểm trung bình trong kỳ lọc
      const avgScore = periodSubjAttempts.length > 0
        ? (periodSubjAttempts.reduce((acc: number, curr: any) => acc + (Number(curr.score) || 0), 0) / periodSubjAttempts.length)
        : 0;

      // Số học sinh độc lập đã tham gia luyện đề môn này
      const uniqueStudents = new Set(periodSubjAttempts.map((r: any) => r.student_id)).size;

      return {
        subject: subj,
        examCount: subjExams.length,
        questionCount: subjQuestions.length,
        mcqCount,
        tfCount,
        saqCount,
        totalAttemptsAllTime: allSubjAttempts.length,
        periodAttempts: periodSubjAttempts.length,
        avgScore: Math.round(avgScore * 10) / 10,
        uniqueStudents
      };
    });
  }, [subjects, exams, questions, examResults, filteredExamResults]);

  // Tổng hợp chỉ số khảo thí toàn trường
  const totalStatsSummary = React.useMemo(() => {
    const totalExams = exams.length;
    const totalQuestions = questions.length;
    const totalAttemptsInPeriod = filteredExamResults.length;
    const totalAttemptsAllTime = examResults.length;
    const totalUniqueStudentsInPeriod = new Set(filteredExamResults.map((r: any) => r.student_id)).size;

    return {
      totalExams,
      totalQuestions,
      totalAttemptsInPeriod,
      totalAttemptsAllTime,
      totalUniqueStudentsInPeriod
    };
  }, [exams, questions, filteredExamResults, examResults]);

  // Danh sách hiển thị theo bộ lọc môn học
  const displayedSubjectStats = React.useMemo(() => {
    if (examStatsSubjectFilter === 'all') return subjectExamStats;
    return subjectExamStats.filter((s: any) => s.subject.id === examStatsSubjectFilter);
  }, [subjectExamStats, examStatsSubjectFilter]);

  // -------------------------------------------------------------
  // BẢNG VINH DANH GIÁO VIÊN XUẤT SẮC & ĐÓNG GÓP NGÂN HÀNG ĐỀ THI
  // (CHỈ THỐNG KÊ CHÍNH XÁC ĐỀ DO CHÍNH GIÁO VIÊN UPLOAD, KHÔNG CỘNG GỘP THEO BỘ MÔN)
  // -------------------------------------------------------------
  const [teacherSearchKeyword, setTeacherSearchKeyword] = useState('');
  const [leaderboardSubjectFilter, setLeaderboardSubjectFilter] = useState('all');
  const [localExamAuthors, setLocalExamAuthors] = useState<Record<string, string>>(
    () => ({ ...(examMetadataStore?.exam_authors || {}) })
  );
  const [showUnattributedPanel, setShowUnattributedPanel] = useState(false);
  const [savingAuthorExamId, setSavingAuthorExamId] = useState<string | null>(null);
  const [authorDrafts, setAuthorDrafts] = useState<Record<string, string>>({});

  // Tổng hợp chính xác người upload của từng đề thi từ các nguồn dữ liệu thực tế
  const resolvedExamAuthors = React.useMemo(() => {
    const map: Record<string, string> = {};

    // 1. Nguồn dự phòng từ audit_logs (duyệt từ cũ -> mới để bản ghi mới nhất có hiệu lực)
    for (let i = auditLogs.length - 1; i >= 0; i--) {
      const log = auditLogs[i];
      if (
        log.target_table === 'exams' &&
        log.target_id &&
        (log.action === 'RECORD_EXAM_AUTHOR' || log.action === 'CREATE_EXAM' || log.action === 'UPLOAD_EXAM')
      ) {
        const authorId = log.new_values?.teacher_id || log.actor_id;
        if (authorId) map[log.target_id] = authorId;
      }
    }

    // 2. Cột tác giả trực tiếp trên bảng exams (nếu DB có created_by / teacher_id / author_id)
    exams.forEach((e: any) => {
      const directAuthor = e.created_by || e.teacher_id || e.author_id;
      if (directAuthor && !map[e.id]) {
        map[e.id] = directAuthor;
      }
    });

    // 3. Nguồn chính thức từ Exam Metadata Store (ưu tiên cao nhất)
    Object.entries(localExamAuthors).forEach(([examId, teacherId]) => {
      if (teacherId) {
        map[examId] = teacherId;
      } else {
        delete map[examId];
      }
    });

    return map;
  }, [auditLogs, exams, localExamAuthors]);

  const unattributedExams = React.useMemo(
    () => exams.filter((e: any) => !resolvedExamAuthors[e.id]),
    [exams, resolvedExamAuthors]
  );

  const handleAssignExamAuthor = async (examId: string, teacherId: string, examTitle?: string) => {
    if (!teacherId) return;
    setSavingAuthorExamId(examId);
    try {
      const res = await fetch('/api/teacher/exam-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exam_id: examId,
          action: 'record_author',
          teacher_id: teacherId,
          force: true,
          title: examTitle || ''
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không thể lưu giáo viên upload đề');
      }
      setLocalExamAuthors(prev => ({ ...prev, [examId]: teacherId }));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gán giáo viên upload đề.');
    } finally {
      setSavingAuthorExamId(null);
    }
  };

  const teacherContributionLeaderboard = React.useMemo(() => {
    const teachers = profiles.filter(p => p.role === 'teacher' || p.role === 'head_of_department');

    const categorize = (e: any) => {
      const rawType = e.exam_type;
      if (rawType) {
        if (rawType === 'topic' || rawType === 'lesson') return 'topic';
        if (rawType === 'thptqg') return 'thptqg';
        if (rawType === 'vsat') return 'vsat';
        if (rawType === 'dgnl') return 'dgnl';
        return 'test';
      }
      const title = (e.title || '').toLowerCase();
      if (title.includes('vsat') || title.includes('v-sat')) return 'vsat';
      if (title.includes('đgnl') || title.includes('đánh giá năng lực') || title.includes('tsa')) return 'dgnl';
      if (title.includes('thpt') || title.includes('tốt nghiệp') || title.includes('quốc gia')) return 'thptqg';
      if (title.includes('chủ đề') || title.includes('bài tập') || e.lesson_id) return 'topic';
      return 'test';
    };

    const board = teachers.map(teacher => {
      // 1. Môn học phụ trách
      const teachingClasses = initialTeacherClasses.filter((tc: any) => tc.teacher_id === teacher.id);
      const teachingSubjectIds = Array.from(new Set(teachingClasses.map((tc: any) => tc.subject_id).filter(Boolean)));
      const teachingSubjects = subjects.filter((s: any) => teachingSubjectIds.includes(s.id));

      // 2. CHỈ tính các đề thi do CHÍNH giáo viên này trực tiếp upload/biên soạn (KHÔNG gộp chung đề của cả bộ môn)
      const teacherExams = exams.filter((e: any) => resolvedExamAuthors[e.id] === teacher.id);

      const examIdsSet = new Set(teacherExams.map((e: any) => e.id));

      const topicCount = teacherExams.filter(e => categorize(e) === 'topic').length;
      const testCount = teacherExams.filter(e => categorize(e) === 'test').length;
      const thptqgCount = teacherExams.filter(e => categorize(e) === 'thptqg').length;
      const vsatCount = teacherExams.filter(e => categorize(e) === 'vsat').length;
      const dgnlCount = teacherExams.filter(e => categorize(e) === 'dgnl').length;

      const teacherQuestions = questions.filter((q: any) => examIdsSet.has(q.exam_id));
      const studentSubmissions = examResults.filter((r: any) => examIdsSet.has(r.exam_id));
      const assignedCount = (examMetadataStore?.assignments || []).filter((a: any) => a.teacher_id === teacher.id).length;

      const teacherNames = getTeacherDisplayName(teacher.email);
      const displayNameStr = teacherNames?.fullName || teacherNames?.fptName || teacher.email.split('@')[0];

      return {
        teacher,
        displayName: displayNameStr,
        subjects: teachingSubjects,
        teachingSubjectIds,
        totalExams: teacherExams.length,
        topicCount,
        testCount,
        thptqgCount,
        vsatCount,
        dgnlCount,
        totalQuestions: teacherQuestions.length,
        totalStudentAttempts: studentSubmissions.length,
        assignedCount,
        exams: teacherExams
      };
    });

    // Sắp xếp vinh danh giáo viên xuất sắc theo số đề thực tế đã upload
    board.sort((a, b) => {
      if (b.totalExams !== a.totalExams) return b.totalExams - a.totalExams;
      if (b.totalQuestions !== a.totalQuestions) return b.totalQuestions - a.totalQuestions;
      return b.totalStudentAttempts - a.totalStudentAttempts;
    });

    return board;
  }, [profiles, exams, questions, examResults, initialTeacherClasses, subjects, examMetadataStore, resolvedExamAuthors]);

  const teachersWithUploadsCount = React.useMemo(
    () => teacherContributionLeaderboard.filter(t => t.totalExams > 0).length,
    [teacherContributionLeaderboard]
  );

  const attributedExamsCount = React.useMemo(
    () => teacherContributionLeaderboard.reduce((sum, item) => sum + item.totalExams, 0),
    [teacherContributionLeaderboard]
  );

  const attributedQuestionsCount = React.useMemo(
    () => teacherContributionLeaderboard.reduce((sum, item) => sum + item.totalQuestions, 0),
    [teacherContributionLeaderboard]
  );

  const topContributor = teacherContributionLeaderboard[0]?.totalExams > 0 ? teacherContributionLeaderboard[0] : null;

  // Lọc bảng vinh danh theo từ khóa và môn học
  const filteredTeacherLeaderboard = React.useMemo(() => {
    return teacherContributionLeaderboard.filter(item => {
      if (leaderboardSubjectFilter !== 'all') {
        if (!item.teachingSubjectIds.includes(leaderboardSubjectFilter)) return false;
      }
      if (teacherSearchKeyword.trim()) {
        const kw = teacherSearchKeyword.toLowerCase();
        const matchName = item.displayName.toLowerCase().includes(kw);
        const matchEmail = (item.teacher.email || '').toLowerCase().includes(kw);
        const matchSub = item.subjects.some((s: any) => s.name.toLowerCase().includes(kw));
        if (!matchName && !matchEmail && !matchSub) return false;
      }
      return true;
    });
  }, [teacherContributionLeaderboard, leaderboardSubjectFilter, teacherSearchKeyword]);


  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGroup, setNewClassGroup] = useState<'T' | 'X' | 'K'>('T');
  const [newClassYear, setNewClassYear] = useState('2024-2027');
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
  const [isCreatingUser, setIsCreatingUser] = useState(false);
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
  const [editingClassYear, setEditingClassYear] = useState('2024-2027');

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

  // --- TRẠNG THÁI BỘ LỌC & PHÂN CÔNG GIÁO VIÊN THEO LỚP ---
  const [classFilterGroup, setClassFilterGroup] = useState<'all' | 'T' | 'X' | 'K'>('all');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [assigningClass, setAssigningClass] = useState<any | null>(null);
  const [classAssignmentsDraft, setClassAssignmentsDraft] = useState<{ subjectId: string; teacherId: string }[]>([]);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // --- CÁ NHÂN HÓA ẢNH NỀN LỚP HỌC (CLASS BACKGROUND) ---
  const [backgroundModalClass, setBackgroundModalClass] = useState<any | null>(null);
  const [selectedBgUrl, setSelectedBgUrl] = useState('');
  const [customBgInput, setCustomBgInput] = useState('');
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isSavingBg, setIsSavingBg] = useState(false);
  const [bgMessage, setBgMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const bgFileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  // --- HÀM XỬ LÝ ẢNH NỀN LỚP HỌC ---
  const openBackgroundModal = (cls: any) => {
    const currentBg = getClassBackgroundUrl(cls, auditLogs);
    setBackgroundModalClass(cls);
    setSelectedBgUrl(currentBg);
    setCustomBgInput(currentBg);
    setBgMessage(null);
  };

  const handleUploadBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBgMessage({ type: 'error', text: 'Vui lòng chọn file hình ảnh (JPG, PNG, WebP...)' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setBgMessage({ type: 'error', text: 'Kích thước ảnh tối đa 8MB' });
      return;
    }

    setIsUploadingBg(true);
    setBgMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'fprep_class_backgrounds');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi tải ảnh lên');

      setSelectedBgUrl(data.url);
      setCustomBgInput(data.url);
      setBgMessage({ type: 'success', text: 'Tải ảnh lên thành công! Hãy nhấn "Lưu ảnh nền" để hoàn tất.' });
    } catch (err: any) {
      console.error('Lỗi upload ảnh nền lớp:', err);
      setBgMessage({ type: 'error', text: 'Không thể tải ảnh: ' + err.message });
    } finally {
      setIsUploadingBg(false);
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  const handleSaveClassBackground = async () => {
    if (!backgroundModalClass) return;
    setIsSavingBg(true);
    setBgMessage(null);
    try {
      const finalUrl = selectedBgUrl.trim() || null;
      const res = await fetch('/api/admin/classes/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: backgroundModalClass.id,
          backgroundUrl: finalUrl
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi lưu ảnh nền');

      setClasses(prev => prev.map(c => {
        if (c.id === backgroundModalClass.id) {
          return {
            ...c,
            background_url: finalUrl
          };
        }
        return c;
      }));

      setBgMessage({ type: 'success', text: 'Cập nhật ảnh nền cho lớp thành công!' });
      setTimeout(() => {
        setBackgroundModalClass(null);
      }, 900);
    } catch (err: any) {
      console.error('Lỗi lưu ảnh nền lớp:', err);
      setBgMessage({ type: 'error', text: 'Không thể lưu ảnh nền: ' + err.message });
    } finally {
      setIsSavingBg(false);
    }
  };

  const handleRemoveClassBackground = async () => {
    if (!backgroundModalClass) return;
    if (!confirm(`Xác nhận xóa ảnh nền của Lớp ${backgroundModalClass.name} và trở về giao diện mặc định?`)) return;

    setIsSavingBg(true);
    setBgMessage(null);
    try {
      const res = await fetch('/api/admin/classes/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: backgroundModalClass.id,
          backgroundUrl: null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khi xóa ảnh nền');

      setClasses(prev => prev.map(c => {
        if (c.id === backgroundModalClass.id) {
          return {
            ...c,
            background_url: null
          };
        }
        return c;
      }));
      setSelectedBgUrl('');
      setCustomBgInput('');
      setBgMessage({ type: 'success', text: 'Đã xóa ảnh nền lớp!' });
      setTimeout(() => {
        setBackgroundModalClass(null);
      }, 700);
    } catch (err: any) {
      console.error('Lỗi xóa ảnh nền lớp:', err);
      setBgMessage({ type: 'error', text: 'Không thể xóa ảnh nền: ' + err.message });
    } finally {
      setIsSavingBg(false);
    }
  };

  // Mở modal phân công giáo viên cho lớp học
  const openAssignModal = (cls: any) => {
    setAssigningClass(cls);
    const applicableSubs = subjects.filter(s => {
      if (cls.group_type === 'T') return s.group_type === 'T' || s.group_type === 'ENG';
      if (cls.group_type === 'X') return s.group_type === 'X' || s.group_type === 'ENG';
      return true;
    });
    const currentClassAssignments = localTeacherClasses.filter(tc => tc.class_id === cls.id);
    const drafts = applicableSubs.map(s => {
      const existing = currentClassAssignments.find(tc => tc.subject_id === s.id);
      return {
        subjectId: s.id,
        teacherId: existing?.teacher_id || ''
      };
    });
    setClassAssignmentsDraft(drafts);
  };

  // Lưu thay đổi phân công giáo viên cho lớp học
  const handleSaveClassAssignments = async () => {
    if (!assigningClass) return;
    setIsSavingAssignments(true);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: assigningClass.id,
          assignments: classAssignmentsDraft
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu phân công');

      setLocalTeacherClasses(prev => [
        ...prev.filter(tc => tc.class_id !== assigningClass.id),
        ...(data.data || [])
      ]);
      setAssigningClass(null);
      alert(`Đã cập nhật thành công phân công giáo viên cho lớp ${assigningClass.name}!`);
    } catch (err: any) {
      console.error('Lỗi khi lưu phân công:', err);
      alert('Không thể lưu phân công giáo viên: ' + err.message);
    } finally {
      setIsSavingAssignments(false);
    }
  };

  const startEditUser = (profile: Profile) => {
    const details = localStudentDetails.find((s: any) => s.student_id === profile.id);
    const teacherDisplay = getTeacherDisplayName(profile, auditLogs);
    setEditingUserId(profile.id);
    setEditingUserEmail(profile.email);
    setEditingUserFullName(details?.full_name || teacherDisplay.fullName || '');
    setEditingUserFptName(details?.mshs || teacherDisplay.fptName || '');
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


  const handleCreateUser = async (overrideRole?: 'student' | 'teacher' | 'head_of_department') => {
    const targetRole = overrideRole || newUserRole;
    const email = newUserEmail.trim().toLowerCase();
    let fptName = newUserFptName.trim();
    let fullName = newUserFullName.trim();

    if (!email) {
      alert('Vui lòng nhập email tài khoản.');
      return;
    }
    if (!email.includes('@')) {
      alert('Email không hợp lệ.');
      return;
    }

    if (!fptName && email.includes('@')) {
      fptName = email.split('@')[0].toUpperCase();
    }

    if (!fullName) {
      if (targetRole === 'student') {
        alert('Vui lòng nhập họ và tên học sinh.');
        return;
      } else {
        fullName = fptName || email.split('@')[0];
      }
    }

    if (targetRole === 'student' && !fptName) {
      alert('Vui lòng nhập tên FPT / Mã số học sinh (VD: NamNP12).');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          role: targetRole,
          fullName: fullName,
          fptName: fptName,
          classId: targetRole === 'student' ? newUserClassId : null,
          subjectId: (targetRole === 'teacher' || targetRole === 'head_of_department') ? newUserSubjectId : null,
          classIds: (targetRole === 'teacher' || targetRole === 'head_of_department') ? newUserClassIds : [],
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
      setNewUserClassId('');
      setNewUserRole(targetRole === 'head_of_department' ? 'head_of_department' : targetRole === 'teacher' ? 'teacher' : 'student');
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
    } finally {
      setIsCreatingUser(false);
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
          {/* ==================================================== */}
          {/* 10 THẺ CHỈ SỐ SYSTEM OVERVIEW CHUẨN FUTURE BLUE 2.0 */}
          {/* ==================================================== */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {/* Card 1: Tổng tài khoản */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Tài khoản</span>
                <div className="w-9 h-9 rounded-xl bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 flex items-center justify-center font-bold shrink-0 border border-[#1746D1]/20 group-hover:scale-105 transition-transform">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {profiles.length}
                </h4>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Toàn hệ thống</span>
              </div>
            </div>

            {/* Card 2: Học sinh */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Học sinh THPT</span>
                <div className="w-9 h-9 rounded-xl bg-[#00DFFF]/15 text-[#087CFF] dark:text-cyan-300 flex items-center justify-center font-bold shrink-0 border border-[#00DFFF]/30 group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {profiles.filter(p => p.role === 'student').length}
                </h4>
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold block mt-0.5">Khối 12 FPT School</span>
              </div>
            </div>

            {/* Card 3: Giáo viên & HOD */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Giáo viên & HOD</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {profiles.filter(p => p.role === 'teacher' || p.role === 'head_of_department').length}
                </h4>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Phụ trách bộ môn</span>
              </div>
            </div>

            {/* Card 4: Quản trị viên */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Quản trị viên</span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold shrink-0 border border-purple-500/20 group-hover:scale-105 transition-transform">
                  <Shield className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {profiles.filter(p => p.role === 'admin').length}
                </h4>
                <span className="text-[10px] text-purple-600 font-bold block mt-0.5">Toàn quyền hệ thống</span>
              </div>
            </div>

            {/* Card 5: Lớp học khối 12 */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Lớp học khối 12</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold shrink-0 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {classes.length}
                </h4>
                <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">Ban T / X / K</span>
              </div>
            </div>

            {/* Card 6: Môn học */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Môn học đào tạo</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {subjects.length}
                </h4>
                <span className="text-[10px] text-amber-600 font-bold block mt-0.5">Chương trình GD 2018</span>
              </div>
            </div>

            {/* Card 7: Đề thi khảo thí */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Ngân hàng Đề thi</span>
                <div className="w-9 h-9 rounded-xl bg-[#087CFF]/10 text-[#087CFF] flex items-center justify-center font-bold shrink-0 border border-[#087CFF]/20 group-hover:scale-105 transition-transform">
                  <ClipboardList className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {exams.length}
                </h4>
                <span className="text-[10px] text-[#087CFF] font-bold block mt-0.5">Đề kiểm tra & Luyện thi</span>
              </div>
            </div>

            {/* Card 8: Câu hỏi trắc nghiệm */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Ngân hàng Câu hỏi</span>
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold shrink-0 border border-teal-500/20 group-hover:scale-105 transition-transform">
                  <HelpCircle className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {questions.length}
                </h4>
                <span className="text-[10px] text-teal-600 font-bold block mt-0.5">MCQ / Đúng-Sai / Điền số</span>
              </div>
            </div>

            {/* Card 9: Tổng lượt nộp bài */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Lượt làm bài</span>
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold shrink-0 border border-rose-500/20 group-hover:scale-105 transition-transform">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {examResults.length}
                </h4>
                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">Toàn thời gian</span>
              </div>
            </div>

            {/* Card 10: Đang trực tuyến */}
            <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-md hover:border-[#087CFF] transition-all flex flex-col justify-between gap-3 group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Đang trực tuyến</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h4 className="text-2xl sm:text-3xl font-black font-heading text-[#14213D] dark:text-white m-0 tracking-tight">
                  {activeUsers.length}
                </h4>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">10 phút gần nhất</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PHÂN HỆ THỐNG KÊ HỌC SINH ĐĂNG KÝ 2 MÔN TỰ CHỌN TỐT NGHIỆP & TÌNH HÌNH NHÓM */}
          {/* ========================================================================= */}
          <AdminElectiveStatsSection
            studentDetails={localStudentDetails}
            classes={classes}
            subjects={subjects}
            auditLogs={auditLogs}
            exams={exams}
            examResults={examResults}
            studyLogs={studyLogs}
            studyProgress={studyProgress}
          />

          {/* ========================================================================= */}
          {/* PHÂN HỆ THỐNG KÊ KHẢO THÍ CHUYÊN SÂU THEO MÔN & THỜI GIAN (ADMIN) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1746D1]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#1746D1] dark:text-cyan-300 mb-1">
                  <BarChart3 className="h-3.5 w-3.5" /> Báo cáo Khảo thí & Luyện đề Toàn trường
                </div>
                <h3 className="font-extrabold font-heading text-base sm:text-lg text-[#14213D] dark:text-white tracking-tight m-0 flex items-center gap-2">
                  Thống kê Ngân hàng đề, Câu hỏi & Lượt làm bài theo Môn học
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-300 m-0">
                  Dữ liệu thời gian thực giúp ban giám hiệu và tổ chuyên môn đánh giá học liệu và chất lượng tự học của học sinh.
                </p>
              </div>

              {/* Bộ lọc thời gian & bộ lọc môn */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Bộ lọc thời gian */}
                <div className="flex items-center bg-[#F8FAFC] dark:bg-[#0D226B] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] text-xs font-bold">
                  <button
                    onClick={() => setExamStatsTimeRange('today')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      examStatsTimeRange === 'today'
                        ? 'bg-white dark:bg-[#1746D1] text-[#14213D] dark:text-white shadow-xs font-black'
                        : 'text-[#64748B] dark:text-slate-300 hover:text-[#14213D]'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    onClick={() => setExamStatsTimeRange('week')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      examStatsTimeRange === 'week'
                        ? 'bg-white dark:bg-[#1746D1] text-[#1746D1] dark:text-white shadow-xs font-black'
                        : 'text-[#64748B] dark:text-slate-300 hover:text-[#14213D]'
                    }`}
                  >
                    Trong tuần (7 ngày)
                  </button>
                  <button
                    onClick={() => setExamStatsTimeRange('month')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      examStatsTimeRange === 'month'
                        ? 'bg-white dark:bg-[#1746D1] text-[#14213D] dark:text-white shadow-xs font-black'
                        : 'text-[#64748B] dark:text-slate-300 hover:text-[#14213D]'
                    }`}
                  >
                    Trong tháng (30 ngày)
                  </button>
                  <button
                    onClick={() => setExamStatsTimeRange('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      examStatsTimeRange === 'all'
                        ? 'bg-white dark:bg-[#1746D1] text-[#14213D] dark:text-white shadow-xs font-black'
                        : 'text-[#64748B] dark:text-slate-300 hover:text-[#14213D]'
                    }`}
                  >
                    Tất cả
                  </button>
                </div>

                {/* Chọn môn học cụ thể */}
                <select
                  value={examStatsSubjectFilter}
                  onChange={(e) => setExamStatsSubjectFilter(e.target.value)}
                  className="rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0D226B] px-3 py-1.5 text-xs font-bold text-[#14213D] dark:text-white focus:outline-none"
                >
                  <option value="all">Tất cả môn học ({subjects.length})</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4 Thẻ tổng quan nhanh về Khảo thí */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 dark:bg-orange-950/20">
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">Tổng số đề thi</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-xl sm:text-2xl font-black font-heading text-[#14213D] dark:text-white m-0">{totalStatsSummary.totalExams}</h4>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-300 font-semibold">đề đã tạo</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-950/20">
                <span className="text-[10px] font-bold text-[#087CFF] dark:text-cyan-300 uppercase tracking-wider block">Tổng số câu hỏi</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-xl sm:text-2xl font-black font-heading text-[#14213D] dark:text-cyan-300 m-0">{totalStatsSummary.totalQuestions}</h4>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-300 font-semibold">câu trắc nghiệm</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Lượt làm ({examStatsTimeRange === 'today' ? 'Hôm nay' : examStatsTimeRange === 'week' ? '7 ngày' : examStatsTimeRange === 'month' ? '30 ngày' : 'Toàn thời gian'})
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-xl sm:text-2xl font-black font-heading text-[#14213D] dark:text-emerald-400 m-0">{totalStatsSummary.totalAttemptsInPeriod}</h4>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-300 font-semibold">lượt nộp bài</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 dark:bg-purple-950/20">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block flex items-center gap-1">
                  <Users className="h-3 w-3" /> Học sinh tham gia
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-xl sm:text-2xl font-black font-heading text-[#14213D] dark:text-purple-300 m-0">{totalStatsSummary.totalUniqueStudentsInPeriod}</h4>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-300 font-semibold">học sinh tích cực</span>
                </div>
              </div>
            </div>

            {/* Bảng ma trận thống kê chi tiết theo từng môn học */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-extrabold text-muted-foreground uppercase">
                    <th className="py-3 px-4">Môn học</th>
                    <th className="py-3 px-4 text-center">Số đề thi</th>
                    <th className="py-3 px-4 text-center">Tổng câu hỏi</th>
                    <th className="py-3 px-4 text-center">Phân loại câu hỏi</th>
                    <th className="py-3 px-4 text-center">
                      Lượt làm ({examStatsTimeRange === 'today' ? 'Hôm nay' : examStatsTimeRange === 'week' ? 'Tuần' : examStatsTimeRange === 'month' ? 'Tháng' : 'Tất cả'})
                    </th>
                    <th className="py-3 px-4 text-center">Học sinh làm</th>
                    <th className="py-3 px-4 text-center">Điểm TB</th>
                    <th className="py-3 px-4 text-center">Tổng lượt (All time)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedSubjectStats.map((item: any) => {
                    const theme = getSubjectColorTheme(item.subject.name);
                    return (
                      <tr key={item.subject.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${theme.dotColor || 'bg-primary'}`} />
                            <div>
                              <p className="font-extrabold text-foreground m-0 text-sm">{item.subject.name}</p>
                              {item.subject.code && (
                                <span className="text-[10px] text-muted-foreground font-mono">{item.subject.code}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                            <ClipboardList className="h-3 w-3" /> {item.examCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold">
                            <HelpCircle className="h-3 w-3" /> {item.questionCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                            <span title="Trắc nghiệm 4 lựa chọn (mcq)" className="px-1.5 py-0.5 rounded bg-muted border border-border">
                              4LC: <strong className="text-foreground">{item.mcqCount}</strong>
                            </span>
                            <span title="Đúng/Sai (tf)" className="px-1.5 py-0.5 rounded bg-muted border border-border">
                              Đ/S: <strong className="text-foreground">{item.tfCount}</strong>
                            </span>
                            <span title="Trả lời ngắn (saq)" className="px-1.5 py-0.5 rounded bg-muted border border-border">
                              TLN: <strong className="text-foreground">{item.saqCount}</strong>
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-sm ${
                            item.periodAttempts > 0 
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {item.periodAttempts}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">
                          {item.uniqueStudents} <span className="text-[10px] font-normal text-muted-foreground">hs</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.periodAttempts > 0 ? (
                            <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                              item.avgScore >= 8 
                                ? 'bg-green-500/15 text-green-700 dark:text-green-400' 
                                : item.avgScore >= 5 
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' 
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            }`}>
                              {item.avgScore} / 10
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground font-semibold">
                          {item.totalAttemptsAllTime}
                        </td>
                      </tr>
                    );
                  })}
                  {displayedSubjectStats.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground italic text-xs">
                        Chưa có môn học nào hoặc không tìm thấy dữ liệu phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground pt-1 gap-2">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Dữ liệu được tính toán tự động dựa trên toàn bộ các bài làm thực tế của học sinh trên hệ thống FPREP.
              </span>
              <span>
                Chú thích: <strong>4LC</strong> (Trắc nghiệm 4 lựa chọn), <strong>Đ/S</strong> (Đúng/Sai), <strong>TLN</strong> (Trả lời ngắn).
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PHÂN HỆ VINH DANH GIÁO VIÊN XUẤT SẮC & ĐÓNG GÓP NGÂN HÀNG ĐỀ THI (ADMIN) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            
            {/* Header Phân Hệ */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-0.5 text-[11px] font-black text-amber-600 dark:text-amber-400 mb-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Bảng Vinh Danh Khảo Thí & Sư Phạm Xuất Sắc
                </div>
                <h3 className="font-extrabold font-heading text-base sm:text-xl text-[#14213D] dark:text-white tracking-tight m-0 flex items-center gap-2">
                  Tổng Hợp Số Lượng Đề Thi Giáo Viên Upload & Vinh Danh Giáo Viên Xuất Sắc
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-300 m-0 mt-0.5">
                  Hệ thống tự động thống kê số đề thi, câu hỏi từng Thầy/Cô đã biên soạn và đóng góp vào Ngân hàng đề thi để Quản trị viên theo dõi và khen thưởng.
                </p>
              </div>

              {/* Bộ lọc & Tìm kiếm Giáo viên */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Tìm tên Thầy/Cô hoặc email..."
                    value={teacherSearchKeyword}
                    onChange={(e) => setTeacherSearchKeyword(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0D226B] text-xs font-semibold text-[#14213D] dark:text-white focus:outline-none focus:border-[#087CFF]"
                  />
                  <Search className="h-3.5 w-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
                </div>

                <select
                  value={leaderboardSubjectFilter}
                  onChange={(e) => setLeaderboardSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0D226B] text-xs font-bold text-[#14213D] dark:text-white focus:outline-none"
                >
                  <option value="all">Tất cả môn học</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chỉ Số Nhanh Về Đóng Góp Của Giáo Viên */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0D226B]/50 border border-[#E2E8F0] dark:border-[#1B317A] flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-[#1746D1] dark:text-blue-400 border border-blue-200 dark:border-blue-500/25">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">GV đã upload đề</span>
                  <div className="text-base sm:text-lg font-black font-heading text-[#14213D] dark:text-white">
                    {teachersWithUploadsCount} <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">/ {teacherContributionLeaderboard.length} GV</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0D226B]/50 border border-[#E2E8F0] dark:border-[#1B317A] flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-50 dark:bg-cyan-500/15 text-[#087CFF] dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/25">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Đề đã định danh GV</span>
                  <div className="text-base sm:text-lg font-black font-heading text-[#14213D] dark:text-cyan-400">
                    {attributedExamsCount} <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">/ {exams.length} đề</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] dark:bg-[#0D226B]/50 border border-[#E2E8F0] dark:border-[#1B317A] flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Câu hỏi GV upload</span>
                  <div className="text-base sm:text-lg font-black font-heading text-emerald-700 dark:text-emerald-400">
                    {attributedQuestionsCount} <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">/ {questions.length} câu</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 via-white to-white dark:from-amber-500/15 dark:via-[#0D226B]/50 dark:to-[#0D226B]/50 border border-amber-300 dark:border-amber-500/40 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-400/40">
                  <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Top 1 Đóng góp</span>
                  <div className="text-sm font-black font-heading text-[#14213D] dark:text-amber-300 truncate" title={topContributor?.displayName || 'Chưa có dữ liệu upload'}>
                    {topContributor ? `${topContributor.displayName} (${topContributor.totalExams} đề)` : 'Chưa có dữ liệu'}
                  </div>
                </div>
              </div>
            </div>

            {/* Thông báo & Công cụ gán giáo viên upload cho các đề thi cũ chưa có thông tin tác giả */}
            {unattributedExams.length > 0 && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/25 p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 text-xs">
                    <Info className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-[#14213D] dark:text-amber-100">
                      <strong className="font-extrabold">Có {unattributedExams.length} đề thi cũ chưa có thông tin giáo viên upload</strong>
                      <span className="text-[#475569] dark:text-amber-200/80 block sm:inline sm:ml-1">
                        (Hệ thống chỉ tính đúng đề do từng Thầy/Cô upload, không tự cộng gộp đề chung của bộ môn).
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUnattributedPanel(prev => !prev)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0B1B55] hover:bg-[#1746D1] text-white text-xs font-bold shrink-0 self-start sm:self-auto transition-colors cursor-pointer"
                  >
                    {showUnattributedPanel ? 'Ẩn danh sách' : `Gán giáo viên upload (${unattributedExams.length} đề)`}
                  </button>
                </div>

                {showUnattributedPanel && (
                  <div className="space-y-2 max-h-72 overflow-y-auto pt-2 border-t border-amber-200 dark:border-amber-500/30">
                    {unattributedExams.map((ex: any) => {
                      const subObj = subjects.find((s: any) => s.id === ex.subject_id);
                      const matchingTeachers = teacherContributionLeaderboard.filter(t => t.teachingSubjectIds.includes(ex.subject_id));
                      const otherTeachers = teacherContributionLeaderboard.filter(t => !t.teachingSubjectIds.includes(ex.subject_id));
                      const draftVal = authorDrafts[ex.id] || '';
                      const isSaving = savingAuthorExamId === ex.id;

                      return (
                        <div
                          key={ex.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#0B1B55] border border-[#E2E8F0] dark:border-[#1B317A]"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-extrabold text-[#14213D] dark:text-white block truncate" title={ex.title}>
                              {ex.title}
                            </span>
                            <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold">
                              Môn: <strong className="text-[#1746D1] dark:text-cyan-300">{subObj?.name || 'Chưa rõ'}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={draftVal}
                              onChange={(e) => setAuthorDrafts(prev => ({ ...prev, [ex.id]: e.target.value }))}
                              className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D2063] text-xs font-semibold text-[#14213D] dark:text-white max-w-[220px]"
                            >
                              <option value="">-- Chọn giáo viên upload --</option>
                              {matchingTeachers.length > 0 && (
                                <optgroup label={`Giáo viên môn ${subObj?.name || ''}`}>
                                  {matchingTeachers.map(t => (
                                    <option key={t.teacher.id} value={t.teacher.id}>
                                      {t.displayName} ({t.teacher.email})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {otherTeachers.length > 0 && (
                                <optgroup label="Giáo viên khác">
                                  {otherTeachers.map(t => (
                                    <option key={t.teacher.id} value={t.teacher.id}>
                                      {t.displayName} ({t.teacher.email})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            <button
                              type="button"
                              disabled={!draftVal || isSaving}
                              onClick={() => handleAssignExamAuthor(ex.id, draftVal, ex.title)}
                              className="px-3 py-1.5 rounded-lg bg-[#1746D1] hover:bg-[#087CFF] disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              Lưu
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bảng Xếp Hạng & Danh Hiệu Giáo Viên Xuất Sắc - ĐỘ TƯƠNG PHẢN CAO CHUẨN FUTURE BLUE 2.0 */}
            <div className="overflow-x-auto rounded-2xl border border-[#CBD5E1] dark:border-[#1B317A] shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0B1B55] text-white font-extrabold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 text-center w-16">Hạng</th>
                    <th className="p-3.5">Giáo viên</th>
                    <th className="p-3.5">Môn học phụ trách</th>
                    <th className="p-3.5 text-center">Tổng Đề Upload</th>
                    <th className="p-3.5 text-center hidden md:table-cell">Phân loại đề</th>
                    <th className="p-3.5 text-center">Tổng Câu Hỏi</th>
                    <th className="p-3.5 text-center hidden lg:table-cell">Lượt học sinh thi</th>
                    <th className="p-3.5 text-center">Danh hiệu Vinh danh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1B317A] bg-white dark:bg-[#0B1B55]/80">
                  {filteredTeacherLeaderboard.map((item, idx) => {
                    const isTop1 = idx === 0 && item.totalExams > 0;
                    const isTop2 = idx === 1 && item.totalExams > 0;
                    const isTop3 = idx === 2 && item.totalExams > 0;

                    let rankBadge = (
                      <span className="font-extrabold text-[#475569] dark:text-slate-300 text-xs">#{idx + 1}</span>
                    );
                    let awardTitle = item.totalExams > 0 ? 'Giáo viên Tích cực' : 'Chưa upload đề';
                    let awardBadgeClass = item.totalExams > 0
                      ? 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-400/40 font-extrabold'
                      : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border-slate-200 dark:border-slate-700 font-semibold';

                    if (isTop1) {
                      rankBadge = (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 border border-amber-600 text-[#0B1B55] font-black text-xs shadow-sm">
                          1
                        </span>
                      );
                      awardTitle = 'Nhà giáo Xuất sắc & Chuyên gia Khảo thí Kim Cương';
                      awardBadgeClass = 'bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0B1B55] border-amber-500 shadow-sm font-black';
                    } else if (isTop2) {
                      rankBadge = (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-500 dark:to-slate-600 border border-slate-400 text-[#0F172A] dark:text-white font-black text-xs shadow-sm">
                          2
                        </span>
                      );
                      awardTitle = 'Nhà giáo Tiêu biểu & Chuyên gia Khảo thí Vàng';
                      awardBadgeClass = 'bg-gradient-to-r from-[#0B1B55] to-[#1746D1] text-white border-[#1746D1] shadow-sm font-extrabold';
                    } else if (isTop3) {
                      rankBadge = (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 border border-orange-600 text-white font-black text-xs shadow-sm">
                          3
                        </span>
                      );
                      awardTitle = 'Nhà giáo Tích cực & Chuyên gia Khảo thí Bạc';
                      awardBadgeClass = 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-600 shadow-sm font-extrabold';
                    } else if (item.totalExams >= 5) {
                      awardTitle = 'Đại sứ Đóng góp Đề thi FPREP';
                      awardBadgeClass = 'bg-blue-100 dark:bg-blue-500/25 text-[#0B1B55] dark:text-cyan-200 border-blue-300 dark:border-blue-400/40 font-extrabold';
                    }

                    return (
                      <tr 
                        key={item.teacher.id} 
                        className={`hover:bg-blue-50/60 dark:hover:bg-[#15276B]/50 transition-colors ${isTop1 ? 'bg-amber-50/70 dark:bg-amber-500/10' : ''}`}
                      >
                        {/* Thứ hạng */}
                        <td className="p-3.5 text-center align-middle">
                          {rankBadge}
                        </td>

                        {/* Thông tin giáo viên */}
                        <td className="p-3.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                              isTop1
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm'
                                : 'bg-blue-100 dark:bg-blue-500/20 text-[#1746D1] dark:text-blue-200 border border-blue-200 dark:border-blue-400/30'
                            }`}>
                              {item.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-[#14213D] dark:text-white block text-xs">
                                {item.displayName}
                              </span>
                              <span className="text-[11px] text-[#475569] dark:text-slate-300 font-medium block truncate max-w-[190px]">
                                {item.teacher.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Môn học phụ trách */}
                        <td className="p-3.5 align-middle">
                          <div className="flex flex-wrap gap-1">
                            {item.subjects.length > 0 ? (
                              item.subjects.map((s: any) => (
                                <span key={s.id} className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 dark:bg-blue-500/20 text-[#1746D1] dark:text-blue-200 border border-blue-200 dark:border-blue-400/30">
                                  {s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#64748B] dark:text-slate-400 italic text-[11px]">Chưa gán môn</span>
                            )}
                          </div>
                        </td>

                        {/* Tổng Đề Upload */}
                        <td className="p-3.5 text-center align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${
                            item.totalExams > 0
                              ? 'bg-blue-50 dark:bg-blue-500/20 text-[#0B1B55] dark:text-[#00DFFF] border-blue-300 dark:border-blue-400/40 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-400 border-slate-200 dark:border-slate-700 font-bold'
                          }`}>
                            <ClipboardList className="h-3.5 w-3.5 text-[#1746D1] dark:text-[#00DFFF]" />
                            <strong>{item.totalExams}</strong> đề
                          </span>
                        </td>

                        {/* Phân loại đề */}
                        <td className="p-3.5 text-center align-middle hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold">
                            <span className="bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 rounded-md whitespace-nowrap" title="Đề chủ đề">
                              CĐ: {item.topicCount}
                            </span>
                            <span className="bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-500/40 px-2 py-0.5 rounded-md whitespace-nowrap" title="Kiểm tra">
                              KT: {item.testCount}
                            </span>
                            <span className="bg-purple-50 dark:bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-500/40 px-2 py-0.5 rounded-md whitespace-nowrap" title="THPTQG">
                              THPT: {item.thptqgCount}
                            </span>
                            {(item.vsatCount > 0 || item.dgnlCount > 0) && (
                              <span className="bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 px-2 py-0.5 rounded-md whitespace-nowrap" title="VSAT / ĐGNL">
                                ĐG: {item.vsatCount + item.dgnlCount}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Tổng Câu Hỏi */}
                        <td className="p-3.5 text-center align-middle whitespace-nowrap">
                          <span className="text-emerald-700 dark:text-emerald-300 font-black">{item.totalQuestions}</span>{' '}
                          <span className="text-[#475569] dark:text-slate-300 font-semibold">câu</span>
                        </td>

                        {/* Lượt học sinh thi */}
                        <td className="p-3.5 text-center align-middle whitespace-nowrap hidden lg:table-cell">
                          <span className="font-extrabold text-[#14213D] dark:text-white">{item.totalStudentAttempts}</span>{' '}
                          <span className="text-[#64748B] dark:text-slate-400 font-semibold">lượt</span>
                        </td>

                        {/* Danh hiệu Vinh danh */}
                        <td className="p-3.5 text-center align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] border ${awardBadgeClass}`}>
                            <Award className="h-3.5 w-3.5 shrink-0" />
                            <span>{awardTitle}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTeacherLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground italic text-xs">
                        Không tìm thấy giáo viên nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          <div className="grid gap-6 md:grid-cols-12 items-start">
            {/* Cột Trái: Bảo trì hệ thống & Khởi tạo lớp */}
            <div className="md:col-span-6 space-y-4">

              {/* KHỞI TẠO LỚP HỌC MỚI (Admin) */}
              <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold font-heading text-sm border-b border-[#E2E8F0] dark:border-[#1B317A] pb-2 flex items-center gap-1.5 text-[#14213D] dark:text-white">
                  <Users className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Khởi tạo lớp học mới
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên lớp học</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 12T8, 12X5, 12K2..."
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] px-3 py-2 focus:outline-none font-bold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Ban đào tạo</label>
                      <select
                        value={newClassGroup}
                        onChange={(e) => setNewClassGroup(e.target.value as any)}
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] px-2.5 py-2 focus:outline-none font-bold text-[#1746D1] dark:text-cyan-400"
                      >
                        <option value="T">Ban Tự nhiên (T)</option>
                        <option value="X">Ban Xã hội (X)</option>
                        <option value="K">Ban Khai phóng (K)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Niên khóa</label>
                      <input
                        type="text"
                        placeholder="2026-2027"
                        value={newClassYear}
                        onChange={(e) => setNewClassYear(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B] px-3 py-2 focus:outline-none text-[#14213D] dark:text-white font-semibold"
                      />
                    </div>
                  </div>

                  {createClassMessage && (
                    <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-2.5 text-[11px] font-bold text-[#1746D1] dark:text-cyan-300">
                      <Info className="h-3.5 w-3.5" />
                      <span>{createClassMessage}</span>
                    </div>
                  )}

                  <button
                    onClick={handleCreateClass}
                    disabled={creatingClass}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white font-black text-xs hover:shadow-md transition-all text-center uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {creatingClass ? 'Đang khởi tạo...' : 'Khởi tạo lớp học'}
                  </button>
                </div>
              </div>

              {/* DANH SÁCH LỚP HỌC & CRUD */}
              <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold font-heading text-sm border-b border-[#E2E8F0] dark:border-[#1B317A] pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#14213D] dark:text-white">
                    <Users className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Quản lý danh sách lớp học ({classes.length})
                  </span>
                </h3>

                {editingClassId ? (
                  /* Form sửa lớp */
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3 text-xs">
                    <p className="font-bold text-[#1746D1] dark:text-cyan-400">Đang chỉnh sửa lớp học</p>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên lớp</label>
                      <input
                        type="text"
                        value={editingClassName}
                        onChange={(e) => setEditingClassName(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0D226B] px-3 py-1.5 text-xs font-bold focus:outline-none"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Ban</label>
                        <select
                          value={editingClassGroup}
                          onChange={(e) => setEditingClassGroup(e.target.value as any)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0D226B] px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        >
                          <option value="T">Tự nhiên (T)</option>
                          <option value="X">Xã hội (X)</option>
                          <option value="K">Khai phóng (K)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Niên khóa</label>
                        <input
                          type="text"
                          value={editingClassYear}
                          onChange={(e) => setEditingClassYear(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0D226B] px-3 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingClassId(null)}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#1B317A] font-bold text-[#64748B] hover:bg-white cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateClass}
                        className="px-3 py-1.5 rounded-lg bg-[#1746D1] text-white font-bold cursor-pointer"
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {loadingClasses ? (
                    <p className="text-xs text-[#64748B] italic text-center py-4">Đang tải danh sách lớp...</p>
                  ) : classes.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 text-xs">
                      <div>
                        <p className="font-extrabold text-[#14213D] dark:text-white">{cls.name}</p>
                        <p className="text-[10px] text-[#64748B] dark:text-slate-400">
                          Ban: <span className="font-bold text-[#1746D1] dark:text-cyan-400">{cls.group_type === 'T' ? 'Tự nhiên' : cls.group_type === 'X' ? 'Xã hội' : 'Khai phóng'}</span>
                          {' | '} Niên khóa: <span className="font-semibold">{cls.academic_year}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => startEditClass(cls)}
                          className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0B1B55] hover:bg-[#F1F5F9] font-bold text-[#1746D1] dark:text-cyan-400 transition-all text-[11px] cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-[#0B1B55] hover:bg-red-50 font-bold text-red-500 transition-all text-[11px] cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                  {classes.length === 0 && !loadingClasses && (
                    <p className="text-xs text-[#64748B] italic text-center py-4">Chưa có lớp học nào được khởi tạo.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Cột Phải: Học viên đang học & Hoạt động bảo mật */}
            <div className="md:col-span-6 space-y-6">
              
              {/* THÀNH VIÊN ĐANG TỰ HỌC */}
              <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold font-heading text-sm border-b border-[#E2E8F0] dark:border-[#1B317A] pb-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" /> Thành viên đang tự học ({activeUsers.length})
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {activeUsers.map((user) => (
                    <div key={user.studentId} className="flex gap-3 items-start border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3 last:border-b-0 last:pb-0 text-xs">
                      <div className="h-7 w-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shrink-0 mt-0.5">
                        <Activity className="h-3.5 w-3.5 animate-pulse" />
                      </div>
                      <div className="min-w-0 space-y-1 font-semibold">
                        <p className="text-[#14213D] dark:text-white">{user.studentName} <span className="text-[10px] text-[#64748B] dark:text-slate-400">({user.mshs})</span></p>
                        <p className="text-[10px] text-[#64748B] dark:text-slate-400">
                          {user.actionType}: <strong className="text-[#1746D1] dark:text-cyan-400">{user.lessonTitle}</strong>
                        </p>
                        <span className="block text-[8px] text-[#64748B] dark:text-slate-500">
                          Lúc: {user.lastActivityTime}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activeUsers.length === 0 && (
                    <p className="text-xs text-[#64748B] italic text-center py-6">Hiện không có học sinh nào đang hoạt động tự học.</p>
                  )}
                </div>
              </div>

              {/* Lịch sử thao tác bảo mật gần đây */}
              <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold font-heading text-sm border-b border-[#E2E8F0] dark:border-[#1B317A] pb-2 flex items-center gap-1.5 text-[#14213D] dark:text-white">
                  <Activity className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Lịch sử thao tác bảo mật gần đây
                </h3>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex gap-3 items-start border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3 last:border-b-0 last:pb-0 text-xs">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#1746D1] dark:text-cyan-400 shrink-0 mt-0.5 font-bold">
                        A
                      </div>
                      <div className="min-w-0 space-y-1 font-semibold">
                        <p className="text-[#14213D] dark:text-white truncate">{log.actor?.email || 'Hệ thống'}</p>
                        <p className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">
                          Hành động: <strong className="text-[#1746D1] dark:text-cyan-400 font-mono">{log.action}</strong> trên bảng <strong className="font-mono">{log.target_table}</strong>
                        </p>
                        <span className="text-[9px] text-[#64748B] dark:text-slate-500">
                          {safeDateTimeFormat(log.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-[#64748B] italic text-center py-6">Chưa có nhật ký hoạt động bảo mật.</p>
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
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* THANH ĐIỀU HƯỚNG 3 MỤC QUẢN LÝ DÀNH RIÊNG CHO ADMIN */}
          <div className="flex flex-wrap gap-2 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
            <button
              onClick={() => { setAdminSubTab('classes'); setEditingUserId(null); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                adminSubTab === 'classes' 
                  ? 'bg-[#1746D1] text-white border-transparent shadow-md font-extrabold' 
                  : 'bg-white dark:bg-[#0B1B55]/80 border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-slate-300 hover:bg-[#F8FAFC]'
              }`}
            >
              <Building2 className="h-4 w-4" /> 1. Quản lý Lớp học & Phân công môn
            </button>
            <button
              onClick={() => { setAdminSubTab('teachers'); setEditingUserId(null); setNewUserRole('teacher'); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                adminSubTab === 'teachers' 
                  ? 'bg-[#1746D1] text-white border-transparent shadow-md font-extrabold' 
                  : 'bg-white dark:bg-[#0B1B55]/80 border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-slate-300 hover:bg-[#F8FAFC]'
              }`}
            >
              <Users className="h-4 w-4" /> 2. Quản lý Giáo viên & HOD
            </button>
            <button
              onClick={() => { setAdminSubTab('students'); setEditingUserId(null); setNewUserRole('student'); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                adminSubTab === 'students' 
                  ? 'bg-[#1746D1] text-white border-transparent shadow-md font-extrabold' 
                  : 'bg-white dark:bg-[#0B1B55]/80 border-[#E2E8F0] dark:border-[#1B317A] text-[#14213D] dark:text-slate-300 hover:bg-[#F8FAFC]'
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
              <div className="md:col-span-8 bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl overflow-hidden shadow-sm space-y-0">
                <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm flex items-center gap-2 m-0 text-[#14213D] dark:text-white">
                      <Building2 className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Danh sách Lớp học Khối 12 ({classes.length} lớp)
                    </h3>
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold mt-0.5 m-0">Sắp xếp chuẩn Ban đào tạo & Phân công giáo viên bộ môn</p>
                  </div>

                  {/* THANH THAO TÁC HÀNG LOẠT LỚP HỌC */}
                  {selectedClassIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">Đã chọn: {selectedClassIds.length} lớp</span>
                      <button
                        onClick={() => handleOpenBatchModal({
                          title: `Xóa ${selectedClassIds.length} Lớp học đã chọn`,
                          description: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedClassIds.length} lớp học này khỏi cơ sở dữ liệu? Tất cả học sinh thuộc các lớp này sẽ tự động chuyển về trạng thái chưa xếp lớp.`,
                          count: selectedClassIds.length,
                          actionType: 'delete_selected_classes',
                          payload: { classIds: selectedClassIds },
                          requiresTextConfirm: false
                        })}
                        className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Xóa lớp đã chọn
                      </button>
                      <button
                        onClick={() => setSelectedClassIds([])}
                        className="text-xs font-semibold text-[#64748B] dark:text-slate-400 hover:text-[#14213D] dark:hover:text-white px-1.5 py-0.5"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>

                {/* THANH BỘ LỌC BAN & TÌM KIẾM LỚP HỌC */}
                <div className="p-3.5 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#0B1B55]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase shrink-0 mr-1">Ban:</span>
                    <button
                      onClick={() => setClassFilterGroup('all')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        classFilterGroup === 'all'
                          ? 'bg-[#1746D1] text-white shadow-xs'
                          : 'bg-[#F1F5F9] dark:bg-[#0D226B]/40 text-[#64748B] dark:text-slate-300 hover:bg-[#E2E8F0]'
                      }`}
                    >
                      Tất cả ({classes.length})
                    </button>
                    <button
                      onClick={() => setClassFilterGroup('T')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        classFilterGroup === 'T'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                      }`}
                    >
                      Ban Tự nhiên (T) ({classes.filter(c => c.group_type === 'T').length})
                    </button>
                    <button
                      onClick={() => setClassFilterGroup('X')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        classFilterGroup === 'X'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      Ban Xã hội (X) ({classes.filter(c => c.group_type === 'X').length})
                    </button>
                    <button
                      onClick={() => setClassFilterGroup('K')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        classFilterGroup === 'K'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
                      }`}
                    >
                      Khai phóng (K) ({classes.filter(c => c.group_type === 'K').length})
                    </button>
                  </div>

                  <div className="relative sm:w-52">
                    <input
                      type="text"
                      placeholder="Tìm theo tên lớp..."
                      value={classSearchTerm}
                      onChange={(e) => setClassSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#087CFF] text-[#14213D] dark:text-white"
                    />
                  </div>
                </div>

                {editingClassId && (
                  <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F0F7FF] dark:bg-[#1746D1]/10 space-y-3">
                    <h4 className="font-bold text-xs text-[#1746D1] dark:text-cyan-400 m-0">Chỉnh sửa Lớp học</h4>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên lớp</label>
                        <input
                          type="text"
                          value={editingClassName}
                          onChange={(e) => setEditingClassName(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-1.5 font-bold focus:outline-none text-[#14213D] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Ban</label>
                        <select
                          value={editingClassGroup}
                          onChange={(e) => setEditingClassGroup(e.target.value as any)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-2.5 py-1.5 font-bold text-[#1746D1] dark:text-cyan-400 focus:outline-none"
                        >
                          <option value="T">Tự nhiên (T)</option>
                          <option value="X">Xã hội (X)</option>
                          <option value="K">Khai phóng (K)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Niên khóa</label>
                        <input
                          type="text"
                          value={editingClassYear}
                          onChange={(e) => setEditingClassYear(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-1.5 font-semibold focus:outline-none text-[#14213D] dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingClassId(null)}
                        className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] font-bold text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-[#0B1B55] text-xs transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateClass}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white font-bold text-xs hover:shadow-md transition-all"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                )}

                {/* MODAL PHÂN CÔNG GIÁO VIÊN BỘ MÔN CHO LỚP */}
                {assigningClass && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#0B1B55] border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3">
                        <div>
                          <h3 className="font-extrabold text-base text-[#14213D] dark:text-white flex items-center gap-2 m-0">
                            <BookOpen className="h-5 w-5 text-[#1746D1] dark:text-cyan-400" />
                            Phân công Giáo viên - Lớp {assigningClass.name}
                          </h3>
                          <p className="text-xs text-[#64748B] dark:text-slate-400 font-semibold mt-0.5 m-0">
                            Ban {assigningClass.group_type === 'T' ? 'Tự nhiên (T)' : assigningClass.group_type === 'X' ? 'Xã hội (X)' : 'Khai phóng (K)'} &bull; Niên khóa {assigningClass.academic_year}
                          </p>
                        </div>
                        <button
                          onClick={() => setAssigningClass(null)}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#14213D] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#0D226B] transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                        <p className="text-xs text-[#64748B] dark:text-slate-300 font-medium m-0">
                          Chọn giáo viên phụ trách từng môn học cho lớp <strong>{assigningClass.name}</strong>. Các thay đổi sẽ được cập nhật trực tiếp vào cơ sở dữ liệu:
                        </p>

                        <div className="space-y-2.5">
                          {classAssignmentsDraft.map((draft, idx) => {
                            const sub = subjects.find(s => s.id === draft.subjectId);
                            const theme = getSubjectColorTheme(sub?.name || '');
                            const teacherList = profiles.filter(p => p.role === 'teacher' || p.role === 'head_of_department');

                            return (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0D226B]/40 border border-[#E2E8F0] dark:border-[#1B317A]">
                                <div className="flex items-center gap-2 min-w-[140px]">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                                    <span className={`h-2 w-2 rounded-full ${theme.dotColor}`} />
                                    {sub?.name || 'Môn học'}
                                  </span>
                                </div>

                                <div className="flex-1 sm:max-w-xs">
                                  <select
                                    value={draft.teacherId}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setClassAssignmentsDraft(prev => prev.map((item, i) => i === idx ? { ...item, teacherId: val } : item));
                                    }}
                                    className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#087CFF] text-[#14213D] dark:text-white"
                                  >
                                    <option value="">-- Chưa phân công --</option>
                                    {teacherList.map(t => {
                                      const tDisplay = getTeacherDisplayName(t, auditLogs);
                                      return (
                                        <option key={t.id} value={t.id}>
                                          {tDisplay.fullName} ({t.email.split('@')[0]})
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1B317A]">
                        <button
                          onClick={() => setAssigningClass(null)}
                          className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] text-xs font-bold text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B] transition-colors"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          onClick={handleSaveClassAssignments}
                          disabled={isSavingAssignments}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white text-xs font-bold hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSavingAssignments && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {isSavingAssignments ? 'Đang lưu...' : 'Lưu phân công'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/50 text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
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
                            className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-4 w-4 cursor-pointer"
                          />
                        </th>
                        <th className="p-4">Tên Lớp học</th>
                        <th className="p-4">Ảnh nền riêng</th>
                        <th className="p-4">Ban đào tạo</th>
                        <th className="p-4">Niên khóa</th>
                        <th className="p-4">Sĩ số</th>
                        <th className="p-4">Phân công Giáo viên bộ môn</th>
                        <th className="p-4 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const sorted = sortClassesNaturally(classes).filter(cls => {
                          if (classFilterGroup !== 'all' && cls.group_type !== classFilterGroup) return false;
                          if (classSearchTerm.trim() && !cls.name.toLowerCase().includes(classSearchTerm.toLowerCase())) return false;
                          return true;
                        });

                        if (sorted.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-xs text-[#64748B] dark:text-slate-400 italic">
                                Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại.
                              </td>
                            </tr>
                          );
                        }

                        return sorted.map(cls => {
                          const classStudentsCount = localStudentDetails.filter(s => s.class_id === cls.id).length;
                          const classAssignments = localTeacherClasses.filter(tc => tc.class_id === cls.id);
                          const isSelected = selectedClassIds.includes(cls.id);
                          const classBg = getClassBackgroundUrl(cls, auditLogs);

                          return (
                            <tr key={cls.id} className={`border-b border-[#E2E8F0] dark:border-[#1B317A] hover:bg-[#F1F5F9]/60 dark:hover:bg-[#0D226B]/30 transition-colors ${isSelected ? 'bg-[#1746D1]/5' : ''}`}>
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
                                  className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-4 w-4 cursor-pointer"
                                />
                              </td>
                              <td className="p-4 font-black text-sm text-[#14213D] dark:text-white">{cls.name}</td>
                              <td className="p-4">
                                {classBg ? (
                                  <div 
                                    onClick={() => openBackgroundModal(cls)}
                                    className="group relative h-10 w-20 rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-[#1B317A] cursor-pointer shadow-2xs hover:ring-2 hover:ring-[#087CFF] hover:border-transparent transition-all"
                                    title="Bấm để xem & đổi ảnh nền lớp"
                                  >
                                    <img src={classBg} alt={cls.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black">
                                      Đổi ảnh
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openBackgroundModal(cls)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-dashed border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/20 hover:bg-[#EEF4FF] dark:hover:bg-[#0D226B]/50 font-bold text-[10px] text-[#64748B] dark:text-slate-400 hover:text-[#1746D1] dark:hover:text-cyan-400 hover:border-[#1746D1]/50 transition-all cursor-pointer"
                                    title="Tải ảnh nền cho lớp này"
                                  >
                                    <UploadCloud className="h-3.5 w-3.5 text-[#1746D1] dark:text-cyan-400" />
                                    <span>Tải ảnh</span>
                                  </button>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                  cls.group_type === 'T' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                                  cls.group_type === 'X' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                }`}>
                                  {cls.group_type === 'T' ? 'Tự nhiên' : cls.group_type === 'X' ? 'Xã hội' : 'Khai phóng'}
                                </span>
                              </td>
                              <td className="p-4 font-semibold text-[#64748B] dark:text-slate-400">{cls.academic_year}</td>
                              <td className="p-4 font-bold text-[#14213D] dark:text-white">{classStudentsCount} học sinh</td>
                              <td className="p-4">
                                {classAssignments.length === 0 ? (
                                  <span className="text-[10px] text-[#64748B] dark:text-slate-400 italic bg-[#F1F5F9] dark:bg-[#0D226B]/30 px-2 py-1 rounded">Chưa phân công giáo viên</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 max-w-sm">
                                    {classAssignments.map((ca: any, caIdx: number) => {
                                      const sub = subjects.find(s => s.id === ca.subject_id);
                                      const prof = profiles.find(p => p.id === ca.teacher_id);
                                      const tDisplay = getTeacherDisplayName(prof, auditLogs);
                                      const theme = getSubjectColorTheme(sub?.name || '');
                                      return (
                                        <span 
                                          key={caIdx} 
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                                          title={`${sub?.name || 'Môn'}: ${tDisplay.fullName} (${prof?.email || ''})`}
                                        >
                                          <span className={`h-1.5 w-1.5 rounded-full ${theme.dotColor}`} />
                                          <span>{sub?.name || 'Môn'}:</span>
                                          <span className="font-extrabold">{tDisplay.fptName || tDisplay.fullName.split(' ').slice(-1)[0]}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => openBackgroundModal(cls)}
                                    className="px-2.5 py-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 font-bold text-indigo-600 dark:text-indigo-400 transition-all text-[10px] flex items-center gap-1 cursor-pointer"
                                    title="Cá nhân hóa ảnh nền của riêng lớp này"
                                  >
                                    <ImageIcon className="h-3 w-3" /> Ảnh nền
                                  </button>
                                  <button
                                    onClick={() => openAssignModal(cls)}
                                    className="px-2.5 py-1 rounded-lg border border-[#1746D1]/30 bg-[#1746D1]/10 hover:bg-[#1746D1]/20 font-bold text-[#1746D1] dark:text-cyan-400 transition-all text-[10px] flex items-center gap-1 cursor-pointer"
                                    title="Phân công giáo viên bộ môn cho lớp này"
                                  >
                                    <BookOpen className="h-3 w-3" /> Phân công
                                  </button>
                                  <button
                                    onClick={() => startEditClass(cls)}
                                    className="px-2 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B] font-bold text-[#14213D] dark:text-white transition-all text-[10px] cursor-pointer"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClass(cls.id)}
                                    className="px-2 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 font-bold text-red-600 dark:text-red-400 transition-all text-[10px] cursor-pointer"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>


              {/* TẠO LỚP HỌC MỚI */}
              <div className="md:col-span-4 bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3 flex items-center gap-2 text-[#14213D] dark:text-white m-0">
                  <Plus className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Khởi tạo Lớp học mới
                </h4>
                
                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên lớp học</label>
                    <input
                      type="text"
                      placeholder="VD: 12T7, 12X5, 12K2..."
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-bold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Ban đào tạo</label>
                    <select
                      value={newClassGroup}
                      onChange={(e) => setNewClassGroup(e.target.value as any)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-2.5 py-2 focus:outline-none focus:border-[#087CFF] font-bold text-[#1746D1] dark:text-cyan-400"
                    >
                      <option value="T">Ban Tự nhiên (T)</option>
                      <option value="X">Ban Xã hội (X)</option>
                      <option value="K">Ban Khai phóng (K)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Niên khóa</label>
                    <input
                      type="text"
                      placeholder="2026-2027"
                      value={newClassYear}
                      onChange={(e) => setNewClassYear(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] text-[#14213D] dark:text-white font-semibold"
                    />
                  </div>

                  {createClassMessage && (
                    <p className="text-[11px] font-bold text-green-600 bg-green-500/10 p-2.5 rounded-xl border border-green-500/20">{createClassMessage}</p>
                  )}

                  <button
                    onClick={handleCreateClass}
                    disabled={creatingClass}
                    className="w-full text-center flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] py-2.5 text-xs font-bold text-white hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
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
              <div className="md:col-span-8 bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm flex items-center gap-2 m-0 text-[#14213D] dark:text-white">
                        <Users className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Danh sách Giáo viên & Trưởng bộ môn ({profiles.filter(p => p.role === 'teacher' || p.role === 'head_of_department').length})
                      </h3>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold mt-0.5 m-0">Phân công môn học và các lớp giảng dạy phụ trách</p>
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
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <UserX className="h-3.5 w-3.5" /> Xóa TOÀN BỘ Giáo viên (DB)
                    </button>
                  </div>

                  {/* BỘ LỌC MÔN HỌC & THANH XOÁ BATCH */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <Filter className="h-3.5 w-3.5 text-[#64748B] dark:text-slate-400" />
                      <select
                        value={teacherSubjectFilter}
                        onChange={(e) => setTeacherSubjectFilter(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#087CFF] text-[#14213D] dark:text-white"
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
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl">
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">Đã chọn: {selectedTeacherIds.length}</span>
                          <button
                            onClick={() => handleOpenBatchModal({
                              title: `Xóa ${selectedTeacherIds.length} Giáo viên đã chọn`,
                              description: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedTeacherIds.length} tài khoản giáo viên này khỏi cơ sở dữ liệu Supabase?`,
                              count: selectedTeacherIds.length,
                              actionType: 'delete_selected_users',
                              payload: { userIds: selectedTeacherIds },
                              requiresTextConfirm: false
                            })}
                            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2 py-0.5 rounded-lg transition-colors shadow-xs"
                          >
                            <Trash2 className="h-3 w-3" /> Xóa đã chọn
                          </button>
                          <button
                            onClick={() => setSelectedTeacherIds([])}
                            className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 hover:text-[#14213D] dark:hover:text-white px-1"
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
                          className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa GV theo môn đang lọc
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {editingUserId && (
                  <div className="p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F0F7FF] dark:bg-[#1746D1]/10 space-y-4">
                    <h4 className="font-extrabold text-sm text-[#1746D1] dark:text-cyan-400 m-0">Chỉnh sửa thông tin Giáo viên / Trưởng bộ môn</h4>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Họ và Tên giáo viên</label>
                        <input
                          type="text"
                          placeholder="VD: Thầy Nguyễn Thế Chinh..."
                          value={editingUserFullName}
                          onChange={(e) => setEditingUserFullName(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 text-xs focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên FPT / Mã GV</label>
                        <input
                          type="text"
                          placeholder="VD: CHINH10"
                          value={editingUserFptName}
                          onChange={(e) => setEditingUserFptName(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 text-xs focus:outline-none focus:border-[#087CFF] font-bold uppercase text-[#14213D] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Email tài khoản</label>
                        <input
                          type="email"
                          value={editingUserEmail}
                          onChange={(e) => setEditingUserEmail(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 text-xs focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Vai trò chuyên môn</label>
                        <select
                          value={editingUserRole}
                          onChange={(e) => setEditingUserRole(e.target.value as any)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-2.5 py-2 text-xs focus:outline-none focus:border-[#087CFF] font-semibold text-[#1746D1] dark:text-cyan-400"
                        >
                          <option value="teacher">Giáo viên bộ môn (Teacher)</option>
                          <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                          <option value="admin">Quản trị viên (Admin)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block mb-1">Môn học giảng dạy</label>
                        <select
                          value={editingUserSubjectId}
                          onChange={(e) => setEditingUserSubjectId(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 text-xs focus:outline-none focus:border-[#087CFF] text-[#1746D1] dark:text-cyan-400 font-bold"
                        >
                          <option value="">-- Chưa phân công môn --</option>
                          {subjects.map((sub: any) => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block mb-1">Lớp dạy học (Chọn nhiều)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 border border-[#E2E8F0] dark:border-[#1B317A] rounded-xl p-3 bg-white dark:bg-[#081736] max-h-[140px] overflow-y-auto">
                          {sortClassesNaturally(classes).map((cls: any) => {
                            const isChecked = editingUserClassIds.includes(cls.id);
                            return (
                              <label key={cls.id} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none text-[#14213D] dark:text-white">
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
                                  className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-3.5 w-3.5"
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
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] font-bold text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-[#0B1B55] transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateUser}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white font-extrabold hover:shadow-md transition-all"
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
                          <tr className="border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/50 text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
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
                                className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-4 w-4 cursor-pointer"
                              />
                            </th>
                            <th className="p-4">Giáo viên & Mã FPT</th>
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
                            const teacherClassesNames = assignments
                              .map(tc => classes.find(c => c.id === tc.class_id))
                              .filter(Boolean);
                            const sortedClassesNames = sortClassesNaturally(teacherClassesNames as any).map(c => c.name).join(', ');
                            const isSelected = selectedTeacherIds.includes(p.id);
                            const isProtected = p.id === currentUserId || p.email === 'fprep.fschool@gmail.com';
                            const tDisplay = getTeacherDisplayName(p, auditLogs);

                            return (
                              <tr key={p.id} className={`border-b border-[#E2E8F0] dark:border-[#1B317A] hover:bg-[#F1F5F9]/60 dark:hover:bg-[#0D226B]/30 transition-colors ${isSelected ? 'bg-[#1746D1]/5' : ''}`}>
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
                                    className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-4 w-4 cursor-pointer disabled:opacity-30"
                                  />
                                </td>
                                <td className="p-4">
                                  <div className="text-sm font-extrabold text-[#14213D] dark:text-white">{tDisplay.fullName}</div>
                                  <div className="text-xs text-[#64748B] dark:text-slate-400 font-normal">{p.email}</div>
                                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20 mt-1">
                                    Mã GV: {tDisplay.fptName}
                                  </span>
                                </td>
                                <td className="p-4">{getRoleBadge(p.role)}</td>
                                <td className="p-4 font-bold text-[#1746D1] dark:text-cyan-400">{teacherSubject || <span className="text-[#64748B] dark:text-slate-400 italic font-normal">Chưa gán môn</span>}</td>
                                <td className="p-4 font-semibold text-xs text-[#14213D] dark:text-white">{sortedClassesNames || <span className="text-[#64748B] dark:text-slate-400 italic font-normal">Chưa phân lớp</span>}</td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => startEditUser(p)}
                                      className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B] font-bold text-[#1746D1] dark:text-cyan-400 transition-all text-[10px] cursor-pointer"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(p.id)}
                                      disabled={isProtected}
                                      className="px-2.5 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 font-bold text-red-600 dark:text-red-400 transition-all text-[10px] disabled:opacity-50 cursor-pointer"
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
              <div className="md:col-span-4 bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3 flex items-center gap-2 text-[#14213D] dark:text-white m-0">
                  <Users className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Thêm Giáo viên / Trưởng bộ môn
                </h4>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Họ và Tên</label>
                    <input
                      type="text"
                      placeholder="VD: Thầy / Cô Nguyễn Văn A..."
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên FPT / Mã GV</label>
                    <input
                      type="text"
                      placeholder="VD: NhanV5..."
                      value={newUserFptName}
                      onChange={(e) => setNewUserFptName(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Email tài khoản</label>
                    <input
                      type="email"
                      placeholder="VD: giaovien.vatly@fpt.edu.vn..."
                      value={newUserEmail}
                      onChange={(e) => {
                        const email = e.target.value;
                        setNewUserEmail(email);
                        if (!newUserFptName && email.includes('@')) {
                          setNewUserFptName(email.split('@')[0].toUpperCase());
                        }
                      }}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block">Vai trò khởi tạo</label>
                    <select
                      value={newUserRole === 'head_of_department' ? 'head_of_department' : 'teacher'}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-2.5 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#1746D1] dark:text-cyan-400"
                    >
                      <option value="teacher">Giáo viên bộ môn (Teacher)</option>
                      <option value="head_of_department">Trưởng bộ môn (HOD)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block mb-1">Môn học giảng dạy</label>
                    <select
                      value={newUserSubjectId}
                      onChange={(e) => setNewUserSubjectId(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-2.5 py-2 focus:outline-none focus:border-[#087CFF] text-[#1746D1] dark:text-cyan-400 font-bold"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {subjects.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block mb-1">Lớp dạy học (Chọn nhiều)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-[#E2E8F0] dark:border-[#1B317A] rounded-xl p-2.5 bg-[#F8FAFC] dark:bg-[#081736] max-h-[110px] overflow-y-auto">
                      {classes.map((cls: any) => {
                        const isChecked = newUserClassIds.includes(cls.id);
                        return (
                          <label key={cls.id} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none text-[#14213D] dark:text-white">
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
                              className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-3.5 w-3.5"
                            />
                            {cls.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const roleToUse = (newUserRole === 'head_of_department') ? 'head_of_department' : 'teacher';
                      handleCreateUser(roleToUse);
                    }}
                    disabled={isCreatingUser}
                    className="w-full text-center flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] py-2.5 text-xs font-bold text-white hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCreatingUser ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tạo tài khoản...
                      </>
                    ) : (
                      <>
                        <Users className="h-3.5 w-3.5" /> Tạo tài khoản Giáo viên
                      </>
                    )}
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
              <div className="md:col-span-8 bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-extrabold text-sm flex items-center gap-2 m-0 text-[#14213D] dark:text-white">
                      <GraduationCap className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Danh sách Học sinh ({profiles.filter(p => p.role === 'student').length})
                    </h3>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setShowExcelModal(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
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
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <select
                        value={userClassFilter}
                        onChange={(e) => setUserClassFilter(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                      >
                        <option value="all">Tất cả lớp ({profiles.filter(p => p.role === 'student').length})</option>
                        <option value="unassigned">Chưa xếp lớp ({localStudentDetails.filter(s => !s.class_id).length})</option>
                        {sortClassesNaturally(classes).map(cls => {
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
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E2E8F0] dark:border-[#1B317A]">
                        {selectedStudentIds.length > 0 && (
                          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl">
                            <span className="text-xs font-bold text-red-600 dark:text-red-400">Đã chọn: {selectedStudentIds.length} HS</span>
                            <button
                              onClick={() => handleOpenBatchModal({
                                title: `Xóa ${selectedStudentIds.length} Học sinh đã chọn`,
                                description: `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedStudentIds.length} tài khoản học sinh này khỏi cơ sở dữ liệu Supabase? Toàn bộ tiến độ và kết quả thi của họ cũng sẽ bị xóa.`,
                                count: selectedStudentIds.length,
                                actionType: 'delete_selected_users',
                                payload: { userIds: selectedStudentIds },
                                requiresTextConfirm: false
                              })}
                              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2 py-0.5 rounded-lg transition-colors shadow-xs"
                            >
                              <Trash2 className="h-3 w-3" /> Xóa đã chọn
                            </button>
                            <button
                              onClick={() => setSelectedStudentIds([])}
                              className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 hover:text-[#14213D] dark:hover:text-white px-1"
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
                            className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Xóa {filteredStudents.length} HS theo bộ lọc hiện tại
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {editingUserId && (
                  <div className="p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F0F7FF] dark:bg-[#1746D1]/10 space-y-4">
                    <h4 className="font-extrabold text-sm text-[#1746D1] dark:text-cyan-400 m-0">Chỉnh sửa thông tin Học sinh</h4>
                    <div className="grid gap-3 sm:grid-cols-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Họ và Tên</label>
                        <input
                          type="text"
                          value={editingUserFullName}
                          onChange={(e) => setEditingUserFullName(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên FPT / MSHS</label>
                        <input
                          type="text"
                          value={editingUserFptName}
                          onChange={(e) => setEditingUserFptName(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block mb-1">Xếp lớp học</label>
                        <select
                          value={editingUserClassId}
                          onChange={(e) => setEditingUserClassId(e.target.value)}
                          className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-2.5 py-2 focus:outline-none focus:border-[#087CFF] font-bold text-[#1746D1] dark:text-cyan-400"
                        >
                          <option value="">-- Chưa xếp lớp --</option>
                          {sortClassesNaturally(classes).map((cls: any) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 text-xs pt-1">
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] font-bold text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-[#0B1B55] transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleUpdateUser}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white font-extrabold hover:shadow-md transition-all"
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
                          <tr className="border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/50 text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
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
                                className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-4 w-4 cursor-pointer"
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
                              <td colSpan={6} className="p-8 text-center text-[#64748B] dark:text-slate-400 italic font-semibold">
                                Không tìm thấy học sinh nào phù hợp bộ lọc.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map(p => {
                              const details = localStudentDetails.find((s: any) => s.student_id === p.id);
                              const cls = classes.find(c => c.id === details?.class_id);
                              const isSelected = selectedStudentIds.includes(p.id);

                              return (
                                <tr key={p.id} className={`border-b border-[#E2E8F0] dark:border-[#1B317A] hover:bg-[#F1F5F9]/60 dark:hover:bg-[#0D226B]/30 transition-colors ${isSelected ? 'bg-[#1746D1]/5' : ''}`}>
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
                                      className="rounded border-[#E2E8F0] text-[#1746D1] focus:ring-[#087CFF] h-4 w-4 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-4 font-black text-sm text-[#14213D] dark:text-white">{details?.full_name || 'Chưa cập nhật'}</td>
                                  <td className="p-4 font-bold text-[#1746D1] dark:text-cyan-400 font-mono">{details?.mshs || 'N/A'}</td>
                                  <td className="p-4 font-semibold text-[#64748B] dark:text-slate-400">{p.email}</td>
                                  <td className="p-4">
                                    {cls ? (
                                      <span className="font-bold text-[#1746D1] dark:text-cyan-300 bg-[#E7F1FF] dark:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-[#B6D4FE] dark:border-cyan-400/30 text-xs">{cls.name}</span>
                                    ) : (
                                      <span className="text-[#64748B] dark:text-slate-400 italic text-[11px]">Chưa xếp lớp</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => startEditUser(p)}
                                        className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B] font-bold text-[#1746D1] dark:text-cyan-400 transition-all text-[10px] cursor-pointer"
                                      >
                                        Sửa
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(p.id)}
                                        className="px-2.5 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 font-bold text-red-600 dark:text-red-400 transition-all text-[10px] cursor-pointer"
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
              <div className="md:col-span-4 bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm border-b border-[#E2E8F0] dark:border-[#1B317A] pb-3 flex items-center gap-2 text-[#14213D] dark:text-white m-0">
                  <GraduationCap className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Thêm tài khoản Học sinh
                </h4>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Họ và Tên</label>
                    <input
                      type="text"
                      placeholder="VD: Nguyễn Văn A..."
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Tên FPT / MSHS</label>
                    <input
                      type="text"
                      placeholder="VD: NamNP12..."
                      value={newUserFptName}
                      onChange={(e) => setNewUserFptName(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Email tài khoản</label>
                    <input
                      type="email"
                      placeholder="VD: hocsinh@fpt.edu.vn..."
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 focus:outline-none focus:border-[#087CFF] font-semibold text-[#14213D] dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block mb-1">Xếp lớp học</label>
                    <select
                      value={newUserClassId}
                      onChange={(e) => setNewUserClassId(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#081736] px-2.5 py-2 focus:outline-none focus:border-[#087CFF] font-bold text-[#1746D1] dark:text-cyan-400"
                    >
                      <option value="">-- Chưa xếp lớp --</option>
                      {sortClassesNaturally(classes).map((cls: any) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setNewUserRole('student');
                      handleCreateUser('student');
                    }}
                    disabled={isCreatingUser}
                    className="w-full text-center flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] py-2.5 text-xs font-bold text-white hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCreatingUser ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tạo tài khoản...
                      </>
                    ) : (
                      <>
                        <GraduationCap className="h-3.5 w-3.5" /> Tạo tài khoản Học sinh
                      </>
                    )}
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
        <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl overflow-hidden shadow-sm animate-fade-in">
          <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/40 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2 m-0 text-[#14213D] dark:text-white">
                <ShieldCheck className="h-4.5 w-4.5 text-[#1746D1] dark:text-cyan-400" /> Nhật ký hoạt động bảo mật (Audit Logs)
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold mt-0.5 m-0">Ghi nhận toàn bộ thao tác thêm, sửa, xóa dữ liệu trên hệ thống</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20">
              {auditLogs.length} sự kiện
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#1B317A] bg-[#F8FAFC] dark:bg-[#0D226B]/50 text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
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
                    <td colSpan={5} className="p-8 text-center text-[#64748B] dark:text-slate-400 font-semibold italic">Chưa có nhật ký bảo mật nào được ghi nhận.</td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-[#E2E8F0] dark:border-[#1B317A] hover:bg-[#F1F5F9]/60 dark:hover:bg-[#0D226B]/30 transition-colors text-xs">
                      <td className="p-4 font-bold text-[#14213D] dark:text-white">{log.actor?.email || 'Hệ thống tự động'}</td>
                      <td className="p-4">
                        <span className="bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20 px-2.5 py-1 rounded-lg font-mono font-bold text-xs inline-block">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[#64748B] dark:text-slate-400 font-bold">{log.target_table}</td>
                      <td className="p-4 space-y-1">
                        <div className="bg-[#F8FAFC] dark:bg-[#081736] p-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] font-mono max-w-sm overflow-x-auto text-[10px]">
                          <div><strong className="text-red-500 font-bold">Cũ:</strong> {JSON.stringify(log.old_values)}</div>
                          <div className="mt-1"><strong className="text-emerald-500 font-bold">Mới:</strong> {JSON.stringify(log.new_values)}</div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-[#64748B] dark:text-slate-400 font-semibold">
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
          <div className="bg-white dark:bg-[#0B1B55] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-[#14213D] dark:text-white m-0">{batchModalConfig.title}</h3>
                <span className="inline-block mt-1 text-[11px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                  Ảnh hưởng: {batchModalConfig.count} bản ghi trong DB
                </span>
              </div>
              <button
                onClick={() => { setBatchModalOpen(false); setBatchModalConfig(null); }}
                className="text-[#64748B] hover:text-[#14213D] dark:hover:text-white p-1 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#0D226B] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed m-0">
              {batchModalConfig.description}
            </p>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 font-semibold space-y-1">
              <p className="font-bold flex items-center gap-1.5 m-0">
                <AlertCircle className="h-4 w-4 shrink-0" /> Thao tác này sẽ xoá vĩnh viễn:
              </p>
              <ul className="list-disc list-inside text-[11px] text-red-600/90 dark:text-red-400/90 space-y-0.5 m-0 pl-1">
                <li>Tài khoản người dùng (profiles)</li>
                <li>Hồ sơ chi tiết (student_details / teacher_classes)</li>
                <li>Lịch sử học tập, nhật ký và điểm số thi thử</li>
              </ul>
            </div>

            {batchModalConfig.requiresTextConfirm && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-[#14213D] dark:text-white block">
                  Nhập chính xác chữ <span className="font-mono text-red-600 dark:text-red-400 font-extrabold bg-red-500/10 px-2 py-0.5 rounded-md">{batchModalConfig.confirmKeyword || 'XOA'}</span> để xác nhận:
                </label>
                <input
                  type="text"
                  placeholder="Gõ XOA vào đây..."
                  value={batchConfirmInput}
                  onChange={(e) => setBatchConfirmInput(e.target.value)}
                  className="w-full rounded-xl border border-red-500/40 bg-[#F8FAFC] dark:bg-[#081736] px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-600 text-red-600 dark:text-red-400"
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1B317A]">
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => { setBatchModalOpen(false); setBatchModalConfig(null); }}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] text-xs font-bold text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B] transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingBatch || (batchModalConfig.requiresTextConfirm && batchConfirmInput.trim().toUpperCase() !== (batchModalConfig.confirmKeyword || 'XOA'))}
                onClick={handleExecuteBatchDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
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

      {/* ==================================================== */}
      {/* MODAL CÁ NHÂN HÓA ẢNH NỀN RIÊNG CHO LỚP HỌC */}
      {/* ==================================================== */}
      {backgroundModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0B1B55] border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0] dark:border-[#1B317A]">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-[#1746D1]/10 border border-[#1746D1]/20 flex items-center justify-center text-[#1746D1] dark:text-cyan-400 shrink-0">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#14213D] dark:text-white m-0">
                      Cá nhân hóa Ảnh nền - Lớp {backgroundModalClass.name}
                    </h3>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20">
                      {backgroundModalClass.academic_year || '2024-2027'}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 m-0">
                    Đặt ảnh nền banner và không gian riêng biệt cho học sinh thuộc lớp này
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBackgroundModalClass(null)}
                className="text-[#64748B] hover:text-[#14213D] dark:hover:text-white p-1.5 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#0D226B] transition-colors cursor-pointer"
                title="Đóng modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live Preview Banner */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#14213D] dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#1746D1] dark:text-cyan-400" /> Xem trước hiển thị giao diện học sinh (Live Preview)
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-slate-400">Tỷ lệ rộng 16:9 banner</span>
              </div>
              <div className="relative h-44 rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-[#1B317A] shadow-md bg-slate-900 group">
                <img
                  src={selectedBgUrl || '/student-banner-bg.jpg'}
                  alt={`Xem trước ảnh nền Lớp ${backgroundModalClass.name}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/student-banner-bg.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div className="text-white space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1746D1]/80 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wide">
                      <GraduationCap className="h-3 w-3" /> Không gian riêng của Lớp
                    </div>
                    <h4 className="text-lg font-black tracking-tight drop-shadow-md m-0">
                      LỚP {backgroundModalClass.name}
                    </h4>
                    <p className="text-[11px] text-white/80 font-medium m-0">
                      FPT School &bull; Khối {backgroundModalClass.name.replace(/\D/g, '') || '10'} &bull; Niên khóa {backgroundModalClass.academic_year || '2024-2027'}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <span className="text-[10px] px-2 py-1 rounded bg-black/50 backdrop-blur-xs text-white/90 font-mono border border-white/20">
                      Giao diện cá nhân hóa
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông báo kết quả thao tác */}
            {bgMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  bgMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}
              >
                {bgMessage.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{bgMessage.text}</span>
              </div>
            )}

            {/* Các tùy chọn thiết lập ảnh */}
            <div className="space-y-4 pt-1">
              {/* Tùy chọn 1: Tải ảnh từ máy tính */}
              <div className="bg-[#F8FAFC] dark:bg-[#0D226B]/30 border border-[#E2E8F0] dark:border-[#1B317A] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#14213D] dark:text-white flex items-center gap-1.5">
                    <UploadCloud className="h-4 w-4 text-[#1746D1] dark:text-cyan-400" /> Cách 1: Tải ảnh trực tiếp từ máy tính
                  </label>
                  <span className="text-[10px] text-[#64748B] dark:text-slate-400">Định dạng JPG, PNG, WebP (Tối đa 8MB)</span>
                </div>

                <input
                  type="file"
                  ref={bgFileInputRef}
                  onChange={handleUploadBgFile}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    disabled={isUploadingBg || isSavingBg}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1746D1]/10 hover:bg-[#1746D1]/20 text-[#1746D1] dark:text-cyan-400 border border-[#1746D1]/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingBg ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lên đám mây...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" /> Chọn tệp ảnh từ máy tính
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-[#64748B] dark:text-slate-400 italic">
                    Tự động lưu trữ tối ưu trên đám mây CDN
                  </span>
                </div>
              </div>

              {/* Tùy chọn 2: Nhập URL ảnh */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#14213D] dark:text-white block">
                  Cách 2: Nhập hoặc dán liên kết URL ảnh trực tiếp
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/banner-lop.jpg"
                    value={customBgInput}
                    onChange={(e) => {
                      setCustomBgInput(e.target.value);
                      setSelectedBgUrl(e.target.value);
                    }}
                    className="flex-1 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] bg-white dark:bg-[#081736] px-3 py-2 text-xs font-mono text-[#14213D] dark:text-white focus:outline-none focus:border-[#087CFF]"
                  />
                  {customBgInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomBgInput('');
                        setSelectedBgUrl('');
                      }}
                      className="px-2.5 py-2 text-xs font-semibold text-[#64748B] dark:text-slate-400 hover:text-[#14213D] dark:hover:text-white border border-[#E2E8F0] dark:border-[#1B317A] rounded-xl hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B]"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* Tùy chọn 3: Thư viện Preset FPT tuyển chọn */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#14213D] dark:text-white block">
                  Cách 3: Hoặc chọn nhanh ảnh mẫu chất lượng cao
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CLASS_BACKGROUND_PRESETS.map((preset) => {
                    const isSelected = selectedBgUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedBgUrl(preset.url);
                          setCustomBgInput(preset.url);
                        }}
                        className={`group relative rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#087CFF] ring-2 ring-[#087CFF]/30 shadow-md'
                            : 'border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#087CFF]/50 hover:shadow-xs'
                        }`}
                      >
                        <div className="h-18 w-full overflow-hidden bg-slate-800">
                          <img
                            src={preset.url}
                            alt={preset.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-2 bg-white dark:bg-[#0B1B55]">
                          <p className="text-[10px] font-bold text-[#14213D] dark:text-white line-clamp-1 m-0">{preset.title}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-[#087CFF] text-white flex items-center justify-center text-[10px] shadow">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E2E8F0] dark:border-[#1B317A]">
              <button
                type="button"
                onClick={handleRemoveClassBackground}
                disabled={isSavingBg || isUploadingBg}
                className="px-3.5 py-2 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Khôi phục mặc định
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSavingBg || isUploadingBg}
                  onClick={() => setBackgroundModalClass(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1B317A] text-xs font-bold text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-[#0D226B] transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isSavingBg || isUploadingBg}
                  onClick={handleSaveClassBackground}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#1746D1] to-[#087CFF] text-white text-xs font-extrabold transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingBg ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu ảnh nền...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> Lưu ảnh nền lớp
                    </>
                  )}
                </button>
              </div>
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
