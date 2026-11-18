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
 * Tự động phát hiện viền trắng / xám thừa quanh hình vẽ, đồ thị, bảng biến thiên
 * và cắt sát (Auto-Crop / Trim) vùng nội dung chính với lề chuẩn (padding)
 */
export async function autoTrimImageWhitespace(
  fileOrBlob: File | Blob,
  padding = 10,
  threshold = 245
): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileOrBlob);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        if (origWidth < 30 || origHeight < 30) {
          resolve(fileOrBlob);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = origWidth;
        canvas.height = origHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fileOrBlob);
          return;
        }

        ctx.drawImage(img, 0, 0);
        let imageData: ImageData;
        try {
          imageData = ctx.getImageData(0, 0, origWidth, origHeight);
        } catch (e) {
          // Bị lỗi Security/CORS nếu có
          resolve(fileOrBlob);
          return;
        }

        const data = imageData.data;

        // Quét 4 biên: top, bottom, left, right
        let top = -1;
        let bottom = -1;
        let left = -1;
        let right = -1;

        // Hàm kiểm tra xem 1 pixel có phải là nền trắng / trong suốt hay không
        // Nếu pixel có alpha < 20 hoặc (r > threshold && g > threshold && b > threshold) => là nền
        const isBackground = (r: number, g: number, b: number, a: number) => {
          if (a < 30) return true;
          return r >= threshold && g >= threshold && b >= threshold;
        };

        // Quét từ trên xuống tìm top
        for (let y = 0; y < origHeight; y++) {
          for (let x = 0; x < origWidth; x++) {
            const idx = (y * origWidth + x) * 4;
            if (!isBackground(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              top = y;
              break;
            }
          }
          if (top !== -1) break;
        }

        // Nếu cả bức ảnh toàn là màu trắng hoặc trong suốt
        if (top === -1) {
          resolve(fileOrBlob);
          return;
        }

        // Quét từ dưới lên tìm bottom
        for (let y = origHeight - 1; y >= 0; y--) {
          for (let x = 0; x < origWidth; x++) {
            const idx = (y * origWidth + x) * 4;
            if (!isBackground(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              bottom = y;
              break;
            }
          }
          if (bottom !== -1) break;
        }

        // Quét từ trái sang tìm left
        for (let x = 0; x < origWidth; x++) {
          for (let y = top; y <= bottom; y++) {
            const idx = (y * origWidth + x) * 4;
            if (!isBackground(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              left = x;
              break;
            }
          }
          if (left !== -1) break;
        }

        // Quét từ phải sang tìm right
        for (let x = origWidth - 1; x >= 0; x--) {
          for (let y = top; y <= bottom; y++) {
            const idx = (y * origWidth + x) * 4;
            if (!isBackground(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
              right = x;
              break;
            }
          }
          if (right !== -1) break;
        }

        if (left === -1 || right === -1 || bottom < top || right < left) {
          resolve(fileOrBlob);
          return;
        }

        // Thêm khoảng lề an toàn (padding)
        const cropX = Math.max(0, left - padding);
        const cropY = Math.max(0, top - padding);
        const cropW = Math.min(origWidth - cropX, (right - left + 1) + padding * 2);
        const cropH = Math.min(origHeight - cropY, (bottom - top + 1) + padding * 2);

        // Tạo canvas mới cho ảnh đã cắt sát
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        const cropCtx = croppedCanvas.getContext('2d');
        if (!cropCtx) {
          resolve(fileOrBlob);
          return;
        }

        // Nền trắng tinh khôi chuẩn khảo thí
        cropCtx.fillStyle = '#ffffff';
        cropCtx.fillRect(0, 0, cropW, cropH);

        // Vẽ phần ảnh đã được cắt sát
        cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        croppedCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(fileOrBlob);
          },
          'image/webp',
          0.92
        );
      };
      img.onerror = () => resolve(fileOrBlob);
    };
    reader.onerror = () => resolve(fileOrBlob);
  });
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
 * Tự động cắt sát viền trắng thừa (auto-trim) cho hình vẽ, đồ thị hàm số, bảng biến thiên
 */
export async function uploadImageToCloudinary(
  fileOrBlob: File | Blob,
  folder = 'fprep_exams',
  autoTrim = true
): Promise<string> {
  // 1. Tự động cắt sát viền trắng / xám thừa quanh hình vẽ nếu bật tính năng autoTrim
  let processedBlob: Blob = fileOrBlob;
  if (autoTrim) {
    try {
      processedBlob = await autoTrimImageWhitespace(fileOrBlob);
    } catch (cropErr) {
      console.warn('Auto-trimming failed, fallback to original image:', cropErr);
    }
  }

  // 2. Tối ưu hóa kích thước & nén sơ bộ phía client
  const optimizedBlob = await optimizeImageForUpload(processedBlob);

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
