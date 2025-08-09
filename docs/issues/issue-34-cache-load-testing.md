# Issue #34: キャッシュ負荷テストの実施

## 概要
大量データでのキャッシュ操作性能を測定し、ボトルネックを特定する。

## 目的
- 実運用環境での性能確認
- スケーラビリティの検証
- 最適なキャッシュ設定の特定

## テスト項目

### 1. 性能テスト
- **100万件データでのテスト**
  - ページネーション応答時間
  - キャッシュ生成時間
  - メモリ使用量

### 2. 並行アクセステスト
- 同時接続数: 100, 500, 1000
- JMeterまたはk6使用
- 応答時間の劣化測定

### 3. キャッシュ無効化テスト
- バルク更新時の処理時間
- タグベースフラッシュの性能
- 部分的キャッシュクリアの影響

## テストシナリオ

```bash
# k6スクリプト例
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.get('http://localhost:8000/api/pagination');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

## 合格基準
- [ ] 100万件データで応答時間 < 100ms（キャッシュヒット時）
- [ ] 同時接続1000でも応答時間 < 500ms
- [ ] キャッシュクリア後の再生成 < 3秒
- [ ] Redisメモリ使用量 < 1GB

## 優先度
High（本番環境投入前に必須）

## 関連issue
- Issue #33: キャッシュ監視とメトリクス設置