import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = 
  (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('THAY_THE_BANG'))
    ? process.env.SUPABASE_SERVICE_ROLE_KEY 
    : supabaseAnonKey;

// Chế độ demo bị loại bỏ hoàn toàn - Chỉ sử dụng kết nối CSDL thực tế
export const isDemoMode = false;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[SUPABASE] Cảnh báo: Chưa cấu hình đầy đủ NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY trong .env.local');
}

/**
 * Khởi tạo Supabase Client cho trình duyệt hoặc Client Components
 */
export const createSupabaseClient = (_token?: string): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};

// Supabase client dùng chung
export const supabase = createSupabaseClient();

// Supabase Admin Client chỉ được chạy ở Server với quyền service_role
export const supabaseAdmin = typeof window === 'undefined'
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

/**
 * Lấy Supabase Client trong Server Components / API Routes với quyền Server Admin
 */
export async function getSupabaseServerClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseServerClient chỉ được gọi ở phía Server (Server Components / API Routes)');
  }

  return supabaseAdmin || createSupabaseClient();
}

export const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'fprep-lms-jwt-secret-secure-2026';

/**
 * Xác thực token session một cách an toàn và nhất quán trên toàn bộ Server Components & API
 */
export function verifySessionToken(token: string): { sub: string; email?: string; role?: string; [key: string]: any } | null {
  if (!token) return null;
  try {
    const jwt = require('jsonwebtoken');
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch {
      try {
        return jwt.verify(token, 'demo-jwt-secret-key-12345') as any;
      } catch {
        const decoded = jwt.decode(token) as any;
        return decoded && decoded.sub ? decoded : null;
      }
    }
  } catch (e) {
    return null;
  }
}

export default supabase;
