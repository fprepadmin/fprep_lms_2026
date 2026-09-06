import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Search, ShieldCheck, User, Mail, GraduationCap, Loader2, 
  Trash2, Edit3, CheckCircle2, Ban, Unlock, BellRing, Send, X, 
  Bold, Italic, List, BookOpen 
} from 'lucide-react';
import { supabase } from '../../config/supabase';

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States cho Modal Đổi Vai trò
  const [roleModalUser, setRoleModalUser] = useState<any | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // States cho Modal Gửi Thông báo
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTarget, setNotifTarget] = useState<any>(null); 
  const [notifAudience, setNotifAudience] = useState<'all' | 'student' | 'teacher'>('all'); 
  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'system' });
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Ref cho thanh công cụ Markdown
  const notifTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        class_members (
          status,
          classes (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const formattedData = data.map(u => {
        // Bóc tách danh sách lớp học mà user này đang tham gia
        const classInfo = u.class_members?.map((cm: any) => {
          if (!cm.classes?.name) return null;
          if (cm.status === 'joined') return cm.classes.name;
          if (cm.status === 'pending') return `${cm.classes.name} (Chờ duyệt)`;
          return null;
        }).filter(Boolean) || [];

        return {
          ...u, 
          status: u.status || 'active',
          joined_classes: classInfo.length > 0 ? classInfo.join(' • ') : 'Chưa vào lớp'
        };
      });
      setUsersList(formattedData);
    }
    setIsLoading(false);
  };

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
      alert(`Cập nhật vai trò thành công: ${selectedNewRole === 'admin' ? 'Quản trị viên' : selectedNewRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}!`);
    } else {
      alert("Lỗi cập nhật quyền: " + error.message);
    }
    setIsUpdatingRole(false);
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'active' | 'banned') => {
    const actionName = newStatus === 'active' ? 'Duyệt / Mở khóa' : 'Khóa (Ban)';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionName} tài khoản này?`)) return;

    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId);
    if (!error) {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    } else {
      alert("Lỗi cập nhật trạng thái: " + error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("CẢNH BÁO: Xóa toàn bộ dữ liệu của người dùng này vĩnh viễn. Chắc chắn xóa?")) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (!error) {
      setUsersList(prev => prev.filter(u => u.id !== userId));
    } else {
      alert("Lỗi xóa: " + error.message);
    }
  };

  const handleOpenNotifModal = (user: any | null) => {
    setNotifTarget(user);
    setNotifAudience('all'); 
    setNotifForm({ title: '', message: '', type: 'system' });
    setShowNotifModal(true);
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = notifTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notifForm.message.substring(start, end);
    const newText = notifForm.message.substring(0, start) + before + selectedText + after + notifForm.message.substring(end);
    
    setNotifForm({ ...notifForm, message: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleSendNotification = async () => {
    if (!notifForm.title.trim() || !notifForm.message.trim()) return alert("Vui lòng nhập đầy đủ Tiêu đề và Nội dung!");
    setIsSendingNotif(true);

    let payload = [];
    if (notifTarget) {
      payload.push({ user_id: notifTarget.id, title: notifForm.title, message: notifForm.message, type: notifForm.type });
    } else {
      const targetUsers = usersList.filter(u => {
        if (notifAudience === 'all') return u.role !== 'admin'; 
        return u.role === notifAudience;
      });

      if (targetUsers.length === 0) {
        alert("Không có tài khoản nào thuộc đối tượng này để gửi!");
        setIsSendingNotif(false);
        return;
      }

      payload = targetUsers.map(u => ({ user_id: u.id, title: notifForm.title, message: notifForm.message, type: notifForm.type }));
    }

    const { error } = await supabase.from('notifications').insert(payload);
    setIsSendingNotif(false);

    if (error) {
      alert("Lỗi khi gửi thông báo: " + error.message);
    } else {
      alert(`Đã gửi thông báo Pop-up cưỡng chế thành công tới ${payload.length} tài khoản!`);
      setShowNotifModal(false);
    }
  };

  const filteredUsers = usersList.filter(u => 
    (roleFilter === 'all' || u.role === roleFilter) &&
    ((u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="page-container animate-in fade-in">
      <div className="page-content">
        <div className="max-w-7xl mx-auto w-full">
          
          {/* HEADER */}
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-[#212529] mb-2 flex items-center gap-2 m-0">
                <ShieldCheck className="text-primary"/> Quản lý Tài khoản
              </h2>
              <p className="text-[#6c757d] font-medium text-[14px] m-0">Kiểm soát trạng thái, xem danh sách lớp và gửi thông báo trực tiếp đến người dùng.</p>
            </div>
            
            <button 
              onClick={() => handleOpenNotifModal(null)}
              className="btn-primary py-2.5 px-6 rounded-lg text-[14px] font-bold flex items-center gap-2 shrink-0 shadow-sm"
            >
              <BellRing size={16} /> Gửi thông báo hàng loạt
            </button>
          </div>

          {/* BỘ LỌC VÀ TÌM KIẾM */}
          <div className="bg-white p-5 rounded-xl border border-[#dee2e6] shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#adb5bd]"><Search size={16}/></div>
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên hoặc email..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-[#f8f9fa] border border-[#dee2e6] outline-none focus:ring-2 focus:ring-[#e7f1ff] focus:border-primary transition-colors font-medium text-[14px] text-[#212529]"
              />
            </div>
            <div className="w-full md:w-auto">
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)} 
                className="bg-[#f8f9fa] border border-[#dee2e6] text-[#495057] font-medium py-2.5 px-4 rounded-lg outline-none focus:ring-2 focus:ring-[#e7f1ff] focus:border-primary w-full md:w-auto text-[14px]"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="teacher">Chỉ Giáo viên</option>
                <option value="student">Chỉ Học sinh</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
          </div>

          {/* DANH SÁCH TÀI KHOẢN */}
          {isLoading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32}/></div>
          ) : (
            <div className="bg-white rounded-xl border border-[#dee2e6] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-[#f8f9fa] border-b border-[#dee2e6] sticky top-0 z-10 shadow-sm">
                    <tr className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">
                      <th className="p-4 pl-6">Tài khoản</th>
                      <th className="p-4">Email & Thông tin lớp</th>
                      <th className="p-4 text-center">Vai trò</th>
                      <th className="p-4 text-center">Trạng thái</th>
                      <th className="p-4 pr-6 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9ecef]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-16 text-[#adb5bd] font-medium text-[14px]">
                          Không tìm thấy tài khoản nào khớp với bộ lọc.
                        </td>
                      </tr>
                    ) : filteredUsers.map((user) => (
                      <tr key={user.id} className={`hover:bg-[#f8f9fa] transition-colors ${user.status === 'banned' ? 'opacity-60 bg-[#f8d7da]/30' : ''}`}>
                        
                        {/* Cột Tên & Avatar */}
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[14px] text-white overflow-hidden shrink-0 ${
                            user.role === 'admin' ? 'bg-[#dc3545]' : 
                            user.role === 'teacher' ? 'bg-[#6f42c1]' : 'bg-[#0d6efd]'
                          }`}>
                            {user.avatar_url ? <img src={user.avatar_url} alt="Ava" className="w-full h-full object-cover"/> : (user.full_name?.charAt(0) || 'U')}
                          </div>
                          <div>
                            <div className="font-bold text-[#212529] text-[14px] truncate max-w-[150px]">{user.full_name || 'Chưa cập nhật'}</div>
                            <div className="text-[11px] text-[#adb5bd] font-mono mt-0.5 uppercase tracking-wider">ID: {user.student_code || '---'}</div>
                          </div>
                        </td>

                        {/* Cột Email & Lớp học */}
                        <td className="p-4">
                          <div className="text-[13px] font-medium text-[#495057] flex items-center gap-2 mb-1.5">
                            <Mail size={14} className="text-[#adb5bd] shrink-0"/> 
                            <span className="truncate max-w-[200px]">{user.email}</span>
                          </div>
                          {user.role === 'student' ? (
                            <div className="text-[12px] font-bold flex items-start gap-1.5">
                              <BookOpen size={14} className="text-primary shrink-0 mt-0.5"/> 
                              <span className={`line-clamp-2 max-w-[220px] leading-snug ${user.joined_classes === 'Chưa vào lớp' ? 'text-[#adb5bd]' : 'text-primary'}`}>
                                {user.joined_classes}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[12px] font-medium text-[#6c757d] flex items-center gap-1.5">
                              <GraduationCap size={14} className="text-[#adb5bd] shrink-0"/> 
                              <span className="truncate max-w-[200px]">{user.school || 'FPT School'}</span>
                            </div>
                          )}
                        </td>

                        {/* Cột Vai trò */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                            user.role === 'admin' ? 'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]' : 
                            user.role === 'teacher' ? 'bg-[#e0cffc] text-[#6f42c1] border-[#c29ffa]' : 
                            'bg-[#e7f1ff] text-[#084298] border-[#9ec5fe]'
                          }`}>
                            {user.role === 'admin' ? <ShieldCheck size={12}/> : user.role === 'teacher' ? <CheckCircle2 size={12}/> : <User size={12}/>} 
                            {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                          </span>
                        </td>

                        {/* Cột Trạng thái */}
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider inline-block ${
                            user.status === 'active' ? 'bg-[#d1e7dd] text-[#0f5132] border-[#a3cfbb]' :
                            user.status === 'pending' ? 'bg-[#fff3cd] text-[#664d03] border-[#ffecb5] animate-pulse' :
                            'bg-[#f8d7da] text-[#842029] border-[#f5c2c7]'
                          }`}>
                            {user.status === 'active' ? 'Hoạt động' : user.status === 'pending' ? 'Chờ duyệt' : 'Bị Khóa'}
                          </span>
                        </td>

                        {/* Cột Thao tác */}
                        <td className="p-4 pr-6">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => handleOpenNotifModal(user)} className="p-1.5 bg-white border border-[#dee2e6] text-[#0d6efd] hover:bg-[#e7f1ff] rounded transition-colors" title="Gửi thông báo riêng"><BellRing size={14}/></button>

                            {user.status === 'pending' && (
                              <button onClick={() => handleUpdateStatus(user.id, 'active')} className="px-3 py-1 bg-[#198754] border border-[#198754] text-white rounded text-[11px] font-bold hover:bg-[#157347] transition-colors flex items-center gap-1">Duyệt</button>
                            )}
                            {user.status === 'banned' ? (
                              <button onClick={() => handleUpdateStatus(user.id, 'active')} className="p-1.5 bg-white border border-[#dee2e6] text-[#198754] hover:bg-[#d1e7dd] rounded transition-colors" title="Mở khóa tài khoản"><Unlock size={14}/></button>
                            ) : (
                              <button onClick={() => handleUpdateStatus(user.id, 'banned')} className="p-1.5 bg-white border border-[#dee2e6] text-[#dc3545] hover:bg-[#f8d7da] rounded transition-colors" title="Khóa tài khoản"><Ban size={14}/></button>
                            )}
                            <button onClick={() => openRoleModal(user)} className="p-1.5 bg-[#f8f9fa] border border-[#dee2e6] text-[#495057] hover:text-primary hover:bg-[#e7f1ff] rounded transition-colors" title="Đổi quyền"><Edit3 size={14}/></button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 bg-[#f8f9fa] border border-[#dee2e6] text-[#495057] hover:text-[#dc3545] hover:bg-[#f8d7da] rounded transition-colors" title="Xóa User"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL GỬI THÔNG BÁO POP-UP                 */}
      {/* ========================================== */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 md:p-8 shadow-bs-hover border border-[#dee2e6] relative flex flex-col max-h-[90vh]">
            <button onClick={() => setShowNotifModal(false)} className="absolute top-5 right-5 p-1.5 bg-[#f8f9fa] hover:bg-[#e9ecef] border border-[#dee2e6] rounded-lg text-[#6c757d] transition-colors"><X size={18}/></button>
            
            <h3 className="text-[20px] font-bold text-[#212529] font-heading mb-2 flex items-center gap-2 m-0">
              <Send className="text-primary"/> Gửi Thông báo Pop-up
            </h3>
            
            <div className="text-[12px] font-bold text-primary mb-6 bg-[#e7f1ff] px-3 py-1.5 rounded inline-block w-fit border border-[#b6d4fe] uppercase tracking-wider">
              {notifTarget ? `Gửi riêng cho: ${notifTarget.full_name}` : `Gửi thông báo hàng loạt`}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-6">
              {!notifTarget && (
                <div>
                  <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Đối tượng nhận thông báo</label>
                  <select 
                    value={notifAudience} 
                    onChange={e => setNotifAudience(e.target.value as any)} 
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#dee2e6] outline-none focus:ring-2 focus:ring-[#e7f1ff] focus:border-primary font-bold text-[13px] text-[#212529]"
                  >
                    <option value="all">Gửi toàn bộ Giáo viên & Học sinh ({usersList.filter(u => u.role !== 'admin').length} người)</option>
                    <option value="student">Chỉ gửi Học sinh ({usersList.filter(u => u.role === 'student').length} người)</option>
                    <option value="teacher">Chỉ gửi Giáo viên ({usersList.filter(u => u.role === 'teacher').length} người)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Loại thông báo</label>
                <select 
                  value={notifForm.type} 
                  onChange={e => setNotifForm({...notifForm, type: e.target.value})} 
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#dee2e6] outline-none focus:ring-2 focus:ring-[#e7f1ff] focus:border-primary font-bold text-[13px] text-[#212529]"
                >
                  <option value="system">Hệ thống (Tin chung)</option>
                  <option value="class">Học tập (Bài giảng/Lớp học)</option>
                  <option value="warning">Cảnh báo (Vi phạm/Khóa)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Tiêu đề</label>
                <input 
                  type="text" 
                  value={notifForm.title} 
                  onChange={e => setNotifForm({...notifForm, title: e.target.value})} 
                  placeholder="VD: Cập nhật hệ thống FMath..." 
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-[#dee2e6] outline-none focus:ring-2 focus:ring-[#e7f1ff] focus:border-primary font-bold text-[13px] text-[#212529]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#6c757d] uppercase tracking-wider mb-1.5">Nội dung chi tiết</label>
                <div className="border border-[#dee2e6] rounded-xl overflow-hidden bg-white flex flex-col">
                  <div className="flex items-center gap-1 p-2 border-b border-[#dee2e6] bg-[#f8f9fa]">
                    <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1.5 hover:bg-[#e9ecef] rounded text-[#495057] transition-colors" title="In đậm (Bold)"><Bold size={14}/></button>
                    <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1.5 hover:bg-[#e9ecef] rounded text-[#495057] transition-colors" title="In nghiêng (Italic)"><Italic size={14}/></button>
                    <div className="w-px h-4 bg-[#dee2e6] mx-1"></div>
                    <button type="button" onClick={() => insertMarkdown('- ', '')} className="p-1.5 hover:bg-[#e9ecef] rounded text-[#495057] transition-colors" title="Danh sách (List)"><List size={14}/></button>
                  </div>
                  <textarea 
                    ref={notifTextareaRef}
                    value={notifForm.message} 
                    onChange={e => setNotifForm({...notifForm, message: e.target.value})} 
                    placeholder="Nhập nội dung... (Có thể bôi đen chữ rồi bấm nút bên trên để in đậm)" 
                    className="w-full px-4 py-3 bg-transparent outline-none font-medium text-[13px] min-h-[120px] resize-none custom-scrollbar text-[#212529]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#dee2e6] shrink-0">
              <button 
                onClick={() => setShowNotifModal(false)} 
                className="flex-1 bg-[#f8f9fa] hover:bg-[#e9ecef] border border-[#dee2e6] text-[#495057] font-bold py-2.5 rounded-lg transition-colors text-[13px]"
              >
                Hủy
              </button>
              <button 
                onClick={handleSendNotification} 
                disabled={isSendingNotif} 
                className="flex-1 btn-primary py-2.5 rounded-lg flex justify-center items-center gap-2 disabled:opacity-50 text-[13px]"
              >
                {isSendingNotif ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Gửi Pop-up
              </button>
            </div>

          </div>
        </div>
      )}

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
                    name="userRole" 
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

export default UserManagement;