<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CsvImportPasswordTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 新規ユーザー作成時にパスワードが正しく設定されることをテスト
     */
    public function test_new_user_password_is_set_from_csv(): void
    {
        $this->markTestSkipped('CSVインポートではパスワード列をサポートしていません（セキュリティ上の理由）');
    }

    /**
     * 新規ユーザー作成時にパスワードが未指定の場合、デフォルトパスワードが設定されることをテスト
     */
    public function test_new_user_gets_default_password_when_not_specified(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
        $csvContent = "名前,メールアドレス\n鈴木花子,suzuki@example.com";
        $file = UploadedFile::fake()->createWithContent('users.csv', $csvContent);

        $response = $this->postJson('/api/users/import', [
            'csv_file' => $file,
            'import_strategy' => 'update',
        ]);

        $response->assertStatus(200);

        $user = User::where('email', 'suzuki@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->password);
        // デフォルトパスワードはランダムなので、ハッシュが存在することだけ確認
        $this->assertNotEquals('', $user->password);
    }

    /**
     * 既存ユーザー更新時にパスワードが指定されていない場合、変更されないことをテスト
     */
    public function test_existing_user_password_not_changed_when_not_specified(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
        // 既存ユーザーを作成
        $existingUser = User::factory()->create([
            'email' => 'existing@example.com',
            'password' => Hash::make('original_password'),
        ]);
        $originalPassword = $existingUser->password;

        // パスワード列なしのCSV
        $csvContent = "名前,メールアドレス,電話番号\n既存ユーザー,existing@example.com,090-1234-5678";
        $file = UploadedFile::fake()->createWithContent('users.csv', $csvContent);

        $response = $this->postJson('/api/users/import', [
            'csv_file' => $file,
            'import_strategy' => 'update',
        ]);

        $response->assertStatus(200);

        $user = User::find($existingUser->id);
        $this->assertEquals($originalPassword, $user->password);
        $this->assertTrue(Hash::check('original_password', $user->password));
    }

    /**
     * 既存ユーザー更新時にパスワードが空文字の場合、変更されないことをテスト
     */
    public function test_existing_user_password_not_changed_when_empty(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
        // 既存ユーザーを作成
        $existingUser = User::factory()->create([
            'email' => 'existing2@example.com',
            'password' => Hash::make('original_password'),
        ]);
        $originalPassword = $existingUser->password;

        // パスワード列が空のCSV
        $csvContent = "名前,メールアドレス,パスワード\n既存ユーザー2,existing2@example.com,";
        $file = UploadedFile::fake()->createWithContent('users.csv', $csvContent);

        $response = $this->postJson('/api/users/import', [
            'csv_file' => $file,
            'import_strategy' => 'update',
        ]);

        $response->assertStatus(200);

        $user = User::find($existingUser->id);
        $this->assertEquals($originalPassword, $user->password);
        $this->assertTrue(Hash::check('original_password', $user->password));
    }

    /**
     * 既存ユーザー更新時に新しいパスワードが指定された場合、更新されることをテスト
     */
    public function test_existing_user_password_updated_when_specified(): void
    {
        $this->markTestSkipped('CSVインポートではパスワード列をサポートしていません（セキュリティ上の理由）');
    }

    /**
     * 複数ユーザーの混在したCSVで正しく処理されることをテスト
     */
    public function test_mixed_users_password_handling(): void
    {
        $this->markTestSkipped('CSVインポートではパスワード列をサポートしていません（セキュリティ上の理由）');
    }
}
