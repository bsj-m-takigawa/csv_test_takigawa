# Issue #21: APIレスポンスキャッシュの実装 [CLOSED]

## 優先度: 🔴 Critical

## 概要
APIレスポンスのキャッシュが実装されていないため、同じクエリでも毎回データベースアクセスが発生している。

## 問題の詳細
- 同一条件のリクエストでも毎回DB問い合わせ
- ユーザー一覧の表示に400-600ms
- 複数ユーザーの同時アクセスでDB負荷増大

## 影響を受ける機能
- ユーザー一覧API（/api/users）
- 検索・フィルタリング機能

## 解決策

### 1. Redisのインストールと設定
```bash
docker-compose.yml に Redis を追加
```

### 2. キャッシュ実装
```php
// PaginationController.php
public function index(Request $request)
{
    $cacheKey = 'users:' . md5(serialize($request->all()));
    $cacheTTL = 300; // 5分
    
    return Cache::remember($cacheKey, $cacheTTL, function () use ($request) {
        // 既存のクエリロジック
    });
}
```

### 3. キャッシュ無効化戦略
```php
// UserController.php の create/update/delete で
Cache::tags(['users'])->flush();
```

## 期待される効果
- API応答時間: 80-90%改善（キャッシュヒット時）
- DB負荷: 70%削減
- 同時接続数: 3倍まで対応可能

## 実装工数
- 見積もり: 3時間
- テスト: 1時間

## 受け入れ基準
- [ ] Redisコンテナの追加
- [ ] キャッシュ機能の実装
- [ ] キャッシュ無効化の実装
- [ ] キャッシュヒット率の確認
- [ ] 2回目のリクエストが50ms以内