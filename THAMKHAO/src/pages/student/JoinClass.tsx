import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAppStore } from '../../store/useAppStore';
import { Loader2, CheckCircle2, AlertCircle, Users, Clock, ArrowRight } from 'lucide-react';

const JoinClass = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [status, setStatus] = useState<'loading' | 'joined' | 'pending' | 'not_found' | 'need_request'>('loading');
  const [classInfo, setClassInfo] = useState<any>(null);

  useEffect(() => {
    const checkJoinStatus = async () => {
      if (!currentUser?.id || !currentUser?.email || !code) return;
      
      // 1. Tìm thông tin lớp bằng mã code
      const { data: cls } = await supabase.from('classes').select('*').eq('join_code', code).maybeSingle();
      
      if (!cls) {
        setStatus('not_found');
        return;
      }
      setClassInfo(cls);

      // 2. Kiểm tra xem học sinh này đã có trong danh sách chưa (Tìm theo ID hoặc Email)
      const { data: member } = await supabase
        .from('class_members')
        .select('*')
        .eq('class_id', cls.id)
        .or(`user_id.eq.${currentUser.id},student_email.ilike.${currentUser.email}`)
        .maybeSingle();

      if (member) {
        if (member.status === 'joined') {
          setStatus('joined'); // Đã trong lớp
        } else if (member.status === 'pending') {
          setStatus('pending'); // Đang chờ duyệt
        } else {
          setStatus('need_request'); // Trạng thái 'ghost' (GV thêm bằng Excel nhưng HS chưa ấn link)
        }
      } else {
        setStatus('need_request'); // Người lạ hoàn toàn
      }
    };

    checkJoinStatus();
  }, [code, currentUser]);

  const handleRequestJoin = async () => {
    if (!classInfo || !currentUser?.id || !currentUser?.email) return;
    setStatus('loading');
    
    try {
      // 1. Kiểm tra xem giáo viên đã add sẵn email này bằng Excel/Thủ công chưa (Trạng thái ghost)
      const { data: existingMember } = await supabase
        .from('class_members')
        .select('*')
        .eq('class_id', classInfo.id)
        .ilike('student_email', currentUser.email)
        .maybeSingle();

      if (existingMember) {
        // NẾU GV ĐÃ THÊM SẴN -> Cập nhật ID và cho vào lớp LUÔN (Không cần duyệt)
        const { error } = await supabase
          .from('class_members')
          .update({
            user_id: currentUser.id,
            status: 'joined' 
          })
          .eq('id', existingMember.id);

        if (error) throw error;
        setStatus('joined');
      } else {
        // NẾU NGƯỜI LẠ CÓ LINK -> Insert tạo request Pending
        const { error } = await supabase.from('class_members').insert({
          class_id: classInfo.id,
          user_id: currentUser.id,
          student_email: currentUser.email.toLowerCase(),
          status: 'pending'
        });

        if (error) throw error;
        setStatus('pending');
      }
    } catch (err: any) {
      console.error(err);
      alert("Có lỗi xảy ra: " + err.message);
      setStatus('need_request');
    }
  };

  return (
    <div className="page-container items-center justify-center p-6 bg-[#f8f9fa]">
      <div className="bg-white max-w-md w-full p-8 rounded-[32px] border border-[#dee2e6] shadow-xl text-center">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center text-primary">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="font-bold">Đang kiểm tra thông tin lớp học...</p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="flex flex-col items-center text-[#6c757d]">
            <AlertCircle size={48} className="mb-4 text-[#dc3545]" />
            <h3 className="text-xl font-black text-[#212529] mb-2">Không tìm thấy lớp học</h3>
            <p className="font-medium mb-6">Liên kết không hợp lệ hoặc lớp học đã bị xóa.</p>
            <Link to="/dashboard" className="bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#495057] px-6 py-3 rounded-xl font-bold transition-colors">Quay lại trang chủ</Link>
          </div>
        )}

        {status === 'joined' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <CheckCircle2 size={56} className="mb-4 text-[#198754]" />
            <h3 className="text-2xl font-black text-[#212529] mb-2">Tuyệt vời!</h3>
            <p className="font-medium text-[#6c757d] mb-6">
              Bạn đã là thành viên của lớp <strong>{classInfo?.name}</strong>.
            </p>
            <button onClick={() => navigate('/classroom')} className="w-full btn-primary px-6 py-3.5 rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2 hover:-translate-y-1">
              Vào không gian lớp ngay <ArrowRight size={18}/>
            </button>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex flex-col items-center animate-in fade-in">
            <Clock size={56} className="mb-4 text-[#ffc107]" />
            <h3 className="text-2xl font-black text-[#212529] mb-2">Đang chờ phê duyệt</h3>
            <p className="font-medium text-[#6c757d] mb-6">
              Yêu cầu tham gia lớp <strong>{classInfo?.name}</strong> của bạn đã được gửi. Vui lòng chờ giáo viên xác nhận nhé!
            </p>
            <Link to="/dashboard" className="w-full bg-[#f8f9fa] hover:bg-[#e9ecef] text-[#495057] px-6 py-3.5 rounded-xl font-bold transition-colors">Về trang chủ</Link>
          </div>
        )}

        {status === 'need_request' && (
          <div className="flex flex-col items-center animate-in fade-in">
            <div className="w-20 h-20 bg-[#e7f1ff] text-primary rounded-full flex items-center justify-center mb-6">
              <Users size={40} />
            </div>
            <h3 className="text-2xl font-black text-[#212529] mb-2">Tham gia lớp học</h3>
            <p className="font-medium text-[#6c757d] mb-6">
              Bạn đang được mời tham gia lớp <br/>
              <strong className="text-lg text-primary">{classInfo?.name}</strong>
            </p>
            <button onClick={handleRequestJoin} className="w-full btn-primary px-6 py-3.5 rounded-xl font-bold shadow-md transition-all hover:-translate-y-1">
              Xác nhận Tham gia
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default JoinClass;