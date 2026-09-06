import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Mail, Lock, User, LogIn, UserPlus,
  Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, ChevronLeft, Sparkles
} from 'lucide-react';
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from '../../config/firebase';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../config/supabase';

// ─── Password strength ────────────────────────────────────────
const getStrength = (pwd: string) => {
  if (!pwd) return { level: 0, label: '', color: '' };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  if (s <= 1) return { level: 1, label: 'Yếu', color: '#dc3545' };
  if (s === 2) return { level: 2, label: 'Trung bình', color: '#fd7e14' };
  return { level: 3, label: 'Mạnh', color: '#198754' };
};

type Tab = 'login' | 'register' | 'forgot';

// ─── Shared input component ───────────────────────────────────
const InputField = ({
  icon, type, value, onChange, placeholder, autoComplete, rightEl
}: {
  icon: React.ReactNode; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  autoComplete?: string; rightEl?: React.ReactNode;
}) => (
  <div className="relative">
    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#adb5bd] pointer-events-none">{icon}</div>
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} autoComplete={autoComplete}
      className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-xl pl-10 pr-10 py-3 text-[14px] text-[#212529] placeholder:text-[#adb5bd] focus:outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
    />
    {rightEl && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightEl}</div>}
  </div>
);

// ─── Google button ────────────────────────────────────────────
const GoogleButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
  <button type="button" onClick={onClick} disabled={loading}
    className="w-full flex items-center justify-center gap-3 bg-white text-[#212529] py-3 rounded-xl font-bold text-[14px] border border-[#dee2e6] hover:border-primary hover:bg-[#f0f6ff] transition-all disabled:opacity-60 shadow-sm">
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    Tiếp tục với Google
  </button>
);

// ─── Main ────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { switchRole, setIsFptStudent, setUser } = useAppStore();

  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);

  // Forgot
  const [forgotEmail, setForgotEmail] = useState('');

  const strength = getStrength(regPass);

  const setTab_ = (t: Tab) => { setTab(t); setError(''); setSuccess(''); };

  // ── Sync Supabase ─────────────────────────────────────────
  const syncAndRedirect = async (email: string, displayName?: string) => {
    const cleanEmail = email.toLowerCase().trim();
    let role: 'admin' | 'teacher' | 'student' = 'student';
    let defaultDisplayName = displayName;

    if (cleanEmail === '5phutcungpy@gmail.com') role = 'admin';
    else if (cleanEmail === 'aiquizfct@gmail.com' || cleanEmail === 'giaoviendemo.bgk@gmail.com') {
      role = 'teacher';
      if (!defaultDisplayName) defaultDisplayName = 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN';
    } else if (cleanEmail === 'hocsinhdemo.bgk@gmail.com') {
      role = 'student';
      if (!defaultDisplayName) defaultDisplayName = 'BGK CUỘC THI STTTNNĐ - HỌC SINH';
    }

    if (cleanEmail === 'hocsinhdemo.bgk@gmail.com' || cleanEmail === 'giaoviendemo.bgk@gmail.com') {
      sessionStorage.removeItem('has_seen_bgk_welcome');
    }

    const isFPT = cleanEmail.endsWith('@fpt.edu.vn') || cleanEmail.includes('fct');
    setIsFptStudent(isFPT);
    switchRole(role);

    try {
      const { data: existing } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
      if (existing) {
        if (cleanEmail === 'giaoviendemo.bgk@gmail.com' && existing.role !== 'teacher') {
          await supabase.from('users').update({ role: 'teacher', full_name: 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN' }).eq('id', existing.id);
          existing.role = 'teacher';
          existing.full_name = 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN';
        }
        if (cleanEmail === 'hocsinhdemo.bgk@gmail.com' && (!existing.full_name || existing.full_name !== 'BGK CUỘC THI STTTNNĐ - HỌC SINH')) {
          await supabase.from('users').update({ full_name: 'BGK CUỘC THI STTTNNĐ - HỌC SINH' }).eq('id', existing.id);
          existing.full_name = 'BGK CUỘC THI STTTNNĐ - HỌC SINH';
        }
        setUser(existing);
        switchRole(existing.role);
      } else {
        const code = cleanEmail.includes('bgk') ? 'BGK_2026' : `TS_${Math.floor(Date.now() / 1000)}`;
        const { data: created } = await supabase.from('users').insert({
          full_name: defaultDisplayName || cleanEmail.split('@')[0],
          email: cleanEmail, role, xp: 0, level: 1, streak: 0,
          status: 'active', student_code: code
        }).select('*').single();
        setUser(created || { full_name: defaultDisplayName, email: cleanEmail, role });
      }
    } catch (e) { console.warn('DB sync:', e); }

    navigate('/dashboard');
  };

  // ── Handlers ──────────────────────────────────────────────
  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const emailToUse = customEmail || loginEmail;
    const passToUse = customPass || loginPass;

    if (!emailToUse || !passToUse) { setError('Vui lòng nhập đầy đủ thông tin!'); return; }
    setLoading(true); setError('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, emailToUse, passToUse);
      await syncAndRedirect(user.email!, user.displayName || undefined);
    } catch (err: any) {
      // Tự động khởi tạo tài khoản nếu là tài khoản BGK demo chưa có trên Firebase
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && (emailToUse === 'hocsinhdemo.bgk@gmail.com' || emailToUse === 'giaoviendemo.bgk@gmail.com')) {
        try {
          const { user } = await createUserWithEmailAndPassword(auth, emailToUse, passToUse);
          const bgkName = emailToUse.includes('giaovien') ? 'BGK CUỘC THI STTTNNĐ - GIÁO VIÊN' : 'BGK CUỘC THI STTTNNĐ - HỌC SINH';
          await updateProfile(user, { displayName: bgkName });
          await syncAndRedirect(user.email!, bgkName);
          return;
        } catch (createErr: any) {
          console.error("Lỗi tự động tạo tài khoản BGK:", createErr);
        }
      }

      const map: Record<string, string> = {
        'auth/user-not-found': 'Email chưa được đăng ký!',
        'auth/wrong-password': 'Mật khẩu không chính xác!',
        'auth/invalid-credential': 'Email hoặc mật khẩu không đúng!',
        'auth/too-many-requests': 'Tài khoản tạm khóa. Thử lại sau hoặc đặt lại mật khẩu!',
      };
      setError(map[err.code] || 'Đăng nhập thất bại. Kiểm tra lại kết nối!');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) { setError('Vui lòng nhập họ và tên!'); return; }
    if (!regEmail.trim()) { setError('Vui lòng nhập email!'); return; }
    if (regPass.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự!'); return; }
    if (regPass !== regConfirm) { setError('Mật khẩu xác nhận không khớp!'); return; }
    setLoading(true); setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, regEmail, regPass);
      await updateProfile(user, { displayName: regName });
      await syncAndRedirect(user.email!, regName);
    } catch (err: any) {
      const map: Record<string, string> = {
        'auth/email-already-in-use': 'Email này đã được đăng ký. Vui lòng đăng nhập!',
        'auth/invalid-email': 'Định dạng email không hợp lệ!',
        'auth/weak-password': 'Mật khẩu quá yếu!',
      };
      setError(map[err.code] || 'Đăng ký thất bại. Thử lại!');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError('Nhập email của bạn!'); return; }
    setLoading(true); setError('');
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setSuccess(`Đã gửi link đặt lại mật khẩu tới ${forgotEmail}. Kiểm tra hộp thư (cả thư mục Spam)!`);
      setForgotEmail('');
    } catch (err: any) {
      setError(err.code === 'auth/user-not-found' ? 'Email chưa đăng ký!' : 'Gửi thất bại. Thử lại!');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      const { user } = await signInWithPopup(auth, googleProvider);
      await syncAndRedirect(user.email!, user.displayName || undefined);
    } catch { setError('Đăng nhập Google thất bại!'); }
    finally { setLoading(false); }
  };





  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-[#f0f4ff] to-[#e8f4ff] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[#6c757d] hover:text-primary font-bold text-[13px] transition-colors">
          <ArrowLeft size={16} /> Trang chủ
        </Link>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles size={16} />
          <span className="font-black text-[15px] font-heading tracking-widest">FMATH12</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 flex items-start md:items-center justify-center px-4 py-4 overflow-y-auto">
        <div className="w-full max-w-[400px]">

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-[0_4px_32px_rgba(13,110,253,0.10)] border border-[#e7f1ff] overflow-hidden">

            {/* Gradient header */}
            <div className="bg-gradient-to-r from-primary to-indigo-600 px-6 pt-6 pb-5 text-white">
              {tab === 'forgot' ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setTab_('login')} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <h1 className="font-black text-[18px] font-heading leading-tight">Đặt lại mật khẩu</h1>
                    <p className="text-blue-100 text-[12px] font-medium">Nhập email để nhận link reset</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div className="flex bg-white/15 p-1 rounded-xl mb-3">
                    <button onClick={() => setTab_('login')}
                      className={`flex-1 py-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 ${tab === 'login' ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white'}`}>
                      <LogIn size={15} /> Đăng nhập
                    </button>
                    <button onClick={() => setTab_('register')}
                      className={`flex-1 py-2 rounded-lg font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 ${tab === 'register' ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white'}`}>
                      <UserPlus size={15} /> Đăng ký
                    </button>
                  </div>
                  <p className="text-blue-100 text-[12px] text-center font-medium">
                    {tab === 'login' ? 'Chào mừng trở lại! Đăng nhập để tiếp tục.' : 'Tạo tài khoản miễn phí ngay hôm nay.'}
                  </p>
                </>
              )}
            </div>

            {/* Form area */}
            <div className="p-5">

              {/* Alerts */}
              {error && (
                <div className="mb-4 p-3 bg-[#f8d7da] border border-[#f5c2c7] rounded-xl flex items-start gap-2 animate-in fade-in">
                  <AlertCircle size={15} className="text-[#dc3545] shrink-0 mt-0.5" />
                  <span className="text-[#842029] text-[13px] font-medium leading-snug">{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-[#d1e7dd] border border-[#a3cfbb] rounded-xl flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 size={15} className="text-[#198754] shrink-0 mt-0.5" />
                  <span className="text-[#0f5132] text-[13px] font-medium leading-snug">{success}</span>
                </div>
              )}

              {/* ── ĐĂNG NHẬP ── */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Email</label>
                    <InputField icon={<Mail size={16} />} type="email" value={loginEmail}
                      onChange={setLoginEmail} placeholder="example@email.com" autoComplete="email" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Mật khẩu</label>
                      <button type="button" onClick={() => setTab_('forgot')}
                        className="text-[12px] text-primary hover:underline font-bold">Quên mật khẩu?</button>
                    </div>
                    <InputField icon={<Lock size={16} />}
                      type={showLoginPass ? 'text' : 'password'}
                      value={loginPass} onChange={setLoginPass}
                      placeholder="••••••••" autoComplete="current-password"
                      rightEl={
                        <button type="button" onClick={() => setShowLoginPass(!showLoginPass)}
                          className="text-[#adb5bd] hover:text-[#6c757d]">
                          {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      } />
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary hover:bg-[#0b5ed7] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[14px] disabled:opacity-60 shadow-md shadow-primary/20">
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
                    Đăng nhập
                  </button>

                  <div className="relative my-1 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#dee2e6]" /></div>
                    <span className="relative bg-white px-3 text-[11px] font-bold text-[#adb5bd] uppercase tracking-wider">hoặc</span>
                  </div>

                  <GoogleButton onClick={handleGoogle} loading={loading} />
                </form>
              )}

              {/* ── ĐĂNG KÝ ── */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Họ và tên</label>
                    <InputField icon={<User size={16} />} type="text" value={regName}
                      onChange={setRegName} placeholder="Nguyễn Văn A" autoComplete="name" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Email</label>
                    <InputField icon={<Mail size={16} />} type="email" value={regEmail}
                      onChange={setRegEmail} placeholder="example@email.com" autoComplete="email" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Mật khẩu</label>
                    <InputField icon={<Lock size={16} />}
                      type={showRegPass ? 'text' : 'password'}
                      value={regPass} onChange={setRegPass}
                      placeholder="Tối thiểu 6 ký tự" autoComplete="new-password"
                      rightEl={
                        <button type="button" onClick={() => setShowRegPass(!showRegPass)}
                          className="text-[#adb5bd] hover:text-[#6c757d]">
                          {showRegPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      } />
                    {/* Strength bar */}
                    {regPass && (
                      <div className="pt-1">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                              style={{ backgroundColor: i <= strength.level ? strength.color : '#dee2e6' }} />
                          ))}
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: strength.color }}>
                          {strength.label}
                          {strength.level < 3 && <span className="text-[#adb5bd] font-normal"> — thêm chữ hoa, số hoặc ký tự đặc biệt</span>}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Xác nhận mật khẩu</label>
                    <InputField icon={<Lock size={16} />}
                      type="password" value={regConfirm} onChange={setRegConfirm}
                      placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
                    {regConfirm && (
                      <p className={`text-[11px] font-bold flex items-center gap-1 ${regConfirm === regPass ? 'text-[#198754]' : 'text-[#dc3545]'}`}>
                        {regConfirm === regPass
                          ? <><CheckCircle2 size={11} /> Khớp</>
                          : <><AlertCircle size={11} /> Không khớp</>}
                      </p>
                    )}
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary hover:bg-[#0b5ed7] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[14px] disabled:opacity-60 shadow-md shadow-primary/20">
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <UserPlus size={17} />}
                    Tạo tài khoản
                  </button>

                  <div className="relative my-1 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#dee2e6]" /></div>
                    <span className="relative bg-white px-3 text-[11px] font-bold text-[#adb5bd] uppercase tracking-wider">hoặc</span>
                  </div>

                  <GoogleButton onClick={handleGoogle} loading={loading} />


                </form>
              )}

              {/* ── QUÊN MẬT KHẨU ── */}
              {tab === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#6c757d] uppercase tracking-wider">Email đã đăng ký</label>
                    <InputField icon={<Mail size={16} />} type="email" value={forgotEmail}
                      onChange={setForgotEmail} placeholder="example@email.com" autoComplete="email" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-primary hover:bg-[#0b5ed7] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-[14px] disabled:opacity-60 shadow-md shadow-primary/20">
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
                    Gửi link đặt lại mật khẩu
                  </button>
                </form>
              )}

              {/* Footer note */}
              <p className="text-[10px] text-[#adb5bd] text-center mt-4 font-medium leading-relaxed">
                Bằng cách tiếp tục, bạn đồng ý với{' '}
                <span className="text-primary cursor-pointer hover:underline">Điều khoản sử dụng</span>
                {' '}và{' '}
                <span className="text-primary cursor-pointer hover:underline">Chính sách bảo mật</span>
                {' '}của FMath12.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;