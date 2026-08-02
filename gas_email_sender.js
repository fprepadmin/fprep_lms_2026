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
 *    - Ai có quyền truy cập (Who has access): "Mọi người" (Anyone) - điều này bắt buộc để ứng dụng Next.js có thể gọi API mà không cần đăng nhập Google.
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
  
  // HTML Template email siêu đẹp chuẩn thiết kế FPT FSchool
  var htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Kích Hoạt Tài Khoản FPREP</title>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f1f5f9;
        font-family: 'Raleway', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .content {
        padding: 40px 30px;
        line-height: 1.6;
      }
      .welcome {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 20px;
      }
      .info-box {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin: 24px 0;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 14px;
      }
      .info-row:last-child {
        margin-bottom: 0;
      }
      .info-label {
        font-weight: 600;
        color: #64748b;
      }
      .info-value {
        font-weight: 700;
        color: #0f172a;
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
        font-weight: 700;
        font-size: 14px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(249, 115, 22, 0.3);
        transition: opacity 0.2s;
      }
      .footer {
        background-color: #f8fafc;
        border-top: 1px solid #e2e8f0;
        padding: 24px 30px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
      }
      .signature {
        margin-top: 20px;
        text-align: left;
        border-top: 1px solid #e2e8f0;
        padding-top: 15px;
        font-size: 13px;
      }
      .signature-title {
        font-weight: 700;
        color: #0f172a;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- HEADER VỚI LOGO GIẢ ĐỊNH & GRADIENT ĐẸP -->
      <div class="header">
        <!-- Logo đại diện của FSchool Cần Thơ -->
        <a href="https://ibb.co/9MtX998"><img src="https://i.ibb.co/WTt9WWx/d4125f4e-7eaa-482c-8941-c3aefceb8a08-removebg-preview.png" alt="d4125f4e-7eaa-482c-8941-c3aefceb8a08-removebg-preview" style="height: 50px; width: auto; margin-bottom: 12px;" border="0"></a>
        <h1>Kích Hoạt Tài Khoản FPREP</h1>
      </div>
      
      <!-- NỘI DUNG CHÍNH -->
      <div class="content">
        <div class="welcome">Kính gửi thầy/cô ${fullName},</div>
        <p>Chào mừng thầy/cô đến với <strong>FPREP - Hệ thống Hỗ trợ Học tập & Luyện thi trực tuyến dành cho Khối 12</strong> của Trường THPT FPT Cần Thơ.</p>
        <p>Tài khoản của thầy/cô đã được quản trị viên thêm vào hệ thống và phân quyền sử dụng. Dưới đây là thông tin chi tiết tài khoản của thầy/cô:</p>
        
        <!-- BẢNG THÔNG TIN -->
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Họ và Tên:</span>
            <span class="info-value">${fullName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tên FPT / Mã số:</span>
            <span class="info-value">${fptName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email đăng nhập:</span>
            <span class="info-value">${targetEmail}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vai trò hệ thống:</span>
            <span class="info-value" style="color: #3b82f6;">${roleLabel}</span>
          </div>
        </div>
        
        <p>Vui lòng click vào nút bên dưới để truy cập trực tiếp vào hệ thống FPREP và đăng nhập bằng tài khoản Google trường của thầy/cô:</p>
        
        <!-- NÚT BẤM TRUY CẬP -->
        <div class="btn-container">
          <a href="https://fprep.vercel.app/" class="btn" target="_blank">Truy cập Hệ thống FPREP</a>
        </div>
        
        <!-- CHỮ KÝ CUỐI MAIL -->
        <div class="signature">
          <p>Trân trọng,</p>
          <div class="signature-title">Quản trị viên Trần Ngọc Minh Thông</div>
          <div style="color: #64748b; font-size: 11px;">Hệ thống LMS Trường THPT FPT Cần Thơ</div>
        </div>
      </div>
      
      <!-- FOOTER -->
      <div class="footer">
        <p>Email này được gửi tự động từ hệ thống FPREP LMS. Vui lòng không trả lời trực tiếp email này.</p>
        <p>&copy; 2026 Trường THPT FPT Cần Thơ. All rights reserved.</p>
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
