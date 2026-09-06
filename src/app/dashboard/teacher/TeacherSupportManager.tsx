'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { MessageSquare, CheckCircle, Clock, Send, User, BookOpen } from 'lucide-react';

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

interface TeacherSupportManagerProps {
  initialRequests: SupportRequest[];
  teacherId: string;
  token: string;
  subjects: Subject[];
}

export default function TeacherSupportManager({
  initialRequests,
  teacherId,
  token,
  subjects
}: TeacherSupportManagerProps) {
  const supabase = createSupabaseClient(token);
  const [requests, setRequests] = useState<SupportRequest[]>(initialRequests);
  const [replies, setReplies] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');

  const handleReplySubmit = async (reqId: string) => {
    const replyText = replies[reqId];
    if (!replyText || !replyText.trim()) {
      alert('Vui lòng nhập nội dung phản hồi.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_requests')
        .update({
          reply: replyText.trim(),
          status: 'resolved',
          teacher_id: teacherId
        })
        .eq('id', reqId)
        .select()
        .single();

      if (error) throw error;

      setRequests(requests.map(r => r.id === reqId ? data : r));
      setReplies({ ...replies, [reqId]: '' });
      alert('Phản hồi câu hỏi của học sinh thành công!');
    } catch (err) {
      console.error(err);
      alert('Không thể gửi phản hồi.');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  return (
    <div className="flat-card space-y-5 bg-white dark:bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3.5 gap-3">
        <h2 className="text-base font-bold font-heading flex items-center gap-2 m-0 text-[#212529] dark:text-foreground">
          <MessageSquare className="h-4.5 w-4.5 text-primary" /> Yêu Cầu Hỗ Trợ Chuyên Môn Của Học Sinh
        </h2>
        
        {/* Bộ lọc trạng thái dạng Pill FMATH */}
        <div className="flex items-center gap-1.5 bg-[#f8f9fa] dark:bg-muted/40 border border-border p-1 rounded-xl">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filter === 'pending'
                ? 'bg-primary text-white shadow-sm'
                : 'text-[#6c757d] hover:text-[#212529] dark:hover:text-foreground'
            }`}
          >
            Đang chờ ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filter === 'resolved'
                ? 'bg-primary text-white shadow-sm'
                : 'text-[#6c757d] hover:text-[#212529] dark:hover:text-foreground'
            }`}
          >
            Đã giải quyết ({requests.filter(r => r.status === 'resolved').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-[#6c757d] hover:text-[#212529] dark:hover:text-foreground'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      <div className="space-y-4 divide-y divide-border/50">
        {filteredRequests.map((req) => {
          const subjectName = subjects.find(s => s.id === req.subject_id)?.name || 'Môn học';
          const isPending = req.status === 'pending';

          return (
            <div key={req.id} className="pt-4 first:pt-0 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h4 className="font-bold text-xs text-primary uppercase flex items-center gap-1.5 m-0">
                    <BookOpen className="h-3.5 w-3.5" /> {subjectName} &bull; Lớp {req.class_name}
                  </h4>
                  <p className="text-[11px] text-[#6c757d] dark:text-muted-foreground font-semibold mt-1 flex items-center gap-1.5 m-0">
                    <User className="h-3 w-3" /> <strong className="text-[#212529] dark:text-foreground">{req.student_name}</strong> &bull; Đăng lúc: {new Date(req.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  !isPending 
                    ? 'bg-[#d1e7dd] text-[#0f5132] border-[#a3cfbb]' 
                    : 'bg-[#fff3cd] text-[#664d03] border-[#ffe69c]'
                }`}>
                  {!isPending ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {!isPending ? 'Đã phản hồi' : 'Chờ phản hồi'}
                </span>
              </div>

              {/* Nội dung câu hỏi */}
              <div className="text-xs text-[#212529] dark:text-foreground font-semibold bg-[#f8f9fa] dark:bg-muted/30 p-3.5 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-[#6c757d] uppercase block mb-1">Nội dung thắc mắc:</span>
                <p className="whitespace-pre-line leading-relaxed m-0">{req.message}</p>
              </div>

              {/* Form phản hồi của Giáo viên */}
              {isPending ? (
                <div className="space-y-2 pt-1 pl-3 border-l-2 border-primary/40">
                  <div className="flex gap-2.5">
                    <textarea
                      placeholder="Nhập nội dung giải đáp chuyên môn cho học sinh..."
                      value={replies[req.id] || ''}
                      onChange={(e) => setReplies({ ...replies, [req.id]: e.target.value })}
                      rows={2}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary text-foreground font-semibold"
                    />
                    <button
                      onClick={() => handleReplySubmit(req.id)}
                      className="btn-primary shrink-0 self-end"
                    >
                      <Send className="h-3.5 w-3.5" /> Gửi phản hồi
                    </button>
                  </div>
                </div>
              ) : (
                req.reply && (
                  <div className="text-xs bg-[#d1e7dd]/30 p-3.5 rounded-xl border border-[#a3cfbb] pl-4 border-l-4 border-l-[#198754] space-y-1">
                    <strong className="text-[10px] text-[#0f5132] block font-bold">Thầy/Cô đã phản hồi:</strong>
                    <p className="font-semibold text-[#212529] dark:text-foreground/90 whitespace-pre-line m-0">{req.reply}</p>
                  </div>
                )
              )}

            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <p className="text-xs text-[#6c757d] italic text-center py-8 m-0">Không có yêu cầu hỗ trợ chuyên môn nào phù hợp bộ lọc.</p>
        )}
      </div>

    </div>
  );
}
