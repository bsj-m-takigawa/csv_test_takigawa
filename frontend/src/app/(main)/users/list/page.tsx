"use client";

import React, { useState, useEffect, Fragment, useCallback, Suspense, lazy } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchUsers,
  fetchStatusCounts,
  bulkDeleteUsers,
  bulkExportUsers,
  BulkOperationParams,
  deleteUser,
} from "@/lib/api/users";
import Link from "next/link";
import { User } from "@/types/user";
import { SearchField } from "@/components/SearchField";
import { Button, Alert } from "@/components/ui";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

// 重いコンポーネントを動的インポート
const UserTable = lazy(() =>
  import("@/components/UserTable").then((module) => ({ default: module.UserTable }))
);
const FilterPanel = lazy(() =>
  import("@/components/FilterPanel").then((module) => ({ default: module.FilterPanel }))
);

// ローディングコンポーネント
const UserTableSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="animate-pulse">
      <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-t-lg"></div>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        ></div>
      ))}
    </div>
  </div>
);

const FilterPanelSkeleton = () => (
  <div className="space-y-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

function UserListContent() {
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [showFilters, setShowFilters] = useState(false);

  // バルク操作用の状態
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState<{
    enabled: boolean;
    type: "all" | "filtered";
    filters?: Record<string, string | string[]>;
  }>({ enabled: false, type: "all" });

  // フィルターのカウント用に全ステータスの件数を保持
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    active: 0,
    inactive: 0,
    pending: 0,
    expired: 0,
  });

  // 削除モーダル用の状態
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    user: User | null;
    mode: "single" | "bulk";
  }>({
    isOpen: false,
    user: null,
    mode: "single",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // URLパラメータから初期フィルター状態を設定
  useEffect(() => {
    const initialFilters: Record<string, string[]> = {};

    // statusパラメータを処理
    const statusParam = searchParams.get("status");
    if (statusParam) {
      initialFilters.status = statusParam.split(",");
    }

    // createdパラメータを処理
    const createdParam = searchParams.get("created");
    if (createdParam) {
      initialFilters.created = [createdParam];
    }

    // 検索クエリを処理
    const qParam = searchParams.get("q");
    if (qParam) {
      setSearchQuery(qParam);
    }

    // フィルターを設定
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
  }, [searchParams]);

  // ステータスカウントを取得する関数
  const loadStatusCounts = useCallback(async () => {
    try {
      const { data: counts } = await fetchStatusCounts({ q: searchQuery || undefined });
      setStatusCounts(counts);
    } catch (err) {
      console.error("Failed to load status counts:", err);
      // エラー時はデフォルト値を使用
      setStatusCounts({
        active: 0,
        inactive: 0,
        pending: 0,
        expired: 0,
      });
    }
  }, [searchQuery]);

  // ステータスカウントの初回読み込みと検索時の更新
  useEffect(() => {
    loadStatusCounts();
  }, [searchQuery, loadStatusCounts]);

  useEffect(() => {
    const loadUsers = async () => {
      // 現在のスクロール位置を保存
      const scrollPosition = window.pageYOffset;

      try {
        setLoading(true);
        const params: Record<string, string | number | undefined> = {
          page: currentPage,
          per_page: itemsPerPage,
          q: searchQuery || undefined,
        };

        // フィルターパラメータを追加
        if (filters.status && filters.status.length > 0) {
          params.status = filters.status.join(",");
        }
        if (filters.created && filters.created.length > 0) {
          params.created = filters.created[0]; // 単一選択なので最初の値を使用
        }

        const res = await fetchUsers(params);
        setUsers(res.data);
        setMeta(
          res.meta
            ? {
                total: res.meta.total,
                current_page: res.meta.current_page,
                per_page: res.meta.per_page,
                last_page: res.meta.last_page,
                from: res.meta.from ?? null,
                to: res.meta.to ?? null,
              }
            : null
        );
        setError(null);
      } catch (err) {
        setError("ユーザーデータの取得に失敗しました。");
        console.error(err);
      } finally {
        setLoading(false);

        // データ読み込み後、スクロール位置を復元
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      }
    };

    // デバウンス処理
    const debounceTimer = setTimeout(
      () => {
        loadUsers();
      },
      searchQuery ? 300 : 0
    );

    return () => clearTimeout(debounceTimer);
  }, [currentPage, itemsPerPage, searchQuery, filters]);

  // セッションストレージから選択状態を復元
  React.useEffect(() => {
    const savedSelections = sessionStorage.getItem("selectedUsers");
    if (savedSelections) {
      try {
        const parsed = JSON.parse(savedSelections);
        // 数値として復元
        setSelectedUsers(new Set(parsed.map((id: unknown) => Number(id))));
      } catch (e) {
        console.error("Failed to parse saved selections:", e);
      }
    }
  }, []);

  // 選択状態をセッションストレージに保存
  React.useEffect(() => {
    sessionStorage.setItem("selectedUsers", JSON.stringify(Array.from(selectedUsers)));
  }, [selectedUsers]);

  const totalPages = meta?.last_page || Math.ceil(users.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    // 現在のスクロール位置を保存
    const currentScrollPosition = window.pageYOffset;

    setCurrentPage(pageNumber);

    // スクロール位置を保持
    setTimeout(() => {
      window.scrollTo({ top: currentScrollPosition, behavior: "instant" });
    }, 0);

    // ページネーションボタンにフォーカスを維持
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.tagName === "BUTTON") {
      activeElement.focus();
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // 表示件数変更時は最初のページに戻る
  };

  // バルク操作のハンドラー
  const handleUserSelect = (userId: number, selected: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(Number(userId)); // 数値として追加
      } else {
        newSet.delete(Number(userId)); // 数値として削除
      }
      return newSet;
    });
  };

  const handleSelectAllVisible = (selected: boolean) => {
    if (selected) {
      const visibleUserIds = users.map((user) => Number(user.id)); // 数値として取得
      setSelectedUsers((prev) => new Set([...prev, ...visibleUserIds]));
    } else {
      const visibleUserIds = new Set(users.map((user) => Number(user.id))); // 数値として取得
      setSelectedUsers(
        (prev) => new Set(Array.from(prev).filter((id) => !visibleUserIds.has(Number(id))))
      ); // 数値として比較
    }
  };

  const handleSelectAllPages = (type: "all" | "filtered") => {
    // フィルターが実際に設定されているかチェック
    const hasActiveFilters =
      searchQuery ||
      (filters.status && filters.status.length > 0) ||
      (filters.created && filters.created.length > 0);

    // フィルターがない場合は'all'として扱う
    const actualType = type === "filtered" && !hasActiveFilters ? "all" : type;

    setSelectAll({
      enabled: true,
      type: actualType,
      filters:
        actualType === "filtered"
          ? {
              q: searchQuery,
              status: filters.status || [],
              created: filters.created || [],
            }
          : undefined,
    });
    // 現在表示されているユーザーも選択に追加（数値として）
    const visibleUserIds = users.map((user) => Number(user.id));
    setSelectedUsers((prev) => new Set([...prev, ...visibleUserIds]));
  };

  const handleClearSelection = () => {
    setSelectedUsers(new Set());
    setSelectAll({ enabled: false, type: "all" });
    sessionStorage.removeItem("selectedUsers");
    // フォースリフレッシュのためのフラグをクリア
    sessionStorage.removeItem("bulkOperation");
  };

  const getSelectedCount = () => {
    if (selectAll.enabled) {
      // サーバーから実際の件数を取得する必要があります（簡易実装では概算）
      return selectAll.type === "all" ? meta?.total || 0 : meta?.total || 0;
    }
    return selectedUsers.size;
  };

  // バルク操作の実装
  const prepareBulkParams = (): BulkOperationParams => {
    if (selectAll.enabled) {
      // フィルター条件を確認
      let hasFilters = false;
      const filterParams: Record<string, string> = {};

      if (selectAll.type === "filtered" && selectAll.filters) {
        const storedFilters = selectAll.filters as {
          q?: string;
          status?: string[];
          created?: string[];
        };

        if (storedFilters.q) {
          filterParams.q = storedFilters.q;
          hasFilters = true;
        }

        if (
          storedFilters.status &&
          Array.isArray(storedFilters.status) &&
          storedFilters.status.length > 0
        ) {
          filterParams.status = storedFilters.status.join(",");
          hasFilters = true;
        }

        if (
          storedFilters.created &&
          Array.isArray(storedFilters.created) &&
          storedFilters.created.length > 0
        ) {
          filterParams.created = storedFilters.created[0];
          hasFilters = true;
        }
      }

      // フィルターがない場合は'all'として送信
      const params: BulkOperationParams = {
        select_all: true,
        select_type: hasFilters ? "filtered" : "all",
      };

      // フィルターがある場合のみ追加
      if (hasFilters) {
        params.filters = filterParams;
      }

      return params;
    } else {
      // user_idsを数値配列として確実に送信
      return {
        user_ids: Array.from(selectedUsers).map((id) => Number(id)),
      };
    }
  };

  const handleBulkExport = async () => {
    try {
      const params = prepareBulkParams();
      await bulkExportUsers(params);
      // 成功時のフィードバック（ダウンロード自動開始）
    } catch (error) {
      console.error("Bulk export failed:", error);
      alert("エクスポート中にエラーが発生しました");
    }
  };

  const handleBulkDelete = async () => {
    setDeleteModal({
      isOpen: true,
      user: null,
      mode: "bulk",
    });
  };

  const handleSingleDelete = (user: User) => {
    setDeleteModal({
      isOpen: true,
      user,
      mode: "single",
    });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);

    try {
      if (deleteModal.mode === "single" && deleteModal.user) {
        // 単一削除
        await deleteUser(deleteModal.user.id);

        // 削除されたユーザーを選択状態から除外
        setSelectedUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(Number(deleteModal.user!.id));
          return newSet;
        });

        // 単一削除後もデータを再読み込み（確実に同期を取るため）
        const res = await fetchUsers({
          page: currentPage,
          per_page: itemsPerPage,
          q: searchQuery || undefined,
          status: filters.status?.join(","),
          created: filters.created?.[0],
        });

        setUsers(res.data);
        setMeta(
          res.meta
            ? {
                total: res.meta.total,
                current_page: res.meta.current_page,
                per_page: res.meta.per_page,
                last_page: res.meta.last_page,
                from: res.meta.from ?? null,
                to: res.meta.to ?? null,
              }
            : null
        );
      } else {
        // バルク削除
        const params = prepareBulkParams();
        await bulkDeleteUsers(params);

        // 選択状態をクリア
        handleClearSelection();

        // データを再読み込み
        const res = await fetchUsers({
          page: currentPage,
          per_page: itemsPerPage,
          q: searchQuery || undefined,
          status: filters.status?.join(","),
          created: filters.created?.[0],
        });

        setUsers(res.data);
        setMeta(
          res.meta
            ? {
                total: res.meta.total,
                current_page: res.meta.current_page,
                per_page: res.meta.per_page,
                last_page: res.meta.last_page,
                from: res.meta.from ?? null,
                to: res.meta.to ?? null,
              }
            : null
        );
      }

      // ステータスカウントも更新
      loadStatusCounts();

      // モーダルを閉じる
      setDeleteModal({ isOpen: false, user: null, mode: "single" });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Delete failed:", error);
      alert(`削除中にエラーが発生しました: ${err.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // ローディング中は全画面ローディングではなく、インラインローディングを表示
  // これによりスクロール位置が保持される

  if (loading) {
    // ローディング中でもレイアウトを維持
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">データを読み込んでいます...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-light text-gray-900 dark:text-white">ユーザー管理</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {meta?.total || users.length} 件のユーザーが登録されています
          </p>
        </div>
        <Link href="/users/add">
          <Button variant="primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            新規ユーザー追加
          </Button>
        </Link>
      </div>

      {/* 検索・フィルターセクション */}
      <div className="space-y-4">
        {/* 検索バー */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchField
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                onClear={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                placeholder="名前、メール、電話番号で検索..."
                label="ユーザーを検索"
                resultCount={searchQuery ? meta?.total : null}
              />
            </div>

            {/* バルク操作コントロール */}
            {getSelectedCount() > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {getSelectedCount()}件選択中
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                >
                  クリア
                </button>
              </div>
            )}

            {/* フィルターボタン（モバイル） */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
              aria-expanded={showFilters}
              aria-controls="filter-panel"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              フィルター
              {Object.keys(filters).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                  {Object.values(filters).flat().length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* 検索のヒント */}
        {!searchQuery && !loading && (
          <Alert variant="info">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm">
                <p className="font-medium mb-1">検索のヒント</p>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  <li>
                    • キーボードショートカット:{" "}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">
                      ⌘K
                    </kbd>{" "}
                    または{" "}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">
                      Ctrl+K
                    </kbd>{" "}
                    で検索フィールドにフォーカス
                  </li>
                  <li>• 部分一致検索: 名前、メール、電話番号の一部を入力</li>
                  <li>
                    •{" "}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">
                      Esc
                    </kbd>{" "}
                    キーで検索をクリア
                  </li>
                </ul>
              </div>
            </div>
          </Alert>
        )}
      </div>

      {/* メインコンテンツエリア */}
      <div id="user-table-container" className="lg:flex lg:gap-6">
        {/* フィルターパネル（デスクトップ） */}
        <aside className="hidden lg:block lg:w-64 flex-shrink-0">
          <div className="sticky top-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <Suspense fallback={<FilterPanelSkeleton />}>
              <FilterPanel
                groups={[
                  {
                    id: "status",
                    label: "ステータス",
                    options: [
                      { value: "active", label: "アクティブ", count: statusCounts.active },
                      { value: "inactive", label: "非アクティブ", count: statusCounts.inactive },
                      { value: "pending", label: "保留中", count: statusCounts.pending },
                      { value: "expired", label: "期限切れ", count: statusCounts.expired },
                    ],
                    multiple: true,
                  },
                  {
                    id: "created",
                    label: "登録時期",
                    options: [
                      { value: "today", label: "今日" },
                      { value: "week", label: "今週" },
                      { value: "month", label: "今月" },
                      { value: "year", label: "今年" },
                    ],
                  },
                ]}
                activeFilters={filters}
                onFilterChange={(groupId, values) => {
                  setFilters((prev) => ({ ...prev, [groupId]: values }));
                  setCurrentPage(1);
                }}
                onReset={() => {
                  setFilters({});
                  setCurrentPage(1);
                }}
              />
            </Suspense>
          </div>
        </aside>

        {/* テーブル */}
        <div className="flex-1">
          {loading ? (
            <UserTableSkeleton />
          ) : (
            <Suspense fallback={<UserTableSkeleton />}>
              <UserTable
                users={users}
                selectedUsers={selectedUsers}
                onUserSelect={handleUserSelect}
                onSelectAllVisible={handleSelectAllVisible}
                onSelectAllPages={handleSelectAllPages}
                onDelete={handleSingleDelete}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* モバイル用フィルターパネル */}
      {showFilters && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowFilters(false)}
            />

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">フィルター</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <Suspense fallback={<FilterPanelSkeleton />}>
                  <FilterPanel
                    groups={[
                      {
                        id: "status",
                        label: "ステータス",
                        options: [
                          { value: "active", label: "アクティブ", count: statusCounts.active },
                          {
                            value: "inactive",
                            label: "非アクティブ",
                            count: statusCounts.inactive,
                          },
                          { value: "pending", label: "保留中", count: statusCounts.pending },
                          { value: "expired", label: "期限切れ", count: statusCounts.expired },
                        ],
                        multiple: true,
                      },
                      {
                        id: "created",
                        label: "登録時期",
                        options: [
                          { value: "today", label: "今日" },
                          { value: "week", label: "今週" },
                          { value: "month", label: "今月" },
                          { value: "year", label: "今年" },
                        ],
                      },
                    ]}
                    activeFilters={filters}
                    onFilterChange={(groupId, values) => {
                      setFilters((prev) => ({ ...prev, [groupId]: values }));
                      setCurrentPage(1);
                    }}
                    onReset={() => {
                      setFilters({});
                      setCurrentPage(1);
                    }}
                  />
                </Suspense>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  variant="primary"
                  onClick={() => setShowFilters(false)}
                  className="w-full sm:w-auto"
                >
                  適用
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({});
                    setShowFilters(false);
                  }}
                  className="mt-3 w-full sm:mt-0 sm:mr-3 sm:w-auto"
                >
                  リセット
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* バルク操作パネル */}
      {getSelectedCount() > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                {getSelectedCount()}件のユーザーを選択中
              </span>
              {selectAll.enabled && (
                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded">
                  {selectAll.type === "all" ? "全件選択" : "条件選択"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkExport}>
                📄 エクスポート
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                🗑️ 削除
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                選択解除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ページネーションと表示件数選択 */}
      {(totalPages > 1 || users.length > 0) && (
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3"
          role="navigation"
          aria-label="ページネーション"
        >
          {/* モバイルビュー */}
          <div className="sm:hidden">
            <div className="flex flex-col gap-3">
              {/* 表示件数選択 */}
              <div className="flex items-center justify-between">
                <label
                  htmlFor="mobile-items-per-page"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  表示件数:
                </label>
                <select
                  id="mobile-items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="ml-2 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10件</option>
                  <option value={20}>20件</option>
                  <option value={50}>50件</option>
                  <option value={100}>100件</option>
                </select>
              </div>

              {/* ページネーションボタン */}
              {totalPages > 1 && (
                <div className="flex justify-between">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* デスクトップビュー */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* 表示件数選択 */}
              <div className="flex items-center">
                <label
                  htmlFor="items-per-page"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  表示件数:
                </label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="ml-2 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10件</option>
                  <option value={20}>20件</option>
                  <option value={50}>50件</option>
                  <option value={100}>100件</option>
                </select>
              </div>

              {/* 表示情報 */}
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{meta?.from || 0}</span> から{" "}
                  <span className="font-medium">{meta?.to || 0}</span> を表示 / 全{" "}
                  <span className="font-medium">{meta?.total || 0}</span> 件
                </p>
              </div>
            </div>

            {/* ページネーションコントロール */}
            {totalPages > 1 && (
              <div>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="最初のページへ"
                  >
                    <span className="sr-only">最初</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M7.707 5.293a1 1 0 010 1.414L4.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="前のページへ"
                  >
                    <span className="sr-only">前へ</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* ページ番号 */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      );
                    })
                    .map((page, index, array) => {
                      const prevPage = array[index - 1];
                      const showEllipsisBefore = index > 0 && prevPage !== page - 1;

                      return (
                        <Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                              ...
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              handlePageChange(page);
                              // ボタンにフォーカスを維持
                              (e.currentTarget as HTMLButtonElement).focus();
                            }}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? "z-10 bg-blue-50 dark:bg-blue-900/50 border-blue-500 text-blue-600 dark:text-blue-400"
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                            aria-label={`ページ ${page}`}
                            aria-current={currentPage === page ? "page" : undefined}
                          >
                            {page}
                          </button>
                        </Fragment>
                      );
                    })}

                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="次のページへ"
                  >
                    <span className="sr-only">次へ</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="最後のページへ"
                  >
                    <span className="sr-only">最後</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M12.293 14.707a1 1 0 010-1.414L15.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, user: null, mode: "single" })}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        user={deleteModal.user}
        selectedCount={deleteModal.mode === "bulk" ? getSelectedCount() : undefined}
      />
    </div>
  );
}

export default function UserListPage() {
  return (
    <Suspense fallback={<div className="p-8">読み込み中...</div>}>
      <UserListContent />
    </Suspense>
  );
}
