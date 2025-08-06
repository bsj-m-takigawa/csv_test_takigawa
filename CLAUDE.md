# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 必須コマンド

### フロントエンド (Next.js + TypeScript)
```bash
cd frontend
npm run dev         # Turbopackで開発サーバー起動
npm run build       # 本番ビルド
npm run start       # 本番サーバー起動
npm run lint        # ESLintチェック
npm run typecheck   # TypeScript型チェック
```

### バックエンド (Laravel 10 + PHP)
```bash
# 開発サーバー
docker compose exec backend php artisan serve    # 開発サーバー起動

# コード品質
docker compose exec backend composer run pint    # コード整形 (PSR-12準拠)

# テスト実行（Docker内で実行必須）
docker compose exec backend composer run test    # 全PHPUnitテスト実行
docker compose exec backend ./vendor/bin/phpunit tests/Feature/PaginationTest.php  # 単一テストファイル
docker compose exec backend ./vendor/bin/phpunit --filter test_method_name         # 単一テストメソッド

# データベース操作
docker compose exec backend php artisan migrate --seed           # シードデータで初期化
docker compose exec backend php artisan migrate:fresh --seed     # リセット＆再シード
docker compose exec backend php artisan app:init-database-test       # テストデータ (1,000件)
docker compose exec backend php artisan app:init-database-production # 本番データ (100万件)
```

### Docker環境
```bash
docker-compose up --build           # 全サービスのビルド＆起動
docker compose exec backend bash    # バックエンドコンテナに入る
```

## アーキテクチャ概要

### 技術スタック
- **フロントエンド**: Next.js 15 (App Router)、TypeScript、Tailwind CSS、Fetch API、PWA対応
- **バックエンド**: Laravel 10、PHP 8.1、MySQL 8.0、Redis 7、gzip圧縮対応
- **インフラ**: Docker、Docker Compose、Predis Client

### 主要なアーキテクチャパターン

#### フロントエンドアーキテクチャ
- **ルーティング**: `frontend/src/app/`配下のファイルベースルーティング (App Router)
- **API通信**: 全APIコールは`frontend/src/lib/api/users.ts`経由（Axios→Fetch API移行済み）
- **環境設定**: `NEXT_PUBLIC_API_URL`環境変数でAPI URL管理
- **コンポーネント構造**: デフォルトはServer Components、必要時にClient Components
- **型安全性**: `users.ts`でUserインターフェース定義、`any`型は回避
- **状態管理**: 
  - ページネーション状態はURLパラメータで管理
  - バルク選択状態はセッションストレージで永続化
  - 検索・フィルター状態はReact state + URLパラメータ

#### バックエンドアーキテクチャ
- **APIルート**: `backend/routes/api.php`で定義
- **コントローラー**: 
  - `UserController` - CRUD操作 + バルク削除機能
  - `CsvController` - インポート/エクスポート機能 + バルクエクスポート機能
  - `PaginationController` - ページネーション付きユーザー一覧（Redisキャッシュ対応）
- **モデル**: Eloquent ORMの`User`モデル
- **バリデーション**: Form Requests (`StoreUserRequest`、`UpdateUserRequest`)
- **データベース**: `database/migrations/`にマイグレーション、テストデータ用シーダー

#### データフロー
1. フロントエンドが`lib/api/users.ts`経由で型付きAPIコール
2. Laravelルートがコントローラー経由でリクエスト処理
3. コントローラーがForm Requestsで入力検証
4. モデルがMySQLデータベースと対話
5. JSONレスポンスを適切なステータスコードで返却

### 重要な実装詳細

#### CSV処理
- **インポート**: 行単位バリデーション、トランザクションバッチ、エラーCSV生成
- **エクスポート**: 大規模データセット用チャンク分割ストリーミング、標準化ヘッダー
- **エラーファイル**: `backend/storage/app/public/`に配置

#### セキュリティ考慮事項
- 全入力にLaravelバリデーション
- CSRF保護有効
- Sanctum認証（準備済みだが未アクティブ）
- `fillable`属性によるマスアサインメント防止
- 生SQLクエリ禁止 - Eloquent/Query Builder使用

#### パフォーマンス最適化
- **フロントエンド最適化**: React.memo、dynamic imports、virtual scrolling実装済み
- **APIレスポンス圧縮**: gzip圧縮で85-88%データサイズ削減
- **Redis API キャッシュ**: 5分間TTLでAPIレスポンス高速化
- **サーバーサイドページネーション**: ユーザー一覧の効率的な表示
- **チャンク分割CSVエクスポート**: メモリ効率の最適化
- **データベースインデックス**: 頻繁クエリフィールドの高速化
- **バルクトランザクション**: バッチ処理でパフォーマンス向上

#### スマートバルク操作機能
- **選択状態の永続化**: セッションストレージによるページ間選択状態保持
- **3つの選択モード**: 
  - 個別選択：特定ユーザーのチェックボックス選択
  - 全件選択：全データベースのユーザー対象
  - 条件選択：検索・フィルター条件に一致するユーザー対象
- **バルク削除**: 大量ユーザーの一括削除（トランザクション保護）
- **バルクエクスポート**: 選択されたユーザーのみをCSVファイル化
- **メモリ効率**: チャンク処理により100万件規模でも安定動作

### APIエンドポイント

ベースURL: `http://localhost:8000/api`

#### ユーザー管理
- `GET /users` - ページネーション付き一覧
  - パラメータ: page, per_page, sort, order, q, status, created
- `GET /users/{id}` - 単一ユーザー詳細
- `POST /users` - ユーザー作成
- `PUT /users/{id}` - ユーザー更新
- `DELETE /users/{id}` - ユーザー削除
- `GET /users/status-counts` - ステータス別ユーザー数取得

#### CSV操作
- `POST /users/import` - CSVインポート (multipart/form-data)
- `POST /users/check-duplicates` - CSVファイルの重複チェック
- `GET /users/export` - CSVエクスポート (blob返却)
- `GET /users/sample-csv` - サンプルCSVテンプレートダウンロード

#### バルク操作
- `POST /users/bulk-delete` - 複数ユーザー一括削除
  - 個別選択: `{"user_ids": [1,2,3]}`
  - 全件選択: `{"select_all": true, "select_type": "all"}`
  - 条件選択: `{"select_all": true, "select_type": "filtered", "filters": {"status": "active"}}`
- `POST /users/bulk-export` - 複数ユーザー一括CSVエクスポート
  - パラメータ形式はbulk-deleteと同様

#### APIドキュメント
- OpenAPI仕様: `http://localhost:8000/api-docs.yaml`
- Swagger UI: `http://localhost:8000/api/documentation` (L5-Swagger)

### パフォーマンス最適化

#### 完了済み最適化
- **gzip圧縮**: API応答の85-88%データ削減（CompressResponseミドルウェア）
- **Redis キャッシュ**: API応答の5分間キャッシング（300秒TTL）
- **React.memo**: 重いコンポーネントのメモ化
- **動的インポート**: コンポーネントレベルでのコード分割
- **仮想スクロール**: 大量データのスムーズ表示
- **fetch移行**: axios→fetchでバンドルサイズ削減
- **Next.js最適化**: 画像、バンドル、キャッシュヘッダー最適化
- **PWA対応**: ServiceWorker、オフラインキャッシュ、マニフェスト

#### キー実装ファイル
- **圧縮ミドルウェア**: `backend/app/Http/Middleware/CompressResponse.php`
- **キャッシュ設定**: `backend/config/cache.php` (redis driver)
- **PWAマニフェスト**: `frontend/src/app/manifest.json`
- **ServiceWorker**: `frontend/public/sw.js`
- **Next.js設定**: `frontend/next.config.js`

### コーディング規約

#### インポートパターン
- **フロントエンド**: ES Modulesとtype-onlyインポート（該当時）
- **バックエンド**: PSR-4オートロードと絶対名前空間

#### 命名規則
- **コンポーネント/クラス**: PascalCase
- **変数/関数**: camelCase
- **データベース**: snake_case
- **環境変数**: SCREAMING_SNAKE_CASE

#### エラーハンドリング
- **フロントエンド**: Fetch APIコールをtry-catchで囲み、ユーザーフレンドリーなエラーメッセージ
- **バックエンド**: Laravel例外、422でバリデーションエラー、適切なHTTPステータスコード
- **ログ記録**: 機密データ（パスワード、トークン、個人情報）は絶対にログしない

### テストアプローチ

#### フロントエンドテスト
```bash
cd frontend
npm run lint        # Lintが通ること
npm run typecheck   # 型チェックが通ること
npm run build       # ビルドが成功すること
```

#### バックエンドテスト
```bash
# Docker内で実行（必須）
docker compose exec backend composer run pint   # コード整形
docker compose exec backend composer run test   # 全テストが通ること

# 注意: テストはDocker内のMySQLを使用するため、必ずdocker compose execで実行する
# ローカルでの実行はデータベース接続エラーになります
```

### 既知の問題とドキュメント

- セキュリティリスク: `docs/risk/security_and_maintainability_risks.md`
- パフォーマンス懸念: `docs/risk/performance_issues.md`
- API仕様: `docs/system/api/`
- UXガイドライン: `docs/system/ux/ux_guidelines.md`

### 開発ワークフロー

1. **変更前**: lint/typecheckを実行してクリーンな基準を確保
2. **開発中**: 適切な開発サーバー使用（フロントエンド/バックエンド）
3. **変更後**: 全検証コマンド実行（lint、typecheck、tests）
4. **コミット前**: コードに機密データがないこと、全テストが通ることを確認

### 重要ファイルリファレンス

- **APIクライアント**: `frontend/src/lib/api/users.ts`
- **ルート定義**: `backend/routes/api.php`
- **コントローラー**: `backend/app/Http/Controllers/`
- **ユーザーモデル**: `backend/app/Models/User.php`
- **マイグレーション**: `backend/database/migrations/`
- **テストデータ**: `backend/storage/app/public/error_csv_*.csv`