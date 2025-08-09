<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CacheManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
    }

    /**
     * タグ付きキャッシュが正しく保存されることをテスト
     */
    public function test_pagination_cache_with_tags(): void
    {
        // テストデータを作成
        User::factory()->count(5)->create();

        // 最初のリクエスト（キャッシュなし）
        $response = $this->getJson('/api/pagination?per_page=2');
        $response->assertStatus(200);

        // キャッシュキーが存在することを確認
        $cacheKey = 'pagination:'.md5(serialize(['per_page' => '2']));
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNotNull($cachedData);
    }

    /**
     * ユーザー作成時にキャッシュがクリアされることをテスト
     */
    public function test_cache_cleared_on_user_create(): void
    {
        // テストデータとキャッシュを作成
        User::factory()->count(3)->create();

        // ページネーションAPIを呼び出してキャッシュを生成
        $this->getJson('/api/pagination');

        // キャッシュが存在することを確認
        $cacheKey = 'pagination:'.md5(serialize([]));
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNotNull($cachedData);

        // 新しいユーザーを作成
        $response = $this->postJson('/api/users', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'phone_number' => '090-1234-5678',
            'membership_status' => 'active',
        ]);
        $response->assertStatus(201);

        // キャッシュがクリアされていることを確認
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNull($cachedData);
    }

    /**
     * ユーザー更新時にキャッシュがクリアされることをテスト
     */
    public function test_cache_cleared_on_user_update(): void
    {
        // テストユーザーを作成
        $user = User::factory()->create();

        // ページネーションAPIを呼び出してキャッシュを生成
        $this->getJson('/api/pagination');

        // キャッシュが存在することを確認
        $cacheKey = 'pagination:'.md5(serialize([]));
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNotNull($cachedData);

        // ユーザーを更新
        $response = $this->putJson("/api/users/{$user->id}", [
            'name' => 'Updated Name',
            'email' => $user->email,
        ]);
        $response->assertStatus(200);

        // キャッシュがクリアされていることを確認
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNull($cachedData);
    }

    /**
     * ユーザー削除時にキャッシュがクリアされることをテスト
     */
    public function test_cache_cleared_on_user_delete(): void
    {
        // テストユーザーを作成
        $user = User::factory()->create();

        // ページネーションAPIを呼び出してキャッシュを生成
        $this->getJson('/api/pagination');

        // キャッシュが存在することを確認
        $cacheKey = 'pagination:'.md5(serialize([]));
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNotNull($cachedData);

        // ユーザーを削除
        $response = $this->deleteJson("/api/users/{$user->id}");
        $response->assertStatus(200);

        // キャッシュがクリアされていることを確認
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNull($cachedData);
    }

    /**
     * バルク削除時にキャッシュがクリアされることをテスト
     */
    public function test_cache_cleared_on_bulk_delete(): void
    {
        // テストユーザーを作成
        $users = User::factory()->count(3)->create();

        // ページネーションAPIを呼び出してキャッシュを生成
        $this->getJson('/api/pagination');

        // キャッシュが存在することを確認
        $cacheKey = 'pagination:'.md5(serialize([]));
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNotNull($cachedData);

        // バルク削除
        $response = $this->postJson('/api/users/bulk-delete', [
            'user_ids' => $users->pluck('id')->toArray(),
        ]);
        $response->assertStatus(200);

        // キャッシュがクリアされていることを確認
        $cachedData = Cache::tags(['users', 'pagination'])->get($cacheKey);
        $this->assertNull($cachedData);
    }

    /**
     * ステータスカウントのキャッシュが正しく動作することをテスト
     */
    public function test_status_counts_cache_with_tags(): void
    {
        // テストデータを作成
        User::factory()->count(3)->create(['membership_status' => 'active']);
        User::factory()->count(2)->create(['membership_status' => 'inactive']);

        // ステータスカウントAPIを呼び出し
        $response = $this->getJson('/api/users/status-counts');
        $response->assertStatus(200);

        // キャッシュが存在することを確認
        $cacheKey = 'status_counts:'.md5(serialize([]));
        $cachedData = Cache::tags(['users', 'status_counts'])->get($cacheKey);
        $this->assertNotNull($cachedData);
        $this->assertEquals(3, $cachedData['active']);
        $this->assertEquals(2, $cachedData['inactive']);

        // 新しいユーザーを作成
        $this->postJson('/api/users', [
            'name' => 'New Active User',
            'email' => 'active@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'phone_number' => '090-1111-2222',
            'membership_status' => 'active',
        ]);

        // キャッシュがクリアされていることを確認
        $cachedData = Cache::tags(['users', 'status_counts'])->get($cacheKey);
        $this->assertNull($cachedData);
    }
}
