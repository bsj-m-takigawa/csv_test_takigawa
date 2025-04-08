<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ProductionDatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with production data (1,000,000 records).
     */
    public function run(): void
    {
        $this->call([
            ProductionUserSeeder::class,
        ]);
    }
}
