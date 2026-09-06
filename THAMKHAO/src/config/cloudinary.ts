// src/services/cloudinary.ts
import axios from 'axios';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Hàm upload file ảnh lên Cloudinary
 * @param file Đối tượng File lấy từ thẻ <input type="file">
 * @returns URL của ảnh đã được upload thành công
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      formData
    );
    return response.data.secure_url; // Trả về link ảnh HTTPS
  } catch (error) {
    console.error("Lỗi upload ảnh lên Cloudinary:", error);
    throw new Error("Không thể upload hình ảnh. Vui lòng thử lại.");
  }
};

/**
 * Upload file tài liệu (PDF, DOCX, PPTX, ...) hoặc video lên Cloudinary
 * @param file File cần upload
 * @param resourceType 'raw' cho PDF/DOC, 'video' cho MP4, 'image' cho ảnh
 * @param onProgress Callback theo dõi tiến độ upload (0–100)
 * @returns URL tải xuống HTTPS của file
 */
export const uploadFileToCloudinary = async (
  file: File,
  resourceType: 'raw' | 'video' | 'image' = 'raw',
  onProgress?: (percent: number) => void
): Promise<string> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Chưa cấu hình Cloudinary. Vui lòng thêm VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET vào .env");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      }
    );
    return response.data.secure_url;
  } catch (error: any) {
    console.error(`Lỗi upload ${resourceType} lên Cloudinary:`, error);
    throw new Error(`Không thể tải lên tệp. ${error?.response?.data?.error?.message || 'Vui lòng thử lại.'}`);
  }
};

/**
 * Tự động nhận diện loại file và upload lên Cloudinary
 * PDF/DOC -> raw, MP4/MOV -> video, JPG/PNG -> image
 */
export const uploadResourceFile = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; resourceType: string; size: string }> => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const videoExts = ['mp4', 'mov', 'avi', 'webm', 'mkv'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

  let resourceType: 'raw' | 'video' | 'image' = 'raw';
  if (videoExts.includes(ext)) resourceType = 'video';
  else if (imageExts.includes(ext)) resourceType = 'image';

  const url = await uploadFileToCloudinary(file, resourceType, onProgress);
  const sizeKB = file.size / 1024;
  const size = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`;

  return { url, resourceType, size };
};