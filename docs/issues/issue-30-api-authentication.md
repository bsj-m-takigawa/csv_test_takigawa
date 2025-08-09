# Issue #30: API認証の実装（書き込み系エンドポイント） [CLOSED]

## 問題の概要
現在、書き込み系APIエンドポイント（ユーザー作成/更新/削除、CSVインポート、バルク操作）が認証なしで公開されており、重大なセキュリティリスクとなっている。

## 影響範囲
- **ファイル**: `backend/routes/api.php`
- **影響度**: Critical（セキュリティ脆弱性）
- **対象エンドポイント**:
  - POST /users（作成）
  - PUT /users/{id}（更新）
  - DELETE /users/{id}（削除）
  - POST /users/import（CSVインポート）
  - POST /users/bulk-delete（一括削除）
  - POST /users/bulk-export（一括エクスポート）

## 詳細な問題点

現在の`routes/api.php`では、書き込み系エンドポイントがレート制限のみで保護されている：
```php
Route::middleware(['throttle:60,1'])->group(function () {
    Route::post('users', [UserController::class, 'store']);
    Route::put('users/{user}', [UserController::class, 'update']);
    Route::delete('users/{user}', [UserController::class, 'destroy']);
    // ...
});
```

## 修正方針

### 1. Laravel Sanctumの設定
- Sanctumパッケージの設定確認
- APIトークン認証の実装
- CORSの適切な設定

### 2. 認証ミドルウェアの追加
```php
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    // 書き込み系エンドポイント
});
```

### 3. 読み取り専用エンドポイントの整理
- GET系エンドポイントは認証不要のまま維持（要件次第）
- または全APIを認証必須にする

### 4. フロントエンドの対応
- APIトークンの管理
- 認証ヘッダーの追加
- 認証エラーハンドリング

## テスト項目
- [ ] 認証なしでの書き込みAPIアクセスが拒否される
- [ ] 有効なトークンでのアクセスが成功する
- [ ] トークンの有効期限が適切に動作する
- [ ] CORS設定が正しく動作する

## 実装ステップ
1. Sanctumの設定確認・調整
2. ルートファイルに認証ミドルウェア追加
3. 認証用エンドポイント（login/logout）の実装
4. フロントエンドのAPI通信に認証ヘッダー追加
5. テストの実施

## 参考情報
- [Laravel Sanctum Documentation](https://laravel.com/docs/10.x/sanctum)
- [Laravel API Authentication](https://laravel.com/docs/10.x/authentication#api-authentication)