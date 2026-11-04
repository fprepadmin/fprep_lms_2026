import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder-auth-domain',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder-project-id',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'placeholder-storage-bucket',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'placeholder-sender-id',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'placeholder-app-id',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Khởi tạo Auth với browserLocalPersistence (localStorage) làm ưu tiên hàng đầu.
// Điều này giúp loại bỏ triệt để 100% lỗi WebKit/Safari "The database connection is closing" / "Database is hidden/closing" trên Macbook và iPad.
let authInstance: any;
if (typeof window !== 'undefined') {
  try {
    authInstance = initializeAuth(app, {
      persistence: [
        browserLocalPersistence,
        browserSessionPersistence,
        indexedDBLocalPersistence,
        inMemoryPersistence
      ]
    });
  } catch (e) {
    authInstance = getAuth(app);
  }
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();

// Yêu cầu chọn tài khoản mỗi lần bấm đăng nhập
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { signInWithPopup, signOut };
export default app;
