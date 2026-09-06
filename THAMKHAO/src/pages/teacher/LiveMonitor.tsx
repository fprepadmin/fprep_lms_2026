import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { 
  Users, AlertTriangle, WifiOff, CheckCircle2, 
  Clock, ShieldAlert, X, Plus, AlertOctagon, 
  Search, Activity, Loader2, Unlock
} from 'lucide-react';

// --- INTERFACES ---
interface StudentState {
  id: string;
  name: string;
  studentCode: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'LOCKED' | 'SUBMITTED';
  violationCount: number;
  score?: number;
  lastPing: number;
}

interface ExamLog {
  id: string;
  student_id: string;
  action: 'JOIN' | 'WARNING' | 'OFFLINE' | 'ONLINE' | 'SUBMIT' | 'ADD_TIME' | 'FORCE_LOCK';
  description: string;
  created_at: string;
}

const LiveMonitor = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  
  const [students, setStudents] = useState<StudentState[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const [selectedStudent, setSelectedStudent] = useState<StudentState | null>(null);
  const [studentLogs, setStudentLogs] = useState<ExamLog[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ==========================================
  // FETCH & LẮNG NGHE REALTIME TỪ SUPABASE
  // ==========================================
  useEffect(() => {
    if (!sessionId) return;

    const fetchInitialData = async () => {
      const { data: sessionData } = await supabase.from('live_sessions').select('*').eq('id', sessionId).single();
      if (sessionData) {
        const start = new Date(sessionData.start_time).getTime();
        const end = new Date(sessionData.end_time).getTime();
        const totalMinutes = Math.round((end - start) / 60000);
        setSessionInfo({ title: sessionData.exam_title, code: sessionData.access_code, totalTime: totalMinutes });
      }

      const { data: membersData } = await supabase
        .from('room_members')
        .select(`*, users(full_name, student_code)`)
        .eq('session_id', sessionId);

      if (membersData) {
        const mappedStudents: StudentState[] = membersData.map((m: any) => ({
          id: m.student_id,
          name: m.users?.full_name || 'Khách',
          studentCode: m.users?.student_code || 'N/A',
          status: m.status,
          violationCount: m.violation_count,
          score: m.score,
          lastPing: m.last_ping ? new Date(m.last_ping).getTime() : Date.now()
        }));
        setStudents(mappedStudents);
      }
      setLoading(false);
    };

    fetchInitialData();

    // THIẾT LẬP KÊNH WEBSOCKET REALTIME
    const channel = supabase.channel(`monitor_room_${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `session_id=eq.${sessionId}` }, async (payload) => {
        // HỌC SINH MỚI VÀO PHÒNG TỪ SẢNH CHỜ
        if (payload.eventType === 'INSERT') {
          const { data: newMember } = await supabase.from('room_members').select('*, users(full_name, student_code)').eq('id', payload.new.id).single();
          if (newMember) {
            setStudents(prev => {
              if (prev.find(s => s.id === newMember.student_id)) return prev; 
              return [...prev, {
                id: newMember.student_id,
                name: newMember.users?.full_name || 'Khách',
                studentCode: newMember.users?.student_code || 'N/A',
                status: newMember.status,
                violationCount: newMember.violation_count,
                score: newMember.score,
                lastPing: Date.now()
              }];
            });
          }
        } 
        // CẬP NHẬT TRẠNG THÁI DB (Cảnh báo, bị khóa...)
        else if (payload.eventType === 'UPDATE') {
          const updatedRecord = payload.new;
          setStudents(prev => prev.map(s => {
            if (s.id === updatedRecord.student_id) {
              return { 
                ...s, 
                status: updatedRecord.status, 
                violationCount: updatedRecord.violation_count,
                score: updatedRecord.score 
              };
            }
            return s;
          }));
        }
      })
      // LẮNG NGHE BROADCAST SIÊU TỐC
      .on('broadcast', { event: 'submit_exam' }, (payload: any) => {
        setStudents(prev => prev.map(s => 
          s.id === payload.payload.student_id 
            ? { ...s, status: 'SUBMITTED', score: payload.payload.score, lastPing: Date.now() } 
            : s
        ));
      })
      .on('broadcast', { event: 'heartbeat' }, (payload: any) => {
        setStudents(prev => prev.map(s => 
          s.id === payload.student_id 
            ? { ...s, status: s.status === 'OFFLINE' ? 'ONLINE' : s.status, lastPing: Date.now() } 
            : s
        ));
      })
      .subscribe();

    // MÁY QUÉT HỌC SINH MẤT MẠNG (Đã nới lỏng thành 3s/lần để UI mượt)
    const scanOfflineInterval = setInterval(() => {
      const now = Date.now();
      setStudents(prev => prev.map(s => {
        // Tín hiệu max là 2s. Sau 6s (6000ms) hẵng tính là rớt mạng.
        if (s.status !== 'SUBMITTED' && s.status !== 'LOCKED' && now - s.lastPing > 6000) {
          return { ...s, status: 'OFFLINE' }; 
        }
        return s;
      }));
    }, 3000); 

    return () => {
      supabase.removeChannel(channel);
      clearInterval(scanOfflineInterval);
    };
  }, [sessionId]);

  // ==========================================
  // HÀM XỬ LÝ (QUYỀN LỰC GIÁM THỊ)
  // ==========================================
  const handleOpenDrawer = async (student: StudentState) => {
    setSelectedStudent(student);
    setIsDrawerOpen(true);
    setStudentLogs([]); 
    const { data: logs } = await supabase
      .from('exam_logs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    if (logs) setStudentLogs(logs as ExamLog[]);
  };

  const handleAddTime = async (minutes: number) => {
    if (!selectedStudent || !window.confirm(`Xác nhận cộng thêm ${minutes} phút cho thí sinh ${selectedStudent.name}?`)) return;
    setActionLoading(true);
    try {
      await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: selectedStudent.id, action: 'ADD_TIME', description: `Giám thị cộng ${minutes} phút`});
      await supabase.channel(`monitor_room_${sessionId}`).send({ type: 'broadcast', event: 'add_time', payload: { student_id: selectedStudent.id, minutes } });
      alert(`Đã cộng thành công!`);
    } catch(e) { alert("Lỗi khi cộng giờ."); } finally { setActionLoading(false); }
  };

  const handleForceLock = async () => {
    if (!selectedStudent || !window.confirm(`NGUY HIỂM: Ép thu bài của ${selectedStudent.name}?`)) return;
    setActionLoading(true);
    try {
      await supabase.from('room_members').update({ status: 'LOCKED' }).eq('session_id', sessionId).eq('student_id', selectedStudent.id);
      await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: selectedStudent.id, action: 'FORCE_LOCK', description: 'Giám thị ép thu bài' });
      await supabase.channel(`monitor_room_${sessionId}`).send({ type: 'broadcast', event: 'force_lock', payload: { student_id: selectedStudent.id } });
      setIsDrawerOpen(false);
    } catch(e) { alert("Lỗi khi ép thu bài."); } finally { setActionLoading(false); }
  };

  const handleUnlockStudent = async () => {
    if (!selectedStudent || !window.confirm(`Xác nhận MỞ KHÓA BÀI THI cho thí sinh ${selectedStudent.name}?`)) return;
    setActionLoading(true);
    try {
      await supabase.from('room_members').update({ status: 'ONLINE', violation_count: 0 }).eq('session_id', sessionId).eq('student_id', selectedStudent.id);
      await supabase.from('exam_logs').insert({ session_id: sessionId, student_id: selectedStudent.id, action: 'ONLINE', description: 'Giám thị gỡ khóa cho thí sinh tiếp tục thi.' });
      await supabase.channel(`monitor_room_${sessionId}`).send({ type: 'broadcast', event: 'unlock_student', payload: { student_id: selectedStudent.id } });
      await supabase.channel(`student_session_${sessionId}_${selectedStudent.id}`).send({ type: 'broadcast', event: 'unlock_student', payload: { student_id: selectedStudent.id } });

      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, status: 'ONLINE', violationCount: 0 } : s));
      setSelectedStudent(prev => prev ? { ...prev, status: 'ONLINE', violationCount: 0 } : null);
      alert(`Đã mở khóa bài thi thành công cho ${selectedStudent.name}!`);
    } catch(e) { alert("Lỗi khi mở khóa bài thi."); } finally { setActionLoading(false); }
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-white border-[#198754] shadow-[0_0_10px_rgba(25,135,84,0.1)]'; 
      case 'OFFLINE': return 'bg-[#fff3cd] border-[#ffc107] text-[#664d03]'; 
      case 'WARNING': return 'bg-[#f8d7da] border-[#dc3545] text-[#842029]'; 
      case 'LOCKED': return 'bg-[#dc3545] border-[#b02a37] text-white'; 
      case 'SUBMITTED': return 'bg-[#f8f9fa] border-[#dee2e6] text-[#6c757d] opacity-70'; 
      default: return 'bg-white border-[#dee2e6]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE': return <Activity size={18} className="text-[#198754]" />;
      case 'OFFLINE': return <WifiOff size={18} className="text-[#ffc107]" />;
      case 'WARNING': return <AlertTriangle size={18} className="text-[#dc3545]" />;
      case 'LOCKED': return <ShieldAlert size={18} className="text-white" />;
      case 'SUBMITTED': return <CheckCircle2 size={18} className="text-[#6c757d]" />;
      default: return null;
    }
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterStatus === 'ALL' || s.status === filterStatus;
    return matchSearch && matchFilter;
  });

  const handleStartSession = async () => {
    if (!sessionId) return alert("Không tìm thấy mã ca thi!");
    if (!window.confirm("Bắt đầu mở phòng thi? Tất cả học sinh đang chờ sẽ tự động chuyển vào bài thi.")) return;

    try {
      const { error: dbErr } = await supabase
        .from('live_sessions')
        .update({ status: 'ONGOING', is_active: true })
        .eq('id', sessionId);

      if (dbErr) throw new Error(dbErr.message);

      const channel = supabase.channel(`monitor_room_${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'start_session',
        payload: { sessionId, status: 'ONGOING' }
      });

      setSessionInfo((prev: any) => ({ ...prev, status: 'ONGOING' }));
      alert("Đã phát lệnh BẮT ĐẦU CA THI thành công!");
    } catch (e: any) {
      const errorMsg = e?.message || e?.error_description || (typeof e === 'string' ? e : JSON.stringify(e));
      alert("Lỗi khi mở phòng: " + errorMsg);
    }
  };

  const handleForceSubmitAll = async () => {
    if (!sessionId) return alert("Không tìm thấy mã ca thi!");
    if (!window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn THU BÀI TOÀN BỘ phòng thi ngay lập tức?")) return;

    try {
      const { error: dbErr } = await supabase
        .from('live_sessions')
        .update({ status: 'COMPLETED' })
        .eq('id', sessionId);

      if (dbErr) throw new Error(dbErr.message);

      const channel = supabase.channel(`monitor_room_${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'force_lock',
        payload: { student_id: 'ALL' }
      });

      setSessionInfo((prev: any) => ({ ...prev, status: 'COMPLETED' }));
      alert("Đã thu bài toàn bộ phòng thi thành công!");
    } catch (e: any) {
      const errorMsg = e?.message || e?.error_description || (typeof e === 'string' ? e : JSON.stringify(e));
      alert("Lỗi khi thu bài: " + errorMsg);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="flex flex-col h-screen max-w-full overflow-x-hidden bg-[#f8f9fa] font-sans">
      
      {/* HEADER: THANH ĐIỀU KHIỂN CHUNG */}
      <header className="bg-white border-b border-[#dee2e6] px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/live-sessions')} className="p-1.5 border border-[#dee2e6] rounded-xl hover:bg-[#e9ecef] transition">
            <X size={18} className="text-[#495057]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#212529] font-heading m-0">{sessionInfo?.title}</h1>
            <div className="flex items-center gap-2.5 text-[12px] font-medium text-[#6c757d] mt-0.5">
              <span className="bg-[#e7f1ff] text-primary px-2 py-0.5 rounded uppercase font-bold text-[10px] tracking-wider">Mã: {sessionInfo?.code}</span>
              <span className="flex items-center gap-1"><Users size={13}/> {students.length} Thí sinh</span>
              <span className="flex items-center gap-1"><Clock size={13}/> {sessionInfo?.totalTime} phút</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-[#f8f9fa] border border-[#dee2e6] rounded-xl px-3 py-1.5">
            <Search size={14} className="text-[#adb5bd] mr-1.5" />
            <input type="text" placeholder="Tìm tên, SBD..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-[12px] w-40" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-[#dee2e6] rounded-xl px-3 py-1.5 bg-white text-[12px] font-medium text-[#495057] outline-none hover:border-primary transition cursor-pointer">
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ONLINE">Đang làm bài</option>
            <option value="WARNING">Cảnh báo/Gian lận</option>
            <option value="OFFLINE">Mất kết nối mạng</option>
            <option value="LOCKED">Bị khóa bài</option>
            <option value="SUBMITTED">Đã nộp bài</option>
          </select>
          <button onClick={handleStartSession} className="bg-[#198754] hover:bg-[#157347] text-white px-3.5 py-1.5 rounded-xl font-bold text-[12px] flex items-center gap-1.5 shadow-sm transition">
            <Activity size={15}/> BẮT ĐẦU THI
          </button>
          <button onClick={handleForceSubmitAll} className="bg-[#dc3545] hover:bg-[#b02a37] text-white px-3.5 py-1.5 rounded-xl font-bold text-[12px] flex items-center gap-1.5 shadow-sm transition">
            <AlertOctagon size={15}/> THU BÀI TOÀN BỘ
          </button>
        </div>
      </header>

      {/* MAIN BODY: LƯỚI HEATMAP GIÁM SÁT MẬT ĐỘ CAO */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              onClick={() => handleOpenDrawer(student)}
              className={`relative flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-105 shadow-sm ${getStatusColor(student.status)}`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[10px] ${student.status === 'LOCKED' ? 'bg-white/20 text-white' : 'bg-[#e9ecef] text-[#495057]'}`}>
                  {student.name.charAt(0)}
                </div>
                <div className={`p-1 rounded-md ${student.status === 'LOCKED' ? 'bg-white/20' : 'bg-[#f8f9fa]'}`}>
                  {getStatusIcon(student.status)}
                </div>
              </div>
              <div className="min-w-0 space-y-0.5">
                <h3 className={`font-bold text-[11px] truncate leading-tight ${student.status === 'LOCKED' ? 'text-white' : 'text-[#212529]'}`}>{student.name}</h3>
                <p className={`text-[10px] font-mono font-medium truncate ${student.status === 'LOCKED' ? 'text-white/80' : 'text-[#6c757d]'}`}>{student.studentCode}</p>
              </div>
              
              {student.violationCount > 0 && student.status !== 'SUBMITTED' && (
                <div className={`mt-1.5 text-[9px] font-extrabold uppercase tracking-wider py-0.5 px-1.5 rounded text-center ${student.status === 'LOCKED' ? 'bg-black/30 text-white' : 'bg-[#dc3545] text-white'}`}>
                  VP: {student.violationCount}/3
                </div>
              )}
              {student.status === 'SUBMITTED' && (
                <div className="mt-1.5 text-[11px] font-extrabold text-primary bg-[#e7f1ff] py-0.5 px-1.5 rounded text-center">
                  {student.score} đ
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* DRAWER: NHẬT KÝ CHI TIẾT & HÀNH ĐỘNG */}
      {isDrawerOpen && selectedStudent && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-8 border-l border-[#dee2e6]">
            
            <div className={`p-6 border-b flex justify-between items-start ${selectedStudent.status === 'LOCKED' ? 'bg-[#dc3545] text-white border-[#b02a37]' : 'bg-[#f8f9fa] border-[#dee2e6]'}`}>
              <div>
                <h2 className="text-xl font-bold font-heading mb-1">{selectedStudent.name}</h2>
                <p className={`text-sm font-medium ${selectedStudent.status === 'LOCKED' ? 'text-white/80' : 'text-[#6c757d]'}`}>Mã HS: {selectedStudent.studentCode}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className={`p-2 rounded-lg transition ${selectedStudent.status === 'LOCKED' ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white border border-[#dee2e6] hover:bg-[#e9ecef] text-[#495057]'}`}>
                <X size={20} />
              </button>
            </div>

            {selectedStudent.status !== 'SUBMITTED' && selectedStudent.status !== 'LOCKED' && (
              <div className="p-6 border-b border-[#dee2e6] bg-white grid grid-cols-2 gap-3">
                <button onClick={() => handleAddTime(5)} disabled={actionLoading} className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#b6d4fe] bg-[#e7f1ff] hover:bg-[#d1e3ff] text-primary transition">
                  <Plus size={20} className="mb-1" />
                  <span className="font-bold text-sm">Bù 5 Phút</span>
                </button>
                <button onClick={handleForceLock} disabled={actionLoading} className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#f5c2c7] bg-[#f8d7da] hover:bg-[#f1b0b7] text-[#dc3545] transition">
                  <ShieldAlert size={20} className="mb-1" />
                  <span className="font-bold text-sm">Ép Thu Bài</span>
                </button>
              </div>
            )}

            {selectedStudent.status === 'LOCKED' && (
              <div className="p-6 border-b border-[#dee2e6] bg-[#f8d7da] flex flex-col gap-3">
                <div className="text-[13px] font-bold text-[#842029]">
                  Thí sinh đang bị tạm khóa làm bài do vi phạm quy chế hoặc bị Giám thị khóa.
                </div>
                <button 
                  onClick={handleUnlockStudent} 
                  disabled={actionLoading} 
                  className="w-full py-3 px-4 rounded-xl border border-[#a3cfbb] bg-[#198754] hover:bg-[#157347] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Unlock size={18} /> MỞ KHÓA BÀI THI CHO THÍ SINH
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <h3 className="text-sm font-bold text-[#212529] uppercase tracking-wider mb-6 flex items-center gap-2">
                <Clock size={16}/> Nhật ký hành vi
              </h3>
              
              <div className="relative border-l-2 border-[#e9ecef] ml-3 space-y-6">
                {studentLogs.length > 0 ? studentLogs.map((log) => (
                  <div key={log.id} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                      log.action === 'WARNING' ? 'bg-[#dc3545]' : 
                      log.action === 'OFFLINE' ? 'bg-[#ffc107]' : 
                      log.action === 'ADD_TIME' ? 'bg-primary' : 'bg-[#198754]'
                    }`} />
                    <div className="bg-[#f8f9fa] border border-[#dee2e6] p-3 rounded-xl shadow-sm">
                      <div className="text-[12px] font-bold text-[#6c757d] mb-1">
                        {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className={`text-sm font-medium ${log.action === 'WARNING' ? 'text-[#dc3545]' : 'text-[#212529]'}`}>
                        {log.description}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-[#adb5bd] italic pl-4">Chưa có bản ghi nào.</p>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default LiveMonitor;