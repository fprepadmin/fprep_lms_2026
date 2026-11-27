'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Calendar, Camera, Users, BookOpen, ClipboardList,
  BarChart3, Layers, Check, Loader2, User, Sparkles, ChevronDown, ChevronUp, Target
} from 'lucide-react';
import DailyQuote from '@/components/student/DailyQuote';

export interface TierStudentItem {
  studentId: string;
  fullName: string;
  mshs: string;
  className: string;
  mockAttempts: number;
  avgScore: number | null;
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'untested';
}

export interface TeacherProfileHeroProps {
  teacherId: string;
  teacherFullName: string;
  roleLabel: string;
  assignedSubjects: string[];
  assignedClasses: string[];
  academicYear: string;
  totalClassesCount: number;
  totalStudentsCount: number;
  initialAvatarUrl: string | null;

  // 1. Tổng số lượt học sinh học
  totalStudySessionsCount: number;
  uniqueStudiedStudentsCount: number;
  totalStudyHours: string;

  // 2. Tổng lượt làm bài
  totalExamAttemptsCount: number;
  mockExamAttemptsCount: number;
  mockAverageScore: string;

  // 3. Số lượng học sinh chọn phân ban / môn thầy cô dạy
  subjectChoiceStudentsCount: number;
  gradeWideChoiceCount: number;
  explicitRegisteredCount: number;
  isMandatoryGraduationSubject: boolean;

  // 4. Phân tầng 4 nhóm học sinh dựa vào ĐTB khi luyện đề thi thử
  tierBasisLabel: string;
  tier1Count: number; // >= 8.0
  tier2Count: number; // 6.5 - 7.9
  tier3Count: number; // 5.0 - 6.4
  tier4Count: number; // < 5.0
  untestedCount: number;
  tierStudents: TierStudentItem[];
}

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

export default function TeacherProfileHero({
  teacherId,
  teacherFullName,
  roleLabel,
  assignedSubjects,
  assignedClasses,
  academicYear,
  totalClassesCount,
  totalStudentsCount,
  initialAvatarUrl,
  totalStudySessionsCount,
  uniqueStudiedStudentsCount,
  totalStudyHours,
  totalExamAttemptsCount,
  mockExamAttemptsCount,
  mockAverageScore,
  subjectChoiceStudentsCount,
  gradeWideChoiceCount,
  explicitRegisteredCount,
  isMandatoryGraduationSubject,
  tierBasisLabel,
  tier1Count,
  tier2Count,
  tier3Count,
  tier4Count,
  untestedCount,
  tierStudents,
}: TeacherProfileHeroProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storageKey = `fprep_teacher_profile_${teacherId}`;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showTierDrawer, setShowTierDrawer] = useState(false);
  const [activeTierFilter, setActiveTierFilter] = useState<'tier1' | 'tier2' | 'tier3' | 'tier4' | 'untested'>('tier1');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const cached = JSON.parse(raw);
      if (!initialAvatarUrl && typeof cached.avatar_url === 'string' && cached.avatar_url) {
        setAvatarUrl(cached.avatar_url);
      }
    } catch {
      // ignore localStorage errors
    }
  }, [storageKey, initialAvatarUrl]);

  const flashMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
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
      formData.append('file', compressed, `teacher_${teacherId}.jpg`);
      formData.append('folder', 'fprep_teacher_avatars');

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
      try {
        localStorage.setItem(storageKey, JSON.stringify({ avatar_url: finalUrl }));
      } catch {
        // ignore quota
      }

      await fetch('/api/teacher/profile-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: finalUrl }),
      });

      flashMessage('Đã cập nhật ảnh đại diện!');
    } catch (err: any) {
      alert(err?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const primarySubjectLabel = assignedSubjects.join(', ') || 'Chưa phân công';
  const classesLabel = assignedClasses.join(', ') || 'Chưa phân lớp';

  const openTier = (tier: 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'untested') => {
    setActiveTierFilter(tier);
    setShowTierDrawer(true);
  };

  const filteredTierStudents = tierStudents.filter((s) => s.tier === activeTierFilter);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#00DFFF]/30 bg-gradient-to-br from-[#0B1B55] via-[#1746D1] to-[#087CFF] p-4 sm:p-5 text-white shadow-[0_12px_36px_-6px_rgba(23,70,209,0.28)]">
      {/* Glow ambient */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#00DFFF]/18 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-[#087CFF]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* ================================================================= */}
        {/* HÀNG 1: KHUNG ẢNH TRÒN VIỀN CAM + TRƯỜNG/HỌ TÊN/MÔN/LỚP + SỐ LỚP & SĨ SỐ */}
        {/* ================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Cột trái: Khung ảnh tròn viền cam + Thông tin định danh Thầy/Cô */}
          <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
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
                title="Nhấn để tải ảnh đại diện của Thầy/Cô lên"
                className="group relative w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full overflow-hidden border-[3px] border-[#F26F21] ring-2 ring-orange-400/35 bg-white/15 backdrop-blur-md shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:border-orange-300 hover:scale-[1.02] active:scale-95"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={teacherFullName}
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

              {/* Nút icon máy ảnh nhỏ ở góc dưới phải (khung tròn viền cam, không có dấu X đỏ) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Tải ảnh giáo viên"
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white text-[#F26F21] border-2 border-[#F26F21] shadow-md flex items-center justify-center hover:bg-orange-50 transition-colors cursor-pointer"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>

            {/* Thông tin trường, họ tên, môn, lớp, năm học */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-extrabold text-[#00DFFF] border border-white/25 backdrop-blur-md uppercase tracking-wide">
                  <GraduationCap className="h-3.5 w-3.5 text-[#00DFFF]" />
                  Trường THPT FPT Cần Thơ
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/25 border border-orange-300/40 px-2.5 py-0.5 text-[10px] font-extrabold text-orange-200 uppercase">
                  {roleLabel}
                </span>
                {statusMessage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 border border-emerald-300/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200">
                    <Check className="h-3 w-3" /> {statusMessage}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight leading-snug m-0 truncate">
                Thầy/Cô {teacherFullName}
              </h1>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1 bg-white/12 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-md">
                  Môn phụ trách:{' '}
                  <strong className="text-[#00DFFF] font-black">{primarySubjectLabel}</strong>
                </span>
                <span className="inline-flex items-center gap-1 bg-white/12 px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-md">
                  Lớp dạy: <strong className="text-white font-black">{classesLabel}</strong>
                </span>
                <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15 backdrop-blur-md text-blue-100">
                  <Calendar className="h-3 w-3 text-amber-300" />
                  Năm học: <strong className="text-white font-bold">{academicYear}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Cột phải: Khối Lớp phụ trách & Tổng học sinh (đồng bộ mô hình Học sinh) */}
          <div className="flex flex-col gap-2 shrink-0 w-full lg:w-[370px] xl:w-[400px] min-w-0">
            <div className="grid grid-cols-2 items-center gap-2.5 bg-white/95 dark:bg-[#071328]/95 px-3.5 py-2.5 rounded-xl backdrop-blur-md border border-white/30 text-[#14213D] dark:text-white shadow-md">
              {/* Lớp phụ trách */}
              <div className="flex items-center gap-2.5 pr-2.5 border-r border-[#E2E8F0] dark:border-[#1B317A] min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0B1B55] via-[#1746D1] to-[#087CFF] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 font-heading">
                  {totalClassesCount}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wide truncate">
                    Lớp phụ trách
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#14213D] dark:text-white font-heading leading-tight truncate">
                    {totalClassesCount} lớp học
                  </div>
                  <span className="text-[10px] font-bold text-[#1746D1] dark:text-[#00DFFF] block truncate">
                    {classesLabel}
                  </span>
                </div>
              </div>

              {/* Tổng học sinh */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-[#F26F21] dark:text-amber-400 flex items-center justify-center border border-amber-400/35 shrink-0">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wide truncate">
                    Tổng học sinh
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#14213D] dark:text-white font-heading leading-tight truncate">
                    {totalStudentsCount}{' '}
                    <span className="text-[10px] text-[#F26F21] dark:text-amber-400">HS</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                    Môn {primarySubjectLabel}
                  </span>
                </div>
              </div>
            </div>

            <DailyQuote compact className="w-full" />
          </div>
        </div>

        {/* ================================================================= */}
        {/* HÀNG 2: THAY THẾ CHỖ 4 MÔN THI TỐT NGHIỆP BẰNG 4 KHỐI DỮ LIỆU GIẢNG DẠY */}
        {/* (1) Tổng lượt học • (2) Tổng lượt làm bài • (3) HS chọn phân ban môn dạy • (4) Phân tầng 4 nhóm HS theo ĐTB đề thi thử */}
        {/* ================================================================= */}
        <div className="border-t border-white/15 pt-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-white tracking-tight">
                <BarChart3 className="h-4 w-4 text-[#00DFFF]" />
                Theo Dõi Lượt Học, Khảo Thí &amp; Phân Tầng 4 Nhóm Học Sinh
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/12 text-blue-100 border border-white/15">
                {tierBasisLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowTierDrawer((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
            >
              <Layers className="h-3.5 w-3.5 text-[#00DFFF]" />
              <span>{showTierDrawer ? 'Ẩn chi tiết 4 nhóm' : 'Chi tiết 4 nhóm học sinh'}</span>
              {showTierDrawer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* 4 THẺ CHỈ SỐ ĐỒNG BỘ KÍCH THƯỚC & MÔ HÌNH GIAO DIỆN HỌC SINH */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* THẺ 1: TỔNG SỐ LƯỢT HỌC SINH HỌC */}
            <div className="rounded-xl bg-white/95 dark:bg-[#071328]/95 border border-white/40 dark:border-[#1B317A] p-3 text-[#14213D] dark:text-white shadow-sm flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#1746D1] dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-[13px] text-[#14213D] dark:text-white truncate">
                    Tổng Lượt HS Học
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/20 text-[#1746D1] dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[9px] font-extrabold shrink-0">
                  Học liệu
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1B317A]">
                <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                  <span className="block text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                    Lượt học
                  </span>
                  <span className="block text-sm font-black font-heading text-[#1746D1] dark:text-[#00DFFF] leading-tight mt-0.5">
                    {totalStudySessionsCount}{' '}
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                      lượt
                    </span>
                  </span>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                  <span className="block text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                    Tham gia
                  </span>
                  <span className="block text-sm font-black font-heading text-[#14213D] dark:text-white leading-tight mt-0.5">
                    {uniqueStudiedStudentsCount}{' '}
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                      HS ({totalStudyHours}h)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* THẺ 2: TỔNG LƯỢT LÀM BÀI */}
            <div className="rounded-xl bg-white/95 dark:bg-[#071328]/95 border border-white/40 dark:border-[#1B317A] p-3 text-[#14213D] dark:text-white shadow-sm flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-[13px] text-[#14213D] dark:text-white truncate">
                    Lượt Làm Bài
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[9px] font-extrabold shrink-0">
                  ĐTB {mockAverageScore}/10
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1B317A]">
                <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                  <span className="block text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                    Tổng nộp
                  </span>
                  <span className="block text-sm font-black font-heading text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">
                    {totalExamAttemptsCount}{' '}
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                      lượt
                    </span>
                  </span>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                  <span className="block text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                    Đề thi thử
                  </span>
                  <span className="block text-sm font-black font-heading text-[#14213D] dark:text-white leading-tight mt-0.5">
                    {mockExamAttemptsCount}{' '}
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                      lượt
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* THẺ 3: SỐ LƯỢNG HS CHỌN PHÂN BAN / MÔN THẦY CÔ DẠY */}
            <div className="rounded-xl bg-white/95 dark:bg-[#071328]/95 border border-white/40 dark:border-[#1B317A] p-3 text-[#14213D] dark:text-white shadow-sm flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-[#F26F21] dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-[13px] text-[#14213D] dark:text-white truncate">
                    HS Chọn Môn Dạy
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-orange-50 dark:bg-orange-500/20 text-[#F26F21] dark:text-amber-300 border border-orange-200 dark:border-orange-500/30 text-[9px] font-extrabold shrink-0">
                  {isMandatoryGraduationSubject ? 'Môn bắt buộc' : 'Phân ban TN'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] dark:border-[#1B317A]">
                <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                  <span className="block text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                    Lớp phụ trách
                  </span>
                  <span className="block text-sm font-black font-heading text-[#F26F21] dark:text-amber-400 leading-tight mt-0.5">
                    {subjectChoiceStudentsCount}{' '}
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                      HS
                    </span>
                  </span>
                </div>

                <div className="bg-[#F8FAFC] dark:bg-[#0D2063]/70 rounded-lg px-2 py-1.5 border border-[#E2E8F0] dark:border-[#1B317A]">
                  <span className="block text-[9px] font-bold text-[#64748B] dark:text-slate-400 uppercase">
                    {isMandatoryGraduationSubject ? 'Toàn khối 12' : `ĐK chọn (${gradeWideChoiceCount} khối)`}
                  </span>
                  <span className="block text-sm font-black font-heading text-[#14213D] dark:text-white leading-tight mt-0.5">
                    {isMandatoryGraduationSubject ? gradeWideChoiceCount : explicitRegisteredCount}{' '}
                    <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                      HS
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* THẺ 4: PHÂN TẦNG 4 NHÓM HỌC SINH (THEO ĐTB LUYỆN ĐỀ THI THỬ) */}
            <div className="rounded-xl bg-white/95 dark:bg-[#071328]/95 border border-white/40 dark:border-[#1B317A] p-3 text-[#14213D] dark:text-white shadow-sm flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-[13px] text-[#14213D] dark:text-white truncate">
                    Phân Tầng 4 Nhóm
                  </span>
                </div>
                {untestedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => openTier('untested')}
                    className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#64748B] dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[9px] font-bold shrink-0 cursor-pointer hover:bg-slate-200"
                    title="Xem học sinh chưa làm đề thi thử"
                  >
                    Chưa thi: {untestedCount}
                  </button>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 text-[9px] font-extrabold shrink-0">
                    ĐTB thi thử
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#E2E8F0] dark:border-[#1B317A] text-center">
                <button
                  type="button"
                  onClick={() => openTier('tier1')}
                  title="Nhóm 1: Giỏi / Xuất sắc (ĐTB ≥ 8.0)"
                  className="rounded-lg py-1 px-1 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/35 hover:border-emerald-500 cursor-pointer transition-all"
                >
                  <span className="block text-[8px] font-extrabold text-emerald-700 dark:text-emerald-300 leading-none">
                    N1 ≥8
                  </span>
                  <span className="block text-xs font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {tier1Count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openTier('tier2')}
                  title="Nhóm 2: Khá (ĐTB 6.5 – 7.9)"
                  className="rounded-lg py-1 px-1 bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/35 hover:border-[#1746D1] cursor-pointer transition-all"
                >
                  <span className="block text-[8px] font-extrabold text-[#1746D1] dark:text-cyan-300 leading-none">
                    N2 ≥6.5
                  </span>
                  <span className="block text-xs font-black text-[#1746D1] dark:text-cyan-300 mt-0.5">
                    {tier2Count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openTier('tier3')}
                  title="Nhóm 3: Trung bình (ĐTB 5.0 – 6.4)"
                  className="rounded-lg py-1 px-1 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/35 hover:border-amber-500 cursor-pointer transition-all"
                >
                  <span className="block text-[8px] font-extrabold text-amber-700 dark:text-amber-300 leading-none">
                    N3 ≥5
                  </span>
                  <span className="block text-xs font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {tier3Count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openTier('tier4')}
                  title="Nhóm 4: Yếu / Cần kèm sát (ĐTB < 5.0)"
                  className="rounded-lg py-1 px-1 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/35 hover:border-rose-500 cursor-pointer transition-all"
                >
                  <span className="block text-[8px] font-extrabold text-rose-700 dark:text-rose-300 leading-none">
                    N4 &lt;5
                  </span>
                  <span className="block text-xs font-black text-rose-700 dark:text-rose-300 mt-0.5">
                    {tier4Count}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* BẢNG CHI TIẾT HỌC SINH THEO 4 NHÓM PHÂN TẦNG (MỞ KHI BẤM VÀO NHÓM HOẶC NÚT CHI TIẾT) */}
          {showTierDrawer && (
            <div className="rounded-xl bg-white/95 dark:bg-[#071328]/95 border border-white/40 dark:border-[#1B317A] p-3.5 text-[#14213D] dark:text-white shadow-lg space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  <Sparkles className="h-3.5 w-3.5 text-[#1746D1] dark:text-[#00DFFF]" />
                  <span>Danh sách phân tầng học sinh chọn môn {primarySubjectLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTierFilter('tier1')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer transition-all ${
                      activeTierFilter === 'tier1'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                    }`}
                  >
                    Nhóm 1: ≥ 8.0 ({tier1Count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTierFilter('tier2')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer transition-all ${
                      activeTierFilter === 'tier2'
                        ? 'bg-[#1746D1] text-white border-[#1746D1]'
                        : 'bg-blue-50 dark:bg-blue-500/15 text-[#1746D1] dark:text-cyan-300 border-blue-200 dark:border-blue-500/30'
                    }`}
                  >
                    Nhóm 2: 6.5–7.9 ({tier2Count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTierFilter('tier3')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer transition-all ${
                      activeTierFilter === 'tier3'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                    }`}
                  >
                    Nhóm 3: 5.0–6.4 ({tier3Count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTierFilter('tier4')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border cursor-pointer transition-all ${
                      activeTierFilter === 'tier4'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                    }`}
                  >
                    Nhóm 4: &lt; 5.0 ({tier4Count})
                  </button>
                  {untestedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTierFilter('untested')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                        activeTierFilter === 'untested'
                          ? 'bg-slate-700 text-white border-slate-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-[#475569] dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Chưa thi ({untestedCount})
                    </button>
                  )}
                </div>
              </div>

              {filteredTierStudents.length === 0 ? (
                <p className="text-xs text-[#64748B] dark:text-slate-400 italic text-center py-4 m-0">
                  Không có học sinh nào trong nhóm này.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                  {filteredTierStudents.map((st) => (
                    <div
                      key={st.studentId}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] dark:bg-[#0D2063]/70 border border-[#E2E8F0] dark:border-[#1B317A] text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-[#14213D] dark:text-white block truncate">
                          {st.fullName}
                        </span>
                        <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-semibold">
                          Lớp {st.className} • {st.mshs}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-xs text-[#1746D1] dark:text-[#00DFFF] block">
                          {st.avgScore !== null ? `${st.avgScore.toFixed(1)}đ` : '—'}
                        </span>
                        <span className="text-[10px] text-[#64748B] dark:text-slate-400">
                          {st.mockAttempts} lượt
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
