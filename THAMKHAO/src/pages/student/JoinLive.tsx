import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';
import { 
  Loader2, Monitor, ShieldCheck, Clock, CheckCircle2, 
  AlertTriangle, Lock, User, FileText, ArrowRight, Key
} from 'lucide-react';
import ExamLoadingScreen from '../../components/common/ExamLoadingScreen';

export default function JoinLive() {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  const [step, setStep] = useState<'EXAM_LOGIN' | 'VERIFY_CARD'>('EXAM_LOGIN');
  const [isExamLoading, setIsExamLoading] = useState(false);

  // Input states (3 mục chuẩn THPTQG)
  const [sbd, setSbd] = useState(currentUser?.studentId || '');
  const [examPassword, setExamPassword] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  // Loaded active sessions list for dropdown
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [examDetails, setExamDetails] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tải danh sách các Ca thi đang mở
  useEffect(() => {
    const fetchActiveSessions = async () => {
      setLoadingSessions(true);
      try {
        const { data } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (data) {
          setActiveSessions(data);
          if (data.length > 0) setSelectedSessionId(data[0].id);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách ca thi:", err);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchActiveSessions();
  }, []);

  // Xử lý Kiểm tra 3 Mục Đăng nhập Khảo thí
  const handleVerifyExamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sbd.trim()) {
      setErrorMsg('Vui lòng nhập Số Báo Danh (SBD) dự thi!');
      return;
    }

    if (!selectedSessionId) {
      setErrorMsg('Vui lòng chọn Kỳ thi / Ca thi dự thi!');
      return;
    }

    setLoading(true);

    try {
      let targetSession = activeSessions.find(s => s.id === selectedSessionId);
      if (!targetSession) {
        const { data, error } = await supabase
          .from('live_sessions')
          .select('*')
          .eq('id', selectedSessionId)
          .single();
        if (error || !data) throw new Error("Không tìm thấy thông tin Ca thi đã chọn.");
        targetSession = data;
      }

      if (targetSession.access_code && targetSession.access_code.trim()) {
        const expectedCode = targetSession.access_code.trim().toUpperCase();
        const enteredCode = examPassword.trim().toUpperCase();

        if (enteredCode !== expectedCode) {
          throw new Error("Mật khẩu dự thi / Mã PIN không đúng. Vui lòng kiểm tra lại!");
        }
      }

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', targetSession.exam_id)
        .single();

      setSessionData(targetSession);
      setExamDetails(examData);
      setStep('VERIFY_CARD');

    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kiểm tra thông tin dự thi. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndEnter = async () => {
    if (!sessionData) return;
    setIsExamLoading(true);

    try {
      const docEl = document.documentElement as any;
      const requestMethod = docEl.requestFullscreen || docEl.webkitRequestFullScreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (requestMethod) {
        try { await requestMethod.call(docEl); } catch (e) {}
      }
    } catch (err) {}
  };

  const handleLoadingComplete = () => {
    if (sessionData) {
      navigate(`/student/exam/${sessionData.exam_id}?sessionId=${sessionData.id}`, { replace: true });
    }
  };

  if (isExamLoading && sessionData) {
    return <ExamLoadingScreen examTitle={sessionData.exam_title} onComplete={handleLoadingComplete} />;
  }

  return (
    <div className="page-container font-sans text-[#212529] select-none justify-between bg-[#f8f9fa]">
      
      {/* HEADER ĐỒNG BỘ 100% HỆ THỐNG MAIN (WHITE & PRIMARY BLUE) */}
      <header className="bg-white border-b border-[#dee2e6] px-6 py-3.5 shrink-0 shadow-sm z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-extrabold text-lg font-heading shadow-md">
              F12
            </div>
            <div>
              <h1 className="text-[14px] md:text-[15px] font-extrabold font-heading uppercase tracking-tight text-[#212529] m-0">
                HỆ THỐNG MÁY TÍNH THI TRỰC TUYẾN - NỘI BỘ & ĐÁNH GIÁ NĂNG LỰC
              </h1>
              <p className="text-[11px] text-[#6c757d] font-medium m-0 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={14} className="text-primary" /> Phân hệ Khảo thí Trực tuyến • FMath Infinity Center
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-right border-l border-[#dee2e6] pl-6">
            <div>
              <div className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-wider">Hội đồng khảo thí</div>
              <div className="text-[12px] font-bold text-[#212529]">FMath Studio Center</div>
            </div>
          </div>
        </div>
      </header>

      {/* BODY CHÍNH */}
      <main className="page-content flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          
          {/* STEP 1: FORM 3 MỤC ĐĂNG NHẬP KHẢO THÍ CHUẨN THPTQG */}
          {step === 'EXAM_LOGIN' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
              
              <div className="bg-slate-50 border-b border-slate-200 p-5 text-center">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mx-auto mb-2 border border-blue-100 shadow-sm">
                  <Monitor size={22} />
                </div>
                <h2 className="text-base font-extrabold font-heading text-slate-900 m-0">ĐĂNG NHẬP PHÒNG THI MÁY TÍNH</h2>
                <p className="text-[12px] text-slate-500 mt-1 m-0 font-medium">Vui lòng hoàn thành 3 mục đối chiếu thông tin bên dưới</p>
              </div>

              <form onSubmit={handleVerifyExamLogin} className="p-6 space-y-4">
                
                {errorMsg && (
                  <div className="bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-200 text-[12px] font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle size={16} className="shrink-0 text-red-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* MỤC 1: SỐ BÁO DANH (SBD) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <User size={13} className="text-primary" /> Mục 1: Số Báo Danh (SBD) Thí sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sbd}
                    onChange={(e) => setSbd(e.target.value.toUpperCase())}
                    placeholder="Nhập SBD của bạn (VD: 24010089)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none font-mono font-bold text-[13px] text-slate-900 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>

                {/* MỤC 2: MẬT KHẨU DỰ THI / MÃ PIN */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <Key size={13} className="text-primary" /> Mục 2: Mật Khẩu Dự Thi / Mã PIN Ca Thi
                  </label>
                  <input
                    type="text"
                    value={examPassword}
                    onChange={(e) => setExamPassword(e.target.value.toUpperCase())}
                    placeholder="Nhập Mật khẩu ca thi (Nếu yêu cầu)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none font-mono font-bold text-[13px] text-slate-900 bg-slate-50 focus:bg-white transition-all uppercase tracking-wider"
                  />
                </div>

                {/* MỤC 3: CHỌN KỲ THI / CA THI ĐANG MỞ */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                    <FileText size={13} className="text-primary" /> Mục 3: Chọn Kỳ Thi / Ca Thi Trực Tuyến <span className="text-red-500">*</span>
                  </label>
                  
                  {loadingSessions ? (
                    <div className="flex items-center justify-center p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-[12px] text-slate-500">
                      <Loader2 size={14} className="animate-spin text-primary mr-2" /> Đang tìm các ca thi...
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <div className="p-2.5 border border-red-200 rounded-xl bg-red-50 text-red-700 text-[12px] font-medium text-center">
                      Hiện chưa có Ca thi nào đang mở. Vui lòng liên hệ Giám thị!
                    </div>
                  ) : (
                    <select
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-primary outline-none font-bold text-[13px] text-slate-900 bg-white cursor-pointer transition-all"
                    >
                      {activeSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          [{session.access_code}] {session.exam_title} ({session.status === 'PENDING' ? 'Chờ mở đề' : 'Đang thi'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || activeSessions.length === 0}
                  className="btn-primary w-full py-3 rounded-xl font-extrabold text-[13px] shadow-sm flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  XÁC NHẬN THÔNG TIN KỲ THI
                </button>

              </form>

              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5"><Lock size={13} className="text-slate-400" /> Bảo mật mã hóa THPTQG</span>
                <span>Hệ thống Khảo thí V2.4</span>
              </div>

            </div>
          )}

          {/* STEP 2: THẺ DỰ THI THÍ SINH & XÁC NHẬN QUY CHẾ */}
          {step === 'VERIFY_CARD' && sessionData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
              
              {/* HEADER THẺ TRẮNG CAO CẤP */}
              <div className="bg-white p-5 text-center border-b border-slate-200">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-2">
                  Thẻ Dự Thi Máy Tính Chính Thức
                </span>
                <h2 className="text-base font-extrabold font-heading text-slate-900 m-0 leading-snug">{sessionData.exam_title}</h2>
                <p className="text-[12px] text-slate-500 mt-1 m-0 font-medium">
                  Mã Ca Thi: <strong className="text-primary font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{sessionData.access_code}</strong>
                </p>
              </div>

              <div className="p-6 space-y-5">
                
                {/* Thẻ Thông tin Thí sinh */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-sm">
                    {currentUser?.name ? currentUser.name.charAt(0) : 'TS'}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ và tên thí sinh</div>
                    <div className="text-[15px] font-extrabold text-slate-900 truncate">{currentUser?.name || "Thí sinh"}</div>
                    <div className="flex items-center gap-4 text-[12px] font-medium text-slate-600 pt-1 border-t border-slate-200">
                      <span>SBD: <strong className="text-primary font-mono font-bold">{sbd}</strong></span>
                      <span>Môn: <strong className="text-slate-800">Toán học 12</strong></span>
                    </div>
                  </div>
                </div>

                {/* Thông số Đề thi & Quy chế */}
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <Clock size={18} className="text-primary shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Thời gian thi</div>
                      <div className="font-bold text-slate-900">{Math.floor((examDetails?.time_limit || 5400) / 60)} phút</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Anti-Cheat</div>
                      <div className="font-bold text-emerald-600">Kích hoạt (Khóa 3/3)</div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/80 text-[12px] text-amber-900 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle size={15} /> Lưu ý quy chế thi máy tính:
                  </div>
                  <p className="m-0 text-[11px]">
                    Giữ nguyên trình duyệt ở chế độ Toàn màn hình. Tuyệt đối không chuyển tab hoặc thu nhỏ cửa sổ. Hệ thống sẽ che đen màn hình và tạm khóa bài thi nếu vi phạm 3 lần.
                  </p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setStep('EXAM_LOGIN')} className="btn-secondary flex-1 py-2.5 text-[12px] rounded-xl font-bold">
                    Đổi thông tin
                  </button>
                  <button
                    onClick={handleConfirmAndEnter}
                    disabled={loading}
                    className="btn-primary flex-[2] py-2.5 text-[12px] font-extrabold shadow-md rounded-xl flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    XÁC NHẬN DỰ THI & VÀO PHÒNG
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* FOOTER ĐỒNG BỘ MAIN SYSTEM */}
      <footer className="bg-white border-t border-slate-200 py-2.5 text-center text-[11px] text-slate-500 font-medium shrink-0">
        Hệ thống Máy tính Thi Trực tuyến FMath Infinity • Bản quyền thuộc Bộ Phận Khảo thí
      </footer>

    </div>
  );
}