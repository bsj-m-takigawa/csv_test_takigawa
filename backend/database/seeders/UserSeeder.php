<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('users')->truncate();

        // テスト用の固定ユーザーを作成
        DB::table('users')->insert([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'phone_number' => '090-1234-5678',
            'address' => '東京都渋谷区代々木1-1-1',
            'birth_date' => '1990-01-01',
            'gender' => 'other',
            'membership_status' => 'active',
            'notes' => 'テスト用アカウント',
            'profile_image' => null,
            'points' => 1000,
            'last_login_at' => now(),
            'remember_token' => Str::random(10),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $batchSize = 100; // バッチサイズ
        $totalUsers = 1000; // テスト用に1000件に設定（本番環境では100万件）
        $batches = ceil($totalUsers / $batchSize);

        $genders = ['male', 'female', 'other'];
        $statuses = ['active', 'inactive', 'pending', 'expired'];

        for ($b = 0; $b < $batches; $b++) {
            $userData = [];

            for ($i = 0; $i < $batchSize; $i++) {
                $userId = $b * $batchSize + $i + 1;
                if ($userId > $totalUsers) {
                    break;
                }

                $userData[] = [
                    'name' => 'User '.$userId,
                    'email' => 'user'.$userId.'@example.com',
                    'email_verified_at' => now(),
                    'password' => Hash::make('password'),
                    'phone_number' => '0'.rand(10, 99).'-'.rand(1000, 9999).'-'.rand(1000, 9999),
                    'address' => '東京都渋谷区代々木'.rand(1, 9).'-'.rand(1, 20).'-'.rand(1, 30),
                    'birth_date' => date('Y-m-d', strtotime('-'.rand(18, 80).' years')),
                    'gender' => $genders[array_rand($genders)],
                    'membership_status' => $statuses[array_rand($statuses)],
                    'notes' => $userId % 10 == 0 ? 'この会員は特別なメモがあります。改行を含む\nテキストです。' : null,
                    'profile_image' => $userId % 5 == 0 ? 'profile_'.$userId.'.jpg' : null,
                    'points' => rand(0, 10000),
                    'last_login_at' => $userId % 3 == 0 ? now()->subDays(rand(1, 30)) : null,
                    'remember_token' => Str::random(10),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('users')->insert($userData);

            $this->command->info('Seeded batch '.($b + 1).' of '.$batches);
        }
    }
}
