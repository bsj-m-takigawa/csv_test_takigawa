"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { User } from "@/types/user";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface UserTableProps {
  users: User[];
  selectedUsers: Set<number>;
  onUserSelect: (userId: number, selected: boolean) => void;
  onSelectAllVisible: (selected: boolean) => void;
  onSelectAllPages: (type: "all" | "filtered") => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onView?: (user: User) => void;
}

interface UserRowProps {
  user: User;
  isSelected: boolean;
  isHovered: boolean;
  onToggleSelect: (userId: number, selected: boolean) => void;
  onMouseEnter: (userId: number) => void;
  onMouseLeave: () => void;
  onOpenActionMenu: (userId: number) => void;
  isActionMenuOpen: boolean;
}

// メモ化されたヘルパー関数
const getStatusBadge = memo(({ status }: { status?: string }) => {
  const statusConfig = {
    active: { variant: "success" as const, label: "アクティブ", icon: "🟢" },
    inactive: { variant: "default" as const, label: "非アクティブ", icon: "⚫" },
    pending: { variant: "warning" as const, label: "保留中", icon: "🟡" },
    expired: { variant: "danger" as const, label: "期限切れ", icon: "🔴" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    variant: "default" as const,
    label: "不明",
    icon: "⚪",
  };

  return (
    <Badge variant={config.variant} size="sm">
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
});

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// メモ化されたユーザー行コンポーネント
const UserRow = memo<UserRowProps & { onDelete?: (user: User) => void }>(
  ({
    user,
    isSelected,
    isHovered,
    onToggleSelect,
    onMouseEnter,
    onMouseLeave,
    onOpenActionMenu,
    isActionMenuOpen,
    onDelete,
  }) => {
    const [menuPosition, setMenuPosition] = useState<"bottom" | "top">("bottom");

    const handleToggleSelect = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onToggleSelect(Number(user.id), e.target.checked); // 数値として渡す
      },
      [onToggleSelect, user.id]
    );

    const handleMouseEnter = useCallback(() => {
      onMouseEnter(user.id);
    }, [onMouseEnter, user.id]);

    const handleOpenActionMenu = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        // メニューを開く前に位置を計算
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 180; // メニューの推定高さ（3項目 × 約60px）

        // 下に十分なスペースがない場合は上に表示
        // 20pxの余白を考慮
        setMenuPosition(spaceBelow < menuHeight + 20 ? "top" : "bottom");
        onOpenActionMenu(user.id);
      },
      [onOpenActionMenu, user.id]
    );

    return (
      <tr
        className={cn(
          "transition-colors duration-150",
          isHovered && "bg-gray-50 dark:bg-gray-800",
          isSelected && "bg-blue-50 dark:bg-blue-900/20"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelect}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {user.name?.charAt(0) || "U"}
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">ID: {user.id}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{user.phone_number || "-"}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {React.createElement(getStatusBadge, { status: user.membership_status })}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          {formatDate(user.created_at)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="relative inline-block text-left action-menu-container">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={handleOpenActionMenu}
            >
              操作
              <svg className="-mr-1 ml-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {isActionMenuOpen && (
              <div
                className={cn(
                  "absolute right-0 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50",
                  menuPosition === "bottom"
                    ? "mt-2 origin-top-right"
                    : "bottom-full mb-2 origin-bottom-right"
                )}
              >
                <div className="py-1">
                  <Link
                    href={`/users/detail/${user.id}`}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg
                      className="mr-3 h-4 w-4 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    詳細を見る
                  </Link>
                  <Link
                    href={`/users/edit/${user.id}`}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg
                      className="mr-3 h-4 w-4 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    編集する
                  </Link>
                  <button
                    onClick={() => {
                      if (onDelete) onDelete(user);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg
                      className="mr-3 h-4 w-4 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    削除する
                  </button>
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }
);

// メモ化されたモバイルカードコンポーネント
const UserMobileCard = memo<UserRowProps & { onDelete?: (user: User) => void }>(
  ({ user, isSelected, onToggleSelect, onDelete }) => {
    const handleToggleSelect = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onToggleSelect(Number(user.id), e.target.checked); // 数値として渡す
      },
      [onToggleSelect, user.id]
    );

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleToggleSelect}
              className="w-4 h-4 mr-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id}</div>
            </div>
          </div>
          {React.createElement(getStatusBadge, { status: user.membership_status })}
        </div>

        <div className="space-y-2 mb-3">
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">メール: </span>
            <span className="text-gray-900 dark:text-white">{user.email}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">電話: </span>
            <span className="text-gray-900 dark:text-white">{user.phone_number || "-"}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">登録日: </span>
            <span className="text-gray-900 dark:text-white">{formatDate(user.created_at)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
          <Link
            href={`/users/detail/${user.id}`}
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
          >
            詳細
          </Link>
          <Link
            href={`/users/edit/${user.id}`}
            className="text-green-600 dark:text-green-400 text-sm hover:underline"
          >
            編集
          </Link>
          <button
            onClick={() => {
              if (onDelete) onDelete(user);
            }}
            className="text-red-600 dark:text-red-400 text-sm hover:underline"
          >
            削除
          </button>
        </div>
      </div>
    );
  }
);

export const UserTable = memo<UserTableProps>(
  ({
    users,
    selectedUsers,
    onUserSelect,
    onSelectAllVisible,
    onSelectAllPages,
    onEdit,
    onDelete,
    onView,
  }) => {
    // 現在未使用のハンドラーを無視
    void onEdit;
    void onView;

    const [hoveredRow, setHoveredRow] = useState<number | null>(null);
    const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
    const [showSelectAllMenu, setShowSelectAllMenu] = useState(false);

    // メニューの外側をクリックしたら閉じる
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".action-menu-container")) {
          setOpenActionMenu(null);
          setShowSelectAllMenu(false);
        }
      };

      if (openActionMenu !== null || showSelectAllMenu) {
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
      }
    }, [openActionMenu, showSelectAllMenu]);

    // 現在ページの全選択状態を計算
    const visibleUserIds = useMemo(() => users.map((u) => Number(u.id)), [users]);
    const visibleSelectedCount = useMemo(
      () => visibleUserIds.filter((id) => selectedUsers.has(Number(id))).length,
      [visibleUserIds, selectedUsers]
    );
    const isAllVisibleSelected = visibleSelectedCount === users.length && users.length > 0;
    const isSomeVisibleSelected = visibleSelectedCount > 0 && visibleSelectedCount < users.length;

    // メモ化されたコールバック関数
    const handleToggleSelectAllVisible = useCallback(() => {
      onSelectAllVisible(!isAllVisibleSelected);
      setShowSelectAllMenu(false);
    }, [isAllVisibleSelected, onSelectAllVisible]);

    const handleMouseEnter = useCallback((userId: number) => {
      setHoveredRow(userId);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setHoveredRow(null);
    }, []);

    const handleOpenActionMenu = useCallback(
      (userId: number) => {
        setOpenActionMenu(openActionMenu === userId ? null : userId);
      },
      [openActionMenu]
    );

    // selected/hover状態をメモ化
    const userStates = useMemo(() => {
      return users.reduce(
        (acc, user) => {
          acc[user.id] = {
            isSelected: selectedUsers.has(Number(user.id)), // 数値として比較
            isHovered: hoveredRow === user.id,
            isActionMenuOpen: openActionMenu === user.id,
          };
          return acc;
        },
        {} as Record<number, { isSelected: boolean; isHovered: boolean; isActionMenuOpen: boolean }>
      );
    }, [users, selectedUsers, hoveredRow, openActionMenu]);

    return (
      <>
        {/* デスクトップビュー */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center relative">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isSomeVisibleSelected;
                      }}
                      onChange={handleToggleSelectAllVisible}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSelectAllMenu(!showSelectAllMenu)}
                      className="ml-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {showSelectAllMenu && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700">
                        <div className="py-1">
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              onSelectAllPages("all");
                              setShowSelectAllMenu(false);
                            }}
                          >
                            全てのユーザーを選択
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => {
                              onSelectAllPages("filtered");
                              setShowSelectAllMenu(false);
                            }}
                          >
                            検索条件に一致する全てを選択
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ユーザー情報
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  連絡先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  登録日
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">アクション</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => {
                const userState = userStates[user.id];
                return (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelected={userState.isSelected}
                    isHovered={userState.isHovered}
                    onToggleSelect={onUserSelect}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onOpenActionMenu={handleOpenActionMenu}
                    isActionMenuOpen={userState.isActionMenuOpen}
                    onDelete={onDelete}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* モバイルビュー（カード型） */}
        <div className="md:hidden space-y-4">
          {users.map((user) => {
            const userState = userStates[user.id];
            return (
              <UserMobileCard
                key={user.id}
                user={user}
                isSelected={userState.isSelected}
                isHovered={false}
                onToggleSelect={onUserSelect}
                onMouseEnter={() => {}}
                onMouseLeave={() => {}}
                onOpenActionMenu={() => {}}
                isActionMenuOpen={false}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      </>
    );
  }
);

UserTable.displayName = "UserTable";
UserRow.displayName = "UserRow";
UserMobileCard.displayName = "UserMobileCard";
getStatusBadge.displayName = "StatusBadge";
