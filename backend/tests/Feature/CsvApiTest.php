<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CsvApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_import_csv(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
        Storage::fake('local');

        $header = 'ID,名前,メールアドレス,電話番号,住所,生年月日,性別,会員状態,メモ,プロフィール画像,ポイント';
        $row1 = '1,Test User,test@example.com,1234567890,Test Address,2000-01-01,male,active,Test note,http://example.com/avatar.jpg,100';
        $content = implode("\n", [$header, $row1]);

        $file = UploadedFile::fake()->createWithContent('test.csv', $content);

        $response = $this->postJson('/api/users/import', [
            'csv_file' => $file,
            'import_strategy' => 'create',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => '1件を新規作成']);
        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }

    public function test_can_export_csv(): void
    {
        $authUser = User::factory()->create();
        Sanctum::actingAs($authUser);
        
        $users = User::factory()->count(3)->create();

        $response = $this->get('/api/users/export');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('ID,名前,メールアドレス', $content);
        $this->assertStringContainsString($users->first()->email, $content);
    }
}
