<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SearchPerformanceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
    }

    /**
     * フルテキスト検索のパフォーマンステスト
     */
    public function test_fulltext_search_performance()
    {
        // テスト環境でのパフォーマンステスト
        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('MySQLでのみフルテキスト検索をテストします');
        }

        // テスト用データを確保（既存データを利用）
        $userCount = User::count();
        $this->assertGreaterThanOrEqual(1000, $userCount, '1000件以上のユーザーデータが必要です');

        // 検索キーワードを準備
        $searchTerms = ['User', 'test', '@example.com', '090'];

        foreach ($searchTerms as $term) {
            // 検索開始時間を記録
            $startTime = microtime(true);

            // フルテキスト検索を実行
            $response = $this->getJson("/api/pagination?q={$term}&per_page=20");

            // 実行時間を計算
            $executionTime = (microtime(true) - $startTime) * 1000; // ミリ秒

            $response->assertStatus(200);

            // パフォーマンス要件をチェック（1000件で100ms以内）
            $this->assertLessThan(100, $executionTime,
                "検索クエリ '{$term}' の実行時間が{$executionTime}msで要件（100ms）を超過しています");

            // 結果が存在することを確認
            $data = $response->json();
            $this->assertArrayHasKey('data', $data);
            $this->assertArrayHasKey('meta', $data);

            echo "\n[PERFORMANCE] 検索キーワード '{$term}': {$executionTime}ms ({$data['meta']['total']} 件中 {$data['meta']['per_page']} 件表示)\n";
        }
    }

    /**
     * ステータスカウント検索のパフォーマンステスト
     */
    public function test_status_counts_search_performance()
    {
        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('MySQLでのみフルテキスト検索をテストします');
        }

        $searchTerm = 'User';

        // 検索開始時間を記録
        $startTime = microtime(true);

        // ステータスカウント検索を実行
        $response = $this->getJson("/api/pagination/status-counts?q={$searchTerm}");

        // 実行時間を計算
        $executionTime = (microtime(true) - $startTime) * 1000; // ミリ秒

        $response->assertStatus(200);

        // パフォーマンス要件をチェック
        $this->assertLessThan(150, $executionTime,
            "ステータスカウント検索の実行時間が{$executionTime}msで要件（150ms）を超過しています");

        // 結果の構造を確認
        $data = $response->json();
        $this->assertArrayHasKey('active', $data);
        $this->assertArrayHasKey('inactive', $data);
        $this->assertArrayHasKey('pending', $data);
        $this->assertArrayHasKey('expired', $data);
        $this->assertArrayHasKey('total', $data);

        echo "\n[PERFORMANCE] ステータスカウント検索: {$executionTime}ms (total: {$data['total']} 件)\n";
    }

    /**
     * 検索結果の正確性をテスト
     */
    public function test_search_accuracy()
    {
        // 特定のテストユーザーを作成
        $testUser = User::create([
            'name' => 'John テスト Smith',
            'email' => 'john.test@example.com',
            'email_verified_at' => now(),
            'password' => bcrypt('password'),
            'phone_number' => '090-1234-5678',
            'address' => 'Test Address',
            'birth_date' => '1990-01-01',
            'gender' => 'male',
            'membership_status' => 'active',
            'points' => 100,
        ]);

        // 名前での検索
        $response = $this->getJson('/api/users?q=John&per_page=50');
        $response->assertStatus(200);
        $users = collect($response->json('data'));
        $this->assertTrue($users->pluck('id')->contains($testUser->id),
            '名前での検索結果にテストユーザーが含まれていません');

        // メールでの検索
        $response = $this->getJson('/api/users?q=john.test&per_page=50');
        $response->assertStatus(200);
        $users = collect($response->json('data'));
        $this->assertTrue($users->pluck('id')->contains($testUser->id),
            'メールでの検索結果にテストユーザーが含まれていません');

        // 電話番号での検索
        $response = $this->getJson('/api/users?q=090-1234&per_page=50');
        $response->assertStatus(200);
        $users = collect($response->json('data'));
        $this->assertTrue($users->pluck('id')->contains($testUser->id),
            '電話番号での検索結果にテストユーザーが含まれていません');
    }

    /**
     * 検索インデックスの存在を確認
     */
    public function test_search_index_exists()
    {
        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('MySQLでのみインデックス存在確認をテストします');
        }

        // フルテキストインデックスの存在を確認
        $indexes = DB::select("SHOW INDEX FROM users WHERE Key_name = 'search_index'");
        $this->assertNotEmpty($indexes, 'フルテキストインデックス search_index が存在しません');

        // インデックスがFULLTEXTタイプかチェック
        $fulltextIndex = collect($indexes)->where('Index_type', 'FULLTEXT')->first();
        $this->assertNotNull($fulltextIndex, 'search_index がフルテキストインデックスではありません');

        echo "\n[INDEX] フルテキストインデックス 'search_index' が正常に作成されています\n";
    }
}
