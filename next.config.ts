import type { NextConfig } from "next";

// Timer App - Production Configuration
const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable static optimization
  output: 'standalone',
  // Optimize images
  images: {
    remotePatterns: [],
  },
  // Enable compression
  compress: true,
  // Power optimizations
  poweredByHeader: false,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
