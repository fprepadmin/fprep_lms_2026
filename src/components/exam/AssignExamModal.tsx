'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, Send, Calendar, Clock, AlertCircle, 
  Users, CheckCircle2, ShieldCheck, Sparkles, BookOpen
} from 'lucide-react';

export interface ClassItem {
  id: string;
  name: string;
  group_type?: string;
  academic_year?: string;
}

export interface AssignmentPayload {
  class_id: string;
  due_date: string | null;
  start_date: string | null;
  note: string;
  score_weight: string;
}

interface AssignExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: {
    id: string;
    title: string;
    duration_minutes: number;
    subjects?: { name: string };
    exam_type?: string;
  } | null;
  classes: ClassItem[];
  existingAssignments?: Array<{
    class_id: string;
    due_date?: string | null;
    start_date?: string | null;
    note?: string | null;
    score_weight?: string | null;
  }>;
  onAssign: (assignments: AssignmentPayload[]) => Promise<void>;
}

export default function AssignExamModal({
  isOpen,
  onClose,
  exam,
  classes,
  existingAssignments = [],
  onAssign
}: AssignExamModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [scoreWeight, setScoreWeight] = useState<string>('15p');
  const [saving, setSaving] = useState(false);

  // Khởi tạo giá trị khi mở modal
  useEffect(() => {
    if (isOpen && exam) {
      const assignedIds = existingAssignments.map(a => a.class_id);
      setSelectedClassIds(assignedIds);
      
      const firstAss = existingAssignments[0];
      if (firstAss?.due_date) {
        // Format ISO to datetime-local string (YYYY-MM-DDTHH:mm)
        try {
          const d = new Date(firstAss.due_date);
          const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          setDueDate(iso);
        } catch (e) {
          setDueDate('');
        }
      } else {
        // Mặc định 7 ngày sau vào 23:59
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(23, 59, 0, 0);
        const iso = new Date(nextWeek.getTime() - nextWeek.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setDueDate(iso);
      }

      setNote(firstAss?.note || '');
      setScoreWeight(firstAss?.score_weight || '15p');
    }
  }, [isOpen, exam, existingAssignments]);

  if (!mounted || !isOpen || !exam) return null;

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClassIds.length === classes.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classes.map(c => c.id));
    }
  };

  // Quick preset deadline
  const setQuickDeadline = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDueDate(iso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 lớp học để giao bài!');
      return;
    }

    setSaving(true);
    try {
      const payloads: AssignmentPayload[] = selectedClassIds.map(classId => ({
        class_id: classId,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        start_date: new Date().toISOString(),
        note: note.trim(),
        score_weight: scoreWeight
      }));

      await onAssign(payloads);
      onClose();
    } catch (err: any) {
      alert('Không thể lưu phân công bài tập: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border max-w-2xl w-full rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-border pb-4 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary mb-1">
              <Send className="h-3.5 w-3.5" /> Hệ Thống LMS FPREP
            </div>
            <h3 className="font-extrabold text-lg sm:text-xl text-foreground">
              Giao Đề Thi / Bài Tập Cho Lớp
            </h3>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Đề: <strong className="text-foreground">{exam.title}</strong> &bull; {exam.duration_minutes} phút &bull; Môn {exam.subjects?.name || 'Chung'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-muted border border-border bg-background rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs">
          
          {/* 1. Chọn Lớp Nhận Bài */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" /> 1. Chọn lớp nhận bài ({selectedClassIds.length}/{classes.length} lớp)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {selectedClassIds.length === classes.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả các lớp'}
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="p-4 bg-muted/20 border border-border rounded-xl text-center text-muted-foreground">
                Chưa có danh sách lớp học. Vui lòng tạo lớp học trong mục Quản lý học sinh.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {classes.map(cls => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <div
                      key={cls.id}
                      onClick={() => toggleClass(cls.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
                        isChecked 
                          ? 'bg-primary/10 border-primary text-foreground font-bold shadow-sm' 
                          : 'bg-background border-border hover:bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block text-sm font-extrabold text-foreground">
                          Lớp {cls.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {cls.group_type === 'T' ? 'Tự nhiên' : cls.group_type === 'X' ? 'Xã hội' : 'Khai phóng'}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background'
                      }`}>
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Cài đặt Hạn chót & Thời gian */}
          <div className="space-y-2.5">
            <label className="font-extrabold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> 2. Hạn chót nộp bài (Deadline)
            </label>

            <div className="space-y-2">
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground font-bold mr-1">Phím nhanh:</span>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(1)}
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold border border-border text-foreground"
                >
                  +1 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(3)}
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold border border-border text-foreground"
                >
                  +3 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(7)}
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold border border-border text-foreground"
                >
                  +1 Tuần (Khuyên dùng)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(14)}
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-bold border border-border text-foreground"
                >
                  +2 Tuần
                </button>
              </div>
            </div>
          </div>

          {/* 3. Phân loại Cột điểm / Trọng số LMS */}
          <div className="space-y-2.5">
            <label className="font-extrabold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> 3. Quy cách tính điểm (Trọng số LMS)
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '15p', label: 'Điểm 15 phút', desc: 'Hệ số 1' },
                { id: '45p', label: 'Điểm 1 tiết / GK', desc: 'Hệ số 2' },
                { id: 'thpt', label: 'Thi thử THPT', desc: 'Đánh giá năng lực' },
                { id: 'practice', label: 'Luyện tập tự do', desc: 'Không tính vào sổ điểm' }
              ].map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setScoreWeight(w.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    scoreWeight === w.id 
                      ? 'bg-primary/10 border-primary text-foreground font-bold ring-1 ring-primary' 
                      : 'bg-background border-border hover:bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <span className="block text-xs font-bold text-foreground">{w.label}</span>
                  <span className="text-[10px] text-muted-foreground">{w.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Lời dặn dò của Giáo viên */}
          <div className="space-y-2.5">
            <label className="font-extrabold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" /> 4. Lời dặn dò & Ghi chú sư phạm
            </label>
            <textarea
              rows={3}
              placeholder="VD: Các em hoàn thành trước Chủ nhật, đề thi gồm 40 câu hỏi trắc nghiệm lấy điểm kiểm tra thường xuyên..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed resize-none"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted font-bold text-xs text-foreground transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving || selectedClassIds.length === 0}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {saving ? 'Đang giao bài...' : `Giao bài cho ${selectedClassIds.length} lớp`}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}
