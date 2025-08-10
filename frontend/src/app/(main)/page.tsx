"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchStatusCounts, fetchUsers } from "@/lib/api/users";
import { isAuthenticated } from "@/lib/api/auth";

// タップ時の触覚フィードバック（モバイル）
const triggerHapticFeedback = () => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(50); // 50msの軽い振動
  }
};

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  inactiveUsers: number;
  expiredUsers: number;
  recentUsers: number;
  loading: boolean;
  error: string | null;
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    inactiveUsers: 0,
    expiredUsers: 0,
    recentUsers: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // クライアントサイドで認証チェック
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    setMounted(true);
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true, error: null }));

      // 段階的にデータを表示するため、Promise.allSettledを使用
      const [statusCountsResult, recentUsersResult] = await Promise.allSettled([
        fetchStatusCounts(),
        fetchUsers({ created: "today", per_page: 1 }),
      ]);

      // ステータスカウント結果を処理
      const statusCounts =
        statusCountsResult.status === "fulfilled" && statusCountsResult.value?.data
          ? statusCountsResult.value.data
          : { total: 0, active: 0, pending: 0, inactive: 0, expired: 0 };

      // 新規ユーザー数を処理
      const recentUsers =
        recentUsersResult.status === "fulfilled" ? recentUsersResult.value?.meta?.total || 0 : 0;

      setStats({
        totalUsers: statusCounts?.total || 0,
        activeUsers: statusCounts?.active || 0,
        pendingUsers: statusCounts?.pending || 0,
        inactiveUsers: statusCounts?.inactive || 0,
        expiredUsers: statusCounts?.expired || 0,
        recentUsers,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Dashboard data loading failed:", error);
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: "データの読み込みに失敗しました",
      }));
    }
  };

  const features = [
    {
      title: "ユーザー一覧",
      description: "登録ユーザーの表示と管理",
      href: "/users/list",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      title: "新規追加",
      description: "新しいユーザーの登録",
      href: "/users/add",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
    },
    {
      title: "インポート",
      description: "CSVファイルから一括登録",
      href: "/users/import",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
    },
    {
      title: "エクスポート",
      description: "CSVファイルとして出力",
      href: "/users/export",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
      ),
    },
  ];

  // 認証チェック中またはマウント前は何も表示しない
  if (!mounted || !isAuthenticated()) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-light text-gray-900 dark:text-white mb-4">
            ユーザー管理システム
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            シンプルで効率的なユーザーデータ管理
          </p>
        </div>

        {/* メイン機能グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Link
              key={index}
              href={feature.href}
              prefetch={true}
              className="group relative bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-gray-900 transition-colors duration-200">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* 統計セクション */}
        <div className="mb-16">
          {stats.error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-center">
              {stats.error}
              <button onClick={loadDashboardData} className="ml-2 underline hover:no-underline">
                再試行
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                {stats.loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto mb-2"></div>
                  </div>
                ) : (
                  <div className="text-2xl font-light text-blue-600 dark:text-blue-400">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                )}
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">総ユーザー数</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                {stats.loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto mb-2"></div>
                  </div>
                ) : (
                  <div className="text-2xl font-light text-green-600 dark:text-green-400">
                    {stats.activeUsers.toLocaleString()}
                  </div>
                )}
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">アクティブ</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                {stats.loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-10 mx-auto mb-2"></div>
                  </div>
                ) : (
                  <div className="text-2xl font-light text-yellow-600 dark:text-yellow-400">
                    {stats.pendingUsers.toLocaleString()}
                  </div>
                )}
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">保留中</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                {stats.loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8 mx-auto mb-2"></div>
                  </div>
                ) : (
                  <div className="text-2xl font-light text-orange-600 dark:text-orange-400">
                    {stats.recentUsers.toLocaleString()}
                  </div>
                )}
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">本日の新規</div>
              </div>
            </div>
          </div>

          {/* ステータス詳細 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">非アクティブ</span>
                {stats.loading ? (
                  <span className="text-sm text-gray-400 animate-pulse">---</span>
                ) : (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.inactiveUsers.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">期限切れ</span>
                {stats.loading ? (
                  <span className="text-sm text-gray-400 animate-pulse">---</span>
                ) : (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.expiredUsers.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">アクティブ率</span>
                {stats.loading ? (
                  <span className="text-sm text-gray-400 animate-pulse">---</span>
                ) : (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.totalUsers > 0
                      ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}%`
                      : "0%"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-16">
          <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-8 text-center">
            クイックアクション
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/users/list"
              prefetch={true}
              onClick={triggerHapticFeedback}
              className="px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 active:scale-95 active:bg-gray-700 dark:active:bg-gray-200 transition-all duration-150 text-center transform"
            >
              全ユーザー一覧
            </Link>
            <Link
              href="/users/list?status=active"
              prefetch={true}
              onClick={triggerHapticFeedback}
              className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 active:scale-95 active:bg-green-800 transition-all duration-150 text-center transform"
            >
              アクティブユーザー
            </Link>
            <Link
              href="/users/list?status=pending"
              prefetch={true}
              onClick={triggerHapticFeedback}
              className="px-4 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 active:scale-95 active:bg-yellow-800 transition-all duration-150 text-center transform"
            >
              保留中ユーザー
            </Link>
            <Link
              href="/users/list?created=today"
              prefetch={true}
              onClick={triggerHapticFeedback}
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:scale-95 active:bg-blue-800 transition-all duration-150 text-center transform"
            >
              本日の新規
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <Link
              href="/users/add"
              onClick={triggerHapticFeedback}
              className="px-6 py-3 border border-gray-900 dark:border-white text-gray-900 dark:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 active:bg-gray-200 dark:active:bg-gray-700 transition-all duration-150 transform"
            >
              新規ユーザー追加
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
