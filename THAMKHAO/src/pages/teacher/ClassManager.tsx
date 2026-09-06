import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, PlusCircle, Shield, TrendingUp, BookOpen, ArrowLeft, ArrowRight,
  Send, MessageSquare, Clock, CheckCircle2, XCircle, BarChart3, 
  Bell, ChevronRight, Loader2, AlertCircle, UserPlus, Copy, X, Save, 
  FileSpreadsheet, UploadCloud, Edit3, Trash2, Download, RefreshCcw, UserCheck,
  BrainCircuit, Sparkles, Lightbulb, Link as LinkIcon, Search, GripHorizontal,
  Bold, Italic, List, Filter, Layers, Compass
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';
import { askGroqAI } from '../../services/groqAI';
import { 
  parseClassInfo, 
  sortClassesByGradeAndStream, 
  getStreamBadgeStyle, 
  getStreamLabel 
} from '../../utils/classSorter';

// ========================================================
// HÀM HỖ TRỢ: TÁCH TÊN VÀ HỌ ĐỂ SẮP XẾP CHUẨN BỘ GD&ĐT
// ========================================================
const getVietnameseSortName = (fullName: string) => {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.length > 0 ? parts.pop() || '' : '';
  const lastName = parts.join(' '); 
  return { firstName, lastName };
};

const ClassManagement = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  
  // STATES CHUNG
  const [classes, setClasses] = useState<any[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  
  // PHÂN LOẠI LỚP HỌC
  const [activeClassGroup, setActiveClassGroup] = useState<'regular' | 'companion'>('regular');
  
  // STATES LỌC THEO KHỐI & ĐỊNH HƯỚNG T-X-K
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL'); // 'ALL' | '10' | '11' | '12'
  const [selectedStream, setSelectedStream] = useState<string>('ALL'); // 'ALL' | 'T' | 'X' | 'K'

  // STATES TẠO LỚP HỌC MỚI CÓ PHÂN LOẠI KHỐI & TỔ HỢP T-X-K
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassForm, setNewClassForm] = useState({ 
    grade: '10',
    stream: 'T',
    number: '1',
    customSuffix: '',
    type: 'regular' 
  });

  // STATES CHỈNH SỬA LỚP
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [editClassForm, setEditClassForm] = useState({ id: '', name: '', type: 'regular', teacher_id: '' });
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // STATES DRAG & DROP & LƯU THỨ TỰ
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isOrderChanged, setIsOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // STATES CHI TIẾT LỚP
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'assignments'>('overview');
  const [students, setStudents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false);
  
  const annTextareaRef = useRef<HTMLTextAreaElement>(null);

  // STATES THÊM HỌC SINH
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'excel'>('manual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({ name: '', email: '', code: '' });

  // STATES BÀI TẬP & NỘP BÀI
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [expandedAssignId, setExpandedAssignId] = useState<string | null>(null);

  // STATES AI ANALYTICS
  const [isAnalyzingClass, setIsAnalyzingClass] = useState(false);
  const [classAiInsight, setClassAiInsight] = useState("");
  const [analyzingStudentId, setAnalyzingStudentId] = useState<string | null>(null);
  const [showStudentAiModal, setShowStudentAiModal] = useState(false);
  const [studentAiInsight, setStudentAiInsight] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("");

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*, class_members(count)')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      const { data } = await supabase
        .from('classes')
        .select('*, class_members(count)')
        .order('created_at', { ascending: true });
      setClasses(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, [currentUser]);

  // SẮP XẾP TỰ ĐỘNG THEO THUẬT TOÁN (KHỐI -> T -> X -> K -> SỐ LỚP)
  const sortedClasses = useMemo(() => {
    return sortClassesByGradeAndStream(classes);
  }, [classes]);

  // HIỂN THỊ CÁC LỚP DỰA THEO TÌM KIẾM, KHỐI, ĐỊNH HƯỚNG VÀ TAB PHÂN LOẠI
  const displayedClasses = useMemo(() => {
    return sortedClasses.filter(cls => {
      const name = cls.name?.trim() || '';
      const matchesSearch = name.toLowerCase().includes(classSearch.toLowerCase());
      const clsType = cls.type || 'regular'; 
      const matchesTab = activeClassGroup === clsType;

      const info = parseClassInfo(name);
      const matchesGrade = selectedGrade === 'ALL' || String(info.grade) === selectedGrade;
      const matchesStream = selectedStream === 'ALL' || info.stream === selectedStream;

      return matchesSearch && matchesTab && matchesGrade && matchesStream;
    });
  }, [sortedClasses, classSearch, activeClassGroup, selectedGrade, selectedStream]);

  const handleDragStart = (index: number) => { setDraggedIdx(index); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (targetIndex: number) => {
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    const draggedItem = displayedClasses[draggedIdx];
    const targetItem = displayedClasses[targetIndex];
    const realDraggedIdx = classes.findIndex(c => c.id === draggedItem.id);
    const realTargetIdx = classes.findIndex(c => c.id === targetItem.id);
    if (realDraggedIdx === -1 || realTargetIdx === -1) return;

    const newClasses = [...classes];
    newClasses.splice(realDraggedIdx, 1);
    newClasses.splice(realTargetIdx, 0, draggedItem);
    
    setClasses(newClasses);
    setDraggedIdx(null);
    setIsOrderChanged(true); 
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const updates = classes.map((cls, index) => supabase.from('classes').update({ sort_order: index + 1 }).eq('id', cls.id));
      await Promise.all(updates);
      setIsOrderChanged(false); 
      alert("Đã lưu cố định thứ tự các lớp học thành công!");
    } catch (err) { alert("Có lỗi xảy ra khi lưu thứ tự."); } 
    finally { setIsSavingOrder(false); }
  };

  const fetchClassDetails = async (cls: any, showSpinner = true) => {
    if (showSpinner) setIsRefreshingDetail(true);
    setSelectedClass(cls);
    
    const { data: studentsData } = await supabase.from('class_members')
      .select('id, user_id, status, temp_name, student_email, temp_code, created_at, users(id, full_name, email, avatar_url, xp, level, student_code)')
      .eq('class_id', cls.id);

    const { count: totalLessons } = await supabase.from('lessons').select('*', { count: 'exact', head: true });

    const userIds = studentsData?.map((item: any) => item.user_id).filter(Boolean) || [];
    let progressData: any[] = [];
    if (userIds.length > 0) {
      const { data: prog } = await supabase.from('student_lesson_progress').select('user_id').in('user_id', userIds).eq('is_completed', true);
      progressData = prog || [];
    }
    
    let formattedStudents = studentsData?.map((item: any) => {
      const userObj = Array.isArray(item.users) ? item.users[0] : item.users;
      const completedCount = progressData.filter(p => p.user_id === item.user_id).length;
      const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

      const displayName = (item.temp_name && item.temp_name.trim() !== '') ? item.temp_name : (userObj?.full_name || 'Không rõ tên');
      const displayCode = userObj?.student_code || item.temp_code || '---';

      if (userObj && item.status === 'joined') {
        return { ...userObj, member_id: item.id, isGhost: false, joinStatus: 'joined', full_name: displayName, student_code: displayCode, completedLessons: completedCount, progressPercent: progressPercent }; 
      }
      if (userObj && item.status === 'pending') {
        return { ...userObj, member_id: item.id, isGhost: false, joinStatus: 'pending', full_name: displayName, student_code: displayCode, completedLessons: 0, progressPercent: 0 }; 
      }
      return { id: item.user_id || item.id, member_id: item.id, full_name: displayName, student_code: displayCode, email: item.student_email || 'Chờ đăng nhập...', level: 0, xp: 0, isGhost: true, joinStatus: item.status || 'ghost', completedLessons: 0, progressPercent: 0 };
    }) || [];
    
    formattedStudents.sort((a, b) => {
      const nameA = getVietnameseSortName(a.full_name);
      const nameB = getVietnameseSortName(b.full_name);
      const firstCompare = nameA.firstName.localeCompare(nameB.firstName, 'vi');
      if (firstCompare !== 0) return firstCompare;
      return nameA.lastName.localeCompare(nameB.lastName, 'vi');
    });

    setStudents(formattedStudents);

    const { data: annData } = await supabase.from('class_announcements').select('*').eq('class_id', cls.id).order('created_at', { ascending: false });
    if (annData) setAnnouncements(annData);

    const { data: assignsData } = await supabase.from('class_exams').select('exam_id, due_date, exams(id, title, time_limit, type)').eq('class_id', cls.id).order('due_date', { ascending: false });
    if (assignsData) {
      const formattedAssigns = assignsData.map((item:any) => {
        const examObj = Array.isArray(item.exams) ? item.exams[0] : item.exams;
        if (!examObj) return null;
        return { ...examObj, due_date: item.due_date };
      }).filter(Boolean);
      setAssignments(formattedAssigns);
      
      if (formattedAssigns.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validExamIds = formattedAssigns.map((a:any) => a.id).filter((id: any) => id && uuidRegex.test(id));
        
        if (validExamIds.length > 0) {
          const { data: attemptsData } = await supabase
            .from('exam_attempts')
            .select('exam_id, user_id, score, created_at')
            .in('exam_id', validExamIds);
          if (attemptsData) setAttempts(attemptsData);
        }
      }
    }
    if (showSpinner) setIsRefreshingDetail(false);
  };

  const submitAddClass = async () => {
    const generatedClassName = `${newClassForm.grade}${newClassForm.stream}${newClassForm.number}${newClassForm.customSuffix.trim() ? ` - ${newClassForm.customSuffix.trim()}` : ''}`;
    if (!generatedClassName.trim()) return alert("Vui lòng kiểm tra tên lớp học!");
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const nextOrder = classes.length + 1; 
    
    const { error } = await supabase.from('classes').insert({
      name: generatedClassName, 
      teacher_id: currentUser?.id || 'admin', 
      code: generatedCode, 
      join_code: generatedCode, 
      school_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 
      sort_order: nextOrder,
      type: newClassForm.type
    });
    
    if (error) {
      alert("Lỗi tạo lớp: " + error.message);
    } else {
      fetchClasses();
      setShowAddClassModal(false);
      setNewClassForm({ grade: '10', stream: 'T', number: '1', customSuffix: '', type: 'regular' });
      setActiveClassGroup(newClassForm.type as 'regular' | 'companion');
    }
  };

  const handleEditClass = async (e: React.MouseEvent, cls: any) => {
    e.stopPropagation();
    setEditClassForm({ 
      id: cls.id, 
      name: cls.name, 
      type: cls.type || 'regular',
      teacher_id: cls.teacher_id || ''
    });
    if (currentUser?.role === 'admin') {
      const { data } = await supabase.from('users').select('id, full_name, email').in('role', ['teacher', 'admin']);
      if (data) setTeachersList(data);
    }
    setShowEditClassModal(true);
  };

  const submitEditClass = async () => {
    if (!editClassForm.name.trim()) return alert("Vui lòng nhập tên lớp học!");
    
    const updatePayload: any = {
      name: editClassForm.name.trim(),
      type: editClassForm.type
    };

    if (currentUser?.role === 'admin') {
      updatePayload.teacher_id = editClassForm.teacher_id || null;
    }
    
    const { error } = await supabase.from('classes').update(updatePayload).eq('id', editClassForm.id);
    
    if (error) {
      alert("Lỗi cập nhật lớp: " + error.message);
    } else {
      fetchClasses();
      setShowEditClassModal(false);
      if (activeClassGroup !== editClassForm.type) {
        setActiveClassGroup(editClassForm.type as 'regular' | 'companion');
      }
    }
  };

  const handleDeleteClass = async (e: React.MouseEvent, clsId: string) => {
    e.stopPropagation();
    if (!window.confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA LỚP NÀY? Toàn bộ dữ liệu thành viên sẽ bị xóa vĩnh viễn.")) return;
    const { error } = await supabase.from('classes').delete().eq('id', clsId);
    if (!error) fetchClasses();
  };

  const insertMarkdownAnn = (before: string, after: string = '') => {
    const textarea = annTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newAnnouncement.substring(start, end);
    const newText = newAnnouncement.substring(0, start) + before + selectedText + after + newAnnouncement.substring(end);
    
    setNewAnnouncement(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    const { error } = await supabase.from('class_announcements').insert({ class_id: selectedClass.id, content: newAnnouncement.trim() });
    if (!error) { setNewAnnouncement(""); fetchClassDetails(selectedClass, false); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Xóa thông báo này?")) return;
    const { error } = await supabase.from('class_announcements').delete().eq('id', id);
    if (!error) fetchClassDetails(selectedClass, false);
  };

  const handleAddStudentManually = async () => {
    if (!newStudentForm.name.trim() || !newStudentForm.email.trim()) { alert("Vui lòng nhập Họ Tên và Email!"); return; }
    setIsProcessing(true);
    const { error } = await supabase.from('class_members').insert({
      class_id: selectedClass.id, temp_name: newStudentForm.name.trim(), student_email: newStudentForm.email.trim().toLowerCase(), temp_code: newStudentForm.code.trim(), status: 'ghost'
    });
    setIsProcessing(false);
    if (error) {
      if (error.code === '23505') alert("Học sinh với email này đã tồn tại trong lớp!");
      else alert("Lỗi thêm học sinh: " + error.message);
    } else {
      alert("Thêm học sinh thành công!");
      setNewStudentForm({ name: '', email: '', code: '' });
      setShowAddStudentModal(false);
      fetchClassDetails(selectedClass, false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      // Hàm tìm cột Excel hỗ trợ sai lệch viết hoa, khoảng trắng và từ đồng nghĩa
      const getVal = (row: any, keys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const k of keys) {
          const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
            return row[foundKey];
          }
        }
        for (const k of keys) {
          const foundKey = rowKeys.find(rk => rk.toLowerCase().trim().includes(k.toLowerCase().trim()));
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
            return row[foundKey];
          }
        }
        return '';
      };

      const membersToInsert = jsonData.map(row => {
        const nameVal = getVal(row, ['họ và tên', 'họ tên', 'họ & tên', 'tên học sinh', 'tên', 'name', 'full name', 'fullname']);
        const emailVal = getVal(row, ['email', 'địa chỉ email', 'thư điện tử', 'student email']);
        const codeVal = getVal(row, ['mshs', 'mã số học sinh', 'mã học sinh', 'mã hs', 'mssv', 'sbd', 'số báo danh', 'code', 'student code', 'student id', 'id']);

        const emailStr = String(emailVal || '').toLowerCase().trim();
        let finalCode = codeVal ? String(codeVal).trim() : '';

        // Tự động lấy MSHS trong email (bắt đầu bằng chữ FCTXXXXX, XXXXX là 5 số)
        if (!finalCode && emailStr) {
          const mshsMatch = emailStr.match(/fct\d{5}/i);
          if (mshsMatch) {
            finalCode = mshsMatch[0].toUpperCase();
          }
        }

        return {
          class_id: selectedClass.id,
          temp_name: nameVal ? String(nameVal).trim() : 'Không có tên',
          student_email: emailStr,
          temp_code: finalCode,
          status: 'ghost'
        };
      }).filter(m => m.student_email);

      if (membersToInsert.length === 0) throw new Error("Không tìm thấy dữ liệu hợp lệ. File Excel cần có cột chứa 'Họ tên' (hoặc Họ và tên) và 'Email'.");
      const { error } = await supabase.from('class_members').insert(membersToInsert);
      if (error) throw error;

      alert(`Đã nạp thành công ${membersToInsert.length} học sinh từ file Excel!`);
      setShowAddStudentModal(false);
      fetchClassDetails(selectedClass, false);
    } catch (error: any) { alert("Lỗi đọc file: " + (error.message || "Vui lòng kiểm tra lại định dạng.")); } 
    finally { setIsProcessing(false); if (e.target) e.target.value = ''; }
  };

  const handleRemoveStudent = async (memberId: string) => {
    if (!window.confirm("Xóa học sinh này khỏi lớp?")) return;
    const { error } = await supabase.from('class_members').delete().eq('id', memberId);
    if (!error) fetchClassDetails(selectedClass, false);
  };

  const handleApproveStudent = async (memberId: string) => {
    const { error } = await supabase.from('class_members').update({ status: 'joined' }).eq('id', memberId);
    if (!error) fetchClassDetails(selectedClass, false);
  };

  const handleEditGhostStudent = async (student: any) => {
    const newEmail = window.prompt("Sửa Email cho học sinh:", student.email);
    if (!newEmail || newEmail === student.email) return;
    const { error } = await supabase.from('class_members').update({ student_email: newEmail.trim().toLowerCase() }).eq('id', student.member_id);
    if (!error) fetchClassDetails(selectedClass, false);
  };

  const handleCopyJoinLink = () => {
    const joinLink = `${window.location.origin}/join/${selectedClass.join_code}`;
    navigator.clipboard.writeText(joinLink);
    alert("Đã copy link tham gia lớp học! Thầy cô có thể gửi cho học sinh.");
  };

  const getAssignmentStats = (examId: string) => {
    const submittedUsers = attempts.filter(a => a.exam_id === examId);
    const submittedIds = [...new Set(submittedUsers.map(a => a.user_id))]; 
    
    const doneList = students.filter(s => submittedIds.includes(s.id)).map(s => {
      const userAttempts = submittedUsers
        .filter(a => a.user_id === s.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
      return { ...s, attempts: userAttempts };
    });
    
    const missingList = students.filter(s => !submittedIds.includes(s.id) && !s.isGhost);
    return { doneList, missingList, total: students.filter(s => !s.isGhost).length };
  };

  const handleExportScores = (examId: string, examTitle: string) => {
    const stats = getAssignmentStats(examId);
    const exportData = [
      ...stats.doneList.map(s => {
         const highestScore = Math.max(...s.attempts.map((a:any) => a.score));
         const latestAttempt = s.attempts[0]; 
         return { 
           'Họ và tên': s.full_name, 
           'Mã HS': s.student_code, 
           'Email': s.email, 
           'Trạng thái': 'Đã nộp', 
           'Số lượt làm': s.attempts.length, 
           'Điểm cao nhất': highestScore, 
           'Lần nộp cuối': new Date(latestAttempt.created_at).toLocaleString('vi-VN') 
         }
      }),
      ...stats.missingList.map(s => ({ 
        'Họ và tên': s.full_name, 
        'Mã HS': s.student_code, 
        'Email': s.email, 
        'Trạng thái': 'Chưa làm', 
        'Số lượt làm': 0, 
        'Điểm cao nhất': 0, 
        'Lần nộp cuối': '' 
      }))
    ];
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bang_Diem");
    XLSX.writeFile(wb, `Diem_${examTitle.substring(0, 20)}_${selectedClass.name}.xlsx`);
  };

  const handleCreateLiveSession = async (examId: string, classId: string) => {
    const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 90 * 60000); 
    
    const { data, error } = await supabase.from('live_sessions').insert({
      class_id: classId,
      exam_id: examId,
      teacher_id: currentUser?.id,
      access_code: pin,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      is_active: true
    }).select().single();
  
    if (error) {
      alert("Lỗi tạo phòng thi: " + error.message);
    } else {
      alert(`Tạo phòng thi thành công! Mã PIN học sinh là: ${pin}`);
      navigate(`/live-monitor/${data.id}`);
    }
  };

  const handleAnalyzeClass = async () => {
    if (assignments.length === 0) return alert("Lớp chưa có bài tập nào để phân tích!");
    setIsAnalyzingClass(true);
    let statsSummary = "";
    assignments.forEach(assign => {
      const submittedUsers = attempts.filter(a => a.exam_id === assign.id);
      if (submittedUsers.length > 0) {
        const avgScore = submittedUsers.reduce((sum, a) => sum + a.score, 0) / submittedUsers.length;
        statsSummary += `- Bài "${assign.title}": Đã nộp ${submittedUsers.length}/${students.filter(s=>!s.isGhost).length} HS. Điểm TB: ${avgScore.toFixed(2)}\n`;
      } else statsSummary += `- Bài "${assign.title}": Chưa có ai nộp.\n`;
    });
    const prompt = `Phân tích lớp "${selectedClass.name}":\n- Sĩ số: ${students.length} học sinh.\n- Tổng số bài đã giao: ${assignments.length}.\n- Thống kê chi tiết:\n${statsSummary}\n\n1. Đánh giá tổng quan\n2. Chẩn đoán điểm yếu\n3. Đề xuất ôn tập`;
    try {
      const response = await askGroqAI("Bạn là FMath AI - Chuyên gia phân tích dữ liệu giáo dục.", prompt);
      setClassAiInsight(response);
    } catch (error) { alert("Hệ thống AI đang quá tải. Vui lòng thử lại sau."); } 
    finally { setIsAnalyzingClass(false); }
  };

  const handleAnalyzeStudent = async (student: any) => {
    if (student.joinStatus !== 'joined') return alert("Học sinh này chưa tham gia lớp chính thức!");
    setAnalyzingStudentId(student.id); setSelectedStudentName(student.full_name); setShowStudentAiModal(true); setStudentAiInsight(""); 
    const studentAttempts = attempts.filter(a => a.user_id === student.id);
    let historyString = studentAttempts.length === 0 ? "Chưa làm bài nào." : "";
    if (studentAttempts.length > 0) {
      assignments.forEach(assign => {
        const attempt = studentAttempts.find(a => a.exam_id === assign.id);
        if (attempt) historyString += `- Bài "${assign.title}": Đạt ${attempt.score} điểm.\n`;
        else historyString += `- Bài "${assign.title}": Chưa làm.\n`;
      });
    }
    const prompt = `Phân tích học sinh "${student.full_name}":\n- Tiến độ lý thuyết: Đã học ${student.completedLessons} bài (${student.progressPercent}%).\n- Lịch sử làm bài tập:\n${historyString}\n\n1. Nhận xét thái độ\n2. Chẩn đoán năng lực\n3. Chiến lược hỗ trợ`;
    try {
      const response = await askGroqAI("Bạn là trợ lý AI phân tích năng lực học sinh.", prompt);
      setStudentAiInsight(response);
    } catch (error) { setStudentAiInsight("Lỗi kết nối AI. Vui lòng thử lại."); } 
    finally { setAnalyzingStudentId(null); }
  };

  // ==========================================
  // RENDER: DANH SÁCH LỚP (MÀN HÌNH CHÍNH)
  // ==========================================
  if (!selectedClass) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-72px)] w-full relative bg-[#f8f9fa] animate-in fade-in overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32">
          <div className="max-w-6xl mx-auto w-full">
            
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-heading text-[#212529] mb-2 flex items-center gap-2">
                  <Users className="text-primary"/> Quản lý Lớp học
                </h2>
                <p className="text-[#6c757d] font-medium text-[14px]">Tạo lớp mới, kéo thả thẻ lớp để sắp xếp thứ tự ưu tiên.</p>
              </div>
              <button 
                onClick={() => setShowAddClassModal(true)} 
                className="btn-primary py-2.5 px-6 rounded-lg text-[14px] flex items-center justify-center gap-2"
              >
                <PlusCircle size={18} /> Tạo lớp học mới
              </button>
            </div>

            {/* TAB PHÂN LOẠI LỚP & BỘ LỌC KHỐI, ĐỊNH HƯỚNG T-X-K */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#dee2e6] pb-4">
              <div className="flex gap-2 overflow-x-auto custom-scrollbar">
                <button 
                  onClick={() => setActiveClassGroup('regular')}
                  className={`px-5 py-2.5 font-bold text-[14px] transition-all rounded-xl whitespace-nowrap ${activeClassGroup === 'regular' ? 'bg-primary text-white shadow-sm' : 'bg-white text-[#6c757d] hover:bg-[#e9ecef] border border-[#dee2e6]'}`}
                >
                  Lớp Học Chính Khóa
                </button>
                <button 
                  onClick={() => setActiveClassGroup('companion')}
                  className={`px-5 py-2.5 font-bold text-[14px] transition-all rounded-xl whitespace-nowrap ${activeClassGroup === 'companion' ? 'bg-primary text-white shadow-sm' : 'bg-white text-[#6c757d] hover:bg-[#e9ecef] border border-[#dee2e6]'}`}
                >
                  Lớp Học Đồng Hành
                </button>
              </div>

              {/* BỘ LỌC TỔ HỢP T-X-K VÀ KHỐI LỚP */}
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#dee2e6]">
                  <span className="text-[#6c757d] font-bold px-2 flex items-center gap-1"><Layers size={13}/> Khối:</span>
                  {['ALL', '10', '11', '12'].map(g => (
                    <button
                      key={g}
                      onClick={() => setSelectedGrade(g)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${selectedGrade === g ? 'bg-primary text-white shadow-xs' : 'text-[#495057] hover:bg-[#f8f9fa]'}`}
                    >
                      {g === 'ALL' ? 'Tất cả' : `K${g}`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#dee2e6]">
                  <span className="text-[#6c757d] font-bold px-2 flex items-center gap-1"><Compass size={13}/> Tổ hợp:</span>
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'T', label: '🌿 T (Tự nhiên)' },
                    { id: 'X', label: '📙 X (Xã hội)' },
                    { id: 'K', label: '🎨 K (Khai phóng)' }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStream(st.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${selectedStream === st.id ? 'bg-[#052c65] text-white shadow-xs' : 'text-[#495057] hover:bg-[#f8f9fa]'}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-[350px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" size={16} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm lớp học (VD: 10T1, 11X2...)..." 
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#dee2e6] bg-white text-[14px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] transition-all"
                />
              </div>
              
              <div className="flex items-center gap-3">
                {isOrderChanged ? (
                  <button 
                    onClick={handleSaveOrder}
                    disabled={isSavingOrder}
                    className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm text-[13px]"
                  >
                    {isSavingOrder ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
                    {isSavingOrder ? 'Đang lưu...' : 'Lưu thứ tự'}
                  </button>
                ) : (
                  <div className="text-[12px] font-semibold text-[#6c757d] bg-white px-3.5 py-2 rounded-xl border border-[#dee2e6] flex items-center gap-2 shadow-xs">
                    <GripHorizontal size={15} className="text-[#adb5bd]"/> 
                    {classSearch.trim() ? 'Đang tìm kiếm' : 'Tự động xếp: Khối → T → X → K'}
                  </div>
                )}
              </div>
            </div>

            {isLoading ? ( 
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32}/></div>
            ) : displayedClasses.length === 0 ? ( 
              <div className="text-center py-16 bg-white border border-[#dee2e6] rounded-2xl text-[#6c757d] shadow-sm">
                <Users size={40} className="mx-auto mb-3 opacity-30"/>
                <p className="font-bold text-[14px]">{classes.length > 0 ? "Không có lớp nào khớp với bộ lọc Khối & Tổ hợp." : "Bạn chưa tạo lớp học nào trong nhóm này."}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedClasses.map((cls, index) => {
                  const info = parseClassInfo(cls.name);
                  const streamDetails = getStreamLabel(info.stream);
                  const badgeStyle = getStreamBadgeStyle(info.stream);

                  return (
                    <div 
                      key={cls.id} 
                      draggable={!classSearch.trim()} 
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`bg-white rounded-2xl border transition-all p-5 relative group shadow-sm flex flex-col ${
                        draggedIdx === index 
                          ? 'opacity-50 scale-[0.98] border-primary shadow-none' 
                          : 'border-[#dee2e6] hover:border-primary hover:shadow-md cursor-pointer'
                      }`}
                      onClick={() => fetchClassDetails(cls)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-[16px] font-heading select-none ${cls.type === 'companion' ? 'bg-[#d1e7dd] text-[#0f5132]' : 'bg-[#e7f1ff] text-primary'}`}>
                            {cls.name.match(/\d+/) ? cls.name.match(/\d+/)[0] : cls.name.charAt(0)}
                          </div>
                          <div>
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                              Tổ hợp {streamDetails.code}: {streamDetails.name}
                            </span>
                            {info.grade < 99 && (
                              <span className="ml-1.5 text-[10px] font-bold text-[#6c757d] bg-[#f8f9fa] border border-[#dee2e6] px-1.5 py-0.5 rounded-md">
                                Khối {info.grade}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mr-1">
                            <button onClick={(e) => handleEditClass(e, cls)} className="p-1.5 hover:bg-[#e9ecef] text-[#6c757d] hover:text-primary rounded border border-transparent hover:border-[#dee2e6] transition-colors" title="Sửa thông tin lớp"><Edit3 size={14}/></button>
                            <button onClick={(e) => handleDeleteClass(e, cls.id)} className="p-1.5 hover:bg-[#f8d7da] text-[#6c757d] hover:text-[#dc3545] rounded border border-transparent hover:border-[#f5c2c7] transition-colors" title="Xóa lớp"><Trash2 size={14}/></button>
                          </div>
                          <div className="text-[#dee2e6] group-hover:text-[#adb5bd] transition-colors cursor-grab active:cursor-grabbing p-1" title="Kéo thả">
                             <GripHorizontal size={18} />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-[17px] font-extrabold text-[#212529] mb-1 font-heading line-clamp-2">{cls.name}</h3>
                        <div className="flex items-center gap-2 text-[#6c757d] text-[12px] font-medium mb-3">
                          <Users size={14} className="text-[#adb5bd]"/> Sĩ số: <strong>{cls.class_members?.[0]?.count || 0}</strong> học sinh
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-[#e9ecef] text-[11px] text-[#6c757d] font-bold flex justify-between items-center">
                        <span className="uppercase tracking-wider">Mã tham gia</span>
                        <span className="text-primary text-[13px] bg-[#f8f9fa] px-2 py-0.5 rounded-lg border border-[#dee2e6] font-mono font-bold">{cls.join_code}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            MODAL TẠO LỚP HỌC MỚI CÓ PHÂN LOẠI KHỐI & TỔ HỢP T-X-K
            ========================================== */}
        {showAddClassModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl p-6 md:p-8 shadow-2xl border border-[#dee2e6] relative">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-[18px] font-extrabold font-heading text-[#212529] m-0">Tạo Lớp Học Mới</h3>
                  <p className="text-[12px] text-[#6c757d] mt-0.5 m-0 font-medium">Tự động phân loại theo Khối và Tổ hợp T - X - K</p>
                </div>
                <button onClick={() => setShowAddClassModal(false)} className="p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] rounded-xl text-[#6c757d] transition-colors"><X size={18} /></button>
              </div>
              
              <div className="space-y-4 mb-6">
                
                {/* BƯỚC 1: CHỌN KHỐI LỚP */}
                <div>
                  <label className="block text-[11px] font-bold text-[#212529] uppercase tracking-wider mb-1.5">
                    1. Chọn Khối Lớp <span className="text-[#dc3545]">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['10', '11', '12'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setNewClassForm({...newClassForm, grade: g})}
                        className={`py-2 rounded-xl font-extrabold text-[13px] border transition-all ${newClassForm.grade === g ? 'border-primary bg-[#e7f1ff] text-primary shadow-xs' : 'border-[#dee2e6] bg-white text-[#495057] hover:bg-[#f8f9fa]'}`}
                      >
                        Khối {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BƯỚC 2: CHỌN TỔ HỢP / ĐỊNH HƯỚNG T-X-K */}
                <div>
                  <label className="block text-[11px] font-bold text-[#212529] uppercase tracking-wider mb-1.5">
                    2. Định Hướng / Tổ Hợp <span className="text-[#dc3545]">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'T', name: '🌿 T (Tự nhiên)', desc: 'Toán, Lý, Hóa, Sinh' },
                      { code: 'X', name: '📙 X (Xã hội)', desc: 'Văn, Sử, Địa, GDCD' },
                      { code: 'K', name: '🎨 K (Khai phóng)', desc: 'Ngoại ngữ, Nghệ thuật' }
                    ].map(st => (
                      <button
                        key={st.code}
                        type="button"
                        onClick={() => setNewClassForm({...newClassForm, stream: st.code})}
                        className={`p-2.5 rounded-xl font-bold text-[12px] text-left border transition-all ${newClassForm.stream === st.code ? 'border-primary bg-[#cfe2ff] text-[#084298] ring-1 ring-primary' : 'border-[#dee2e6] bg-white text-[#495057] hover:bg-[#f8f9fa]'}`}
                      >
                        <div className="font-extrabold text-[12px] mb-0.5">{st.name}</div>
                        <div className="text-[10px] text-[#6c757d] font-normal leading-tight">{st.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* BƯỚC 3: SỐ THỨ TỰ LỚP & TÊN MỞ RỘNG */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#212529] uppercase tracking-wider mb-1">
                      3. Số thứ tự lớp <span className="text-[#dc3545]">*</span>
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      max="99"
                      value={newClassForm.number} 
                      onChange={e => setNewClassForm({...newClassForm, number: e.target.value})} 
                      className="w-full px-3 py-2 rounded-xl border border-[#dee2e6] bg-white focus:outline-none focus:border-primary font-bold text-[13px] text-[#212529]" 
                      placeholder="1, 2, 3..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-1">
                      Mô tả bổ sung (Tùy chọn)
                    </label>
                    <input 
                      type="text" 
                      value={newClassForm.customSuffix} 
                      onChange={e => setNewClassForm({...newClassForm, customSuffix: e.target.value})} 
                      className="w-full px-3 py-2 rounded-xl border border-[#dee2e6] bg-white focus:outline-none focus:border-primary text-[13px] text-[#212529]" 
                      placeholder="VD: Chuyên Toán..."
                    />
                  </div>
                </div>

                {/* XEM TRƯỚC TÊN LỚP ĐƯỢC TẠO */}
                <div className="bg-[#e7f1ff] p-3 rounded-xl border border-[#b6d4fe] flex items-center justify-between text-[12px]">
                  <span className="text-[#084298] font-semibold">Tên lớp sẽ được hiển thị:</span>
                  <span className="text-primary font-black font-heading text-[15px] bg-white px-2.5 py-0.5 rounded-lg border border-[#b6d4fe]">
                    {newClassForm.grade}{newClassForm.stream}{newClassForm.number}{newClassForm.customSuffix.trim() ? ` - ${newClassForm.customSuffix.trim()}` : ''}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Phân loại nhóm lớp</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setNewClassForm({...newClassForm, type: 'regular'})} 
                      className={`flex-1 py-2 rounded-xl font-bold text-[12px] border transition-colors ${newClassForm.type === 'regular' ? 'border-primary bg-primary text-white shadow-xs' : 'border-[#dee2e6] text-[#6c757d] hover:bg-[#f8f9fa]'}`}
                    >
                      Lớp Chính Khóa
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewClassForm({...newClassForm, type: 'companion'})} 
                      className={`flex-1 py-2 rounded-xl font-bold text-[12px] border transition-colors ${newClassForm.type === 'companion' ? 'border-[#198754] bg-[#198754] text-white shadow-xs' : 'border-[#dee2e6] text-[#6c757d] hover:bg-[#f8f9fa]'}`}
                    >
                      Lớp Đồng Hành
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={submitAddClass} className="btn-primary w-full py-2.5 text-[14px] font-bold rounded-xl flex justify-center items-center gap-2 shadow-sm">
                <PlusCircle size={16}/> XÁC NHẬN TẠO LỚP HỌC
              </button>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL CHỈNH SỬA LỚP HỌC 
            ========================================== */}
        {showEditClassModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-xl p-8 shadow-bs-hover border border-[#dee2e6] relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[20px] font-bold font-heading text-[#212529]">Sửa thông tin Lớp</h3>
                <button onClick={() => setShowEditClassModal(false)} className="p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] rounded-lg text-[#6c757d] transition-colors"><X size={18} /></button>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-2">Tên lớp học</label>
                  <input 
                    type="text" 
                    value={editClassForm.name} 
                    onChange={e => setEditClassForm({...editClassForm, name: e.target.value})} 
                    className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] text-[#212529]" 
                    placeholder="Nhập tên lớp..."
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-2">Nhóm lớp</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditClassForm({...editClassForm, type: 'regular'})} 
                      className={`flex-1 py-2.5 rounded-lg font-bold text-[13px] border transition-colors ${editClassForm.type === 'regular' ? 'border-primary bg-[#e7f1ff] text-primary' : 'border-[#dee2e6] text-[#6c757d] hover:bg-[#f8f9fa]'}`}
                    >
                      Lớp Học
                    </button>
                    <button 
                      onClick={() => setEditClassForm({...editClassForm, type: 'companion'})} 
                      className={`flex-1 py-2.5 rounded-lg font-bold text-[13px] border transition-colors ${editClassForm.type === 'companion' ? 'border-[#198754] bg-[#d1e7dd] text-[#0f5132]' : 'border-[#dee2e6] text-[#6c757d] hover:bg-[#f8f9fa]'}`}
                    >
                      Đồng Hành
                    </button>
                  </div>
                </div>
                {currentUser?.role === 'admin' && (
                  <div>
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-2">Giáo viên phụ trách</label>
                    <select
                      value={editClassForm.teacher_id || ''}
                      onChange={e => setEditClassForm({...editClassForm, teacher_id: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] text-[#212529]"
                    >
                      <option value="">Chọn Giáo viên...</option>
                      {teachersList.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button onClick={submitEditClass} className="btn-primary w-full py-2.5 text-[14px] flex justify-center items-center gap-2">
                <Save size={16}/> Lưu thay đổi
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: CHI TIẾT LỚP HỌC (ACTIVE CLASS)
  // ==========================================
  return (
    <div className="flex flex-col min-h-[calc(100vh-72px)] w-full relative bg-[#f8f9fa] animate-in fade-in overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* Header quay lại */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button onClick={() => setSelectedClass(null)} className="inline-flex items-center gap-2 text-[#6c757d] hover:text-[#212529] font-medium text-[14px] transition-colors">
              <ArrowLeft size={16} /> Quay lại danh sách
            </button>
            <div className="flex items-center gap-2 text-[13px] font-bold bg-white px-3 py-1.5 rounded-lg border border-[#dee2e6] shadow-sm">
               <button onClick={handleCopyJoinLink} className="flex items-center gap-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#495057] px-2 py-1 rounded border border-[#dee2e6] transition-colors mr-2">
                 <LinkIcon size={12}/> Copy Link
               </button>
               Mã: <span className="text-primary text-[15px] font-ui tracking-widest">{selectedClass.join_code}</span>
            </div>
          </div>

          {/* Cảnh báo Giáo viên */}
          <div className="mb-6 bg-[#fff3cd] border-l-4 border-[#ffc107] p-4 rounded-r-lg flex items-start gap-3 border border-[#ffecb5]">
             <AlertCircle className="text-[#664d03] shrink-0 mt-0.5" size={18}/>
             <div>
               <p className="text-[13px] font-bold text-[#664d03] uppercase tracking-wider mb-1">Lưu ý quan trọng cho thầy cô:</p>
               <p className="text-[13px] text-[#664d03] font-medium m-0 leading-relaxed">
                 Thầy cô <b>BẮT BUỘC</b> phải thêm danh sách học sinh (bằng Excel hoặc thủ công) vào thẻ "Thành viên" trước khi gửi Link hoặc Mã lớp. Điều này giúp hệ thống nhận diện đúng Email và ngăn chặn người lạ.
               </p>
             </div>
          </div>

          {/* Banner Lớp */}
          <div className="bg-white rounded-xl border border-[#dee2e6] shadow-sm overflow-hidden mb-6 flex flex-col md:flex-row md:items-center justify-between border-l-4 border-l-primary">
            <div className="p-6 md:p-8 flex items-start gap-5">
              <div className="w-14 h-14 bg-[#e7f1ff] text-primary rounded-xl flex items-center justify-center shrink-0 border border-[#b6d4fe]">
                <Users size={28}/>
              </div>
              <div>
                <h2 className="text-2xl font-bold font-heading text-[#212529] mb-2">{selectedClass.name}</h2>
                <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#6c757d] font-medium">
                  <span className="flex items-center gap-1.5"><Users size={16}/> Sĩ số: {students.length}</span> 
                  <span className="flex items-center gap-1.5"><BookOpen size={16}/> Niên khóa: {selectedClass.school_year}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[#dee2e6] mb-6 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('overview')} className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}>
              <MessageSquare size={16}/> Bảng tin chung
            </button>
            <button onClick={() => setActiveTab('students')} className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'students' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}>
              <Users size={16}/> Quản lý Học sinh 
              {students.filter(s => s.joinStatus === 'pending').length > 0 && (
                <span className="ml-1 bg-[#dc3545] text-white w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold">{students.filter(s => s.joinStatus === 'pending').length}</span>
              )}
            </button>
            <button onClick={() => setActiveTab('assignments')} className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'assignments' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}>
              <BarChart3 size={16}/> Chấm điểm & Tiến độ
            </button>
          </div>

          <div className="w-full animate-in slide-in-from-bottom-2">
            
            {/* TAB: TỔNG QUAN (BẢNG TIN & AI) */}
            {activeTab === 'overview' && (
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Cột trái: Thống kê & AI */}
                <div className="w-full md:w-1/3 shrink-0 space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-[#dee2e6] shadow-sm">
                     <h3 className="font-bold text-[#212529] text-[14px] uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary"/> Thống kê nhanh</h3>
                     <div className="space-y-3 mb-6">
                       <div className="flex justify-between items-center p-3 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg"><span className="text-[13px] font-bold text-[#6c757d]">Tổng bài đã giao</span><span className="font-black text-[#212529] text-[16px]">{assignments.length}</span></div>
                       <div className="flex justify-between items-center p-3 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg"><span className="text-[13px] font-bold text-[#6c757d]">HS xuất sắc (Lv &gt; 5)</span><span className="font-black text-[#198754] text-[16px]">{students.filter(s => (s?.level || 0) > 5).length}</span></div>
                     </div>

                     <div className="bg-[#fff3cd] p-5 rounded-xl border border-[#ffecb5]">
                       <h4 className="font-bold text-[#997404] mb-3 flex items-center gap-2 text-[12px] uppercase tracking-wider">
                         <BrainCircuit size={16}/> Báo cáo AI FMath
                       </h4>
                       <button onClick={handleAnalyzeClass} disabled={isAnalyzingClass} className="w-full bg-[#ffc107] hover:bg-[#e0a800] text-[#212529] font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center gap-2 text-[13px]">
                         {isAnalyzingClass ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                         {isAnalyzingClass ? 'Đang phân tích...' : 'Phân tích năng lực lớp'}
                       </button>
                     </div>
                  </div>
                </div>

                {/* Cột phải: Bảng tin */}
                <div className="flex-1 space-y-6">
                  
                  {/* Khung hiển thị Báo cáo AI (Nếu có) */}
                  {classAiInsight && (
                    <div className="bg-white p-6 rounded-xl border border-[#dee2e6] shadow-sm relative overflow-hidden border-l-4 border-l-[#ffc107] animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-[#fff3cd] border border-[#ffecb5] flex items-center justify-center text-[#ffc107]"><BrainCircuit size={20}/></div>
                        <div>
                          <h3 className="font-bold text-[16px] text-[#212529] m-0">Chẩn đoán từ FMath AI</h3>
                          <p className="text-[12px] text-[#6c757d] font-medium m-0">Phân tích dựa trên lịch sử điểm số của lớp.</p>
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none text-[#495057] leading-[1.8]"><ReactMarkdown>{classAiInsight}</ReactMarkdown></div>
                    </div>
                  )}

                  {/* Trình soạn thảo Thông báo */}
                  <div className="bg-white p-6 rounded-xl border border-[#dee2e6] shadow-sm">
                    <h3 className="font-bold text-[#212529] text-[14px] uppercase tracking-wider mb-4 flex items-center gap-2"><Bell size={16} className="text-[#adb5bd]"/> Đăng thông báo</h3>
                    <div className="flex flex-col gap-3">
                      <div className="border border-[#dee2e6] rounded-lg overflow-hidden bg-white flex flex-col">
                        <div className="flex items-center gap-1 p-2 border-b border-[#dee2e6] bg-[#f8f9fa]">
                           <button type="button" onClick={() => insertMarkdownAnn('**', '**')} className="p-1.5 hover:bg-[#e9ecef] rounded text-[#6c757d] transition-colors" title="In đậm"><Bold size={14}/></button>
                           <button type="button" onClick={() => insertMarkdownAnn('*', '*')} className="p-1.5 hover:bg-[#e9ecef] rounded text-[#6c757d] transition-colors" title="In nghiêng"><Italic size={14}/></button>
                           <div className="w-px h-4 bg-[#dee2e6] mx-1"></div>
                           <button type="button" onClick={() => insertMarkdownAnn('- ', '')} className="p-1.5 hover:bg-[#e9ecef] rounded text-[#6c757d] transition-colors" title="Danh sách"><List size={14}/></button>
                        </div>
                        <textarea 
                          ref={annTextareaRef}
                          value={newAnnouncement} 
                          onChange={e => setNewAnnouncement(e.target.value)} 
                          placeholder="Nhập nội dung nhắc nhở, dặn dò..." 
                          className="w-full px-4 py-3 bg-transparent outline-none font-medium text-[14px] min-h-[100px] resize-y custom-scrollbar text-[#212529]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button onClick={handlePostAnnouncement} disabled={!newAnnouncement.trim()} className="btn-primary py-2.5 px-6 rounded-lg text-[13px] flex items-center gap-2 disabled:opacity-50"><Send size={14}/> Đăng thông báo</button>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách thông báo */}
                  <div className="space-y-4">
                    {announcements.length === 0 ? (
                      <div className="text-center p-10 bg-white rounded-xl border border-[#dee2e6] text-[#adb5bd] font-medium text-[14px]">Chưa có thông báo nào.</div>
                    ) : announcements.map(ann => (
                      <div key={ann.id} className="bg-white p-5 rounded-xl border border-[#dee2e6] shadow-sm flex gap-4 relative group hover:border-[#b6d4fe] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#dee2e6] text-[#adb5bd] flex items-center justify-center shrink-0"><Bell size={18}/></div>
                        <div className="flex-1">
                          <div className="text-[11px] font-bold text-[#6c757d] mb-2 uppercase tracking-wider">{new Date(ann.created_at).toLocaleString('vi-VN')}</div>
                          <div className="prose prose-sm max-w-none text-[#212529] font-medium leading-[1.8]">
                            <ReactMarkdown>{ann.content}</ReactMarkdown>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteAnnouncement(ann.id)} className="absolute top-4 right-4 p-1.5 text-[#adb5bd] hover:text-[#dc3545] hover:bg-[#f8d7da] rounded border border-transparent hover:border-[#f5c2c7] opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HỌC SINH */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                {/* Header Hành động */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#dee2e6] shadow-sm">
                  <div className="flex items-center gap-3 text-[14px] font-bold text-[#212529] px-2">
                    <Users size={18} className="text-[#adb5bd]"/> Sĩ số: {students.length}
                    <button onClick={() => fetchClassDetails(selectedClass, true)} className="ml-2 flex items-center gap-1.5 px-2 py-1 bg-[#f8f9fa] hover:bg-[#e9ecef] border border-[#dee2e6] text-[#6c757d] rounded text-[11px] uppercase tracking-wider transition-colors">
                      <RefreshCcw size={12} className={isRefreshingDetail ? 'animate-spin' : ''} /> Làm mới
                    </button>
                  </div>
                  <button onClick={() => setShowAddStudentModal(true)} className="btn-primary py-2.5 px-5 rounded-lg text-[13px] flex items-center justify-center gap-2"><UserPlus size={16}/> Thêm học sinh</button>
                </div>

                {/* Bảng Danh sách Học sinh */}
                <div className="bg-white rounded-xl border border-[#dee2e6] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-[#f8f9fa] border-b border-[#dee2e6] text-[#6c757d] text-[11px] uppercase tracking-wider font-bold">
                          <th className="p-4 text-center w-16">STT</th>
                          <th className="p-4">Học sinh</th>
                          <th className="p-4">Mã HS / Email</th>
                          <th className="p-4 text-center">Trạng thái</th>
                          <th className="p-4 text-center min-w-[150px]">Tiến độ học</th>
                          <th className="p-4 text-right">Phân tích & Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9ecef]">
                        {students.length === 0 ? (
                          <tr><td colSpan={6} className="p-8 text-center text-[#adb5bd] font-medium text-[14px]">Chưa nạp danh sách học sinh.</td></tr>
                        ) : students.map((student, idx) => (
                          <tr key={student?.member_id} className={`hover:bg-[#f8f9fa] transition-colors group ${student?.joinStatus === 'ghost' ? 'bg-[#f8f9fa] opacity-70' : student?.joinStatus === 'pending' ? 'bg-[#fff3cd]/50' : ''}`}>
                            <td className="p-4 text-center text-[#adb5bd] font-bold text-[13px] font-ui">{idx + 1}</td>
                            <td className="p-4 flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[12px] overflow-hidden shrink-0 ${student?.isGhost ? 'bg-[#e9ecef] border-[#dee2e6] text-[#6c757d]' : 'bg-[#e7f1ff] border-[#b6d4fe] text-primary'}`}>
                                 {student?.avatar_url ? <img src={student.avatar_url} alt="Ava" className="w-full h-full object-cover"/> : (student?.full_name?.charAt(0) || 'U')}
                              </div>
                              <div className="font-bold text-[#212529] text-[14px]">{student?.full_name}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-[#495057] text-[13px] font-ui">{student?.student_code || '---'}</div>
                              <div className="text-[12px] text-[#6c757d]">{student?.email}</div>
                            </td>
                            <td className="p-4 text-center">
                              {student?.joinStatus === 'ghost' ? (
                                <span className="px-2.5 py-1 bg-white border border-[#dee2e6] text-[#adb5bd] font-bold rounded text-[10px] uppercase flex items-center justify-center gap-1 w-fit mx-auto"><AlertCircle size={12}/> Chờ Đăng Nhập</span>
                              ) : student?.joinStatus === 'pending' ? (
                                <span className="px-2.5 py-1 bg-[#fff3cd] text-[#664d03] font-bold rounded text-[10px] uppercase flex items-center justify-center gap-1 w-fit mx-auto border border-[#ffecb5]"><Clock size={12}/> Chờ duyệt</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-[#d1e7dd] text-[#0f5132] font-bold rounded text-[10px] flex items-center justify-center gap-1 w-fit mx-auto uppercase border border-[#a3cfbb]"><CheckCircle2 size={12}/> Đã tham gia</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {student?.joinStatus === 'joined' ? (
                                <div className="w-full max-w-[120px] mx-auto">
                                  <div className="flex justify-between text-[11px] font-bold mb-1.5 text-[#6c757d]">
                                    <span>{student.completedLessons} bài</span><span className="text-primary">{student.progressPercent}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-[#e9ecef] rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${student.progressPercent}%` }}></div></div>
                                </div>
                              ) : <span className="text-[#adb5bd] text-xs">-</span>}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                {student?.joinStatus === 'joined' && (
                                  <button onClick={() => handleAnalyzeStudent(student)} disabled={analyzingStudentId === student.id} className="px-2.5 py-1.5 bg-[#fff3cd] text-[#997404] hover:bg-[#ffecb5] border border-[#ffecb5] rounded text-[11px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50">
                                    {analyzingStudentId === student.id ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>} AI Profile
                                  </button>
                                )}
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {student?.joinStatus === 'pending' && <button onClick={() => handleApproveStudent(student.member_id)} className="px-3 py-1 bg-[#198754] text-white rounded text-[11px] uppercase tracking-wider font-bold hover:bg-[#157347] flex items-center gap-1"><UserCheck size={12}/> Duyệt</button>}
                                  {student?.isGhost && <button onClick={() => handleEditGhostStudent(student)} className="p-1.5 bg-white border border-[#dee2e6] hover:bg-[#f8f9fa] text-[#6c757d] hover:text-primary rounded"><Edit3 size={14}/></button>}
                                  <button onClick={() => handleRemoveStudent(student.member_id)} className="p-1.5 bg-white border border-[#dee2e6] hover:bg-[#f8d7da] text-[#6c757d] hover:text-[#dc3545] hover:border-[#f5c2c7] rounded"><Trash2 size={14}/></button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BÀI TẬP VÀ CHẤM ĐIỂM */}
            {activeTab === 'assignments' && (
              <div className="space-y-4">
                
                {/* Header Hành động */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-4 rounded-xl border border-[#dee2e6] shadow-sm gap-4">
                  <p className="text-[13px] font-medium text-[#495057] m-0 flex items-center gap-2"><BarChart3 size={16} className="text-[#adb5bd]"/> Xem tiến độ nộp bài và xuất điểm ra tệp Excel.</p>
                  <button onClick={() => navigate('/exam-bank')} className="btn-primary py-2.5 px-5 rounded-lg text-[13px] flex items-center gap-2 shrink-0">
                    Vào Ngân hàng đề để Giao bài <ArrowRight size={14}/>
                  </button>
                </div>

                {/* Danh sách Bài tập */}
                {assignments.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-[#dee2e6] rounded-xl text-[#adb5bd] font-medium text-[14px]">
                    Lớp chưa có bài tập nào được giao.
                  </div>
                ) : assignments.map(assign => {
                  const stats = getAssignmentStats(assign.id);
                  const isExpanded = expandedAssignId === assign.id;
                  
                  return (
                    <div key={assign.id} className="bg-white rounded-xl border border-[#dee2e6] shadow-sm overflow-hidden hover:border-[#b6d4fe] transition-colors">
                      <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        
                        {/* Cột trái: Tên bài */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 bg-[#f8f9fa] border border-[#e9ecef] text-[#495057] text-[10px] font-bold uppercase tracking-wider rounded">
                              {assign.type}
                            </span>
                            <span className="text-[11px] font-bold uppercase text-[#adb5bd] flex items-center gap-1">
                              <Clock size={12}/> Hạn chót: {new Date(assign.due_date).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <h4 className="text-[16px] font-bold text-[#212529] font-heading leading-snug m-0">{assign.title}</h4>
                        </div>
                        
                        {/* Cột phải: Thống kê & Nút thao tác */}
                        <div className="flex items-center gap-4 shrink-0 border-t md:border-none border-[#e9ecef] pt-4 md:pt-0">
                          <div className="text-right pr-4 border-r border-[#dee2e6]">
                            <div className="text-[24px] font-black text-primary font-ui leading-none mb-1">
                              {stats.doneList.length} <span className="text-[13px] text-[#adb5bd] font-medium">/ {stats.total} HS</span>
                            </div>
                            <div className="text-[10px] font-bold text-[#6c757d] uppercase tracking-wider">Đã nộp bài</div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleCreateLiveSession(assign.id, selectedClass.id)} className="p-2 border border-[#dee2e6] hover:bg-[#f8d7da] hover:border-[#f5c2c7] text-[#dc3545] rounded-lg transition-colors flex items-center justify-center gap-1.5" title="Tạo phòng thi Live">
                              <span className="w-2 h-2 rounded-full bg-[#dc3545] animate-pulse"></span>
                            </button>
                            <button onClick={() => handleExportScores(assign.id, assign.title)} className="p-2 border border-[#dee2e6] hover:bg-[#d1e7dd] hover:border-[#a3cfbb] text-[#198754] rounded-lg transition-colors flex items-center justify-center" title="Xuất Bảng Điểm (Excel)">
                              <Download size={16}/>
                            </button>
                            <button onClick={() => setExpandedAssignId(isExpanded ? null : assign.id)} className="px-3 py-2 border border-[#dee2e6] bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#495057] font-bold rounded-lg flex items-center gap-1.5 transition-colors text-[12px]">
                              {isExpanded ? 'Đóng' : 'Chi tiết'} <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}/>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Chi tiết Nộp bài (Expand) */}
                      {isExpanded && (
                        <div className="p-5 border-t border-[#dee2e6] bg-[#f8f9fa] grid grid-cols-1 lg:grid-cols-2 gap-5">
                          
                          {/* Đã nộp */}
                          <div className="bg-white p-4 rounded-xl border border-[#dee2e6] shadow-sm">
                            <h5 className="font-bold text-[#198754] text-[13px] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-[#e9ecef] pb-2">
                              <CheckCircle2 size={16}/> Đã nộp bài ({stats.doneList.length})
                            </h5>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                              {stats.doneList.length === 0 ? <div className="text-[13px] text-[#adb5bd] text-center py-4">Chưa có ai nộp.</div> : stats.doneList.map((hs:any) => (
                                <div key={hs.id} className="flex flex-col p-3 bg-[#f8f9fa] rounded-lg border border-[#e9ecef]">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 bg-white border border-[#dee2e6] text-[#adb5bd] rounded flex items-center justify-center font-bold text-[12px] overflow-hidden shrink-0">
                                         {hs?.avatar_url ? <img src={hs.avatar_url} alt="Ava" className="w-full h-full object-cover"/> : (hs?.full_name?.charAt(0) || 'U')}
                                      </div>
                                      <div>
                                        <div className="text-[13px] font-bold text-[#212529]">{hs?.full_name}</div>
                                        <div className="text-[10px] text-[#6c757d] font-medium">{hs.attempts.length} lượt làm</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[10px] uppercase font-bold text-[#adb5bd] mb-0.5">Điểm max</div>
                                      <div className="font-black text-[16px] text-[#198754] font-ui">{Math.max(...hs.attempts.map((a:any)=>a.score))}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="pl-10 space-y-1">
                                    {hs.attempts.map((att:any, i: number) => (
                                      <div key={i} className="flex justify-between items-center text-[10px] font-medium text-[#6c757d]">
                                         <span>Lần {hs.attempts.length - i}: {new Date(att.created_at).toLocaleString('vi-VN')}</span>
                                         <span className="font-bold text-[#212529]">{att.score} đ</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Chưa nộp */}
                          <div className="bg-white p-4 rounded-xl border border-[#dee2e6] shadow-sm">
                            <h5 className="font-bold text-[#dc3545] text-[13px] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-[#e9ecef] pb-2">
                              <XCircle size={16}/> Chưa nộp bài ({stats.missingList.length})
                            </h5>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                              {stats.missingList.length === 0 ? <div className="text-[13px] text-[#198754] font-bold text-center py-4">Cả lớp đã hoàn thành!</div> : stats.missingList.map((hs:any) => (
                                <div key={hs.id} className="flex items-center justify-between p-2.5 bg-[#f8f9fa] border border-[#e9ecef] rounded-lg opacity-70 grayscale-[50%]">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 bg-white border border-[#dee2e6] text-[#adb5bd] rounded flex items-center justify-center font-bold text-[10px] overflow-hidden">
                                       {hs?.avatar_url ? <img src={hs.avatar_url} alt="Ava" className="w-full h-full object-cover"/> : (hs?.full_name?.charAt(0) || 'U')}
                                    </div>
                                    <div>
                                      <div className="text-[12px] font-bold text-[#495057]">{hs?.full_name}</div>
                                      {hs.isGhost && <div className="text-[9px] text-[#dc3545] uppercase font-bold">Chưa Đăng nhập</div>}
                                    </div>
                                  </div>
                                  <div className="text-[10px] font-bold uppercase text-[#dc3545] bg-[#f8d7da] px-1.5 py-0.5 rounded border border-[#f5c2c7]">Chưa làm</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            MODAL BÁO CÁO AI HỌC SINH 
            ========================================== */}
        {showStudentAiModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-xl p-8 shadow-bs-hover border border-[#dee2e6] relative">
              <button onClick={() => setShowStudentAiModal(false)} className="absolute top-4 right-4 p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] rounded-lg text-[#6c757d] transition-colors"><X size={18}/></button>
              
              <h3 className="text-[20px] font-bold text-[#212529] font-heading mb-2 flex items-center gap-2">
                <BrainCircuit className="text-[#ffc107]"/> Báo cáo năng lực cá nhân
              </h3>
              <p className="text-[12px] font-bold text-[#664d03] mb-6 bg-[#fff3cd] border border-[#ffecb5] px-3 py-1 rounded inline-block uppercase tracking-wider">
                Học sinh: {selectedStudentName}
              </p>
              
              <div className="prose prose-sm max-w-none leading-relaxed text-[#495057] border-t border-[#e9ecef] pt-6">
                {studentAiInsight ? (
                  <ReactMarkdown>{studentAiInsight}</ReactMarkdown>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[#adb5bd]">
                    <Loader2 size={32} className="animate-spin mb-3 text-[#ffc107]"/>
                    <p className="font-bold text-[14px]">FMath AI đang phân tích dữ liệu...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            MODAL THÊM HỌC SINH VÀO LỚP
            ========================================== */}
        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-xl p-8 shadow-bs-hover border border-[#dee2e6] relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[20px] font-bold font-heading text-[#212529]">Thêm Học Sinh</h3>
                <button onClick={() => setShowAddStudentModal(false)} className="p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] rounded-lg text-[#6c757d]"><X size={18} /></button>
              </div>
              
              <div className="flex gap-2 mb-6 border-b border-[#dee2e6]">
                <button onClick={() => setAddMode('manual')} className={`px-4 py-2 font-bold text-[13px] border-b-2 flex items-center gap-2 transition-colors ${addMode === 'manual' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d]'}`}><UserPlus size={14}/> Thủ công</button>
                <button onClick={() => setAddMode('excel')} className={`px-4 py-2 font-bold text-[13px] border-b-2 flex items-center gap-2 transition-colors ${addMode === 'excel' ? 'border-[#198754] text-[#198754]' : 'border-transparent text-[#6c757d]'}`}><FileSpreadsheet size={14}/> File Excel</button>
              </div>
              
              {addMode === 'manual' ? (
                <div className="space-y-4">
                  <input type="text" value={newStudentForm.name} onChange={e => setNewStudentForm({...newStudentForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-white focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] text-[#212529] outline-none" placeholder="Họ và tên (VD: Nguyễn Văn A) *"/>
                  <input type="email" value={newStudentForm.email} onChange={e => setNewStudentForm({...newStudentForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-white focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] text-[#212529] outline-none" placeholder="Email học sinh *"/>
                  <input type="text" value={newStudentForm.code} onChange={e => setNewStudentForm({...newStudentForm, code: e.target.value})} className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-[#f8f9fa] text-[14px] text-[#212529] outline-none" placeholder="Mã HS (Tùy chọn)"/>
                  <button onClick={handleAddStudentManually} disabled={isProcessing} className="btn-primary w-full mt-2 py-2.5 text-[14px] flex items-center justify-center gap-2 disabled:opacity-50">{isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Thêm học sinh</button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-3 bg-[#d1e7dd] border border-[#a3cfbb] rounded-lg text-[12px] font-medium text-[#0f5132]">
                    <span className="font-bold uppercase tracking-wider block mb-1">Hướng dẫn:</span> File Excel bắt buộc phải có 2 cột <strong>"Họ tên"</strong> và <strong>"Email"</strong>.
                  </div>
                  <label className="cursor-pointer flex flex-col items-center p-8 border-2 border-dashed border-[#dee2e6] rounded-xl hover:border-[#198754] hover:bg-[#f8f9fa] transition-colors">
                    {isProcessing ? <Loader2 size={32} className="animate-spin text-[#198754]"/> : <><UploadCloud size={32} className="text-[#adb5bd] mb-2"/><span className="font-bold text-[#495057] text-[14px]">Nhấn để tải file (.xlsx)</span><input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload}/></>}
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassManagement;