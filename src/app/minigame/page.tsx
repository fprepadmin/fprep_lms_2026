import { Metadata } from 'next';
import PhucDucMinigameClient from '@/components/minigame/PhucDucMinigameClient';

export const metadata: Metadata = {
  title: 'PHÚC ĐỨC – Thành Tâm Cầu Nguyện 3D | FPREP',
  description: 'Không gian thờ cúng gia tiên truyền thống Việt Nam 3D, dâng hương, nguyện ước và tích đức trước kỳ thi quan trọng.',
};

export default function MinigameStandalonePage() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <PhucDucMinigameClient initialStudentName="Sĩ tử" backUrl="/dashboard/student" />
    </main>
  );
}
