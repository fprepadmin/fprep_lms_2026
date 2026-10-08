import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const folder = (formData.get('folder') as string) || 'fprep_exams';

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên' }, { status: 400 });
    }

    // Đọc cấu hình Cloudinary (Mặc định: Cloud name: l0mwvhia, Upload preset: FPREPLMS)
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'l0mwvhia';
    let apiKey = process.env.CLOUDINARY_API_KEY || '';
    let apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    let uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'FPREPLMS';

    // Phân tích từ CLOUDINARY_URL nếu có (chuẩn định dạng: cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
    if (process.env.CLOUDINARY_URL) {
      const match = process.env.CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
      if (match) {
        apiKey = apiKey || match[1];
        apiSecret = apiSecret || match[2];
        cloudName = cloudName || match[3];
      }
    }

    // Chuyển file sang buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'image/webp';
    const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;

    // 1. NẾU ĐÃ CẤU HÌNH CLOUDINARY
    if (cloudName && ((apiKey && apiSecret) || uploadPreset)) {
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const cloudFormData = new FormData();
      cloudFormData.append('file', base64Data);
      cloudFormData.append('folder', folder);

      if (apiKey && apiSecret) {
        // Signed Upload
        const timestamp = Math.round(Date.now() / 1000).toString();
        const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

        cloudFormData.append('api_key', apiKey);
        cloudFormData.append('timestamp', timestamp);
        cloudFormData.append('signature', signature);
      } else if (uploadPreset) {
        // Unsigned Upload Preset
        cloudFormData.append('upload_preset', uploadPreset);
      }

      const cloudRes = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudFormData,
      });

      const cloudResult = await cloudRes.json();

      if (!cloudRes.ok) {
        console.error('[Cloudinary API Error]:', cloudResult);
        return NextResponse.json(
          { error: cloudResult.error?.message || 'Lỗi từ dịch vụ Cloudinary' },
          { status: cloudRes.status }
        );
      }

      return NextResponse.json({
        url: cloudResult.secure_url || cloudResult.url,
        public_id: cloudResult.public_id,
        format: cloudResult.format,
        width: cloudResult.width,
        height: cloudResult.height,
        bytes: cloudResult.bytes,
      });
    }

    // 2. NẾU CHƯA CẤU HÌNH CLOUDINARY -> TẠM THỜI TRẢ VỀ BASE64 TỐI ƯU VÀ KÈM HƯỚNG DẪN
    console.warn('[Cloudinary Warning] Chưa cấu hình biến môi trường CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY trong .env.local');
    return NextResponse.json({
      url: base64Data,
      warning: 'Chưa cấu hình Cloudinary credentials trong .env.local, đang lưu tạm định dạng Base64.',
    });
  } catch (error: any) {
    console.error('[Upload Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi máy chủ trong quá trình tải ảnh' },
      { status: 500 }
    );
  }
}
