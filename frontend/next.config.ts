import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint設定
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 画像最適化の設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1年
  },
  
  // パフォーマンス最適化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  },
  
  // Reactの厳密モード
  reactStrictMode: true,
  
  // 本番ビルド時のソースマップ生成を無効化（パフォーマンス向上）
  productionBrowserSourceMaps: false,
  
  // Core Web Vitals最適化
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;