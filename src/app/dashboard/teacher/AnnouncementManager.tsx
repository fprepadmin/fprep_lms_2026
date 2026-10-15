'use client';

import React, { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { Bell, Calendar, Plus, X, Image as ImageIcon, Bold, Italic, Underline, List, FileText } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  date: string;
  sender: string;
  created_at?: string;
  target_type?: 'all' | 'teachers' | 'individual';
  target_user_id?: string;
}

interface AnnouncementManagerProps {
  initialAnnouncements: Announcement[];
  userRole: string;
  token: string;
  userEmail: string;
  allProfiles?: { id: string; email: string; role: string }[];
}

export default function AnnouncementManager({
  initialAnnouncements,
  userRole,
  token,
  userEmail,
  allProfiles = []
}: AnnouncementManagerProps) {
  const supabase = createSupabaseClient(token);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [content, setContent] = useState('');
  const [sender, setSender] = useState(userRole === 'head_of_department' ? 'Trưởng bộ môn' : userRole === 'admin' ? 'Ban Giám Hiệu' : 'Tổ chuyên môn');
  const [targetType, setTargetType] = useState<'all' | 'teachers' | 'individual'>('all');
  const [targetUserId, setTargetUserId] = useState('');

  const contentRef = React.useRef<HTMLTextAreaElement>(null);

  const canCreate = userRole === 'teacher' || userRole === 'head_of_department' || userRole === 'admin';

  // Chèn định dạng chữ HTML vào vị trí con trỏ của Textarea
  const insertFormat = (tagOpen: string, tagClose: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + selected + tagClose;

    setContent(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 50);
  };

  const handleCreateAnnouncement = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Vui lòng điền tiêu đề và nội dung thông báo.');
      return;
    }

    if (userRole === 'admin' && targetType === 'individual' && !targetUserId) {
      alert('Vui lòng chọn tài khoản cá nhân nhận thông báo.');
      return;
    }

    try {
      const today = new Date();
      const dateStr = today.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const payload = {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        date: dateStr,
        sender: sender.trim(),
        target_type: userRole === 'admin' ? targetType : 'all',
        target_user_id: userRole === 'admin' && targetType === 'individual' ? targetUserId || null : null
      };

      const { data, error } = await supabase
        .from('announcements')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setAnnouncements([data, ...announcements]);
      setTitle('');
      setImageUrl('');
      setContent('');
      setTargetType('all');
      setTargetUserId('');
      setShowForm(false);
      alert('Đăng thông báo mới thành công!');
    } catch (err) {
      console.error(err);
      alert('Không thể đăng thông báo mới.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAnnouncements(announcements.filter(ann => ann.id !== id));
      alert('Đã xóa thông báo.');
    } catch (err) {
      console.error(err);
      alert('Không thể xóa thông báo.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <h2 className="text-base font-bold font-heading flex items-center gap-2 m-0 text-[#212529] dark:text-foreground">
          <Bell className="h-4.5 w-4.5 text-primary" /> Bảng tin Thông báo Nội bộ
        </h2>

        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary py-1.5 px-3 text-xs"
          >
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showForm ? 'Đóng form' : 'Đăng tin mới'}</span>
          </button>
        )}
      </div>

      {/* FORM SOẠN THẢO THÔNG BÁO MỚI */}
      {showForm && (
        <div className="rounded-2xl border border-primary/30 bg-[#e7f1ff]/20 dark:bg-primary/10 p-4 sm:p-5 space-y-4 animate-page-enter">
          <div className="flex justify-between items-center border-b border-border/80 pb-2">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 m-0">
              <FileText className="h-4 w-4" /> Soạn thảo thông báo mới
            </h3>
            <button 
              onClick={() => setShowForm(false)}
              className="text-[#6c757d] hover:text-[#212529] dark:hover:text-foreground p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#6c757d] uppercase">Tiêu đề thông báo</label>
              <input
                type="text"
                placeholder="Nhập tiêu đề thông báo ngắn gọn, rõ ràng..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold text-foreground"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {userRole === 'admin' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#6c757d] uppercase">Đối tượng nhận tin</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary font-bold text-primary"
                  >
                    <option value="all">Toàn trường (Học sinh + Giáo viên)</option>
                    <option value="teachers">Chỉ Thầy Cô Giáo</option>
                    <option value="individual">Gửi riêng cho 1 tài khoản</option>
                  </select>

                  {targetType === 'individual' && (
                    <div className="pt-2">
                      <label className="text-[10px] font-bold text-[#6c757d] uppercase">Chọn tài khoản nhận riêng:</label>
                      <select
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none font-semibold text-foreground mt-1"
                      >
                        <option value="">-- Chọn tài khoản nhận tin --</option>
                        {allProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.email} ({p.role === 'student' ? 'Học sinh' : p.role === 'teacher' ? 'Giáo viên' : p.role === 'head_of_department' ? 'HOD' : 'Admin'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#6c757d] uppercase">Danh xưng người gửi</label>
                <input
                  type="text"
                  placeholder="VD: Tổ bộ môn Toán học, Ban Giám Hiệu..."
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:border-primary text-foreground font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#6c757d] uppercase">Đường dẫn hình ảnh đính kèm (Image URL)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Dán link ảnh tại đây (không bắt buộc)..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-primary text-foreground"
                  />
                  <ImageIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#6c757d]" />
                </div>
              </div>
              {imageUrl.trim() && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-[#6c757d] uppercase mb-1">Xem trước ảnh đính kèm:</p>
                  <img src={imageUrl} alt="Preview" className="max-h-40 rounded-xl border border-border object-cover" onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500'; }} />
                </div>
              )}
            </div>

            {/* THANH ĐỊNH DẠNG CHỮ RICH TEXT TOOLBAR */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#6c757d] uppercase block">Nội dung thông báo</label>
              
              <div className="border border-border rounded-xl bg-background overflow-hidden">
                <div className="flex items-center gap-1 p-1.5 border-b border-border bg-[#f8f9fa] dark:bg-muted/40 text-[#6c757d] select-none">
                  <button 
                    type="button"
                    onClick={() => insertFormat('<b>', '</b>')}
                    className="p-1 hover:bg-muted rounded text-foreground font-bold"
                    title="Chữ đậm"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertFormat('<i>', '</i>')}
                    className="p-1 hover:bg-muted rounded text-foreground italic"
                    title="Chữ nghiêng"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => insertFormat('<u>', '</u>')}
                    className="p-1 hover:bg-muted rounded text-foreground underline"
                    title="Gạch chân"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-border px-1">|</span>
                  <button 
                    type="button"
                    onClick={() => insertFormat('<li>', '</li>')}
                    className="p-1 hover:bg-muted rounded text-foreground"
                    title="Danh sách mục"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>

                <textarea
                  ref={contentRef}
                  placeholder="Soạn nội dung thông báo... (Sử dụng thanh định dạng bên trên hoặc viết chữ thường)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent px-3 py-2 text-xs focus:outline-none border-0 text-foreground font-medium leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateAnnouncement}
                className="btn-primary py-1.5 px-4 text-xs"
              >
                Đăng thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DANH SÁCH THÔNG BÁO */}
      <div className="space-y-3">
        {announcements.map((ann) => {
          const textOnly = ann.content.replace(/<[^>]*>/g, ' ');
          const truncated = textOnly.length > 180 ? textOnly.substring(0, 180) + '...' : textOnly;

          return (
            <div 
              key={ann.id} 
              className="p-4 rounded-xl border border-border hover:border-primary/40 bg-[#ffffff] dark:bg-card/80 hover:bg-[#f8f9fa] dark:hover:bg-muted/20 transition-all cursor-pointer space-y-2 group shadow-sm"
              onClick={() => setSelectedAnnouncement(ann)}
            >
              <div className="flex justify-between items-start gap-3">
                <h3 className="font-bold text-[14px] font-heading text-[#212529] dark:text-foreground group-hover:text-primary transition-colors m-0">
                  {ann.title}
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-1">
                      {ann.target_type === 'teachers' && (
                        <span className="badge-primary">Chỉ Thầy Cô</span>
                      )}
                      {ann.target_type === 'individual' && (
                        <span className="badge-warning">
                          Gửi riêng: {allProfiles?.find(p => p.id === ann.target_user_id)?.email || 'Tài khoản'}
                        </span>
                      )}
                      {(!ann.target_type || ann.target_type === 'all') && (
                        <span className="badge-info">Tất cả</span>
                      )}
                    </div>
                  )}
                  <span className="text-[11px] text-[#6c757d] dark:text-muted-foreground font-semibold flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {ann.date} &bull; {ann.sender}
                  </span>
                  {canCreate && (
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="text-[#dc3545] hover:bg-[#f8d7da] p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Xóa thông báo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* RENDER NỘI DUNG TÓM TẮT TRONG LIST */}
              <p className="text-xs text-[#6c757d] dark:text-muted-foreground leading-relaxed font-medium m-0">
                {truncated}
              </p>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] text-primary font-bold hover:underline inline-flex items-center gap-0.5">
                  Xem chi tiết &rarr;
                </span>
                
                {ann.image_url && (
                  <span className="badge-secondary flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" /> Có ảnh đính kèm
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {announcements.length === 0 && (
          <p className="text-xs text-[#6c757d] italic text-center py-6 m-0">Chưa có thông báo nào được đăng tải.</p>
        )}
      </div>

      {/* POPUP MODAL XEM CHI TIẾT THÔNG BÁO (CHUẨN FPREP MODAL) */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div 
            className="bg-white dark:bg-card border border-border max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4 relative overflow-hidden flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-border pb-3 shrink-0 gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base font-heading text-[#212529] dark:text-foreground flex items-center gap-2 m-0">
                  <Bell className="h-4.5 w-4.5 text-primary shrink-0" /> {selectedAnnouncement.title}
                </h3>
                <p className="text-[11px] text-[#6c757d] dark:text-muted-foreground font-semibold mt-1 m-0">
                  Đăng ngày: {selectedAnnouncement.date} &bull; Người gửi: {selectedAnnouncement.sender}
                </p>
              </div>
              <button 
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 hover:bg-muted border border-border bg-background rounded-lg transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              <div 
                dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }} 
                className="text-xs text-[#212529] dark:text-foreground leading-relaxed font-medium space-y-2 whitespace-pre-line"
              />

              {selectedAnnouncement.image_url && (
                <div className="pt-2">
                  <img 
                    src={selectedAnnouncement.image_url} 
                    alt={selectedAnnouncement.title} 
                    className="w-full rounded-xl border border-border object-cover max-h-96 shadow-md"
                    onError={(e) => { (e.target as any).style.display = 'none'; }}
                  />
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="border-t border-border pt-3 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedAnnouncement(null)}
                className="btn-primary py-2 px-5 text-xs"
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
