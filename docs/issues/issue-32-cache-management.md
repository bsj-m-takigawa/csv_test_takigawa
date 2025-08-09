# Issue #32: キャッシュ管理の改善（タグベースキャッシュ）

## 問題の概要
現在のキャッシュ実装は基本的なキー/値ベースであり、関連するキャッシュを効率的に無効化する仕組みがない。

## 影響範囲
- **ファイル**: `backend/app/Http/Controllers/PaginationController.php`
- **影響度**: Medium（パフォーマンスとデータ整合性）

## 現在の実装の問題点

1. **キャッシュ無効化の問題**
   - ユーザー作成/更新/削除時にキャッシュが自動クリアされない
   - 手動でのキャッシュクリアが必要
   - データの不整合リスク

2. **スケーラビリティの問題**
   - キャッシュキーが増えると管理が困難
   - 部分的な無効化ができない

## 修正方針

### 1. タグベースキャッシュの実装
```php
// キャッシュの保存時にタグを付与
Cache::tags(['users', 'pagination'])->put($cacheKey, $users, 300);

// ユーザー関連の全キャッシュをクリア
Cache::tags(['users'])->flush();
```

### 2. イベントリスナーの実装
- User モデルの created, updated, deleted イベントを監視
- 変更時に自動的にキャッシュをクリア

### 3. キャッシュヘルパーの作成
- キャッシュのタグ管理を一元化
- 再利用可能なキャッシュロジック

## 実装内容

### PaginationController.php の改善
```php
// タグ付きキャッシュ
$users = Cache::tags(['users', 'pagination'])->remember($cacheKey, 300, function () use ($query) {
    return $query->paginate($perPage);
});
```

### UserController.php でのキャッシュクリア
```php
public function store(StoreUserRequest $request)
{
    $user = User::create($validated);
    Cache::tags(['users'])->flush(); // キャッシュクリア
    return response()->json($user, 201);
}
```

### CsvController.php でのキャッシュクリア
```php
// インポート成功後
Cache::tags(['users'])->flush();
```

## テスト項目
- [ ] タグ付きキャッシュが正しく保存される
- [ ] ユーザー作成時にキャッシュがクリアされる
- [ ] ユーザー更新時にキャッシュがクリアされる
- [ ] ユーザー削除時にキャッシュがクリアされる
- [ ] CSVインポート時にキャッシュがクリアされる
- [ ] バルク削除時にキャッシュがクリアされる

## 参考情報
- Laravel タグ付きキャッシュドキュメント
- レビューで指摘された重要度: Medium