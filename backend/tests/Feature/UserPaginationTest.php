<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserPaginationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * デフォルトのページネーションをテスト
     */
    public function test_index_returns_paginated_users_with_default_per_page()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        // 20件のユーザーを作成
        User::factory(20)->create();

        $response = $this->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email'],
                ],
                'meta' => [
                    'current_page',
                    'per_page',
                    'total',
                    'last_page',
                    'from',
                    'to',
                ],
                'links',
            ])
            ->assertJsonPath('meta.per_page', 20) // デフォルトは20件
            ->assertJsonCount(20, 'data');
    }

    /**
     * カスタムper_pageパラメータのテスト
     */
    public function test_index_respects_custom_per_page_parameter()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory(30)->create();

        $response = $this->getJson('/api/users?per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonCount(10, 'data');
    }

    /**
     * per_pageの最大値制限のテスト
     */
    public function test_index_limits_per_page_to_maximum_100()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory(150)->create();

        // per_page=200はバリデーションエラーとなる
        $response = $this->getJson('/api/users?per_page=200');
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);

        // per_page=100は正常に動作
        $response = $this->getJson('/api/users?per_page=100');
        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 100)
            ->assertJsonCount(100, 'data');
    }

    /**
     * per_pageの最小値制限のテスト
     */
    public function test_index_limits_per_page_to_minimum_1()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory(5)->create();

        // per_page=0はバリデーションエラーとなる
        $response = $this->getJson('/api/users?per_page=0');
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);

        // per_page=1は正常に動作
        $response = $this->getJson('/api/users?per_page=1');
        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonCount(1, 'data');
    }

    /**
     * ページネーションのページ移動テスト
     */
    public function test_index_supports_page_navigation()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        $users = User::factory(25)->create();

        // 2ページ目を取得（per_page=10）
        $response = $this->getJson('/api/users?page=2&per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonCount(10, 'data');

        // 3ページ目を取得（残り6件：認証ユーザー含む）
        $response = $this->getJson('/api/users?page=3&per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonCount(6, 'data');
    }

    /**
     * 大量データでのメモリ効率テスト
     * 注：実際のテスト環境では時間がかかるため、小規模でテスト
     */
    public function test_index_handles_large_dataset_efficiently()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        // 1000件のユーザーを作成（本番環境では100万件を想定）
        User::factory(1000)->create();

        $startMemory = memory_get_usage();

        $response = $this->getJson('/api/users?per_page=50');

        $endMemory = memory_get_usage();
        $memoryUsed = ($endMemory - $startMemory) / 1024 / 1024; // MB単位

        $response->assertStatus(200);

        // メモリ使用量が適切な範囲内であることを確認
        // ページネーションにより、全データを読み込まないため、メモリ使用量は少ない
        $this->assertLessThan(50, $memoryUsed, 'Memory usage should be less than 50MB for paginated results');
    }
}
