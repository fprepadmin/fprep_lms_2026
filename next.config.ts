import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chỉ bật standalone khi tự host (ví dụ cPanel, Docker). Trên Vercel để mặc định Serverless/Edge
  output: process.env.VERCEL ? undefined : 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      },
      {
        source: '/subjects',
        destination: '/dashboard/student/subjects',
        permanent: false,
      },
      {
        source: '/department-dashboard',
        destination: '/dashboard/teacher',
        permanent: false,
      },
      {
        source: '/classroom',
        destination: '/dashboard/student/classroom',
        permanent: false,
      },
      {
        source: '/user-management',
        destination: '/dashboard/admin/users',
        permanent: false,
      },
      {
        source: '/admin-classes',
        destination: '/dashboard/admin',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
