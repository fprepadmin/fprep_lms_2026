'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PhucDucScene from './PhucDucScene';
import PrayerScroll from './PrayerScroll';
import { zenAudio } from '@/lib/soundEffects';
import { Playfair_Display } from 'next/font/google';
import { 
  Volume2, VolumeX, Music, Sparkles, Heart, ArrowRight, 
  RotateCcw, CheckCircle2, BookOpen, 
  Flame, ChevronRight, Award, Info, Home, Maximize2, Minimize2,
  Share2, Check, Eye, EyeOff
} from 'lucide-react';

const viSerif = Playfair_Display({ subsets: ['latin', 'vietnamese'], display: 'swap' });

interface PhucDucMinigameClientProps {
  initialStudentName?: string;
  backUrl?: string;
}

const STEP_LABELS = [
  { step: 1, title: 'Gian Thờ Gia Tiên', icon: '🏛️' },
  { step: 2, title: 'Dâng Tâm Hương', icon: '🕯️' },
  { step: 3, title: 'Sớ Cầu Nguyện', icon: '📜' },
  { step: 4, title: 'Tích Đức Thiện', icon: '🌿' },
  { step: 5, title: 'Quẻ May Mắn', icon: '🌟' },
];

const BLESSING_CARDS = [
  {
    title: 'TÂM AN TRÍ SÁNG',
    quote: 'Tâm vững vàng, trí tuệ sáng tỏ. Bình tĩnh làm bài, vạn sự hanh thông.',
    subtext: 'Khi tâm trí an định, mọi câu hỏi phức tạp đều có lời giải sáng suốt.',
    bg: 'from-amber-950/90 via-stone-900/90 to-amber-950/90',
    borderColor: 'border-amber-400',
    icon: '🕯️'
  },
  {
    title: 'KHOA BẢNG ĐỀ DANH',
    quote: 'Công sức ôn luyện hôm nay sẽ là hành trang rực rỡ nhất cho ngày mai.',
    subtext: 'Mỗi giờ miệt mài bên trang sách đều đang vun đắp quả ngọt cho tương lai.',
    bg: 'from-red-950/90 via-stone-900/90 to-red-950/90',
    borderColor: 'border-red-400',
    icon: '📜'
  },
  {
    title: 'VỮNG VÀNG NIỀM TIN',
    quote: 'Chúc con giữ trọn niềm tin nơi chính mình, thi cử đạt kết quả xứng đáng.',
    subtext: 'Tổ tiên chở che, thầy cô dìu dắt, nỗ lực bản thân – Vững bước thành công.',
    bg: 'from-stone-950/95 via-amber-950/85 to-stone-950/95',
    borderColor: 'border-yellow-400',
    icon: '🌟'
  },
  {
    title: 'THỰC HỌC THỰC TÀI',
    quote: 'Học chắc từng ý, đọc kỹ từng dòng, làm bài bằng sự tự tin và trung thực.',
    subtext: 'Tự tin vượt vũ môn – Khởi đầu cho một tương lai rộng mở và vững vàng.',
    bg: 'from-amber-950/90 via-stone-900/90 to-stone-950/95',
    borderColor: 'border-amber-300',
    icon: '✨'
  },
  {
    title: 'ĐẠI CÁT ĐẠI LỢI',
    quote: 'Trời không phụ lòng người có chí. Đạp sóng vượt gió, đỗ nguyện vọng vàng.',
    subtext: 'Vững tâm vào phòng thi, đem vinh quang về cho gia đình và thầy cô.',
    bg: 'from-red-900/90 via-amber-950/85 to-stone-950/95',
    borderColor: 'border-amber-400',
    icon: '🏮'
  }
];

export default function PhucDucMinigameClient({
  initialStudentName = 'Học sinh',
  backUrl = '/dashboard/student'
}: PhucDucMinigameClientProps) {
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [isIncenseLit, setIsIncenseLit] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBgmOn, setIsBgmOn] = useState<boolean>(true);
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isUiHidden, setIsUiHidden] = useState<boolean>(false); // Chế độ chiêm bái bàn thờ (ẩn UI)
  const [mounted, setMounted] = useState<boolean>(false);

  // Form bước 3: Sớ cầu nguyện
  const [studentName, setStudentName] = useState<string>(initialStudentName);
  const [examGoal, setExamGoal] = useState<string>('Đỗ nguyện vọng mơ ước');
  const [prayerText, setPrayerText] = useState<string>(
    'Cúi xin gia tiên tiền tổ chứng giám lòng thành, phù hộ cho con giữ được tâm an trí sáng, đọc kỹ đề bài, tính toán cẩn trọng, vận dụng hết kiến thức đã dày công ôn luyện để đạt thành tích tốt nhất trong kỳ thi sắp tới.'
  );

  // Bước 4: Tích đức
  const [selectedDeeds, setSelectedDeeds] = useState<string[]>([
    'Học tập chăm chỉ và trung thực tuyệt đối'
  ]);
  const [tamDucPoints, setTamDucPoints] = useState<number>(100);

  // Bước 5: Thẻ lời chúc
  const [blessingIndex, setBlessingIndex] = useState<number>(0);
  const [interactiveNotice, setInteractiveNotice] = useState<string | null>(null);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    try {
      const savedPoints = localStorage.getItem('fprep_tam_duc_points');
      if (savedPoints) {
        setTamDucPoints(parseInt(savedPoints, 10));
      }
      const savedMute = localStorage.getItem('fprep_minigame_muted');
      if (savedMute === 'true') {
        setIsMuted(true);
        zenAudio.setMuted(true);
      }
    } catch {}

    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);

    const enableAudioOnUserGesture = () => {
      if (!isMuted && isBgmOn) {
        zenAudio.startZenBGM();
      }
      window.removeEventListener('click', enableAudioOnUserGesture);
    };
    window.addEventListener('click', enableAudioOnUserGesture);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('click', enableAudioOnUserGesture);
      zenAudio.stopZenBGM();
    };
  }, []);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    zenAudio.setMuted(nextMuted);
    try {
      localStorage.setItem('fprep_minigame_muted', String(nextMuted));
    } catch {}
  };

  const toggleBgm = () => {
    if (isBgmOn) {
      zenAudio.stopZenBGM();
      setIsBgmOn(false);
    } else {
      setIsBgmOn(true);
      if (!isMuted) zenAudio.startZenBGM();
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const handleStart = () => {
    setStep(2);
    setIsUiHidden(false);
    zenAudio.playSingingBowl(392);
    if (isBgmOn && !isMuted) zenAudio.startZenBGM();
  };

  const handleLitIncense = () => {
    if (!isIncenseLit) {
      setIsIncenseLit(true);
      zenAudio.playIgniteSound();
      zenAudio.playDeepGong();
      setInteractiveNotice('✨ 3 nén tâm hương đã tỏa ngát khói thơm trước tiên tổ');
      setTimeout(() => setInteractiveNotice(null), 4500);
    }
  };

  const handlePrayerSubmitted = () => {
    setStep(4);
    zenAudio.playChime();
  };

  const toggleDeed = (deedName: string) => {
    zenAudio.playWoodenBlock();
    if (selectedDeeds.includes(deedName)) {
      if (selectedDeeds.length > 1) {
        setSelectedDeeds(selectedDeeds.filter((d) => d !== deedName));
      }
    } else {
      setSelectedDeeds([...selectedDeeds, deedName]);
    }
  };

  const handleCommitDeeds = () => {
    const bonus = selectedDeeds.length * 50;
    const newTotal = tamDucPoints + bonus;
    setTamDucPoints(newTotal);
    try {
      localStorage.setItem('fprep_tam_duc_points', String(newTotal));
    } catch {}

    const randomIndex = Math.floor(Math.random() * BLESSING_CARDS.length);
    setBlessingIndex(randomIndex);
    zenAudio.playDeepGong();
    zenAudio.playChime();
    setStep(5);
  };

  const handleReset = () => {
    zenAudio.playWoodenBlock();
    setStep(1);
    setIsIncenseLit(false);
    setIsUiHidden(false);
  };

  const handleCopyBlessing = () => {
    const card = BLESSING_CARDS[blessingIndex];
    const text = `[PHÚC ĐỨC - THÀNH TÂM CẦU NGUYỆN]\nQuẻ chúc: ${card.title}\n"${card.quote}"\n${card.subtext}`;
    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  const handleSelectObject = (name: string) => {
    if (name === 'mamnguqua') {
      setInteractiveNotice('🍎 Mâm ngũ quả: Cầu mong sự viên mãn, trọn vẹn và an khang');
    } else if (name === 'binhhoa') {
      setInteractiveNotice('🪷 Hoa sen Bát Tràng: Biểu trưng cho sự kiên định, thanh tao vượt vũ môn');
    } else if (name.startsWith('dendau')) {
      setInteractiveNotice('🔥 Đèn dầu hoa sen: Soi rạng trí tuệ, xua tan hoang mang trước phòng thi');
    } else if (name === 'cuonso') {
      if (step === 2) {
        setStep(3);
      }
    }
    setTimeout(() => setInteractiveNotice(null), 3800);
  };

  const content = (
    <div 
      style={{ ['--font-serif' as string]: `${viSerif.style.fontFamily}, serif` }}
      className="fixed inset-0 z-[100] w-screen h-[100dvh] overflow-hidden bg-stone-950 font-sans text-stone-100 flex flex-col select-none"
    >
      
      {/* =========================================================================
          1. HEADER THANH LỊCH (TỐI GIẢN, TRANG TRỌNG)
          ========================================================================= */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-gradient-to-b from-stone-950/90 via-stone-950/60 to-transparent backdrop-blur-[4px]">
        
        {/* Nút trở về & Logo */}
        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/80 border border-amber-600/30 text-xs font-semibold text-stone-200 hover:text-white hover:bg-stone-800 transition-all active:scale-95 shadow-sm"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Về Dashboard</span>
            <span className="sm:hidden">Về</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              PHÚC ĐỨC
            </span>
            <span className="text-[11px] text-amber-400/70 font-serif hidden md:inline">
              &bull; 德流光
            </span>
          </div>
        </div>

        {/* Thanh tiến trình 5 bước tối giản */}
        <div className="hidden lg:flex items-center gap-1 bg-stone-950/70 border border-amber-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-lg">
          {STEP_LABELS.map((item, idx) => {
            const isActive = step === item.step;
            const isPassed = step > item.step;
            return (
              <React.Fragment key={item.step}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-stone-950 font-bold shadow-md shadow-amber-500/25'
                      : isPassed
                      ? 'text-amber-300 bg-amber-950/40'
                      : 'text-stone-500'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.title}</span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`w-2.5 h-0.5 rounded-full ${isPassed ? 'bg-amber-500/60' : 'bg-stone-800'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Cụm công cụ: Tâm Đức, Ẩn/Hiện UI, BGM, Sound, Toàn màn hình */}
        <div className="flex items-center gap-2">
          {/* Điểm Tâm Đức */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/80 to-red-950/80 border border-amber-500/40 text-amber-200 text-xs font-bold shadow-sm">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <span>Tâm Đức: {tamDucPoints}</span>
          </div>

          {/* Nút Ẩn/Hiện UI để ngắm toàn cảnh bàn thờ */}
          <button
            onClick={() => setIsUiHidden(!isUiHidden)}
            title={isUiHidden ? 'Hiện bảng điều khiển' : 'Ẩn bảng điều khiển để chiêm bái bàn thờ'}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
              isUiHidden
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md animate-pulse'
                : 'bg-stone-900/70 border-stone-700/60 text-stone-300 hover:text-amber-300 hover:bg-stone-800'
            }`}
          >
            {isUiHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Bật/tắt BGM Nhạc Thiền */}
          <button
            onClick={toggleBgm}
            title={isBgmOn ? 'Tắt nhạc nền thiền' : 'Bật nhạc nền thiền'}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
              isBgmOn && !isMuted
                ? 'bg-amber-600/30 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-stone-900/60 border-stone-800 text-stone-500'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Bật/tắt Sound Effects */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Bật âm thanh' : 'Tắt toàn bộ âm thanh'}
            className="p-2 rounded-xl bg-stone-900/70 border border-stone-700/60 text-stone-300 hover:text-amber-300 hover:bg-stone-800 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Nút Fullscreen trình duyệt */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ giao diện' : 'Toàn màn hình trình duyệt'}
            className="p-2 rounded-xl bg-stone-900/70 border border-stone-700/60 text-stone-300 hover:text-amber-300 hover:bg-stone-800 transition-all hidden sm:flex"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. CẢNH 3D GIAN THỜ GIA TIÊN (CHIẾM TRỌN MÀN HÌNH - KHÔNG BỊ CHE BÀN THỜ)
          ========================================================================= */}
      <div className="relative w-full h-full flex-1">
        <PhucDucScene
          currentStep={step}
          isIncenseLit={isIncenseLit}
          onLitIncense={handleLitIncense}
          onSelectObject={handleSelectObject}
          reduceMotion={reduceMotion}
        />

        {/* Thông báo tương tác nhanh dạng pill nổi */}
        {interactiveNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-fade-in">
            <div className="bg-stone-950/90 border border-amber-500/60 text-amber-200 px-4 py-2 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              {interactiveNotice}
            </div>
          </div>
        )}

        {/* =========================================================================
            3. CUỘN SỚ CẦU NGUYỆN (BƯỚC 3: ANIMATION SỚ CUỘN GIẤY HOÀNG KIM)
            ========================================================================= */}
        {step === 3 && (
          <PrayerScroll
            studentName={studentName}
            setStudentName={setStudentName}
            examGoal={examGoal}
            setExamGoal={setExamGoal}
            prayerText={prayerText}
            setPrayerText={setPrayerText}
            onSubmit={handlePrayerSubmitted}
            onBack={() => setStep(2)}
          />
        )}

        {/* =========================================================================
            4. FLOATING GLASS CARD (GIAO DIỆN TINH TẾ, GỌN GÀNG, KHÔNG CHE BÀN THỜ)
            ========================================================================= */}
        {!isUiHidden && (
          <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-20 pointer-events-none px-4 flex justify-center">
            <div className="w-full max-w-xl pointer-events-auto">

              {/* BƯỚC 1: VÀO GIAN THỜ (GỌN GÀNG Ở ĐÁY, TRẢ LẠI 80% KHÔNG GIAN BÀN THỜ) */}
              {step === 1 && (
                <div className="bg-stone-950/80 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] text-center space-y-3 animate-fade-in">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold text-amber-400/90 uppercase tracking-widest font-serif">
                      VĂN HÓA GIA TIÊN VIỆT NAM
                    </div>
                    <h2 className="text-base sm:text-xl font-bold font-serif text-amber-200 tracking-wide m-0">
                      PHÚC ĐỨC &ndash; THÀNH TÂM CẦU NGUYỆN
                    </h2>
                    <p className="text-xs text-stone-300 italic font-light m-0">
                      &ldquo;Giữ lòng thành kính, sống tử tế và bình tâm trước kỳ thi.&rdquo;
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-center gap-2.5">
                    <button
                      onClick={handleStart}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-600/25 transition-all active:scale-95 flex items-center gap-2"
                    >
                      Bắt đầu hành trình <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsUiHidden(true)}
                      className="px-4 py-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700/60 text-stone-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chiêm bái bàn thờ</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BƯỚC 2: DÂNG HƯƠNG (GỌN GÀNG, DỄ THAO TÁC) */}
              {step === 2 && (
                <div className="bg-stone-950/80 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[11px] font-bold border border-amber-500/40">
                        2
                      </span>
                      <h3 className="text-sm sm:text-base font-bold font-serif text-amber-200 m-0">
                        Nghi Thức Dâng 3 Nén Tâm Hương
                      </h3>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isIncenseLit 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' 
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}>
                      {isIncenseLit ? '✨ Đã thắp hương' : 'Chưa thắp hương'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed m-0 text-center sm:text-left">
                    {isIncenseLit
                      ? '3 nén tâm hương đã tỏa ngát khói thơm trước linh từ tiên tổ. Mời bạn mở cuộn sớ để cẩn cáo nguyện ước.'
                      : 'Nhấn trực tiếp vào Bát Hương Đồng trên bàn thờ 3D hoặc bấm nút bên dưới để dâng hương.'}
                  </p>

                  <div className="pt-1 flex items-center gap-2.5">
                    {!isIncenseLit ? (
                      <button
                        onClick={handleLitIncense}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-stone-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-600/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Flame className="w-4 h-4 fill-stone-950" /> Thắp 3 nén tâm hương
                      </button>
                    ) : (
                      <button
                        onClick={() => setStep(3)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-800 via-amber-700 to-yellow-600 hover:from-red-700 hover:to-yellow-500 text-amber-100 font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-red-900/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <span>Mở cuộn sớ cầu nguyện</span> <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsUiHidden(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700/60 text-stone-300 text-xs font-semibold"
                    >
                      <Eye className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* BƯỚC 4: TÍCH ĐỨC (THẺ CHỮ SÁNG ĐẸP, TRỰC QUAN) */}
              {step === 4 && (
                <div className="bg-stone-950/85 backdrop-blur-xl border border-emerald-600/40 rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] space-y-3 animate-fade-in max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px] font-bold border border-emerald-500/40">
                        4
                      </span>
                      <h3 className="text-sm sm:text-base font-bold font-serif text-emerald-200 m-0">
                        Tích Đức &ndash; Gieo Mầm Lương Thiện
                      </h3>
                    </div>
                    <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-600/40">
                      <Award className="w-3.5 h-3.5" /> +{selectedDeeds.length * 50} Tâm Đức
                    </span>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed m-0">
                    Phúc đức lớn nhất được tạo nên từ những hành động tử tế mỗi ngày. Chọn cam kết bạn sẽ thực hiện ngoài đời:
                  </p>

                  <div className="space-y-2">
                    {[
                      {
                        id: 'hieuthuan',
                        title: 'Hiếu kính với ông bà, cha mẹ',
                        desc: 'Giúp đỡ gia đình một việc ý nghĩa, thưa gửi lễ phép và biết ơn sinh thành.',
                        icon: '🌿'
                      },
                      {
                        id: 'giupdo',
                        title: 'Giúp đỡ bạn bè & mọi người',
                        desc: 'Chia sẻ kinh nghiệm làm bài, giảng bài cho bạn học, sống hòa nhã bao dung.',
                        icon: '🤝'
                      },
                      {
                        id: 'trungthuc',
                        title: 'Học tập chăm chỉ và trung thực',
                        desc: 'Chủ động ôn luyện, không quay cóp gian lận, quyết tâm bằng chính sức mình.',
                        icon: '📖'
                      }
                    ].map((item) => {
                      const isSelected = selectedDeeds.includes(item.title);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleDeed(item.title)}
                          className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-emerald-950/50 border-emerald-500/70 shadow-sm'
                              : 'bg-stone-900/50 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          <div className="text-lg shrink-0 mt-0.5">{item.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-bold m-0 ${isSelected ? 'text-emerald-300' : 'text-stone-300'}`}>
                              {item.title}
                            </h4>
                            <p className="text-[10.5px] text-stone-400 m-0 leading-tight mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-emerald-500 border-emerald-400 text-stone-950' : 'border-stone-700'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1 flex items-center gap-2.5">
                    <button
                      onClick={() => setStep(3)}
                      className="px-3.5 py-2 rounded-xl bg-stone-900 text-stone-400 text-xs font-semibold hover:bg-stone-800 transition-all"
                    >
                      Xem sớ
                    </button>
                    <button
                      onClick={handleCommitDeeds}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Cam kết việc thiện &bull; Nhận quẻ <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* BƯỚC 5: NHẬN QUẺ MAY MẮN (RỰC RỠ, TRANG NGHIÊM) */}
              {step === 5 && (
                <div className="bg-stone-950/90 backdrop-blur-xl border border-amber-500/50 rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-3.5 text-center animate-fade-in">
                  
                  {/* Thẻ quẻ thư pháp */}
                  <div className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-b ${BLESSING_CARDS[blessingIndex].bg} border-2 ${BLESSING_CARDS[blessingIndex].borderColor} shadow-xl relative overflow-hidden space-y-2`}>
                    <div className="inline-block px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold tracking-widest uppercase">
                      Quẻ May Mắn &bull; Vạn Sự Hanh Thông
                    </div>

                    <h3 className="text-lg sm:text-xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 m-0">
                      {BLESSING_CARDS[blessingIndex].title}
                    </h3>

                    <p className="text-xs sm:text-sm font-serif italic text-amber-100 leading-relaxed max-w-md mx-auto m-0">
                      &ldquo;{BLESSING_CARDS[blessingIndex].quote}&rdquo;
                    </p>

                    <div className="pt-1.5 border-t border-amber-500/20 text-[11px] text-stone-300/80 font-light max-w-sm mx-auto">
                      {BLESSING_CARDS[blessingIndex].subtext}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleCopyBlessing}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] font-semibold hover:bg-amber-900/50 transition-all"
                    >
                      {copiedQuote ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-300" />}
                      <span>{copiedQuote ? 'Đã sao chép' : 'Lưu lời chúc'}</span>
                    </button>
                    <span className="text-[11px] text-stone-400">
                      Tâm Đức: <strong className="text-amber-300">{tamDucPoints}</strong>
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-center gap-2.5">
                    <button
                      onClick={() => router.push('/dashboard/student/exams')}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" /> Bắt đầu ôn tập ngay
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700/60 text-stone-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Chiêm bái lại
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Nút nổi nhỏ để bật lại UI khi đang ở chế độ ẩn (Chiêm bái) */}
        {isUiHidden && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
            <button
              onClick={() => setIsUiHidden(false)}
              className="px-5 py-2.5 rounded-full bg-stone-950/90 border border-amber-500/60 text-amber-200 hover:text-white hover:bg-stone-900 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Hiện bảng điều khiển ({step === 1 ? 'Bắt đầu' : step === 2 ? 'Dâng hương' : 'Tiếp tục'})</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
