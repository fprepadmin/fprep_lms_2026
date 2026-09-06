import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Server, Activity, BookOpen, UserCheck, Shield, Clock, 
  Database, Library, ChevronLeft, ChevronRight, PlusCircle, Video, FileText,
  Cpu, Globe, Zap, AlertTriangle, CheckCircle2, Search, Settings, 
  Network, HardDrive, Edit3, Ban, Unlock, Trash2, Download, RefreshCcw,
  X, Loader2, ShieldCheck
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../config/supabase';

const AdminDashboard = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  
  // UI States
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'iam' | 'classes' | 'database' | 'content' | 'settings'>('overview');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const [isLoading, setIsLoading] = useState(false);

  // Data States
  const [stats, setStats] = useState({ users: 0, teachers: 0, classes: 0, lessons: 0, exams: 0, attempts: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  
  // States cho Tab IAM & Classes
  const [usersList, setUsersList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState("");

  // ==========================================
  // FETCH DỮ LIỆU (REAL DATA)
  // ==========================================
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Lấy thông số tổng quan
      const [usersRes, teachersRes, classRes, lessonRes, examRes, attemptRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('lessons').select('*', { count: 'exact', head: true }),
        supabase.from('exams').select('*', { count: 'exact', head: true }),
        supabase.from('exam_attempts').select('*', { count: 'exact', head: true })
      ]);
      
      setStats({
        users: usersRes.count || 0,
        teachers: teachersRes.count || 0,
        classes: classRes.count || 0,
        lessons: lessonRes.count || 0,
        exams: examRes.count || 0,
        attempts: attemptRes.count || 0
      });

      // 2. Lấy Logs hoạt động
      const { data: logs } = await supabase
        .from('exam_attempts')
        .select('id, created_at, score, users(full_name, role), exams(title)')
        .order('created_at', { ascending: false })
        .limit(15);
      if (logs) setRecentLogs(logs);

      // 3. Lấy Danh sách Users (cho Tab IAM)
      const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (users) setUsersList(users);

      // 4. Lấy Danh sách Lớp (cho Tab Classes)
      const { data: cls } = await supabase.from('classes').select('*, users(full_name), class_members(count)').order('created_at', { ascending: false });
      if (cls) setClassesList(cls);

    } catch (error) {
      console.error("Lỗi lấy dữ liệu Admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // ĐĂNG KÝ SUPABASE REALTIME
    const channel = supabase.channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_attempts' }, () => {
        fetchAllData(); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchAllData(); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        fetchAllData(); 
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('CONNECTED');
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnectionStatus('DISCONNECTED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ==========================================
  // HÀNH ĐỘNG QUẢN TRỊ VIÊN (IAM & CLASSES)
  // ==========================================
  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'banned') => {
    if (!window.confirm(`Xác nhận ${newStatus === 'active' ? 'mở khóa' : 'khóa'} tài khoản này?`)) return;
    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
    if (!error) setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
  };

  // States cho Modal Đổi Vai trò
  const [roleModalUser, setRoleModalUser] = useState<any | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const openRoleModal = (user: any) => {
    setRoleModalUser(user);
    setSelectedNewRole(user.role || 'student');
  };

  const submitRoleChange = async () => {
    if (!roleModalUser) return;
    setIsUpdatingRole(true);
    const { error } = await supabase.from('users').update({ role: selectedNewRole }).eq('id', roleModalUser.id);
    if (!error) {
      setUsersList(prev => prev.map(u => u.id === roleModalUser.id ? { ...u, role: selectedNewRole } : u));
      setRoleModalUser(null);
      alert(`Cập nhật quyền thành công cho ${roleModalUser.full_name || roleModalUser.email}: ${selectedNewRole === 'admin' ? 'Quản trị viên' : selectedNewRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}!`);
    } else {
      alert("Lỗi cập nhật quyền: " + error.message);
    }
    setIsUpdatingRole(false);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('Cảnh báo: Xóa lớp học sẽ xóa toàn bộ thành viên trong lớp. Tiếp tục?')) return;
    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (!error) setClassesList(prev => prev.filter(c => c.id !== classId));
  };

  const exportUserData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(usersList, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "users_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filteredUsers = usersList.filter(u => 
    (u.full_name || '').toLowerCase().includes(searchUser.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase())
  );

  const internalMenu = [
    { id: 'overview', icon: <Activity size={18}/>, label: 'Tổng quan Hệ thống' },
    { id: 'iam', icon: <Users size={18}/>, label: 'Định danh (IAM)' },
    { id: 'content', icon: <BookOpen size={18}/>, label: 'Quản lý Bài đăng' },
    { id: 'classes', icon: <Network size={18}/>, label: 'Phiên Lớp học' },
    { id: 'database', icon: <Database size={18}/>, label: 'Cơ sở Dữ liệu' },
    { id: 'settings', icon: <Settings size={18}/>, label: 'Cấu hình Môi trường' },
  ];

  return (
    <div className="page-container flex-row bg-[#f8f9fa] overflow-hidden">
      
      {/* --- MENU NỘI BỘ --- */}
      <div className={`transition-all duration-300 ease-in-out ${isMenuCollapsed ? 'w-[72px]' : 'w-64'} bg-white border-r border-[#dee2e6] flex flex-col shrink-0 z-20 relative`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#dee2e6] shrink-0">
          {!isMenuCollapsed && <span className="font-bold text-[14px] text-[#212529] font-heading tracking-wide">FMath Console</span>}
          <button 
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} 
            className={`p-2 rounded-md hover:bg-[#f8f9fa] text-[#6c757d] transition-colors ${isMenuCollapsed ? 'mx-auto' : ''}`}
          >
            {isMenuCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3 custom-scrollbar">
          {internalMenu.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center p-3 rounded-lg transition-colors text-[13px] font-bold ${
                activeTab === item.id 
                  ? 'bg-primary text-white' 
                  : 'text-[#495057] hover:bg-[#f8f9fa] hover:text-[#212529]'
              }`}
              title={isMenuCollapsed ? item.label : undefined}
            >
              <div className={`shrink-0 ${isMenuCollapsed ? 'mx-auto' : 'mr-3'}`}>{item.icon}</div>
              {!isMenuCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Global Connection Status */}
        <div className="p-4 border-t border-[#dee2e6] shrink-0 bg-[#f8f9fa]">
          <div className={`flex items-center gap-2 ${isMenuCollapsed ? 'justify-center' : ''}`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              connectionStatus === 'CONNECTED' ? 'bg-[#198754] animate-pulse' : 
              connectionStatus === 'CONNECTING' ? 'bg-[#ffc107]' : 'bg-[#dc3545]'
            }`}></span>
            {!isMenuCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c757d]">
                {connectionStatus === 'CONNECTED' ? `Đã kết nối` : connectionStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* --- KHU VỰC HIỂN THỊ CHÍNH (MAIN AREA) --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8f9fa]">
        
        {/* Top Bar Header */}
        <div className="h-16 bg-white border-b border-[#dee2e6] flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 text-[12px] font-bold text-[#6c757d] uppercase tracking-wider">
            <span>FMath Core</span> <ChevronRight size={14}/> 
            <span className="text-primary font-black">
              {internalMenu.find(m => m.id === activeTab)?.label}
            </span>
          </div>
          <button onClick={fetchAllData} className="flex items-center gap-2 text-[13px] font-bold text-[#495057] hover:text-primary transition-colors bg-[#f8f9fa] px-3 py-1.5 rounded border border-[#dee2e6]">
            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""}/> Làm mới
          </button>
        </div>

        {/* NỘI DUNG CÁC TAB */}
        <div className="page-content custom-scrollbar p-6">
          <div className="max-w-7xl mx-auto">

            {/* ========================================================= */}
            {/* TAB 1: OVERVIEW (TỔNG QUAN) */}
            {/* ========================================================= */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                  <h1 className="text-[20px] font-bold text-[#212529] font-heading flex items-center gap-2 m-0">
                    <Activity size={22} className="text-primary"/> Giám sát Sức khỏe Hệ thống
                  </h1>
                  {connectionStatus === 'CONNECTED' && (
                    <span className="bg-[#d1e7dd] text-[#0f5132] border border-[#a3cfbb] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Zap size={12}/> Đang hoạt động
                    </span>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Tài khoản', value: stats.users, icon: <Users size={18}/>, color: 'text-primary', bg: 'bg-[#e7f1ff]' },
                    { label: 'Giáo viên', value: stats.teachers, icon: <UserCheck size={18}/>, color: 'text-[#6f42c1]', bg: 'bg-[#e0cffc]' },
                    { label: 'Lớp học', value: stats.classes, icon: <Network size={18}/>, color: 'text-[#198754]', bg: 'bg-[#d1e7dd]' },
                    { label: 'Đề thi', value: stats.exams, icon: <Library size={18}/>, color: 'text-[#fd7e14]', bg: 'bg-[#fff3cd]' },
                    { label: 'Bài giảng', value: stats.lessons, icon: <BookOpen size={18}/>, color: 'text-[#d63384]', bg: 'bg-[#f8d7da]' },
                    { label: 'Lượt nộp bài', value: stats.attempts, icon: <Activity size={18}/>, color: 'text-[#dc3545]', bg: 'bg-[#f8d7da]' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white border border-[#dee2e6] p-5 rounded-xl shadow-sm flex flex-col items-center text-center">
                      <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color} mb-3`}>{stat.icon}</div>
                      <div className="text-[20px] font-black text-[#212529] font-ui leading-none mb-1">{stat.value.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-[#6c757d] uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Nhật ký hoạt động */}
                  <div className="lg:col-span-2 bg-white rounded-xl border border-[#dee2e6] shadow-sm flex flex-col h-[400px]">
                    <div className="p-4 border-b border-[#dee2e6] flex justify-between items-center bg-[#f8f9fa] rounded-t-xl">
                      <h3 className="font-bold text-[13px] text-[#212529] uppercase tracking-wider flex items-center gap-2 m-0"><Clock size={16} className="text-primary"/> Hoạt động nộp bài Realtime</h3>
                      <span className="text-[11px] font-bold bg-[#e9ecef] text-[#495057] px-2 py-0.5 rounded border border-[#dee2e6]">{recentLogs.length} bản ghi</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {recentLogs.length === 0 ? (
                        <div className="text-center text-[#adb5bd] font-medium py-10 text-[13px]">Đang chờ sự kiện nộp bài...</div>
                      ) : (
                        recentLogs.map((log) => (
                          <div key={log.id} className="bg-white p-3.5 rounded-lg border border-[#e9ecef] flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded bg-[#e7f1ff] border border-[#b6d4fe] text-primary flex items-center justify-center font-bold shrink-0 text-[12px] uppercase">
                                {log.users?.full_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="text-[13px] text-[#495057] m-0 mb-0.5">
                                  <strong className="text-[#212529]">{log.users?.full_name || 'Học sinh'}</strong> đã nộp <span className="font-bold text-primary">{log.exams?.title}</span>
                                </p>
                                <p className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-wider m-0">{formatTime(log.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-[16px] font-black font-ui ${log.score >= 8 ? 'text-[#198754]' : log.score >= 5 ? 'text-[#fd7e14]' : 'text-[#dc3545]'}`}>
                                {log.score}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Tình trạng Server */}
                  <div className="bg-white border border-[#dee2e6] rounded-xl shadow-sm h-fit">
                    <div className="p-4 border-b border-[#dee2e6] bg-[#f8f9fa] rounded-t-xl">
                      <h3 className="font-bold text-[13px] text-[#212529] uppercase tracking-wider flex items-center gap-2 m-0">
                        <Cpu size={16} className="text-[#6f42c1]"/> Tình trạng Server
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                          <span className="text-[#6c757d]">PostgreSQL DB</span>
                          <span className="text-[#198754]">Tốt</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#e9ecef] rounded-full overflow-hidden"><div className="h-full bg-[#198754] rounded-full w-[25%]"></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                          <span className="text-[#6c757d]">Groq AI API Load</span>
                          <span className="text-primary">Bình thường</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#e9ecef] rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full w-[45%]"></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                          <span className="text-[#6c757d]">Cloudinary Storage</span>
                          <span className="text-[#fd7e14]">Đã dùng 68%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#e9ecef] rounded-full overflow-hidden"><div className="h-full bg-[#fd7e14] rounded-full w-[68%]"></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: IAM (QUẢN LÝ TÀI KHOẢN) */}
            {/* ========================================================= */}
            {activeTab === 'iam' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h1 className="text-[20px] font-bold text-[#212529] font-heading flex items-center gap-2 m-0"><Shield className="text-primary" size={22}/> Định danh & Phân quyền (IAM)</h1>
                  <button onClick={exportUserData} className="btn-secondary py-2 px-4 rounded-lg text-[13px] flex items-center gap-2 border-[#dee2e6]">
                    <Download size={16}/> Xuất JSON Users
                  </button>
                </div>

                <div className="bg-white border border-[#dee2e6] rounded-xl shadow-sm flex flex-col h-[550px] overflow-hidden">
                  <div className="p-4 border-b border-[#dee2e6] bg-[#f8f9fa]">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" size={16}/>
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm Email hoặc Tên..." 
                        value={searchUser} 
                        onChange={e => setSearchUser(e.target.value)} 
                        className="w-full bg-white border border-[#dee2e6] rounded-lg pl-10 pr-4 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-[#e7f1ff] text-[13px]"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-[#f8f9fa] sticky top-0 z-10 shadow-sm border-b border-[#dee2e6]">
                        <tr className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">
                          <th className="p-4">Tài khoản</th>
                          <th className="p-4">Vai trò</th>
                          <th className="p-4">Trạng thái</th>
                          <th className="p-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9ecef]">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className={`hover:bg-[#f8f9fa] transition-colors ${u.status === 'banned' ? 'opacity-60 bg-[#f8d7da]/30' : ''}`}>
                            <td className="p-4">
                              <div className="font-bold text-[#212529] text-[14px]">{u.full_name || 'Chưa cập nhật'}</div>
                              <div className="text-[12px] text-[#6c757d] mt-0.5">{u.email}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'admin' ? 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]' : 
                                u.role === 'teacher' ? 'bg-[#e0cffc] text-[#6f42c1] border-[#c29ffa]' : 
                                'bg-[#e7f1ff] text-[#084298] border-[#9ec5fe]'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                                u.status === 'active' ? 'bg-[#d1e7dd] text-[#0f5132] border-[#a3cfbb]' : 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]'
                              }`}>
                                {u.status === 'active' ? 'Hoạt động' : 'Bị Khóa'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openRoleModal(u)} className="p-1.5 bg-white border border-[#dee2e6] text-[#6c757d] hover:bg-[#e9ecef] rounded transition-colors" title="Đổi quyền"><Edit3 size={14}/></button>
                                {u.status === 'banned' ? (
                                  <button onClick={() => handleUpdateUserStatus(u.id, 'active')} className="p-1.5 bg-white border border-[#dee2e6] text-[#198754] hover:bg-[#d1e7dd] rounded transition-colors" title="Mở khóa"><Unlock size={14}/></button>
                                ) : (
                                  <button onClick={() => handleUpdateUserStatus(u.id, 'banned')} className="p-1.5 bg-white border border-[#dee2e6] text-[#dc3545] hover:bg-[#f8d7da] rounded transition-colors" title="Khóa tài khoản"><Ban size={14}/></button>
                                )}
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

            {/* ========================================================= */}
            {/* TAB 3: CLASSES (QUẢN LÝ LỚP HỌC) */}
            {/* ========================================================= */}
            {activeTab === 'classes' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h1 className="text-[20px] font-bold text-[#212529] font-heading flex items-center gap-2 m-0 mb-4"><Network className="text-[#198754]" size={22}/> Phiên Lớp học (Instances)</h1>
                
                <div className="bg-white border border-[#dee2e6] rounded-xl shadow-sm overflow-hidden h-[550px] flex flex-col">
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-[#f8f9fa] sticky top-0 z-10 shadow-sm border-b border-[#dee2e6]">
                        <tr className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">
                          <th className="p-4">Tên Lớp học</th>
                          <th className="p-4">Giáo viên quản lý</th>
                          <th className="p-4 text-center">Sĩ số</th>
                          <th className="p-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e9ecef]">
                        {classesList.map((c) => (
                          <tr key={c.id} className="hover:bg-[#f8f9fa] transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-[#212529] text-[15px]">{c.name}</div>
                              <div className="text-[11px] font-bold text-[#adb5bd] mt-1 font-mono uppercase tracking-wider">Mã Join: <span className="text-[#495057]">{c.join_code}</span></div>
                            </td>
                            <td className="p-4 text-[13px] font-medium text-[#495057]">{c.users?.full_name || 'Không rõ'}</td>
                            <td className="p-4 text-center">
                              <span className="bg-[#e9ecef] text-[#495057] border border-[#dee2e6] px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider">
                                {c.class_members?.[0]?.count || 0} HS
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDeleteClass(c.id)} className="p-1.5 bg-white border border-[#dee2e6] text-[#dc3545] hover:bg-[#f8d7da] hover:border-[#f5c2c7] rounded transition-colors" title="Xóa lớp học"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4 & 5: DATABASE & SETTINGS (Tĩnh) */}
            {/* ========================================================= */}
            {activeTab === 'database' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <h1 className="text-[20px] font-bold text-[#212529] font-heading flex items-center gap-2 mb-6"><Database className="text-[#fd7e14]" size={22}/> Kiến trúc Dữ liệu</h1>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-[#dee2e6] rounded-xl p-10 shadow-sm text-center">
                      <HardDrive size={48} className="mx-auto text-primary mb-4 opacity-30"/>
                      <h3 className="text-4xl font-black text-[#212529] font-ui mb-1">{stats.exams}</h3>
                      <p className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider m-0">Bộ Đề Thi Tồn Tại</p>
                    </div>
                    <div className="bg-white border border-[#dee2e6] rounded-xl p-10 shadow-sm text-center">
                      <Library size={48} className="mx-auto text-[#6f42c1] mb-4 opacity-30"/>
                      <h3 className="text-4xl font-black text-[#212529] font-ui mb-1">{stats.lessons}</h3>
                      <p className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider m-0">Bài Giảng Lý Thuyết</p>
                    </div>
                 </div>
              </div>
            )}

             {activeTab === 'content' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center mb-4">
                  <h1 className="text-[20px] font-bold text-[#212529] font-heading flex items-center gap-2 m-0">
                    <BookOpen className="text-primary" size={22}/> Quản lý Bài đăng & Học liệu
                  </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Đăng Lý thuyết & Bài học */}
                  <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-primary transition-colors">
                    <div>
                      <div className="w-12 h-12 rounded-lg bg-[#e7f1ff] text-primary flex items-center justify-center mb-4 font-bold">
                        <BookOpen size={24} />
                      </div>
                      <h3 className="font-bold text-[16px] text-[#212529] font-heading mb-2">Đăng Bài giảng & Lý thuyết</h3>
                      <p className="text-[13px] text-[#6c757d] leading-relaxed mb-6">
                        Tạo chương mới, thêm bài học mới và đăng nội dung bài giảng Markdown + KaTeX cho học sinh.
                      </p>
                    </div>
                    <button onClick={() => navigate('/question-bank')} className="btn-primary py-2.5 px-4 text-[13px] w-full rounded-lg shadow-sm flex items-center justify-center gap-2">
                      <PlusCircle size={16} /> Đến Trung tâm Soạn giảng
                    </button>
                  </div>

                  {/* Card 2: Đăng Video & Tài liệu PDF */}
                  <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-[#198754] transition-colors">
                    <div>
                      <div className="w-12 h-12 rounded-lg bg-[#d1e7dd] text-[#198754] flex items-center justify-center mb-4 font-bold">
                        <Video size={24} />
                      </div>
                      <h3 className="font-bold text-[16px] text-[#212529] font-heading mb-2">Kho Video & Tài liệu PDF</h3>
                      <p className="text-[13px] text-[#6c757d] leading-relaxed mb-6">
                        Đăng bài giảng video nhúng và upload bộ tài liệu chuyên đề PDF cho học sinh xem và tải về.
                      </p>
                    </div>
                    <button onClick={() => navigate('/resources')} className="bg-[#198754] hover:bg-[#157347] text-white font-bold py-2.5 px-4 text-[13px] w-full rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors">
                      <FileText size={16} /> Xem Kho Học liệu
                    </button>
                  </div>

                  {/* Card 3: Đăng Đề thi mới */}
                  <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-[#fd7e14] transition-colors">
                    <div>
                      <div className="w-12 h-12 rounded-lg bg-[#fff3cd] text-[#fd7e14] flex items-center justify-center mb-4 font-bold">
                        <Library size={24} />
                      </div>
                      <h3 className="font-bold text-[16px] text-[#212529] font-heading mb-2">Đăng Đề thi & Khảo thí</h3>
                      <p className="text-[13px] text-[#6c757d] leading-relaxed mb-6">
                        Tạo đề thi mới, cấu hình thời gian làm bài, đáp án tự động và tổ chức các ca thi Live trực tuyến.
                      </p>
                    </div>
                    <button onClick={() => navigate('/exam-creator')} className="bg-[#fd7e14] hover:bg-[#e06b12] text-white font-bold py-2.5 px-4 text-[13px] w-full rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors">
                      <PlusCircle size={16} /> Tạo Đề thi Mới
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <h1 className="text-[20px] font-bold text-[#212529] font-heading flex items-center gap-2 m-0 mb-4"><Settings className="text-[#6c757d]" size={22}/> Cấu hình Môi trường</h1>
                 <div className="bg-white border border-[#dee2e6] rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-[#f8f9fa] border-b border-[#dee2e6] font-bold text-[13px] text-[#495057] uppercase tracking-wider flex items-center gap-2">
                      <Globe size={16}/> Environment Variables (Read-Only)
                    </div>
                    <div className="p-6 space-y-6 font-mono text-[13px]">
                      <div>
                        <div className="text-[11px] font-bold text-[#adb5bd] mb-1.5 uppercase tracking-wider">VITE_SUPABASE_URL</div>
                        <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e9ecef] text-[#212529] break-all">{import.meta.env.VITE_SUPABASE_URL || 'Not config'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[#adb5bd] mb-1.5 uppercase tracking-wider">VITE_CLOUDINARY_CLOUD_NAME</div>
                        <div className="bg-[#f8f9fa] p-3 rounded-lg border border-[#e9ecef] text-[#212529] break-all">{import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'Not config'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-[#adb5bd] mb-1.5 uppercase tracking-wider">VITE_GROQ_MODEL</div>
                        <div className="bg-[#d1e7dd] p-3 rounded-lg border border-[#a3cfbb] text-[#0f5132] font-bold">openai/gpt-oss-120b (Active)</div>
                      </div>
                    </div>
                 </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL CẤP / ĐỔI VAI TRÒ (ROLE)             */}
      {/* ========================================== */}
      {roleModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-bs-hover border border-[#dee2e6] relative flex flex-col">
            <button onClick={() => setRoleModalUser(null)} className="absolute top-5 right-5 p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] border border-[#dee2e6] rounded-lg text-[#6c757d] transition-colors"><X size={18}/></button>
            
            <h3 className="text-[18px] font-bold text-[#212529] font-heading mb-1 flex items-center gap-2 m-0">
              <ShieldCheck className="text-primary"/> Phân quyền Tài khoản
            </h3>
            <p className="text-[13px] text-[#6c757d] mb-4">Thay đổi vai trò cho: <strong className="text-[#212529]">{roleModalUser.full_name || roleModalUser.email}</strong></p>

            <div className="space-y-2 mb-6">
              {[
                { key: 'student', label: 'Học sinh', desc: 'Làm bài thi, học lý thuyết và xem tiến độ học tập' },
                { key: 'teacher', label: 'Giáo viên', desc: 'Quản lý lớp học, tạo đề thi và chấm điểm học sinh' },
                { key: 'admin', label: 'Quản trị viên (Admin)', desc: 'Toàn quyền quản trị hệ thống và người dùng' }
              ].map(r => (
                <label 
                  key={r.key} 
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedNewRole === r.key 
                      ? 'border-primary bg-[#e7f1ff] text-[#084298]' 
                      : 'border-[#dee2e6] hover:bg-[#f8f9fa] text-[#495057]'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="userRoleAdmin" 
                    value={r.key} 
                    checked={selectedNewRole === r.key} 
                    onChange={() => setSelectedNewRole(r.key as any)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-bold text-[14px]">{r.label}</div>
                    <div className="text-[12px] text-[#6c757d] mt-0.5">{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setRoleModalUser(null)} 
                className="flex-1 bg-[#f8f9fa] hover:bg-[#e9ecef] border border-[#dee2e6] text-[#495057] font-bold py-2.5 rounded-lg transition-colors text-[13px]"
              >
                Hủy
              </button>
              <button 
                onClick={submitRoleChange} 
                disabled={isUpdatingRole} 
                className="flex-1 btn-primary py-2.5 rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 text-[13px]"
              >
                {isUpdatingRole ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;