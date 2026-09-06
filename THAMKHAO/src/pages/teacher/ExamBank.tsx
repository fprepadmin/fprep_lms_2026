import React, { useState, useEffect } from 'react';
import { 
  Library, PlusCircle, FileText, Clock, Users, PlayCircle, 
  Edit3, Trash2, Send, Loader2, BookOpen, GraduationCap, X, 
  Save, CalendarClock, History, LayoutTemplate, ListChecks, 
  Folder, ChevronDown, ChevronRight 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { examService } from '../../services/examService';
import { supabase } from '../../config/supabase';

const ExamBank = () => {
  const { currentUser } = useAppStore();
  const location = useLocation(); 
  const navigate = useNavigate(); 
  
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('Đề theo bài');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  
  const [assignForm, setAssignForm] = useState({ classId: '', dueDate: '' });
  const [isAssigning, setIsAssigning] = useState(false);
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [editDates, setEditDates] = useState<Record<string, string>>({});

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingExam, setEditingExam] = useState({
    id: '', title: '', type: 'Đề theo bài', timeLimit: 45, group_name: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [examsData, classesData] = await Promise.all([
        examService.getActiveExams(),
        examService.getTeacherClasses(currentUser.id)
      ]);
      setExams(examsData);
      setTeacherClasses(classesData);
      if (classesData.length > 0) setAssignForm(prev => ({...prev, classId: classesData[0].id}));
      setIsLoading(false);

      if (location.state && (location.state as any).activeTab) {
        setActiveTab((location.state as any).activeTab);
      }
    };
    fetchData();
  }, [currentUser, location.key]); 

  const formatToLocalDatetime = (isoString: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const loadAssignments = async (examId: string) => {
    setIsLoadingAssignments(true);
    const { data, error } = await supabase
      .from('class_exams')
      .select(`class_id, due_date, classes (name)`)
      .eq('exam_id', examId);
    
    if (data) {
      setAssignments(data);
      const initialDates: Record<string, string> = {};
      data.forEach(item => { initialDates[item.class_id] = formatToLocalDatetime(item.due_date); });
      setEditDates(initialDates);
    }
    setIsLoadingAssignments(false);
  };

  const handleOpenAssignModal = (exam: any) => {
    if (teacherClasses.length === 0) return alert("Bạn chưa tạo lớp học nào. Hãy vào Quản lý lớp học để tạo lớp trước!");
    setSelectedExam(exam);
    setShowAssignModal(true);
    loadAssignments(exam.id); 
  };

  const handleAssignExam = async () => {
    if (!assignForm.classId || !assignForm.dueDate) return alert("Vui lòng chọn Lớp và đặt Hạn chót!");
    if (assignments.some(a => a.class_id === assignForm.classId)) {
      return alert("Lớp này đã được giao đề rồi! Vui lòng chỉnh sửa hạn chót ở danh sách bên dưới.");
    }

    setIsAssigning(true);
    const { error } = await supabase.from('class_exams').insert({
      class_id: assignForm.classId,
      exam_id: selectedExam.id,
      due_date: new Date(assignForm.dueDate).toISOString()
    });

    if (error) alert("Lỗi giao bài: " + error.message);
    else {
      alert("Giao bài tập thành công!"); 
      loadAssignments(selectedExam.id); 
    }
    setIsAssigning(false);
  };

  const handleUpdateAssignment = async (classId: string) => {
    const newDate = editDates[classId];
    if (!newDate) return;

    const { error } = await supabase.from('class_exams')
      .update({ due_date: new Date(newDate).toISOString() })
      .eq('exam_id', selectedExam.id)
      .eq('class_id', classId);

    if (error) alert("Lỗi cập nhật: " + error.message);
    else alert("Đã cập nhật Hạn chót mới thành công!");
  };

  const handleDeleteAssignment = async (classId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn thu hồi đề thi khỏi lớp này? Các học sinh chưa làm sẽ không thấy đề nữa.")) return;
    
    const { error } = await supabase.from('class_exams')
      .delete()
      .eq('exam_id', selectedExam.id)
      .eq('class_id', classId);

    if (error) alert("Lỗi thu hồi: " + error.message);
    else loadAssignments(selectedExam.id);
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm("CẢNH BÁO: Xóa đề thi này sẽ xóa sạch kết quả làm bài của học sinh. Chắc chắn xóa?")) return;
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (!error) setExams(prev => prev.filter(exam => exam.id !== id));
  };

  const openEditModal = (exam: any) => {
    setEditingExam({ 
      id: exam.id, 
      title: exam.title, 
      type: exam.type, 
      timeLimit: Math.floor(exam.time_limit / 60),
      group_name: exam.group_name || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateExam = async () => {
    if (!editingExam.title.trim()) return alert("Vui lòng nhập tên đề thi!");
    setIsSavingEdit(true);
    const { error } = await supabase.from('exams').update({
      title: editingExam.title, 
      type: editingExam.type, 
      time_limit: editingExam.timeLimit * 60,
      group_name: editingExam.group_name
    }).eq('id', editingExam.id);

    if (!error) {
      setExams(prev => prev.map(e => e.id === editingExam.id ? { 
        ...e, 
        title: editingExam.title, 
        type: editingExam.type, 
        time_limit: editingExam.timeLimit * 60,
        group_name: editingExam.group_name
      } : e));
      setShowEditModal(false);
      if (editingExam.type !== activeTab) setActiveTab(editingExam.type);
    }
    setIsSavingEdit(false);
  };

  const filteredExams = exams.filter(exam => exam.type === activeTab);

  const groupedExams = filteredExams.reduce((acc, exam) => {
    const group = exam.group_name?.trim() || 'Khác (Chưa phân nhóm)';
    if (!acc[group]) acc[group] = [];
    acc[group].push(exam);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: prev[groupName] === false ? true : false }));
  };

  const handleCreateLiveSession = async (exam: any) => {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

      const startTime = new Date();
      const endTime = new Date(Date.now() + 3 * 3600000); // 3 tiếng sau

      const { data, error } = await supabase.from('live_sessions').insert({
        exam_id: exam.id,
        exam_title: exam.title,
        access_code: code,
        status: 'PENDING',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_active: true,
        created_by: currentUser.id
      }).select().single();

      if (error) throw error;

      alert(`Đã khởi tạo Ca thi Live thành công!\nMã phòng thi (Code): ${code}`);
      navigate(`/live-monitor/${data.id}`);
    } catch (err: any) {
      alert("Lỗi tạo Ca thi Live: " + err.message);
    }
  };

  const TABS = ['Đề theo bài', 'Chuyên đề', 'Đề luyện thi', 'ĐGNL', 'VSAT'];

  return (
    <div className="page-container relative animate-in fade-in">
      <div className="page-content custom-scrollbar">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* HEADER */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-[#212529] mb-2 flex items-center gap-2">
                <Library className="text-primary"/> Ngân hàng Đề thi
              </h2>
              <p className="text-[#6c757d] font-medium text-[14px]">Khởi tạo và quản lý các bộ đề thi. Bấm "Giao đề" để chuyển bài tập tới lớp học.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link to="/exam-creator" className="bg-white hover:bg-[#f8f9fa] text-[#495057] border border-[#dee2e6] px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors text-[13px] shadow-sm">
                <LayoutTemplate size={16} /> Ghép đề từ Kho
              </Link>
              <Link to="/exam-editor" className="btn-primary flex items-center justify-center gap-2 transition-colors shadow-sm">
                <PlusCircle size={16} /> Soạn đề AI nâng cao
              </Link>
            </div>
          </div>

          {/* TABS */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 mb-6">
            {TABS.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-5 py-2.5 rounded-lg font-bold text-[13px] transition-colors border ${
                  activeTab === tab 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white text-[#6c757d] border-[#dee2e6] hover:bg-[#e9ecef]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {tab === 'Đề theo bài' || tab === 'Chuyên đề' ? <BookOpen size={16} /> : <GraduationCap size={16} />}
                  {tab}
                </div>
              </button>
            ))}
          </div>

          {/* HIỂN THỊ DANH SÁCH ĐỀ THI */}
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32}/></div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center p-12 text-[#adb5bd] bg-white border border-[#dee2e6] rounded-xl shadow-sm">
              <Library size={48} className="mx-auto mb-3 opacity-30"/>
              <p className="font-medium text-[14px]">Chưa có <strong className="text-primary">{activeTab}</strong> nào trong kho.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedExams).map(([groupName, groupExams]) => {
                const isExpanded = expandedGroups[groupName] !== false; 
                return (
                  <div key={groupName} className="bg-white rounded-xl border border-[#dee2e6] shadow-sm overflow-hidden">
                    
                    {/* Header Group */}
                    <div 
                      onClick={() => toggleGroup(groupName)}
                      className="flex items-center justify-between p-4 bg-[#f8f9fa] border-b border-[#dee2e6] cursor-pointer hover:bg-[#e9ecef] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="text-[#0d6efd]" size={20} />
                        <h3 className="text-[16px] font-bold text-[#212529] font-heading m-0">
                          {groupName} <span className="text-[13px] font-medium text-[#6c757d] ml-1">({groupExams.length} đề)</span>
                        </h3>
                      </div>
                      {isExpanded ? <ChevronDown size={18} className="text-[#adb5bd]"/> : <ChevronRight size={18} className="text-[#adb5bd]"/>}
                    </div>

                    {/* Danh sách đề trong Group */}
                    {isExpanded && (
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-white">
                        {groupExams.map(exam => (
                          <div key={exam.id} className="bg-white rounded-xl border border-[#dee2e6] shadow-sm hover:border-[#b6d4fe] transition-all flex flex-col group relative">
                            
                            <div className="p-5 flex-1">
                              <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-[#d1e7dd] text-[#0f5132] border border-[#a3cfbb]">Đang mở</span>
                                
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => navigate('/exam-editor', { state: { examId: exam.id } })} className="p-1.5 text-[#adb5bd] hover:text-[#198754] hover:bg-[#d1e7dd] rounded transition-colors" title="Sửa nội dung đề thi"><ListChecks size={14}/></button>
                                  <button onClick={() => openEditModal(exam)} className="p-1.5 text-[#adb5bd] hover:text-primary hover:bg-[#e7f1ff] rounded transition-colors" title="Cấu hình tên/thời gian"><Edit3 size={14}/></button>
                                  <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 text-[#adb5bd] hover:text-[#dc3545] hover:bg-[#f8d7da] rounded transition-colors" title="Xóa đề thi"><Trash2 size={14}/></button>
                                </div>
                              </div>
                              
                              <h3 className="text-[15px] font-bold text-[#212529] mb-4 line-clamp-2 leading-snug font-heading">{exam.title}</h3>
                              
                              <div className="space-y-2 mt-auto">
                                <div className="flex items-center justify-between text-[12px] font-medium text-[#6c757d]">
                                  <span className="flex items-center gap-1.5"><Clock size={14}/> Thời gian</span>
                                  <span className="font-bold text-[#212529]">{Math.floor(exam.time_limit/60)} phút</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px] font-medium text-[#6c757d]">
                                  <span className="flex items-center gap-1.5"><Users size={14}/> Lượt thi</span>
                                  <span className="font-bold text-[#212529]">{exam.participants} lượt</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 border-t border-[#e9ecef] divide-x divide-[#e9ecef] bg-[#f8f9fa] rounded-b-xl overflow-hidden">
                              <button onClick={() => handleOpenAssignModal(exam)} className="py-2 text-primary font-bold text-[12px] hover:bg-[#e7f1ff] transition-colors flex items-center justify-center gap-1">
                                <Send size={13} /> Giao bài
                              </button>
                              <button onClick={() => handleCreateLiveSession(exam)} className="py-2 text-[#052c65] font-bold text-[12px] hover:bg-[#e7f1ff] transition-colors flex items-center justify-center gap-1">
                                <PlayCircle size={13} className="text-primary"/> Ca Live
                              </button>
                              <Link to={`/quiz/${exam.id}`} className="py-2 text-[#495057] font-bold text-[12px] hover:bg-[#e9ecef] transition-colors flex items-center justify-center gap-1">
                                Xem
                              </Link>
                            </div>

                          </div>
                        ))}
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
          MODAL SỬA CẤU HÌNH ĐỀ 
          ========================================== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-xl p-6 md:p-8 shadow-bs-hover border border-[#dee2e6] relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] font-bold text-[#212529] font-heading">Sửa cấu hình đề</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] rounded-lg text-[#6c757d] transition-colors"><X size={18}/></button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Tên đề thi</label>
                <input 
                  type="text" 
                  value={editingExam.title} 
                  onChange={e => setEditingExam({...editingExam, title: e.target.value})} 
                  className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] font-medium text-[#212529]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Tên Nhóm / Bộ đề</label>
                <input 
                  type="text" 
                  value={editingExam.group_name} 
                  onChange={e => setEditingExam({...editingExam, group_name: e.target.value})} 
                  className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] font-medium text-[#212529]" 
                  placeholder="VD: Bộ đề Toán Sở Hà Nội..."
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Loại đề</label>
                <select 
                  value={editingExam.type} 
                  onChange={e => setEditingExam({...editingExam, type: e.target.value})} 
                  className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] font-medium text-[#212529] bg-white"
                >
                  {TABS.map(tab => (
                    <option key={tab} value={tab}>{tab}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Thời gian (Phút)</label>
                <input 
                  type="number" 
                  value={editingExam.timeLimit} 
                  onChange={e => setEditingExam({...editingExam, timeLimit: Number(e.target.value)})} 
                  className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[14px] font-medium text-[#212529]"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setShowEditModal(false)} className="flex-1 bg-[#f8f9fa] hover:bg-[#e9ecef] border border-[#dee2e6] text-[#495057] font-bold py-2.5 rounded-lg transition-colors text-[14px]">Hủy</button>
              <button onClick={handleUpdateExam} disabled={isSavingEdit} className="flex-1 btn-primary py-2.5 rounded-lg flex justify-center items-center gap-2 text-[14px] disabled:opacity-50">
                {isSavingEdit ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL QUẢN LÝ GIAO BÀI 
          ========================================== */}
      {showAssignModal && selectedExam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#f8f9fa] w-full max-w-2xl rounded-xl shadow-bs-hover border border-[#dee2e6] relative flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 bg-white border-b border-[#dee2e6] rounded-t-xl shrink-0">
              <div>
                <h3 className="text-[20px] font-bold text-[#212529] font-heading mb-1">Quản lý Giao bài</h3>
                <p className="text-[13px] font-bold text-primary max-w-md truncate">{selectedExam.title}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] rounded-lg text-[#6c757d] transition-colors border border-[#dee2e6]"><X size={18}/></button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              
              {/* Box Giao đề mới */}
              <div className="bg-white p-5 rounded-xl border border-[#dee2e6] shadow-sm">
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#495057] mb-4 flex items-center gap-2 border-b border-[#e9ecef] pb-2">
                  <Send size={16} className="text-primary"/> Giao đề cho lớp mới
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Chọn lớp học</label>
                    <select 
                      value={assignForm.classId} 
                      onChange={e => setAssignForm({...assignForm, classId: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[13px] font-bold text-[#212529]"
                    >
                      {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Hạn chót nộp bài</label>
                    <input 
                      type="datetime-local" 
                      value={assignForm.dueDate} 
                      onChange={e => setAssignForm({...assignForm, dueDate: e.target.value})} 
                      className="w-full px-4 py-2.5 rounded-lg border border-[#dee2e6] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[13px] font-bold text-[#212529]"
                    />
                  </div>
                </div>
                <button onClick={handleAssignExam} disabled={isAssigning} className="w-full bg-[#198754] hover:bg-[#157347] text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-[14px] disabled:opacity-50">
                  {isAssigning ? <Loader2 size={16} className="animate-spin"/> : <PlusCircle size={16}/>} Xác nhận Giao bài
                </button>
              </div>

              {/* Danh sách lớp đã giao */}
              <div>
                <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#495057] mb-4 flex items-center gap-2 border-b border-[#dee2e6] pb-2">
                  <History size={16} className="text-[#adb5bd]"/> Các lớp đang được giao đề này
                </h4>
                
                {isLoadingAssignments ? (
                  <div className="flex justify-center p-6"><Loader2 className="animate-spin text-primary"/></div>
                ) : assignments.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-[#dee2e6] bg-white rounded-xl text-[#adb5bd] font-medium text-[13px]">
                    Đề này chưa được giao cho lớp nào.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div key={assignment.class_id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-[#dee2e6] rounded-xl shadow-sm gap-4">
                        
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#e7f1ff] text-primary border border-[#b6d4fe] flex items-center justify-center font-bold text-[14px] uppercase">
                            {assignment.classes?.name.substring(0,2)}
                          </div>
                          <div>
                            <p className="font-bold text-[#212529] text-[14px]">{assignment.classes?.name}</p>
                            <p className="text-[11px] text-[#6c757d] font-medium flex items-center gap-1 mt-0.5"><CalendarClock size={12}/> Chỉnh sửa hạn chót:</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input 
                            type="datetime-local" 
                            value={editDates[assignment.class_id] || ''} 
                            onChange={(e) => setEditDates(prev => ({...prev, [assignment.class_id]: e.target.value}))}
                            className="px-3 py-1.5 rounded bg-[#f8f9fa] border border-[#dee2e6] focus:outline-none focus:border-primary text-[12px] font-bold text-[#212529]"
                          />
                          <button 
                            onClick={() => handleUpdateAssignment(assignment.class_id)} 
                            className="p-1.5 bg-[#e7f1ff] hover:bg-[#cfe2ff] text-primary rounded border border-[#b6d4fe] transition-colors" 
                            title="Lưu Hạn chót mới"
                          >
                            <Save size={16}/>
                          </button>
                          <button 
                            onClick={() => handleDeleteAssignment(assignment.class_id)} 
                            className="p-1.5 bg-[#f8d7da] hover:bg-[#f5c2c7] text-[#dc3545] rounded border border-[#f1aeb5] transition-colors" 
                            title="Thu hồi bài tập"
                          >
                            <Trash2 size={16}/>
                          </button>
                          
                          <button onClick={() => handleCreateLiveSession(selectedExam.id, assignment.class_id)} className="p-1.5 bg-[#fff3cd] hover:bg-[#ffecb5] text-[#997404] rounded border border-[#ffe69c] transition-colors font-bold text-[12px] flex items-center gap-1 ml-1" title="Tạo phòng thi Live">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#dc3545] animate-pulse"></span> Live
                          </button>
                        </div>
                        
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExamBank;