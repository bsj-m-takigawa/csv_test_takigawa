# Issue #38: イベントベースの自動キャッシュクリア

## 概要
Laravelのモデルイベントを利用して、データ変更時に自動的にキャッシュをクリアする仕組みを実装。

## 現状の問題点
- 各コントローラーで手動でキャッシュクリア
- クリア漏れのリスク
- コードの重複

## 改善案

### 1. モデルオブザーバーの実装
`app/Observers/UserObserver.php`
```php
<?php

namespace App\Observers;

use App\Models\User;
use App\Services\CacheService;

class UserObserver
{
    private CacheService $cacheService;
    
    public function __construct(CacheService $cacheService)
    {
        $this->cacheService = $cacheService;
    }
    
    /**
     * ユーザー作成後の処理
     */
    public function created(User $user): void
    {
        $this->cacheService->invalidateUserCaches();
        $this->cacheService->invalidateStatusCount($user->membership_status);
    }
    
    /**
     * ユーザー更新後の処理
     */
    public function updated(User $user): void
    {
        // 特定ユーザーのキャッシュをクリア
        $this->cacheService->invalidateUser($user->id);
        
        // ステータスが変更された場合
        if ($user->isDirty('membership_status')) {
            $this->cacheService->invalidateStatusCount($user->membership_status);
            $this->cacheService->invalidateStatusCount($user->getOriginal('membership_status'));
        }
    }
    
    /**
     * ユーザー削除後の処理
     */
    public function deleted(User $user): void
    {
        $this->cacheService->invalidateUser($user->id);
        $this->cacheService->invalidateUserCaches();
        $this->cacheService->invalidateStatusCount($user->membership_status);
    }
    
    /**
     * バルク操作時の処理
     */
    public function bulkDeleted(array $userIds): void
    {
        $this->cacheService->invalidateBulk($userIds);
    }
}
```

### 2. サービスプロバイダーでの登録
`app/Providers/EventServiceProvider.php`
```php
use App\Models\User;
use App\Observers\UserObserver;

public function boot(): void
{
    User::observe(UserObserver::class);
}
```

### 3. イベントリスナーの実装
`app/Listeners/CacheClearListener.php`
```php
<?php

namespace App\Listeners;

use App\Events\BulkUserOperation;
use App\Services\CacheService;
use Illuminate\Contracts\Queue\ShouldQueue;

class CacheClearListener implements ShouldQueue
{
    public function __construct(
        private CacheService $cacheService
    ) {}
    
    public function handle(BulkUserOperation $event): void
    {
        // 非同期でキャッシュクリア
        $this->cacheService->invalidateBulkAsync($event->userIds);
    }
}
```

### 4. カスタムイベントの定義
`app/Events/BulkUserOperation.php`
```php
<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BulkUserOperation
{
    use Dispatchable, SerializesModels;
    
    public function __construct(
        public array $userIds,
        public string $operation
    ) {}
}
```

## 実装メリット

### 1. 自動化
- データ変更時に自動でキャッシュクリア
- クリア漏れの防止
- 一貫性の保証

### 2. パフォーマンス
- 非同期処理対応
- 必要最小限のキャッシュクリア
- バルク操作の最適化

### 3. 保守性
- DRY原則の実現
- テストしやすい構造
- 拡張性の確保

## 実装内容

### Phase 1: 基本実装
- [ ] UserObserverの作成
- [ ] CacheServiceの拡張
- [ ] イベント登録

### Phase 2: 高度な機能
- [ ] 非同期キャッシュクリア
- [ ] バルク操作の最適化
- [ ] キャッシュ依存関係の管理

### Phase 3: 監視と最適化
- [ ] イベント発火のログ
- [ ] パフォーマンス測定
- [ ] 自動調整機能

## テスト項目
- [ ] モデルイベントの発火確認
- [ ] キャッシュクリアの動作確認
- [ ] 非同期処理のテスト
- [ ] エラーハンドリング

## 優先度
Medium（次回リファクタリング時）

## 関連issue
- Issue #35: キャッシュ粒度の最適化
- Issue #36: キャッシュ設定の外部化