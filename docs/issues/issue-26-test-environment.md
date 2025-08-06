# Issue #26: テスト環境のデータベース接続問題 ✅ 修正完了

## 優先度: 🔴 Critical → ✅ 解決済み (2025-08-07)

## 概要
PHPUnitテストがDockerコンテナ外で実行されると、データベースに接続できずに全てのテストが失敗する。

## 問題の詳細
```
SQLSTATE[HY000] [2002] php_network_getaddresses: getaddrinfo for db failed: nodename nor servname provided, or not known
```
- ローカル環境からは`db`ホスト名が解決できない
- 13テスト中11テストがエラー
- `RefreshDatabase`トレイトがデータベース接続を必要とする

## 影響を受ける機能
- 全てのPHPUnitテスト
- CI/CDパイプライン
- ローカル開発環境

## 解決策

### 方法1: Docker内でテストを実行（推奨）
```bash
# 正しい実行方法
docker compose exec backend composer run test
```

### 方法2: テスト用の環境設定を作成
```php
// phpunit.xml
<php>
    <env name="APP_ENV" value="testing"/>
    <env name="DB_CONNECTION" value="sqlite"/>
    <env name="DB_DATABASE" value=":memory:"/>
</php>
```

### 方法3: テスト用データベースコンテナをホストから接続可能にする
```yaml
# docker-compose.yml
services:
  db:
    ports:
      - "3306:3306"  # ホストマシンからアクセス可能に
```

```bash
# .env.testing
DB_HOST=127.0.0.1
DB_PORT=3306
```

### 方法4: GitHub Actions用の設定
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: test_db
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v2
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.1'
      - name: Install dependencies
        run: composer install
      - name: Run tests
        env:
          DB_HOST: 127.0.0.1
          DB_DATABASE: test_db
        run: vendor/bin/phpunit
```

## 期待される効果
- テスト実行の安定性向上
- CI/CDの信頼性向上
- 開発効率の改善

## 実装工数
- 見積もり: 2時間
- テスト: 30分

## 受け入れ基準
- [x] Docker内でテストが正常に実行される
- [x] テスト実行手順がCLAUDE.mdに記載される
- [ ] CI/CD設定ファイルの作成（今後の課題）
- [x] 全13テストが成功する
- [x] `RefreshDatabase`使用時もデータが保持される

## 実装内容

### 修正されたファイル
1. **phpunit.xml** - SQLite設定を無効化（MySQLを使用）
2. **add_indexes_to_users_table.php** - フルテキストインデックスをMySQL専用に条件分岐
3. **.env.testing** - テスト環境用設定ファイル作成（SQLite用）

### マイグレーション修正
```php
// フルテキストインデックス（MySQL専用）
if (config('database.default') === 'mysql') {
    Schema::table('users', function (Blueprint $table) {
        $table->fulltext(['name', 'email'], 'fulltext_users_name_email');
    });
}
```

### ドキュメント更新
- **CLAUDE.md**: Docker内でのテスト実行コマンドを明記
- **README.md**: テスト実行方法のセクションを追加

### テスト結果
```
PHPUnit 10.5.45 by Sebastian Bergmann and contributors.
Runtime: PHP 8.1.33
Configuration: /var/www/html/phpunit.xml

.............                     13 / 13 (100%)
Time: 00:00.971, Memory: 44.50 MB
OK (13 tests, 55 assertions)
```

### 解決されたエラー
- フルテキストインデックスのSQLite非対応エラーを解決
- Docker内での安定したテスト実行を確立
- 全13テストが成功することを確認