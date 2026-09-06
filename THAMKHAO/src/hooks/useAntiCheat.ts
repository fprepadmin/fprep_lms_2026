import { useEffect, useState } from 'react';

interface AntiCheatProps {
  maxViolations?: number;
  onLockExam: () => void;
  onWarn: (reason: string, currentViolations: number) => void;
  isActive: boolean;
}

export const useAntiCheat = ({ maxViolations = 3, onLockExam, onWarn, isActive }: AntiCheatProps) => {
  const [violationCount, setViolationCount] = useState(0);
  const [isBlackout, setIsBlackout] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsBlackout(false);
      return;
    }

    const handleViolation = (reason: string) => {
      setViolationCount((prev) => {
        const newCount = prev + 1;
        setTimeout(() => {
          if (newCount >= maxViolations) {
            onLockExam();
          } else {
            onWarn(reason, newCount);
          }
        }, 0);
        return newCount;
      });
    };

    // 1. Chuyển Tab hoặc thu nhỏ trình duyệt -> Bật Blackout
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlackout(true);
        handleViolation("Thí sinh đã chuyển tab hoặc thu nhỏ trình duyệt.");
      } else {
        setTimeout(() => setIsBlackout(false), 500);
      }
    };

    // 2. Click ra ngoài cửa sổ (Mở Snipping Tool, Zalo, Messenger...) -> Bật Blackout
    const handleBlur = () => {
      setIsBlackout(true);
      handleViolation("Thí sinh đã click chuột hoặc mở ứng dụng bên ngoài khu vực thi.");
    };

    const handleFocus = () => {
      setTimeout(() => setIsBlackout(false), 500);
    };

    // 3. Chặn phím tắt, Chụp màn hình (PrintScreen, F12, Snipping Tool, Ctrl+P...)
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopyPaste = (e: ClipboardEvent) => e.preventDefault();
    const preventShortcuts = (e: KeyboardEvent) => {
      // Chặn PrintScreen
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        setIsBlackout(true);
        handleViolation("Phát hiện thao tác chụp màn hình (PrintScreen).");
        setTimeout(() => setIsBlackout(false), 1500);
      }

      // Chặn F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+P, Ctrl+U
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 'u'))
      ) {
        e.preventDefault();
        setIsBlackout(true);
        handleViolation("Sử dụng phím tắt không hợp lệ trong phòng thi.");
        setTimeout(() => setIsBlackout(false), 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventCopyPaste);
    document.addEventListener("paste", preventCopyPaste);
    document.addEventListener("keydown", preventShortcuts);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventCopyPaste);
      document.removeEventListener("paste", preventCopyPaste);
      document.removeEventListener("keydown", preventShortcuts);
    };
  }, [isActive, maxViolations, onLockExam, onWarn]);

  return { violationCount, isBlackout };
};