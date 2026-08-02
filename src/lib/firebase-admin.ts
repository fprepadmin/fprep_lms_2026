import { getApps, initializeApp, cert } from 'firebase-admin/app';

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      // 1. Loại bỏ các dấu nháy kép hoặc nháy đơn bọc ngoài do Vercel import giữ nguyên
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1);
      }

      // 2. Thay thế ký tự xuống dòng
      const formattedKey = privateKey.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      console.log('Firebase Admin SDK đã được khởi tạo thành công.');
    } catch (err) {
      console.error('Lỗi khi parse credential hoặc khởi tạo Firebase Admin SDK:', err);
      // Tránh crash (500) khi cấu hình bị sai định dạng
      initializeApp({
        projectId: projectId || 'placeholder-fpt-lms',
      });
    }
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
