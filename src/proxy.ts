import { NextResponse, NextRequest } from 'next/server';

// Giải mã JWT payload thuần để chạy được trên cả Edge Runtime
function decodeJwtPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    
    // Base64Url sang Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    
    // Xử lý ký tự Unicode tiếng Việt
    const utf8Data = rawData
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
      
    return JSON.parse(decodeURIComponent(utf8Data));
  } catch (error) {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const tokenCookie = request.cookies.get('supabase-jwt');
  const token = tokenCookie?.value;
  
  const { pathname } = request.nextUrl;
  
  // 1. Nếu người dùng chưa đăng nhập
  if (!token) {
    // Nếu cố gắng vào dashboard, chuyển hướng về Landing Page (Trang chủ)
    if (pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Nếu đã có token
  const payload = decodeJwtPayload(token);
  
  // Token không hợp lệ hoặc đã hết hạn
  if (!payload || !payload.role || (payload.exp && Date.now() >= payload.exp * 1000)) {
    if (pathname.startsWith('/dashboard')) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('supabase-jwt');
      return response;
    }
    return NextResponse.next();
  }

  const role = payload.role as 'student' | 'teacher' | 'admin' | 'head_of_department';
  const targetDashboardRole = role === 'head_of_department' ? 'teacher' : role;

  // 3. Nếu đang ở trang chủ (Landing Page) mà đã đăng nhập, tự động chuyển hướng vào Dashboard tương ứng
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/dashboard/${targetDashboardRole}`, request.url));
  }

  // 4. Bảo vệ định tuyến dựa trên vai trò (Role-based Authorization)
  if (pathname.startsWith('/dashboard/student') && role !== 'student') {
    return NextResponse.redirect(new URL(`/dashboard/${targetDashboardRole}`, request.url));
  }
  
  if (pathname.startsWith('/dashboard/teacher') && role !== 'teacher' && role !== 'head_of_department') {
    return NextResponse.redirect(new URL(`/dashboard/${targetDashboardRole}`, request.url));
  }

  if (pathname.startsWith('/dashboard/admin/users')) {
    if (role !== 'admin' && role !== 'head_of_department') {
      return NextResponse.redirect(new URL(`/dashboard/${targetDashboardRole}`, request.url));
    }
  } else if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(`/dashboard/${targetDashboardRole}`, request.url));
  }

  return NextResponse.next();
}

// Chỉ áp dụng middleware cho Landing Page và các trang Dashboard
export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
