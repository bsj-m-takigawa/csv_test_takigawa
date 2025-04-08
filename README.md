# インターン課題 - ユーザー管理アプリケーション

このリポジトリは、インターン生向けの課題として作成されたユーザー管理アプリケーションです。このアプリケーションには意図的に様々な問題が含まれており、それらを特定し修正することが課題となります。実際の環境では100万件のユーザーデータを扱いますが、テスト環境では1,000件のデータでテストできるようになっています。

## 技術スタック

- **フロントエンド**: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- **バックエンド**: Laravel 11, PHP 8.1, MySQL 8.0
- **インフラ**: Docker, Docker Compose

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
