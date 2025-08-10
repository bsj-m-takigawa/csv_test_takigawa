<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaginationControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * PaginationControllerのデフォルトページネーションテスト
     * GET /api/usersエンドポイントの実際の動作を確認
     */
    public function test_pagination_controller_returns_paginated_users_with_default_per_page()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        // 25件のユーザーを作成
        User::factory(25)->create();

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
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

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
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

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
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

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
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory(25)->create();

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
     * 検索機能のテスト
     */
    public function test_pagination_controller_search_functionality()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory()->create(['name' => 'John Doe']);
        User::factory()->create(['name' => 'Jane Smith']);
        User::factory(5)->create();

        $response = $this->getJson('/api/users?q=John');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'John Doe');
    }

    /**
     * LIKE検索でワイルドカード文字がエスケープされることをテスト
     */
    public function test_pagination_controller_escapes_like_wildcards()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory(3)->create();

        $response = $this->getJson('/api/users?q=%');
        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');

        $response = $this->getJson('/api/users?q=_');
        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /**
     * ステータスフィルタのテスト
     */
    public function test_pagination_controller_status_filter()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

        User::factory(3)->create(['membership_status' => 'active']);
        User::factory(2)->create(['membership_status' => 'inactive']);
        User::factory(1)->create(['membership_status' => 'pending']);

        $response = $this->getJson('/api/users?status=active,pending');

        $response->assertStatus(200);
        // 認証ユーザーのステータスによってカウントが変わるので、最低4以上
        $total = $response->json('meta.total');
        $this->assertGreaterThanOrEqual(4, $total);
    }

    /**
     * ソート機能のテスト
     */
    public function test_pagination_controller_sorting()
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

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
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);

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
