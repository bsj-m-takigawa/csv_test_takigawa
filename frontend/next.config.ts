import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画像最適化の設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // パフォーマンス最適化
  experimental: {
    optimizeCss: true,
  },
  
  // Reactの厳密モード
  reactStrictMode: true,
  
  // 本番ビルド時のソースマップ生成を無効化（パフォーマンス向上）
  productionBrowserSourceMaps: false,
};

export default nextConfig;
