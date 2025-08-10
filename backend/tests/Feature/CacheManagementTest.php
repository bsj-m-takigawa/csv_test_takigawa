<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CacheManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * タグ付きキャッシュが正しく保存されることをテスト
     */
    public function test_pagination_cache_with_tags(): void
    {
        // 認証ユーザーを作成
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
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
        // 認証ユーザーを作成
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
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
        // 認証ユーザーを作成
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
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
        // 認証ユーザーを作成
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
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
        // 認証ユーザーを作成
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
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
        // 認証ユーザーを作成
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
        // テストデータを作成
        User::factory()->count(3)->create(['membership_status' => 'active']);
        User::factory()->count(2)->create(['membership_status' => 'inactive']);

        // ステータスカウントAPIを呼び出し
        $response = $this->getJson('/api/users/status-counts');
        $response->assertStatus(200);
        
        // レスポンスフォーマットを確認
        $responseData = $response->json();
        $this->assertArrayHasKey('data', $responseData);
        $this->assertEquals(4, $responseData['data']['active']); // 3 + 1 auth user
        $this->assertEquals(2, $responseData['data']['inactive']);

        // キャッシュが存在することを確認
        $cacheKey = 'status_counts:'.md5(serialize([]));
        $cachedData = Cache::tags(['users', 'status_counts'])->get($cacheKey);
        $this->assertNotNull($cachedData);
        $this->assertEquals(4, $cachedData['active']); // 3 + 1 auth user
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

    public function test_cache_logging_and_metrics(): void
    {
        // 認証ユーザーを作成
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
        Log::spy();
        Cache::forget('metrics:cache_hit');
        Cache::forget('metrics:cache_miss');
        User::factory()->count(3)->create();

        $cacheKey = 'pagination:'.md5(serialize([]));

        $this->getJson('/api/pagination');

        Log::shouldHaveReceived('info')->withArgs(function ($message, $context) use ($cacheKey) {
            return $message === 'Cache miss'
                && $context['key'] === $cacheKey
                && $context['endpoint'] === 'api/pagination'
                && isset($context['query_time']);
        })->once();

        Log::spy();

        $this->getJson('/api/pagination');

        Log::shouldHaveReceived('info')->withArgs(function ($message, $context) use ($cacheKey) {
            return $message === 'Cache hit'
                && $context['key'] === $cacheKey
                && $context['endpoint'] === 'api/pagination'
                && isset($context['response_time']);
        })->once();

        $this->assertSame(1, Cache::get('metrics:cache_hit'));
        $this->assertSame(1, Cache::get('metrics:cache_miss'));
    }
}
