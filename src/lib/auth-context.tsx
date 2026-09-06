'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut as firebaseSignOut } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { isDemoMode } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'head_of_department';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: 'student' | 'teacher' | 'admin' | 'head_of_department') => Promise<void>;
  logout: () => Promise<void>;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginAsDemo: async () => {},
  logout: async () => {},
  isDemo: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Đồng bộ hóa Firebase ID Token sang Custom Supabase JWT
  const syncSession = async (firebaseUser: FirebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken(true);
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }).catch((fetchErr) => {
        console.warn('Sync fetch network error:', fetchErr);
        return null;
      });
      
      if (res && res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        console.warn('Auth Sync: Không thể đồng bộ phiên làm việc.');
        setUser(null);
      }
    } catch (err) {
      console.warn('Auth Sync exception:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Khởi tạo ngay từ Cookie qua API /api/auth/sync để chống trắng màn hình
    const initSessionFromCookie = async () => {
      try {
        const res = await fetch('/api/auth/sync');
        if (res.ok) {
          const data = await res.json();
          if (data.user && isMounted) {
            setUser(data.user);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('Init session from cookie error:', err);
      }
    };

    initSessionFromCookie();

    // ==========================================
    // CHẾ ĐỘ CHẠY DEMO
    // ==========================================
    if (isDemoMode) {
      const stored = localStorage.getItem('demo-user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          localStorage.removeItem('demo-user');
          setUser(null);
        }
      }
      setLoading(false);
      return;
    }

    // ==========================================
    // CHẾ ĐỘ CHẠY THỰC TẾ (PRODUCTION - FIREBASE)
    // ==========================================
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await syncSession(firebaseUser);
        }
      } catch (err) {
        console.warn('onAuthStateChanged error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    if (isDemoMode) {
      return loginAsDemo('student');
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncSession(result.user);
      }
    } catch (err: any) {
      console.error('Lỗi khi mở popup Google OAuth:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        alert('Không thể hoàn tất đăng nhập Google: ' + (err.message || 'Lỗi kết nối'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (role: 'student' | 'teacher' | 'admin' | 'head_of_department') => {
    setLoading(true);
    try {
      const email = role === 'student' 
        ? 'hocsinh@fpt.edu.vn' 
        : role === 'teacher' 
          ? 'giaovien@fpt.edu.vn' 
          : role === 'admin' 
            ? 'admin@fpt.edu.vn' 
            : 'truongbomon@fpt.edu.vn';
      const uid = role === 'student' 
        ? 'demo-student-id' 
        : role === 'teacher' 
          ? 'demo-teacher-id' 
          : role === 'admin' 
            ? 'demo-admin-id' 
            : 'demo-head-id';

      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemo: true, email, role, uid }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const demoUser: AuthUser = data.user;
        setUser(demoUser);
        localStorage.setItem('demo-user', JSON.stringify(demoUser));
        window.location.href = `/dashboard/${role === 'head_of_department' ? 'teacher' : role}`;
      } else {
        const demoUser: AuthUser = { id: uid, email, role };
        setUser(demoUser);
        localStorage.setItem('demo-user', JSON.stringify(demoUser));
        window.location.href = `/dashboard/${role === 'head_of_department' ? 'teacher' : role}`;
      }
    } catch (err) {
      console.error('Lỗi đăng nhập demo:', err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (!isDemoMode) {
        await firebaseSignOut(auth).catch(() => {});
      }
      localStorage.removeItem('demo-user');
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginAsDemo, logout, isDemo: isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
