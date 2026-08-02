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
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        console.error('Auth Sync: Đồng bộ phiên làm việc thất bại.');
        const errData = await res.json().catch(() => ({}));
        if (errData.error) {
          alert(errData.error);
        } else {
          alert('Đăng nhập thất bại. Vui lòng liên hệ quản trị viên.');
        }
        setUser(null);
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.error('Auth Sync: Lỗi hệ thống trong quá trình đồng bộ:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    // ==========================================
    // CHẾ ĐỘ CHẠY DEMO
    // ==========================================
    if (isDemoMode) {
      setLoading(true);
      const stored = localStorage.getItem('demo-user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          localStorage.removeItem('demo-user');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    // ==========================================
    // CHẾ ĐỘ CHẠY THỰC TẾ (PRODUCTION)
    // ==========================================
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        await syncSession(firebaseUser);
      } else {
        setUser(null);
        // Xóa cookie token Supabase
        await fetch('/api/auth/logout', { method: 'POST' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (isDemoMode) {
      // Nếu ở chế độ demo mà bấm nút đăng nhập chung, đăng nhập bằng học sinh mặc định
      return loginAsDemo('student');
    }

    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncSession(result.user);
      }
    } catch (err) {
      console.error('Lỗi khi mở popup Google OAuth:', err);
      setLoading(false);
      throw err;
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
        body: JSON.stringify({ isDemo: true, role, email, uid })
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('demo-user', JSON.stringify(data.user));
      } else {
        console.error('Đăng nhập Demo thất bại');
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
      if (isDemoMode) {
        localStorage.removeItem('demo-user');
      } else {
        await firebaseSignOut(auth);
      }
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Lỗi khi đăng xuất:', err);
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
