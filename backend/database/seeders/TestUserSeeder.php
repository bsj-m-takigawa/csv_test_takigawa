<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestUserSeeder extends Seeder
{
    /**
     * Run the database seeds for test environment (1,000 records).
     */
    public function run(): void
    {
        DB::table('users')->truncate();

        // テスト用の固定ユーザーを最初に作成
        $this->createTestUsers();

        $batchSize = 500; // 100から500に増加
        $totalUsers = 1000; // テスト用に1000件のまま
        $batches = ceil($totalUsers / $batchSize);

        $genders = ['male', 'female', 'other'];
        $statuses = ['active', 'inactive', 'pending', 'expired'];
        $hashedPassword = Hash::make('password'); // パスワードは一度だけハッシュ化
        $currentTime = now();

        $createdCount = 0;
        $startTime = microtime(true);

        DB::beginTransaction();

        try {
            for ($b = 0; $b < $batches; $b++) {
                $userData = [];
                $batchStartId = $b * $batchSize + 1;
                $batchEndId = min(($b + 1) * $batchSize, $totalUsers);
                $currentBatchSize = $batchEndId - $batchStartId + 1;

                for ($userId = $batchStartId; $userId <= $batchEndId; $userId++) {
                    $userData[] = [
                        'name' => 'User '.$userId,
                        'email' => 'user'.$userId.'@example.com',
                        'email_verified_at' => $currentTime,
                        'password' => $hashedPassword, // 事前計算したハッシュを使用
                        'phone_number' => '0'.rand(10, 99).'-'.rand(1000, 9999).'-'.rand(1000, 9999),
                        'address' => '東京都渋谷区代々木'.rand(1, 9).'-'.rand(1, 20).'-'.rand(1, 30),
                        'birth_date' => date('Y-m-d', strtotime('-'.rand(18, 80).' years')),
                        'gender' => $genders[array_rand($genders)],
                        'membership_status' => $statuses[array_rand($statuses)],
                        'notes' => $userId % 10 == 0 ? 'この会員は特別なメモがあります。改行を含む\nテキストです。' : null,
                        'profile_image' => $userId % 5 == 0 ? 'profile_'.$userId.'.jpg' : null,
                        'points' => rand(0, 10000),
                        'last_login_at' => $userId % 3 == 0 ? $currentTime->copy()->subDays(rand(1, 30)) : null,
                        'remember_token' => Str::random(10),
                        'created_at' => $currentTime,
                        'updated_at' => $currentTime,
                    ];
                }

                DB::table('users')->insert($userData);

                $createdCount += count($userData);
                $progressPercent = round(($createdCount / $totalUsers) * 100, 2);
                $elapsedTime = round(microtime(true) - $startTime, 2);

                $this->command->info("Created {$createdCount} of {$totalUsers} users ({$progressPercent}%) - Batch ".($b + 1)." of {$batches}");
                $this->command->info("Elapsed time: {$elapsedTime} seconds");
            }

            DB::commit();
            $totalTime = round(microtime(true) - $startTime, 2);
            $this->command->info("TestUserSeeder completed successfully in {$totalTime} seconds!");
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('TestUserSeeder failed: '.$e->getMessage());
            throw $e;
        }
    }

    /**
     * テスト用の固定ユーザーを作成
     */
    private function createTestUsers(): void
    {
        $hashedPassword = Hash::make('password');
        $currentTime = now();

        // 管理者ユーザー
        DB::table('users')->insert([
            'name' => 'テスト管理者',
            'email' => 'admin@example.com',
            'email_verified_at' => $currentTime,
            'password' => $hashedPassword,
            'phone_number' => '090-1234-5678',
            'address' => '東京都千代田区1-1-1',
            'birth_date' => '1990-01-01',
            'gender' => 'male',
            'membership_status' => 'active',
            'notes' => 'テスト用管理者アカウント',
            'profile_image' => null,
            'points' => 10000,
            'last_login_at' => $currentTime,
            'remember_token' => Str::random(10),
            'created_at' => $currentTime,
            'updated_at' => $currentTime,
        ]);

        // 一般ユーザー
        DB::table('users')->insert([
            'name' => 'テストユーザー',
            'email' => 'user@example.com',
            'email_verified_at' => $currentTime,
            'password' => $hashedPassword,
            'phone_number' => '090-9876-5432',
            'address' => '大阪府大阪市中央区1-2-3',
            'birth_date' => '1995-05-15',
            'gender' => 'female',
            'membership_status' => 'active',
            'notes' => 'テスト用一般アカウント',
            'profile_image' => null,
            'points' => 5000,
            'last_login_at' => $currentTime,
            'remember_token' => Str::random(10),
            'created_at' => $currentTime,
            'updated_at' => $currentTime,
        ]);

        $this->command->info('テスト用固定ユーザーを作成しました:');
        $this->command->info('- admin@example.com / password');
        $this->command->info('- user@example.com / password');
    }
}
