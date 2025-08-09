# Issue #35: キャッシュ粒度の最適化

## 概要
現在の実装では全ユーザーキャッシュを一括クリアしているが、より細かい単位での管理が必要。

## 現状の問題点
- 1ユーザーの更新で全キャッシュクリア
- 不要なキャッシュ再生成
- パフォーマンスへの影響

## 改善案

### 1. ユーザー単位のタグ付け
```php
// 現在の実装
Cache::tags(['users'])->flush();

// 改善案
Cache::tags(['users', "user.{$userId}"])->flush();
Cache::tags(['users', 'pagination', "page.{$page}"])->flush();
```

### 2. 階層的タグ構造
```php
// タグ構造例
[
    'users' => [
        'user.{id}',
        'status.{status}',
        'created.{date}'
    ],
    'pagination' => [
        'page.{number}',
        'per_page.{size}'
    ]
]
```

### 3. 部分的キャッシュ更新
```php
class CacheService
{
    public function invalidateUser($userId)
    {
        // 特定ユーザーに関連するキャッシュのみクリア
        Cache::tags(["user.{$userId}"])->flush();
        
        // 関連するリストキャッシュも更新
        $this->updateListCaches($userId);
    }
    
    public function invalidateStatus($status)
    {
        // 特定ステータスのキャッシュのみクリア
        Cache::tags(["status.{$status}"])->flush();
    }
}
```

## 実装内容

### Phase 1: 基本実装
- [ ] CacheServiceクラスの作成
- [ ] ユーザー単位のタグ付け
- [ ] ステータス単位のタグ付け

### Phase 2: 最適化
- [ ] 部分的キャッシュ更新ロジック
- [ ] 依存関係の管理
- [ ] キャッシュウォーミング

### Phase 3: 高度な機能
- [ ] キャッシュ依存グラフ
- [ ] 自動無効化ルール
- [ ] キャッシュ戦略の動的切り替え

## 期待効果
- キャッシュヒット率: 80% → 95%
- 不要な再生成: 90%削減
- 応答時間: 30%改善

## 優先度
Medium（次回リファクタリング時）

## 関連issue
- Issue #33: キャッシュ監視とメトリクス設置
- Issue #34: キャッシュ負荷テストの実施