"use client";

import React, { useMemo, useRef, useCallback, memo } from "react";
import { FixedSizeList as List } from "react-window";
import { User } from "@/lib/api/users";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";

interface VirtualTableProps {
  users: User[];
  height?: number;
  itemHeight?: number;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onView?: (user: User) => void;
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

// Virtual row component
const VirtualRow = memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    users: User[];
    selectedUsers: number[];
    hoveredRow: number | null;
    onToggleSelect: (userId: number) => void;
    onMouseEnter: (userId: number) => void;
    onMouseLeave: () => void;
  };
}>(({ index, style, data }) => {
  const { users, selectedUsers, hoveredRow, onToggleSelect, onMouseEnter, onMouseLeave } = data;
  const user = users[index];

  if (!user) return null;

  const isSelected = selectedUsers.includes(user.id);
  const isHovered = hoveredRow === user.id;

  return (
    <div
      style={style}
      className={cn(
        "flex items-center border-b border-gray-200 dark:border-gray-700 px-6 py-3 transition-colors duration-150",
        isHovered && "bg-gray-50 dark:bg-gray-800",
        isSelected && "bg-blue-50 dark:bg-blue-900/20"
      )}
      onMouseEnter={() => onMouseEnter(user.id)}
      onMouseLeave={onMouseLeave}
    >
      {/* チェックボックス */}
      <div className="w-12 flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(user.id)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      {/* ユーザー情報 */}
      <div className="flex-1 min-w-0 flex items-center">
        <div className="flex-shrink-0 h-8 w-8">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {user.name?.charAt(0) || "U"}
          </div>
        </div>
        <div className="ml-3 min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id}</div>
        </div>
      </div>

      {/* 連絡先 */}
      <div className="w-48 min-w-0 hidden md:block">
        <div className="text-sm text-gray-900 dark:text-white truncate">{user.email}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {user.phone_number || "-"}
        </div>
      </div>

      {/* ステータス */}
      <div className="w-32 flex-shrink-0 hidden lg:block">
        {React.createElement(getStatusBadge, { status: user.membership_status })}
      </div>

      {/* 登録日 */}
      <div className="w-24 flex-shrink-0 hidden xl:block text-sm text-gray-900 dark:text-white">
        {formatDate(user.created_at)}
      </div>

      {/* アクション */}
      <div className="w-16 flex-shrink-0 text-right">
        <button
          type="button"
          className="inline-flex justify-center items-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export const VirtualTable = memo<VirtualTableProps>(
  ({ users, height = 400, itemHeight = 72, onEdit, onDelete, onView }) => {
    const listRef = useRef<List>(null);

    // 現在未使用のハンドラーを無視
    void onEdit;
    void onDelete;
    void onView;

    const [selectedUsers, setSelectedUsers] = React.useState<number[]>([]);
    const [hoveredRow, setHoveredRow] = React.useState<number | null>(null);

    const handleToggleSelect = useCallback((userId: number) => {
      setSelectedUsers((prev) => {
        const isCurrentlySelected = prev.includes(userId);
        if (isCurrentlySelected) {
          // ユーザーが選択されている場合は除去
          return prev.filter((id) => id !== userId);
        } else {
          // ユーザーが選択されていない場合は追加
          return [...prev, userId];
        }
      });
    }, []);

    const handleMouseEnter = useCallback((userId: number) => {
      setHoveredRow(userId);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setHoveredRow(null);
    }, []);

    const toggleSelectAll = useCallback(() => {
      if (selectedUsers.length === users.length) {
        setSelectedUsers([]);
      } else {
        setSelectedUsers(users.map((u) => u.id));
      }
    }, [selectedUsers.length, users]);

    // Virtualized list data
    const itemData = useMemo(
      () => ({
        users,
        selectedUsers,
        hoveredRow,
        onToggleSelect: handleToggleSelect,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }),
      [users, selectedUsers, hoveredRow, handleToggleSelect, handleMouseEnter, handleMouseLeave]
    );

    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center">
            <div className="w-12 flex-shrink-0">
              <input
                type="checkbox"
                checked={selectedUsers.length === users.length && users.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ユーザー情報
            </div>
            <div className="w-48 hidden md:block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              連絡先
            </div>
            <div className="w-32 hidden lg:block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ステータス
            </div>
            <div className="w-24 hidden xl:block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              登録日
            </div>
            <div className="w-16 flex-shrink-0">
              <span className="sr-only">アクション</span>
            </div>
          </div>
        </div>

        {/* Virtual List */}
        <List
          ref={listRef}
          width="100%"
          height={height}
          itemCount={users.length}
          itemSize={itemHeight}
          itemData={itemData}
          overscanCount={5}
        >
          {VirtualRow}
        </List>

        {/* 選択中のアイテム数表示とバルク操作パネル */}
        {selectedUsers.length > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-lg shadow-lg z-20 flex items-center gap-4">
            <span className="font-medium">{selectedUsers.length}件選択中</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                onClick={() => {
                  // 将来のバルクエクスポート機能
                  console.log("Export selected users:", selectedUsers);
                }}
              >
                📄 エクスポート
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium transition-colors"
                onClick={() => {
                  // 将来のバルク編集機能
                  console.log("Bulk edit users:", selectedUsers);
                }}
              >
                ✏️ 一括編集
              </button>
              <button
                type="button"
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                onClick={() => {
                  // 将来のバルク削除機能
                  if (confirm(`選択した${selectedUsers.length}件のユーザーを削除しますか？`)) {
                    console.log("Bulk delete users:", selectedUsers);
                  }
                }}
              >
                🗑️ 削除
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

VirtualTable.displayName = "VirtualTable";
VirtualRow.displayName = "VirtualRow";
getStatusBadge.displayName = "StatusBadge";
