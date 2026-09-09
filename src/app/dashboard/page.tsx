'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function DashboardIndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/');
      } else {
        const targetRole = user.role === 'head_of_department' ? 'teacher' : user.role;
        router.replace(`/dashboard/${targetRole}`);
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm font-medium">Đang chuyển hướng đến không gian làm việc...</p>
    </div>
  );
}
