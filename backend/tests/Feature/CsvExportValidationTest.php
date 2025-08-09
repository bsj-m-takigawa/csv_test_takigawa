<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CsvExportValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
    }

    /**
     * 不正なstatusパラメータが拒否されることをテスト
     */
    public function test_export_rejects_invalid_status_parameter(): void
    {
        // 不正なstatusパラメータ
        $response = $this->get('/api/users/export?status=invalid_status');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['status']);
    }

    /**
     * 有効なstatusパラメータが受け入れられることをテスト
     */
    public function test_export_accepts_valid_status_parameters(): void
    {
        // テストユーザーを作成
        User::factory()->create(['membership_status' => 'active']);
        User::factory()->create(['membership_status' => 'pending']);
        User::factory()->create(['membership_status' => 'inactive']);
        User::factory()->create(['membership_status' => 'expired']);

        $validStatuses = ['active', 'pending', 'inactive', 'expired'];

        foreach ($validStatuses as $status) {
            $response = $this->get("/api/users/export?status={$status}");

            $response->assertStatus(200);
            $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        }
    }

    /**
     * statusパラメータなしでも動作することをテスト
     */
    public function test_export_works_without_status_parameter(): void
    {
        // テストユーザーを作成
        User::factory()->count(5)->create();

        $response = $this->get('/api/users/export');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    /**
     * CSVヘッダーが正しく設定されることをテスト
     */
    public function test_export_has_correct_csv_headers(): void
    {
        // テストユーザーを作成
        User::factory()->create();

        $response = $this->get('/api/users/export');

        $response->assertStatus(200);
        
        $content = $response->streamedContent();
        $lines = explode("\n", $content);
        
        // BOMを除去してヘッダー行を確認
        $firstLine = ltrim($lines[0], "\xEF\xBB\xBF");
        
        $expectedHeaders = [
            'ID', '名前', 'メールアドレス', '会員状態', '作成日', '更新日'
        ];
        
        $actualHeaders = str_getcsv($firstLine);
        $this->assertEquals($expectedHeaders, $actualHeaders);
    }

    /**
     * フィルタリングが正しく機能することをテスト
     */
    public function test_export_filters_by_status_correctly(): void
    {
        // 各ステータスのユーザーを作成
        User::factory()->count(3)->create(['membership_status' => 'active']);
        User::factory()->count(2)->create(['membership_status' => 'pending']);
        User::factory()->count(1)->create(['membership_status' => 'inactive']);

        $response = $this->get('/api/users/export?status=active');

        $response->assertStatus(200);
        
        $content = $response->streamedContent();
        $lines = array_filter(explode("\n", $content)); // 空行を除去
        
        // ヘッダー行 + active状態のユーザー3件 = 4行
        $this->assertCount(4, $lines);
    }
}