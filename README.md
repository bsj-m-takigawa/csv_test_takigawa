# インターン課題 - ユーザー管理アプリケーション

このリポジトリは、インターン生向けの課題として作成されたユーザー管理アプリケーションです。このアプリケーションには意図的に様々な問題が含まれており、それらを特定し修正することが課題となります。実際の環境では100万件のユーザーデータを扱いますが、テスト環境では1,000件のデータでテストできるようになっています。

## 技術スタック

- **フロントエンド**: Next.js 15, TypeScript, Tailwind CSS 4, react-window
- **バックエンド**: Laravel 10, PHP 8.1, MySQL 8.0
- **インフラ**: Docker, Docker Compose

## パフォーマンス最適化済み

このプロジェクトには包括的なパフォーマンス最適化が適用されています：

### ✅ フロントエンド最適化
- **React.memo最適化**: UserTable, FilterPanel, SearchField コンポーネント
- **fetch API移行**: axios削除により13KBのバンドルサイズ削減  
- **動的インポート**: Code Splitting によるローディング性能向上
- **Virtual Scrolling**: 1000件以上のデータで自動有効化

### ✅ バックエンド最適化
- **API圧縮**: gzip圧縮により**85-88%**のデータ転送量削減
- **フルテキスト検索**: MySQL FULLTEXTインデックスで検索性能向上
- **サーバーサイドページネーション**: 大量データの効率的処理

### 📊 パフォーマンス結果
- **フロントエンド**: `/users/list` 8.49kB → 5.86kB (30%削減)
- **API圧縮**: 100件データ 43KB → 5.2KB (87.9%削減)
- **検索性能**: 1000件データ検索を36msで処理 (364%改善)
- **大容量対応**: Virtual Scrolling で1000件以上表示可能

詳細は [フロントエンドパフォーマンス最適化ガイド](./docs/system/frontend-performance-optimization.md) および [APIパフォーマンス最適化](./docs/issues/issue-25-api-compression.md) を参照してください。

## セットアップ手順

### 前提条件

- Docker と Docker Compose がインストールされていること
- Git がインストールされていること

### インストール

1. リポジトリをクローンします：

```bash
git clone https://github.com/bravesoft-inc/internship-challenge.git
cd internship-challenge
```

2. Docker コンテナを起動します：

```bash
docker-compose up -d
```

3. バックエンドのセットアップ：

```bash
# コンテナ内で実行
docker compose exec backend bash

# テスト環境用データベースの初期化（1,000件のデータを生成）
php artisan app:init-database-test

# 本番環境用データベースの初期化（100万件のデータを生成）
php artisan app:init-database-production
```

4. アプリケーションにアクセス：

- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000/api

## 課題内容

このアプリケーションには意図的に様々な問題が含まれています。これらの問題と修正課題の詳細については、リポジトリ内の `ISSUES.md` ファイルを参照してください。

## テスト実行方法

### バックエンドテスト

PHPUnitテストはDocker内で実行する必要があります：

```bash
# 全テストを実行
docker compose exec backend composer run test

# 特定のテストファイルを実行
docker compose exec backend ./vendor/bin/phpunit tests/Feature/PaginationTest.php

# 特定のテストメソッドを実行
docker compose exec backend ./vendor/bin/phpunit --filter test_default_pagination
```

**注意**: テストはDocker内のMySQLを使用するため、`docker compose exec`を使わずローカルで実行するとデータベース接続エラーになります。

### フロントエンドテスト

```bash
cd frontend
npm run lint        # ESLintチェック
npm run typecheck   # TypeScript型チェック
npm run build       # ビルドテスト
```

## テスト用データ

エラーを発生させるためのCSVファイルが用意されています：

- `/backend/storage/app/public/csv_samples/error_csv_1.csv`
- `/backend/storage/app/public/csv_samples/error_csv_2.csv`

## 注意事項

- コードは意図的に可読性が低く、保守性が悪い状態になっています
- 変数名や関数名が適切でない場合があります
- コメントが少ないまたは存在しない場合があります

これらの問題も含めて改善することが望ましいですが、必須ではありません。

## ヒント

- Laravel のドキュメントを参照してください
- Next.js のドキュメントを参照してください
- セキュリティの脆弱性については、OWASP Top 10 を参照してください
