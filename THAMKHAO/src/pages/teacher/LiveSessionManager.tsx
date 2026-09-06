import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';
import { parseStudentListText, StudentUploadItem } from '../../utils/studentListParser';
import { 
  Plus, Search, Radio, Clock, Users, Play, 
  Settings, Copy, CheckCircle2, AlertTriangle, Loader2, Trash2,
  FileSpreadsheet, ShieldCheck, Key, BookOpen, Upload, UserPlus
} from 'lucide-react';

interface LiveSession {
  id: string;
  exam_id: string;
  exam_title: string;
  access_code: string;
  status: 'PENDING' | 'ONGOING' | 'COMPLETED';
  start_time: string;
  end_time: string;
  is_active: boolean;
  participant_count?: number;
}

export default function LiveSessionManager() {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [exams, setExams] = useState<{id: string, title: string}[]>([]);
  const [classList, setClassList] = useState<{id: string, name: string, code: string}[]>([]);
  
  const [assignMode, setAssignMode] = useState<'CLASS' | 'UPLOAD_LIST'>('CLASS');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [rawStudentText, setRawStudentText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<StudentUploadItem[]>([]);

  const [newSession, setNewSession] = useState({
    exam_id: '',
    access_code: '',
    start_time: '',
    end_time: '',
    title: ''
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: sessionData, error: sessionErr } = await supabase
          .from('live_sessions')
          .select('*, room_members(count)')
          .order('created_at', { ascending: false });

        if (sessionErr) throw sessionErr;

        const formattedSessions: LiveSession[] = (sessionData || []).map((s: any) => ({
          ...s,
          participant_count: s.room_members?.[0]?.count || 0
        }));
        setSessions(formattedSessions);

        const { data: examData } = await supabase
          .from('exams')
          .select('id, title')
          .order('created_at', { ascending: false });
        if (examData) setExams(examData);

        const { data: classData } = await supabase
          .from('classes')
          .select('id, name, code')
          .order('created_at', { ascending: false });
        if (classData) setClassList(classData);

      } catch (error) {
        console.error("Lỗi tải dữ liệu ca thi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (assignMode === 'UPLOAD_LIST') {
      const list = parseStudentListText(rawStudentText);
      setParsedStudents(list);
    }
  }, [rawStudentText, assignMode]);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleOpenCreateModal = () => {
    const code = generateRandomCode();
    const now = new Date();
    const startTimeStr = now.toISOString().slice(0, 16);
    const endTimeStr = new Date(now.getTime() + 120 * 60000).toISOString().slice(0, 16);

    setNewSession({
      exam_id: exams[0]?.id || '',
      access_code: code,
      start_time: startTimeStr,
      end_time: endTimeStr,
      title: ''
    });
    setAssignMode('CLASS');
    setSelectedClassId(classList[0]?.id || '');
    setRawStudentText('');
    setParsedStudents([]);
    setIsModalOpen(true);
  };

  const handleCreateSession = async () => {
    if (!newSession.exam_id || !newSession.access_code) {
      alert("Vui lòng chọn đề thi và nhập mã ca thi!");
      return;
    }

    setCreating(true);
    try {
      const selectedExam = exams.find(e => e.id === newSession.exam_id);
      const sessionTitle = newSession.title.trim() || selectedExam?.title || 'Ca thi Khảo thí';

      const code = newSession.access_code.trim().slice(0, 6).toUpperCase();

      const { data: insertedSession, error: sessionErr } = await supabase
        .from('live_sessions')
        .insert({
          exam_id: newSession.exam_id,
          exam_title: sessionTitle,
          access_code: code,
          status: 'PENDING',
          start_time: newSession.start_time || new Date().toISOString(),
          end_time: newSession.end_time || new Date(Date.now() + 7200000).toISOString(),
          is_active: false
        })
        .select()
        .single();

      if (sessionErr || !insertedSession) throw new Error(sessionErr?.message || "Lỗi khởi tạo ca thi");

      if (assignMode === 'CLASS' && selectedClassId) {
        const { data: classMembers } = await supabase
          .from('class_members')
          .select('user_id')
          .eq('class_id', selectedClassId);

        if (classMembers && classMembers.length > 0) {
          const roomMemberRows = classMembers.map(m => ({
            session_id: insertedSession.id,
            student_id: m.user_id,
            status: 'WAITING'
          }));
          await supabase.from('room_members').insert(roomMemberRows);
        }
      } else if (assignMode === 'UPLOAD_LIST' && parsedStudents.length > 0) {
        for (const std of parsedStudents) {
          try {
            let { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('student_code', std.student_code)
              .single();

            if (!existingUser) {
              const { data: newUser } = await supabase
                .from('users')
                .insert({
                  full_name: std.full_name,
                  student_code: std.student_code,
                  email: `${std.student_code.toLowerCase()}@student.fmath.edu.vn`,
                  role: 'student'
                })
                .select('id')
                .single();
              existingUser = newUser;
            }

            if (existingUser?.id) {
              await supabase.from('room_members').upsert({
                session_id: insertedSession.id,
                student_id: existingUser.id,
                status: 'WAITING'
              }, { onConflict: 'session_id,student_id' });
            }
          } catch(e) {}
        }
      }

      setSessions(prev => [{
        ...insertedSession,
        participant_count: parsedStudents.length || 0
      }, ...prev]);
      setIsModalOpen(false);
      alert("Khởi tạo Ca thi Khảo thí thành công!");
      navigate(`/live-monitor/${insertedSession.id}`);
    } catch (err: any) {
      alert("Lỗi khi tạo ca thi: " + (err.message || err));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (session: LiveSession) => {
    try {
      const nextStatus = session.status === 'PENDING' ? 'ONGOING' : session.status === 'ONGOING' ? 'COMPLETED' : 'PENDING';
      await supabase.from('live_sessions').update({ status: nextStatus }).eq('id', session.id);
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, status: nextStatus } : s));
    } catch(e) {
      alert("Lỗi đổi trạng thái ca thi.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn XÓA ca thi này?")) return;
    try {
      await supabase.from('live_sessions').delete().eq('id', sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch(e) {
      alert("Lỗi xóa ca thi.");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredSessions = sessions.filter(s => {
    const matchSearch = s.exam_title.toLowerCase().includes(searchQuery.toLowerCase()) || s.access_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusBadge = (status: string) => {
    if (status === 'ONGOING') return <span className="badge-success text-[11px] px-2.5 py-1 rounded-full font-bold">● Đang diễn ra</span>;
    if (status === 'PENDING') return <span className="badge-warning text-[11px] px-2.5 py-1 rounded-full font-bold text-[#212529]">◌ Chờ mở đề</span>;
    return <span className="badge-secondary text-[11px] px-2.5 py-1 rounded-full font-bold bg-[#e9ecef] text-[#495057]">✓ Đã kết thúc</span>;
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* HEADER */}
          <div className="bg-[#e7f1ff] rounded-xl p-6 border border-[#b6d4fe] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="bg-white border border-[#dee2e6] text-[#052c65] font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                Phân Hệ Khảo Thí & Tổ Chức Thi Độc Lập
              </span>
              <h1 className="text-xl font-extrabold font-heading text-[#052c65] m-0">
                Trung Tâm Quản Lý Ca Thi Trực Tuyến
              </h1>
              <p className="text-[#084298] text-[12px] mt-0.5 m-0 font-medium">
                Tạo ca thi • Phân lớp • Tải danh sách thí sinh • Giám sát Realtime
              </p>
            </div>

            <button 
              onClick={handleOpenCreateModal}
              className="btn-primary shrink-0"
            >
              <Plus size={16} strokeWidth={3} /> TẠO CA THI MỚI
            </button>
          </div>

          {/* THỐNG KÊ NHANH */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#dee2e6] shadow-sm">
              <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Tổng Ca Thi</div>
              <div className="text-2xl font-black text-primary font-heading">{sessions.length}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#dee2e6] shadow-sm">
              <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Đang Diễn Ra</div>
              <div className="text-2xl font-black text-[#198754] font-heading">{sessions.filter(s => s.status === 'ONGOING').length}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#dee2e6] shadow-sm">
              <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Chờ Mở Đề</div>
              <div className="text-2xl font-black text-[#ffc107] font-heading">{sessions.filter(s => s.status === 'PENDING').length}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#dee2e6] shadow-sm">
              <div className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider mb-0.5">Đã Hoàn Thành</div>
              <div className="text-2xl font-black text-[#6c757d] font-heading">{sessions.filter(s => s.status === 'COMPLETED').length}</div>
            </div>
          </div>

          {/* TÌM KIẾM & LỌC */}
          <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" size={16} />
              <input
                type="text"
                value={searchQuery}
                placeholder="Tìm theo tên ca thi hoặc Mã phòng thi (Access code)..."
                className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-lg pl-10 pr-4 py-2 text-[13px] outline-none focus:border-primary focus:bg-white transition-colors"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="border border-[#dee2e6] rounded-lg px-3 py-2 text-[13px] font-bold text-[#495057] bg-white outline-none focus:border-primary shrink-0"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Đang chờ mở đề (PENDING)</option>
              <option value="ONGOING">Đang diễn ra (ONGOING)</option>
              <option value="COMPLETED">Đã kết thúc (COMPLETED)</option>
            </select>
          </div>

          {/* DANH SÁCH CA THI */}
          {loading ? (
            <div className="flat-card p-12 text-center">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-[#6c757d] font-bold">Đang tải danh sách ca thi...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flat-card p-12 text-center">
              <Radio size={48} className="text-[#adb5bd] mx-auto mb-3 opacity-40" />
              <p className="font-bold text-[15px] text-[#212529] mb-1">Chưa có ca thi nào</p>
              <p className="text-[13px] text-[#6c757d] mb-4">Nhấn "Tạo ca thi mới" để bắt đầu tổ chức thi trực tuyến.</p>
              <button onClick={handleOpenCreateModal} className="btn-primary">
                <Plus size={16} /> Tạo Ca Thi Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => (
                <div key={session.id} className="flat-card p-5 hover:border-primary transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {statusBadge(session.status)}
                        <span className="bg-[#e7f1ff] border border-[#b6d4fe] text-primary font-black text-[13px] px-3 py-0.5 rounded-full font-mono tracking-widest">
                          {session.access_code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(session.access_code)}
                          className="p-1 text-[#6c757d] hover:text-primary transition-colors"
                          title="Sao chép mã"
                        >
                          {copiedCode === session.access_code ? <CheckCircle2 size={14} className="text-[#198754]" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <h3 className="font-bold text-[15px] text-[#212529] font-heading mb-1 truncate">{session.exam_title}</h3>
                      <div className="flex items-center gap-4 text-[12px] text-[#6c757d] font-medium">
                        <span className="flex items-center gap-1.5"><Users size={14} /> {session.participant_count || 0} thí sinh</span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(session.start_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate(`/live-monitor/${session.id}`)}
                        className="btn-primary py-2 px-4 text-[13px]"
                      >
                        <Play size={14} /> Giám Sát
                      </button>
                      <button
                        onClick={() => handleToggleStatus(session)}
                        className={`py-2 px-4 rounded-lg font-bold text-[13px] border transition-colors flex items-center gap-1.5 ${
                          session.status === 'PENDING' ? 'bg-[#d1e7dd] border-[#a3cfbb] text-[#0f5132] hover:bg-[#badbcc]' :
                          session.status === 'ONGOING' ? 'bg-[#f8d7da] border-[#f5c2c7] text-[#842029] hover:bg-[#f1aeb5]' :
                          'bg-[#e9ecef] border-[#dee2e6] text-[#495057]'
                        }`}
                      >
                        {session.status === 'PENDING' ? <><Play size={14} /> Mở Đề</> :
                         session.status === 'ONGOING' ? <><AlertTriangle size={14} /> Kết Thúc</> :
                         <><CheckCircle2 size={14} /> Hoàn Tất</>}
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="p-2 text-[#adb5bd] hover:text-[#dc3545] hover:bg-[#f8d7da] rounded-lg transition-colors"
                        title="Xóa ca thi"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* MODAL TẠO CA THI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-2xl w-full rounded-2xl border border-[#dee2e6] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-[#052c65] text-white p-6 border-b-4 border-[#ffc107]">
              <h2 className="text-xl font-bold font-heading m-0">KÍCH HOẠT CA THI KHẢO THÍ MỚI</h2>
              <p className="text-[13px] text-[#cfe2ff] mt-1 m-0">Cấu hình ca thi máy tính, mã PIN dự thi và gán danh sách thí sinh</p>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5 flex-1">
              
              <div>
                <label className="text-[12px] font-bold text-[#212529] uppercase tracking-wider block mb-1">
                  1. Chọn Đề Thi Gốc <span className="text-[#dc3545]">*</span>
                </label>
                <select
                  value={newSession.exam_id}
                  onChange={(e) => setNewSession(prev => ({ ...prev, exam_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dee2e6] font-bold text-[14px] outline-none focus:border-primary"
                >
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[#212529] uppercase tracking-wider block mb-1">
                    2. Tên Ca Thi (Tùy chỉnh)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Ca 1 - Thi thử THPTQG 2026"
                    value={newSession.title}
                    onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#dee2e6] font-medium text-[14px] outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[12px] font-bold text-[#212529] uppercase tracking-wider block mb-1">
                    3. Mật Khẩu Dự Thi / Mã PIN <span className="text-[#dc3545]">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSession.access_code}
                    onChange={(e) => setNewSession(prev => ({ ...prev, access_code: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#dee2e6] font-mono font-bold text-[15px] text-primary uppercase outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#212529] uppercase tracking-wider block mb-2">
                  4. Danh Sách Thí Sinh Dự Thi <span className="text-[#dc3545]">*</span>
                </label>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setAssignMode('CLASS')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-[13px] border flex items-center justify-center gap-2 transition-colors ${
                      assignMode === 'CLASS' 
                        ? 'bg-[#e7f1ff] border-primary text-primary' 
                        : 'bg-white border-[#dee2e6] text-[#6c757d] hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <BookOpen size={16} /> Giao Theo Lớp Học
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignMode('UPLOAD_LIST')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-[13px] border flex items-center justify-center gap-2 transition-colors ${
                      assignMode === 'UPLOAD_LIST' 
                        ? 'bg-[#e7f1ff] border-primary text-primary' 
                        : 'bg-white border-[#dee2e6] text-[#6c757d] hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <Upload size={16} /> Tải Danh Sách SBD
                  </button>
                </div>

                {assignMode === 'CLASS' ? (
                  <div>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#dee2e6] font-bold text-[14px] outline-none focus:border-primary"
                    >
                      {classList.map(c => (
                        <option key={c.id} value={c.id}>Lớp: {c.name} (Mã lớp: {c.code})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      placeholder={"Dán hoặc nhập danh sách thí sinh (Mỗi dòng một học sinh: SBD, Họ tên)\nVí dụ:\n24010089, Nguyễn Văn A\n24010090, Trần Thị B"}
                      value={rawStudentText}
                      onChange={(e) => setRawStudentText(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#dee2e6] font-mono text-[13px] outline-none bg-[#f8f9fa] focus:border-primary"
                    />
                    <div className="text-[12px] font-bold text-[#198754]">
                      Đã nhận diện: {parsedStudents.length} thí sinh hợp lệ.
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="p-6 bg-[#f8f9fa] border-t border-[#dee2e6] flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateSession}
                disabled={creating}
                className="btn-primary"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />}
                KÍCH HOẠT CA THI KHẢO THÍ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
