/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class', // Có thể bỏ nếu bạn chỉ dùng nền sáng
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0d6efd', // Xanh dương chuẩn Bootstrap
          light: '#e7f1ff',   // Xanh nhạt Bootstrap dùng cho nền phụ
        },
        secondary: {
          DEFAULT: '#212529', // Xám đen Bootstrap dùng cho text tiêu đề
          light: '#e9ecef',
        },
        accent: {
          DEFAULT: '#F26F21', // Cam FPT (Chỉ dùng khi thực sự cần thiết)
          light: '#FFF1E6',
        },
        background: '#f8f9fa', // Màu nền chuẩn của Bootstrap
        surface: '#FFFFFF',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
        heading: ['"Raleway"', 'sans-serif'],
        ui: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        // Đổ bóng siêu nhẹ giống hệt card của Bootstrap
        'bs-card': '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)', 
        'bs-hover': '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}