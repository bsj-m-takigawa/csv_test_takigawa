"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  multiple?: boolean;
}

interface FilterPanelProps {
  groups: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (groupId: string, values: string[]) => void;
  onReset?: () => void;
  className?: string;
}

// メモ化されたフィルターオプションコンポーネント
const FilterOption = memo<{
  option: FilterOption;
  isActive: boolean;
  onToggle: () => void;
}>(({ option, isActive, onToggle }) => {
  return (
    <label className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={isActive}
          onChange={onToggle}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
      </div>
      {typeof option.count === "number" && (
        <Badge variant="default" size="sm">
          {option.count.toLocaleString()}
        </Badge>
      )}
    </label>
  );
});

// メモ化されたフィルターグループコンポーネント
const FilterGroupComponent = memo<{
  group: FilterGroup;
  activeValues: string[];
  isExpanded: boolean;
  onToggleGroup: (groupId: string) => void;
  onFilterToggle: (groupId: string, value: string, multiple?: boolean) => void;
}>(({ group, activeValues, isExpanded, onToggleGroup, onFilterToggle }) => {
  const handleToggleGroup = useCallback(() => {
    onToggleGroup(group.id);
  }, [onToggleGroup, group.id]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        onClick={handleToggleGroup}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={isExpanded}
        aria-controls={`filter-group-${group.id}`}
      >
        <span className="font-medium text-gray-900 dark:text-white">
          {group.label}
          {activeValues.length > 0 && (
            <Badge variant="primary" size="sm" className="ml-2">
              {activeValues.length}
            </Badge>
          )}
        </span>
        <svg
          className={cn(
            "w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform",
            isExpanded && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div
          id={`filter-group-${group.id}`}
          className="px-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-700"
        >
          {group.options.map((option) => {
            const isActive = activeValues.includes(option.value);
            const handleToggle = () => onFilterToggle(group.id, option.value, group.multiple);

            return (
              <FilterOption
                key={option.value}
                option={option}
                isActive={isActive}
                onToggle={handleToggle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

export const FilterPanel = memo<FilterPanelProps>(
  ({ groups, activeFilters, onFilterChange, onReset, className }) => {
    const [expandedGroups, setExpandedGroups] = useState<string[]>(groups.map((g) => g.id));
    const [announcement, setAnnouncement] = useState("");

    const toggleGroup = useCallback((groupId: string) => {
      setExpandedGroups((prev) =>
        prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
      );
    }, []);

    const handleFilterToggle = useCallback(
      (groupId: string, value: string, multiple = false) => {
        const currentValues = activeFilters[groupId] || [];
        let newValues: string[];

        if (multiple) {
          newValues = currentValues.includes(value)
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value];
        } else {
          newValues = currentValues.includes(value) ? [] : [value];
        }

        onFilterChange(groupId, newValues);

        // アクセシビリティ: 変更をアナウンス
        const group = groups.find((g) => g.id === groupId);
        const option = group?.options.find((o) => o.value === value);
        if (option) {
          const action = newValues.includes(value) ? "適用" : "解除";
          setAnnouncement(`${group?.label}フィルター: ${option.label}を${action}しました`);
        }
      },
      [activeFilters, onFilterChange, groups]
    );

    const handleReset = useCallback(() => {
      onReset?.();
      setAnnouncement("すべてのフィルターをクリアしました");
    }, [onReset]);

    // アクティブフィルター数を計算（メモ化）
    const activeCount = useMemo(() => {
      return Object.values(activeFilters).reduce((acc, values) => acc + values.length, 0);
    }, [activeFilters]);

    return (
      <div className={cn("space-y-4", className)}>
        {/* フィルターヘッダー */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            フィルター
            {activeCount > 0 && (
              <Badge variant="primary" size="sm" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </h2>
          {activeCount > 0 && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="すべてのフィルターをクリア"
            >
              リセット
            </button>
          )}
        </div>

        {/* フィルターグループ（メモ化されたコンポーネントを使用） */}
        <div className="space-y-3" role="group" aria-label="フィルターオプション">
          {groups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);
            const activeValues = activeFilters[group.id] || [];

            return (
              <FilterGroupComponent
                key={group.id}
                group={group}
                activeValues={activeValues}
                isExpanded={isExpanded}
                onToggleGroup={toggleGroup}
                onFilterToggle={handleFilterToggle}
              />
            );
          })}
        </div>

        {/* アクティブフィルターの表示 */}
        {activeCount > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              適用中のフィルター:
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(activeFilters).map(([groupId, values]) => {
                const group = groups.find((g) => g.id === groupId);
                return values.map((value) => {
                  const option = group?.options.find((o) => o.value === value);
                  return (
                    <button
                      key={`${groupId}-${value}`}
                      onClick={() => handleFilterToggle(groupId, value, group?.multiple)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`${option?.label}フィルターを解除`}
                    >
                      {option?.label}
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  );
                });
              })}
            </div>
          </div>
        )}

        {/* スクリーンリーダー用のライブリージョン */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
      </div>
    );
  }
);

FilterPanel.displayName = "FilterPanel";
FilterOption.displayName = "FilterOption";
FilterGroupComponent.displayName = "FilterGroupComponent";
