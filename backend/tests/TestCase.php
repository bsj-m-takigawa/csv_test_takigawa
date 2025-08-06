<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use RefreshDatabase;

    /**
     * テスト実行前の安全性チェック
     */
    protected function setUp(): void
    {
        parent::setUp();

        // 本番環境でのテスト実行を禁止
        if (app()->environment() === 'production') {
            $this->fail('テストを本番環境で実行することはできません。APP_ENV=testingに設定してください。');
        }

        // データベース名の安全性チェック
        $databaseName = config('database.connections.'.config('database.default').'.database');

        // 本番らしいデータベース名でのテスト実行を警告
        if ($databaseName && ! $this->isSafeDatabaseName($databaseName)) {
            $this->markTestSkipped(
                "安全でないデータベース名 '{$databaseName}' でのテスト実行をスキップしました。".
                "テスト用データベース名には 'test' を含めることを推奨します。"
            );
        }
    }

    /**
     * データベース名が安全かどうかチェック
     */
    private function isSafeDatabaseName(string $databaseName): bool
    {
        // インメモリSQLiteは安全
        if ($databaseName === ':memory:') {
            return true;
        }

        // 'test'が含まれるデータベース名は比較的安全
        if (str_contains(strtolower($databaseName), 'test')) {
            return true;
        }

        // 'laravel'のみは開発環境として許可（本番でないことを前提）
        if ($databaseName === 'laravel' && ! app()->environment('production')) {
            return true;
        }

        return false;
    }

    /**
     * テスト用のユーザーデータを作成
     */
    protected function seedTestUsers(int $count = 10): void
    {
        // TestSeederを使用してテスト用データを作成
        $this->artisan('db:seed', ['--class' => 'Database\\Seeders\\TestSeeder']);
    }

    /**
     * 指定されたテーブルのレコード数を取得
     */
    protected function getTableCount(string $table): int
    {
        return DB::table($table)->count();
    }

    /**
     * データベースの状態を確認（デバッグ用）
     */
    protected function debugDatabaseState(string $context = ''): void
    {
        $userCount = $this->getTableCount('users');
        echo "\n[DEBUG] {$context}: users table has {$userCount} records\n";
    }
}
