# API認証セットアップガイド

## 概要
このシステムはLaravel Sanctumを使用したトークンベースの認証を実装しています。

## セットアップ手順

### 1. マイグレーション実行
```bash
docker compose exec backend php artisan migrate
```

### 2. テストユーザーの作成
```bash
docker compose exec backend php artisan db:seed --class=TestUserSeeder
```

## テストアカウント

以下のテストアカウントが利用可能です：

| ユーザータイプ | メールアドレス | パスワード | 説明 |
|------------|--------------|----------|------|
| 管理者 | admin@example.com | password | 全機能にアクセス可能 |
| 一般ユーザー | user@example.com | password | 標準的な権限 |

## API認証の使用方法

### ログイン
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password",
    "device_name": "web"
  }'
```

レスポンス:
```json
{
  "user": { ... },
  "token": "1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### 認証が必要なAPIへのアクセス
```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新規ユーザー",
    "email": "new@example.com"
  }'
```

### ログアウト
```bash
curl -X POST http://localhost:8000/api/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## フロントエンドでの使用

1. ログインページ（`/login`）にアクセス
2. テストアカウントでログイン
3. トークンは自動的にlocalStorageに保存
4. 以降のAPIリクエストには自動的に認証ヘッダーが付与

## エンドポイントの認証要件

### 認証が必要なエンドポイント（書き込み系）

以下のエンドポイントは認証が必須です：

- `POST /api/users` - ユーザー作成
- `PUT /api/users/{id}` - ユーザー更新
- `DELETE /api/users/{id}` - ユーザー削除
- `POST /api/users/import` - CSVインポート
- `POST /api/users/check-duplicates` - CSV重複チェック
- `POST /api/users/bulk-delete` - 一括削除
- `POST /api/users/bulk-export` - 一括エクスポート

### 認証不要のエンドポイント（読み取り専用）

以下のエンドポイントは認証なしでアクセス可能です：

- `GET /api/users` - ユーザー一覧取得
- `GET /api/users/{id}` - ユーザー詳細取得
- `GET /api/users/export` - CSVエクスポート
- `GET /api/users/sample-csv` - サンプルCSVダウンロード
- `GET /api/users/status-counts` - ステータス別カウント取得
- `GET /api/pagination` - ページネーション付きユーザー一覧
- `GET /api/pagination/status-counts` - ページネーション用ステータスカウント

## トラブルシューティング

### 401 Unauthorizedエラー
- トークンが正しく設定されているか確認
- トークンの有効期限が切れていないか確認
- `Authorization: Bearer TOKEN`形式でヘッダーが設定されているか確認

### マイグレーションエラー
- データベース接続を確認
- `docker compose exec backend php artisan migrate:fresh`で再実行