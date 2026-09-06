import React, { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, FileText, Bell, Send, User, 
  Trophy, Calendar, CheckCircle2, AlertCircle, PlayCircle,
  GraduationCap, Loader2, ArrowRight, BrainCircuit, ExternalLink, X, Mail
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';

const Classroom = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'feed' | 'assignments' | 'members'>('feed');

  // States Dữ liệu
  const [isLoading, setIsLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Quản lý nhiều lớp
  const [joinedClasses, setJoinedClasses] = useState<any[]>([]);
  const [currentClassId, setCurrentClassId] = useState<string | null>(null);

  // Modal Giáo viên
  const [showTeacherProfile, setShowTeacherProfile] = useState(false);

  // 1. Fetch danh sách lớp
  useEffect(() => {
    const fetchMyClasses = async () => {
      if (!currentUser?.id) return;
      setIsLoading(true);

      try {
        const { data: memberData } = await supabase
          .from('class_members')
          .select('class_id, classes(*)') 
          .eq('user_id', currentUser.id)
          .eq('status', 'joined');

        if (memberData && memberData.length > 0) {
          const classes = memberData.map(m => {
            const classObj = Array.isArray(m.classes) ? m.classes[0] : m.classes;
            return classObj;
          }).filter(Boolean);
          setJoinedClasses(classes);
          if (!currentClassId && classes.length > 0) setCurrentClassId(classes[0].id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Lỗi lấy danh sách lớp:", error);
        setIsLoading(false);
      }
    };

    fetchMyClasses();
  }, [currentUser]);

  // 2. Fetch chi tiết lớp
  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!currentClassId || !currentUser?.id) return;
      setIsLoading(true);

      try {
        const classData = joinedClasses.find(c => c.id === currentClassId);
        setClassInfo(classData);

        if (classData?.teacher_id) {
          const { data: teacherData } = await supabase.from('users').select('*').eq('id', classData.teacher_id).maybeSingle();
          setTeacherInfo(teacherData);
        }

        const { data: classMembers } = await supabase
          .from('class_members')
          .select('users(id, full_name, email, role, xp, avatar_url)')
          .eq('class_id', currentClassId)
          .eq('status', 'joined');
        
        if (classMembers) {
          const formattedMembers = classMembers.map((m: any) => {
            const userObj = Array.isArray(m.users) ? m.users[0] : m.users;
            return userObj;
          }).filter(Boolean);
          formattedMembers.sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));
          setMembers(formattedMembers);
        }

        const { data: assignsData } = await supabase
          .from('class_exams')
          .select('due_date, exams(id, title, type)')
          .eq('class_id', currentClassId)
          .order('due_date', { ascending: true });

        const { data: attemptsData } = await supabase
          .from('exam_attempts')
          .select('exam_id, score')
          .eq('user_id', currentUser.id);

        if (assignsData) {
          const formattedAssigns = assignsData.map((item: any) => {
            const examObj = Array.isArray(item.exams) ? item.exams[0] : item.exams;
            if (!examObj) return null;

            const studentAttempts = attemptsData?.filter(a => a.exam_id === examObj.id) || [];
            const isOverdue = new Date(item.due_date).getTime() < new Date().getTime();
            
            let status = 'todo';
            if (studentAttempts.length > 0) status = 'done';
            else if (isOverdue) status = 'overdue';

            return {
              id: examObj.id,
              title: examObj.title,
              type: examObj.type,
              dueDate: new Date(item.due_date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
              status: status,
              attemptsCount: studentAttempts.length,
              score: studentAttempts.length > 0 ? Math.max(...studentAttempts.map(a => a.score)) : null
            };
          }).filter(Boolean);
          setAssignments(formattedAssigns);
        }

        const { data: annData } = await supabase
          .from('class_announcements')
          .select('*')
          .eq('class_id', currentClassId)
          .order('created_at', { ascending: false });

        if (annData) setAnnouncements(annData);

      } catch (error) {
        console.error("Lỗi lấy chi tiết Lớp học:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassDetails();
  }, [currentClassId, joinedClasses, currentUser]);

  // ==========================================
  // RENDER TRẠNG THÁI LOADING / TRỐNG
  // ==========================================
  if (isLoading) {
    return (
      <div className="page-container items-center justify-center text-[#6c757d]">
        <Loader2 size={32} className="animate-spin mb-3 text-primary" />
        <p className="font-medium text-[14px]">Đang tải không gian lớp học...</p>
      </div>
    );
  }

  if (joinedClasses.length === 0 || !classInfo) {
    return (
      <div className="page-container items-center justify-center text-[#6c757d] p-4">
        <GraduationCap size={64} className="mb-4 opacity-30" />
        <h3 className="text-xl font-bold text-[#212529] mb-2 font-heading">Chưa tham gia lớp học</h3>
        <p className="font-medium text-center max-w-sm mb-6 text-[14px] leading-relaxed">
          Bạn hiện chưa được xếp vào lớp nào. Vui lòng xin Mã lớp (hoặc Link tham gia) từ giáo viên bộ môn nhé!
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary py-2.5 px-6 rounded-lg text-[14px]">
          Về trang chủ
        </button>
      </div>
    );
  }

  // ==========================================
  // RENDER MÀN HÌNH CHÍNH
  // ==========================================
  return (
    <div className="page-container relative animate-in fade-in">
      <div className="page-content custom-scrollbar md:p-8 pb-32">
        <div className="max-w-5xl mx-auto w-full">
          
          {/* --- THANH CHUYỂN ĐỔI LỚP HỌC --- */}
          {joinedClasses.length > 1 && (
            <div className="mb-6 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
              <span className="text-[13px] font-bold text-[#6c757d] whitespace-nowrap uppercase tracking-wider mr-2">Lớp của bạn:</span>
              {joinedClasses.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setCurrentClassId(cls.id)}
                  className={`px-4 py-2 rounded-lg font-bold text-[13px] whitespace-nowrap transition-colors border ${
                    currentClassId === cls.id 
                      ? 'bg-primary border-primary text-white' 
                      : 'bg-white border-[#dee2e6] text-[#495057] hover:bg-[#e9ecef]'
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          )}

          {/* --- CLASS COVER BANNER (FLAT UI) --- */}
          <div className="bg-white border border-[#dee2e6] rounded-xl p-6 md:p-8 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-primary">
            <div>
              <div className="bg-[#e7f1ff] text-primary text-[11px] font-bold px-2.5 py-1 rounded font-ui uppercase tracking-wider inline-flex items-center gap-1.5 mb-3">
                <GraduationCap size={14} /> FPT School
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading text-[#212529] m-0 mb-3 leading-snug">
                {classInfo.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-[#6c757d]">
                <span className="flex items-center gap-1.5 bg-[#f8f9fa] px-3 py-1.5 rounded-lg border border-[#e9ecef]">
                  <Users size={16} className="text-[#adb5bd]"/> {members.length} Sĩ tử
                </span>
              </div>
            </div>
            
            {/* Thẻ xem nhanh giáo viên */}
            <div 
              onClick={() => {setActiveTab('members'); setTimeout(() => setShowTeacherProfile(true), 100);}}
              className="shrink-0 flex items-center gap-3 bg-[#f8f9fa] border border-[#dee2e6] px-4 py-3 rounded-xl cursor-pointer hover:border-primary hover:bg-[#e7f1ff] transition-colors group w-full md:w-auto"
            >
              <div className="w-10 h-10 rounded-full bg-[#e9ecef] border border-[#dee2e6] overflow-hidden flex items-center justify-center font-bold text-[#adb5bd]">
                 {teacherInfo?.avatar_url ? <img src={teacherInfo.avatar_url} alt="GV" className="w-full h-full object-cover"/> : teacherInfo?.full_name?.charAt(0) || 'GV'}
              </div>
              <div>
                <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Giáo viên</div>
                <div className="text-[14px] font-bold text-[#212529] group-hover:text-primary transition-colors">
                  {teacherInfo?.full_name || 'Đang cập nhật'}
                </div>
              </div>
            </div>
          </div>

          {/* --- TABS --- */}
          <div className="flex items-center gap-1 border-b border-[#dee2e6] mb-6 overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setActiveTab('feed')} 
              className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}
            >
              <MessageSquare size={16} /> Bảng tin
            </button>
            <button 
              onClick={() => setActiveTab('assignments')} 
              className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'assignments' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}
            >
              <FileText size={16} /> Bài tập ({assignments.length})
            </button>
            <button 
              onClick={() => setActiveTab('members')} 
              className={`px-5 py-3 font-semibold text-[14px] flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'}`}
            >
              <Users size={16} /> Thành viên ({members.length})
            </button>
          </div>

          <div className="w-full">
            
            {/* ==========================================
                TAB 1: BẢNG TIN 
                ========================================== */}
            {activeTab === 'feed' && (
              <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4">
                {announcements.length === 0 ? (
                  <div className="text-center py-16 text-[#6c757d] bg-white border border-[#dee2e6] rounded-xl shadow-sm">
                    <Bell size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-[14px] m-0">Chưa có thông báo nào từ Giáo viên.</p>
                  </div>
                ) : (
                  announcements.map(ann => (
                    <div key={ann.id} className="bg-white p-6 rounded-xl border border-[#dee2e6] shadow-sm transition-all hover:border-[#b6d4fe]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#f8f9fa] border border-[#dee2e6] flex items-center justify-center font-bold text-[#adb5bd] overflow-hidden shrink-0">
                          {teacherInfo?.avatar_url ? <img src={teacherInfo.avatar_url} alt="GV" className="w-full h-full object-cover"/> : <User size={18}/>}
                        </div>
                        <div>
                          <div className="font-bold text-[#212529] text-[15px] flex items-center gap-1.5">
                            {teacherInfo?.full_name || 'Giáo viên'} <CheckCircle2 size={14} className="text-primary"/>
                          </div>
                          <div className="text-[12px] text-[#6c757d] font-medium">
                            {new Date(ann.created_at).toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      <p className="text-[#495057] leading-[1.8] text-[15px] whitespace-pre-line m-0 bg-[#f8f9fa] p-4 rounded-lg border border-[#e9ecef]">
                        {ann.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ==========================================
                TAB 2: BÀI TẬP 
                ========================================== */}
            {activeTab === 'assignments' && (
              <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4">
                {assignments.length === 0 ? (
                  <div className="text-center py-16 text-[#6c757d] bg-white border border-[#dee2e6] rounded-xl shadow-sm">
                     <FileText size={40} className="mx-auto mb-3 opacity-30" />
                     <p className="font-medium text-[14px] m-0">Giáo viên chưa giao bài tập nào.</p>
                  </div>
                ) : assignments.map(assignment => {
                  
                  let statusBg = "", statusText = "", StatusIcon = FileText;
                  
                  if (assignment.status === 'todo') {
                    statusBg = "bg-[#fff3cd] border-[#ffecb5] text-[#664d03]";
                    statusText = "Chưa làm";
                    StatusIcon = AlertCircle;
                  } else if (assignment.status === 'done') {
                    statusBg = "bg-[#d1e7dd] border-[#a3cfbb] text-[#0f5132]";
                    statusText = "Đã nộp";
                    StatusIcon = CheckCircle2;
                  } else {
                    statusBg = "bg-[#f8d7da] border-[#f5c2c7] text-[#842029]";
                    statusText = "Quá hạn";
                    StatusIcon = AlertCircle;
                  }

                  return (
                    <div key={assignment.id} className="bg-white p-5 md:p-6 rounded-xl border border-[#dee2e6] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[#b6d4fe] transition-colors">
                      <div className="flex items-start md:items-center gap-4">
                        <div className={`p-3 rounded-lg shrink-0 border ${statusBg} hidden sm:flex`}>
                          <StatusIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="bg-[#e9ecef] text-[#495057] text-[10px] font-bold px-2 py-0.5 rounded font-ui uppercase tracking-wider">
                              {assignment.type || 'Luyện tập'}
                            </span>
                          </div>
                          <h3 className="text-[16px] font-bold text-[#212529] mb-1.5 leading-snug font-heading">{assignment.title}</h3>
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#6c757d]">
                            <Calendar size={14}/> Hạn nộp: {assignment.dueDate}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center justify-between md:justify-end gap-4 border-t md:border-none border-[#e9ecef] pt-4 md:pt-0 w-full md:w-auto shrink-0">
                        <div className="text-center md:text-right w-full sm:w-auto">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#adb5bd] mb-0.5">Trạng thái</div>
                          <div className={`font-bold text-[15px] ${
                            assignment.status === 'todo' ? 'text-[#fd7e14]' : 
                            assignment.status === 'done' ? 'text-[#198754]' : 'text-[#dc3545]'
                          }`}>
                            {assignment.status === 'done' ? `${assignment.score} Điểm` : statusText}
                          </div>
                          {assignment.status === 'done' && (
                            <div className="text-[11px] text-[#6c757d] font-medium mt-0.5">Đã làm {assignment.attemptsCount} lượt</div>
                          )}
                        </div>
                        
                        <Link 
                          to={`/quiz/${assignment.id}`}
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-[14px] transition-colors text-center ${
                            assignment.status === 'todo' 
                              ? 'btn-primary' 
                              : 'bg-[#f8f9fa] border border-[#dee2e6] text-[#212529] hover:bg-[#e9ecef]'
                          }`}
                        >
                          {assignment.status === 'done' ? 'Làm lại' : 'Làm ngay'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ==========================================
                TAB 3: THÀNH VIÊN 
                ========================================== */}
            {activeTab === 'members' && (
              <div className="animate-in slide-in-from-bottom-4">
                
                <div className="mb-8">
                  <h3 className="text-[14px] font-bold text-[#6c757d] uppercase tracking-wider mb-3 font-heading">
                    Giáo viên chủ nhiệm
                  </h3>
                  {teacherInfo ? (
                    <div 
                      onClick={() => setShowTeacherProfile(true)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#dee2e6] shadow-sm max-w-sm hover:border-primary hover:bg-[#e7f1ff] transition-colors cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#f8f9fa] border border-[#dee2e6] flex items-center justify-center font-bold text-[16px] text-[#6c757d] overflow-hidden shrink-0">
                        {teacherInfo.avatar_url ? <img src={teacherInfo.avatar_url} alt="Ava" className="w-full h-full object-cover"/> : teacherInfo.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#212529] text-[15px] group-hover:text-primary transition-colors truncate">{teacherInfo.full_name}</div>
                        <div className="text-[12px] text-[#6c757d] font-medium truncate">{teacherInfo.email || 'Giáo viên FMath'}</div>
                      </div>
                      <ExternalLink size={18} className="text-[#adb5bd] group-hover:text-primary" />
                    </div>
                  ) : (
                    <div className="text-[13px] text-[#6c757d] italic">Đang cập nhật thông tin giáo viên...</div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-[#dee2e6] pb-2">
                    <h3 className="text-[14px] font-bold text-[#6c757d] uppercase tracking-wider font-heading m-0">
                      Sĩ tử trong lớp ({members.length})
                    </h3>
                    <span className="text-[11px] font-bold text-[#adb5bd] uppercase bg-[#f8f9fa] border border-[#dee2e6] px-2 py-1 rounded">Xếp hạng XP</span>
                  </div>

                  <div className="bg-white border border-[#dee2e6] rounded-xl shadow-sm overflow-hidden divide-y divide-[#e9ecef]">
                    {members.map((student, idx) => (
                      <div key={student.id} className="flex items-center gap-4 p-3 md:p-4 hover:bg-[#f8f9fa] transition-colors">
                        
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 border ${
                          idx === 0 ? 'bg-[#fff3cd] text-[#ffc107] border-[#ffecb5]' :
                          idx === 1 ? 'bg-[#e2e3e5] text-[#6c757d] border-[#d3d6d8]' :
                          idx === 2 ? 'bg-[#f8d7da] text-[#dc3545] border-[#f5c2c7]' : 'bg-[#f8f9fa] border-[#dee2e6] text-[#6c757d]'
                        }`}>
                          {idx === 0 ? <Trophy size={16}/> : idx + 1}
                        </div>

                        <div className="w-10 h-10 rounded-full bg-[#e9ecef] border border-[#dee2e6] shrink-0 overflow-hidden flex items-center justify-center text-[#adb5bd]">
                          {student.avatar_url ? <img src={student.avatar_url} alt="Ava" className="w-full h-full object-cover"/> : <User size={18}/>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#212529] text-[14px] truncate flex items-center gap-2">
                            {student.full_name} 
                            {currentUser.id === student.id && <span className="bg-[#d1e7dd] text-[#198754] text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Bạn</span>}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-[15px] text-[#fd7e14] font-ui leading-none">
                            {student.xp || 0}
                          </div>
                          <div className="text-[10px] font-bold text-[#adb5bd] uppercase mt-0.5">XP</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>

      {/* ==========================================
          MODAL THÔNG TIN GIÁO VIÊN 
          ========================================== */}
      {showTeacherProfile && teacherInfo && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in px-4">
          <div className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-bs-hover border border-[#dee2e6] scale-in-center relative">
            <button 
              onClick={() => setShowTeacherProfile(false)} 
              className="absolute top-4 right-4 p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] border border-[#dee2e6] rounded-lg text-[#6c757d] transition-colors"
            >
              <X size={18}/>
            </button>

            <div className="w-20 h-20 mx-auto rounded-full bg-[#f8f9fa] border border-[#dee2e6] text-[#adb5bd] flex items-center justify-center font-bold text-2xl overflow-hidden mb-4 shadow-sm">
              {teacherInfo.avatar_url ? <img src={teacherInfo.avatar_url} alt="Ava" className="w-full h-full object-cover"/> : <User size={32}/>}
            </div>

            <h2 className="text-xl font-bold text-[#212529] mb-1 font-heading">{teacherInfo.full_name}</h2>
            <p className="text-primary font-bold text-[12px] uppercase tracking-wider mb-6 bg-[#e7f1ff] inline-block px-3 py-1 rounded">Giáo viên chủ nhiệm</p>

            <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#dee2e6] mb-6 text-left">
               <div className="text-[11px] font-bold text-[#6c757d] uppercase mb-2 tracking-wider">Liên hệ</div>
               <div className="font-medium text-[#212529] text-[14px] flex items-center gap-3">
                  <Mail size={16} className="text-[#adb5bd] shrink-0"/> 
                  <span className="truncate">{teacherInfo.email || 'Chưa cập nhật email'}</span>
               </div>
            </div>

            <a
              href={`mailto:${teacherInfo.email}`}
              className="btn-primary w-full py-2.5 text-[14px] flex items-center justify-center gap-2"
            >
              <Send size={16} /> Gửi Email
            </a>
          </div>
        </div>
      )}

    </div>
  );
};

export default Classroom;