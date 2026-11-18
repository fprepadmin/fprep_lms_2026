'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider, signInWithPopup, signOut as firebaseSignOut } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'head_of_department';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  logout: async () => {}
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
        console.warn('[AUTH SYNC] Lỗi kết nối mạng:', fetchErr);
        return null;
      });
      
      if (res && res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        console.warn('[AUTH SYNC] Không thể đồng bộ phiên làm việc.');
        setUser(null);
      }
    } catch (err) {
      console.warn('[AUTH SYNC] Ngoại lệ xác thực:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Khởi tạo ngay từ Cookie qua API /api/auth/sync
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
        console.warn('Lỗi kiểm tra phiên từ cookie:', err);
      }
    };

    initSessionFromCookie();

    // 2. Lắng nghe trạng thái đăng nhập Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          await syncSession(firebaseUser);
        } else {
          setUser(null);
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

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth).catch(() => {});
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
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
