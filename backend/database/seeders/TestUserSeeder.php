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
}
