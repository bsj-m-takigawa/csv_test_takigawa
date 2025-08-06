<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestSeeder extends Seeder
{
    /**
     * テスト用の軽量なシーダー
     * DatabaseTransactionsで使用するため、少ないデータで高速実行
     */
    public function run(): void
    {
        // テスト専用で最小限のデータを生成（10件）
        $testUsers = [];
        $genders = ['male', 'female', 'other'];
        $statuses = ['active', 'inactive', 'pending', 'expired'];

        for ($i = 1; $i <= 10; $i++) {
            $testUsers[] = [
                'name' => 'Test User '.$i,
                'email' => 'test'.$i.'@example.com',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
                'phone_number' => '0'.rand(10, 99).'-'.rand(1000, 9999).'-'.rand(1000, 9999),
                'address' => 'テスト住所'.rand(1, 9).'-'.rand(1, 20).'-'.rand(1, 30),
                'birth_date' => date('Y-m-d', strtotime('-'.rand(25, 65).' years')),
                'gender' => $genders[array_rand($genders)],
                'membership_status' => $statuses[array_rand($statuses)],
                'notes' => $i % 5 == 0 ? 'テスト用のメモ' : null,
                'profile_image' => null,
                'points' => rand(0, 1000),
                'last_login_at' => $i % 2 == 0 ? now()->subDays(rand(1, 7)) : null,
                'remember_token' => Str::random(10),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // バッチ挿入で高速化
        DB::table('users')->insert($testUsers);

        $this->command->info('Test seeder completed: 10 test users created');
    }
}
