/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 基本的な画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1年
  },

  // パフォーマンス最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 実験的機能
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },

  // Core Web Vitals最適化
  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;