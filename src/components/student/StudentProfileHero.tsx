'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  GraduationCap, Calendar, Camera, Flame, Target, Lock, Check,
  SlidersHorizontal, Loader2, ClipboardList, BarChart3, Sparkles, User
} from 'lucide-react';
import SubjectIcon from '@/components/student/SubjectIcon';
import DailyQuote from '@/components/student/DailyQuote';
import { getSubjectColorTheme } from '@/lib/schoolUtils';

export interface GraduationSubjectOption {
  id: string;
  name: string;
  group_type?: string;
}

export interface StudentSubjectExamStat {
  subjectId: string;
  attempts: number;
  avgScore: number | null;
}

export interface StudentProfileHeroProps {
  studentId: string;
  studentName: string;
  studentMshs: string;
  className: string;
  groupType: string;
  academicYear: string;
  level: number;
  levelTitle: string;
  xp: number;
  nextLevelProgress: number;
  streakDays: number;
  allSubjects: GraduationSubjectOption[];
  subjectStatsMap: Record<string, StudentSubjectExamStat>;
  initialAvatarUrl: string | null;
  initialElectiveIds: string[];
}

const FALLBACK_ELECTIVES: GraduationSubjectOption[] = [
  { id: '__phys__', name: 'Vật lý', group_type: 'T' },
  { id: '__chem__', name: 'Hóa học', group_type: 'T' },
  { id: '__bio__', name: 'Sinh học', group_type: 'T' },
  { id: '__eng__', name: 'Tiếng Anh', group_type: 'ENG' },
  { id: '__hist__', name: 'Lịch sử', group_type: 'X' },
  { id: '__geo__', name: 'Địa lý', group_type: 'X' },
  { id: '__it__', name: 'Tin học', group_type: 'T' },
  { id: '__gdktpl__', name: 'GDKT & PL', group_type: 'X' },
];

function isMathSubject(name: string) {
  const n = (name || '').toLowerCase();
  return n.includes('toán');
}

function isLiteratureSubject(name: string) {
  const n = (name || '').toLowerCase();
  return n.includes('ngữ văn') || n === 'văn' || n.includes('văn học');
}

/**
 * Nén và cắt vuông ảnh đại diện 320x320 bằng canvas để tải nhanh và nhẹ
 */
async function compressAvatarFile(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Không thể đọc định dạng ảnh này.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
    reader.readAsDataURL(file);
  });
}

export default function StudentProfileHero({
  studentId,
  studentName,
  studentMshs,
  className,
  groupType,
  academicYear,
  level,
  levelTitle,
  xp,
  nextLevelProgress,
  streakDays,
  allSubjects,
  subjectStatsMap,
  initialAvatarUrl,
  initialElectiveIds,
}: StudentProfileHeroProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storageKey = `fprep_student_profile_${studentId}`;

  // Xác định 2 môn bắt buộc (Toán & Ngữ văn) và danh sách các môn tự chọn có sẵn
  const { mathSubject, litSubject, electivePool } = useMemo(() => {
    const dbMath = allSubjects.find((s) => isMathSubject(s.name));
    const dbLit = allSubjects.find((s) => isLiteratureSubject(s.name));

    const mathObj: GraduationSubjectOption = dbMath || { id: '__math__', name: 'Toán học', group_type: 'T' };
    const litObj: GraduationSubjectOption = dbLit || { id: '__lit__', name: 'Ngữ văn', group_type: 'X' };

    const dbElectives = allSubjects.filter(
      (s) => !isMathSubject(s.name) && !isLiteratureSubject(s.name)
    );

    // Gộp danh sách môn trong DB; nếu thiếu các môn thi TN chuẩn thì bổ sung không trùng tên
    const pool: GraduationSubjectOption[] = [...dbElectives];
    FALLBACK_ELECTIVES.forEach((fb) => {
      const exists = pool.some(
        (s) =>
          s.name.toLowerCase().replace(/lí/g, 'lý') ===
          fb.name.toLowerCase().replace(/lí/g, 'lý')
      );
      if (!exists) {
        pool.push(fb);
      }
    });

    return { mathSubject: mathObj, litSubject: litObj, electivePool: pool };
  }, [allSubjects]);

  // Tính 2 môn tự chọn mặc định theo phân ban nếu học sinh chưa từng lưu
  const defaultElectiveIds = useMemo(() => {
    const validInitial = (initialElectiveIds || []).filter((id) =>
      electivePool.some((s) => s.id === id)
    );
    if (validInitial.length === 2) return validInitial;

    const preferredOrder =
      groupType === 'X'
        ? ['tiếng anh', 'lịch sử', 'địa', 'gdkt']
        : ['vật l', 'hóa', 'tiếng anh', 'sinh', 'tin'];

    const picked: string[] = [...validInitial];
    for (const kw of preferredOrder) {
      if (picked.length >= 2) break;
      const found = electivePool.find(
        (s) => s.name.toLowerCase().includes(kw) && !picked.includes(s.id)
      );
      if (found) picked.push(found.id);
    }
    for (const s of electivePool) {
      if (picked.length >= 2) break;
      if (!picked.includes(s.id)) picked.push(s.id);
    }
    return picked.slice(0, 2);
  }, [initialElectiveIds, electivePool, groupType]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [selectedElectiveIds, setSelectedElectiveIds] = useState<string[]>(defaultElectiveIds);
  const [draftElectiveIds, setDraftElectiveIds] = useState<string[]>(defaultElectiveIds);
  const [showPicker, setShowPicker] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingElectives, setSavingElectives] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Đồng bộ fallback từ localStorage nếu server chưa có dữ liệu
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (!initialAvatarUrl && typeof cached.avatar_url === 'string' && cached.avatar_url) {
        setAvatarUrl(cached.avatar_url);
      }
      if (
        initialElectiveIds.length < 2 &&
        Array.isArray(cached.elective_subject_ids) &&
        cached.elective_subject_ids.length === 2
      ) {
        const valid = cached.elective_subject_ids.filter((id: string) =>
          electivePool.some((s) => s.id === id)
        );
        if (valid.length === 2) {
          setSelectedElectiveIds(valid);
          setDraftElectiveIds(valid);
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, [storageKey, initialAvatarUrl, initialElectiveIds, electivePool]);

  const flashMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const persistLocal = (nextAvatar: string | null, nextElectives: string[]) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          avatar_url: nextAvatar,
          elective_subject_ids: nextElectives,
        })
      );
    } catch {
      // ignore quota errors
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP).');
      return;
    }

    setUploadingAvatar(true);
    try {
      const compressed = await compressAvatarFile(file);
      const formData = new FormData();
      formData.append('file', compressed, `avatar_${studentId}.jpg`);
      formData.append('folder', 'fprep_student_avatars');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Tải ảnh lên thất bại.');
      }

      const finalUrl = String(uploadData.url);
      setAvatarUrl(finalUrl);
      persistLocal(finalUrl, selectedElectiveIds);

      const saveRes = await fetch('/api/student/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: finalUrl }),
      });

      if (!saveRes.ok) {
        console.warn('Lưu ảnh vào server chưa hoàn tất, đã lưu cục bộ.');
      }
      flashMessage('Đã cập nhật ảnh đại diện!');
    } catch (err: any) {
      alert(err?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleDraftElective = (subjectId: string) => {
    setDraftElectiveIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      }
      if (prev.length >= 2) {
        // Thay môn chọn sớm nhất để chọn nhanh mượt mà
        return [prev[1], subjectId];
      }
      return [...prev, subjectId];
    });
  };

  const handleSaveElectives = async () => {
    if (draftElectiveIds.length !== 2) {
      alert('Vui lòng chọn đủ 2 môn thi tự chọn (cùng với Toán và Ngữ văn bắt buộc).');
      return;
    }

    setSavingElectives(true);
    try {
      setSelectedElectiveIds(draftElectiveIds);
      persistLocal(avatarUrl, draftElectiveIds);

      const res = await fetch('/api/student/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elective_subject_ids: draftElectiveIds }),
      });

      if (!res.ok) {
        console.warn('Lưu môn tự chọn vào server chưa hoàn tất, đã lưu cục bộ.');
      }

      setShowPicker(false);
      flashMessage('Đã lưu tổ hợp 4 môn thi tốt nghiệp!');
    } finally {
      setSavingElectives(false);
    }
  };

  // Danh sách 4 môn thi tốt nghiệp hiển thị (2 bắt buộc + 2 tự chọn)
  const graduationSubjects = useMemo(() => {
    const elec1 =
      electivePool.find((s) => s.id === selectedElectiveIds[0]) || electivePool[0];
    const elec2 =
      electivePool.find((s) => s.id === selectedElectiveIds[1]) ||
      electivePool.find((s) => s.id !== elec1?.id) ||
      electivePool[1];

    const list: { subject: GraduationSubjectOption; required: boolean; slotLabel: string }[] = [
      { subject: mathSubject, required: true, slotLabel: 'Bắt buộc' },
      { subject: litSubject, required: true, slotLabel: 'Bắt buộc' },
    ];
    if (elec1) list.push({ subject: elec1, required: false, slotLabel: 'Tự chọn 1' });
    if (elec2) list.push({ subject: elec2, required: false, slotLabel: 'Tự chọn 2' });
    return list;
  }, [mathSubject, litSubject, electivePool, selectedElectiveIds]);

  const getScoreColorClass = (avg: number | null) => {
    if (avg === null) return 'text-[#94A3B8] dark:text-slate-500';
    if (avg >= 8.0) return 'text-emerald-600 dark:text-emerald-400';
    if (avg >= 6.5) return 'text-[#1746D1] dark:text-[#00DFFF]';
    if (avg >= 5.0) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#00DFFF]/30 bg-gradient-to-br from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-4 sm:p-5 text-white shadow-[0_12px_36px_-6px_rgba(23,70,209,0.28)]">
      {/* Glow ambient */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#00DFFF]/18 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-[#087CFF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* ================================================================= */}
        {/* HÀNG 1: KHUNG ẢNH + THÔNG TIN TRƯỜNG/HỌ TÊN/LỚP/NIÊN KHÓA + CẤP ĐỘ/XP */}
        {/* ================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Cột trái: Khung ảnh học sinh + Thông tin định danh */}
          <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
            {/* KHUNG ẢNH ĐỂ HỌC SINH TẢI ẢNH LÊN */}
            <div className="relative shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                title="Nhấn để tải ảnh đại diện của bạn lên"
                className="group relative w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full overflow-hidden border-[3px] border-[#F26F21] ring-2 ring-orange-400/35 bg-white/15 backdrop-blur-md shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:border-orange-300 hover:scale-[1.02] active:scale-95"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={studentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-white/90 px-1 text-center">
                    <User className="h-7 w-7 text-orange-300" />
                    <span className="text-[10px] font-bold leading-none text-blue-100">
                      Tải ảnh
                    </span>
                  </div>
                )}

                {/* Overlay khi rê chuột hoặc đang tải */}
                <div
                  className={`absolute inset-0 bg-[#0B1B55]/65 flex flex-col items-center justify-center gap-0.5 transition-opacity ${
                    uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 text-orange-300 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-4 w-4 text-orange-300" />
                      <span className="text-[10px] font-bold text-white">
                        {avatarUrl ? 'Đổi ảnh' : 'Tải ảnh'}
                      </span>
                    </>
                  )}
                </div>
              </button>

              {/* Nút icon máy ảnh nhỏ ở góc dưới phải */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Tải ảnh học sinh"
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white text-[#F26F21] border-2 border-[#F26F21] shadow-md flex items-center justify-center hover:bg-orange-50 transition-colors cursor-pointer"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            {/* Thông tin trường, họ tên, lớp, niên khóa */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-extrabold text-[#00DFFF] border border-white/25 backdrop-blur-md uppercase tracking-wide">
                  <GraduationCap className="h-3.5 w-3.5 text-[#00DFFF]" />
                  Trường THPT FPT Cần Thơ
                </span>
                {statusMessage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 border border-emerald-300/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
                    <Check className="h-3 w-3" /> {statusMessage}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight leading-snug m-0 truncate">
                {studentName}
              </h1>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 bg-white/12 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-md">
                  Lớp:{' '}
                  <strong className="text-[#00DFFF] font-black">
                    {className}
                  </strong>
                  <span className="text-blue-200">
                    ({groupType === 'T' ? 'Tự Nhiên' : groupType === 'X' ? 'Xã Hội' : 'Khác'})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 bg-white/12 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-md">
                  <Calendar className="h-3 w-3 text-amber-300" />
                  Niên khóa: <strong className="text-white font-black">{academicYear}</strong>
                </span>
                <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15 backdrop-blur-md text-blue-100">
                  MSHS: <strong className="text-white font-bold">{studentMshs}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải: Cấp độ + Kinh nghiệm + Câu động lực gọn */}
          <div className="flex flex-col gap-2 shrink-0 w-full lg:w-[370px] xl:w-[400px] min-w-0">
            <div className="grid grid-cols-2 items-center gap-2.5 bg-white/95 dark:bg-[#071328]/95 px-3.5 py-2.5 rounded-xl backdrop-blur-md border border-white/30 text-[#14213D] dark:text-white shadow-md">
              {/* Cấp độ */}
              <div className="flex items-center gap-2.5 pr-2.5 border-r border-[#E2E8F0] dark:border-[#1B317A] min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0B1B55] via-[#1746D1] to-[#087CFF] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 font-heading">
                  {level}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wide truncate">
                    Cấp độ
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#14213D] dark:text-white font-heading leading-tight truncate">
                    Cấp {level}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="flex-1 max-w-[54px] bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#1746D1] h-full rounded-full"
                        style={{ width: `${nextLevelProgress}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-black text-[#1746D1] dark:text-[#00DFFF]">
                      {nextLevelProgress}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Kinh nghiệm */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-400/35 shrink-0">
                  <Flame className="h-4.5 w-4.5 fill-[#E9A23B] text-[#E9A23B]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wide truncate">
                    Kinh nghiệm
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#14213D] dark:text-white font-heading leading-tight truncate">
                    {xp.toLocaleString()}{' '}
                    <span className="text-[10px] text-[#d97706] dark:text-amber-400">XP</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#d97706] dark:text-amber-300 block truncate">
                    {levelTitle} • {streakDays} ngày
                  </span>
                </div>
              </div>
            </div>

            <DailyQuote compact className="w-full" />
          </div>
        </div>

        {/* ================================================================= */}
        {/* HÀNG 2: 4 MÔN THI TỐT NGHIỆP (TOÁN + NGỮ VĂN BẮT BUỘC & 2 MÔN TỰ CHỌN) */}
        {/* KÈM SỐ LẦN GIẢI ĐỀ & ĐIỂM TRUNG BÌNH TỪNG MÔN */}
        {/* ================================================================= */}
        <div className="border-t border-white/15 pt-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-white tracking-tight">
                <Target className="h-4 w-4 text-[#00DFFF]" />
                4 Môn Thi Tốt Nghiệp THPT
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/12 text-blue-100 border border-white/15">
                Toán &amp; Ngữ văn bắt buộc • 2 môn tự chọn
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setDraftElectiveIds(selectedElectiveIds);
                setShowPicker((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#00DFFF]" />
              <span>{showPicker ? 'Đóng chọn môn' : 'Chọn 2 môn tự chọn'}</span>
            </button>
          </div>

          {/* Bảng chọn 2 môn tự chọn (mở khi học sinh bấm nút) */}
          {showPicker && (
            <div className="rounded-xl bg-white/95 dark:bg-[#071328]/95 border border-white/40 dark:border-[#1B317A] p-3.5 text-[#14213D] dark:text-white shadow-lg space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-[#14213D] dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#1746D1] dark:text-[#00DFFF]" />
                  Chọn đúng 2 môn tự chọn của bạn ({draftElectiveIds.length}/2):
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/20 text-[#1746D1] dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                    <Lock className="h-2.5 w-2.5" /> {mathSubject.name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                    <Lock className="h-2.5 w-2.5" /> {litSubject.name}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {electivePool.map((sub) => {
                  const isSelected = draftElectiveIds.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleDraftElective(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#0B1B55] to-[#1746D1] text-white border-[#1746D1] shadow-sm'
                          : 'bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#1746D1]/50 hover:text-[#1746D1]'
                      }`}
                    >
                      <SubjectIcon name={sub.name} className="h-3.5 w-3.5" />
                      <span>{sub.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#00DFFF]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E2E8F0] dark:border-[#1B317A]">
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] dark:bg-[#0D2063] text-[#475569] dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={draftElectiveIds.length !== 2 || savingElectives}
                  onClick={handleSaveElectives}
                  className="px-4 py-1.5 rounded-lg bg-[#1746D1] hover:bg-[#087CFF] disabled:opacity-40 text-white text-xs font-extrabold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  {savingElectives ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Lưu tổ hợp 4 môn
                </button>
              </div>
            </div>
          )}

          {/* 4 Thẻ thống kê: Số lần giải đề & Điểm trung bình từng môn */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {graduationSubjects.map(({ subject, required, slotLabel }) => {
              const stat = subjectStatsMap[subject.id] || {
                subjectId: subject.id,
                attempts: 0,
                avgScore: null,
              };
              const theme = getSubjectColorTheme(subject.name);

              return (
                <div
                  key={subject.id}
                  className="rounded-xl bg-white/95 dark:bg-[#071328]/95 border border-white/40 dark:border-[#1B317A] p-3 text-[#14213D] dark:text-white shadow-sm flex flex-col justify-between gap-2.5 transition-all hover:shadow-md"
                >
                  {/* Header môn học */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg ${theme.iconBg} ${theme.iconColor} border ${theme.iconBorder} flex items-center justify-center shrink-0`}
                      >
                        <SubjectIcon name={subject.name} className="h-4 w-4" />
                      </div>
                      <span className="font-extrabold text-xs sm:text-[13px] text-[#14213D] dark:text-white truncate">
                        {subject.name}
                      </span>
                    </div>

                    {required ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/20 text-[#1746D1] dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[9px] font-extrabold shrink-0">
                        <Lock className="h-2.5 w-2.5" /> {slotLabel}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftElectiveIds(selectedElectiveIds);
                          setShowPicker(true);
                        }}
                        title="Bấm để đổi môn tự chọn"
                        className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 text-[9px] font-extrabold shrink-0 cursor-pointer transition-colors"
                      >
                        {slotLabel}
                      </button>
                    )}
                  </div>

                  {/* Số lần giải đề & Điểm trung bình */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1B317A]">
                    <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                        <ClipboardList className="h-2.5 w-2.5 text-[#1746D1] dark:text-[#00DFFF]" />
                        Giải đề
                      </span>
                      <span className="block text-sm font-black font-heading text-[#14213D] dark:text-white leading-tight mt-0.5">
                        {stat.attempts}{' '}
                        <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                          lần
                        </span>
                      </span>
                    </div>

                    <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                        <BarChart3 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                        Điểm TB
                      </span>
                      <span
                        className={`block text-sm font-black font-heading leading-tight mt-0.5 ${getScoreColorClass(
                          stat.avgScore
                        )}`}
                      >
                        {stat.avgScore !== null ? (
                          <>
                            {stat.avgScore.toFixed(1)}
                            <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                              /10
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
