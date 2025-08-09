<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaginationControllerTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): void
    {
        Sanctum::actingAs(User::factory()->create());
    }

    /**
     * PaginationControllerのデフォルトページネーションテスト
     * GET /api/usersエンドポイントの実際の動作を確認
     */
    public function test_users_endpoint_requires_authentication(): void
    {
        $response = $this->getJson('/api/users');
        $response->assertUnauthorized();
    }

    public function test_pagination_controller_returns_paginated_users_with_default_per_page()
    {
        $this->authenticate();
        // 25件のユーザーを作成
        User::factory(25)->create();

        $response = $this->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'email']
                ],
                'meta' => [
                    'current_page',
                    'per_page',
                    'total',
                    'last_page',
                ],
            ])
            ->assertJsonPath('meta.per_page', 20) // PaginationControllerのデフォルトは20件
            ->assertJsonCount(20, 'data');
    }

    /**
     * カスタムper_pageパラメータのテスト
     */
    public function test_pagination_controller_respects_custom_per_page_parameter()
    {
        $this->authenticate();
        User::factory(30)->create();

        $response = $this->getJson('/api/users?per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonCount(10, 'data');
    }

    /**
     * per_pageの最大値制限のテスト（100まで）
     */
    public function test_pagination_controller_limits_per_page_to_maximum_100()
    {
        $this->authenticate();
        // バリデーションエラーが発生することを確認
        $response = $this->getJson('/api/users?per_page=200');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);
    }

    /**
     * per_pageの最小値制限のテスト（1以上）
     */
    public function test_pagination_controller_limits_per_page_to_minimum_1()
    {
        $this->authenticate();
        // バリデーションエラーが発生することを確認
        $response = $this->getJson('/api/users?per_page=0');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['per_page']);
    }

    /**
     * ページネーションのページ移動テスト
     */
    public function test_pagination_controller_supports_page_navigation()
    {
        $this->authenticate();
        User::factory(25)->create();

        // 2ページ目を取得（per_page=10）
        $response = $this->getJson('/api/users?page=2&per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonCount(10, 'data');

        // 3ページ目を取得（残り5件）
        $response = $this->getJson('/api/users?page=3&per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonCount(5, 'data');
    }

    /**
     * 検索機能のテスト
     */
    public function test_pagination_controller_search_functionality()
    {
        $this->authenticate();
        User::factory()->create(['name' => 'John Doe']);
        User::factory()->create(['name' => 'Jane Smith']);
        User::factory(5)->create();

        $response = $this->getJson('/api/users?q=John');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'John Doe');
    }

    /**
     * ステータスフィルタのテスト
     */
    public function test_pagination_controller_status_filter()
    {
        $this->authenticate();
        User::factory(3)->create(['membership_status' => 'active']);
        User::factory(2)->create(['membership_status' => 'inactive']);
        User::factory(1)->create(['membership_status' => 'pending']);

        $response = $this->getJson('/api/users?status=active,pending');

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 4);
    }

    /**
     * ソート機能のテスト
     */
    public function test_pagination_controller_sorting()
    {
        $this->authenticate();
        $user1 = User::factory()->create(['name' => 'Alice']);
        $user2 = User::factory()->create(['name' => 'Bob']);
        $user3 = User::factory()->create(['name' => 'Charlie']);

        $response = $this->getJson('/api/users?sort=name&order=asc&per_page=10');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.name', 'Alice')
            ->assertJsonPath('data.1.name', 'Bob')
            ->assertJsonPath('data.2.name', 'Charlie');
    }

    /**
     * キャッシュ機能のテスト
     */
    public function test_pagination_controller_caching()
    {
        $this->authenticate();
        User::factory(5)->create();

        // 最初のリクエスト
        $response1 = $this->getJson('/api/users');
        $response1->assertStatus(200);

        // 新しいユーザーを追加
        User::factory()->create(['name' => 'New User']);

        // 同じリクエスト（キャッシュから取得）
        $response2 = $this->getJson('/api/users');
        $response2->assertStatus(200);

        // キャッシュされているため、新しいユーザーは含まれない
        $this->assertEquals(
            $response1->json('meta.total'),
            $response2->json('meta.total')
        );
    }
}