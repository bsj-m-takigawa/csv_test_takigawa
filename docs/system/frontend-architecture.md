# フロントエンドアーキテクチャ

## 概要

CSV Horizon Beta のフロントエンドは Next.js 15 (App Router) + TypeScript で構築され、パフォーマンス最適化とユーザビリティを重視した設計となっています。

## 技術スタック

### コアテクノロジー
- **Next.js 15.2.4**: App Router, React Server Components
- **React 19**: 最新の React 機能とパフォーマンス改善
- **TypeScript 5.9.2**: 型安全性とDX向上
- **Tailwind CSS 4**: ユーティリティファーストCSS

### 主要ライブラリ
- **react-window 1.8.11**: Virtual Scrolling実装
- **clsx**: 条件付きクラス名生成
- **tailwind-merge**: Tailwind クラスのマージ最適化

### 削除済み依存関係
- ~~**axios**~~: fetch API への移行により削除 (13KB削減)

## アプリケーション構成

### ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホームページ
│   └── users/             # ユーザー関連ページ
│       ├── list/          # ユーザー一覧
│       ├── add/           # ユーザー追加
│       ├── edit/[id]/     # ユーザー編集
│       ├── detail/[id]/   # ユーザー詳細
│       ├── delete/[id]/   # ユーザー削除
│       ├── import/        # CSV インポート
│       └── export/        # CSV エクスポート
├── components/            # 共有コンポーネント
│   ├── UserTable.tsx      # ユーザーテーブル (最適化済み)
│   ├── VirtualTable.tsx   # 仮想スクロールテーブル
│   ├── FilterPanel.tsx    # フィルターパネル (最適化済み)
│   ├── SearchField.tsx    # 検索フィールド (最適化済み)
│   ├── Header.tsx         # ヘッダーコンポーネント
│   └── ui/                # UI プリミティブ
│       ├── Alert.tsx
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       └── Table.tsx
├── lib/                   # ユーティリティ
│   ├── api/
│   │   └── users.ts       # API関数 (fetch移行済み)
│   └── utils.ts           # 汎用ユーティリティ
└── styles/                # スタイル定義
    ├── design-system.md
    └── design-tokens.ts
```

## パフォーマンス最適化アーキテクチャ

### 1. コンポーネント最適化

#### React.memo 適用パターン

```typescript
// UserTable.tsx - 最適化済みコンポーネント
export const UserTable = memo<UserTableProps>(({ 
  users, 
  loading, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  // メモ化されたサブコンポーネント
  const UserRow = memo<UserRowProps>(({ user }) => {
    return <tr>{/* ユーザー行の内容 */}</tr>;
  });

  const UserMobileCard = memo<UserMobileCardProps>(({ user }) => {
    return <div>{/* モバイル用カード */}</div>;
  });

  return (
    <div className="overflow-hidden">
      {/* テーブル本体 */}
    </div>
  );
});
```

#### useCallback 最適化

```typescript
// FilterPanel.tsx - イベントハンドラの最適化
const FilterPanel = memo<FilterPanelProps>(({ 
  statusCounts, 
  activeFilters, 
  onFiltersChange 
}) => {
  const handleFilterToggle = useCallback((filterType: string, value: string) => {
    onFiltersChange(filterType, value);
  }, [onFiltersChange]);

  const handleClearAll = useCallback(() => {
    onFiltersChange('clear');
  }, [onFiltersChange]);

  return <div>{/* フィルターUI */}</div>;
});
```

### 2. コード分割と動的インポート

#### 動的インポート実装

```typescript
// /users/list/page.tsx
import { lazy, Suspense } from "react";

// 重いコンポーネントを遅延読み込み
const UserTable = lazy(() => 
  import("@/components/UserTable").then(module => ({ 
    default: module.UserTable 
  }))
);

const VirtualTable = lazy(() => 
  import("@/components/VirtualTable").then(module => ({ 
    default: module.VirtualTable 
  }))
);

const FilterPanel = lazy(() => 
  import("@/components/FilterPanel").then(module => ({ 
    default: module.FilterPanel 
  }))
);

function UserListPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Suspense fallback={<UserTableSkeleton />}>
        {useVirtualScrolling ? (
          <VirtualTable users={users} />
        ) : (
          <UserTable users={users} />
        )}
      </Suspense>
      
      <Suspense fallback={<FilterPanelSkeleton />}>
        <FilterPanel 
          statusCounts={statusCounts}
          activeFilters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </Suspense>
    </div>
  );
}
```

#### Skeleton UI パターン

```typescript
// ローディング用Skeletonコンポーネント
const UserTableSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="animate-pulse">
      <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-t-lg"></div>
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="h-16 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        />
      ))}
    </div>
  </div>
);
```

### 3. Virtual Scrolling アーキテクチャ

#### 自動切り替えロジック

```typescript
function UserListPage() {
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  
  // データ量に応じた自動切り替え
  useEffect(() => {
    if (users.length >= 1000) {
      setUseVirtualScrolling(true);
    } else if (users.length < 100) {
      setUseVirtualScrolling(false);
    }
  }, [users.length]);

  return (
    <>
      {/* Virtual Scrolling 切り替えUI */}
      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={useVirtualScrolling}
            onChange={(e) => setUseVirtualScrolling(e.target.checked)}
          />
          <span>Virtual Scrolling を有効にする ({users.length}件)</span>
        </label>
      </div>

      {/* テーブル表示 */}
      <Suspense fallback={<UserTableSkeleton />}>
        {useVirtualScrolling ? (
          <VirtualTable 
            users={users}
            height={600}
            itemHeight={72}
          />
        ) : (
          <UserTable users={users} />
        )}
      </Suspense>
    </>
  );
}
```

#### VirtualTable 内部構造

```typescript
// VirtualTable.tsx
export const VirtualTable = memo<VirtualTableProps>(({
  users,
  height = 400,
  itemHeight = 72,
}) => {
  const listRef = useRef<List>(null);
  
  // 仮想化されたアイテムデータ
  const itemData = useMemo(() => ({
    users,
    selectedUsers,
    hoveredRow,
    onToggleSelect: handleToggleSelect,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  }), [users, selectedUsers, hoveredRow, handleToggleSelect, handleMouseEnter, handleMouseLeave]);

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* 固定ヘッダー */}
      <div className="bg-gray-50 border-b px-6 py-3">
        <div className="flex items-center">
          {/* ヘッダー内容 */}
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
    </div>
  );
});
```

### 4. API層アーキテクチャ

#### fetch API ベースの実装

```typescript
// /lib/api/users.ts

// 統一されたAPIクライアント
async function apiFetch(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).response = {
      status: response.status,
      data: await response.text().catch(() => null),
    };
    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response;
}

// 型安全なAPI関数群
export const fetchUsers = async (params?: {
  page?: number;
  per_page?: number;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  status?: string;
  created?: string;
}) => {
  try {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    const url = `${API_URL}/users${queryString ? `?${queryString}` : ''}`;
    
    return await apiFetch(url);
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};
```

## 状態管理アーキテクチャ

### URL状態同期パターン

```typescript
// URLパラメータとの同期
function UserListPage() {
  const searchParams = useSearchParams();
  
  // URLパラメータから状態を初期化
  useEffect(() => {
    const initialFilters: Record<string, string[]> = {};
    
    const statusParam = searchParams.get('status');
    if (statusParam) {
      initialFilters.status = statusParam.split(',');
    }
    
    const qParam = searchParams.get('q');
    if (qParam) {
      setSearchQuery(qParam);
    }
    
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
  }, [searchParams]);

  // 状態変更時にURL更新
  const updateURL = useCallback((newFilters: Record<string, string[]>, newQuery: string) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        params.set(key, values.join(','));
      }
    });
    
    if (newQuery) {
      params.set('q', newQuery);
    }
    
    const newURL = params.toString() ? `?${params.toString()}` : '';
    window.history.replaceState({}, '', `/users/list${newURL}`);
  }, []);
}
```

### ローカル状態管理

```typescript
// コンポーネント内状態管理
function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // データフェッチのメモ化
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResult, countsResult] = await Promise.all([
        fetchUsers({
          page: currentPage,
          per_page: itemsPerPage,
          q: searchQuery,
          status: filters.status?.join(','),
          created: filters.created?.[0],
        }),
        fetchStatusCounts({ q: searchQuery })
      ]);
      
      setUsers(usersResult.data);
      setMeta(usersResult.meta);
      setStatusCounts(countsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchQuery, filters]);
}
```

## レスポンシブデザインアーキテクチャ

### ブレークポイント戦略

```typescript
// Tailwind CSS ブレークポイント設定
const breakpoints = {
  sm: '640px',   // スマートフォン (縦)
  md: '768px',   // タブレット
  lg: '1024px',  // ラップトップ
  xl: '1280px',  // デスクトップ
  '2xl': '1536px' // 大型デスクトップ
};

// レスポンシブコンポーネント例
const ResponsiveUserTable = () => {
  return (
    <div className="w-full">
      {/* デスクトップ: 通常のテーブル */}
      <div className="hidden md:block">
        <UserTable users={users} />
      </div>
      
      {/* モバイル: カード表示 */}
      <div className="md:hidden space-y-4">
        {users.map(user => (
          <UserMobileCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
};
```

### アダプティブローディング

```typescript
// デバイスに応じた最適化
function useDeviceOptimization() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLowEndDevice(navigator.hardwareConcurrency < 4);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return { isMobile, isLowEndDevice };
}

function UserListPage() {
  const { isMobile, isLowEndDevice } = useDeviceOptimization();
  
  // デバイスに応じた最適化
  const itemsPerPage = isMobile ? 10 : isLowEndDevice ? 25 : 50;
  const enableVirtualScrolling = !isMobile && users.length > (isLowEndDevice ? 500 : 1000);
  
  return (
    <div>
      {enableVirtualScrolling ? (
        <VirtualTable users={users} itemHeight={isMobile ? 80 : 72} />
      ) : (
        <UserTable users={users} />
      )}
    </div>
  );
}
```

## エラーハンドリングアーキテクチャ

### Error Boundary パターン

```typescript
// ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{error: Error}> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <this.props.fallback error={this.state.error!} />;
    }

    return this.props.children;
  }
}

// 使用例
function App() {
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<LoadingSpinner />}>
        <UserListPage />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## テスト戦略

### コンポーネントテスト

```typescript
// UserTable.test.tsx
import { render, screen } from '@testing-library/react';
import { UserTable } from '@/components/UserTable';

describe('UserTable', () => {
  it('should render memoized components correctly', () => {
    const users = [
      { id: 1, name: 'Test User', email: 'test@example.com' }
    ];
    
    render(<UserTable users={users} />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
  
  it('should not re-render when props are unchanged', () => {
    const renderSpy = jest.fn();
    const MemoizedComponent = memo(() => {
      renderSpy();
      return <div>Test</div>;
    });
    
    const { rerender } = render(<MemoizedComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    
    rerender(<MemoizedComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1); // 再レンダリングされない
  });
});
```

### パフォーマンステスト

```typescript
// performance.test.ts
import { fetchUsers } from '@/lib/api/users';

describe('API Performance', () => {
  it('should fetch users within acceptable time', async () => {
    const start = performance.now();
    await fetchUsers({ page: 1, per_page: 50 });
    const end = performance.now();
    
    expect(end - start).toBeLessThan(1000); // 1秒以内
  });
});
```

## 今後の発展計画

### 短期的改善 (1-2週間)
1. axios の package.json からの完全削除
2. Error Boundary の実装
3. TypeScript strict mode 対応

### 中期的改善 (1-2ヶ月)
1. React Server Components の部分採用
2. Streaming SSR の導入
3. Service Worker によるキャッシュ戦略

### 長期的改善 (3-6ヶ月)
1. Micro-frontend アーキテクチャ検討
2. Edge Computing 活用
3. PWA 対応強化

## 関連ドキュメント

- [Frontend Performance Optimization](./frontend-performance-optimization.md)
- [System Specification](./system_spec.md)
- [UX Guidelines](./ux/ux_guidelines.md)
- [Issue #24: Frontend Optimization](../issues/issue-24-frontend-optimization.md)