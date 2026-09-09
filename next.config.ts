import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
