'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { MessageSquare, Calendar, Send, CheckCircle, Clock, BookOpen, HelpCircle, X } from 'lucide-react';

interface SupportRequest {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  subject_id: string;
  message: string;
  status: 'pending' | 'resolved';
  reply: string | null;
  teacher_id: string | null;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
}

interface SupportRequestManagerProps {
  initialRequests: SupportRequest[];
  studentId: string;
  studentName: string;
  className: string;
  token: string;
  subjects: Subject[];
  profiles?: any[];
}

export default function SupportRequestManager({
  initialRequests,
  studentId,
  studentName,
  className,
  token,
  subjects,
  profiles = []
}: SupportRequestManagerProps) {
  const supabase = createSupabaseClient(token);
  const [requests, setRequests] = useState<SupportRequest[]>(initialRequests);
  const [subjectId, setSubjectId] = useState(subjects.length > 0 ? subjects[0].id : '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        student_id: studentId,
        student_name: studentName,
        class_name: className,
        subject_id: subjectId,
        message: message.trim(),
        status: 'pending',
        reply: null,
        teacher_id: null
      };

      const { data, error } = await supabase
        .from('support_requests')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setRequests([data, ...requests]);
      setMessage('');
      alert('Đã gửi câu hỏi nhờ hỗ trợ chuyên môn thành công! Giáo viên sẽ sớm phản hồi cho bạn.');
    } catch (err) {
      console.error(err);
      alert('Không thể gửi yêu cầu hỗ trợ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-12 items-start">
      
      {/* CỘT TRÁI: FORM GỬI CÂU HỎI */}
      <div className="md:col-span-5 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-foreground/80 border-b border-border pb-2.5">
          <MessageSquare className="h-4.5 w-4.5 text-primary" /> Nhờ Giáo viên hỗ trợ chuyên môn
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Chọn Môn học</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded border border-border bg-background px-2.5 py-2 text-xs focus:outline-none font-bold text-foreground"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Nội dung thắc mắc / Cần hỗ trợ</label>
            <textarea
              placeholder="VD: Nhờ thầy cô giải đáp công thức tính đạo hàm bài 3, hoặc giải thích thêm phần tài liệu..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Send className="h-3.5 w-3.5" /> Gửi câu hỏi nhờ hỗ trợ
          </button>
        </form>
      </div>

      {/* CỘT PHẢI: LỊCH SỬ HỎI ĐÁP */}
      <div className="md:col-span-7 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-foreground/80 border-b border-border pb-2.5">
          <MessageSquare className="h-4.5 w-4.5 text-secondary" /> Lịch sử Hỏi đáp Chuyên môn
        </h3>

        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 divide-y divide-border/50">
          {requests.map((req) => {
            const subjectName = subjects.find(s => s.id === req.subject_id)?.name || 'Môn học';
            const isResolved = req.status === 'resolved';

            return (
              <div 
                key={req.id} 
                className={`pt-4 first:pt-0 space-y-2 group ${isResolved ? 'cursor-pointer' : ''}`}
                onClick={() => isResolved && setSelectedRequest(req)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-primary uppercase flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {subjectName}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${isResolved ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                    {isResolved ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                    {isResolved ? 'Đã phản hồi' : 'Đang chờ giáo viên'}
                  </span>
                </div>

                <p className="text-xs text-foreground font-semibold bg-muted/20 p-2.5 rounded-lg border border-border/50">
                  <strong className="text-[10px] text-muted-foreground block mb-0.5 font-bold">Câu hỏi:</strong>
                  {req.message}
                </p>

                {isResolved && req.reply && (
                  <div className="text-xs text-foreground bg-green-500/5 p-3 rounded-lg border border-green-500/15 pl-4 border-l-4 border-l-green-500 space-y-1">
                    <strong className="text-[10px] text-green-600 block font-bold">Giáo viên phản hồi:</strong>
                    <p className="font-semibold text-foreground/90 line-clamp-2">{req.reply}</p>
                    <span className="text-[9px] text-primary font-bold hover:underline inline-flex items-center gap-0.5 pt-1">
                      Nhấp để xem chi tiết phản hồi &rarr;
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {requests.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-8">Bạn chưa gửi yêu cầu hỗ trợ chuyên môn nào.</p>
          )}
        </div>
      </div>

      {/* POPUP MODAL CHI TIẾT CÂU TRẢ LỜI (GLASSMORPHIC) */}
      {selectedRequest && (
        <div 
          className="fixed inset-0 z-50 bg-slate-500/10 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedRequest(null)}
        >
          <div 
            className="bg-card border border-border max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in relative overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5 uppercase">
                  <BookOpen className="h-4 w-4 text-primary" /> Chi tiết thắc mắc học thuật
                </h3>
                <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">
                  Ngày gửi: {new Date(selectedRequest.created_at).toLocaleString('vi-VN')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 hover:bg-muted border border-border bg-background rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              <div className="bg-muted/30 border border-border/50 p-3.5 rounded-xl space-y-1 font-semibold">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Nội dung câu hỏi:</span>
                <p className="text-foreground leading-relaxed whitespace-pre-line">{selectedRequest.message}</p>
              </div>

              {selectedRequest.reply && (
                <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl pl-4 border-l-4 border-l-green-500 space-y-2">
                  <span className="text-[10px] text-green-600 uppercase font-bold block">Nội dung phản hồi từ giáo viên:</span>
                  <p className="text-foreground/95 leading-relaxed font-bold whitespace-pre-line">{selectedRequest.reply}</p>
                  
                  {/* HIỂN THỊ DANH TÍNH NGƯỜI TRẢ LỜI */}
                  <div className="pt-2 border-t border-green-500/10 flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold">
                    <HelpCircle className="h-3 w-3 text-green-600 animate-pulse" />
                    <span>Người giải đáp:</span>
                    <span className="text-foreground">
                      {profiles.find(p => p.id === selectedRequest.teacher_id)?.email || 'truongbomon@fpt.edu.vn'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="border-t border-border pt-3 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
