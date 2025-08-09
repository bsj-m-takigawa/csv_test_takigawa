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

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
    }

    /**
     * 新規ユーザー作成時にパスワードが正しく設定されることをテスト
     */
    public function test_new_user_password_is_set_from_csv(): void
    {
        $csvContent = "名前,メールアドレス,パスワード\n田中太郎,tanaka@example.com,mypassword123";
        $file = UploadedFile::fake()->createWithContent('users.csv', $csvContent);

        $response = $this->postJson('/api/users/import', [
            'csv_file' => $file,
            'import_strategy' => 'update',
        ]);

        $response->assertStatus(200);

        $user = User::where('email', 'tanaka@example.com')->first();
        $this->assertNotNull($user);
        // パスワードがmypassword123で設定されていることを確認
        $this->assertTrue(Hash::check('mypassword123', $user->password), 'Password should be set from CSV');
    }

    /**
     * 新規ユーザー作成時にパスワードが未指定の場合、デフォルトパスワードが設定されることをテスト
     */
    public function test_new_user_gets_default_password_when_not_specified(): void
    {
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
        // 既存ユーザーを作成
        $existingUser = User::factory()->create([
            'email' => 'existing3@example.com',
            'password' => Hash::make('original_password'),
        ]);

        // 新しいパスワードを含むCSV
        $csvContent = "名前,メールアドレス,パスワード\n既存ユーザー3,existing3@example.com,new_password123";
        $file = UploadedFile::fake()->createWithContent('users.csv', $csvContent);

        $response = $this->postJson('/api/users/import', [
            'csv_file' => $file,
            'import_strategy' => 'update',
        ]);

        $response->assertStatus(200);

        $user = User::find($existingUser->id);
        // パスワードが更新されていることを確認
        $this->assertTrue(Hash::check('new_password123', $user->password), 'Password should be updated from CSV');
        $this->assertFalse(Hash::check('original_password', $user->password), 'Old password should not work');
    }

    /**
     * 複数ユーザーの混在したCSVで正しく処理されることをテスト
     */
    public function test_mixed_users_password_handling(): void
    {
        // 既存ユーザーを作成
        $existingUser = User::factory()->create([
            'email' => 'existing@test.com',
            'password' => Hash::make('keep_this_password'),
        ]);

        // 新規と既存が混在したCSV
        $csvContent = "名前,メールアドレス,パスワード\n";
        $csvContent .= "新規ユーザー,new@test.com,new_user_pass\n";
        $csvContent .= "既存ユーザー,existing@test.com,\n"; // パスワード空
        $csvContent .= "新規ユーザー2,new2@test.com,\n"; // 新規でパスワード空

        $file = UploadedFile::fake()->createWithContent('users.csv', $csvContent);

        $response = $this->postJson('/api/users/import', [
            'csv_file' => $file,
            'import_strategy' => 'update',
        ]);

        $response->assertStatus(200);

        // 新規ユーザー（パスワード指定あり）
        $newUser1 = User::where('email', 'new@test.com')->first();
        $this->assertNotNull($newUser1);
        $this->assertTrue(Hash::check('new_user_pass', $newUser1->password), 'New user password should be set from CSV');

        // 既存ユーザー（パスワード変更なし）
        $existingUserReloaded = User::find($existingUser->id);
        $this->assertTrue(Hash::check('keep_this_password', $existingUserReloaded->password));

        // 新規ユーザー（パスワード未指定）
        $newUser2 = User::where('email', 'new2@test.com')->first();
        $this->assertNotNull($newUser2->password);
        $this->assertNotEquals('', $newUser2->password);
    }
}
