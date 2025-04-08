<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class TestDatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with test data (1,000 records).
     */
    public function run(): void
    {
        $this->call([
            TestUserSeeder::class,
        ]);
    }
}
