"use client";

import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
  resultCount?: number | null;
}

export const SearchField = memo<SearchFieldProps>(
  ({
    value,
    onChange,
    onClear,
    placeholder = "検索...",
    label = "検索",
    className,
    autoFocus = false,
    resultCount,
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [announcement, setAnnouncement] = useState("");
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // メモ化されたハンドラー
    const handleClear = useCallback(() => {
      onClear?.();
      inputRef.current?.focus();
      setAnnouncement("検索がクリアされました");
    }, [onClear]);

    // キーボードショートカット (Ctrl/Cmd + K)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          inputRef.current?.focus();
        }

        // Escapeキーでクリア
        if (e.key === "Escape" && document.activeElement === inputRef.current) {
          if (value) {
            handleClear();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [value, handleClear]);

    // 検索状態の管理と結果のアナウンス
    useEffect(() => {
      if (value) {
        setIsSearching(true);

        // デバウンス処理
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }

        searchTimeoutRef.current = setTimeout(() => {
          setIsSearching(false);

          if (resultCount !== null && resultCount !== undefined) {
            const message =
              resultCount === 0
                ? `「${value}」に一致する結果はありません`
                : `「${value}」の検索結果: ${resultCount}件見つかりました`;
            setAnnouncement(message);
          }
        }, 500);
      } else {
        setIsSearching(false);
        if (resultCount !== null && resultCount !== undefined) {
          setAnnouncement(`全${resultCount}件を表示中`);
        }
      }

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
      };
    }, [value, resultCount]);

    return (
      <div className={cn("relative", className)}>
        {/* スクリーンリーダー用ラベル */}
        <label htmlFor="search-field" className="sr-only">
          {label}
        </label>

        {/* 検索フィールドコンテナ */}
        <div className="relative">
          {/* 検索アイコン */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className={cn(
                "h-5 w-5 transition-colors duration-200",
                isSearching ? "text-blue-500 animate-pulse" : "text-gray-400"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* 検索入力フィールド */}
          <input
            ref={inputRef}
            id="search-field"
            type="search"
            role="searchbox"
            aria-label={label}
            aria-describedby={value ? "search-results-count" : undefined}
            aria-busy={isSearching}
            aria-live="polite"
            autoComplete="off"
            autoFocus={autoFocus}
            spellCheck="false"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "block w-full pl-10 pr-12 py-3 text-base",
              "border border-gray-300 dark:border-gray-600 rounded-lg",
              "bg-white dark:bg-gray-900",
              "text-gray-900 dark:text-white",
              "placeholder-gray-500 dark:placeholder-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "transition-all duration-200",
              isSearching && "pr-20",
              "search-cancel:appearance-none" // Webkit検索キャンセルボタンを隠す
            )}
          />

          {/* クリアボタン / ローディング / ショートカット表示 */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
            {/* 検索中インジケーター */}
            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-white"></div>
                <span className="sr-only">検索中...</span>
              </div>
            )}

            {/* クリアボタン */}
            {value && !isSearching && (
              <button
                onClick={handleClear}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                aria-label="検索をクリア"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* キーボードショートカットヒント */}
            {!value && !isSearching && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                  ⌘K
                </kbd>
              </div>
            )}
          </div>
        </div>

        {/* 検索結果カウント（視覚的にも表示） */}
        {value && resultCount !== null && resultCount !== undefined && !isSearching && (
          <div
            id="search-results-count"
            className="absolute -bottom-6 left-0 text-sm text-gray-600 dark:text-gray-400"
            aria-live="polite"
            aria-atomic="true"
          >
            {resultCount === 0 ? (
              <span className="text-red-600 dark:text-red-400">一致する結果がありません</span>
            ) : (
              <span>
                <strong className="font-semibold">{resultCount}</strong>件の結果
              </span>
            )}
          </div>
        )}

        {/* スクリーンリーダー用のライブリージョン */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>

        {/* 検索のヘルプテキスト */}
        <div className="sr-only" id="search-help">
          名前、メールアドレス、電話番号で検索できます。
          Enterキーで検索を実行、Escapeキーで検索をクリアします。
        </div>
      </div>
    );
  }
);

SearchField.displayName = "SearchField";
