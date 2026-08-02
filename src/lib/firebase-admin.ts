import { getApps, initializeApp, cert } from 'firebase-admin/app';

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Phòng ngừa lỗi trong quá trình build tĩnh (Next.js build)
    if (process.env.NODE_ENV === 'production') {
      console.warn('CẢNH BÁO: Firebase Admin SDK chưa cấu hình đủ biến môi trường.');
    }
    initializeApp({
      projectId: projectId || 'placeholder-fpt-lms',
    });
  }
}

// Export biến giả lập rỗng để giữ nguyên các import cũ không bị lỗi
export const firebaseAdmin = {};
export default firebaseAdmin;
