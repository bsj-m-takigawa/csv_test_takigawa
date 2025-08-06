# Issue #27: テスト実行時のデータ消失問題

## 優先度: 🟡 High

## 概要
PHPUnitテストの`RefreshDatabase`トレイトが本番データベースのデータを削除してしまい、1000件のユーザーデータが消失した。

## 問題の詳細
- `RefreshDatabase`トレイトが各テスト実行前にデータベースをリセット
- 本番用とテスト用のデータベースが分離されていない
- テスト後にデータの復元ができない
- シーダー実行がタイムアウトして部分的にしか復元されない

## 影響を受ける機能
- 本番データの安全性
- 開発環境のデータ一貫性
- テストの独立性

## 解決策

### 短期的解決策: DatabaseTransactionsトレイトの使用
```php
// テストクラスで
use DatabaseTransactions; // RefreshDatabaseの代わりに

class UserApiTest extends TestCase
{
    use DatabaseTransactions; // 各テストをトランザクション内で実行
}
```

### 中期的解決策: テスト用データベースの分離
```yaml
# docker-compose.yml
services:
  db:
    environment:
      MYSQL_DATABASE: laravel
      
  db_test:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: laravel_test
      MYSQL_USER: user
      MYSQL_PASSWORD: password
```

```php
// .env.testing
DB_CONNECTION=mysql
DB_HOST=db_test
DB_PORT=3306
DB_DATABASE=laravel_test
DB_USERNAME=user
DB_PASSWORD=password
```

### 長期的解決策: データベースバックアップの自動化
```bash
#!/bin/bash
# scripts/backup-before-test.sh

# テスト前にバックアップ
docker compose exec db mysqldump -u root -ppassword laravel > backup_$(date +%Y%m%d_%H%M%S).sql

# テスト実行
docker compose exec backend composer run test

# 必要に応じて復元
# docker compose exec -T db mysql -u root -ppassword laravel < backup_latest.sql
```

### データ復元用シーダーの最適化
```php
// database/seeders/UserSeeder.php
public function run()
{
    // バッチ処理で高速化
    $users = [];
    for ($i = 0; $i < 1000; $i++) {
        $users[] = [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => Hash::make('password'),
            'created_at' => now(),
            'updated_at' => now(),
        ];
        
        // 100件ごとに挿入
        if (count($users) >= 100) {
            User::insert($users);
            $users = [];
        }
    }
    
    // 残りを挿入
    if (!empty($users)) {
        User::insert($users);
    }
}
```

## 予防策
1. **環境変数チェック**
```php
// TestCase.php
protected function setUp(): void
{
    parent::setUp();
    
    if (app()->environment() === 'production') {
        $this->fail('テストを本番環境で実行することはできません');
    }
}
```

2. **データベース名の確認**
```php
if (!str_contains(config('database.connections.mysql.database'), 'test')) {
    $this->fail('テスト用データベースを使用してください');
}
```

## 期待される効果
- 本番データの保護
- テストの安全な実行
- データ復元時間の短縮
- 開発効率の向上

## 実装工数
- 短期的解決: 1時間
- 中期的解決: 3時間
- 長期的解決: 5時間

## 受け入れ基準
- [ ] テスト用データベースの分離
- [ ] DatabaseTransactionsトレイトへの移行
- [ ] バックアップスクリプトの作成
- [ ] シーダーの最適化（1000件を30秒以内）
- [ ] 環境チェックの実装
- [ ] ドキュメントの更新