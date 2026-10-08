/**
 * Cloudinary Upload Utility for FPREP
 * Quản lý tải ảnh lên Cloudinary CDN chất lượng cao, tối ưu hóa kích thước & đường truyền
 */

export interface CloudinaryUploadResponse {
  url: string;
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  error?: string;
}

/**
 * Nén ảnh sơ bộ phía client để giảm dung lượng mạng trước khi upload
 */
export async function optimizeImageForUpload(file: File | Blob, maxWidth = 1600, quality = 0.9): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'l0mwvhia',
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'FPREPLMS',
};

/**
 * Tải file ảnh lên Cloudinary thông qua Direct Cloudinary API hoặc /api/upload
 */
export async function uploadImageToCloudinary(
  fileOrBlob: File | Blob,
  folder = 'fprep_exams'
): Promise<string> {
  // 1. Tối ưu hóa sơ bộ phía client
  const optimizedBlob = await optimizeImageForUpload(fileOrBlob);

  const cloudName = CLOUDINARY_CONFIG.cloudName;
  const uploadPreset = CLOUDINARY_CONFIG.uploadPreset;

  // 2. Thử tải trực tiếp lên Cloudinary API với preset FPREPLMS (Tối ưu tốc độ cao nhất)
  try {
    const directFormData = new FormData();
    directFormData.append('file', optimizedBlob);
    directFormData.append('upload_preset', uploadPreset);
    directFormData.append('folder', folder);

    const directRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: directFormData,
    });

    if (directRes.ok) {
      const directData = await directRes.json();
      if (directData.secure_url || directData.url) {
        return directData.secure_url || directData.url;
      }
    }
  } catch (directErr) {
    console.warn('Direct upload to Cloudinary failed, trying server endpoint fallback...', directErr);
  }

  // 3. Fallback: Gửi request đến server route /api/upload
  try {
    const formData = new FormData();
    formData.append('file', optimizedBlob, 'upload.webp');
    formData.append('folder', folder);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Upload lên Cloudinary thất bại');
    }

    if (data.url) {
      return data.url;
    }

    throw new Error('Không nhận được URL từ máy chủ Cloudinary');
  } catch (err: any) {
    console.error('[Cloudinary Upload Error]:', err.message);
    throw err;
  }
}

/**
 * Xử lý sự kiện paste ảnh từ Clipboard (Ctrl + V)
 * Trả về file ảnh nếu có trong clipboard, ngược lại trả về null
 */
export function getImageFromClipboardEvent(e: React.ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
