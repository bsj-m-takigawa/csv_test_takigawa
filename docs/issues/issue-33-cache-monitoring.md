# Issue #33: キャッシュ監視とメトリクス設置

## 概要
PR #7でタグベースキャッシュを実装後、運用監視のためのメトリクス設置が必要。

## 目的
- キャッシュの効果を測定
- パフォーマンスボトルネックの特定
- Redis負荷の監視

## 実装内容

### 1. 監視メトリクスの設置
- **キャッシュヒット率**
  - ヒット/ミス回数のカウント
  - エンドポイント別の統計
- **Redis性能監視**
  - メモリ使用量
  - 応答時間
  - 接続数

### 2. ログ強化
```php
// キャッシュヒット時
Log::info('Cache hit', [
    'key' => $cacheKey,
    'endpoint' => request()->path(),
    'response_time' => $responseTime
]);

// キャッシュミス時
Log::info('Cache miss', [
    'key' => $cacheKey,
    'endpoint' => request()->path(),
    'query_time' => $queryTime
]);
```

### 3. ダッシュボード構築
- Grafana/Prometheus連携
- リアルタイムモニタリング
- アラート設定

## 測定項目
- [x] キャッシュヒット率（目標: 80%以上）
- [ ] 平均応答時間の改善率
- [ ] Redisメモリ使用率
- [ ] キャッシュキー数の推移

## 優先度
High（運用開始前に必須）

## 関連PR
- PR #7: タグベースキャッシュ実装

## 対応状況
- ページネーションおよびステータスカウントAPIでキャッシュヒット/ミスをログに記録し、
  `metrics:cache_hit` と `metrics:cache_miss` のカウンタを追加。

