import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getSupabaseServerClient, verifySessionToken } from '@/lib/supabase';
import PhucDucMinigameClient from '@/components/minigame/PhucDucMinigameClient';

export const metadata: Metadata = {
  title: 'PHÚC ĐỨC – Thành Tâm Cầu Nguyện 3D | FPREP',
  description: 'Trải nghiệm không gian dâng hương gia tiên 3D, tích đức và cầu an trước kỳ thi',
};

export const dynamic = 'force-dynamic';

export default async function StudentMinigamePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value || '';
  
  let studentName = 'Học sinh';

  if (token) {
    const payload = verifySessionToken(token);
    if (payload && payload.sub) {
      try {
        const supabase = await getSupabaseServerClient();
        const { data: detail } = await supabase
          .from('student_details')
          .select('full_name')
          .eq('student_id', payload.sub)
          .maybeSingle();

        if (detail?.full_name) {
          studentName = detail.full_name;
        } else if (payload.email) {
          studentName = payload.email.split('@')[0];
        }
      } catch {
        // Fallback default
      }
    }
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] relative rounded-3xl overflow-hidden border border-amber-900/30 shadow-2xl">
      <PhucDucMinigameClient
        initialStudentName={studentName}
        backUrl="/dashboard/student"
      />
    </div>
  );
}
