# Issue #36: キャッシュ設定の外部化と設定可能化

## 概要
現在ハードコードされているキャッシュ設定（TTL、タグ戦略）を設定ファイルで管理可能にする。

## 現状の問題点
- TTLが300秒固定
- タグ戦略の変更が困難
- 環境別の設定不可

## 改善案

### 1. 設定ファイル作成
`config/cache-strategy.php`
```php
return [
    'ttl' => [
        'default' => env('CACHE_TTL', 300),
        'pagination' => env('CACHE_PAGINATION_TTL', 300),
        'status_counts' => env('CACHE_STATUS_TTL', 600),
        'user_detail' => env('CACHE_USER_TTL', 3600),
    ],
    
    'tags' => [
        'strategy' => env('CACHE_TAG_STRATEGY', 'hierarchical'),
        'patterns' => [
            'user' => 'user.{id}',
            'status' => 'status.{status}',
            'pagination' => 'page.{page}.size.{size}',
        ],
    ],
    
    'drivers' => [
        'production' => 'redis',
        'staging' => 'redis',
        'local' => 'array',
        'testing' => 'array',
    ],
    
    'features' => [
        'auto_warm' => env('CACHE_AUTO_WARM', false),
        'partial_update' => env('CACHE_PARTIAL_UPDATE', true),
        'async_clear' => env('CACHE_ASYNC_CLEAR', false),
    ],
];
```

### 2. 環境変数設定
`.env`
```env
# キャッシュTTL設定（秒）
CACHE_TTL=300
CACHE_PAGINATION_TTL=300
CACHE_STATUS_TTL=600
CACHE_USER_TTL=3600

# キャッシュ戦略
CACHE_TAG_STRATEGY=hierarchical

# 機能フラグ
CACHE_AUTO_WARM=false
CACHE_PARTIAL_UPDATE=true
CACHE_ASYNC_CLEAR=false
```

### 3. 使用例
```php
class PaginationController extends Controller
{
    public function index(Request $request)
    {
        $ttl = config('cache-strategy.ttl.pagination');
        $cacheKey = $this->generateCacheKey($request);
        
        $data = Cache::tags($this->getCacheTags())
            ->remember($cacheKey, $ttl, function () use ($validated) {
                return $this->getPaginatedData($validated);
            });
            
        return response()->json($data);
    }
    
    private function getCacheTags()
    {
        $strategy = config('cache-strategy.tags.strategy');
        
        return match($strategy) {
            'simple' => ['users', 'pagination'],
            'hierarchical' => $this->getHierarchicalTags(),
            'granular' => $this->getGranularTags(),
            default => ['users'],
        };
    }
}
```

## 実装内容

### Phase 1: 基本設定
- [ ] 設定ファイルの作成
- [ ] 環境変数の定義
- [ ] 既存コードの設定値置き換え

### Phase 2: 動的設定
- [ ] 管理画面からの設定変更
- [ ] 設定のバリデーション
- [ ] 設定変更ログ

### Phase 3: 高度な機能
- [ ] A/Bテスト対応
- [ ] 動的TTL調整
- [ ] 自動最適化

## メリット
- 環境別の最適化が可能
- 運用中の調整が容易
- テスト環境での検証が簡単

## 優先度
Medium（次回リファクタリング時）

## 関連issue
- Issue #35: キャッシュ粒度の最適化