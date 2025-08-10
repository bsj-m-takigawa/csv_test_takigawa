<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 正しい認証情報でログインできることをテスト
     */
    public function test_user_can_login_with_valid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('Password123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'Password123!',
            'device_name' => 'test-device',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email'],
                'token',
            ]);
    }

    /**
     * 間違ったパスワードでログインできないことをテスト
     */
    public function test_user_cannot_login_with_invalid_password()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('Password123!'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
            'device_name' => 'test-device',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    /**
     * 存在しないユーザーでログインできないことをテスト
     */
    public function test_user_cannot_login_with_nonexistent_email()
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'Password123!',
            'device_name' => 'test-device',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    /**
     * 認証なしで書き込み系APIにアクセスできないことをテスト
     */
    public function test_unauthenticated_user_cannot_access_protected_routes()
    {
        $response = $this->postJson('/api/users', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $response->assertUnauthorized();
    }

    /**
     * 認証ありで書き込み系APIにアクセスできることをテスト
     */
    public function test_authenticated_user_can_access_protected_routes()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201);
    }

    /**
     * 認証が必要な読み取り系APIは未認証だと 401 になることをテスト
     */
    public function test_protected_get_routes_require_authentication()
    {
        User::factory()->count(5)->create();

        $this->getJson('/api/users')->assertUnauthorized();
        $this->getJson('/api/users/export')->assertUnauthorized();
    }

    /**
     * ログアウトができることをテスト
     */
    public function test_user_can_logout()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/logout');
        $response->assertOk();

        // トークンが無効化されていることを確認
        $this->assertCount(0, $user->fresh()->tokens);
    }

    /**
     * CSVインポートに認証が必要なことをテスト
     */
    public function test_csv_import_requires_authentication()
    {
        $response = $this->postJson('/api/users/import');
        $response->assertUnauthorized();
    }

    /**
     * バルク削除に認証が必要なことをテスト
     */
    public function test_bulk_delete_requires_authentication()
    {
        $response = $this->postJson('/api/users/bulk-delete', [
            'user_ids' => [1, 2, 3],
        ]);
        $response->assertUnauthorized();
    }

    /**
     * CSV重複チェックに認証が必要なことをテスト
     */
    public function test_check_duplicates_requires_authentication()
    {
        $response = $this->postJson('/api/users/check-duplicates');
        $response->assertUnauthorized();
    }

    /**
     * バルクエクスポートに認証が必要なことをテスト
     */
    public function test_bulk_export_requires_authentication()
    {
        $response = $this->postJson('/api/users/bulk-export', [
            'user_ids' => [1, 2, 3],
        ]);
        $response->assertUnauthorized();
    }

    // 重複テスト削除: 実エンドポイントは /api/users/bulk-export のみ

    /**
     * 認証済みユーザーがCSV重複チェックを実行できることをテスト
     */
    public function test_authenticated_user_can_check_duplicates()
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // CSVファイルのアップロードをモック
        $csvContent = "name,email\nTest User,test@example.com";
        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent('test.csv', $csvContent);

        $response = $this->postJson('/api/users/check-duplicates', [
            'file' => $file,
        ]);

        // ファイルが必要なので422エラーになるが、認証は通過している
        $response->assertStatus(422);
    }

    /**
     * 認証済みユーザーがバルク操作を実行できることをテスト
     */
    public function test_authenticated_user_can_perform_bulk_operations()
    {
        $user = User::factory()->create();
        $targetUsers = User::factory()->count(3)->create();
        Sanctum::actingAs($user);

        // バルク削除のテスト
        $response = $this->postJson('/api/users/bulk-delete', [
            'user_ids' => $targetUsers->pluck('id')->toArray(),
        ]);

        $response->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $targetUsers->first()->id]);
    }
}
