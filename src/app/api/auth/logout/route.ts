import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('supabase-jwt');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
    return NextResponse.json({ error: 'Đăng xuất thất bại' }, { status: 500 });
  }
}
