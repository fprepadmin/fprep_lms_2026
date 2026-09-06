import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Tính năng khởi tạo dữ liệu mẫu đã bị vô hiệu hóa.' }, { status: 404 });
}

