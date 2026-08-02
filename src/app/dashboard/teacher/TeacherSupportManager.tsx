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
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3 gap-3">
        <h2 className="text-base font-extrabold flex items-center gap-2 text-foreground">
          <MessageSquare className="h-4.5 w-4.5 text-primary" /> Yêu Cầu Hỗ Trợ Chuyên Môn Của Học Sinh
        </h2>
        
        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-lg">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'pending' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Đang chờ ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'resolved' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Đã giải quyết ({requests.filter(r => r.status === 'resolved').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
            <div key={req.id} className="pt-4 first:pt-0 space-y-3 group">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h4 className="font-extrabold text-xs text-primary uppercase flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {subjectName} &bull; Lớp {req.class_name}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 flex items-center gap-1">
                    <User className="h-3 w-3" /> {req.student_name} &bull; Đăng lúc: {new Date(req.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${!isPending ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>
                  {!isPending ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5 animate-spin" />}
                  {!isPending ? 'Đã phản hồi' : 'Chờ phản hồi'}
                </span>
              </div>

              {/* Nội dung câu hỏi */}
              <div className="text-xs text-foreground font-semibold bg-muted/20 p-3 rounded-lg border border-border/50">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Nội dung thắc mắc:</span>
                <p className="whitespace-pre-line leading-relaxed">{req.message}</p>
              </div>

              {/* Form phản hồi của Giáo viên */}
              {isPending ? (
                <div className="space-y-2 pt-1 pl-2 border-l-2 border-primary/20">
                  <div className="flex gap-2">
                    <textarea
                      placeholder="Nhập nội dung giải đáp chuyên môn..."
                      value={replies[req.id] || ''}
                      onChange={(e) => setReplies({ ...replies, [req.id]: e.target.value })}
                      rows={2}
                      className="flex-1 rounded border border-border bg-background px-3 py-2 text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => handleReplySubmit(req.id)}
                      className="px-4 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center text-xs shrink-0 gap-1"
                    >
                      <Send className="h-3.5 w-3.5" /> Gửi
                    </button>
                  </div>
                </div>
              ) : (
                req.reply && (
                  <div className="text-xs text-foreground bg-green-500/5 p-3 rounded-lg border border-green-500/15 pl-4 border-l-4 border-l-green-500 space-y-1">
                    <strong className="text-[10px] text-green-600 block">Bạn đã phản hồi:</strong>
                    <p className="font-semibold text-foreground/90 whitespace-pre-line">{req.reply}</p>
                  </div>
                )
              )}

            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-8">Không có yêu cầu hỗ trợ chuyên môn nào phù hợp bộ lọc.</p>
        )}
      </div>

    </div>
  );
}
