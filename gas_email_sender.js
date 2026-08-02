/**
 * GOOGLE APPS SCRIPT: GỬI EMAIL THÔNG BÁO CẤP QUYỀN LMS FPREP
 * 
 * Hướng dẫn triển khai:
 * 1. Truy cập https://script.google.com/ và tạo một Dự án mới.
 * 2. Dán toàn bộ mã nguồn bên dưới vào tệp `Mã.gs`.
 * 3. Bấm vào nút "Triển khai" (Deploy) -> "Triển khai mới" (New deployment).
 * 4. Chọn Loại cấu hình là "Ứng dụng khách web" (Web app).
 * 5. Cấu hình triển khai:
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Tài khoản Google của bạn).
 *    - Ai có quyền truy cập (Who has access): "Mọi người" (Anyone) - điều này bắt buộc để Next.js có thể gọi API mà không cần đăng nhập Google.
 * 6. Bấm "Triển khai", cấp quyền truy cập email của bạn và copy "URL của ứng dụng web" (Web app URL).
 * 7. Dán URL này vào ô nhập liệu "Google Apps Script URL" trong trang quản trị của FPREP Admin Panel.
 */

function doPost(e) {
  try {
    // Phục hồi dữ liệu JSON gửi từ Next.js
    var requestData = JSON.parse(e.postData.contents);
    var email = requestData.email;
    var fullName = requestData.fullName;
    var fptName = requestData.fptName;
    var role = requestData.role;
    
    // Ánh xạ vai trò sang Tiếng Việt
    var roleLabel = "Học sinh (Student)";
    if (role === "teacher") roleLabel = "Giáo viên (Teacher)";
    else if (role === "head_of_department") roleLabel = "Trưởng bộ môn (HOD)";
    else if (role === "admin") roleLabel = "Quản trị viên (Admin)";
    
    // Gửi Email HTML
    sendPremiumEmail(email, fullName, fptName, roleLabel);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đã gửi email thành công!" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendPremiumEmail(targetEmail, fullName, fptName, roleLabel) {
  var subject = "[FPREP - FPT LMS] Thông báo kích hoạt tài khoản và cấp quyền sử dụng hệ thống";
  
  // HTML Template email tối ưu hoá hiển thị phông chữ tiếng Việt trên Gmail/Outlook
  var htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kích Hoạt Tài Khoản FPREP</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f1f5f9;
        font-family: Arial, sans-serif;
        color: #334155;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      .header {
        background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%);
        padding: 30px;
        text-align: center;
      }
      .header img {
        height: 50px;
        width: auto;
        margin-bottom: 12px;
      }
      .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
        font-weight: bold;
        font-family: Arial, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .content {
        padding: 40px 30px;
        line-height: 1.6;
        font-family: Arial, sans-serif;
      }
      .welcome {
        font-size: 16px;
        font-weight: bold;
        color: #1e293b;
        margin-bottom: 20px;
        font-family: Arial, sans-serif;
      }
      .btn-container {
        text-align: center;
        margin-top: 30px;
      }
      .btn {
        display: inline-block;
        padding: 12px 30px;
        background-color: #f97316;
        color: #ffffff !important;
        text-decoration: none;
        font-weight: bold;
        font-size: 14px;
        font-family: Arial, sans-serif;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(249, 115, 22, 0.3);
      }
      .footer {
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        padding: 24px 30px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        font-family: Arial, sans-serif;
      }
      .signature {
        margin-top: 20px;
        text-align: left;
        border-top: 1px solid #e2e8f0;
        padding-top: 15px;
        font-size: 13px;
        font-family: Arial, sans-serif;
      }
      .signature-title {
        font-weight: bold;
        color: #0f172a;
        font-family: Arial, sans-serif;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <a href="https://fprep-lms.vercel.app/" target="_blank">
          <img src="https://i.ibb.co/WTt9WWx/d4125f4e-7eaa-482c-8941-c3aefceb8a08-removebg-preview.png" alt="FSchool Logo" style="height: 50px; width: auto; margin-bottom: 12px;" border="0">
        </a>
        <h1>Kích Hoạt Tài Khoản FPREP</h1>
      </div>
      
      <div class="content">
        <div class="welcome">Kính gửi thầy/cô ${fullName},</div>
        <p style="font-family: Arial, sans-serif;">Chào mừng thầy/cô đến với <strong>FPREP - Hệ thống Hỗ trợ Học tập & Luyện thi trực tuyến dành cho Khối 12</strong> của Trường THPT FPT Cần Thơ.</p>
        <p style="font-family: Arial, sans-serif;">Tài khoản của thầy/cô đã được quản trị viên thêm vào hệ thống và phân quyền sử dụng. Dưới đây là thông tin chi tiết tài khoản của thầy/cô:</p>
        
        <!-- BẢNG THÔNG TIN SỬ DỤNG TABLE ĐỂ HOẠT ĐỘNG HOÀN HẢO TRÊN GMAIL/OUTLOOK -->
        <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 24px 0;">
          <tr>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #64748b; font-family: Arial, sans-serif; width: 40%; border-bottom: 1px solid #e2e8f0;">Họ và Tên:</td>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #0f172a; font-family: Arial, sans-serif; text-align: right; border-bottom: 1px solid #e2e8f0;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #64748b; font-family: Arial, sans-serif; border-bottom: 1px solid #e2e8f0;">Tên FPT / Mã số:</td>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #0f172a; font-family: Arial, sans-serif; text-align: right; border-bottom: 1px solid #e2e8f0;">${fptName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #64748b; font-family: Arial, sans-serif; border-bottom: 1px solid #e2e8f0;">Email đăng nhập:</td>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #0f172a; font-family: Arial, sans-serif; text-align: right; border-bottom: 1px solid #e2e8f0;">${targetEmail}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #64748b; font-family: Arial, sans-serif;">Vai trò hệ thống:</td>
            <td style="padding: 12px 15px; font-size: 14px; font-weight: bold; color: #3b82f6; font-family: Arial, sans-serif; text-align: right;">${roleLabel}</td>
          </tr>
        </table>
        
        <p style="font-family: Arial, sans-serif;">Vui lòng click vào nút bên dưới để truy cập trực tiếp vào hệ thống FPREP và đăng nhập bằng tài khoản Google trường của thầy/cô:</p>
        
        <div class="btn-container">
          <a href="https://fprep-lms.vercel.app/" class="btn" target="_blank">Truy cập Hệ thống FPREP</a>
        </div>
        
        <div class="signature">
          <p style="font-family: Arial, sans-serif;">Trân trọng,</p>
          <div class="signature-title">Quản trị viên Trần Ngọc Minh Thông</div>
          <div style="color: #64748b; font-size: 11px; font-family: Arial, sans-serif;">Hệ thống LMS Trường THPT FPT Cần Thơ</div>
        </div>
      </div>
      
      <div class="footer">
        <p style="font-family: Arial, sans-serif;">Email này được gửi tự động từ hệ thống FPREP LMS. Vui lòng không trả lời trực tiếp email này.</p>
        <p style="font-family: Arial, sans-serif;">&copy; 2026 Trường THPT FPT Cần Thơ. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  // Gửi qua MailApp
  MailApp.sendEmail({
    to: targetEmail,
    subject: subject,
    htmlBody: htmlBody
  });
}
