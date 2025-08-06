<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MySQL でのみフルテキストインデックスを作成
        if (config('database.default') === 'mysql') {
            // MySQLのフルテキストインデックスを作成
            DB::statement('ALTER TABLE users ADD FULLTEXT search_index (name, email, phone_number)');

            echo "フルテキストインデックス 'search_index' をusersテーブルに作成しました。\n";
        } else {
            // SQLite や他のデータベースの場合は通常のインデックスを作成
            Schema::table('users', function (Blueprint $table) {
                $table->index(['name', 'email', 'phone_number'], 'search_composite_index');
            });

            echo "複合インデックス 'search_composite_index' をusersテーブルに作成しました。\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (config('database.default') === 'mysql') {
            // MySQLのフルテキストインデックスを削除
            DB::statement('ALTER TABLE users DROP INDEX search_index');
        } else {
            // 通常のインデックスを削除
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('search_composite_index');
            });
        }
    }
};
